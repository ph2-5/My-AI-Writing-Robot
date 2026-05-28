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
            if 'height' in cmd and 'y' in cmd:
                max_y = max(max_y, cmd['y'] + cmd['height'])
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

            # ========== 新增图形原语 ==========
            elif stroke_type == 'circle':
                cx = cmd.get('cx', cmd.get('x', 0))
                cy = cmd.get('cy', cmd.get('y', 0)) + offset_y
                r = cmd.get('r', cmd.get('radius', 25))
                path = self._draw_ellipse(cx, cy, r, r)
                strokes.append(Stroke(points=path, pen_down=True))

            elif stroke_type == 'rect':
                x = cmd.get('x', 0)
                y = cmd.get('y', 0) + offset_y
                w = cmd.get('width', 50)
                h = cmd.get('height', 30)
                rect_strokes = self._draw_rectangle(x, y, w, h)
                strokes.extend(rect_strokes)

            elif stroke_type == 'arc':
                cx = cmd.get('cx', cmd.get('x', 0))
                cy = cmd.get('cy', cmd.get('y', 0)) + offset_y
                r = cmd.get('r', cmd.get('radius', 25))
                start_angle = math.radians(cmd.get('start_angle', 0))
                end_angle = math.radians(cmd.get('end_angle', 90))
                path = self._draw_arc(cx, cy, r, start_angle, end_angle)
                strokes.append(Stroke(points=path, pen_down=True))

            elif stroke_type == 'polygon':
                points = cmd.get('points', [])
                if len(points) >= 3:
                    path = [Point(p['x'], p['y'] + offset_y) for p in points]
                    path.append(Point(points[0]['x'], points[0]['y'] + offset_y))  # 闭合
                    strokes.append(Stroke(points=path, pen_down=True))

            elif stroke_type == 'bezier':
                points = cmd.get('points', [])
                if len(points) >= 4:
                    path = self._draw_bezier(
                        [(p['x'], p['y'] + offset_y) for p in points]
                    )
                    strokes.append(Stroke(points=path, pen_down=True))

            elif stroke_type == 'coordinate_system':
                coord_strokes = self._draw_coordinate_system(
                    cmd.get('x', 0),
                    cmd.get('y', 0) + offset_y,
                    cmd.get('width', 100),
                    cmd.get('height', 80),
                    cmd.get('x_label', 'x'),
                    cmd.get('y_label', 'y')
                )
                strokes.extend(coord_strokes)

            elif stroke_type == 'dimension':
                dim_strokes = self._draw_dimension(
                    cmd.get('x1', 0),
                    cmd.get('y1', 0) + offset_y,
                    cmd.get('x2', 50),
                    cmd.get('y2', 0) + offset_y,
                    cmd.get('value', '50'),
                    cmd.get('direction', 'horizontal')
                )
                strokes.extend(dim_strokes)

            elif stroke_type == 'center_line':
                # 中心线（点划线）
                center_strokes = self._draw_center_line(
                    cmd.get('x1', 0),
                    cmd.get('y1', 0) + offset_y,
                    cmd.get('x2', 100),
                    cmd.get('y2', 0) + offset_y
                )
                strokes.extend(center_strokes)

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

    def _draw_rectangle(self, x: float, y: float, w: float, h: float) -> List[Stroke]:
        """绘制矩形（四边）"""
        strokes: List[Stroke] = []
        # 上边
        strokes.append(Stroke(points=[
            Point(x, y), Point(x + w, y)
        ], pen_down=True))
        # 右边
        strokes.append(Stroke(points=[
            Point(x + w, y), Point(x + w, y + h)
        ], pen_down=True))
        # 下边
        strokes.append(Stroke(points=[
            Point(x + w, y + h), Point(x, y + h)
        ], pen_down=True))
        # 左边
        strokes.append(Stroke(points=[
            Point(x, y + h), Point(x, y)
        ], pen_down=True))
        return strokes

    def _draw_arc(self, cx: float, cy: float, r: float, 
                  start_angle: float, end_angle: float, segments: int = 30) -> List[Point]:
        """绘制圆弧"""
        points: List[Point] = []
        angle_range = end_angle - start_angle
        for i in range(segments + 1):
            angle = start_angle + angle_range * i / segments
            px = cx + r * np.cos(angle)
            py = cy + r * np.sin(angle)
            points.append(Point(px, py))
        return points

    def _draw_bezier(self, control_points: List[tuple], segments: int = 50) -> List[Point]:
        """绘制贝塞尔曲线"""
        points: List[Point] = []
        n = len(control_points) - 1
        
        for i in range(segments + 1):
            t = i / segments
            x, y = 0, 0
            for j, (px, py) in enumerate(control_points):
                # 伯恩斯坦基函数
                coeff = math.comb(n, j) * (t ** j) * ((1 - t) ** (n - j))
                x += coeff * px
                y += coeff * py
            points.append(Point(x, y))
        
        return points

    def _draw_coordinate_system(self, x: float, y: float, w: float, h: float,
                                 x_label: str = 'x', y_label: str = 'y') -> List[Stroke]:
        """绘制坐标系"""
        strokes: List[Stroke] = []
        origin_x = x + w * 0.1
        origin_y = y + h * 0.9
        axis_length = min(w, h) * 0.8
        
        # X轴
        strokes.append(Stroke(points=[
            Point(origin_x, origin_y),
            Point(origin_x + axis_length, origin_y)
        ], pen_down=True))
        # X轴箭头
        strokes.append(Stroke(points=self._draw_arrow_head(
            origin_x + axis_length, origin_y,
            origin_x, origin_y, size=3
        ), pen_down=True))
        
        # Y轴
        strokes.append(Stroke(points=[
            Point(origin_x, origin_y),
            Point(origin_x, origin_y - axis_length)
        ], pen_down=True))
        # Y轴箭头
        strokes.append(Stroke(points=self._draw_arrow_head(
            origin_x, origin_y - axis_length,
            origin_x, origin_y, size=3
        ), pen_down=True))
        
        # 标签
        x_label_path = self._text_to_path(x_label, origin_x + axis_length + 2, origin_y, 4)
        if x_label_path:
            strokes.append(Stroke(points=x_label_path, pen_down=True))
        y_label_path = self._text_to_path(y_label, origin_x - 2, origin_y - axis_length - 4, 4)
        if y_label_path:
            strokes.append(Stroke(points=y_label_path, pen_down=True))
        
        return strokes

    def _draw_dimension(self, x1: float, y1: float, x2: float, y2: float,
                        value: str, direction: str = 'horizontal') -> List[Stroke]:
        """绘制尺寸标注"""
        strokes: List[Stroke] = []
        offset = 5  # 尺寸线偏移
        
        if direction == 'horizontal':
            # 尺寸线
            dim_y = min(y1, y2) - offset
            strokes.append(Stroke(points=[
                Point(x1, dim_y), Point(x2, dim_y)
            ], pen_down=True))
            # 左边界线
            strokes.append(Stroke(points=[
                Point(x1, y1), Point(x1, dim_y)
            ], pen_down=True))
            # 右边界线
            strokes.append(Stroke(points=[
                Point(x2, y2), Point(x2, dim_y)
            ], pen_down=True))
            # 箭头
            strokes.append(Stroke(points=self._draw_arrow_head(x1, dim_y, x2, dim_y, size=2), pen_down=True))
            strokes.append(Stroke(points=self._draw_arrow_head(x2, dim_y, x1, dim_y, size=2), pen_down=True))
            # 数值
            mid_x = (x1 + x2) / 2
            label_path = self._text_to_path(str(value), mid_x - len(str(value)) * 1.5, dim_y - 3, 3)
            if label_path:
                strokes.append(Stroke(points=label_path, pen_down=True))
        else:
            # 垂直尺寸标注
            dim_x = min(x1, x2) - offset
            strokes.append(Stroke(points=[
                Point(dim_x, y1), Point(dim_x, y2)
            ], pen_down=True))
            strokes.append(Stroke(points=[
                Point(x1, y1), Point(dim_x, y1)
            ], pen_down=True))
            strokes.append(Stroke(points=[
                Point(x2, y2), Point(dim_x, y2)
            ], pen_down=True))
            label_path = self._text_to_path(str(value), dim_x - 3, (y1 + y2) / 2, 3)
            if label_path:
                strokes.append(Stroke(points=label_path, pen_down=True))
        
        return strokes

    def _draw_center_line(self, x1: float, y1: float, x2: float, y2: float,
                          dash_length: float = 8, gap_length: float = 2) -> List[Stroke]:
        """绘制中心线（点划线：长划-短划-长划）"""
        strokes: List[Stroke] = []
        total_length = np.hypot(x2 - x1, y2 - y1)
        if total_length < 0.01:
            return strokes

        dx = (x2 - x1) / total_length
        dy = (y2 - y1) / total_length

        pos = 0.0
        pattern = [dash_length, gap_length, 2, gap_length]  # 长划-空-短划-空
        pattern_idx = 0

        while pos < total_length:
            seg_len = pattern[pattern_idx % len(pattern)]
            seg_len = min(seg_len, total_length - pos)

            sx = x1 + dx * pos
            sy = y1 + dy * pos
            ex = x1 + dx * (pos + seg_len)
            ey = y1 + dy * (pos + seg_len)

            # 只在长划和短划时绘制
            if pattern_idx % len(pattern) in [0, 2]:
                strokes.append(Stroke(points=[Point(sx, sy), Point(ex, ey)], pen_down=True))

            pos += seg_len
            pattern_idx += 1

        return strokes

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
