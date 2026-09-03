// @vitest-environment jsdom
import { cleanup, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { SptReturn } from "../_lib/spt";
import type { ModelContext, WebMcpTool } from "../_lib/webmcp";
import { useDashboardTools } from "./use-dashboard-tools";

function installModelContext() {
  const tools: WebMcpTool[] = [];
  const modelContext = {
    registerTool: vi.fn(async (tool: WebMcpTool) => {
      tools.push(tool);
    }),
  } as unknown as ModelContext;
  Object.defineProperty(document, "modelContext", { configurable: true, value: modelContext });
  return { tools };
}

afterEach(() => {
  cleanup();
  Reflect.deleteProperty(document, "modelContext");
});

const ROW = {
  id: "00000000-0000-4000-8000-000000000001",
  tax_year: 2025,
  form_type: "1770 S",
  status: "DRAFT",
  data: {},
} as unknown as SptReturn;

describe("useDashboardTools", () => {
  it("registers the three dashboard tools and wires them to the page", async () => {
    const { tools } = installModelContext();
    const router = { push: vi.fn(), refresh: vi.fn() };
    const createDraftForAgent = vi.fn(async () => ({ ...ROW, id: "created", tax_year: 2023 }) as SptReturn);
    renderHook(() => useDashboardTools({ router, returns: [ROW], createDraftForAgent }));
    await vi.waitFor(() => expect(tools.map((t) => t.name)).toEqual(["list_tax_returns", "open_tax_return", "create_tax_return"]));

    const opts = { signal: new AbortController().signal };
    const listed = (await tools[0].execute({}, opts)) as { returns: Array<{ returnId: string }> };
    expect(listed.returns.map((r) => r.returnId)).toEqual([ROW.id]);

    await tools[1].execute({ returnId: ROW.id }, opts);
    expect(router.push).toHaveBeenCalledWith(`/spt/${ROW.id}`);
    expect(router.refresh).toHaveBeenCalledTimes(1);

    await tools[2].execute({ taxYear: 2023 }, opts);
    expect(createDraftForAgent).toHaveBeenCalledWith(2023);
    expect(router.push).toHaveBeenLastCalledWith("/spt/created");
    expect(router.refresh).toHaveBeenCalledTimes(2);
  });

  it("reads the latest returns after a rerender", async () => {
    const { tools } = installModelContext();
    const router = { push: vi.fn(), refresh: vi.fn() };
    const createDraftForAgent = vi.fn(async () => ROW);
    const { rerender } = renderHook(
      ({ returns }: { returns: SptReturn[] }) => useDashboardTools({ router, returns, createDraftForAgent }),
      { initialProps: { returns: [] as SptReturn[] } },
    );
    await vi.waitFor(() => expect(tools).toHaveLength(3));
    rerender({ returns: [ROW] });
    expect(tools).toHaveLength(3);
    const listed = (await tools[0].execute({}, { signal: new AbortController().signal })) as { returns: unknown[] };
    expect(listed.returns).toHaveLength(1);
  });
});
