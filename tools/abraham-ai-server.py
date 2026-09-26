# ABRAHAM G4 — puente local para el asistente IA de Marvel Hub
# Requiere: Python 3.10+ y una variable de entorno OPENAI_API_KEY.
# No pongas la clave en GitHub ni en el navegador.
import json, os
from http.server import BaseHTTPRequestHandler, HTTPServer
from urllib.request import Request, urlopen

HOST="127.0.0.1"; PORT=8780
MODEL=os.environ.get("OPENAI_MODEL","gpt-5.6-luna")
KEY=os.environ.get("OPENAI_API_KEY","")

INSTRUCTIONS="""Eres ABRAHAM AI, asistente creativo integrado en Marvel Hub. Responde en español natural y claro. Ayuda a crear guiones para TikTok, Shorts y Reels sobre Marvel. Sé específico, evita plantillas repetitivas y no inventes noticias o hechos actuales: si algo no está confirmado, dilo. Cuando el usuario pida un video, propone hook, estructura de escenas, narración, visual sugerido, subtítulo y cierre. Mantén frases cortas y ritmo audiovisual. No copies textos protegidos extensos."""

class Handler(BaseHTTPRequestHandler):
    def _json(self, code, data):
        body=json.dumps(data,ensure_ascii=False).encode("utf-8")
        self.send_response(code); self.send_header("Content-Type","application/json; charset=utf-8"); self.send_header("Access-Control-Allow-Origin","*"); self.send_header("Access-Control-Allow-Headers","Content-Type"); self.end_headers(); self.wfile.write(body)
    def do_OPTIONS(self): self._json(204,{})
    def do_GET(self):
        if self.path=="/health": self._json(200,{"ok":True,"configured":bool(KEY),"model":MODEL}); return
        self._json(404,{"error":"Ruta no encontrada"})
    def do_POST(self):
        if self.path!="/chat": self._json(404,{"error":"Ruta no encontrada"}); return
        if not KEY: self._json(503,{"error":"Falta OPENAI_API_KEY"}); return
        try:
            n=int(self.headers.get("Content-Length","0")); data=json.loads(self.rfile.read(n) or b"{}")
            message=str(data.get("message","")).strip()
            if not message: self._json(400,{"error":"Mensaje vacío"}); return
            payload={"model":MODEL,"instructions":INSTRUCTIONS,"input":message}
            req=Request("https://api.openai.com/v1/responses",data=json.dumps(payload).encode(),headers={"Authorization":"Bearer "+KEY,"Content-Type":"application/json"},method="POST")
            with urlopen(req,timeout=90) as res: raw=json.loads(res.read().decode("utf-8"))
            text=raw.get("output_text","")
            if not text:
                parts=[]
                for item in raw.get("output",[]):
                    for c in item.get("content",[]):
                        if c.get("type")=="output_text": parts.append(c.get("text",""))
                text="\n".join(parts)
            self._json(200,{"text":text or "No recibí una respuesta de texto."})
        except Exception as e: self._json(500,{"error":str(e)})

if __name__=="__main__":
    print(f"ABRAHAM AI listo en http://{HOST}:{PORT}")
    HTTPServer((HOST,PORT),Handler).serve_forever()
