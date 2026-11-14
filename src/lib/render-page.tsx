import type { ReactNode } from "react";
import type { Root } from "react-dom/client";

export async function renderPage(root: Root, prepare: () => Promise<ReactNode>): Promise<void> {
  try {
    root.render(await prepare());
  } catch {
    root.render(
      <div role="alert" className="flex min-h-screen items-center justify-center p-6 text-center">
        <div className="max-w-md space-y-3">
          <h1 className="text-lg font-semibold">Couldn't load this page</h1>
          <p className="text-sm opacity-75">Check your connection and try again.</p>
          <button type="button" className="rounded-md border px-3 py-1.5 text-sm" onClick={() => location.reload()}>
            Retry
          </button>
        </div>
      </div>,
    );
  }
}
