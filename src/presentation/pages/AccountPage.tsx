import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import { SignOut } from '@phosphor-icons/react';
import { supabase } from '@/data/supabaseClient';
import { useAuthStore } from '@/presentation/stores/useAuthStore';
import { ROLE_LABEL, isRole } from '@/lib/roles';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

/** /akun: profil dasar dan pengaturan akun untuk role user (Tahap 1 & 3). */
export function AccountPage() {
  const userId = useAuthStore((s) => s.userId);
  const email = useAuthStore((s) => s.email);
  const fullName = useAuthStore((s) => s.fullName);
  const role = useAuthStore((s) => s.role);
  const [name, setName] = useState(fullName ?? '');

  // Setelah refresh, profil datang belakangan (authSession fetch async);
  // sinkronkan input saat fullName di store terisi berubah.
  useEffect(() => {
    setName(fullName ?? '');
  }, [fullName]);
  const [saving, setSaving] = useState(false);

  async function handleSave(event: FormEvent) {
    event.preventDefault();
    if (!userId || saving) return;
    const trimmed = name.trim();
    if (trimmed.length > 60) {
      toast.error('Nama maksimal 60 karakter.');
      return;
    }
    setSaving(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        // id tidak ikut di-set: grant update hanya full_name (RLS + grant),
        // menyertakan id memicu permission denied yang PostgREST laporkan 401.
        .update({ full_name: trimmed || null })
        .eq('id', userId)
        .select()
        .single();
      if (error) throw error;
      useAuthStore.getState().setProfile(data);
      toast.success('Profil tersimpan.');
    } catch {
      toast.error('Profil tidak berhasil disimpan.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="mx-auto max-w-md px-4 py-6">
      <h1 className="mb-4 font-display text-xl font-bold">Akun Saya</h1>

      <Card className="rounded-lg">
        <CardContent className="flex flex-col gap-4 p-4">
          <dl className="flex flex-col gap-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Email</dt>
              <dd className="max-w-56 truncate">{email ?? '-'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Role</dt>
              <dd>{isRole(role) ? ROLE_LABEL[role] : '-'}</dd>
            </div>
          </dl>

          <form className="flex flex-col gap-1.5" onSubmit={handleSave}>
            <Label htmlFor="akun-nama">Nama lengkap</Label>
            <div className="flex gap-2">
              <Input
                id="akun-nama"
                value={name}
                maxLength={60}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nama yang ditampilkan"
              />
              <Button type="submit" disabled={saving}>
                {saving ? 'Menyimpan...' : 'Simpan'}
              </Button>
            </div>
          </form>

          <div className="flex flex-wrap gap-2 border-t pt-3">
            <Button asChild variant="outline" size="sm">
              <Link to="/dashboard">Ke dashboard</Link>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                void supabase.auth.signOut().then(() => {
                  useAuthStore.getState().logout();
                  window.location.assign('/katalog');
                });
              }}
            >
              <SignOut className="size-4" weight="duotone" />
              Keluar
            </Button>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
