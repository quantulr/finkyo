use axum::body::Body;
use axum::http::{StatusCode, Uri, header};
use axum::response::{IntoResponse, Response};
use rust_embed::RustEmbed;

#[derive(RustEmbed)]
#[folder = "web/dist/"]
struct Assets;

/// Serves the embedded web UI. Unknown paths fall back to `index.html`,
/// since the app routes in the URL fragment.
pub async fn serve(uri: Uri) -> Response {
    let requested = uri.path().trim_start_matches('/');
    let requested = if requested.is_empty() {
        "index.html"
    } else {
        requested
    };

    if let Some(file) = Assets::get(requested) {
        return asset_response(requested, file.data.into_owned());
    }

    match Assets::get("index.html") {
        Some(index) => asset_response("index.html", index.data.into_owned()),
        None => (StatusCode::NOT_FOUND, "web UI is not built").into_response(),
    }
}

fn asset_response(path: &str, data: Vec<u8>) -> Response {
    let mime = if path.ends_with(".wasm") {
        "application/wasm".to_string()
    } else {
        mime_guess::from_path(path)
            .first_or_octet_stream()
            .to_string()
    };

    let cache = if path == "index.html" {
        "no-cache"
    } else {
        // index.html loads these with a build hash in the query.
        "public, max-age=31536000, immutable"
    };

    Response::builder()
        .status(StatusCode::OK)
        .header(header::CONTENT_TYPE, mime)
        .header(header::CACHE_CONTROL, cache)
        .body(Body::from(data))
        .unwrap()
}
