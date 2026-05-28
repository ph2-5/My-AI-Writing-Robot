from typing import Dict, Any


class StyleStrategist:
    """根据题目类型推荐字体变形参数"""

    STRATEGIES = {
        'uml_usecase': {
            'handDrawnAmplitude': 0.2,
            'charSpacingVar': 0.05,
            'baselineWobble': 0.1,
            'slant': 0.0,
            'description': 'UML图需要规整清晰，变形幅度小',
        },
        'uml_class': {
            'handDrawnAmplitude': 0.2,
            'charSpacingVar': 0.05,
            'baselineWobble': 0.1,
            'slant': 0.0,
            'description': '类图需要规整清晰，变形幅度小',
        },
        'uml_sequence': {
            'handDrawnAmplitude': 0.15,
            'charSpacingVar': 0.03,
            'baselineWobble': 0.05,
            'slant': 0.0,
            'description': '序列图需要精确对齐，几乎不变形',
        },
        'essay': {
            'handDrawnAmplitude': 0.5,
            'charSpacingVar': 0.15,
            'baselineWobble': 0.4,
            'slant': 0.02,
            'description': '文字题模拟自然手写，变形适中',
        },
        'code': {
            'handDrawnAmplitude': 0.1,
            'charSpacingVar': 0.0,
            'baselineWobble': 0.0,
            'slant': 0.0,
            'description': '代码需要等宽对齐，几乎不变形',
        },
        'unknown': {
            'handDrawnAmplitude': 0.4,
            'charSpacingVar': 0.12,
            'baselineWobble': 0.3,
            'slant': 0.015,
            'description': '默认自然手写风格',
        },
    }

    def recommend(self, question_type: str, paper_template: str = 'blank') -> Dict[str, Any]:
        base = self.STRATEGIES.get(question_type, self.STRATEGIES['unknown']).copy()

        if paper_template == 'ruled':
            base['baselineWobble'] = max(0.0, base['baselineWobble'] - 0.2)
            base['description'] += '（横线本限制基线浮动）'
        elif paper_template == 'grid':
            base['baselineWobble'] = 0.0
            base['charSpacingVar'] = max(0.0, base['charSpacingVar'] - 0.05)
            base['description'] += '（方格本限制变形）'

        return base
