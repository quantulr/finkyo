import type { Layout, SortKey } from "../types";

const LAYOUT_KEY = "finkyo.layout";
const SORT_KEY = "finkyo.sort";
const VOLUME_KEY = "finkyo.volume";

export function loadLayout(): Layout {
  try {
    return localStorage.getItem(LAYOUT_KEY) === "grid" ? "grid" : "list";
  } catch {
    return "list";
  }
}

export function saveLayout(layout: Layout): void {
  try {
    localStorage.setItem(LAYOUT_KEY, layout);
  } catch {
    // Storage may be unavailable in private windows.
  }
}

export function loadSort(): { key: SortKey; asc: boolean } {
  try {
    const raw = localStorage.getItem(SORT_KEY);
    if (!raw) return { key: "name", asc: true };
    const parsed = JSON.parse(raw) as { key?: string; asc?: boolean };
    const key =
      parsed.key === "size" || parsed.key === "modified" ? parsed.key : "name";
    return { key, asc: parsed.asc !== false };
  } catch {
    return { key: "name", asc: true };
  }
}

export function saveSort(key: SortKey, asc: boolean): void {
  try {
    localStorage.setItem(SORT_KEY, JSON.stringify({ key, asc }));
  } catch {
    // Ignore.
  }
}

export function loadVolume(): number {
  try {
    const raw = localStorage.getItem(VOLUME_KEY);
    if (!raw) return 1;
    const value = Number(raw);
    return Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 1;
  } catch {
    return 1;
  }
}

export function saveVolume(volume: number): void {
  try {
    localStorage.setItem(VOLUME_KEY, String(volume));
  } catch {
    // Ignore.
  }
}
