use std::sync::Arc;

use clap::Parser;
use tracing_subscriber::layer::SubscriberExt;
use tracing_subscriber::util::SubscriberInitExt;

mod api;
mod args;
mod assets;
mod error;
mod path;
mod routes;
mod state;

use args::Args;
use state::AppState;

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

    let state = Arc::new(AppState::new(root, args.hidden));
    let app = routes::routes(Arc::clone(&state), args.compress);

    if args.host == "0.0.0.0" || args.host == "::" {
        match if_addrs::get_if_addrs() {
            Ok(interfaces) => {
                for interface in interfaces {
                    let ip = interface.ip();
                    if ip.is_ipv4() {
                        tracing::info!("server running at http://{}:{}", ip, args.port);
                    }
                }
            }
            Err(err) => tracing::warn!(%err, "failed to list network interfaces"),
        }
    } else {
        tracing::info!("server running at http://{}:{}", args.host, args.port);
    }

    let address = format!("{}:{}", args.host, args.port);
    let listener = match tokio::net::TcpListener::bind(&address).await {
        Ok(listener) => listener,
        Err(err) => {
            tracing::error!(%address, %err, "failed to bind address");
            std::process::exit(1);
        }
    };

    if let Err(err) = axum::serve(listener, app)
        .with_graceful_shutdown(shutdown_signal())
        .await
    {
        tracing::error!(%err, "server error");
    }
}

async fn shutdown_signal() {
    if let Err(err) = tokio::signal::ctrl_c().await {
        tracing::error!(%err, "failed to listen for shutdown signal");
    }
}
