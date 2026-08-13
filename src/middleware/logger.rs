use axum::body::Body;
use axum::extract::ConnectInfo;
use axum::http::Request;
use axum::middleware::Next;
use axum::response::Response;
use std::net::SocketAddr;
use std::time::Instant;

// gin 风格访问日志:每个请求一行,时间戳与级别由 tracing_subscriber 输出
pub async fn access_log(
    ConnectInfo(addr): ConnectInfo<SocketAddr>,
    req: Request<Body>,
    next: Next,
) -> Response {
    let method = req.method().clone();
    let path = req
        .uri()
        .path_and_query()
        .map(|pq| pq.as_str().to_owned())
        .unwrap_or_else(|| req.uri().path().to_owned());

    let start = Instant::now();
    let res = next.run(req).await;
    let latency = start.elapsed();

    tracing::info!(
        %method,
        path = %path,
        status = res.status().as_u16(),
        latency = ?latency,
        client = %addr.ip(),
        "request completed"
    );

    res
}
