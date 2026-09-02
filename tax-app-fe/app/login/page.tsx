"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AuthShell, MiniCard } from "../_components/auth-shell";
import {
  ArrowUp,
  Check,
  Eye,
  EyeOff,
  InfoCircle,
  Lock,
  User,
  UserAdd,
  UserTick,
} from "../_components/icons";
import { Button } from "../_components/ui";

export default function LoginPage() {
  const router = useRouter();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [capsOn, setCapsOn] = useState(false);
  const [captcha, setCaptcha] = useState(false);

  const [touched, setTouched] = useState<{ u?: boolean; p?: boolean; c?: boolean }>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function onPwKey(e: React.KeyboardEvent<HTMLInputElement>) {
    setCapsOn(e.getModifierState?.("CapsLock") ?? false);
  }

  const uErr = touched.u && !username.trim();
  const pErr = touched.p && !password.trim();
  const cErr = touched.c && !captcha;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setTouched({ u: true, p: true, c: true });
    setError(null);
    if (!username.trim() || !password.trim() || !captcha) return;

    setLoading(true);
    try {
      const res = await fetch("/api/be/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ username: username.trim(), password, captcha }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.message ?? "ID Pengguna atau Kata Sandi salah.");
        setLoading(false);
        return;
      }
      router.push("/spt");
      router.refresh();
    } catch {
      setError("Tidak dapat terhubung ke server. Coba lagi.");
      setLoading(false);
    }
  }

  const inputBase =
    "control border bg-white text-[var(--text-main)] focus:ring-2 focus:ring-djp-blue/15";

  return (
    <AuthShell>
      {(t) => (
        <section className="w-full max-w-md">
          <div className="rounded-2xl border border-djp-blue/10 bg-white p-6 shadow-sm sm:p-9">
            <h1 className="font-heading text-2xl font-extrabold text-djp-blue">
              {t.loginWelcome}
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-[var(--text-soft)]">
              {t.loginSubtitle}
            </p>

            {error && (
              <div className="mt-6 flex items-start gap-2.5 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3.5 text-sm leading-relaxed text-rose-700">
                <InfoCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={onSubmit} noValidate className="mt-7 flex flex-col gap-5">
              {/* User ID */}
              <div>
                <label htmlFor="username" className="mb-1.5 block text-sm font-bold text-djp-blue">
                  {t.useridLabel}
                </label>
                <div className="relative">
                  <User className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--text-muted)]" />
                  <input
                    id="username"
                    type="text"
                    autoComplete="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    onBlur={() => setTouched((s) => ({ ...s, u: true }))}
                    placeholder={t.useridPlaceholder}
                    className={`${inputBase} pl-11 pr-4 ${uErr ? "border-rose-300" : "border-djp-blue/20"}`}
                  />
                </div>
                {uErr && (
                  <p className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-rose-600">
                    <InfoCircle className="h-3.5 w-3.5" />
                    {t.errUseridRequired}
                  </p>
                )}
              </div>

              {/* Password */}
              <div>
                <label htmlFor="password" className="mb-1.5 block text-sm font-bold text-djp-blue">
                  {t.passwordLabel}
                </label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--text-muted)]" />
                  <input
                    id="password"
                    type={showPw ? "text" : "password"}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyUp={onPwKey}
                    onKeyDown={onPwKey}
                    onBlur={() => {
                      setTouched((s) => ({ ...s, p: true }));
                      setCapsOn(false);
                    }}
                    placeholder={t.passwordPlaceholder}
                    className={`${inputBase} pl-11 pr-12 ${pErr ? "border-rose-300" : "border-djp-blue/20"}`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw((v) => !v)}
                    aria-label="Toggle password visibility"
                    className="absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-lg text-[var(--text-muted)] transition hover:bg-djp-blue/5 hover:text-djp-blue"
                  >
                    {showPw ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
                {capsOn && (
                  <p className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-[#9a6b00]">
                    <ArrowUp className="h-3.5 w-3.5" />
                    {t.capsWarning}
                  </p>
                )}
                {pErr && (
                  <p className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-rose-600">
                    <InfoCircle className="h-3.5 w-3.5" />
                    {t.errPasswordRequired}
                  </p>
                )}
              </div>

              {/* Captcha */}
              <div>
                <label className="mb-1.5 block text-sm font-bold text-djp-blue">
                  {t.captchaLabel}
                </label>
                <label
                  className={`flex cursor-pointer items-center gap-3.5 rounded-lg border px-4 py-3.5 transition ${
                    captcha ? "border-djp-blue bg-djp-blue/5" : cErr ? "border-rose-300" : "border-djp-blue/20"
                  }`}
                >
                  <span
                    className={`grid h-6 w-6 shrink-0 place-items-center rounded-md border transition ${
                      captcha ? "border-djp-blue bg-djp-blue text-white" : "border-djp-blue/30"
                    }`}
                  >
                    {captcha && <Check className="h-4 w-4" />}
                  </span>
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={captcha}
                    onChange={(e) => {
                      setCaptcha(e.target.checked);
                      setTouched((s) => ({ ...s, c: true }));
                    }}
                  />
                  <span className="text-sm font-medium text-[var(--text-soft)]">
                    {t.captchaCheckbox}
                  </span>
                </label>
                {cErr && (
                  <p className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-rose-600">
                    <InfoCircle className="h-3.5 w-3.5" />
                    {t.errCaptchaRequired}
                  </p>
                )}
              </div>

              <button
                type="button"
                className="self-end text-sm font-bold text-djp-blue transition hover:underline"
              >
                {t.forgot}
              </button>

              <Button type="submit" size="lg" disabled={loading} className="w-full">
                {loading ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                    {t.loginLoading}
                  </>
                ) : (
                  t.loginButton
                )}
              </Button>

              <div className="relative my-2 text-center">
                <span className="relative z-10 bg-white px-3 text-xs font-bold tracking-widest text-[var(--text-muted)]">
                  {t.separator}
                </span>
                <span className="absolute left-0 top-1/2 h-px w-full bg-djp-blue/10" />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <MiniCard
                  Icon={UserAdd}
                  title={t.newUserTitle}
                  desc={t.newUserDesc}
                  href="/register"
                />
                <MiniCard Icon={UserTick} title={t.activationTitle} desc={t.activationDesc} />
              </div>
            </form>
          </div>

          <div className="mt-6 text-center">
            <Link
              href="/"
              className="text-sm font-semibold text-[var(--text-muted)] transition hover:text-djp-blue"
            >
              ← {t.backHome}
            </Link>
          </div>
        </section>
      )}
    </AuthShell>
  );
}
