import { redirect, notFound } from "next/navigation";
import { AppHeader } from "../../_components/app-header";
import { getMe, beGet } from "../../_lib/session";
import type { SptReturn } from "../../_lib/spt";
import { SptForm } from "./form";

export default async function SptDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const me = await getMe();
  if (!me) redirect("/login");

  const spt = await beGet<SptReturn>(`/spt/${id}`);
  if (!spt) notFound();

  return (
    <div className="flex min-h-[calc(100vh-var(--disclaimer-h))] flex-col bg-neutral">
      <AppHeader me={me} active={me.role === "admin" ? "admin" : "spt"} />
      <SptForm me={me} initial={spt} />
    </div>
  );
}
