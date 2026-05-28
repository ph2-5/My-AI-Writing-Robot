from typing import List, Dict, Any

from layout.models import Point
from fonts.hershey import get_char_width
import config as cfg_module


class PrecisionLayout:

    def __init__(self, config: dict = None, app_config=None):
        effective = app_config if app_config is not None else cfg_module.DEFAULT_CONFIG
        self.cfg = config or {}
        self.paper_w = self.cfg.get('paperWidth', effective.PAPER_WIDTH)
        self.paper_h = self.cfg.get('paperHeight', effective.PAPER_HEIGHT)
        self.margin_t = self.cfg.get('marginTop', effective.MARGIN_TOP)
        self.margin_b = self.cfg.get('marginBottom', effective.MARGIN_BOTTOM)
        self.margin_l = self.cfg.get('marginLeft', effective.MARGIN_LEFT)
        self.margin_r = self.cfg.get('marginRight', effective.MARGIN_RIGHT)
        self.writable_w = self.paper_w - self.margin_l - self.margin_r
        self.writable_h = self.paper_h - self.margin_t - self.margin_b
        self.font_title = self.cfg.get('fontSizeTitle', effective.FONT_SIZE_TITLE)
        self.font_body = self.cfg.get('fontSizeBody', effective.FONT_SIZE_BODY)
        self.font_label = self.cfg.get('fontSizeLabel', effective.FONT_SIZE_LABEL)
        self.line_spacing = self.cfg.get('lineSpacing', effective.LINE_SPACING)
        self.question_spacing = self.cfg.get('questionSpacing', effective.QUESTION_SPACING)
        self.char_spacing = self.cfg.get('charSpacing', effective.CHAR_SPACING)

    def calculate(self, layout_plan: dict) -> List[Dict[str, Any]]:
        commands: List[Dict[str, Any]] = []
        current_y = self.margin_t
        current_page = 1
        page_bottom = self.paper_h - self.margin_b
        sections = layout_plan.get('sections', [])

        for section in sections:
            sec_type = section.get('type', 'text')
            placement = section.get('relative_position', {}).get('placement', 'flow')

            if sec_type == 'text':
                text_cmds, used_height = self._layout_text(section, current_y)
                page_bottom = self.paper_h - self.margin_b
                needs_new_page = any(cmd['y'] > page_bottom for cmd in text_cmds)
                if needs_new_page:
                    current_page += 1
                    current_y = self.margin_t
                    text_cmds, used_height = self._layout_text(section, current_y)
                for cmd in text_cmds:
                    cmd['page'] = current_page
                commands.extend(text_cmds)
                current_y += used_height + self.line_spacing

            elif sec_type == 'uml_usecase':
                uml_cmds, used_height = self._layout_uml_usecase(section, current_y)
                if current_y + used_height > page_bottom:
                    current_page += 1
                    current_y = self.margin_t
                    uml_cmds, used_height = self._layout_uml_usecase(section, current_y)
                for cmd in uml_cmds:
                    cmd['page'] = current_page
                commands.extend(uml_cmds)
                current_y += used_height + self.question_spacing

            elif sec_type == 'uml_class':
                uml_cmds, used_height = self._layout_uml_class(section, current_y)
                if current_y + used_height > page_bottom:
                    current_page += 1
                    current_y = self.margin_t
                    uml_cmds, used_height = self._layout_uml_class(section, current_y)
                for cmd in uml_cmds:
                    cmd['page'] = current_page
                commands.extend(uml_cmds)
                current_y += used_height + self.question_spacing

            elif sec_type == 'code':
                code_cmds, used_height = self._layout_code(section, current_y)
                if current_y + used_height > page_bottom:
                    current_page += 1
                    current_y = self.margin_t
                    code_cmds, used_height = self._layout_code(section, current_y)
                for cmd in code_cmds:
                    cmd['page'] = current_page
                commands.extend(code_cmds)
                current_y += used_height + self.line_spacing

            elif sec_type == 'uml_sequence':
                seq_cmds, used_height = self._layout_uml_sequence(section, current_y)
                if current_y + used_height > page_bottom:
                    current_page += 1
                    current_y = self.margin_t
                    seq_cmds, used_height = self._layout_uml_sequence(section, current_y)
                for cmd in seq_cmds:
                    cmd['page'] = current_page
                commands.extend(seq_cmds)
                current_y += used_height + self.question_spacing

            elif sec_type == 'uml_activity':
                act_cmds, used_height = self._layout_uml_activity(section, current_y)
                if current_y + used_height > page_bottom:
                    current_page += 1
                    current_y = self.margin_t
                    act_cmds, used_height = self._layout_uml_activity(section, current_y)
                for cmd in act_cmds:
                    cmd['page'] = current_page
                commands.extend(act_cmds)
                current_y += used_height + self.question_spacing

            if current_y > page_bottom:
                current_page += 1
                current_y = self.margin_t

        return commands

    def _layout_text(self, section: dict, start_y: float) -> tuple:
        content = section.get('content', '')
        style = section.get('style', {})
        font_size_key = style.get('font_size', 'body')
        font_size = {'title': self.font_title, 'body': self.font_body, 'label': self.font_label}.get(font_size_key, self.font_body)

        max_width = self.writable_w
        lines = self._wrap_text(content, max_width, font_size)

        commands = []
        x = self.margin_l
        current_y = start_y

        for i, line in enumerate(lines):
            commands.append({
                'type': 'text',
                'content': line,
                'x': x,
                'y': current_y,
                'font_size': font_size,
            })
            current_y += self.line_spacing

        used_height = len(lines) * self.line_spacing
        return commands, used_height

    def _layout_uml_usecase(self, section: dict, start_y: float) -> tuple:
        elements = section.get('elements', {})
        actors = elements.get('actors', [])
        usecases = elements.get('usecases', [])
        relations = elements.get('relations', [])
        size_hint = section.get('size_hint', {})
        width_ratio = size_hint.get('width_ratio', 0.8)
        min_height = size_hint.get('min_height', 60)

        area_w = self.writable_w * width_ratio
        area_x = self.margin_l + (self.writable_w - area_w) / 2

        actor_height = 30
        usecase_w = 50
        usecase_h = 25
        padding = 10

        n_actors = len(actors)
        n_usecases = len(usecases)

        actor_spacing = area_w / (n_actors + 1) if n_actors > 0 else area_w
        usecase_spacing = area_w / (n_usecases + 1) if n_usecases > 0 else area_w

        commands = []
        actor_positions = {}
        usecase_positions = {}

        actor_y = start_y + padding + actor_height / 2
        for i, actor in enumerate(actors):
            x = area_x + actor_spacing * (i + 1)
            actor_positions[actor] = (x, actor_y)
            commands.append({'type': 'actor', 'name': actor, 'x': x, 'y': actor_y, 'height': actor_height})

        usecase_y = start_y + actor_height + padding * 2 + usecase_h / 2
        for i, usecase in enumerate(usecases):
            x = area_x + usecase_spacing * (i + 1)
            usecase_positions[usecase] = (x, usecase_y)
            commands.append({'type': 'usecase', 'name': usecase, 'x': x - usecase_w / 2, 'y': usecase_y - usecase_h / 2, 'width': usecase_w, 'height': usecase_h})

        for rel in relations:
            from_name = rel.get('from', '')
            to_name = rel.get('to', '')
            rel_type = rel.get('type', 'association')

            from_pos = actor_positions.get(from_name) or usecase_positions.get(from_name)
            to_pos = actor_positions.get(to_name) or usecase_positions.get(to_name)

            if from_pos and to_pos:
                if rel_type in ('include', 'extend'):
                    commands.append({'type': 'dashed_line', 'x1': from_pos[0], 'y1': from_pos[1], 'x2': to_pos[0], 'y2': to_pos[1], 'label': f'<<{rel_type}>>'})
                else:
                    commands.append({'type': 'line', 'x1': from_pos[0], 'y1': from_pos[1], 'x2': to_pos[0], 'y2': to_pos[1]})

        used_height = max(min_height, actor_height + padding * 3 + usecase_h)
        return commands, used_height

    def _layout_uml_class(self, section: dict, start_y: float) -> tuple:
        elements = section.get('elements', {})
        classes = elements.get('classes', [])
        relations = elements.get('relations', [])

        class_w = 60
        name_h = self.font_label * 2.5
        attr_line_h = self.font_label * 1.8
        method_line_h = self.font_label * 1.8
        padding = 15
        cols = min(3, len(classes)) if classes else 1

        commands = []
        class_positions = {}

        for i, cls in enumerate(classes):
            col = i % cols
            row = i // cols
            x = self.margin_l + col * (class_w + padding)
            y = start_y + row * (class_w + padding)

            cls_name = cls.get('name', f'Class{i}')
            attrs = cls.get('attributes', [])
            methods = cls.get('methods', [])

            attr_h = max(len(attrs), 1) * attr_line_h
            method_h = max(len(methods), 1) * method_line_h
            total_h = name_h + attr_h + method_h

            commands.append({'type': 'text', 'content': cls_name, 'x': x + class_w / 2, 'y': y + name_h * 0.7, 'font_size': self.font_label})

            for j, attr in enumerate(attrs):
                commands.append({'type': 'text', 'content': attr, 'x': x + 2, 'y': y + name_h + (j + 1) * attr_line_h, 'font_size': self.font_label * 0.85})

            for j, method in enumerate(methods):
                commands.append({'type': 'text', 'content': method, 'x': x + 2, 'y': y + name_h + attr_h + (j + 1) * method_line_h, 'font_size': self.font_label * 0.85})

            class_positions[cls_name] = (x + class_w / 2, y + total_h / 2)

        for rel in relations:
            from_name = rel.get('from', '')
            to_name = rel.get('to', '')
            from_pos = class_positions.get(from_name)
            to_pos = class_positions.get(to_name)
            if from_pos and to_pos:
                rel_type = rel.get('type', 'association')
                if rel_type in ('inheritance', 'realization'):
                    commands.append({'type': 'arrow', 'x1': from_pos[0], 'y1': from_pos[1], 'x2': to_pos[0], 'y2': to_pos[1]})
                else:
                    commands.append({'type': 'line', 'x1': from_pos[0], 'y1': from_pos[1], 'x2': to_pos[0], 'y2': to_pos[1]})

        rows = (len(classes) + cols - 1) // cols if classes else 1
        used_height = rows * (class_w + padding)
        return commands, used_height

    def _layout_uml_sequence(self, section: dict, start_y: float) -> tuple:
        elements = section.get('elements', {})
        participants = elements.get('participants', [])
        messages = elements.get('messages', [])
        size_hint = section.get('size_hint', {})
        width_ratio = size_hint.get('width_ratio', 0.9)

        area_w = self.writable_w * width_ratio
        area_x = self.margin_l + (self.writable_w - area_w) / 2

        lifeline_spacing = area_w / (len(participants) + 1) if participants else area_w
        message_spacing = self.line_spacing * 1.5
        header_height = self.font_label * 3
        lifeline_top = start_y + header_height

        commands = []
        participant_positions = {}

        for i, name in enumerate(participants):
            x = area_x + lifeline_spacing * (i + 1)
            participant_positions[name] = x
            box_w = max(len(name) * self.font_label * 1.2, 20)
            commands.append({
                'type': 'text',
                'content': name,
                'x': x - box_w / 2,
                'y': start_y + self.font_label,
                'font_size': self.font_label,
            })
            commands.append({
                'type': 'dashed_line',
                'x1': x,
                'y1': lifeline_top,
                'x2': x,
                'y2': lifeline_top + len(messages) * message_spacing + 10,
            })

        for i, msg in enumerate(messages):
            from_name = msg.get('from', '')
            to_name = msg.get('to', '')
            label = msg.get('label', '')
            msg_type = msg.get('type', 'sync')

            from_x = participant_positions.get(from_name, area_x)
            to_x = participant_positions.get(to_name, area_x)
            y = lifeline_top + i * message_spacing + 5

            if from_x == to_x:
                loop_w = 15
                commands.append({'type': 'line', 'x1': from_x, 'y1': y, 'x2': from_x + loop_w, 'y2': y})
                commands.append({'type': 'line', 'x1': from_x + loop_w, 'y1': y, 'x2': from_x + loop_w, 'y2': y + message_spacing * 0.6})
                commands.append({'type': 'arrow', 'x1': from_x + loop_w, 'y1': y + message_spacing * 0.6, 'x2': from_x, 'y2': y + message_spacing * 0.6})
                if label:
                    commands.append({'type': 'text', 'content': label, 'x': from_x + loop_w + 2, 'y': y + 2, 'font_size': self.font_label * 0.8})
            else:
                if msg_type == 'return':
                    commands.append({'type': 'dashed_line', 'x1': from_x, 'y1': y, 'x2': to_x, 'y2': y})
                else:
                    commands.append({'type': 'line', 'x1': from_x, 'y1': y, 'x2': to_x, 'y2': y})
                commands.append({'type': 'arrow', 'x1': from_x, 'y1': y, 'x2': to_x, 'y2': y})
                if label:
                    mid_x = (from_x + to_x) / 2
                    commands.append({'type': 'text', 'content': label, 'x': mid_x, 'y': y - 2, 'font_size': self.font_label * 0.8})

        total_height = header_height + len(messages) * message_spacing + 20
        return commands, total_height

    def _layout_uml_activity(self, section: dict, start_y: float) -> tuple:
        elements = section.get('elements', {})
        activities = elements.get('activities', [])
        decisions = elements.get('decisions', [])
        has_start = elements.get('start_node', True)
        has_end = elements.get('end_node', True)
        size_hint = section.get('size_hint', {})
        width_ratio = size_hint.get('width_ratio', 0.7)

        area_w = self.writable_w * width_ratio
        center_x = self.margin_l + self.writable_w / 2
        node_spacing = self.line_spacing * 2.5

        commands = []
        current_y = start_y + 5

        if has_start:
            commands.append({'type': 'usecase', 'name': '', 'x': center_x - 5, 'y': current_y, 'width': 10, 'height': 10})
            current_y += node_spacing
            commands.append({'type': 'line', 'x1': center_x, 'y1': current_y - node_spacing + 10, 'x2': center_x, 'y2': current_y})

        for i, activity in enumerate(activities):
            act_w = max(len(activity) * self.font_label * 1.2, 30)
            act_h = self.font_label * 3
            commands.append({
                'type': 'usecase',
                'name': activity,
                'x': center_x - act_w / 2,
                'y': current_y,
                'width': act_w,
                'height': act_h,
            })
            if i > 0 or has_start:
                commands.append({'type': 'line', 'x1': center_x, 'y1': current_y - node_spacing + self.font_label * 3, 'x2': center_x, 'y2': current_y})
            current_y += node_spacing

            if i < len(decisions):
                d = decisions[i]
                d_size = 8
                commands.append({'type': 'line', 'x1': center_x, 'y1': current_y - node_spacing + self.font_label * 3, 'x2': center_x, 'y2': current_y})
                commands.append({
                    'type': 'diamond',
                    'x': center_x,
                    'y': current_y + d_size,
                    'size': d_size,
                    'label': d.get('condition', ''),
                })
                current_y += node_spacing

        if has_end:
            commands.append({'type': 'line', 'x1': center_x, 'y1': current_y - node_spacing + self.font_label * 3, 'x2': center_x, 'y2': current_y})
            commands.append({'type': 'usecase', 'name': '', 'x': center_x - 5, 'y': current_y, 'width': 10, 'height': 10})

        total_height = current_y - start_y + 20
        return commands, total_height

    def _layout_code(self, section: dict, start_y: float) -> tuple:
        content = section.get('content', '')
        lines = content.split('\n')
        font_size = self.font_body * 0.9

        commands = []
        page_bottom = self.paper_h - self.margin_b
        current_y = start_y
        current_page = 1

        for i, line in enumerate(lines):
            if current_y > page_bottom:
                current_page += 1
                current_y = self.margin_t
            commands.append({'type': 'text', 'content': line, 'x': self.margin_l, 'y': current_y, 'font_size': font_size, 'page': current_page})
            current_y += self.line_spacing

        used_height = len(lines) * self.line_spacing
        return commands, used_height

    def _wrap_text(self, text: str, max_width: float, font_size: float) -> List[str]:
        lines = []
        current_line = ''
        current_width = 0.0

        for char in text:
            char_w = get_char_width(char, font_size) * self.char_spacing
            if current_width + char_w > max_width and current_line:
                lines.append(current_line)
                current_line = char
                current_width = char_w
            else:
                current_line += char
                current_width += char_w

        if current_line:
            lines.append(current_line)
        return lines if lines else ['']

    def validate(self, commands: List[dict]) -> dict:
        issues = []

        for cmd in commands:
            page = cmd.get('page', 1)
            if page < 1:
                issues.append({'type': 'invalid_page', 'cmd': cmd})

            if cmd['type'] == 'text':
                text_width = self._estimate_text_width(cmd['content'], cmd.get('font_size', self.font_body))
                if cmd['x'] + text_width > self.paper_w - self.margin_r:
                    issues.append({'type': 'overflow_right', 'cmd': cmd, 'page': page})
                if cmd['y'] > self.paper_h - self.margin_b:
                    issues.append({'type': 'overflow_bottom', 'cmd': cmd, 'page': page})

            elif cmd['type'] in ('actor', 'usecase', 'ellipse', 'diamond'):
                if cmd.get('x', 0) > self.paper_w - self.margin_r or cmd.get('y', 0) > self.paper_h - self.margin_b:
                    issues.append({'type': 'out_of_bounds', 'cmd': cmd, 'page': page})

        text_boxes = []
        shape_boxes = []
        for cmd in commands:
            if cmd['type'] == 'text':
                text_boxes.append(self._get_text_bbox(cmd))
            elif cmd['type'] in ('actor', 'usecase', 'ellipse', 'diamond'):
                shape_boxes.append(self._get_shape_bbox(cmd))

        for tb in text_boxes:
            for sb in shape_boxes:
                if tb.get('page', 1) == sb.get('page', 1) and self._boxes_overlap(tb, sb):
                    issues.append({'type': 'overlap', 'text': tb, 'shape': sb})

        return {'valid': len(issues) == 0, 'issues': issues}

    def _estimate_text_width(self, text: str, font_size: float) -> float:
        total = 0.0
        for char in text:
            total += get_char_width(char, font_size) * self.char_spacing
        return total

    def _get_text_bbox(self, cmd: dict) -> dict:
        w = self._estimate_text_width(cmd['content'], cmd.get('font_size', self.font_body))
        h = cmd.get('font_size', self.font_body)
        return {'x': cmd['x'], 'y': cmd['y'] - h * 0.3, 'w': w, 'h': h, 'page': cmd.get('page', 1)}

    def _get_shape_bbox(self, cmd: dict) -> dict:
        if cmd['type'] == 'actor':
            h = cmd.get('height', 30)
            return {'x': cmd['x'] - h * 0.2, 'y': cmd['y'] - h * 0.35, 'w': h * 0.4, 'h': h, 'page': cmd.get('page', 1)}
        elif cmd['type'] in ('usecase', 'ellipse'):
            w = cmd.get('width', 50)
            h = cmd.get('height', 25)
            cx = cmd.get('x', 0) + w / 2 if 'x' in cmd else cmd.get('cx', 0)
            cy = cmd.get('y', 0) + h / 2 if 'y' in cmd else cmd.get('cy', 0)
            return {'x': cx - w / 2, 'y': cy - h / 2, 'w': w, 'h': h, 'page': cmd.get('page', 1)}
        elif cmd['type'] == 'diamond':
            size = cmd.get('size', 8)
            return {'x': cmd['x'] - size, 'y': cmd['y'] - size, 'w': size * 2, 'h': size * 2, 'page': cmd.get('page', 1)}
        return {'x': cmd['x'], 'y': cmd['y'], 'w': 10, 'h': 10, 'page': cmd.get('page', 1)}

    def _boxes_overlap(self, a: dict, b: dict) -> bool:
        return not (a['x'] + a['w'] < b['x'] or b['x'] + b['w'] < a['x'] or
                    a['y'] + a['h'] < b['y'] or b['y'] + b['h'] < a['y'])

    def adjust(self, commands: List[dict], issues: List[dict]) -> List[dict]:
        for issue in issues:
            if issue['type'] == 'overflow_right':
                cmd = issue['cmd']
                for c in commands:
                    if c is cmd:
                        c['x'] = self.margin_l
            elif issue['type'] == 'overlap':
                text_bbox = issue.get('text', {})
                shape_bbox = issue.get('shape', {})
                for c in commands:
                    if c.get('type') in ('actor', 'usecase', 'ellipse'):
                        bbox = self._get_shape_bbox(c)
                        if abs(bbox.get('y', 0) - shape_bbox.get('y', 0)) < 0.1 and abs(bbox.get('x', 0) - shape_bbox.get('x', 0)) < 0.1:
                            c['y'] = c.get('y', 0) + 10
        return commands
