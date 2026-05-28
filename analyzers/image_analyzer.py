import base64
import io
from typing import Dict, Any, Optional, List
from PIL import Image
import numpy as np

from openai import OpenAI
import config
from logging_utils import get_logger

logger = get_logger('image_analyzer')


class ImageAnalyzer:
    """多模态图像分析器 - 使用DeepSeek V4 Pro解析题目图片"""

    def __init__(self, llm_client: Optional[OpenAI] = None, app_config=None):
        self._app_config = app_config if app_config is not None else config.DEFAULT_CONFIG
        if llm_client is None:
            self.llm = OpenAI(
                base_url=self._app_config.LLM_BASE_URL,
                api_key=self._app_config.LLM_API_KEY,
                timeout=120.0,
                max_retries=2,
            )
        else:
            self.llm = llm_client

    def analyze_image(self, image_data: bytes, question_text: str = "") -> Dict[str, Any]:
        """
        分析题目图片，提取图形参数和题目信息
        
        Args:
            image_data: 图片二进制数据
            question_text:  accompanying text (if any)
            
        Returns:
            {
                'success': bool,
                'image_type': str,  # 'mechanical', 'circuit', 'math_graph', 'uml', 'unknown'
                'description': str,  # 图片描述
                'elements': list,    # 检测到的图形元素
                'parameters': dict,  # 提取的参数（尺寸、坐标等）
                'error': str         # 错误信息（如果有）
            }
        """
        try:
            # 预处理图片
            processed_image = self._preprocess_image(image_data)
            base64_image = self._encode_image(processed_image)
            
            # 构建多模态提示词
            system_prompt = self._build_system_prompt()
            user_prompt = self._build_user_prompt(question_text)
            
            # 调用多模态LLM
            response = self.llm.chat.completions.create(
                model=self._app_config.LLM_MODEL,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {
                        "role": "user",
                        "content": [
                            {"type": "text", "text": user_prompt},
                            {
                                "type": "image_url",
                                "image_url": {
                                    "url": f"data:image/png;base64,{base64_image}"
                                }
                            }
                        ]
                    }
                ],
                response_format={"type": "json_object"},
                max_tokens=4096,
            )
            
            content = response.choices[0].message.content
            if not content:
                return self._error_result("LLM返回空内容")
            
            result = self._parse_response(content)
            result['success'] = True
            return result
            
        except Exception as e:
            logger.error(f"图像分析失败: {str(e)}")
            return self._error_result(str(e))

    def _preprocess_image(self, image_data: bytes) -> Image.Image:
        """预处理图片：调整大小、增强对比度等"""
        img = Image.open(io.BytesIO(image_data))
        
        # 转换为RGB（如果是RGBA或其他模式）
        if img.mode != 'RGB':
            img = img.convert('RGB')
        
        # 如果图片太大，等比例缩小（减少API调用成本）
        max_size = 2048
        if max(img.size) > max_size:
            ratio = max_size / max(img.size)
            new_size = (int(img.size[0] * ratio), int(img.size[1] * ratio))
            img = img.resize(new_size, Image.Resampling.LANCZOS)
        
        # 增强对比度，使线条更清晰
        from PIL import ImageEnhance
        enhancer = ImageEnhance.Contrast(img)
        img = enhancer.enhance(1.2)
        
        return img

    def _encode_image(self, img: Image.Image) -> str:
        """将图片编码为base64"""
        buffer = io.BytesIO()
        img.save(buffer, format='PNG')
        return base64.b64encode(buffer.getvalue()).decode('utf-8')

    def _build_system_prompt(self) -> str:
        return """你是一位专业的工程图纸分析专家。你的任务是分析用户提供的题目图片，识别图中的图形类型、元素和参数。

【输出格式】
必须是JSON格式：
{
  "image_type": "图形类型",
  "description": "图片内容的详细描述",
  "elements": [
    {
      "type": "元素类型",
      "label": "标注文字",
      "position": {"x": 0.5, "y": 0.5},
      "size": {"width": 0.2, "height": 0.1},
      "properties": {}
    }
  ],
  "parameters": {
    "dimensions": [],
    "angles": [],
    "relations": []
  },
  "drawing_commands": [
    {
      "type": "图形原语类型",
      "params": {}
    }
  ]
}

【图形类型】
- mechanical: 机械制图（三视图、剖视图、零件图）
- circuit: 电路图/电子线路图
- math_graph: 数学图形（函数图像、几何图形）
- uml: UML图（用例图、类图、时序图）
- flowchart: 流程图
- geometry: 几何作图题
- unknown: 无法识别

【元素类型】
- line: 直线
- circle: 圆
- arc: 圆弧
- rectangle: 矩形
- text: 文字标注
- dimension: 尺寸标注
- arrow: 箭头
- symbol: 标准符号（电阻、电容等）

【坐标系统】
- 使用相对坐标 (0.0-1.0)
- x: 水平位置，0=最左，1=最右
- y: 垂直位置，0=最上，1=最下

【重要规则】
1. 只描述你确实看到的图形，不要猜测
2. 对于尺寸标注，提取数值和单位
3. 对于几何关系，描述相对位置（平行、垂直、相切等）
4. 如果图形复杂，优先描述主要结构和关键尺寸
5. 对于机械图，区分不同类型的线（粗实线、细实线、虚线、点划线）
"""

    def _build_user_prompt(self, question_text: str) -> str:
        prompt = "请分析这张题目图片。"
        if question_text:
            prompt += f"\n\n题目文字：{question_text}"
        prompt += "\n\n请详细描述图片内容，识别所有图形元素、尺寸标注和几何关系，并以JSON格式输出。"
        return prompt

    def _parse_response(self, content: str) -> Dict[str, Any]:
        """解析LLM响应"""
        import json
        try:
            result = json.loads(content)
            # 确保必要字段存在
            if 'image_type' not in result:
                result['image_type'] = 'unknown'
            if 'description' not in result:
                result['description'] = ''
            if 'elements' not in result:
                result['elements'] = []
            if 'parameters' not in result:
                result['parameters'] = {}
            if 'drawing_commands' not in result:
                result['drawing_commands'] = []
            return result
        except json.JSONDecodeError:
            # 如果JSON解析失败，返回原始内容作为描述
            return {
                'image_type': 'unknown',
                'description': content,
                'elements': [],
                'parameters': {},
                'drawing_commands': []
            }

    def _error_result(self, error_msg: str) -> Dict[str, Any]:
        return {
            'success': False,
            'image_type': 'unknown',
            'description': '',
            'elements': [],
            'parameters': {},
            'drawing_commands': [],
            'error': error_msg
        }

    def extract_drawing_commands(self, image_analysis: Dict[str, Any], 
                                  paper_config: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        将图像分析结果转换为绘制命令
        
        Args:
            image_analysis: analyze_image的返回结果
            paper_config: 纸张配置（尺寸、边距等）
            
        Returns:
            绘制命令列表
        """
        commands = []
        elements = image_analysis.get('elements', [])
        
        paper_w = paper_config.get('paperWidth', 210)
        paper_h = paper_config.get('paperHeight', 297)
        margin_l = paper_config.get('marginLeft', 15)
        margin_t = paper_config.get('marginTop', 20)
        writable_w = paper_w - margin_l - paper_config.get('marginRight', 15)
        writable_h = paper_h - margin_t - paper_config.get('marginBottom', 20)
        
        for elem in elements:
            elem_type = elem.get('type', '')
            pos = elem.get('position', {'x': 0.5, 'y': 0.5})
            size = elem.get('size', {'width': 0.1, 'height': 0.1})
            
            # 将相对坐标转换为绝对坐标
            abs_x = margin_l + pos['x'] * writable_w
            abs_y = margin_t + pos['y'] * writable_h
            abs_w = size['width'] * writable_w
            abs_h = size['height'] * writable_h
            
            if elem_type == 'line':
                commands.append({
                    'type': 'line',
                    'x1': abs_x,
                    'y1': abs_y,
                    'x2': abs_x + abs_w,
                    'y2': abs_y + abs_h
                })
            elif elem_type == 'circle':
                commands.append({
                    'type': 'ellipse',
                    'cx': abs_x,
                    'cy': abs_y,
                    'rx': abs_w / 2,
                    'ry': abs_w / 2
                })
            elif elem_type == 'rectangle':
                commands.append({
                    'type': 'rect',
                    'x': abs_x - abs_w / 2,
                    'y': abs_y - abs_h / 2,
                    'width': abs_w,
                    'height': abs_h
                })
            elif elem_type == 'text':
                commands.append({
                    'type': 'text',
                    'content': elem.get('label', ''),
                    'x': abs_x,
                    'y': abs_y,
                    'font_size': paper_config.get('fontSizeLabel', 3.5)
                })
            elif elem_type == 'arc':
                commands.append({
                    'type': 'arc',
                    'cx': abs_x,
                    'cy': abs_y,
                    'radius': abs_w / 2,
                    'start_angle': elem.get('properties', {}).get('start_angle', 0),
                    'end_angle': elem.get('properties', {}).get('end_angle', 90)
                })
        
        return commands
