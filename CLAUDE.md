# CLAUDE.md

本文件为 Claude Code（claude.ai/code）在本仓库中工作时提供指引。

## 项目概览

finkyo 是一个单二进制的自托管文件服务器。后端是 Rust（Axum 0.8 + Tokio）；Web UI 用 Go 编写，基于 [egoist/mygo](https://github.com/egoist/mygo) 的原生 UI，编译为 WebAssembly 后放入 `web/dist`，由 `rust-embed` 在编译期嵌入可执行文件。浏览器里没有 HTML 组件或前端框架，整个界面由 mygo 在 `<canvas>` 上绘制。

## 常用命令

### 构建（注意顺序）

`rust-embed` 在编译期读取 `web/dist`，必须**先构建 Web UI**，否则 `cargo build` 会因目录/文件不存在而失败：

```bash
cd web
go run ./cmd/build     # GOOS=js GOARCH=wasm 构建 dist/{app.wasm,wasm_exec.js,index.html}
cd ..
cargo build --release
```

产物：`target/release/finkyo`（Windows 为 `finkyo.exe`）。

### 开发

Web UI 没有热更新；改 Go 代码后重新执行 `cd web && go run ./cmd/build`，再启动/重启后端：

```bash
cargo run -- ./
```

页面路由使用 URL fragment（`#/browse/...`），刷新页面仍停留在当前路由。

### 检查与测试

```bash
cargo fmt --all -- --check
cargo clippy --all-targets -- -D warnings
cargo test

cd web
GOOS=js GOARCH=wasm go vet ./...
gofmt -l .
```

- Go 代码依赖 `syscall/js`，**只能在 js/wasm 下编译**。宿主机直接 `go build ./...` 或 IDE 报 `syscall/js` 相关错误是预期行为，不要为此改代码。
- Rust 单元测试覆盖路径安全（遍历 / 绝对路径 / 隐藏路径 / 父路径）与文件下载相关逻辑。
- CI（`.github/workflows/ci.yml`）在 push 到 `main` 和 PR 时执行上述检查；发布工作流（`build-*.yml`）仅在推送 `v*` tag 时构建 4 个平台的二进制。

## 架构

请求流：

```
main.rs → routes::routes（安全响应头 / 可选压缩）
        ├─ GET /api/list    → files::list
        ├─ GET /api/raw     → files::raw（ServeFile，支持 Range）
        ├─ GET /api/thumb   → files::thumb（服务端缩略图 + 缓存）
        ├─ GET /healthz
        └─ fallback: assets::serve（内嵌 Web UI，未匹配路径回退 index.html）

浏览器 → index.html → wasm_exec.js + app.wasm（mygo）
      → ui.NewRouter（#/、#/browse/{path...}、#/view/{path...}、#/play/{path...}）
      → fetch /api/list、/api/raw、/api/thumb
```

### 后端目录

```
src/
├── main.rs     # 入口：参数、tracing、canonicalize 根目录、绑定、优雅关闭
├── args.rs     # clap 参数：path / -p / --host / -c / --hidden
├── routes.rs   # 路由装配、nosniff / no-referrer、可选 gzip 压缩
├── files.rs    # list / raw / thumb 三个 handler，缩略图渲染，强制附件逻辑
├── assets.rs   # rust-embed 静态资源、Content-Type、缓存头
├── state.rs    # AppState：根目录、隐藏开关、缩略图并发信号量与缓存
├── path.rs     # 路径安全校验、隐藏路径判断、父路径、缩略图缓存键
└── error.rs    # ApiError：{ "error": "..." } 与对应状态码
```

### Web UI 目录

```
web/
├── main.go          # mygo.App、NewWindow、ui.View(application.view)
├── app.go           # app 状态、路由表、路由切换清理、打开条目的分发
├── api.go           # Entry 类型、siteOrigin、URL 构造、fetch/JSON 辅助、音频解码器注册
├── browse.go        # 目录页：工具栏、面包屑、表格/网格、排序过滤、缩略图加载
├── viewer.go        # 图片查看页
├── player.go        # 视频/音频播放页、播放列表、控制条
├── icons.go         # 内联 SVG 图标
├── index.html       # wasm 启动页，{{VERSION}} 由构建脚本替换
├── go.mod           # Go 1.27.4；mygo v0.9.0
└── cmd/build/main.go# 构建 dist：wasm、wasm_exec.js、带版本号的 index.html
```

## 约定与注意事项

### 后端

- **路径安全**：任何由请求路径派生出的文件系统访问都必须经过 `path::resolve_under_root`，不要直接 `root.join(user_path)`。该函数拒绝绝对路径、`..`、Windows 盘符，默认拒绝隐藏路径，并校验 canonicalize 后的路径仍在根目录内（符号链接同样适用）。
- **根目录**：`AppState.root` 在启动时已 canonicalize；`resolve_under_root` 依赖这一点。
- **统一错误**：handler 返回 `Result<_, ApiError>`，错误体为 `{ "error": "..." }`。新增 API 请复用 `ApiError`，不要返回纯文本。
- **API 响应**：成功响应直接返回业务 JSON（无 `message/data` 包装）。字段使用 snake_case 的既有命名（`name` / `type` / `size` / `modified` / `entries` / `parent`），Go 侧结构体 tag 必须同步。
- **新增 API**：在 `src/routes.rs` 添加路由并实现 handler；未匹配路径由 `assets::serve` 兜底返回 `index.html`。
- **文件下载**：`text/html`、`application/xhtml+xml`、`image/svg+xml` 会附加 `Content-Disposition: attachment`，避免同源脚本执行；新增可执行内容类型时请同步 `is_dangerous`。中文文件名使用 RFC 5987 编码，改这段逻辑时注意保留。
- **缩略图**：`/api/thumb` 仅在扩展名属于图片白名单时工作，宽高限制在 64–1024；解码在 `spawn_blocking` 中进行，信号量上限 4，缓存键为 `(路径, 大小, 修改时间, 宽度)`，缓存超过 512 条时整体清空。修改时不要阻塞 async worker。
- **静态资源**：`index.html` 使用 `no-cache`，其余资源一年 immutable；`index.html` 里的 `app.wasm` / `wasm_exec.js` 带内容哈希查询参数，因此 WASM 更新后浏览器会自动拉新。
- **压缩**：`-c` 启用 gzip，仅压缩大于 1 KiB 且非图片的响应。
- **日志**：`RUST_LOG` 生效（`EnvFilter`）。

### Web UI（Go / mygo）

- **视图即状态**：`a.view` 每帧重建 UI；所有界面状态必须放在 `app` / `browseState` / `viewerState` / `playerState` 中，不要在 view 里创建需要跨帧保留的可变状态。
- **异步更新**：网络请求、图片解码都放 goroutine，结果必须通过 `a.win.Update(func(){...})` 写回状态；回写前校验 `path` 仍是当前路径，避免快速切换目录时旧结果覆盖新页面。
- **路由**：使用 `ui.NewRouter` 与 `r.Param("path")`；参数是编码后的 fragment 路径。拼接路由必须使用 `escapePath` / `browseRoute` / `viewRoute` / `playRoute`，不要手工拼接中文或斜杠。离开 `/play/`、`/view/` 时由 `syncRoute` 负责关闭播放器/清空查看器。
- **接口 URL**：一律通过 `siteOrigin()` + `apiURL` 构造绝对 URL（`rawURL` / `downloadURL` / `thumbURL`），路径用 `url.Values` 编码；不要把文件名直接拼进 URL。
- **媒体**：
  - 视频使用 `ui.Video` + `video.OpenURL(rawURL)`，由浏览器原生 `<video>` 播放（浏览器支持的编码才能播）。
  - 音频用 `audio.OpenStream(io.ReadSeeker)`，解码器由 `api.go` 的 blank import 注册（`audio/mp3`、`audio/vorbis`、`audio/flac`、`audio/aac`、`audio/mp4`，WAV 内置）；新增格式时补 import，否则运行时报“不支持”。
  - `video.VideoPlayer` / `audio.Player` 的所有方法都必须在主线程（view 或 `win.Update` 内）调用；进度更新靠 `c.After` 在播放中轮询，不要用后台 ticker。
  - 播放结束只处理一次（`handledEnd`），随后按循环模式或播放列表顺序切歌。
- **列表状态**：`browseState.list` / `grid` 保存的是指针；切换目录时**新建** `&ui.ListState{}` / `&ui.GridState{}`，不要把正在使用的状态清零——路由过渡期间旧页面仍会用原状态重排，清零会触发 mygo `layoutList` 空指针 panic。`/api/list` 不排序，前端由 `visibleEntries` 统一“目录优先 + 当前排序”。
- **打开条目**：表格单元格用 `RowClicked()` 响应当前行的单击（整行任意列都可点）；网格项在内容根节点上用 `OnClick`；`Submitted()`（双击 / Enter）仅作补充。点击目录 / 面包屑后由路由切换页面。
- **缩略图**：网格视图调用 `/api/thumb` 并缓存在 `browse.thumbs`；不要为每个网格项下载原图再解码。
- **响应式**：窄屏策略集中在 view 中——工具栏 `Wrap()`（<760）、音量滑块与 Spacer（<640）、表格列（<480 隐藏大小，<720 隐藏修改时间）、播放列表（<900 隐藏）。新增控件时保持同一套阈值。
- **图标**：使用 `icons.go` 里的 `svg(body)` + `iconButton`，不要引入图片资源。
- **构建产物**：只改 `web/index.html`（模板），不要手改 `web/dist`；`web/dist` 已 gitignore，由 `go run ./cmd/build` 生成，`wasm_exec.js` 必须从当前 Go 的 `GOROOT` 复制。
- **依赖版本**：`go.mod` 固定 `mygo v0.9.0`。升级 mygo 前先确认所用 API 未变；API 参考可用 `go doc github.com/egoist/mygo/ui` 或模块缓存里的 `docs/`。
- **旧技术栈已移除**：不要再引入 pnpm / Node / Vite / SolidJS / HTML 组件或 `web/src`；前端源码只在 `web/*.go`。
- 版本号以 `Cargo.toml` 为准（当前 0.6.0）。
