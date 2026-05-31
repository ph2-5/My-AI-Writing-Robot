import sys
import os
from datetime import datetime
from threading import Lock


class Logger:
    DEBUG = 'DEBUG'
    INFO = 'INFO'
    WARN = 'WARN'
    ERROR = 'ERROR'

    _level_order = {DEBUG: 0, INFO: 1, WARN: 2, ERROR: 3}

    def __init__(self, module: str = 'root', level: str = INFO, log_file: str = None):
        self.module = module
        self.level = level
        self.log_file = log_file
        self._lock = Lock()
        self._file_handle = None
        if log_file:
            os.makedirs(os.path.dirname(log_file) if os.path.dirname(log_file) else '.', exist_ok=True)
            self._file_handle = open(log_file, 'a', encoding='utf-8')

    def _should_log(self, level: str) -> bool:
        return self._level_order.get(level, 0) >= self._level_order.get(self.level, 0)

    def _format(self, level: str, message: str) -> str:
        timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        return f'[{timestamp}] [{level}] [{self.module}] {message}'

    def _write(self, level: str, message: str):
        if not self._should_log(level):
            return
        formatted = self._format(level, message)
        with self._lock:
            sys.stdout.write(formatted + '\n')
            sys.stdout.flush()
            if self._file_handle:
                self._file_handle.write(formatted + '\n')
                self._file_handle.flush()

    def debug(self, message: str):
        self._write(self.DEBUG, message)

    def info(self, message: str):
        self._write(self.INFO, message)

    def warn(self, message: str):
        self._write(self.WARN, message)

    def warning(self, message: str):
        self._write(self.WARN, message)

    def error(self, message: str):
        self._write(self.ERROR, message)

    def close(self):
        if self._file_handle:
            self._file_handle.close()
            self._file_handle = None


def get_logger(module: str = 'root', level: str = Logger.INFO, log_file: str = None) -> Logger:
    return Logger(module=module, level=level, log_file=log_file)
