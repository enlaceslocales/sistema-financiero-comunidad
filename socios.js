let usuarioActual = null;
let perfilUsuario = null;
let socios = [];

document.addEventListener("DOMContentLoaded", async () => {
    await verificarSesion();
});

async function verificarSesion() {
    const {
        data: { session },
        error: sessionError
    } = await supabaseClient.auth.getSession();

    if (sessionError) {
        console.error("Error al comprobar la sesión:", sessionError);
        window.location.href = "login.html";
        return;
    }

    if (!session) {
        window.location.href = "login.html";
        return;
    }

    usuarioActual = session.user;

    const {
        data: perfil,
        error
    } = await supabaseClient
        .from("profiles")
        .select("nombre, email, rol, activo")
        .eq("id", usuarioActual.id)
        .single();

    if (error) {
        console.error("Error al obtener el perfil:", error);
        alert("No fue posible cargar el perfil del usuario.");
        return;
    }

    if (!perfil) {
        alert("No existe un perfil asociado a este usuario.");
        await supabaseClient.auth.signOut();
        window.location.href = "login.html";
        return;
    }

    if (!perfil.activo) {
        alert("Este usuario se encuentra desactivado.");
        await supabaseClient.auth.signOut();
        window.location.href = "login.html";
        return;
    }

    perfilUsuario = perfil;

    if (
        perfilUsuario.rol !== "administrador" &&
        perfilUsuario.rol !== "tesorero"
    ) {
        alert("No tiene permisos para administrar socios.");
        window.location.href = "dashboard.html";
        return;
    }

    mostrarUsuario();
    configurarEventos();
    await cargarSocios();
}

function mostrarUsuario() {
    const nombreUsuario = document.getElementById("nombreUsuario");
    const rolUsuario = document.getElementById("rolUsuario");

    if (nombreUsuario) {
        nombreUsuario.textContent = perfilUsuario.nombre || "Usuario";
    }

    if (rolUsuario) {
        rolUsuario.textContent = traducirRol(perfilUsuario.rol);
    }
}

function traducirRol(rol) {
    switch (rol) {
        case "administrador":
            return "Administrador";

        case "tesorero":
            return "Tesorero";

        case "consulta":
            return "Consulta";

        default:
            return "Usuario";
    }
}

function configurarEventos() {
    const nuevoSocioButton = document.getElementById("nuevoSocioButton");

    if (nuevoSocioButton) {
        nuevoSocioButton.addEventListener(
            "click",
            abrirModalNuevoSocio
        );
    }

    const cerrarModal = document.getElementById("cerrarModal");

    if (cerrarModal) {
        cerrarModal.addEventListener(
            "click",
            cerrarModalSocio
        );
    }

    const cancelarSocio = document.getElementById("cancelarSocio");

    if (cancelarSocio) {
        cancelarSocio.addEventListener(
            "click",
            cerrarModalSocio
        );
    }

    const formSocio = document.getElementById("formSocio");

    if (formSocio) {
        formSocio.addEventListener(
            "submit",
            guardarSocio
        );
    }

    const buscarSocio = document.getElementById("buscarSocio");

    if (buscarSocio) {
        buscarSocio.addEventListener(
            "input",
            aplicarFiltros
        );
    }

    const filtroEstado = document.getElementById("filtroEstado");

    if (filtroEstado) {
        filtroEstado.addEventListener(
            "change",
            aplicarFiltros
        );
    }

    const modal = document.getElementById("modalSocio");

    if (modal) {
        modal.addEventListener("click", (event) => {
            if (event.target === modal) {
                cerrarModalSocio();
            }
        });
    }

    const logoutButton = document.getElementById("logoutButton");

    if (logoutButton) {
        logoutButton.addEventListener(
            "click",
            cerrarSesion
        );
    }
}

async function cargarSocios() {
    const tabla = document.getElementById("tablaSocios");

    if (tabla) {
        tabla.innerHTML = `
            <tr>
                <td colspan="6" class="tabla-cargando">
                    Cargando socios...
                </td>
            </tr>
        `;
    }

    const {
        data,
        error
    } = await supabaseClient
        .from("socios")
        .select(`
            id,
            nombres,
            apellido_paterno,
            apellido_materno,
            rut,
            telefono,
            email,
            direccion,
            fecha_ingreso,
            estado,
            observaciones,
            created_at,
            updated_at
        `)
        .order("apellido_paterno", {
            ascending: true,
            nullsFirst: false
        })
        .order("nombres", {
            ascending: true
        });

    if (error) {
        console.error("Error al cargar socios:", error);

        if (tabla) {
            tabla.innerHTML = `
                <tr>
                    <td colspan="6" class="tabla-cargando">
                        No fue posible cargar los socios.
                    </td>
                </tr>
            `;
        }

        actualizarContador(0);
        return;
    }

    socios = data || [];

    aplicarFiltros();
}

function aplicarFiltros() {
    const buscarInput = document.getElementById("buscarSocio");
    const filtroEstado = document.getElementById("filtroEstado");

    const textoBusqueda = buscarInput
        ? buscarInput.value.trim().toLowerCase()
        : "";

    const estadoSeleccionado = filtroEstado
        ? filtroEstado.value
        : "todos";

    const sociosFiltrados = socios.filter((socio) => {
        const nombreCompleto = construirNombreCompleto(socio)
            .toLowerCase();

        const rut = socio.rut
            ? socio.rut.toLowerCase()
            : "";

        const coincideBusqueda =
            textoBusqueda === "" ||
            nombreCompleto.includes(textoBusqueda) ||
            rut.includes(textoBusqueda);

        const coincideEstado =
            estadoSeleccionado === "todos" ||
            socio.estado === estadoSeleccionado;

        return coincideBusqueda && coincideEstado;
    });

    renderizarSocios(sociosFiltrados);

    actualizarContador(
        sociosFiltrados.length,
        socios.length
    );
}

function renderizarSocios(lista) {
    const tabla = document.getElementById("tablaSocios");

    if (!tabla) {
        return;
    }

    tabla.innerHTML = "";

    if (lista.length === 0) {
        tabla.innerHTML = `
            <tr>
                <td colspan="6" class="tabla-cargando">
                    No se encontraron socios.
                </td>
            </tr>
        `;
        return;
    }

    lista.forEach((socio) => {
        const fila = document.createElement("tr");

        const nombre = construirNombreCompleto(socio);
        const rut = socio.rut || "—";
        const telefono = socio.telefono || "—";
        const email = socio.email || "—";
        const estado = socio.estado || "—";

        const claseEstado =
            estado === "activo"
                ? "estado-activo"
                : "estado-inactivo";

        fila.innerHTML = `
            <td>
                <strong>
                    ${escaparHTML(nombre)}
                </strong>
            </td>

            <td>
                ${escaparHTML(rut)}
            </td>

            <td>
                ${escaparHTML(telefono)}
            </td>

            <td>
                ${escaparHTML(email)}
            </td>

            <td>
                <span class="${claseEstado}">
                    ${capitalizar(estado)}
                </span>
            </td>

            <td>
                <button
                    type="button"
                    class="boton-tabla"
                    data-accion="editar"
                    data-id="${socio.id}"
                >
                    Editar
                </button>
            </td>
        `;

        tabla.appendChild(fila);
    });

    const botonesEditar = tabla.querySelectorAll(
        '[data-accion="editar"]'
    );

    botonesEditar.forEach((boton) => {
        boton.addEventListener("click", () => {
            const id = Number(boton.dataset.id);
            abrirModalEditarSocio(id);
        });
    });
}

function construirNombreCompleto(socio) {
    return [
        socio.nombres,
        socio.apellido_paterno,
        socio.apellido_materno
    ]
        .filter((parte) => {
            return parte && parte.trim() !== "";
        })
        .join(" ");
}

function actualizarContador(
    cantidadVisible,
    cantidadTotal = cantidadVisible
) {
    const contador = document.getElementById("contadorSocios");

    if (!contador) {
        return;
    }

    if (cantidadTotal === 0) {
        contador.textContent =
            "No existen socios registrados.";
        return;
    }

    if (cantidadVisible !== cantidadTotal) {
        contador.textContent =
            `${cantidadVisible} de ${cantidadTotal} socios`;
        return;
    }

    contador.textContent =
        cantidadTotal === 1
            ? "1 socio registrado"
            : `${cantidadTotal} socios registrados`;
}

function abrirModalNuevoSocio() {
    const modal = document.getElementById("modalSocio");
    const titulo = document.getElementById("modalTitulo");
    const form = document.getElementById("formSocio");

    if (!modal || !titulo || !form) {
        return;
    }

    form.reset();

    const socioId = document.getElementById("socioId");

    if (socioId) {
        socioId.value = "";
    }

    titulo.textContent = "Nuevo socio";

    const estado = document.getElementById("estado");

    if (estado) {
        estado.value = "activo";
    }

    const fechaIngreso =
        document.getElementById("fechaIngreso");

    if (fechaIngreso) {
        fechaIngreso.value = obtenerFechaActual();
    }

    modal.style.display = "flex";

    const nombres = document.getElementById("nombres");

    if (nombres) {
        nombres.focus();
    }
}

function abrirModalEditarSocio(id) {
    const socio = socios.find(
        (elemento) =>
            Number(elemento.id) === Number(id)
    );

    if (!socio) {
        alert(
            "No fue posible encontrar el socio seleccionado."
        );
        return;
    }

    const modal = document.getElementById("modalSocio");
    const titulo = document.getElementById("modalTitulo");

    if (!modal || !titulo) {
        return;
    }

    titulo.textContent = "Editar socio";

    document.getElementById("socioId").value =
        socio.id;

    document.getElementById("nombres").value =
        socio.nombres || "";

    document.getElementById("apellidoPaterno").value =
        socio.apellido_paterno || "";

    document.getElementById("apellidoMaterno").value =
        socio.apellido_materno || "";

    document.getElementById("rut").value =
        socio.rut || "";

    document.getElementById("telefono").value =
        socio.telefono || "";

    document.getElementById("email").value =
        socio.email || "";

    document.getElementById("direccion").value =
        socio.direccion || "";

    document.getElementById("fechaIngreso").value =
        socio.fecha_ingreso || "";

    document.getElementById("estado").value =
        socio.estado || "activo";

    document.getElementById("observaciones").value =
        socio.observaciones || "";

    modal.style.display = "flex";

    document.getElementById("nombres").focus();
}

function cerrarModalSocio() {
    const modal = document.getElementById("modalSocio");

    if (!modal) {
        return;
    }

    modal.style.display = "none";

    const form = document.getElementById("formSocio");

    if (form) {
        form.reset();
    }

    const socioId = document.getElementById("socioId");

    if (socioId) {
        socioId.value = "";
    }
}

async function guardarSocio(event) {
    event.preventDefault();

    const botonGuardar =
        document.getElementById("guardarSocio");

    const socioId =
        document.getElementById("socioId")
            .value
            .trim();

    const datosSocio = {
        nombres: obtenerValor("nombres"),

        apellido_paterno:
            obtenerValor("apellidoPaterno"),

        apellido_materno:
            obtenerValor("apellidoMaterno"),

        rut:
            obtenerValor("rut") || null,

        telefono:
            obtenerValor("telefono") || null,

        email:
            obtenerValor("email") || null,

        direccion:
            obtenerValor("direccion") || null,

        fecha_ingreso:
            obtenerValor("fechaIngreso") || null,

        estado:
            obtenerValor("estado") || "activo",

        observaciones:
            obtenerValor("observaciones") || null
    };

    if (!datosSocio.nombres) {
        alert(
            "Debe ingresar los nombres del socio."
        );

        const nombres =
            document.getElementById("nombres");

        if (nombres) {
            nombres.focus();
        }

        return;
    }

    if (botonGuardar) {
        botonGuardar.disabled = true;

        botonGuardar.textContent =
            socioId
                ? "Actualizando..."
                : "Guardando...";
    }

    try {
        if (socioId) {
            const {
                error
            } = await supabaseClient
                .from("socios")
                .update({
                    ...datosSocio,
                    updated_at:
                        new Date().toISOString()
                })
                .eq(
                    "id",
                    Number(socioId)
                );

            if (error) {
                console.error(
                    "Error al actualizar socio:",
                    error
                );

                alert(
                    obtenerMensajeError(error)
                );

                return;
            }

            alert(
                "Socio actualizado correctamente."
            );

        } else {
            const {
                error
            } = await supabaseClient
                .from("socios")
                .insert({
                    ...datosSocio,
                    created_by:
                        usuarioActual.id
                });

            if (error) {
                console.error(
                    "Error al crear socio:",
                    error
                );

                alert(
                    obtenerMensajeError(error)
                );

                return;
            }

            alert(
                "Socio registrado correctamente."
            );
        }

        cerrarModalSocio();

        await cargarSocios();

    } catch (error) {
        console.error(
            "Error inesperado al guardar socio:",
            error
        );

        alert(
            "Ocurrió un error inesperado al guardar el socio."
        );

    } finally {
        if (botonGuardar) {
            botonGuardar.disabled = false;
            botonGuardar.textContent =
                "Guardar socio";
        }
    }
}

function obtenerValor(id) {
    const elemento =
        document.getElementById(id);

    if (!elemento) {
        return "";
    }

    return elemento.value.trim();
}

function obtenerFechaActual() {
    const fecha = new Date();

    const anio =
        fecha.getFullYear();

    const mes =
        String(fecha.getMonth() + 1)
            .padStart(2, "0");

    const dia =
        String(fecha.getDate())
            .padStart(2, "0");

    return `${anio}-${mes}-${dia}`;
}

function capitalizar(texto) {
    if (!texto) {
        return "";
    }

    return (
        texto.charAt(0).toUpperCase() +
        texto.slice(1)
    );
}

function escaparHTML(texto) {
    return String(texto)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function obtenerMensajeError(error) {
    if (!error) {
        return "Ocurrió un error desconocido.";
    }

    console.error(
        "Detalle del error:",
        error
    );

    if (error.code === "23505") {
        return (
            "El RUT ingresado ya se encuentra registrado."
        );
    }

    if (error.code === "42501") {
        return (
            "No tiene permisos para realizar esta operación."
        );
    }

    return (
        error.message ||
        "No fue posible completar la operación."
    );
}

async function cerrarSesion() {
    const confirmar = confirm(
        "¿Está seguro de que desea cerrar la sesión?"
    );

    if (!confirmar) {
        return;
    }

    const {
        error
    } = await supabaseClient.auth.signOut();

    if (error) {
        console.error(
            "Error al cerrar sesión:",
            error
        );

        alert(
            "No fue posible cerrar la sesión."
        );

        return;
    }

    window.location.href = "login.html";
}