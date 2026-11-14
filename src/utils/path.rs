use std::path::{Component, Path, PathBuf};

/// 路径在根目录之外或格式非法。
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum PathError {
    Invalid,
    Forbidden,
    NotFound,
}

/// 只允许普通路径段和 `.`，拒绝绝对路径、`..` 与 Windows 盘符。
pub fn is_safe_relative(path: &str) -> bool {
    Path::new(path)
        .components()
        .all(|component| matches!(component, Component::Normal(_) | Component::CurDir))
}

/// 路径中任意一段以 `.` 开头时视为隐藏路径。
pub fn has_hidden_component(path: &str) -> bool {
    Path::new(path).components().any(|component| {
        matches!(component, Component::Normal(part) if part.to_string_lossy().starts_with('.'))
    })
}

/// 将请求路径解析为根目录下的真实路径。
///
/// `root` 必须是已经 canonicalize 的目录；符号链接会被解析，指向根目录之外的
/// 链接一律拒绝。
pub async fn resolve_under_root(root: &Path, path: &str) -> Result<PathBuf, PathError> {
    if !is_safe_relative(path) {
        return Err(PathError::Invalid);
    }

    let canonical = tokio::fs::canonicalize(root.join(path))
        .await
        .map_err(|err| match err.kind() {
            std::io::ErrorKind::NotFound => PathError::NotFound,
            std::io::ErrorKind::PermissionDenied => PathError::Forbidden,
            _ => PathError::Forbidden,
        })?;

    if !canonical.starts_with(root) {
        return Err(PathError::Forbidden);
    }

    Ok(canonical)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn accepts_relative_paths() {
        assert!(is_safe_relative(""));
        assert!(is_safe_relative("."));
        assert!(is_safe_relative("a/b/c"));
        assert!(is_safe_relative("a.b/c"));
    }

    #[test]
    fn rejects_parent_and_absolute_paths() {
        assert!(!is_safe_relative(".."));
        assert!(!is_safe_relative("../etc/passwd"));
        assert!(!is_safe_relative("a/../../b"));
        assert!(!is_safe_relative("/etc/passwd"));
    }

    #[cfg(windows)]
    #[test]
    fn rejects_windows_separators_and_drive_prefixes() {
        assert!(!is_safe_relative("a\\..\\b"));
        assert!(!is_safe_relative("C:\\Windows"));
    }

    #[test]
    fn detects_hidden_components() {
        assert!(has_hidden_component(".env"));
        assert!(has_hidden_component("a/.git/config"));
        assert!(!has_hidden_component("a/b"));
        assert!(!has_hidden_component("."));
    }
}
