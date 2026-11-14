use crate::handler::web::static_handler;
use crate::middleware::logger::access_log;
use crate::state::AppState;
use axum::http::{header, HeaderValue, StatusCode};
use axum::routing::get;
use axum::{middleware, Json, Router};
use serde_json::json;
use std::sync::Arc;
use tower_http::compression::predicate::{NotForContentType, Predicate, SizeAbove};
use tower_http::compression::CompressionLayer;
use tower_http::set_header::SetResponseHeaderLayer;

mod files;

const COMPRESSION_MIN_SIZE: u16 = 1024;

pub fn routes(state: Arc<AppState>, compress: bool) -> Router {
    let mut router = Router::new()
        .merge(files::routes(state))
        .route("/healthz", get(healthz))
        .fallback(static_handler)
        .layer(SetResponseHeaderLayer::if_not_present(
            header::X_CONTENT_TYPE_OPTIONS,
            HeaderValue::from_static("nosniff"),
        ))
        .layer(SetResponseHeaderLayer::if_not_present(
            header::REFERRER_POLICY,
            HeaderValue::from_static("no-referrer"),
        ));

    if compress {
        router = router
            .layer(CompressionLayer::new().compress_when(
                SizeAbove::new(COMPRESSION_MIN_SIZE).and(NotForContentType::IMAGES),
            ));
    }

    router.layer(middleware::from_fn(access_log))
}

async fn healthz() -> impl axum::response::IntoResponse {
    (StatusCode::OK, Json(json!({ "status": "ok" })))
}
