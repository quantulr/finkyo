use axum::http::StatusCode;
use mime_guess::mime;
#[cfg(target_os = "macos")]
use std::os::unix::fs::MetadataExt;
#[cfg(target_os = "windows")]
use std::os::windows::fs::{FileTypeExt, MetadataExt};
use std::path::Path;
use std::time::{Duration, SystemTime, SystemTimeError};
use tokio::fs::DirEntry;

use crate::response::files::{EntryItem, EntryMetadata, EntryType};
use crate::utils::image::{get_image_size, ImageDimensions};

pub async fn read_dir(base: &str, path: &str) -> Result<Vec<EntryItem>, (StatusCode, String)> {
    let path = Path::new(base).join(Path::new(path));

    let mut entrys: Vec<EntryItem> = vec![];
    match tokio::fs::read_dir(&path).await {
        Ok(mut read_dir) => {
            while let Ok(Some(entry)) = read_dir.next_entry().await {
                let entry_meta = match get_entry_metadata(&entry).await {
                    Ok(Some(meta)) => meta,
                    _ => {
                        return Err((StatusCode::INTERNAL_SERVER_ERROR, String::from("error")));
                    }
                };

                let name = entry.file_name().into_string().unwrap();

                // get width and height of image file
                let mut image_size_opt: Option<ImageDimensions> = None;
                if let Some(mime) = mime_guess::from_path(Path::new(&name)).first() {
                    if mime.type_().eq(&mime::IMAGE) {
                        let image_path = path.join(&name);
                        image_size_opt = match get_image_size(&image_path) {
                            Ok(size) => Some(size),
                            Err(_) => None,
                        };
                    }
                };
                let (width, height) = match image_size_opt {
                    Some(size) => (Some(size.width), Some(size.height)),
                    None => (None, None),
                };

                let entry_item = EntryItem {
                    name: entry.file_name().into_string().unwrap(),
                    entry_type: entry_meta.entry_type,
                    size: entry_meta.size,
                    modified: entry_meta.modified,
                    width,
                    height,
                };
                entrys.push(entry_item)
            }
            Ok(entrys)
        }
        Err(_) => {
            return Err((
                StatusCode::INTERNAL_SERVER_ERROR,
                String::from("unknown entry type"),
            ));
        }
    }
}

#[cfg(target_os = "windows")]
pub async fn get_entry_metadata(entry: &DirEntry) -> Result<Option<EntryMetadata>, ()> {
    match entry.metadata().await {
        Ok(meta) => {
            let f_type = meta.file_type();
            let entry_type = if f_type.is_dir() {
                EntryType::Directory
            } else if f_type.is_file() {
                EntryType::File
            } else if f_type.is_symlink() {
                EntryType::Symlink
            } else if f_type.is_symlink_dir() {
                EntryType::SymlinkDir
            } else if f_type.is_symlink_file() {
                EntryType::SymlinkFile
            } else {
                return Err(());
            };
            let size = if f_type.is_file() {
                Some(meta.file_size())
            } else {
                None
            };
            let modified = match meta.modified() {
                Ok(system_time) => {
                    match system_time.duration_since(SystemTime::UNIX_EPOCH) {
                        Ok(time) => { Some(time.as_millis()) }
                        Err(_) => {
                            None
                        }
                    }
                }
                Err(_) => { None }
            };
            let entry_metadata = EntryMetadata { entry_type, size, modified };
            Ok(Some(entry_metadata))
        }
        Err(_) => Err(()),
    }
}

#[cfg(target_os = "macos")]
pub async fn get_entry_metadata(entry: &DirEntry) -> Result<Option<EntryMetadata>, ()> {
    match entry.metadata().await {
        Ok(meta) => {
            let f_type = meta.file_type();
            let entry_type = if f_type.is_dir() {
                EntryType::Directory
            } else if f_type.is_file() {
                EntryType::File
            } else if f_type.is_symlink() {
                EntryType::Symlink
            } else {
                return Err(());
            };
            let size = if f_type.is_file() {
                Some(meta.size())
            } else {
                None
            };

            let modified = match meta.modified() {
                Ok(modified) => match modified.duration_since(SystemTime::UNIX_EPOCH) {
                    Ok(time) => Some(time.as_millis()),
                    Err(_) => None,
                },
                Err(_) => None,
            };
            let entry_metadata = EntryMetadata {
                entry_type,
                size,
                modified,
            };
            Ok(Some(entry_metadata))
        }
        Err(_) => Err(()),
    }
}
