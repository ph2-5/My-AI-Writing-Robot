import argparse
import json
import sys
import os

import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import config as cfg
from logging_utils import get_logger

from parsers.homework_parser import HomeworkParser
from analyzers.homework_analyzer import HomeworkAnalyzer
from analyzers.image_analyzer import ImageAnalyzer
from layout.layout_engine import LayoutEngine
from layout.precision_layout import PrecisionLayout
from effects.hand_drawn import HandDrawnEffect
from effects.text_deformer import TextDeformer
from output.command_generator import RobotCommandGenerator
from analyzers.agent.style_strategist import StyleStrategist

logger = get_logger('main')


def load_config_from_dict(config_dict: dict) -> cfg.AppConfig:
    mapping = {
        'paperWidth': 'PAPER_WIDTH',
        'paperHeight': 'PAPER_HEIGHT',
        'marginTop': 'MARGIN_TOP',
        'marginBottom': 'MARGIN_BOTTOM',
        'marginLeft': 'MARGIN_LEFT',
        'marginRight': 'MARGIN_RIGHT',
        'fontSizeTitle': 'FONT_SIZE_TITLE',
        'fontSizeBody': 'FONT_SIZE_BODY',
        'fontSizeLabel': 'FONT_SIZE_LABEL',
        'lineSpacing': 'LINE_SPACING',
        'questionSpacing': 'QUESTION_SPACING',
        'charSpacing': 'CHAR_SPACING',
        'charSpacingVar': 'CHAR_SPACING_VAR',
        'baselineWobble': 'BASELINE_WOBBLE',
        'slant': 'SLANT',
        'penUpHeight': 'PEN_UP_HEIGHT',
        'penDownHeight': 'PEN_DOWN_HEIGHT',
        'travelSpeed': 'TRAVEL_SPEED',
        'drawSpeed': 'DRAW_SPEED',
        'handDrawnAmplitude': 'HAND_DRAWN_AMPLITUDE',
        'handDrawnCornerExaggeration': 'HAND_DRAWN_CORNER_EXAGGERATION',
        'llmBaseUrl': 'LLM_BASE_URL',
        'llmApiKey': 'LLM_API_KEY',
        'llmModel': 'LLM_MODEL',
    }
    mapped = {}
    for camel_key, snake_key in mapping.items():
        if camel_key in config_dict:
            mapped[snake_key] = config_dict[camel_key]
    return cfg.DEFAULT_CONFIG.merge_dict(mapped)


def run_generate(docx_path: str, output_format: str = 'kuixiang', seed: int = None,
                 output_path: str = None, config_dict: dict = None, config: cfg.AppConfig = None,
                 api_config: dict = None):
    if config is None:
        if config_dict:
            config = load_config_from_dict(config_dict)
        else:
            config = cfg.DEFAULT_CONFIG

    if api_config:
        api_url = api_config.get('apiUrl', '')
        api_key = api_config.get('apiKey', '')
        model_id = api_config.get('modelId', '')
        if api_url:
            config = config.merge_dict({'LLM_BASE_URL': api_url})
        if api_key:
            config = config.merge_dict({'LLM_API_KEY': api_key})
        if model_id:
            config = config.merge_dict({'LLM_MODEL': model_id})

    log_lines = []

    def log(msg):
        log_lines.append(msg)
        logger.info(msg)

    log(f"[1/7] 解析Word文档: {docx_path}")
    parser = HomeworkParser(docx_path)
    parsed = parser.parse()

    questions_data = []
    for q in parsed['questions']:
        questions_data.append({
            'number': q.number,
            'type': q.type,
            'text': q.text,
            'requirements': q.requirements,
        })
    log(f"  识别到 {len(parsed['questions'])} 道题目")
    
    # 检查是否有图片题目
    image_questions = parsed.get('image_questions', [])
    if image_questions:
        log(f"  发现 {len(image_questions)} 道题目包含图片")

    log("[2/7] 多模态图像分析（如需要）...")
    image_analyzer = ImageAnalyzer(app_config=config)
    image_analysis_results = {}
    
    for img_q in image_questions:
        q_num = img_q['question_number']
        images = img_q['images']
        if images:
            # 分析第一张图片
            result = image_analyzer.analyze_image(images[0])
            if result['success']:
                image_analysis_results[q_num] = result
                log(f"  第 {q_num} 题图片分析完成: {result.get('image_type', 'unknown')}")
            else:
                log(f"  第 {q_num} 题图片分析失败: {result.get('error', '未知错误')}")

    log("[3/7] LLM智能分析（动态配置注入）...")
    analyzer = HomeworkAnalyzer(app_config=config)
    analyses = analyzer.batch_analyze(parsed['questions'], user_config=config_dict)
    
    # 将图像分析结果合并到LLM分析结果中
    for result in analyses:
        question = result['question']
        if question.number in image_analysis_results:
            img_result = image_analysis_results[question.number]
            # 将图像分析的元素添加到drawing_commands
            if 'drawing_commands' not in result['analysis']:
                result['analysis']['drawing_commands'] = []
            
            # 转换图像元素为绘制命令
            paper_config = config_dict or {}
            drawing_commands = image_analyzer.extract_drawing_commands(img_result, paper_config)
            result['analysis']['drawing_commands'].extend(drawing_commands)
            
            # 更新题目类型（如果图像识别出更具体的类型）
            if img_result.get('image_type') != 'unknown':
                result['analysis']['detected_image_type'] = img_result['image_type']

    log("[4/7] AI Agent 精确排版...")
    all_commands = []
    for result in analyses:
        analysis = result['analysis']
        layout_plan = analysis.get('layout_plan', {})

        if not layout_plan or not layout_plan.get('sections'):
            question = result['question']
            answer = analysis.get('answer_content', '')
            layout_plan = {
                'sections': [
                    {'type': 'text', 'content': f"{question.number}. {question.text}", 'style': {'font_size': 'title'}, 'relative_position': {'placement': 'flow'}},
                    {'type': 'text', 'content': answer, 'style': {'font_size': 'body'}, 'relative_position': {'placement': 'flow'}},
                ]
            }
            log(f"  第 {question.number} 题 LLM未返回layout_plan，自动生成文本排版")

        precision = PrecisionLayout(app_config=config)
        commands = precision.calculate(layout_plan)

        validated = precision.validate(commands)
        if not validated['valid']:
            log(f"  发现 {len(validated['issues'])} 个布局问题，自动修正...")
            commands = precision.adjust(commands, validated['issues'])

        all_commands.extend(commands)
        
        drawing_commands = analysis.get('drawing_commands', [])
        if drawing_commands:
            all_commands.extend(drawing_commands)

    log("[5/7] 排版引擎路径生成...")
    engine = LayoutEngine(app_config=config)
    strokes = engine._generate_strokes(all_commands, offset_y=0)

    log("[6/7] 字体变形 + 手绘风格化...")
    text_deformer = TextDeformer(seed=seed, app_config=config)
    deformed_strokes = text_deformer.deform(strokes, config_dict or {})

    effect = HandDrawnEffect(seed=seed, app_config=config)
    handdrawn_strokes = effect.apply(deformed_strokes)

    log("[7/7] 生成机器人指令...")
    generator = RobotCommandGenerator(platform=output_format, app_config=config)
    output = generator.generate(handdrawn_strokes)

    if output_path is None:
        ext = 'svg' if output_format in ('kuixiang', 'svg') else 'gcode'
        output_path = f"homework_output.{ext}"

    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(output)

    total_points = sum(len(s.points) for s in handdrawn_strokes if s.pen_down)
    estimated_time = total_points / config.DRAW_SPEED / 60.0

    log(f"作业已生成: {output_path}")
    log(f"总笔画数: {len(handdrawn_strokes)}")
    log(f"预计书写时间: {estimated_time:.1f} 分钟")

    style_strategist = StyleStrategist()
    style_recommendations = []
    for q in parsed['questions']:
        rec = style_strategist.recommend(q.type, config_dict.get('paperTemplate', 'blank') if config_dict else 'blank')
        style_recommendations.append({'type': q.type, 'recommendation': rec})

    return {
        'success': True,
        'outputPath': output_path,
        'strokeCount': len(handdrawn_strokes),
        'estimatedTime': round(estimated_time, 1),
        'questions': questions_data,
        'log': '\n'.join(log_lines),
        'styleRecommendations': style_recommendations,
        'imageAnalysis': {
            'totalImages': len(image_questions),
            'analyzedImages': len(image_analysis_results),
            'results': {str(k): v.get('image_type', 'unknown') for k, v in image_analysis_results.items()}
        }
    }


def run_parse_only(docx_path: str):
    parser = HomeworkParser(docx_path)
    parsed = parser.parse()

    questions_data = []
    for q in parsed['questions']:
        questions_data.append({
            'number': q.number,
            'type': q.type,
            'text': q.text,
            'requirements': q.requirements,
        })

    return {
        'questions': questions_data,
        'questionCount': len(questions_data),
        'hasImages': len(parsed.get('images', [])) > 0,
        'imageQuestions': [iq['question_number'] for iq in parsed.get('image_questions', [])]
    }


def run_preview(docx_path: str, config_dict: dict = None, on_progress=None, api_config: dict = None):
    from layout.answer_planner import AnswerPlanner

    parser = HomeworkParser(docx_path)
    parsed = parser.parse()

    local_config = load_config_from_dict(config_dict) if config_dict else None

    if api_config and local_config:
        api_url = api_config.get('apiUrl', '')
        api_key = api_config.get('apiKey', '')
        model_id = api_config.get('modelId', '')
        if api_url:
            local_config = local_config.merge_dict({'LLM_BASE_URL': api_url})
        if api_key:
            local_config = local_config.merge_dict({'LLM_API_KEY': api_key})
        if model_id:
            local_config = local_config.merge_dict({'LLM_MODEL': model_id})

    planner = AnswerPlanner(
        app_config=local_config,
        on_progress=on_progress,
    )
    result = planner.plan_answers(parsed['questions'], user_config=config_dict)

    questions_data = []
    for q in parsed['questions']:
        questions_data.append({
            'number': q.number,
            'type': q.type,
            'text': q.text,
            'requirements': q.requirements,
        })

    result['questions'] = questions_data
    return result


def demo():
    logger.info("=== 演示模式：使用硬编码数据 ===\n")

    from layout.models import Point, Stroke, Question

    demo_analysis = [{
        'question': Question(number=1, type='uml_usecase', text='学生成绩管理系统用例图',
                             requirements=['handwritten', 'diagram_usecase']),
        'analysis': {
            'layout_plan': {
                'sections': [
                    {'type': 'text', 'content': '1. 学生成绩管理系统用例图', 'style': {'font_size': 'title'}, 'relative_position': {'placement': 'flow'}},
                    {'type': 'uml_usecase', 'elements': {
                        'actors': ['教务管理人员', '学生'],
                        'usecases': ['登录系统', '成绩管理', '选课', '生成成绩单'],
                        'relations': [
                            {'from': '教务管理人员', 'to': '登录系统', 'type': 'association'},
                            {'from': '教务管理人员', 'to': '成绩管理', 'type': 'association'},
                            {'from': '学生', 'to': '选课', 'type': 'association'},
                            {'from': '学生', 'to': '生成成绩单', 'type': 'association'},
                            {'from': '成绩管理', 'to': '生成成绩单', 'type': 'include'},
                        ]
                    }, 'relative_position': {'placement': 'center'}, 'size_hint': {'width_ratio': 0.8, 'min_height': 80}},
                ]
            },
        },
    }]

    logger.info("[1/4] AI Agent 精确排版...")
    config_dict = {
        'paperWidth': 210, 'paperHeight': 297,
        'marginTop': 20, 'marginBottom': 20, 'marginLeft': 15, 'marginRight': 15,
        'fontSizeTitle': 5.0, 'fontSizeBody': 4.2, 'fontSizeLabel': 3.5,
        'lineSpacing': 6.3, 'questionSpacing': 15, 'charSpacing': 1.2,
    }
    local_config = load_config_from_dict(config_dict)
    precision = PrecisionLayout(app_config=local_config)
    all_commands = []
    for result in demo_analysis:
        layout_plan = result['analysis'].get('layout_plan', {})
        commands = precision.calculate(layout_plan)
        validated = precision.validate(commands)
        if not validated['valid']:
            commands = precision.adjust(commands, validated['issues'])
        all_commands.extend(commands)

    logger.info("[2/4] 排版引擎路径生成...")
    engine = LayoutEngine(app_config=local_config)
    strokes = engine._generate_strokes(all_commands, offset_y=0)

    logger.info("[3/4] 字体变形 + 手绘风格化...")
    text_deformer = TextDeformer(seed=42, app_config=local_config)
    deformed = text_deformer.deform(strokes, config_dict)
    effect = HandDrawnEffect(seed=42, app_config=local_config)
    handdrawn_strokes = effect.apply(deformed)

    logger.info("[4/4] 生成机器人指令...")
    generator = RobotCommandGenerator(platform='kuixiang', app_config=local_config)
    output = generator.generate(handdrawn_strokes)

    output_path = 'demo_output.svg'
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(output)

    total_points = sum(len(s.points) for s in handdrawn_strokes if s.pen_down)
    estimated_time = total_points / local_config.DRAW_SPEED / 60.0

    style_strategist = StyleStrategist()
    style_rec = style_strategist.recommend('uml_usecase', 'blank')

    result = {
        'success': True,
        'outputPath': output_path,
        'strokeCount': len(handdrawn_strokes),
        'estimatedTime': round(estimated_time, 1),
        'svgContent': output,
        'log': '演示模式完成',
        'styleRecommendation': style_rec,
    }
    logger.info(json.dumps(result, ensure_ascii=False))
    return result


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='AI自动写作业系统')
    parser.add_argument('--input', type=str, help='Word文档路径')
    parser.add_argument('--format', type=str, default='kuixiang',
                        choices=['kuixiang', 'svg', 'gcode'], help='输出格式')
    parser.add_argument('--seed', type=int, default=None, help='手绘效果随机种子')
    parser.add_argument('--output', type=str, default=None, help='输出文件路径')
    parser.add_argument('--demo', action='store_true', help='使用演示模式（无需Word文档）')
    parser.add_argument('--config', type=str, default=None, help='JSON配置文件路径')
    parser.add_argument('--json-output', action='store_true', help='以JSON格式输出结果')
    parser.add_argument('--parse-only', action='store_true', help='仅解析Word文档，不生成')
    parser.add_argument('--preview', action='store_true', help='预览答案布局（不生成指令）')

    args = parser.parse_args()

    config_dict = None
    if args.config:
        with open(args.config, 'r', encoding='utf-8') as f:
            config_dict = json.load(f)

    if args.demo:
        result = demo()
        logger.info(json.dumps(result, ensure_ascii=False))
    elif args.input and args.parse_only:
        result = run_parse_only(args.input)
        logger.info(json.dumps(result, ensure_ascii=False))
    elif args.input and args.preview:
        result = run_preview(args.input, config_dict=config_dict)
        logger.info(json.dumps(result, ensure_ascii=False))
    elif args.input:
        result = run_generate(
            args.input,
            output_format=args.format,
            seed=args.seed,
            output_path=args.output,
            config_dict=config_dict,
        )
        if args.json_output:
            with open(result['outputPath'], 'r', encoding='utf-8') as f:
                result['svgContent'] = f.read()
            logger.info(json.dumps(result, ensure_ascii=False))
    else:
        logger.error("请使用 --input 指定Word文档路径，或使用 --demo 运行演示模式")
        sys.exit(1)
