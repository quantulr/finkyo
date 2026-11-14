# CLAUDE.md

本文件为 Claude Code（claude.ai/code）在本仓库中工作时提供指引。

## 项目概览

finkyo 是一个单二进制的自托管文件服务器：Rust（Axum 0.8 + Tokio）提供后端 API，SolidJS 前端在编译期通过 `rust-embed` 嵌入到 `web/dist`，因此发布物只有一个可执行文件，无需额外部署静态资源。

## 常用命令

### 构建（注意顺序）

`rust-embed` 在编译期读取 `web/dist`，必须**先构建前端**，否则 `cargo build` 会因目录/文件不存在而失败：

```bash
cd web
pnpm install
pnpm build
cd ..
cargo build --release
```

产物：`target/release/finkyo`（Windows 为 `finkyo.exe`）。

### 开发

```bash
# 终端 1：后端，监听 0.0.0.0:3000，根目录为当前目录
cargo run -- ./

# 终端 2：前端 Vite，http://localhost:3030
cd web
pnpm install
pnpm dev
```

Vite 将 `/files` 与 `/file_link` 代理到 `http://localhost:3000`（见 `web/vite.config.ts`）。

### 检查与测试

```bash
cargo fmt --all -- --check
cargo clippy --all-targets -- -D warnings
cargo test
cd web && pnpm typecheck
cd web && pnpm fmt
```

- Rust 单元测试覆盖路径校验、隐藏路径判断、图片扩展名判断、危险 MIME 判断等。
- CI（`.github/workflows/ci.yml`）在 push 到 `main` 和 PR 时执行上述全部检查。
- 发布工作流（`.github/workflows/build-*.yml`）仅在推送 `v*` tag 时触发，构建 4 个平台的二进制并上传到 Release。

## 架构

请求流：

```
main.rs → routes::routes (healthz / 安全响应头 / 可选压缩 / access_log)
        ├─ routes/files.rs → handler/files.rs → services/files_service.rs
        ├─ GET /healthz
        └─ fallback: handler/web.rs (内嵌前端 + SPA fallback)
```

### 后端目录

```
src/
├── main.rs                    # 入口：参数、日志、canonicalize 根目录、绑定、优雅关闭
├── args.rs                    # clap 参数：path / -p / --host / -c / --hidden
├── routes.rs                  # 路由装配、安全头、可选压缩、健康检查
├── routes/files.rs            # /files/、/files/{*path}、/file_link/{*path}
├── handler/
│   ├── files.rs               # 目录列表、文件内容（ServeFile）、强制下载
│   └── web.rs                 # rust-embed 静态资源、缓存头、SPA fallback
├── services/files_service.rs  # 读取目录、平台文件类型、排序、图片尺寸并发读取
├── response.rs                # BaseResponse<T>
├── response/
│   ├── error.rs               # ApiError 与统一错误 JSON
│   └── files.rs               # EntryItem / EntryType / EntryMetadata
├── state.rs                   # AppState：根目录、隐藏开关、图片尺寸缓存
├── middleware/logger.rs       # gin 风格访问日志
└── utils/path.rs              # 路径安全校验与根目录解析
```

### 前端目录

```
web/src/
├── index.tsx / App.tsx        # 入口：QueryClientProvider + Router（devtools 仅 DEV 加载）
├── routes.tsx                 # / → /browse；/browse/*path；/play/*uri
├── components/                # Home、Files、FileGrid、FileTable、MediaPlayer 等
├── hooks/createPhotoSwipe.ts  # 图片灯箱
├── lib/
│   ├── path.ts                # URL 路径编码与拼接（必须使用）
│   ├── entries.ts             # 目录 / 符号链接目录判断
│   ├── fileActions.ts         # 打开 / 下载 / 复制链接
│   └── request.ts             # axios 实例，响应拦截器直接返回 data
├── store/                     # 布局、上下文菜单、滚动位置
├── types/                     # 全局类型声明
└── index.css
```

## 约定与注意事项

- **路径安全**：任何由请求路径派生出的文件系统访问都必须经过 `utils::path::resolve_under_root`，不要直接 `root.join(user_path)`。该函数拒绝绝对路径、`..`、Windows 盘符，并校验 canonicalize 后的路径仍在根目录内（符号链接同样适用）。
- **根目录**：`AppState.root` 在启动时已 canonicalize；`resolve_under_root` 依赖这一点。
- **隐藏文件**：默认过滤以 `.` 开头的条目；`--hidden` 开启后，`read_dir` 与 `file_link` 都允许访问。
- **统一错误**：handler 返回 `Result<_, ApiError>`，错误体为 `{ "message": "...", "data": null }`。新增 API 请复用 `ApiError`，不要直接返回纯文本。
- **API 响应**：成功响应统一为 `BaseResponse<T> { message, data }`；JSON 字段使用 camelCase（`#[serde(rename_all = "camelCase")]`），前端类型见 `web/src/types/`。
- **新增 API**：在 `src/routes/` 下新建模块并在 `src/routes.rs` 中 `merge`；未匹配路径由 `static_handler` 兜底返回 `index.html`（前端 SPA 路由依赖此行为），但 `/assets/` 下缺失的文件会返回 404。
- **图片尺寸**：目录列表仅对图片文件读取宽高，使用 `spawn_blocking` 且并发上限为 8，并按 `(路径, 大小, 修改时间)` 缓存；修改这段逻辑时注意不要阻塞 async worker。
- **平台差异**：Windows 的 `classify` 先判断 `is_symlink_dir` / `is_symlink_file`，再判断 `is_dir` / `is_file`；Unix 分支只有 `is_symlink`。修改文件类型判断时需同步两个 `#[cfg]` 实现。
- **文件下载**：`text/html`、`application/xhtml+xml`、`image/svg+xml` 会附加 `Content-Disposition: attachment`，避免同源脚本执行；新增可执行内容类型时请同步 `should_force_download`。
- **静态资源**：`assets/*` 使用一年 immutable 缓存，`index.html` 使用 `no-cache`；Vite 产物文件名带 hash，可直接长缓存。
- **压缩**：`-c` 通过 `CompressionLayer` 启用，仅压缩大于 1 KiB 且非图片的响应。
- **日志**：`RUST_LOG` 生效（`EnvFilter`）；`/assets/*` 与 `/healthz` 只在 debug 级别记录。
- **前端 URL**：`@solidjs/router` 的 `useParams` 返回的是 URL 中的**原始编码路径**（不会自动解码）。使用前必须先经 `lib/path.ts` 的 `decodePath` 解码，再交给 `encodePath` / `filesUrl` / `fileLinkUrl` / `browseUrl` / `playUrl` 编码拼接；不要把 `params.path` / `params.uri` 直接用于接口地址或显示。
- **目录判断**：前端统一使用 `isDirectoryEntry`（同时覆盖 `Directory` 与 `SymlinkDir`）。
- **前端技术栈**：SolidJS + Solid Router + TanStack Query + Tailwind CSS v4 + Vite；图标使用 `@tabler/icons-solidjs`。
- `web/README.md` 是 SolidJS 模板自带的说明文档，不是本项目的文档；项目文档以根目录 `README.md` 为准。
- 版本号：`Cargo.toml` 与 `web/package.json` 保持一致（当前 0.5.4）。
