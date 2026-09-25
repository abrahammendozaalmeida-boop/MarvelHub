/* VIDEO AI — FASE 5: AUDIO */
const VIDEO_AI_AUDIO_DEFAULTS = { musica: "energetica", volumen: 0.25, sfx: true };
let videoAIAudioContext = null;
let videoAIAudioNodes = [];

function obtenerAudioProyecto(proyecto) {
    if (!proyecto.audio) proyecto.audio = { ...VIDEO_AI_AUDIO_DEFAULTS, estado: "pendiente" };
    return proyecto.audio;
}

function setAudioEstado(texto, clase = "") {
    const el = document.getElementById("videoAIAudioEstado");
    if (!el) return;
    el.textContent = texto;
    el.className = "video-ai-audio-chip" + (clase ? " " + clase : "");
}

function guardarProyectoVideoAI(proyecto) { localStorage.setItem("abrahamG4VideoProject", JSON.stringify(proyecto)); return proyecto; }

function guardarAudioProyecto() {
    const proyecto = (() => { try { return JSON.parse(localStorage.getItem("abrahamG4VideoProject") || "null"); } catch (_) { return null; } })();
    if (!proyecto) return null;
    const musica = document.getElementById("videoAIMusica");
    const volumen = document.getElementById("videoAIMusicaVolumen");
    const sfx = document.getElementById("videoAISFX");
    proyecto.audio = {
        musica: musica?.value || "energetica",
        volumen: Math.max(0, Math.min(1, Number(volumen?.value || 25) / 100)),
        sfx: (sfx?.value || "si") === "si",
        estado: "configurado"
    };
    guardarProyectoVideoAI(proyecto);
    setAudioEstado("Configurado", "ok");
    return proyecto;
}

function cargarAudioUI(proyecto) {
    const audio = obtenerAudioProyecto(proyecto);
    const musica = document.getElementById("videoAIMusica");
    const volumen = document.getElementById("videoAIMusicaVolumen");
    const valor = document.getElementById("videoAIMusicaVolumenValor");
    const sfx = document.getElementById("videoAISFX");
    if (musica) musica.value = audio.musica || "energetica";
    if (volumen) volumen.value = Math.round((audio.volumen ?? .25) * 100);
    if (valor) valor.value = (volumen?.value || 25) + "%";
    if (sfx) sfx.value = audio.sfx === false ? "no" : "si";
    setAudioEstado(audio.estado === "configurado" ? "Configurado" : "Pendiente", audio.estado === "configurado" ? "ok" : "");
}

function detenerAudioPreview() {
    videoAIAudioNodes.forEach(n => {
        try { n.stop?.(); } catch (_) {}
        try { n.disconnect?.(); } catch (_) {}
    });
    videoAIAudioNodes = [];
}

function frecuenciaAudio(tipo, paso) {
    const escalas = {
        ambiental: [220, 261.63, 329.63, 392],
        energetica: [261.63, 329.63, 392, 523.25],
        epica: [196, 246.94, 293.66, 392],
        suspenso: [196, 207.65, 233.08, 277.18]
    };
    const escala = escalas[tipo] || escalas.energetica;
    return escala[paso % escala.length];
}

function reproducirAudioPreview() {
    const proyecto = typeof obtenerProyectoVideoAI === "function" ? obtenerProyectoGuardado() : null;
    if (!proyecto) {
        setAudioEstado("Crea un proyecto primero", "error");
        return;
    }

    guardarAudioProyecto();
    const audio = proyecto.audio;
    detenerAudioPreview();

    if (audio.musica === "ninguna" && !audio.sfx) {
        setAudioEstado("Sin audio");
        return;
    }

    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) {
        setAudioEstado("Navegador no compatible", "error");
        return;
    }

    videoAIAudioContext = videoAIAudioContext || new AudioContextClass();
    videoAIAudioContext.resume?.();

    const ctx = videoAIAudioContext;
    const master = ctx.createGain();
    master.gain.value = audio.volumen;
    master.connect(ctx.destination);

    if (audio.musica !== "ninguna") {
        const inicio = ctx.currentTime;
        const duracion = Math.min(Number(proyecto.duracion) || 45, 24);
        const paso = 0.6;

        for (let t = 0, i = 0; t < duracion; t += paso, i++) {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = audio.musica === "suspenso" ? "triangle" : "sine";
            osc.frequency.value = frecuenciaAudio(audio.musica, i);
            gain.gain.setValueAtTime(0.0001, inicio + t);
            gain.gain.exponentialRampToValueAtTime(Math.max(0.01, audio.volumen * 0.16), inicio + t + 0.04);
            gain.gain.exponentialRampToValueAtTime(0.0001, inicio + t + paso);
            osc.connect(gain).connect(master);
            osc.start(inicio + t);
            osc.stop(inicio + t + paso);
            videoAIAudioNodes.push(osc);
        }
    }

    if (audio.sfx) {
        const escenas = Array.isArray(proyecto.escenas) ? proyecto.escenas : [];
        let acumulado = 0;

        escenas.forEach((escena, i) => {
            acumulado += Number(escena.duracion) || 0;
            if (i === escenas.length - 1) return;

            const cuando = ctx.currentTime + Math.min(acumulado, 24);
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.type = "square";
            osc.frequency.setValueAtTime(720 + (i % 3) * 110, cuando);
            osc.frequency.exponentialRampToValueAtTime(240, cuando + 0.09);
            gain.gain.setValueAtTime(0.0001, cuando);
            gain.gain.exponentialRampToValueAtTime(Math.max(0.01, audio.volumen * 0.45), cuando + 0.01);
            gain.gain.exponentialRampToValueAtTime(0.0001, cuando + 0.12);

            osc.connect(gain).connect(master);
            osc.start(cuando);
            osc.stop(cuando + 0.13);
            videoAIAudioNodes.push(osc);
        });
    }

    setAudioEstado("Reproduciendo", "ok");
}

function inicializarAudioVideoAI() {
    const musica = document.getElementById("videoAIMusica");
    const volumen = document.getElementById("videoAIMusicaVolumen");
    const valor = document.getElementById("videoAIMusicaVolumenValor");
    const sfx = document.getElementById("videoAISFX");
    if (!musica || !volumen || !sfx) return;

    const proyecto = typeof obtenerProyectoVideoAI === "function" ? obtenerProyectoGuardado() : null;
    if (proyecto) cargarAudioUI(proyecto);

    volumen.addEventListener("input", () => {
        if (valor) valor.value = volumen.value + "%";
    });

    [musica, volumen, sfx].forEach(el => el.addEventListener("change", guardarAudioProyecto));

    document.getElementById("videoAIAudioPreview")?.addEventListener("click", reproducirAudioPreview);
    document.getElementById("videoAIAudioDetener")?.addEventListener("click", () => {
        detenerAudioPreview();
        setAudioEstado("Detenido");
    });
}

document.addEventListener("DOMContentLoaded", inicializarAudioVideoAI);
