use clap::Parser;

#[derive(Parser, Debug)]
#[command(author, version, about, long_about = None)]
pub(crate) struct Args {
    #[arg(default_value_t = String::from("./"))]
    pub path: String,

    #[arg(short, long, default_value_t = 3000)]
    pub port: u16,

    #[arg(long, default_value = "0.0.0.0", help = "address to bind")]
    pub host: String,

    #[arg(short = 'c', long, help = "enable response compression")]
    pub compress: bool,

    #[arg(long, help = "show hidden entries (starting with '.')")]
    pub hidden: bool,
}
