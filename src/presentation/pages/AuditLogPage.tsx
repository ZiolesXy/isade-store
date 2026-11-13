import { useCallback, useEffect, useState } from 'react';
import type { Database } from '@/data/database.types';
import { supabase } from '@/data/supabaseClient';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
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
import { ErrorState, RowSkeleton } from '@/presentation/components/states';
import { formatDateTime, formatRupiah } from '@/lib/format';

type AuditLogRow = Database['public']['Tables']['audit_log']['Row'];

const PAGE_SIZE = 50;

const ENTITIES = ['semua', 'products', 'profiles'] as const;
type EntityFilter = (typeof ENTITIES)[number];

const ENTITY_LABEL: Record<Exclude<EntityFilter, 'semua'>, string> = {
  products: 'Produk',
  profiles: 'Akun',
};

const ACTION_LABEL: Record<string, string> = {
  INSERT: 'Tambah',
  UPDATE: 'Ubah',
  DELETE: 'Hapus',
};

/** Ringkasan kolom details (snapshot baris) dalam teks pendek per entity. */
function summarize(row: AuditLogRow): string {
  const d = row.details;
  if (!d || typeof d !== 'object') return '-';
  const obj = d as Record<string, unknown>;
  let parts: Array<string | null>;
  if (row.entity === 'products') {
    parts = [
      typeof obj.name === 'string' ? obj.name : null,
      typeof obj.price === 'number' ? formatRupiah(obj.price) : null,
      'is_active' in obj ? (obj.is_active ? 'aktif' : 'nonaktif') : null,
    ];
  } else if (row.entity === 'profiles') {
    parts = [
      typeof obj.full_name === 'string' ? obj.full_name : null,
      typeof obj.role === 'string' ? obj.role : null,
      'is_active' in obj ? (obj.is_active ? 'aktif' : 'nonaktif') : null,
    ];
  } else {
    return JSON.stringify(d).slice(0, 80);
  }
  const joined = parts.filter(Boolean).join(' • ');
  return joined || '-';
}

/**
 * /audit-log (admin): jejak aksi sensitif yang tercatat otomatis lewat trigger
 * database — kelola produk (tambah/ubah/hapus) dan perubahan role/is_active
 * akun. RLS audit_log_select_admin membuat tabel ini hanya terbaca admin.
 * Query selalu ber-paginasi (limit 50) supaya murah di Supabase cloud.
 */
export function AuditLogPage() {
  const [rows, setRows] = useState<AuditLogRow[]>([]);
  const [actorNames, setActorNames] = useState<Record<string, string | null>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [entity, setEntity] = useState<EntityFilter>('semua');
  const [page, setPage] = useState(0);
  const [hasNext, setHasNext] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let query = supabase
        .from('audit_log')
        .select('*')
        .order('created_at', { ascending: false })
        .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);
      if (entity !== 'semua') query = query.eq('entity', entity);
      const { data, error: queryError } = await query;
      if (queryError) throw queryError;
      const list = data ?? [];
      setRows(list);
      setHasNext(list.length === PAGE_SIZE);

      // Nama pelaku: satu query kecil untuk id yang muncul di halaman ini.
      const actorIds = [...new Set(list.map((r) => r.actor_id).filter((id): id is string => !!id))];
      if (actorIds.length > 0) {
        const { data: profiles, error: profileError } = await supabase
          .from('profiles')
          .select('id,full_name')
          .in('id', actorIds);
        if (profileError) throw profileError;
        setActorNames(Object.fromEntries((profiles ?? []).map((p) => [p.id, p.full_name])));
      } else {
        setActorNames({});
      }
    } catch {
      setError('Audit log tidak berhasil dimuat.');
    } finally {
      setLoading(false);
    }
  }, [entity, page]);

  useEffect(() => {
    void load();
  }, [load]);

  function changeEntity(value: string) {
    setEntity(value as EntityFilter);
    setPage(0);
  }

  return (
    <section className="mx-auto max-w-6xl px-4 py-6">
      <h1 className="mb-4 font-display text-xl font-bold">Audit Log</h1>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Select value={entity} onValueChange={changeEntity}>
          <SelectTrigger className="w-40 bg-white" aria-label="Filter jenis aksi">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ENTITIES.map((e) => (
              <SelectItem key={e} value={e}>
                {e === 'semua' ? 'Semua aksi' : ENTITY_LABEL[e]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          Tercatat otomatis: kelola produk, perubahan role, aktif/nonaktif akun.
        </p>
      </div>

      {loading ? (
        <RowSkeleton rows={5} />
      ) : error ? (
        <ErrorState message={error} onRetry={() => void load()} />
      ) : (
        <Card className="rounded-lg">
          <CardContent className="p-0">
            <div className="overflow-x-auto rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Waktu</TableHead>
                    <TableHead>Pelaku</TableHead>
                    <TableHead>Aksi</TableHead>
                    <TableHead>Objek</TableHead>
                    <TableHead>Isi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="whitespace-nowrap text-sm">
                        {formatDateTime(row.created_at)}
                      </TableCell>
                      <TableCell className="text-sm">
                        {row.actor_id
                          ? (actorNames[row.actor_id] ?? row.actor_id.slice(0, 8))
                          : <span className="text-muted-foreground">sistem</span>}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            row.action === 'DELETE'
                              ? 'destructive'
                              : row.action === 'INSERT'
                                ? 'secondary'
                                : 'outline'
                          }
                        >
                          {ACTION_LABEL[row.action] ?? row.action}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {row.entity === 'products'
                          ? `Produk ${row.entity_id ? `#${row.entity_id.slice(0, 8)}` : ''}`
                          : `Akun ${row.entity_id ? `#${row.entity_id.slice(0, 8)}` : ''}`}
                      </TableCell>
                      <TableCell className="max-w-xs truncate text-sm text-muted-foreground" title={summarize(row)}>
                        {summarize(row)}
                      </TableCell>
                    </TableRow>
                  ))}
                  {rows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">
                        Belum ada catatan audit.
                      </TableCell>
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="mt-4 flex items-center justify-end gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={loading || page === 0}
          onClick={() => setPage((p) => Math.max(0, p - 1))}
        >
          Sebelumnya
        </Button>
        <span className="text-sm text-muted-foreground">Halaman {page + 1}</span>
        <Button
          variant="outline"
          size="sm"
          disabled={loading || !hasNext}
          onClick={() => setPage((p) => p + 1)}
        >
          Berikutnya
        </Button>
      </div>
    </section>
  );
}
