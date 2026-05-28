import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from layout.models import Point, Stroke, Question
from layout.layout_engine import LayoutEngine
from effects.hand_drawn import HandDrawnEffect
from output.command_generator import RobotCommandGenerator
from fonts.hershey import get_char_strokes, get_char_width


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


def test_layout_engine_ellipse():
    engine = LayoutEngine()
    points = engine._draw_ellipse(100, 100, 30, 15)
    assert len(points) == 61
    assert abs(points[0].x - points[-1].x) < 0.01
    assert abs(points[0].y - points[-1].y) < 0.01


def test_layout_engine_actor():
    engine = LayoutEngine()
    points = engine._draw_actor(50, 100, 30)
    assert len(points) > 0


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
