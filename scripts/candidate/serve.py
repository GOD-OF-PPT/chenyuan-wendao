"""Serve only the packaged web directory on loopback; no source/evidence directory exposure."""
from pathlib import Path
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlsplit
import argparse


def serve(directory, port=8000, base='/'):
    directory = Path(directory).resolve()
    if not (directory / 'index.html').is_file() or not base.startswith('/') or not base.endswith('/') or '..' in base or any(c in base for c in ('?', '#', '\\', '\r', '\n')):
        raise ValueError('Invalid web root or base path')

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

        def end_headers(self):
            self.send_header('Cache-Control', 'no-store')
            super().end_headers()

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
