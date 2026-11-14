use crate::args::Args;
use crate::state::AppState;
use clap::Parser;
use std::net::SocketAddr;
use std::sync::Arc;
use tracing_subscriber::layer::SubscriberExt;
use tracing_subscriber::util::SubscriberInitExt;

mod args;
mod handler;
mod middleware;
mod response;
mod routes;
mod services;
mod state;
mod utils;

#[tokio::main]
async fn main() {
    let args = Args::parse();

    tracing_subscriber::registry()
        .with(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| tracing_subscriber::EnvFilter::new("info")),
        )
        .with(tracing_subscriber::fmt::layer())
        .init();

    let root = match tokio::fs::canonicalize(&args.path).await {
        Ok(root) => root,
        Err(err) => {
            tracing::error!(path = %args.path, %err, "failed to open root directory");
            std::process::exit(1);
        }
    };

    match tokio::fs::metadata(&root).await {
        Ok(metadata) if metadata.is_dir() => {}
        Ok(_) => {
            tracing::error!(path = %args.path, "root path is not a directory");
            std::process::exit(1);
        }
        Err(err) => {
            tracing::error!(path = %args.path, %err, "failed to read root directory");
            std::process::exit(1);
        }
    }

    let app_state = AppState::new(root, args.hidden);
    let app = routes::routes(Arc::new(app_state), args.compress);

    if args.host == "0.0.0.0" || args.host == "::" {
        match if_addrs::get_if_addrs() {
            Ok(interfaces) => {
                for ip in interfaces
                    .into_iter()
                    .map(|iface| iface.ip())
                    .filter(|ip| ip.is_ipv4())
                {
                    tracing::info!("server running at http://{}:{}", ip, args.port);
                }
            }
            Err(err) => tracing::warn!(%err, "failed to list network interfaces"),
        }
    } else {
        tracing::info!("server running at http://{}:{}", args.host, args.port);
    }

    let addr = format!("{}:{}", args.host, args.port);
    let listener = match tokio::net::TcpListener::bind(&addr).await {
        Ok(listener) => listener,
        Err(err) => {
            tracing::error!(%addr, %err, "failed to bind address");
            std::process::exit(1);
        }
    };

    if let Err(err) = axum::serve(
        listener,
        app.into_make_service_with_connect_info::<SocketAddr>(),
    )
    .with_graceful_shutdown(shutdown_signal())
    .await
    {
        tracing::error!(%err, "server stopped with an error");
    }
}

async fn shutdown_signal() {
    if let Err(err) = tokio::signal::ctrl_c().await {
        tracing::error!(%err, "failed to listen for Ctrl+C");
        return;
    }
    tracing::info!("shutting down");
}
