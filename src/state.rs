use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::sync::Mutex;

const IMAGE_SIZE_CACHE_LIMIT: usize = 4096;

#[derive(Clone, Copy)]
struct ImageSizeCacheEntry {
    size: u64,
    modified: Option<u64>,
    dimensions: Option<(u32, u32)>,
}

pub struct AppState {
    pub root: PathBuf,
    pub show_hidden: bool,
    image_size_cache: Mutex<HashMap<PathBuf, ImageSizeCacheEntry>>,
}

impl AppState {
    pub fn new(root: PathBuf, show_hidden: bool) -> Self {
        Self {
            root,
            show_hidden,
            image_size_cache: Mutex::new(HashMap::new()),
        }
    }

    /// 返回 `None` 表示缓存未命中；`Some(None)` 表示该图片没有可读取的尺寸。
    pub fn cached_image_size(
        &self,
        path: &Path,
        size: u64,
        modified: Option<u64>,
    ) -> Option<Option<(u32, u32)>> {
        let cache = self.image_size_cache.lock().ok()?;
        let entry = cache.get(path)?;
        (entry.size == size && entry.modified == modified).then_some(entry.dimensions)
    }

    pub fn cache_image_size(
        &self,
        path: PathBuf,
        size: u64,
        modified: Option<u64>,
        dimensions: Option<(u32, u32)>,
    ) {
        let Ok(mut cache) = self.image_size_cache.lock() else {
            return;
        };
        if cache.len() >= IMAGE_SIZE_CACHE_LIMIT {
            cache.clear();
        }
        cache.insert(
            path,
            ImageSizeCacheEntry {
                size,
                modified,
                dimensions,
            },
        );
    }
}
