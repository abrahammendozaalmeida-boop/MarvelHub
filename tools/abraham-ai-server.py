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

VIDEO_SCHEMA={
    "type":"object",
    "properties":{
        "title":{"type":"string"},
        "hook":{"type":"string"},
        "closing":{"type":"string"},
        "scenes":{
            "type":"array",
            "items":{
                "type":"object",
                "properties":{
                    "duration":{"type":"number"},
                    "narration":{"type":"string"},
                    "visual":{"type":"string"},
                    "subtitle":{"type":"string"},
                    "audio":{"type":"string"}
                },
                "required":["duration","narration","visual","subtitle","audio"],
                "additionalProperties":False
            }
        }
    },
    "required":["title","hook","closing","scenes"],
    "additionalProperties":False
}

class Handler(BaseHTTPRequestHandler):
    def _json(self, code, data):
        body=json.dumps(data,ensure_ascii=False).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type","application/json; charset=utf-8")
        self.send_header("Access-Control-Allow-Origin","*")
        self.send_header("Access-Control-Allow-Headers","Content-Type")
        self.send_header("Access-Control-Allow-Methods","GET,POST,OPTIONS")
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self):
        self._json(204,{})

    def do_GET(self):
        if self.path=="/health":
            self._json(200,{"ok":True,"configured":bool(KEY),"model":MODEL})
            return
        self._json(404,{"error":"Ruta no encontrada"})

    def _call_openai(self,payload):
        req=Request(
            "https://api.openai.com/v1/responses",
            data=json.dumps(payload).encode("utf-8"),
            headers={"Authorization":"Bearer "+KEY,"Content-Type":"application/json"},
            method="POST"
        )
        with urlopen(req,timeout=90) as res:
            return json.loads(res.read().decode("utf-8"))

    def _text(self,raw):
        text=raw.get("output_text","")
        if text:
            return text
        parts=[]
        for item in raw.get("output",[]):
            for c in item.get("content",[]):
                if c.get("type")=="output_text":
                    parts.append(c.get("text",""))
        return "\n".join(parts)

    def do_POST(self):
        if self.path not in ("/chat","/generate-video"):
            self._json(404,{"error":"Ruta no encontrada"})
            return
        if not KEY:
            self._json(503,{"error":"Falta OPENAI_API_KEY"})
            return
        try:
            n=int(self.headers.get("Content-Length","0"))
            data=json.loads(self.rfile.read(n) or b"{}")

            if self.path=="/chat":
                message=str(data.get("message","")).strip()
                if not message:
                    self._json(400,{"error":"Mensaje vacío"})
                    return
                context=data.get("context") or {}
                context_text=json.dumps(context,ensure_ascii=False)[:6000]
                payload={
                    "model":MODEL,
                    "instructions":INSTRUCTIONS,
                    "input":message+"\n\nContexto actual de Marvel Hub:\n"+context_text
                }
                raw=self._call_openai(payload)
                self._json(200,{"text":self._text(raw) or "No recibí una respuesta de texto."})
                return

            tema=str(data.get("tema","")).strip()
            duracion=int(data.get("duracion",45))
            estilo=str(data.get("estilo","curiosidades")).strip()
            if not tema:
                self._json(400,{"error":"Falta el tema"})
                return
            duracion=max(15,min(180,duracion))
            prompt=f"""Crea el plan completo de un video vertical para Marvel Hub.
Tema: {tema}
Duración total aproximada: {duracion} segundos.
Estilo: {estilo}.

Devuelve únicamente JSON válido siguiendo el esquema solicitado.
Crea entre 5 y 8 escenas. La suma de las duraciones debe ser aproximadamente {duracion} segundos.
La primera escena debe funcionar como hook. La última debe cerrar e invitar a comentar sin sonar repetitiva.
Cada escena necesita narración breve y natural, una descripción visual concreta para buscar imágenes o clips, un subtítulo corto y una indicación de audio.
No inventes datos actuales ni afirmaciones dudosas. Si el tema contiene una afirmación no verificable, formula la escena como teoría o posibilidad."""
            payload={
                "model":MODEL,
                "instructions":INSTRUCTIONS,
                "input":prompt,
                "text":{
                    "format":{
                        "type":"json_schema",
                        "name":"video_plan",
                        "strict":True,
                        "schema":VIDEO_SCHEMA
                    }
                }
            }
            raw=self._call_openai(payload)
            text=self._text(raw)
            plan=json.loads(text)
            self._json(200,{"plan":plan})
        except Exception as e:
            self._json(500,{"error":str(e)})

if __name__=="__main__":
    print(f"ABRAHAM AI listo en http://{HOST}:{PORT}")
    HTTPServer((HOST,PORT),Handler).serve_forever()
