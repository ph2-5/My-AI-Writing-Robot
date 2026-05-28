import random
from typing import List

from layout.models import Point, Stroke


class TextDeformer:
    """文字级变形：字间距变化、倾斜、基线浮动"""

    def __init__(self, seed: int = None, app_config=None):
        self.rng = random.Random(seed)
        self._app_config = app_config

    def deform(self, strokes: List[Stroke], config: dict) -> List[Stroke]:
        char_spacing_var = config.get('charSpacingVar', 0.15)
        baseline_wobble = config.get('baselineWobble', 0.3)
        slant = config.get('slant', 0.02)

        result = []
        for stroke in strokes:
            if not stroke.pen_down or len(stroke.points) < 2:
                result.append(stroke)
                continue

            deformed = self._apply_char_spacing_var(stroke, char_spacing_var)
            deformed = self._apply_baseline_wobble(deformed, baseline_wobble)
            deformed = self._apply_slant(deformed, slant)

            result.append(Stroke(
                points=deformed,
                pen_down=stroke.pen_down,
                speed=stroke.speed,
            ))

        return result

    def _apply_char_spacing_var(self, stroke: Stroke, var: float) -> List[Point]:
        if var <= 0 or len(stroke.points) < 4:
            return stroke.points

        points = []
        prev_x = stroke.points[0].x
        offset_x = 0.0

        for i, p in enumerate(stroke.points):
            if i > 0 and abs(p.x - prev_x) > 5:
                offset_x += self.rng.uniform(-var * 2, var * 2)
            prev_x = p.x
            points.append(Point(p.x + offset_x, p.y))

        return points

    def _apply_baseline_wobble(self, points: List[Point], amplitude: float) -> List[Point]:
        if amplitude <= 0 or not points:
            return points

        baseline_y = sum(p.y for p in points) / len(points)
        wobble = self.rng.uniform(-amplitude, amplitude)

        return [Point(p.x, p.y + wobble) for p in points]

    def _apply_slant(self, points: List[Point], slant: float) -> List[Point]:
        if slant == 0 or not points:
            return points

        baseline_y = sum(p.y for p in points) / len(points)
        return [Point(p.x + slant * (p.y - baseline_y), p.y) for p in points]
