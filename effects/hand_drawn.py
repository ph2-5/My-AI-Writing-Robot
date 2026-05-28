import random
from typing import List

import numpy as np

import config
from layout.models import Point, Stroke


class HandDrawnEffect:
    """增强的手绘效果模拟器"""

    def __init__(self, seed: int = None, app_config=None):
        self.rng = random.Random(seed)
        effective = app_config if app_config is not None else config.DEFAULT_CONFIG
        self.amplitude = effective.HAND_DRAWN_AMPLITUDE
        self.corner_exaggeration = effective.HAND_DRAWN_CORNER_EXAGGERATION

    def apply(self, strokes: List[Stroke]) -> List[Stroke]:
        result: List[Stroke] = []

        for stroke in strokes:
            if not stroke.pen_down:
                result.append(stroke)
                continue

            # 根据笔画长度和形状选择不同的手绘策略
            if len(stroke.points) < 3:
                # 短笔画：简单抖动
                jittered_points = self._simple_jitter(stroke.points)
            elif self._is_straight_line(stroke.points):
                # 直线：添加轻微弯曲
                jittered_points = self._line_jitter(stroke.points)
            elif self._is_circle(stroke.points):
                # 圆形：添加椭圆变形
                jittered_points = self._circle_jitter(stroke.points)
            else:
                # 复杂曲线：全面抖动+平滑
                jittered_points = self._complex_jitter(stroke.points)

            smoothed = self._smooth(jittered_points, factor=0.15)

            result.append(Stroke(
                points=smoothed,
                pen_down=stroke.pen_down,
                speed=stroke.speed * self.rng.uniform(0.85, 1.15),
            ))

        return result

    def _simple_jitter(self, points: List[Point]) -> List[Point]:
        """简单抖动：适用于短笔画"""
        jittered = []
        for point in points:
            jx = point.x + self.rng.uniform(-self.amplitude, self.amplitude)
            jy = point.y + self.rng.uniform(-self.amplitude, self.amplitude)
            jittered.append(Point(jx, jy))
        return jittered

    def _line_jitter(self, points: List[Point]) -> List[Point]:
        """直线抖动：添加轻微弯曲，模拟手绘直线不直"""
        if len(points) < 2:
            return self._simple_jitter(points)

        jittered = []
        x1, y1 = points[0].x, points[0].y
        x2, y2 = points[-1].x, points[-1].y
        
        # 计算中点偏移
        mid_x = (x1 + x2) / 2
        mid_y = (y1 + y2) / 2
        
        # 垂直于直线的方向
        dx = x2 - x1
        dy = y2 - y1
        length = np.sqrt(dx**2 + dy**2)
        if length < 0.01:
            return self._simple_jitter(points)
        
        # 垂直单位向量
        perp_x = -dy / length
        perp_y = dx / length
        
        # 中点偏移量（模拟手绘时直线微微弯曲）
        bend = self.rng.uniform(-self.amplitude * 2, self.amplitude * 2)
        
        for i, point in enumerate(points):
            t = i / (len(points) - 1) if len(points) > 1 else 0
            # 二次贝塞尔曲线偏移
            offset = 4 * bend * t * (1 - t)  # 抛物线形状，中间最大
            
            jx = point.x + perp_x * offset + self.rng.uniform(-self.amplitude * 0.3, self.amplitude * 0.3)
            jy = point.y + perp_y * offset + self.rng.uniform(-self.amplitude * 0.3, self.amplitude * 0.3)
            jittered.append(Point(jx, jy))
        
        return jittered

    def _circle_jitter(self, points: List[Point]) -> List[Point]:
        """圆形抖动：模拟手绘圆不够圆"""
        if len(points) < 10:
            return self._simple_jitter(points)

        # 计算圆心和半径
        cx = sum(p.x for p in points) / len(points)
        cy = sum(p.y for p in points) / len(points)
        
        radii = [np.sqrt((p.x - cx)**2 + (p.y - cy)**2) for p in points]
        avg_r = sum(radii) / len(radii)
        
        jittered = []
        for i, point in enumerate(points):
            angle = np.arctan2(point.y - cy, point.x - cx)
            
            # 半径变化：模拟手绘时圆变成椭圆
            r_variation = self.rng.uniform(0.95, 1.05)
            # 添加低频变化（让圆更不规则）
            r_variation += 0.03 * np.sin(3 * angle + self.rng.uniform(0, 2 * np.pi))
            
            new_r = avg_r * r_variation
            jx = cx + new_r * np.cos(angle) + self.rng.uniform(-self.amplitude * 0.5, self.amplitude * 0.5)
            jy = cy + new_r * np.sin(angle) + self.rng.uniform(-self.amplitude * 0.5, self.amplitude * 0.5)
            jittered.append(Point(jx, jy))
        
        return jittered

    def _complex_jitter(self, points: List[Point]) -> List[Point]:
        """复杂曲线抖动：适用于一般曲线"""
        jittered = []
        for i, point in enumerate(points):
            amp = self.amplitude

            if 0 < i < len(points) - 1:
                prev = points[i - 1]
                next_p = points[i + 1]
                angle_change = self._angle_change(prev, point, next_p)
                if angle_change > np.pi / 6:
                    # 拐角处增加抖动，模拟手绘时拐角停顿
                    amp *= self.corner_exaggeration
                    # 在拐角处添加额外控制点，使拐角更圆润
                    if angle_change > np.pi / 3:
                        # 大拐角：添加圆角
                        corner_x = (prev.x + point.x + next_p.x) / 3
                        corner_y = (prev.y + point.y + next_p.y) / 3
                        jittered.append(Point(
                            corner_x + self.rng.uniform(-amp, amp),
                            corner_y + self.rng.uniform(-amp, amp)
                        ))

            jx = point.x + self.rng.uniform(-amp, amp)
            jy = point.y + self.rng.uniform(-amp, amp)
            jittered.append(Point(jx, jy))

        return jittered

    def _is_straight_line(self, points: List[Point], tolerance: float = 0.5) -> bool:
        """判断是否为直线"""
        if len(points) < 3:
            return True
        
        x1, y1 = points[0].x, points[0].y
        x2, y2 = points[-1].x, points[-1].y
        
        # 计算直线方程 ax + by + c = 0
        a = y2 - y1
        b = x1 - x2
        c = x2 * y1 - x1 * y2
        
        # 计算各点到直线的距离
        length = np.sqrt(a**2 + b**2)
        if length < 0.01:
            return True
        
        max_distance = 0
        for p in points[1:-1]:
            distance = abs(a * p.x + b * p.y + c) / length
            max_distance = max(max_distance, distance)
        
        return max_distance < tolerance

    def _is_circle(self, points: List[Point], tolerance: float = 0.3) -> bool:
        """判断是否接近圆形"""
        if len(points) < 20:
            return False
        
        # 计算中心
        cx = sum(p.x for p in points) / len(points)
        cy = sum(p.y for p in points) / len(points)
        
        # 计算半径方差
        radii = [np.sqrt((p.x - cx)**2 + (p.y - cy)**2) for p in points]
        avg_r = sum(radii) / len(radii)
        
        if avg_r < 1:
            return False
        
        variance = sum((r - avg_r)**2 for r in radii) / len(radii)
        cv = np.sqrt(variance) / avg_r  # 变异系数
        
        return cv < tolerance

    def _angle_change(self, p1: Point, p2: Point, p3: Point) -> float:
        a1 = np.arctan2(p2.y - p1.y, p2.x - p1.x)
        a2 = np.arctan2(p3.y - p2.y, p3.x - p2.x)
        diff = abs(a2 - a1)
        if diff > np.pi:
            diff = 2 * np.pi - diff
        return diff

    def _smooth(self, points: List[Point], factor: float = 0.15) -> List[Point]:
        if len(points) < 3:
            return points

        smoothed = [points[0]]
        for i in range(1, len(points) - 1):
            px = points[i - 1].x * factor + points[i].x * (1 - 2 * factor) + points[i + 1].x * factor
            py = points[i - 1].y * factor + points[i].y * (1 - 2 * factor) + points[i + 1].y * factor
            smoothed.append(Point(px, py))
        smoothed.append(points[-1])
        return smoothed
