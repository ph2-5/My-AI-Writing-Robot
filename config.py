import os
from dataclasses import dataclass, fields


@dataclass(frozen=True)
class AppConfig:
    PAPER_WIDTH: float = 210
    PAPER_HEIGHT: float = 297
    MARGIN_TOP: float = 20
    MARGIN_BOTTOM: float = 20
    MARGIN_LEFT: float = 15
    MARGIN_RIGHT: float = 15
    FONT_SIZE_TITLE: float = 5.0
    FONT_SIZE_BODY: float = 4.2
    FONT_SIZE_LABEL: float = 3.5
    LINE_SPACING: float = 6.3
    QUESTION_SPACING: float = 15
    CHAR_SPACING: float = 1.2
    CHAR_SPACING_VAR: float = 0.15
    BASELINE_WOBBLE: float = 0.3
    SLANT: float = 0.02
    PEN_UP_HEIGHT: float = 3.0
    PEN_DOWN_HEIGHT: float = 0.0
    TRAVEL_SPEED: float = 80.0
    DRAW_SPEED: float = 25.0
    HAND_DRAWN_AMPLITUDE: float = 0.4
    HAND_DRAWN_FREQUENCY: float = 0.1
    HAND_DRAWN_CORNER_EXAGGERATION: float = 1.5
    LLM_BASE_URL: str = os.environ.get("LLM_BASE_URL", "https://api.deepseek.com")
    LLM_API_KEY: str = os.environ.get("LLM_API_KEY", "")
    LLM_MODEL: str = os.environ.get("LLM_MODEL", "deepseek-coder")

    @classmethod
    def from_dict(cls, d: dict) -> "AppConfig":
        valid = {f.name: d[f.name] for f in fields(cls) if f.name in d}
        return cls(**valid)

    def merge_dict(self, d: dict) -> "AppConfig":
        valid = {f.name: d[f.name] for f in fields(AppConfig) if f.name in d}
        return AppConfig(**{**self.__dict__, **valid})


DEFAULT_CONFIG = AppConfig()
