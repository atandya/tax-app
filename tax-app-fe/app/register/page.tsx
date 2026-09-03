"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  AuthShell,
  MiniCard,
  OrDivider,
  PasswordToggleButton,
} from "../_components/auth-shell";
import { Alert } from "../_components/icons";
import { Button, Choice, Field, Notice } from "../_components/ui";
import type { Dict } from "../_lib/i18n";

/** Mirrors the backend RegisterDto rules so errors surface before the POST. */
const USERNAME_RE = /^\d{15,16}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const STRONG_PW_RE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

type FieldKey =
  | "username"
  | "fullName"
  | "email"
  | "password"
  | "confirm"
  | "captcha";

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

  const [touched, setTouched] = useState<Partial<Record<FieldKey, boolean>>>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function onPwKey(e: React.KeyboardEvent<HTMLInputElement>) {
    setCapsOn(e.getModifierState?.("CapsLock") ?? false);
  }

  /** Field -> error message, or absent when the field is acceptable. */
  function validate(t: Dict): Partial<Record<FieldKey, string>> {
    const errs: Partial<Record<FieldKey, string>> = {};
    if (!USERNAME_RE.test(username.trim())) errs.username = t.errUseridFormat;
    if (fullName.trim().length < 3) errs.fullName = t.errFullNameRequired;
    if (!email.trim()) errs.email = t.errEmailRequired;
    else if (!EMAIL_RE.test(email.trim())) errs.email = t.errEmailInvalid;
    if (!STRONG_PW_RE.test(password)) errs.password = t.errPasswordWeak;
    if (confirm !== password) errs.confirm = t.errConfirmMismatch;
    if (!captcha) errs.captcha = t.errCaptchaRequired;
    return errs;
  }

  return (
    <AuthShell>
      {(t) => {
        const errs = validate(t);
        const show = (f: FieldKey) => (touched[f] ? errs[f] : undefined);

        async function onSubmit(e: React.FormEvent) {
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
          if (Object.keys(errs).length > 0) return;

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
              // Nest returns `message` as a string or an array of errors.
              const msg = Array.isArray(data?.message) ? data.message[0] : data?.message;
              setError(msg ?? t.registerFailed);
              setLoading(false);
              return;
            }
            // The backend signs the new taxpayer in, so go straight to
            // their returns.
            router.push("/spt");
            router.refresh();
          } catch {
            setError(t.errNetwork);
            setLoading(false);
          }
        }

        return (
          <>
            <h1 className="type-headline-md text-on-neutral">{t.registerWelcome}</h1>
            <p className="helper mt-sm">{t.registerSubtitle}</p>

            {error && (
              <div className="mt-lg">
                <Notice kind="error">{error}</Notice>
              </div>
            )}

            <form onSubmit={onSubmit} noValidate className="mt-lg flex flex-col gap-md">
              <Field
                id="username"
                label={t.useridLabel}
                helper={t.useridHint}
                error={show("username")}
              >
                <input
                  id="username"
                  type="text"
                  autoComplete="username"
                  inputMode="numeric"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  onBlur={() => setTouched((s) => ({ ...s, username: true }))}
                  placeholder={t.useridPlaceholder}
                  aria-invalid={Boolean(show("username"))}
                  className={`control ${show("username") ? "is-error" : ""}`}
                />
              </Field>

              <Field id="fullName" label={t.fullNameLabel} error={show("fullName")}>
                <input
                  id="fullName"
                  type="text"
                  autoComplete="name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  onBlur={() => setTouched((s) => ({ ...s, fullName: true }))}
                  placeholder={t.fullNamePlaceholder}
                  aria-invalid={Boolean(show("fullName"))}
                  className={`control ${show("fullName") ? "is-error" : ""}`}
                />
              </Field>

              <Field id="email" label={t.emailLabel} error={show("email")}>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onBlur={() => setTouched((s) => ({ ...s, email: true }))}
                  placeholder={t.emailPlaceholder}
                  aria-invalid={Boolean(show("email"))}
                  className={`control ${show("email") ? "is-error" : ""}`}
                />
              </Field>

              <Field id="npwp" label={t.npwpLabel} optional={t.npwpOptional}>
                <input
                  id="npwp"
                  type="text"
                  value={npwp}
                  onChange={(e) => setNpwp(e.target.value)}
                  placeholder={t.npwpPlaceholder}
                  className="control"
                />
              </Field>

              <Field
                id="password"
                label={t.passwordLabel}
                helper={t.passwordHint}
                error={show("password")}
              >
                <div className="relative">
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
                    aria-invalid={Boolean(show("password"))}
                    className={`control pr-2xl ${show("password") ? "is-error" : ""}`}
                  />
                  <PasswordToggleButton
                    shown={showPw}
                    onToggle={() => setShowPw((v) => !v)}
                    label={showPw ? t.hidePassword : t.showPassword}
                  />
                </div>
                {capsOn && (
                  <p className="helper flex items-center gap-xs">
                    <Alert className="h-4 w-4 shrink-0" />
                    {t.capsWarning}
                  </p>
                )}
              </Field>

              <Field id="confirm" label={t.confirmPasswordLabel} error={show("confirm")}>
                <input
                  id="confirm"
                  type={showPw ? "text" : "password"}
                  autoComplete="new-password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  onBlur={() => setTouched((s) => ({ ...s, confirm: true }))}
                  placeholder={t.confirmPasswordPlaceholder}
                  aria-invalid={Boolean(show("confirm"))}
                  className={`control ${show("confirm") ? "is-error" : ""}`}
                />
              </Field>

              <div className="flex flex-col gap-sm">
                <span className="type-label-md text-on-neutral">{t.captchaLabel}</span>
                <div
                  className={`rounded-sm border px-md py-md ${
                    captcha
                      ? "border-primary bg-tertiary"
                      : show("captcha")
                        ? "border-error"
                        : "border-border"
                  }`}
                >
                  <Choice
                    kind="checkbox"
                    label={t.captchaCheckbox}
                    checked={captcha}
                    onChange={() => {
                      setCaptcha((v) => !v);
                      setTouched((s) => ({ ...s, captcha: true }));
                    }}
                  />
                </div>
                {show("captcha") && (
                  <p className="helper helper-error">{show("captcha")}</p>
                )}
              </div>

              <Button type="submit" size="lg" disabled={loading} className="btn-block mt-sm">
                {loading ? t.registerLoading : t.registerButton}
              </Button>
            </form>

            <div className="mt-lg">
              <OrDivider label={t.separator} />
            </div>

            <div className="mt-lg">
              <MiniCard title={t.haveAccountTitle} desc={t.haveAccountDesc} href="/login" />
            </div>

            <p className="mt-lg text-center">
              <Link href="/login" className="type-body-sm text-muted hover:text-primary">
                {t.backLogin}
              </Link>
            </p>
          </>
        );
      }}
    </AuthShell>
  );
}
