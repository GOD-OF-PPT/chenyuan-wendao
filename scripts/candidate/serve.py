"""Serve only the packaged web directory on loopback; no source/evidence directory exposure."""
from pathlib import Path
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlsplit
import argparse
from functools import lru_cache
from io import BytesIO
from email.utils import parsedate_to_datetime
from datetime import timezone
import gzip

TEXT_FILES = {'.html', '.htm', '.js', '.css', '.json', '.svg'}


def encoding_preferences(value):
    weights = {}
    for part in value.split(','):
        coding, *parameters = part.strip().lower().split(';')
        coding = coding.strip()
        if not coding:
            continue
        quality = 1.0
        for parameter in parameters:
            name, separator, number = parameter.strip().partition('=')
            if separator and name.strip() == 'q':
                try:
                    quality = float(number)
                    if not 0 <= quality <= 1:
                        quality = 0.0
                except ValueError:
                    quality = 0.0
        weights[coding] = quality
    compressed = weights.get('gzip', weights.get('*', 0.0))
    identity = weights.get('identity', 0.0 if weights.get('*') == 0 else 1.0)
    return compressed > 0 and ('identity' not in weights or compressed >= identity), identity > 0


@lru_cache(maxsize=64)
def compressed_file(filename, modified_ns, size):
    # Metadata participates in the key; bytes are immutable and never become Game state.
    return gzip.compress(Path(filename).read_bytes(), compresslevel=6, mtime=0)


def serve(directory, port=8000, base='/'):
    directory = Path(directory).resolve()
    if not (directory / 'index.html').is_file() or not base.startswith('/') or not base.endswith('/') or '..' in base or any(c in base for c in ('?', '#', '\\', '\r', '\n')):
        raise ValueError('Invalid web root or base path')

    # Prepare only text representations on the server. No client requests or artwork preload.
    for file in directory.rglob('*'):
        if file.suffix.lower() in TEXT_FILES and not file.is_symlink() and file.is_file():
            try:
                stat = file.stat()
                compressed_file(str(file), stat.st_mtime_ns, stat.st_size)
            except OSError:
                continue

    class Handler(SimpleHTTPRequestHandler):
        def __init__(self, *args, **kwargs):
            super().__init__(*args, directory=str(directory), **kwargs)

        def do_GET(self):
            url = urlsplit(self.path)
            if not url.path.startswith(base):
                self.send_error(404)
                return
            self.path = '/' + url.path[len(base):] + ('?' + url.query if url.query else '')
            super().do_GET()

        def do_HEAD(self):
            url = urlsplit(self.path)
            if not url.path.startswith(base):
                self.send_error(404)
                return
            self.path = '/' + url.path[len(base):] + ('?' + url.query if url.query else '')
            super().do_HEAD()

        def list_directory(self, path):
            self.send_error(404)
            return None

        def send_head(self):
            self._vary_encoding = False
            target = Path(self.translate_path(self.path)).resolve()
            if not target.is_relative_to(directory):
                self.send_error(404)
                return None
            if target.is_file() and urlsplit(self.path).path.endswith('/'):
                return super().send_head()
            if target.is_dir():
                if not urlsplit(self.path).path.endswith('/'):
                    return super().send_head()
                for name in ('index.html', 'index.htm'):
                    index = target / name
                    if index.is_file():
                        target = index.resolve()
                        break
                else:
                    return self.list_directory(str(target))
                if not target.is_relative_to(directory):
                    self.send_error(404)
                    return None
            if not target.is_file():
                return super().send_head()
            self._vary_encoding = target.suffix.lower() in TEXT_FILES
            accepts_gzip, accepts_identity = encoding_preferences(','.join(self.headers.get_all('Accept-Encoding', [])))
            if self._vary_encoding and accepts_gzip:
                try:
                    stat = target.stat()
                    data = compressed_file(str(target), stat.st_mtime_ns, stat.st_size)
                except OSError:
                    return super().send_head()
                if len(data) < stat.st_size or not accepts_identity:
                    since = self.headers.get('If-Modified-Since')
                    if since and not self.headers.get('If-None-Match'):
                        try:
                            date = parsedate_to_datetime(since)
                            if date.tzinfo is None:
                                date = date.replace(tzinfo=timezone.utc)
                            if int(stat.st_mtime) <= date.timestamp():
                                self.send_response(304)
                                self.end_headers()
                                return None
                        except (TypeError, ValueError, OverflowError):
                            pass
                    self.send_response(200)
                    self.send_header('Content-Type', self.guess_type(str(target)))
                    self.send_header('Content-Encoding', 'gzip')
                    self.send_header('Content-Length', str(len(data)))
                    self.send_header('Last-Modified', self.date_time_string(stat.st_mtime))
                    self.end_headers()
                    return BytesIO(data)
            if not accepts_identity:
                self.send_error(406, 'No acceptable representation')
                return None
            return super().send_head()

        def end_headers(self):
            self.send_header('Cache-Control', 'no-store')
            if getattr(self, '_vary_encoding', False):
                self.send_header('Vary', 'Accept-Encoding')
            super().end_headers()

        def send_header(self, keyword, value):
            if keyword.lower() == 'location' and value.startswith('/'):
                value = base.rstrip('/') + '/' + value.lstrip('/')
            super().send_header(keyword, value)

    server = ThreadingHTTPServer(('127.0.0.1', port), Handler)
    print(f'http://127.0.0.1:{server.server_port}{base}', flush=True)
    try:
        server.serve_forever()
    finally:
        server.server_close()


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--port', type=int, default=8000)
    parser.add_argument('--base', default='/')
    parser.add_argument('--directory', default=str(Path(__file__).resolve().parent / 'web'))
    args = parser.parse_args()
    serve(args.directory, args.port, args.base)
