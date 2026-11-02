import functools
import http.server
import pathlib
import socket
import sys
import threading

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8123
ROOT = pathlib.Path(__file__).resolve().parent


class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    extensions_map = {**http.server.SimpleHTTPRequestHandler.extensions_map,
                      '.js': 'text/javascript', '.mjs': 'text/javascript', '.woff2': 'font/woff2'}

    def do_GET(self):
        if self.path.startswith('/__log'):
            self.send_response(204)
            self.end_headers()
            return
        super().do_GET()

    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()


class V6Server(http.server.ThreadingHTTPServer):
    address_family = socket.AF_INET6


if __name__ == '__main__':
    handler = functools.partial(NoCacheHandler, directory=str(ROOT))
    servers = [http.server.ThreadingHTTPServer(('127.0.0.1', PORT), handler)]
    try:
        servers.append(V6Server(('::1', PORT), handler))
    except OSError:
        pass
    for s in servers[1:]:
        threading.Thread(target=s.serve_forever, daemon=True).start()
    print(f'Horus-Tempel: http://localhost:{PORT}  (Strg+C beendet)')
    try:
        servers[0].serve_forever()
    except KeyboardInterrupt:
        pass
