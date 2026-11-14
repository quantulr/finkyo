# finkyo

一个自托管的单二进制文件服务器：后端使用 Rust（Axum）提供文件 API，Web UI 使用 [SolidJS 2](https://www.solidjs.com/) 构建，再由 `rust-embed` 打包进可执行文件。启动后即可在浏览器中浏览目录、查看图片、播放音视频，无需单独部署前端。

界面以 Apple 的设计语言为参照：半透明工具栏、跟随指针的 1:1 拖拽、可打断的弹簧动画、动量投射与边缘回弹，并适配浅色 / 深色、减少动态效果、减少透明度等系统偏好。相关设计知识收录在 [`.claude/skills/apple-design/SKILL.md`](.claude/skills/apple-design/SKILL.md)。

## 功能

- **目录浏览**：列表 / 网格两种布局，面包屑、后退、上一级、刷新
- **搜索与排序**：按名称过滤当前目录；按名称、大小、修改时间排序，可升降序；偏好保存在本地
- **图片查看器**：黑底沉浸式查看，左右滑动切换、下拉关闭、双击 / 滚轮 / 双指缩放，拖动图片平移；支持下载与打开原图
- **音视频播放**：基于浏览器原生 `<video>`，自定义控制条，支持播放列表、上一首 / 下一首、进度拖拽、音量、静音、倍速、循环、全屏和键盘快捷键
- **缩略图**：网格视图和图片行使用服务端生成的缩略图，带并发限制与内存缓存
- **文件操作**：下载、复制链接、在新标签页打开；文本文件可直接在线查看
- **隐私默认**：默认隐藏以 `.` 开头的文件和目录，可用 `--hidden` 开启
- **响应式**：手机端工具栏自动换行、隐藏次要列；播放列表在窄屏变为底部面板
- **可访问性**：键盘导航、可见焦点、语义化标签，尊重 `prefers-reduced-motion` / `prefers-reduced-transparency` / `prefers-contrast`
- **单二进制部署**：前端产物编译进可执行文件，无需额外的静态资源目录

## 浏览器要求

需要支持 Pointer Events、`backdrop-filter` 与现代媒体 API 的浏览器：Chrome / Edge / Firefox / Safari 的当前版本。音频和视频能否播放取决于浏览器的编解码器支持；例如 MKV、部分 AVI 编码可能无法在浏览器中播放。浏览器通常还会阻止自动播放，此时点击画面中的播放按钮即可开始。

## 从源码构建

需要：

- [Node.js](https://nodejs.org/) 20.19+（推荐 24 或更新）
- [pnpm](https://pnpm.io/) 12（`package.json` 已通过 `packageManager` 固定版本）
- Rust stable（edition 2024）

```bash
# 1. 先构建前端（产物在 web/dist）
cd web
pnpm install --frozen-lockfile
pnpm typecheck
pnpm build
cd ..

# 2. 再构建后端（rust-embed 在编译期读取 web/dist）
cargo build --release
```

> 必须先构建前端。`web/dist` 不存在时，发布构建会失败。

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

启动后终端会打印可访问的局域网地址。`GET /healthz` 可用于健康检查。

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

## 开发

开发时推荐同时运行后端和 Vite：

```bash
# 终端 1：后端，监听 3000
cargo run -- ./

# 终端 2：前端开发服务器，监听 3030，并将 /api、/healthz 代理到 3000
cd web
pnpm dev
```

打开 <http://localhost:3030> 即可获得热更新。修改前端后无需重启后端；发布时再执行 `pnpm build`。

前端路由使用 URL fragment，刷新页面仍停留在当前路由：

- `#/` / `#/browse/{path}`：目录
- `#/view/{path}`：图片查看器
- `#/play/{path}`：音视频播放器

常用检查：

```bash
cargo fmt --all -- --check
cargo clippy --all-targets -- -D warnings
cargo test

cd web
pnpm typecheck
pnpm fmt
```

日志级别可通过 `RUST_LOG` 控制，例如 `RUST_LOG=debug finkyo ./`。

## Docker

```bash
docker build -t finkyo .
docker run --rm -p 3000:3000 -v /path/to/files:/data finkyo
```

镜像默认以 `/data` 为根目录，可通过追加参数覆盖：

```bash
docker run --rm -p 8080:8080 -v /path/to/files:/data finkyo /data -p 8080 -c
```

## 安全说明

finkyo 面向可信网络（局域网、个人设备）使用，**没有内置身份认证**。部署时请注意：

- 默认绑定 `0.0.0.0`，会暴露给所有网卡；只在本机使用时请加 `--host 127.0.0.1`
- 默认隐藏 `.` 开头的文件（如 `.git`、`.env`）；`--hidden` 会一并展示
- 所有文件访问都会校验路径与符号链接，拒绝根目录之外的路径
- `.html`、`.xhtml`、`.svg` 会被强制以附件下载，避免同源脚本执行
- 如需公网访问，建议放在带认证的反向代理之后

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
- **前端**：SolidJS 2.0 RC、TypeScript 7、Vite 8、pnpm；无组件库，界面与动效均为手写 CSS / Pointer Events
- **图标**：内联 SVG（`web/src/icons.tsx`）
- **设计参考**：Apple 的流体界面与材料设计原则（见 `.claude/skills/apple-design/SKILL.md`）

## 目录

```
src/                    Rust 后端
├── main.rs             入口、参数、根目录校验、监听、优雅关闭
├── api.rs              list / raw / thumb handler
├── routes.rs           路由、安全响应头、可选 gzip
├── assets.rs           内嵌 web/dist，回退 index.html
├── path.rs             路径安全、隐藏路径、父路径
├── state.rs            根目录、缩略图缓存与并发限制
├── error.rs            统一的 { "error": "..." } 响应
└── args.rs             clap 命令行参数

web/                    SolidJS 前端
├── src/App.tsx         路由、目录数据、覆盖层状态
├── src/components/     工具栏、列表/网格、查看器、播放器、菜单
├── src/lib/            API、路径、格式化、偏好、弹簧与手势工具
├── src/icons.tsx       内联图标
├── src/styles.css      设计令牌、材料、响应式与偏好适配
└── dist/               构建产物（gitignored，由 pnpm build 生成）
```

## 许可证

[MIT](LICENSE)
