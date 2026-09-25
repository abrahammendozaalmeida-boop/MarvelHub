/* ABRAHAM G4 — VIDEO AI
   Fase 2: guion + voz.
   El navegador permite previsualizar la narración sin APIs.
   El motor local opcional genera un WAV mediante un servidor localhost
   gratuito basado en pyttsx3. Nunca se envían textos a un servicio externo.
*/
(function() {
    "use strict";

    const VOICE_SERVER = "http://127.0.0.1:8765";

    function limpiarTexto(texto) {
        return String(texto || "").replace(/\s+/g, " ").trim();
    }

    function capitalizar(texto) {
        if (!texto) return "";
        return texto.charAt(0).toUpperCase() + texto.slice(1);
    }

    function detectarPersonaje(tema) {
        const personajes = [
            "Spider-Man", "Iron Man", "Thor", "Hulk", "Captain America",
            "Capitán América", "Wolverine", "Deadpool", "Loki", "Thanos",
            "Venom", "Black Panther", "Doctor Strange", "Daredevil",
            "Wanda", "Scarlet Witch", "Hawkeye", "Groot"
        ];
        const encontrado = personajes.find(function(personaje) {
            return tema.toLowerCase().includes(personaje.toLowerCase());
        });
        return encontrado || "este personaje";
    }

    function crearEscenas(tema, duracion, estilo) {
        const cantidad = duracion <= 30 ? 4 : duracion <= 45 ? 5 : duracion <= 60 ? 6 : 8;
        const personaje = detectarPersonaje(tema);
        const plantillas = {
            curiosidades: [
                "Abre con una pregunta que haga detener el scroll.",
                "Presenta el primer dato y explica por qué es interesante.",
                "Añade un segundo dato con un detalle visual fácil de reconocer.",
                "Incluye un dato menos conocido para mantener la atención.",
                "Cierra con el dato más sorprendente y una llamada a comentar."
            ],
            top: [
                "Presenta el tema como un ranking rápido y directo.",
                "Explica la primera posición con una razón concreta.",
                "Sube el ritmo y presenta la siguiente posición.",
                "Añade contexto breve para que el dato tenga sentido.",
                "Cierra con la posición final y pregunta cuál elegiría la audiencia."
            ],
            historia: [
                "Presenta el origen del personaje de forma breve.",
                "Cuenta el momento que cambió su historia.",
                "Muestra un conflicto importante del personaje.",
                "Explica una evolución o cambio clave.",
                "Termina conectando su historia con el presente."
            ],
            teoria: [
                "Presenta la teoría en una frase que genere curiosidad.",
                "Explica la primera pista que la apoya.",
                "Añade una segunda pista y su contexto.",
                "Menciona qué parte de la teoría sigue sin confirmarse.",
                "Cierra invitando a la audiencia a decidir qué piensa."
            ],
            noticias: [
                "Resume la noticia en una frase clara.",
                "Explica el dato principal y de dónde viene.",
                "Añade el contexto necesario para entenderlo.",
                "Separa los hechos de lo que todavía no está confirmado.",
                "Cierra con lo que falta por conocerse."
            ]
        };
        const base = plantillas[estilo] || plantillas.curiosidades;
        const escenas = [];
        for (let i = 0; i < cantidad; i++) {
            const textoBase = base[i % base.length];
            escenas.push({
                numero: i + 1,
                duracion: Math.max(4, Math.round(duracion / cantidad)),
                narracion: i === 0
                    ? "¿Sabías esto sobre " + personaje + "? " + textoBase
                    : textoBase + " Tema: " + capitalizar(tema) + ".",
                visual: "Recurso vertical relacionado con " + tema + ".",
                subtitulo: i === 0
                    ? "¿SABÍAS ESTO SOBRE " + personaje.toUpperCase() + "?"
                    : "DATO " + (i + 1),
                audio: i === 0 ? "Hook + música de entrada" : "Música de fondo + efecto sutil"
            });
        }
        return escenas;
    }

    function textoNarracionProyecto(proyecto) {
        return proyecto.escenas.map(function(escena) {
            return escena.narracion;
        }).join(" ");
    }

    function renderizarEscenas(escenas) {
        const contenedor = document.getElementById("videoAIEscenas");
        if (!contenedor) return;
        contenedor.innerHTML = escenas.map(function(escena) {
            return (
                '<article class="video-ai-escena">' +
                    '<div class="video-ai-escena-numero">' + escena.numero + '</div>' +
                    '<div>' +
                        '<h4>Escena ' + escena.numero + ' • ' + escena.duracion + 's</h4>' +
                        '<p><strong>Narración:</strong> ' + escena.narracion + '</p>' +
                        '<p><strong>Visual:</strong> ' + escena.visual + '</p>' +
                        '<small><strong>Subtítulo:</strong> ' + escena.subtitulo + ' • ' + escena.audio + '</small>' +
                    '</div>' +
                '</article>'
            );
        }).join("");
        if (window.lucide) window.lucide.createIcons();
    }

    function descargarProyecto(proyecto) {
        const contenido = JSON.stringify(proyecto, null, 2);
        const blob = new Blob([contenido], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const enlace = document.createElement("a");
        enlace.href = url;
        enlace.download = "abraham-g4-video-" + Date.now() + ".json";
        document.body.appendChild(enlace);
        enlace.click();
        enlace.remove();
        URL.revokeObjectURL(url);
    }

    function cargarVocesNavegador() {
        const select = document.getElementById("videoAIVoz");
        if (!select || !("speechSynthesis" in window)) return;
        const voces = window.speechSynthesis.getVoices().filter(function(v) {
            return /^es(-|_|$)/i.test(v.lang);
        });
        select.innerHTML = '<option value="auto">Automática</option>';
        voces.forEach(function(voz, indice) {
            const option = document.createElement("option");
            option.value = String(indice);
            option.textContent = voz.name + " • " + voz.lang;
            option.dataset.voiceName = voz.name;
            option.dataset.voiceLang = voz.lang;
            select.appendChild(option);
        });
    }

    function obtenerVozNavegador(select) {
        if (!select || !("speechSynthesis" in window)) return null;
        const voces = window.speechSynthesis.getVoices().filter(function(v) {
            return /^es(-|_|$)/i.test(v.lang);
        });
        if (!voces.length) return null;
        if (select.value === "auto") {
            return voces.find(function(v) { return /mex|es-MX/i.test(v.lang); }) || voces[0];
        }
        return voces[Number(select.value)] || voces[0];
    }

    function setVozEstado(texto, tipo) {
        const estado = document.getElementById("videoAIVozEstado");
        if (!estado) return;
        estado.textContent = texto;
        estado.className = "video-ai-voz-chip" + (tipo ? " " + tipo : "");
    }

    function obtenerProyectoGuardado() {
        const guardado = localStorage.getItem("abrahamG4VideoProject");
        if (!guardado) return null;
        try { return JSON.parse(guardado); } catch (error) { return null; }
    }

    function actualizarProyectoVoz(cambios) {
        const proyecto = obtenerProyectoGuardado();
        if (!proyecto) return null;
        proyecto.voz = Object.assign({}, proyecto.voz || {}, cambios);
        localStorage.setItem("abrahamG4VideoProject", JSON.stringify(proyecto));
        return proyecto;
    }

    function generarVozNavegador() {
        const proyecto = obtenerProyectoGuardado();
        if (!proyecto) {
            setVozEstado("Primero crea el guion", "error");
            return;
        }
        if (!("speechSynthesis" in window)) {
            setVozEstado("Tu navegador no tiene voz web", "error");
            return;
        }

        window.speechSynthesis.cancel();
        const texto = textoNarracionProyecto(proyecto);
        const utterance = new SpeechSynthesisUtterance(texto);
        const select = document.getElementById("videoAIVoz");
        const voz = obtenerVozNavegador(select);
        if (voz) {
            utterance.voice = voz;
            utterance.lang = voz.lang;
        } else {
            utterance.lang = "es-MX";
        }

        utterance.rate = Number(document.getElementById("videoAIVozVelocidad")?.value || 1);
        utterance.pitch = 1;
        utterance.volume = 1;

        utterance.onstart = function() {
            setVozEstado("Reproduciendo", "activo");
        };
        utterance.onend = function() {
            setVozEstado("Vista previa lista", "ok");
        };
        utterance.onerror = function() {
            setVozEstado("No se pudo reproducir", "error");
        };

        window.speechSynthesis.speak(utterance);
        actualizarProyectoVoz({
            motor: "browser",
            estado: "preview",
            velocidad: utterance.rate,
            generado_en: new Date().toISOString()
        });
    }

    async function generarVozLocal() {
        const proyecto = obtenerProyectoGuardado();
        if (!proyecto) {
            setVozEstado("Primero crea el guion", "error");
            return;
        }

        const boton = document.getElementById("videoAIGenerarVoz");
        if (boton) boton.disabled = true;
        setVozEstado("Conectando con motor local…", "activo");

        try {
            const respuesta = await fetch(VOICE_SERVER + "/synthesize", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    text: textoNarracionProyecto(proyecto),
                    rate: Number(document.getElementById("videoAIVozVelocidad")?.value || 1),
                    voice: document.getElementById("videoAIVoz")?.value || "auto"
                })
            });

            if (!respuesta.ok) throw new Error("Servidor local: " + respuesta.status);
            const data = await respuesta.json();
            if (!data.audio) throw new Error("Respuesta sin audio");

            const audio = document.getElementById("videoAIAudio");
            const descarga = document.getElementById("videoAIVozDescargar");
            if (audio) {
                audio.src = data.audio;
                audio.hidden = false;
                audio.load();
            }
            if (descarga) {
                descarga.href = data.audio;
                descarga.hidden = false;
            }

            actualizarProyectoVoz({
                motor: "local",
                estado: "wav_generado",
                velocidad: Number(document.getElementById("videoAIVozVelocidad")?.value || 1),
                generado_en: new Date().toISOString()
            });
            setVozEstado("WAV generado", "ok");
        } catch (error) {
            console.warn("Video AI: motor local no disponible.", error);
            setVozEstado("Activa el servidor local", "error");
            const ayuda = document.getElementById("videoAIVozAyuda");
            if (ayuda) {
                ayuda.textContent = "No se encontró el motor local en 127.0.0.1:8765. Ejecuta tools/voice-server.py en tu PC y vuelve a intentarlo.";
            }
        } finally {
            if (boton) boton.disabled = false;
        }
    }

    function generarVoz() {
        const motor = document.getElementById("videoAIVozMotor")?.value || "browser";
        if (motor === "local") {
            generarVozLocal();
        } else {
            generarVozNavegador();
        }
    }

    function detenerVoz() {
        if ("speechSynthesis" in window) window.speechSynthesis.cancel();
        setVozEstado("Detenida", "");
    }

    function generarProyecto() {
        const temaInput = document.getElementById("videoAITema");
        const duracionInput = document.getElementById("videoAIDuracion");
        const estiloInput = document.getElementById("videoAIEstilo");
        const formatoInput = document.getElementById("videoAIFormato");
        const resultado = document.getElementById("videoAIResultado");
        const estado = document.getElementById("videoAIEstado");
        const boton = document.getElementById("videoAIGenerar");
        const titulo = document.getElementById("videoAITituloResultado");
        const resumen = document.getElementById("videoAIResumenResultado");

        if (!temaInput || !resultado) return;
        const tema = limpiarTexto(temaInput.value);
        if (!tema) {
            temaInput.focus();
            if (estado) estado.textContent = "Escribe un tema para comenzar.";
            return;
        }

        const duracion = Number(duracionInput ? duracionInput.value : 45);
        const estilo = estiloInput ? estiloInput.value : "curiosidades";
        const formato = formatoInput ? formatoInput.value : "9:16";

        if (boton) {
            boton.disabled = true;
            boton.innerHTML = '<i data-lucide="loader-circle"></i><span>Preparando proyecto...</span>';
            if (window.lucide) window.lucide.createIcons();
        }

        const escenas = crearEscenas(tema, duracion, estilo);
        const proyecto = {
            version: 2,
            creador: "ABRAHAM G4",
            tema: tema,
            duracion: duracion,
            estilo: estilo,
            formato: formato,
            escenas: escenas,
            voz: { motor: "browser", estado: "pendiente", velocidad: 1 },
            siguiente_fase: [
                "obtener recursos visuales",
                "crear subtítulos sincronizados",
                "añadir música y efectos",
                "renderizar MP4"
            ],
            creado_en: new Date().toISOString()
        };

        localStorage.setItem("abrahamG4VideoProject", JSON.stringify(proyecto));

        setTimeout(function() {
            if (titulo) titulo.textContent = capitalizar(tema);
            if (resumen) resumen.textContent = duracion + " segundos • " + formato + " • " + escenas.length + " escenas • modo " + estilo;
            renderizarEscenas(escenas);
            resultado.hidden = false;
            setVozEstado("No generada", "");
            const audio = document.getElementById("videoAIAudio");
            const descarga = document.getElementById("videoAIVozDescargar");
            if (audio) { audio.hidden = true; audio.removeAttribute("src"); }
            if (descarga) { descarga.hidden = true; descarga.removeAttribute("href"); }
            if (estado) estado.textContent = "Proyecto creado. Ahora puedes generar la narración.";
            if (boton) {
                boton.disabled = false;
                boton.innerHTML = '<i data-lucide="rocket"></i><span>Crear proyecto de video</span>';
                if (window.lucide) window.lucide.createIcons();
            }
            resultado.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 350);
    }

    function configurarVideoAI() {
        const boton = document.getElementById("videoAIGenerar");
        const tema = document.getElementById("videoAITema");
        const descargar = document.getElementById("videoAIDescargarGuion");
        const limpiar = document.getElementById("videoAILimpiar");
        const resultado = document.getElementById("videoAIResultado");
        const generarVozBtn = document.getElementById("videoAIGenerarVoz");
        const detenerVozBtn = document.getElementById("videoAIDetenerVoz");
        const motor = document.getElementById("videoAIVozMotor");

        if (!boton || !tema) return;

        boton.addEventListener("click", generarProyecto);
        tema.addEventListener("keydown", function(event) {
            if ((event.ctrlKey || event.metaKey) && event.key === "Enter") generarProyecto();
        });

        if ("speechSynthesis" in window) {
            cargarVocesNavegador();
            window.speechSynthesis.onvoiceschanged = cargarVocesNavegador;
        } else {
            const ayuda = document.getElementById("videoAIVozAyuda");
            if (ayuda) ayuda.textContent = "Tu navegador no ofrece SpeechSynthesis. Usa el motor local para generar el WAV.";
        }

        if (generarVozBtn) generarVozBtn.addEventListener("click", generarVoz);
        if (detenerVozBtn) detenerVozBtn.addEventListener("click", detenerVoz);
        if (motor) motor.addEventListener("change", function() {
            const ayuda = document.getElementById("videoAIVozAyuda");
            if (!ayuda) return;
            ayuda.textContent = motor.value === "local"
                ? "Motor local: ejecuta tools/voice-server.py en tu PC para generar un WAV sin API."
                : "El modo navegador es inmediato y no usa API. Para WAV real, activa el motor local.";
        });

        if (descargar) descargar.addEventListener("click", function() {
            const guardado = localStorage.getItem("abrahamG4VideoProject");
            if (!guardado) return;
            try { descargarProyecto(JSON.parse(guardado)); } catch (error) { console.error(error); }
        });

        if (limpiar) limpiar.addEventListener("click", function() {
            detenerVoz();
            tema.value = "";
            if (resultado) resultado.hidden = true;
            tema.focus();
        });
    }

    window.configurarVideoAI = configurarVideoAI;
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", configurarVideoAI);
    } else {
        configurarVideoAI();
    }
})();