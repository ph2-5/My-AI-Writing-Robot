# AI写字机器人 - 前端界面开发计划

## 项目概述

为现有的 Python 后端 AI 写字机器人系统添加 Web 前端界面，使用户能够：
- 通过浏览器上传 Word 文档
- 可视化调整所有参数（纸张尺寸、页边距、字体、机器人参数、手绘效果等）
- 实时预览生成的 SVG 输出
- 下载生成的指令文件（SVG/G-code）

## 技术架构

### 前端
- **React 18 + TypeScript + Vite**
- **Tailwind CSS** 样式
- **Zustand** 状态管理
- **lucide-react** 图标

### 后端
- **Express.js + TypeScript**（ESM 格式）
- 桥接调用现有 Python 模块（通过子进程或直接用 Node.js 重写核心逻辑）
- 文件上传（multer）
- SVG 预览接口

### 通信方式
- 前端 ↔ Express API（REST）
- Express 调用 Python 脚本（`python main.py`）或直接用 Node 实现排版/输出逻辑
- 考虑到现有 Python 代码已完整可用，后端通过 `child_process` 调用 Python 脚本是最务实的方案

## 页面设计

### 单页应用，3个主要区域

| 区域 | 功能 |
|------|------|
| 左侧面板 | 参数调整（纸张/字体/机器人/手绘效果/LLM配置） |
| 中央区域 | SVG 实时预览 + Word 文件上传 |
| 右侧/底部 | 生成结果、下载按钮、日志输出 |

### 参数面板分组

1. **纸张设置**：宽度、高度、上下左右边距
2. **字体设置**：标题字号、正文字号、标注字号、行间距、题间距
3. **机器人参数**：抬笔高度、落笔高度、空移速度、绘制速度
4. **手绘效果**：抖动幅度、拐角增强倍率、随机种子
5. **LLM 配置**：API 地址、API Key、模型名称
6. **输出设置**：输出格式（奎享雕刻/标准SVG/G-code）

## 路由定义

| 路由 | 用途 |
|------|------|
| `/` | 主页面（参数调整 + 文件上传 + 预览 + 下载） |

## API 定义

| 方法 | 路径 | 功能 |
|------|------|------|
| POST | `/api/upload` | 上传 Word 文档，返回解析结果（题目列表） |
| POST | `/api/generate` | 提交参数 + 文件ID，调用 Python 生成，返回 SVG 内容 |
| GET | `/api/download/:fileId` | 下载生成的文件 |
| GET | `/api/demo` | 运行演示模式，返回 SVG 内容 |

### 请求/响应类型

```typescript
interface GenerateRequest {
  fileId: string;
  format: 'kuixiang' | 'svg' | 'gcode';
  seed?: number;
  config: {
    paperWidth: number;
    paperHeight: number;
    marginTop: number;
    marginBottom: number;
    marginLeft: number;
    marginRight: number;
    fontSizeTitle: number;
    fontSizeBody: number;
    fontSizeLabel: number;
    lineSpacing: number;
    questionSpacing: number;
    penUpHeight: number;
    penDownHeight: number;
    travelSpeed: number;
    drawSpeed: number;
    handDrawnAmplitude: number;
    handDrawnCornerExaggeration: number;
    llmBaseUrl: string;
    llmApiKey: string;
    llmModel: string;
  };
}

interface GenerateResponse {
  success: boolean;
  fileId: string;
  svgContent?: string;
  strokeCount: number;
  estimatedTime: number;
  log: string;
}

interface UploadResponse {
  fileId: string;
  questions: Array<{
    number: number;
    type: string;
    text: string;
    requirements: string[];
  }>;
}
```

## 实施步骤

### 步骤1：初始化前端项目
- 使用 `react-express-ts` 模板创建 Vite 项目
- 安装依赖：`multer`（文件上传）、`lucide-react`（图标）

### 步骤2：后端 API 搭建
- 创建 Express 路由：`/api/upload`、`/api/generate`、`/api/download/:fileId`、`/api/demo`
- 实现文件上传（multer，存储到临时目录）
- 实现调用 Python 脚本的桥接逻辑（`child_process.spawn`）
- Python 端添加 JSON 配置文件输入支持（修改 `main.py` 接受 `--config` 参数）

### 步骤3：前端状态管理（Zustand Store）
- 创建 `useConfigStore`：管理所有参数（纸张/字体/机器人/手绘/LLM）
- 创建 `useGenerateStore`：管理文件上传状态、生成进度、结果

### 步骤4：参数面板组件
- `PaperSettings`：纸张尺寸 + 页边距（数字输入 + 滑块）
- `FontSettings`：字体大小 + 间距
- `RobotSettings`：抬笔/落笔/速度参数
- `HandDrawnSettings`：抖动幅度 + 拐角增强 + 随机种子
- `LLMSettings`：API 配置（Key 用密码输入框）
- `OutputSettings`：输出格式选择

### 步骤5：文件上传与题目预览组件
- `FileUpload`：拖拽上传 Word 文档
- `QuestionList`：展示解析出的题目列表

### 步骤6：SVG 预览组件
- `SvgPreview`：内嵌 SVG 实时渲染，支持缩放/平移
- 显示纸张边框和可写区域参考线

### 步骤7：生成与下载
- 生成按钮 + 进度指示
- 日志输出面板
- 下载按钮（SVG/G-code）

### 步骤8：修改 Python 后端支持配置文件输入
- 修改 `main.py`，添加 `--config` 参数接受 JSON 配置文件路径
- 修改 `config.py`，支持从字典加载配置覆盖默认值
- 修改各模块（LayoutEngine、HandDrawnEffect、RobotCommandGenerator）接受动态配置

### 步骤9：集成测试与调优
- 端到端测试：上传 → 调参 → 生成 → 预览 → 下载
- 参数联动验证
- 错误处理与用户提示

## 设计风格

- **工业/工具感**：深色主题，精确的参数控制面板，类似 CNC 控制软件的视觉风格
- **主色**：深灰/炭黑背景 + 琥珀色（amber）强调色
- **字体**：等宽字体用于数值显示，无衬线字体用于标签
- **布局**：左参数面板（可折叠分组）+ 中央预览 + 底部日志
