# finkyo

一个自托管的单二进制文件服务器：后端用 Rust（Axum）提供 API，Web UI 用 [egoist/mygo](https://github.com/egoist/mygo) 的原生 UI 编写、编译为 WebAssembly，再通过 `rust-embed` 嵌入可执行文件。启动后即可在浏览器中浏览、预览和播放服务器上的文件，无需额外部署前端资源。

## 功能

- **目录浏览**：表格 / 网格两种布局，面包屑导航，上一级 / 后退
- **搜索与排序**：按名称过滤当前目录；按名称、大小、修改时间排序（目录优先，可升序 / 降序）
- **图片预览**：自适应窗口的黑底查看器，显示原图尺寸，可直接打开原图或下载
- **音视频播放**：视频使用浏览器原生 `<video>`，音频由 Go 解码为 PCM 播放；支持播放列表、循环、倍速、音量、静音、进度拖拽
- **缩略图**：网格视图由服务端生成并缓存缩略图（图片解码带并发限制）
- **在线打开**：文本、PDF、压缩包等不支持的格式可下载或在新标签页打开
- **隐私默认**：默认隐藏以 `.` 开头的文件和目录
- **单二进制部署**：包含 WASM 前端的全部静态资源编译进可执行文件
- **响应式界面**：窄屏自动换行、隐藏次要表格列与播放列表
- **原生 UI**：整套界面由 mygo 原生控件绘制，无 HTML/CSS/JS 前端工程

## 浏览器要求

需要支持 WebAssembly 与 WebGL 2 的现代浏览器（Chrome / Edge / Firefox / Safari 的当前版本），桌面与移动端均可。Web UI 渲染在 `<canvas>` 上，不依赖 DOM 组件。

## 从源码构建

需要：

- Go 1.27.4 或更新版本
- Rust stable（edition 2024）

```bash
# 1. 先构建 Web UI（Go → WebAssembly，产物在 web/dist）
cd web
go run ./cmd/build
cd ..

# 2. 再构建后端（rust-embed 在编译期读取 web/dist）
cargo build --release
```

> 必须先构建 Web UI。`web/dist` 不存在时 `cargo build` 会失败。

产物为 `target/release/finkyo`（Windows 为 `finkyo.exe`）。

## 运行

```bash
# 以当前目录为根目录，监听所有网卡的 3000 端口
finkyo ./

# 指定目录和端口
finkyo ./photos -p 8080

# 只监听本机，并开启响应压缩
finkyo ./photos --host 127.0.0.1 -c
```

启动后终端会打印访问地址。`GET /healthz` 可用于健康检查。

## 命令行

```
Usage: finkyo [OPTIONS] [PATH]

Arguments:
  [PATH]  Directory to serve [default: ./]

Options:
  -p, --port <PORT>  Port to listen on [default: 3000]
      --host <HOST>  Address to bind [default: 0.0.0.0]
  -c, --compress     Enable gzip compression
      --hidden       Show hidden entries (starting with '.')
  -h, --help         Print help
  -V, --version      Print version
```

## 安全说明

finkyo 面向可信网络（局域网、个人设备）使用，**没有内置身份认证**。部署时请注意：

- 默认绑定 `0.0.0.0`，会暴露给所有网卡；只在本机使用时请加 `--host 127.0.0.1`
- 默认隐藏 `.` 开头的文件（如 `.git`、`.env`）；`--hidden` 会一并展示
- 所有文件访问都会校验路径与符号链接，拒绝根目录之外的路径
- `.html`、`.xhtml`、`.svg` 会被强制以附件下载，避免同源脚本执行
- 如需公网访问，建议放在带认证的反向代理之后

## Docker

```bash
docker build -t finkyo .
docker run --rm -p 3000:3000 -v /path/to/files:/data finkyo
```

镜像默认以 `/data` 为根目录，可通过追加参数覆盖，例如：

```bash
docker run --rm -p 8080:8080 -v /path/to/files:/data finkyo /data -p 8080 -c
```

## 开发

Web UI 使用 Go 编写、只能编译到 `js/wasm`，因此修改 Go 代码后需要重新构建 WASM 并重启后端：

```bash
cd web && go run ./cmd/build && cd ..
cargo run -- ./
```

没有前端热更新；页面路由使用 URL fragment（`#/browse/...`），浏览器前进 / 后退可用。

常用检查：

```bash
cargo fmt --all -- --check
cargo clippy --all-targets -- -D warnings
cargo test

cd web
GOOS=js GOARCH=wasm go vet ./...
gofmt -l .
```

> `web` 下的代码依赖 `syscall/js`，在宿主机（非 wasm）上直接 `go build` / IDE 分析会报错，这是预期行为；统一使用 `GOOS=js GOARCH=wasm`。

日志级别可通过 `RUST_LOG` 控制，例如 `RUST_LOG=debug finkyo ./`。

## API

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| `GET` | `/api/list?path=` | 列出目录（`path` 为根目录相对路径，空为根目录） |
| `GET` | `/api/raw?path=&download=true` | 返回文件内容（支持 Range 请求；`download=true` 强制附件下载） |
| `GET` | `/api/thumb?path=&w=320` | 图片缩略图（JPEG / 保留透明度的 PNG） |
| `GET` | `/healthz` | 健康检查 |
| `GET` | `/*` | 内嵌 Web UI；未知路径回退到 `index.html` |

目录列表响应示例：

```json
{
  "path": "photos",
  "parent": "",
  "entries": [
    {
      "name": "2024",
      "type": "directory",
      "size": 0,
      "modified": 1730000000000
    },
    {
      "name": "cover.jpg",
      "type": "file",
      "size": 123456,
      "modified": 1730000000000
    }
  ]
}
```

- `type`：`file`、`directory`、`symlink`、`symlinkDir`、`symlinkFile`
- `parent`：父目录相对路径；根目录为 `null`
- `modified`：Unix 毫秒时间戳

错误响应统一为：

```json
{
  "error": "not found"
}
```

## 技术栈

- **后端**：Rust、Axum 0.8、Tokio、tower-http（`ServeFile` 提供 Range 支持）、rust-embed、image
- **前端**：Go、[egoist/mygo](https://github.com/egoist/mygo) 原生 UI，编译为 WebAssembly
- **媒体**：浏览器原生 `<video>`；音频通过 mygo `audio` 包解码（MP3 / Vorbis / FLAC / AAC / WAV）

## 许可证

[MIT](LICENSE)
