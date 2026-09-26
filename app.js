const TMDB_API_KEY = localStorage.getItem("marvelHubTMDBApiKey") || "TU_CLAVE_API";
const TMDB_BASE_URL = "https://api.themoviedb.org/3";
const TMDB_IMAGE_URL = "https://image.tmdb.org/t/p/w500";

let peliculasTMDB = [];
let seriesTMDB = [];
let tipoActual = "peliculas";
let favoritosMarvel = JSON.parse(localStorage.getItem("favoritosMarvel") || "[]");
let instalacionPendiente = null;

function actualizarInicioPersonalizado() {
    const nombre = localStorage.getItem("nombre") || "";
    const saludo = document.getElementById("saludoInicio");
    const texto = document.getElementById("textoPortada");
    const textoPersonalizado = document.getElementById("textoPersonalizado");

    if (saludo) {
        saludo.textContent = nombre
            ? "MARVEL HUB • " + nombre.toUpperCase()
            : "MARVEL HUB • ABRAHAM G4";
    }

    if (texto) {
        texto.textContent = nombre
            ? "Bienvenido de nuevo, " + nombre + ". Descubre algo para ver hoy."
            : "Descubre películas, series, próximos estrenos y tus favoritos.";
    }

    if (textoPersonalizado) {
        textoPersonalizado.textContent = favoritosMarvel.length > 0
            ? "Basado en lo que has guardado en tu lista."
            : "Guarda favoritos para crear una selección más personal.";
    }
}

function renderizarPersonalizadoInicio() {
    const contenedor = document.getElementById("homePersonalizado");

    if (!contenedor) return;

    let candidatos = peliculasTMDB.concat(seriesTMDB);
    const favoritosIds = favoritosMarvel.map(function(item) {
        return item.id;
    });

    candidatos = candidatos.filter(function(item) {
        return favoritosIds.indexOf(item.id) === -1;
    });

    if (favoritosMarvel.length > 0) {
        candidatos.sort(function(a, b) {
            return Number(b.vote_average || 0) - Number(a.vote_average || 0);
        });
    } else {
        candidatos.sort(function(a, b) {
            return Number(b.popularity || 0) - Number(a.popularity || 0);
        });
    }

    candidatos = candidatos.slice(0, 10);
    contenedor.innerHTML = "";

    if (candidatos.length === 0) {
        contenedor.innerHTML = "<p>No hay suficiente contenido para personalizar todavía.</p>";
        return;
    }

    candidatos.forEach(function(item) {
        contenedor.appendChild(crearTarjetaInicio(item));
    });
}

function guardarVistoRecientemente(item) {
    if (!item || !item.id) return;

    let historial = [];

    try {
        historial = JSON.parse(
            localStorage.getItem("historialMarvel") || "[]"
        );
    } catch (error) {
        historial = [];
    }

    const registro = {
        id: item.id,
        tipo: item.tipo || "movie",
        titulo: item.title || item.name || "Sin título",
        poster_path: item.poster_path || "",
        backdrop_path: item.backdrop_path || "",
        overview: item.overview || "",
        fecha: item.release_date || item.first_air_date || "",
        vote_average: item.vote_average || 0,
        vistoEn: Date.now()
    };

    historial = historial.filter(function(elemento) {
        return !(elemento.id === registro.id && elemento.tipo === registro.tipo);
    });

    historial.unshift(registro);
    historial = historial.slice(0, 12);

    localStorage.setItem(
        "historialMarvel",
        JSON.stringify(historial)
    );

    sincronizarHistorialConNubeActual();
}

async function sincronizarHistorialConNubeActual() {
    if (!supabaseClient) return;

    const user = await obtenerUsuarioSupabase();
    if (!user) return;

    const historial = obtenerHistorialMarvel();

    if (historial.length === 0) {
        await sincronizarHistorialVacio();
        return;
    }

    const resultado = await supabaseClient
        .from("history")
        .upsert(
            historial.map(function(item) {
                return convertirHistorialANube(item, user.id);
            }),
            {
                onConflict: "user_id,media_id,media_type"
            }
        );

    if (resultado.error) {
        console.error("No se pudo sincronizar el historial:", resultado.error);
    }
}

function obtenerHistorialMarvel() {
    try {
        const historial = JSON.parse(
            localStorage.getItem("historialMarvel") || "[]"
        );

        return Array.isArray(historial) ? historial : [];
    } catch (error) {
        return [];
    }
}

function limpiarHistorialMarvel() {
    localStorage.removeItem("historialMarvel");
    renderizarHistorialInicio();
    sincronizarHistorialVacio();
}

function renderizarHistorialInicio() {
    const contenedor = document.getElementById("homeHistorial");
    const texto = document.getElementById("textoHistorial");

    if (!contenedor) return;

    const historial = obtenerHistorialMarvel();

    contenedor.innerHTML = "";

    if (historial.length === 0) {
        contenedor.innerHTML =
            "<p>Aquí aparecerá lo último que consultes.</p>";

        if (texto) {
            texto.textContent =
                "Abre los detalles de cualquier título para empezar.";
        }

        return;
    }

    if (texto) {
        texto.textContent =
            "Tus últimos títulos consultados en este dispositivo.";
    }

    historial.slice(0, 6).forEach(function(item) {
        contenedor.appendChild(
            crearTarjetaMarvel(item, {
                actualizarInicio: true
            })
        );
    });
}

function mostrarSeccion(seccion) {
    document.querySelectorAll(".seccion").forEach(function(elemento) {
        elemento.classList.remove("activa");
    });

    document.querySelectorAll(".nav-boton").forEach(function(boton) {
        boton.classList.toggle(
            "activo-nav",
            boton.dataset.seccion === seccion
        );
    });

    const seleccionada = document.getElementById(seccion);

    if (seleccionada) {
        seleccionada.classList.add("activa");
    }

    if (seccion === "favoritos") {
        mostrarFavoritos();
    }

    if (seccion === "perfil") {
        actualizarPerfilUI();
    }

    if (seccion === "cuenta") {
        if (supabaseClient) {
            supabaseClient.auth.getSession().then(function(resultado) {
                actualizarCuentaUI(
                    resultado.data && resultado.data.session
                        ? resultado.data.session.user
                        : null
                );
            });
        } else {
            actualizarCuentaUI(null);
        }
    }

    if (seccion === "inicio") {
        renderizarFilaFavoritosInicio();
        renderizarDescubreInicio();
        renderizarPersonalizadoInicio();
        actualizarInicioPersonalizado();
        renderizarHistorialInicio();
    }

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
}

async function obtenerTMDB(endpoint) {
    if (!TMDB_API_KEY || TMDB_API_KEY === "TU_CLAVE_API") {
        throw new Error("Falta configurar la clave de TMDB.");
    }

    const respuesta = await fetch(
        TMDB_BASE_URL +
        endpoint +
        (endpoint.includes("?") ? "&" : "?") +
        "api_key=" +
        encodeURIComponent(TMDB_API_KEY) +
        "&language=es-MX"
    );

    if (!respuesta.ok) {
        throw new Error("TMDB respondió con un error.");
    }

    return await respuesta.json();
}

function crearPoster(url, titulo, clase) {
    if (!url) {
        return "<div class='poster-faltante'>🎬</div>";
    }

    return (
        "<img class='" +
        (clase || "") +
        "' src='" +
        url +
        "' alt='" +
        titulo.replace(/'/g, "&#39;") +
        "'>"
    );
}


function crearTarjetaMarvel(item, opciones) {
    const datos = item || {};
    const tipo = datos.tipo || "movie";
    const titulo = datos.title || datos.name || datos.titulo || "Sin título";
    const fecha = datos.release_date || datos.first_air_date || datos.fecha || "Sin fecha";
    const puntuacion = datos.vote_average
        ? Number(datos.vote_average).toFixed(1)
        : "N/A";
    const descripcion = datos.overview || "Sin descripción disponible.";
    const esFavorito = esFavoritoMarvel(datos.id, tipo);

    const tarjeta = document.createElement("article");
    tarjeta.className = "tarjeta-pelicula";

    tarjeta.innerHTML =
        "<div class='card-media'>" +
        crearPoster(
            datos.poster_path
                ? TMDB_IMAGE_URL + datos.poster_path
                : "",
            escaparHTML(titulo),
            ""
        ) +
        "<div class='card-overlay'>" +
        "<button class='card-ver' type='button'><i data-lucide='play'></i><span>Ver detalles</span></button>" +
        "<button class='card-quick-fav " + (esFavorito ? "activo" : "") + "' type='button' aria-label='" + (esFavorito ? "Quitar de favoritos" : "Añadir a favoritos") + "'><i data-lucide='heart'></i></button>" +
        "</div>" +
        "<span class='card-badge'>" +
        (tipo === "tv" ? "Serie" : "Película") +
        "</span>" +
        "<span class='card-rating'><i data-lucide='star'></i> " +
        puntuacion +
        "</span>" +
        "</div>" +
        "<div class='card-content'>" +
        "<h3>" + escaparHTML(titulo) + "</h3>" +
        "<div class='card-meta'>" +
        "<span>" + (tipo === "tv" ? "Serie" : "Película") + "</span>" +
        "<span>" + escaparHTML(fecha) + "</span>" +
        "</div>" +
        "<p class='puntuacion'><i data-lucide='star'></i> " + puntuacion + "/10</p>" +
        "<p class='descripcion-pelicula'>" +
        escaparHTML(descripcion) +
        "</p>" +
        "<div class='botones-card'>" +
        "<button class='boton-detalles' type='button'><i data-lucide='info'></i><span>Detalles</span></button>" +
        "<button class='" +
        (esFavorito ? "boton-quitar-favorito" : "boton-favorito") +
        "' type='button'><i data-lucide='heart'></i><span>" +
        (esFavorito ? "Quitar" : "Favorito") +
        "</span></button>" +
        "</div>" +
        "</div>";

    const abrirDetalles = function() {
        verDetallesTMDB(datos.id, tipo);
    };

    const botonVer = tarjeta.querySelector(".card-ver");
    const botonDetalles = tarjeta.querySelector(".boton-detalles");
    const botonFavorito = tarjeta.querySelector(".boton-favorito, .boton-quitar-favorito");

    if (botonVer) botonVer.addEventListener("click", abrirDetalles);
    if (botonDetalles) botonDetalles.addEventListener("click", abrirDetalles);

    if (botonFavorito) {
        botonFavorito.addEventListener("click", function() {
            alternarFavorito(datos.id, tipo, datos);

            if (opciones && opciones.actualizarInicio) {
                renderizarFilasInicio();
            } else {
                renderizarFavoritos();
            }
        });
    }

    const botonQuickFavorito = tarjeta.querySelector(".card-quick-fav");
    if (botonQuickFavorito) {
        botonQuickFavorito.addEventListener("click", function(event) {
            event.stopPropagation();
            alternarFavorito(datos.id, tipo, datos);

            if (opciones && opciones.actualizarInicio) {
                renderizarFilasInicio();
            } else {
                renderizarFavoritos();
            }
        });
    }

    setTimeout(actualizarIconosLucide, 0);

    return tarjeta;
}


function esFavoritoMarvel(id, tipo) {
    return favoritosMarvel.some(function(item) {
        return item.id === id && item.tipo === tipo;
    });
}

function guardarFavoritos() {
    localStorage.setItem("favoritosMarvel", JSON.stringify(favoritosMarvel));
}

function alternarFavorito(id, tipo, itemProporcionado) {
    const indice = favoritosMarvel.findIndex(function(item) {
        return item.id === id && item.tipo === tipo;
    });

    if (indice >= 0) {
        favoritosMarvel.splice(indice, 1);
    } else {
        let item = itemProporcionado || null;

        if (!item) {
            const lista = tipo === "movie" ? peliculasTMDB : seriesTMDB;
            item = lista.find(function(elemento) {
                return elemento.id === id;
            });
        }

        if (!item) return;

        favoritosMarvel.push({
            id: item.id,
            tipo: tipo,
            titulo: item.title || item.name || item.titulo || "Sin título",
            poster_path: item.poster_path || "",
            backdrop_path: item.backdrop_path || "",
            overview: item.overview || "",
            fecha: item.release_date || item.first_air_date || item.fecha || "",
            vote_average: item.vote_average || 0,
            guardadoEn: Date.now()
        });
    }

    guardarFavoritos();
    actualizarInicioPersonalizado();
    actualizarResumenAjustes();
    renderizarPersonalizadoInicio();
    renderizarCatalogo(tipo === "movie" ? peliculasTMDB : seriesTMDB);

    if (document.getElementById("favoritos").classList.contains("activa")) {
        mostrarFavoritos();
    }

    sincronizarFavoritoActual(id, tipo);
}

function obtenerListaOrdenada(lista) {
    const orden = document.getElementById("ordenCatalogo");
    const valor = orden ? orden.value : "popularidad";
    const copia = (lista || []).slice();

    copia.sort(function(a, b) {
        if (valor === "puntuacion") {
            return Number(b.vote_average || 0) - Number(a.vote_average || 0);
        }

        if (valor === "reciente") {
            const fechaA = a.release_date || a.first_air_date || "";
            const fechaB = b.release_date || b.first_air_date || "";
            return fechaB.localeCompare(fechaA);
        }

        if (valor === "alfabetico") {
            const tituloA = (a.title || a.name || "").toLowerCase();
            const tituloB = (b.title || b.name || "").toLowerCase();
            return tituloA.localeCompare(tituloB);
        }

        return Number(b.popularity || 0) - Number(a.popularity || 0);
    });

    return copia;
}

function actualizarInfoCatalogo(cantidad, mostrarLimpiar) {
    const contador = document.getElementById("contadorCatalogo");
    const limpiar = document.getElementById("limpiarBusqueda");

    if (contador) {
        contador.textContent =
            cantidad +
            (cantidad === 1 ? " resultado" : " resultados");
    }

    if (limpiar) {
        limpiar.hidden = !mostrarLimpiar;
    }
}

function obtenerListaFiltradaCatalogo(lista) {
    const buscador = document.getElementById("buscador");
    const texto = buscador
        ? buscador.value.trim().toLowerCase()
        : "";

    const base = Array.isArray(lista) ? lista : [];

    if (!texto) {
        return base.slice();
    }

    return base.filter(function(item) {
        const titulo = (item.title || item.name || "").toLowerCase();
        const descripcion = (item.overview || "").toLowerCase();

        return titulo.includes(texto) || descripcion.includes(texto);
    });
}

function renderizarCatalogo(lista) {
    const catalogo = document.getElementById("catalogo");

    if (!catalogo) return;

    catalogo.innerHTML = "";

    const filtrada = obtenerListaFiltradaCatalogo(lista);
    const listaOrdenada = obtenerListaOrdenada(filtrada);
    const buscador = document.getElementById("buscador");
    const hayBusqueda = !!(
        buscador &&
        buscador.value.trim().length > 0
    );

    actualizarInfoCatalogo(listaOrdenada.length, hayBusqueda);

    if (!listaOrdenada || listaOrdenada.length === 0) {
        catalogo.innerHTML = hayBusqueda
            ? "<p>🔎 No encontramos coincidencias. Prueba con otro título o palabra.</p>"
            : "<p>🎬 No hay contenido disponible en este momento.</p>";
        return;
    }

    const limiteInicial = hayBusqueda ? listaOrdenada.length : Math.min(12, listaOrdenada.length);
    listaOrdenada.slice(0, limiteInicial).forEach(function(item) {
        catalogo.appendChild(crearTarjetaMarvel(item));
    });
}

function obtenerFavoritosOrdenados(lista) {
    const orden = document.getElementById("ordenFavoritos");
    const valor = orden ? orden.value : "recientes";
    const copia = (lista || []).slice();

    copia.sort(function(a, b) {
        if (valor === "alfabetico") {
            return (a.titulo || "").localeCompare(b.titulo || "", "es", {
                sensitivity: "base"
            });
        }

        if (valor === "puntuacion") {
            return Number(b.vote_average || 0) - Number(a.vote_average || 0);
        }

        return Number(b.guardadoEn || 0) - Number(a.guardadoEn || 0);
    });

    return copia;
}

function vaciarFavoritos() {
    if (favoritosMarvel.length === 0) return;

    const confirmar = window.confirm(
        "¿Quieres quitar todos tus favoritos de este dispositivo?"
    );

    if (!confirmar) return;

    favoritosMarvel = [];
    guardarFavoritos();
    actualizarInicioPersonalizado();
    actualizarResumenAjustes();
    renderizarPersonalizadoInicio();
    renderizarFilaFavoritosInicio();
    mostrarFavoritos();
    sincronizarFavoritosVacios();
}

function actualizarResumenFavoritos() {
    const peliculas = favoritosMarvel.filter(function(item) {
        return item.tipo === "movie";
    }).length;
    const series = favoritosMarvel.filter(function(item) {
        return item.tipo === "tv";
    }).length;
    const detalle = document.getElementById("detalleFavoritos");

    if (detalle) {
        detalle.textContent =
            peliculas + " películas · " + series + " series";
    }
}

function renderizarFavoritos(filtro) {
    const catalogo = document.getElementById("catalogoFavoritos");
    const contador = document.getElementById("contadorFavoritos");
    const texto = document.getElementById("textoFavoritos");

    if (!catalogo) return;

    const filtroActual = filtro || "todos";

    const buscador = document.getElementById("buscadorFavoritos");
    const textoBusqueda = buscador
        ? buscador.value.trim().toLowerCase()
        : "";

    const listaBase = favoritosMarvel.filter(function(item) {
        const coincideTipo =
            filtroActual === "todos" || item.tipo === filtroActual;

        if (!coincideTipo) return false;
        if (!textoBusqueda) return true;

        const titulo = (item.titulo || "").toLowerCase();
        const descripcion = (item.overview || "").toLowerCase();

        return (
            titulo.includes(textoBusqueda) ||
            descripcion.includes(textoBusqueda)
        );
    });

    const lista = obtenerFavoritosOrdenados(listaBase);

    catalogo.innerHTML = "";

    if (contador) {
        contador.textContent =
            favoritosMarvel.length +
            (favoritosMarvel.length === 1 ? " favorito" : " favoritos");
    }

    actualizarResumenFavoritos();

    if (texto) {
        if (favoritosMarvel.length === 0) {
            texto.textContent = "Todavía no has guardado contenido.";
        } else if (filtroActual === "movie") {
            texto.textContent = "Mostrando tus películas guardadas."; 
        } else if (filtroActual === "tv") {
            texto.textContent = "Mostrando tus series guardadas.";
        } else {
            texto.textContent = "Tu biblioteca personal de Marvel."; 
        }
    }

    if (lista.length === 0) {
        if (favoritosMarvel.length === 0) {
            catalogo.innerHTML =
                "<p>❤️ No tienes favoritos todavía. Guarda contenido desde el catálogo.</p>";
        } else if (textoBusqueda) {
            catalogo.innerHTML =
                "<p>🔎 No encontramos favoritos que coincidan con " +
                escaparHTML(textoBusqueda) +
                ".</p>";
        } else {
            catalogo.innerHTML =
                filtroActual === "todos"
                    ? "<p>No tienes favoritos todavía.</p>"
                    : "<p>No tienes favoritos de este tipo.</p>";
        }
        return;
    }

    lista.forEach(function(item) {
        const tarjeta = document.createElement("article");
        tarjeta.className = "tarjeta-pelicula";

        const titulo = item.titulo || "Sin título";
        const tipoTexto = item.tipo === "tv" ? "📺 Serie" : "🎬 Película";
        const fecha = item.fecha || "Sin fecha";
        const puntuacion = item.vote_average
            ? Number(item.vote_average).toFixed(1)
            : "N/A";
        const descripcion = item.overview || "Sin descripción disponible.";

        tarjeta.innerHTML =
            "<div class='card-media'>" +
            crearPoster(
                item.poster_path
                    ? TMDB_IMAGE_URL + item.poster_path
                    : "",
                titulo,
                ""
            ) +
            "<div class='card-overlay'>" +
            "<button class='card-ver' type='button'>▶ Ver detalles</button>" +
            "</div>" +
            "<span class='card-badge'>" +
            tipoTexto +
            "</span>" +
            "<span class='card-rating'>⭐ " +
            puntuacion +
            "</span>" +
            "</div>" +
            "<div class='card-content'>" +
            "<h3>" + titulo + "</h3>" +
            "<div class='card-meta'>" +
            "<span>" + (item.tipo === "tv" ? "Serie" : "Película") + "</span>" +
            "<span>📅 " + fecha + "</span>" +
            "</div>" +
            "<p class='descripcion-pelicula'>" +
            descripcion +
            "</p>" +
            "<div class='botones-card'>" +
            "<button class='boton-detalles' type='button'>Ver detalles</button>" +
            "<button class='boton-quitar-favorito' type='button'>💔 Quitar</button>" +
            "</div>" +
            "</div>";

        const abrirDetalles = function() {
            verDetallesTMDB(item.id, item.tipo);
        };

        tarjeta.querySelector(".card-ver").addEventListener(
            "click",
            abrirDetalles
        );

        tarjeta.querySelector(".boton-detalles").addEventListener(
            "click",
            abrirDetalles
        );

        tarjeta.querySelector(".boton-quitar-favorito").addEventListener(
            "click",
            function() {
                alternarFavorito(item.id, item.tipo, item);
            }
        );

        catalogo.appendChild(tarjeta);
    });
}

function mostrarFavoritos() {
    renderizarFavoritos(window.filtroFavoritosActual || "todos");
}

function configurarModoDevTMDB() {
    const panel = document.getElementById("tmdbDevPanel");
    const toggle = document.getElementById("tmdbDevToggle");
    const estado = document.getElementById("tmdbDevEstado");

    if (!panel || !toggle) return;

    const permitido = new URLSearchParams(window.location.search).get("dev") === "1";
    panel.hidden = !permitido;
    if (!permitido) return;

    toggle.checked = localStorage.getItem("marvelHubDevTMDBAll") === "1";

    function actualizarEstado() {
        const activo = toggle.checked;
        if (estado) {
            estado.textContent = activo
                ? "TMDB completo activo"
                : "Filtro Marvel activo";
        }
    }

    toggle.addEventListener("change", async function() {
        localStorage.setItem("marvelHubDevTMDBAll", toggle.checked ? "1" : "0");
        actualizarEstado();
        await cargarMarvelTMDB();
    });

    actualizarEstado();
}

function configurarFavoritos() {
    const botones = document.querySelectorAll("[data-filtro-favoritos]");
    const orden = document.getElementById("ordenFavoritos");
    const buscador = document.getElementById("buscadorFavoritos");

    botones.forEach(function(boton) {
        boton.addEventListener("click", function() {
            window.filtroFavoritosActual = this.dataset.filtroFavoritos;

            botones.forEach(function(elemento) {
                elemento.classList.remove("activo-filtro");
            });

            this.classList.add("activo-filtro");
            renderizarFavoritos(window.filtroFavoritosActual);
        });
    });

    if (orden) {
        orden.addEventListener("change", function() {
            renderizarFavoritos(window.filtroFavoritosActual || "todos");
        });
    }

    if (buscador) {
        buscador.addEventListener("input", function() {
            renderizarFavoritos(window.filtroFavoritosActual || "todos");
        });
    }
}

let paginaPeliculasTMDB = 1;
let paginaSeriesTMDB = 1;
let totalPaginasPeliculasTMDB = 1;
let totalPaginasSeriesTMDB = 1;
let cargandoMasMarvel = false;
let empresasMarvelTMDB = "420";

async function obtenerEmpresasMarvelTMDB() {
    try {
        const datos = await obtenerTMDB(
            "/search/company?query=Marvel&page=1"
        );

        const ids = (datos.results || [])
            .filter(function(empresa) {
                const nombre = (empresa.name || "").toLowerCase();
                return nombre.includes("marvel");
            })
            .slice(0, 12)
            .map(function(empresa) {
                return String(empresa.id);
            });

        if (ids.indexOf("420") === -1) {
            ids.unshift("420");
        }

        empresasMarvelTMDB = Array.from(new Set(ids)).join("|");
    } catch (error) {
        console.warn(
            "No se pudieron ampliar las empresas Marvel. Se usará Marvel Studios.",
            error
        );
        empresasMarvelTMDB = "420";
    }

    return empresasMarvelTMDB;
}

async function cargarPaginaMarvel(tipo, pagina) {
    const modoTodoTMDB = localStorage.getItem("marvelHubDevTMDBAll") === "1";
    const endpointBase = tipo === "movie" ? "/discover/movie?" : "/discover/tv?";
    const filtrosBase = "sort_by=popularity.desc&include_adult=false&page=" + pagina;
    const filtroMarvel = modoTodoTMDB
        ? ""
        : "&with_companies=" + encodeURIComponent(empresasMarvelTMDB);

    const datos = await obtenerTMDB(
        endpointBase + filtrosBase + filtroMarvel
    );

    return {
        resultados: (datos.results || []).map(function(item) {
            item.tipo = tipo;
            return item;
        }),
        totalPaginas: Number(datos.total_pages || 1)
    };
}

function actualizarBotonCargarMas() {
    const boton = document.getElementById("cargarMasMarvel");

    if (!boton) return;

    const paginaActual = tipoActual === "peliculas"
        ? paginaPeliculasTMDB
        : paginaSeriesTMDB;

    const totalPaginas = tipoActual === "peliculas"
        ? totalPaginasPeliculasTMDB
        : totalPaginasSeriesTMDB;

    const hayMas = paginaActual < totalPaginas;

    boton.hidden = !hayMas;
    boton.disabled = cargandoMasMarvel;

    if (cargandoMasMarvel) {
        boton.textContent = "⏳ Cargando...";
    } else {
        boton.textContent = hayMas
            ? "➕ Cargar más"
            : "✓ Todo cargado";
    }
}

async function cargarMarvelTMDB() {
    const catalogo = document.getElementById("catalogo");

    if (!catalogo) return;

    const modoTodoTMDB = localStorage.getItem("marvelHubDevTMDBAll") === "1";
    catalogo.innerHTML = modoTodoTMDB
        ? "<p>Cargando TMDB sin filtro...</p>"
        : "<p>Cargando Marvel desde TMDB...</p>";

    paginaPeliculasTMDB = 1;
    paginaSeriesTMDB = 1;
    totalPaginasPeliculasTMDB = 1;
    totalPaginasSeriesTMDB = 1;

    try {
        if (!modoTodoTMDB) {
            await obtenerEmpresasMarvelTMDB();
        }

        const respuestas = await Promise.all([
            cargarPaginaMarvel("movie", 1),
            cargarPaginaMarvel("tv", 1)
        ]);

        peliculasTMDB = respuestas[0].resultados;
        seriesTMDB = respuestas[1].resultados;

        totalPaginasPeliculasTMDB = respuestas[0].totalPaginas;
        totalPaginasSeriesTMDB = respuestas[1].totalPaginas;

        mostrarTipoMarvel("peliculas");
        renderizarFilasInicio();
        renderizarPersonalizadoInicio();
        actualizarInicioPersonalizado();
        actualizarWidgetResumen();
        actualizarBotonCargarMas();
    } catch (error) {
        console.error("Error cargando Marvel:", error);
        catalogo.innerHTML =
            "<p>No se pudo cargar TMDB. Revisa tu clave de API.</p>";
    }
}

async function cargarMasMarvel() {
    if (cargandoMasMarvel) return;

    const tipo = tipoActual === "peliculas" ? "movie" : "tv";
    const paginaActual = tipo === "movie"
        ? paginaPeliculasTMDB
        : paginaSeriesTMDB;
    const totalPaginas = tipo === "movie"
        ? totalPaginasPeliculasTMDB
        : totalPaginasSeriesTMDB;

    if (paginaActual >= totalPaginas) {
        actualizarBotonCargarMas();
        return;
    }

    cargandoMasMarvel = true;
    actualizarBotonCargarMas();

    try {
        const siguientePagina = paginaActual + 1;
        const respuesta = await cargarPaginaMarvel(tipo, siguientePagina);

        if (tipo === "movie") {
            paginaPeliculasTMDB = siguientePagina;
            totalPaginasPeliculasTMDB = respuesta.totalPaginas;
            peliculasTMDB = peliculasTMDB.concat(respuesta.resultados);
        } else {
            paginaSeriesTMDB = siguientePagina;
            totalPaginasSeriesTMDB = respuesta.totalPaginas;
            seriesTMDB = seriesTMDB.concat(respuesta.resultados);
        }

        renderizarCatalogo(
            tipo === "movie" ? peliculasTMDB : seriesTMDB
        );
        renderizarFilasInicio();
        renderizarPersonalizadoInicio();
        actualizarWidgetResumen();
    } catch (error) {
        console.error("Error cargando más Marvel:", error);
    } finally {
        cargandoMasMarvel = false;
        actualizarBotonCargarMas();
    }
}

function crearTarjetaInicio(item) {
    return crearTarjetaMarvel(item, {
        actualizarInicio: true
    });
}

function renderizarFilaInicio(id, lista, cantidad) {
    const contenedor = document.getElementById(id);

    if (!contenedor) return;

    contenedor.innerHTML = "";

    if (!lista || lista.length === 0) {
        contenedor.innerHTML = "<p>No hay contenido disponible.</p>";
        return;
    }

    lista.slice(0, cantidad).forEach(function(item) {
        contenedor.appendChild(crearTarjetaInicio(item));
    });
}

function renderizarFilaFavoritosInicio() {
    const contenedor = document.getElementById("homeFavoritos");
    const stat = document.getElementById("homeStatFavoritos");

    if (!contenedor) return;
    if (stat) stat.textContent = String(obtenerFavoritosMarvel().length);

    contenedor.innerHTML = "";

    if (favoritosMarvel.length === 0) {
        contenedor.innerHTML =
            "<p>❤️ Todavía no tienes favoritos. Guarda películas o series para verlas aquí.</p>";
        return;
    }

    favoritosMarvel.slice(0, 10).forEach(function(item) {
        contenedor.appendChild(crearTarjetaInicio(item));
    });
}

function renderizarDescubreInicio() {
    const contenedor = document.getElementById("homeDescubre");

    if (!contenedor) return;

    const peliculas = peliculasTMDB.slice();
    const series = seriesTMDB.slice();

    const combinadas = peliculas.concat(series);

    combinadas.sort(function(a, b) {
        return (b.vote_average || 0) - (a.vote_average || 0);
    });

    const favoritosIds = favoritosMarvel.map(function(item) {
        return item.id + "-" + item.tipo;
    });

    const descubrimiento = combinadas.filter(function(item) {
        return favoritosIds.indexOf(item.id + "-" + item.tipo) === -1;
    });

    renderizarFilaInicio("homeDescubre", descubrimiento, 10);
}

function renderizarFilasInicio() {
    const populares = peliculasTMDB
        .slice()
        .sort(function(a, b) {
            return (b.popularity || 0) - (a.popularity || 0);
        });

    renderizarFilaInicio("homePeliculas", populares, 4);
}

function mostrarTipoMarvel(tipo) {
    tipoActual = tipo;

    const botonPeliculas = document.getElementById("botonPeliculas");
    const botonSeries = document.getElementById("botonSeries");

    if (botonPeliculas) {
        botonPeliculas.classList.toggle(
            "activo-filtro",
            tipo === "peliculas"
        );
    }

    if (botonSeries) {
        botonSeries.classList.toggle(
            "activo-filtro",
            tipo === "series"
        );
    }

    const lista = tipo === "peliculas"
        ? peliculasTMDB
        : seriesTMDB;

    renderizarCatalogo(lista);
}

function activarBuscador() {
    const buscador = document.getElementById("buscador");
    const orden = document.getElementById("ordenCatalogo");
    const limpiar = document.getElementById("limpiarBusqueda");

    if (buscador) {
        buscador.addEventListener("input", function() {
            const lista = tipoActual === "peliculas"
                ? peliculasTMDB
                : seriesTMDB;

            renderizarCatalogo(lista);
        });
    }

    if (orden) {
        orden.addEventListener("change", function() {
            const lista = tipoActual === "peliculas"
                ? peliculasTMDB
                : seriesTMDB;

            renderizarCatalogo(lista);
        });
    }

    if (limpiar) {
        limpiar.addEventListener("click", function() {
            if (buscador) {
                buscador.value = "";
            }

            const lista = tipoActual === "peliculas"
                ? peliculasTMDB
                : seriesTMDB;

            renderizarCatalogo(lista);
            if (buscador) buscador.focus();
        });
    }
}

function renderizarResultadosBusquedaGlobal(resultados) {
    const contenedor = document.getElementById("resultadosBusquedaGlobal");
    if (!contenedor) return;

    contenedor.innerHTML = "";

    if (!resultados || resultados.length === 0) {
        contenedor.innerHTML =
            "<div class='busqueda-vacia-global'>" +
            "<i data-lucide='search-x'></i>" +
            "<strong>No encontramos resultados</strong>" +
            "<span>Prueba con otro título, personaje o palabra clave.</span>" +
            "</div>";
        actualizarIconosLucide();
        return;
    }

    const cabecera = document.createElement("div");
    cabecera.className = "resultados-global-cabecera";
    cabecera.innerHTML =
        "<div>" +
        "<span class='mini-etiqueta'>RESULTADOS TMDB</span>" +
        "<strong>Encontramos " + resultados.length + " coincidencias</strong>" +
        "</div>" +
        "<span class='resultados-global-fuente'><i data-lucide='database'></i> TMDB</span>";
    contenedor.appendChild(cabecera);

    const rejilla = document.createElement("div");
    rejilla.className = "resultados-global-grid";

    resultados.forEach(function(item) {
        if (item.media_type === "person") {
            const tarjeta = document.createElement("article");
            tarjeta.className = "tarjeta-pelicula resultado-persona";
            tarjeta.innerHTML =
                "<div class='card-media'>" +
                crearPoster(
                    item.profile_path
                        ? TMDB_IMAGE_URL + item.profile_path
                        : "",
                    escaparHTML(item.name || "Sin nombre"),
                    ""
                ) +
                "<span class='card-badge'>Persona</span>" +
                "</div>" +
                "<div class='card-content'>" +
                "<h3>" + escaparHTML(item.name || "Sin nombre") + "</h3>" +
                "<p class='descripcion-pelicula'>Persona relacionada encontrada en TMDB.</p>" +
                "</div>";
            rejilla.appendChild(tarjeta);
            return;
        }

        item.tipo = item.media_type === "tv" ? "tv" : "movie";
        rejilla.appendChild(crearTarjetaMarvel(item));
    });

    contenedor.appendChild(rejilla);
    actualizarIconosLucide();
}

async function buscarMarvelGlobal() {
    const input = document.getElementById("busquedaGlobalMarvel");
    const estado = document.getElementById("estadoBusquedaGlobal");
    const contenedor = document.getElementById("resultadosBusquedaGlobal");

    if (!input || !estado || !contenedor) return;

    const consulta = input.value.trim();

    if (!consulta) {
        estado.textContent = "Escribe un título, personaje o palabra para buscar.";
        contenedor.innerHTML = "";
        return;
    }

    estado.textContent = "⏳ Buscando en TMDB...";
    contenedor.innerHTML = "";

    try {
        const datos = await obtenerTMDB(
            "/search/multi?query=" +
            encodeURIComponent(consulta) +
            "&include_adult=false&language=es-MX&page=1"
        );

        const resultados = (datos.results || [])
            .filter(function(item) {
                return item.media_type === "movie" ||
                    item.media_type === "tv" ||
                    item.media_type === "person";
            })
            .slice(0, 20);

        estado.textContent =
            resultados.length +
            (resultados.length === 1
                ? " resultado encontrado."
                : " resultados encontrados.");

        renderizarResultadosBusquedaGlobal(resultados);
    } catch (error) {
        console.error("Error en búsqueda global:", error);
        estado.textContent = "No se pudo realizar la búsqueda. Revisa tu conexión o clave de TMDB.";
        contenedor.innerHTML = "";
    }
}

function configurarBusquedaGlobal() {
    const input = document.getElementById("busquedaGlobalMarvel");
    const boton = document.getElementById("botonBusquedaGlobal");

    if (boton) {
        boton.addEventListener("click", buscarMarvelGlobal);
    }

    if (input) {
        input.addEventListener("keydown", function(event) {
            if (event.key === "Enter") {
                buscarMarvelGlobal();
            }
        });
    }

    document.addEventListener("keydown", function(event) {
        const activo = document.activeElement;
        const escribiendo =
            activo &&
            (
                activo.tagName === "INPUT" ||
                activo.tagName === "TEXTAREA" ||
                activo.tagName === "SELECT" ||
                activo.isContentEditable
            );

        if (event.key === "/" && !escribiendo) {
            event.preventDefault();

            if (input) {
                input.focus();
                input.select();
            }
        }

        if (event.key === "Escape" && activo === input) {
            input.value = "";
            input.blur();

            const estado = document.getElementById("estadoBusquedaGlobal");
            const contenedor = document.getElementById("resultadosBusquedaGlobal");

            if (estado) estado.textContent = "";
            if (contenedor) contenedor.innerHTML = "";
        }
    });
}

function escaparHTML(valor) {
    return String(valor || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function formatearDuracion(minutos) {
    const total = Number(minutos || 0);

    if (!total) return "Duración no disponible";

    const horas = Math.floor(total / 60);
    const minutosRestantes = total % 60;

    if (horas > 0) {
        return horas + " h " + minutosRestantes + " min";
    }

    return minutosRestantes + " min";
}

function obtenerTrailerTMDB(datos) {
    if (!datos.videos || !Array.isArray(datos.videos.results)) {
        return null;
    }

    const videos = datos.videos.results;

    let trailer = videos.find(function(video) {
        return (
            video.site === "YouTube" &&
            video.type === "Trailer" &&
            video.official === true
        );
    });

    if (!trailer) {
        trailer = videos.find(function(video) {
            return (
                video.site === "YouTube" &&
                video.type === "Trailer"
            );
        });
    }

    if (!trailer) {
        trailer = videos.find(function(video) {
            return video.site === "YouTube";
        });
    }

    return trailer && trailer.key ? trailer : null;
}

function crearRepartoDetalles(datos) {
    const reparto =
        datos.credits &&
        Array.isArray(datos.credits.cast)
            ? datos.credits.cast.slice(0, 8)
            : [];

    if (reparto.length === 0) {
        return "<div class='detalle-seccion'><h3>🎭 Reparto</h3><p class='detalle-vacio'>No hay reparto disponible.</p></div>";
    }

    let html =
        "<div class='detalle-seccion'>" +
        "<h3>🎭 Reparto principal</h3>" +
        "<div class='detalle-reparto'>";

    reparto.forEach(function(persona) {
        const nombre = escaparHTML(persona.name || "Actor");
        const personaje = escaparHTML(persona.character || "Personaje");
        const foto = persona.profile_path
            ? "https://image.tmdb.org/t/p/w185" + persona.profile_path
            : "";

        html +=
            "<div class='detalle-actor'>" +
            (foto
                ? "<img src='" + foto + "' alt='" + nombre + "'>"
                : "<div class='detalle-actor-sin-foto'>👤</div>") +
            "<strong>" + nombre + "</strong>" +
            "<span>" + personaje + "</span>" +
            "</div>";
    });

    html += "</div></div>";

    return html;
}

async function verDetallesTMDB(id, tipo) {
    const modal = document.getElementById("modalMarvel");
    const contenido = document.getElementById("detalleMarvel");

    if (!modal || !contenido) return;

    modal.classList.add("activo");
    contenido.innerHTML =
        "<div class='detalle-cargando'><span>⏳</span><p>Cargando información de TMDB...</p></div>";

    const endpoint = tipo === "tv"
        ? "/tv/" + id + "?append_to_response=videos,credits"
        : "/movie/" + id + "?append_to_response=videos,credits";

    try {
        const datos = await obtenerTMDB(endpoint);
        datos.tipo = tipo;
        guardarVistoRecientemente(datos);
        renderizarHistorialInicio();


        const titulo = escaparHTML(
            datos.title ||
            datos.name ||
            "Sin título"
        );

        const descripcion = escaparHTML(
            datos.overview ||
            "Sin descripción disponible."
        );

        const fecha = escaparHTML(
            datos.release_date ||
            datos.first_air_date ||
            "Sin fecha"
        );

        const puntuacion = datos.vote_average
            ? Number(datos.vote_average).toFixed(1)
            : "N/A";

        const generos = Array.isArray(datos.genres)
            ? datos.genres.map(function(genero) {
                return escaparHTML(genero.name);
            }).join(" • ")
            : "No disponibles";

        const poster = datos.poster_path
            ? TMDB_IMAGE_URL + datos.poster_path
            : "";

        const fondo = datos.backdrop_path
            ? "https://image.tmdb.org/t/p/w1280" + datos.backdrop_path
            : "";

        let meta = "";

        if (tipo === "tv") {
            const temporadas = Number(datos.number_of_seasons || 0);
            const episodios = Number(datos.number_of_episodes || 0);
            const duracion = Array.isArray(datos.episode_run_time) &&
                datos.episode_run_time.length > 0
                ? formatearDuracion(datos.episode_run_time[0])
                : "Duración no disponible";

            meta =
                "<span>📺 " + temporadas + " temporadas</span>" +
                "<span>🎞️ " + episodios + " episodios</span>" +
                "<span>⏱️ " + escaparHTML(duracion) + "</span>";
        } else {
            meta =
                "<span>🎬 Película</span>" +
                "<span>⏱️ " + formatearDuracion(datos.runtime) + "</span>";
        }

        const trailerVideo = obtenerTrailerTMDB(datos);

        let trailer = "";

        if (trailerVideo) {
            trailer =
                "<div class='detalle-seccion'>" +
                "<h3>🎬 Tráiler</h3>" +
                "<div class='trailer-video'>" +
                "<iframe src='https://www.youtube.com/embed/" +
                encodeURIComponent(trailerVideo.key) +
                "' title='Tráiler de " +
                titulo +
                "' allow='accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share' allowfullscreen></iframe>" +
                "</div>" +
                "</div>";
        }

        contenido.innerHTML =
            "<div class='detalle-hero' " +
            (fondo
                ? "style='background-image: linear-gradient(90deg, rgba(8,8,12,.98) 0%, rgba(8,8,12,.82) 55%, rgba(8,8,12,.55) 100%), url(\"" +
                  fondo +
                  "\")'"
                : "") +
            ">" +
            "<div class='detalle-hero-contenido'>" +
            (poster
                ? "<img class='detalle-poster' src='" +
                  poster +
                  "' alt='" +
                  titulo +
                  "'>"
                : "<div class='detalle-poster detalle-poster-vacio'>🎬</div>") +
            "<div class='detalle-principal'>" +
            "<span class='detalle-tipo'>" +
            (tipo === "tv" ? "📺 SERIE" : "🎬 PELÍCULA") +
            "</span>" +
            "<h2>" + titulo + "</h2>" +
            "<div class='detalle-meta'>" +
            meta +
            "<span>📅 " + fecha + "</span>" +
            "<span>⭐ " + puntuacion + "/10</span>" +
            "</div>" +
            "<p class='detalle-generos'>🏷️ " + generos + "</p>" +
            "</div>" +
            "<div class='detalle-acciones'>" +
            "<button id='detalleFavorito' type='button' class='" +
            (esFavoritoMarvel(datos.id, tipo) ? "boton-quitar-favorito" : "boton-favorito") +
            "'><i data-lucide='heart'></i><span>" +
            (esFavoritoMarvel(datos.id, tipo) ? "Quitar de favoritos" : "Añadir a favoritos") +
            "</span></button>" +
            "<button id='detalleCompartir' type='button' class='boton-secundario'><i data-lucide='share-2'></i><span>Compartir</span></button>" +
            "</div>" +
            "</div>" +
            "</div>" +
            "<div class='detalle-cuerpo'>" +
            "<div class='detalle-seccion'>" +
            "<h3>📖 Sinopsis</h3>" +
            "<p class='detalle-sinopsis'>" + descripcion + "</p>" +
            "</div>" +
            crearRepartoDetalles(datos) +
            trailer +
            "</div>";
        
        const botonFavoritoDetalle = document.getElementById("detalleFavorito");
        if (botonFavoritoDetalle) {
            botonFavoritoDetalle.addEventListener("click", function() {
                alternarFavorito(datos.id, tipo, datos);
                const activo = esFavoritoMarvel(datos.id, tipo);
                botonFavoritoDetalle.className = activo
                    ? "boton-quitar-favorito"
                    : "boton-favorito";
                botonFavoritoDetalle.innerHTML =
                    "<i data-lucide='heart'></i><span>" +
                    (activo ? "Quitar de favoritos" : "Añadir a favoritos") +
                    "</span>";
                actualizarIconosLucide();
            });
        }

        const botonCompartirDetalle = document.getElementById("detalleCompartir");
        if (botonCompartirDetalle) {
            botonCompartirDetalle.addEventListener("click", async function() {
                const textoCompartir = "Mira " +
                    (datos.title || datos.name || "este título") +
                    " en ABRAHAM G4 — MARVEL HUB";
                try {
                    if (navigator.share) {
                        await navigator.share({
                            title: datos.title || datos.name || "Marvel Hub",
                            text: textoCompartir
                        });
                    } else if (navigator.clipboard) {
                        await navigator.clipboard.writeText(textoCompartir);
                        botonCompartirDetalle.querySelector("span").textContent = "Copiado";
                        setTimeout(function() {
                            const span = botonCompartirDetalle.querySelector("span");
                            if (span) span.textContent = "Compartir";
                        }, 1400);
                    }
                } catch (error) {
                    console.warn("Compartir cancelado o no disponible:", error);
                }
            });
        }

        actualizarIconosLucide();
    } catch (error) {
        console.error("Error detalles:", error);
        contenido.innerHTML =
            "<div class='detalle-error'>" +
            "<strong>⚠️ No se pudieron cargar los detalles.</strong>" +
            "<p>Revisa tu conexión y vuelve a intentarlo.</p>" +
            "</div>";
    }
}

function cerrarDetalles() {
    const modal = document.getElementById("modalMarvel");

    if (modal) {
        modal.classList.remove("activo");
    }

    const contenido = document.getElementById("detalleMarvel");

    if (contenido) {
        contenido.innerHTML = "";
    }
}

function configurarModal() {
    const modal = document.getElementById("modalMarvel");

    if (!modal) return;

    modal.addEventListener("click", function(event) {
        if (event.target === modal) {
            cerrarDetalles();
        }
    });
}

function configurarTeclado() {
    document.addEventListener("keydown", function(event) {
        if (event.key === "Escape") {
            cerrarDetalles();
        }
    });
}

function recomendacionLocalFallback() {
    const recomendaciones = [
        {
            titulo: "Spider-Man: No Way Home",
            descripcion: "Peter Parker enfrenta las consecuencias de revelar su identidad y se encuentra con enemigos de otros universos."
        },
        {
            titulo: "Avengers: Endgame",
            descripcion: "Los Vengadores intentan revertir las consecuencias del chasquido de Thanos."
        },
        {
            titulo: "Guardians of the Galaxy",
            descripcion: "Un grupo de personajes muy diferentes termina formando un equipo para salvar la galaxia."
        },
        {
            titulo: "Iron Man",
            descripcion: "Tony Stark cambia su vida después de construir una poderosa armadura."
        }
    ];

    const indice = new Date().getDate() % recomendaciones.length;
    const item = recomendaciones[indice];

    document.getElementById("recomendacion").textContent = item.titulo;
    document.getElementById("descripcion").textContent = item.descripcion;
    document.getElementById("recomendacionPoster").innerHTML = "";
}

function mostrarRecomendacion(item) {
    const titulo =
        item.title ||
        item.name ||
        "Sin título";

    const descripcion =
        item.overview ||
        "Sin descripción disponible.";

    const recomendacion = document.getElementById("recomendacion");
    const descripcionElemento = document.getElementById("descripcion");
    const poster = document.getElementById("recomendacionPoster");
    const hero = document.querySelector(".hero");
    const portada = document.querySelector(".inicio-portada");

    if (portada) {
        if (item.backdrop_path) {
            portada.style.setProperty("--portada-imagen", "url(https://image.tmdb.org/t/p/w1280" + item.backdrop_path + ")");
            portada.classList.add("portada-con-imagen");
        } else {
            portada.style.removeProperty("--portada-imagen");
            portada.classList.remove("portada-con-imagen");
        }
    }

    if (recomendacion) {
        recomendacion.textContent = titulo;
    }
    const metaTitulo = document.querySelector(".portada-contenido h2");
    if (metaTitulo && item.vote_average) {
        metaTitulo.setAttribute("data-calificacion", "TMDB " + Number(item.vote_average).toFixed(1) + "/10");
    }

    if (descripcionElemento) {
        descripcionElemento.textContent = descripcion;
    }

    if (poster) {
        poster.innerHTML = item.poster_path
            ? "<img class='poster-recomendacion' src='" +
              TMDB_IMAGE_URL +
              item.poster_path +
              "' alt='" +
              titulo.replace(/'/g, "&#39;") +
              "'>"
            : "<div class='poster-faltante'>🎬</div>";
    }

    if (hero) {
        if (item.backdrop_path) {
            hero.style.backgroundImage =
                "linear-gradient(90deg, rgba(11,11,15,.98) 0%, rgba(11,11,15,.88) 48%, rgba(11,11,15,.62) 100%), url('" +
                "https://image.tmdb.org/t/p/w1280" +
                item.backdrop_path +
                "')";
            hero.classList.add("hero-con-imagen");
        } else {
            hero.style.backgroundImage = "";
            hero.classList.remove("hero-con-imagen");
        }
    }
}

async function recomendacionTMDB() {
    try {
        if (!TMDB_API_KEY || TMDB_API_KEY === "TU_CLAVE_API") {
            recomendacionLocalFallback();
            return;
        }

        const datos = await obtenerTMDB(
            "/discover/movie?sort_by=popularity.desc&include_adult=false&with_companies=420&page=1"
        );

        if (!datos.results || datos.results.length === 0) {
            recomendacionLocalFallback();
            return;
        }

        const fecha = new Date();
        const indice =
            (fecha.getDate() +
            fecha.getMonth() +
            fecha.getFullYear()) %
            datos.results.length;

        mostrarRecomendacion(datos.results[indice]);
    } catch (error) {
        console.error("Error recomendación:", error);
        recomendacionLocalFallback();
    }
}

async function nuevaRecomendacion() {
    try {
        if (!TMDB_API_KEY || TMDB_API_KEY === "TU_CLAVE_API") {
            recomendacionLocalFallback();
            return;
        }

        const datos = await obtenerTMDB(
            "/discover/movie?sort_by=popularity.desc&include_adult=false&with_companies=420&page=1"
        );

        if (!datos.results || datos.results.length === 0) return;

        const indice = Math.floor(
            Math.random() * datos.results.length
        );

        mostrarRecomendacion(datos.results[indice]);
    } catch (error) {
        console.error("Error nueva recomendación:", error);
    }
}

async function cargarProximosEstrenos() {
    const contenedor =
        document.getElementById("proximosEstrenos");

    if (!contenedor) return;

    if (!TMDB_API_KEY || TMDB_API_KEY === "TU_CLAVE_API") {
        contenedor.innerHTML =
            "<p>Configura tu clave de TMDB para mostrar próximos estrenos.</p>";
        return;
    }

    const ahora = new Date();
    const hoy =
        ahora.getFullYear() +
        "-" +
        String(ahora.getMonth() + 1).padStart(2, "0") +
        "-" +
        String(ahora.getDate()).padStart(2, "0");

    try {
        const datos = await obtenerTMDB(
            "/discover/movie?sort_by=primary_release_date.asc&include_adult=false&with_companies=420&primary_release_date.gte=" +
            hoy +
            "&region=MX&page=1"
        );

        contenedor.innerHTML = "";

        if (!datos.results || datos.results.length === 0) {
            contenedor.innerHTML =
                "<p>No hay próximos estrenos disponibles.</p>";
            return;
        }

        datos.results.slice(0, 10).forEach(function(item) {
            const tarjeta = document.createElement("article");
            tarjeta.className = "tarjeta-pelicula";

            const titulo = item.title || "Sin título";
            const fecha = item.release_date || "Sin fecha";
            const descripcion =
                item.overview ||
                "Sin descripción disponible.";

            tarjeta.innerHTML =
                crearPoster(
                    item.poster_path
                        ? TMDB_IMAGE_URL + item.poster_path
                        : "",
                    titulo,
                    ""
                ) +
                "<div class='card-content'>" +
                "<h3>" +
                titulo +
                "</h3>" +
                "<p class='tipo-contenido'>🎬 Marvel Studios</p>" +
                "<p>📅 " +
                fecha +
                "</p>" +
                "<p class='descripcion-pelicula'>" +
                descripcion +
                "</p>" +
                "<div class='botones-card'>" +
                "<button class='boton-detalles-estreno'>Ver detalles</button>" +
                "</div>" +
                "</div>";

            tarjeta.querySelector(".boton-detalles-estreno")
                .addEventListener("click", function() {
                    verDetallesTMDB(item.id, "movie");
                });

            contenedor.appendChild(tarjeta);
        });
    } catch (error) {
        console.error("Error próximos estrenos:", error);
        contenedor.innerHTML =
            "<p>No se pudieron cargar los próximos estrenos.</p>";
    }
}


const SUPABASE_URL = window.MARVEL_HUB_SUPABASE_URL || "";
const SUPABASE_PUBLISHABLE_KEY = window.MARVEL_HUB_SUPABASE_PUBLISHABLE_KEY || "";
let supabaseClient = null;
let sincronizacionEnCurso = false;

function actualizarEstadoCuentaVisual(usuario, sincronizando) {
    const punto = document.getElementById("cuentaPuntoEstado");
    if (!punto) return;
    punto.classList.remove("estado-esperando", "estado-activo", "estado-error", "estado-sync");
    if (sincronizando) {
        punto.classList.add("estado-sync");
    } else if (usuario) {
        punto.classList.add("estado-activo");
    } else {
        punto.classList.add("estado-esperando");
    }
}

function actualizarUltimaSincronizacion() {
    const elemento = document.getElementById("cuentaUltimaSync");
    if (!elemento) return;
    const hora = new Date().toLocaleTimeString("es-MX", {
        hour: "2-digit",
        minute: "2-digit"
    });
    elemento.textContent = "Última: " + hora;
}

function actualizarEstadoSincronizacion(mensaje, error) {
    const estado = document.getElementById("cuentaSincronizacion");

    if (!estado) return;

    estado.textContent = mensaje || "";
    estado.classList.toggle("cuenta-mensaje-error", Boolean(error));
}

function configurarClienteSupabase() {
    if (
        typeof window.supabase === "undefined" ||
        !SUPABASE_URL ||
        !SUPABASE_PUBLISHABLE_KEY
    ) {
        supabaseClient = null;
        return false;
    }

    try {
        supabaseClient = window.supabase.createClient(
            SUPABASE_URL,
            SUPABASE_PUBLISHABLE_KEY,
            {
                auth: {
                    persistSession: true,
                    autoRefreshToken: true,
                    detectSessionInUrl: true
                }
            }
        );
        return true;
    } catch (error) {
        console.error("No se pudo iniciar Supabase:", error);
        supabaseClient = null;
        return false;
    }
}

async function obtenerUsuarioSupabase() {
    if (!supabaseClient) return null;

    const resultado = await supabaseClient.auth.getUser();

    if (resultado.error) {
        return null;
    }

    return resultado.data.user || null;
}

function convertirFavoritoANube(item, userId) {
    return {
        user_id: userId,
        media_id: Number(item.id),
        media_type: item.tipo === "tv" ? "tv" : "movie",
        title: item.titulo || "",
        poster_path: item.poster_path || "",
        backdrop_path: item.backdrop_path || "",
        overview: item.overview || "",
        release_date: item.fecha || "",
        vote_average: Number(item.vote_average || 0),
        saved_at: new Date(Number(item.guardadoEn || Date.now())).toISOString()
    };
}

function convertirHistorialANube(item, userId) {
    return {
        user_id: userId,
        media_id: Number(item.id),
        media_type: item.tipo === "tv" ? "tv" : "movie",
        title: item.titulo || "",
        poster_path: item.poster_path || "",
        backdrop_path: item.backdrop_path || "",
        overview: item.overview || "",
        release_date: item.fecha || "",
        vote_average: Number(item.vote_average || 0),
        viewed_at: new Date(Number(item.vistoEn || Date.now())).toISOString()
    };
}

function convertirFavoritoDesdeNube(item) {
    return {
        id: Number(item.media_id),
        tipo: item.media_type,
        titulo: item.title || "Sin título",
        poster_path: item.poster_path || "",
        backdrop_path: item.backdrop_path || "",
        overview: item.overview || "",
        fecha: item.release_date || "",
        vote_average: Number(item.vote_average || 0),
        guardadoEn: new Date(item.saved_at || Date.now()).getTime()
    };
}

function convertirHistorialDesdeNube(item) {
    return {
        id: Number(item.media_id),
        tipo: item.media_type,
        titulo: item.title || "Sin título",
        poster_path: item.poster_path || "",
        backdrop_path: item.backdrop_path || "",
        overview: item.overview || "",
        fecha: item.release_date || "",
        vote_average: Number(item.vote_average || 0),
        vistoEn: new Date(item.viewed_at || Date.now()).getTime()
    };
}

async function sincronizarPerfilConNube(userId) {
    const local = obtenerPerfilLocal();

    const resultado = await supabaseClient
        .from("profiles")
        .select("id, display_name, avatar, created_at, updated_at")
        .eq("id", userId)
        .maybeSingle();

    if (resultado.error) {
        throw resultado.error;
    }

    const remoto = resultado.data;

    if (!remoto) {
        const subidaPerfil = await supabaseClient.from("profiles").upsert({
            id: userId,
            display_name: local.nombre || "",
            avatar: local.avatar || "ironman",
            created_at: local.creadoEn || new Date().toISOString(),
            updated_at: local.actualizadoEn || new Date().toISOString()
        });

        if (subidaPerfil.error) {
            throw subidaPerfil.error;
        }

        return;
    }

    const localEsBase =
        !local.nombre &&
        (local.avatar || "ironman") === "🦸";

    const fechaLocal = new Date(local.actualizadoEn || 0).getTime();
    const fechaRemota = new Date(remoto.updated_at || 0).getTime();

    if (localEsBase || fechaRemota > fechaLocal) {
        guardarPerfilLocal({
            id: local.id,
            nombre: remoto.display_name || "",
            avatar: remoto.avatar || "ironman"
        });
        return;
    }

    const subidaPerfil = await supabaseClient.from("profiles").upsert({
        id: userId,
        display_name: local.nombre || "",
        avatar: local.avatar || "ironman",
        created_at: remoto.created_at || local.creadoEn || new Date().toISOString(),
        updated_at: local.actualizadoEn || new Date().toISOString()
    });

    if (subidaPerfil.error) {
        throw subidaPerfil.error;
    }
}

async function sincronizarFavoritosConNube(userId) {
    const resultado = await supabaseClient
        .from("favorites")
        .select("*")
        .eq("user_id", userId);

    if (resultado.error) {
        throw resultado.error;
    }

    const mapa = new Map();

    favoritosMarvel.forEach(function(item) {
        mapa.set(item.tipo + ":" + item.id, item);
    });

    (resultado.data || []).forEach(function(item) {
        const remoto = convertirFavoritoDesdeNube(item);
        const clave = remoto.tipo + ":" + remoto.id;
        const local = mapa.get(clave);

        if (!local || remoto.guardadoEn > Number(local.guardadoEn || 0)) {
            mapa.set(clave, remoto);
        }
    });

    favoritosMarvel = Array.from(mapa.values());
    favoritosMarvel.sort(function(a, b) {
        return Number(b.guardadoEn || 0) - Number(a.guardadoEn || 0);
    });

    guardarFavoritos();

    const filas = favoritosMarvel.map(function(item) {
        return convertirFavoritoANube(item, userId);
    });

    if (filas.length > 0) {
        const subida = await supabaseClient
            .from("favorites")
            .upsert(filas, {
                onConflict: "user_id,media_id,media_type"
            });

        if (subida.error) {
            throw subida.error;
        }
    }
}

async function sincronizarHistorialConNube(userId) {
    const resultado = await supabaseClient
        .from("history")
        .select("*")
        .eq("user_id", userId);

    if (resultado.error) {
        throw resultado.error;
    }

    const mapa = new Map();

    obtenerHistorialMarvel().forEach(function(item) {
        mapa.set(item.tipo + ":" + item.id, item);
    });

    (resultado.data || []).forEach(function(item) {
        const remoto = convertirHistorialDesdeNube(item);
        const clave = remoto.tipo + ":" + remoto.id;
        const local = mapa.get(clave);

        if (!local || remoto.vistoEn > Number(local.vistoEn || 0)) {
            mapa.set(clave, remoto);
        }
    });

    const combinado = Array.from(mapa.values());

    combinado.sort(function(a, b) {
        return Number(b.vistoEn || 0) - Number(a.vistoEn || 0);
    });

    const historialLocal = combinado.slice(0, 12);

    localStorage.setItem(
        "historialMarvel",
        JSON.stringify(historialLocal)
    );

    const filas = combinado.map(function(item) {
        return convertirHistorialANube(item, userId);
    });

    if (filas.length > 0) {
        const subida = await supabaseClient
            .from("history")
            .upsert(filas, {
                onConflict: "user_id,media_id,media_type"
            });

        if (subida.error) {
            throw subida.error;
        }
    }
}

async function sincronizarCuentaConNube(user) {
    if (!supabaseClient || !user || sincronizacionEnCurso) return;

    sincronizacionEnCurso = true;
    actualizarEstadoSincronizacion("☁️ Sincronizando perfil, favoritos e historial...");

    try {
        await sincronizarPerfilConNube(user.id);
        await sincronizarFavoritosConNube(user.id);
        await sincronizarHistorialConNube(user.id);

        actualizarPerfilUI();
        actualizarCuentaUI(user);
        actualizarInicioPersonalizado();
        actualizarResumenAjustes();
        renderizarFilaFavoritosInicio();
        renderizarPersonalizadoInicio();
        renderizarHistorialInicio();

        actualizarEstadoSincronizacion(
            "☁️ Sincronización activa. Tus datos se guardan en tu cuenta."
        );
    } catch (error) {
        console.error("Error de sincronización:", error);
        const mensaje = error && error.message
            ? error.message
            : "Error desconocido de Supabase.";

        actualizarEstadoSincronizacion(
            "⚠️ Error de sincronización: " + mensaje,
            true
        );
    } finally {
        sincronizacionEnCurso = false;
    }
}

async function sincronizarCuentaConNubeActual() {
    if (!supabaseClient) {
        actualizarEstadoSincronizacion(
            "Primero configura Supabase en supabase-config.js.",
            true
        );
        return;
    }

    const user = await obtenerUsuarioSupabase();

    if (!user) {
        actualizarEstadoSincronizacion(
            "Inicia sesión para sincronizar tus datos.",
            true
        );
        return;
    }

    await sincronizarCuentaConNube(user);
}

async function sincronizarFavoritoActual(id, tipo) {
    if (!supabaseClient) return;

    const user = await obtenerUsuarioSupabase();
    if (!user) return;

    const favorito = favoritosMarvel.find(function(item) {
        return item.id === id && item.tipo === tipo;
    });

    try {
        if (favorito) {
            const resultado = await supabaseClient
                .from("favorites")
                .upsert(
                    convertirFavoritoANube(favorito, user.id),
                    {
                        onConflict: "user_id,media_id,media_type"
                    }
                );

            if (resultado.error) throw resultado.error;
        } else {
            const resultado = await supabaseClient
                .from("favorites")
                .delete()
                .eq("user_id", user.id)
                .eq("media_id", Number(id))
                .eq("media_type", tipo === "tv" ? "tv" : "movie");

            if (resultado.error) throw resultado.error;
        }
    } catch (error) {
        console.error("No se pudo sincronizar el favorito:", error);
    }
}

async function sincronizarFavoritosVacios() {
    if (!supabaseClient) return;

    const user = await obtenerUsuarioSupabase();
    if (!user) return;

    const resultado = await supabaseClient
        .from("favorites")
        .delete()
        .eq("user_id", user.id);

    if (resultado.error) {
        console.error("No se pudieron limpiar los favoritos en la nube:", resultado.error);
    }
}

async function sincronizarHistorialVacio() {
    if (!supabaseClient) return;

    const user = await obtenerUsuarioSupabase();
    if (!user) return;

    const resultado = await supabaseClient
        .from("history")
        .delete()
        .eq("user_id", user.id);

    if (resultado.error) {
        console.error("No se pudo limpiar el historial en la nube:", resultado.error);
    }
}

async function sincronizarPerfilLocalActual() {
    if (!supabaseClient) return;

    const user = await obtenerUsuarioSupabase();
    if (!user) return;

    try {
        const perfil = obtenerPerfilLocal();

        const resultado = await supabaseClient
            .from("profiles")
            .upsert({
                id: user.id,
                display_name: perfil.nombre || "",
                avatar: perfil.avatar || "ironman",
                updated_at: perfil.actualizadoEn || new Date().toISOString()
            });

        if (resultado.error) throw resultado.error;

        actualizarEstadoSincronizacion("☁️ Perfil actualizado en tu cuenta.");
    } catch (error) {
        console.error("No se pudo sincronizar el perfil:", error);
        actualizarEstadoSincronizacion(
            "No se pudo actualizar el perfil en la nube.",
            true
        );
    }
}

function actualizarCuentaUI(usuario) {
    const estado = document.getElementById("cuentaEstado");
    const formularios = document.getElementById("cuentaFormularios");
    const usuarioPanel = document.getElementById("cuentaUsuario");
    const email = document.getElementById("cuentaEmail");
    const uid = document.getElementById("cuentaUid");
    const avatar = document.getElementById("cuentaAvatar");

    if (!estado || !formularios || !usuarioPanel) return;

    if (!supabaseClient) {
        estado.textContent = "⚙️ Falta configurar Supabase. La cuenta real está preparada, pero aún no está conectada.";
        formularios.hidden = false;
        usuarioPanel.hidden = true;
        return;
    }

    if (usuario) {
        estado.textContent = "✅ Sesión iniciada.";
        formularios.hidden = true;
        usuarioPanel.hidden = false;

        if (email) email.textContent = usuario.email || "Usuario";
        if (uid) uid.textContent = "ID: " + usuario.id;

        const perfil = obtenerPerfilLocal();
        if (avatar) avatar.textContent = perfil.avatar || "ironman";
    } else {
        estado.textContent = "Inicia sesión o crea una cuenta para preparar la sincronización.";
        formularios.hidden = false;
        usuarioPanel.hidden = true;
    }
}

function mostrarMensajeCuenta(mensaje, error) {
    const elemento = document.getElementById("cuentaMensaje");
    if (!elemento) return;

    elemento.textContent = mensaje || "";
    elemento.classList.toggle("cuenta-mensaje-error", Boolean(error));
}

async function iniciarSesionCuenta() {
    if (!supabaseClient) {
        mostrarMensajeCuenta("Primero configura Supabase en supabase-config.js.", true);
        return;
    }

    const email = document.getElementById("loginEmail");
    const password = document.getElementById("loginPassword");

    if (!email || !password) {
        mostrarMensajeCuenta("No se encontraron los campos de inicio de sesión.", true);
        return;
    }

    const correo = email.value.trim();

    if (!correo || !password.value) {
        mostrarMensajeCuenta("Escribe tu correo y contraseña.", true);
        return;
    }

    mostrarMensajeCuenta("⏳ Iniciando sesión...");

    try {
        const resultado = await supabaseClient.auth.signInWithPassword({
            email: correo,
            password: password.value
        });

        if (resultado.error) {
            console.error("Supabase signIn:", resultado.error);
            const mensaje = resultado.error.message || "";
            if (mensaje.toLowerCase().includes("email not confirmed")) {
                mostrarMensajeCuenta("📩 Primero confirma tu correo electrónico desde el mensaje que te envió Supabase.", true);
            } else if (mensaje.toLowerCase().includes("invalid login credentials")) {
                mostrarMensajeCuenta("❌ Correo o contraseña incorrectos.", true);
            } else {
                mostrarMensajeCuenta("❌ Supabase: " + mensaje, true);
            }
            return;
        }

        password.value = "";
        mostrarMensajeCuenta("✅ Sesión iniciada correctamente.");
    } catch (error) {
        console.error("Error de inicio de sesión:", error);
        mostrarMensajeCuenta("❌ No se pudo conectar con Supabase. Revisa la consola del navegador.", true);
    }
}

async function registrarCuenta() {
    if (!supabaseClient) {
        mostrarMensajeCuenta("Primero configura Supabase en supabase-config.js.", true);
        return;
    }

    const email = document.getElementById("registroEmail");
    const password = document.getElementById("registroPassword");

    if (!email || !password) {
        mostrarMensajeCuenta("No se encontraron los campos de registro.", true);
        return;
    }

    const correo = email.value.trim();

    if (!correo || !password.value) {
        mostrarMensajeCuenta("Escribe un correo y una contraseña.", true);
        return;
    }

    mostrarMensajeCuenta("⏳ Creando cuenta...");

    try {
        const resultado = await supabaseClient.auth.signUp({
            email: correo,
            password: password.value,
            options: {
                data: {
                    nombre: obtenerPerfilLocal().nombre || "ABRAHAM G4"
                }
            }
        });

        if (resultado.error) {
            console.error("Supabase signUp:", resultado.error);
            const mensaje = resultado.error.message || "";
            if (mensaje.toLowerCase().includes("user already registered")) {
                mostrarMensajeCuenta("ℹ️ Ese correo ya tiene una cuenta. Usa Iniciar sesión.", true);
            } else {
                mostrarMensajeCuenta("❌ Supabase: " + mensaje, true);
            }
            return;
        }

        password.value = "";

        if (resultado.data.session) {
            mostrarMensajeCuenta("✅ Cuenta creada y sesión iniciada.");
        } else {
            mostrarMensajeCuenta("📩 Cuenta creada. Revisa tu correo para confirmar la cuenta.");
        }
    } catch (error) {
        console.error("Error al crear cuenta:", error);
        mostrarMensajeCuenta("❌ No se pudo conectar con Supabase. Revisa la consola del navegador.", true);
    }
}

async function recuperarCuenta() {
    if (!supabaseClient) {
        mostrarMensajeCuenta("Primero configura Supabase en supabase-config.js.", true);
        return;
    }

    const email = document.getElementById("loginEmail");

    if (!email || !email.value.trim()) {
        mostrarMensajeCuenta("Escribe primero tu correo para recuperar la contraseña.", true);
        return;
    }

    mostrarMensajeCuenta("⏳ Enviando instrucciones...");

    const resultado = await supabaseClient.auth.resetPasswordForEmail(
        email.value.trim(),
        {
            redirectTo: window.location.origin + window.location.pathname
        }
    );

    if (resultado.error) {
        console.error(resultado.error);
        mostrarMensajeCuenta("No se pudo enviar el correo de recuperación.", true);
        return;
    }

    mostrarMensajeCuenta("📩 Revisa tu correo para continuar con la recuperación.");
}

async function cerrarSesionCuenta() {
    if (!supabaseClient) return;

    const resultado = await supabaseClient.auth.signOut();

    if (resultado.error) {
        console.error(resultado.error);
        mostrarMensajeCuenta("No se pudo cerrar la sesión.", true);
        return;
    }

    mostrarMensajeCuenta("Sesión cerrada.");
}

function cambiarModoCuenta(modo) {
    const login = document.getElementById("formLogin");
    const registro = document.getElementById("formRegistro");
    const botonLogin = document.getElementById("modoLoginCuenta");
    const botonRegistro = document.getElementById("modoRegistroCuenta");
    const esRegistro = modo === "registro";
    if (login) login.hidden = esRegistro;
    if (registro) registro.hidden = !esRegistro;
    if (botonLogin) {
        botonLogin.classList.toggle("activo", !esRegistro);
        botonLogin.setAttribute("aria-selected", String(!esRegistro));
    }
    if (botonRegistro) {
        botonRegistro.classList.toggle("activo", esRegistro);
        botonRegistro.setAttribute("aria-selected", String(esRegistro));
    }
}

async function configurarCuenta() {
    const conectado = configurarClienteSupabase();
    const formLogin = document.getElementById("formLogin");
    const formRegistro = document.getElementById("formRegistro");
    const recuperar = document.getElementById("botonRecuperar");
    const cerrar = document.getElementById("botonCerrarSesion");
    const sincronizar = document.getElementById("botonSincronizarCuenta");
    const modoLogin = document.getElementById("modoLoginCuenta");
    const modoRegistro = document.getElementById("modoRegistroCuenta");

    if (formLogin) {
        formLogin.addEventListener("submit", function(event) {
            event.preventDefault();
            iniciarSesionCuenta();
        });
    }

    if (formRegistro) {
        formRegistro.addEventListener("submit", function(event) {
            event.preventDefault();
            registrarCuenta();
        });
    }

    if (recuperar) {
        recuperar.addEventListener("click", recuperarCuenta);
    }

    if (cerrar) {
        cerrar.addEventListener("click", cerrarSesionCuenta);
    }

    if (sincronizar) {
        sincronizar.addEventListener("click", sincronizarCuentaConNubeActual);
    }
    if (modoLogin) {
        modoLogin.addEventListener("click", function() {
            cambiarModoCuenta("login");
        });
    }
    if (modoRegistro) {
        modoRegistro.addEventListener("click", function() {
            cambiarModoCuenta("registro");
        });
    }
    cambiarModoCuenta("login");

    if (!conectado) {
        actualizarEstadoSincronizacion(
            "Configura Supabase en supabase-config.js para activar la nube.",
            true
        );
        actualizarCuentaUI(null);
        return;
    }

    supabaseClient.auth.onAuthStateChange(function(event, session) {
        const usuario = session ? session.user : null;
        actualizarCuentaUI(usuario);

        if (usuario && event !== "SIGNED_OUT") {
            sincronizarCuentaConNube(usuario);
        } else if (event === "SIGNED_OUT") {
            actualizarEstadoSincronizacion("Sesión cerrada. Los datos locales siguen disponibles.");
        }
    });

    const resultado = await supabaseClient.auth.getSession();

    if (resultado.error) {
        console.error(resultado.error);
        actualizarCuentaUI(null);
        return;
    }

    const usuario = resultado.data.session
        ? resultado.data.session.user
        : null;

    actualizarCuentaUI(usuario);

    if (usuario) {
        await sincronizarCuentaConNube(usuario);
    }
}

const PERFIL_LOCAL_KEY = "perfilMarvel";

function obtenerPerfilLocal() {
    let perfil = null;

    try {
        perfil = JSON.parse(localStorage.getItem(PERFIL_LOCAL_KEY) || "null");
    } catch (error) {
        perfil = null;
    }

    if (!perfil || typeof perfil !== "object") {
        perfil = {
            id: window.crypto && typeof window.crypto.randomUUID === "function"
                ? window.crypto.randomUUID()
                : "perfil-" + Date.now() + "-" + Math.random().toString(36).slice(2, 10),
            nombre: localStorage.getItem("nombre") || "",
            avatar: "ironman",
            creadoEn: new Date().toISOString(),
            actualizadoEn: new Date().toISOString(),
            version: 1
        };

        localStorage.setItem(PERFIL_LOCAL_KEY, JSON.stringify(perfil));
    }

    return perfil;
}

function guardarPerfilLocal(perfil) {
    const base = obtenerPerfilLocal();

    const datos = {
        id: perfil.id || base.id,
        nombre: String(perfil.nombre || "").trim().slice(0, 30),
        avatar: perfil.avatar || base.avatar || "ironman",
        creadoEn: base.creadoEn || new Date().toISOString(),
        actualizadoEn: new Date().toISOString(),
        version: 1
    };

    localStorage.setItem(PERFIL_LOCAL_KEY, JSON.stringify(datos));
    localStorage.setItem("nombre", datos.nombre);
    return datos;
}

function actualizarPerfilUI() {
    const perfil = obtenerPerfilLocal();
    const nombre = perfil.nombre || "ABRAHAM G4";
    const avatar = perfil.avatar || "ironman";

    const titulo = document.getElementById("perfilNombre");
    const input = document.getElementById("perfilNombreInput");
    const avatarElemento = document.getElementById("perfilAvatar");
    const estado = document.getElementById("perfilEstado");
    const id = document.getElementById("perfilId");
    const resumen = document.getElementById("perfilDatosResumen");
    const statFavoritos = document.getElementById("perfilStatFavoritos");
    const statHistorial = document.getElementById("perfilStatHistorial");
    const statPeliculas = document.getElementById("perfilStatPeliculas");
    const statSeries = document.getElementById("perfilStatSeries");

    if (titulo) titulo.textContent = nombre;
    if (input) input.value = perfil.nombre;
    if (avatarElemento) {
        avatarElemento.textContent = "";
        avatarElemento.setAttribute("data-avatar", avatar);
        avatarElemento.setAttribute("aria-label", "Avatar de " + nombre);
    }

    if (estado) {
        estado.textContent = perfil.nombre
            ? "Perfil local activo en este dispositivo."
            : "Usando el perfil base del Hub en este dispositivo.";
    }

    if (id) id.textContent = perfil.id;

    const historial = obtenerHistorialMarvel();
    const peliculas = favoritosMarvel.filter(function(item) {
        return item.tipo === "movie";
    }).length;
    const series = favoritosMarvel.filter(function(item) {
        return item.tipo === "tv";
    }).length;

    if (resumen) {
        resumen.textContent =
            favoritosMarvel.length +
            " favoritos • " +
            historial.length +
            " vistos recientemente";
    }

    if (statFavoritos) statFavoritos.textContent = favoritosMarvel.length;
    if (statHistorial) statHistorial.textContent = historial.length;
    if (statPeliculas) statPeliculas.textContent = peliculas;
    if (statSeries) statSeries.textContent = series;

    document.querySelectorAll(".perfil-avatar-opcion").forEach(function(boton) {
        boton.classList.toggle(
            "activo-perfil-avatar",
            boton.dataset.avatar === avatar
        );
    });
}

function guardarPerfilDesdeUI() {
    const input = document.getElementById("perfilNombreInput");
    const seleccionado = document.querySelector(".perfil-avatar-opcion.activo-perfil-avatar");
    const perfil = obtenerPerfilLocal();

    perfil.nombre = input ? input.value.trim() : perfil.nombre;
    perfil.avatar = seleccionado ? seleccionado.dataset.avatar : perfil.avatar;

    const guardado = guardarPerfilLocal(perfil);

    actualizarPerfilUI();
    actualizarSaludoInicio();
    actualizarInicioPersonalizado();
    actualizarResumenAjustes();

    const estado = document.getElementById("perfilEstado");
    if (estado) {
        estado.textContent = "Perfil guardado correctamente en este dispositivo.";
    }

    sincronizarPerfilLocalActual();
    return guardado;
}

function restablecerPerfilLocal() {
    const confirmar = window.confirm(
        "¿Quieres restablecer tu perfil local? Se borrará el nombre y volverá el avatar predeterminado."
    );

    if (!confirmar) return;

    const perfil = obtenerPerfilLocal();
    perfil.nombre = "";
    perfil.avatar = "ironman";

    guardarPerfilLocal(perfil);
    actualizarPerfilUI();
    actualizarSaludoInicio();
    actualizarInicioPersonalizado();
    actualizarResumenAjustes();
}

function configurarPerfil() {
    obtenerPerfilLocal();
    actualizarPerfilUI();

    const guardar = document.getElementById("guardarPerfil");
    const restablecer = document.getElementById("restablecerPerfil");
    const input = document.getElementById("perfilNombreInput");
    const exportar = document.getElementById("exportarDatosPerfil");

    document.querySelectorAll(".perfil-avatar-opcion").forEach(function(boton) {
        boton.addEventListener("click", function() {
            document.querySelectorAll(".perfil-avatar-opcion").forEach(function(opcion) {
                opcion.classList.remove("activo-perfil-avatar");
            });

            this.classList.add("activo-perfil-avatar");
            const avatar = document.getElementById("perfilAvatar");
            if (avatar) { avatar.textContent = ""; avatar.setAttribute("data-avatar", this.dataset.avatar); }
        });
    });

    if (guardar) {
        guardar.addEventListener("click", function() {
            guardarPerfilDesdeUI();
        });
    }

    if (input) {
        input.addEventListener("keydown", function(event) {
            if (event.key === "Enter") {
                guardarPerfilDesdeUI();
            }
        });
    }

    if (restablecer) {
        restablecer.addEventListener("click", restablecerPerfilLocal);
    }

    if (exportar) {
        exportar.addEventListener("click", function() {
            const perfil = obtenerPerfilLocal();
            const datos = {
                exportadoEn: new Date().toISOString(),
                perfil: perfil,
                favoritos: favoritosMarvel,
                historial: obtenerHistorialMarvel(),
                tema: localStorage.getItem("tema") || "oscuro",
                widgets: JSON.parse(localStorage.getItem("widgetsMarvel") || "{}")
            };

            const blob = new Blob(
                [JSON.stringify(datos, null, 2)],
                { type: "application/json" }
            );
            const url = URL.createObjectURL(blob);
            const enlace = document.createElement("a");

            enlace.href = url;
            enlace.download = "abraham-g4-marvel-hub-datos.json";
            document.body.appendChild(enlace);
            enlace.click();
            enlace.remove();

            setTimeout(function() {
                URL.revokeObjectURL(url);
            }, 1000);
        });
    }
}

function guardarNombre() {
    const input = document.getElementById("nombre");

    if (!input) return;

    const nombre = input.value.trim();

    const perfil = obtenerPerfilLocal();
    perfil.nombre = nombre;
    guardarPerfilLocal(perfil);
    sincronizarPerfilLocalActual();

    actualizarSaludoInicio();
    actualizarInicioPersonalizado();
    actualizarResumenAjustes();
    alert("Nombre guardado correctamente 👍");
}

function actualizarResumenAjustes() {
    const resumen = document.getElementById("ajusteFavoritosResumen");
    if (resumen) {
        resumen.textContent =
            favoritosMarvel.length +
            (favoritosMarvel.length === 1 ? " favorito guardado." : " favoritos guardados.");
    }

    const estado = document.getElementById("estadoNombre");
    const nombre = localStorage.getItem("nombre") || "";

    if (estado) {
        estado.textContent = nombre
            ? "Tu nombre está guardado en este dispositivo."
            : "Todavía no has configurado un nombre.";
    }
}

function actualizarBotonTema() {
    const boton = document.getElementById("botonTema");
    if (!boton) return;

    boton.textContent = document.body.classList.contains("tema-claro")
        ? "🌙 Usar tema oscuro"
        : "☀️ Usar tema claro";
}

function actualizarEstadoPWAEnAjustes() {
    const estado = document.getElementById("estadoPWA");
    const boton = document.getElementById("botonInstalarAjustes");

    if (!estado) return;

    const instalada =
        window.matchMedia("(display-mode: standalone)").matches ||
        window.navigator.standalone === true;

    if (instalada) {
        estado.textContent = "Marvel Hub ya está instalada como aplicación.";
        if (boton) boton.hidden = true;
        return;
    }

    if (instalacionPendiente) {
        estado.textContent = "Lista para instalarse en este dispositivo.";
        if (boton) boton.hidden = false;
        return;
    }

    estado.textContent = "La instalación depende de las funciones de tu navegador.";
    if (boton) boton.hidden = true;
}

function restablecerPreferencias() {
    const confirmar = window.confirm(
        "¿Quieres restablecer nombre, tema y preferencias de widgets?"
    );

    if (!confirmar) return;

    localStorage.removeItem("nombre");
    localStorage.removeItem(PERFIL_LOCAL_KEY);
    localStorage.removeItem("tema");
    localStorage.removeItem("widgetsMarvel");
    localStorage.removeItem("historialMarvel");

    const nombre = document.getElementById("nombre");
    if (nombre) nombre.value = "";

    actualizarIconosLucide();
    cargarTema();
    cargarNombre();

    const widgetRecomendacion = document.getElementById("widgetRecomendacion");
    const widgetEstrenos = document.getElementById("widgetEstrenos");
    const widgetNoticias = document.getElementById("widgetNoticias");
    const widgetMusica = document.getElementById("widgetMusica");

    if (widgetRecomendacion) widgetRecomendacion.checked = true;
    if (widgetEstrenos) widgetEstrenos.checked = true;
    if (widgetNoticias) widgetNoticias.checked = false;
    if (widgetMusica) widgetMusica.checked = false;

    const hero = document.querySelector(".hero");
    const estrenos = document.querySelector(".proximos-estrenos");
    const panelNoticias = document.getElementById("widgetNoticiasPanel");
    const panelMusica = document.getElementById("widgetMusicaPanel");

    if (hero) hero.style.display = "";
    if (estrenos) estrenos.style.display = "";
    if (panelNoticias) panelNoticias.hidden = true;
    if (panelMusica) panelMusica.hidden = true;

    actualizarWidgetResumen();
    actualizarResumenAjustes();
    actualizarBotonTema();

    const estado = document.getElementById("estadoNombre");
    if (estado) {
        estado.textContent = "Preferencias restablecidas.";
    }
}

function actualizarSaludoInicio() {
    const saludo = document.getElementById("saludoInicio");

    if (!saludo) return;

    const nombre = localStorage.getItem("nombre");

    if (nombre) {
        saludo.textContent = "MARVEL HUB • PARA " + nombre.toUpperCase();
    } else {
        saludo.textContent = "MARVEL HUB • ABRAHAM G4";
    }
}

function cargarNombre() {
    const perfil = obtenerPerfilLocal();
    const nombre = perfil.nombre || "";
    const input = document.getElementById("nombre");

    if (input) {
        input.value = nombre;
    }

    actualizarPerfilUI();
    actualizarSaludoInicio();
}

function cambiarTema() {
    actualizarBotonTema();
    document.body.classList.toggle("tema-claro");

    const temaClaro =
        document.body.classList.contains("tema-claro");

    localStorage.setItem(
        "tema",
        temaClaro ? "claro" : "oscuro"
    );
}

function cargarTema() {
    if (localStorage.getItem("tema") === "claro") {
        document.body.classList.add("tema-claro");
    }
}

let editorUrlActual = "";

function formatearTiempoEditor(segundos) {
    if (!Number.isFinite(segundos) || segundos < 0) {
        return "00:00";
    }

    const minutos = Math.floor(segundos / 60);
    const segundosRestantes = Math.floor(segundos % 60);

    return (
        String(minutos).padStart(2, "0") +
        ":" +
        String(segundosRestantes).padStart(2, "0")
    );
}

function actualizarTiempoEditor() {
    const video = document.getElementById("videoPreview");
    const tiempo = document.getElementById("editorTiempoActual");
    const duracion = document.getElementById("editorDuracion");
    const progreso = document.getElementById("editorProgreso");

    if (!video) return;

    if (tiempo) {
        tiempo.textContent = formatearTiempoEditor(video.currentTime);
    }

    if (duracion) {
        duracion.textContent = formatearTiempoEditor(video.duration);
    }

    if (progreso && Number.isFinite(video.duration)) {
        progreso.max = video.duration;
        progreso.value = video.currentTime;
    }
}

function actualizarFiltroEditor() {
    const video = document.getElementById("videoPreview");
    const brillo = document.getElementById("editorBrillo");
    const contraste = document.getElementById("editorContraste");
    const saturacion = document.getElementById("editorSaturacion");

    if (!video) return;

    const valorBrillo = brillo ? brillo.value : 100;
    const valorContraste = contraste ? contraste.value : 100;
    const valorSaturacion = saturacion ? saturacion.value : 100;

    video.style.filter =
        "brightness(" + valorBrillo + "%) " +
        "contrast(" + valorContraste + "%) " +
        "saturate(" + valorSaturacion + "%)";
}

function configurarVelocidadEditor(video) {
    document.querySelectorAll("[data-velocidad]").forEach(function(boton) {
        boton.addEventListener("click", function() {
            const velocidad = Number(this.dataset.velocidad);

            video.playbackRate = velocidad;

            document.querySelectorAll("[data-velocidad]").forEach(function(elemento) {
                elemento.classList.remove("activo-editor");
            });

            this.classList.add("activo-editor");
        });
    });
}

function configurarFormatosEditor() {
    document.querySelectorAll("[data-formato]").forEach(function(boton) {
        boton.addEventListener("click", function() {
            cambiarFormato(this.dataset.formato);

            document.querySelectorAll("[data-formato]").forEach(function(elemento) {
                elemento.classList.remove("activo-editor");
            });

            this.classList.add("activo-editor");
        });
    });
}

function configurarVideo() {
    const videoInput = document.getElementById("videoInput");
    const videoPreview = document.getElementById("videoPreview");
    const volumen = document.getElementById("volumen");
    const progreso = document.getElementById("editorProgreso");
    const botonPlay = document.getElementById("editorPlay");
    const botonRetroceder = document.getElementById("editorRetroceder");
    const botonAvanzar = document.getElementById("editorAvanzar");
    const botonSilenciar = document.getElementById("editorSilenciar");
    const inicio = document.getElementById("recorteInicio");
    const fin = document.getElementById("recorteFin");
    const aplicarRecorte = document.getElementById("aplicarRecorte");
    const quitarRecorte = document.getElementById("quitarRecorte");
    const estadoRecorte = document.getElementById("estadoRecorte");
    const nombreArchivo = document.getElementById("editorNombreArchivo");
    const reset = document.getElementById("resetEditor");

    if (!videoInput || !videoPreview) return;

    videoPreview.volume = 1;

    videoInput.addEventListener("change", function(event) {
        const archivo = event.target.files[0];

        if (!archivo) return;

        if (editorUrlActual) {
            URL.revokeObjectURL(editorUrlActual);
        }

        editorUrlActual = URL.createObjectURL(archivo);
        videoPreview.src = editorUrlActual;
        videoPreview.load();

        if (nombreArchivo) {
            nombreArchivo.textContent =
                archivo.name +
                " • " +
                Math.round(archivo.size / 1024 / 1024 * 10) / 10 +
                " MB";
        }
    });

    videoPreview.addEventListener("loadedmetadata", function() {
        const duracion = Number.isFinite(videoPreview.duration)
            ? videoPreview.duration
            : 0;

        if (inicio) {
            inicio.value = 0;
            inicio.max = duracion;
        }

        if (fin) {
            fin.value = duracion.toFixed(1);
            fin.max = duracion;
        }

        if (progreso) {
            progreso.max = duracion;
            progreso.value = 0;
        }

        actualizarTiempoEditor();
    });

    videoPreview.addEventListener("timeupdate", function() {
        actualizarTiempoEditor();

        if (
            fin &&
            Number.isFinite(Number(fin.value)) &&
            Number(fin.value) > 0 &&
            videoPreview.currentTime >= Number(fin.value)
        ) {
            videoPreview.pause();
            videoPreview.currentTime = Number(inicio ? inicio.value : 0);
        }
    });

    videoPreview.addEventListener("play", function() {
        if (botonPlay) botonPlay.textContent = "⏸ Pausar";
    });

    videoPreview.addEventListener("pause", function() {
        if (botonPlay) botonPlay.textContent = "▶ Reproducir";
    });

    if (progreso) {
        progreso.addEventListener("input", function() {
            videoPreview.currentTime = Number(this.value);
        });
    }

    if (botonPlay) {
        botonPlay.addEventListener("click", function() {
            if (videoPreview.paused) {
                videoPreview.play().catch(function(error) {
                    console.error("Editor: no se pudo reproducir el video.", error);
                });
            } else {
                videoPreview.pause();
            }
        });
    }

    if (botonRetroceder) {
        botonRetroceder.addEventListener("click", function() {
            videoPreview.currentTime = Math.max(
                0,
                videoPreview.currentTime - 5
            );
        });
    }

    if (botonAvanzar) {
        botonAvanzar.addEventListener("click", function() {
            const limite = Number.isFinite(videoPreview.duration)
                ? videoPreview.duration
                : videoPreview.currentTime + 5;

            videoPreview.currentTime = Math.min(
                limite,
                videoPreview.currentTime + 5
            );
        });
    }

    if (botonSilenciar) {
        botonSilenciar.addEventListener("click", function() {
            videoPreview.muted = !videoPreview.muted;
            this.textContent = videoPreview.muted
                ? "🔇 Silenciado"
                : "🔊 Audio";
        });
    }

    if (volumen) {
        volumen.addEventListener("input", function() {
            videoPreview.volume = Number(this.value);
            videoPreview.muted = Number(this.value) === 0;

            if (botonSilenciar) {
                botonSilenciar.textContent =
                    videoPreview.muted ? "🔇 Silenciado" : "🔊 Audio";
            }
        });
    }

    [inicio, fin].forEach(function(campo) {
        if (!campo) return;

        campo.addEventListener("change", function() {
            let inicioValor = inicio ? Number(inicio.value) : 0;
            let finValor = fin ? Number(fin.value) : videoPreview.duration;

            if (inicioValor < 0) inicioValor = 0;
            if (finValor > videoPreview.duration) finValor = videoPreview.duration;

            if (inicioValor >= finValor) {
                if (this === inicio && fin) {
                    inicioValor = Math.max(0, finValor - 0.1);
                } else if (inicio) {
                    finValor = Math.min(videoPreview.duration, inicioValor + 0.1);
                }
            }

            if (inicio) inicio.value = inicioValor.toFixed(1);
            if (fin) fin.value = finValor.toFixed(1);
        });
    });

    if (aplicarRecorte) {
        aplicarRecorte.addEventListener("click", function() {
            const inicioValor = inicio ? Number(inicio.value) : 0;
            const finValor = fin ? Number(fin.value) : videoPreview.duration;

            if (
                finValor <= inicioValor ||
                !Number.isFinite(finValor) ||
                finValor > videoPreview.duration
            ) {
                if (estadoRecorte) {
                    estadoRecorte.textContent = "Revisa los tiempos de inicio y fin.";
                }
                return;
            }

            videoPreview.currentTime = inicioValor;

            if (estadoRecorte) {
                estadoRecorte.textContent =
                    "Vista previa: " +
                    formatearTiempoEditor(inicioValor) +
                    " → " +
                    formatearTiempoEditor(finValor);
            }
        });
    }

    if (quitarRecorte) {
        quitarRecorte.addEventListener("click", function() {
            if (inicio) inicio.value = 0;
            if (fin && Number.isFinite(videoPreview.duration)) {
                fin.value = videoPreview.duration.toFixed(1);
            }

            if (estadoRecorte) {
                estadoRecorte.textContent =
                    "El video completo está seleccionado.";
            }
        });
    }

    ["editorBrillo", "editorContraste", "editorSaturacion"].forEach(function(id) {
        const control = document.getElementById(id);

        if (control) {
            control.addEventListener("input", actualizarFiltroEditor);
        }
    });

    if (reset) {
        reset.addEventListener("click", function() {
            videoPreview.currentTime = 0;
            videoPreview.playbackRate = 1;
            videoPreview.volume = 1;
            videoPreview.muted = false;

            if (volumen) volumen.value = 1;
            if (inicio) inicio.value = 0;
            if (fin && Number.isFinite(videoPreview.duration)) {
                fin.value = videoPreview.duration.toFixed(1);
            }

            ["editorBrillo", "editorContraste", "editorSaturacion"].forEach(function(id) {
                const control = document.getElementById(id);
                if (control) control.value = 100;
            });

            document.querySelectorAll("[data-velocidad]").forEach(function(elemento) {
                elemento.classList.toggle(
                    "activo-editor",
                    elemento.dataset.velocidad === "1"
                );
            });

            actualizarFiltroEditor();

            if (estadoRecorte) {
                estadoRecorte.textContent =
                    "El video completo está seleccionado.";
            }

            if (botonSilenciar) botonSilenciar.textContent = "🔊 Audio";
        });
    }

    configurarVelocidadEditor(videoPreview);
    configurarFormatosEditor();
    actualizarFiltroEditor();

    const botonExportar = document.getElementById("exportarEditor");

    if (botonExportar) {
        botonExportar.addEventListener("click", exportarVideoEditor);
    }
}

async function exportarVideoEditor() {
    const video = document.getElementById("videoPreview");
    const boton = document.getElementById("exportarEditor");
    const estado = document.getElementById("estadoExportacion");
    const inicio = document.getElementById("recorteInicio");
    const fin = document.getElementById("recorteFin");

    if (!video || !video.src) {
        if (estado) {
            estado.textContent = "Primero selecciona un video.";
        }
        return;
    }

    if (!video.captureStream || typeof MediaRecorder === "undefined") {        if (estado) {
            estado.textContent =
                "Tu navegador no permite exportar este video directamente. Prueba con Chrome o Edge actualizado.";
        }
        return;
    }

    if (!Number.isFinite(video.duration) || video.duration <= 0) {
        if (estado) {
            estado.textContent = "Espera a que el video termine de cargar.";
        }
        return;
    }

    const inicioValor = inicio
        ? Math.max(0, Number(inicio.value) || 0)
        : 0;

    const finValor = fin
        ? Math.min(video.duration, Number(fin.value) || video.duration)
        : video.duration;

    if (finValor <= inicioValor) {
        if (estado) {
            estado.textContent = "El rango de recorte no es válido.";
        }
        return;
    }

    const canvas = document.createElement("canvas");
    const formato = document.getElementById("formatoActual");
    const formatoTexto = formato ? formato.textContent : "16:9";

    if (formatoTexto === "9:16") {
        canvas.width = 720;
        canvas.height = 1280;
    } else if (formatoTexto === "1:1") {
        canvas.width = 1080;
        canvas.height = 1080;
    } else {
        canvas.width = 1280;
        canvas.height = 720;
    }

    const contexto = canvas.getContext("2d");

    if (!contexto) {
        if (estado) estado.textContent = "No se pudo preparar la exportación.";
        return;
    }

    const streamVideo = canvas.captureStream(30);
    const streamOriginal = video.captureStream();

    streamOriginal.getAudioTracks().forEach(function(track) {
        streamVideo.addTrack(track);
    });

    const tipos = [
        "video/webm;codecs=vp9,opus",
        "video/webm;codecs=vp8,opus",
        "video/webm"
    ];

    let tipoGrabacion = "";

    for (let i = 0; i < tipos.length; i++) {
        if (MediaRecorder.isTypeSupported(tipos[i])) {
            tipoGrabacion = tipos[i];
            break;
        }
    }

    if (!tipoGrabacion) {
        if (estado) {
            estado.textContent = "Tu navegador no admite el formato de exportación.";
        }
        return;
    }

    const partes = [];
    let grabador;

    try {
        grabador = new MediaRecorder(streamVideo, {
            mimeType: tipoGrabacion
        });
    } catch (error) {
        console.error("Editor: error creando MediaRecorder.", error);
        if (estado) {
            estado.textContent = "No se pudo iniciar la exportación.";
        }
        return;
    }

    const tiempoAnterior = video.currentTime;
    const velocidadAnterior = video.playbackRate;
    const estabaSilenciado = video.muted;

    if (boton) {
        boton.disabled = true;
        boton.textContent = "⏳ Exportando...";
    }

    if (estado) {
        estado.textContent = "Exportando... no cierres esta pestaña.";
    }

    grabador.ondataavailable = function(event) {
        if (event.data && event.data.size > 0) {
            partes.push(event.data);
        }
    };

    grabador.onerror = function(event) {
        console.error("Editor: error durante la grabación.", event.error);
    };

    const terminarExportacion = function() {
        if (grabador.state !== "inactive") {
            grabador.stop();
        }
    };

    grabador.onstop = function() {
        const blob = new Blob(partes, { type: tipoGrabacion });
        const url = URL.createObjectURL(blob);
        const enlace = document.createElement("a");

        enlace.href = url;
        enlace.download = "marvel-hub-video.webm";
        document.body.appendChild(enlace);
        enlace.click();
        enlace.remove();

        setTimeout(function() {
            URL.revokeObjectURL(url);
        }, 1000);

        video.playbackRate = velocidadAnterior;
        video.muted = estabaSilenciado;
        video.currentTime = Math.min(tiempoAnterior, video.duration);

        if (boton) {
            boton.disabled = false;
            boton.textContent = "⬇️ Exportar video";
        }

        if (estado) {
            estado.textContent =
                "Exportación terminada. Se guardó como marvel-hub-video.webm.";
        }

        streamVideo.getTracks().forEach(function(track) {
            track.stop();
        });
    };

    const dibujar = function() {
        if (video.currentTime >= finValor || video.ended) {
            terminarExportacion();
            return;
        }

        const anchoVideo = video.videoWidth || canvas.width;
        const altoVideo = video.videoHeight || canvas.height;
        const escala = Math.max(
            canvas.width / anchoVideo,
            canvas.height / altoVideo
        );

        const ancho = anchoVideo * escala;
        const alto = altoVideo * escala;
        const x = (canvas.width - ancho) / 2;
        const y = (canvas.height - alto) / 2;

        contexto.clearRect(0, 0, canvas.width, canvas.height);
        contexto.filter = video.style.filter || "none";
        contexto.drawImage(video, x, y, ancho, alto);
        contexto.filter = "none";

        requestAnimationFrame(dibujar);
    };

    try {
        video.pause();
        video.currentTime = inicioValor;

        await new Promise(function(resolve) {
            const esperar = function() {
                if (Math.abs(video.currentTime - inicioValor) < 0.1) {
                    resolve();
                    return;
                }

                requestAnimationFrame(esperar);
            };

            video.addEventListener("seeked", function() {
                resolve();
            }, { once: true });
        });

        video.playbackRate = 1;
        video.muted = false;

        grabador.start(250);

        await video.play();

        requestAnimationFrame(dibujar);
    } catch (error) {
        console.error("Editor: error al exportar.", error);

        if (grabador.state !== "inactive") {
            grabador.stop();
        }

        if (boton) {
            boton.disabled = false;
            boton.textContent = "⬇️ Exportar video";
        }

        if (estado) {
            estado.textContent =
                "No se pudo exportar el video. Revisa los permisos del navegador.";
        }
    }
}

function cambiarFormato(formato) {
    const formatoActual = document.getElementById("formatoActual");
    const videoPreview = document.getElementById("videoPreview");

    if (formatoActual) {
        formatoActual.textContent = formato;
    }

    if (!videoPreview) return;

    if (formato === "9:16") {
        videoPreview.style.aspectRatio = "9 / 16";
    } else if (formato === "1:1") {
        videoPreview.style.aspectRatio = "1 / 1";
    } else {
        videoPreview.style.aspectRatio = "16 / 9";
    }
}

function actualizarWidgetReloj() {
    const reloj = document.getElementById("widgetReloj");
    const fecha = document.getElementById("widgetFecha");

    if (!reloj || !fecha) return;

    const ahora = new Date();

    reloj.textContent = ahora.toLocaleTimeString("es-MX", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
    });

    fecha.textContent = ahora.toLocaleDateString("es-MX", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric"
    });
}

function actualizarWidgetResumen() {
    const resumen = document.getElementById("widgetResumen");
    const estado = document.getElementById("widgetEstado");

    if (!resumen || !estado) return;

    resumen.textContent =
        favoritosMarvel.length +
        " favoritos";

    estado.textContent =
        peliculasTMDB.length +
        " películas • " +
        seriesTMDB.length +
        " series cargadas";
}

function actualizarWidgetDato() {
    const titulo = document.getElementById("widgetDato");
    const texto = document.getElementById("widgetDatoTexto");

    if (!titulo || !texto) return;

    const datos = [
        {
            titulo: "Stan Lee",
            texto: "Stan Lee fue uno de los principales impulsores creativos de Marvel durante décadas."
        },
        {
            titulo: "Wakanda",
            texto: "Wakanda es el país ficticio de Marvel asociado con Black Panther."
        },
        {
            titulo: "Spider-Man",
            texto: "Spider-Man apareció por primera vez en 1962, creado por Stan Lee y Steve Ditko."
        },
        {
            titulo: "Los Vengadores",
            texto: "The Avengers debutaron como equipo en los cómics en 1963."
        },
        {
            titulo: "Guardianes",
            texto: "Los Guardianes de la Galaxia han tenido distintas alineaciones a lo largo de los cómics."
        }
    ];

    const indice =
        (new Date().getDate() + new Date().getMonth()) %
        datos.length;

    titulo.textContent = datos[indice].titulo;
    texto.textContent = datos[indice].texto;
}

function configurarWidgets() {
    const recomendacion = document.getElementById("widgetRecomendacion");
    const estrenos = document.getElementById("widgetEstrenos");
    const noticias = document.getElementById("widgetNoticias");
    const musica = document.getElementById("widgetMusica");

    let preferencias = {};
    try {
        preferencias = JSON.parse(localStorage.getItem("widgetsMarvel") || "{}");
    } catch (error) {
        preferencias = {};
    }

    if (recomendacion) recomendacion.checked = preferencias.recomendacion !== false;
    if (estrenos) estrenos.checked = preferencias.estrenos !== false;
    if (noticias) noticias.checked = preferencias.noticias === true;
    if (musica) musica.checked = preferencias.musica === true;

    actualizarWidgetReloj();
    actualizarWidgetResumen();
    actualizarWidgetDato();

    setInterval(actualizarWidgetReloj, 1000);

    const guardarWidgets = function() {
        localStorage.setItem("widgetsMarvel", JSON.stringify({
            recomendacion: recomendacion ? recomendacion.checked : true,
            estrenos: estrenos ? estrenos.checked : true,
            noticias: noticias ? noticias.checked : false,
            musica: musica ? musica.checked : false
        }));
    };

    if (recomendacion) {
        recomendacion.addEventListener("change", function() {
            const hero = document.querySelector(".hero");
            if (hero) hero.style.display = this.checked ? "" : "none";
            guardarWidgets();
        });
        const hero = document.querySelector(".hero");
        if (hero) hero.style.display = recomendacion.checked ? "" : "none";
    }

    if (estrenos) {
        estrenos.addEventListener("change", function() {
            const bloque = document.querySelector(".proximos-estrenos");
            if (bloque) bloque.style.display = this.checked ? "" : "none";
            guardarWidgets();
        });
        const bloque = document.querySelector(".proximos-estrenos");
        if (bloque) bloque.style.display = estrenos.checked ? "" : "none";
    }

    if (noticias) {
        noticias.addEventListener("change", function() {
            const panel = document.getElementById("widgetNoticiasPanel");
            if (panel) panel.hidden = !this.checked;
            guardarWidgets();
        });
        const panel = document.getElementById("widgetNoticiasPanel");
        if (panel) panel.hidden = !noticias.checked;
    }

    if (musica) {
        musica.addEventListener("change", function() {
            const panel = document.getElementById("widgetMusicaPanel");
            if (panel) panel.hidden = !this.checked;
            guardarWidgets();
        });
        const panel = document.getElementById("widgetMusicaPanel");
        if (panel) panel.hidden = !musica.checked;
    }
}

function actualizarIconosLucide() {
    if (typeof window.lucide === "undefined") return;

    window.lucide.createIcons({
        attrs: {
            "stroke-width": 2
        }
    });
}

function configurarCargaInfinitaCatalogo() {
    let ultimaCarga = 0;

    window.addEventListener("scroll", function() {
        const seccionMarvel = document.getElementById("marvel");
        if (!seccionMarvel || !seccionMarvel.classList.contains("activa")) return;

        const ahora = Date.now();
        if (ahora - ultimaCarga < 700) return;

        const distancia = document.documentElement.scrollHeight - (window.scrollY + window.innerHeight);
        if (distancia > 700) return;

        const buscador = document.getElementById("buscador");
        if (buscador && buscador.value.trim()) return;

        const boton = document.getElementById("cargarMasMarvel");
        if (!boton || boton.hidden || cargandoMasMarvel) return;

        ultimaCarga = ahora;
        cargarMasMarvel();
    }, { passive: true });
}

function inicializarMarvelHub() {
    cargarTema();
    cargarNombre();
    configurarFavoritos();
    configurarModal();
    configurarTeclado();
    configurarVideo();
    configurarWidgets();
    configurarPerfil();
    configurarCuenta();
    activarBuscador();
    configurarCargaInfinitaCatalogo();
    configurarBusquedaGlobal();

    const botonRestablecer = document.getElementById("restablecerPreferencias");
    if (botonRestablecer) {
        botonRestablecer.addEventListener("click", restablecerPreferencias);
    }

    const botonInstalar = document.getElementById("botonInstalar");
    const botonInstalarAjustes = document.getElementById("botonInstalarAjustes");

    const instalarApp = async function() {
        if (!instalacionPendiente) return;

        instalacionPendiente.prompt();

        try {
            await instalacionPendiente.userChoice;
        } catch (error) {
            console.warn("No se pudo completar la instalación.", error);
        }

        instalacionPendiente = null;
        actualizarEstadoPWAEnAjustes();
    };

    if (botonInstalar) {
        botonInstalar.addEventListener("click", instalarApp);
    }

    if (botonInstalarAjustes) {
        botonInstalarAjustes.addEventListener("click", instalarApp);
    }

    window.addEventListener("beforeinstallprompt", function(event) {
        event.preventDefault();
        instalacionPendiente = event;

        if (botonInstalar) botonInstalar.hidden = false;
        actualizarEstadoPWAEnAjustes();
    });

    window.addEventListener("appinstalled", function() {
        instalacionPendiente = null;
        if (botonInstalar) botonInstalar.hidden = true;
        actualizarEstadoPWAEnAjustes();
    });

    actualizarResumenAjustes();
    actualizarBotonTema();
    actualizarEstadoPWAEnAjustes();
    actualizarWidgetResumen();

    cargarMarvelTMDB();
    cargarProximosEstrenos();
    recomendacionTMDB();
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", inicializarMarvelHub);
} else {
    inicializarMarvelHub();
}

window.mostrarSeccion = mostrarSeccion;