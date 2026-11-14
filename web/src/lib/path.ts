/** 对 URL 路径的每一段做编码，保留 `/` 分隔符。 */
export const encodePath = (path: string): string =>
  path
    .split("/")
    .filter((segment) => segment.length > 0)
    .map(encodeURIComponent)
    .join("/");

/**
 * 解码 router 提供的路径参数。
 *
 * `@solidjs/router` 的 `useParams` 返回的是 URL 中的原始编码路径，
 * 在拼接 API 地址或显示前需要先解码。
 */
export const decodePath = (path: string): string =>
  path
    .split("/")
    .map((segment) => {
      try {
        return decodeURIComponent(segment);
      } catch {
        return segment;
      }
    })
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
