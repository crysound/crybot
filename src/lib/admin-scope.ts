const refused = new Set<string>();

export function lacksAdminScope(cause: unknown): boolean {
  const error = Object(cause) as { status?: unknown; message?: unknown; body?: { code?: unknown } };
  return error.status === 403 && (error.body?.code === "admin_only" || (typeof error.message === "string" && error.message.includes("lacks the admin scope")));
}

/** Asks for `route` until the server says this session lacks the admin scope; from then on answers `refusedAnswer`
 * without asking again. */
export async function unlessRefused<T>(route: string, request: () => Promise<T>, refusedAnswer: T): Promise<T> {
  if (refused.has(route)) return refusedAnswer;
  try {
    return await request();
  } catch (cause) {
    if (!lacksAdminScope(cause)) throw cause;
    refused.add(route);
    return refusedAnswer;
  }
}
