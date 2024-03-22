use crate::handler::web::static_handler;
use crate::state::AppState;
use axum::extract::MatchedPath;
use axum::http::Request;
use axum::Router;
use std::sync::Arc;
use tower_http::trace::TraceLayer;
use tracing::info_span;

mod files;

pub fn routes(state: Arc<AppState>) -> Router {
    Router::new()
        .merge(files::routes(state))
        .fallback(static_handler)
        .layer(TraceLayer::new_for_http().make_span_with(|request: &Request<_>| {
            info_span!("http_request", method = ?request.method(),uri = ?request.uri())
        }))
    // .layer(
    //     TraceLayer::new_for_http().make_span_with(|request: &Request<_>| {
    //         // Log the matched route's path (with placeholders not filled in).
    //         // Use request.uri() or OriginalUri if you want the real path.
    //         let matched_path = request
    //             .extensions()
    //             .get::<MatchedPath>()
    //             .map(MatchedPath::as_str);
    //
    //         info_span!(
    //             "http_request",
    //             method = ?request.method(),
    //             uri = ?request.uri(),
    //             matched_path,
    //             some_other_field = tracing::field::Empty,
    //         )
    //     }),
    // )
}
