import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import { PencilSimple, Plus } from '@phosphor-icons/react';
import type { Product } from '@/domain/models/Product';
import { di } from '@/di';
import { compressToWebp } from '@/lib/imageCompress';
import { getProductImageUrl } from '@/lib/productImage';
import { formatRupiah } from '@/lib/format';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ErrorState, RowSkeleton } from '@/presentation/components/states';
import { toast } from 'sonner';

const PAGE_SIZE = 10;
const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

interface FormState {
  slug: string;
  title: string;
  description: string;
  price: string;
  stock: string;
  isActive: boolean;
}

const EMPTY_FORM: FormState = {
  slug: '',
  title: '',
  description: '',
  price: '',
  stock: '0',
  isActive: true,
};

function slugifyTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function AdminProductsPage() {
  const [rows, setRows] = useState<Product[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async (targetPage: number) => {
    setLoading(true);
    setError(null);
    try {
      const result = await di.productRepository.listAdmin(targetPage, PAGE_SIZE);
      setRows(result.products);
      setPage(targetPage);
      setTotalPages(Math.max(1, Math.ceil(result.total / PAGE_SIZE)));
    } catch {
      setError('Produk tidak berhasil dimuat.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(1);
  }, [load]);

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFile(null);
    setFieldErrors({});
    setFormError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    setDialogOpen(true);
  }

  function openEdit(product: Product) {
    setEditing(product);
    setForm({
      slug: product.slug,
      title: product.title,
      description: product.description,
      price: String(product.price),
      stock: String(product.stock),
      isActive: product.isActive,
    });
    setFile(null);
    setFieldErrors({});
    setFormError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    setDialogOpen(true);
  }

  function validate(): FormState | null {
    const errors: Record<string, string> = {};
    const price = Number(form.price);
    const stock = Number(form.stock);

    if (!SLUG_RE.test(form.slug)) {
      errors.slug = 'Slug pakai huruf kecil, angka, dan tanda hubung, misalnya: gantungan-kunci-bola.';
    }
    if (form.title.trim().length === 0 || form.title.trim().length > 120) {
      errors.title = 'Judul wajib diisi, maksimal 120 karakter.';
    }
    if (!Number.isInteger(price) || price <= 0) {
      errors.price = 'Harga harus bilangan bulat di atas 0.';
    }
    if (!Number.isInteger(stock) || stock < 0) {
      errors.stock = 'Stok harus bilangan bulat 0 atau lebih.';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length > 0 ? null : { ...form, price: String(price), stock: String(stock) };
  }

  async function handleSave() {
    const valid = validate();
    if (!valid) return;
    setSaving(true);
    setFormError(null);

    try {
      let productId: string;
      if (editing) {
        const updated = await di.productRepository.update(editing.id, {
          slug: valid.slug,
          title: valid.title.trim(),
          description: valid.description,
          price: Number(valid.price),
          stock: Number(valid.stock),
          isActive: valid.isActive,
        });
        productId = updated.id;
      } else {
        const created = await di.productRepository.create({
          slug: valid.slug,
          title: valid.title.trim(),
          description: valid.description,
          price: Number(valid.price),
          stock: Number(valid.stock),
          imagePath: null,
          isActive: valid.isActive,
        });
        productId = created.id;
      }

      // Gambar dikompres di browser menjadi WebP maksimal lebar 1200px sebelum unggah.
      if (file) {
        try {
          const webpFile = await compressToWebp(file);
          const path = await di.productRepository.uploadImage(productId, webpFile);
          await di.productRepository.update(productId, { imagePath: path });
        } catch {
          toast.error('Produk tersimpan, tetapi gambar tidak berhasil diunggah.');
        }
      }

      if (!editing && !valid.isActive) {
        await di.productRepository.setActive(productId, false);
      }

      toast.success(editing ? 'Produk diperbarui.' : 'Produk tersimpan.');
      setDialogOpen(false);
      await load(page);
    } catch (err) {
      const supabaseError = err as { code?: string; message?: string };
      const message = supabaseError.message ?? '';
      if (supabaseError.code === '23514' && message.includes('products_locked_le_stock')) {
        const locked = editing?.lockedStock ?? 0;
        setFormError(
          `Stok tidak bisa di bawah jumlah yang sedang dipesan: ${locked}`
        );
      } else if (supabaseError.code === '23505') {
        setFormError('Slug sudah dipakai produk lain. Pakai slug yang berbeda.');
      } else {
        setFormError('Produk tidak berhasil disimpan. Coba lagi.');
      }
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(product: Product) {
    try {
      await di.productRepository.setActive(product.id, !product.isActive);
      toast.success(product.isActive ? 'Produk dinonaktifkan.' : 'Produk diaktifkan.');
      await load(page);
    } catch (setActiveError) {
      const supabaseError = setActiveError as { code?: string; message?: string };
      if (supabaseError.code === '23514' || (supabaseError.message ?? '').includes('products_locked_le_stock')) {
        toast.error(
          `Stok tidak bisa di bawah jumlah yang sedang dipesan: ${product.lockedStock}`
        );
      } else {
        toast.error('Tidak bisa mengubah status produk.');
      }
    }
  }

  const maxLengthError =
    form.title.trim().length > 120 ? 'Judul maksimal 120 karakter.' : null;

  return (
    <section className="mx-auto max-w-6xl px-4 py-6">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <h1 className="font-display text-xl font-bold">Kelola Produk</h1>
        <Button className="ml-auto" onClick={openCreate}>
          <Plus className="size-4" weight="bold" />
          Tambah Produk
        </Button>
      </div>

      {loading ? (
        <RowSkeleton rows={4} />
      ) : error ? (
        <ErrorState message={error} onRetry={() => void load(1)} />
      ) : rows.length === 0 ? (
        <div className="rounded-lg border border-dashed bg-white px-6 py-12 text-center text-muted-foreground">
          Belum ada produk. Tambah produk pertamamu.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">Gambar</TableHead>
                <TableHead>Judul</TableHead>
                <TableHead className="text-right">Harga</TableHead>
                <TableHead className="text-right">Stok</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((product) => {
                const imageUrl = getProductImageUrl(product.imagePath);
                return (
                  <TableRow key={product.id}>
                    <TableCell>
                      {imageUrl ? (
                        <img
                          src={imageUrl}
                          alt=""
                          className="h-10 w-10 rounded-md object-cover"
                        />
                      ) : (
                        <div className="h-10 w-10 rounded-md bg-muted" />
                      )}
                    </TableCell>
                    <TableCell>
                      <Link
                        to={`/products/${product.slug}`}
                        className="line-clamp-1 font-medium hover:underline"
                      >
                        {product.title}
                      </Link>
                      <p className="font-mono text-xs text-muted-foreground">{product.slug}</p>
                    </TableCell>
                    <TableCell className="text-right">{formatRupiah(product.price)}</TableCell>
                    <TableCell className="text-right">
                      {product.availableStock}
                      {product.lockedStock > 0 ? (
                        <span className="text-xs text-muted-foreground">
                          {' '}
                          (dipesan: {product.lockedStock})
                        </span>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      {product.isActive ? (
                        <Badge variant="secondary">Aktif</Badge>
                      ) : (
                        <Badge variant="outline">Nonaktif</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(product)} aria-label={`Ubah ${product.title}`}>
                        <PencilSimple className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => void toggleActive(product)}
                      >
                        {product.isActive ? 'Nonaktifkan Produk' : 'Aktifkan'}
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {totalPages > 1 ? (
        <div className="mt-4 flex items-center justify-center gap-3">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => void load(page - 1)}>
            Sebelumnya
          </Button>
          <span className="text-sm text-muted-foreground">
            Halaman {page} dari {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => void load(page + 1)}
          >
            Berikutnya
          </Button>
        </div>
      ) : null}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? 'Ubah Produk' : 'Tambah Produk'}</DialogTitle>
          </DialogHeader>

          <form
            className="flex flex-col gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              void handleSave();
            }}
          >
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="p-title">Judul</Label>
              <Input
                id="p-title"
                value={form.title}
                maxLength={120}
                aria-invalid={!!fieldErrors.title || !!maxLengthError}
                onChange={(e) => {
                  const title = e.target.value;
                  setForm((f) => ({
                    ...f,
                    title,
                    // Isi slug otomatis dari judul, tetap bisa diesuaikan.
                    slug: f.slug === slugifyTitle(f.title) ? slugifyTitle(title) : f.slug,
                  }));
                }}
              />
              {maxLengthError || fieldErrors.title ? (
                <p className="text-xs text-destructive">{maxLengthError ?? fieldErrors.title}</p>
              ) : null}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="p-slug">Slug</Label>
              <Input
                id="p-slug"
                value={form.slug}
                aria-invalid={!!fieldErrors.slug}
                onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
                placeholder="gantungan-kunci-bola"
              />
              {fieldErrors.slug ? (
                <p className="text-xs text-destructive">{fieldErrors.slug}</p>
              ) : null}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="p-desc">Deskripsi</Label>
              <textarea
                id="p-desc"
                className="min-h-20 rounded-md border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="p-price">Harga (Rp)</Label>
                <Input
                  id="p-price"
                  type="number"
                  min={1}
                  step={1}
                  value={form.price}
                  aria-invalid={!!fieldErrors.price}
                  onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                />
                {fieldErrors.price ? (
                  <p className="text-xs text-destructive">{fieldErrors.price}</p>
                ) : null}
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="p-stock">Stok</Label>
                <Input
                  id="p-stock"
                  type="number"
                  min={0}
                  step={1}
                  value={form.stock}
                  aria-invalid={!!fieldErrors.stock}
                  onChange={(e) => setForm((f) => ({ ...f, stock: e.target.value }))}
                />
                {fieldErrors.stock ? (
                  <p className="text-xs text-destructive">{fieldErrors.stock}</p>
                ) : null}
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="p-image">Gambar (JPG, PNG, atau WebP, maksimal 2 MB)</Label>
              <Input
                id="p-image"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                ref={fileInputRef}
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
              {editing && editing.imagePath ? (
                <p className="text-xs text-muted-foreground">
                  Mengganti gambar ini? Pilih berkas baru.
                </p>
              ) : null}
              {file ? (
                <p className="text-xs text-muted-foreground">
                  {file.name} akan dikompres ke WebP (maksimal lebar 1200px).
                </p>
              ) : null}
            </div>

            {editing ? (
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
                  className="size-4 accent-[#302b8f]"
                />
                Produk aktif (tampil di katalog customer)
              </label>
            ) : (
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
                  className="size-4 accent-[#302b8f]"
                />
                Langsung aktif (tampil di katalog customer)
              </label>
            )}

            {formError ? (
              <p role="alert" className="text-sm text-destructive">
                {formError}
              </p>
            ) : null}
            {saving ? (
              <p className="text-sm text-muted-foreground" aria-live="polite">
                Menyimpan produk...
              </p>
            ) : null}

            <DialogFooter className="mt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
                disabled={saving}
              >
                Batal
              </Button>
              <Button type="submit" disabled={saving}>
                Simpan Produk
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </section>
  );
}
