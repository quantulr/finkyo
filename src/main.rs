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

    let app_state = AppState { path };

    tracing_subscriber::registry()
        .with(tracing_subscriber::fmt::layer())
        .init();

    let app = routes::routes(Arc::new(app_state));

    axum::Server::bind(&format!("0.0.0.0:{}", port).parse().unwrap())
        .serve(app.into_make_service())
        .await
        .unwrap();
}
