"""
电路图标准符号库
提供常见电子元器件的绘制命令
"""

from typing import List, Dict, Any
from layout.models import Point, Stroke


class CircuitSymbolLibrary:
    """电路图标准符号库"""

    @staticmethod
    def resistor(x: float, y: float, width: float = 40, height: float = 12, 
                 orientation: str = 'horizontal') -> List[Dict[str, Any]]:
        """电阻符号（矩形框）"""
        commands = []
        if orientation == 'horizontal':
            # 水平电阻
            rect_x = x - width / 2
            rect_y = y - height / 2
            commands.append({'type': 'rect', 'x': rect_x, 'y': rect_y, 'width': width, 'height': height})
            # 引线
            commands.append({'type': 'line', 'x1': x - width / 2 - 15, 'y1': y, 'x2': x - width / 2, 'y2': y})
            commands.append({'type': 'line', 'x1': x + width / 2, 'y1': y, 'x2': x + width / 2 + 15, 'y2': y})
        else:
            # 垂直电阻
            rect_x = x - height / 2
            rect_y = y - width / 2
            commands.append({'type': 'rect', 'x': rect_x, 'y': rect_y, 'width': height, 'height': width})
            # 引线
            commands.append({'type': 'line', 'x1': x, 'y1': y - width / 2 - 15, 'x2': x, 'y2': y - width / 2})
            commands.append({'type': 'line', 'x1': x, 'y1': y + width / 2, 'x2': x, 'y2': y + width / 2 + 15})
        return commands

    @staticmethod
    def capacitor(x: float, y: float, width: float = 20, height: float = 30,
                  orientation: str = 'horizontal') -> List[Dict[str, Any]]:
        """电容符号（两条平行线）"""
        commands = []
        if orientation == 'horizontal':
            # 水平电容
            gap = 6
            commands.append({'type': 'line', 'x1': x - gap / 2, 'y1': y - height / 2, 
                           'x2': x - gap / 2, 'y2': y + height / 2})
            commands.append({'type': 'line', 'x1': x + gap / 2, 'y1': y - height / 2, 
                           'x2': x + gap / 2, 'y2': y + height / 2})
            # 引线
            commands.append({'type': 'line', 'x1': x - gap / 2 - 15, 'y1': y, 'x2': x - gap / 2, 'y2': y})
            commands.append({'type': 'line', 'x1': x + gap / 2, 'y1': y, 'x2': x + gap / 2 + 15, 'y2': y})
        else:
            # 垂直电容
            gap = 6
            commands.append({'type': 'line', 'x1': x - height / 2, 'y1': y - gap / 2, 
                           'x2': x + height / 2, 'y2': y - gap / 2})
            commands.append({'type': 'line', 'x1': x - height / 2, 'y1': y + gap / 2, 
                           'x2': x + height / 2, 'y2': y + gap / 2})
            # 引线
            commands.append({'type': 'line', 'x1': x, 'y1': y - gap / 2 - 15, 'x2': x, 'y2': y - gap / 2})
            commands.append({'type': 'line', 'x1': x, 'y1': y + gap / 2, 'x2': x, 'y2': y + gap / 2 + 15})
        return commands

    @staticmethod
    def inductor(x: float, y: float, width: float = 40, height: float = 16,
                 orientation: str = 'horizontal') -> List[Dict[str, Any]]:
        """电感符号（螺旋线）"""
        commands = []
        coil_count = 4
        coil_width = width / coil_count
        
        if orientation == 'horizontal':
            # 水平电感
            for i in range(coil_count):
                cx = x - width / 2 + coil_width * i + coil_width / 2
                commands.append({'type': 'arc', 'cx': cx, 'cy': y, 'r': coil_width / 2,
                               'start_angle': 180, 'end_angle': 360})
            # 引线
            commands.append({'type': 'line', 'x1': x - width / 2 - 15, 'y1': y, 'x2': x - width / 2, 'y2': y})
            commands.append({'type': 'line', 'x1': x + width / 2, 'y1': y, 'x2': x + width / 2 + 15, 'y2': y})
        else:
            # 垂直电感
            for i in range(coil_count):
                cy = y - width / 2 + coil_width * i + coil_width / 2
                commands.append({'type': 'arc', 'cx': x, 'cy': cy, 'r': coil_width / 2,
                               'start_angle': 270, 'end_angle': 90})
            # 引线
            commands.append({'type': 'line', 'x1': x, 'y1': y - width / 2 - 15, 'x2': x, 'y2': y - width / 2})
            commands.append({'type': 'line', 'x1': x, 'y1': y + width / 2, 'x2': x, 'y2': y + width / 2 + 15})
        return commands

    @staticmethod
    def diode(x: float, y: float, size: float = 20,
              orientation: str = 'horizontal') -> List[Dict[str, Any]]:
        """二极管符号（三角形+竖线）"""
        commands = []
        if orientation == 'horizontal':
            # 水平二极管
            # 三角形
            commands.append({'type': 'polygon', 'points': [
                {'x': x - size / 2, 'y': y - size / 2},
                {'x': x - size / 2, 'y': y + size / 2},
                {'x': x + size / 2, 'y': y},
            ]})
            # 竖线
            commands.append({'type': 'line', 'x1': x + size / 2, 'y1': y - size / 2,
                           'x2': x + size / 2, 'y2': y + size / 2})
            # 引线
            commands.append({'type': 'line', 'x1': x - size / 2 - 15, 'y1': y, 'x2': x - size / 2, 'y2': y})
            commands.append({'type': 'line', 'x1': x + size / 2, 'y1': y, 'x2': x + size / 2 + 15, 'y2': y})
        else:
            # 垂直二极管
            commands.append({'type': 'polygon', 'points': [
                {'x': x - size / 2, 'y': y - size / 2},
                {'x': x + size / 2, 'y': y - size / 2},
                {'x': x, 'y': y + size / 2},
            ]})
            commands.append({'type': 'line', 'x1': x - size / 2, 'y1': y + size / 2,
                           'x2': x + size / 2, 'y2': y + size / 2})
            # 引线
            commands.append({'type': 'line', 'x1': x, 'y1': y - size / 2 - 15, 'x2': x, 'y2': y - size / 2})
            commands.append({'type': 'line', 'x1': x, 'y1': y + size / 2, 'x2': x, 'y2': y + size / 2 + 15})
        return commands

    @staticmethod
    def ground(x: float, y: float, size: float = 20) -> List[Dict[str, Any]]:
        """接地符号"""
        commands = []
        # 竖线
        commands.append({'type': 'line', 'x1': x, 'y1': y - 15, 'x2': x, 'y2': y})
        # 横线（上宽下窄）
        commands.append({'type': 'line', 'x1': x - size / 2, 'y1': y, 'x2': x + size / 2, 'y2': y})
        commands.append({'type': 'line', 'x1': x - size / 3, 'y1': y + 5, 'x2': x + size / 3, 'y2': y + 5})
        commands.append({'type': 'line', 'x1': x - size / 6, 'y1': y + 10, 'x2': x + size / 6, 'y2': y + 10})
        return commands

    @staticmethod
    def battery(x: float, y: float, height: float = 30,
                orientation: str = 'vertical') -> List[Dict[str, Any]]:
        """电池符号"""
        commands = []
        if orientation == 'vertical':
            # 长线（正极）
            commands.append({'type': 'line', 'x1': x - 10, 'y1': y - height / 2, 
                           'x2': x + 10, 'y2': y - height / 2})
            # 短线（负极）
            commands.append({'type': 'line', 'x1': x - 5, 'y1': y + height / 2, 
                           'x2': x + 5, 'y2': y + height / 2})
            # 连接线
            commands.append({'type': 'line', 'x1': x, 'y1': y - height / 2 - 15, 'x2': x, 'y2': y - height / 2})
            commands.append({'type': 'line', 'x1': x, 'y1': y + height / 2, 'x2': x, 'y2': y + height / 2 + 15})
        else:
            commands.append({'type': 'line', 'x1': x - height / 2, 'y1': y - 10, 
                           'x2': x - height / 2, 'y2': y + 10})
            commands.append({'type': 'line', 'x1': x + height / 2, 'y1': y - 5, 
                           'x2': x + height / 2, 'y2': y + 5})
            commands.append({'type': 'line', 'x1': x - height / 2 - 15, 'y1': y, 'x2': x - height / 2, 'y2': y})
            commands.append({'type': 'line', 'x1': x + height / 2, 'y1': y, 'x2': x + height / 2 + 15, 'y2': y})
        return commands

    @staticmethod
    def opamp(x: float, y: float, size: float = 40) -> List[Dict[str, Any]]:
        """运算放大器符号（三角形）"""
        commands = []
        # 三角形
        commands.append({'type': 'polygon', 'points': [
            {'x': x - size / 2, 'y': y - size / 2},
            {'x': x - size / 2, 'y': y + size / 2},
            {'x': x + size / 2, 'y': y},
        ]})
        # 输入引脚
        commands.append({'type': 'line', 'x1': x - size / 2 - 15, 'y1': y - size / 4, 
                       'x2': x - size / 2, 'y2': y - size / 4})
        commands.append({'type': 'line', 'x1': x - size / 2 - 15, 'y1': y + size / 4, 
                       'x2': x - size / 2, 'y2': y + size / 4})
        # 输出引脚
        commands.append({'type': 'line', 'x1': x + size / 2, 'y1': y, 
                       'x2': x + size / 2 + 15, 'y2': y})
        # 电源引脚
        commands.append({'type': 'line', 'x1': x, 'y1': y - size / 2, 
                       'x2': x, 'y2': y - size / 2 - 10})
        commands.append({'type': 'line', 'x1': x, 'y1': y + size / 2, 
                       'x2': x, 'y2': y + size / 2 + 10})
        return commands

    @staticmethod
    def logic_gate(gate_type: str, x: float, y: float, size: float = 30) -> List[Dict[str, Any]]:
        """逻辑门符号"""
        commands = []
        
        if gate_type == 'and':
            # 与门：D形
            commands.append({'type': 'line', 'x1': x - size / 2, 'y1': y - size / 2, 
                           'x2': x - size / 2, 'y2': y + size / 2})
            commands.append({'type': 'arc', 'cx': x - size / 2, 'cy': y, 'r': size / 2,
                           'start_angle': 270, 'end_angle': 90})
            # 输入
            commands.append({'type': 'line', 'x1': x - size / 2 - 15, 'y1': y - size / 4, 
                           'x2': x - size / 2, 'y2': y - size / 4})
            commands.append({'type': 'line', 'x1': x - size / 2 - 15, 'y1': y + size / 4, 
                           'x2': x - size / 2, 'y2': y + size / 4})
            # 输出
            commands.append({'type': 'line', 'x1': x, 'y1': y, 
                           'x2': x + 15, 'y2': y})
        
        elif gate_type == 'or':
            # 或门：弧形
            commands.append({'type': 'arc', 'cx': x - size / 2, 'cy': y - size / 2, 'r': size / 2,
                           'start_angle': 270, 'end_angle': 0})
            commands.append({'type': 'arc', 'cx': x - size / 2, 'cy': y + size / 2, 'r': size / 2,
                           'start_angle': 0, 'end_angle': 90})
            commands.append({'type': 'arc', 'cx': x + size / 2, 'cy': y, 'r': size / 2,
                           'start_angle': 90, 'end_angle': 270})
            # 输入输出
            commands.append({'type': 'line', 'x1': x - size / 2 - 15, 'y1': y - size / 4, 
                           'x2': x - size / 2, 'y2': y - size / 4})
            commands.append({'type': 'line', 'x1': x - size / 2 - 15, 'y1': y + size / 4, 
                           'x2': x - size / 2, 'y2': y + size / 4})
            commands.append({'type': 'line', 'x1': x + size / 2, 'y1': y, 
                           'x2': x + size / 2 + 15, 'y2': y})
        
        elif gate_type == 'not':
            # 非门：三角形+圆圈
            commands.append({'type': 'polygon', 'points': [
                {'x': x - size / 2, 'y': y - size / 2},
                {'x': x - size / 2, 'y': y + size / 2},
                {'x': x + size / 3, 'y': y},
            ]})
            commands.append({'type': 'circle', 'cx': x + size / 3 + 4, 'cy': y, 'r': 4})
            # 输入输出
            commands.append({'type': 'line', 'x1': x - size / 2 - 15, 'y1': y, 
                           'x2': x - size / 2, 'y2': y})
            commands.append({'type': 'line', 'x1': x + size / 3 + 8, 'y1': y, 
                           'x2': x + size / 3 + 15, 'y2': y})
        
        return commands

    @classmethod
    def get_symbol(cls, symbol_type: str, x: float, y: float, **kwargs) -> List[Dict[str, Any]]:
        """根据类型获取符号"""
        symbol_map = {
            'resistor': cls.resistor,
            'capacitor': cls.capacitor,
            'inductor': cls.inductor,
            'diode': cls.diode,
            'ground': cls.ground,
            'battery': cls.battery,
            'opamp': cls.opamp,
            'and_gate': lambda x, y, **kw: cls.logic_gate('and', x, y, **kw),
            'or_gate': lambda x, y, **kw: cls.logic_gate('or', x, y, **kw),
            'not_gate': lambda x, y, **kw: cls.logic_gate('not', x, y, **kw),
        }
        
        func = symbol_map.get(symbol_type)
        if func:
            return func(x, y, **kwargs)
        return []
