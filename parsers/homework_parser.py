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
        'uml_usecase': ['用例图', '参与者', '用例', 'actor', 'use case'],
        'uml_class': ['类图', '属性', '方法', 'class diagram'],
        'uml_sequence': ['序列图', '时序图', 'sequence'],
        'uml_activity': ['活动图', 'activity'],
        'essay': ['论述', '分析', '说明', '简述'],
    }

    REQUIREMENT_KEYWORDS = {
        'handwritten': ['手写', '纸质'],
        'photo_upload': ['拍照', '上传'],
        'diagram_usecase': ['用例图'],
        'tool_rational_rose': ['Rational Rose'],
    }

    FORMAT_KEYWORDS = ['手写', '纸质', '拍照', '上传', '打印', 'A4', 'B5']

    def __init__(self, docx_path: str):
        self.doc = Document(docx_path)
        self.questions: List[Question] = []
        self.images: List[bytes] = []
        self.format_rules: Dict[str, Any] = {}

    def parse(self) -> Dict[str, Any]:
        full_text: List[str] = []

        for para in self.doc.paragraphs:
            text = para.text.strip()
            if not text:
                continue

            if self._is_question_header(text):
                self._extract_question(text, para.style)

            if self._is_format_requirement(text):
                self._extract_format(text)

            full_text.append(text)

        for rel in self.doc.part.rels.values():
            if "image" in rel.reltype:
                self.images.append(rel.target_part.blob)

        return {
            'raw_text': '\n'.join(full_text),
            'questions': self.questions,
            'images': self.images,
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
