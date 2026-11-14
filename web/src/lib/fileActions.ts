import { browseUrl, fileLinkUrl, joinPath } from "@/lib/path";
import { isDirectoryEntry } from "@/lib/entries";

export type FileAction = "open" | "download" | "copyLink";

export const availableActions = (entry: FileEntryItem): FileAction[] =>
  isDirectoryEntry(entry) ? ["open"] : ["open", "download", "copyLink"];

export const runFileAction = (
  action: FileAction,
  entry: FileEntryItem,
  dirPath: string | undefined,
  navigate: (to: string) => void,
) => {
  const fullPath = joinPath(dirPath, entry.name);

  if (action === "open") {
    if (isDirectoryEntry(entry)) {
      navigate(browseUrl(fullPath));
    } else {
      window.open(fileLinkUrl(fullPath), "_blank", "noopener");
    }
  } else if (action === "download") {
    const link = document.createElement("a");
    link.href = fileLinkUrl(fullPath);
    link.download = entry.name;
    link.rel = "noopener";
    document.body.appendChild(link);
    link.click();
    link.remove();
  } else if (action === "copyLink") {
    const url = new URL(fileLinkUrl(fullPath), window.location.origin).href;
    void navigator.clipboard?.writeText(url).catch(() => {});
  }
};
