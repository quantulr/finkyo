use crate::handler::files::{file_link, list_dir, list_root_dir};
use crate::state::AppState;
use axum::routing::get;
use axum::Router;
use std::sync::Arc;

pub fn routes(state: Arc<AppState>) -> Router {
    Router::new()
        .route("/files/", get(list_root_dir))
        .route("/files/*path", get(list_dir))
        .route("/file_link/*path", get(file_link))
        .with_state(state)
}
