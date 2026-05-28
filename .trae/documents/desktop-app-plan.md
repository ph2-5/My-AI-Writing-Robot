# AI写字机器人 - 桌面App开发计划

## 技术选型：Tauri v2

选择 Tauri 的理由：
- **复用现有前端**：React + TypeScript 代码几乎无需修改
- **轻量**：打包后 ~5MB（Electron ~100MB）
- **安全**：Rust 后端，内存安全
- **原生性能**：系统级 API 调用，启动快
- **跨平台**：Windows/macOS/Linux 一键打包
- **直接调用 Python**：Tauri 命令可以启动 Python 子进程

## 架构设计

```
┌─────────────────────────────────────────┐
│  Tauri App (桌面窗口)                    │
│  ┌─────────────────────────────────┐   │
│  │  WebView (React 前端)            │   │
│  │  - 参数面板 / 文件上传 / SVG预览  │   │
│  │  - 与 Tauri 后端通过 invoke 通信  │   │
│  └─────────────────────────────────┘   │
│  ┌─────────────────────────────────┐   │
│  │  Rust 后端 (Tauri Commands)      │   │
│  │  - 文件系统操作 (读/写/下载)      │   │
│  │  - 启动 Python 子进程            │   │
│  │  - 配置持久化 (JSON)             │   │
│  └─────────────────────────────────┘   │
└─────────────────────────────────────────┘
              ↓ spawn
┌─────────────────────────────────────────┐
│  Python 后端 (嵌入式 / 外部调用)         │
│  - main.py (Word解析 / LLM / 排版)      │
│  - 通过 stdout 返回 JSON 结果           │
└─────────────────────────────────────────┘
```

## 关键决策

### 1. Python 调用方式
- **方案A**：Tauri Rust 后端通过 `std::process::Command` 调用外部 Python
- **方案B**：将 Python 打包为可执行文件（PyInstaller），随 App 分发
- **选择**：方案A（开发期）→ 方案B（发布期）
  - 开发时直接调用系统 Python
  - 发布时打包 Python 解释器 + 依赖

### 2. 通信机制
- 前端 `invoke('generate_homework', {filePath, config})`
- Rust 启动 Python 进程，传入参数
- Python stdout 返回 JSON
- Rust 解析 JSON 返回前端

### 3. 文件系统
- Word 上传：前端通过 Tauri dialog API 选择文件 → Rust 读取 → 传给 Python
- SVG 下载：Python 生成 → Rust 写入用户目录 → 前端显示保存路径
- 配置持久化：Rust 读写 `%APPDATA%/ai-homework-robot/config.json`

## 实施步骤

### 步骤1：初始化 Tauri 项目
- 安装 Tauri CLI：`cargo install tauri-cli`
- 在现有项目根目录初始化 Tauri：`cargo tauri init`
- 配置 `tauri.conf.json`：窗口尺寸、标题、权限

### 步骤2：配置 Tauri 与现有前端集成
- 修改 `vite.config.ts` 添加 Tauri HMR 支持
- 修改 `src-tauri/tauri.conf.json` 指向前端构建输出
- 测试 `cargo tauri dev` 能否正常启动

### 步骤3：Rust 后端 Commands 开发
创建 `src-tauri/src/lib.rs`：
- `generate_homework(file_path, config_json)` → 调用 Python，返回 SVG
- `parse_homework(file_path)` → 调用 Python 解析，返回题目列表
- `demo_generate(config_json)` → 演示模式
- `save_config(config_json)` → 保存用户配置
- `load_config()` → 读取用户配置
- `download_file(file_id)` → 下载生成文件
- `open_directory()` → 打开输出目录

### 步骤4：前端适配 Tauri API
- 安装 `@tauri-apps/api`
- 创建 `src/api/tauri.ts` 封装所有后端调用
- 替换原有的 `fetch` HTTP 调用为 `invoke`
- 文件上传改为 Tauri dialog API
- 下载改为 Tauri save dialog

### 步骤5：移除 Express 后端依赖
- 删除 `api/` 目录（或保留用于 Web 版本）
- 前端不再依赖 localhost:3001
- 所有功能通过 Tauri Commands 实现

### 步骤6：配置持久化
- Rust 端实现配置读写
- 启动时自动加载上次配置
- 参数修改自动保存

### 步骤7：打包与分发
- `cargo tauri build` 生成安装程序
- Windows: `.msi` 安装包
- 配置应用图标、版本号、签名

## 文件变更清单

### 新增文件
```
src-tauri/
├── Cargo.toml              # Rust 依赖
├── tauri.conf.json         # Tauri 配置
├── icons/                  # 应用图标
└── src/
    ├── lib.rs              # 主入口 + Commands
    └── python_runner.rs    # Python 子进程封装
```

### 修改文件
```
vite.config.ts              # 添加 Tauri HMR 端口
src/api/tauri.ts            # 新增：Tauri API 封装
src/stores/useConfigStore.ts # 启动时加载持久化配置
src/components/FileUpload.tsx # 改为 Tauri dialog
src/components/GeneratePanel.tsx # 改为 invoke 调用
package.json                # 添加 @tauri-apps/api
```

### 可选保留（Web 版本兼容）
```
api/                        # Express 后端（可选保留）
```

## 开发环境要求
- Rust toolchain (`rustup`)
- Tauri CLI (`cargo install tauri-cli`)
- 现有 Node.js + Python 环境

## 预计工作量
- 初始化 + 集成：1 小时
- Rust Commands：2 小时
- 前端适配：1 小时
- 测试 + 打包：1 小时
