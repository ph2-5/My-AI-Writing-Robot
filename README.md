# AI写字机器人

基于大语言模型的智能作业生成与机器人控制系统。将Word文档中的作业题目通过AI分析、智能排版，最终生成可供写字机器人执行的指令。

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## 功能特性

### 核心功能
- **Word文档解析**：支持 `.docx` 文件上传，自动识别题目类型
- **AI智能分析**：通过LLM分析题目、生成答案和排版方案
- **多模态图像理解**：支持题目图片解析，识别图形类型和参数
- **精确排版系统**：相对位置布局、自动换页、溢出检测
- **手绘效果模拟**：智能识别图形类型，模拟真实手写效果
- **答案审核功能**：支持人工审核和编辑AI生成的答案

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
- Python 3.8+
- Node.js 16+
- Windows / macOS / Linux

### 1. 克隆项目

```bash
git clone https://github.com/your-username/ai-writing-robot.git
cd ai-writing-robot
```

### 2. 安装Python依赖

```bash
pip install -r requirements.txt
```

### 3. 安装前端依赖

```bash
cd src
npm install
cd ..
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
LLM_MODEL=deepseek-chat
```

> 支持DeepSeek、OpenAI等兼容OpenAI API格式的服务商

### 5. 启动服务

**方式一：开发模式**

```bash
# 终端1：启动后端
python electron/server.py --port 3002

# 终端2：启动前端
cd src
npm run dev
```

**方式二：桌面应用**

```bash
# 构建前端
cd src
npm run build

# 启动Electron
cd ..
npm run electron:dev
```

---

## 使用指南

### 第一步：上传文档

1. 点击上传区域选择 `.docx` 文件
2. 如题目包含图片，点击"添加图片"附加图片文件
3. 系统会自动解析文档内容并识别题目类型
4. 上传成功后点击"下一步"

### 第二步：配置参数

根据需求调整以下参数：

| 参数类别 | 说明 |
|---------|------|
| 纸张设置 | 纸张尺寸、边距 |
| 字体设置 | 字号、行间距、字间距 |
| 机器人设置 | 抬笔高度、移动速度、书写速度 |
| 手绘效果 | 抖动幅度、拐角夸张程度 |
| AI模型 | API地址、密钥、模型名称 |

> 配置会自动保存到浏览器本地存储

### 第三步：预览效果

1. 点击"生成预览"
2. 等待AI分析题目并生成排版方案
3. 使用缩放工具查看细节
4. 满意后点击"下一步"

### 第四步：审核确认

1. 查看每道题的AI生成答案
2. 点击"编辑"修改不准确的答案
3. 点击"确认正确"标记审核通过
4. 选择输出格式（奎享/SVG/GCode）
5. 点击"生成指令"下载文件

---

## 项目结构

```
ai-writing-robot/
├── src/                          # 前端源码（React + TypeScript）
│   ├── components/               # UI组件
│   │   ├── UploadStep.tsx        # 上传步骤
│   │   ├── ConfigStep.tsx        # 配置步骤
│   │   ├── PreviewStep.tsx       # 预览步骤
│   │   └── ReviewStep.tsx        # 审核步骤
│   ├── stores/                   # 状态管理（Zustand）
│   ├── hooks/                    # 自定义Hooks
│   └── lib/                      # 工具函数
│
├── electron/                     # Electron桌面应用
│   ├── main.cjs                  # 主进程
│   ├── preload.cjs               # 预加载脚本
│   └── server.py                 # 嵌入式HTTP服务
│
├── analyzers/                    # AI分析模块
│   ├── image_analyzer.py         # 多模态图像分析
│   ├── homework_analyzer.py      # 作业分析器
│   └── agent/                    # AI Agent
│       ├── layout_designer.py    # 布局设计
│       └── style_strategist.py   # 风格策略
│
├── layout/                       # 排版引擎
│   ├── layout_engine.py          # 基础布局
│   ├── precision_layout.py       # 精确布局计算
│   └── preview_renderer.py       # 预览渲染
│
├── symbols/                      # 标准符号库
│   ├── circuit_symbols.py        # 电路图符号
│   └── mechanical_symbols.py     # 机械制图符号
│
├── effects/                      # 效果处理
│   ├── hand_drawn.py             # 手绘效果
│   └── text_deformer.py          # 文字变形
│
├── parsers/                      # 文档解析
│   └── homework_parser.py        # Word文档解析
│
├── output/                       # 输出生成
│   └── command_generator.py      # 指令生成器
│
├── tests/                        # 测试用例
│   └── test_all.py               # 综合测试
│
├── config.py                     # 配置文件
├── main.py                       # 命令行入口
├── requirements.txt              # Python依赖
└── package.json                  # Node依赖
```

---

## API接口

### 上传文档
```http
POST /api/homework/upload
Content-Type: multipart/form-data

file: <docx文件>
image_0: <可选图片>
```

### 生成指令
```http
POST /api/homework/generate
Content-Type: application/json

{
  "fileId": "文件ID",
  "format": "kuixiang|svg|gcode",
  "seed": 42,
  "config": { ... }
}
```

### 预览布局（支持SSE流式输出）
```http
POST /api/homework/preview
Content-Type: application/json

{
  "fileId": "文件ID",
  "config": { ... },
  "stream": true
}
```

### 分析图片
```http
POST /api/homework/analyze-image
Content-Type: multipart/form-data

image: <图片文件>
questionText: <题目文字>
```

---

## 配置说明

### 纸张配置
| 参数 | 说明 | 默认值 |
|------|------|--------|
| paperWidth | 纸张宽度(mm) | 210 |
| paperHeight | 纸张高度(mm) | 297 |
| marginTop | 上边距(mm) | 20 |
| marginBottom | 下边距(mm) | 20 |
| marginLeft | 左边距(mm) | 15 |
| marginRight | 右边距(mm) | 15 |

### 字体配置
| 参数 | 说明 | 默认值 |
|------|------|--------|
| fontSizeTitle | 标题字号(mm) | 5.0 |
| fontSizeBody | 正文字号(mm) | 4.2 |
| fontSizeLabel | 标注字号(mm) | 3.5 |
| lineSpacing | 行间距(mm) | 6.3 |

### 机器人配置
| 参数 | 说明 | 默认值 |
|------|------|--------|
| penUpHeight | 抬笔高度(mm) | 5 |
| penDownHeight | 落笔高度(mm) | 0 |
| travelSpeed | 移动速度(mm/s) | 80 |
| drawSpeed | 书写速度(mm/s) | 25 |

### 手绘效果配置
| 参数 | 说明 | 默认值 |
|------|------|--------|
| handDrawnAmplitude | 抖动幅度(mm) | 0.3 |
| handDrawnCornerExaggeration | 拐角夸张系数 | 2.0 |

---

## 开发指南

### 运行测试

```bash
python tests/test_all.py
```

### 构建桌面应用

```bash
# Windows
npm run build:electron

# 所有平台
npm run build:electron:all
```

### 代码规范

- 前端：ESLint + Prettier
- Python：PEP 8

---

## 常见问题

### Q: 支持哪些AI模型？
A: 支持所有兼容OpenAI API格式的模型，包括DeepSeek、OpenAI GPT系列、Claude（通过中转）等。

### Q: 如何训练自己的手写字体？
A: 目前使用Hershey矢量字体+随机变形模拟手写效果。如需更真实效果，可参考 [handwriting-synthesis](https://github.com/sjvasquez/handwriting-synthesis) 项目。

### Q: 支持哪些写字机器人？
A: 目前支持奎享写字机器人（SVG格式）和标准GCode协议的CNC写字机。

### Q: 题目图片识别不准确怎么办？
A: 可以手动附加图片并在审核步骤编辑答案。图像识别功能仍在优化中。

---

## 技术架构

```
┌─────────────────────────────────────────────────────────────┐
│                        前端界面 (React + TypeScript)          │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────┐ │
│  │  四步向导     │  │  配置面板     │  │  预览/审核/下载     │ │
│  │  上传→配置    │  │  手风琴式     │  │  缩放/编辑/确认     │ │
│  │  →预览→审核   │  │              │  │                    │ │
│  └──────────────┘  └──────────────┘  └────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      后端服务 (Python)                        │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────┐ │
│  │  文档解析     │  │  AI分析引擎   │  │  图像分析模块       │ │
│  │  (docx)      │  │  (LLM Agent) │  │  (DeepSeek V4 Pro) │ │
│  └──────────────┘  └──────────────┘  └────────────────────┘ │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────┐ │
│  │  排版引擎     │  │  效果处理     │  │  指令生成器         │ │
│  │  (精确布局)   │  │  (手绘模拟)   │  │  (SVG/GCode)       │ │
│  └──────────────┘  └──────────────┘  └────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

---

## 更新日志

### v1.0.0 (2025-05-28)
- 全新四步向导式UI设计
- 添加多模态图像理解模块
- 增强题型识别（机械制图、电路图、数学图形）
- 新增图形原语（矩形、圆、圆弧、贝塞尔曲线）
- 添加电路图和机械制图标准符号库
- 优化手绘效果算法
- 添加答案审核/编辑功能
- 配置持久化（localStorage）

---

## 贡献指南

欢迎提交Issue和Pull Request！

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开 Pull Request

---

## 许可证

[MIT](LICENSE) © 2025 AI Writing Robot

---

## 致谢

- [Hershey字体](http://paulbourke.net/dataformats/hershey/) - 基础矢量字体
- [handwriting-synthesis](https://github.com/sjvasquez/handwriting-synthesis) - 手写生成参考
- [DeepSeek](https://deepseek.com/) - AI模型支持
