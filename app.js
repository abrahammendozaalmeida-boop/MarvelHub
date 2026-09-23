// ================================
// NAVEGACIÓN
// ================================

function mostrarSeccion(seccion) {

    const secciones = document.querySelectorAll(".seccion");

    secciones.forEach(function(elemento) {
        elemento.classList.remove("activa");
    });

    const seleccionada = document.getElementById(seccion);

    if (seleccionada) {
        seleccionada.classList.add("activa");
    }
}


// ================================
// RECOMENDACIONES
// ================================

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
    },

    {
        titulo: "Thor: Ragnarok",
        descripcion: "Thor debe enfrentarse a nuevos enemigos mientras intenta salvar Asgard."
    },

    {
        titulo: "Black Panther",
        descripcion: "T'Challa regresa a Wakanda para asumir su responsabilidad como rey."
    },

    {
        titulo: "Doctor Strange",
        descripcion: "Stephen Strange descubre un mundo completamente nuevo relacionado con la magia."
    }

];


function recomendacionDelDia() {

    const fecha = new Date();

    const dia = fecha.getDate();

    const indice = dia % recomendaciones.length;

    document.getElementById("recomendacion").textContent =
        recomendaciones[indice].titulo;

    document.getElementById("descripcion").textContent =
        recomendaciones[indice].descripcion;
}


function nuevaRecomendacion() {

    const indice = Math.floor(
        Math.random() * recomendaciones.length
    );

    document.getElementById("recomendacion").textContent =
        recomendaciones[indice].titulo;

    document.getElementById("descripcion").textContent =
        recomendaciones[indice].descripcion;
}


// ================================
// CATÁLOGO MARVEL
// ================================

const peliculas = [

    {
        titulo: "Iron Man",
        año: 2008,
        tipo: "Película",
        imagen: "https://image.tmdb.org/t/p/w500/78lPtwv72eTNqFW9COBYI0dWDJa.jpg",
        descripcion: "Tony Stark construye una armadura que cambiará su vida y lo convertirá en Iron Man."
    },

    {
        titulo: "Thor",
        año: 2011,
        tipo: "Película",
        imagen: "https://image.tmdb.org/t/p/w500/prSfAi1xGrhLQNxVSUFh61xQ4Qy.jpg",
        descripcion: "Thor es enviado a la Tierra y debe aprender a ser digno de recuperar sus poderes."
    },

    {
        titulo: "The Avengers",
        año: 2012,
        tipo: "Película",
        imagen: "https://image.tmdb.org/t/p/w500/RYMX2wcKCBAr24UyPD7xwmjaTn.jpg",
        descripcion: "Los héroes más poderosos de la Tierra se reúnen para enfrentar una amenaza común."
    },

    {
        titulo: "Guardians of the Galaxy",
        año: 2014,
        tipo: "Película",
        imagen: "https://image.tmdb.org/t/p/w500/r7vmZjiyZw9rpJMQJdXpjgiCOk9.jpg",
        descripcion: "Un grupo de personajes muy diferentes termina formando un equipo para salvar la galaxia."
    },

    {
        titulo: "Avengers: Age of Ultron",
        año: 2015,
        tipo: "Película",
        imagen: "https://image.tmdb.org/t/p/w500/4ssDuvEDkSArWEdyBl2X5EHvYKU.jpg",
        descripcion: "Los Vengadores se enfrentan a Ultron, una inteligencia artificial creada para proteger al mundo."
    },

    {
        titulo: "Captain America: Civil War",
        año: 2016,
        tipo: "Película",
        imagen: "https://image.tmdb.org/t/p/w500/rAGiXaUfPzY7CDEyNKUofk3Kw2e.jpg",
        descripcion: "Los Vengadores se dividen por sus diferencias sobre cómo deben actuar los superhéroes."
    },

    {
        titulo: "Doctor Strange",
        año: 2016,
        tipo: "Película",
        imagen: "https://image.tmdb.org/t/p/w500/uGBVj3bEbCoqR8O2t0GHUvqmM1.jpg",
        descripcion: "Stephen Strange descubre las artes místicas después de un accidente que cambia su vida."
    },

    {
        titulo: "Black Panther",
        año: 2018,
        tipo: "Película",
        imagen: "https://image.tmdb.org/t/p/w500/uxzzxijgPIY7slzFvMotPv8wjKA.jpg",
        descripcion: "T'Challa regresa a Wakanda para convertirse en rey y proteger su nación."
    },

    {
        titulo: "Avengers: Infinity War",
        año: 2018,
        tipo: "Película",
        imagen: "https://image.tmdb.org/t/p/w500/7WsyChQLEftFiDOVTGkv3hFpyyt.jpg",
        descripcion: "Los héroes del universo Marvel deben enfrentarse a Thanos y su búsqueda de las Gemas del Infinito."
    },

    {
        titulo: "Avengers: Endgame",
        año: 2019,
        tipo: "Película",
        imagen: "https://image.tmdb.org/t/p/w500/or06FN3Dka5tukK1e9sl16pB3iy.jpg",
        descripcion: "Los Vengadores intentan encontrar una manera de revertir las consecuencias del chasquido."
    },

    {
        titulo: "Spider-Man: No Way Home",
        año: 2021,
        tipo: "Película",
        imagen: "https://image.tmdb.org/t/p/w500/1g0dhYtq4irTY1GPXvft6k4YLjm.jpg",
        descripcion: "Peter Parker provoca un problema multiversal que trae personajes de otras realidades."
    }

];


function cargarCatalogo(lista = peliculas) {

    const catalogo = document.getElementById("catalogo");

    catalogo.innerHTML = "";

    lista.forEach(function(pelicula) {

        const card = document.createElement("div");

        card.className = "card";

        card.innerHTML = `
            <img src="${pelicula.imagen}" alt="${pelicula.titulo}">

            <div class="card-content">

                <h3>${pelicula.titulo}</h3>

                <p class="año">
                    ${pelicula.tipo} · ${pelicula.año}
                </p>

                <p>
                    ${pelicula.descripcion}
                </p>

                <button onclick="seleccionarPelicula('${pelicula.titulo}')">
                    Ver información
                </button>

            </div>
        `;

        catalogo.appendChild(card);

    });
}

function seleccionarPelicula(titulo) {

    const pelicula = peliculas.find(function(item) {
        return item.titulo === titulo;
    });

    if (!pelicula) return;

    alert(
        pelicula.titulo +
        "\n\n" +
        pelicula.tipo +
        "\nAño: " +
        pelicula.año
    );
}


// ================================
// BUSCADOR
// ================================

document.getElementById("buscador").addEventListener(
    "input",
    function() {

        const texto = this.value.toLowerCase();

        const resultados = peliculas.filter(function(pelicula) {

            return pelicula.titulo
                .toLowerCase()
                .includes(texto);

        });

        cargarCatalogo(resultados);
    }
);


// ================================
// EDITOR DE VIDEO
// ================================

const videoInput =
    document.getElementById("videoInput");

const videoPreview =
    document.getElementById("videoPreview");


videoInput.addEventListener(
    "change",
    function(event) {

        const archivo = event.target.files[0];

        if (!archivo) return;

        const url = URL.createObjectURL(archivo);

        videoPreview.src = url;

        videoPreview.load();
    }
);


// VOLUMEN

document.getElementById("volumen").addEventListener(
    "input",
    function() {

        videoPreview.volume = this.value;

    }
);


// ================================
// FORMATOS
// ================================

function cambiarFormato(formato) {

    document.getElementById("formatoActual").textContent =
        formato;

    if (formato === "9:16") {

        videoPreview.style.aspectRatio = "9 / 16";

    }

    else if (formato === "1:1") {

        videoPreview.style.aspectRatio = "1 / 1";

    }

    else {

        videoPreview.style.aspectRatio = "16 / 9";

    }
}


// ================================
// TEMA
// ================================

function cambiarTema() {

    document.body.classList.toggle("tema-claro");

    const temaClaro =
        document.body.classList.contains("tema-claro");

    localStorage.setItem(
        "tema",
        temaClaro ? "claro" : "oscuro"
    );
}


// Cargar tema guardado

if (localStorage.getItem("tema") === "claro") {

    document.body.classList.add("tema-claro");

}


// ================================
// NOMBRE
// ================================

function guardarNombre() {

    const nombre =
        document.getElementById("nombre").value;

    localStorage.setItem("nombre", nombre);

    alert("Nombre guardado correctamente 👍");
}


// Cargar nombre

const nombreGuardado =
    localStorage.getItem("nombre");

if (nombreGuardado) {

    document.getElementById("nombre").value =
        nombreGuardado;

}


// ================================
// INICIO
// ================================

recomendacionDelDia();

cargarCatalogo();

console.log("ABRAHAM G4 — MARVEL HUB funcionando correctamente 🚀");