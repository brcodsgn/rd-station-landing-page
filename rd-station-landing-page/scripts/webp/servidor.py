"""Servidor local do conversor WebP (sem cwebp/ImageMagick: usa o encoder do próprio Chrome).

Uso:
  1. Coloque as imagens originais em <pasta>/orig/ (qualquer nome, com ou sem extensão)
     e crie <pasta>/lista.json:  {"arquivo": [largura_max_px, limite_kb], ...}
     Regra prática: largura = 2x a maior largura exibida; limite 100 KB (fundos até ~150).
  2. python3 servidor.py <pasta>         (porta 4322)
  3. No Chrome, abra http://127.0.0.1:4322/converter.html e espere o título virar "pronto".
     Os .webp são gravados em <pasta>/webp/ e o resumo em <pasta>/webp/resumo.json.
"""
import http.server, os, sys, json, urllib.parse, shutil

PASTA = os.path.abspath(sys.argv[1] if len(sys.argv) > 1 else '.')
AQUI = os.path.dirname(os.path.abspath(__file__))


class H(http.server.SimpleHTTPRequestHandler):
    def __init__(s, *a, **k):
        super().__init__(*a, directory=PASTA, **k)

    def do_GET(s):
        if s.path.split('?')[0] == '/converter.html':
            s.send_response(200); s.send_header('Content-Type', 'text/html; charset=utf-8'); s.end_headers()
            with open(os.path.join(AQUI, 'converter.html'), 'rb') as f: shutil.copyfileobj(f, s.wfile)
            return
        return super().do_GET()

    def do_POST(s):
        q = urllib.parse.parse_qs(urllib.parse.urlparse(s.path).query)
        nome = os.path.basename(q['k'][0])
        data = s.rfile.read(int(s.headers['Content-Length']))
        os.makedirs(os.path.join(PASTA, 'webp'), exist_ok=True)
        destino = os.path.join(PASTA, 'webp', nome if nome.endswith('.json') else os.path.splitext(nome)[0] + '.webp')
        with open(destino, 'wb') as f: f.write(data)
        s.send_response(200); s.end_headers(); s.wfile.write(b'ok')

    def log_message(s, *a):
        pass


print('Conversor em http://127.0.0.1:4322/converter.html  (pasta:', PASTA + ')')
http.server.ThreadingHTTPServer(('127.0.0.1', 4322), H).serve_forever()
