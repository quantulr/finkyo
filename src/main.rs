use crate::args::Args;
use crate::state::AppState;
use clap::Parser;
use std::sync::Arc;

use tracing_subscriber::layer::SubscriberExt;
use tracing_subscriber::util::SubscriberInitExt;

mod args;
mod handler;
mod response;
mod routes;
mod services;
mod state;
mod utils;

#[tokio::main]
async fn main() {
    let args = Args::parse();
    let port = args.port;
    let path = args.path;
    let host = "0.0.0.0";
    let app_state = AppState { path };

    tracing_subscriber::registry()
        .with(tracing_subscriber::fmt::layer())
        // .with(tracing_subscriber::filter)
        .init();

    let app = routes::routes(Arc::new(app_state));

    tracing::info!("server running in http://{}:{}.", host, port);

    let listener = tokio::net::TcpListener::bind(format!("{host}:{port}"))
        .await
        .unwrap();
    axum::serve(listener, app).await.unwrap();
}
