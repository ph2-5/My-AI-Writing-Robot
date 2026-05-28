#!/usr/bin/env python3
"""Desktop app embedded HTTP server for AI Writing Robot"""

import argparse
import io
import json
import os
import sys
import uuid
import re
import shutil
import time
import ipaddress
import threading
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import parse_qs, urlparse
from typing import Any, Dict, Optional

for stream_name in ('stdout', 'stderr'):
    stream = getattr(sys, stream_name)
    if hasattr(stream, 'reconfigure'):
        try:
            stream.reconfigure(encoding='utf-8', errors='replace')
        except Exception:
            pass
    elif hasattr(stream, 'buffer'):
        try:
            setattr(sys, stream_name, io.TextIOWrapper(stream.buffer, encoding='utf-8', errors='replace'))
        except Exception:
            pass

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import main as core

UPLOADS_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'uploads')
OUTPUTS_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'outputs')
MAX_BODY_SIZE = 50 * 1024 * 1024

os.makedirs(UPLOADS_DIR, exist_ok=True)
os.makedirs(OUTPUTS_DIR, exist_ok=True)


def api_result(success: bool, error: Optional[str] = None, http_status: int = 200, data: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    result = {'success': success, 'httpStatus': http_status}
    if error is not None:
        result['error'] = error
    if data is not None:
        result['data'] = data
    return result


class RateLimiter:
    def __init__(self, max_requests: int = 60, window_seconds: int = 60):
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self._requests: Dict[str, list] = {}
        self._lock = threading.Lock()

    def is_allowed(self, client_ip: str) -> bool:
        now = time.time()
        with self._lock:
            if client_ip not in self._requests:
                self._requests[client_ip] = []
            self._requests[client_ip] = [t for t in self._requests[client_ip] if now - t < self.window_seconds]
            if len(self._requests[client_ip]) >= self.max_requests:
                return False
            self._requests[client_ip].append(now)
            return True


rate_limiter = RateLimiter(max_requests=60, window_seconds=60)


def validate_file_id(file_id: str) -> bool:
    if not file_id:
        return False
    return bool(re.match(r'^[a-zA-Z0-9\-_.]+$', file_id))


def validate_config(config_obj: dict) -> Optional[str]:
    if config_obj is None:
        return None
    ranges = {
        'paperWidth': (50, 1000),
        'paperHeight': (50, 1000),
        'marginTop': (0, 100),
        'marginBottom': (0, 100),
        'marginLeft': (0, 100),
        'marginRight': (0, 100),
        'fontSizeTitle': (1, 50),
        'fontSizeBody': (1, 50),
        'fontSizeLabel': (1, 50),
        'lineSpacing': (1, 50),
        'questionSpacing': (1, 100),
        'charSpacing': (0, 10),
        'penUpHeight': (0, 50),
        'penDownHeight': (0, 50),
        'travelSpeed': (1, 500),
        'drawSpeed': (1, 200),
        'handDrawnAmplitude': (0, 5),
        'handDrawnCornerExaggeration': (0, 10),
    }
    for key, (min_val, max_val) in ranges.items():
        if key in config_obj:
            val = config_obj[key]
            if not isinstance(val, (int, float)):
                return f'{key} must be a number'
            if val < min_val or val > max_val:
                return f'{key} must be between {min_val} and {max_val}'
    return None


def is_private_ip(hostname: str) -> bool:
    try:
        if hostname in ('localhost', '127.0.0.1', '::1'):
            return True
        ip = ipaddress.ip_address(hostname)
        return ip.is_private or ip.is_loopback or ip.is_reserved
    except ValueError:
        pass
    private_suffixes = ('.local', '.internal', '.localhost', '.lan')
    for suffix in private_suffixes:
        if hostname.endswith(suffix):
            return True
    return False


def check_ssrf(url: str) -> Optional[str]:
    from urllib.parse import urlparse as _urlparse
    parsed = _urlparse(url)
    hostname = parsed.hostname
    if not hostname:
        return 'Invalid API URL'
    if is_private_ip(hostname):
        return f'API URL points to private/reserved address: {hostname}'
    return None


def resolve_api_config(request_data: dict) -> Dict[str, Any]:
    result = {}
    result['providerId'] = request_data.get('providerId', '')
    result['modelId'] = request_data.get('modelId', request_data.get('llmModel', ''))
    result['apiUrl'] = request_data.get('apiUrl', request_data.get('llmBaseUrl', ''))
    result['apiKey'] = request_data.get('apiKey', request_data.get('llmApiKey', ''))
    return result


def call_llm(api_config: Dict[str, Any], messages: list, stream: bool = False, response_format: Optional[dict] = None):
    from openai import OpenAI

    api_url = api_config.get('apiUrl', '')
    api_key = api_config.get('apiKey', '')
    model_id = api_config.get('modelId', '')

    if not api_url:
        return api_result(False, error='LLM API URL is required', http_status=400)
    if not api_key:
        return api_result(False, error='LLM API Key is required', http_status=400)

    ssrf_error = check_ssrf(api_url)
    if ssrf_error:
        return api_result(False, error=ssrf_error, http_status=400)

    try:
        client = OpenAI(base_url=api_url, api_key=api_key)
        kwargs = {
            'model': model_id,
            'messages': messages,
            'stream': stream,
        }
        if response_format:
            kwargs['response_format'] = response_format

        response = client.chat.completions.create(**kwargs)

        if stream:
            return api_result(True, http_status=200, data={'stream': response})

        content = response.choices[0].message.content
        return api_result(True, http_status=200, data={'content': content, 'response': response})
    except Exception as e:
        return api_result(False, error=str(e), http_status=500)


def _handle_health(handler):
    handler._send_json(api_result(True, data={'message': 'ok'}))


def _handle_demo(handler):
    try:
        result = core.demo()
        handler._send_json(api_result(True, data={
            'svgContent': result.get('svgContent', ''),
            'strokeCount': result.get('strokeCount', 0),
            'estimatedTime': result.get('estimatedTime', 0),
            'log': result.get('log', ''),
        }))
    except Exception as e:
        handler._send_json(api_result(False, error=str(e), http_status=500), 500)


def _handle_download(handler):
    parsed = urlparse(handler.path)
    path = parsed.path
    file_id = path.split('/')[-1]

    if not validate_file_id(file_id):
        handler._send_json(api_result(False, error='Invalid file ID', http_status=400), 400)
        return

    files = os.listdir(OUTPUTS_DIR)
    matched = [f for f in files if f.startswith(file_id) and '-config' not in f]
    if not matched:
        handler._send_json(api_result(False, error='File not found', http_status=404), 404)
        return
    file_path = os.path.join(OUTPUTS_DIR, matched[0])
    handler.send_response(200)
    handler.send_header('Content-Type', 'application/octet-stream')
    handler.send_header('Content-Disposition', f'attachment; filename="{matched[0]}"')
    handler.end_headers()
    with open(file_path, 'rb') as f:
        shutil.copyfileobj(f, handler.wfile)


def _handle_upload(handler):
    try:
        content_type = handler.headers.get('Content-Type', '')
        if not content_type.startswith('multipart/form-data'):
            handler._send_json(api_result(False, error='Invalid content type', http_status=400), 400)
            return

        content_length = int(handler.headers.get('Content-Length', 0))
        if content_length > MAX_BODY_SIZE:
            handler._send_json(api_result(False, error='Request body too large', http_status=413), 413)
            return

        boundary = None
        for part in content_type.split(';'):
            part = part.strip()
            if part.startswith('boundary='):
                boundary = part[len('boundary='):]
                break

        if not boundary:
            handler._send_json(api_result(False, error='Missing boundary', http_status=400), 400)
            return

        body = handler.rfile.read(content_length)

        boundary_bytes = boundary.encode('utf-8')
        delimiter = b'--' + boundary_bytes
        parts = body.split(delimiter)

        file_data = None
        original_name = 'unknown.docx'

        for part in parts:
            if part in (b'', b'--\r\n', b'--'):
                continue
            if part.startswith(b'\r\n'):
                part = part[2:]
            header_end = part.find(b'\r\n\r\n')
            if header_end == -1:
                continue
            header_str = part[:header_end].decode('utf-8', errors='replace')
            file_content = part[header_end + 4:]
            if file_content.endswith(b'\r\n'):
                file_content = file_content[:-2]

            if 'name="file"' in header_str or "name='file'" in header_str:
                file_data = file_content
                for h_line in header_str.split('\r\n'):
                    if 'filename=' in h_line:
                        for segment in h_line.split(';'):
                            segment = segment.strip()
                            if segment.startswith('filename='):
                                original_name = segment[len('filename='):].strip('"').strip("'")
                                break

        if file_data is None:
            handler._send_json(api_result(False, error='No file uploaded', http_status=400), 400)
            return

        ext = os.path.splitext(original_name)[1] or '.docx'
        file_id = f"{int(time.time() * 1000)}-{uuid.uuid4().hex[:8]}"
        file_name = f"{file_id}{ext}"
        file_path = os.path.join(UPLOADS_DIR, file_name)

        with open(file_path, 'wb') as f:
            f.write(file_data)

        try:
            result = core.run_parse_only(file_path)
            handler._send_json(api_result(True, data={
                'fileId': file_id,
                'filePath': file_path,
                **result,
            }))
        except Exception as e:
            handler._send_json(api_result(True, data={
                'fileId': file_id,
                'filePath': file_path,
                'questions': [],
                'questionCount': 0,
                'warning': str(e),
            }))
    except Exception as e:
        handler._send_json(api_result(False, error=str(e), http_status=500), 500)


def _handle_generate(handler):
    try:
        content_length = int(handler.headers.get('Content-Length', 0))
        if content_length > MAX_BODY_SIZE:
            handler._send_json(api_result(False, error='Request body too large', http_status=413), 413)
            return

        body = handler.rfile.read(content_length).decode('utf-8')
        data = json.loads(body)

        file_id = data.get('fileId')
        fmt = data.get('format', 'kuixang')
        seed = data.get('seed')
        config_obj = data.get('config')

        if not file_id:
            handler._send_json(api_result(False, error='fileId is required', http_status=400), 400)
            return

        if not validate_file_id(file_id):
            handler._send_json(api_result(False, error='Invalid file ID', http_status=400), 400)
            return

        if config_obj:
            config_error = validate_config(config_obj)
            if config_error:
                handler._send_json(api_result(False, error=config_error, http_status=400), 400)
                return

        uploaded_files = os.listdir(UPLOADS_DIR)
        matched = [f for f in uploaded_files if f.startswith(file_id)]
        if not matched:
            handler._send_json(api_result(False, error='File not found', http_status=404), 404)
            return

        input_path = os.path.join(UPLOADS_DIR, matched[0])
        output_id = f"{int(time.time() * 1000)}-{uuid.uuid4().hex[:8]}"
        ext = 'gcode' if fmt == 'gcode' else 'svg'
        output_path = os.path.join(OUTPUTS_DIR, f"{output_id}.{ext}")

        result = core.run_generate(
            input_path,
            output_format=fmt,
            seed=seed,
            output_path=output_path,
            config_dict=config_obj,
        )

        with open(output_path, 'r', encoding='utf-8') as f:
            svg_content = f.read()

        handler._send_json(api_result(True, data={
            'fileId': output_id,
            'svgContent': svg_content,
            'strokeCount': result.get('strokeCount', 0),
            'estimatedTime': result.get('estimatedTime', 0),
            'questions': result.get('questions', []),
            'log': result.get('log', ''),
            'outputPath': f'/api/homework/download/{output_id}',
        }))
    except Exception as e:
        import traceback
        traceback.print_exc()
        handler._send_json(api_result(False, error=str(e), http_status=500), 500)


def _handle_preview(handler):
    try:
        content_length = int(handler.headers.get('Content-Length', 0))
        if content_length > MAX_BODY_SIZE:
            handler._send_json(api_result(False, error='Request body too large', http_status=413), 413)
            return

        body = handler.rfile.read(content_length).decode('utf-8')
        data = json.loads(body)

        file_id = data.get('fileId')
        config_obj = data.get('config')
        stream = data.get('stream', False)

        if not file_id:
            handler._send_json(api_result(False, error='fileId is required', http_status=400), 400)
            return

        if not validate_file_id(file_id):
            handler._send_json(api_result(False, error='Invalid file ID', http_status=400), 400)
            return

        if config_obj:
            config_error = validate_config(config_obj)
            if config_error:
                handler._send_json(api_result(False, error=config_error, http_status=400), 400)
                return

        uploaded_files = os.listdir(UPLOADS_DIR)
        matched = [f for f in uploaded_files if f.startswith(file_id)]
        if not matched:
            handler._send_json(api_result(False, error='File not found', http_status=404), 404)
            return

        input_path = os.path.join(UPLOADS_DIR, matched[0])

        if not stream:
            result = core.run_preview(input_path, config_dict=config_obj)
            handler._send_json(api_result(True, data={
                'previewSvg': result.get('previewSvg', ''),
                'questionPlans': result.get('questionPlans', []),
                'pageCount': result.get('pageCount', 1),
                'totalSections': result.get('totalSections', 0),
                'questions': result.get('questions', []),
            }))
            return

        import queue
        from threading import Thread

        event_queue = queue.Queue()
        done_event = threading.Event()

        def on_progress(event):
            event_queue.put(('progress', event))

        def run_in_thread():
            try:
                result = core.run_preview(input_path, config_dict=config_obj, on_progress=on_progress)
                event_queue.put(('result', result))
            except Exception as e:
                event_queue.put(('error', str(e)))
            finally:
                done_event.set()

        worker = Thread(target=run_in_thread, daemon=True)
        worker.start()

        handler.send_response(200)
        handler.send_header('Content-Type', 'text/event-stream; charset=utf-8')
        handler.send_header('Cache-Control', 'no-cache')
        handler.send_header('Access-Control-Allow-Origin', '*')
        handler.end_headers()

        while not done_event.is_set() or not event_queue.empty():
            try:
                event_type, event_data = event_queue.get(timeout=0.5)
                if event_type == 'progress':
                    data_str = json.dumps(event_data, ensure_ascii=False)
                    handler.wfile.write(f"event: progress\ndata: {data_str}\n\n".encode('utf-8'))
                    handler.wfile.flush()
                elif event_type == 'result':
                    result_data = json.dumps(api_result(True, data={
                        'previewSvg': event_data.get('previewSvg', ''),
                        'questionPlans': event_data.get('questionPlans', []),
                        'pageCount': event_data.get('pageCount', 1),
                        'totalSections': event_data.get('totalSections', 0),
                        'questions': event_data.get('questions', []),
                    }), ensure_ascii=False)
                    handler.wfile.write(f"event: result\ndata: {result_data}\n\n".encode('utf-8'))
                    handler.wfile.flush()
                elif event_type == 'error':
                    error_data = json.dumps(api_result(False, error=event_data, http_status=500), ensure_ascii=False)
                    handler.wfile.write(f"event: result\ndata: {error_data}\n\n".encode('utf-8'))
                    handler.wfile.flush()
            except queue.Empty:
                continue

    except Exception as e:
        import traceback
        traceback.print_exc()
        try:
            handler._send_json(api_result(False, error=str(e), http_status=500), 500)
        except:
            pass


def _handle_llm_call(handler):
    try:
        content_length = int(handler.headers.get('Content-Length', 0))
        if content_length > MAX_BODY_SIZE:
            handler._send_json(api_result(False, error='Request body too large', http_status=413), 413)
            return

        body = handler.rfile.read(content_length).decode('utf-8')
        data = json.loads(body)

        api_config = resolve_api_config(data)
        messages = data.get('messages', [])
        stream = data.get('stream', False)
        response_format = data.get('response_format')

        if not messages:
            handler._send_json(api_result(False, error='messages is required', http_status=400), 400)
            return

        result = call_llm(api_config, messages, stream=stream, response_format=response_format)

        if not result['success']:
            handler._send_json(result, result['httpStatus'])
            return

        if stream and 'data' in result and 'stream' in result['data']:
            handler.send_response(200)
            handler.send_header('Content-Type', 'text/event-stream; charset=utf-8')
            handler.send_header('Cache-Control', 'no-cache')
            handler.send_header('Access-Control-Allow-Origin', '*')
            handler.end_headers()
            stream_resp = result['data']['stream']
            for chunk in stream_resp:
                if chunk.choices and chunk.choices[0].delta.content:
                    payload = f"data: {json.dumps({'content': chunk.choices[0].delta.content}, ensure_ascii=False)}\n\n"
                    handler.wfile.write(payload.encode('utf-8'))
            handler.wfile.write(b"data: [DONE]\n\n")
            return

        content = result['data']['content']
        try:
            parsed = json.loads(content)
            handler._send_json(api_result(True, data={'content': parsed}))
        except (json.JSONDecodeError, TypeError):
            handler._send_json(api_result(True, data={'content': content}))
    except Exception as e:
        handler._send_json(api_result(False, error=str(e), http_status=500), 500)


routes = {
    '/api/health': {'handler': _handle_health, 'methods': ['GET']},
    '/api/homework/demo': {'handler': _handle_demo, 'methods': ['GET']},
    '/api/homework/download/': {'handler': _handle_download, 'methods': ['GET'], 'prefix': True},
    '/api/homework/upload': {'handler': _handle_upload, 'methods': ['POST']},
    '/api/homework/generate': {'handler': _handle_generate, 'methods': ['POST']},
    '/api/homework/preview': {'handler': _handle_preview, 'methods': ['POST']},
    '/api/llm/call': {'handler': _handle_llm_call, 'methods': ['POST']},
}


class APIHandler(BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        print(f"[Server] {self.address_string()} - {format % args}")

    def _send_json(self, data, status=200):
        self.send_response(status)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
        self.wfile.write(json.dumps(data, ensure_ascii=False).encode('utf-8'))

    def _send_error(self, message, status=500):
        self._send_json(api_result(False, error=message, http_status=status), status)

    def _check_rate_limit(self):
        client_ip = self.client_address[0]
        if not rate_limiter.is_allowed(client_ip):
            self._send_json(api_result(False, error='Rate limit exceeded', http_status=429), 429)
            return False
        return True

    def _resolve_route(self, method):
        parsed = urlparse(self.path)
        path = parsed.path

        for route_path, route_info in routes.items():
            if method not in route_info['methods']:
                continue
            if route_info.get('prefix'):
                if path.startswith(route_path):
                    return route_info['handler']
            else:
                if path == route_path:
                    return route_info['handler']
        return None

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def do_GET(self):
        if not self._check_rate_limit():
            return
        handler_fn = self._resolve_route('GET')
        if handler_fn:
            handler_fn(self)
        else:
            self._send_error('API not found', 404)

    def do_POST(self):
        if not self._check_rate_limit():
            return
        handler_fn = self._resolve_route('POST')
        if handler_fn:
            handler_fn(self)
        else:
            self._send_error('API not found', 404)


def run_server(port=0):
    if port == 0:
        port = int(os.environ.get('PORT', 3002))
    server = HTTPServer(('127.0.0.1', port), APIHandler)
    actual_port = server.server_address[1]
    print(f"Server running on port {actual_port}")
    sys.stdout.flush()
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--port', type=int, default=0)
    args = parser.parse_args()
    run_server(args.port)
