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

### 其他

- `cargo fmt` / `cargo clippy`
- `cd web && pnpm fmt`（Prettier）
- 目前没有测试用例；CI 中的 `cargo test --release` 实际只验证可编译
- CI（`.github/workflows/build-*.yml`）仅在推送 `v*` tag 时触发，构建 4 个平台的二进制并上传到 Release

## 架构

请求流：

```
main.rs → routes::routes (access_log 中间件)
        ├─ routes/files.rs → handler/files.rs → services/files_service.rs
        └─ fallback: handler/web.rs (内嵌前端 + SPA fallback)
```

### 后端目录

```
src/
├── main.rs                    # 入口：解析参数、初始化 tracing、绑定 0.0.0.0:{port}
├── args.rs                    # clap 参数：path / -p port / -c compress
├── routes.rs                  # 路由装配，注册访问日志中间件
├── routes/files.rs            # /files/、/files/{*path}、/file_link/{*path}
├── handler/
│   ├── files.rs               # 目录列表、文件内容（tower-http ServeFile）
│   └── web.rs                 # rust-embed 静态资源，未匹配路径回退 index.html
├── services/files_service.rs  # 读取目录、平台相关元数据、图片宽高
├── response.rs                # BaseResponse<T>
├── response/files.rs          # EntryItem / EntryType
├── state.rs                   # AppState { path }
├── middleware/logger.rs       # gin 风格访问日志
└── utils/image.rs             # image::image_dimensions 封装
```

### 前端目录

```
web/src/
├── index.tsx / App.tsx        # 入口：QueryClientProvider + Router
├── routes.tsx                 # / → /browse；/browse/*path；/play/*uri
├── components/                # Home、Files、FileGrid、FileTable、MediaPlayer 等
├── hooks/createPhotoSwipe.ts  # 图片灯箱
├── lib/request.ts             # axios 实例，响应拦截器直接返回 data
├── store/                     # 布局、上下文菜单、滚动位置
├── types/                     # 全局类型声明
└── index.css / App.module.css
```

## 约定与注意事项

- API 响应统一为 `BaseResponse<T> { message, data }`；JSON 字段使用 camelCase（`#[serde(rename_all = "camelCase")]`），前端类型见 `web/src/types/`。
- 新增 API：在 `src/routes/` 下新建模块并在 `src/routes.rs` 中 `merge`；未匹配的路径由 `static_handler` 兜底返回 `index.html`（前端 SPA 路由依赖此行为）。
- `AppState` 通过 `Arc<AppState>` + axum `State` 注入，目前只保存根目录 `path`。
- 目录列表会为每个图片文件同步读取宽高（`image::image_dimensions`），大目录下有明显 I/O 开销，扩展此逻辑时注意性能。
- 平台差异：`services/files_service.rs` 中 `get_entry_metadata` 有 Windows 和 macOS/Linux 两份 `#[cfg]` 实现（前者支持 `SymlinkDir` / `SymlinkFile`），修改元数据逻辑时需同步两处。
- 文件名通过 `file_name().into_string().unwrap()` 获取，非 UTF-8 文件名会 panic。
- `file_link` 把请求路径直接 `join` 到根目录，没有做路径规范化或越界校验；改动此处时注意路径穿越问题。
- `-c/--compress` 参数目前只在 `main.rs` 中打印，压缩逻辑尚未实现。
- `Cargo.toml` 中的 `chrono`、`hyper`、`http-body` 当前未被代码使用。
- 前端路径别名 `@/` 指向 `web/src/`，`web/vite.config.ts` 与 `web/tsconfig.json` 中的配置需保持一致。
- `web/README.md` 是 SolidJS 模板自带的说明文档，不是本项目的文档；项目文档以根目录 `README.md` 为准。
- 前端技术栈：SolidJS + Solid Router + TanStack Query + Tailwind CSS v4 + Vite；UI 图标使用 `@tabler/icons-solidjs`。
