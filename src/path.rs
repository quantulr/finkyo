use std::path::{Component, Path, PathBuf};

use crate::error::ApiError;
use crate::state::AppState;

/// A path is safe when every component is a plain name (or `.`): no
/// absolute paths, no `..`, no drive prefixes.
pub fn is_safe_relative(path: &str) -> bool {
    let bytes = path.as_bytes();
    // Windows drive prefixes are rejected on every platform so behavior
    // does not depend on the host OS.
    if bytes.len() >= 2 && bytes[1] == b':' && bytes[0].is_ascii_alphabetic() {
        return false;
    }
    Path::new(path)
        .components()
        .all(|component| matches!(component, Component::Normal(_) | Component::CurDir))
}

/// Whether any normal component starts with `.`, as hidden files do.
pub fn has_hidden_component(path: &str) -> bool {
    Path::new(path)
        .components()
        .any(|component| match component {
            Component::Normal(name) => name.to_string_lossy().starts_with('.'),
            _ => false,
        })
}

/// Resolves a request path under the canonicalized root, rejecting
/// traversal, hidden paths (unless enabled) and symlinks that escape the
/// root.
pub async fn resolve_under_root(state: &AppState, request_path: &str) -> Result<PathBuf, ApiError> {
    if !is_safe_relative(request_path) {
        return Err(ApiError::bad_request("invalid path"));
    }
    if !state.show_hidden && has_hidden_component(request_path) {
        return Err(ApiError::not_found("not found"));
    }

    let canonical = tokio::fs::canonicalize(state.root.join(request_path))
        .await
        .map_err(|_| ApiError::not_found("not found"))?;

    if !canonical.starts_with(&state.root) {
        return Err(ApiError::forbidden("forbidden"));
    }

    Ok(canonical)
}

/// The parent of a normalized relative path; `Some("")` is the root.
pub fn parent_path(path: &str) -> Option<String> {
    let trimmed = path.trim_matches('/');
    if trimmed.is_empty() {
        return None;
    }
    Some(match trimmed.rsplit_once('/') {
        Some((parent, _)) => parent.to_string(),
        None => String::new(),
    })
}

/// Identity of a cached thumbnail.
#[derive(Debug, Clone, Hash, PartialEq, Eq)]
pub struct ThumbKey {
    pub path: PathBuf,
    pub size: u64,
    pub modified: u64,
    pub width: u32,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn rejects_traversal_and_absolute_paths() {
        for path in [
            "..",
            "../etc",
            "a/../../b",
            "/etc/passwd",
            "C:\\Windows",
            "C:/Windows",
        ] {
            assert!(!is_safe_relative(path), "{path} should be rejected");
        }
        for path in ["", ".", "docs", "a/b", "a/./b", "中文/文件"] {
            assert!(is_safe_relative(path), "{path} should be accepted");
        }
    }

    #[test]
    fn detects_hidden_components() {
        assert!(has_hidden_component(".git/config"));
        assert!(has_hidden_component("a/.env"));
        assert!(!has_hidden_component("a/b"));
        assert!(!has_hidden_component(""));
    }

    #[test]
    fn computes_parents() {
        assert_eq!(parent_path(""), None);
        assert_eq!(parent_path("a"), Some(String::new()));
        assert_eq!(parent_path("a/b"), Some("a".to_string()));
    }
}
