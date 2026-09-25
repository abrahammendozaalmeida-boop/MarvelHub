import json, os, subprocess, tempfile, urllib.request
from http.server import BaseHTTPRequestHandler, HTTPServer

HOST, PORT = "127.0.0.1", 8766
ROOT = os.path.dirname(os.path.abspath(__file__))

def run(cmd):
    return subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)

def render(project):
    scenes = project.get("escenas") or []
    resources = project.get("recursos") or []
    if not scenes:
        raise ValueError("El proyecto no tiene escenas.")

    work = tempfile.mkdtemp(prefix="marvelhub_render_")
    concat = os.path.join(work, "input.txt")
    files = []

    for i, scene in enumerate(scenes):
        duration = max(1, float(scene.get("duracion", 5)))
        resource = resources[i % len(resources)] if resources else {}
        url = resource.get("url")
        image = os.path.join(work, f"scene_{i:03d}.jpg")

        if url:
            try:
                urllib.request.urlretrieve(url, image)
            except Exception:
                url = None

        if not url:
            fallback = os.path.join(work, f"fallback_{i:03d}.png")
            cmd = ["ffmpeg", "-y", "-f", "lavfi", "-i", "color=c=black:s=1080x1920:r=30", "-frames:v", "1", fallback]
            result = run(cmd)
            if result.returncode != 0:
                raise RuntimeError(result.stderr[-1200:])
            image = fallback

        files.append((image, duration))

    with open(concat, "w", encoding="utf-8") as f:
        for image, duration in files:
            f.write("file '" + image.replace("'", "'\\''") + "'\n")
            f.write(f"duration {duration}\n")
        f.write("file '" + files[-1][0].replace("'", "'\\''") + "'\n")

    output = os.path.join(work, "ABRAHAM_G4_MarvelHub.mp4")
    vf = "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,format=yuv420p"
    cmd = ["ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", concat, "-vf", vf, "-r", "30", "-c:v", "libx264", "-preset", "veryfast", "-crf", "23", "-an", output]
    result = run(cmd)
    if result.returncode != 0:
        raise RuntimeError(result.stderr[-2000:])

    with open(output, "rb") as f:
        data = f.read()

    import base64
    return {"filename": os.path.basename(output), "mime": "video/mp4", "data": base64.b64encode(data).decode("ascii")}

class Handler(BaseHTTPRequestHandler):
    def send_json(self, status, payload):
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Access-Control-Allow-Methods", "POST, OPTIONS")
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self):
        self.send_json(204, {})

    def do_GET(self):
        if self.path == "/health":
            self.send_json(200, {"ok": True, "service": "ABRAHAM G4 MP4 Renderer", "ffmpeg": True})
        else:
            self.send_json(404, {"ok": False, "error": "Not found"})

    def do_POST(self):
        if self.path != "/render":
            self.send_json(404, {"ok": False, "error": "Not found"})
            return
        try:
            length = int(self.headers.get("Content-Length", "0"))
            project = json.loads(self.rfile.read(length).decode("utf-8"))
            self.send_json(200, {"ok": True, "result": render(project)})
        except FileNotFoundError:
            self.send_json(500, {"ok": False, "error": "FFmpeg no está instalado o no está en PATH."})
        except Exception as exc:
            self.send_json(500, {"ok": False, "error": str(exc)})

if __name__ == "__main__":
    print(f"ABRAHAM G4 MP4 Renderer: http://{HOST}:{PORT}")
    HTTPServer((HOST, PORT), Handler).serve_forever()
