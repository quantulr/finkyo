use crate::response::files::EntryItem;
use crate::response::BaseResponse;
use crate::services::files_service;
use crate::state::AppState;
use axum::body::Body;
use axum::extract::{Path, State};
use axum::http::{Request, StatusCode};
use axum::response::IntoResponse;
use axum::Json;
use serde_json::{json, Value};
use std::sync::Arc;
use tower::ServiceExt;
use tower_http::services::ServeFile;

pub async fn list_root_dir(
    State(state): State<Arc<AppState>>,
) -> Result<Json<BaseResponse<Vec<EntryItem>>>, (StatusCode, String)> {
    let root_path = &state.path;
    match files_service::read_dir(root_path, "").await {
        Ok(data) => Ok(Json(BaseResponse {
            message: String::from("success"),
            data,
        })),
        Err(err) => Err(err),
    }
}

pub async fn list_dir(
    State(state): State<Arc<AppState>>,
    Path(path): Path<String>,
) -> Result<Json<BaseResponse<Vec<EntryItem>>>, (StatusCode, String)> {
    let root_path = &state.path;
    match files_service::read_dir(root_path, &path).await {
        Ok(data) => Ok(Json(BaseResponse {
            message: String::from("success"),
            data,
        })),
        Err(err) => Err(err),
    }
}

// 访问文件内容
pub async fn file_link(
    State(state): State<Arc<AppState>>,
    Path(path): Path<String>,
    req: Request<Body>,
) -> Result<impl IntoResponse, (StatusCode, Json<Value>)> {
    let root_path = &state.path;
    let path = std::path::Path::new(root_path).join(std::path::Path::new(&path));
    // ServeFile::new(path)
    match ServeFile::new(path).oneshot(req).await {
        Ok(res) => Ok(res),
        Err(err) => Err((
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({
                "message": format!("file read failed！{}", err)
            })),
        )),
    }
}
