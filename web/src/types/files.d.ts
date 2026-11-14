type EntryType =
  | "File"
  | "Directory"
  | "Symlink"
  | "SymlinkDir"
  | "SymlinkFile";

interface FileEntryItem {
  name: string;
  entryType: EntryType;
  width?: number;
  height?: number;
  size?: number;
  modified?: number;
}
