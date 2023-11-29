use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, PartialEq)]
pub enum EntryType {
    Directory,
    File,
    Symlink,
    SymlinkDir,
    SymlinkFile,
}

#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EntryItem {
    pub name: String,
    pub entry_type: EntryType,
    pub size: Option<u64>,
    pub width: Option<u32>,
    pub height: Option<u32>,
}

#[derive(Serialize, Deserialize)]
pub struct EntryMetadata {
    pub entry_type: EntryType,
    pub size: Option<u64>,
}
