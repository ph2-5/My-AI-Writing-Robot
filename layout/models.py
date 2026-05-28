from dataclasses import dataclass, field
from typing import List, Optional


@dataclass
class Point:
    x: float
    y: float


@dataclass
class Stroke:
    points: List[Point]
    pen_down: bool = True
    speed: float = 25.0


@dataclass
class Question:
    number: int
    type: str
    text: str
    style: str = ""
    requirements: List[str] = field(default_factory=list)


@dataclass
class LayoutResult:
    strokes: List[Stroke]
    page_width: float = 210.0
    page_height: float = 297.0
    page_count: int = 1
