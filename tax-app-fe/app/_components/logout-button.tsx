"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useLang } from "./lang";
import { Button } from "./ui";

export function LogoutButton() {
  const router = useRouter();
  const { t } = useLang();
  const [loading, setLoading] = useState(false);

  async function logout() {
    setLoading(true);
    await fetch("/api/be/auth/logout", {
      method: "POST",
      credentials: "same-origin",
    }).catch(() => {});
    router.push("/login");
    router.refresh();
  }

  return (
    <Button variant="secondary" size="sm" onClick={logout} disabled={loading}>
      {loading ? t.signingOut : t.signOut}
    </Button>
  );
}
