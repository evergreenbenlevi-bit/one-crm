-- =============================================================
-- SEED DATA — CRM נועם אוהב ציון
-- Q1 2026 realistic Hebrew data
-- =============================================================

-- Clear existing data (in reverse dependency order)
truncate expenses, notes, goals, files, meetings, campaigns, funnel_events, transactions, customers, leads cascade;

-- =============================================================
-- LEADS (20)
-- =============================================================
do $$
declare
  -- Lead UUIDs (fixed for cross-table references)
  l01 uuid := 'a0000000-0000-0000-0000-000000000001';
  l02 uuid := 'a0000000-0000-0000-0000-000000000002';
  l03 uuid := 'a0000000-0000-0000-0000-000000000003';
  l04 uuid := 'a0000000-0000-0000-0000-000000000004';
  l05 uuid := 'a0000000-0000-0000-0000-000000000005';
  l06 uuid := 'a0000000-0000-0000-0000-000000000006';
  l07 uuid := 'a0000000-0000-0000-0000-000000000007';
  l08 uuid := 'a0000000-0000-0000-0000-000000000008';
  l09 uuid := 'a0000000-0000-0000-0000-000000000009';
  l10 uuid := 'a0000000-0000-0000-0000-000000000010';
  l11 uuid := 'a0000000-0000-0000-0000-000000000011';
  l12 uuid := 'a0000000-0000-0000-0000-000000000012';
  l13 uuid := 'a0000000-0000-0000-0000-000000000013';
  l14 uuid := 'a0000000-0000-0000-0000-000000000014';
  l15 uuid := 'a0000000-0000-0000-0000-000000000015';
  l16 uuid := 'a0000000-0000-0000-0000-000000000016';
  l17 uuid := 'a0000000-0000-0000-0000-000000000017';
  l18 uuid := 'a0000000-0000-0000-0000-000000000018';
  l19 uuid := 'a0000000-0000-0000-0000-000000000019';
  l20 uuid := 'a0000000-0000-0000-0000-000000000020';

  -- Customer UUIDs
  c01 uuid := 'b0000000-0000-0000-0000-000000000001';
  c02 uuid := 'b0000000-0000-0000-0000-000000000002';
  c03 uuid := 'b0000000-0000-0000-0000-000000000003';
  c04 uuid := 'b0000000-0000-0000-0000-000000000004';
  c05 uuid := 'b0000000-0000-0000-0000-000000000005';
  c06 uuid := 'b0000000-0000-0000-0000-000000000006';
  c07 uuid := 'b0000000-0000-0000-0000-000000000007';
  c08 uuid := 'b0000000-0000-0000-0000-000000000008';

begin

-- ---- LEADS ----
insert into leads (id, name, email, phone, occupation, source, ad_name, product, current_status, created_at) values
  (l01, 'שירה כהן',    'shira.cohen@gmail.com',    '052-3456789', 'מאמנת כושר',       'campaign', 'VSL ראשי - פשוט לצמוח',              'simply_grow', 'closed',               '2026-01-05 10:00:00+02'),
  (l02, 'יוסי לוי',     'yossi.levi@gmail.com',     '054-7891234', 'יועץ עסקי',        'campaign', 'לידים חופש לשווק - גרסה 3',          'freedom',     'closed',               '2026-01-07 14:30:00+02'),
  (l03, 'מיכל אברהם',   'michal.a@walla.co.il',     '050-1112233', 'מעצבת גרפית',      'campaign', 'VSL ראשי - פשוט לצמוח',              'simply_grow', 'closed',               '2026-01-10 09:15:00+02'),
  (l04, 'דני פרץ',      'dani.peretz@gmail.com',    '053-4445566', 'צלם',              'organic',  null,                                   'freedom',     'closed',               '2026-01-12 16:00:00+02'),
  (l05, 'רונית גולד',   'ronit.gold@hotmail.com',   '058-7778899', 'קוסמטיקאית',       'campaign', 'לידים חופש לשווק - גרסה 3',          'freedom',     'closed',               '2026-01-15 11:20:00+02'),
  (l06, 'אמיר שמש',     'amir.shemesh@gmail.com',   '052-9990011', 'מורה לפילאטיס',    'youtube',  null,                                   'simply_grow', 'closed',               '2026-01-18 08:45:00+02'),
  (l07, 'נועה ברק',     'noa.barak@gmail.com',      '054-2223344', 'מטפלת שיאצו',      'campaign', 'VSL ראשי - פשוט לצמוח',              'simply_grow', 'sales_call',           '2026-01-22 13:00:00+02'),
  (l08, 'עידן מזרחי',   'idan.m@gmail.com',         '050-5556677', 'מאלף כלבים',       'campaign', 'לידים חופש לשווק - קהל חם',          'freedom',     'closed',               '2026-01-25 10:30:00+02'),
  (l09, 'הדר רוזן',     'hadar.rosen@gmail.com',    '053-8889900', 'נטורופתית',         'referral', null,                                   'simply_grow', 'filled_questionnaire', '2026-02-01 09:00:00+02'),
  (l10, 'אורלי דיין',   'orli.dayan@gmail.com',     '058-1112244', 'מורה ליוגה',        'campaign', 'VSL ראשי - פשוט לצמוח',              'simply_grow', 'watched_vsl',          '2026-02-03 15:45:00+02'),
  (l11, 'תומר אלון',    'tomer.alon@gmail.com',     '052-6667788', 'מעצב פנים',        'campaign', 'לידים חופש לשווק - גרסה 3',          'freedom',     'closed',               '2026-02-05 12:00:00+02'),
  (l12, 'ליאת שלום',    'liat.shalom@gmail.com',    '054-3334455', 'מנהלת סושיאל',     'campaign', 'לידים חופש לשווק - קהל חם',          'freedom',     'got_wa',               '2026-02-08 11:15:00+02'),
  (l13, 'גיל אשכנזי',  'gil.ashkenazi@gmail.com',  '050-7778811', 'יועץ משכנתאות',     'organic',  null,                                   'freedom',     'new',                  '2026-02-10 17:30:00+02'),
  (l14, 'סיון טל',      'sivan.tal@gmail.com',      '053-2224466', 'דיאטנית קלינית',   'campaign', 'VSL ראשי - פשוט לצמוח',              'simply_grow', 'sales_call',           '2026-02-14 14:00:00+02'),
  (l15, 'רועי כרמל',    'roei.carmel@gmail.com',    '058-9991122', 'מאמן אישי',        'youtube',  null,                                   'freedom',     'watched_vsl',          '2026-02-18 10:00:00+02'),
  (l16, 'יעל מנדל',     'yael.mandel@gmail.com',    '052-4445577', 'סטייליסטית',        'campaign', 'לידים חופש לשווק - גרסה 3',          'freedom',     'lost',                 '2026-02-20 16:30:00+02'),
  (l17, 'אלי נחמיאס',  'eli.nachmias@gmail.com',   '054-6667799', 'שמאי מקרקעין',     'campaign', 'VSL ראשי - פשוט לצמוח',              'simply_grow', 'got_wa',               '2026-02-25 09:45:00+02'),
  (l18, 'דפנה ויס',     'dafna.weiss@gmail.com',    '050-8881133', 'עורכת דין',         'referral', null,                                   'freedom',     'new',                  '2026-03-01 13:00:00+02'),
  (l19, 'מתן שפירא',   'matan.shapira@gmail.com',  '053-1113355', 'מורה לגיטרה',       'campaign', 'לידים חופש לשווק - קהל חם',          'freedom',     'filled_questionnaire', '2026-03-05 11:00:00+02'),
  (l20, 'קרן אור',     'keren.or@gmail.com',       '058-3335577', 'רפלקסולוגית',       'campaign', 'VSL ראשי - פשוט לצמוח',              'simply_grow', 'new',                  '2026-03-10 08:30:00+02');

-- ---- CUSTOMERS (8) ----
-- Linked to leads l01-l06, l08, l11
insert into customers (id, lead_id, name, email, phone, occupation, products_purchased, total_paid, payment_status, program_start_date, program_end_date, current_month, status, created_at) values
  (c01, l01, 'שירה כהן',   'shira.cohen@gmail.com',   '052-3456789', 'מאמנת כושר',     '{simply_grow}',          6000.00, 'completed', '2026-01-10', '2026-07-10', 3, 'active',    '2026-01-10 10:00:00+02'),
  (c02, l02, 'יוסי לוי',    'yossi.levi@gmail.com',    '054-7891234', 'יועץ עסקי',      '{freedom}',               165.00, 'completed', null,          null,         0, 'completed', '2026-01-08 14:30:00+02'),
  (c03, l03, 'מיכל אברהם',  'michal.a@walla.co.il',    '050-1112233', 'מעצבת גרפית',   '{simply_grow}',          4000.00, 'completed', '2026-01-15', '2026-07-15', 2, 'active',    '2026-01-15 09:15:00+02'),
  (c04, l04, 'דני פרץ',     'dani.peretz@gmail.com',   '053-4445566', 'צלם',            '{freedom}',               165.00, 'completed', null,          null,         0, 'completed', '2026-01-13 16:00:00+02'),
  (c05, l05, 'רונית גולד',  'ronit.gold@hotmail.com',  '058-7778899', 'קוסמטיקאית',    '{freedom}',               165.00, 'completed', null,          null,         0, 'completed', '2026-01-16 11:20:00+02'),
  (c06, l06, 'אמיר שמש',    'amir.shemesh@gmail.com',  '052-9990011', 'מורה לפילאטיס', '{simply_grow,freedom}',  2165.00, 'completed', '2026-02-01', '2026-08-01', 1, 'active',    '2026-01-20 08:45:00+02'),
  (c07, l08, 'עידן מזרחי',  'idan.m@gmail.com',        '050-5556677', 'מאלף כלבים',     '{freedom}',               165.00, 'completed', null,          null,         0, 'completed', '2026-01-26 10:30:00+02'),
  (c08, l11, 'תומר אלון',   'tomer.alon@gmail.com',    '052-6667788', 'מעצב פנים',      '{freedom}',               165.00, 'pending',   null,          null,         0, 'active',    '2026-02-06 12:00:00+02');

-- ---- TRANSACTIONS (17) ----
-- Freedom purchases (₪165 one-time)
insert into transactions (customer_id, lead_id, product, amount, date, payment_method, installments_total, installments_paid, status) values
  (c02, l02, 'freedom',     165.00, '2026-01-08 14:35:00+02', 'cardcom', 1, 1, 'completed'),
  (c04, l04, 'freedom',     165.00, '2026-01-13 16:05:00+02', 'cardcom', 1, 1, 'completed'),
  (c05, l05, 'freedom',     165.00, '2026-01-16 11:25:00+02', 'upay',    1, 1, 'completed'),
  (c06, l06, 'freedom',     165.00, '2026-01-20 09:00:00+02', 'cardcom', 1, 1, 'completed'),
  (c07, l08, 'freedom',     165.00, '2026-01-26 10:35:00+02', 'cardcom', 1, 1, 'completed'),
  (c08, l11, 'freedom',     165.00, '2026-02-06 12:05:00+02', 'upay',    1, 1, 'pending');

-- Simply Grow — שירה כהן (3 monthly payments so far)
insert into transactions (customer_id, lead_id, product, amount, date, payment_method, installments_total, installments_paid, status) values
  (c01, l01, 'simply_grow', 2000.00, '2026-01-10 10:05:00+02', 'cardcom', 6, 1, 'completed'),
  (c01, l01, 'simply_grow', 2000.00, '2026-02-10 10:00:00+02', 'cardcom', 6, 2, 'completed'),
  (c01, l01, 'simply_grow', 2000.00, '2026-03-10 10:00:00+02', 'cardcom', 6, 3, 'completed');

-- Simply Grow — מיכל אברהם (2 monthly payments)
insert into transactions (customer_id, lead_id, product, amount, date, payment_method, installments_total, installments_paid, status) values
  (c03, l03, 'simply_grow', 2000.00, '2026-01-15 09:20:00+02', 'cardcom', 6, 1, 'completed'),
  (c03, l03, 'simply_grow', 2000.00, '2026-02-15 09:00:00+02', 'cardcom', 6, 2, 'completed');

-- Simply Grow — אמיר שמש (1 monthly payment)
insert into transactions (customer_id, lead_id, product, amount, date, payment_method, installments_total, installments_paid, status) values
  (c06, l06, 'simply_grow', 2000.00, '2026-02-01 09:00:00+02', 'cardcom', 6, 1, 'completed');

-- Failed / refunded transactions
insert into transactions (customer_id, lead_id, product, amount, date, payment_method, installments_total, installments_paid, status) values
  (c08, l11, 'freedom',     165.00, '2026-02-05 12:00:00+02', 'upay',    1, 0, 'failed'),    -- first attempt failed
  (c03, l03, 'simply_grow', 2000.00, '2026-03-15 09:00:00+02', 'cardcom', 6, 3, 'pending'),   -- march payment pending
  (c06, l06, 'simply_grow', 2000.00, '2026-03-01 09:00:00+02', 'cardcom', 6, 2, 'completed'), -- second payment
  (c01, l01, 'simply_grow', 2000.00, '2026-01-08 10:00:00+02', 'cardcom', 6, 0, 'refunded');  -- initial attempt refunded

-- ---- FUNNEL EVENTS (32) ----
-- שירה כהן — full funnel to purchase (simply_grow)
insert into funnel_events (lead_id, event_type, timestamp, metadata) values
  (l01, 'registered',            '2026-01-05 10:00:00+02', '{"source":"meta_ad"}'),
  (l01, 'watched_vsl',           '2026-01-05 10:25:00+02', '{"watch_pct":92}'),
  (l01, 'got_wa',                '2026-01-06 08:00:00+02', '{}'),
  (l01, 'replied_watched',       '2026-01-06 08:15:00+02', '{}'),
  (l01, 'filled_questionnaire',  '2026-01-07 14:00:00+02', '{}'),
  (l01, 'sales_call',            '2026-01-09 11:00:00+02', '{"duration_min":35}'),
  (l01, 'purchased',             '2026-01-10 10:05:00+02', '{"product":"simply_grow","amount":2000}');

-- יוסי לוי — full funnel (freedom)
insert into funnel_events (lead_id, event_type, timestamp, metadata) values
  (l02, 'registered',            '2026-01-07 14:30:00+02', '{"source":"meta_ad"}'),
  (l02, 'watched_vsl',           '2026-01-07 14:55:00+02', '{"watch_pct":78}'),
  (l02, 'purchased',             '2026-01-08 14:35:00+02', '{"product":"freedom","amount":165}');

-- מיכל אברהם — full funnel (simply_grow)
insert into funnel_events (lead_id, event_type, timestamp, metadata) values
  (l03, 'registered',            '2026-01-10 09:15:00+02', '{"source":"meta_ad"}'),
  (l03, 'watched_vsl',           '2026-01-10 09:40:00+02', '{"watch_pct":100}'),
  (l03, 'got_wa',                '2026-01-11 07:30:00+02', '{}'),
  (l03, 'filled_questionnaire',  '2026-01-12 10:00:00+02', '{}'),
  (l03, 'sales_call',            '2026-01-14 16:00:00+02', '{"duration_min":40}'),
  (l03, 'purchased',             '2026-01-15 09:20:00+02', '{"product":"simply_grow","amount":2000}');

-- דני פרץ — organic, short funnel (freedom)
insert into funnel_events (lead_id, event_type, timestamp, metadata) values
  (l04, 'registered',            '2026-01-12 16:00:00+02', '{"source":"organic"}'),
  (l04, 'watched_vsl',           '2026-01-12 16:20:00+02', '{"watch_pct":85}'),
  (l04, 'purchased',             '2026-01-13 16:05:00+02', '{"product":"freedom","amount":165}');

-- נועה ברק — stuck at sales_call
insert into funnel_events (lead_id, event_type, timestamp, metadata) values
  (l07, 'registered',            '2026-01-22 13:00:00+02', '{"source":"meta_ad"}'),
  (l07, 'watched_vsl',           '2026-01-22 13:30:00+02', '{"watch_pct":65}'),
  (l07, 'got_wa',                '2026-01-23 09:00:00+02', '{}'),
  (l07, 'filled_questionnaire',  '2026-01-25 11:00:00+02', '{}'),
  (l07, 'sales_call',            '2026-01-28 14:00:00+02', '{"duration_min":25,"notes":"ביקשה לחשוב על זה"}');

-- הדר רוזן — referral, got to questionnaire
insert into funnel_events (lead_id, event_type, timestamp, metadata) values
  (l09, 'registered',            '2026-02-01 09:00:00+02', '{"source":"referral","referred_by":"שירה כהן"}'),
  (l09, 'watched_vsl',           '2026-02-01 09:30:00+02', '{"watch_pct":100}'),
  (l09, 'got_wa',                '2026-02-02 10:00:00+02', '{}'),
  (l09, 'filled_questionnaire',  '2026-02-03 14:00:00+02', '{}');

-- יעל מנדל — lost lead
insert into funnel_events (lead_id, event_type, timestamp, metadata) values
  (l16, 'registered',            '2026-02-20 16:30:00+02', '{"source":"meta_ad"}'),
  (l16, 'watched_vsl',           '2026-02-21 10:00:00+02', '{"watch_pct":30}');

-- קרן אור — just registered
insert into funnel_events (lead_id, event_type, timestamp, metadata) values
  (l20, 'registered',            '2026-03-10 08:30:00+02', '{"source":"meta_ad"}');

-- ---- CAMPAIGNS (5) ----
insert into campaigns (name, product, daily_spend, impressions, clicks, leads_count, purchases, date) values
  ('VSL ראשי - פשוט לצמוח',              'simply_grow', 180.00, 12500, 420, 18, 3, '2026-01-15'),
  ('לידים חופש לשווק - גרסה 3',          'freedom',      95.00,  8200, 310, 25, 5, '2026-01-15'),
  ('לידים חופש לשווק - קהל חם',          'freedom',      65.00,  4100, 185, 12, 3, '2026-02-01'),
  ('VSL ראשי - פשוט לצמוח',              'simply_grow', 200.00, 14000, 480, 22, 2, '2026-02-15'),
  ('ריטרגטינג - כל המוצרים',              null,           45.00,  6800, 250,  8, 2, '2026-03-01');

-- ---- MEETINGS (6) ----
insert into meetings (customer_id, lead_id, date, type, summary, status) values
  (c01, l01, '2026-01-10 14:00:00+02', 'onboarding',   'הגדרנו יעדים ל-3 חודשים קדימה. שירה רוצה להגיע ל-10 לקוחות חדשים בחודש.',                      'completed'),
  (c01, l01, '2026-02-10 14:00:00+02', 'monthly_1on1',  'סקירת חודש ראשון. 4 לקוחות חדשים, שיפור בנראות ברשתות. צריך לחדד את המסר.',                    'completed'),
  (c03, l03, '2026-01-20 11:00:00+02', 'onboarding',   'מיכל רוצה להתמקד בעיצוב לוגואים לעסקים קטנים. בנינו תוכנית תוכן.',                                'completed'),
  (null, l07, '2026-01-28 14:00:00+02', 'sales_call',   'נועה מתלבטת. הבינה את הערך אבל צריכה לבדוק תקציב. לחזור אליה בעוד שבוע.',                        'completed'),
  (null, l14, '2026-02-20 15:00:00+02', 'sales_call',   null,                                                                                                 'scheduled'),
  (c01, l01, '2026-03-10 14:00:00+02', 'monthly_1on1',  'חודש שלישי. שירה כבר ב-8 לקוחות. התחלנו לעבוד על מודעות ממומנות.',                                 'completed');

-- ---- GOALS (2) ----
-- Q1 2026 (current) + Q4 2025 (past)
insert into goals (quarter, year, target_type, target_value, current_value, label) values
  (1, 2026, 'revenue',   25000.00, 16825.00, 'הכנסות Q1 2026'),
  (4, 2025, 'customers',    15.00,    12.00, 'לקוחות חדשים Q4 2025');

-- ---- NOTES (10) ----
insert into notes (lead_id, customer_id, content, author) values
  (l01, c01,  'שירה מאוד מוטיבצית. יש לה קהל קיים באינסטגרם עם 2,000 עוקבים. פוטנציאל גבוה.',   'נועם'),
  (l02, c02,  'יוסי קנה את החופש לשווק אחרי שראה את ה-VSL. אמר שהוא מכיר את השיטה.',             'נועם'),
  (l03, c03,  'מיכל צריכה עזרה בתמחור. היא גובה 800 שקל לעיצוב לוגו — נמוך מדי.',                  'נועם'),
  (l07, null, 'נועה מעניינת מאוד. יש לה עסק קיים אבל אין לה נוכחות דיגיטלית בכלל.',                'נועם'),
  (l09, null, 'הגיעה דרך המלצה של שירה. שאלה שאלות מאוד ספציפיות — סימן טוב.',                       'נועם'),
  (l14, null, 'סיון דיאטנית קלינית, רוצה לפתוח קורס דיגיטלי. שיחה נקבעה ל-20/2.',                   'נועם'),
  (l16, null, 'יעל לא מתאימה — חיפשה ניהול סושיאל ולא שיווק עצמי. סגרנו בטוב.',                     'נועם'),
  (null, c06, 'אמיר כבר קנה את החופש לשווק ועכשיו שודרג לפשוט לצמוח. מגיע מיוטיוב.',               'נועם'),
  (l19, null, 'מתן מלמד גיטרה ורוצה לעשות קורס דיגיטלי. מילא שאלון — נראה רציני.',                  'נועם'),
  (null, c08, 'תומר שילם דרך upay — הסליקה הראשונה נכשלה, צריך לעקוב.',                               'נועם');

-- ---- EXPENSES (5) ----
insert into expenses (category, amount, date, description) values
  ('meta_ads',       4500.00, '2026-01-31', 'הוצאות מטא ינואר 2026'),
  ('meta_ads',       5200.00, '2026-02-28', 'הוצאות מטא פברואר 2026'),
  ('ai_tools',        180.00, '2026-01-15', 'מנוי Claude Pro + API'),
  ('editing_design',  350.00, '2026-02-10', 'עריכת וידאו VSL חדש'),
  ('software',        250.00, '2026-01-01', 'n8n cloud + Airtable Pro');

end $$;
