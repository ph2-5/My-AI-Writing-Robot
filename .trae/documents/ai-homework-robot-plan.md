# AI自动写作业系统 - 实施计划

## 项目概述

基于设计文档，构建一个完整的 AI 自动写作业系统：上传 Word 文档 → AI 分析题目 → 生成手写风格路径 → 输出写字机器人（奎享雕刻）可执行的指令文件。

---

## 项目结构

```
ai写字机器人/
├── main.py                    # 系统入口
├── requirements.txt           # 依赖清单
├── config.py                  # 全局配置（API密钥、纸张尺寸等）
├── parsers/
│   ├── __init__.py
│   └── homework_parser.py     # 第一层：Word文档解析
├── analyzers/
│   ├── __init__.py
│   └── homework_analyzer.py   # 第二层：LLM智能分析
├── layout/
│   ├── __init__.py
│   ├── layout_engine.py       # 第三层：排版引擎
│   └── models.py              # Point/Stroke 数据模型
├── effects/
│   ├── __init__.py
│   └── hand_drawn.py          # 第四层：手绘风格化
├── output/
│   ├── __init__.py
│   └── command_generator.py   # 第五层：机器人指令输出
├── fonts/
│   └── hershey.py             # Hershey单线字体解析
└── tests/
    ├── test_parser.py
    ├── test_analyzer.py
    ├── test_layout.py
    ├── test_effects.py
    └── test_output.py
```

---

## 实施步骤

### 步骤1：项目初始化与基础设施

- 创建项目目录结构（上述所有包和 `__init__.py`）
- 创建 `requirements.txt`，包含以下依赖：
  - `python-docx`：Word文档解析
  - `numpy`：数值计算
  - `openai`：LLM API调用（兼容 DeepSeek/Qwen 等 OpenAI 兼容接口）
  - `lxml`：SVG/XML 生成
- 创建 `config.py`，包含：
  - 纸张尺寸常量（A4: 210x297mm）
  - 页边距默认值
  - 字体大小默认值
  - LLM API 配置（base_url, model, api_key 占位）
  - 机器人参数（抬笔/落笔高度、速度等）

### 步骤2：数据模型定义 (`layout/models.py`)

- 实现 `Point` 数据类：x, y 坐标（mm单位）
- 实现 `Stroke` 数据类：points 列表、pen_down 标志、speed 参数
- 实现 `Question` 数据类：题号、类型、文本、要求列表
- 实现 `LayoutResult` 数据类：排版结果（strokes 列表 + 页面信息）

### 步骤3：第一层 - Word文档解析模块 (`parsers/homework_parser.py`)

- 实现 `HomeworkParser` 类：
  - `__init__(docx_path)`：初始化，加载文档
  - `parse()` → 返回结构化数据（raw_text, questions, images, format_rules）
  - `_is_question_header(text)`：正则匹配题目编号（1. / 第1题 / 本次课作业共N道题）
  - `_extract_question(text, style)`：提取题号、类型、要求
  - `_detect_question_type(text)`：关键词匹配识别题目类型（uml_usecase/uml_class/uml_sequence/uml_activity/essay）
  - `_extract_requirements(text)`：提取格式要求（手写/拍照上传/用例图/Rational Rose等）
  - `_extract_format(text)`：提取文档级格式要求
  - 图片提取：遍历 `doc.part.rels` 获取嵌入图片

### 步骤4：第二层 - LLM智能分析模块 (`analyzers/homework_analyzer.py`)

- 实现 `HomeworkAnalyzer` 类：
  - `__init__(llm_client)`：接收 OpenAI 兼容的 API 客户端
  - `_system_prompt()`：定义系统提示词（UML建模专家+排版设计师角色，A4排版规则，JSON输出格式）
  - `_build_analysis_prompt(question_data)`：构建针对具体题目的分析提示
  - `analyze_question(question_data)` → 返回 JSON（answer_content, layout_design, drawing_commands, metadata）
  - `batch_analyze(questions)`：批量分析所有题目
- 支持的题目类型分析：
  - UML用例图：列出参与者/用例/关系，设计精确位置坐标
  - UML类图：类结构/属性/方法/关系
  - 文字题：生成答案+段落布局+每行起始坐标
- 排版约束写入提示词：
  - 手写机器人单笔书写，不能自动换色
  - 图形和文字不能重叠
  - 整体美观，符合手写习惯

### 步骤5：第三层 - 排版引擎模块 (`layout/layout_engine.py`)

- 实现 `LayoutEngine` 类：
  - `__init__(paper_width=210, paper_height=297)`：初始化纸张尺寸和可写区域
  - `calculate_layout(analysis_results)` → 返回 Stroke 列表
    - 遍历每道题，检查是否需要换页
    - 调用 `_generate_strokes` 生成路径
    - 更新当前 Y 位置（题间距 15mm）
  - `_estimate_height(commands)`：估算题目所需高度
  - `_generate_strokes(commands, offset_y)`：将绘图命令转换为笔画路径
    - `text` → `_text_to_path`（调用 Hershey 字体模块）
    - `actor` → `_draw_actor`（绘制UML参与者小人：头/身体/手臂/腿）
    - `usecase` / `ellipse` → `_draw_ellipse`（参数方程生成椭圆路径）
    - `line` → 两点直线
    - `dashed_line` → `_draw_dashed_line`（交替绘制/间隔段）
    - `arrow` → 直线 + `_draw_arrow_head`（三角形箭头头部）
  - `_text_to_path(text, x, y, font_size)`：调用 Hershey 字体模块将文字转为路径
  - `_draw_actor(x, y, height)`：绘制参与者小人路径
  - `_draw_ellipse(cx, cy, rx, ry, segments=60)`：椭圆路径生成
  - `_draw_dashed_line(x1, y1, x2, y2, dash, gap)` → 返回多个 Stroke
  - `_draw_arrow_head(x, y, from_x, from_y, size)` → 返回箭头路径

### 步骤6：Hershey单线字体模块 (`fonts/hershey.py`)

- 实现 Hershey 字体解析器：
  - 内嵌常用 ASCII 字符和中文基本笔画的 Hershey 字体数据
  - `get_char_strokes(char, x, y, font_size)` → 返回 Point 列表
  - 支持字符间距自动计算
- 备选方案：如果 Hershey 字体覆盖不足，集成 TTF 字体轮廓提取（使用 `fontTools` 库），将轮廓中心线化

### 步骤7：第四层 - 手绘风格化模块 (`effects/hand_drawn.py`)

- 实现 `HandDrawnEffect` 类：
  - `__init__(seed=None)`：可选随机种子保证可重复
  - `apply(strokes)` → 返回处理后的 Stroke 列表
    - 对每个 pen_down 的 stroke 应用抖动
    - 抬笔移动不抖动
  - 抖动策略：
    - 基础抖动：amplitude=0.4mm，随机偏移
    - 拐角增强：检测角度变化 >30° 的拐角，抖动幅度 ×1.5
    - 速度微变：每笔速度 ×random(0.9, 1.1)
  - `_angle_change(p1, p2, p3)`：计算三点间角度变化
  - `_smooth(points, factor=0.2)`：轻微平滑（减少锯齿但保留抖动感）

### 步骤8：第五层 - 机器人指令输出模块 (`output/command_generator.py`)

- 实现 `RobotCommandGenerator` 类：
  - `__init__(platform='kuixiang')`：支持 'kuixiang' / 'svg' / 'gcode'
  - `generate(strokes)` → 返回指令字符串
  - `_generate_kuixiang(strokes)`：
    - 生成 SVG 格式，包含奎享雕刻专用元数据（data-software, data-version）
    - 添加 handdrawn 样式（stroke-width: 1.2, round linecap/join）
    - 将每个 Stroke 转换为 SVG `<path>` 元素
    - 保留 data-speed 属性供奎享雕刻读取
  - `_generate_svg(strokes)`：标准 SVG 输出（无平台专用属性）
  - `_generate_gcode(strokes)`：
    - G21 毫米单位 / G90 绝对坐标 / G28 归位
    - 每笔：抬笔移动 → 落笔 → 逐点绘制
    - 结束抬笔 + 归位

### 步骤9：系统入口与集成 (`main.py`)

- 实现 `main(docx_path, output_format='kuixiang')` 函数：
  1. 解析 Word → `HomeworkParser`
  2. LLM 分析 → `HomeworkAnalyzer`
  3. 排版计算 → `LayoutEngine`
  4. 手绘风格化 → `HandDrawnEffect`
  5. 生成指令 → `RobotCommandGenerator`
  6. 保存输出文件
  7. 打印预计书写时间
- 添加命令行参数解析（argparse）：
  - `--input`：Word 文档路径
  - `--format`：输出格式（kuixiang/svg/gcode）
  - `--seed`：手绘效果随机种子
  - `--output`：输出文件路径

### 步骤10：测试与验证

- 为每个模块编写单元测试：
  - `test_parser.py`：测试题目识别、类型检测、图片提取
  - `test_analyzer.py`：测试 LLM 调用（mock API 响应）
  - `test_layout.py`：测试排版计算、路径生成、换页逻辑
  - `test_effects.py`：测试手绘效果、抖动幅度、可重复性
  - `test_output.py`：测试 SVG/G-code 输出格式正确性
- 集成测试：用示例 Word 文档跑完整流程

---

## 关键技术决策

| 决策点 | 方案 | 理由 |
|--------|------|------|
| LLM 接口 | OpenAI 兼容 API | 兼容 DeepSeek/Qwen/GPT/Claude 等 |
| 字体方案 | Hershey 单线字体 | 天然适合笔画路径，无需填充 |
| 输出格式 | SVG（奎享雕刻兼容） | 奎享雕刻支持直接导入 SVG |
| 数值计算 | numpy | 椭圆/角度/平滑计算的基础 |
| XML 生成 | lxml | SVG 生成比 xml.etree 更高效 |

---

## 实施优先级

1. **P0（核心流程）**：数据模型 → 排版引擎 → 指令输出 → main.py 集成
2. **P1（智能分析）**：Word 解析 → LLM 分析模块
3. **P2（效果增强）**：Hershey 字体 → 手绘风格化
4. **P3（质量保障）**：单元测试 → 集成测试

先跑通核心流程（用硬编码测试数据），再逐步接入 Word 解析和 LLM 分析，最后添加手绘效果和测试。
