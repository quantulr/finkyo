# finkyo

一个用 Rust 编写、前端内嵌于单个二进制的自托管文件服务器。启动后即可通过浏览器浏览、预览和播放服务器上的文件。

## 功能

- **目录浏览**：网格 / 表格两种布局，面包屑导航
- **排序与搜索**：按名称、大小、修改时间排序（目录优先），`Ctrl + F` 按文件名过滤
- **图片预览**：PhotoSwipe 灯箱，支持手势与缩放
- **音视频播放**：内置播放器，支持播放列表、循环模式、倍速、进度拖拽、音量、全屏、键盘快捷键与断点续播
- **在线打开**：文本文件与 PDF 直接在新标签页中打开
- **文件操作**：下载、复制文件链接
- **隐私默认**：默认隐藏以 `.` 开头的文件和目录
- **单二进制部署**：前端静态资源编译进可执行文件，无需额外部署 Web 服务
- **响应式界面**：适配桌面与移动设备

## 快速开始

### 下载二进制

从 [Releases](https://github.com/quantulr/finkyo/releases) 下载对应平台的预编译二进制（Windows amd64、Linux amd64/aarch64、macOS aarch64）。

### 从源码构建

需要 Rust 工具链、Node.js 与 [pnpm](https://pnpm.io)。

```bash
# 1. 先构建前端（产物会被嵌入到二进制中）
cd web
pnpm install
pnpm build
cd ..

# 2. 再构建后端
cargo build --release
```

> `rust-embed` 在编译期读取 `web/dist`，因此必须先构建前端。

可执行文件位于 `target/release/finkyo`（Windows 为 `target/release/finkyo.exe`）。

### 运行

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
  [PATH]  [default: ./]

Options:
  -p, --port <PORT>  [default: 3000]
      --host <HOST>  address to bind [default: 0.0.0.0]
  -c, --compress     enable response compression
      --hidden       show hidden entries (starting with '.')
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

前后端分离调试：

```bash
# 终端 1：启动后端（默认 3000 端口）
cargo run -- ./

# 终端 2：启动前端开发服务器
cd web
pnpm install
pnpm dev
```

打开 `http://localhost:3030`。Vite 会将 `/files` 与 `/file_link` 请求代理到后端 `http://localhost:3000`。

常用检查：

```bash
cargo fmt --all -- --check
cargo clippy --all-targets -- -D warnings
cargo test
cd web && pnpm typecheck
```

日志级别可通过 `RUST_LOG` 控制，例如 `RUST_LOG=debug finkyo ./`。

## API

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| `GET` | `/files/` | 列出根目录 |
| `GET` | `/files/{path}` | 列出指定目录 |
| `GET` | `/file_link/{path}` | 返回文件内容（支持 Range 请求） |
| `GET` | `/healthz` | 健康检查 |
| `GET` | `/*` | 内嵌前端静态资源，未匹配路径回退到 `index.html` |

目录列表响应示例：

```json
{
  "message": "success",
  "data": [
    {
      "name": "docs",
      "entryType": "Directory"
    },
    {
      "name": "photo.jpg",
      "entryType": "File",
      "size": 123456,
      "modified": 1730000000000,
      "width": 1920,
      "height": 1080
    }
  ]
}
```

- `entryType`：`File`、`Directory`、`Symlink`、`SymlinkDir`、`SymlinkFile`
- `modified`：Unix 毫秒时间戳
- `width` / `height`：仅图片文件返回

错误响应统一为：

```json
{
  "message": "path not found",
  "data": null
}
```

## 技术栈

- **后端**：Rust、Axum、Tokio、tower-http、rust-embed
- **前端**：SolidJS、Solid Router、TanStack Query、Tailwind CSS v4、Vite、PhotoSwipe

## 许可证

[MIT](LICENSE)
