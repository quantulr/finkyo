import type { ListResponse } from "../types";

async function request<T>(
  endpoint: string,
  params: Record<string, string>,
  signal?: AbortSignal,
): Promise<T> {
  const query = new URLSearchParams(params).toString();
  const response = await fetch(`/api/${endpoint}?${query}`, { signal });
  if (!response.ok) {
    let message = `请求失败（${response.status}）`;
    try {
      const body = (await response.json()) as { error?: string };
      if (body.error) message = body.error;
    } catch {
      // Keep the status message.
    }
    throw new Error(message);
  }
  return (await response.json()) as T;
}

export function listDir(
  path: string,
  signal?: AbortSignal,
): Promise<ListResponse> {
  return request<ListResponse>("list", { path }, signal);
}

export function rawUrl(path: string): string {
  return `/api/raw?${new URLSearchParams({ path })}`;
}

export function downloadUrl(path: string): string {
  return `/api/raw?${new URLSearchParams({ path, download: "true" })}`;
}

export function thumbUrl(path: string, width = 320): string {
  return `/api/thumb?${new URLSearchParams({ path, w: String(width) })}`;
}

export function absoluteUrl(path: string): string {
  return `${window.location.origin}${path}`;
}

export function openExternal(url: string): void {
  window.open(url, "_blank", "noopener,noreferrer");
}

export function downloadFile(url: string, name: string): void {
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  anchor.rel = "noopener";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
}
