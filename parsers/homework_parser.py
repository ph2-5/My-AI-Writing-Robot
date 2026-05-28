import re
from typing import List, Dict, Any

from docx import Document

from layout.models import Question


class HomeworkParser:

    QUESTION_PATTERNS = [
        r'^(\d+)\s*[、.．]',
        r'^第\s*(\d+)\s*题',
        r'^本次课作业共\s*(\d+)\s*道题',
    ]

    TYPE_KEYWORDS = {
        # UML图（软件工程）
        'uml_usecase': ['用例图', '参与者', '用例', 'actor', 'use case'],
        'uml_class': ['类图', '属性', '方法', 'class diagram'],
        'uml_sequence': ['序列图', '时序图', 'sequence'],
        'uml_activity': ['活动图', 'activity'],
        'uml_state': ['状态图', 'state diagram'],
        'uml_component': ['组件图', '构件图', 'component'],
        'uml_deployment': ['部署图', 'deployment'],
        
        # 机械制图
        'mechanical_drawing': ['机械制图', '三视图', '剖视图', '断面图', '零件图', '装配图'],
        'mechanical_section': ['剖面', '剖视', '全剖', '半剖', '局部剖'],
        'mechanical_dimension': ['尺寸标注', '公差', '配合'],
        
        # 电路/电子
        'circuit_diagram': ['电路图', '原理图', '接线图', 'PCB'],
        'circuit_analysis': ['电路分析', '节点电压', '回路电流'],
        'logic_circuit': ['逻辑电路', '门电路', '与门', '或门', '非门'],
        
        # 数学图形
        'math_function': ['函数图像', '函数图', '曲线图', 'y=', 'f(x)'],
        'math_geometry': ['几何图形', '几何证明', '作图题'],
        'math_coordinate': ['坐标系', '直角坐标', '极坐标'],
        
        # 流程图
        'flowchart': ['流程图', '程序框图', '算法流程'],
        
        # 建筑/土木
        'architectural': ['建筑图', '平面图', '立面图', '剖面图'],
        'structural': ['结构图', '钢筋图', '配筋图'],
        
        # 化工/工艺
        'process_diagram': ['工艺流程图', 'P&ID', '管道仪表图'],
        
        # 文字题
        'essay': ['论述', '分析', '说明', '简述', '阐述'],
        'calculation': ['计算', '求解', '推导', '证明'],
        'code': ['代码', '程序', '算法实现', '编程'],
        'proof': ['证明', '求证', '证'],
    }

    REQUIREMENT_KEYWORDS = {
        'handwritten': ['手写', '纸质'],
        'photo_upload': ['拍照', '上传'],
        'diagram_usecase': ['用例图'],
        'tool_rational_rose': ['Rational Rose'],
        'tool_cad': ['CAD', 'AutoCAD'],
        'tool_visio': ['Visio'],
        'scale': ['比例', '按1:', '1:', '1/'],
        'dimension': ['标注尺寸', '尺寸标注'],
    }

    FORMAT_KEYWORDS = ['手写', '纸质', '拍照', '上传', '打印', 'A4', 'B5']

    def __init__(self, docx_path: str):
        self.doc = Document(docx_path)
        self.questions: List[Question] = []
        self.images: List[bytes] = []
        self.format_rules: Dict[str, Any] = {}
        self.image_questions: List[Dict[str, Any]] = []  # 包含图片的题目

    def parse(self) -> Dict[str, Any]:
        full_text: List[str] = []
        current_question_images: List[bytes] = []
        
        # 先收集所有图片
        for rel in self.doc.part.rels.values():
            if "image" in rel.reltype:
                self.images.append(rel.target_part.blob)

        for para in self.doc.paragraphs:
            text = para.text.strip()
            if not text:
                continue

            if self._is_question_header(text):
                # 保存上一题的图片
                if current_question_images and self.questions:
                    self.image_questions.append({
                        'question_number': self.questions[-1].number,
                        'images': current_question_images.copy()
                    })
                current_question_images = []
                self._extract_question(text, para.style)

            if self._is_format_requirement(text):
                self._extract_format(text)

            full_text.append(text)
        
        # 处理最后一题的图片
        if current_question_images and self.questions:
            self.image_questions.append({
                'question_number': self.questions[-1].number,
                'images': current_question_images.copy()
            })

        # 尝试将图片与题目关联
        self._associate_images_with_questions()

        return {
            'raw_text': '\n'.join(full_text),
            'questions': self.questions,
            'images': self.images,
            'image_questions': self.image_questions,
            'format_rules': self.format_rules,
        }

    def _is_question_header(self, text: str) -> bool:
        return any(re.match(p, text) for p in self.QUESTION_PATTERNS)

    def _is_format_requirement(self, text: str) -> bool:
        return any(kw in text for kw in self.FORMAT_KEYWORDS)

    def _extract_question(self, text: str, style) -> None:
        q_type = self._detect_question_type(text)
        number = self._extract_number(text)
        requirements = self._extract_requirements(text)

        self.questions.append(Question(
            number=number,
            type=q_type,
            text=text,
            style=str(style),
            requirements=requirements,
        ))

    def _detect_question_type(self, text: str) -> str:
        text_lower = text.lower()
        for q_type, words in self.TYPE_KEYWORDS.items():
            if any(w in text_lower for w in words):
                return q_type
        return 'unknown'

    def _extract_number(self, text: str) -> int:
        for pattern in self.QUESTION_PATTERNS:
            match = re.match(pattern, text)
            if match:
                return int(match.group(1))
        return len(self.questions) + 1

    def _extract_requirements(self, text: str) -> List[str]:
        requirements = []
        for req_type, keywords in self.REQUIREMENT_KEYWORDS.items():
            if any(kw in text for kw in keywords):
                requirements.append(req_type)
        return requirements

    def _extract_format(self, text: str) -> None:
        for kw in self.FORMAT_KEYWORDS:
            if kw in text:
                self.format_rules[kw] = True

    def _associate_images_with_questions(self):
        """将图片与对应的题目关联"""
        # 如果图片数量与题目数量相同，按顺序关联
        if len(self.images) == len(self.questions):
            for i, img in enumerate(self.images):
                if i < len(self.questions):
                    self.image_questions.append({
                        'question_number': self.questions[i].number,
                        'images': [img]
                    })
        # 如果图片少，可能所有图片都属于某一题
        elif len(self.images) > 0 and len(self.questions) > 0:
            # 默认将图片关联到包含"图"、"如图所示"等关键词的题目
            for i, q in enumerate(self.questions):
                if any(kw in q.text for kw in ['图', '如图', '所示', '见下图']):
                    self.image_questions.append({
                        'question_number': q.number,
                        'images': self.images.copy()
                    })
                    break

    def get_question_images(self, question_number: int) -> List[bytes]:
        """获取指定题目的图片"""
        for item in self.image_questions:
            if item['question_number'] == question_number:
                return item['images']
        return []

    def has_images(self, question_number: int) -> bool:
        """检查指定题目是否包含图片"""
        return len(self.get_question_images(question_number)) > 0
