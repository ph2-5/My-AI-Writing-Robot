import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from layout.models import Point, Stroke, Question
from layout.layout_engine import LayoutEngine
from effects.hand_drawn import HandDrawnEffect
from output.command_generator import RobotCommandGenerator
from fonts.hershey import get_char_strokes, get_char_width


# ========== 基础模型测试 ==========

def test_point():
    p = Point(x=10.0, y=20.0)
    assert p.x == 10.0
    assert p.y == 20.0


def test_stroke():
    s = Stroke(points=[Point(0, 0), Point(10, 10)], pen_down=True, speed=25.0)
    assert len(s.points) == 2
    assert s.pen_down is True


def test_question():
    q = Question(number=1, type='uml_usecase', text='test', requirements=['handwritten'])
    assert q.number == 1
    assert q.type == 'uml_usecase'


# ========== 字体测试 ==========

def test_hershey_ascii():
    points = get_char_strokes('A', 0, 10, 4.2)
    assert len(points) > 0
    assert all(isinstance(p, Point) for p in points)


def test_hershey_cjk():
    points = get_char_strokes('学', 0, 10, 4.2)
    assert len(points) > 0


def test_hershey_unknown():
    points = get_char_strokes('€', 0, 10, 4.2)
    assert len(points) > 0


def test_char_width():
    w = get_char_width('A', 4.2)
    assert w > 0
    w_cjk = get_char_width('学', 4.2)
    assert w_cjk > 0


# ========== 布局引擎基础测试 ==========

def test_layout_engine_ellipse():
    engine = LayoutEngine()
    points = engine._draw_ellipse(100, 100, 30, 15)
    assert len(points) == 61
    assert abs(points[0].x - points[-1].x) < 0.01
    assert abs(points[0].y - points[-1].y) < 0.01


def test_layout_engine_actor():
    engine = LayoutEngine()
    strokes = engine._draw_actor(50, 100, 30)
    assert len(strokes) > 0


def test_layout_engine_dashed_line():
    engine = LayoutEngine()
    strokes = engine._draw_dashed_line(0, 0, 20, 0, dash_length=5, gap_length=3)
    assert len(strokes) > 0
    for s in strokes:
        assert s.pen_down is True
        assert len(s.points) == 2


def test_layout_engine_arrow_head():
    engine = LayoutEngine()
    points = engine._draw_arrow_head(100, 100, 80, 100, size=3)
    assert len(points) == 4


# ========== 新增图形原语测试 ==========

def test_layout_engine_rectangle():
    """测试矩形绘制"""
    engine = LayoutEngine()
    strokes = engine._draw_rectangle(10, 20, 50, 30)
    assert len(strokes) == 4  # 四边
    for s in strokes:
        assert s.pen_down is True
        assert len(s.points) == 2


def test_layout_engine_circle():
    """测试圆形绘制"""
    engine = LayoutEngine()
    points = engine._draw_ellipse(100, 100, 25, 25)  # rx=ry=圆
    assert len(points) == 61
    # 验证是圆形：所有点到圆心距离相等
    for p in points:
        dist = ((p.x - 100) ** 2 + (p.y - 100) ** 2) ** 0.5
        assert abs(dist - 25) < 0.1


def test_layout_engine_arc():
    """测试圆弧绘制"""
    engine = LayoutEngine()
    import math
    points = engine._draw_arc(100, 100, 30, 0, math.pi / 2)  # 90度圆弧
    assert len(points) == 31
    # 验证起点和终点
    assert abs(points[0].x - 130) < 0.1  # 0度：x=100+30
    assert abs(points[0].y - 100) < 0.1
    assert abs(points[-1].x - 100) < 0.1  # 90度：x=100
    assert abs(points[-1].y - 70) < 0.1   # y=100-30


def test_layout_engine_bezier():
    """测试贝塞尔曲线绘制"""
    engine = LayoutEngine()
    control_points = [(0, 0), (50, 100), (100, 0)]  # 二次贝塞尔
    points = engine._draw_bezier(control_points)
    assert len(points) == 51
    # 验证起点和终点
    assert abs(points[0].x - 0) < 0.1
    assert abs(points[0].y - 0) < 0.1
    assert abs(points[-1].x - 100) < 0.1
    assert abs(points[-1].y - 0) < 0.1


def test_layout_engine_coordinate_system():
    """测试坐标系绘制"""
    engine = LayoutEngine()
    strokes = engine._draw_coordinate_system(10, 10, 80, 60)
    assert len(strokes) >= 4  # X轴、Y轴、两个箭头、两个标签


def test_layout_engine_dimension():
    """测试尺寸标注绘制"""
    engine = LayoutEngine()
    strokes = engine._draw_dimension(10, 50, 60, 50, '50mm', 'horizontal')
    assert len(strokes) >= 4  # 尺寸线、边界线、两个箭头、文字


def test_layout_engine_center_line():
    """测试中心线（点划线）绘制"""
    engine = LayoutEngine()
    strokes = engine._draw_center_line(0, 50, 100, 50)
    assert len(strokes) > 0
    # 验证长划和短划交替
    assert len(strokes) >= 3


# ========== 完整布局测试 ==========

def test_layout_engine_full():
    engine = LayoutEngine()
    analysis = [{
        'question': Question(number=1, type='uml_usecase', text='test', requirements=[]),
        'analysis': {
            'drawing_commands': [
                {'type': 'text', 'content': 'Hello', 'x': 15, 'y': 25, 'font_size': 4.2},
                {'type': 'ellipse', 'cx': 100, 'cy': 80, 'rx': 30, 'ry': 15},
                {'type': 'line', 'x1': 30, 'y1': 80, 'x2': 70, 'y2': 80},
                {'type': 'arrow', 'x1': 70, 'y1': 80, 'x2': 100, 'y2': 80},
                {'type': 'dashed_line', 'x1': 50, 'y1': 60, 'x2': 50, 'y2': 100},
            ],
        },
    }]
    strokes = engine.calculate_layout(analysis)
    assert len(strokes) > 0


def test_layout_engine_new_primitives():
    """测试新增图形原语的完整布局"""
    engine = LayoutEngine()
    analysis = [{
        'question': Question(number=1, type='mechanical_drawing', text='test', requirements=[]),
        'analysis': {
            'drawing_commands': [
                {'type': 'text', 'content': '机械制图示例', 'x': 15, 'y': 25, 'font_size': 4.2},
                {'type': 'rect', 'x': 50, 'y': 50, 'width': 60, 'height': 40},
                {'type': 'circle', 'cx': 80, 'cy': 70, 'r': 15},
                {'type': 'arc', 'cx': 80, 'cy': 70, 'r': 20, 'start_angle': 0, 'end_angle': 90},
                {'type': 'dimension', 'x1': 50, 'y1': 100, 'x2': 110, 'y2': 100, 'value': '60mm'},
                {'type': 'center_line', 'x1': 80, 'y1': 40, 'x2': 80, 'y2': 100},
            ],
        },
    }]
    strokes = engine.calculate_layout(analysis)
    assert len(strokes) > 0
    # 验证包含各种图形类型的笔画
    stroke_types = set()
    for s in strokes:
        if len(s.points) >= 2:
            # 根据点的数量和形状推断类型
            stroke_types.add(len(s.points))
    assert len(stroke_types) > 1  # 至少有两种不同的笔画类型


# ========== 手绘效果测试 ==========

def test_hand_drawn_effect():
    strokes = [
        Stroke(points=[Point(0, 0), Point(10, 10), Point(20, 5)], pen_down=True, speed=25.0),
        Stroke(points=[Point(30, 30), Point(40, 40)], pen_down=False, speed=80.0),
    ]
    effect = HandDrawnEffect(seed=42)
    result = effect.apply(strokes)
    assert len(result) == 2
    assert result[0].pen_down is True
    assert result[1].pen_down is False
    assert result[0].speed != 25.0


def test_hand_drawn_reproducibility():
    strokes = [Stroke(points=[Point(0, 0), Point(10, 10), Point(20, 5)], pen_down=True)]
    effect1 = HandDrawnEffect(seed=42)
    result1 = effect1.apply(strokes)
    effect2 = HandDrawnEffect(seed=42)
    result2 = effect2.apply(strokes)
    for p1, p2 in zip(result1[0].points, result2[0].points):
        assert abs(p1.x - p2.x) < 0.001
        assert abs(p1.y - p2.y) < 0.001


# ========== 输出格式测试 ==========

def test_svg_output():
    strokes = [
        Stroke(points=[Point(10, 20), Point(30, 40)], pen_down=True, speed=25.0),
        Stroke(points=[Point(50, 60), Point(70, 80)], pen_down=False, speed=80.0),
    ]
    gen = RobotCommandGenerator(platform='svg')
    output = gen.generate(strokes)
    assert '<svg' in output
    assert 'stroke' in output
    assert 'path' in output


def test_kuixiang_output():
    strokes = [
        Stroke(points=[Point(10, 20), Point(30, 40)], pen_down=True, speed=25.0),
    ]
    gen = RobotCommandGenerator(platform='kuixiang')
    output = gen.generate(strokes)
    assert 'kuixiang-carving' in output
    assert 'data-speed' in output
    assert 'handdrawn' in output


def test_gcode_output():
    strokes = [
        Stroke(points=[Point(10, 20), Point(30, 40), Point(50, 60)], pen_down=True, speed=25.0),
    ]
    gen = RobotCommandGenerator(platform='gcode')
    output = gen.generate(strokes)
    assert 'G21' in output
    assert 'G90' in output
    assert 'G28' in output
    assert 'G1' in output


def test_unsupported_platform():
    gen = RobotCommandGenerator(platform='unknown')
    try:
        gen.generate([])
        assert False, "Should have raised ValueError"
    except ValueError:
        pass


# ========== 图像分析测试 ==========

def test_image_analyzer_error_handling():
    """测试图像分析错误处理"""
    from analyzers.image_analyzer import ImageAnalyzer
    analyzer = ImageAnalyzer()
    # 测试无效输入
    result = analyzer._error_result("测试错误")
    assert result['success'] is False
    assert result['error'] == "测试错误"
    assert result['image_type'] == 'unknown'


def test_image_analyzer_parse_response():
    """测试图像分析响应解析"""
    from analyzers.image_analyzer import ImageAnalyzer
    analyzer = ImageAnalyzer()
    
    # 测试有效JSON
    valid_json = '{"image_type": "mechanical", "description": "测试", "elements": []}'
    result = analyzer._parse_response(valid_json)
    assert result['image_type'] == 'mechanical'
    assert result['description'] == '测试'
    
    # 测试无效JSON
    invalid_json = '不是JSON'
    result = analyzer._parse_response(invalid_json)
    assert result['image_type'] == 'unknown'
    assert result['description'] == '不是JSON'


# ========== 布局设计器测试 ==========

def test_layout_designer_smart_adjust():
    """测试智能布局调整（不截断内容）"""
    from analyzers.agent.layout_designer import LayoutDesignerAgent
    from layout.models import Question
    
    agent = LayoutDesignerAgent()
    question = Question(number=1, type='text', text='测试', requirements=[])
    
    # 创建测试plan
    plan = {
        'answer_content': '这是一个很长的答案内容，不应该被截断',
        'layout_plan': {
            'sections': [
                {
                    'type': 'text',
                    'content': '这是一个很长的答案内容，不应该被截断',
                    'style': {'font_size': 'body'},
                    'relative_position': {'placement': 'flow'}
                }
            ]
        }
    }
    
    # 模拟溢出问题
    issues = [{'type': 'overflow_right'}]
    adjusted = agent._smart_adjust_layout(plan, issues, {})
    
    # 验证内容没有被截断
    sections = adjusted['layout_plan']['sections']
    assert sections[0]['content'] == '这是一个很长的答案内容，不应该被截断'
    # 验证字号被调整（而不是内容被截断）
    assert sections[0]['style']['font_size'] == 'label'


# ========== 作业解析器测试 ==========

def test_homework_parser_type_detection():
    """测试题型识别"""
    from parsers.homework_parser import HomeworkParser
    
    parser = HomeworkParser.__new__(HomeworkParser)
    
    # 测试UML用例图
    assert parser._detect_question_type('请画出学生管理系统的用例图') == 'uml_usecase'
    
    # 测试机械制图
    assert parser._detect_question_type('画出该零件的三视图') == 'mechanical_drawing'
    
    # 测试电路图
    assert parser._detect_question_type('绘制该电路的原理图') == 'circuit_diagram'
    
    # 测试数学函数
    assert parser._detect_question_type('画出函数y=x^2的图像') == 'math_function'
    
    # 测试未知类型
    assert parser._detect_question_type('请简述人工智能的发展') == 'essay'


if __name__ == '__main__':
    tests = [v for k, v in sorted(globals().items()) if k.startswith('test_')]
    passed = 0
    failed = 0
    for test in tests:
        try:
            test()
            print(f"  PASS: {test.__name__}")
            passed += 1
        except Exception as e:
            print(f"  FAIL: {test.__name__}: {e}")
            failed += 1
    print(f"\n{passed} passed, {failed} failed, {passed + failed} total")
