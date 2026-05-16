-- =====================================================
-- DEPRECATED: Do NOT use this file for new deployments.
--
-- This monolithic script contains OUTDATED RLS policies
-- and role definitions that have been superseded by:
--   020_simplify_roles.sql
--   023_fix_rls_security.sql
--
-- For new setups, run the numbered migrations (001–023)
-- in order instead. Running this file alone will install
-- overly permissive security policies.
-- =====================================================
-- Chai Wala Babu - Run All Migrations (in order)
-- Paste this entire file into Supabase SQL Editor.
-- Every statement is idempotent and safe to re-run.
-- =====================================================


-- ==> 001_create_profiles
CREATE TABLE IF NOT EXISTS public.profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name text,
  phone text,
  role text NOT NULL DEFAULT 'customer'
    CHECK (role IN ('customer', 'waiter', 'cook', 'reception', 'manager', 'admin')),
  avatar_url text,
  created_at timestamptz DEFAULT now()
);


-- ==> 002_create_categories
CREATE TABLE IF NOT EXISTS public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  icon text DEFAULT '☕',
  sort_order int DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);


-- ==> 003_create_menu_items
CREATE TABLE IF NOT EXISTS public.menu_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL,
  name text NOT NULL,
  description text,
  price numeric(10,2) NOT NULL DEFAULT 0,
  image_url text,
  is_available boolean DEFAULT true,
  is_veg boolean DEFAULT true,
  prep_time_mins int DEFAULT 5,
  created_at timestamptz DEFAULT now()
);


-- ==> 004_create_tables
CREATE TABLE IF NOT EXISTS public.tables (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label text NOT NULL,
  capacity int DEFAULT 4,
  status text DEFAULT 'free'
    CHECK (status IN ('free', 'occupied', 'reserved')),
  created_at timestamptz DEFAULT now()
);


-- ==> 005_create_orders
CREATE TABLE IF NOT EXISTS public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  table_id uuid REFERENCES public.tables(id) ON DELETE SET NULL,
  waiter_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'placed'
    CHECK (status IN ('placed', 'accepted', 'preparing', 'ready', 'served', 'completed', 'cancelled')),
  total numeric(10,2) DEFAULT 0,
  order_type text DEFAULT 'dine_in'
    CHECK (order_type IN ('dine_in', 'takeaway')),
  notes text,
  created_at timestamptz DEFAULT now()
);


-- ==> 006_create_order_items
CREATE TABLE IF NOT EXISTS public.order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  menu_item_id uuid REFERENCES public.menu_items(id) ON DELETE SET NULL,
  quantity int NOT NULL DEFAULT 1,
  price numeric(10,2) NOT NULL DEFAULT 0,
  notes text,
  status text DEFAULT 'pending'
    CHECK (status IN ('pending', 'preparing', 'ready')),
  created_at timestamptz DEFAULT now()
);


-- ==> 007_enable_rls
ALTER TABLE public.profiles    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_items  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tables      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;


-- ==> 008_rls_profiles
DO $$ BEGIN
  DROP POLICY IF EXISTS "Anyone can read profiles"      ON public.profiles;
  DROP POLICY IF EXISTS "Users can update own profile"   ON public.profiles;
  DROP POLICY IF EXISTS "Users can insert own profile"   ON public.profiles;
END $$;

CREATE POLICY "Anyone can read profiles"
  ON public.profiles FOR SELECT USING (true);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);


-- ==> 009_rls_categories
DO $$ BEGIN
  DROP POLICY IF EXISTS "Anyone can read categories"  ON public.categories;
  DROP POLICY IF EXISTS "Admin can manage categories"  ON public.categories;
END $$;

CREATE POLICY "Anyone can read categories"
  ON public.categories FOR SELECT USING (true);

CREATE POLICY "Admin can manage categories"
  ON public.categories FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin')
  );


-- ==> 010_rls_menu_items
DO $$ BEGIN
  DROP POLICY IF EXISTS "Anyone can read menu items"  ON public.menu_items;
  DROP POLICY IF EXISTS "Admin can manage menu items"  ON public.menu_items;
END $$;

CREATE POLICY "Anyone can read menu items"
  ON public.menu_items FOR SELECT USING (true);

CREATE POLICY "Admin can manage menu items"
  ON public.menu_items FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin')
  );


-- ==> 011_rls_tables
DO $$ BEGIN
  DROP POLICY IF EXISTS "Anyone can read tables"  ON public.tables;
  DROP POLICY IF EXISTS "Staff can manage tables"  ON public.tables;
END $$;

CREATE POLICY "Anyone can read tables"
  ON public.tables FOR SELECT USING (true);

CREATE POLICY "Staff can manage tables"
  ON public.tables FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role IN ('admin', 'reception', 'waiter'))
  );


-- ==> 012_rls_orders
DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can read relevant orders"  ON public.orders;
  DROP POLICY IF EXISTS "Users can create orders"          ON public.orders;
  DROP POLICY IF EXISTS "Staff can update orders"          ON public.orders;
END $$;

CREATE POLICY "Users can read relevant orders"
  ON public.orders FOR SELECT USING (
    auth.uid() = customer_id OR auth.uid() = waiter_id OR
    EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role IN ('admin', 'manager', 'reception', 'cook'))
  );

CREATE POLICY "Users can create orders"
  ON public.orders FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Staff can update orders"
  ON public.orders FOR UPDATE USING (auth.uid() IS NOT NULL);


-- ==> 013_rls_order_items
DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can read order items"   ON public.order_items;
  DROP POLICY IF EXISTS "Users can create order items"  ON public.order_items;
  DROP POLICY IF EXISTS "Staff can update order items"  ON public.order_items;
END $$;

CREATE POLICY "Users can read order items"
  ON public.order_items FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.orders WHERE orders.id = order_items.order_id AND (
        orders.customer_id = auth.uid() OR orders.waiter_id = auth.uid() OR
        EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role IN ('admin', 'manager', 'reception', 'cook'))
      )
    )
  );

CREATE POLICY "Users can create order items"
  ON public.order_items FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Staff can update order items"
  ON public.order_items FOR UPDATE USING (auth.uid() IS NOT NULL);


-- ==> 014_trigger_auto_profile
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', ''),
    'customer'
  )
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ==> 015_enable_realtime
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'orders'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'order_items'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.order_items;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'tables'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.tables;
  END IF;
END $$;
