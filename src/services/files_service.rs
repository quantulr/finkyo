use crate::response::error::ApiError;
use crate::response::files::{EntryItem, EntryMetadata, EntryType};
use crate::state::AppState;
use crate::utils::path::resolve_under_root;
use mime_guess::mime;
use std::time::SystemTime;
use tokio::fs::DirEntry;
use tokio::task::JoinSet;

/// 同时处理的图片数量上限，避免大目录一次性打开过多文件。
const IMAGE_SIZE_CONCURRENCY: usize = 8;

pub async fn read_dir(state: &AppState, path: &str) -> Result<Vec<EntryItem>, ApiError> {
    let dir_path = resolve_under_root(&state.root, path).await?;
    let metadata = tokio::fs::metadata(&dir_path)
        .await
        .map_err(|err| ApiError::from_io(err, "failed to read directory"))?;
    if !metadata.is_dir() {
        return Err(ApiError::bad_request("path is not a directory"));
    }

    let mut read_dir = tokio::fs::read_dir(&dir_path)
        .await
        .map_err(|err| ApiError::from_io(err, "failed to read directory"))?;

    let mut items: Vec<EntryItem> = Vec::new();
    // (条目下标, 文件路径, 文件大小, 修改时间)
    let mut image_jobs: Vec<(usize, std::path::PathBuf, u64, Option<u64>)> = Vec::new();

    while let Some(entry) = read_dir
        .next_entry()
        .await
        .map_err(|err| ApiError::from_io(err, "failed to read directory entry"))?
    {
        let name = entry.file_name().to_string_lossy().into_owned();
        if !state.show_hidden && name.starts_with('.') {
            continue;
        }

        let entry_meta = match get_entry_metadata(&entry).await {
            Ok(meta) => meta,
            Err(err) => {
                tracing::warn!(%name, %err, "skipping entry with unreadable metadata");
                continue;
            }
        };

        let mut width = None;
        let mut height = None;
        if is_image_name(&name) {
            let file_path = dir_path.join(&name);
            let size = entry_meta.size.unwrap_or(0);
            if let Some(dimensions) = state.cached_image_size(&file_path, size, entry_meta.modified)
            {
                if let Some((w, h)) = dimensions {
                    width = Some(w);
                    height = Some(h);
                }
            } else {
                image_jobs.push((items.len(), file_path, size, entry_meta.modified));
            }
        }

        items.push(EntryItem {
            name,
            entry_type: entry_meta.entry_type,
            size: entry_meta.size,
            width,
            height,
            modified: entry_meta.modified,
        });
    }

    fill_image_dimensions(state, &mut items, image_jobs).await;

    items.sort_by(|a, b| {
        let a_dir = is_directory(&a.entry_type);
        let b_dir = is_directory(&b.entry_type);
        b_dir
            .cmp(&a_dir)
            .then_with(|| a.name.to_lowercase().cmp(&b.name.to_lowercase()))
            .then_with(|| a.name.cmp(&b.name))
    });

    Ok(items)
}

async fn fill_image_dimensions(
    state: &AppState,
    items: &mut [EntryItem],
    jobs: Vec<(usize, std::path::PathBuf, u64, Option<u64>)>,
) {
    let mut jobs = jobs.into_iter();
    let mut tasks = JoinSet::new();
    let mut in_flight = 0usize;

    loop {
        while in_flight < IMAGE_SIZE_CONCURRENCY {
            let Some((index, path, size, modified)) = jobs.next() else {
                break;
            };
            tasks.spawn_blocking(move || {
                let dimensions = image::image_dimensions(&path).ok();
                (index, path, size, modified, dimensions)
            });
            in_flight += 1;
        }

        if in_flight == 0 {
            break;
        }

        match tasks.join_next().await {
            Some(Ok((index, path, size, modified, dimensions))) => {
                in_flight -= 1;
                if let Some((width, height)) = dimensions {
                    if let Some(item) = items.get_mut(index) {
                        item.width = Some(width);
                        item.height = Some(height);
                    }
                }
                state.cache_image_size(path, size, modified, dimensions);
            }
            Some(Err(err)) => {
                in_flight -= 1;
                tracing::warn!(%err, "image dimension task failed");
            }
            None => break,
        }
    }
}

fn is_image_name(name: &str) -> bool {
    mime_guess::from_path(name)
        .first()
        .is_some_and(|mime| mime.type_() == mime::IMAGE)
}

fn is_directory(entry_type: &EntryType) -> bool {
    matches!(entry_type, EntryType::Directory | EntryType::SymlinkDir)
}

pub async fn get_entry_metadata(entry: &DirEntry) -> std::io::Result<EntryMetadata> {
    let metadata = entry.metadata().await?;
    let file_type = metadata.file_type();
    let entry_type = classify(file_type).ok_or_else(|| {
        std::io::Error::new(std::io::ErrorKind::InvalidData, "unsupported file type")
    })?;

    let size = matches!(entry_type, EntryType::File).then_some(metadata.len());
    let modified = metadata
        .modified()
        .ok()
        .and_then(|time| time.duration_since(SystemTime::UNIX_EPOCH).ok())
        .map(|duration| duration.as_millis() as u64);

    Ok(EntryMetadata {
        entry_type,
        size,
        modified,
    })
}

#[cfg(target_os = "windows")]
fn classify(file_type: std::fs::FileType) -> Option<EntryType> {
    use std::os::windows::fs::FileTypeExt;

    if file_type.is_symlink_dir() {
        Some(EntryType::SymlinkDir)
    } else if file_type.is_symlink_file() {
        Some(EntryType::SymlinkFile)
    } else if file_type.is_dir() {
        Some(EntryType::Directory)
    } else if file_type.is_file() {
        Some(EntryType::File)
    } else if file_type.is_symlink() {
        Some(EntryType::Symlink)
    } else {
        None
    }
}

#[cfg(not(target_os = "windows"))]
fn classify(file_type: std::fs::FileType) -> Option<EntryType> {
    if file_type.is_symlink() {
        Some(EntryType::Symlink)
    } else if file_type.is_dir() {
        Some(EntryType::Directory)
    } else if file_type.is_file() {
        Some(EntryType::File)
    } else {
        None
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn detects_image_names() {
        assert!(is_image_name("photo.jpg"));
        assert!(is_image_name("photo.PNG"));
        assert!(!is_image_name("video.mp4"));
        assert!(!is_image_name("README.md"));
    }

    #[test]
    fn treats_symlink_directories_as_directories() {
        assert!(is_directory(&EntryType::Directory));
        assert!(is_directory(&EntryType::SymlinkDir));
        assert!(!is_directory(&EntryType::File));
        assert!(!is_directory(&EntryType::Symlink));
    }
}
