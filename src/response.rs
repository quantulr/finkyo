use serde::{Deserialize, Serialize};

pub mod files;

#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BaseResponse<T> {
    pub message: String,
    pub data: T,
}
