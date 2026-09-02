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
  IdCard,
  InfoCircle,
  Lock,
  Mail,
  User,
  UserTick,
} from "../_components/icons";
import { Button } from "../_components/ui";
import type { Dict } from "../_lib/i18n";

/** Mirrors the backend RegisterDto rules so errors surface before the POST. */
const USERNAME_RE = /^\d{15,16}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const STRONG_PW_RE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

type Field = "username" | "fullName" | "email" | "password" | "confirm" | "captcha";

export default function RegisterPage() {
  const router = useRouter();

  const [username, setUsername] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [npwp, setNpwp] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [capsOn, setCapsOn] = useState(false);
  const [captcha, setCaptcha] = useState(false);

  const [touched, setTouched] = useState<Partial<Record<Field, boolean>>>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function onPwKey(e: React.KeyboardEvent<HTMLInputElement>) {
    setCapsOn(e.getModifierState?.("CapsLock") ?? false);
  }

  /** Field -> error message key, or null when the field is acceptable. */
  function validate(t: Dict): Partial<Record<Field, string>> {
    const errs: Partial<Record<Field, string>> = {};
    if (!USERNAME_RE.test(username.trim())) errs.username = t.errUseridFormat;
    if (fullName.trim().length < 3) errs.fullName = t.errFullNameRequired;
    if (!email.trim()) errs.email = t.errEmailRequired;
    else if (!EMAIL_RE.test(email.trim())) errs.email = t.errEmailInvalid;
    if (!STRONG_PW_RE.test(password)) errs.password = t.errPasswordWeak;
    if (confirm !== password) errs.confirm = t.errConfirmMismatch;
    if (!captcha) errs.captcha = t.errCaptchaRequired;
    return errs;
  }

  async function onSubmit(e: React.FormEvent, t: Dict) {
    e.preventDefault();
    setTouched({
      username: true,
      fullName: true,
      email: true,
      password: true,
      confirm: true,
      captcha: true,
    });
    setError(null);
    if (Object.keys(validate(t)).length > 0) return;

    setLoading(true);
    try {
      const res = await fetch("/api/be/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          username: username.trim(),
          fullName: fullName.trim(),
          email: email.trim(),
          npwp: npwp.trim() || undefined,
          password,
          captcha,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        // Nest returns `message` as a string or an array of validation errors.
        const msg = Array.isArray(data?.message) ? data.message[0] : data?.message;
        setError(msg ?? t.registerFailed);
        setLoading(false);
        return;
      }
      // The backend signs the new taxpayer in, so go straight to their returns.
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
      {(t) => {
        const errs = validate(t);
        const show = (f: Field) => (touched[f] ? errs[f] : undefined);

        return (
          <section className="w-full max-w-md">
            <div className="rounded-2xl border border-djp-blue/10 bg-white p-6 shadow-sm sm:p-9">
              <h1 className="font-heading text-2xl font-extrabold text-djp-blue">
                {t.registerWelcome}
              </h1>
              <p className="mt-2 text-sm leading-relaxed text-[var(--text-soft)]">
                {t.registerSubtitle}
              </p>

              {error && (
                <div className="mt-6 flex items-start gap-2.5 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3.5 text-sm leading-relaxed text-rose-700">
                  <InfoCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <form
                onSubmit={(e) => onSubmit(e, t)}
                noValidate
                className="mt-7 flex flex-col gap-5"
              >
                <Field
                  id="username"
                  label={t.useridLabel}
                  Icon={User}
                  value={username}
                  onChange={setUsername}
                  onBlur={() => setTouched((s) => ({ ...s, username: true }))}
                  placeholder={t.useridPlaceholder}
                  autoComplete="username"
                  inputMode="numeric"
                  hint={t.useridHint}
                  error={show("username")}
                  className={inputBase}
                />

                <Field
                  id="fullName"
                  label={t.fullNameLabel}
                  Icon={UserTick}
                  value={fullName}
                  onChange={setFullName}
                  onBlur={() => setTouched((s) => ({ ...s, fullName: true }))}
                  placeholder={t.fullNamePlaceholder}
                  autoComplete="name"
                  error={show("fullName")}
                  className={inputBase}
                />

                <Field
                  id="email"
                  label={t.emailLabel}
                  Icon={Mail}
                  type="email"
                  value={email}
                  onChange={setEmail}
                  onBlur={() => setTouched((s) => ({ ...s, email: true }))}
                  placeholder={t.emailPlaceholder}
                  autoComplete="email"
                  error={show("email")}
                  className={inputBase}
                />

                <Field
                  id="npwp"
                  label={t.npwpLabel}
                  optionalLabel={t.npwpOptional}
                  Icon={IdCard}
                  value={npwp}
                  onChange={setNpwp}
                  placeholder={t.npwpPlaceholder}
                  className={inputBase}
                />

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
                      autoComplete="new-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onKeyUp={onPwKey}
                      onKeyDown={onPwKey}
                      onBlur={() => {
                        setTouched((s) => ({ ...s, password: true }));
                        setCapsOn(false);
                      }}
                      placeholder={t.passwordPlaceholder}
                      className={`${inputBase} pl-11 pr-12 ${
                        show("password") ? "border-rose-300" : "border-djp-blue/20"
                      }`}
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
                  {show("password") ? (
                    <p className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-rose-600">
                      <InfoCircle className="h-3.5 w-3.5" />
                      {show("password")}
                    </p>
                  ) : (
                    <p className="mt-1.5 text-xs text-[var(--text-muted)]">{t.passwordHint}</p>
                  )}
                </div>

                {/* Confirm password */}
                <div>
                  <label htmlFor="confirm" className="mb-1.5 block text-sm font-bold text-djp-blue">
                    {t.confirmPasswordLabel}
                  </label>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--text-muted)]" />
                    <input
                      id="confirm"
                      type={showPw ? "text" : "password"}
                      autoComplete="new-password"
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                      onBlur={() => setTouched((s) => ({ ...s, confirm: true }))}
                      placeholder={t.confirmPasswordPlaceholder}
                      className={`${inputBase} pl-11 pr-4 ${
                        show("confirm") ? "border-rose-300" : "border-djp-blue/20"
                      }`}
                    />
                  </div>
                  {show("confirm") && (
                    <p className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-rose-600">
                      <InfoCircle className="h-3.5 w-3.5" />
                      {show("confirm")}
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
                      captcha
                        ? "border-djp-blue bg-djp-blue/5"
                        : show("captcha")
                          ? "border-rose-300"
                          : "border-djp-blue/20"
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
                        setTouched((s) => ({ ...s, captcha: true }));
                      }}
                    />
                    <span className="text-sm font-medium text-[var(--text-soft)]">
                      {t.captchaCheckbox}
                    </span>
                  </label>
                  {show("captcha") && (
                    <p className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-rose-600">
                      <InfoCircle className="h-3.5 w-3.5" />
                      {show("captcha")}
                    </p>
                  )}
                </div>

                <Button type="submit" size="lg" disabled={loading} className="w-full">
                  {loading ? (
                    <>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                      {t.registerLoading}
                    </>
                  ) : (
                    t.registerButton
                  )}
                </Button>

                <div className="relative my-2 text-center">
                  <span className="relative z-10 bg-white px-3 text-xs font-bold tracking-widest text-[var(--text-muted)]">
                    {t.separator}
                  </span>
                  <span className="absolute left-0 top-1/2 h-px w-full bg-djp-blue/10" />
                </div>

                <MiniCard
                  Icon={UserTick}
                  title={t.haveAccountTitle}
                  desc={t.haveAccountDesc}
                  href="/login"
                />
              </form>
            </div>

            <div className="mt-6 text-center">
              <Link
                href="/login"
                className="text-sm font-semibold text-[var(--text-muted)] transition hover:text-djp-blue"
              >
                ← {t.backLogin}
              </Link>
            </div>
          </section>
        );
      }}
    </AuthShell>
  );
}

/** Labelled text input with a leading icon, matching the login card fields. */
function Field({
  id,
  label,
  optionalLabel,
  Icon,
  value,
  onChange,
  onBlur,
  placeholder,
  type = "text",
  autoComplete,
  inputMode,
  hint,
  error,
  className,
}: {
  id: string;
  label: string;
  optionalLabel?: string;
  Icon: (p: { className?: string }) => React.JSX.Element;
  value: string;
  onChange: (v: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  type?: string;
  autoComplete?: string;
  inputMode?: "numeric";
  hint?: string;
  error?: string;
  className: string;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-bold text-djp-blue">
        {label}
        {optionalLabel && (
          <span className="ml-1.5 font-medium text-[var(--text-muted)]">({optionalLabel})</span>
        )}
      </label>
      <div className="relative">
        <Icon className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--text-muted)]" />
        <input
          id={id}
          type={type}
          value={value}
          autoComplete={autoComplete}
          inputMode={inputMode}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          placeholder={placeholder}
          className={`${className} pl-11 pr-4 ${error ? "border-rose-300" : "border-djp-blue/20"}`}
        />
      </div>
      {error ? (
        <p className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-rose-600">
          <InfoCircle className="h-3.5 w-3.5" />
          {error}
        </p>
      ) : (
        hint && <p className="mt-1.5 text-xs text-[var(--text-muted)]">{hint}</p>
      )}
    </div>
  );
}
