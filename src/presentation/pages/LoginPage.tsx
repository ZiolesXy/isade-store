import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { supabase } from '@/data/supabaseClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

type Mode = 'login' | 'register';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function LoginPage() {
  const [mode, setMode] = useState<Mode>('login');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();
  // Tanpa tujuan asal: default ke /dashboard sesuai peta route PLAN-UPDATE-v3.
  const from = (location.state as { from?: string } | null)?.from ?? '/dashboard';

  function validate(): boolean {
    const errors: Record<string, string> = {};
    if (mode === 'register' && fullName.trim().length > 60) {
      errors.fullName = 'Nama maksimal 60 karakter.';
    }
    if (!EMAIL_RE.test(email)) {
      errors.email = 'Format email tidak valid.';
    }
    if (password.length < 6) {
      errors.password = 'Kata sandi minimal 6 karakter.';
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setFormError(null);
    setNotice(null);
    if (!validate()) return;

    setBusy(true);
    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          setFormError('Email atau kata sandi salah.');
          return;
        }
        navigate(from, { replace: true });
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: fullName.trim() } },
        });
        if (error) {
          if (error.status === 422 || /already|terdaftar/i.test(error.message)) {
            setFormError('Email sudah terdaftar. Coba masuk.');
            return;
          }
          setFormError('Pendaftaran tidak berhasil. Coba lagi.');
          return;
        }
        if (data.session) {
          navigate(from, { replace: true });
          return;
        }
        // Konfirmasi email aktif di proyek ini.
        setNotice('Daftar berhasil. Cek email kamu untuk konfirmasi sebelum masuk.');
      }
    } catch {
      setFormError('Terjadi kesalahan. Coba lagi.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mx-auto max-w-md px-4 py-10">
      <Card className="rounded-lg">
        <CardContent className="p-6">
          <div
            className="mb-4 flex rounded-md bg-muted p-1 text-sm"
            role="tablist"
            aria-label="Masuk atau daftar"
          >
            {(
              [
                { value: 'login' as Mode, label: 'Masuk' },
                { value: 'register' as Mode, label: 'Daftar' },
              ]
            ).map((tab) => (
              <button
                key={tab.value}
                type="button"
                role="tab"
                aria-selected={mode === tab.value}
                onClick={() => {
                  setMode(tab.value);
                  setFormError(null);
                  setNotice(null);
                  setFieldErrors({});
                }}
                className={cn(
                  'flex-1 rounded-sm px-3 py-2 font-medium text-muted-foreground transition-colors',
                  'focus-visible:outline-2 focus-visible:outline-ring',
                  mode === tab.value && 'bg-white text-foreground shadow-xs'
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <form className="flex flex-col gap-4" onSubmit={handleSubmit} noValidate={undefined}>
            {mode === 'register' ? (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="fullName">Nama lengkap</Label>
                <Input
                  id="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  autoComplete="name"
                  maxLength={60}
                  aria-invalid={!!fieldErrors.fullName}
                />
                {fieldErrors.fullName ? (
                  <p className="text-xs text-destructive">{fieldErrors.fullName}</p>
                ) : null}
              </div>
            ) : null}

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                aria-invalid={!!fieldErrors.email}
              />
              {fieldErrors.email ? (
                <p className="text-xs text-destructive">{fieldErrors.email}</p>
              ) : null}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="password">Kata sandi</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                aria-invalid={!!fieldErrors.password}
              />
              {fieldErrors.password ? (
                <p className="text-xs text-destructive">{fieldErrors.password}</p>
              ) : null}
            </div>

            {formError ? (
              <p role="alert" className="text-sm text-destructive">
                {formError}
              </p>
            ) : null}
            {notice ? (
              <p role="status" className="text-sm text-muted-foreground">
                {notice}
              </p>
            ) : null}

            <Button type="submit" disabled={busy}>
              {busy ? 'Memproses...' : mode === 'login' ? 'Masuk' : 'Daftar'}
            </Button>

            <p className="text-center text-xs text-muted-foreground">
              {mode === 'login' ? (
                <>
                  Belum punya akun?{' '}
                  <Link
                    to="/login"
                    onClick={(e) => {
                      e.preventDefault();
                      setMode('register');
                    }}
                    className="underline"
                  >
                    Daftar
                  </Link>
                </>
              ) : (
                <>
                  Sudah punya akun?{' '}
                  <Link
                    to="/login"
                    onClick={(e) => {
                      e.preventDefault();
                      setMode('login');
                    }}
                    className="underline"
                  >
                    Masuk
                  </Link>
                </>
              )}
            </p>
          </form>
        </CardContent>
      </Card>
    </section>
  );
}
