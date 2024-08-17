use crate::args::Args;
use crate::state::AppState;
use clap::Parser;
use local_ip_address::{list_afinet_netifas, local_ip};
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

    // tracing_subscriber::fmt()
    //     .with_max_level(tracing::Level::INFO)
    //     .init();
    tracing_subscriber::registry()
        .with(tracing_subscriber::fmt::layer())
        // .with(tracing_subscriber::filter)
        .init();

    let app = routes::routes(Arc::new(app_state));

    let network_interfaces = list_afinet_netifas().unwrap();
    for (name, ip) in network_interfaces.iter() {
        println!("{}:\t{:?}", name, ip);
        if ip.is_ipv4() {
            tracing::info!("server running in http://{:?}:{}.", ip, port);
        }
    }

    let listener = tokio::net::TcpListener::bind(format!("{host}:{port}"))
        .await
        .unwrap();
    axum::serve(listener, app).await.unwrap();
}
