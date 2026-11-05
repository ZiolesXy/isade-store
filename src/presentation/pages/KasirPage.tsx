import { useRef, useState } from 'react';
import type { FormEvent } from 'react';
import {
  Scanner,
  type IDetectedBarcode,
  type IScannerError,
} from '@yudiel/react-qr-scanner';
import { FunctionsHttpError } from '@supabase/supabase-js';
import type { Order, OrderStatus } from '@/domain/models/Order';
import { di } from '@/di';
import { useCashier } from '@/presentation/hooks/useCashier';
import { OrderStatusBadge, STATUS_LABEL } from '@/presentation/components/OrderStatusBadge';
import { formatDateTime, formatRupiah } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type OtherResult = Exclude<OrderStatus, 'pending'>;

// Dua opsi input kode di Kasir: memindai QR pembeli dengan kamera, atau ketik manual.
type ScanMode = 'camera' | 'manual';

function describeScannerError(error: IScannerError): string {
  switch (error.kind) {
    case 'permission-denied':
      return 'Akses kamera ditolak. Izinkan kamera di browser atau gunakan input manual.';
    case 'no-camera':
      return 'Kamera tidak ditemukan di perangkat ini. Gunakan input manual.';
    case 'in-use':
      return 'Kamera sedang dipakai aplikasi lain. Tutup aplikasi itu atau gunakan input manual.';
    case 'insecure-context':
      return 'Kamera hanya bisa dipakai di halaman HTTPS. Gunakan input manual.';
    default:
      return 'Scanner kamera tidak berhasil dijalankan. Gunakan input manual.';
  }
}

async function describeVerifyError(error: unknown): Promise<string> {
  if (error instanceof FunctionsHttpError) {
    const response = error.context;
    let code: string | undefined;
    try {
      const body = (await response.json()) as { error?: { code?: string } };
      code = body?.error?.code;
    } catch {
      code = undefined;
    }
    if (code === 'FORBIDDEN') {
      return 'Akses ditolak. Hanya kasir atau admin yang bisa memverifikasi pembayaran.';
    }
    if (code === 'ORDER_NOT_FOUND') {
      return 'Pesanan tidak ditemukan.';
    }
    if (code === 'INVALID_RESULT') {
      return 'Hasil verifikasi tidak valid.';
    }
  }
  return 'Verifikasi tidak berhasil. Coba lagi.';
}

export function KasirPage() {
  const { verifyPayment } = useCashier();
  const [code, setCode] = useState('');
  const [order, setOrder] = useState<Order | null>(null);
  const [lookupBusy, setLookupBusy] = useState(false);
  const [verifyBusy, setVerifyBusy] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [catatan, setCatatan] = useState('');
  const [otherResult, setOtherResult] = useState<OtherResult>('needs_review');
  const [scanMode, setScanMode] = useState<ScanMode>('manual');

  // Kunci anti-duplikat: satu hasil QR hanya diproses sekali meski kamera memancarkan ulang.
  const scanLockRef = useRef(false);

  async function handleScan(event: FormEvent) {
    event.preventDefault();
    setLookupError(null);
    setVerifyError(null);
    setOrder(null);

    const trimmed = code.trim();
    if (!UUID_RE.test(trimmed)) {
      setLookupError('Kode transaksi harus berupa kode pesanan yang valid.');
      return;
    }

    setLookupBusy(true);
    try {
      const found = await di.orderRepository.getById(trimmed);
      if (!found) {
        setLookupError('Pesanan tidak ditemukan.');
        return;
      }
      setOrder(found);
    } catch {
      setLookupError('Pesanan tidak berhasil dicari.');
    } finally {
      setLookupBusy(false);
    }
  }

  // Versi verifikasi yang eksplisit target ordernya, supaya alur hasil scan
  // bisa langsung memverifikasi tanpa menunggu state `order` diperbarui.
  async function doVerify(target: Order, result: 'paid' | OtherResult) {
    setVerifyError(null);
    setVerifyBusy(true);
    try {
      const finalStatus = (await verifyPayment({
        orderId: target.id,
        result,
        catatan: catatan.trim() || undefined,
      })) as string;

      const fresh = await di.orderRepository.getById(target.id);
      setOrder(fresh);
      setCatatan('');

      if (finalStatus === 'paid' || result === 'paid') {
        toast.success('Pembayaran diverifikasi. Pesanan ditandai dibayar.');
      } else {
        toast.success(`Pesanan diperbarui menjadi ${STATUS_LABEL[result as OrderStatus]}.`);
      }
    } catch (error) {
      setVerifyError(await describeVerifyError(error));
    } finally {
      setVerifyBusy(false);
    }
  }

  async function handleVerify(result: 'paid' | OtherResult) {
    if (!order || verifyBusy) return;
    await doVerify(order, result);
  }

  // Alur hasil scan kamera: isi input order_id, matikan kamera,
  // lalu lacak pesanan. Jika pesanan masih pending, verifikasi langsung
  // menjadi 'paid' memakai usecase verifikasi kasir yang sudah ada.
  // (Opsi input manual tetap lewat handleScan yang sudah ada.)
  function switchScanMode(mode: ScanMode) {
    scanLockRef.current = false;
    setScanMode(mode);
  }

  async function handleQrValue(raw: string) {
    if (scanLockRef.current || lookupBusy || verifyBusy) return;
    scanLockRef.current = true;

    const trimmed = raw.trim();

    // 1) Masukkan hasil scan ke input order_id.
    setCode(trimmed);
    // 2) Matikan kamera: kembali ke mode input manual (komponen Scanner unmount).
    setScanMode('manual');

    setLookupError(null);
    setVerifyError(null);
    setOrder(null);

    try {
      if (!UUID_RE.test(trimmed)) {
        setLookupError('Kode transaksi harus berupa kode pesanan yang valid.');
        return;
      }

      // 3) Lacak pesanan lewat repository yang sudah ada (tanpa query DB di UI).
      setLookupBusy(true);
      const found = await di.orderRepository.getById(trimmed);
      if (!found) {
        setLookupError('Pesanan tidak ditemukan.');
        return;
      }
      setOrder(found);

      // 4) Saat hasil scan dari kamera, auto-verifikasi 'paid' hanya untuk
      //    pembayaran tunai (pesanan web harus diverifikasi Midtrans, bukan
      //    langsung ditandai dibayar karena QR-nya dipindai).
      if (found.status === 'pending' && found.paymentMethod === 'KASIR_CASH') {
        await doVerify(found, 'paid');
      }
    } catch {
      setLookupError('Pesanan tidak berhasil dicari.');
    } finally {
      setLookupBusy(false);
      scanLockRef.current = false;
    }
  }

  function handleDetected(detected: IDetectedBarcode[]) {
    const raw = detected[0]?.rawValue;
    if (!raw) return;
    void handleQrValue(raw);
  }

  const isPaid = order?.status === 'paid';
  const isPending = order?.status === 'pending';
  const canVerify = isPending && !verifyBusy;

  return (
    <section className="mx-auto max-w-3xl px-4 py-6">
      <h1 className="mb-4 font-display text-xl font-bold">Kasir</h1>

      {/* Focal point: formulir scan dan status verifikasi. */}
      <Card className="rounded-lg">
        <CardContent className="p-4">
          <div className="flex flex-col gap-3">
            {/* Dua opsi input kode: Gunakan Kamera / Input Manual. */}
            <div className="flex flex-wrap gap-2" role="group" aria-label="Metode input kode pesanan">
              <Button
                type="button"
                size="sm"
                variant={scanMode === 'camera' ? 'default' : 'outline'}
                aria-pressed={scanMode === 'camera'}
                onClick={() => switchScanMode('camera')}
              >
                Gunakan Kamera
              </Button>
              <Button
                type="button"
                size="sm"
                variant={scanMode === 'manual' ? 'default' : 'outline'}
                aria-pressed={scanMode === 'manual'}
                onClick={() => switchScanMode('manual')}
              >
                Input Manual
              </Button>
            </div>

            {scanMode === 'camera' ? (
              <div>
                <div className="overflow-hidden rounded-md border">
                  <Scanner
                    formats={['qr_code']}
                    onScan={handleDetected}
                    onError={(e: IScannerError) => setLookupError(describeScannerError(e))}
                    classNames={{ container: 'h-72 w-full' }}
                    paused={lookupBusy || verifyBusy}
                    sound
                  />
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  Arahkan kamera ke QR Code pesanan pembeli. Saat terbaca, kode masuk otomatis ke
                  input order_id dan verifikasi langsung dijalankan.
                </p>
              </div>
            ) : (
              <form className="flex flex-wrap gap-2" onSubmit={handleScan}>
                <div className="flex-1">
                  <Label htmlFor="code">Kode transaksi</Label>
                  <Input
                    id="code"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="Tempel kode pesanan dari halaman kasir customer"
                    className="font-mono"
                  />
                </div>
                <div className="flex items-end">
                  <Button type="submit" disabled={lookupBusy}>
                    {lookupBusy ? 'Mencari...' : 'Scan Transaksi'}
                  </Button>
                </div>
              </form>
            )}

            {lookupError ? (
              <p role="alert" className="text-sm text-destructive">
                {lookupError}
              </p>
            ) : null}
          </div>
        </CardContent>
      </Card>

      {order ? (
        <Card className="mt-4 rounded-lg">
          <CardContent className="flex flex-col gap-4 p-4">
            <div
              className={
                isPaid
                  ? 'rounded-md bg-secondary/60 px-3 py-2 text-sm font-medium text-secondary-foreground'
                  : 'rounded-md bg-muted px-3 py-2 text-sm'
              }
            >
              {isPaid ? (
                <>
                  Pesanan ini sudah dibayar dan tidak bisa diubah lagi. Tampilan hanya baca.
                </>
              ) : isPending ? (
                <>Periksa bukti pembayaran tunai, lalu verifikasi di bawah.</>
              ) : (
                <>
                  Status pesanan saat ini: {STATUS_LABEL[order.status]}. Tidak ada tindakan
                  verifikasi untuk status ini.
                </>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <span className="font-mono text-xs text-muted-foreground">{order.id}</span>
              <OrderStatusBadge status={order.status} />
              <span className="text-sm text-muted-foreground">
                Dibuat {formatDateTime(order.createdAt)}
              </span>
              <span className="ml-auto text-lg font-bold">{formatRupiah(order.totalAmount)}</span>
            </div>

            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Produk</TableHead>
                    <TableHead className="text-center">Jumlah</TableHead>
                    <TableHead className="text-right">Subtotal</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {order.items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.titleSnapshot}</TableCell>
                      <TableCell className="text-center">{item.quantity}</TableCell>
                      <TableCell className="text-right">
                        {formatRupiah(item.lineTotal)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {isPending ? (
              <div className="flex flex-col gap-3 rounded-md border bg-muted/40 p-3">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="catatan">Catatan (opsional)</Label>
                  <Input
                    id="catatan"
                    value={catatan}
                    onChange={(e) => setCatatan(e.target.value)}
                    placeholder="Misal: diterima tunai dari Ani"
                  />
                </div>

                <Button
                  className="bg-cta text-cta-foreground hover:bg-cta/90"
                  disabled={!canVerify}
                  onClick={() => void handleVerify('paid')}
                >
                  {verifyBusy ? 'Memverifikasi...' : 'Verifikasi Pembayaran'}
                </Button>

                <div className="flex flex-wrap items-center gap-2">
                  <Label htmlFor="other-result" className="text-sm">
                    Ubah ke status lain
                  </Label>
                  <Select
                    value={otherResult}
                    onValueChange={(value) => setOtherResult(value as OtherResult)}
                    disabled={!canVerify}
                  >
                    <SelectTrigger id="other-result" className="w-48 bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="needs_review">Perlu Ditinjau</SelectItem>
                      <SelectItem value="failed">Gagal</SelectItem>
                      <SelectItem value="expired">Kedaluwarsa</SelectItem>
                      <SelectItem value="cancelled">Dibatalkan</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={!canVerify}
                    onClick={() => void handleVerify(otherResult)}
                  >
                    Terapkan
                  </Button>
                </div>
              </div>
            ) : null}

            {verifyError ? (
              <p role="alert" className="text-sm text-destructive">
                {verifyError}
              </p>
            ) : null}

            <p className="text-xs text-muted-foreground">
              Pesanan yang sudah dibayar ditampilkan tanpa tombol. Perubahan status dicatat di riwayat
              payment_events.
            </p>
          </CardContent>
        </Card>
      ) : null}
    </section>
  );
}
