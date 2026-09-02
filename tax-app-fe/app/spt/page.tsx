import { redirect } from "next/navigation";
import { AppHeader } from "../_components/app-header";
import { getMe, beGet } from "../_lib/session";
import type { SptReturn } from "../_lib/spt";
import { SptDashboard } from "./dashboard";

export default async function SptPage() {
  const me = await getMe();
  if (!me) redirect("/login");
  if (me.role === "admin") redirect("/admin");

  const returns = (await beGet<SptReturn[]>("/spt")) ?? [];

  return (
    <div className="flex min-h-screen flex-col bg-[var(--background)]">
      <AppHeader me={me} active="spt" />
      <SptDashboard me={me} initialReturns={returns} />
    </div>
  );
}
