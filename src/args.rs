use clap::Parser;

#[derive(Parser, Debug)]
#[command(version, about = "A self-hosted file server with a native web UI")]
pub struct Args {
    /// Directory to serve
    #[arg(default_value = "./")]
    pub path: String,

    /// Port to listen on
    #[arg(short, long, default_value_t = 3000)]
    pub port: u16,

    /// Address to bind
    #[arg(long, default_value = "0.0.0.0")]
    pub host: String,

    /// Enable gzip compression
    #[arg(short, long)]
    pub compress: bool,

    /// Show hidden entries (starting with '.')
    #[arg(long)]
    pub hidden: bool,
}
