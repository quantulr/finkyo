use std::io::Cursor;
use std::sync::Arc;
use std::time::UNIX_EPOCH;

use axum::Json;
use axum::body::Body;
use axum::extract::{Query, Request, State};
use axum::http::{HeaderValue, Response, StatusCode, header};
use serde::{Deserialize, Serialize};
use tower::ServiceExt;
use tower_http::services::ServeFile;

use crate::error::ApiError;
use crate::path::{ThumbKey, parent_path, resolve_under_root};
use crate::state::{AppState, Thumbnail};

#[derive(Deserialize)]
pub struct PathQuery {
    #[serde(default)]
    pub path: String,
}

#[derive(Deserialize)]
pub struct RawQuery {
    #[serde(default)]
    pub path: String,
    #[serde(default)]
    pub download: bool,
}

#[derive(Deserialize)]
pub struct ThumbQuery {
    #[serde(default)]
    pub path: String,
    #[serde(default = "default_thumb_width")]
    pub w: u32,
}

fn default_thumb_width() -> u32 {
    320
}

#[derive(Serialize)]
pub struct ListResponse {
    pub path: String,
    pub parent: Option<String>,
    pub entries: Vec<Entry>,
}

#[derive(Serialize)]
pub struct Entry {
    pub name: String,
    #[serde(rename = "type")]
    pub kind: &'static str,
    pub size: u64,
    pub modified: u64,
}

impl Entry {
    fn new(name: String, kind: &'static str, size: u64, modified: u64) -> Self {
        Self {
            name,
            kind,
            size,
            modified,
        }
    }
}

fn modified_millis(metadata: &std::fs::Metadata) -> u64 {
    metadata
        .modified()
        .ok()
        .and_then(|time| time.duration_since(UNIX_EPOCH).ok())
        .map(|duration| duration.as_millis() as u64)
        .unwrap_or(0)
}

pub async fn list(
    State(state): State<Arc<AppState>>,
    Query(query): Query<PathQuery>,
) -> Result<Json<ListResponse>, ApiError> {
    let dir = resolve_under_root(&state, &query.path).await?;
    let metadata = tokio::fs::metadata(&dir)
        .await
        .map_err(|_| ApiError::not_found("not found"))?;
    if !metadata.is_dir() {
        return Err(ApiError::bad_request("not a directory"));
    }

    let mut read_dir = tokio::fs::read_dir(&dir)
        .await
        .map_err(|err| ApiError::internal(err.to_string()))?;

    let mut entries = Vec::new();
    while let Some(entry) = read_dir
        .next_entry()
        .await
        .map_err(|err| ApiError::internal(err.to_string()))?
    {
        let name = entry.file_name().to_string_lossy().to_string();
        if !state.show_hidden && name.starts_with('.') {
            continue;
        }

        let file_type = match entry.file_type().await {
            Ok(file_type) => file_type,
            Err(_) => continue,
        };

        let (kind, target) = if file_type.is_symlink() {
            match tokio::fs::metadata(entry.path()).await {
                Ok(metadata) if metadata.is_dir() => ("symlinkDir", Some(metadata)),
                Ok(metadata) if metadata.is_file() => ("symlinkFile", Some(metadata)),
                _ => ("symlink", None),
            }
        } else if file_type.is_dir() {
            ("directory", None)
        } else if file_type.is_file() {
            ("file", None)
        } else {
            continue;
        };

        let metadata = match target {
            Some(metadata) => Some(metadata),
            None => entry.metadata().await.ok(),
        };
        let (size, modified) = match metadata {
            Some(metadata) => (
                if metadata.is_file() {
                    metadata.len()
                } else {
                    0
                },
                modified_millis(&metadata),
            ),
            None => (0, 0),
        };

        entries.push(Entry::new(name, kind, size, modified));
    }

    Ok(Json(ListResponse {
        path: query.path.trim_matches('/').to_string(),
        parent: parent_path(&query.path),
        entries,
    }))
}

pub async fn raw(
    State(state): State<Arc<AppState>>,
    Query(query): Query<RawQuery>,
    request: Request,
) -> Result<Response<Body>, ApiError> {
    let file = resolve_under_root(&state, &query.path).await?;
    let metadata = tokio::fs::metadata(&file)
        .await
        .map_err(|_| ApiError::not_found("not found"))?;
    if !metadata.is_file() {
        return Err(ApiError::bad_request("not a file"));
    }

    let mime = mime_guess::from_path(&file).first_or_octet_stream();
    let attachment = query.download || is_dangerous(mime.essence_str());

    let mut response = match ServeFile::new(&file).oneshot(request).await {
        Ok(response) => response.map(Body::new),
        Err(never) => match never {},
    };

    if attachment {
        let name = file
            .file_name()
            .map(|name| name.to_string_lossy().to_string())
            .unwrap_or_default();
        if let Ok(value) = HeaderValue::from_str(&content_disposition(&name)) {
            response
                .headers_mut()
                .insert(header::CONTENT_DISPOSITION, value);
        }
    }

    Ok(response)
}

pub async fn thumb(
    State(state): State<Arc<AppState>>,
    Query(query): Query<ThumbQuery>,
) -> Result<Response<Body>, ApiError> {
    let file = resolve_under_root(&state, &query.path).await?;
    let metadata = tokio::fs::metadata(&file)
        .await
        .map_err(|_| ApiError::not_found("not found"))?;
    if !metadata.is_file() {
        return Err(ApiError::bad_request("not a file"));
    }
    if !is_image_path(&file) {
        return Err(ApiError::bad_request("not an image"));
    }

    let width = query.w.clamp(64, 1024);
    let key = ThumbKey {
        path: file.clone(),
        size: metadata.len(),
        modified: modified_millis(&metadata),
        width,
    };

    if let Some(cached) = state.thumb_cache.lock().unwrap().get(&key).map(Arc::clone) {
        return Ok(thumbnail_response(cached));
    }

    let permit = state
        .thumb_permits
        .acquire()
        .await
        .map_err(|_| ApiError::internal("thumbnail service closed"))?;
    let data = tokio::fs::read(&file)
        .await
        .map_err(|err| ApiError::internal(err.to_string()))?;
    let thumbnail = tokio::task::spawn_blocking(move || render_thumbnail(&data, width))
        .await
        .map_err(|err| ApiError::internal(err.to_string()))??;
    drop(permit);

    let thumbnail = Arc::new(thumbnail);
    let mut cache = state.thumb_cache.lock().unwrap();
    if cache.len() >= 512 {
        cache.clear();
    }
    cache.insert(key, Arc::clone(&thumbnail));

    Ok(thumbnail_response(thumbnail))
}

fn render_thumbnail(data: &[u8], width: u32) -> Result<Thumbnail, ApiError> {
    let image = image::load_from_memory(data)
        .map_err(|err| ApiError::bad_request(format!("cannot decode image: {err}")))?;
    let alpha = image.color().has_alpha();
    let thumbnail = image.thumbnail(width, width);

    let mut buffer = Vec::new();
    if alpha {
        thumbnail
            .write_to(&mut Cursor::new(&mut buffer), image::ImageFormat::Png)
            .map_err(|err| ApiError::internal(err.to_string()))?;
        Ok(Thumbnail {
            mime: "image/png",
            data: buffer,
        })
    } else {
        let rgb = thumbnail.to_rgb8();
        let mut encoder = image::codecs::jpeg::JpegEncoder::new_with_quality(&mut buffer, 82);
        encoder
            .encode_image(&rgb)
            .map_err(|err| ApiError::internal(err.to_string()))?;
        Ok(Thumbnail {
            mime: "image/jpeg",
            data: buffer,
        })
    }
}

fn thumbnail_response(thumbnail: Arc<Thumbnail>) -> Response<Body> {
    Response::builder()
        .status(StatusCode::OK)
        .header(header::CONTENT_TYPE, thumbnail.mime)
        .header(header::CACHE_CONTROL, "private, max-age=300")
        .body(Body::from(thumbnail.data.clone()))
        .unwrap()
}

fn is_image_path(path: &std::path::Path) -> bool {
    matches!(
        path.extension()
            .and_then(|extension| extension.to_str())
            .map(|extension| extension.to_ascii_lowercase())
            .as_deref(),
        Some("jpg" | "jpeg" | "png" | "gif" | "webp" | "bmp" | "avif" | "tif" | "tiff")
    )
}

pub fn is_dangerous(mime: &str) -> bool {
    matches!(
        mime,
        "text/html" | "application/xhtml+xml" | "image/svg+xml"
    )
}

fn content_disposition(name: &str) -> String {
    let fallback: String = name
        .chars()
        .map(|character| {
            if character.is_ascii_graphic() && character != '"' && character != '\\' {
                character
            } else {
                '_'
            }
        })
        .collect();
    format!(
        "attachment; filename=\"{fallback}\"; filename*=UTF-8''{}",
        rfc5987(name)
    )
}

fn rfc5987(value: &str) -> String {
    let mut encoded = String::new();
    for byte in value.as_bytes() {
        if byte.is_ascii_alphanumeric()
            || matches!(
                byte,
                b'!' | b'#' | b'$' | b'&' | b'+' | b'-' | b'.' | b'^' | b'_' | b'`' | b'|' | b'~'
            )
        {
            encoded.push(*byte as char);
        } else {
            encoded.push_str(&format!("%{byte:02X}"));
        }
    }
    encoded
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn dangerous_types_force_download() {
        assert!(is_dangerous("text/html"));
        assert!(is_dangerous("image/svg+xml"));
        assert!(!is_dangerous("video/mp4"));
        assert!(!is_dangerous("text/plain"));
    }

    #[test]
    fn disposition_encodes_utf8() {
        let value = content_disposition("测试 文件.html");
        assert!(value.contains("filename*="));
        assert!(!value.contains("测试"));
    }
}
