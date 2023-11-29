pub mod parser;

use clap::Parser;

#[derive(Parser, Debug)]
#[command(author, version, about, long_about = None)]
pub(crate) struct Args {
    #[arg(default_value_t = String::from("./"))]
    pub path: String,

    #[arg(short, long, default_value_t = 3000)]
    pub port: u16,
}
