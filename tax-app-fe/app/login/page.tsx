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
import { useAuthTools } from "./use-auth-tools";

export default function LoginPage() {
  const router = useRouter();
  useAuthTools(router);

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

  const uErr = Boolean(touched.u && !username.trim());
  const pErr = Boolean(touched.p && !password.trim());
  const cErr = Boolean(touched.c && !captcha);

  return (
    <AuthShell>
      {(t) => {
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
              body: JSON.stringify({
                username: username.trim(),
                password,
                captcha,
              }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
              setError(data?.message ?? t.errLoginFailed);
              setLoading(false);
              return;
            }
            router.push("/spt");
            router.refresh();
          } catch {
            setError(t.errNetwork);
            setLoading(false);
          }
        }

        return (
          <>
            <h1 className="type-headline-md text-on-neutral">{t.loginWelcome}</h1>
            <p className="helper mt-sm">{t.loginSubtitle}</p>

            {error && (
              <div className="mt-lg">
                <Notice kind="error">{error}</Notice>
              </div>
            )}

            <form onSubmit={onSubmit} noValidate className="mt-lg flex flex-col gap-md">
              <Field
                id="username"
                label={t.useridLabel}
                helper={t.useridHelper}
                error={uErr ? t.errUseridRequired : undefined}
              >
                <input
                  id="username"
                  type="text"
                  autoComplete="username"
                  inputMode="numeric"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  onBlur={() => setTouched((s) => ({ ...s, u: true }))}
                  placeholder={t.useridPlaceholder}
                  aria-invalid={uErr}
                  className={`control ${uErr ? "is-error" : ""}`}
                />
              </Field>

              <Field
                id="password"
                label={t.passwordLabel}
                error={pErr ? t.errPasswordRequired : undefined}
              >
                <div className="relative">
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
                    aria-invalid={pErr}
                    className={`control pr-2xl ${pErr ? "is-error" : ""}`}
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

              <div className="flex flex-col gap-sm">
                <span className="type-label-md text-on-neutral">{t.captchaLabel}</span>
                <div
                  className={`rounded-sm border px-md py-md ${
                    captcha
                      ? "border-primary bg-tertiary"
                      : cErr
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
                      setTouched((s) => ({ ...s, c: true }));
                    }}
                  />
                </div>
                {cErr && <p className="helper helper-error">{t.errCaptchaRequired}</p>}
              </div>

              <button
                type="button"
                className="type-body-sm self-start text-primary hover:underline"
              >
                {t.forgot}
              </button>

              <Button type="submit" size="lg" disabled={loading} className="btn-block mt-sm">
                {loading ? t.loginLoading : t.loginButton}
              </Button>
            </form>

            <div className="mt-lg">
              <OrDivider label={t.separator} />
            </div>

            <div className="mt-lg grid gap-md">
              <MiniCard title={t.newUserTitle} desc={t.newUserDesc} href="/register" />
            </div>

            <p className="mt-lg text-center">
              <Link href="/" className="type-body-sm text-muted hover:text-primary">
                {t.backHome}
              </Link>
            </p>
          </>
        );
      }}
    </AuthShell>
  );
}
