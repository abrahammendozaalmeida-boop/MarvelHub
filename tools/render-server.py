import base64, json, os, shutil, subprocess, tempfile, urllib.request
from http.server import BaseHTTPRequestHandler, HTTPServer

HOST, PORT = "127.0.0.1", 8766
ROOT = os.path.dirname(os.path.abspath(__file__))
VOICE_SERVER = "http://127.0.0.1:8765"

def run(cmd):
    return subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)

def request_json(url, payload):
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(url, data=data, headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=180) as response:
        return json.loads(response.read().decode("utf-8"))

def make_voice(project, path):
    text = " ".join(str(s.get("narracion", "")) for s in project.get("escenas", []))
    if not text.strip():
        return False
    try:
        data = request_json(VOICE_SERVER + "/synthesize", {
            "text": text,
            "rate": float((project.get("voz") or {}).get("velocidad", 1)),
            "voice": "auto"
        })
        audio = data.get("audio", "")
        if not audio.startswith("data:"):
            return False
        raw = base64.b64decode(audio.split(",", 1)[1])
        with open(path, "wb") as f:
            f.write(raw)
        return True
    except Exception:
        return False

def make_music(project, path):
    audio = project.get("audio") or {}
    tipo = audio.get("musica", "energetica")
    if tipo == "ninguna":
        return False
    volumen = max(0.02, min(0.35, float(audio.get("volumen", 0.25)) * 0.45))
    freq = {"ambiental": 220, "energetica": 261.63, "epica": 196, "suspenso": 164.81}.get(tipo, 261.63)
    duration = max(1, float(project.get("duracion", 45)))
    cmd = [
        "ffmpeg", "-y", "-f", "lavfi",
        "-i", f"sine=frequency={freq}:sample_rate=44100:duration={duration}",
        "-af", f"volume={volumen},afade=t=in:st=0:d=1,afade=t=out:st={max(0.1,duration-1)}:d=1",
        "-c:a", "pcm_s16le", path
    ]
    result = run(cmd)
    if result.returncode != 0:
        return False
    return True

def make_sfx(project, path):
    audio = project.get("audio") or {}
    if audio.get("sfx", True) is False:
        return False
    duration = max(1, float(project.get("duracion", 45)))
    escenas = project.get("escenas") or []
    if len(escenas) < 2:
        return False
    # Click/beep at scene transitions using a time expression.
    expr = "if(gt(mod(t,5),0),0,0)"
    # Generate a quiet short transition sound and repeat it with adelay/amix.
    inputs = []
    filters = []
    cursor = 0.0
    for i, scene in enumerate(escenas[:-1]):
        cursor += max(0.5, float(scene.get("duracion", 5)))
        if cursor >= duration:
            break
        inputs.append(f"sine=frequency={720 + (i % 3) * 110}:duration=0.12:sample_rate=44100")
    if not inputs:
        return False
    cmd = ["ffmpeg", "-y"]
    for src in inputs:
        cmd += ["-f", "lavfi", "-i", src]
    delays = []
    cursor = 0.0
    for i, scene in enumerate(escenas[:-1]):
        cursor += max(0.5, float(scene.get("duracion", 5)))
        if cursor >= duration:
            break
        delays.append(int(cursor * 1000))
    labels = []
    for i, delay in enumerate(delays):
        labels.append(f"[{i}:a]adelay={delay}:all=1,volume=0.10[a{i}]")
    mix = "".join(f"[a{i}]" for i in range(len(labels))) + f"amix=inputs={len(labels)}:duration=longest:dropout_transition=0[sfx]"
    filters.extend(labels)
    filters.append(mix)
    cmd += ["-filter_complex", ";".join(filters), "-map", "[sfx]", "-t", str(duration), "-c:a", "pcm_s16le", path]
    result = run(cmd)
    return result.returncode == 0

def make_srt(project, path):
    scenes = project.get("escenas") or []
    cursor = 0.0
    with open(path, "w", encoding="utf-8") as f:
        for i, scene in enumerate(scenes):
            start = cursor
            end = cursor + max(0.5, float(scene.get("duracion", 5)))
            cursor = end
            text = str(scene.get("subtitulo") or scene.get("narracion") or "").replace("-->", "→").replace("\n", " ").strip()
            def ts(seconds):
                ms = int(round(seconds * 1000))
                h, rem = divmod(ms, 3600000)
                m, rem = divmod(rem, 60000)
                s, ms = divmod(rem, 1000)
                return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"
            f.write(f"{i+1}\n{ts(start)} --> {ts(end)}\n{text}\n\n")

def ffmpeg_filter_path(path):
    return path.replace("\\", "/").replace(":", "\:")

def render(project):
    scenes = project.get("escenas") or []
    resources = project.get("recursos") or []
    if not scenes:
        raise ValueError("El proyecto no tiene escenas.")

    work = tempfile.mkdtemp(prefix="marvelhub_render_")
    try:
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
                result = run(["ffmpeg", "-y", "-f", "lavfi", "-i", "color=c=black:s=1080x1920:r=30", "-frames:v", "1", fallback])
                if result.returncode != 0:
                    raise RuntimeError(result.stderr[-1200:])
                image = fallback
            files.append((image, duration))

        with open(concat, "w", encoding="utf-8") as f:
            for image, duration in files:
                f.write("file '" + image.replace("'", "'\\''") + "'\n")
                f.write(f"duration {duration}\n")
            f.write("file '" + files[-1][0].replace("'", "'\\''") + "'\n")

        srt = os.path.join(work, "subtitulos.srt")
        make_srt(project, srt)

        voice = os.path.join(work, "voz.wav")
        has_voice = make_voice(project, voice)

        music = os.path.join(work, "musica.wav")
        has_music = make_music(project, music)

        sfx = os.path.join(work, "sfx.wav")
        has_sfx = make_sfx(project, sfx)

        output = os.path.join(work, "ABRAHAM_G4_MarvelHub.mp4")
        vf = "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,format=yuv420p,subtitles='" + ffmpeg_filter_path(srt) + "':force_style='FontName=Arial,FontSize=18,PrimaryColour=&H00FFFFFF,OutlineColour=&H00000000,BorderStyle=1,Outline=2,Shadow=1,Alignment=2,MarginV=90'"
        cmd = ["ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", concat]
        audio_inputs = []
        next_input = 1
        if has_voice:
            cmd += ["-i", voice]
            audio_inputs.append(f"[{next_input}:a]")
            next_input += 1
        if has_music:
            cmd += ["-i", music]
            audio_inputs.append(f"[{next_input}:a]")
            next_input += 1
        if has_sfx:
            cmd += ["-i", sfx]
            audio_inputs.append(f"[{next_input}:a]")
            next_input += 1

        if audio_inputs:
            if len(audio_inputs) == 1:
                audio_filter = audio_inputs[0] + "aresample=44100,volume=1.0[aout]"
            else:
                voice_part = audio_inputs[0]
                other_parts = audio_inputs[1:]
                if other_parts:
                    mix_inputs = voice_part + "".join(other_parts)
                    audio_filter = mix_inputs + f"amix=inputs={len(audio_inputs)}:duration=longest:dropout_transition=2,aresample=44100[aout]"
                else:
                    audio_filter = voice_part + "aresample=44100[aout]"
            cmd += ["-filter_complex", f"[0:v]{vf}[vout];{audio_filter}", "-map", "[vout]", "-map", "[aout]"]
            cmd += ["-c:a", "aac", "-b:a", "192k"]
        else:
            cmd += ["-vf", vf, "-an"]

        cmd += ["-r", "30", "-c:v", "libx264", "-preset", "veryfast", "-crf", "23", "-pix_fmt", "yuv420p", output]
        result = run(cmd)
        if result.returncode != 0:
            raise RuntimeError(result.stderr[-3500:])

        with open(output, "rb") as f:
            data = f.read()
        return {
            "filename": os.path.basename(output),
            "mime": "video/mp4",
            "data": base64.b64encode(data).decode("ascii"),
            "features": {
                "imagenes": bool(resources),
                "voz": has_voice,
                "musica": has_music,
                "sfx": has_sfx,
                "subtitulos": True,
                "resolucion": "1080x1920"
            }
        }
    finally:
        shutil.rmtree(work, ignore_errors=True)

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
            self.send_json(200, {"ok": True, "service": "ABRAHAM G4 MP4 Renderer", "ffmpeg": True, "voice": True})
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
            self.send_json(500, {"ok": False, "error": "FFmpeg o el servidor de voz no están disponibles."})
        except Exception as exc:
            self.send_json(500, {"ok": False, "error": str(exc)})
            
if __name__ == "__main__":
    print(f"ABRAHAM G4 MP4 Renderer: http://{HOST}:{PORT}")
    HTTPServer((HOST, PORT), Handler).serve_forever()
