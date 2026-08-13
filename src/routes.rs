use crate::handler::web::static_handler;
use crate::middleware::logger::access_log;
use crate::state::AppState;
use axum::{middleware, Router};
use std::sync::Arc;

mod files;

pub fn routes(state: Arc<AppState>) -> Router {
    Router::new()
        .merge(files::routes(state))
        .fallback(static_handler)
        .layer(middleware::from_fn(access_log))
}
