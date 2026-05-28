import json
import time
from typing import List, Dict, Any, Optional, Callable
from openai import OpenAI
import config as cfg_module
from layout.models import Question
from analyzers.agent.style_strategist import StyleStrategist


class LayoutDesignerAgent:

    MAX_ITERATIONS = 5

    def __init__(self, app_config=None, on_progress: Optional[Callable] = None):
        self._app_config = app_config if app_config is not None else cfg_module.DEFAULT_CONFIG
        self._style_strategist = StyleStrategist()
        self._on_progress = on_progress
        self._tools = self._define_tools()
        self._tool_implementations = {}

    def register_tool(self, name: str, implementation: Callable):
        self._tool_implementations[name] = implementation

    def design_layout(self, questions: List[Question], user_config: dict = None) -> Dict[str, Any]:
        config_dict = user_config or {}
        all_question_plans = []
        all_sections = []

        for q in questions:
            self._emit_progress('thinking', f'分析第 {q.number} 题...', {'questionNumber': q.number})

            plan = self._design_single_question(q, config_dict)
            all_question_plans.append(plan)

            if plan.get('layoutPlan', {}).get('sections'):
                all_sections.extend(plan['layoutPlan']['sections'])

        merged_plan = {'sections': all_sections}

        preview_svg = ''
        page_count = 1
        if all_sections:
            self._emit_progress('rendering', '渲染布局预览...')
            calc_tool = self._tool_implementations.get('calculate_layout')
            render_tool = self._tool_implementations.get('render_preview')
            validate_tool = self._tool_implementations.get('validate_layout')

            if calc_tool and render_tool:
                commands = calc_tool(merged_plan)
                if validate_tool:
                    for retry in range(3):
                        validation = validate_tool(commands)
                        if validation['valid']:
                            break
                        self._emit_progress('adjusting', f'合并布局发现 {len(validation["issues"])} 个问题，修正中（第 {retry + 1} 次）...')
                        adjust_tool = self._tool_implementations.get('adjust_layout')
                        if adjust_tool:
                            commands = adjust_tool(commands, validation['issues'])
                        else:
                            break
                preview_svg = render_tool(commands)
                page_count = max(cmd.get('page', 1) for cmd in commands) if commands else 1

        return {
            'success': True,
            'questionPlans': all_question_plans,
            'previewSvg': preview_svg,
            'pageCount': page_count,
            'totalSections': len(all_sections),
        }

    def _design_single_question(self, question: Question, config_dict: dict) -> Dict[str, Any]:
        style_rec = self._style_strategist.recommend(question.type, config_dict.get('paperTemplate', 'blank'))

        initial_plan = self._llm_initial_analysis(question, config_dict)

        validated_plan = self._iterative_refinement(question, initial_plan, config_dict)

        return {
            'questionNumber': question.number,
            'questionType': question.type,
            'questionText': question.text,
            'answerContent': validated_plan.get('answer_content', ''),
            'layoutPlan': validated_plan.get('layout_plan', {}),
            'styleRecommendation': style_rec,
            'metadata': validated_plan.get('metadata', {}),
            'iterations': validated_plan.get('_iterations', 0),
        }

    def _llm_initial_analysis(self, question: Question, config_dict: dict) -> Dict[str, Any]:
        self._emit_progress('analyzing', f'AI 分析第 {question.number} 题内容...')

        client = OpenAI(
            base_url=self._app_config.LLM_BASE_URL,
            api_key=self._app_config.LLM_API_KEY,
            timeout=60.0,
            max_retries=2,
        )

        system_prompt = self._build_system_prompt(config_dict)
        user_prompt = self._build_user_prompt(question, config_dict)

        max_attempts = 3
        for attempt in range(max_attempts):
            try:
                response = client.chat.completions.create(
                    model=self._app_config.LLM_MODEL,
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_prompt},
                    ],
                    response_format={"type": "json_object"},
                )

                content = response.choices[0].message.content
                if content is None:
                    if attempt < max_attempts - 1:
                        self._emit_progress('retrying', f'第 {question.number} 题 LLM 返回为空，重试...')
                        continue
                    result = {'answer_content': '', 'layout_plan': {'sections': []}}
                else:
                    try:
                        result = json.loads(content)
                    except json.JSONDecodeError:
                        if attempt < max_attempts - 1:
                            self._emit_progress('retrying', f'第 {question.number} 题 JSON 解析失败，重试...')
                            continue
                        result = {'answer_content': '', 'layout_plan': {'sections': []}}

                result = self._ensure_valid_structure(result)
                return result

            except Exception as e:
                if attempt < max_attempts - 1:
                    self._emit_progress('retrying', f'第 {question.number} 题 LLM 调用失败({str(e)[:50]})，重试...')
                    import time
                    time.sleep(2 * (attempt + 1))
                    continue
                self._emit_progress('error', f'第 {question.number} 题 LLM 调用最终失败: {str(e)[:80]}')
                result = {'answer_content': '', 'layout_plan': {'sections': []}}
                result = self._ensure_valid_structure(result)
                return result

        result = {'answer_content': '', 'layout_plan': {'sections': []}}
        result = self._ensure_valid_structure(result)
        return result

    def _iterative_refinement(self, question: Question, initial_plan: Dict[str, Any], config_dict: dict) -> Dict[str, Any]:
        current_plan = initial_plan
        iterations = 0

        for i in range(self.MAX_ITERATIONS):
            iterations += 1
            layout_plan = current_plan.get('layout_plan', {})
            sections = layout_plan.get('sections', [])

            if not sections:
                current_plan = self._repair_empty_layout(question, current_plan, config_dict)
                continue

            calc_tool = self._tool_implementations.get('calculate_layout')
            validate_tool = self._tool_implementations.get('validate_layout')

            if not calc_tool or not validate_tool:
                break

            commands = calc_tool(layout_plan)
            validation = validate_tool(commands)

            if validation['valid']:
                if not commands:
                    self._emit_progress('refining', f'第 {question.number} 题布局为空，重新生成...')
                    current_plan = self._repair_empty_layout(question, current_plan, config_dict)
                    continue
                self._emit_progress('validated', f'第 {question.number} 题布局验证通过')
                break

            self._emit_progress('refining', f'第 {question.number} 题布局修正（第 {iterations} 轮）...')

            adjust_tool = self._tool_implementations.get('adjust_layout')
            if adjust_tool:
                commands = adjust_tool(commands, validation['issues'])
                current_plan = self._rebuild_plan_from_commands(current_plan, commands, validation['issues'])
            else:
                break

        current_plan['_iterations'] = iterations
        return current_plan

    def _repair_empty_layout(self, question: Question, plan: Dict[str, Any], config_dict: dict) -> Dict[str, Any]:
        answer = plan.get('answer_content', '')
        if not answer:
            answer = question.text

        default_section = {
            'type': 'text',
            'content': f"{question.number}. {answer}",
            'relative_position': {'placement': 'flow'},
            'style': {'font_size': 'body'},
        }

        if question.type in ('uml_usecase', 'uml_class', 'uml_sequence', 'uml_activity'):
            default_section = {
                'type': question.type,
                'elements': self._extract_elements_from_answer(question, answer),
                'relative_position': {'placement': 'center'},
                'size_hint': {'width_ratio': 0.8, 'min_height': 80},
            }

        if 'layout_plan' not in plan or not isinstance(plan.get('layout_plan'), dict):
            plan['layout_plan'] = {}
        plan['layout_plan']['sections'] = [default_section]
        return plan

    def _extract_elements_from_answer(self, question: Question, answer: str) -> Dict[str, Any]:
        elements = {}
        if question.type == 'uml_usecase':
            elements = {'actors': ['参与者'], 'usecases': ['用例1'], 'relations': []}
        elif question.type == 'uml_class':
            elements = {'classes': [{'name': '类1', 'attributes': [], 'methods': []}], 'relations': []}
        elif question.type == 'uml_sequence':
            elements = {'participants': ['对象A', '对象B'], 'messages': [{'from': '对象A', 'to': '对象B', 'label': '消息1'}]}
        elif question.type == 'uml_activity':
            elements = {'start_node': True, 'activities': ['活动1'], 'decisions': [], 'end_node': True}
        return elements

    def _rebuild_plan_from_commands(self, original_plan: Dict[str, Any], commands: List[Dict], issues: List[Dict]) -> Dict[str, Any]:
        layout_plan = original_plan.get('layout_plan', {})
        sections = layout_plan.get('sections', [])

        issue_types = [issue['type'] for issue in issues]

        for issue in issues:
            if issue['type'] == 'overflow_right':
                for sec in sections:
                    if sec.get('type') == 'text':
                        content = sec.get('content', '')
                        if len(content) > 20:
                            max_chars = int(len(content) * 0.7)
                            cut_pos = content.rfind('。', 0, max_chars)
                            if cut_pos == -1:
                                cut_pos = content.rfind('，', 0, max_chars)
                            if cut_pos == -1:
                                cut_pos = max_chars
                            sec['content'] = content[:cut_pos + 1]

            elif issue['type'] == 'overlap':
                for sec in sections:
                    if sec.get('type') in ('uml_usecase', 'uml_class', 'uml_sequence', 'uml_activity'):
                        size_hint = sec.get('size_hint', {})
                        current_ratio = size_hint.get('width_ratio', 0.8)
                        if current_ratio > 0.5:
                            sec['size_hint'] = {
                                'width_ratio': current_ratio - 0.1,
                                'min_height': size_hint.get('min_height', 60) + 15,
                            }

            elif issue['type'] == 'overflow_bottom':
                for sec in sections:
                    if sec.get('type') == 'text':
                        content = sec.get('content', '')
                        if len(content) > 30:
                            half = len(content) // 2
                            cut_pos = content.rfind('。', 0, half)
                            if cut_pos == -1:
                                cut_pos = half
                            first_part = content[:cut_pos + 1]
                            second_part = content[cut_pos + 1:]
                            sections.append({
                                'type': 'text',
                                'content': second_part,
                                'relative_position': {'placement': 'flow'},
                                'style': sec.get('style', {'font_size': 'body'}),
                            })
                            sec['content'] = first_part
                            break

        layout_plan['sections'] = sections
        original_plan['layout_plan'] = layout_plan
        return original_plan

    def _ensure_valid_structure(self, result: Dict[str, Any]) -> Dict[str, Any]:
        if 'answer_content' not in result:
            result['answer_content'] = ''
        if 'layout_plan' not in result or not isinstance(result.get('layout_plan'), dict):
            result['layout_plan'] = {}
        if 'sections' not in result['layout_plan'] or not isinstance(result['layout_plan']['sections'], list):
            result['layout_plan']['sections'] = []

        for sec in result['layout_plan']['sections']:
            if 'type' not in sec:
                sec['type'] = 'text'
            if 'relative_position' not in sec:
                sec['relative_position'] = {'placement': 'flow'}
            if sec['type'] == 'text' and 'content' not in sec:
                sec['content'] = ''
            if sec['type'] in ('uml_usecase', 'uml_class', 'uml_sequence', 'uml_activity') and 'elements' not in sec:
                sec['elements'] = {}
            if sec['type'] == 'uml_usecase':
                elements = sec.get('elements', {})
                if 'actors' not in elements or not isinstance(elements.get('actors'), list):
                    elements['actors'] = []
                if 'usecases' not in elements or not isinstance(elements.get('usecases'), list):
                    elements['usecases'] = []
                if 'relations' not in elements or not isinstance(elements.get('relations'), list):
                    elements['relations'] = []
                sec['elements'] = elements
            if sec['type'] == 'uml_class':
                elements = sec.get('elements', {})
                if 'classes' not in elements or not isinstance(elements.get('classes'), list):
                    elements['classes'] = []
                if 'relations' not in elements or not isinstance(elements.get('relations'), list):
                    elements['relations'] = []
                sec['elements'] = elements
            if sec['type'] == 'uml_sequence':
                elements = sec.get('elements', {})
                if 'participants' not in elements or not isinstance(elements.get('participants'), list):
                    elements['participants'] = []
                if 'messages' not in elements or not isinstance(elements.get('messages'), list):
                    elements['messages'] = []
                sec['elements'] = elements
            if sec['type'] == 'uml_activity':
                elements = sec.get('elements', {})
                if 'activities' not in elements or not isinstance(elements.get('activities'), list):
                    elements['activities'] = []
                if 'decisions' not in elements or not isinstance(elements.get('decisions'), list):
                    elements['decisions'] = []
                sec['elements'] = elements

        return result

    def _build_system_prompt(self, config_dict: dict) -> str:
        c = self._app_config
        paper_w = config_dict.get('paperWidth', c.PAPER_WIDTH)
        paper_h = config_dict.get('paperHeight', c.PAPER_HEIGHT)
        margin_t = config_dict.get('marginTop', c.MARGIN_TOP)
        margin_b = config_dict.get('marginBottom', c.MARGIN_BOTTOM)
        margin_l = config_dict.get('marginLeft', c.MARGIN_LEFT)
        margin_r = config_dict.get('marginRight', c.MARGIN_RIGHT)
        writable_w = paper_w - margin_l - margin_r
        writable_h = paper_h - margin_t - margin_b
        font_body = config_dict.get('fontSizeBody', c.FONT_SIZE_BODY)
        line_spacing = config_dict.get('lineSpacing', c.LINE_SPACING)

        return f"""你是一位UML建模专家和作业排版设计师。你正在使用Agent模式工作——生成方案后系统会自动验证，如果发现问题会反馈给你修正。

【当前用户配置】
- 纸张尺寸：{paper_w}mm x {paper_h}mm
- 页边距：上{margin_t}mm 下{margin_b}mm 左{margin_l}mm 右{margin_r}mm
- 可写区域：{writable_w}mm x {writable_h}mm
- 正文字号：{font_body}mm，行间距：{line_spacing}mm
- 每行约 {int(writable_w / (font_body * 1.2))} 个汉字

【你的任务】
1. 理解作业题目，生成准确答案
2. 设计排版方案，使用相对位置描述
3. 系统会自动验证你的方案，如果布局有问题（溢出、重叠），你需要修正

【输出格式 - 必须是JSON】
{{
  "answer_content": "完整答案内容",
  "layout_plan": {{
    "sections": [
      {{
        "type": "text",
        "content": "文字内容（会自动换行，无需手动加换行符）",
        "relative_position": {{"placement": "flow"}},
        "style": {{"font_size": "title"}}
      }},
      {{
        "type": "uml_usecase",
        "elements": {{
          "actors": ["参与者名称1", "参与者名称2"],
          "usecases": ["用例名称1", "用例名称2"],
          "relations": [
            {{"from": "参与者名称1", "to": "用例名称1", "type": "association"}},
            {{"from": "用例名称1", "to": "用例名称2", "type": "include"}}
          ]
        }},
        "relative_position": {{"placement": "center"}},
        "size_hint": {{"width_ratio": 0.8, "min_height": 80}}
      }},
      {{
        "type": "uml_class",
        "elements": {{
          "classes": [
            {{"name": "类名", "attributes": ["属性1", "属性2"], "methods": ["方法1()"]}}
          ],
          "relations": [
            {{"from": "类A", "to": "类B", "type": "inheritance"}}
          ]
        }},
        "relative_position": {{"placement": "center"}},
        "size_hint": {{"width_ratio": 0.9, "min_height": 100}}
      }},
      {{
        "type": "uml_sequence",
        "elements": {{
          "participants": ["对象A", "对象B", "对象C"],
          "messages": [
            {{"from": "对象A", "to": "对象B", "label": "消息1", "type": "sync"}},
            {{"from": "对象B", "to": "对象A", "label": "返回1", "type": "return"}}
          ]
        }},
        "relative_position": {{"placement": "center"}},
        "size_hint": {{"width_ratio": 0.9, "min_height": 120}}
      }},
      {{
        "type": "uml_activity",
        "elements": {{
          "activities": ["活动1", "活动2", "活动3"],
          "decisions": [{{"condition": "条件", "true_branch": "活动2", "false_branch": "活动3"}}],
          "start_node": true,
          "end_node": true
        }},
        "relative_position": {{"placement": "center"}},
        "size_hint": {{"width_ratio": 0.7, "min_height": 100}}
      }}
    ]
  }},
  "metadata": {{
    "difficulty": "easy/medium/hard",
    "key_concepts": ["概念1", "概念2"]
  }}
}}

【关键规则】
1. sections 数组中的 type 只能是：text, uml_usecase, uml_class, uml_sequence, uml_activity
2. relations 中的 from/to 必须与 actors/usecases/participants/classes 中的名称完全一致
3. 文字内容会自动换行，不需要手动添加换行
4. UML 图的元素数量要合理（参与者2-4个，用例3-8个）
5. 答案内容要完整、准确、规范"""

    def _build_user_prompt(self, q: Question, config_dict: dict) -> str:
        return f"""请分析以下作业题目，生成完整答案和排版方案。

【题目信息】
题号: {q.number}
类型: {q.type}
内容: {q.text}
要求: {', '.join(q.requirements) if q.requirements else '无特殊要求'}

请输出JSON格式的完整方案。"""

    def _define_tools(self) -> list:
        return [
            {"type": "function", "function": {"name": "calculate_layout", "description": "计算布局坐标", "parameters": {"type": "object", "properties": {"layout_plan": {"type": "object"}}, "required": ["layout_plan"]}}},
            {"type": "function", "function": {"name": "validate_layout", "description": "验证布局是否有效", "parameters": {"type": "object", "properties": {"commands": {"type": "array"}}, "required": ["commands"]}}},
            {"type": "function", "function": {"name": "render_preview", "description": "渲染布局预览SVG", "parameters": {"type": "object", "properties": {"commands": {"type": "array"}}, "required": ["commands"]}}},
        ]

    def _emit_progress(self, stage: str, message: str, data: dict = None):
        if self._on_progress:
            self._on_progress({'stage': stage, 'message': message, 'data': data or {}, 'timestamp': time.time()})
