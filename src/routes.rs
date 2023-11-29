use crate::handler::web::static_handler;
use crate::state::AppState;
use axum::Router;
use std::sync::Arc;

mod files;

pub fn routes(state: Arc<AppState>) -> Router {
    Router::new()
        .merge(files::routes(state))
        .fallback(static_handler)
}
