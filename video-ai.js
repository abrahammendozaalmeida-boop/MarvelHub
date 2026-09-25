/* ABRAHAM G4 — VIDEO AI
   Fase 1: generador local de proyectos/storyboards.
   No usa APIs ni consume créditos: prepara la estructura que después
   conectaremos a voz, recursos, subtítulos, música y renderizado.
*/

(function() {
    "use strict";

    function limpiarTexto(texto) {
        return texto.replace(/\s+/g, " ").trim();
    }

    function capitalizar(texto) {
        if (!texto) return "";
        return texto.charAt(0).toUpperCase() + texto.slice(1);
    }

    function detectarPersonaje(tema) {
        const personajes = [
            "Spider-Man", "Spider-Man", "Iron Man", "Thor", "Hulk",
            "Captain America", "Capitán América", "Wolverine", "Deadpool",
            "Loki", "Thanos", "Venom", "Black Panther", "Doctor Strange",
            "Daredevil", "Wanda", "Scarlet Witch", "Hawkeye", "Groot"
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

        if (window.lucide) {
            window.lucide.createIcons();
        }
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
            version: 1,
            creador: "ABRAHAM G4",
            tema: tema,
            duracion: duracion,
            estilo: estilo,
            formato: formato,
            escenas: escenas,
            siguiente_fase: [
                "generar voz",
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
            if (resumen) {
                resumen.textContent =
                    duracion + " segundos • " + formato +
                    " • " + escenas.length + " escenas • " +
                    "modo " + estilo;
            }

            renderizarEscenas(escenas);
            resultado.hidden = false;

            if (estado) {
                estado.textContent = "Proyecto creado. Esta es la base del generador automático.";
            }

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

        if (!boton || !tema) return;

        boton.addEventListener("click", generarProyecto);

        tema.addEventListener("keydown", function(event) {
            if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
                generarProyecto();
            }
        });

        if (descargar) {
            descargar.addEventListener("click", function() {
                const guardado = localStorage.getItem("abrahamG4VideoProject");
                if (!guardado) return;

                try {
                    descargarProyecto(JSON.parse(guardado));
                } catch (error) {
                    console.error("Video AI: proyecto guardado inválido.", error);
                }
            });
        }

        if (limpiar) {
            limpiar.addEventListener("click", function() {
                tema.value = "";
                if (resultado) resultado.hidden = true;
                tema.focus();
            });
        }
    }

    window.configurarVideoAI = configurarVideoAI;

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", configurarVideoAI);
    } else {
        configurarVideoAI();
    }
})();
