#!/usr/bin/env node

/**
 * Import real data into Supabase CRM
 *
 * Data sources:
 * 1. /tmp/freedom_leads.tsv - Freedom course leads + purchase status
 * 2. /tmp/simply_grow_leads.tsv - Simply Grow leads (if available)
 *
 * Usage: node scripts/import-real-data.mjs
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..');

// --- Load .env.local ---
const envPath = resolve(projectRoot, '.env.local');
const envContent = readFileSync(envPath, 'utf-8');
const env = {};
for (const line of envContent.split('\n')) {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) env[match[1].trim()] = match[2].trim();
}

const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// --- Counters ---
const counts = {
  leads: 0,
  customers: 0,
  transactions: 0,
  notes: 0,
  funnel_events: 0,
  skipped_duplicate: 0,
  skipped_fake: 0,
  skipped_admin: 0,
};

// --- Fake email/phone filters ---
const ADMIN_EMAILS = new Set([
  'tsi.pirsum@gmail.com',
  'noam@tsi-pirsum.co.il',
]);

const FAKE_EMAILS = new Set([
  'fgg@gmail.com',
  'bxbdb@hdhdh.com',
]);

function isFakeEmail(email) {
  if (!email) return true;
  email = email.toLowerCase().trim();
  if (FAKE_EMAILS.has(email)) return true;
  // Very short local parts that look fake
  const local = email.split('@')[0];
  if (local.length <= 2 && !/^\d+$/.test(local)) return true;
  // Obviously invalid domains
  const domain = email.split('@')[1];
  if (!domain || domain.length < 4) return true;
  return false;
}

function isFakePhone(phone) {
  if (!phone) return false; // no phone is ok
  const cleaned = phone.replace(/\D/g, '');
  // Fake patterns: too many repeating digits, too long
  if (cleaned.length > 12) return true;
  if (/^(.)\1{6,}$/.test(cleaned)) return true;
  return false;
}

// --- Date parsing ---
function parseDate(dateStr) {
  if (!dateStr || dateStr.trim() === '') return null;
  dateStr = dateStr.trim();

  // ISO format (2025-08-15T16:22:42.678Z)
  if (dateStr.includes('T') && dateStr.includes('-')) {
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) return d.toISOString();
  }

  // DD/MM/YYYY or DD.MM.YYYY
  const dmyMatch = dateStr.match(/^(\d{1,2})[\/.](\d{1,2})[\/.](\d{4})$/);
  if (dmyMatch) {
    const [, day, month, year] = dmyMatch;
    const d = new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T00:00:00Z`);
    if (!isNaN(d.getTime())) return d.toISOString();
  }

  // DD/MM/YYYY HH:mm
  const dmyTimeMatch = dateStr.match(/^(\d{1,2})[\/.](\d{1,2})[\/.](\d{4})\s+(\d{1,2}):(\d{2})$/);
  if (dmyTimeMatch) {
    const [, day, month, year, hour, min] = dmyTimeMatch;
    const d = new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T${hour.padStart(2, '0')}:${min}:00Z`);
    if (!isNaN(d.getTime())) return d.toISOString();
  }

  // YYYY-MM-DD
  const ymdMatch = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (ymdMatch) {
    const d = new Date(dateStr + 'T00:00:00Z');
    if (!isNaN(d.getTime())) return d.toISOString();
  }

  console.warn(`  Could not parse date: "${dateStr}"`);
  return null;
}

// --- Phone cleaning ---
function cleanPhone(phone) {
  if (!phone) return null;
  let cleaned = phone.replace(/[\s\-()]/g, '');
  // Remove +972 prefix, replace with 0
  if (cleaned.startsWith('+972')) cleaned = '0' + cleaned.slice(4);
  if (cleaned.startsWith('972') && cleaned.length > 10) cleaned = '0' + cleaned.slice(3);
  // Ensure starts with 0
  if (cleaned.length === 9 && !cleaned.startsWith('0')) cleaned = '0' + cleaned;
  return cleaned || null;
}

// --- Name from email ---
function nameFromEmail(email) {
  if (!email) return 'Unknown';
  const local = email.split('@')[0];
  // Try to split camelCase or dots/underscores
  return local
    .replace(/[._]/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\d+/g, '')
    .trim() || local;
}

// --- TSV parser ---
function parseTSV(content) {
  const lines = content.split('\n').filter(l => l.trim());
  if (lines.length === 0) return [];
  const headers = lines[0].split('\t').map(h => h.trim());
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split('\t');
    const row = {};
    for (let j = 0; j < headers.length; j++) {
      row[headers[j]] = (values[j] || '').trim();
    }
    rows.push(row);
  }
  return rows;
}

// --- Batch insert helper ---
async function batchInsert(table, records, batchSize = 100) {
  let inserted = 0;
  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize);
    const { error } = await supabase.from(table).insert(batch);
    if (error) {
      console.error(`  Error inserting into ${table} (batch ${Math.floor(i / batchSize) + 1}):`, error.message);
      // Try one by one for this batch
      for (const record of batch) {
        const { error: singleError } = await supabase.from(table).insert(record);
        if (singleError) {
          console.error(`  Error inserting single record into ${table}:`, singleError.message, JSON.stringify(record).slice(0, 200));
        } else {
          inserted++;
        }
      }
    } else {
      inserted += batch.length;
    }
  }
  return inserted;
}

// ============================================================
// STEP 1: Delete all existing data (respecting foreign keys)
// ============================================================
async function deleteAllData() {
  console.log('\n=== STEP 1: Deleting existing data ===');
  const tables = ['notes', 'files', 'funnel_events', 'meetings', 'transactions', 'goals', 'campaigns', 'expenses', 'customers', 'leads'];

  for (const table of tables) {
    // Delete all rows - use a filter that matches everything
    const { error, count } = await supabase.from(table).delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (error) {
      console.error(`  Error deleting from ${table}:`, error.message);
    } else {
      console.log(`  Deleted from ${table}`);
    }
  }
  console.log('  Done deleting.\n');
}

// ============================================================
// STEP 2: Import Freedom Leads
// ============================================================
async function importFreedomLeads() {
  console.log('=== STEP 2: Import Freedom Leads ===');
  const filePath = '/tmp/freedom_leads.tsv';
  if (!existsSync(filePath)) {
    console.log('  File not found, skipping.');
    return { leads: [], emailToLeadId: new Map() };
  }

  const content = readFileSync(filePath, 'utf-8');
  const rows = parseTSV(content);
  console.log(`  Parsed ${rows.length} rows from freedom_leads.tsv`);

  const seenEmails = new Set();
  const leadsToInsert = [];
  const purchaserEmails = new Set();
  const emailToDate = new Map();

  for (const row of rows) {
    const email = (row['מייל'] || '').toLowerCase().trim();
    if (!email) continue;

    // Skip admin/fake
    if (ADMIN_EMAILS.has(email)) { counts.skipped_admin++; continue; }
    if (isFakeEmail(email)) { counts.skipped_fake++; continue; }
    if (seenEmails.has(email)) { counts.skipped_duplicate++; continue; }
    seenEmails.add(email);

    const utmSource = (row['utm source'] || '').trim();
    const utmContent = (row['utm_content'] || '').trim();
    const purchased = (row['בוצעה רכישה?'] || '').includes('רכישה');
    const createdAt = parseDate(row['נרשם בתאריך']);

    if (purchased) {
      purchaserEmails.add(email);
      emailToDate.set(email, createdAt);
    }

    leadsToInsert.push({
      name: nameFromEmail(email),
      email,
      source: utmSource === 'facebook' ? 'campaign' : (utmSource ? 'other' : 'organic'),
      product: 'freedom',
      current_status: purchased ? 'closed' : 'new',
      created_at: createdAt || new Date().toISOString(),
      campaign_id: null,
      ad_name: utmContent || null,
    });
  }

  console.log(`  Inserting ${leadsToInsert.length} freedom leads...`);
  counts.leads += await batchInsert('leads', leadsToInsert);

  // Get the inserted leads back to get their IDs
  const { data: insertedLeads } = await supabase
    .from('leads')
    .select('id, email')
    .eq('product', 'freedom');

  const emailToLeadId = new Map();
  for (const lead of (insertedLeads || [])) {
    if (lead.email) emailToLeadId.set(lead.email.toLowerCase(), lead.id);
  }

  // Create customers and transactions for purchasers
  console.log(`  Creating ${purchaserEmails.size} customers from freedom purchasers...`);
  const customersToInsert = [];
  for (const email of purchaserEmails) {
    const leadId = emailToLeadId.get(email);
    customersToInsert.push({
      lead_id: leadId || null,
      name: nameFromEmail(email),
      email,
      products_purchased: ['freedom'],
      total_paid: 165,
      payment_status: 'completed',
      status: 'completed',
      created_at: emailToDate.get(email) || new Date().toISOString(),
    });
  }

  counts.customers += await batchInsert('customers', customersToInsert);

  // Get customer IDs for transactions
  const { data: insertedCustomers } = await supabase
    .from('customers')
    .select('id, email, lead_id, created_at');

  const transactionsToInsert = [];
  for (const customer of (insertedCustomers || [])) {
    transactionsToInsert.push({
      customer_id: customer.id,
      lead_id: customer.lead_id,
      product: 'freedom',
      amount: 165,
      date: customer.created_at,
      payment_method: 'cardcom',
      status: 'completed',
    });
  }

  counts.transactions += await batchInsert('transactions', transactionsToInsert);

  // Create funnel events
  const funnelEventsToInsert = [];
  for (const [email, leadId] of emailToLeadId) {
    // All leads got registered event
    funnelEventsToInsert.push({
      lead_id: leadId,
      event_type: 'registered',
      timestamp: emailToDate.get(email) || new Date().toISOString(),
    });

    // Purchasers also got purchased event
    if (purchaserEmails.has(email)) {
      funnelEventsToInsert.push({
        lead_id: leadId,
        event_type: 'purchased',
        timestamp: emailToDate.get(email) || new Date().toISOString(),
      });
    }
  }

  counts.funnel_events += await batchInsert('funnel_events', funnelEventsToInsert);

  return { leads: insertedLeads || [], emailToLeadId };
}

// ============================================================
// STEP 3: Import Simply Grow Leads
// ============================================================
async function importSimplyGrowLeads() {
  console.log('\n=== STEP 3: Import Simply Grow Leads ===');
  const filePath = '/tmp/simply_grow_leads.tsv';
  if (!existsSync(filePath)) {
    console.log('  File not found at /tmp/simply_grow_leads.tsv, skipping.');
    console.log('  To import, save the Simply Grow data as TSV to /tmp/simply_grow_leads.tsv');
    return;
  }

  const content = readFileSync(filePath, 'utf-8');
  const rows = parseTSV(content);
  console.log(`  Parsed ${rows.length} rows`);

  // Get existing emails to avoid duplicates
  const { data: existingLeads } = await supabase.from('leads').select('email');
  const existingEmails = new Set((existingLeads || []).map(l => (l.email || '').toLowerCase()));

  const statusMap = {
    'לקוח משלם (סגירה)': 'closed',
    'לקוח משלם': 'closed',
    'סגירה': 'closed',
    'לא רלוונטי': 'lost',
    'הושלם': 'lost',
    'מילא שאלון התאמה': 'filled_questionnaire',
    'צפה ב-VSL': 'watched_vsl',
    'ניסיון התקשרות': 'got_wa',
    'פולואפ': 'new',
    'פולו-אפ': 'new',
    'השאיר ליד': 'new',
    'ליד חדש': 'new',
  };

  const leadsToInsert = [];
  const leadsWithNotes = [];
  const leadsWithDeals = [];

  for (const row of rows) {
    const name = (row['שם מלא'] || '').trim();
    const email = (row['מייל'] || '').toLowerCase().trim();
    const phone = cleanPhone(row['טלפון'] || '');
    const status = (row['סטטוס ליד'] || row['שלב במשפך'] || '').trim();
    const notes = (row['הערות'] || '').trim();
    const createdAt = parseDate(row['תאריך יצירה']);
    const dealAmount = parseFloat(row['סכום עסקה'] || '0');

    // Skip fake entries
    if (name === 'V' || name.length <= 1) { counts.skipped_fake++; continue; }
    if (email && isFakeEmail(email)) { counts.skipped_fake++; continue; }
    if (isFakePhone(phone)) { counts.skipped_fake++; continue; }
    if (email && existingEmails.has(email)) { counts.skipped_duplicate++; continue; }
    if (email) existingEmails.add(email);
    if (!name && !email) continue;

    const mappedStatus = statusMap[status] || 'new';

    const lead = {
      name: name || nameFromEmail(email),
      email: email || null,
      phone: phone || null,
      source: 'campaign',
      product: 'simply_grow',
      current_status: mappedStatus,
      created_at: createdAt || new Date().toISOString(),
    };

    leadsToInsert.push(lead);
    if (notes) leadsWithNotes.push({ email, notes, createdAt });
    if (dealAmount > 0) leadsWithDeals.push({ email, name, phone, dealAmount, createdAt });
  }

  console.log(`  Inserting ${leadsToInsert.length} simply_grow leads...`);
  counts.leads += await batchInsert('leads', leadsToInsert);

  // Get IDs
  const { data: sgLeads } = await supabase
    .from('leads')
    .select('id, email')
    .eq('product', 'simply_grow');

  const emailToId = new Map();
  for (const l of (sgLeads || [])) {
    if (l.email) emailToId.set(l.email.toLowerCase(), l.id);
  }

  // Insert notes
  const notesToInsert = [];
  for (const { email, notes, createdAt } of leadsWithNotes) {
    const leadId = emailToId.get(email);
    if (leadId && notes) {
      notesToInsert.push({
        lead_id: leadId,
        content: notes,
        author: 'נועם',
        created_at: createdAt || new Date().toISOString(),
      });
    }
  }
  if (notesToInsert.length > 0) {
    counts.notes += await batchInsert('notes', notesToInsert);
    console.log(`  Inserted ${notesToInsert.length} notes`);
  }

  // Create customers + transactions for deals
  for (const { email, name, phone, dealAmount, createdAt } of leadsWithDeals) {
    const leadId = emailToId.get(email);
    const { data: customer, error } = await supabase.from('customers').insert({
      lead_id: leadId || null,
      name: name,
      email: email || null,
      phone: phone || null,
      products_purchased: ['simply_grow'],
      total_paid: dealAmount,
      payment_status: 'completed',
      status: 'active',
      created_at: createdAt || new Date().toISOString(),
    }).select().single();

    if (!error && customer) {
      counts.customers++;
      const { error: txErr } = await supabase.from('transactions').insert({
        customer_id: customer.id,
        lead_id: leadId || null,
        product: 'simply_grow',
        amount: dealAmount,
        date: createdAt || new Date().toISOString(),
        payment_method: 'other',
        status: 'completed',
      });
      if (!txErr) counts.transactions++;
    }
  }
}

// ============================================================
// MAIN
// ============================================================
async function main() {
  console.log('╔══════════════════════════════════════════╗');
  console.log('║  CRM Real Data Import                    ║');
  console.log('╚══════════════════════════════════════════╝');
  console.log(`Supabase URL: ${SUPABASE_URL}`);

  await deleteAllData();
  await importFreedomLeads();
  await importSimplyGrowLeads();

  console.log('\n╔══════════════════════════════════════════╗');
  console.log('║  IMPORT SUMMARY                          ║');
  console.log('╠══════════════════════════════════════════╣');
  console.log(`║  Leads inserted:        ${String(counts.leads).padStart(6)}          ║`);
  console.log(`║  Customers created:     ${String(counts.customers).padStart(6)}          ║`);
  console.log(`║  Transactions created:  ${String(counts.transactions).padStart(6)}          ║`);
  console.log(`║  Notes created:         ${String(counts.notes).padStart(6)}          ║`);
  console.log(`║  Funnel events:         ${String(counts.funnel_events).padStart(6)}          ║`);
  console.log(`║  Skipped (duplicate):   ${String(counts.skipped_duplicate).padStart(6)}          ║`);
  console.log(`║  Skipped (fake):        ${String(counts.skipped_fake).padStart(6)}          ║`);
  console.log(`║  Skipped (admin):       ${String(counts.skipped_admin).padStart(6)}          ║`);
  console.log('╚══════════════════════════════════════════╝');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
