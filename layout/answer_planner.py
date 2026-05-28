import json
from typing import List, Dict, Any, Optional, Callable
from layout.models import Question
from analyzers.agent.layout_designer import LayoutDesignerAgent
from analyzers.agent.layout_tools import LayoutTools
import config as cfg_module


class AnswerPlanner:

    def __init__(self, app_config=None, on_progress: Optional[Callable] = None):
        self._app_config = app_config if app_config is not None else cfg_module.DEFAULT_CONFIG
        self._on_progress = on_progress

    def plan_answers(self, questions: List[Question], user_config: dict = None) -> Dict[str, Any]:
        config_dict = user_config or {}

        agent = LayoutDesignerAgent(app_config=self._app_config, on_progress=self._on_progress)
        tools = LayoutTools(app_config=self._app_config, config_dict=config_dict)
        tools.register_all(agent)

        return agent.design_layout(questions, user_config=config_dict)
