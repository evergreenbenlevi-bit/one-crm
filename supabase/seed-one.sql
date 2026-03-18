-- =============================================================
-- SEED DATA — ONE™ CRM
-- Q1 2026 realistic Hebrew data — adapted for ONE™ brand
-- =============================================================

-- Clear existing data (in reverse dependency order)
truncate automations_log, content_metrics, applications, expenses, notes, goals, files, meetings, campaigns, funnel_events, transactions, customers, leads, tasks cascade;

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

-- ---- LEADS (20) ----
insert into leads (id, name, email, phone, occupation, source, ad_name, interest_program, current_status, created_at) values
  (l01, 'שירה כהן',    'shira.cohen@gmail.com',    '052-3456789', 'מאמנת כושר',       'campaign', 'Offer Doc VSL - ONE™ Core',     'one_core', 'active_client',    '2026-01-05 10:00:00+02'),
  (l02, 'יוסי לוי',     'yossi.levi@gmail.com',     '054-7891234', 'יועץ עסקי',        'campaign', 'Content Funnel - ONE™ VIP',     'one_vip',  'active_client',    '2026-01-07 14:30:00+02'),
  (l03, 'מיכל אברהם',   'michal.a@walla.co.il',     '050-1112233', 'מעצבת גרפית',      'campaign', 'Offer Doc VSL - ONE™ Core',     'one_core', 'active_client',    '2026-01-10 09:15:00+02'),
  (l04, 'דני פרץ',      'dani.peretz@gmail.com',    '053-4445566', 'צלם',              'organic',  null,                             'one_vip',  'active_client',    '2026-01-12 16:00:00+02'),
  (l05, 'רונית גולד',   'ronit.gold@hotmail.com',   '058-7778899', 'קוסמטיקאית',       'campaign', 'Content Funnel - ONE™ VIP',     'one_vip',  'active_client',    '2026-01-15 11:20:00+02'),
  (l06, 'אמיר שמש',     'amir.shemesh@gmail.com',   '052-9990011', 'מורה לפילאטיס',    'youtube',  null,                             'one_core', 'active_client',    '2026-01-18 08:45:00+02'),
  (l07, 'נועה ברק',     'noa.barak@gmail.com',      '054-2223344', 'מטפלת שיאצו',      'campaign', 'Offer Doc VSL - ONE™ Core',     'one_core', 'applied',          '2026-01-22 13:00:00+02'),
  (l08, 'עידן מזרחי',   'idan.m@gmail.com',         '050-5556677', 'מאלף כלבים',       'campaign', 'Content Funnel - ONE™ VIP',     'one_vip',  'active_client',    '2026-01-25 10:30:00+02'),
  (l09, 'הדר רוזן',     'hadar.rosen@gmail.com',    '053-8889900', 'נטורופתית',         'referral', null,                             'one_core', 'qualified',        '2026-02-01 09:00:00+02'),
  (l10, 'אורלי דיין',   'orli.dayan@gmail.com',     '058-1112244', 'מורה ליוגה',        'campaign', 'Offer Doc VSL - ONE™ Core',     'one_core', 'consumed_content', '2026-02-03 15:45:00+02'),
  (l11, 'תומר אלון',    'tomer.alon@gmail.com',     '052-6667788', 'מעצב פנים',        'campaign', 'Content Funnel - ONE™ VIP',     'one_vip',  'active_client',    '2026-02-05 12:00:00+02'),
  (l12, 'ליאת שלום',    'liat.shalom@gmail.com',    '054-3334455', 'מנהלת סושיאל',     'campaign', 'Content Funnel - ONE™ VIP',     'one_vip',  'engaged',          '2026-02-08 11:15:00+02'),
  (l13, 'גיל אשכנזי',  'gil.ashkenazi@gmail.com',  '050-7778811', 'יועץ משכנתאות',     'organic',  null,                             'one_vip',  'new',              '2026-02-10 17:30:00+02'),
  (l14, 'סיון טל',      'sivan.tal@gmail.com',      '053-2224466', 'דיאטנית קלינית',   'campaign', 'Offer Doc VSL - ONE™ Core',     'one_core', 'applied',          '2026-02-14 14:00:00+02'),
  (l15, 'רועי כרמל',    'roei.carmel@gmail.com',    '058-9991122', 'מאמן אישי',        'youtube',  null,                             'one_vip',  'consumed_content', '2026-02-18 10:00:00+02'),
  (l16, 'יעל מנדל',     'yael.mandel@gmail.com',    '052-4445577', 'סטייליסטית',        'campaign', 'Content Funnel - ONE™ VIP',     'one_vip',  'lost',             '2026-02-20 16:30:00+02'),
  (l17, 'אלי נחמיאס',  'eli.nachmias@gmail.com',   '054-6667799', 'שמאי מקרקעין',     'campaign', 'Offer Doc VSL - ONE™ Core',     'one_core', 'engaged',          '2026-02-25 09:45:00+02'),
  (l18, 'דפנה ויס',     'dafna.weiss@gmail.com',    '050-8881133', 'עורכת דין',         'referral', null,                             'one_vip',  'new',              '2026-03-01 13:00:00+02'),
  (l19, 'מתן שפירא',   'matan.shapira@gmail.com',  '053-1113355', 'מורה לגיטרה',       'campaign', 'Content Funnel - ONE™ VIP',     'one_vip',  'qualified',        '2026-03-05 11:00:00+02'),
  (l20, 'קרן אור',     'keren.or@gmail.com',       '058-3335577', 'רפלקסולוגית',       'campaign', 'Offer Doc VSL - ONE™ Core',     'one_core', 'new',              '2026-03-10 08:30:00+02');

-- ---- CUSTOMERS (8) ----
insert into customers (id, lead_id, name, email, phone, occupation, program, total_paid, payment_status, program_start_date, program_end_date, current_month, status, created_at) values
  (c01, l01, 'שירה כהן',   'shira.cohen@gmail.com',   '052-3456789', 'מאמנת כושר',     'one_core', 6000.00, 'completed', '2026-01-10', '2026-07-10', 3, 'active',    '2026-01-10 10:00:00+02'),
  (c02, l02, 'יוסי לוי',    'yossi.levi@gmail.com',    '054-7891234', 'יועץ עסקי',      'one_vip',  9000.00, 'completed', '2026-01-08', '2026-07-08', 3, 'active',    '2026-01-08 14:30:00+02'),
  (c03, l03, 'מיכל אברהם',  'michal.a@walla.co.il',    '050-1112233', 'מעצבת גרפית',   'one_core', 4000.00, 'completed', '2026-01-15', '2026-07-15', 2, 'active',    '2026-01-15 09:15:00+02'),
  (c04, l04, 'דני פרץ',     'dani.peretz@gmail.com',   '053-4445566', 'צלם',            'one_vip',  9000.00, 'completed', '2026-01-13', '2026-07-13', 3, 'active',    '2026-01-13 16:00:00+02'),
  (c05, l05, 'רונית גולד',  'ronit.gold@hotmail.com',  '058-7778899', 'קוסמטיקאית',    'one_vip',  6000.00, 'completed', '2026-01-16', '2026-07-16', 2, 'active',    '2026-01-16 11:20:00+02'),
  (c06, l06, 'אמיר שמש',    'amir.shemesh@gmail.com',  '052-9990011', 'מורה לפילאטיס', 'one_core', 2000.00, 'completed', '2026-02-01', '2026-08-01', 1, 'active',    '2026-01-20 08:45:00+02'),
  (c07, l08, 'עידן מזרחי',  'idan.m@gmail.com',        '050-5556677', 'מאלף כלבים',     'one_vip',  3000.00, 'pending',   '2026-01-26', '2026-07-26', 2, 'active',    '2026-01-26 10:30:00+02'),
  (c08, l11, 'תומר אלון',   'tomer.alon@gmail.com',    '052-6667788', 'מעצב פנים',      'one_vip',  3000.00, 'pending',   '2026-02-06', '2026-08-06', 1, 'active',    '2026-02-06 12:00:00+02');

-- ---- TRANSACTIONS (17) ----
-- ONE™ Core — שירה כהן (3 monthly of 2000)
insert into transactions (customer_id, lead_id, program, amount, date, payment_method, installments_total, installments_paid, status) values
  (c01, l01, 'one_core', 2000.00, '2026-01-10 10:05:00+02', 'cardcom', 6, 1, 'completed'),
  (c01, l01, 'one_core', 2000.00, '2026-02-10 10:00:00+02', 'cardcom', 6, 2, 'completed'),
  (c01, l01, 'one_core', 2000.00, '2026-03-10 10:00:00+02', 'cardcom', 6, 3, 'completed');

-- ONE™ VIP — יוסי לוי (3 monthly of 3000)
insert into transactions (customer_id, lead_id, program, amount, date, payment_method, installments_total, installments_paid, status) values
  (c02, l02, 'one_vip', 3000.00, '2026-01-08 14:35:00+02', 'cardcom', 6, 1, 'completed'),
  (c02, l02, 'one_vip', 3000.00, '2026-02-08 14:00:00+02', 'cardcom', 6, 2, 'completed'),
  (c02, l02, 'one_vip', 3000.00, '2026-03-08 14:00:00+02', 'cardcom', 6, 3, 'completed');

-- ONE™ Core — מיכל אברהם (2 monthly)
insert into transactions (customer_id, lead_id, program, amount, date, payment_method, installments_total, installments_paid, status) values
  (c03, l03, 'one_core', 2000.00, '2026-01-15 09:20:00+02', 'cardcom', 6, 1, 'completed'),
  (c03, l03, 'one_core', 2000.00, '2026-02-15 09:00:00+02', 'cardcom', 6, 2, 'completed');

-- ONE™ VIP — דני פרץ (3 monthly)
insert into transactions (customer_id, lead_id, program, amount, date, payment_method, installments_total, installments_paid, status) values
  (c04, l04, 'one_vip', 3000.00, '2026-01-13 16:05:00+02', 'cardcom', 6, 1, 'completed'),
  (c04, l04, 'one_vip', 3000.00, '2026-02-13 16:00:00+02', 'cardcom', 6, 2, 'completed'),
  (c04, l04, 'one_vip', 3000.00, '2026-03-13 16:00:00+02', 'cardcom', 6, 3, 'completed');

-- ONE™ VIP — רונית גולד (2 monthly)
insert into transactions (customer_id, lead_id, program, amount, date, payment_method, installments_total, installments_paid, status) values
  (c05, l05, 'one_vip', 3000.00, '2026-01-16 11:25:00+02', 'upay', 6, 1, 'completed'),
  (c05, l05, 'one_vip', 3000.00, '2026-02-16 11:00:00+02', 'upay', 6, 2, 'completed');

-- ONE™ Core — אמיר שמש (1 monthly)
insert into transactions (customer_id, lead_id, program, amount, date, payment_method, installments_total, installments_paid, status) values
  (c06, l06, 'one_core', 2000.00, '2026-02-01 09:00:00+02', 'cardcom', 6, 1, 'completed');

-- ONE™ VIP — עידן מזרחי (2 monthly, one pending)
insert into transactions (customer_id, lead_id, program, amount, date, payment_method, installments_total, installments_paid, status) values
  (c07, l08, 'one_vip', 3000.00, '2026-01-26 10:35:00+02', 'cardcom', 6, 1, 'completed');

-- ONE™ VIP — תומר אלון (1 paid, 1 pending)
insert into transactions (customer_id, lead_id, program, amount, date, payment_method, installments_total, installments_paid, status) values
  (c08, l11, 'one_vip', 3000.00, '2026-02-06 12:05:00+02', 'upay', 6, 1, 'completed'),
  (c08, l11, 'one_vip', 3000.00, '2026-03-06 12:00:00+02', 'upay', 6, 2, 'pending');

-- ---- FUNNEL EVENTS ----
-- שירה כהן — full funnel to purchase (ONE™ Core)
insert into funnel_events (lead_id, event_type, timestamp, metadata) values
  (l01, 'viewed_content',      '2026-01-05 10:00:00+02', '{"source":"meta_ad","content":"offer_doc_vsl"}'),
  (l01, 'engaged_dm',          '2026-01-06 08:15:00+02', '{"channel":"instagram"}'),
  (l01, 'visited_offer_doc',   '2026-01-07 14:00:00+02', '{"time_on_page":320}'),
  (l01, 'applied',             '2026-01-08 10:00:00+02', '{}'),
  (l01, 'qualified',           '2026-01-09 11:00:00+02', '{}'),
  (l01, 'started_onboarding',  '2026-01-10 10:00:00+02', '{}'),
  (l01, 'purchased',           '2026-01-10 10:05:00+02', '{"program":"one_core","amount":2000}');

-- יוסי לוי — full funnel (ONE™ VIP)
insert into funnel_events (lead_id, event_type, timestamp, metadata) values
  (l02, 'viewed_content',      '2026-01-07 14:30:00+02', '{"source":"meta_ad"}'),
  (l02, 'visited_offer_doc',   '2026-01-07 14:55:00+02', '{"time_on_page":480}'),
  (l02, 'applied',             '2026-01-08 10:00:00+02', '{}'),
  (l02, 'purchased',           '2026-01-08 14:35:00+02', '{"program":"one_vip","amount":3000}');

-- מיכל אברהם — full funnel (ONE™ Core)
insert into funnel_events (lead_id, event_type, timestamp, metadata) values
  (l03, 'viewed_content',      '2026-01-10 09:15:00+02', '{"source":"meta_ad"}'),
  (l03, 'engaged_dm',          '2026-01-11 07:30:00+02', '{"channel":"whatsapp"}'),
  (l03, 'visited_offer_doc',   '2026-01-12 10:00:00+02', '{"time_on_page":250}'),
  (l03, 'applied',             '2026-01-13 14:00:00+02', '{}'),
  (l03, 'qualified',           '2026-01-14 16:00:00+02', '{}'),
  (l03, 'purchased',           '2026-01-15 09:20:00+02', '{"program":"one_core","amount":2000}');

-- דני פרץ — organic, short funnel (ONE™ VIP)
insert into funnel_events (lead_id, event_type, timestamp, metadata) values
  (l04, 'viewed_content',      '2026-01-12 16:00:00+02', '{"source":"organic","content":"youtube"}'),
  (l04, 'visited_offer_doc',   '2026-01-12 16:20:00+02', '{"time_on_page":600}'),
  (l04, 'applied',             '2026-01-13 10:00:00+02', '{}'),
  (l04, 'purchased',           '2026-01-13 16:05:00+02', '{"program":"one_vip","amount":3000}');

-- נועה ברק — stuck at applied
insert into funnel_events (lead_id, event_type, timestamp, metadata) values
  (l07, 'viewed_content',      '2026-01-22 13:00:00+02', '{"source":"meta_ad"}'),
  (l07, 'engaged_dm',          '2026-01-23 09:00:00+02', '{"channel":"instagram"}'),
  (l07, 'visited_offer_doc',   '2026-01-25 11:00:00+02', '{"time_on_page":180}'),
  (l07, 'applied',             '2026-01-28 14:00:00+02', '{"notes":"ביקשה לחשוב על זה"}');

-- הדר רוזן — referral, qualified
insert into funnel_events (lead_id, event_type, timestamp, metadata) values
  (l09, 'viewed_content',      '2026-02-01 09:00:00+02', '{"source":"referral","referred_by":"שירה כהן"}'),
  (l09, 'visited_offer_doc',   '2026-02-01 09:30:00+02', '{"time_on_page":420}'),
  (l09, 'engaged_dm',          '2026-02-02 10:00:00+02', '{"channel":"whatsapp"}'),
  (l09, 'applied',             '2026-02-03 14:00:00+02', '{}'),
  (l09, 'qualified',           '2026-02-04 10:00:00+02', '{}');

-- יעל מנדל — lost lead
insert into funnel_events (lead_id, event_type, timestamp, metadata) values
  (l16, 'viewed_content',      '2026-02-20 16:30:00+02', '{"source":"meta_ad"}');

-- קרן אור — just viewed content
insert into funnel_events (lead_id, event_type, timestamp, metadata) values
  (l20, 'viewed_content',      '2026-03-10 08:30:00+02', '{"source":"meta_ad"}');

-- ---- CAMPAIGNS (5) ----
insert into campaigns (name, program, daily_spend, impressions, clicks, leads_count, purchases, date) values
  ('Offer Doc VSL - ONE™ Core',        'one_core', 180.00, 12500, 420, 18, 3, '2026-01-15'),
  ('Content Funnel - ONE™ VIP',        'one_vip',   95.00,  8200, 310, 25, 5, '2026-01-15'),
  ('Content Funnel - ONE™ VIP v2',     'one_vip',   65.00,  4100, 185, 12, 3, '2026-02-01'),
  ('Offer Doc VSL - ONE™ Core v2',     'one_core', 200.00, 14000, 480, 22, 2, '2026-02-15'),
  ('Retargeting - All Programs',        null,        45.00,  6800, 250,  8, 2, '2026-03-01');

-- ---- MEETINGS (6) ----
insert into meetings (customer_id, lead_id, date, type, summary, status) values
  (c01, l01, '2026-01-10 14:00:00+02', 'onboarding',   'הגדרנו יעדים ל-3 חודשים קדימה. שירה רוצה להגיע ל-10 לקוחות חדשים בחודש.',                      'completed'),
  (c01, l01, '2026-02-10 14:00:00+02', 'monthly_1on1',  'סקירת חודש ראשון. 4 לקוחות חדשים, שיפור בנראות ברשתות. צריך לחדד את המסר.',                    'completed'),
  (c03, l03, '2026-01-20 11:00:00+02', 'onboarding',   'מיכל רוצה להתמקד בעיצוב לוגואים לעסקים קטנים. בנינו תוכנית תוכן.',                                'completed'),
  (null, l07, '2026-01-28 14:00:00+02', 'strategy_session', 'נועה מתלבטת. הבינה את הערך אבל צריכה לבדוק תקציב. לחזור אליה בעוד שבוע.', 'completed'),
  (null, l14, '2026-03-20 15:00:00+02', 'strategy_session', null,                                                                         'scheduled'),
  (c01, l01, '2026-03-10 14:00:00+02', 'monthly_1on1',  'חודש שלישי. שירה כבר ב-8 לקוחות. התחלנו לעבוד על מודעות ממומנות.',                                 'completed');

-- ---- GOALS (2) ----
insert into goals (quarter, year, target_type, target_value, current_value, label) values
  (1, 2026, 'revenue',   50000.00, 43000.00, 'הכנסות Q1 2026'),
  (1, 2026, 'customers',    15.00,     8.00, 'לקוחות חדשים Q1 2026');

-- ---- NOTES (10) ----
insert into notes (lead_id, customer_id, content, author) values
  (l01, c01,  'שירה מאוד מוטיבצית. יש לה קהל קיים באינסטגרם עם 2,000 עוקבים. פוטנציאל גבוה.',   'בן'),
  (l02, c02,  'יוסי קפץ ישר ל-VIP אחרי שקרא את ה-Offer Doc. אמר שזה בדיוק מה שחיפש.',           'בן'),
  (l03, c03,  'מיכל צריכה עזרה בתמחור. היא גובה 800 שקל לעיצוב לוגו — נמוך מדי.',                  'בן'),
  (l07, null, 'נועה מעניינת מאוד. יש לה עסק קיים אבל אין לה נוכחות דיגיטלית בכלל.',                'בן'),
  (l09, null, 'הגיעה דרך המלצה של שירה. שאלה שאלות מאוד ספציפיות — סימן טוב.',                       'בן'),
  (l14, null, 'סיון דיאטנית קלינית, רוצה לפתוח קורס דיגיטלי. פגישת אסטרטגיה נקבעה ל-20/3.',       'בן'),
  (l16, null, 'יעל לא מתאימה — חיפשה ניהול סושיאל ולא שיווק עצמי. סגרנו בטוב.',                     'בן'),
  (null, c06, 'אמיר מגיע מיוטיוב. פוטנציאל גבוה — קהל מאוד ממוקד.',                                  'בן'),
  (l19, null, 'מתן מלמד גיטרה ורוצה לעשות קורס דיגיטלי. מילא application — נראה רציני.',             'בן'),
  (null, c08, 'תומר שילם דרך upay — הסליקה הראשונה נכשלה, צריך לעקוב.',                               'בן');

-- ---- EXPENSES (5) ----
insert into expenses (category, amount, date, description) values
  ('meta_ads',       4500.00, '2026-01-31', 'הוצאות Meta ינואר 2026'),
  ('meta_ads',       5200.00, '2026-02-28', 'הוצאות Meta פברואר 2026'),
  ('ai_tools',        180.00, '2026-01-15', 'Claude Pro + API'),
  ('editing_design',  350.00, '2026-02-10', 'עריכת וידאו Offer Doc VSL'),
  ('software',        250.00, '2026-01-01', 'n8n cloud + Skool Pro');

-- ---- APPLICATIONS (3) ----
insert into applications (lead_id, answers, score, status, reviewed_by, reviewed_at) values
  (l07, '{"occupation":"מטפלת שיאצו","revenue":"5000-10000","clients":8,"goal":"להגדיל לקוחות דרך תוכן","budget":"מוכנה להשקיע"}', 78, 'pending', null, null),
  (l09, '{"occupation":"נטורופתית","revenue":"10000-20000","clients":12,"goal":"למכור קורסים אונליין","budget":"מוכנה להשקיע"}', 85, 'approved', 'בן', '2026-02-04 10:00:00+02'),
  (l14, '{"occupation":"דיאטנית קלינית","revenue":"15000-25000","clients":20,"goal":"קורס דיגיטלי + ליווי","budget":"מוכנה"}', 82, 'pending', null, null);

end $$;
