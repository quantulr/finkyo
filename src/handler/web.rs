use axum::http::{header, HeaderValue, StatusCode, Uri};
use axum::response::{Html, IntoResponse, Response};
use rust_embed::RustEmbed;

#[derive(RustEmbed)]
#[folder = "web/dist"]
struct Assets;

const INDEX_HTML: &str = "index.html";
const IMMUTABLE_CACHE: &str = "public, max-age=31536000, immutable";
const NO_CACHE: &str = "no-cache";

pub async fn static_handler(uri: Uri) -> Response {
    let path = uri.path().trim_start_matches('/');

    if path.is_empty() || path == INDEX_HTML {
        return index_html();
    }

    match Assets::get(path) {
        Some(content) => {
            let mime = mime_guess::from_path(path).first_or_octet_stream();
            let cache_control = if path.starts_with("assets/") {
                IMMUTABLE_CACHE
            } else {
                NO_CACHE
            };

            let mut response =
                ([(header::CONTENT_TYPE, mime.as_ref())], content.data).into_response();
            response.headers_mut().insert(
                header::CACHE_CONTROL,
                HeaderValue::from_static(cache_control),
            );
            response
        }
        // 只对构建产物目录返回 404，其余路径继续交给前端路由处理。
        None if path.starts_with("assets/") => not_found(),
        None => index_html(),
    }
}

fn index_html() -> Response {
    match Assets::get(INDEX_HTML) {
        Some(content) => {
            let mut response = Html(content.data).into_response();
            response
                .headers_mut()
                .insert(header::CACHE_CONTROL, HeaderValue::from_static(NO_CACHE));
            response
        }
        None => not_found(),
    }
}

fn not_found() -> Response {
    (StatusCode::NOT_FOUND, "404").into_response()
}
