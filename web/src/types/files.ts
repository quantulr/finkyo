declare enum EntryType {
  File = "File",
  Directory = "Directory",
}

declare interface FileEntryItem {
  name: string;
  entryType: EntryType.File;
  width?: number;
  height?: number;
}
