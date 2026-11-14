/** 对 URL 路径的每一段做编码，保留 `/` 分隔符。 */
export const encodePath = (path: string): string =>
  path
    .split("/")
    .filter((segment) => segment.length > 0)
    .map(encodeURIComponent)
    .join("/");

export const joinPath = (base: string | undefined, name: string): string =>
  base ? `${base}/${name}` : name;

export const filesUrl = (path?: string): string =>
  path ? `/files/${encodePath(path)}` : "/files/";

export const fileLinkUrl = (path: string): string =>
  `/file_link/${encodePath(path)}`;

export const browseUrl = (path?: string): string =>
  path ? `/browse/${encodePath(path)}` : "/browse";

export const playUrl = (path: string): string => `/play/${encodePath(path)}`;
