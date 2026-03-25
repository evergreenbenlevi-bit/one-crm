-- RBAC: Role-Based Access Control for ONE™ CRM
-- Added: 2026-03-18

-- ENUM (idempotent)
DO $$ BEGIN CREATE TYPE user_role AS ENUM ('admin', 'user'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- USER ROLES TABLE
CREATE TABLE IF NOT EXISTS user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role user_role NOT NULL DEFAULT 'user',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_user_roles_user ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON user_roles(role);

-- RLS
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Users can read own role" ON user_roles FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Admins can manage roles" ON user_roles FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin')
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Service role full access" ON user_roles FOR ALL USING (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- UPDATED_AT TRIGGER
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  CREATE TRIGGER set_updated_at BEFORE UPDATE ON user_roles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- AUTO-ASSIGN: New users get 'user' role by default
CREATE OR REPLACE FUNCTION handle_new_user_role()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_roles (user_id, role) VALUES (new.id, 'user');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DO $$ BEGIN
  CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION handle_new_user_role();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
