// Browser-side call to the flag-gated demo login. Same-origin through the
// Next.js proxy so the HTTP-only cookie set by the backend lands in the
// browser. Never sends a password and never reads the response body; the
// browser stores the session cookie and this code never sees it.

export class DemoLoginError extends Error {
  /** HTTP status of the failed response, or 0 for network failures. */
  readonly status: number;

  constructor(status: number) {
    super("Demo login failed.");
    this.name = "DemoLoginError";
    this.status = status;
  }
}

export async function postDemoLogin(fetchImpl?: typeof fetch): Promise<void> {
  const doFetch: typeof fetch = fetchImpl ?? ((input, init) => fetch(input, init));
  let res: Response;
  try {
    res = await doFetch("/api/be/auth/demo-login", {
      method: "POST",
      credentials: "same-origin",
    });
  } catch {
    throw new DemoLoginError(0);
  }
  if (!res.ok) throw new DemoLoginError(res.status);
}
