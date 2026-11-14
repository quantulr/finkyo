# CLAUDE.md

本文件为 Claude Code（claude.ai/code）在本仓库中工作时提供指引。

## 项目概览

finkyo 是一个单二进制的自托管文件服务器。后端是 Rust（Axum 0.8 + Tokio）；Web UI 使用 **SolidJS 2**（当前为 RC）+ TypeScript + Vite 构建，产物放在 `web/dist`，由 `rust-embed` 在编译期嵌入可执行文件。仓库里没有 Go / mygo 代码，旧技术栈已完全移除。

界面遵循 Apple 的设计语言：半透明材料、跟随指针的 1:1 交互、弹簧动画、动量投射、边缘回弹、系统字体与响应式排版。相关技能文件位于 `.claude/skills/apple-design/SKILL.md`，做界面 / 动效相关工作时应通过 `Skill` 工具调用 `apple-design`。

## 常用命令

### 构建（注意顺序）

`rust-embed` 在编译期读取 `web/dist`，必须**先构建前端**：

```bash
cd web
pnpm install --frozen-lockfile
pnpm typecheck
pnpm build
cd ..
cargo build --release
```

产物：`target/release/finkyo`（Windows 为 `finkyo.exe`）。

### 开发

```bash
# 终端 1：后端，监听 3000
cargo run -- ./

# 终端 2：Vite 开发服务器，监听 3030，代理 /api 与 /healthz 到 3000
cd web
pnpm dev
```

打开 <http://localhost:3030>。修改前端有热更新；修改 Rust 需要重启 `cargo run`。不用每次 `pnpm build`，只有验证嵌入产物或发布时才需要。

### 检查与测试

```bash
cargo fmt --all -- --check
cargo clippy --all-targets -- -D warnings
cargo test

cd web
pnpm typecheck
pnpm fmt   # Prettier
```

- Rust 单元测试覆盖路径安全与下载响应头逻辑。
- CI（`.github/workflows/ci.yml`）在 push 到 `main` / PR 时执行 web 安装、类型检查、构建，然后执行 rustfmt / clippy / test。
- 发布工作流（`build-*.yml`）仅在推送 `v*` tag 时构建 4 个平台的二进制。

## 架构

请求流：

```
main.rs → routes::routes（安全响应头 / 可选 gzip）
        ├─ GET /api/list    → api::list
        ├─ GET /api/raw     → api::raw（ServeFile，支持 Range）
        ├─ GET /api/thumb   → api::thumb（服务端缩略图 + 缓存）
        ├─ GET /healthz
        └─ fallback: assets::serve（内嵌 Web UI，未匹配路径回退 index.html）

浏览器 → index.html → SolidJS app
      → hash 路由（#/、#/browse/…、#/view/…、#/play/…）
      → fetch /api/list、/api/raw、/api/thumb
```

### 后端目录

```
src/
├── main.rs     # 入口：参数、tracing、canonicalize 根目录、绑定、优雅关闭
├── args.rs     # clap 参数：path / -p / --host / -c / --hidden
├── routes.rs   # 路由装配、nosniff / no-referrer、可选 gzip 压缩
├── api.rs      # list / raw / thumb 三个 handler，缩略图渲染，强制附件逻辑
├── assets.rs   # rust-embed 静态资源、Content-Type、缓存头
├── state.rs    # AppState：根目录、隐藏开关、缩略图并发信号量与缓存
├── path.rs     # 路径安全校验、隐藏路径判断、父路径、缩略图缓存键
└── error.rs    # ApiError：{ "error": "..." } 与对应状态码
```

### 前端目录

```
web/
├── src/
│   ├── index.tsx              # render(() => <App />, root)
│   ├── App.tsx                # hash 路由、目录加载、菜单 / Toast / 覆盖层装配
│   ├── types.ts               # Entry / Route / SortState / Layout 等类型
│   ├── icons.tsx              # 内联 SVG 图标与文件类型图标
│   ├── styles.css             # 设计令牌、材料、布局、响应式、偏好适配
│   ├── components/
│   │   ├── Toolbar.tsx        # 导航、面包屑、搜索、排序菜单、布局切换、刷新
│   │   ├── FileList.tsx       # 表格行、缩略图、键盘导航、行内更多菜单
│   │   ├── FileGrid.tsx       # 网格卡片、缩略图、键盘导航
│   │   ├── Viewer.tsx         # 图片覆盖层：滑动 / 下拉关闭 / 缩放 / 平移
│   │   ├── Player.tsx         # 原生 video 播放器：播放列表、进度、音量、倍速
│   │   ├── Menu.tsx           # 锚定式弹出菜单、键盘导航、边缘夹取
│   │   ├── Breadcrumbs.tsx    # 可滚动的面包屑
│   │   ├── IconButton.tsx     # 统一图标按钮
│   │   └── Toast.tsx          # 轻提示
│   └── lib/
│       ├── api.ts             # fetch、raw / thumb / download URL、下载辅助
│       ├── path.ts            # 扩展名判断、路径编解码、hash 路由构造与解析
│       ├── format.ts          # 文件大小 / 日期 / 时长格式化
│       ├── preferences.ts     # localStorage：布局、排序、音量
│       └── motion.ts          # spring、动量投射、rubber-band、速度采样
├── index.html
├── vite.config.ts             # Solid 插件；dev 3030，代理 API 到 3000
├── tsconfig.json              # jsxImportSource: @solidjs/web
└── package.json               # 固定 Solid 2 RC / Vite 8 / TypeScript 7
```

## SolidJS 2 约定（重要）

当前依赖是 **Solid 2.0.0-rc.21**，与 1.x / React 习惯不同。写代码前先确认以下事项：

- `render` 从 `@solidjs/web` 导入；JSX import source 是 `@solidjs/web`。
- `solid-js/web`、`solid-js/store` 子路径已移除；`createStore` 等 API 直接从 `solid-js` 导入。
- `createEffect(compute, apply)` 是唯一形式：**compute 只读，所有写入放在 apply 中**。不要照搬 1.x 的 `createEffect(fn)`。
- `onMount` 已被 `onSettled` 取代；`createResource` 已移除，数据加载使用显式 signal + `fetch`。
- props 是值而非访问器；**不要解构 props**，否则会丢失响应性。
- 在 JSX 边界传递计算值时调用访问器，例如 `value={count()}`；组件内部则通过 `props.x` 读取。
- `class` 支持字符串、数组、对象混合；没有 `classList`。
- DOM 属性使用小写：`tabindex`、`spellcheck`、`playsinline`；ARIA 布尔值需要字符串（`aria-selected={active ? "true" : "false"}`）。
- 事件处理器只绑定一次，内部读最新 props / signal；不要把事件属性当成 addEventListener 的 options。
- `<For>` 的默认子函数收到普通 item 与 index 访问器；`<Show>` 的函数子级收到收窄后的访问器（非 keyed 时）。
- Solid 的 setter 在微任务中刷新 DOM 外观，但 signal 值同步更新；不要依赖渲染后的 DOM 立即反映某个 signal。
- 避免在组件体、effect compute、以及仍处于 owner 作用域的代码里写 signal；事件回调、异步回调、`onSettled`、effect apply 是安全位置。
- `ref` 使用回调形式（`ref={(el) => (node = el)}`）最稳，避免依赖旧版 ref 语法。

## 前端实现约定

### 路由与数据

- 路由使用 URL fragment，由 `parseHash` / `browseHash` / `viewHash` / `playHash` 统一编解码；路径每段单独 `encodeURIComponent`，不要手工拼中文或斜杠。
- `App.tsx` 维护导航栈；覆盖层内的上一张 / 下一张使用 `location.replace`，避免污染历史；打开覆盖层使用 `location.hash`（新增历史记录）。
- 目录加载使用递增的 `loadToken` + `AbortController` 防竞态；可复用的目录响应放在 `cache` 中，先展示缓存再后台刷新。
- 搜索、排序、目录优先都在 `App.tsx` 的 `visibleEntries` 中统一处理；`/api/list` 本身不排序。
- 覆盖层的媒体列表（图片 / 音视频）由当前目录 entries 派生；直接通过 hash 打开的文件会作为单项兜底。
- 文本文件在新标签页打开；其他未知类型直接下载；HTML / SVG 由后端强制附件下载。
- 剪贴板复制需同时支持安全上下文与非安全上下文（`navigator.clipboard` 不可用时退回 `textarea + execCommand`）。

### 动效与手势

- 所有可拖拽交互使用 Pointer Events + `setPointerCapture`，从 pointerdown 开始反馈，按 1:1 跟随指针。
- 弹簧参数用 Apple 的 **damping ratio + response**（`lib/motion.ts`）：默认 `damping = 1`、`response ≈ 0.32–0.4`；只有手势带动量时才略降 damping（约 0.86–0.9）。
- 手势结束时把手势速度传给弹簧；横向切换使用 `project(velocity)` 决定目标，而不是仅看位移。
- 边界使用 `rubberband()` 渐进阻力（横向到头时），不要硬停；垂直下拉关闭应当 1:1 跟随，避免用户拖很远仍不触发。
- 动画必须可打断：新手势从当前 presentation 值（signal 中的当前偏移）继续，不要跳到逻辑目标值。
- 图片查看器的三种滑动槽固定渲染 prev / current / next；切换完成后在同一帧重置 offset 与 index，避免闪跳。
- 滑动隐藏的控件（例如查看器 chrome）在动画结束后要恢复到手势前的可见状态。
- 尊重 `prefers-reduced-motion`：`lib/motion.ts` 的 spring 会直接跳到目标值；CSS 侧有全局缩短动画。

### 样式

- 设计令牌都在 `styles.css` 的 `:root`；暗色模式通过 `@media (prefers-color-scheme: dark)` 覆盖。新增颜色必须同时定义亮 / 暗两套。
- 字体使用系统字体栈；字号用 `rem`，行高与字距按字号调整（大标题负字距、正文接近 0）。
- 顶栏 / 菜单 / 播放列表等悬浮层使用 `backdrop-filter` + 半透明背景；大表面比小控件更厚。不要连续叠加两层浅色半透明材料。
- 顶栏使用滚动边缘效果（`--topbar-scrolled` 的阴影 + `::after` 渐变），不要加生硬的 1px 分割线。
- 响应式断点：`900px`（搜索框收窄）、`760px`（工具栏换行、播放列表底部面板、隐藏日期列）、`560px`（隐藏大小列、网格更窄）。新增控件时沿用这些断点。
- `prefers-reduced-transparency` 时关闭 `backdrop-filter` 并提高背景不透明度；`prefers-contrast: more` 时加深边框与文字颜色。
- 触屏设备上始终显示行 / 卡片上的“更多”按钮；桌面端悬停显示。
- 所有交互元素保留 `:focus-visible` 焦点环，不要用 `outline: none` 全局移除。

### 弹出菜单

- `Menu` 接收左上角坐标，在 `onSettled` 中用 `offsetWidth` / `offsetHeight` 夹取位置——不要用 `getBoundingClientRect()`，因为入场动画的 scale 会让测量结果偏小，导致菜单溢出屏幕。
- 菜单项网格三列（图标 / 标签 / 勾选或快捷键）。没有图标时保留占位（`visibility: hidden`），不要 `display: none`，否则会打乱 grid 列分配并截断标签。
- 点击外部、Escape 关闭；ArrowUp / ArrowDown 在菜单项间移动。

### 播放器

- 始终渲染同一个 `<video>` 元素；音频模式通过 CSS 隐藏视频并展示封面，切歌时只更新 src / load / play，不重新挂载播放器。
- `props.path` 变化时重置进度、缓冲状态并重新 `load()` + `play()`；自动播放被浏览器拦截时展示播放按钮，不视为错误。
- 播放列表允许混排视频与音频；`kind` 由当前路径的扩展名派生，切换时 UI 自动在视频与音频封面间过渡。
- 键盘快捷键：Space 播放 / 暂停，← / → 快退 / 快进 5 秒，↑ / ↓ 调整音量，M 静音，F 全屏，N / P 下一个 / 上一个，Esc 退出全屏或关闭。
- 全屏和 Body 滚动锁（`overlay-open`）必须在 `onCleanup` 中释放。

### 构建产物

- `web/dist` 与 `web/node_modules` 已 gitignore；不要手改 dist。
- 只修改 `web/src`、`web/index.html`、`web/vite.config.ts` 等源文件，发布前重新 `pnpm build`。
- 本地调试嵌入产物时，Vite 构建后 Rust debug 模式会直接读取 `web/dist`（无需重新 `cargo build`）；release 模式需要重新编译以重新嵌入。

## 后端约定

- **路径安全**：任何由请求路径派生出的文件系统访问都必须经过 `path::resolve_under_root`。该函数拒绝绝对路径、`..`、Windows 盘符，默认拒绝隐藏路径，并校验 canonicalize 后的路径仍在根目录内（符号链接同样适用）。
- **根目录**：`AppState.root` 在启动时已 canonicalize；`resolve_under_root` 依赖这一点。
- **统一错误**：handler 返回 `Result<_, ApiError>`，错误体为 `{ "error": "..." }`。新增 API 请复用 `ApiError`，不要返回纯文本。
- **API 响应**：成功响应直接返回业务 JSON（无包装）。字段使用既有 snake_case 命名（`name` / `type` / `size` / `modified` / `entries` / `parent`），前端 `types.ts` 必须同步。
- **新增 API**：在 `src/routes.rs` 添加路由并实现 handler；未匹配路径由 `assets::serve` 兜底返回 `index.html`。
- **文件下载**：`text/html`、`application/xhtml+xml`、`image/svg+xml` 会附加 `Content-Disposition: attachment`，避免同源脚本执行；新增可执行内容类型时请同步 `is_dangerous`。中文文件名使用 RFC 5987 编码。
- **缩略图**：`/api/thumb` 仅在扩展名属于图片白名单时工作，宽高限制在 64–1024；解码在 `spawn_blocking` 中进行，信号量上限 4，缓存键为 `(路径, 大小, 修改时间, 宽度)`，缓存超过 512 条时整体清空。不要阻塞 async worker。
- **静态资源**：`index.html` 使用 `no-cache`，其余资源一年 immutable；Vite 产物带内容哈希。
- **压缩**：`-c` 启用 gzip，仅压缩大于 1 KiB 且非图片的响应。
- **日志**：`RUST_LOG` 生效（`EnvFilter`）。

## 发布与版本

- 版本号以 `Cargo.toml` 为准（当前 `0.8.1`），`web/package.json` 保持同步。
- 需要提交前先确认 `cargo fmt --check`、`clippy`、`cargo test`、`pnpm typecheck`、`pnpm build` 全部通过。
- 发布 tag 使用 `v*`（如 `v0.8.1`），四个发布工作流会分别产出 Linux amd64/aarch64、macOS aarch64、Windows amd64 二进制。
