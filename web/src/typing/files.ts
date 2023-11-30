export interface EntryItem {
  name: string;
  entryType: EntryType;
  size?: number;
  width?: number;
  height?: number;
  modified?: number;
}

export enum EntryType {
  File = "File",
  Directory = "Directory",
}
