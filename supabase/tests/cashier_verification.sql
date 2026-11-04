-- Uji verify_payment_cashier:
-- 1. Mengubah pending menjadi paid (dengan role cashier)
-- 2. Order yang sudah paid tidak bisa diubah (read-only)
-- 3. Pemanggilan oleh role non-cashier ditolak (FORBIDDEN)

\set ON_ERROR_STOP on

DO $$
DECLARE
  cashier_user_id uuid := '00000000-0000-0000-0000-000000000002';
  customer_user_id uuid := '00000000-0000-0000-0000-000000000003';
  test_product_id uuid;
  test_order_id uuid;
  v_result text;
  v_order_status text;
  v_stock_before integer;
  v_locked_before integer;
  v_stock_after integer;
  v_locked_after integer;
  v_items jsonb;
BEGIN
  RAISE NOTICE '=== Mulai uji cashier_verification.sql ===';

  -- Siapkan user cashier di auth.users
  INSERT INTO auth.users (id, email, encrypted_password, raw_user_meta_data, created_at, updated_at)
  VALUES (cashier_user_id, 'cashiertest@example.com', crypt('password', gen_salt('bf')), '{}'::jsonb, now(), now())
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.profiles (id, full_name, role)
  VALUES (cashier_user_id, 'Cashier Test', 'cashier')
  ON CONFLICT (id) DO UPDATE SET full_name = 'Cashier Test', role = 'cashier';

  -- Siapkan user customer (bukan cashier)
  INSERT INTO auth.users (id, email, encrypted_password, raw_user_meta_data, created_at, updated_at)
  VALUES (customer_user_id, 'customertest@example.com', crypt('password', gen_salt('bf')), '{}'::jsonb, now(), now())
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.profiles (id, full_name, role)
  VALUES (customer_user_id, 'Customer Test', 'customer')
  ON CONFLICT (id) DO UPDATE SET full_name = 'Customer Test', role = 'customer';

  -- Siapkan produk tes
  INSERT INTO public.products (slug, title, price, stock, locked_stock, is_active)
  VALUES ('test-cashier-product', 'Test Cashier Product', 15000, 3, 0, true)
  ON CONFLICT (slug) DO UPDATE SET stock = 3, locked_stock = 0, is_active = true;

  SELECT id INTO test_product_id FROM public.products WHERE slug = 'test-cashier-product';

  -- Buat order pending sebagai customer
  EXECUTE format('SET request.jwt.claim.sub = %L', customer_user_id);
  v_items := jsonb_build_array(jsonb_build_object('product_id', test_product_id, 'quantity', 1));
  SELECT public.create_order_atomic(
    customer_user_id,
    v_items,
    'KASIR_CASH',
    'test-cashier-idem-1',
    30
  ) INTO test_order_id;

  -- Verifikasi order awal adalah pending dan locked_stock naik
  SELECT status INTO v_order_status FROM public.orders WHERE id = test_order_id;
  IF v_order_status <> 'pending' THEN
    RAISE EXCEPTION 'Setup GAGAL: order harus pending (is %)', v_order_status;
  END IF;

  SELECT stock, locked_stock INTO v_stock_before, v_locked_before
  FROM public.products WHERE id = test_product_id;
  IF v_locked_before <> 1 THEN
    RAISE EXCEPTION 'Setup GAGAL: locked_stock harus 1 (is %)', v_locked_before;
  END IF;

  RAISE NOTICE 'Setup LULUS: order % dibuat sebagai pending, locked_stock = 1', test_order_id;

  -- Uji 1: verify_payment_cashier mengubah pending menjadi paid (dipanggil sebagai cashier)
  EXECUTE format('SET request.jwt.claim.sub = %L', cashier_user_id);

  SELECT public.verify_payment_cashier(
    test_order_id,
    'paid',
    'Tunai diterima, verifikasi OK'
  ) INTO v_result;

  IF v_result <> 'paid' THEN
    RAISE EXCEPTION 'Uji 1 GAGAL: harapan paid, mendapat %', v_result;
  END IF;

  SELECT status INTO v_order_status FROM public.orders WHERE id = test_order_id;
  IF v_order_status <> 'paid' THEN
    RAISE EXCEPTION 'Uji 1 GAGAL: order harus berstatus paid (is %)', v_order_status;
  END IF;

  SELECT stock, locked_stock INTO v_stock_after, v_locked_after
  FROM public.products WHERE id = test_product_id;
  -- Untuk KASIR_CASH yang dibayar, produk digital: stock tidak berkurang
  IF v_stock_after <> v_stock_before THEN
    RAISE EXCEPTION 'Uji 1 GAGAL: stock tidak boleh berubah untuk pembayaran cash digital';
  END IF;
  RAISE NOTICE 'Uji 1 LULUS: verify_payment_cashier mengubah pending menjadi paid';

  -- Uji 2: verify_payment_cashier pada order yang sudah paid tidak mengubah apa pun (read-only)
  SELECT public.verify_payment_cashier(
    test_order_id,
    'needs_review',
    'Coba ubah order yang sudah dibayar'
  ) INTO v_result;

  IF v_result <> 'paid' THEN
    RAISE EXCEPTION 'Uji 2 GAGAL: order yang sudah paid harus tetap paid (mendapat %)', v_result;
  END IF;

  SELECT status INTO v_order_status FROM public.orders WHERE id = test_order_id;
  IF v_order_status <> 'paid' THEN
    RAISE EXCEPTION 'Uji 2 GAGAL: order harus tetap paid (is %)', v_order_status;
  END IF;
  RAISE NOTICE 'Uji 2 LULUS: order yang sudah paid bersifat read-only';

  -- Uji 3: Pemanggilan oleh role non-cashier ditolak
  -- Reset order untuk tes ini (sebagai cashier)
  EXECUTE format('SET request.jwt.claim.sub = %L', cashier_user_id);
  UPDATE public.orders SET status = 'pending' WHERE id = test_order_id;
  UPDATE public.products SET stock = 3, locked_stock = 1 WHERE id = test_product_id;

  -- Sekarang coba sebagai customer (bukan cashier)
  EXECUTE format('SET request.jwt.claim.sub = %L', customer_user_id);

  BEGIN
    SELECT public.verify_payment_cashier(
      test_order_id,
      'paid',
      'Coba sebagai customer'
    ) INTO v_result;
    RAISE EXCEPTION 'Uji 3 GAGAL: seharusnya ditolak untuk non-cashier';
  EXCEPTION WHEN OTHERS THEN
    IF SQLSTATE <> 'P0001' THEN
      RAISE EXCEPTION 'Uji 3 GAGAL: harapan P0001 (FORBIDDEN), mendapat %', SQLSTATE;
    END IF;
    RAISE NOTICE 'Uji 3 LULUS: role non-cashier ditolak (FORBIDDEN)';
  END;

  RAISE NOTICE '=== Semua uji cashier_verification.sql LULUS ===';
END $$;
