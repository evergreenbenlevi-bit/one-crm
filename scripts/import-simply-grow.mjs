#!/usr/bin/env node

/**
 * Import Simply Grow leads from /tmp/simply_grow_leads.tsv
 * Runs independently - does NOT delete existing data
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..');

// Load .env.local
const envContent = readFileSync(resolve(projectRoot, '.env.local'), 'utf-8');
const env = {};
for (const line of envContent.split('\n')) {
  const m = line.match(/^([^=]+)=(.*)$/);
  if (m) env[m[1].trim()] = m[2].trim();
}

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

function cleanPhone(raw) {
  if (!raw) return null;
  let p = raw.replace(/[^\d]/g, '');
  if (p.startsWith('972')) p = '0' + p.slice(3);
  if (p.length < 9 || p.length > 11) return null;
  return p;
}

function parseDate(raw) {
  if (!raw) return null;
  // DD/MM/YYYY
  const m = raw.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (m) return new Date(parseInt(m[3]), parseInt(m[2]) - 1, parseInt(m[1])).toISOString();
  // ISO
  if (raw.includes('T')) return raw;
  return null;
}

const fakeEmails = new Set(['fgg@gmail.com', 'bxbdb@hdhdh.com']);
const fakePhones = new Set(['9726666555555', '97254545454554']);

async function main() {
  console.log('=== Import Simply Grow Leads ===\n');

  const content = readFileSync('/tmp/simply_grow_leads.tsv', 'utf-8');
  const lines = content.split('\n').filter(l => l.trim());

  // Header is first line - strip emoji prefixes
  const rawHeaders = lines[0].split('\t');
  const headers = rawHeaders.map(h => h.replace(/[^\u0590-\u05FFa-zA-Z0-9_ ]/g, '').trim());
  console.log('Headers:', headers.join(' | '));

  // Get existing emails to avoid duplicates
  const { data: existingLeads } = await supabase.from('leads').select('email');
  const existingEmails = new Set((existingLeads || []).map(l => (l.email || '').toLowerCase()));

  const statusMap = {
    'לקוח משלם סגירה': 'closed',
    'לא רלוונטי': 'lost',
    'הושלם': 'lost',
    'פולואפ': 'new',
    'ניסיון התקשרות 1': 'got_wa',
    'ניסיון התקשרות 2': 'got_wa',
    'ליד חדש': 'new',
  };

  // Map column names (with emoji stripped)
  const colMap = {};
  for (let i = 0; i < headers.length; i++) {
    const h = headers[i];
    if (h.includes('שם מלא')) colMap.name = i;
    else if (h.includes('טלפון')) colMap.phone = i;
    else if (h.includes('שלב במשפך')) colMap.funnel = i;
    else if (h.includes('פעולה הבאה')) colMap.action = i;
    else if (h.includes('סטטוס ליד')) colMap.status = i;
    else if (h.includes('הערות')) colMap.notes = i;
    else if (h.includes('מקור')) colMap.source = i;
    else if (h.includes('תאריך יצירה')) colMap.createdAt = i;
    else if (h.includes('סכום עסקה')) colMap.dealAmount = i;
    else if (h.includes('מייל')) colMap.email = i;
    else if (h.includes('תשובות')) colMap.formAnswers = i;
  }
  console.log('Column mapping:', colMap);

  const leads = [];
  const notesToAdd = [];
  const customersToAdd = [];
  let skipped = 0;

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split('\t');
    const name = (cols[colMap.name] || '').trim();
    const phone = cols[colMap.phone] || '';
    const email = (cols[colMap.email] || '').toLowerCase().trim();
    const statusRaw = (cols[colMap.status] || '').trim();
    const funnelStage = (cols[colMap.funnel] || '').trim();
    const notes = (cols[colMap.notes] || '').trim();
    const createdAt = parseDate((cols[colMap.createdAt] || '').trim());
    const dealAmount = parseFloat((cols[colMap.dealAmount] || '0').replace(/[^\d.]/g, '')) || 0;
    const formAnswers = (cols[colMap.formAnswers] || '').trim();
    const utmSource = cols[colMap.formAnswers + 1] || '';

    // Skip fakes
    if (name.length <= 1 || name === 'Hehehrh') { skipped++; continue; }
    if (fakeEmails.has(email)) { skipped++; continue; }
    if (fakePhones.has(phone.replace(/[^\d]/g, ''))) { skipped++; continue; }

    // Skip duplicates
    if (email && existingEmails.has(email)) { skipped++; continue; }
    if (email) existingEmails.add(email);

    // Map status
    let mapped = 'new';
    if (statusRaw.includes('לקוח משלם')) mapped = 'closed';
    else if (funnelStage === 'לא רלוונטי') mapped = 'lost';
    else if (statusRaw === 'מילא שאלון התאמה') mapped = 'filled_questionnaire';
    else if (statusRaw === 'צפה ב-VSL' || funnelStage === 'צפה ב-VSL') mapped = 'watched_vsl';
    else if (funnelStage.includes('ניסיון התקשרות')) mapped = 'got_wa';
    else if (funnelStage === 'פולואפ') mapped = 'sales_call';

    const cleanedPhone = cleanPhone(phone);

    leads.push({
      name: name,
      email: email || null,
      phone: cleanedPhone,
      source: 'campaign',
      product: 'simply_grow',
      current_status: mapped,
      created_at: createdAt || new Date().toISOString(),
    });

    // Collect notes (both הערות and form answers)
    const fullNotes = [notes, formAnswers].filter(Boolean).join('\n---\n');
    if (fullNotes && email) {
      notesToAdd.push({ email, content: fullNotes, createdAt });
    }

    // Customers with deals
    if (dealAmount > 0) {
      customersToAdd.push({ email, name, phone: cleanedPhone, dealAmount, createdAt });
    }
  }

  console.log(`\nParsed: ${leads.length} leads, ${skipped} skipped`);

  // Insert leads in batches
  let inserted = 0;
  for (let i = 0; i < leads.length; i += 50) {
    const batch = leads.slice(i, i + 50);
    const { error } = await supabase.from('leads').insert(batch);
    if (error) {
      console.error('Lead insert error:', error.message);
      // Try one by one
      for (const lead of batch) {
        const { error: e2 } = await supabase.from('leads').insert(lead);
        if (!e2) inserted++;
        else console.error(`  Failed: ${lead.email} - ${e2.message}`);
      }
    } else {
      inserted += batch.length;
    }
  }
  console.log(`Inserted ${inserted} leads`);

  // Get lead IDs
  const { data: sgLeads } = await supabase
    .from('leads')
    .select('id, email')
    .eq('product', 'simply_grow');

  const emailToId = new Map();
  for (const l of (sgLeads || [])) {
    if (l.email) emailToId.set(l.email.toLowerCase(), l.id);
  }

  // Insert funnel events
  const events = [];
  for (const l of (sgLeads || [])) {
    events.push({
      lead_id: l.id,
      event_type: 'registered',
      timestamp: new Date().toISOString(),
    });
  }
  if (events.length > 0) {
    for (let i = 0; i < events.length; i += 50) {
      await supabase.from('funnel_events').insert(events.slice(i, i + 50));
    }
    console.log(`Inserted ${events.length} funnel events`);
  }

  // Insert notes
  let notesInserted = 0;
  for (const { email, content, createdAt } of notesToAdd) {
    const leadId = emailToId.get(email);
    if (leadId && content) {
      const { error } = await supabase.from('notes').insert({
        lead_id: leadId,
        content,
        author: 'נועם',
        created_at: createdAt || new Date().toISOString(),
      });
      if (!error) notesInserted++;
    }
  }
  console.log(`Inserted ${notesInserted} notes`);

  // Create customers for deals
  let custInserted = 0;
  for (const { email, name, phone, dealAmount, createdAt } of customersToAdd) {
    const leadId = emailToId.get(email);
    const { data: customer, error } = await supabase.from('customers').insert({
      lead_id: leadId || null,
      name,
      email: email || null,
      phone: phone || null,
      products_purchased: ['simply_grow'],
      total_paid: dealAmount,
      payment_status: 'completed',
      status: 'active',
      current_month: 1,
      created_at: createdAt || new Date().toISOString(),
    }).select().single();

    if (!error && customer) {
      custInserted++;
      await supabase.from('transactions').insert({
        customer_id: customer.id,
        lead_id: leadId || null,
        product: 'simply_grow',
        amount: dealAmount,
        date: createdAt || new Date().toISOString(),
        payment_method: 'other',
        status: 'completed',
      });
    }
  }
  console.log(`Created ${custInserted} customers with transactions`);

  console.log('\n=== DONE ===');
}

main().catch(console.error);
