const VIDEO_AI_RENDER_SERVER = "http://127.0.0.1:8766";

function setRenderEstado(texto, clase = "") {
    const el = document.getElementById("videoAIRenderEstado");
    if (!el) return;
    el.textContent = texto;
    el.className = "video-ai-render-chip" + (clase ? " " + clase : "");
}

async function renderizarVideoAI() {
    const proyecto = (() => { try { return JSON.parse(localStorage.getItem("abrahamG4VideoProject") || "null"); } catch (_) { return null; } })();
    const boton = document.getElementById("videoAIRenderizar");
    const ayuda = document.getElementById("videoAIRenderAyuda");
    const descarga = document.getElementById("videoAIDescargarMP4");
    const abrirEditor = document.getElementById("videoAIAbrirEditor");
    const editorEstado = document.getElementById("editorIAEstado");

    if (!proyecto) {
        setRenderEstado("Crea un proyecto primero", "error");
        return;
    }

    if (boton) boton.disabled = true;
    if (editorEstado) editorEstado.textContent = "Preparando tu video...";
    setRenderEstado("Renderizando...", "ok");
    if (ayuda) ayuda.textContent = "Uniendo imágenes, narración, subtítulos, música y efectos...";

    try {
        const health = await fetch(VIDEO_AI_RENDER_SERVER + "/health");
        if (!health.ok) throw new Error("El renderizador local no responde.");

        const response = await fetch(VIDEO_AI_RENDER_SERVER + "/render", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(proyecto)
        });

        const data = await response.json();
        if (!response.ok || !data.ok) throw new Error(data.error || "No se pudo generar el MP4.");

        const blob = base64ToBlob(data.result.data, data.result.mime || "video/mp4");
        const url = URL.createObjectURL(blob);

        if (descarga) {
            descarga.href = url;
            descarga.download = data.result.filename || "ABRAHAM_G4_MarvelHub.mp4";
            descarga.hidden = false;
        }
        window.marvelHubUltimoVideoRender = url;
        if (abrirEditor) abrirEditor.hidden = false;
        if (editorEstado) editorEstado.textContent = "Video generado";

        proyecto.render = {
            estado: "listo",
            formato: "mp4",
            resolucion: "1080x1920",
            generado_en: new Date().toISOString()
        };
        localStorage.setItem("abrahamG4VideoProject", JSON.stringify(proyecto));

        setRenderEstado("MP4 listo", "ok");
        if (ayuda) ayuda.textContent = "¡Listo! Tu video ya reúne imagen, narración, subtítulos, música y efectos.";
    } catch (error) {
        console.error(error);
        setRenderEstado("Error", "error");
        if (ayuda) ayuda.textContent = "No se pudo completar el render. Vuelve a intentarlo cuando el generador esté disponible.";
        if (editorEstado) editorEstado.textContent = "Listo para reintentar";
    } finally {
        if (boton) {
            boton.disabled = false;
            boton.textContent = "🎬 Generar MP4";
        }
    }
}

function base64ToBlob(base64, mime) {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return new Blob([bytes], { type: mime });
}

document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("videoAIRenderizar")?.addEventListener("click", renderizarVideoAI);
    document.getElementById("videoAIAbrirEditor")?.addEventListener("click", () => {
        if (window.marvelHubUltimoVideoRender && typeof window.cargarVideoEnEditorDesdeUrl === "function") {
            window.cargarVideoEnEditorDesdeUrl(window.marvelHubUltimoVideoRender, "Video generado • Marvel Hub");
        }
    });
});
