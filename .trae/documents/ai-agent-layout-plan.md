# AI Agent 智能作业排版布局系统 - 专项完善计划

## 核心目标

将现有系统从「LLM单轮调用生成粗略坐标」升级为「AI Agent 多步推理 + 精确排版布局引擎」，使 LLM 能够像专业排版设计师一样，综合考虑纸张尺寸、字体变形、行间距、图形位置等所有因素，生成可直接执行的精确排版方案。

---

## 一、现有问题诊断

### 1.1 LLM 分析模块问题

| 问题 | 现状 | 影响 |
|------|------|------|
| 单轮调用 | 一次 prompt 直接要求 LLM 输出完整坐标 | LLM 难以同时处理理解题目+生成答案+精确排版，坐标经常不合理 |
| 硬编码排版规则 | 系统提示词中写死 A4/边距/字号 | 用户前端调整参数后，LLM 仍按硬编码规则输出，导致前后端不一致 |
| 无布局验证 | LLM 输出的坐标直接信任，不做碰撞检测 | 文字与图形重叠、超出纸张边界 |
| 无迭代优化 | 排版一次成型，不检查不修正 | 布局不美观、间距不均匀 |
| 坐标精度不足 | LLM 输出整数坐标为主 | 手写效果需要亚毫米级精度 |

### 1.2 排版引擎问题

| 问题 | 现状 | 影响 |
|------|------|------|
| 简单换页 | 只有 Y 坐标溢出检查 | 没有真正的分页，内容被截断 |
| 无自动换行 | 文字按 LLM 给的坐标直接写 | 文字超长时超出纸张右边界 |
| 无对齐逻辑 | 文字、图形位置完全依赖 LLM | 整体排版不整齐 |
| 固定字间距 | `font_size * 1.2` 固定 | 无法模拟真实手写的不均匀间距 |
| 无纸张模板 | 只有空白 A4 | 不支持横线本/方格本/笔记本 |

### 1.3 手绘效果问题

| 问题 | 现状 | 影响 |
|------|------|------|
| 单一抖动 | 只有随机偏移 | 缺少字间距变化、字形微变形、笔锋模拟 |
| 无笔画粗细 | 恒定线宽 | 真实手写有轻重变化 |
| 无上下浮动 | 基线完全水平 | 真实手写有轻微波动 |

---

## 二、AI Agent 架构设计

### 2.1 Agent 工作流（多步推理）

```
┌─────────────────────────────────────────────────────────────┐
│  Step 1: 题目理解 (Planner)                                  │
│  - 解析题目类型、知识点、难度                                 │
│  - 识别特殊要求（手写/拍照/UML图/代码等）                     │
│  - 输出：题目分析摘要                                        │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│  Step 2: 内容生成 (Content Generator)                        │
│  - 根据题目类型生成答案内容                                   │
│  - UML图：生成参与者/用例/类/关系列表                         │
│  - 文字题：生成段落答案                                      │
│  - 代码题：生成代码片段                                      │
│  - 输出：结构化内容（不含坐标）                               │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│  Step 3: 布局规划 (Layout Planner)                           │
│  - 接收用户配置（纸张尺寸、边距、字号、模板类型）              │
│  - 计算可用区域                                              │
│  - 规划每道题的占用区域（文字区+图形区）                      │
│  - 检查是否需要分页                                          │
│  - 输出：区域分配方案（相对位置，非绝对坐标）                 │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│  Step 4: 精确排版 (Precision Layout)                         │
│  - 将相对位置转为绝对 mm 坐标                                │
│  - 文字自动换行计算                                          │
│  - 图形精确位置计算（椭圆中心、线条端点）                     │
│  - 碰撞检测与避让                                            │
│  - 输出：精确 drawing_commands（mm 坐标）                    │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│  Step 5: 布局验证与优化 (Validator)                          │
│  - 检查所有元素是否在纸张范围内                               │
│  - 检查文字与图形是否重叠                                    │
│  - 检查间距是否均匀美观                                      │
│  - 如有问题，返回 Step 4 重新调整                            │
│  - 输出：验证通过的最终布局                                  │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│  Step 6: 字体变形策略生成 (Style Strategist)                 │
│  - 根据题目类型推荐字体变形参数                               │
│  - UML图：规整、少变形                                       │
│  - 文字题：中等变形，模拟自然书写                             │
│  - 手写签名：大变形，高度个性化                               │
│  - 输出：变形参数建议（振幅、字间距变化、浮动等）             │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 Agent 角色定义

| 角色 | 职责 | LLM 调用方式 |
|------|------|-------------|
| **Planner** | 理解题目，制定整体策略 | 单轮调用，输出 JSON |
| **Content Generator** | 生成答案内容 | 单轮/多轮调用，输出结构化内容 |
| **Layout Planner** | 区域分配，相对位置规划 | 单轮调用，接收用户配置参数 |
| **Precision Layout** | 坐标计算，碰撞检测 | **Python 代码执行，不依赖 LLM** |
| **Validator** | 验证布局，发现问题 | Python 代码执行 |
| **Style Strategist** | 推荐字体变形参数 | 单轮调用，输出 JSON |

**关键决策**：Step 4（精确排版）和 Step 5（验证）不通过 LLM，而是用 Python 代码精确计算，避免 LLM 的坐标精度问题。

---

## 三、具体实施项目

### 项目 1：动态配置注入系统（P0）

**问题**：LLM 系统提示词中硬编码了 A4/边距/字号，前端用户调整参数后 LLM 不知道。

**方案**：
- 将用户配置（纸张尺寸、边距、字号、间距、模板类型）动态注入到 LLM 提示词
- 每次调用 LLM 时，将当前配置作为上下文附加

**涉及文件**：
- `analyzers/homework_analyzer.py` — `_system_prompt()` 改为接收 config 参数
- `analyzers/homework_analyzer.py` — `_build_analysis_prompt()` 注入用户配置

```python
# 新接口
def _system_prompt(self, user_config: dict) -> str:
    return f"""你是一位UML建模专家和作业排版设计师。
当前用户配置：
- 纸张尺寸：{user_config['paperWidth']}mm x {user_config['paperHeight']}mm
- 页边距：上{user_config['marginTop']}mm 下{user_config['marginBottom']}mm 左{user_config['marginLeft']}mm 右{user_config['marginRight']}mm
- 可写区域：{writable_w}mm x {writable_h}mm
- 标题字号：{user_config['fontSizeTitle']}mm
- 正文字号：{user_config['fontSizeBody']}mm
- 行间距：{user_config['lineSpacing']}mm
- 题间距：{user_config['questionSpacing']}mm
- 纸张模板：{user_config['paperTemplate']}  # 空白/横线/方格/笔记本

排版规则（基于当前配置）：
- 所有坐标必须在可写区域内
- 文字起始 x >= {user_config['marginLeft']}mm, y >= {user_config['marginTop']}mm
- 文字结束 x <= {paper_w - margin_r}mm, y <= {paper_h - margin_b}mm
...
"""
```

---

### 项目 2：AI Agent 多步工作流（P0）

**问题**：单轮调用 LLM 难以同时完成理解+生成+排版。

**方案**：实现 ReAct 风格的多步 Agent，每步调用不同角色的 LLM。

**涉及文件**：
- `analyzers/agent/`（新建目录）
  - `agent.py` — Agent 主控制器，协调各步骤
  - `planner.py` — Step 1: 题目理解
  - `content_generator.py` — Step 2: 内容生成
  - `layout_planner.py` — Step 3: 布局规划（相对位置）
  - `style_strategist.py` — Step 6: 变形策略

```python
# agent.py 核心逻辑
class HomeworkAgent:
    def analyze(self, question: Question, user_config: dict) -> dict:
        # Step 1: 理解题目
        plan = self.planner.plan(question)
        
        # Step 2: 生成内容
        content = self.content_generator.generate(question, plan)
        
        # Step 3: 布局规划（相对位置）
        layout_plan = self.layout_planner.plan_layout(
            content, 
            paper_w=user_config['paperWidth'],
            paper_h=user_config['paperHeight'],
            margins={...},
            template=user_config.get('paperTemplate', 'blank')
        )
        
        # Step 4: 精确排版（Python 计算，不调用 LLM）
        commands = self.precision_layout.calculate(layout_plan, user_config)
        
        # Step 5: 验证
        validated = self.validator.validate(commands, user_config)
        if not validated['valid']:
            commands = self.precision_layout.adjust(commands, validated['issues'])
        
        # Step 6: 变形策略
        style = self.style_strategist.recommend(question.type, user_config)
        
        return {
            'drawing_commands': commands,
            'style_recommendation': style,
            'content': content,
        }
```

---

### 项目 3：精确排版引擎（Python，不依赖 LLM）（P0）

**问题**：LLM 输出的坐标精度不足、不做碰撞检测、不自动换行。

**方案**：用 Python 代码精确计算所有坐标，LLM 只负责「相对位置规划」。

**涉及文件**：
- `layout/precision_layout.py`（新建）

```python
class PrecisionLayout:
    """将 LLM 输出的相对布局转为精确 mm 坐标"""
    
    def calculate(self, layout_plan: dict, config: dict) -> list:
        commands = []
        
        for section in layout_plan['sections']:
            if section['type'] == 'text':
                # 自动换行计算
                lines = self._wrap_text(
                    text=section['content'],
                    max_width=config['writable_width'],
                    font_size=config['fontSizeBody'],
                    char_spacing=config.get('charSpacing', 1.2)
                )
                for i, line in enumerate(lines):
                    y = section['start_y'] + i * config['lineSpacing']
                    commands.append({
                        'type': 'text',
                        'content': line,
                        'x': section['start_x'],
                        'y': y,
                        'font_size': config['fontSizeBody']
                    })
                    
            elif section['type'] == 'uml_usecase':
                # 精确计算参与者位置
                actors = section['actors']
                usecases = section['usecases']
                # 网格布局算法
                positions = self._grid_layout(
                    items=actors + usecases,
                    area=section['area'],
                    padding=5
                )
                commands.extend(self._build_uml_commands(positions))
                
        return commands
    
    def _wrap_text(self, text: str, max_width: float, font_size: float, char_spacing: float) -> list:
        """文字自动换行"""
        # 基于字体宽度计算每行最大字符数
        lines = []
        current_line = ''
        current_width = 0
        
        for char in text:
            char_w = self._get_char_width(char, font_size) * char_spacing
            if current_width + char_w > max_width:
                lines.append(current_line)
                current_line = char
                current_width = char_w
            else:
                current_line += char
                current_width += char_w
        
        if current_line:
            lines.append(current_line)
        return lines
    
    def validate(self, commands: list, config: dict) -> dict:
        """碰撞检测与边界检查"""
        issues = []
        
        # 检查每个元素是否在纸张内
        for cmd in commands:
            if cmd['type'] == 'text':
                text_width = self._estimate_text_width(cmd['content'], cmd['font_size'])
                if cmd['x'] + text_width > config['paperWidth'] - config['marginRight']:
                    issues.append({'type': 'overflow_right', 'cmd': cmd})
                    
        # 检查文字与图形重叠
        text_boxes = [self._get_bbox(c) for c in commands if c['type'] == 'text']
        shape_boxes = [self._get_bbox(c) for c in commands if c['type'] in ('ellipse', 'actor')]
        for tb in text_boxes:
            for sb in shape_boxes:
                if self._boxes_overlap(tb, sb):
                    issues.append({'type': 'overlap', 'text': tb, 'shape': sb})
                    
        return {'valid': len(issues) == 0, 'issues': issues}
```

---

### 项目 4：纸张模板系统（P1）

**问题**：只有空白 A4，不支持横线本/方格本/笔记本。

**方案**：
- 添加 `PaperTemplate` 数据模型
- 横线本：文字基线对齐到横线
- 方格本：文字和图形对齐到格子
- 笔记本：添加装订线和打孔标记

**涉及文件**：
- `layout/paper_template.py`（新建）
- `layout/layout_engine.py` — 集成模板对齐
- `output/command_generator.py` — 输出模板背景线

```python
class PaperTemplate:
    BLANK = 'blank'
    RULED = 'ruled'      # 横线本
    GRID = 'grid'        # 方格本
    NOTEBOOK = 'notebook' # 笔记本
    
class RuledTemplate:
    def __init__(self, line_height: float = 7.0, margin_top: float = 20):
        self.line_height = line_height
        self.margin_top = margin_top
    
    def align_y(self, y: float) -> float:
        """将 y 对齐到最近的横线"""
        line_index = round((y - self.margin_top) / self.line_height)
        return self.margin_top + line_index * self.line_height
    
    def get_background_lines(self, paper_h: float) -> list:
        """生成背景横线（虚线/灰色）"""
        lines = []
        y = self.margin_top
        while y < paper_h - 20:
            lines.append({'type': 'line', 'x1': 15, 'y1': y, 'x2': 195, 'y2': y, 'style': 'dashed_light'})
            y += self.line_height
        return lines
```

---

### 项目 5：增强字体变形系统（P1）

**问题**：只有基础抖动，缺少字间距变化、字形微变形、上下浮动、笔锋模拟。

**方案**：
- 字间距随机变化
- 字形微变形（倾斜、压缩/拉伸）
- 上下浮动（基线波动）
- 笔锋模拟（顿笔效果）
- 笔画粗细模拟（通过速度变化）

**涉及文件**：
- `effects/hand_drawn.py` — 扩展变形算法
- `effects/text_deformer.py`（新建）

```python
class TextDeformer:
    """文字级变形（在 LayoutEngine 之后、HandDrawnEffect 之前）"""
    
    def __init__(self, seed: int = None):
        self.rng = random.Random(seed)
    
    def deform_text(self, strokes: List[Stroke], config: dict) -> List[Stroke]:
        result = []
        
        for stroke in strokes:
            if stroke.type != 'text':
                result.append(stroke)
                continue
            
            # 1. 字间距随机变化
            char_spacing_var = config.get('charSpacingVar', 0.15)
            # 2. 上下浮动
            baseline_wobble = config.get('baselineWobble', 0.3)
            # 3. 字形微变形（整体倾斜）
            slant = config.get('slant', 0.02)  # 2度倾斜
            
            deformed = self._apply_char_spacing_var(stroke, char_spacing_var)
            deformed = self._apply_baseline_wobble(deformed, baseline_wobble)
            deformed = self._apply_slant(deformed, slant)
            
            result.append(deformed)
        
        return result
    
    def _apply_slant(self, stroke: Stroke, slant: float) -> Stroke:
        """整体倾斜效果"""
        points = []
        for p in stroke.points:
            # x' = x + slant * (y - baseline_y)
            new_x = p.x + slant * (p.y - stroke.baseline_y)
            points.append(Point(new_x, p.y))
        return Stroke(points=points, pen_down=stroke.pen_down, speed=stroke.speed)
```

---

### 项目 6：LLM 排版提示词工程升级（P1）

**问题**：当前提示词让 LLM 直接输出绝对坐标，LLM 不擅长精确数值计算。

**方案**：让 LLM 输出「相对布局描述」，由 Python 精确计算坐标。

**新提示词策略**：

```
【系统提示词 - Layout Planner】

你是一位作业排版规划师。你的任务是根据题目内容和纸张配置，
规划每道题在纸上的相对位置（不是绝对坐标）。

输出格式（JSON）：
{
  "sections": [
    {
      "type": "text",  // 或 "uml_usecase", "uml_class", "code"
      "content": "答案文字内容",
      "relative_position": {
        "anchor": "top-left",  // 锚点位置
        "row": 1,  // 第几行（从1开始）
        "col": 1,  // 第几列（从1开始，多栏布局用）
        "span_rows": 3  // 占用几行高度
      },
      "layout_hint": {
        "priority": "high",  // 优先放置
        "needs_space_after": true  // 后面需要留白
      }
    },
    {
      "type": "uml_usecase",
      "elements": {
        "actors": ["学生", "教师"],
        "usecases": ["登录", "选课", "查成绩"],
        "relations": [...]
      },
      "relative_position": {
        "anchor": "below:previous",  // 在前一个元素下方
        "alignment": "center"  // 居中对齐
      },
      "size_hint": {
        "width_ratio": 0.8,  // 占可写区域宽度的80%
        "aspect_ratio": 4/3  // 宽高比
      }
    }
  ]
}

规则：
1. 不要输出绝对 mm 坐标
2. 使用相对位置描述（above/below/left-of/right-of/center）
3. 考虑题目类型决定布局：
   - 文字题：从上到下流式布局
   - UML图：居中，预留足够空间
   - 代码题：等宽字体，左对齐
4. 考虑分页：如果内容多，标记 "page_break": true
```

---

### 项目 7：排版效果实时预览与反馈循环（P2）

**问题**：LLM 生成的布局无法预览，有问题只能重新生成。

**方案**：
- 前端添加「排版预览」模式，显示 LLM 规划的相对位置（框线图）
- 用户可以手动调整元素位置
- 调整后的位置反馈给 LLM 进行优化

**涉及文件**：
- `src/components/LayoutPreview.tsx`（新建）
- `api/routes/homework.ts` — 添加 `/api/homework/layout-preview` 接口

---

### 项目 8：字体变形参数智能推荐（P2）

**问题**：用户不知道如何选择变形参数。

**方案**：LLM 根据题目类型和纸张模板推荐变形参数。

**涉及文件**：
- `analyzers/agent/style_strategist.py`

```python
class StyleStrategist:
    def recommend(self, question_type: str, paper_template: str) -> dict:
        strategies = {
            'uml_usecase': {
                'handDrawnAmplitude': 0.2,  # 规整，少变形
                'charSpacingVar': 0.05,
                'baselineWobble': 0.1,
                'slant': 0.0,
                'description': 'UML图需要规整清晰，变形幅度小'
            },
            'essay': {
                'handDrawnAmplitude': 0.5,  # 自然书写
                'charSpacingVar': 0.15,
                'baselineWobble': 0.4,
                'slant': 0.02,
                'description': '文字题模拟自然手写，变形适中'
            },
            'code': {
                'handDrawnAmplitude': 0.1,  # 代码需要清晰
                'charSpacingVar': 0.0,  # 等宽
                'baselineWobble': 0.0,
                'slant': 0.0,
                'description': '代码需要等宽对齐，几乎不变形'
            }
        }
        return strategies.get(question_type, strategies['essay'])
```

---

### 项目 9：多栏布局支持（P2）

**问题**：当前只有单栏流式布局，不支持多栏。

**方案**：
- 添加 column 参数（1/2/3栏）
- LLM 根据内容量决定栏数
- 排版引擎支持栏间分隔线

---

### 项目 10：图形元素自动避让（P2）

**问题**：文字与图形可能重叠。

**方案**：
- 在 `PrecisionLayout` 中添加力导向布局算法
- 当检测到重叠时，自动微调位置
- 保持整体美观的前提下最小化位移

---

## 四、优先级排序

| 优先级 | 项目 | 说明 |
|--------|------|------|
| **P0** | 项目 1: 动态配置注入 | 前端参数调整后 LLM 必须知道 |
| **P0** | 项目 2: AI Agent 多步工作流 | 核心架构升级 |
| **P0** | 项目 3: 精确排版引擎 | 替代 LLM 直接输出坐标 |
| **P1** | 项目 4: 纸张模板系统 | 横线本/方格本支持 |
| **P1** | 项目 5: 增强字体变形 | 字间距/倾斜/浮动 |
| **P1** | 项目 6: 提示词工程升级 | LLM 输出相对位置 |
| **P2** | 项目 7: 实时预览反馈 | 可视化调整布局 |
| **P2** | 项目 8: 变形参数推荐 | 智能推荐 |
| **P2** | 项目 9: 多栏布局 | 高级排版 |
| **P2** | 项目 10: 自动避让 | 碰撞检测优化 |

---

## 五、实施建议

**阶段一（P0 核心重构）**：
1. 实现项目 1（动态配置注入）
2. 实现项目 3（精确排版引擎）
3. 实现项目 2（Agent 工作流框架）
4. 升级项目 6（提示词工程）

**阶段二（P1 功能增强）**：
5. 实现项目 4（纸张模板）
6. 实现项目 5（字体变形增强）
7. 前端集成所有新参数

**阶段三（P2 体验优化）**：
8. 实现项目 7（实时预览）
9. 实现项目 8（智能推荐）
10. 实现项目 9/10（多栏/避让）
