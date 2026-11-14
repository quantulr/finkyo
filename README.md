# finkyo

一个用 Rust 编写、前端内嵌于单个二进制的自托管文件服务器。启动后即可通过浏览器浏览、预览和播放服务器上的文件。

## 功能

- **目录浏览**：网格 / 表格两种布局，面包屑导航
- **图片预览**：PhotoSwipe 灯箱，支持手势与缩放
- **音视频播放**：内置播放器，支持播放列表、进度拖拽与音量控制
- **在线打开**：文本文件与 PDF 直接在新标签页中打开
- **文件下载**：通过右键菜单（桌面端）或底部弹窗（触屏端）下载
- **搜索**：按文件名实时过滤，`Ctrl + F` 快速唤起
- **单二进制部署**：前端静态资源编译进可执行文件，无需额外部署 Web 服务
- **响应式界面**：适配桌面与移动设备

## 快速开始

### 下载二进制

从 [Releases](https://github.com/quantulr/finkyo/releases) 下载对应平台的预编译二进制（Windows amd64、Linux amd64/aarch64、macOS）。

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
# 以当前目录为根目录，默认端口 3000
finkyo ./

# 指定目录和端口
finkyo ./photos -p 8080
```

启动后终端会打印所有网卡对应的访问地址，例如 `http://192.168.1.10:3000`。

## 命令行

```
Usage: finkyo [OPTIONS] [PATH]

Arguments:
  [PATH]  [default: ./]

Options:
  -p, --port <PORT>  [default: 3000]
  -c, --compress     enable directory compress
  -h, --help         Print help
  -V, --version      Print version
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

## API

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| `GET` | `/files/` | 列出根目录 |
| `GET` | `/files/{path}` | 列出指定目录 |
| `GET` | `/file_link/{path}` | 返回文件内容（支持 Range 请求） |
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

## 技术栈

- **后端**：Rust、Axum、Tokio、tower-http、rust-embed
- **前端**：SolidJS、Solid Router、TanStack Query、Tailwind CSS v4、Vite、PhotoSwipe

## 许可证

[MIT](LICENSE)
