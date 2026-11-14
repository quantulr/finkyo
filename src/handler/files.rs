use crate::response::error::ApiError;
use crate::response::files::EntryItem;
use crate::response::BaseResponse;
use crate::services::files_service;
use crate::state::AppState;
use crate::utils::path::{has_hidden_component, resolve_under_root};
use axum::body::Body;
use axum::extract::{Path, State};
use axum::http::{header, HeaderValue, Request};
use axum::response::IntoResponse;
use axum::Json;
use std::path::Path as FsPath;
use std::sync::Arc;
use tower::ServiceExt;
use tower_http::services::ServeFile;

pub async fn list_root_dir(
    State(state): State<Arc<AppState>>,
) -> Result<Json<BaseResponse<Vec<EntryItem>>>, ApiError> {
    list_directory(&state, "").await
}

pub async fn list_dir(
    State(state): State<Arc<AppState>>,
    Path(path): Path<String>,
) -> Result<Json<BaseResponse<Vec<EntryItem>>>, ApiError> {
    list_directory(&state, &path).await
}

async fn list_directory(
    state: &AppState,
    path: &str,
) -> Result<Json<BaseResponse<Vec<EntryItem>>>, ApiError> {
    if !state.show_hidden && has_hidden_component(path) {
        return Err(ApiError::not_found("path not found"));
    }

    let data = files_service::read_dir(state, path).await?;
    Ok(Json(BaseResponse {
        message: String::from("success"),
        data,
    }))
}

pub async fn file_link(
    State(state): State<Arc<AppState>>,
    Path(path): Path<String>,
    req: Request<Body>,
) -> Result<impl IntoResponse, ApiError> {
    if !state.show_hidden && has_hidden_component(&path) {
        return Err(ApiError::not_found("file not found"));
    }

    let file_path = resolve_under_root(&state.root, &path).await?;
    let metadata = tokio::fs::metadata(&file_path)
        .await
        .map_err(|err| ApiError::from_io(err, "failed to read file"))?;
    if !metadata.is_file() {
        return Err(ApiError::not_found("file not found"));
    }

    let mut response = ServeFile::new(&file_path)
        .oneshot(req)
        .await
        .map_err(|err| ApiError::internal(format!("file read failed: {err}")))?;

    if should_force_download(response.headers().get(header::CONTENT_TYPE)) {
        let filename = FsPath::new(&path)
            .file_name()
            .map(|name| name.to_string_lossy())
            .unwrap_or_else(|| "download".into());
        let value = format!(
            "attachment; filename*=UTF-8''{}",
            percent_encode(filename.as_bytes())
        );
        if let Ok(value) = HeaderValue::from_str(&value) {
            response
                .headers_mut()
                .insert(header::CONTENT_DISPOSITION, value);
        }
    }

    Ok(response)
}

/// HTML / XHTML / SVG 会在同源下执行脚本，强制下载以消除存储型 XSS。
fn should_force_download(content_type: Option<&HeaderValue>) -> bool {
    let Some(value) = content_type.and_then(|value| value.to_str().ok()) else {
        return false;
    };
    let mime = value
        .split(';')
        .next()
        .unwrap_or(value)
        .trim()
        .to_ascii_lowercase();
    matches!(
        mime.as_str(),
        "text/html" | "application/xhtml+xml" | "image/svg+xml"
    )
}

/// RFC 5987 的百分号编码，用于 `filename*=UTF-8''...`。
fn percent_encode(input: &[u8]) -> String {
    const HEX: &[u8; 16] = b"0123456789ABCDEF";
    let mut output = String::with_capacity(input.len() * 3);
    for &byte in input {
        if byte.is_ascii_alphanumeric() || matches!(byte, b'-' | b'.' | b'_' | b'~') {
            output.push(byte as char);
        } else {
            output.push('%');
            output.push(HEX[(byte >> 4) as usize] as char);
            output.push(HEX[(byte & 0x0f) as usize] as char);
        }
    }
    output
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn forces_download_for_script_capable_types() {
        assert!(should_force_download(Some(&HeaderValue::from_static(
            "text/html; charset=utf-8"
        ))));
        assert!(should_force_download(Some(&HeaderValue::from_static(
            "image/svg+xml"
        ))));
        assert!(!should_force_download(Some(&HeaderValue::from_static(
            "image/png"
        ))));
        assert!(!should_force_download(None));
    }

    #[test]
    fn percent_encodes_utf8_filenames() {
        assert_eq!(percent_encode(b"a b.png"), "a%20b.png");
        assert_eq!(
            percent_encode("照片.jpg".as_bytes()),
            "%E7%85%A7%E7%89%87.jpg"
        );
    }
}
