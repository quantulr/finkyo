export const isDirectoryEntry = (entry?: FileEntryItem): boolean =>
  entry?.entryType === "Directory" || entry?.entryType === "SymlinkDir";
