"""
机械制图标准符号库
提供常见机械制图符号的绘制命令
"""

from typing import List, Dict, Any
import math


class MechanicalSymbolLibrary:
    """机械制图标准符号库"""

    @staticmethod
    def dimension_line(x1: float, y1: float, x2: float, y2: float, 
                       value: str, offset: float = 8) -> List[Dict[str, Any]]:
        """尺寸标注线"""
        commands = []
        
        # 计算方向
        dx = x2 - x1
        dy = y2 - y1
        length = math.sqrt(dx**2 + dy**2)
        if length < 0.01:
            return commands
        
        # 垂直方向
        ux = -dy / length
        uy = dx / length
        
        # 尺寸线位置
        sx1 = x1 + ux * offset
        sy1 = y1 + uy * offset
        sx2 = x2 + ux * offset
        sy2 = y2 + uy * offset
        
        # 尺寸线
        commands.append({'type': 'line', 'x1': sx1, 'y1': sy1, 'x2': sx2, 'y2': sy2})
        
        # 边界线
        commands.append({'type': 'line', 'x1': x1, 'y1': y1, 'x2': sx1, 'y2': sy1})
        commands.append({'type': 'line', 'x1': x2, 'y1': y2, 'x2': sx2, 'y2': sy2})
        
        # 箭头
        arrow_size = 3
        # 左箭头
        commands.append({'type': 'line', 'x1': sx1 + arrow_size, 'y1': sy1 - arrow_size/2,
                       'x2': sx1, 'y2': sy1})
        commands.append({'type': 'line', 'x1': sx1 + arrow_size, 'y1': sy1 + arrow_size/2,
                       'x2': sx1, 'y2': sy1})
        # 右箭头
        commands.append({'type': 'line', 'x1': sx2 - arrow_size, 'y1': sy2 - arrow_size/2,
                       'x2': sx2, 'y2': sy2})
        commands.append({'type': 'line', 'x1': sx2 - arrow_size, 'y1': sy2 + arrow_size/2,
                       'x2': sx2, 'y2': sy2})
        
        # 数值
        mid_x = (sx1 + sx2) / 2
        mid_y = (sy1 + sy2) / 2
        commands.append({'type': 'text', 'content': value, 'x': mid_x - len(value) * 1.5, 
                       'y': mid_y - 4, 'font_size': 3})
        
        return commands

    @staticmethod
    def center_mark(cx: float, cy: float, size: float = 10) -> List[Dict[str, Any]]:
        """圆心标记（十字）"""
        commands = []
        commands.append({'type': 'line', 'x1': cx - size, 'y1': cy, 'x2': cx + size, 'y2': cy})
        commands.append({'type': 'line', 'x1': cx, 'y1': cy - size, 'x2': cx, 'y2': cy + size})
        return commands

    @staticmethod
    def center_line(x1: float, y1: float, x2: float, y2: float) -> List[Dict[str, Any]]:
        """中心线（点划线）"""
        commands = []
        total_length = math.sqrt((x2 - x1)**2 + (y2 - y1)**2)
        if total_length < 0.01:
            return commands
        
        dx = (x2 - x1) / total_length
        dy = (y2 - y1) / total_length
        
        pos = 0.0
        pattern = [8, 2, 2, 2]  # 长划-空-短划-空
        pattern_idx = 0
        
        while pos < total_length:
            seg_len = pattern[pattern_idx % len(pattern)]
            seg_len = min(seg_len, total_length - pos)
            
            sx = x1 + dx * pos
            sy = y1 + dy * pos
            ex = x1 + dx * (pos + seg_len)
            ey = y1 + dy * (pos + seg_len)
            
            if pattern_idx % len(pattern) in [0, 2]:
                commands.append({'type': 'line', 'x1': sx, 'y1': sy, 'x2': ex, 'y2': ey})
            
            pos += seg_len
            pattern_idx += 1
        
        return commands

    @staticmethod
    def surface_roughness(x: float, y: float, value: str = '3.2') -> List[Dict[str, Any]]:
        """表面粗糙度符号"""
        commands = []
        size = 12
        
        # 三角形符号
        commands.append({'type': 'line', 'x1': x, 'y1': y, 
                       'x2': x - size / 2, 'y2': y + size})
        commands.append({'type': 'line', 'x1': x, 'y1': y, 
                       'x2': x + size / 2, 'y2': y + size})
        commands.append({'type': 'line', 'x1': x - size / 2, 'y1': y + size, 
                       'x2': x + size / 2, 'y2': y + size})
        
        # 数值
        commands.append({'type': 'text', 'content': value, 'x': x - len(value) * 1.5, 
                       'y': y + size + 4, 'font_size': 2.5})
        
        return commands

    @staticmethod
    def datum_feature(x: float, y: float, label: str = 'A') -> List[Dict[str, Any]]:
        """基准特征符号"""
        commands = []
        size = 15
        
        # 三角形
        commands.append({'type': 'polygon', 'points': [
            {'x': x, 'y': y},
            {'x': x - size / 2, 'y': y + size},
            {'x': x + size / 2, 'y': y + size},
        ]})
        
        # 标签
        commands.append({'type': 'text', 'content': label, 'x': x - 2, 
                       'y': y + size + 6, 'font_size': 3})
        
        return commands

    @staticmethod
    def tolerance_frame(x: float, y: float, symbol: str = '⌀', 
                       value: str = '0.05', datum: str = 'A') -> List[Dict[str, Any]]:
        """形位公差框格"""
        commands = []
        cell_width = 20
        cell_height = 10
        
        # 框格线
        commands.append({'type': 'rect', 'x': x, 'y': y, 
                       'width': cell_width * 3, 'height': cell_height})
        
        # 分隔线
        commands.append({'type': 'line', 'x1': x + cell_width, 'y1': y, 
                       'x2': x + cell_width, 'y2': y + cell_height})
        commands.append({'type': 'line', 'x1': x + cell_width * 2, 'y1': y, 
                       'x2': x + cell_width * 2, 'y2': y + cell_height})
        
        # 内容
        commands.append({'type': 'text', 'content': symbol, 'x': x + 5, 
                       'y': y + cell_height - 2, 'font_size': 3})
        commands.append({'type': 'text', 'content': value, 'x': x + cell_width + 3, 
                       'y': y + cell_height - 2, 'font_size': 3})
        commands.append({'type': 'text', 'content': datum, 'x': x + cell_width * 2 + 5, 
                       'y': y + cell_height - 2, 'font_size': 3})
        
        return commands

    @staticmethod
    def section_arrow(x: float, y: float, direction: str = 'right',
                     label: str = 'A') -> List[Dict[str, Any]]:
        """剖切符号箭头"""
        commands = []
        length = 20
        
        if direction == 'right':
            # 箭头线
            commands.append({'type': 'line', 'x1': x, 'y1': y, 'x2': x + length, 'y2': y})
            # 箭头
            commands.append({'type': 'line', 'x1': x + length - 5, 'y1': y - 3, 
                           'x2': x + length, 'y2': y})
            commands.append({'type': 'line', 'x1': x + length - 5, 'y1': y + 3, 
                           'x2': x + length, 'y2': y})
            # 标签
            commands.append({'type': 'text', 'content': label, 'x': x + length + 3, 
                           'y': y + 2, 'font_size': 3})
        else:
            commands.append({'type': 'line', 'x1': x - length, 'y1': y, 'x2': x, 'y2': y})
            commands.append({'type': 'line', 'x1': x - length + 5, 'y1': y - 3, 
                           'x2': x - length, 'y2': y})
            commands.append({'type': 'line', 'x1': x - length + 5, 'y1': y + 3, 
                           'x2': x - length, 'y2': y})
            commands.append({'type': 'text', 'content': label, 'x': x - length - 8, 
                           'y': y + 2, 'font_size': 3})
        
        return commands

    @staticmethod
    def weld_symbol(x: float, y: float, weld_type: str = 'fillet') -> List[Dict[str, Any]]:
        """焊接符号"""
        commands = []
        
        if weld_type == 'fillet':
            # 角焊缝：三角形
            commands.append({'type': 'polygon', 'points': [
                {'x': x, 'y': y},
                {'x': x, 'y': y + 10},
                {'x': x + 10, 'y': y + 10},
            ]})
        elif weld_type == 'butt':
            # 对接焊缝：V形
            commands.append({'type': 'line', 'x1': x, 'y1': y, 'x2': x + 5, 'y2': y + 10})
            commands.append({'type': 'line', 'x1': x + 10, 'y1': y, 'x2': x + 5, 'y2': y + 10})
        
        return commands

    @staticmethod
    def thread_symbol(x1: float, y1: float, x2: float, y2: float,
                     pitch: float = 5) -> List[Dict[str, Any]]:
        """螺纹符号"""
        commands = []
        
        # 主轴线
        commands.append({'type': 'line', 'x1': x1, 'y1': y1, 'x2': x2, 'y2': y2})
        
        # 螺纹线（锯齿形）
        dx = x2 - x1
        dy = y2 - y1
        length = math.sqrt(dx**2 + dy**2)
        if length < 0.01:
            return commands
        
        ux = dx / length
        uy = dy / length
        
        num_teeth = int(length / pitch)
        for i in range(num_teeth):
            start_pos = i * pitch
            end_pos = (i + 0.5) * pitch
            
            sx = x1 + ux * start_pos
            sy = y1 + uy * start_pos
            ex = x1 + ux * end_pos
            ey = y1 + uy * end_pos
            
            # 垂直于轴线的短线
            commands.append({'type': 'line', 'x1': sx, 'y1': sy, 
                           'x2': sx - uy * 3, 'y2': sy + ux * 3})
        
        return commands

    @classmethod
    def get_symbol(cls, symbol_type: str, **kwargs) -> List[Dict[str, Any]]:
        """根据类型获取符号"""
        symbol_map = {
            'dimension': cls.dimension_line,
            'center_mark': cls.center_mark,
            'center_line': cls.center_line,
            'surface_roughness': cls.surface_roughness,
            'datum_feature': cls.datum_feature,
            'tolerance_frame': cls.tolerance_frame,
            'section_arrow': cls.section_arrow,
            'weld': cls.weld_symbol,
            'thread': cls.thread_symbol,
        }
        
        func = symbol_map.get(symbol_type)
        if func:
            return func(**kwargs)
        return []
