# AI写字机器人 - 完善计划

## 问题分析

通过全面审查现有代码，发现以下需要完善的方面：

---

## 一、前端完善

### 1. 参数面板增加滑块控制（P1）
**问题**：当前所有参数只有数字输入框，没有滑块，用户体验差。
**方案**：为每个参数添加 range 滑块（min/max 范围），滑块和数字输入框双向同步。
**涉及文件**：
- `src/components/PaperSettings.tsx` — 纸张宽度 100-400mm，高度 150-500mm，边距 5-50mm
- `src/components/FontSettings.tsx` — 字号 2-10mm，间距 3-30mm
- `src/components/RobotSettings.tsx` — 高度 0-10mm，速度 10-200mm/s
- `src/components/HandDrawnSettings.tsx` — 振幅 0-2mm，拐角倍率 1-3

### 2. 参数预设/重置功能（P1）
**问题**：没有一键恢复默认参数的功能，用户误改后无法快速恢复。
**方案**：
- 在左侧面板顶部添加「重置默认」按钮
- 添加「保存预设」和「加载预设」功能（localStorage）
**涉及文件**：
- `src/stores/useConfigStore.ts` — 添加 `resetToDefaults` action
- `src/pages/Home.tsx` — 添加重置按钮

### 3. SVG 预览增强（P2）
**问题**：SVG 预览区域没有缩放、平移功能，大图纸看不清细节。
**方案**：
- 添加缩放控制（+/-/100% 按钮 + 鼠标滚轮）
- 添加拖拽平移功能
- 添加「显示/隐藏纸张边框」和「显示/隐藏可写区域」开关
**涉及文件**：`src/components/SvgPreview.tsx`

### 4. 文件上传增强（P2）
**问题**：上传后没有显示文件信息（文件名、大小），没有删除/重新上传功能。
**方案**：
- 显示文件名和大小
- 添加「删除」按钮清空当前文件
- 支持多文件上传（队列管理）
**涉及文件**：`src/components/FileUpload.tsx`

### 5. 生成结果历史记录（P2）
**问题**：每次生成新结果会覆盖旧结果，无法对比。
**方案**：
- 在左侧面板添加「历史记录」列表
- 每条记录显示时间、文件名、笔画数
- 点击可切换预览不同版本
**涉及文件**：
- `src/stores/useGenerateStore.ts` — 添加 history 数组
- 新建 `src/components/HistoryList.tsx`

### 6. 响应式布局（P3）
**问题**：当前布局是固定 320px 左侧面板，小屏幕体验差。
**方案**：
- 添加移动端适配（< 1024px 时左侧面板可折叠）
- 添加面板宽度可拖拽调整
**涉及文件**：`src/pages/Home.tsx`

---

## 二、后端完善

### 7. 配置热重载机制（P1）
**问题**：`main.py` 中的 `load_config_from_dict` 直接修改全局 `config.py` 的模块变量，多线程/并发请求时会产生竞态条件。
**方案**：
- 将 `config.py` 改为 Config 类实例
- `LayoutEngine`、`HandDrawnEffect`、`RobotCommandGenerator` 都接收 Config 实例作为参数
- 每次请求创建独立的 Config 实例
**涉及文件**：
- `config.py` — 改为 Config 类
- `main.py` — 创建 Config 实例并传递
- `layout/layout_engine.py` — 接收 config 参数
- `effects/hand_drawn.py` — 接收 config 参数
- `output/command_generator.py` — 接收 config 参数

### 8. 并发安全与错误处理（P1）
**问题**：
- 后端 API 没有超时控制，Python 脚本可能卡住
- 没有请求队列，并发生成可能冲突
- 错误信息没有友好返回
**方案**：
- `runPython` 添加 5 分钟超时
- 添加请求锁（单用户同时只能有一个生成任务）
- 统一错误响应格式，前端显示友好错误提示
**涉及文件**：`api/routes/homework.ts`

### 9. 临时文件清理（P2）
**问题**：uploads 和 outputs 目录的文件会无限累积。
**方案**：
- 添加定时清理任务（超过 24 小时的文件自动删除）
- 或每次启动时清理旧文件
**涉及文件**：`api/routes/homework.ts`、`api/server.ts`

---

## 三、核心功能完善

### 10. LLM 分析支持流式输出（P1）
**问题**：LLM 分析是同步阻塞的，用户看不到进度，大模型响应慢时前端卡死。
**方案**：
- 后端改用 SSE (Server-Sent Events) 流式返回 LLM 分析进度
- 前端显示「分析中...」进度条，实时显示当前处理到哪道题
**涉及文件**：
- `api/routes/homework.ts` — 添加 `/api/homework/generate-stream` 路由
- `analyzers/homework_analyzer.py` — 支持流式回调
- `src/components/GeneratePanel.tsx` — 支持 SSE 连接

### 11. 题目类型扩展（P2）
**问题**：当前只支持 UML 用例图/类图/序列图/活动图和文字题，缺少更多常见题型。
**方案**：
- 添加 `uml_state`（状态图）、`uml_component`（组件图）、`uml_deployment`（部署图）
- 添加 `code`（代码题）、`table`（表格题）
- 在 `layout_engine.py` 中添加对应绘图命令
**涉及文件**：
- `parsers/homework_parser.py` — 扩展 TYPE_KEYWORDS
- `layout/layout_engine.py` — 添加 state/component/table 绘图命令
- `analyzers/homework_analyzer.py` — 扩展系统提示词

### 12. 中文 Hershey 字体扩展（P2）
**问题**：当前 CJK 字体只覆盖了约 50 个常用汉字，大量汉字会显示为「?」方框。
**方案**：
- 集成 `fontTools` 库，从系统 TTF 字体提取轮廓并中心线化
- 或引入完整的 Hershey 中文数据集
- 添加字体回退机制（找不到字形时尝试近似匹配）
**涉及文件**：`fonts/hershey.py`

### 13. 多页支持（P2）
**问题**：当前 `LayoutEngine` 的换页逻辑是简单的 Y 坐标检查，没有真正的分页排版。
**方案**：
- `LayoutResult` 添加 `pages: List[List[Stroke]]` 结构
- 每页独立生成 SVG viewBox
- 前端预览支持翻页
**涉及文件**：
- `layout/models.py` — 添加 Page 模型
- `layout/layout_engine.py` — 改进分页逻辑
- `output/command_generator.py` — 多页 SVG 输出

---

## 四、质量与体验

### 14. 参数验证与边界检查（P2）
**问题**：前端输入非法值（如负数边距、0 字号）不会报错，可能导致 Python 崩溃。
**方案**：
- 前端输入框添加 min/max 限制
- 后端 API 添加参数校验（Joi/Zod）
- 非法参数返回明确错误信息
**涉及文件**：所有 Settings 组件 + `api/routes/homework.ts`

### 15. 加载状态与骨架屏（P3）
**问题**：生成过程中只有简单的「生成中...」文字，没有视觉反馈。
**方案**：
- 生成按钮添加脉冲动画
- SVG 预览区域添加骨架屏
- 添加全局加载遮罩（防止误操作）
**涉及文件**：`src/components/GeneratePanel.tsx`、`src/components/SvgPreview.tsx`

### 16. 键盘快捷键（P3）
**问题**：没有快捷键，操作效率低。
**方案**：
- `Ctrl+Enter` / `Cmd+Enter` — 生成
- `Ctrl+D` — 演示模式
- `Ctrl+R` — 重置参数
**涉及文件**：`src/pages/Home.tsx`

---

## 优先级排序

| 优先级 | 项目 | 影响 |
|--------|------|------|
| **P0（阻塞）** | 7. 配置热重载机制 | 并发安全，必须修复 |
| **P0（阻塞）** | 8. 并发安全与错误处理 | 生产环境必需 |
| **P1（高）** | 1. 参数面板滑块 | 核心用户体验 |
| **P1（高）** | 2. 参数预设/重置 | 核心用户体验 |
| **P1（高）** | 10. LLM 流式输出 | 大模型响应慢时体验差 |
| **P2（中）** | 3. SVG 预览增强 | 体验优化 |
| **P2（中）** | 4. 文件上传增强 | 体验优化 |
| **P2（中）** | 5. 生成结果历史 | 体验优化 |
| **P2（中）** | 9. 临时文件清理 | 运维必需 |
| **P2（中）** | 11. 题目类型扩展 | 功能扩展 |
| **P2（中）** | 12. 中文字体扩展 | 功能扩展 |
| **P2（中）** | 13. 多页支持 | 功能扩展 |
| **P2（中）** | 14. 参数验证 | 健壮性 |
| **P3（低）** | 6. 响应式布局 | 移动端适配 |
| **P3（低）** | 15. 加载状态 | 视觉优化 |
| **P3（低）** | 16. 键盘快捷键 | 效率优化 |

---

## 实施建议

建议分 3 个阶段实施：

**阶段一（P0 阻塞修复）**：项目 7、8 — 修复并发安全问题，确保后端稳定
**阶段二（P1 核心体验）**：项目 1、2、10 — 完善参数交互和 LLM 流式体验
**阶段三（P2 功能扩展）**：项目 3、4、5、9、11、12、13、14 — 逐步增强功能和体验
