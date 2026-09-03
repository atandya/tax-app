import { redirect } from "next/navigation";
import { AppHeader } from "../_components/app-header";
import { getMe, beGet } from "../_lib/session";
import type { SptReturn } from "../_lib/spt";
import { AdminDashboard } from "./dashboard";

export default async function AdminPage() {
  const me = await getMe();
  if (!me) redirect("/login");
  if (me.role !== "admin") redirect("/spt");

  const returns = (await beGet<SptReturn[]>("/spt/admin/all")) ?? [];

  return (
    <div className="flex min-h-[calc(100vh-var(--disclaimer-h))] flex-col bg-neutral">
      <AppHeader me={me} active="admin" />
      <AdminDashboard initialReturns={returns} />
    </div>
  );
}
