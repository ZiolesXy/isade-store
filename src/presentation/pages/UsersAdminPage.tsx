import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Database } from '@/data/database.types';
import { supabase } from '@/data/supabaseClient';
import { useAuthStore } from '@/presentation/stores/useAuthStore';
import { ROLES, ROLE_LABEL, isRole, type Role } from '@/lib/roles';
import { formatDate } from '@/lib/format';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
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
import { toast } from 'sonner';

type ProfileRow = Database['public']['Tables']['profiles']['Row'];

/**
 * /users (admin, PLAN-UPDATE-v3 Tahap 3): daftar user, cari, ubah role,
 * nonaktifkan akun. Perubahan role/is_active tercatat otomatis di audit_log
 * lewat trigger profiles_role_audit_log.
 */
export function UsersAdminPage() {
  const selfId = useAuthStore((s) => s.userId);
  const [rows, setRows] = useState<ProfileRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: queryError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);
      if (queryError) throw queryError;
      setRows(data ?? []);
    } catch {
      setError('Daftar user tidak berhasil dimuat.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        (r.full_name ?? '').toLowerCase().includes(q) ||
        r.id.toLowerCase().includes(q)
    );
  }, [rows, search]);

  const adminCount = rows.filter((r) => r.role === 'admin' && r.is_active).length;

  function guardSelf(admin: ProfileRow, nextRole: Role): boolean {
    // Admin terakhir tidak boleh menurunkan role dirinya sendiri.
    if (admin.id === selfId && admin.role === 'admin' && nextRole !== 'admin' && adminCount <= 1) {
      toast.error('Kamu admin terakhir. Angkat admin lain dulu sebelum menurunkan role-mu.');
      return false;
    }
    return true;
  }

  async function changeRole(admin: ProfileRow, nextRole: Role) {
    if (busyId) return;
    if (nextRole === admin.role) return;
    if (!guardSelf(admin, nextRole)) return;
    setBusyId(admin.id);
    try {
      const { data, error: updateError } = await supabase
        .from('profiles')
        .update({ id: admin.id, role: nextRole })
        .eq('id', admin.id)
        .select()
        .single();
      if (updateError) throw updateError;
      setRows((prev) => prev.map((r) => (r.id === admin.id ? (data as ProfileRow) : r)));
      if (admin.id === selfId) useAuthStore.getState().setProfile(data as ProfileRow);
      toast.success(`Role ${admin.full_name ?? admin.id.slice(0, 8)} diubah ke ${ROLE_LABEL[nextRole]}.`);
    } catch {
      toast.error('Role tidak berhasil diubah.');
    } finally {
      setBusyId(null);
    }
  }

  async function toggleActive(admin: ProfileRow) {
    if (busyId) return;
    if (admin.id === selfId) {
      toast.error('Tidak bisa menonaktifkan akun sendiri.');
      return;
    }
    setBusyId(admin.id);
    try {
      const { data, error: updateError } = await supabase
        .from('profiles')
        .update({ id: admin.id, is_active: !admin.is_active })
        .eq('id', admin.id)
        .select()
        .single();
      if (updateError) throw updateError;
      setRows((prev) => prev.map((r) => (r.id === admin.id ? (data as ProfileRow) : r)));
      toast.success(admin.is_active ? 'Akun dinonaktifkan.' : 'Akun diaktifkan.');
    } catch {
      toast.error('Status akun tidak berhasil diubah.');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section className="mx-auto max-w-6xl px-4 py-6">
      <h1 className="mb-4 font-display text-xl font-bold">Kelola User</h1>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cari nama atau id user..."
          className="max-w-xs"
          aria-label="Cari user"
        />
        <p className="text-xs text-muted-foreground">
          Perubahan role dan status akun tercatat di audit_log (siapa, kapan).
        </p>
      </div>

      {loading ? (
        <RowSkeleton rows={4} />
      ) : error ? (
        <ErrorState message={error} onRetry={() => void load()} />
      ) : (
        <Card className="rounded-lg">
          <CardContent className="p-0">
            <div className="overflow-x-auto rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nama</TableHead>
                    <TableHead>ID</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Dibuat</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((admin) => (
                    <TableRow key={admin.id}>
                      <TableCell className="font-medium">
                        {admin.full_name ?? '(tanpa nama)'}
                        {admin.id === selfId ? (
                          <Badge variant="secondary" className="ml-2">
                            kamu
                          </Badge>
                        ) : null}
                      </TableCell>
                      <TableCell className="font-mono text-xs">{admin.id.slice(0, 8)}</TableCell>
                      <TableCell>
                        <Select
                          value={admin.role}
                          onValueChange={(value) => {
                            if (isRole(value)) void changeRole(admin, value);
                          }}
                          disabled={busyId === admin.id}
                        >
                          <SelectTrigger className="w-32 bg-white" aria-label={`Role ${admin.full_name ?? admin.id}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {ROLES.map((r) => (
                              <SelectItem key={r} value={r}>
                                {ROLE_LABEL[r]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        {admin.is_active ? (
                          <Badge variant="secondary">Aktif</Badge>
                        ) : (
                          <Badge variant="outline">Nonaktif</Badge>
                        )}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-sm">
                        {formatDate(admin.created_at)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={busyId === admin.id || admin.id === selfId}
                          onClick={() => void toggleActive(admin)}
                        >
                          {admin.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </section>
  );
}
