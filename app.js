const TMDB_API_KEY = "TU_CLAVE_API";
const TMDB_BASE_URL = "https://api.themoviedb.org/3";
const TMDB_IMAGE_URL = "https://image.tmdb.org/t/p/w500";

let peliculasTMDB = [];
let seriesTMDB = [];
let tipoActual = "peliculas";
let favoritosMarvel = JSON.parse(localStorage.getItem("favoritosMarvel") || "[]");

function mostrarSeccion(seccion) {
    document.querySelectorAll(".seccion").forEach(function(elemento) {
        elemento.classList.remove("activa");
    });

    const seleccionada = document.getElementById(seccion);

    if (seleccionada) {
        seleccionada.classList.add("activa");
    }

    if (seccion === "favoritos") {
        mostrarFavoritos();
    }
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

function esFavoritoMarvel(id, tipo) {
    return favoritosMarvel.some(function(item) {
        return item.id === id && item.tipo === tipo;
    });
}

function guardarFavoritos() {
    localStorage.setItem("favoritosMarvel", JSON.stringify(favoritosMarvel));
}

function alternarFavorito(id, tipo) {
    const indice = favoritosMarvel.findIndex(function(item) {
        return item.id === id && item.tipo === tipo;
    });

    if (indice >= 0) {
        favoritosMarvel.splice(indice, 1);
    } else {
        const lista = tipo === "movie" ? peliculasTMDB : seriesTMDB;
        const item = lista.find(function(elemento) {
            return elemento.id === id;
        });

        if (!item) return;

        favoritosMarvel.push({
            id: item.id,
            tipo: tipo,
            titulo: item.title || item.name,
            poster_path: item.poster_path,
            overview: item.overview || "",
            fecha: item.release_date || item.first_air_date || "",
            vote_average: item.vote_average || 0
        });
    }

    guardarFavoritos();
    renderizarCatalogo(tipo === "movie" ? peliculasTMDB : seriesTMDB);

    if (document.getElementById("favoritos").classList.contains("activa")) {
        mostrarFavoritos();
    }
}

function renderizarCatalogo(lista) {
    const catalogo = document.getElementById("catalogo");

    if (!catalogo) return;

    catalogo.innerHTML = "";

    if (!lista || lista.length === 0) {
        catalogo.innerHTML = "<p>No se encontraron resultados.</p>";
        return;
    }

    lista.forEach(function(item) {
        const tipoTexto = item.tipo === "tv" ? "📺 Serie" : "🎬 Película";
        const titulo = item.title || item.name || "Sin título";
        const fecha = item.release_date || item.first_air_date || "Sin fecha";
        const puntuacion = item.vote_average
            ? item.vote_average.toFixed(1)
            : "N/A";
        const descripcion = item.overview || "Sin descripción disponible.";

        const tarjeta = document.createElement("article");
        tarjeta.className = "tarjeta-pelicula";

        const poster = crearPoster(
            item.poster_path
                ? TMDB_IMAGE_URL + item.poster_path
                : "",
            titulo,
            ""
        );

        tarjeta.innerHTML =
            poster +
            "<div class='card-content'>" +
            "<h3>" +
            titulo +
            "</h3>" +
            "<p class='tipo-contenido'>" +
            tipoTexto +
            "</p>" +
            "<p>📅 " +
            fecha +
            "</p>" +
            "<p class='puntuacion'>⭐ " +
            puntuacion +
            "/10</p>" +
            "<p class='descripcion-pelicula'>" +
            descripcion +
            "</p>" +
            "<div class='botones-card'>" +
            "<button class='boton-detalles' data-id='" +
            item.id +
            "' data-tipo='" +
            item.tipo +
            "'>Ver detalles</button>" +
            "<button class='" +
            (esFavoritoMarvel(item.id, item.tipo)
                ? "boton-quitar-favorito"
                : "boton-favorito") +
            "' data-favorito-id='" +
            item.id +
            "' data-favorito-tipo='" +
            item.tipo +
            "'>" +
            (esFavoritoMarvel(item.id, item.tipo)
                ? "💔 Quitar"
                : "❤️ Favorito") +
            "</button>" +
            "</div>" +
            "</div>";

        const botonDetalles = tarjeta.querySelector(".boton-detalles");
        const botonFavorito = tarjeta.querySelector("[data-favorito-id]");

        botonDetalles.addEventListener("click", function() {
            verDetallesTMDB(item.id, item.tipo);
        });

        botonFavorito.addEventListener("click", function() {
            alternarFavorito(item.id, item.tipo);
        });

        catalogo.appendChild(tarjeta);
    });
}

function renderizarFavoritos() {
    const catalogo = document.getElementById("catalogoFavoritos");

    if (!catalogo) return;

    catalogo.innerHTML = "";

    if (favoritosMarvel.length === 0) {
        catalogo.innerHTML = "<p>No tienes favoritos todavía.</p>";
        return;
    }

    favoritosMarvel.forEach(function(item) {
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
            "<p class='tipo-contenido'>" +
            tipoTexto +
            "</p>" +
            "<p>📅 " +
            fecha +
            "</p>" +
            "<p class='puntuacion'>⭐ " +
            puntuacion +
            "/10</p>" +
            "<p class='descripcion-pelicula'>" +
            descripcion +
            "</p>" +
            "<div class='botones-card'>" +
            "<button class='boton-detalles'>Ver detalles</button>" +
            "<button class='boton-quitar-favorito'>💔 Quitar</button>" +
            "</div>" +
            "</div>";

        tarjeta.querySelector(".boton-detalles").addEventListener(
            "click",
            function() {
                verDetallesTMDB(item.id, item.tipo);
            }
        );

        tarjeta.querySelector(".boton-quitar-favorito").addEventListener(
            "click",
            function() {
                alternarFavorito(item.id, item.tipo);
            }
        );

        catalogo.appendChild(tarjeta);
    });
}

function mostrarFavoritos() {
    renderizarFavoritos();
}

async function cargarMarvelTMDB() {
    const catalogo = document.getElementById("catalogo");

    if (!catalogo) return;

    catalogo.innerHTML = "<p>Cargando Marvel desde TMDB...</p>";

    try {
        const peliculas = await obtenerTMDB(
            "/discover/movie?sort_by=popularity.desc&include_adult=false&with_companies=420&page=1"
        );

        const series = await obtenerTMDB(
            "/discover/tv?sort_by=popularity.desc&include_adult=false&with_companies=420&page=1"
        );

        peliculasTMDB = peliculas.results.map(function(item) {
            item.tipo = "movie";
            return item;
        });

        seriesTMDB = series.results.map(function(item) {
            item.tipo = "tv";
            return item;
        });

        mostrarTipoMarvel("peliculas");
        renderizarFilasInicio();
    } catch (error) {
        console.error("Error cargando Marvel:", error);
        catalogo.innerHTML =
            "<p>No se pudo cargar TMDB. Revisa tu clave de API.</p>";
    }
}

function crearTarjetaInicio(item) {
    const tipo = item.tipo || "movie";
    const titulo = item.title || item.name || "Sin título";
    const fecha = item.release_date || item.first_air_date || "Sin fecha";
    const puntuacion = item.vote_average
        ? Number(item.vote_average).toFixed(1)
        : "N/A";

    const tarjeta = document.createElement("article");
    tarjeta.className = "tarjeta-pelicula";

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
        "<p class='tipo-contenido'>" +
        (tipo === "tv" ? "📺 Serie" : "🎬 Película") +
        "</p>" +
        "<p>⭐ " +
        puntuacion +
        "/10</p>" +
        "<div class='botones-card'>" +
        "<button class='boton-detalles'>Ver detalles</button>" +
        "<button class='" +
        (esFavoritoMarvel(item.id, tipo)
            ? "boton-quitar-favorito"
            : "boton-favorito") +
        "'>" +
        (esFavoritoMarvel(item.id, tipo)
            ? "💔 Quitar"
            : "❤️ Favorito") +
        "</button>" +
        "</div>" +
        "</div>";

    tarjeta.querySelector(".boton-detalles").addEventListener(
        "click",
        function() {
            verDetallesTMDB(item.id, tipo);
        }
    );

    tarjeta.querySelector(".boton-favorito, .boton-quitar-favorito")
        .addEventListener("click", function() {
            alternarFavorito(item.id, tipo);
            renderizarFilasInicio();
        });

    return tarjeta;
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

function renderizarFilasInicio() {
    const populares = peliculasTMDB
        .slice()
        .sort(function(a, b) {
            return (b.popularity || 0) - (a.popularity || 0);
        });

    const series = seriesTMDB
        .slice()
        .sort(function(a, b) {
            return (b.popularity || 0) - (a.popularity || 0);
        });

    renderizarFilaInicio("homePopulares", populares, 10);
    renderizarFilaInicio("homeSeries", series, 10);
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

    if (!buscador) return;

    buscador.addEventListener("input", function() {
        const texto = this.value.toLowerCase().trim();

        const lista = tipoActual === "peliculas"
            ? peliculasTMDB
            : seriesTMDB;

        const resultados = lista.filter(function(item) {
            const titulo = (
                item.title ||
                item.name ||
                ""
            ).toLowerCase();

            return titulo.includes(texto);
        });

        renderizarCatalogo(resultados);
    });
}

async function verDetallesTMDB(id, tipo) {
    const modal = document.getElementById("modalMarvel");
    const contenido = document.getElementById("detalleMarvel");

    if (!modal || !contenido) return;

    modal.classList.add("activo");
    contenido.innerHTML = "<p>Cargando detalles...</p>";

    let endpoint = "/movie/";

    if (tipo === "tv") {
        endpoint = "/tv/";
    }

    try {
        const respuesta = await fetch(
            TMDB_BASE_URL +
            endpoint +
            id +
            "?api_key=" +
            encodeURIComponent(TMDB_API_KEY) +
            "&language=es-MX" +
            "&append_to_response=videos"
        );

        if (!respuesta.ok) {
            throw new Error("Error detalles");
        }

        const datos = await respuesta.json();

        const titulo =
            datos.title ||
            datos.name ||
            "Sin título";

        const descripcion =
            datos.overview ||
            "Sin descripción disponible.";

        const fecha =
            datos.release_date ||
            datos.first_air_date ||
            "Sin fecha";

        const puntuacion =
            datos.vote_average
                ? datos.vote_average.toFixed(1)
                : "N/A";

        let poster = "";

        if (datos.poster_path) {
            poster =
                "<img src='" +
                TMDB_IMAGE_URL +
                datos.poster_path +
                "' alt='" +
                titulo.replace(/'/g, "&#39;") +
                "'>";
        }

        let trailer = "";

        if (
            datos.videos &&
            datos.videos.results &&
            datos.videos.results.length > 0
        ) {
            const videos = datos.videos.results;

            let videoTrailer = videos.find(function(video) {
                return (
                    video.site === "YouTube" &&
                    video.type === "Trailer" &&
                    video.official === true
                );
            });

            if (!videoTrailer) {
                videoTrailer = videos.find(function(video) {
                    return (
                        video.site === "YouTube" &&
                        video.type === "Trailer"
                    );
                });
            }

            if (!videoTrailer) {
                videoTrailer = videos.find(function(video) {
                    return video.site === "YouTube";
                });
            }

            if (videoTrailer && videoTrailer.key) {
                trailer =
                    "<div class='trailer-detalles'>" +
                    "<h3>🎬 Tráiler</h3>" +
                    "<div class='trailer-video'>" +
                    "<iframe src='https://www.youtube.com/embed/" +
                    videoTrailer.key +
                    "' title='Tráiler de " +
                    titulo.replace(/'/g, "&#39;") +
                    "' allow='accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share' allowfullscreen></iframe>" +
                    "</div>" +
                    "</div>";
            }
        }

        contenido.innerHTML =
            poster +
            "<h2>" +
            titulo +
            "</h2>" +
            "<p>📅 " +
            fecha +
            "</p>" +
            "<p>⭐ " +
            puntuacion +
            "/10</p>" +
            "<p>" +
            descripcion +
            "</p>" +
            trailer;
    } catch (error) {
        console.error("Error detalles:", error);
        contenido.innerHTML =
            "<p>No se pudieron cargar los detalles.</p>";
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

    document.getElementById("recomendacion").textContent = titulo;
    document.getElementById("descripcion").textContent = descripcion;

    const poster = document.getElementById("recomendacionPoster");

    if (poster) {
        poster.innerHTML = item.poster_path
            ? "<img class='poster-recomendacion' src='" +
              TMDB_IMAGE_URL +
              item.poster_path +
              "' alt='" +
              titulo.replace(/'/g, "&#39;") +
              "'>"
            : "";
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

    const hoy = new Date().toISOString().split("T")[0];

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

function guardarNombre() {
    const input = document.getElementById("nombre");

    if (!input) return;

    localStorage.setItem("nombre", input.value.trim());
    alert("Nombre guardado correctamente 👍");
}

function cargarNombre() {
    const nombre = localStorage.getItem("nombre");
    const input = document.getElementById("nombre");

    if (input && nombre) {
        input.value = nombre;
    }
}

function cambiarTema() {
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

function configurarVideo() {
    const videoInput =
        document.getElementById("videoInput");

    const videoPreview =
        document.getElementById("videoPreview");

    const volumen =
        document.getElementById("volumen");

    if (videoInput && videoPreview) {
        videoInput.addEventListener("change", function(event) {
            const archivo = event.target.files[0];

            if (!archivo) return;

            const url = URL.createObjectURL(archivo);

            videoPreview.src = url;
            videoPreview.load();
        });
    }

    if (volumen && videoPreview) {
        volumen.addEventListener("input", function() {
            videoPreview.volume = Number(this.value);
        });
    }
}

function cambiarFormato(formato) {
    const formatoActual =
        document.getElementById("formatoActual");

    const videoPreview =
        document.getElementById("videoPreview");

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

function configurarWidgets() {
    const recomendacion =
        document.getElementById("widgetRecomendacion");

    const estrenos =
        document.getElementById("widgetEstrenos");

    if (recomendacion) {
        recomendacion.addEventListener("change", function() {
            const hero = document.querySelector(".hero");
            if (hero) {
                hero.style.display =
                    this.checked ? "" : "none";
            }
        });
    }

    if (estrenos) {
        estrenos.addEventListener("change", function() {
            const bloque =
                document.querySelector(".proximos-estrenos");

            if (bloque) {
                bloque.style.display =
                    this.checked ? "" : "none";
            }
        });
    }
}

window.mostrarSeccion = mostrarSeccion;
window.nuevaRecomendacion = nuevaRecomendacion;
window.mostrarTipoMarvel = mostrarTipoMarvel;
window.cerrarDetalles = cerrarDetalles;
window.guardarNombre = guardarNombre;
window.cambiarTema = cambiarTema;
window.cambiarFormato = cambiarFormato;

document.addEventListener("DOMContentLoaded", function() {
    cargarTema();
    cargarNombre();
    configurarVideo();
    configurarWidgets();
    activarBuscador();
    configurarModal();
    configurarTeclado();

    recomendacionTMDB();
    cargarMarvelTMDB();
    cargarProximosEstrenos();
});

/* ================================
   PWA / APP
   ================================ */

let instalacionPendiente = null;

function configurarPWA() {
    const botonInstalar = document.getElementById("botonInstalar");

    if ("serviceWorker" in navigator) {
        window.addEventListener("load", function() {
            navigator.serviceWorker.register("./sw.js")
                .then(function() {
                    console.log("PWA: Service Worker activo.");
                })
                .catch(function(error) {
                    console.error("PWA: error al registrar Service Worker:", error);
                });
        });
    }

    window.addEventListener("beforeinstallprompt", function(event) {
        event.preventDefault();
        instalacionPendiente = event;

        if (botonInstalar) {
            botonInstalar.hidden = false;
        }
    });

    if (botonInstalar) {
        botonInstalar.addEventListener("click", async function() {
            if (!instalacionPendiente) return;

            instalacionPendiente.prompt();

            try {
                await instalacionPendiente.userChoice;
            } catch (error) {
                console.error("PWA: instalación cancelada o no disponible.", error);
            }

            instalacionPendiente = null;
            botonInstalar.hidden = true;
        });
    }

    window.addEventListener("appinstalled", function() {
        instalacionPendiente = null;

        if (botonInstalar) {
            botonInstalar.hidden = true;
        }

        console.log("ABRAHAM G4 — MARVEL HUB instalado.");
    });
}

document.addEventListener("DOMContentLoaded", function() {
    configurarPWA();
});
