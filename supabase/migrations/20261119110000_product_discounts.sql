-- Harga asli + potongan produk.
--
-- `price` tetap menjadi harga jual final (dipakai create_order_atomic dan
-- keranjang). `original_price` menyimpan harga sebelum potongan untuk
-- ditampilkan dicoret di katalog. Potongan bisa persentase atau nominal tetap;
-- harga final dihitung di form admin lalu disimpan ke `price`.

alter table public.products
  add column original_price bigint,
  add column discount_type text,
  add column discount_value bigint;

alter table public.products
  add constraint products_original_price_positive
    check (original_price is null or original_price > 0),
  add constraint products_discount_type_valid
    check (discount_type is null or discount_type in ('percent', 'fixed')),
  add constraint products_discount_fields_paired
    check (
      (discount_type is null and discount_value is null)
      or (discount_type is not null and discount_value is not null)
    ),
  add constraint products_discount_value_valid
    check (
      (discount_type is null and discount_value is null)
      or (discount_type = 'percent' and discount_value between 1 and 100)
      or (discount_type = 'fixed' and discount_value > 0)
    ),
  add constraint products_discount_needs_original
    check (discount_type is null or original_price is not null),
  add constraint products_price_le_original
    check (original_price is null or price <= original_price),
  -- Kalau ada potongan, harga jual harus benar-benar lebih murah dari harga asli.
  add constraint products_discount_price_below_original
    check (discount_type is null or price < original_price);

-- RLS sudah membatasi baris; grant kolom menentukan kolom yang boleh ditulis admin.
grant insert (original_price, discount_type, discount_value)
  on public.products to authenticated;
grant update (original_price, discount_type, discount_value)
  on public.products to authenticated;
