const WINDOWS_PATH = /^[a-zA-Z]:[\\/]/;

const absolutePath = (value: string): string | null => {
  if (value.startsWith("/") || WINDOWS_PATH.test(value)) return value;
  return null;
};

export function localFilePath(href?: string): string | null {
  if (!href) return null;
  if (/^file:\/\//i.test(href)) {
    try {
      const url = new URL(href);
      if (url.username || url.password || url.port || url.search || url.hash) return null;
      const path = decodeURIComponent(url.pathname);
      if (url.hostname && url.hostname !== "localhost") return `//${url.hostname}${path}`;
      return /^\/[a-z]:[\\/]/i.test(path) ? path.slice(1) : absolutePath(path);
    } catch {
      return null;
    }
  }
  if (href.startsWith("\\\\")) return href;
  if (href.startsWith("//")) return null;
  const absolute = absolutePath(href);
  if (absolute) return absolute;
  if (href.startsWith("#") || /^[a-z][a-z\d+.-]*:/i.test(href)) return null;
  return href;
}
