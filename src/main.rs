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

    // if std::env::var_os("RUST_LOG").is_none() {
    //     std::env::set_var("RUST_LOG", "finkyo=DEBUG");
    // }

    tracing_subscriber::registry()
        .with(tracing_subscriber::fmt::layer())
        // .with(tracing_subscriber::filter)
        .init();

    let app = routes::routes(Arc::new(app_state));

    tracing::info!("server running in http://{}:{}.", host, port);
    axum::Server::bind(&format!("{}:{}", host, port).parse().unwrap())
        .serve(app.into_make_service())
        .await
        .unwrap();
}
