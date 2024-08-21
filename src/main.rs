use crate::args::Args;
use crate::state::AppState;
use clap::Parser;
use if_addrs::Interface;
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

    for ip in if_addrs::get_if_addrs()
        .unwrap_or_else(|e| {
            // error!("Failed to get local interface addresses: {}", e);
            Default::default()
        })
        .into_iter()
        .map(|iface| iface.ip())
    // .filter(|ip| ip.is_ipv4() || ip.is_ipv6())
    {
        if ip.is_ipv4() {
            tracing::info!("server running in http://{:?}:{}", ip, port);
        } /* else if ip.is_ipv6() {
              tracing::info!("server running in http://[{:?}]:{}", ip, port);
          }*/
    }

    let listener = tokio::net::TcpListener::bind(format!("{host}:{port}"))
        .await
        .unwrap();
    axum::serve(listener, app).await.unwrap();
}
