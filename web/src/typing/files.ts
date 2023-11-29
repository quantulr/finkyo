export interface EntryItem {
  name: string;
  entryType: EntryType;
  size?: number;
}

export enum EntryType {
  File = "File",
  Directory = "Directory",
}
