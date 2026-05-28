import random
from typing import List

import numpy as np

import config
from layout.models import Point, Stroke


class HandDrawnEffect:

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

            jittered_points: List[Point] = []
            for i, point in enumerate(stroke.points):
                amp = self.amplitude

                if 0 < i < len(stroke.points) - 1:
                    prev = stroke.points[i - 1]
                    next_p = stroke.points[i + 1]
                    angle_change = self._angle_change(prev, point, next_p)
                    if angle_change > np.pi / 6:
                        amp *= self.corner_exaggeration

                jx = point.x + self.rng.uniform(-amp, amp)
                jy = point.y + self.rng.uniform(-amp, amp)
                jittered_points.append(Point(jx, jy))

            smoothed = self._smooth(jittered_points, factor=0.2)

            result.append(Stroke(
                points=smoothed,
                pen_down=stroke.pen_down,
                speed=stroke.speed * self.rng.uniform(0.9, 1.1),
            ))

        return result

    def _angle_change(self, p1: Point, p2: Point, p3: Point) -> float:
        a1 = np.arctan2(p2.y - p1.y, p2.x - p1.x)
        a2 = np.arctan2(p3.y - p2.y, p3.x - p2.x)
        diff = abs(a2 - a1)
        if diff > np.pi:
            diff = 2 * np.pi - diff
        return diff

    def _smooth(self, points: List[Point], factor: float = 0.2) -> List[Point]:
        if len(points) < 3:
            return points

        smoothed = [points[0]]
        for i in range(1, len(points) - 1):
            px = points[i - 1].x * factor + points[i].x * (1 - 2 * factor) + points[i + 1].x * factor
            py = points[i - 1].y * factor + points[i].y * (1 - 2 * factor) + points[i + 1].y * factor
            smoothed.append(Point(px, py))
        smoothed.append(points[-1])
        return smoothed
