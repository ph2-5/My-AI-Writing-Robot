import math
from typing import List, Dict, Any

import numpy as np

import config
from layout.models import Point, Stroke
from fonts.hershey import get_char_strokes


class LayoutEngine:

    def __init__(self, paper_width: float = None, paper_height: float = None, app_config=None):
        self._config = app_config if app_config is not None else config.DEFAULT_CONFIG
        self.paper_w = paper_width or self._config.PAPER_WIDTH
        self.paper_h = paper_height or self._config.PAPER_HEIGHT
        self.margin = {
            'top': self._config.MARGIN_TOP,
            'bottom': self._config.MARGIN_BOTTOM,
            'left': self._config.MARGIN_LEFT,
            'right': self._config.MARGIN_RIGHT,
        }
        self.writable = {
            'x': self.margin['left'],
            'y': self.margin['top'],
            'w': self.paper_w - self.margin['left'] - self.margin['right'],
            'h': self.paper_h - self.margin['top'] - self.margin['bottom'],
        }

    def calculate_layout(self, analysis_results: List[Dict[str, Any]]) -> List[Stroke]:
        all_strokes: List[Stroke] = []
        current_y = self.margin['top']

        for result in analysis_results:
            commands = result['analysis'].get('drawing_commands', [])

            needed_height = self._estimate_height(commands)
            if current_y + needed_height > self.paper_h - self.margin['bottom']:
                current_y = self.margin['top']

            strokes = self._generate_strokes(commands, offset_y=current_y)
            all_strokes.extend(strokes)

            current_y += needed_height + self._config.QUESTION_SPACING

        return all_strokes

    def _estimate_height(self, commands: List[Dict[str, Any]]) -> float:
        max_y = 0.0
        for cmd in commands:
            if 'y' in cmd:
                max_y = max(max_y, cmd['y'])
            if 'y2' in cmd:
                max_y = max(max_y, cmd['y2'])
            if 'cy' in cmd:
                ry = cmd.get('ry', cmd.get('height', 25) / 2)
                max_y = max(max_y, cmd['cy'] + ry)
        return max_y + 20

    def _generate_strokes(self, commands: List[Dict[str, Any]], offset_y: float = 0) -> List[Stroke]:
        strokes: List[Stroke] = []

        for cmd in commands:
            stroke_type = cmd.get('type', '')

            if stroke_type == 'text':
                path = self._text_to_path(
                    cmd['content'],
                    cmd['x'],
                    cmd['y'] + offset_y,
                    cmd.get('font_size', self._config.FONT_SIZE_BODY),
                )
                if path:
                    strokes.append(Stroke(points=path, pen_down=True))

            elif stroke_type == 'actor':
                actor_strokes = self._draw_actor(
                    cmd['x'],
                    cmd['y'] + offset_y,
                    cmd.get('height', 30),
                )
                strokes.extend(actor_strokes)
                if 'name' in cmd:
                    name_path = self._text_to_path(
                        cmd['name'],
                        cmd['x'] - len(cmd['name']) * 1.5,
                        cmd['y'] + offset_y + cmd.get('height', 30) * 0.4,
                        self._config.FONT_SIZE_LABEL,
                    )
                    if name_path:
                        strokes.append(Stroke(points=name_path, pen_down=True))

            elif stroke_type == 'usecase':
                cx = cmd.get('x', 0) + cmd.get('width', 50) / 2
                cy = cmd.get('y', 0) + offset_y + cmd.get('height', 25) / 2
                rx = cmd.get('width', 50) / 2
                ry = cmd.get('height', 25) / 2
                path = self._draw_ellipse(cx, cy, rx, ry)
                strokes.append(Stroke(points=path, pen_down=True))
                if 'name' in cmd:
                    name_path = self._text_to_path(
                        cmd['name'],
                        cx - len(cmd['name']) * 1.5,
                        cy + self._config.FONT_SIZE_LABEL * 0.3,
                        self._config.FONT_SIZE_LABEL,
                    )
                    if name_path:
                        strokes.append(Stroke(points=name_path, pen_down=True))

            elif stroke_type == 'ellipse':
                cx = cmd.get('cx', cmd.get('x', 0))
                cy = cmd.get('cy', cmd.get('y', 0)) + offset_y
                rx = cmd.get('rx', cmd.get('width', 50) / 2)
                ry = cmd.get('ry', cmd.get('height', 25) / 2)
                path = self._draw_ellipse(cx, cy, rx, ry)
                strokes.append(Stroke(points=path, pen_down=True))

            elif stroke_type == 'line':
                path = [
                    Point(cmd['x1'], cmd['y1'] + offset_y),
                    Point(cmd['x2'], cmd['y2'] + offset_y),
                ]
                strokes.append(Stroke(points=path, pen_down=True))

            elif stroke_type == 'dashed_line':
                dash_strokes = self._draw_dashed_line(
                    cmd['x1'], cmd['y1'] + offset_y,
                    cmd['x2'], cmd['y2'] + offset_y,
                    dash_length=5, gap_length=3,
                )
                strokes.extend(dash_strokes)
                if 'label' in cmd:
                    mid_x = (cmd['x1'] + cmd['x2']) / 2
                    mid_y = (cmd['y1'] + cmd['y2']) / 2 + offset_y - 2
                    label_path = self._text_to_path(
                        cmd['label'], mid_x - len(cmd['label']) * 1.2, mid_y,
                        self._config.FONT_SIZE_LABEL,
                    )
                    if label_path:
                        strokes.append(Stroke(points=label_path, pen_down=True))

            elif stroke_type == 'arrow':
                line_path = [
                    Point(cmd['x1'], cmd['y1'] + offset_y),
                    Point(cmd['x2'], cmd['y2'] + offset_y),
                ]
                strokes.append(Stroke(points=line_path, pen_down=True))
                arrow_head = self._draw_arrow_head(
                    cmd['x2'], cmd['y2'] + offset_y,
                    cmd['x1'], cmd['y1'] + offset_y,
                )
                strokes.append(Stroke(points=arrow_head, pen_down=True))

        return strokes

    def _text_to_path(self, text: str, x: float, y: float, font_size: float) -> List[Point]:
        points: List[Point] = []
        current_x = x

        for char in text:
            char_path = get_char_strokes(char, current_x, y, font_size)
            for p in char_path:
                if math.isnan(p.x) or math.isnan(p.y):
                    continue
                points.append(p)
            current_x += font_size * 1.2

        return points

    def _draw_actor(self, x: float, y: float, height: float) -> List[Stroke]:
        strokes: List[Stroke] = []
        h = height

        head_r = h * 0.12
        head_center = Point(x, y - h * 0.35)
        head_points: List[Point] = []
        for i in range(9):
            angle = 2 * np.pi * i / 8
            px = head_center.x + head_r * np.cos(angle)
            py = head_center.y + head_r * np.sin(angle)
            head_points.append(Point(px, py))
        strokes.append(Stroke(points=head_points, pen_down=True))

        body_points = [
            Point(x, y - h * 0.2),
            Point(x, y + h * 0.05),
        ]
        strokes.append(Stroke(points=body_points, pen_down=True))

        arm_y = y - h * 0.08
        left_arm_points = [
            Point(x, arm_y),
            Point(x - h * 0.18, y + h * 0.05),
        ]
        strokes.append(Stroke(points=left_arm_points, pen_down=True))

        right_arm_points = [
            Point(x, arm_y),
            Point(x + h * 0.18, y + h * 0.05),
        ]
        strokes.append(Stroke(points=right_arm_points, pen_down=True))

        leg_y = y + h * 0.05
        left_leg_points = [
            Point(x, leg_y),
            Point(x - h * 0.15, y + h * 0.35),
        ]
        strokes.append(Stroke(points=left_leg_points, pen_down=True))

        right_leg_points = [
            Point(x, leg_y),
            Point(x + h * 0.15, y + h * 0.35),
        ]
        strokes.append(Stroke(points=right_leg_points, pen_down=True))

        return strokes

    def _draw_ellipse(self, cx: float, cy: float, rx: float, ry: float, segments: int = 60) -> List[Point]:
        points: List[Point] = []
        for i in range(segments + 1):
            angle = 2 * np.pi * i / segments
            px = cx + rx * np.cos(angle)
            py = cy + ry * np.sin(angle)
            points.append(Point(px, py))
        return points

    def _draw_dashed_line(self, x1: float, y1: float, x2: float, y2: float,
                          dash_length: float = 5, gap_length: float = 3) -> List[Stroke]:
        strokes: List[Stroke] = []
        total_length = np.hypot(x2 - x1, y2 - y1)
        if total_length < 0.01:
            return strokes

        dx = (x2 - x1) / total_length
        dy = (y2 - y1) / total_length

        pos = 0.0
        drawing = True

        while pos < total_length:
            seg_len = dash_length if drawing else gap_length
            seg_len = min(seg_len, total_length - pos)

            sx = x1 + dx * pos
            sy = y1 + dy * pos
            ex = x1 + dx * (pos + seg_len)
            ey = y1 + dy * (pos + seg_len)

            if drawing:
                strokes.append(Stroke(points=[Point(sx, sy), Point(ex, ey)], pen_down=True))

            pos += seg_len
            drawing = not drawing

        return strokes

    def _draw_arrow_head(self, x: float, y: float, from_x: float, from_y: float, size: float = 3) -> List[Point]:
        angle = np.arctan2(y - from_y, x - from_x)
        points: List[Point] = []

        for i in range(4):
            a = angle + np.pi + (i - 1) * np.pi / 3
            px = x + size * np.cos(a)
            py = y + size * np.sin(a)
            points.append(Point(px, py))

        return points
