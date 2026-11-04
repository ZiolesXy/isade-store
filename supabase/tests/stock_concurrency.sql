-- Uji konkurensi dan fungsional create_order_atomic serta apply_payment_result.
-- Jalankan sebagai postgres superuser via psql.
-- Mensimulasikan auth.uid() dengan SET request.jwt.claim.sub.

\set ON_ERROR_STOP on

-- Set auth.uid() ke user tes agar security definer fungsi bisa membaca profil
SET request.jwt.claim.sub = '00000000-0000-0000-0000-000000000001';

DO $$
DECLARE
  test_user_id uuid := '00000000-0000-0000-0000-000000000001';
  test_product_id uuid;
  test_order_id uuid;
  second_order_id uuid;
  v_stock_before integer;
  v_locked_before integer;
  v_stock_after integer;
  v_locked_after integer;
  v_order_status text;
  v_items jsonb;
BEGIN
  RAISE NOTICE '=== Mulai uji stock_concurrency.sql ===';

  -- Siapkan user tes di auth.users
  INSERT INTO auth.users (id, email, encrypted_password, raw_user_meta_data, created_at, updated_at)
  VALUES (test_user_id, 'stocktest@example.com', crypt('password', gen_salt('bf')), '{}'::jsonb, now(), now())
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.profiles (id, full_name, role)
  VALUES (test_user_id, 'Stock Test User', 'customer')
  ON CONFLICT (id) DO UPDATE SET full_name = 'Stock Test User', role = 'customer';

  -- Siapkan produk tes dengan stok 5
  INSERT INTO public.products (slug, title, price, stock, locked_stock, is_active)
  VALUES ('test-stock-product', 'Test Stock Product', 10000, 5, 0, true)
  ON CONFLICT (slug) DO UPDATE SET stock = 5, locked_stock = 0, is_active = true;

  SELECT id INTO test_product_id FROM public.products WHERE slug = 'test-stock-product';

  -- Uji 1: create_order_atomic qty valid (2 unit)
  SELECT stock, locked_stock INTO v_stock_before, v_locked_before
  FROM public.products WHERE id = test_product_id;

  v_items := jsonb_build_array(jsonb_build_object('product_id', test_product_id, 'quantity', 2));

  SELECT public.create_order_atomic(
    test_user_id,
    v_items,
    'WEB_MIDTRANS',
    'test-idem-1',
    30
  ) INTO test_order_id;

  SELECT stock, locked_stock INTO v_stock_after, v_locked_after
  FROM public.products WHERE id = test_product_id;

  IF v_stock_after <> v_stock_before THEN
    RAISE EXCEPTION 'Uji 1 GAGAL: stock tidak boleh berubah saat order dibuat (was %, is %)', v_stock_before, v_stock_after;
  END IF;
  IF v_locked_after <> v_locked_before + 2 THEN
    RAISE EXCEPTION 'Uji 1 GAGAL: locked_stock harus naik 2 (was %, is %)', v_locked_before, v_locked_after;
  END IF;
  RAISE NOTICE 'Uji 1 LULUS: create_order_atomic mengunci 2 unit (locked_stock % -> %)', v_locked_before, v_locked_after;

  -- Uji 2: create_order_atomic qty melebihi available_stock
  BEGIN
    v_items := jsonb_build_array(jsonb_build_object('product_id', test_product_id, 'quantity', 10));
    SELECT public.create_order_atomic(
      test_user_id,
      v_items,
      'WEB_MIDTRANS',
      'test-idem-2',
      30
    );
    RAISE EXCEPTION 'Uji 2 GAGAL: seharusnya melempar INSUFFICIENT_STOCK';
  EXCEPTION WHEN OTHERS THEN
    IF SQLSTATE <> 'P0001' THEN
      RAISE EXCEPTION 'Uji 2 GAGAL: harapan P0001, mendapat %', SQLSTATE;
    END IF;
    RAISE NOTICE 'Uji 2 LULUS: create_order_atomic menolak qty melebihi available_stock';
  END;

  -- Uji 3: idempotency key sama mengembalikan order_id yang sama
  v_items := jsonb_build_array(jsonb_build_object('product_id', test_product_id, 'quantity', 2));
  SELECT public.create_order_atomic(
    test_user_id,
    v_items,
    'WEB_MIDTRANS',
    'test-idem-1',
    30
  ) INTO second_order_id;

  IF second_order_id <> test_order_id THEN
    RAISE EXCEPTION 'Uji 3 GAGAL: idempotency key harus mengembalikan order_id yang sama';
  END IF;
  RAISE NOTICE 'Uji 3 LULUS: idempotency key mengembalikan order_id yang sama';

  -- Uji 4: apply_payment_result paid memotong stock dan locked_stock
  SELECT stock, locked_stock INTO v_stock_before, v_locked_before
  FROM public.products WHERE id = test_product_id;

  SELECT public.apply_payment_result(
    test_order_id,
    'paid',
    20000,
    'webhook',
    '{"transaction_status": "settlement", "payment_type": "credit_card", "transaction_id": "txn-test-1"}'::jsonb
  ) INTO v_order_status;

  SELECT stock, locked_stock INTO v_stock_after, v_locked_after
  FROM public.products WHERE id = test_product_id;

  IF v_stock_after <> v_stock_before - 2 THEN
    RAISE EXCEPTION 'Uji 4 GAGAL: stock harus turun 2 saat paid (was %, is %)', v_stock_before, v_stock_after;
  END IF;
  IF v_locked_after <> v_locked_before - 2 THEN
    RAISE EXCEPTION 'Uji 4 GAGAL: locked_stock harus turun 2 saat paid (was %, is %)', v_locked_before, v_locked_after;
  END IF;

  SELECT status INTO v_order_status FROM public.orders WHERE id = test_order_id;
  IF v_order_status <> 'paid' THEN
    RAISE EXCEPTION 'Uji 4 GAGAL: order harus berstatus paid (is %)', v_order_status;
  END IF;
  RAISE NOTICE 'Uji 4 LULUS: apply_payment_result paid memotong stock (% -> %) dan locked_stock (% -> %)', v_stock_before, v_stock_after, v_locked_before, v_locked_after;

  -- Uji 5: pemanggilan apply_payment_result kedua tidak mengubah apa pun
  SELECT stock, locked_stock INTO v_stock_before, v_locked_before
  FROM public.products WHERE id = test_product_id;

  SELECT public.apply_payment_result(
    test_order_id,
    'paid',
    20000,
    'webhook',
    '{"transaction_status": "settlement", "payment_type": "credit_card", "transaction_id": "txn-test-1"}'::jsonb
  ) INTO v_order_status;

  SELECT stock, locked_stock INTO v_stock_after, v_locked_after
  FROM public.products WHERE id = test_product_id;

  IF v_stock_after <> v_stock_before THEN
    RAISE EXCEPTION 'Uji 5 GAGAL: stock tidak boleh berubah pada pemanggilan duplikat';
  END IF;
  IF v_locked_after <> v_locked_before THEN
    RAISE EXCEPTION 'Uji 5 GAGAL: locked_stock tidak boleh berubah pada pemanggilan duplikat';
  END IF;
  RAISE NOTICE 'Uji 5 LULUS: pemanggilan kedua apply_payment_result tidak mengubah apa pun';

  RAISE NOTICE '=== Semua uji stock_concurrency.sql LULUS ===';
END $$;
