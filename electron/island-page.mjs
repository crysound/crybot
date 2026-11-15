import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";

export const ISLAND_SCHEME = "crybot-island";
export const ISLAND_PAGE = `${ISLAND_SCHEME}://app/island.html`;

export function installIslandPage({ session, net, directory = fileURLToPath(new URL("../dist", import.meta.url)) }) {
  session.protocol.handle(ISLAND_SCHEME, request => {
    const url = new URL(request.url);
    // The panel's scheme serves only its entry and compiled assets, never workspace files or API routes.
    if (url.host !== "app" || (url.pathname !== "/island.html" && !/^\/assets\/[A-Za-z0-9_.-]+$/.test(url.pathname))) return new Response(null, { status: 404 });
    return net.fetch(pathToFileURL(path.join(directory, url.pathname.slice(1))).href);
  });
  return session;
}
