from typing import List, Dict, Any
from layout.precision_layout import PrecisionLayout
from layout.preview_renderer import PreviewRenderer
import config as cfg_module


class LayoutTools:

    def __init__(self, app_config=None, config_dict: dict = None):
        self._app_config = app_config if app_config is not None else cfg_module.DEFAULT_CONFIG
        self._config_dict = config_dict or {}
        self._precision = PrecisionLayout(config=self._config_dict, app_config=self._app_config)
        self._renderer = PreviewRenderer(config=self._config_dict, app_config=self._app_config)

    def calculate_layout(self, layout_plan: dict) -> List[Dict[str, Any]]:
        return self._precision.calculate(layout_plan)

    def validate_layout(self, commands: List[Dict[str, Any]]) -> Dict[str, Any]:
        return self._precision.validate(commands)

    def adjust_layout(self, commands: List[Dict[str, Any]], issues: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        return self._precision.adjust(commands, issues)

    def render_preview(self, commands: List[Dict[str, Any]]) -> str:
        return self._renderer._commands_to_svg(commands)

    def register_all(self, agent):
        agent.register_tool('calculate_layout', self.calculate_layout)
        agent.register_tool('validate_layout', self.validate_layout)
        agent.register_tool('adjust_layout', self.adjust_layout)
        agent.register_tool('render_preview', self.render_preview)
