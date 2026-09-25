"""ABRAHAM G4 — servidor local gratuito de voz.
Instalación:
  py -m pip install pyttsx3
Ejecución:
  py voice-server.py

Escucha en http://127.0.0.1:8765/health
Solo acepta conexiones locales.
"""

import base64
import json
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

try:
    import pyttsx3
except ImportError:
    pyttsx3 = None

HOST = "127.0.0.1"
PORT = 8765

class Handler(BaseHTTPRequestHandler):
    def _send(self, code, payload, content_type="application/json; charset=utf-8"):
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def do_GET(self):
        if self.path == "/health":
            self._send(200, {
                "ok": pyttsx3 is not None,
                "engine": "pyttsx3",
                "message": "Motor local disponible" if pyttsx3 else "Instala pyttsx3"
            })
            return
        self._send(404, {"error": "Ruta no encontrada"})

    def do_POST(self):
        if self.path != "/synthesize":
            self._send(404, {"error": "Ruta no encontrada"})
            return
        if pyttsx3 is None:
            self._send(503, {"error": "pyttsx3 no está instalado"})
            return

        try:
            length = int(self.headers.get("Content-Length", "0"))
            data = json.loads(self.rfile.read(length).decode("utf-8"))
            text = str(data.get("text", "")).strip()
            rate = float(data.get("rate", 1))
            if not text:
                self._send(400, {"error": "Texto vacío"})
                return

            engine = pyttsx3.init()
            base_rate = engine.getProperty("rate") or 180
            engine.setProperty("rate", max(90, min(300, int(base_rate * rate))))

            voice_request = str(data.get("voice", "auto"))
            if voice_request and voice_request != "auto":
                voices = engine.getProperty("voices") or []
                try:
                    idx = int(voice_request)
                    if 0 <= idx < len(voices):
                        engine.setProperty("voice", voices[idx].id)
                except ValueError:
                    pass

            output_path = __import__("tempfile").NamedTemporaryFile(suffix=".wav", delete=False).name
            engine.save_to_file(text, output_path)
            engine.runAndWait()
            engine.stop()

            with open(output_path, "rb") as audio_file:
                audio = base64.b64encode(audio_file.read()).decode("ascii")

            try:
                __import__("os").remove(output_path)
            except OSError:
                pass

            self._send(200, {"audio": "data:audio/wav;base64," + audio})
        except Exception as exc:
            self._send(500, {"error": str(exc)})

    def log_message(self, format, *args):
        return

if __name__ == "__main__":
    print("ABRAHAM G4 — Voice Server")
    print("Local: http://127.0.0.1:8765")
    print("Presiona Ctrl+C para detener.")
    ThreadingHTTPServer((HOST, PORT), Handler).serve_forever()
