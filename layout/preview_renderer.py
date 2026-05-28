import math
from typing import List, Dict, Any, Optional
from layout.precision_layout import PrecisionLayout


class PreviewRenderer:

    def __init__(self, config: dict = None, app_config=None):
        self._precision = PrecisionLayout(config=config, app_config=app_config)
        self.paper_w = self._precision.paper_w
        self.paper_h = self._precision.paper_h
        self.margin_t = self._precision.margin_t
        self.margin_b = self._precision.margin_b
        self.margin_l = self._precision.margin_l
        self.margin_r = self._precision.margin_r

    def render_preview(self, layout_plan: dict) -> str:
        commands = self._precision.calculate(layout_plan)
        validated = self._precision.validate(commands)
        if not validated['valid']:
            commands = self._precision.adjust(commands, validated['issues'])
        return self._commands_to_svg(commands)

    def _commands_to_svg(self, commands: List[Dict[str, Any]]) -> str:
        pages = {}
        for cmd in commands:
            page = cmd.get('page', 1)
            pages.setdefault(page, []).append(cmd)

        page_count = max(pages.keys()) if pages else 1

        scale = 3.78
        svg_w = self.paper_w * scale
        svg_h = self.paper_h * scale

        parts = []
        parts.append(f'<svg xmlns="http://www.w3.org/2000/svg" width="{svg_w:.1f}" height="{svg_h * page_count + (page_count - 1) * 20:.1f}" viewBox="0 0 {self.paper_w} {self.paper_h * page_count + (page_count - 1) * 10}">')

        parts.append('<defs><style>')
        parts.append('.preview-text { font-family: "Microsoft YaHei", "SimHei", sans-serif; }')
        parts.append('.preview-title { font-family: "Microsoft YaHei", "SimHei", sans-serif; font-weight: bold; }')
        parts.append('.preview-label { font-family: "Microsoft YaHei", "SimHei", sans-serif; font-size: 3.5px; }')
        parts.append('.preview-dim { fill: #94a3b8; font-family: "Microsoft YaHei", sans-serif; font-size: 2.5px; }')
        parts.append('.page-margin { fill: none; stroke: #e2e8f0; stroke-width: 0.3; stroke-dasharray: 2,1; }')
        parts.append('.page-border { fill: white; stroke: #64748b; stroke-width: 0.5; }')
        parts.append('.writable-area { fill: #f8fafc; }')
        parts.append('.text-block { fill: #1e293b; }')
        parts.append('.actor-stroke { fill: none; stroke: #1e293b; stroke-width: 0.4; }')
        parts.append('.usecase-stroke { fill: none; stroke: #1e293b; stroke-width: 0.4; }')
        parts.append('.usecase-fill { fill: #fef3c7; fill-opacity: 0.4; }')
        parts.append('.line-stroke { stroke: #1e293b; stroke-width: 0.4; }')
        parts.append('.dashed-stroke { stroke: #1e293b; stroke-width: 0.4; stroke-dasharray: 2,1; }')
        parts.append('.overlap-warning { fill: #fef2f2; stroke: #ef4444; stroke-width: 0.3; stroke-dasharray: 1,1; }')
        parts.append('.section-label { fill: #f59e0b; font-family: "Microsoft YaHei", sans-serif; font-size: 2.5px; font-weight: bold; }')
        parts.append('</style></defs>')

        for page_num in range(1, page_count + 1):
            y_offset = (page_num - 1) * (self.paper_h + 10)

            parts.append(f'<rect x="0" y="{y_offset}" width="{self.paper_w}" height="{self.paper_h}" class="page-border" rx="1"/>')

            parts.append(f'<rect x="{self.margin_l}" y="{y_offset + self.margin_t}" width="{self.paper_w - self.margin_l - self.margin_r}" height="{self.paper_h - self.margin_t - self.margin_b}" class="writable-area"/>')

            parts.append(f'<rect x="{self.margin_l}" y="{y_offset + self.margin_t}" width="{self.paper_w - self.margin_l - self.margin_r}" height="{self.paper_h - self.margin_t - self.margin_b}" class="page-margin"/>')

            if page_count > 1:
                parts.append(f'<text x="{self.paper_w / 2}" y="{y_offset + self.paper_h - 3}" text-anchor="middle" class="preview-dim">第 {page_num} 页</text>')

            parts.append(f'<text x="{self.paper_w / 2}" y="{y_offset + 3}" text-anchor="middle" class="preview-dim">{self.paper_w}×{self.paper_h}mm</text>')

            page_cmds = pages.get(page_num, [])
            for cmd in page_cmds:
                svg_elem = self._cmd_to_svg(cmd, y_offset)
                if svg_elem:
                    parts.append(svg_elem)

        parts.append('</svg>')
        return '\n'.join(parts)

    def _cmd_to_svg(self, cmd: Dict[str, Any], y_offset: float = 0) -> str:
        cmd_type = cmd.get('type', '')

        if cmd_type == 'text':
            font_size = cmd.get('font_size', 4.2)
            style = 'preview-title' if font_size >= 5.0 else 'preview-text'
            font_px = font_size * 0.9
            return f'<text x="{cmd["x"]}" y="{cmd["y"] + y_offset}" font-size="{font_px}px" class="{style} text-block">{self._escape_xml(cmd.get("content", ""))}</text>'

        elif cmd_type == 'actor':
            x, y = cmd['x'], cmd['y'] + y_offset
            h = cmd.get('height', 30)
            head_r = h * 0.12
            head_cy = y - h * 0.35
            parts = []
            parts.append(f'<circle cx="{x}" cy="{head_cy}" r="{head_r}" class="actor-stroke"/>')
            parts.append(f'<line x1="{x}" y1="{head_cy + head_r}" x2="{x}" y2="{y + h * 0.05}" class="actor-stroke"/>')
            parts.append(f'<line x1="{x - h * 0.18}" y1="{y - h * 0.02}" x2="{x + h * 0.18}" y2="{y - h * 0.02}" class="actor-stroke"/>')
            parts.append(f'<line x1="{x}" y1="{y + h * 0.05}" x2="{x - h * 0.15}" y2="{y + h * 0.35}" class="actor-stroke"/>')
            parts.append(f'<line x1="{x}" y1="{y + h * 0.05}" x2="{x + h * 0.15}" y2="{y + h * 0.35}" class="actor-stroke"/>')
            if 'name' in cmd:
                parts.append(f'<text x="{x}" y="{y + h * 0.45}" text-anchor="middle" class="preview-label">{self._escape_xml(cmd["name"])}</text>')
            return '\n'.join(parts)

        elif cmd_type == 'usecase':
            x, y = cmd['x'], cmd['y'] + y_offset
            w = cmd.get('width', 50)
            h = cmd.get('height', 25)
            cx = x + w / 2
            cy = y + h / 2
            rx = w / 2
            ry = h / 2
            parts = []
            parts.append(f'<ellipse cx="{cx}" cy="{cy}" rx="{rx}" ry="{ry}" class="usecase-fill usecase-stroke"/>')
            if 'name' in cmd:
                name_len = len(cmd["name"]) * 3.5
                max_w = rx * 1.8
                if name_len > max_w:
                    parts.append(f'<text x="{cx}" y="{cy + 1.5}" text-anchor="middle" textLength="{max_w}" lengthAdjust="spacingAndGlyphs" class="preview-label">{self._escape_xml(cmd["name"])}</text>')
                else:
                    parts.append(f'<text x="{cx}" y="{cy + 1.5}" text-anchor="middle" class="preview-label">{self._escape_xml(cmd["name"])}</text>')
            return '\n'.join(parts)

        elif cmd_type == 'line':
            return f'<line x1="{cmd["x1"]}" y1="{cmd["y1"] + y_offset}" x2="{cmd["x2"]}" y2="{cmd["y2"] + y_offset}" class="line-stroke"/>'

        elif cmd_type == 'dashed_line':
            parts = [f'<line x1="{cmd["x1"]}" y1="{cmd["y1"] + y_offset}" x2="{cmd["x2"]}" y2="{cmd["y2"] + y_offset}" class="dashed-stroke"/>']
            if 'label' in cmd:
                mid_x = (cmd['x1'] + cmd['x2']) / 2
                mid_y = (cmd['y1'] + cmd['y2']) / 2 + y_offset - 2
                parts.append(f'<text x="{mid_x}" y="{mid_y}" text-anchor="middle" class="preview-label">{self._escape_xml(cmd["label"])}</text>')
            return '\n'.join(parts)

        elif cmd_type == 'arrow':
            parts = [f'<line x1="{cmd["x1"]}" y1="{cmd["y1"] + y_offset}" x2="{cmd["x2"]}" y2="{cmd["y2"] + y_offset}" class="line-stroke"/>']
            angle = math.atan2(cmd['y2'] - cmd['y1'], cmd['x2'] - cmd['x1'])
            arrow_size = 2
            for da in [-0.4, 0.4]:
                ax = cmd['x2'] - arrow_size * math.cos(angle + da)
                ay = cmd['y2'] + y_offset - arrow_size * math.sin(angle + da)
                parts.append(f'<line x1="{cmd["x2"]}" y1="{cmd["y2"] + y_offset}" x2="{ax}" y2="{ay}" class="line-stroke"/>')
            return '\n'.join(parts)

        elif cmd_type == 'diamond':
            x, y = cmd['x'], cmd['y'] + y_offset
            size = cmd.get('size', 8)
            points_str = f"{x},{y - size} {x + size},{y} {x},{y + size} {x - size},{y}"
            parts = [f'<polygon points="{points_str}" fill="none" stroke="#1e293b" stroke-width="0.4"/>']
            if 'label' in cmd and cmd['label']:
                parts.append(f'<text x="{x}" y="{y - size - 1}" text-anchor="middle" class="preview-label">{self._escape_xml(cmd["label"])}</text>')
            return '\n'.join(parts)

        return ''

    @staticmethod
    def _escape_xml(text: str) -> str:
        return text.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;').replace('"', '&quot;')
