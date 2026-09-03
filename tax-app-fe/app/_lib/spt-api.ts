// Browser-side SPT persistence with an explicit next state.
// Same-origin call through the Next.js `/api/be` proxy so the HTTP-only
// session cookie is sent automatically; the backend enforces ownership and
// editability and returns the canonical, recomputed return.

import type { SptData, SptReturn } from "./spt";

/** Stable user-facing message when the backend gives no usable reason. */
export const SPT_SAVE_FAILED_MESSAGE = "Gagal menyimpan.";

export class SptSaveError extends Error {
  /** HTTP status of the failed response, or 0 for network/parse failures. */
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "SptSaveError";
    this.status = status;
  }
}

/**
 * PUT the complete `data` object for one return and resolve with the
 * backend's canonical response. Rejects with `SptSaveError` for any
 * non-2xx status, network failure, or unparseable success body.
 */
export async function putSptData(
  returnId: string,
  data: SptData,
  fetchImpl?: typeof fetch,
): Promise<SptReturn> {
  const doFetch: typeof fetch = fetchImpl ?? ((input, init) => fetch(input, init));

  let res: Response;
  try {
    res = await doFetch(`/api/be/spt/${returnId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ data }),
    });
  } catch {
    throw new SptSaveError(SPT_SAVE_FAILED_MESSAGE, 0);
  }

  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { message?: unknown } | null;
    const message =
      typeof body?.message === "string" && body.message.trim()
        ? body.message
        : SPT_SAVE_FAILED_MESSAGE;
    throw new SptSaveError(message, res.status);
  }

  try {
    return (await res.json()) as SptReturn;
  } catch {
    throw new SptSaveError(SPT_SAVE_FAILED_MESSAGE, res.status);
  }
}
