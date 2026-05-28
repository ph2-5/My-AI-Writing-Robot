import json
from typing import List, Dict, Any, Optional

from openai import OpenAI

import config
from layout.models import Question


class HomeworkAnalyzer:

    def __init__(self, llm_client: Optional[OpenAI] = None, app_config=None):
        self._app_config = app_config if app_config is not None else config.DEFAULT_CONFIG
        if llm_client is None:
            self.llm = OpenAI(
                base_url=self._app_config.LLM_BASE_URL,
                api_key=self._app_config.LLM_API_KEY,
            )
        else:
            self.llm = llm_client

    def analyze_question(self, question_data: Question, user_config: dict = None) -> Dict[str, Any]:
        prompt = self._build_analysis_prompt(question_data, user_config)

        response = self.llm.chat.completions.create(
            model=self._app_config.LLM_MODEL,
            messages=[
                {"role": "system", "content": self._system_prompt(user_config)},
                {"role": "user", "content": prompt},
            ],
            response_format={"type": "json_object"},
        )

        return json.loads(response.choices[0].message.content)

    def batch_analyze(self, questions: List[Question], user_config: dict = None) -> List[Dict[str, Any]]:
        results = []
        for q in questions:
            result = self.analyze_question(q, user_config)
            results.append({
                'question': q,
                'analysis': result,
            })
        return results

    def _system_prompt(self, user_config: dict = None) -> str:
        if user_config is None:
            user_config = {}

        c = self._app_config
        paper_w = user_config.get('paperWidth', c.PAPER_WIDTH)
        paper_h = user_config.get('paperHeight', c.PAPER_HEIGHT)
        margin_t = user_config.get('marginTop', c.MARGIN_TOP)
        margin_b = user_config.get('marginBottom', c.MARGIN_BOTTOM)
        margin_l = user_config.get('marginLeft', c.MARGIN_LEFT)
        margin_r = user_config.get('marginRight', c.MARGIN_RIGHT)
        writable_w = paper_w - margin_l - margin_r
        writable_h = paper_h - margin_t - margin_b
        font_title = user_config.get('fontSizeTitle', c.FONT_SIZE_TITLE)
        font_body = user_config.get('fontSizeBody', c.FONT_SIZE_BODY)
        font_label = user_config.get('fontSizeLabel', c.FONT_SIZE_LABEL)
        line_spacing = user_config.get('lineSpacing', c.LINE_SPACING)
        question_spacing = user_config.get('questionSpacing', c.QUESTION_SPACING)
        template = user_config.get('paperTemplate', 'blank')

        return f"""你是一位UML建模专家和作业排版设计师。

【当前用户配置】
- 纸张尺寸：{paper_w}mm x {paper_h}mm
- 页边距：上{margin_t}mm 下{margin_b}mm 左{margin_l}mm 右{margin_r}mm
- 可写区域：{writable_w}mm x {writable_h}mm
- 标题字号：{font_title}mm
- 正文字号：{font_body}mm
- 标注字号：{font_label}mm
- 行间距：{line_spacing}mm
- 题间距：{question_spacing}mm
- 纸张模板：{template}

【你的任务】
1. 理解作业题目要求
2. 生成准确、规范的答案内容
3. 设计排版方案——使用相对位置描述，不要输出绝对mm坐标

【输出格式】
必须是JSON，包含：
- answer_content: 答案内容
- layout_plan: 布局方案（相对位置描述，见下方）
- drawing_commands: 绘图指令（由系统根据layout_plan自动计算，你只需提供辅助信息）
- metadata: 题目元信息

【布局方案格式】
使用相对位置描述，不要输出绝对mm坐标：
{{
  "sections": [
    {{
      "type": "text",
      "content": "文字内容",
      "relative_position": {{
        "anchor": "top-left",
        "placement": "flow",  // flow=流式布局, center=居中, below=在下方
        "after": null  // 或前一个section的id
      }},
      "style": {{
        "font_size": "title"  // title/body/label
      }}
    }},
    {{
      "type": "uml_usecase",
      "elements": {{
        "actors": ["参与者名称"],
        "usecases": ["用例名称"],
        "relations": [
          {{"from": "actor", "to": "usecase", "type": "association"}},
          {{"from": "usecase1", "to": "usecase2", "type": "include"}}
        ]
      }},
      "relative_position": {{
        "placement": "center",
        "after": "previous"
      }},
      "size_hint": {{
        "width_ratio": 0.8,
        "min_height": 60
      }}
    }}
  ]
}}

【排版规则】
1. 所有内容必须在可写区域内（x >= {margin_l}, y >= {margin_t}, x <= {paper_w - margin_r}, y <= {paper_h - margin_b}）
2. 文字题使用 flow 流式布局，从上到下
3. UML图使用 center 居中布局
4. 图形和文字不能重叠，预留足够间距
5. 如果内容超出单页，标记 "page_break": true
6. 手写机器人单笔书写，不能自动换色
7. 整体美观，符合手写习惯
"""

    def _build_analysis_prompt(self, q: Question, user_config: dict = None) -> str:
        if user_config is None:
            user_config = {}
        c = self._app_config
        paper_w = user_config.get('paperWidth', c.PAPER_WIDTH)
        paper_h = user_config.get('paperHeight', c.PAPER_HEIGHT)
        font_body = user_config.get('fontSizeBody', c.FONT_SIZE_BODY)
        line_spacing = user_config.get('lineSpacing', c.LINE_SPACING)
        writable_w = paper_w - user_config.get('marginLeft', c.MARGIN_LEFT) - user_config.get('marginRight', c.MARGIN_RIGHT)

        return f"""
请分析以下作业题目，生成完整答案和排版方案。

【题目信息】
题号: {q.number}
类型: {q.type}
内容: {q.text}
要求: {', '.join(q.requirements) if q.requirements else '无特殊要求'}

【当前配置】
纸张: {paper_w}x{paper_h}mm
可写宽度: {writable_w}mm
正文字号: {font_body}mm
行间距: {line_spacing}mm

【输出要求】
1. 如果是UML用例图：
   - 列出所有参与者和用例
   - 描述关系（include/extend/association）
   - 使用相对位置描述布局（不要输出mm坐标）

2. 如果是UML类图：
   - 列出所有类、属性、方法
   - 描述关系（继承/组合/关联）
   - 使用相对位置描述布局

3. 如果是文字题：
   - 生成完整答案
   - 使用 flow 流式布局描述
   - 考虑自动换行（每行约 {int(writable_w / (font_body * 1.2))} 个汉字）

4. 排版必须考虑：
   - 手写机器人单笔书写，不能自动换色
   - 图形和文字不能重叠
   - 整体美观，符合手写习惯

请输出JSON格式的完整方案，使用相对位置描述，不要输出绝对mm坐标。
"""
