import threading
import time
import traceback
from typing import Optional, Callable

try:
    import serial
    import serial.tools.list_ports
    HAS_SERIAL = True
except ImportError:
    HAS_SERIAL = False


class RobotConnection:
    _instance = None
    _lock = threading.Lock()

    def __init__(self):
        self._serial: Optional[serial.Serial] = None
        self._port: Optional[str] = None
        self._connected = False
        self._running = False
        self._reader_thread: Optional[threading.Thread] = None
        self._on_status_change: Optional[Callable] = None
        self._last_response = ''
        self._response_lock = threading.Lock()
        self._baudrate = 115200

    @classmethod
    def get_instance(cls):
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = cls()
        return cls._instance

    def set_status_callback(self, callback: Callable):
        self._on_status_change = callback

    @staticmethod
    def list_ports():
        if not HAS_SERIAL:
            return []
        ports = serial.tools.list_ports.comports()
        result = []
        for p in sorted(ports, key=lambda x: x.device):
            result.append({
                'port': p.device,
                'description': p.description,
                'hwid': p.hwid,
            })
        return result

    def connect(self, port: str, baudrate: int = 115200) -> dict:
        if not HAS_SERIAL:
            return {'success': False, 'error': 'pyserial未安装，无法连接机器人'}

        if self._connected:
            self.disconnect()

        try:
            self._serial = serial.Serial(port, baudrate, timeout=1)
            self._port = port
            self._baudrate = baudrate
            time.sleep(1.5)

            self._connected = True
            self._running = True

            self._reader_thread = threading.Thread(target=self._reader_loop, daemon=True)
            self._reader_thread.start()

            self._notify_status()

            return {
                'success': True,
                'port': port,
                'baudrate': baudrate,
            }
        except serial.SerialException as e:
            self._connected = False
            self._serial = None
            return {'success': False, 'error': f'连接失败: {str(e)}'}
        except Exception as e:
            self._connected = False
            self._serial = None
            return {'success': False, 'error': f'连接异常: {str(e)}'}

    def disconnect(self) -> dict:
        self._running = False
        self._connected = False

        if self._reader_thread and self._reader_thread.is_alive():
            self._reader_thread.join(timeout=2)

        if self._serial and self._serial.is_open:
            try:
                self._serial.close()
            except Exception:
                pass

        self._serial = None
        self._port = None
        self._notify_status()
        return {'success': True}

    def _reader_loop(self):
        while self._running and self._serial and self._serial.is_open:
            try:
                if self._serial.in_waiting > 0:
                    data = self._serial.readline().decode('utf-8', errors='replace').strip()
                    if data:
                        with self._response_lock:
                            self._last_response = data
                else:
                    time.sleep(0.05)
            except serial.SerialException:
                self._connected = False
                self._running = False
                self._notify_status()
                break
            except Exception:
                time.sleep(0.1)

    def send_command(self, command: str, wait_response: bool = False, timeout: float = 5.0) -> dict:
        if not self._connected or not self._serial or not self._serial.is_open:
            return {'success': False, 'error': '机器人未连接'}

        try:
            with self._response_lock:
                self._last_response = ''

            self._serial.write((command + '\n').encode('utf-8'))
            self._serial.flush()

            if wait_response:
                start = time.time()
                while time.time() - start < timeout:
                    with self._response_lock:
                        if self._last_response:
                            return {'success': True, 'response': self._last_response}
                    time.sleep(0.05)
                return {'success': False, 'error': '等待响应超时'}

            return {'success': True}
        except serial.SerialException as e:
            self._connected = False
            self._running = False
            self._notify_status()
            return {'success': False, 'error': f'发送失败: {str(e)}'}

    def send_gcode(self, gcode_lines: list, progress_callback: Optional[Callable] = None) -> dict:
        if not self._connected or not self._serial or not self._serial.is_open:
            return {'success': False, 'error': '机器人未连接'}

        total = len(gcode_lines)
        sent = 0

        for line in gcode_lines:
            line = line.strip()
            if not line or line.startswith(';'):
                sent += 1
                continue

            result = self.send_command(line, wait_response=True, timeout=10.0)
            if not result['success']:
                return {'success': False, 'error': f'第{sent+1}行发送失败: {result.get("error", "")}', 'sent': sent, 'total': total}

            sent += 1
            if progress_callback:
                progress_callback(sent, total)

        return {'success': True, 'sent': sent, 'total': total}

    def get_status(self) -> dict:
        return {
            'connected': self._connected,
            'port': self._port,
            'baudrate': self._baudrate,
            'pyserialAvailable': HAS_SERIAL,
        }

    def _notify_status(self):
        if self._on_status_change:
            try:
                self._on_status_change(self.get_status())
            except Exception:
                pass
