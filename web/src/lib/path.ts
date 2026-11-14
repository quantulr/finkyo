import type { Entry, Route } from "../types";

const imageExtensions = new Set([
  "jpg",
  "jpeg",
  "png",
  "gif",
  "webp",
  "bmp",
  "avif",
  "tif",
  "tiff",
]);

const videoExtensions = new Set([
  "mp4",
  "m4v",
  "mov",
  "webm",
  "mkv",
  "avi",
  "ogv",
  "ts",
  "m3u8",
]);

const audioExtensions = new Set([
  "mp3",
  "m4a",
  "aac",
  "flac",
  "ogg",
  "oga",
  "opus",
  "wav",
  "wma",
]);

const textExtensions = new Set([
  "txt",
  "md",
  "json",
  "toml",
  "yaml",
  "yml",
  "rs",
  "go",
  "js",
  "ts",
  "tsx",
  "jsx",
  "css",
  "html",
  "xml",
  "csv",
  "log",
  "ini",
  "conf",
  "sh",
  "py",
]);

const archiveExtensions = new Set([
  "zip",
  "tar",
  "gz",
  "tgz",
  "bz2",
  "xz",
  "7z",
  "rar",
  "zst",
]);

export function isDirEntry(entry: Entry): boolean {
  return entry.type === "directory" || entry.type === "symlinkDir";
}

export function extensionOf(name: string): string {
  const index = name.lastIndexOf(".");
  return index > 0 ? name.slice(index + 1).toLowerCase() : "";
}

export function isImageName(name: string): boolean {
  return imageExtensions.has(extensionOf(name));
}

export function isVideoName(name: string): boolean {
  return videoExtensions.has(extensionOf(name));
}

export function isAudioName(name: string): boolean {
  return audioExtensions.has(extensionOf(name));
}

export function isTextName(name: string): boolean {
  return textExtensions.has(extensionOf(name));
}

export function isArchiveName(name: string): boolean {
  return archiveExtensions.has(extensionOf(name));
}

export function mediaKindOf(name: string): "video" | "audio" | "" {
  if (isVideoName(name)) return "video";
  if (isAudioName(name)) return "audio";
  return "";
}

export function encodePath(path: string): string {
  return path
    .split("/")
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}

function decodePath(rest: string): string {
  return rest
    .split("/")
    .filter(Boolean)
    .map((segment) => {
      try {
        return decodeURIComponent(segment);
      } catch {
        return segment;
      }
    })
    .join("/");
}

export function browseHash(path: string): string {
  const encoded = encodePath(path);
  return encoded ? `#/browse/${encoded}` : "#/";
}

export function viewHash(path: string): string {
  return `#/view/${encodePath(path)}`;
}

export function playHash(path: string): string {
  return `#/play/${encodePath(path)}`;
}

export function parseHash(hash: string): Route {
  const raw = hash.startsWith("#") ? hash.slice(1) : hash;
  if (!raw || raw === "/") return { kind: "browse", path: "" };
  if (raw.startsWith("/browse/")) {
    return { kind: "browse", path: decodePath(raw.slice("/browse/".length)) };
  }
  if (raw.startsWith("/view/")) {
    return { kind: "view", path: decodePath(raw.slice("/view/".length)) };
  }
  if (raw.startsWith("/play/")) {
    return { kind: "play", path: decodePath(raw.slice("/play/".length)) };
  }
  return { kind: "browse", path: "" };
}

export function directoryFor(route: Route): string {
  return route.kind === "browse" ? route.path : parentPath(route.path);
}

export function joinPath(directory: string, name: string): string {
  return directory ? `${directory}/${name}` : name;
}

export function parentPath(path: string): string {
  const trimmed = path.replace(/^\/+|\/+$/g, "");
  if (!trimmed) return "";
  const index = trimmed.lastIndexOf("/");
  return index < 0 ? "" : trimmed.slice(0, index);
}

export function baseName(path: string): string {
  const trimmed = path.replace(/^\/+|\/+$/g, "");
  if (!trimmed) return "根目录";
  return trimmed.slice(trimmed.lastIndexOf("/") + 1);
}
