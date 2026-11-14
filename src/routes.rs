use std::sync::Arc;

use axum::Router;
use axum::http::{HeaderValue, header};
use axum::routing::get;
use tower_http::compression::predicate::{NotForContentType, SizeAbove};
use tower_http::compression::{CompressionLayer, Predicate};
use tower_http::set_header::SetResponseHeaderLayer;

use crate::assets;
use crate::files;
use crate::state::AppState;

pub fn routes(state: Arc<AppState>, compress: bool) -> Router {
    let app = Router::new()
        .route("/api/list", get(files::list))
        .route("/api/raw", get(files::raw))
        .route("/api/thumb", get(files::thumb))
        .route("/healthz", get(|| async { "ok" }))
        .fallback(assets::serve)
        .layer(SetResponseHeaderLayer::overriding(
            header::X_CONTENT_TYPE_OPTIONS,
            HeaderValue::from_static("nosniff"),
        ))
        .layer(SetResponseHeaderLayer::overriding(
            header::REFERRER_POLICY,
            HeaderValue::from_static("no-referrer"),
        ))
        .with_state(state);

    if compress {
        let predicate = SizeAbove::new(1024).and(NotForContentType::IMAGES);
        app.layer(CompressionLayer::new().gzip(true).compress_when(predicate))
    } else {
        app
    }
}
