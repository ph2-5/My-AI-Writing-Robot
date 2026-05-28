from typing import List

from lxml import etree

import config
from layout.models import Stroke


class RobotCommandGenerator:

    def __init__(self, platform: str = 'kuixiang', app_config=None):
        self.platform = platform
        self._config = app_config if app_config is not None else config.DEFAULT_CONFIG
        self.pen_up_height = self._config.PEN_UP_HEIGHT
        self.pen_down_height = self._config.PEN_DOWN_HEIGHT
        self.travel_speed = self._config.TRAVEL_SPEED
        self.draw_speed = self._config.DRAW_SPEED

    def generate(self, strokes: List[Stroke]) -> str:
        if self.platform == 'kuixiang':
            return self._generate_kuixiang(strokes)
        elif self.platform == 'svg':
            return self._generate_svg(strokes)
        elif self.platform == 'gcode':
            return self._generate_gcode(strokes)
        else:
            raise ValueError(f"不支持的平台: {self.platform}")

    def _generate_kuixiang(self, strokes: List[Stroke]) -> str:
        svg = etree.Element('svg', {
            'xmlns': 'http://www.w3.org/2000/svg',
            'width': f'{self._config.PAPER_WIDTH}mm',
            'height': f'{self._config.PAPER_HEIGHT}mm',
            'viewBox': f'0 0 {self._config.PAPER_WIDTH} {self._config.PAPER_HEIGHT}',
        })
        svg.set('data-software', 'kuixiang-carving')
        svg.set('data-version', '3.9')

        style = etree.SubElement(svg, 'style')
        style.text = (
            '.handdrawn { '
            'stroke: #000000; '
            'stroke-width: 1.2; '
            'fill: none; '
            'stroke-linecap: round; '
            'stroke-linejoin: round; '
            '}'
        )

        for stroke in strokes:
            if len(stroke.points) < 2:
                continue
            if not stroke.pen_down:
                continue

            d = f'M {stroke.points[0].x:.2f} {stroke.points[0].y:.2f}'
            for p in stroke.points[1:]:
                d += f' L {p.x:.2f} {p.y:.2f}'

            path_el = etree.SubElement(svg, 'path', {
                'd': d,
                'class': 'handdrawn',
            })
            path_el.set('data-speed', f'{stroke.speed:.1f}')

        return etree.tostring(svg, encoding='unicode', pretty_print=True)

    def _generate_svg(self, strokes: List[Stroke]) -> str:
        svg = etree.Element('svg', {
            'xmlns': 'http://www.w3.org/2000/svg',
            'width': f'{self._config.PAPER_WIDTH}mm',
            'height': f'{self._config.PAPER_HEIGHT}mm',
            'viewBox': f'0 0 {self._config.PAPER_WIDTH} {self._config.PAPER_HEIGHT}',
        })

        for stroke in strokes:
            if len(stroke.points) < 2:
                continue
            if not stroke.pen_down:
                continue

            d = f'M {stroke.points[0].x:.2f} {stroke.points[0].y:.2f}'
            for p in stroke.points[1:]:
                d += f' L {p.x:.2f} {p.y:.2f}'

            etree.SubElement(svg, 'path', {
                'd': d,
                'stroke': '#000000',
                'stroke-width': '1.2',
                'fill': 'none',
                'stroke-linecap': 'round',
                'stroke-linejoin': 'round',
            })

        return etree.tostring(svg, encoding='unicode', pretty_print=True)

    def _generate_gcode(self, strokes: List[Stroke]) -> str:
        gcode: List[str] = []
        gcode.append("G21 ; mm")
        gcode.append("G90 ; absolute")
        gcode.append("G28 ; home")

        for stroke in strokes:
            if len(stroke.points) < 1:
                continue

            start = stroke.points[0]

            gcode.append(f"G0 Z{self.pen_up_height:.1f}")
            gcode.append(f"G0 X{start.x:.2f} Y{start.y:.2f} F{self.travel_speed * 60:.0f}")

            if stroke.pen_down:
                gcode.append(f"G0 Z{self.pen_down_height:.1f}")
                for p in stroke.points[1:]:
                    gcode.append(f"G1 X{p.x:.2f} Y{p.y:.2f} F{stroke.speed * 60:.0f}")

        gcode.append(f"G0 Z{self.pen_up_height:.1f}")
        gcode.append("G28 ; home")

        return '\n'.join(gcode)
