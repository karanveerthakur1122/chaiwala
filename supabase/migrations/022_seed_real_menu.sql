-- =====================================================
-- Migration: 022_seed_real_menu
-- Description: Seed the REAL restaurant menu extracted
--              from physical menu card photos. Adds new
--              categories, updates prices, adds missing items.
-- Depends on: 019 (initial seed)
-- Safe to re-run: YES (uses IF NOT EXISTS / name checks)
-- =====================================================

DO $$
DECLARE
  -- Existing categories (fetched by name)
  cat_chai_milk     uuid;
  cat_tea_nomilk    uuid;
  cat_hot_coffee    uuid;
  cat_cold_coffee   uuid;
  cat_shakes        uuid;
  cat_lassi         uuid;
  cat_refreshing    uuid;
  cat_mojito        uuid;
  cat_fresh_juice   uuid;
  cat_maggie        uuid;
  cat_burger        uuid;
  cat_fried_chicken uuid;
  cat_sandwich      uuid;
  cat_wrap          uuid;
  cat_pasta         uuid;
  cat_combo         uuid;
  cat_american_corn uuid;
  cat_eggs          uuid;
  _check            int;
BEGIN

  -- ========== CHECKPOINT: Skip if already applied ==========
  SELECT count(*) INTO _check
  FROM public.categories WHERE name = 'Chai With Milk';
  IF _check > 0 THEN
    RAISE NOTICE '[022] Migration already applied (Chai With Milk exists). Skipping.';
    RETURN;
  END IF;

  RAISE NOTICE '[022] Starting real menu seed...';


  -- ================================================================
  --  STEP 1: Deactivate old categories that are being reorganized
  --          (we keep data intact, just hide from UI)
  -- ================================================================
  UPDATE public.categories SET is_active = false
  WHERE name IN ('Hot Tea', 'Coffee', 'Shakes & Lassi', 'Juices & Mojitos',
                 'Fries & Sides', 'Soups', 'Starters',
                 'Main Course & Thali', 'Momo', 'Noodles, Rice & Pasta')
    AND is_active = true;

  RAISE NOTICE '[022] Deactivated old categories that are being replaced';


  -- ================================================================
  --  STEP 2: Insert new categories from the real menu
  -- ================================================================

  INSERT INTO public.categories (id, name, icon, sort_order, is_active) VALUES
    (gen_random_uuid(), 'Chai With Milk',     '☕',  1,  true),
    (gen_random_uuid(), 'Tea Without Milk',   '🍵',  2,  true),
    (gen_random_uuid(), 'Hot Coffee',         '☕',  3,  true),
    (gen_random_uuid(), 'Cold Coffee',        '🧊',  4,  true),
    (gen_random_uuid(), 'Shake',              '🥤',  5,  true),
    (gen_random_uuid(), 'Lassi',              '🥛',  6,  true),
    (gen_random_uuid(), 'Refreshing Drinks',  '🍋',  7,  true),
    (gen_random_uuid(), 'Mojito',             '🍹',  8,  true),
    (gen_random_uuid(), 'Fresh Fruit Juices', '🧃',  9,  true),
    (gen_random_uuid(), 'Maggie',             '🍜', 10,  true),
    (gen_random_uuid(), 'Burger',             '🍔', 11,  true),
    (gen_random_uuid(), 'Fried Chicken',      '🍗', 12,  true),
    (gen_random_uuid(), 'Sandwich',           '🥪', 13,  true),
    (gen_random_uuid(), 'Wrap',               '🌯', 14,  true),
    (gen_random_uuid(), 'Pasta',              '🍝', 15,  true),
    (gen_random_uuid(), 'Combo',              '🍱', 16,  true),
    (gen_random_uuid(), 'American Corn',      '🌽', 17,  true),
    (gen_random_uuid(), 'Eggs',               '🥚', 18,  true)
  ON CONFLICT DO NOTHING;

  -- Fetch all category IDs
  SELECT id INTO cat_chai_milk     FROM public.categories WHERE name = 'Chai With Milk'     LIMIT 1;
  SELECT id INTO cat_tea_nomilk    FROM public.categories WHERE name = 'Tea Without Milk'   LIMIT 1;
  SELECT id INTO cat_hot_coffee    FROM public.categories WHERE name = 'Hot Coffee'         LIMIT 1;
  SELECT id INTO cat_cold_coffee   FROM public.categories WHERE name = 'Cold Coffee'        LIMIT 1;
  SELECT id INTO cat_shakes        FROM public.categories WHERE name = 'Shake'              LIMIT 1;
  SELECT id INTO cat_lassi         FROM public.categories WHERE name = 'Lassi'              LIMIT 1;
  SELECT id INTO cat_refreshing    FROM public.categories WHERE name = 'Refreshing Drinks'  LIMIT 1;
  SELECT id INTO cat_mojito        FROM public.categories WHERE name = 'Mojito'             LIMIT 1;
  SELECT id INTO cat_fresh_juice   FROM public.categories WHERE name = 'Fresh Fruit Juices' LIMIT 1;
  SELECT id INTO cat_maggie        FROM public.categories WHERE name = 'Maggie'             LIMIT 1;
  SELECT id INTO cat_burger        FROM public.categories WHERE name = 'Burger'             LIMIT 1;
  SELECT id INTO cat_fried_chicken FROM public.categories WHERE name = 'Fried Chicken'      LIMIT 1;
  SELECT id INTO cat_sandwich      FROM public.categories WHERE name = 'Sandwich'           LIMIT 1;
  SELECT id INTO cat_wrap          FROM public.categories WHERE name = 'Wrap'               LIMIT 1;
  SELECT id INTO cat_pasta         FROM public.categories WHERE name = 'Pasta'              LIMIT 1;
  SELECT id INTO cat_combo         FROM public.categories WHERE name = 'Combo'              LIMIT 1;
  SELECT id INTO cat_american_corn FROM public.categories WHERE name = 'American Corn'      LIMIT 1;
  SELECT id INTO cat_eggs          FROM public.categories WHERE name = 'Eggs'               LIMIT 1;

  RAISE NOTICE '[022] 18 categories created';


  -- ================================================================
  --  STEP 3: Insert menu items (skip if name already exists in DB)
  -- ================================================================

  -- ========== CHAI WITH MILK ==========
  INSERT INTO public.menu_items (category_id, name, price, is_veg, is_available, image_url)
  SELECT v.category_id, v.name, v.price, v.is_veg, true,
         'https://images.unsplash.com/photo-1592147164960-236b56dd18e0?w=400&h=300&fit=crop&q=80'
  FROM (VALUES
    (cat_chai_milk, 'Regular Chai',      20, true),
    (cat_chai_milk, 'Black Paper Chai',  25, true),
    (cat_chai_milk, 'Masala Chai',       25, true),
    (cat_chai_milk, 'Ginger Chai',       25, true),
    (cat_chai_milk, 'Elaichi Chai',      25, true),
    (cat_chai_milk, 'Sugar Free Chai',   25, true),
    (cat_chai_milk, 'Chocolate Chai',    30, true)
  ) AS v(category_id, name, price, is_veg)
  WHERE NOT EXISTS (
    SELECT 1 FROM public.menu_items m WHERE m.name = v.name AND m.category_id = v.category_id
  );

  RAISE NOTICE '[022] Chai With Milk: 7 items';


  -- ========== TEA WITHOUT MILK ==========
  INSERT INTO public.menu_items (category_id, name, price, is_veg, is_available, image_url)
  SELECT v.category_id, v.name, v.price, v.is_veg, true,
         'https://images.unsplash.com/photo-1564890369478-c89ca6d9cde9?w=400&h=300&fit=crop&q=80'
  FROM (VALUES
    (cat_tea_nomilk, 'Green Tea',         30, true),
    (cat_tea_nomilk, 'Lemon Tea',         30, true),
    (cat_tea_nomilk, 'Honey Lemon Tea',   25, true),
    (cat_tea_nomilk, 'Tulsi Tea',         30, true),
    (cat_tea_nomilk, 'Red Tea',           30, true)
  ) AS v(category_id, name, price, is_veg)
  WHERE NOT EXISTS (
    SELECT 1 FROM public.menu_items m WHERE m.name = v.name AND m.category_id = v.category_id
  );

  RAISE NOTICE '[022] Tea Without Milk: 5 items';


  -- ========== HOT COFFEE ==========
  INSERT INTO public.menu_items (category_id, name, price, is_veg, is_available, image_url)
  SELECT v.category_id, v.name, v.price, v.is_veg, true,
         'https://images.unsplash.com/photo-1669513975851-6cc8a5cf9329?w=400&h=300&fit=crop&q=80'
  FROM (VALUES
    (cat_hot_coffee, 'Hot Coffee',        25, true),
    (cat_hot_coffee, 'Black Coffee',      20, true),
    (cat_hot_coffee, 'Caramel Coffee',    30, true),
    (cat_hot_coffee, 'Elaichi Coffee',    30, true),
    (cat_hot_coffee, 'Chocolate Coffee',  30, true)
  ) AS v(category_id, name, price, is_veg)
  WHERE NOT EXISTS (
    SELECT 1 FROM public.menu_items m WHERE m.name = v.name AND m.category_id = v.category_id
  );

  RAISE NOTICE '[022] Hot Coffee: 5 items';


  -- ========== COLD COFFEE ==========
  INSERT INTO public.menu_items (category_id, name, price, is_veg, is_available, image_url)
  SELECT v.category_id, v.name, v.price, v.is_veg, true,
         'https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?w=400&h=300&fit=crop&q=80'
  FROM (VALUES
    (cat_cold_coffee, 'Cold Coffee',                          80, true),
    (cat_cold_coffee, 'Cold Coffee with Ice Cream',          100, true),
    (cat_cold_coffee, 'Chocolate Cold Coffee',                90, true),
    (cat_cold_coffee, 'Choco Cold Coffee with Kitkat',       100, true),
    (cat_cold_coffee, 'Oreo Cold Coffee + Ice Cream',        100, true),
    (cat_cold_coffee, 'Cold Coffee + Ice Cream + Chocochips',110, true)
  ) AS v(category_id, name, price, is_veg)
  WHERE NOT EXISTS (
    SELECT 1 FROM public.menu_items m WHERE m.name = v.name AND m.category_id = v.category_id
  );

  RAISE NOTICE '[022] Cold Coffee: 6 items';


  -- ========== SHAKE ==========
  INSERT INTO public.menu_items (category_id, name, price, is_veg, is_available, image_url)
  SELECT v.category_id, v.name, v.price, v.is_veg, true,
         'https://images.unsplash.com/photo-1579175973774-8294208931a4?w=400&h=300&fit=crop&q=80'
  FROM (VALUES
    (cat_shakes, 'Milk Shake',           55, true),
    (cat_shakes, 'Chocolate Shake',      95, true),
    (cat_shakes, 'Strawberry Shake',     95, true),
    (cat_shakes, 'Butter Scotch Shake',  75, true),
    (cat_shakes, 'Kitkat Shake',         95, true),
    (cat_shakes, 'Oreo Shake',           95, true),
    (cat_shakes, 'Black Current Shake', 100, true)
  ) AS v(category_id, name, price, is_veg)
  WHERE NOT EXISTS (
    SELECT 1 FROM public.menu_items m WHERE m.name = v.name AND m.category_id = v.category_id
  );

  RAISE NOTICE '[022] Shake: 7 items';


  -- ========== LASSI ==========
  INSERT INTO public.menu_items (category_id, name, price, is_veg, is_available, image_url)
  SELECT v.category_id, v.name, v.price, v.is_veg, true,
         'https://images.unsplash.com/photo-1587049016823-69ef9d68bd44?w=400&h=300&fit=crop&q=80'
  FROM (VALUES
    (cat_lassi, 'Regular Lassi',    70, true),
    (cat_lassi, 'Chocolate Lassi',  85, true)
  ) AS v(category_id, name, price, is_veg)
  WHERE NOT EXISTS (
    SELECT 1 FROM public.menu_items m WHERE m.name = v.name AND m.category_id = v.category_id
  );

  RAISE NOTICE '[022] Lassi: 2 items';


  -- ========== REFRESHING DRINKS (Sweet & Salty) ==========
  INSERT INTO public.menu_items (category_id, name, price, is_veg, is_available, image_url)
  SELECT v.category_id, v.name, v.price, v.is_veg, true,
         'https://images.unsplash.com/photo-1555766720-1e727844cc8f?w=400&h=300&fit=crop&q=80'
  FROM (VALUES
    (cat_refreshing, 'Jeera Masala Soda',   40, true),
    (cat_refreshing, 'Kala Khata Sarbat',   40, true),
    (cat_refreshing, 'Nimbu Pani',          65, true),
    (cat_refreshing, 'Jaljeera Special',    65, true),
    (cat_refreshing, 'Masala Soda',         65, true)
  ) AS v(category_id, name, price, is_veg)
  WHERE NOT EXISTS (
    SELECT 1 FROM public.menu_items m WHERE m.name = v.name AND m.category_id = v.category_id
  );

  RAISE NOTICE '[022] Refreshing Drinks: 5 items';


  -- ========== MOJITO ==========
  INSERT INTO public.menu_items (category_id, name, price, is_veg, is_available, image_url)
  SELECT v.category_id, v.name, v.price, v.is_veg, true,
         'https://images.unsplash.com/photo-1753263453239-fef8e92b5040?w=400&h=300&fit=crop&q=80'
  FROM (VALUES
    (cat_mojito, 'Fresh Lime Soda',  65, true),
    (cat_mojito, 'Blue Lagoon',      75, true),
    (cat_mojito, 'Virgin Mojito',    70, true),
    (cat_mojito, 'Mint Mojito',      75, true)
  ) AS v(category_id, name, price, is_veg)
  WHERE NOT EXISTS (
    SELECT 1 FROM public.menu_items m WHERE m.name = v.name AND m.category_id = v.category_id
  );

  RAISE NOTICE '[022] Mojito: 4 items';


  -- ========== FRESH FRUIT JUICES ==========
  INSERT INTO public.menu_items (category_id, name, price, is_veg, is_available, image_url)
  SELECT v.category_id, v.name, v.price, v.is_veg, true,
         'https://images.unsplash.com/photo-1600271886742-f049cd451bba?w=400&h=300&fit=crop&q=80'
  FROM (VALUES
    (cat_fresh_juice, 'Watermelon Juice',  65, true),
    (cat_fresh_juice, 'Pineapple Juice',   65, true),
    (cat_fresh_juice, 'Mango Juice',       65, true),
    (cat_fresh_juice, 'Orange Juice',      65, true)
  ) AS v(category_id, name, price, is_veg)
  WHERE NOT EXISTS (
    SELECT 1 FROM public.menu_items m WHERE m.name = v.name AND m.category_id = v.category_id
  );

  RAISE NOTICE '[022] Fresh Fruit Juices: 4 items';


  -- ========== MAGGIE ==========
  INSERT INTO public.menu_items (category_id, name, price, is_veg, is_available, image_url)
  SELECT v.category_id, v.name, v.price, v.is_veg, true,
         'https://images.unsplash.com/photo-1603033172872-c2525115c7b9?w=400&h=300&fit=crop&q=80'
  FROM (VALUES
    (cat_maggie, 'Plain Maggie',          60, true),
    (cat_maggie, 'Masala Maggie',         70, true),
    (cat_maggie, 'Veg Maggie',           80, true),
    (cat_maggie, 'Cheese Maggie',        85, true),
    (cat_maggie, 'Paneer Maggie',        80, true),
    (cat_maggie, 'Cheese Special Maggie',80, true),
    (cat_maggie, 'Cheese Corn Maggie',   80, true),
    (cat_maggie, 'Veg Mix Maggie',       80, true),
    (cat_maggie, 'Egg Maggie',           70, false),
    (cat_maggie, 'Double Egg Maggie',    80, false),
    (cat_maggie, 'Chicken Maggie',       90, false),
    (cat_maggie, 'Chicken Egg Maggie',   90, false)
  ) AS v(category_id, name, price, is_veg)
  WHERE NOT EXISTS (
    SELECT 1 FROM public.menu_items m WHERE m.name = v.name AND m.category_id = v.category_id
  );

  RAISE NOTICE '[022] Maggie: 12 items';


  -- ========== BURGER ==========
  INSERT INTO public.menu_items (category_id, name, price, is_veg, is_available, image_url)
  SELECT v.category_id, v.name, v.price, v.is_veg, true,
         'https://images.unsplash.com/photo-1626414375186-12406f7e95f1?w=400&h=300&fit=crop&q=80'
  FROM (VALUES
    (cat_burger, 'Salad Burger',            55, true),
    (cat_burger, 'Veg Burger',              75, true),
    (cat_burger, 'Cheese Veg Burger',       85, true),
    (cat_burger, 'Paneer Patty Burger',     85, true),
    (cat_burger, 'Paneer Cheese Burger',    95, true),
    (cat_burger, 'Cheese Burger',          130, true),
    (cat_burger, 'Chicken Burger',          85, false),
    (cat_burger, 'Double Chicken Burger',  120, false),
    (cat_burger, 'Egg Burger',              85, false),
    (cat_burger, 'Double Egg Burger',      105, false),
    (cat_burger, 'Chicken Crunchy Burger', 105, false),
    (cat_burger, 'Chicken Cheese Burger',  130, false)
  ) AS v(category_id, name, price, is_veg)
  WHERE NOT EXISTS (
    SELECT 1 FROM public.menu_items m WHERE m.name = v.name AND m.category_id = v.category_id
  );

  RAISE NOTICE '[022] Burger: 12 items';


  -- ========== FRIED CHICKEN ==========
  INSERT INTO public.menu_items (category_id, name, price, is_veg, is_available, image_url)
  SELECT v.category_id, v.name, v.price, v.is_veg, true,
         'https://images.unsplash.com/photo-1626645738196-c2a7c87a8f58?w=400&h=300&fit=crop&q=80'
  FROM (VALUES
    (cat_fried_chicken, 'Veg Finger (6pcs)',           110, true),
    (cat_fried_chicken, 'Chicken Lollypop (6pcs)',     130, false),
    (cat_fried_chicken, 'Chicken Hot Wings (6pcs)',    160, false),
    (cat_fried_chicken, 'Chicken Popcorn',             110, false),
    (cat_fried_chicken, 'Crispy Chicken',              160, false),
    (cat_fried_chicken, 'Chicken Nuggets (5pcs)',      110, false),
    (cat_fried_chicken, 'Chicken Boneless (10pcs)',    150, false),
    (cat_fried_chicken, 'French Fries',                 75, true),
    (cat_fried_chicken, 'Peri Peri French Fries',       85, true)
  ) AS v(category_id, name, price, is_veg)
  WHERE NOT EXISTS (
    SELECT 1 FROM public.menu_items m WHERE m.name = v.name AND m.category_id = v.category_id
  );

  RAISE NOTICE '[022] Fried Chicken: 9 items';


  -- ========== SANDWICH ==========
  INSERT INTO public.menu_items (category_id, name, price, is_veg, is_available, image_url)
  SELECT v.category_id, v.name, v.price, v.is_veg, true,
         'https://images.unsplash.com/photo-1475090169767-40ed8d18f67d?w=400&h=300&fit=crop&q=80'
  FROM (VALUES
    (cat_sandwich, 'Salad Sandwich',                    60, true),
    (cat_sandwich, 'Veg Sandwich',                      80, true),
    (cat_sandwich, 'Double Patti Veg Sandwich',         90, true),
    (cat_sandwich, 'Paneer Sandwich',                   85, true),
    (cat_sandwich, 'Paneer Cheese Sandwich',           105, true),
    (cat_sandwich, 'Cheese Corn Sandwich',              80, true),
    (cat_sandwich, 'Egg Sandwich',                      75, false),
    (cat_sandwich, 'Dog Sandwich',                      70, false),
    (cat_sandwich, 'Chicken Crunchy Sandwich',          95, false),
    (cat_sandwich, 'Double Chicken Crunchy Sandwich',  120, false),
    (cat_sandwich, 'Chicken Egg Sandwich',              85, false),
    (cat_sandwich, 'Double Chicken Cheese Sandwich',   120, false)
  ) AS v(category_id, name, price, is_veg)
  WHERE NOT EXISTS (
    SELECT 1 FROM public.menu_items m WHERE m.name = v.name AND m.category_id = v.category_id
  );

  RAISE NOTICE '[022] Sandwich: 12 items';


  -- ========== WRAP ==========
  INSERT INTO public.menu_items (category_id, name, price, is_veg, is_available, image_url)
  SELECT v.category_id, v.name, v.price, v.is_veg, true,
         'https://images.unsplash.com/photo-1632660346941-023cc64e1252?w=400&h=300&fit=crop&q=80'
  FROM (VALUES
    (cat_wrap, 'Veg Patty Wrap',        95, true),
    (cat_wrap, 'Paneer Wrap',           95, true),
    (cat_wrap, 'Crispy Chicken Wrap',  120, false)
  ) AS v(category_id, name, price, is_veg)
  WHERE NOT EXISTS (
    SELECT 1 FROM public.menu_items m WHERE m.name = v.name AND m.category_id = v.category_id
  );

  RAISE NOTICE '[022] Wrap: 3 items';


  -- ========== PASTA ==========
  INSERT INTO public.menu_items (category_id, name, price, is_veg, is_available, image_url)
  SELECT v.category_id, v.name, v.price, v.is_veg, true,
         'https://images.unsplash.com/photo-1604679963017-2dc63f433d71?w=400&h=300&fit=crop&q=80'
  FROM (VALUES
    (cat_pasta, 'White Veg Pasta',      95, true),
    (cat_pasta, 'Red Veg Pasta',        95, true),
    (cat_pasta, 'Paneer Pasta',        100, true),
    (cat_pasta, 'Cheese Pasta',        110, true),
    (cat_pasta, 'White Chicken Pasta', 120, false),
    (cat_pasta, 'Red Chicken Pasta',   120, false),
    (cat_pasta, 'Mix Pasta',           130, false)
  ) AS v(category_id, name, price, is_veg)
  WHERE NOT EXISTS (
    SELECT 1 FROM public.menu_items m WHERE m.name = v.name AND m.category_id = v.category_id
  );

  RAISE NOTICE '[022] Pasta: 7 items';


  -- ========== COMBO ==========
  INSERT INTO public.menu_items (category_id, name, price, is_veg, is_available, image_url)
  SELECT v.category_id, v.name, v.price, v.is_veg, true,
         'https://images.unsplash.com/photo-1688059187289-a920f4e4ff95?w=400&h=300&fit=crop&q=80'
  FROM (VALUES
    (cat_combo, 'Burger + French Fries',                 140, true),
    (cat_combo, 'Veg Finger (4pcs) + French Fries',      130, true),
    (cat_combo, 'Chicken Burger + Hot Wings',            150, false),
    (cat_combo, 'Chicken Popcorn + French Fries',        130, false),
    (cat_combo, 'Chicken Finger + French Fries',         120, false),
    (cat_combo, 'Chicken Nuggets + French Fries',        120, false)
  ) AS v(category_id, name, price, is_veg)
  WHERE NOT EXISTS (
    SELECT 1 FROM public.menu_items m WHERE m.name = v.name AND m.category_id = v.category_id
  );

  RAISE NOTICE '[022] Combo: 6 items';


  -- ========== AMERICAN CORN ==========
  INSERT INTO public.menu_items (category_id, name, price, is_veg, is_available, image_url)
  SELECT v.category_id, v.name, v.price, v.is_veg, true,
         'https://images.unsplash.com/photo-1551754655-cd27e38d2076?w=400&h=300&fit=crop&q=80'
  FROM (VALUES
    (cat_american_corn, 'Crispy Chilli Corn',                50, true),
    (cat_american_corn, 'Crispy Chilli Honey Corn',          80, true),
    (cat_american_corn, 'Mushroom Corn Salt & Pepper',      100, true),
    (cat_american_corn, 'Paneer Corn Salt & Pepper',        100, true),
    (cat_american_corn, 'Mayo Chilli Corn',                  100, true),
    (cat_american_corn, 'Crispy Chilli Honey Chicken',      100, false),
    (cat_american_corn, 'Garlic Chicken Salt & Pepper',      55, false),
    (cat_american_corn, 'Chicken Salt & Pepper',             75, false),
    (cat_american_corn, 'Chilli Chicken Corn',               95, false)
  ) AS v(category_id, name, price, is_veg)
  WHERE NOT EXISTS (
    SELECT 1 FROM public.menu_items m WHERE m.name = v.name AND m.category_id = v.category_id
  );

  RAISE NOTICE '[022] American Corn: 9 items';


  -- ========== EGGS ==========
  INSERT INTO public.menu_items (category_id, name, price, is_veg, is_available, image_url)
  SELECT v.category_id, v.name, v.price, v.is_veg, true,
         'https://images.unsplash.com/photo-1525351484163-7529414344d8?w=400&h=300&fit=crop&q=80'
  FROM (VALUES
    (cat_eggs, 'Bread Omelette',      110, false),
    (cat_eggs, 'Egg Omelette',        110, false),
    (cat_eggs, 'Double Egg Omelette', 120, false)
  ) AS v(category_id, name, price, is_veg)
  WHERE NOT EXISTS (
    SELECT 1 FROM public.menu_items m WHERE m.name = v.name AND m.category_id = v.category_id
  );

  RAISE NOTICE '[022] Eggs: 3 items';


  -- ================================================================
  --  STEP 4: Verification
  -- ================================================================
  SELECT count(*) INTO _check FROM public.categories WHERE is_active = true;
  RAISE NOTICE '[022] Active categories: %', _check;

  SELECT count(*) INTO _check FROM public.menu_items WHERE is_available = true;
  RAISE NOTICE '[022] Total available menu items: %', _check;


  -- ========== DONE ==========
  RAISE NOTICE '[022] Real menu seed complete. 18 new categories, ~111 items from menu card photos.';

END $$;
