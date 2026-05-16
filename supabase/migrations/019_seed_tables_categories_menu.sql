-- =====================================================
-- Migration: 019_seed_tables_categories_menu
-- Description: Seed tables T2-T10, 14 categories, and full menu
--              extracted from restaurant menu images.
-- Depends on: 001-006
-- Safe to re-run: YES (skips if data already exists)
-- =====================================================

DO $$
DECLARE
  cat_hot_tea       uuid;
  cat_coffee        uuid;
  cat_shakes_lassi  uuid;
  cat_juices_mojito uuid;
  cat_maggie        uuid;
  cat_burgers       uuid;
  cat_wraps_rolls   uuid;
  cat_sandwiches    uuid;
  cat_fries         uuid;
  cat_soups         uuid;
  cat_noodles_rice  uuid;
  cat_starters      uuid;
  cat_main_course   uuid;
  cat_momo          uuid;
  _existing_count   int;
BEGIN

  -- ========== CHECKPOINT: Skip if already seeded ==========

  SELECT count(*) INTO _existing_count FROM public.tables WHERE label IN ('T2','T3','T4','T5');
  IF _existing_count >= 4 THEN
    RAISE NOTICE '[019] Tables already seeded (%/4 found). Skipping entire migration.', _existing_count;
    RETURN;
  END IF;

  RAISE NOTICE '[019] Starting seed...';


  -- ========== TABLES T2 to T10 ==========

  INSERT INTO public.tables (label, capacity, status) VALUES
    ('T2',  2, 'free'),
    ('T3',  2, 'free'),
    ('T4',  4, 'free'),
    ('T5',  4, 'free'),
    ('T6',  4, 'free'),
    ('T7',  6, 'free'),
    ('T8',  6, 'free'),
    ('T9',  8, 'free'),
    ('T10', 8, 'free')
  ON CONFLICT DO NOTHING;

  RAISE NOTICE '[019] Tables T2-T10 inserted';


  -- ========== CATEGORIES ==========

  INSERT INTO public.categories (id, name, icon, sort_order, is_active) VALUES
    (gen_random_uuid(), 'Hot Tea',              '☕', 1,  true),
    (gen_random_uuid(), 'Coffee',               '☕', 2,  true),
    (gen_random_uuid(), 'Shakes & Lassi',       '🥤', 3,  true),
    (gen_random_uuid(), 'Juices & Mojitos',     '🍹', 4,  true),
    (gen_random_uuid(), 'Maggie',               '🍜', 5,  true),
    (gen_random_uuid(), 'Burgers',              '🍔', 6,  true),
    (gen_random_uuid(), 'Wraps & Rolls',        '🌯', 7,  true),
    (gen_random_uuid(), 'Sandwiches',           '🥪', 8,  true),
    (gen_random_uuid(), 'Fries & Sides',        '🍟', 9,  true),
    (gen_random_uuid(), 'Soups',                '🍲', 10, true),
    (gen_random_uuid(), 'Noodles, Rice & Pasta', '🍝', 11, true),
    (gen_random_uuid(), 'Starters',             '🧆', 12, true),
    (gen_random_uuid(), 'Main Course & Thali',  '🍛', 13, true),
    (gen_random_uuid(), 'Momo',                 '🥟', 14, true);

  -- Fetch category IDs
  SELECT id INTO cat_hot_tea       FROM public.categories WHERE name = 'Hot Tea'              LIMIT 1;
  SELECT id INTO cat_coffee        FROM public.categories WHERE name = 'Coffee'               LIMIT 1;
  SELECT id INTO cat_shakes_lassi  FROM public.categories WHERE name = 'Shakes & Lassi'       LIMIT 1;
  SELECT id INTO cat_juices_mojito FROM public.categories WHERE name = 'Juices & Mojitos'     LIMIT 1;
  SELECT id INTO cat_maggie        FROM public.categories WHERE name = 'Maggie'               LIMIT 1;
  SELECT id INTO cat_burgers       FROM public.categories WHERE name = 'Burgers'              LIMIT 1;
  SELECT id INTO cat_wraps_rolls   FROM public.categories WHERE name = 'Wraps & Rolls'        LIMIT 1;
  SELECT id INTO cat_sandwiches    FROM public.categories WHERE name = 'Sandwiches'           LIMIT 1;
  SELECT id INTO cat_fries         FROM public.categories WHERE name = 'Fries & Sides'        LIMIT 1;
  SELECT id INTO cat_soups         FROM public.categories WHERE name = 'Soups'                LIMIT 1;
  SELECT id INTO cat_noodles_rice  FROM public.categories WHERE name = 'Noodles, Rice & Pasta' LIMIT 1;
  SELECT id INTO cat_starters      FROM public.categories WHERE name = 'Starters'             LIMIT 1;
  SELECT id INTO cat_main_course   FROM public.categories WHERE name = 'Main Course & Thali'  LIMIT 1;
  SELECT id INTO cat_momo          FROM public.categories WHERE name = 'Momo'                 LIMIT 1;

  RAISE NOTICE '[019] 14 categories inserted';


  -- ========== HOT TEA ==========

  INSERT INTO public.menu_items (category_id, name, price, is_veg, is_available) VALUES
    (cat_hot_tea, 'Regular Tea',             25,  true, true),
    (cat_hot_tea, 'Masala Tea',              30,  true, true),
    (cat_hot_tea, 'Kesar Tea',               40,  true, true),
    (cat_hot_tea, 'Elichi Tea',              30,  true, true),
    (cat_hot_tea, 'Ginger Tea',              40,  true, true),
    (cat_hot_tea, 'Lemon Tea',               30,  true, true),
    (cat_hot_tea, 'Tulsi Lemon Tea',         40,  true, true),
    (cat_hot_tea, 'Ginger Lemon Honey Tea',  45,  true, true),
    (cat_hot_tea, 'Chocolate Tea',           50,  true, true),
    (cat_hot_tea, 'Sugar Free Tea',          30,  true, true),
    (cat_hot_tea, 'Black Tea',               35,  true, true),
    (cat_hot_tea, 'Ice Lemon Tea',           85,  true, true);

  RAISE NOTICE '[019] Hot Tea: 12 items';


  -- ========== COFFEE ==========

  INSERT INTO public.menu_items (category_id, name, price, is_veg, is_available) VALUES
    (cat_coffee, 'Light Coffee',                70,  true, true),
    (cat_coffee, 'Strong Coffee',               80,  true, true),
    (cat_coffee, 'Black Coffee',                50,  true, true),
    (cat_coffee, 'Sugar Free Coffee',           80,  true, true),
    (cat_coffee, 'Hot Chocolate Coffee',       105,  true, true),
    (cat_coffee, 'Cold Coffee',                119,  true, true),
    (cat_coffee, 'Chocolate Cold Coffee',      129,  true, true),
    (cat_coffee, 'Cold Coffee with Ice Cream', 139,  true, true),
    (cat_coffee, 'Brownie Blended Cold Coffee',149,  true, true),
    (cat_coffee, 'Oreo Cold Coffee',           149,  true, true),
    (cat_coffee, 'KitKat Cold Coffee',         149,  true, true);

  RAISE NOTICE '[019] Coffee: 11 items';


  -- ========== SHAKES & LASSI ==========

  INSERT INTO public.menu_items (category_id, name, price, is_veg, is_available) VALUES
    -- Milk Shakes
    (cat_shakes_lassi, 'Oreo Shake',            129, true, true),
    (cat_shakes_lassi, 'KitKat Shake',          129, true, true),
    (cat_shakes_lassi, 'Oreo KitKat Mix Shake', 149, true, true),
    (cat_shakes_lassi, 'Mango Shake',           119, true, true),
    (cat_shakes_lassi, 'Strawberry Shake',      129, true, true),
    (cat_shakes_lassi, 'Banana Shake',          109, true, true),
    (cat_shakes_lassi, 'Banana Caramel Shake',  129, true, true),
    (cat_shakes_lassi, 'Butterscotch Shake',    139, true, true),
    (cat_shakes_lassi, 'Rose Milk Shake',       119, true, true),
    (cat_shakes_lassi, 'Black Current Shake',   129, true, true),
    (cat_shakes_lassi, 'Blue Berry Shake',      129, true, true),
    (cat_shakes_lassi, 'Apple Kaju Shake',      149, true, true),
    (cat_shakes_lassi, 'Pineapple Shake',       129, true, true),
    (cat_shakes_lassi, 'Orange Shake',          119, true, true),
    -- Lassi
    (cat_shakes_lassi, 'Sweet Lassi',            70, true, true),
    (cat_shakes_lassi, 'Special Lassi',          90, true, true),
    (cat_shakes_lassi, 'Mango Lassi',            75, true, true),
    (cat_shakes_lassi, 'Banana Lassi',           75, true, true),
    (cat_shakes_lassi, 'Strawberry Lassi',       80, true, true),
    (cat_shakes_lassi, 'Rose Lassi',             75, true, true),
    (cat_shakes_lassi, 'Blueberry Lassi',        80, true, true);

  RAISE NOTICE '[019] Shakes & Lassi: 21 items';


  -- ========== JUICES & MOJITOS ==========

  INSERT INTO public.menu_items (category_id, name, price, is_veg, is_available) VALUES
    -- Fresh Juices
    (cat_juices_mojito, 'Water Melon Juice',      99, true, true),
    (cat_juices_mojito, 'Orange Juice',            99, true, true),
    (cat_juices_mojito, 'Apple Juice',             99, true, true),
    (cat_juices_mojito, 'Pineapple Juice',         99, true, true),
    (cat_juices_mojito, 'Mango Juice',             99, true, true),
    -- Mojitos
    (cat_juices_mojito, 'Virgin Mojito',          129, true, true),
    (cat_juices_mojito, 'Orange Virgin Mojito',   119, true, true),
    (cat_juices_mojito, 'Blue Mojito',            129, true, true),
    (cat_juices_mojito, 'Pineapple Punch',        129, true, true),
    (cat_juices_mojito, 'Kalakhata Plus',         129, true, true),
    (cat_juices_mojito, 'Spicy Lemo Fizz',        129, true, true),
    (cat_juices_mojito, 'Mango Mojito',           129, true, true),
    (cat_juices_mojito, 'Green Apple Cooler',     129, true, true),
    (cat_juices_mojito, 'Lemon Mojito',           129, true, true),
    (cat_juices_mojito, 'Water Melon Mojito',     129, true, true),
    (cat_juices_mojito, 'Strawberry Mojito',      129, true, true),
    (cat_juices_mojito, 'Mint Lemonade',          129, true, true),
    (cat_juices_mojito, 'Fresh Lime Soda Salty',   99, true, true),
    (cat_juices_mojito, 'Fresh Lime Soda Sweet',   99, true, true),
    -- Cold Drinks
    (cat_juices_mojito, 'Masala Cold Drink',       50, true, true),
    (cat_juices_mojito, 'Jaljeera',                65, true, true),
    (cat_juices_mojito, 'Coke',                    70, true, true),
    (cat_juices_mojito, 'Thumps Up',               70, true, true),
    (cat_juices_mojito, 'Fanta',                   70, true, true),
    (cat_juices_mojito, 'Sprite',                  70, true, true);

  RAISE NOTICE '[019] Juices & Mojitos: 25 items';


  -- ========== MAGGIE ==========

  INSERT INTO public.menu_items (category_id, name, price, is_veg, is_available) VALUES
    (cat_maggie, 'Yummy Plain Maggie',                    79, true,  true),
    (cat_maggie, 'Periperi Maggie',                       99, true,  true),
    (cat_maggie, 'Onion Masala Maggie',                  109, true,  true),
    (cat_maggie, 'Veg Schewan Maggie',                   109, true,  true),
    (cat_maggie, 'Veg Masala Maggie',                    109, true,  true),
    (cat_maggie, 'Paneer Maggie',                        119, true,  true),
    (cat_maggie, 'Cheese Special Maggie',                129, true,  true),
    (cat_maggie, 'Cheese Corn Maggie',                   119, true,  true),
    (cat_maggie, 'Veg Mix Maggie',                       119, true,  true),
    (cat_maggie, 'Single Egg Maggie',                    109, false, true),
    (cat_maggie, 'Double Egg Maggie',                    119, false, true),
    (cat_maggie, 'Cheese Egg Chicken Maggie',            139, false, true),
    (cat_maggie, 'Egg Chicken Maggie',                   129, false, true),
    (cat_maggie, 'Double Egg Double Chicken Maggie',     149, false, true),
    (cat_maggie, 'Non-Veg Hot & Spicy Maggie',          139, false, true),
    (cat_maggie, 'Schewan Non-Veg Spicy Maggie',        139, false, true);

  RAISE NOTICE '[019] Maggie: 16 items';


  -- ========== BURGERS ==========

  INSERT INTO public.menu_items (category_id, name, price, is_veg, is_available) VALUES
    (cat_burgers, 'Classic Aloo Tikki Burger', 149, true,  true),
    (cat_burgers, 'Veg Patty Burger',          149, true,  true),
    (cat_burgers, 'Crispy Chicken Burger',     159, false, true),
    (cat_burgers, 'Chicken Cheese Burger',     169, false, true),
    (cat_burgers, 'Paneer Cheese Burger',      159, true,  true);

  RAISE NOTICE '[019] Burgers: 5 items';


  -- ========== WRAPS & ROLLS ==========

  INSERT INTO public.menu_items (category_id, name, price, is_veg, is_available) VALUES
    -- Wraps
    (cat_wraps_rolls, 'Veg Patty Wrap',       129, true,  true),
    (cat_wraps_rolls, 'Chicken Petty Wrap',   139, false, true),
    (cat_wraps_rolls, 'Chicken Wrap',         139, false, true),
    (cat_wraps_rolls, 'Paneer Wrap',          139, true,  true),
    (cat_wraps_rolls, 'Crispy Chicken Wrap',  149, false, true),
    (cat_wraps_rolls, 'Aloo Tikki Wrap',      129, true,  true),
    -- Veg Rolls
    (cat_wraps_rolls, 'Veg Roll',              90, true,  true),
    (cat_wraps_rolls, 'Paneer Roll',          150, true,  true),
    (cat_wraps_rolls, 'Mix Veg Spicy Roll',   140, true,  true),
    (cat_wraps_rolls, 'Mushroom Roll',        160, true,  true),
    -- Non-Veg Rolls
    (cat_wraps_rolls, 'Egg Chicken Roll',     160, false, true),
    (cat_wraps_rolls, 'Egg Roll',             100, false, true),
    (cat_wraps_rolls, 'Chilli Roll',          110, false, true),
    (cat_wraps_rolls, 'Mix Roll',             120, false, true),
    (cat_wraps_rolls, 'Crispy Chicken Roll',  150, false, true),
    (cat_wraps_rolls, 'Tikka Roll',           160, false, true),
    (cat_wraps_rolls, 'Garlic Chicken Roll',  160, false, true);

  RAISE NOTICE '[019] Wraps & Rolls: 17 items';


  -- ========== SANDWICHES ==========

  INSERT INTO public.menu_items (category_id, name, price, is_veg, is_available) VALUES
    -- Veg
    (cat_sandwiches, 'Veg Grill Sandwich',                109, true,  true),
    (cat_sandwiches, 'Paneer Chilly Sandwich',            139, true,  true),
    (cat_sandwiches, 'Grilled Mushroom Sandwich',         139, true,  true),
    (cat_sandwiches, 'Cheese Corn Sandwich',              119, true,  true),
    (cat_sandwiches, 'Cheese Corn Tandoori Sandwich',     129, true,  true),
    (cat_sandwiches, 'Cheese Corn Schezwan Sandwich',     129, true,  true),
    (cat_sandwiches, 'Creamy Vegetable Sandwich',         119, true,  true),
    -- Non-Veg
    (cat_sandwiches, 'Jungle Chicken Sandwich',           129, false, true),
    (cat_sandwiches, 'Chicken Cheese Sandwich',           149, false, true),
    (cat_sandwiches, 'Chicken Tandoori Sandwich',         129, false, true),
    (cat_sandwiches, 'BBQ Chicken Sandwich',              129, false, true),
    (cat_sandwiches, 'Peri Peri Chicken Sandwich',        139, false, true),
    (cat_sandwiches, 'Chatpata Chicken Grill Sandwich',   139, false, true);

  RAISE NOTICE '[019] Sandwiches: 13 items';


  -- ========== FRIES & SIDES ==========

  INSERT INTO public.menu_items (category_id, name, price, is_veg, is_available) VALUES
    -- Fries
    (cat_fries, 'French Fries (Salted)',                        119, true,  true),
    (cat_fries, 'Periperi Fries',                               129, true,  true),
    (cat_fries, 'Veg Finger with French Fries (4pc)',           139, true,  true),
    (cat_fries, 'Veg Nuggets with French Fries (6pc)',          139, true,  true),
    (cat_fries, 'Potato Chilli Garlic with French Fries (6pc)', 129, true,  true),
    (cat_fries, 'Chicken Finger with French Fries (4pc)',       149, false, true),
    (cat_fries, 'Chicken Nuggets with French Fries (6pc)',      149, false, true),
    (cat_fries, 'Potato Cheese Shots with French Fries (6pc)',  129, true,  true),
    (cat_fries, 'Chicken Popcorn (20pc)',                       139, false, true),
    (cat_fries, 'Chicken Cheese Ball with French Fries (6pc)',  149, false, true),
    -- Papad & Extras
    (cat_fries, 'Fried Papad',     15, true, true),
    (cat_fries, 'Masala Papad',    30, true, true),
    (cat_fries, 'Roasted Papad',   30, true, true),
    (cat_fries, 'Plain Curd',      50, true, true),
    (cat_fries, 'Raita',           50, true, true),
    -- Salads
    (cat_fries, 'Veg Caesar Salad',     129, true,  true),
    (cat_fries, 'Chicken Caesar Salad', 139, false, true),
    (cat_fries, 'Fruit Salad',         119, true,  true),
    (cat_fries, 'Dahi Salad',           65, true,  true),
    (cat_fries, 'Green Salad',          50, true,  true),
    -- Desserts
    (cat_fries, 'Vanilla Ice Cream',        50, true, true),
    (cat_fries, 'Butterscotch Ice Cream',   70, true, true),
    (cat_fries, 'Chocolate Ice Cream',      70, true, true),
    (cat_fries, 'Brownie with Ice Cream',  129, true, true);

  RAISE NOTICE '[019] Fries & Sides: 24 items';


  -- ========== SOUPS ==========

  INSERT INTO public.menu_items (category_id, name, price, is_veg, is_available) VALUES
    (cat_soups, 'Manchow Soup (Veg)',           159, true,  true),
    (cat_soups, 'Manchow Soup (Non-Veg)',       189, false, true),
    (cat_soups, 'Hot N Sour Soup (Veg)',        159, true,  true),
    (cat_soups, 'Hot N Sour Soup (Non-Veg)',    189, false, true),
    (cat_soups, 'Lemon Coriander Soup (Veg)',   169, true,  true),
    (cat_soups, 'Lemon Coriander Soup (Non-Veg)',199, false, true),
    (cat_soups, 'Sweet Corn Soup (Veg)',        169, true,  true),
    (cat_soups, 'Sweet Corn Soup (Non-Veg)',    199, false, true),
    (cat_soups, 'Wow Noodle Soup (Veg)',        169, true,  true),
    (cat_soups, 'Wow Noodle Soup (Non-Veg)',    199, false, true);

  RAISE NOTICE '[019] Soups: 10 items';


  -- ========== NOODLES, RICE & PASTA ==========

  INSERT INTO public.menu_items (category_id, name, price, is_veg, is_available) VALUES
    -- Veg Noodles
    (cat_noodles_rice, 'Veg Hakka Noodles',          139, true,  true),
    (cat_noodles_rice, 'Paneer Hakka Noodles',       159, true,  true),
    (cat_noodles_rice, 'Mushroom Hakka Noodles',     159, true,  true),
    (cat_noodles_rice, 'Mix Hakka Noodles',          149, true,  true),
    (cat_noodles_rice, 'Schezwan Hakka Noodles',     139, true,  true),
    (cat_noodles_rice, 'Efu Noodles',                139, true,  true),
    -- Non-Veg Noodles
    (cat_noodles_rice, 'Chicken Hakka Noodles',                 159, false, true),
    (cat_noodles_rice, 'Chicken Noodles with Chilly Garlic',    169, false, true),
    (cat_noodles_rice, 'Non Veg Mix Noodles',                   169, false, true),
    (cat_noodles_rice, 'Chicken Noodles with Schezwan Sauce',   169, false, true),
    -- Veg Fried Rice
    (cat_noodles_rice, 'Veg Fried Rice',        130, true,  true),
    (cat_noodles_rice, 'Paneer Fried Rice',     160, true,  true),
    (cat_noodles_rice, 'Mushroom Fried Rice',   160, true,  true),
    (cat_noodles_rice, 'Mix Fried Rice (Veg)',  170, true,  true),
    -- Non-Veg Fried Rice
    (cat_noodles_rice, 'Chicken Fried Rice',       150, false, true),
    (cat_noodles_rice, 'Egg Chicken Fried Rice',   170, false, true),
    (cat_noodles_rice, 'Prawn Fried Rice',         220, false, true),
    (cat_noodles_rice, 'Mix Fried Rice (Non-Veg)', 200, false, true),
    -- Pasta
    (cat_noodles_rice, 'Red Veg Pasta',       139, true,  true),
    (cat_noodles_rice, 'Red Chicken Pasta',   149, false, true),
    (cat_noodles_rice, 'White Veg Pasta',     139, true,  true),
    (cat_noodles_rice, 'White Chicken Pasta', 149, false, true),
    (cat_noodles_rice, 'Mix Veg Pasta',       149, true,  true),
    (cat_noodles_rice, 'Mix Chicken Pasta',   159, false, true);

  RAISE NOTICE '[019] Noodles, Rice & Pasta: 24 items';


  -- ========== STARTERS ==========

  INSERT INTO public.menu_items (category_id, name, price, is_veg, is_available) VALUES
    -- Veg Starters
    (cat_starters, 'Crispy Paneer',        180, true, true),
    (cat_starters, 'Crispy Corn',          160, true, true),
    (cat_starters, 'Crispy Mushroom',      180, true, true),
    (cat_starters, 'Chilly Mushroom',      180, true, true),
    (cat_starters, 'Mushroom 65',          180, true, true),
    (cat_starters, 'Paneer 65',            180, true, true),
    (cat_starters, 'Paneer Pakoda',        180, true, true),
    (cat_starters, 'Schezwan Paneer',      190, true, true),
    (cat_starters, 'Chilli Paneer',        160, true, true),
    (cat_starters, 'Crispy Chilli Potato', 190, true, true),
    (cat_starters, 'Honey Chilli Potato',  210, true, true),
    (cat_starters, 'Paneer Kurkure',       160, true, true),
    (cat_starters, 'Dahi Kabab Paneer',    210, true, true),
    (cat_starters, 'Dry Manchurian',       210, true, true),
    (cat_starters, 'Mushroom Manchurian',  220, true, true),
    (cat_starters, 'Paneer Manchurian',    220, true, true),
    (cat_starters, 'Mushroom Chatpata',    200, true, true),
    (cat_starters, 'Paneer Chatpata',      210, true, true),
    -- Non-Veg Starters
    (cat_starters, 'Chicken Lollypop',              250, false, true),
    (cat_starters, 'Chilli Chicken',                230, false, true),
    (cat_starters, 'Chicken 65',                    230, false, true),
    (cat_starters, 'Chicken Manchurian',            230, false, true),
    (cat_starters, 'Crispy Chicken',                230, false, true),
    (cat_starters, 'Chilly Fish',                   230, false, true),
    (cat_starters, 'Bali Prawn',                    300, false, true),
    (cat_starters, 'Honey Chilly Crispy Chicken',   270, false, true),
    (cat_starters, 'Chilli Prawn',                  300, false, true),
    (cat_starters, 'Dragon Chicken',                270, false, true);

  RAISE NOTICE '[019] Starters: 28 items';


  -- ========== MAIN COURSE & THALI ==========

  INSERT INTO public.menu_items (category_id, name, price, is_veg, is_available) VALUES
    -- Indian Veg
    (cat_main_course, 'Steamed Rice',            50, true, true),
    (cat_main_course, 'Dal Fry',                 90, true, true),
    (cat_main_course, 'Paneer Butter Masala',   190, true, true),
    (cat_main_course, 'Kadai Paneer',           200, true, true),
    (cat_main_course, 'Paneer Do-Pyaza',        190, true, true),
    (cat_main_course, 'Paneer Panjabi',         190, true, true),
    (cat_main_course, 'Shahi Paneer',           190, true, true),
    (cat_main_course, 'Paneer Chat-Pati',       190, true, true),
    (cat_main_course, 'Paneer Masala',          190, true, true),
    (cat_main_course, 'Mushroom Butter Masala', 190, true, true),
    (cat_main_course, 'Kadai Mushroom',         200, true, true),
    (cat_main_course, 'Mushroom Panjabi',       200, true, true),
    (cat_main_course, 'Mushroom Masala',        190, true, true),
    (cat_main_course, 'Mushroom Do-Pyaza',      190, true, true),
    (cat_main_course, 'Mushroom Chat-Pata',     180, true, true),
    (cat_main_course, 'Mix Veg Curry',          190, true, true),
    -- Non-Veg Mains
    (cat_main_course, 'Mutton Rogan Josh',      400, false, true),
    (cat_main_course, 'Mutton Masala',          370, false, true),
    (cat_main_course, 'Mutton Kasa',            360, false, true),
    (cat_main_course, 'Chicken Butter Masala',  300, false, true),
    (cat_main_course, 'Kadai Chicken',          270, false, true),
    (cat_main_course, 'Chicken Do-Pyaza',       290, false, true),
    (cat_main_course, 'Chicken Panjabi',        290, false, true),
    (cat_main_course, 'Chicken Handi',          270, false, true),
    (cat_main_course, 'Chicken Kasa',           280, false, true),
    -- Biryani
    (cat_main_course, 'Hyderabadi Chicken Dum Biryani', 250, false, true),
    (cat_main_course, 'Hyderabadi Mutton Dum Biryani',  300, false, true),
    -- Thali
    (cat_main_course, 'Regular Veg Thali',              120, true,  true),
    (cat_main_course, 'Odiaz Special Authentic Thali',  220, true,  true),
    (cat_main_course, 'Odiaz Special Pakhala',          180, true,  true),
    (cat_main_course, 'Chicken Meal Half',              180, false, true),
    (cat_main_course, 'Chicken Meal Full',              320, false, true),
    (cat_main_course, 'Mutton Half Meal',               330, false, true),
    (cat_main_course, 'Mutton Full Meal',               520, false, true),
    (cat_main_course, 'Fish Thali',                     150, false, true),
    -- Roti & Bread
    (cat_main_course, 'Roti',              10, true, true),
    (cat_main_course, 'Tandoori Roti',     30, true, true),
    (cat_main_course, 'Plain Naan',        30, true, true),
    (cat_main_course, 'Butter Naan',       50, true, true),
    (cat_main_course, 'Lachha Paratha',    50, true, true),
    -- Egg
    (cat_main_course, 'Boiled Egg',        25, false, true),
    (cat_main_course, 'Single Egg Omlet',  30, false, true),
    (cat_main_course, 'Double Egg Omlet',  50, false, true),
    (cat_main_course, 'Egg Poach',         30, false, true),
    (cat_main_course, 'Egg Bhurji',        70, false, true);

  RAISE NOTICE '[019] Main Course & Thali: 45 items';


  -- ========== MOMO ==========

  INSERT INTO public.menu_items (category_id, name, price, is_veg, is_available) VALUES
    -- Veg Steamed
    (cat_momo, 'Veggie Darjeeling Momo',   129, true,  true),
    (cat_momo, 'Veggie Momo',              149, true,  true),
    (cat_momo, 'Paneer Momo',              169, true,  true),
    (cat_momo, 'Mushroom Momo',            169, true,  true),
    (cat_momo, 'Corn Cheese Momo',         175, true,  true),
    -- Pan Fried Veg
    (cat_momo, 'Veggie Pan Fried Momo',            119, true,  true),
    (cat_momo, 'Paneer Pan Fried Momo',            149, true,  true),
    (cat_momo, 'Corn & Cheese Pan Fried Momo',     169, true,  true),
    -- Non-Veg Steamed
    (cat_momo, 'Chicken Darjeeling Momo',  129, false, true),
    (cat_momo, 'Chicken Momo',             155, false, true),
    (cat_momo, 'Chicken Schezwan Momo',    179, false, true),
    (cat_momo, 'Chicken Cheese Momo',      185, false, true),
    -- Pan Fried Non-Veg
    (cat_momo, 'Chicken Pan Fried Momo',           169, false, true),
    (cat_momo, 'Chicken & Cheese Pan Fried Momo',  185, false, true);

  RAISE NOTICE '[019] Momo: 14 items';


  -- ========== IMAGE URLs (Unsplash - free to use) ==========

  RAISE NOTICE '[019] Adding image URLs to menu items...';

  -- Hot Tea
  UPDATE public.menu_items
  SET image_url = 'https://images.unsplash.com/photo-1592147164960-236b56dd18e0?w=400&h=300&fit=crop&q=80'
  WHERE category_id = cat_hot_tea AND image_url IS NULL;

  -- Coffee
  UPDATE public.menu_items
  SET image_url = 'https://images.unsplash.com/photo-1669513975851-6cc8a5cf9329?w=400&h=300&fit=crop&q=80'
  WHERE category_id = cat_coffee AND image_url IS NULL;

  -- Shakes & Lassi
  UPDATE public.menu_items
  SET image_url = 'https://images.unsplash.com/photo-1579175973774-8294208931a4?w=400&h=300&fit=crop&q=80'
  WHERE category_id = cat_shakes_lassi AND image_url IS NULL;

  -- Juices & Mojitos (2 images cycling)
  WITH numbered_juices AS (
    SELECT id, ROW_NUMBER() OVER (ORDER BY name) AS rn
    FROM public.menu_items WHERE category_id = cat_juices_mojito AND image_url IS NULL
  )
  UPDATE public.menu_items m SET image_url = CASE ((n.rn - 1) % 2)
    WHEN 0 THEN 'https://images.unsplash.com/photo-1555766720-1e727844cc8f?w=400&h=300&fit=crop&q=80'
    ELSE      'https://images.unsplash.com/photo-1753263453239-fef8e92b5040?w=400&h=300&fit=crop&q=80'
  END FROM numbered_juices n WHERE m.id = n.id;

  -- Maggie
  UPDATE public.menu_items
  SET image_url = 'https://images.unsplash.com/photo-1603033172872-c2525115c7b9?w=400&h=300&fit=crop&q=80'
  WHERE category_id = cat_maggie AND image_url IS NULL;

  -- Burgers
  UPDATE public.menu_items
  SET image_url = 'https://images.unsplash.com/photo-1626414375186-12406f7e95f1?w=400&h=300&fit=crop&q=80'
  WHERE category_id = cat_burgers AND image_url IS NULL;

  -- Wraps & Rolls
  UPDATE public.menu_items
  SET image_url = 'https://images.unsplash.com/photo-1632660346941-023cc64e1252?w=400&h=300&fit=crop&q=80'
  WHERE category_id = cat_wraps_rolls AND image_url IS NULL;

  -- Sandwiches
  UPDATE public.menu_items
  SET image_url = 'https://images.unsplash.com/photo-1475090169767-40ed8d18f67d?w=400&h=300&fit=crop&q=80'
  WHERE category_id = cat_sandwiches AND image_url IS NULL;

  -- Fries & Sides
  UPDATE public.menu_items
  SET image_url = 'https://images.unsplash.com/photo-1688059187289-a920f4e4ff95?w=400&h=300&fit=crop&q=80'
  WHERE category_id = cat_fries AND image_url IS NULL;

  -- Soups
  UPDATE public.menu_items
  SET image_url = 'https://images.unsplash.com/photo-1730312382513-62e9454f4797?w=400&h=300&fit=crop&q=80'
  WHERE category_id = cat_soups AND image_url IS NULL;

  -- Noodles, Rice & Pasta (3 images cycling)
  WITH numbered_noodles AS (
    SELECT id, ROW_NUMBER() OVER (ORDER BY name) AS rn
    FROM public.menu_items WHERE category_id = cat_noodles_rice AND image_url IS NULL
  )
  UPDATE public.menu_items m SET image_url = CASE ((n.rn - 1) % 3)
    WHEN 0 THEN 'https://images.unsplash.com/photo-1512058564366-18510be2db19?w=400&h=300&fit=crop&q=80'
    WHEN 1 THEN 'https://images.unsplash.com/photo-1604679963017-2dc63f433d71?w=400&h=300&fit=crop&q=80'
    ELSE      'https://images.unsplash.com/photo-1603033172872-c2525115c7b9?w=400&h=300&fit=crop&q=80'
  END FROM numbered_noodles n WHERE m.id = n.id;

  -- Starters
  UPDATE public.menu_items
  SET image_url = 'https://images.unsplash.com/photo-1757715376287-90f24dac4593?w=400&h=300&fit=crop&q=80'
  WHERE category_id = cat_starters AND image_url IS NULL;

  -- Main Course & Thali (2 images cycling)
  WITH numbered_main AS (
    SELECT id, ROW_NUMBER() OVER (ORDER BY name) AS rn
    FROM public.menu_items WHERE category_id = cat_main_course AND image_url IS NULL
  )
  UPDATE public.menu_items m SET image_url = CASE ((n.rn - 1) % 2)
    WHEN 0 THEN 'https://images.unsplash.com/photo-1631515242808-497c3fbd3972?w=400&h=300&fit=crop&q=80'
    ELSE      'https://images.unsplash.com/photo-1764304733301-3a9f335f0c67?w=400&h=300&fit=crop&q=80'
  END FROM numbered_main n WHERE m.id = n.id;

  -- Momo (2 images cycling)
  WITH numbered_momo AS (
    SELECT id, ROW_NUMBER() OVER (ORDER BY name) AS rn
    FROM public.menu_items WHERE category_id = cat_momo AND image_url IS NULL
  )
  UPDATE public.menu_items m SET image_url = CASE ((n.rn - 1) % 2)
    WHEN 0 THEN 'https://images.unsplash.com/photo-1757445060057-f86bbb3de1e2?w=400&h=300&fit=crop&q=80'
    ELSE      'https://images.unsplash.com/photo-1753179253638-65a35859db6f?w=400&h=300&fit=crop&q=80'
  END FROM numbered_momo n WHERE m.id = n.id;

  RAISE NOTICE '[019] Image URLs assigned to all menu items';


  -- ========== DONE ==========

  RAISE NOTICE '[019] Seed complete. 9 tables, 14 categories, ~245 menu items with images inserted.';

END $$;
