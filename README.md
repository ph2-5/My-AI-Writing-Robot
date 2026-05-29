# AI写字机器人

基于大语言模型的智能作业生成与写字机器人控制系统。将Word文档中的作业题目通过AI分析、智能排版，最终生成可供写字机器人执行的指令。桌面端基于Electron，后端Python服务嵌入启动，前端采用自由布局的浮动面板+画布交互设计。

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## 功能特性

### 核心功能

- **Word文档解析**：支持 `.docx` 文件上传，自动识别题目类型
- **AI智能分析**：通过LLM Agent分析题目、生成答案和排版方案，支持重试与超时保护
- **多模态图像理解**：支持题目图片解析，识别图形类型和参数
- **精确排版系统**：相对位置布局、自动换页、溢出检测
- **手绘效果模拟**：智能识别图形类型，模拟真实手写效果
- **答案审核功能**：支持人工审核和编辑AI生成的答案
- **SSE流式预览**：预览过程实时推送进度，无需等待全部完成
- **机器人串口连接**：通过pyserial连接写字机器人，支持GCode逐行发送与进度回调
- **配置持久化**：所有配置参数自动保存至浏览器localStorage

### 支持的题型

| 类别 | 支持类型 |
|------|---------|
| 软件工程 | UML用例图、类图、时序图、活动图、状态图、组件图、部署图 |
| 机械制图 | 三视图、剖视图、尺寸标注、中心线、表面粗糙度 |
| 电路电子 | 电阻、电容、电感、二极管、运放、逻辑门等标准符号 |
| 数学图形 | 函数图像、几何图形、坐标系 |
| 文字类 | 论述题、计算题、证明题、简答题 |

### 输出格式

- **奎享格式**（kuixiang）：支持奎享写字机器人
- **SVG**：矢量图形，可在浏览器预览
- **GCode**：支持标准CNC写字机器人

---

## 快速开始

### 环境要求

- Python 3.10+
- Node.js 20+
- Windows（桌面应用打包仅支持Windows）

### 1. 克隆项目

```bash
git clone https://github.com/your-username/ai-writing-robot.git
cd ai-writing-robot
```

### 2. 安装Python依赖

```bash
pip install -r requirements.txt
pip install pyserial
```

### 3. 安装前端依赖

```bash
npm install
```

### 4. 配置API密钥

复制环境变量模板：

```bash
cp .env.example .env
```

编辑 `.env` 文件，填入你的API密钥：

```env
LLM_BASE_URL=https://api.deepseek.com/v1
LLM_API_KEY=your_api_key_here
LLM_MODEL=deepseek-coder
```

> 支持DeepSeek、OpenAI等兼容OpenAI API格式的服务商。也可在应用界面中直接配置。

### 5. 启动服务

#### 开发模式

**方式一：前后端分离启动（推荐开发调试）**

```bash
# 终端1：启动Python后端
python electron/server.py --port 3002

# 终端2：启动Vite开发服务器
npm run client:dev
```

浏览器访问 http://localhost:5173

**方式二：Electron开发模式**

```bash
npm run electron:dev
```

此命令会同时启动Vite开发服务器和Electron窗口，Python后端由Electron自动启动。

#### 打包安装包

```bash
# 构建Windows安装包（NSIS安装程序）
npm run electron:build:win
```

生成的安装包位于 `release-build/` 目录：
- `AI写字机器人-Setup-{version}-x64.exe` - NSIS安装程序
- `AI写字机器人-{version}-portable.exe` - 便携版

---

## 项目结构

```
ai-writing-robot/
├── src/                              # 前端源码（React + TypeScript + Zustand + TailwindCSS）
│   ├── components/                   # UI组件
│   │   ├── FileUpload.tsx            # 文件上传
│   │   ├── QuestionList.tsx          # 题目列表
│   │   ├── LayoutPreview.tsx         # 布局预览控制
│   │   ├── PreviewCanvas.tsx         # 画布预览（支持平移缩放）
│   │   ├── AnswerReview.tsx          # 答案审核
│   │   ├── GeneratePanel.tsx         # 生成操作面板
│   │   ├── PaperSettings.tsx         # 纸张设置
│   │   ├── PaperTemplateSelector.tsx # 纸张模板选择
│   │   ├── FontSettings.tsx          # 字体设置
│   │   ├── RobotSettings.tsx         # 机器人设置
│   │   ├── HandDrawnSettings.tsx     # 手绘效果设置
│   │   ├── LLMSettings.tsx           # AI模型设置
│   │   ├── OutputSettings.tsx        # 输出格式设置
│   │   └── ...                       # 其他组件
│   ├── pages/
│   │   └── Home.tsx                  # 主页面（浮动面板+画布布局）
│   ├── stores/                       # 状态管理（Zustand）
│   │   ├── useConfigStore.ts         # 配置状态（persist到localStorage）
│   │   ├── useAppStore.ts            # 应用状态
│   │   └── useGenerateStore.ts       # 生成状态
│   ├── hooks/                        # 自定义Hooks
│   │   ├── useLocalStorage.ts        # localStorage工具
│   │   └── useTheme.ts              # 主题切换
│   ├── lib/                          # 工具函数
│   │   ├── api.ts                    # API客户端（含重试/超时/SSE流式）
│   │   └── utils.ts                  # 通用工具
│   ├── App.tsx                       # 应用入口
│   ├── main.tsx                      # 渲染入口
│   └── index.css                     # 全局样式（TailwindCSS）
│
├── electron/                         # Electron桌面应用
│   ├── main.cjs                      # 主进程（Python服务管理、IPC）
│   ├── preload.cjs                   # 预加载脚本
│   └── server.py                     # 嵌入式HTTP服务（API路由）
│
├── analyzers/                        # AI分析模块
│   ├── image_analyzer.py             # 多模态图像分析
│   ├── homework_analyzer.py          # 作业分析器
│   └── agent/                        # AI Agent
│       ├── layout_designer.py        # 布局设计
│       ├── layout_tools.py           # 布局工具
│       └── style_strategist.py       # 风格策略
│
├── layout/                           # 排版引擎
│   ├── layout_engine.py              # 基础布局
│   ├── precision_layout.py           # 精确布局计算
│   ├── answer_planner.py             # 答案规划
│   ├── models.py                     # 数据模型
│   └── preview_renderer.py           # 预览渲染
│
├── output/                           # 输出生成
│   ├── command_generator.py          # 指令生成器（kuixiang/SVG/GCode）
│   └── robot_connection.py           # 机器人串口连接（pyserial）
│
├── fonts/                            # 字体模块
│   └── hershey.py                    # Hershey矢量字体
│
├── symbols/                          # 标准符号库
│   ├── circuit_symbols.py            # 电路图符号
│   └── mechanical_symbols.py         # 机械制图符号
│
├── effects/                          # 效果处理
│   ├── hand_drawn.py                 # 手绘效果
│   └── text_deformer.py              # 文字变形
│
├── parsers/                          # 文档解析
│   └── homework_parser.py            # Word文档解析
│
├── scripts/                          # 辅助脚本
│   └── check_env.py                  # 环境检查
│
├── tests/                            # 测试用例
│   └── test_all.py                   # 综合测试
│
├── .github/workflows/                # CI/CD
│   ├── check.yml                     # 代码检查
│   └── build.yml                     # 构建与发布
│
├── config.py                         # Python配置文件
├── main.py                           # Python命令行入口
├── logging_utils.py                  # 日志工具
├── requirements.txt                  # Python依赖
├── package.json                      # Node依赖与构建脚本
├── electron-builder.yml              # Electron打包配置
├── vite.config.ts                    # Vite构建配置
├── tailwind.config.js                # TailwindCSS配置
├── tsconfig.json                     # TypeScript配置
└── eslint.config.js                  # ESLint配置
```

---

## API接口文档

后端HTTP服务运行在 `http://127.0.0.1:{port}`，所有接口返回统一格式：

```json
{
  "success": true,
  "httpStatus": 200,
  "data": { ... }
}
```

### 作业相关

#### 上传文档

```http
POST /api/homework/upload
Content-Type: multipart/form-data

file: <docx文件>
image_0: <可选图片>
```

#### 生成指令

```http
POST /api/homework/generate
Content-Type: application/json

{
  "fileId": "文件ID",
  "format": "kuixiang|svg|gcode",
  "seed": 42,
  "config": { ... },
  "apiUrl": "https://api.deepseek.com/v1",
  "apiKey": "sk-xxx",
  "modelId": "deepseek-chat"
}
```

#### 预览布局（支持SSE流式输出）

```http
POST /api/homework/preview
Content-Type: application/json

{
  "fileId": "文件ID",
  "config": { ... },
  "stream": true,
  "apiUrl": "https://api.deepseek.com/v1",
  "apiKey": "sk-xxx",
  "modelId": "deepseek-chat"
}
```

SSE事件格式：

```
event: progress
data: {"stage": "analyzing", "message": "正在分析第2题...", "timestamp": 1234567890}

event: result
data: {"success": true, "data": {"previewSvg": "...", "questionPlans": [...], "pageCount": 1}}
```

#### 分析图片

```http
POST /api/homework/analyze-image
Content-Type: multipart/form-data

image: <图片文件>
questionText: <题目文字>
config: <JSON配置（可选）>
```

#### 下载输出文件

```http
GET /api/homework/download/{fileId}
```

#### 演示接口

```http
GET /api/homework/demo
```

### LLM调用

```http
POST /api/llm/call
Content-Type: application/json

{
  "messages": [{"role": "user", "content": "..."}],
  "apiUrl": "https://api.deepseek.com/v1",
  "apiKey": "sk-xxx",
  "modelId": "deepseek-chat",
  "stream": false,
  "response_format": {"type": "json_object"}
}
```

支持SSE流式输出（`stream: true`）。

### 机器人控制

#### 列出可用串口

```http
GET /api/robot/ports
```

响应：

```json
{
  "success": true,
  "data": {
    "ports": [
      {"port": "COM3", "description": "USB Serial Device", "hwid": "USB VID:PID..."}
    ],
    "pyserialAvailable": true
  }
}
```

#### 连接机器人

```http
POST /api/robot/connect
Content-Type: application/json

{
  "port": "COM3",
  "baudrate": 115200
}
```

#### 断开连接

```http
POST /api/robot/disconnect
```

#### 查询连接状态

```http
GET /api/robot/status
```

响应：

```json
{
  "success": true,
  "data": {
    "connected": true,
    "port": "COM3",
    "baudrate": 115200,
    "pyserialAvailable": true
  }
}
```

#### 发送指令

```http
POST /api/robot/send
Content-Type: application/json

{
  "command": "G0 X10 Y20"
}
```

或通过fileId发送已生成的GCode文件：

```http
POST /api/robot/send
Content-Type: application/json

{
  "fileId": "输出文件ID"
}
```

### 健康检查

```http
GET /api/health
```

---

## 配置说明

所有配置参数通过前端界面修改，自动持久化到浏览器localStorage（key: `ai-writing-robot-config`）。

### 纸张配置

| 参数 | 说明 | 默认值 |
|------|------|--------|
| paperWidth | 纸张宽度(mm) | 210 |
| paperHeight | 纸张高度(mm) | 297 |
| marginTop | 上边距(mm) | 20 |
| marginBottom | 下边距(mm) | 20 |
| marginLeft | 左边距(mm) | 15 |
| marginRight | 右边距(mm) | 15 |
| paperTemplate | 纸张模板 | blank |

### 字体配置

| 参数 | 说明 | 默认值 |
|------|------|--------|
| fontSizeTitle | 标题字号(mm) | 5.0 |
| fontSizeBody | 正文字号(mm) | 4.2 |
| fontSizeLabel | 标注字号(mm) | 3.5 |
| lineSpacing | 行间距(mm) | 6.3 |
| questionSpacing | 题目间距(mm) | 15 |
| charSpacing | 字间距(mm) | 1.2 |
| charSpacingVar | 字间距随机变化(mm) | 0.15 |
| baselineWobble | 基线抖动(mm) | 0.3 |
| slant | 倾斜角度(弧度) | 0.02 |

### 机器人配置

| 参数 | 说明 | 默认值 |
|------|------|--------|
| penUpHeight | 抬笔高度(mm) | 3.0 |
| penDownHeight | 落笔高度(mm) | 0 |
| travelSpeed | 移动速度(mm/s) | 80 |
| drawSpeed | 书写速度(mm/s) | 25 |

### 手绘效果配置

| 参数 | 说明 | 默认值 |
|------|------|--------|
| handDrawnAmplitude | 抖动幅度(mm) | 0.4 |
| handDrawnFrequency | 抖动频率 | 0.1 |
| handDrawnCornerExaggeration | 拐角夸张系数 | 1.5 |

### AI模型配置

| 参数 | 说明 | 默认值 |
|------|------|--------|
| providerId | 服务商标识 | deepseek |
| llmBaseUrl | API地址 | https://api.deepseek.com/v1 |
| llmApiKey | API密钥 | （需配置） |
| llmModel | 模型名称 | deepseek-coder |

### 输出配置

| 参数 | 说明 | 默认值 |
|------|------|--------|
| outputFormat | 输出格式 | kuixiang |
| seed | 随机种子 | null（随机） |

---

## 打包和发布流程

### 本地打包

```bash
# 构建Windows安装包（NSIS安装程序 + 便携版）
npm run electron:build:win
```

生成的文件位于 `release-build/` 目录：
- `AI写字机器人-Setup-{version}-x64.exe` - NSIS安装程序
- `AI写字机器人-{version}-portable.exe` - 便携版

### CI/CD自动构建

项目使用GitHub Actions实现自动化构建和发布，流程如下：

1. **代码检查**（所有PR和main分支推送触发）
   - ESLint代码检查
   - TypeScript类型检查

2. **Python测试**（所有PR和main分支推送触发）
   - 安装Python依赖
   - 运行核心模块导入测试

3. **构建安装包**（仅打tag触发）
   - 当推送 `v*` 格式的tag时触发
   - 执行前端构建和Electron打包
   - 生成Windows安装包并上传为artifact

4. **创建Release**（仅打tag触发）
   - 自动创建GitHub Release
   - 附带安装包exe文件
   - 自动生成Release Notes

发布新版本的完整流程：

```bash
# 1. 更新package.json中的version
# 2. 提交更改
git commit -am "chore: bump version to x.x.x"

# 3. 打tag
git tag vx.x.x

# 4. 推送代码和tag
git push origin main --tags
```

GitHub Actions会自动完成构建和发布。

---

## 技术架构

```
+=====================================================================+
|                    Electron 桌面应用 (Windows)                        |
|                                                                      |
|  +---------------------------------------------------------------+  |
|  |              渲染进程 (Chromium)                                |  |
|  |                                                                |  |
|  |  +------------------+  +------------------------------------+  |  |
|  |  | 左侧浮动面板      |  | 右侧画布区域                       |  |  |
|  |  |                  |  |                                    |  |  |
|  |  | - 文件上传        |  | +--------------------------------+ |  |  |
|  |  | - 题目列表        |  | | PreviewCanvas                  | |  |  |
|  |  | - 纸张/字体设置   |  | | (SVG预览, 平移/缩放)           | |  |  |
|  |  | - 机器人设置      |  | |                                | |  |  |
|  |  | - AI模型设置      |  | | AnswerReview                  | |  |  |
|  |  | - 输出格式设置    |  | | (答案审核/编辑)                | |  |  |
|  |  | - 手绘效果设置    |  | +--------------------------------+ |  |  |
|  |  |                  |  |                                    |  |  |
|  |  |                  |  | +--------------------------------+ |  |  |
|  |  |                  |  | | GeneratePanel (底部操作栏)      | |  |  |
|  |  |                  |  | +--------------------------------+ |  |  |
|  |  +------------------+  +------------------------------------+  |  |
|  |                                                                |  |
|  |  React + Zustand + TailwindCSS                                 |  |
|  |  状态持久化: localStorage                                       |  |
|  |  API通信: ApiClient (重试/超时/SSE流式)                         |  |
|  +---------------------------------------------------------------+  |
|                         |  IPC (preload.cjs)                        |
|  +---------------------------------------------------------------+  |
|  |              主进程 (Node.js)                                   |  |
|  |                                                                |  |
|  |  - 窗口管理                                                    |  |
|  |  - Python进程生命周期管理                                       |  |
|  |  - 自动检测Python解释器                                         |  |
|  |  - 自动分配空闲端口                                             |  |
|  |  - 文件对话框 / 保存文件                                        |  |
|  |  - IPC桥接 (get-server-url, upload, generate, ...)             |  |
|  +---------------------------------------------------------------+  |
+=====================================================================+
                          |  HTTP (127.0.0.1:{port})
                          v
+=====================================================================+
|                    Python 后端服务                                    |
|                                                                      |
|  +------------------+  +------------------+  +--------------------+  |
|  | 文档解析          |  | AI分析引擎        |  | 图像分析模块        |  |
|  | (python-docx)    |  | (LLM Agent)      |  | (多模态LLM)        |  |
|  |                  |  | 重试/超时保护     |  |                    |  |
|  +------------------+  +------------------+  +--------------------+  |
|                                                                      |
|  +------------------+  +------------------+  +--------------------+  |
|  | 排版引擎          |  | 效果处理          |  | 指令生成器          |  |
|  | (精确布局)        |  | (手绘模拟)        |  | (kuixiang/SVG/     |  |
|  |                  |  | (文字变形)        |  |  GCode)            |  |
|  +------------------+  +------------------+  +--------------------+  |
|                                                                      |
|  +------------------+  +------------------+                          |
|  | 机器人连接        |  | 速率限制          |                          |
|  | (pyserial串口)   |  | (60次/分钟)       |                          |
|  | GCode逐行发送     |  | SSRF防护          |                          |
|  +------------------+  +------------------+                          |
+=====================================================================+
```

---

## 命令行用法

除了桌面应用，项目也支持纯命令行方式运行：

```bash
# 演示模式（无需Word文档，使用硬编码数据）
python main.py --demo

# 生成作业指令
python main.py --input 作业.docx --format kuixiang --seed 42

# 仅解析Word文档（不生成指令）
python main.py --input 作业.docx --parse-only

# 预览答案布局（不生成指令）
python main.py --input 作业.docx --preview

# 指定输出路径和JSON配置
python main.py --input 作业.docx --output result.svg --config config.json

# 以JSON格式输出结果
python main.py --input 作业.docx --json-output
```

### 命令行参数

| 参数 | 说明 |
|------|------|
| `--input` | Word文档路径 |
| `--format` | 输出格式：`kuixiang`（默认）、`svg`、`gcode` |
| `--seed` | 手绘效果随机种子（整数） |
| `--output` | 输出文件路径 |
| `--demo` | 演示模式，无需Word文档 |
| `--config` | JSON配置文件路径 |
| `--json-output` | 以JSON格式输出结果到stdout |
| `--parse-only` | 仅解析文档，不生成指令 |
| `--preview` | 预览答案布局，不生成指令 |

---

## AI Agent 流水线

生成过程分为7个阶段，每个阶段由独立的模块负责：

```
Word文档
   │
   ▼
[1/7] 文档解析 (parsers/homework_parser.py)
   │  python-docx 提取题目文本、类型、图片
   │  识别题目编号、类型标签、附加要求
   ▼
[2/7] 多模态图像分析 (analyzers/image_analyzer.py)
   │  对题目中的图片调用多模态LLM
   │  识别图形类型（UML图、电路图、机械图等）
   │  提取图形参数和元素
   ▼
[3/7] LLM智能分析 (analyzers/homework_analyzer.py)
   │  HomeworkAnalyzer 调用LLM生成答案
   │  3次重试 + 60s超时保护
   │  输出 layout_plan（排版方案）和 drawing_commands
   ▼
[4/7] AI Agent精确排版 (analyzers/agent/ + layout/precision_layout.py)
   │  LayoutDesigner → PrecisionLayout
   │  相对位置布局计算、自动换页
   │  溢出检测与自动修正
   ▼
[5/7] 排版引擎路径生成 (layout/layout_engine.py)
   │  将布局命令转换为笔画路径
   │  Hershey矢量字体渲染
   │  符号库绘制（电路符号、机械符号）
   ▼
[6/7] 字体变形 + 手绘风格化 (effects/)
   │  TextDeformer: 字间距/基线抖动/倾斜
   │  HandDrawnEffect: 笔画抖动/拐角夸张
   │  StyleStrategist: 根据题型推荐风格参数
   ▼
[7/7] 生成机器人指令 (output/command_generator.py)
   │  kuixiang格式 / SVG / GCode
   │  估算书写时间
   ▼
输出文件
```

### AI Agent 模块说明

| 模块 | 职责 |
|------|------|
| `HomeworkAnalyzer` | 调用LLM分析题目，生成答案内容和排版方案 |
| `LayoutDesigner` | 将LLM输出的排版方案转换为结构化布局命令 |
| `StyleStrategist` | 根据题目类型和纸张模板推荐手绘风格参数 |
| `PrecisionLayout` | 精确计算元素位置，处理换页和溢出 |
| `ImageAnalyzer` | 多模态LLM分析题目图片，提取图形元素 |

---

## 开发指南

### 运行测试

```bash
# Python测试
python tests/test_all.py

# 前端类型检查
npm run check

# 前端代码检查
npm run lint
```

### 开发模式

```bash
# 前后端分离开发（推荐）
python electron/server.py --port 3002   # 终端1：启动后端
npm run client:dev                       # 终端2：启动前端

# Electron开发模式
npm run electron:dev
```

### 构建桌面应用

```bash
# Windows安装包
npm run electron:build:win

# 通用构建命令
npm run electron:build
```

### 代码规范

- 前端：ESLint + TypeScript严格模式
- Python：PEP 8
- 组件命名：PascalCase（React组件），camelCase（工具函数）
- 状态管理：Zustand + persist中间件

### 添加新的API接口

1. 在 `electron/server.py` 中实现处理函数 `_handle_xxx(handler)`
2. 在 `routes` 字典中注册路由
3. 在 `src/lib/api.ts` 的 `ApiClient` 类中添加前端调用方法
4. 如需IPC桥接，在 `electron/main.cjs` 中添加 `ipcMain.handle`
5. 在 `electron/preload.cjs` 中暴露API

### Electron IPC 通信机制

前端渲染进程与Python后端的通信链路：

```
React组件 → useXxxStore → ApiClient → IPC(preload.cjs) → main.cjs → HTTP → server.py
```

- **开发模式**：ApiClient直接通过HTTP请求Python服务器（`http://127.0.0.1:{port}`）
- **Electron模式**：ApiClient通过`window.electronAPI`调用IPC，由main.cjs转发HTTP请求

preload.cjs实现了安全层：
- 通道白名单验证
- 参数数量限制（`maxArgs`）
- 参数类型校验（`validate`函数）
- 速率限制（60次/分钟）

### 配置系统

配置参数在前端和后端之间通过camelCase ↔ UPPER_SNAKE_CASE映射传递：

| 前端(camelCase) | 后端(UPPER_SNAKE_CASE) | 说明 |
|-----------------|----------------------|------|
| paperWidth | PAPER_WIDTH | 纸张宽度 |
| fontSizeBody | FONT_SIZE_BODY | 正文字号 |
| llmBaseUrl | LLM_BASE_URL | API地址 |
| ... | ... | 完整映射见 `main.py:load_config_from_dict()` |

配置优先级（从高到低）：
1. 前端界面动态配置（通过API请求体传入）
2. `.env` 环境变量
3. `config.py` 中的默认值

### 打包方式对比

| 命令 | 工具 | 输出 | 说明 |
|------|------|------|------|
| `npm run electron:build:win` | electron-builder | `release-build/` | NSIS安装程序 + 便携版，推荐 |
| `npm run electron:build` | electron-builder | `release-build/` | 通用构建（当前平台） |
| `npm run electron:pack` | electron-packager | `release/` | 开发调试用，仅打包目录 |

---

## 常见问题

### Q: 支持哪些AI模型？

A: 支持所有兼容OpenAI API格式的模型，包括DeepSeek、OpenAI GPT系列、Claude（通过中转）等。在应用界面的"AI模型设置"中配置API地址、密钥和模型名称即可。

### Q: 机器人连接不上怎么办？

A: 请检查以下几点：
1. 确认已安装 `pyserial`：`pip install pyserial`
2. 确认机器人已通过USB连接，并在设备管理器中显示COM端口
3. 在应用界面的"机器人设置"中点击"刷新端口"，选择正确的COM口
4. 确认波特率与机器人设置一致（默认115200）

### Q: 如何训练自己的手写字体？

A: 目前使用Hershey矢量字体+随机变形模拟手写效果。可通过调整"手绘效果设置"中的抖动幅度和拐角夸张系数来改变效果。如需更真实效果，可参考 [handwriting-synthesis](https://github.com/sjvasquez/handwriting-synthesis) 项目。

### Q: 支持哪些写字机器人？

A: 支持奎享写字机器人（kuixiang格式/SVG格式）和标准GCode协议的CNC写字机。通过串口连接后可直接发送GCode指令。

### Q: 题目图片识别不准确怎么办？

A: 可以手动附加图片并在审核步骤编辑答案。图像识别功能仍在优化中，建议使用多模态能力较强的模型（如DeepSeek V3、GPT-4o等）。

### Q: 打包后的应用找不到Python怎么办？

A: 打包后的应用会自动检测系统Python。请确保目标机器已安装Python 3.10+，并安装了 `requirements.txt` 中的依赖和 `pyserial`。建议安装时勾选"Add Python to PATH"。

### Q: 配置保存在哪里？

A: 所有配置参数保存在浏览器的localStorage中（key: `ai-writing-robot-config`）。在Electron桌面应用中，数据存储在Chromium的用户数据目录下。点击界面右上角的"重置默认"按钮可恢复默认配置。

### Q: 开发模式下API请求失败怎么办？

A: 请检查以下几点：
1. 确认Python后端已启动：`python electron/server.py --port 3002`
2. 确认前端Vite开发服务器代理配置正确（`vite.config.ts`中的proxy）
3. 检查浏览器控制台的网络请求，确认请求地址和端口
4. 确认已配置有效的LLM API密钥

### Q: 如何更换AI模型？

A: 在应用界面的"AI模型设置"中修改API地址、密钥和模型名称即可。支持所有兼容OpenAI API格式的服务商，如DeepSeek、OpenAI、通义千问等。修改后立即生效，无需重启。

### Q: 生成结果中图形绘制不正确怎么办？

A: 图形绘制依赖LLM的分析结果，可能因模型能力限制导致不准确。建议：
1. 在答案审核步骤手动编辑修正
2. 使用能力更强的模型（如GPT-4o、DeepSeek V3）
3. 调整手绘效果参数降低抖动幅度，使图形更规整

---

## 贡献指南

欢迎提交Issue和Pull Request！

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开 Pull Request

提交PR前请确保：

- `npm run lint` 和 `npm run check` 通过
- Python代码符合PEP 8规范
- 新增功能包含对应的测试用例

---

## 许可证

[MIT](LICENSE) Copyright (c) 2026 ph2-5
