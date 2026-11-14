use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::{Arc, Mutex};

use tokio::sync::Semaphore;

use crate::path::ThumbKey;

pub struct AppState {
    /// Canonicalized root directory.
    pub root: PathBuf,
    pub show_hidden: bool,
    /// Limits concurrent thumbnail decoding.
    pub thumb_permits: Semaphore,
    pub thumb_cache: Mutex<HashMap<ThumbKey, Arc<Thumbnail>>>,
}

pub struct Thumbnail {
    pub mime: &'static str,
    pub data: Vec<u8>,
}

impl AppState {
    pub fn new(root: PathBuf, show_hidden: bool) -> Self {
        Self {
            root,
            show_hidden,
            thumb_permits: Semaphore::new(4),
            thumb_cache: Mutex::new(HashMap::new()),
        }
    }
}
