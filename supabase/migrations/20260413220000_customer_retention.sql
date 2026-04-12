-- Phase D1: Customer Retention Fields
ALTER TABLE customers ADD COLUMN IF NOT EXISTS nps_score integer CHECK (nps_score BETWEEN -100 AND 100);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS satisfaction_rating integer CHECK (satisfaction_rating BETWEEN 1 AND 10);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS upsell_status text DEFAULT 'none' CHECK (upsell_status IN ('none', 'candidate', 'offered', 'accepted', 'declined'));
ALTER TABLE customers ADD COLUMN IF NOT EXISTS upsell_amount numeric;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS course_completion_pct numeric DEFAULT 0 CHECK (course_completion_pct BETWEEN 0 AND 100);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS webinar_attended boolean DEFAULT false;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS installment_count integer DEFAULT 1 CHECK (installment_count BETWEEN 1 AND 12);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS installment_number integer DEFAULT 1;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS next_installment_date date;
