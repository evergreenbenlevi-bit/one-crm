/**
 * One-time fix: Update existing leads with missing ad_name,
 * and create Simply Grow customers + transactions for closed deals.
 *
 * Uses data from the latest n8n execution (Google Sheets data).
 */
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://lmcktwpwnahtoxglrzch.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxtY2t0d3B3bmFodG94Z2xyemNoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzU5ODk0NCwiZXhwIjoyMDg5MTc0OTQ0fQ.AMq4Uh-88lq5DplhJDqswWrREptka8EodwaML0tJfSQ'
);

const N8N_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJmMjRiNGE4Ny05OTVjLTRjM2MtODJhNC0xNjBiOGEzMWVmODUiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzczNjcwNTgyLCJleHAiOjE3NzQyMzg0MDB9.TpGnarocv4thLZcMIq7fVKXEz1qx1Hrn6-k8nwUF5xE';

function parseUtm(raw) {
  if (!raw) return {};
  const result = {};
  const text = raw.toString();
  const sourceMatch = text.match(/Source:\s*([^\n]+)/i);
  const contentMatch = text.match(/Content:\s*([^\n]+)/i);
  const campaignMatch = text.match(/Campaign:\s*([^\n]+)/i);
  if (sourceMatch) result.source = sourceMatch[1].trim();
  if (contentMatch) result.content = contentMatch[1].trim();
  if (campaignMatch) result.campaign = campaignMatch[1].trim();
  return result;
}

function cleanPhone(raw) {
  if (!raw) return null;
  let phone = raw.toString().replace(/[\s\-\(\)]/g, '');
  if (phone.startsWith('+972')) phone = '0' + phone.slice(4);
  else if (phone.startsWith('972')) phone = '0' + phone.slice(3);
  if (phone.length === 9 && !phone.startsWith('0')) phone = '0' + phone;
  return phone;
}

async function getSheetData(workflowId) {
  const res = await fetch(
    `https://n8n.tsi-pirsum.co.il/api/v1/executions?workflowId=${workflowId}&limit=1&includeData=true&status=success`,
    { headers: { 'X-N8N-API-KEY': N8N_KEY } }
  );
  const data = await res.json();
  const exec = data.data[0];
  const runData = exec.data.resultData.runData;

  // Find the Google Sheets node (first node that's not the trigger)
  for (const [name, runs] of Object.entries(runData)) {
    if (name.includes('קריאת גיליון')) {
      const items = runs[0]?.data?.main?.[0] || [];
      return items.map(i => i.json);
    }
  }
  return [];
}

async function fixSimplyGrow() {
  console.log('\n=== Fixing Simply Grow ===');

  // Get sheet data from n8n
  const sheetRows = await getSheetData('YrZWIAJwABYc3fT6');
  console.log(`Sheet rows: ${sheetRows.length}`);

  // Get existing leads
  const { data: leads } = await supabase.from('leads').select('*').eq('product', 'simply_grow');
  console.log(`Existing SG leads: ${leads.length}`);

  let updatedCount = 0;
  let customersCreated = 0;
  let transactionsCreated = 0;

  for (const row of sheetRows) {
    const email = (row['מייל'] || '').toLowerCase().trim();
    const phone = cleanPhone(row['📞 טלפון'] || row['טלפון'] || '');
    const name = (row['👤 שם מלא'] || row['שם מלא'] || '').trim();
    const utm = parseUtm(row['col_16']);
    const adName = utm.content || null;
    const campaignName = utm.campaign || null;
    const dealAmountRaw = row['💰 סכום עסקה'] || row['סכום עסקה'] || '';
    const dealAmount = parseInt(dealAmountRaw.toString().replace(/[^\d]/g, ''), 10) || 0;
    const sheetStatus = (row['📊 שלב במשפך'] || row['שלב במשפך'] || '').trim();

    // Find matching lead
    const lead = leads.find(l => {
      if (email && l.email && l.email.toLowerCase() === email) return true;
      if (phone && l.phone) {
        const leadPhone = l.phone.replace(/\D/g, '');
        const sheetPhone = phone.replace(/\D/g, '');
        if (leadPhone === sheetPhone || leadPhone.endsWith(sheetPhone.slice(-9)) || sheetPhone.endsWith(leadPhone.slice(-9))) return true;
      }
      return false;
    });

    if (!lead) continue;

    // Update lead with ad_name, campaign_id, and correct status
    const updates = {};
    if (adName && !lead.ad_name) updates.ad_name = adName;
    if (campaignName && !lead.campaign_id) updates.campaign_id = campaignName;

    // Update status based on deal amount
    if (dealAmount > 0 && lead.current_status !== 'closed') {
      updates.current_status = 'closed';
    }

    if (Object.keys(updates).length > 0) {
      const { error } = await supabase.from('leads').update(updates).eq('id', lead.id);
      if (!error) {
        updatedCount++;
        console.log(`  Updated lead: ${lead.name} -> ${JSON.stringify(updates)}`);
      }
    }

    // Create customer + transaction for closed deals
    if (dealAmount > 0) {
      // Check if customer already exists
      const { data: existingCust } = await supabase.from('customers')
        .select('id')
        .or(`email.eq.${email},phone.eq.${phone}`)
        .contains('products_purchased', ['simply_grow']);

      if (!existingCust || existingCust.length === 0) {
        // Create customer
        const { data: newCust, error: custErr } = await supabase.from('customers').insert({
          lead_id: lead.id,
          name: lead.name,
          email: lead.email,
          phone: lead.phone,
          occupation: lead.occupation,
          products_purchased: ['simply_grow'],
          total_paid: dealAmount,
          status: 'active',
          current_month: 1,
          payment_status: 'completed'
        }).select().single();

        if (!custErr && newCust) {
          customersCreated++;
          console.log(`  Created customer: ${lead.name} (₪${dealAmount})`);

          // Create transaction
          const { error: txnErr } = await supabase.from('transactions').insert({
            customer_id: newCust.id,
            lead_id: lead.id,
            product: 'simply_grow',
            amount: dealAmount,
            date: new Date().toISOString().split('T')[0],
            payment_method: 'other',
            installments_total: 1,
            installments_paid: 1,
            status: 'completed'
          });

          if (!txnErr) {
            transactionsCreated++;
            console.log(`  Created transaction: ₪${dealAmount}`);
          }
        }
      }
    }
  }

  console.log(`\nSimply Grow summary: ${updatedCount} leads updated, ${customersCreated} customers created, ${transactionsCreated} transactions created`);
}

async function fixFreedom() {
  console.log('\n=== Fixing Freedom ===');

  const sheetRows = await getSheetData('SveWaOkeTs7BnVU9');
  console.log(`Sheet rows: ${sheetRows.length}`);

  const { data: leads } = await supabase.from('leads').select('*').eq('product', 'freedom').is('ad_name', null);
  console.log(`Freedom leads without ad_name: ${leads.length}`);

  let updatedCount = 0;

  for (const row of sheetRows) {
    const email = (row['מייל'] || '').toLowerCase().trim();
    if (!email) continue;

    const adName = row['utm_content'] || null;
    const campaignName = row['utm_campaign'] || null;
    if (!adName && !campaignName) continue;

    const lead = leads.find(l => l.email && l.email.toLowerCase() === email);
    if (!lead) continue;

    const updates = {};
    if (adName) updates.ad_name = adName;
    if (campaignName && !lead.campaign_id) updates.campaign_id = campaignName;

    if (Object.keys(updates).length > 0) {
      const { error } = await supabase.from('leads').update(updates).eq('id', lead.id);
      if (!error) {
        updatedCount++;
      }
    }
  }

  console.log(`Freedom summary: ${updatedCount} leads updated with ad_name`);
}

async function showFinalStats() {
  console.log('\n=== Final Stats ===');
  const { data: fLeads } = await supabase.from('leads').select('id,ad_name').eq('product', 'freedom');
  const fWith = fLeads.filter(l => l.ad_name).length;
  console.log(`Freedom: ${fWith}/${fLeads.length} with ad_name`);

  const { data: sgLeads } = await supabase.from('leads').select('id,ad_name,current_status').eq('product', 'simply_grow');
  const sgWith = sgLeads.filter(l => l.ad_name).length;
  const sgClosed = sgLeads.filter(l => l.current_status === 'closed').length;
  console.log(`Simply Grow: ${sgWith}/${sgLeads.length} with ad_name, ${sgClosed} closed`);

  const { data: customers } = await supabase.from('customers').select('id,products_purchased,total_paid');
  const sgCust = customers.filter(c => c.products_purchased?.includes('simply_grow'));
  const sgRevenue = sgCust.reduce((sum, c) => sum + (c.total_paid || 0), 0);
  console.log(`Simply Grow customers: ${sgCust.length}, revenue: ₪${sgRevenue}`);

  const totalRevenue = customers.reduce((sum, c) => sum + (c.total_paid || 0), 0);
  console.log(`Total customers: ${customers.length}, total revenue: ₪${totalRevenue}`);
}

async function main() {
  await fixSimplyGrow();
  await fixFreedom();
  await showFinalStats();
}

main().catch(console.error);
