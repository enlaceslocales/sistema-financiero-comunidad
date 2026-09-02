// ============================================================
// SISTEMA FINANCIERO
// COMUNIDAD INDÍGENA JUAN CHEUQUELÉN
// MÓDULO DE CUOTAS
// ============================================================

"use strict";

let usuarioActual = null;
let perfilUsuario = null;

let cuotas = [];
let socios = [];
let periodos = [];
let categorias = [];


// ============================================================
// INICIO
// ============================================================

document.addEventListener("DOMContentLoaded", function () {
    iniciarModulo();
});


// ============================================================
// INICIAR MÓDULO
// ============================================================

async function iniciarModulo() {

    console.log("========================================");
    console.log("MÓDULO DE CUOTAS");
    console.log("Iniciando...");
    console.log("========================================");

    try {

        if (typeof supabaseClient === "undefined") {
            console.error("supabaseClient no está disponible.");

            mostrarErrorGeneral(
                "No fue posible conectar con el sistema financiero. " +
                "Revise que config.js esté cargado correctamente."
            );

            return;
        }

        await verificarSesion();

    } catch (error) {

        console.error(
            "Error inesperado al iniciar el módulo:",
            error
        );

        mostrarErrorGeneral(
            "Ocurrió un error al iniciar el módulo de cuotas."
        );
    }
}


// ============================================================
// VERIFICAR SESIÓN
// ============================================================

async function verificarSesion() {

    console.log("Verificando sesión...");

    const resultadoSesion =
        await supabaseClient.auth.getSession();

    if (resultadoSesion.error) {

        console.error(
            "Error al comprobar sesión:",
            resultadoSesion.error
        );

        window.location.href = "login.html";

        return;
    }

    const session =
        resultadoSesion.data
            ? resultadoSesion.data.session
            : null;

    if (!session) {

        console.warn(
            "No existe una sesión activa."
        );

        window.location.href = "login.html";

        return;
    }

    usuarioActual = session.user;

    console.log(
        "Usuario autenticado:",
        usuarioActual.email
    );


    // ========================================================
    // OBTENER PERFIL
    // ========================================================

    const resultadoPerfil =
        await supabaseClient
            .from("profiles")
            .select(
                "id, nombre, email, rol, activo"
            )
            .eq(
                "id",
                usuarioActual.id
            )
            .single();

    if (resultadoPerfil.error) {

        console.error(
            "Error al obtener perfil:",
            resultadoPerfil.error
        );

        mostrarErrorGeneral(
            "No fue posible cargar el perfil del usuario.\n\n" +
            obtenerMensajeError(
                resultadoPerfil.error
            )
        );

        return;
    }

    const perfil =
        resultadoPerfil.data;

    if (!perfil) {

        console.error(
            "No existe perfil para el usuario."
        );

        await supabaseClient.auth.signOut();

        window.location.href =
            "login.html";

        return;
    }

    if (!perfil.activo) {

        alert(
            "Este usuario se encuentra desactivado."
        );

        await supabaseClient.auth.signOut();

        window.location.href =
            "login.html";

        return;
    }

    perfilUsuario = perfil;


    // ========================================================
    // CONTROL DE ROL
    // ========================================================

    console.log(
        "Rol del usuario:",
        perfilUsuario.rol
    );

    if (
        perfilUsuario.rol !== "administrador" &&
        perfilUsuario.rol !== "tesorero"
    ) {

        if (
            perfilUsuario.rol === "consulta"
        ) {

            window.location.href =
                "reportes.html";

            return;
        }

        alert(
            "Este usuario no tiene permisos para acceder al módulo de cuotas."
        );

        window.location.href =
            "dashboard.html";

        return;
    }


    // ========================================================
    // MOSTRAR USUARIO
    // ========================================================

    mostrarUsuario();


    // ========================================================
    // CONFIGURAR EVENTOS
    // ========================================================

    configurarEventos();


    // ========================================================
    // CARGAR INFORMACIÓN
    // ========================================================

    await cargarSocios();

    await cargarPeriodos();

    await cargarCategorias();

    await cargarCuotas();


    console.log(
        "Módulo de cuotas cargado correctamente."
    );
}


// ============================================================
// MOSTRAR USUARIO
// ============================================================

function mostrarUsuario() {

    const nombreUsuario =
        document.getElementById(
            "nombreUsuario"
        );

    const rolUsuario =
        document.getElementById(
            "rolUsuario"
        );

    if (nombreUsuario) {

        nombreUsuario.textContent =
            perfilUsuario &&
            perfilUsuario.nombre
                ? perfilUsuario.nombre
                : "Usuario";
    }

    if (rolUsuario) {

        rolUsuario.textContent =
            traducirRol(
                perfilUsuario
                    ? perfilUsuario.rol
                    : ""
            );
    }
}


// ============================================================
// TRADUCIR ROL
// ============================================================

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


// ============================================================
// CONFIGURAR EVENTOS
// ============================================================

function configurarEventos() {

    // --------------------------------------------------------
    // PAGOS DE CUOTAS
    // --------------------------------------------------------

    const irPagosCuotasButton =
        document.getElementById(
            "irPagosCuotasButton"
        );

    if (irPagosCuotasButton) {

        irPagosCuotasButton.addEventListener(
            "click",
            function () {

                window.location.href =
                    "pagos-cuotas.html";
            }
        );
    }


    // --------------------------------------------------------
    // COMPROBANTES
    // --------------------------------------------------------

    const irComprobantesButton =
        document.getElementById(
            "irComprobantesButton"
        );

    if (irComprobantesButton) {

        irComprobantesButton.addEventListener(
            "click",
            function () {

                window.location.href =
                    "comprobantes.html";
            }
        );
    }


    // --------------------------------------------------------
    // REPORTE PDF
    // --------------------------------------------------------

    const generarReporteButton =
        document.getElementById(
            "generarReporteCuotasButton"
        );

    if (generarReporteButton) {

        generarReporteButton.addEventListener(
            "click",
            generarReporteCuotasPDF
        );
    }


    // --------------------------------------------------------
    // NUEVA CUOTA
    // --------------------------------------------------------

    const nuevaCuotaButton =
        document.getElementById(
            "nuevaCuotaButton"
        );

    if (nuevaCuotaButton) {

        nuevaCuotaButton.addEventListener(
            "click",
            abrirModalNuevaCuota
        );
    }


    // --------------------------------------------------------
    // CERRAR MODAL
    // --------------------------------------------------------

    const cerrarModal =
        document.getElementById(
            "cerrarModalCuota"
        );

    if (cerrarModal) {

        cerrarModal.addEventListener(
            "click",
            cerrarModalCuota
        );
    }


    const cancelarCuota =
        document.getElementById(
            "cancelarCuota"
        );

    if (cancelarCuota) {

        cancelarCuota.addEventListener(
            "click",
            cerrarModalCuota
        );
    }


    // --------------------------------------------------------
    // FORMULARIO
    // --------------------------------------------------------

    const formulario =
        document.getElementById(
            "formCuota"
        );

    if (formulario) {

        formulario.addEventListener(
            "submit",
            guardarCuota
        );
    }


    // --------------------------------------------------------
    // BUSCADOR
    // --------------------------------------------------------

    const buscar =
        document.getElementById(
            "buscarCuota"
        );

    if (buscar) {

        buscar.addEventListener(
            "input",
            aplicarFiltros
        );
    }


    // --------------------------------------------------------
    // FILTRO ESTADO
    // --------------------------------------------------------

    const filtroEstado =
        document.getElementById(
            "filtroEstadoCuota"
        );

    if (filtroEstado) {

        filtroEstado.addEventListener(
            "change",
            aplicarFiltros
        );
    }


    // --------------------------------------------------------
    // FILTRO PERÍODO
    // --------------------------------------------------------

    const periodo =
        document.getElementById(
            "periodoSelect"
        );

    if (periodo) {

        periodo.addEventListener(
            "change",
            aplicarFiltros
        );
    }


    // --------------------------------------------------------
    // CLIC FUERA DEL MODAL
    // --------------------------------------------------------

    const modal =
        document.getElementById(
            "modalCuota"
        );

    if (modal) {

        modal.addEventListener(
            "click",
            function (event) {

                if (
                    event.target === modal
                ) {

                    cerrarModalCuota();
                }
            }
        );
    }


    // --------------------------------------------------------
    // CERRAR SESIÓN
    // --------------------------------------------------------

    const logoutButton =
        document.getElementById(
            "logoutButton"
        );

    if (logoutButton) {

        logoutButton.addEventListener(
            "click",
            cerrarSesion
        );
    }
}


// ============================================================
// CARGAR SOCIOS
// ============================================================

async function cargarSocios() {

    console.log(
        "Cargando socios..."
    );

    const select =
        document.getElementById(
            "socioSelect"
        );

    if (select) {

        select.innerHTML =
            '<option value="">Cargando socios...</option>';
    }


    const resultado =
        await supabaseClient
            .from("socios")
            .select(
                "id, nombres, apellido_paterno, apellido_materno, rut, estado"
            )
            .order(
                "apellido_paterno",
                {
                    ascending: true,
                    nullsFirst: false
                }
            )
            .order(
                "nombres",
                {
                    ascending: true
                }
            );


    if (resultado.error) {

        console.error(
            "Error al cargar socios:",
            resultado.error
        );

        if (select) {

            select.innerHTML =
                '<option value="">No fue posible cargar los socios</option>';
        }

        return;
    }


    socios =
        resultado.data || [];


    console.log(
        "Socios cargados:",
        socios.length
    );


    llenarSelectSocios();
}


// ============================================================
// LLENAR SELECT DE SOCIOS
// ============================================================

function llenarSelectSocios() {

    const select =
        document.getElementById(
            "socioSelect"
        );

    if (!select) {
        return;
    }


    select.innerHTML =
        '<option value="">Seleccione un socio</option>';


    socios.forEach(
        function (socio) {

            const option =
                document.createElement(
                    "option"
                );

            option.value =
                socio.id;

            const nombre =
                construirNombreCompleto(
                    socio
                );

            option.textContent =
                socio.rut
                    ? nombre +
                      " - " +
                      socio.rut
                    : nombre;

            select.appendChild(
                option
            );
        }
    );
}


// ============================================================
// CARGAR PERÍODOS FINANCIEROS
// ============================================================

async function cargarPeriodos() {

    console.log(
        "========================================"
    );

    console.log(
        "Cargando períodos financieros..."
    );


    const selectPrincipal =
        document.getElementById(
            "periodoSelect"
        );

    const selectModal =
        document.getElementById(
            "periodoCuotaSelect"
        );


    if (selectPrincipal) {

        selectPrincipal.innerHTML =
            '<option value="">Cargando años financieros...</option>';
    }


    if (selectModal) {

        selectModal.innerHTML =
            '<option value="">Cargando años financieros...</option>';
    }


    try {

        /*
         * Se consultan solamente las columnas necesarias.
         * Esto evita depender de columnas adicionales que
         * puedan existir en otras versiones de la tabla.
         */

        const resultado =
            await supabaseClient
                .from(
                    "periodos_financieros"
                )
                .select(
                    "id, anio, estado"
                )
                .order(
                    "anio",
                    {
                        ascending: false
                    }
                );


        console.log(
            "Resultado períodos:",
            resultado
        );


        if (resultado.error) {

            console.error(
                "ERROR AL CARGAR PERÍODOS:",
                resultado.error
            );


            mostrarErrorPeriodos(
                resultado.error
            );

            return;
        }


        periodos =
            resultado.data || [];


        console.log(
            "Períodos encontrados:",
            periodos.length
        );

        console.log(
            periodos
        );


        llenarSelectPeriodos();


    } catch (error) {

        console.error(
            "Error inesperado cargando períodos:",
            error
        );

        mostrarErrorPeriodos(
            error
        );
    }
}


// ============================================================
// MOSTRAR ERROR DE PERÍODOS
// ============================================================

function mostrarErrorPeriodos(error) {

    const selectPrincipal =
        document.getElementById(
            "periodoSelect"
        );

    const selectModal =
        document.getElementById(
            "periodoCuotaSelect"
        );


    const mensaje =
        "Error al cargar años financieros";


    if (selectPrincipal) {

        selectPrincipal.innerHTML =
            '<option value="">' +
            mensaje +
            "</option>";
    }


    if (selectModal) {

        selectModal.innerHTML =
            '<option value="">' +
            mensaje +
            "</option>";
    }


    console.error(
        obtenerMensajeError(error)
    );
}


// ============================================================
// OBTENER NOMBRE DE PERÍODO
// ============================================================

function obtenerNombrePeriodo(periodo) {

    if (!periodo) {
        return "Período";
    }


    if (
        periodo.anio !== undefined &&
        periodo.anio !== null
    ) {

        return String(
            periodo.anio
        );
    }


    if (
        periodo.nombre !== undefined &&
        periodo.nombre !== null
    ) {

        return String(
            periodo.nombre
        );
    }


    if (
        periodo.descripcion !== undefined &&
        periodo.descripcion !== null
    ) {

        return String(
            periodo.descripcion
        );
    }


    return (
        "Período #" +
        periodo.id
    );
}


// ============================================================
// LLENAR SELECT DE PERÍODOS
// ============================================================

function llenarSelectPeriodos() {

    const selectPrincipal =
        document.getElementById(
            "periodoSelect"
        );

    const selectModal =
        document.getElementById(
            "periodoCuotaSelect"
        );


    // --------------------------------------------------------
    // SELECT PRINCIPAL
    // --------------------------------------------------------

    if (selectPrincipal) {

        selectPrincipal.innerHTML =
            '<option value="">Todos los años</option>';
    }


    // --------------------------------------------------------
    // SELECT DEL MODAL
    // --------------------------------------------------------

    if (selectModal) {

        selectModal.innerHTML =
            '<option value="">Seleccione un año financiero</option>';
    }


    // --------------------------------------------------------
    // SI NO EXISTEN PERÍODOS
    // --------------------------------------------------------

    if (
        !periodos ||
        periodos.length === 0
    ) {

        if (selectPrincipal) {

            selectPrincipal.innerHTML =
                '<option value="">No hay años financieros</option>';
        }

        if (selectModal) {

            selectModal.innerHTML =
                '<option value="">No hay años financieros</option>';
        }

        console.warn(
            "No existen períodos financieros registrados."
        );

        return;
    }


    // --------------------------------------------------------
    // CREAR OPCIONES
    // --------------------------------------------------------

    periodos.forEach(
        function (periodo) {

            const nombre =
                obtenerNombrePeriodo(
                    periodo
                );


            if (selectPrincipal) {

                const optionPrincipal =
                    document.createElement(
                        "option"
                    );

                optionPrincipal.value =
                    periodo.id;

                optionPrincipal.textContent =
                    nombre;

                selectPrincipal.appendChild(
                    optionPrincipal
                );
            }


            if (selectModal) {

                const optionModal =
                    document.createElement(
                        "option"
                    );

                optionModal.value =
                    periodo.id;

                optionModal.textContent =
                    nombre;

                selectModal.appendChild(
                    optionModal
                );
            }
        }
    );


    console.log(
        "Select de períodos actualizado."
    );
}


// ============================================================
// CARGAR CATEGORÍAS
// ============================================================

async function cargarCategorias() {

    console.log(
        "Cargando categorías..."
    );


    const resultado =
        await supabaseClient
            .from("categorias")
            .select("*")
            .order(
                "nombre",
                {
                    ascending: true
                }
            );


    if (resultado.error) {

        console.error(
            "Error al cargar categorías:",
            resultado.error
        );

        categorias = [];

        llenarSelectCategorias();

        return;
    }


    categorias =
        resultado.data || [];


    console.log(
        "Categorías cargadas:",
        categorias.length
    );


    llenarSelectCategorias();
}


// ============================================================
// OBTENER NOMBRE CATEGORÍA
// ============================================================

function obtenerNombreCategoria(
    categoria
) {

    if (!categoria) {
        return "Sin categoría";
    }


    if (
        categoria.nombre !== undefined &&
        categoria.nombre !== null &&
        String(
            categoria.nombre
        ).trim() !== ""
    ) {

        return String(
            categoria.nombre
        );
    }


    if (
        categoria.descripcion !== undefined &&
        categoria.descripcion !== null &&
        String(
            categoria.descripcion
        ).trim() !== ""
    ) {

        return String(
            categoria.descripcion
        );
    }


    if (
        categoria.categoria !== undefined &&
        categoria.categoria !== null &&
        String(
            categoria.categoria
        ).trim() !== ""
    ) {

        return String(
            categoria.categoria
        );
    }


    return (
        "Categoría #" +
        categoria.id
    );
}


// ============================================================
// LLENAR CATEGORÍAS
// ============================================================

function llenarSelectCategorias() {

    const select =
        document.getElementById(
            "categoriaSelect"
        );

    if (!select) {
        return;
    }


    select.innerHTML =
        '<option value="">Sin categoría</option>';


    categorias.forEach(
        function (categoria) {

            const option =
                document.createElement(
                    "option"
                );

            option.value =
                categoria.id;

            option.textContent =
                obtenerNombreCategoria(
                    categoria
                );

            select.appendChild(
                option
            );
        }
    );
}


// ============================================================
// CARGAR CUOTAS
// ============================================================

async function cargarCuotas() {

    console.log(
        "========================================"
    );

    console.log(
        "Cargando cuotas..."
    );


    const tabla =
        document.getElementById(
            "tablaCuotas"
        );


    if (tabla) {

        tabla.innerHTML =
            '<tr>' +
            '<td colspan="8" class="tabla-cargando">' +
            "Cargando cuotas..." +
            "</td>" +
            "</tr>";
    }


    try {

        const resultado =
            await supabaseClient
                .from("cuotas")
                .select(
                    "id, socio_id, periodo_id, categoria_id, fecha_emision, fecha_vencimiento, monto, estado, observaciones, created_at, updated_at, created_by"
                )
                .order(
                    "fecha_emision",
                    {
                        ascending: false,
                        nullsFirst: false
                    }
                );


        console.log(
            "Resultado consulta cuotas:",
            resultado
        );


        if (resultado.error) {

            console.error(
                "ERROR AL CARGAR CUOTAS:",
                resultado.error
            );


            if (tabla) {

                tabla.innerHTML =
                    '<tr>' +
                    '<td colspan="8" class="tabla-cargando">' +
                    "No fue posible cargar las cuotas." +
                    "<br><small>" +
                    escaparHTML(
                        obtenerMensajeError(
                            resultado.error
                        )
                    ) +
                    "</small>" +
                    "</td>" +
                    "</tr>";
            }


            cuotas = [];

            actualizarResumen();

            actualizarContador(
                0,
                0
            );

            return;
        }


        cuotas =
            resultado.data || [];


        console.log(
            "Cuotas cargadas correctamente:",
            cuotas.length
        );


        aplicarFiltros();


    } catch (error) {

        console.error(
            "Error inesperado cargando cuotas:",
            error
        );


        if (tabla) {

            tabla.innerHTML =
                '<tr>' +
                '<td colspan="8" class="tabla-cargando">' +
                "Ocurrió un error al cargar las cuotas." +
                "<br><small>" +
                escaparHTML(
                    obtenerMensajeError(
                        error
                    )
                ) +
                "</small>" +
                "</td>" +
                "</tr>";
        }


        cuotas = [];

        actualizarResumen();

        actualizarContador(
            0,
            0
        );
    }
}


// ============================================================
// APLICAR FILTROS
// ============================================================

function aplicarFiltros() {

    const buscar =
        document.getElementById(
            "buscarCuota"
        );

    const filtroEstado =
        document.getElementById(
            "filtroEstadoCuota"
        );

    const periodo =
        document.getElementById(
            "periodoSelect"
        );


    const texto =
        buscar
            ? buscar.value
                .trim()
                .toLowerCase()
            : "";


    const estado =
        filtroEstado
            ? filtroEstado.value
            : "todos";


    const periodoId =
        periodo
            ? periodo.value
            : "";


    const filtradas =
        cuotas.filter(
            function (cuota) {

                const socio =
                    obtenerSocio(
                        cuota.socio_id
                    );


                const nombre =
                    socio
                        ? construirNombreCompleto(
                            socio
                        ).toLowerCase()
                        : "";


                const rut =
                    socio &&
                    socio.rut
                        ? String(
                            socio.rut
                        ).toLowerCase()
                        : "";


                const coincideBusqueda =
                    texto === "" ||
                    nombre.includes(
                        texto
                    ) ||
                    rut.includes(
                        texto
                    );


                const coincideEstado =
                    estado === "todos" ||
                    cuota.estado === estado;


                const coincidePeriodo =
                    periodoId === "" ||
                    String(
                        cuota.periodo_id
                    ) ===
                    String(
                        periodoId
                    );


                return (
                    coincideBusqueda &&
                    coincideEstado &&
                    coincidePeriodo
                );
            }
        );


    renderizarCuotas(
        filtradas
    );


    actualizarContador(
        filtradas.length,
        cuotas.length
    );


    actualizarResumen();
}


// ============================================================
// OBTENER SOCIO
// ============================================================

function obtenerSocio(id) {

    return socios.find(
        function (socio) {

            return (
                Number(
                    socio.id
                ) ===
                Number(id)
            );
        }
    );
}


// ============================================================
// OBTENER PERÍODO
// ============================================================

function obtenerPeriodo(id) {

    return periodos.find(
        function (periodo) {

            return (
                Number(
                    periodo.id
                ) ===
                Number(id)
            );
        }
    );
}


// ============================================================
// OBTENER CATEGORÍA
// ============================================================

function obtenerCategoria(id) {

    return categorias.find(
        function (categoria) {

            return (
                Number(
                    categoria.id
                ) ===
                Number(id)
            );
        }
    );
}


// ============================================================
// RENDERIZAR CUOTAS
// ============================================================

function renderizarCuotas(
    lista
) {

    const tabla =
        document.getElementById(
            "tablaCuotas"
        );


    if (!tabla) {
        return;
    }


    tabla.innerHTML = "";


    if (
        !lista ||
        lista.length === 0
    ) {

        tabla.innerHTML =
            '<tr>' +
            '<td colspan="8" class="tabla-cargando">' +
            "No se encontraron cuotas." +
            "</td>" +
            "</tr>";

        return;
    }


    lista.forEach(
        function (cuota) {

            const fila =
                document.createElement(
                    "tr"
                );


            const socio =
                obtenerSocio(
                    cuota.socio_id
                );


            const periodo =
                obtenerPeriodo(
                    cuota.periodo_id
                );


            const categoria =
                obtenerCategoria(
                    cuota.categoria_id
                );


            const nombreSocio =
                socio
                    ? construirNombreCompleto(
                        socio
                    )
                    : "Socio no encontrado";


            const nombrePeriodo =
                obtenerNombrePeriodo(
                    periodo
                );


            const nombreCategoria =
                obtenerNombreCategoria(
                    categoria
                );


            const monto =
                formatearMoneda(
                    cuota.monto
                );


            const estado =
                cuota.estado ||
                "pendiente";


            const claseEstado =
                obtenerClaseEstado(
                    estado
                );


            fila.innerHTML =
                "<td>" +
                "<strong>" +
                escaparHTML(
                    nombreSocio
                ) +
                "</strong>" +
                "</td>" +

                "<td>" +
                escaparHTML(
                    nombrePeriodo
                ) +
                "</td>" +

                "<td>" +
                escaparHTML(
                    nombreCategoria
                ) +
                "</td>" +

                "<td>" +
                formatearFecha(
                    cuota.fecha_emision
                ) +
                "</td>" +

                "<td>" +
                formatearFecha(
                    cuota.fecha_vencimiento
                ) +
                "</td>" +

                "<td>" +
                "<strong>" +
                monto +
                "</strong>" +
                "</td>" +

                "<td>" +
                '<span class="' +
                claseEstado +
                '">' +
                escaparHTML(
                    traducirEstado(
                        estado
                    )
                ) +
                "</span>" +
                "</td>" +

                "<td>" +
                '<button type="button" ' +
                'class="boton-tabla" ' +
                'data-accion="editar" ' +
                'data-id="' +
                cuota.id +
                '">' +
                "Editar" +
                "</button>" +
                "</td>";


            tabla.appendChild(
                fila
            );
        }
    );


    const botonesEditar =
        tabla.querySelectorAll(
            '[data-accion="editar"]'
        );


    botonesEditar.forEach(
        function (boton) {

            boton.addEventListener(
                "click",
                function () {

                    abrirModalEditarCuota(
                        Number(
                            boton.dataset.id
                        )
                    );
                }
            );
        }
    );
}


// ============================================================
// ACTUALIZAR RESUMEN
// ============================================================

function actualizarResumen() {

    let pagadas = 0;
    let pendientes = 0;
    let parciales = 0;


    cuotas.forEach(
        function (cuota) {

            const estado =
                cuota.estado ||
                "pendiente";


            if (
                estado === "pagada"
            ) {

                pagadas++;

            } else if (
                estado === "parcial"
            ) {

                parciales++;

            } else if (
                estado === "pendiente"
            ) {

                pendientes++;
            }
        }
    );


    const elementoPagadas =
        document.getElementById(
            "totalCuotasPagadas"
        );


    const elementoPendientes =
        document.getElementById(
            "totalCuotasPendientes"
        );


    const elementoParciales =
        document.getElementById(
            "totalCuotasParciales"
        );


    if (elementoPagadas) {

        elementoPagadas.textContent =
            pagadas;
    }


    if (elementoPendientes) {

        elementoPendientes.textContent =
            pendientes;
    }


    if (elementoParciales) {

        elementoParciales.textContent =
            parciales;
    }
}


// ============================================================
// ACTUALIZAR CONTADOR
// ============================================================

function actualizarContador(
    visible,
    total
) {

    const contador =
        document.getElementById(
            "contadorCuotas"
        );


    if (!contador) {
        return;
    }


    if (total === 0) {

        contador.textContent =
            "No existen cuotas registradas.";

        return;
    }


    if (visible !== total) {

        contador.textContent =
            visible +
            " de " +
            total +
            " cuotas";

        return;
    }


    contador.textContent =
        total === 1
            ? "1 cuota registrada"
            : total +
              " cuotas registradas";
}


// ============================================================
// ABRIR MODAL NUEVA CUOTA
// ============================================================

function abrirModalNuevaCuota() {

    const modal =
        document.getElementById(
            "modalCuota"
        );


    const titulo =
        document.getElementById(
            "modalTituloCuota"
        );


    const formulario =
        document.getElementById(
            "formCuota"
        );


    if (
        !modal ||
        !titulo ||
        !formulario
    ) {

        console.error(
            "No se encontró el formulario de cuotas."
        );

        return;
    }


    formulario.reset();


    const cuotaId =
        document.getElementById(
            "cuotaId"
        );


    if (cuotaId) {

        cuotaId.value = "";
    }


    titulo.textContent =
        "Nueva cuota";


    const estado =
        document.getElementById(
            "estadoCuota"
        );


    if (estado) {

        estado.value =
            "pendiente";
    }


    const fecha =
        document.getElementById(
            "fechaEmision"
        );


    if (fecha) {

        fecha.value =
            obtenerFechaActual();
    }


    const periodoPrincipal =
        document.getElementById(
            "periodoSelect"
        );


    const periodoModal =
        document.getElementById(
            "periodoCuotaSelect"
        );


    if (
        periodoPrincipal &&
        periodoModal &&
        periodoPrincipal.value
    ) {

        periodoModal.value =
            periodoPrincipal.value;
    }


    modal.style.display =
        "flex";


    const socio =
        document.getElementById(
            "socioSelect"
        );


    if (socio) {

        socio.focus();
    }
}


// ============================================================
// ABRIR MODAL EDITAR CUOTA
// ============================================================

function abrirModalEditarCuota(
    id
) {

    const cuota =
        cuotas.find(
            function (elemento) {

                return (
                    Number(
                        elemento.id
                    ) ===
                    Number(id)
                );
            }
        );


    if (!cuota) {

        alert(
            "No fue posible encontrar la cuota seleccionada."
        );

        return;
    }


    const modal =
        document.getElementById(
            "modalCuota"
        );


    const titulo =
        document.getElementById(
            "modalTituloCuota"
        );


    if (
        !modal ||
        !titulo
    ) {

        return;
    }


    titulo.textContent =
        "Editar cuota";


    const cuotaId =
        document.getElementById(
            "cuotaId"
        );

    if (cuotaId) {

        cuotaId.value =
            cuota.id;
    }


    const socio =
        document.getElementById(
            "socioSelect"
        );

    if (socio) {

        socio.value =
            cuota.socio_id;
    }


    const periodo =
        document.getElementById(
            "periodoCuotaSelect"
        );

    if (periodo) {

        periodo.value =
            cuota.periodo_id;
    }


    const categoria =
        document.getElementById(
            "categoriaSelect"
        );

    if (categoria) {

        categoria.value =
            cuota.categoria_id ||
            "";
    }


    const monto =
        document.getElementById(
            "montoCuota"
        );

    if (monto) {

        monto.value =
            cuota.monto ||
            "";
    }


    const fechaEmision =
        document.getElementById(
            "fechaEmision"
        );

    if (fechaEmision) {

        fechaEmision.value =
            cuota.fecha_emision ||
            "";
    }


    const fechaVencimiento =
        document.getElementById(
            "fechaVencimiento"
        );

    if (fechaVencimiento) {

        fechaVencimiento.value =
            cuota.fecha_vencimiento ||
            "";
    }


    const estado =
        document.getElementById(
            "estadoCuota"
        );

    if (estado) {

        estado.value =
            cuota.estado ||
            "pendiente";
    }


    const observaciones =
        document.getElementById(
            "observacionesCuota"
        );

    if (observaciones) {

        observaciones.value =
            cuota.observaciones ||
            "";
    }


    modal.style.display =
        "flex";


    if (socio) {

        socio.focus();
    }
}


// ============================================================
// CERRAR MODAL
// ============================================================

function cerrarModalCuota() {

    const modal =
        document.getElementById(
            "modalCuota"
        );


    if (!modal) {
        return;
    }


    modal.style.display =
        "none";


    const formulario =
        document.getElementById(
            "formCuota"
        );


    if (formulario) {

        formulario.reset();
    }


    const cuotaId =
        document.getElementById(
            "cuotaId"
        );


    if (cuotaId) {

        cuotaId.value = "";
    }
}


// ============================================================
// GUARDAR CUOTA
// ============================================================

async function guardarCuota(
    event
) {

    event.preventDefault();


    if (
        !perfilUsuario ||
        (
            perfilUsuario.rol !==
                "administrador" &&
            perfilUsuario.rol !==
                "tesorero"
        )
    ) {

        alert(
            "No tiene permisos para administrar cuotas."
        );

        return;
    }


    const boton =
        document.getElementById(
            "guardarCuota"
        );


    const cuotaId =
        obtenerValor(
            "cuotaId"
        );


    const socioId =
        obtenerValor(
            "socioSelect"
        );


    const periodoId =
        obtenerValor(
            "periodoCuotaSelect"
        );


    const categoriaId =
        obtenerValor(
            "categoriaSelect"
        );


    const monto =
        obtenerValor(
            "montoCuota"
        );


    const fechaEmision =
        obtenerValor(
            "fechaEmision"
        );


    const fechaVencimiento =
        obtenerValor(
            "fechaVencimiento"
        );


    const estado =
        obtenerValor(
            "estadoCuota"
        ) ||
        "pendiente";


    const observaciones =
        obtenerValor(
            "observacionesCuota"
        );


    if (!socioId) {

        alert(
            "Debe seleccionar un socio."
        );

        return;
    }


    if (!periodoId) {

        alert(
            "Debe seleccionar un período financiero."
        );

        return;
    }


    if (
        !monto ||
        Number(monto) <= 0
    ) {

        alert(
            "Debe ingresar un monto válido."
        );

        return;
    }


    const datosCuota = {

        socio_id:
            Number(
                socioId
            ),

        periodo_id:
            Number(
                periodoId
            ),

        categoria_id:
            categoriaId
                ? Number(
                    categoriaId
                )
                : null,

        fecha_emision:
            fechaEmision ||
            obtenerFechaActual(),

        fecha_vencimiento:
            fechaVencimiento ||
            null,

        monto:
            Number(
                monto
            ),

        estado:
            estado,

        observaciones:
            observaciones ||
            null
    };


    if (boton) {

        boton.disabled =
            true;

        boton.textContent =
            cuotaId
                ? "Actualizando..."
                : "Guardando...";
    }


    try {

        // ====================================================
        // ACTUALIZAR
        // ====================================================

        if (cuotaId) {

            const resultado =
                await supabaseClient
                    .from("cuotas")
                    .update(
                        {
                            ...datosCuota,

                            updated_at:
                                new Date()
                                    .toISOString()
                        }
                    )
                    .eq(
                        "id",
                        Number(
                            cuotaId
                        )
                    );


            if (resultado.error) {

                console.error(
                    "Error al actualizar cuota:",
                    resultado.error
                );

                alert(
                    obtenerMensajeError(
                        resultado.error
                    )
                );

                return;
            }


            alert(
                "Cuota actualizada correctamente."
            );


        // ====================================================
        // CREAR
        // ====================================================

        } else {

            const resultado =
                await supabaseClient
                    .from("cuotas")
                    .insert(
                        {
                            ...datosCuota,

                            created_by:
                                usuarioActual.id
                        }
                    );


            if (resultado.error) {

                console.error(
                    "Error al crear cuota:",
                    resultado.error
                );

                alert(
                    obtenerMensajeError(
                        resultado.error
                    )
                );

                return;
            }


            alert(
                "Cuota registrada correctamente."
            );
        }


        cerrarModalCuota();


        await cargarCuotas();


    } catch (error) {

        console.error(
            "Error inesperado al guardar cuota:",
            error
        );


        alert(
            obtenerMensajeError(
                error
            )
        );


    } finally {

        if (boton) {

            boton.disabled =
                false;

            boton.textContent =
                "Guardar cuota";
        }
    }
}


// ============================================================
// REPORTE PDF
// ============================================================

async function generarReporteCuotasPDF() {

    console.log(
        "Generando reporte de cuotas..."
    );


    const periodoSelect =
        document.getElementById(
            "periodoSelect"
        );


    const filtroEstado =
        document.getElementById(
            "filtroEstadoCuota"
        );


    const periodoId =
        periodoSelect
            ? periodoSelect.value
            : "";


    const estado =
        filtroEstado
            ? filtroEstado.value
            : "todos";


    try {

        await cargarLibreriasPDF();


        const resultado =
            await supabaseClient
                .rpc(
                    "reporte_detallado_cuotas",
                    {
                        p_periodo_id:
                            periodoId
                                ? Number(
                                    periodoId
                                )
                                : null,

                        p_estado:
                            estado === "todos"
                                ? null
                                : estado,

                        p_socio_id:
                            null
                    }
                );


        if (resultado.error) {

            console.error(
                "Error en reporte:",
                resultado.error
            );

            alert(
                obtenerMensajeError(
                    resultado.error
                )
            );

            return;
        }


        const datos =
            resultado.data || [];


        if (
            typeof window.jspdf ===
            "undefined"
        ) {

            alert(
                "No fue posible cargar la biblioteca PDF."
            );

            return;
        }


        const {
            jsPDF
        } = window.jspdf;


        const doc =
            new jsPDF(
                "landscape",
                "mm",
                "a4"
            );


        doc.setFontSize(
            16
        );

        doc.setFont(
            "helvetica",
            "bold"
        );

        doc.text(
            "COMUNIDAD INDÍGENA JUAN CHEUQUELÉN",
            148,
            15,
            {
                align: "center"
            }
        );


        doc.setFontSize(
            12
        );

        doc.setFont(
            "helvetica",
            "normal"
        );

        doc.text(
            "Reporte de cuotas",
            148,
            22,
            {
                align: "center"
            }
        );


        const periodo =
            periodoId
                ? obtenerPeriodo(
                    Number(
                        periodoId
                    )
                )
                : null;


        if (periodo) {

            doc.text(
                "Período financiero: " +
                obtenerNombrePeriodo(
                    periodo
                ),
                148,
                29,
                {
                    align: "center"
                }
            );
        }


        if (
            typeof doc.autoTable ===
            "function"
        ) {

            const filas =
                datos.map(
                    function (item) {

                        return [
                            item.socio_nombre ||
                            item.nombre_socio ||
                            "—",

                            item.socio_rut ||
                            item.rut ||
                            "—",

                            item.periodo_anio ||
                            item.anio ||
                            "—",

                            item.categoria_nombre ||
                            item.categoria ||
                            "—",

                            formatearMoneda(
                                item.monto
                            ),

                            traducirEstadoReporte(
                                item.estado
                            ),

                            formatearFecha(
                                item.fecha_emision
                            ),

                            formatearFecha(
                                item.fecha_vencimiento
                            )
                        ];
                    }
                );


            doc.autoTable(
                {
                    startY: 35,

                    head: [
                        [
                            "Socio",
                            "RUT",
                            "Año",
                            "Categoría",
                            "Monto",
                            "Estado",
                            "Emisión",
                            "Vencimiento"
                        ]
                    ],

                    body:
                        filas,

                    styles:
                        {
                            fontSize: 8
                        },

                    headStyles:
                        {
                            fontStyle:
                                "bold"
                        },

                    margin:
                        {
                            left: 10,
                            right: 10
                        }
                }
            );
        }


        const fecha =
            obtenerFechaActual();


        doc.setFontSize(
            8
        );


        doc.text(
            "Generado el " +
            formatearFecha(
                fecha
            ),
            148,
            200,
            {
                align: "center"
            }
        );


        doc.save(
            "reporte-cuotas-" +
            fecha +
            ".pdf"
        );


    } catch (error) {

        console.error(
            "Error generando PDF:",
            error
        );


        alert(
            obtenerMensajeError(
                error
            )
        );
    }
}


// ============================================================
// CARGAR LIBRERÍAS PDF
// ============================================================

function cargarLibreriasPDF() {

    return new Promise(
        function (
            resolve,
            reject
        ) {

            if (
                typeof window.jspdf !==
                "undefined"
            ) {

                resolve();

                return;
            }


            const script =
                document.createElement(
                    "script"
                );


            script.src =
                "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";


            script.onload =
                function () {

                    const autoTable =
                        document.createElement(
                            "script"
                        );


                    autoTable.src =
                        "https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js";


                    autoTable.onload =
                        function () {

                            resolve();
                        };


                    autoTable.onerror =
                        function () {

                            reject(
                                new Error(
                                    "No fue posible cargar jsPDF AutoTable."
                                )
                            );
                        };


                    document.head.appendChild(
                        autoTable
                    );
                };


            script.onerror =
                function () {

                    reject(
                        new Error(
                            "No fue posible cargar jsPDF."
                        )
                    );
                };


            document.head.appendChild(
                script
            );
        }
    );
}


// ============================================================
// TRADUCIR ESTADO REPORTE
// ============================================================

function traducirEstadoReporte(
    estado
) {

    switch (estado) {

        case "pendiente":
            return "Pendiente";

        case "parcial":
            return "Parcial";

        case "pagada":
            return "Pagada";

        case "anulada":
            return "Anulada";

        default:
            return estado ||
                "—";
    }
}


// ============================================================
// OBTENER VALOR
// ============================================================

function obtenerValor(id) {

    const elemento =
        document.getElementById(
            id
        );


    if (!elemento) {

        return "";
    }


    return elemento.value
        ? elemento.value.trim()
        : "";
}


// ============================================================
// CONSTRUIR NOMBRE COMPLETO
// ============================================================

function construirNombreCompleto(
    socio
) {

    if (!socio) {
        return "";
    }


    return [
        socio.nombres,
        socio.apellido_paterno,
        socio.apellido_materno
    ]
        .filter(
            function (parte) {

                return (
                    parte &&
                    String(
                        parte
                    ).trim() !== ""
                );
            }
        )
        .join(" ");
}


// ============================================================
// FECHA ACTUAL
// ============================================================

function obtenerFechaActual() {

    const fecha =
        new Date();


    const anio =
        fecha.getFullYear();


    const mes =
        String(
            fecha.getMonth() + 1
        ).padStart(
            2,
            "0"
        );


    const dia =
        String(
            fecha.getDate()
        ).padStart(
            2,
            "0"
        );


    return (
        anio +
        "-" +
        mes +
        "-" +
        dia
    );
}


// ============================================================
// FORMATEAR MONEDA
// ============================================================

function formatearMoneda(
    valor
) {

    const numero =
        Number(
            valor
        ) || 0;


    return numero.toLocaleString(
        "es-CL",
        {
            style:
                "currency",

            currency:
                "CLP",

            maximumFractionDigits:
                0
        }
    );
}


// ============================================================
// FORMATEAR FECHA
// ============================================================

function formatearFecha(
    fecha
) {

    if (!fecha) {

        return "—";
    }


    const texto =
        String(
            fecha
        );


    const partes =
        texto.split(
            "T"
        )[0].split(
            "-"
        );


    if (
        partes.length !==
        3
    ) {

        return texto;
    }


    return (
        partes[2] +
        "-" +
        partes[1] +
        "-" +
        partes[0]
    );
}


// ============================================================
// TRADUCIR ESTADO
// ============================================================

function traducirEstado(
    estado
) {

    switch (estado) {

        case "pendiente":
            return "Pendiente";

        case "parcial":
            return "Parcial";

        case "pagada":
            return "Pagada";

        case "anulada":
            return "Anulada";

        default:
            return estado ||
                "—";
    }
}


// ============================================================
// CLASE ESTADO
// ============================================================

function obtenerClaseEstado(
    estado
) {

    switch (estado) {

        case "pagada":
            return "estado-activo";

        case "parcial":
            return "estado-parcial";

        case "pendiente":
            return "estado-inactivo";

        case "anulada":
            return "estado-inactivo";

        default:
            return "estado-inactivo";
    }
}


// ============================================================
// ESCAPAR HTML
// ============================================================

function escaparHTML(
    texto
) {

    return String(
        texto === undefined ||
        texto === null
            ? ""
            : texto
    )
        .replace(
            /&/g,
            "&amp;"
        )
        .replace(
            /</g,
            "&lt;"
        )
        .replace(
            />/g,
            "&gt;"
        )
        .replace(
            /"/g,
            "&quot;"
        )
        .replace(
            /'/g,
            "&#039;"
        );
}


// ============================================================
// MENSAJE DE ERROR
// ============================================================

function obtenerMensajeError(
    error
) {

    if (!error) {

        return (
            "Ocurrió un error desconocido."
        );
    }


    console.error(
        "Detalle del error:",
        error
    );


    if (
        error.code ===
        "23505"
    ) {

        return (
            "Ya existe una cuota para el socio y período seleccionados."
        );
    }


    if (
        error.code ===
        "23503"
    ) {

        return (
            "No fue posible guardar la cuota porque uno de los registros relacionados no existe."
        );
    }


    if (
        error.code ===
        "23514"
    ) {

        return (
            "Los datos ingresados no cumplen las reglas establecidas para las cuotas."
        );
    }


    if (
        error.code ===
        "42501"
    ) {

        return (
            "No tiene permisos para realizar esta operación."
        );
    }


    if (
        error.code ===
        "PGRST116"
    ) {

        return (
            "No se encontró el registro solicitado."
        );
    }


    if (
        error.code ===
        "42P01"
    ) {

        return (
            "La tabla solicitada no existe en la base de datos."
        );
    }


    if (
        error.message
    ) {

        return String(
            error.message
        );
    }


    return (
        "No fue posible completar la operación."
    );
}


// ============================================================
// MOSTRAR ERROR GENERAL
// ============================================================

function mostrarErrorGeneral(
    mensaje
) {

    const tabla =
        document.getElementById(
            "tablaCuotas"
        );


    if (tabla) {

        tabla.innerHTML =
            '<tr>' +
            '<td colspan="8" class="tabla-cargando">' +
            escaparHTML(
                mensaje
            ) +
            "</td>" +
            "</tr>";
    }


    const nombreUsuario =
        document.getElementById(
            "nombreUsuario"
        );


    if (nombreUsuario) {

        nombreUsuario.textContent =
            "Error";
    }


    const rolUsuario =
        document.getElementById(
            "rolUsuario"
        );


    if (rolUsuario) {

        rolUsuario.textContent =
            "No disponible";
    }
}


// ============================================================
// CERRAR SESIÓN
// ============================================================

async function cerrarSesion() {

    const confirmar =
        confirm(
            "¿Está seguro de que desea cerrar la sesión?"
        );


    if (!confirmar) {

        return;
    }


    const resultado =
        await supabaseClient.auth.signOut();


    if (resultado.error) {

        console.error(
            "Error al cerrar sesión:",
            resultado.error
        );


        alert(
            "No fue posible cerrar la sesión."
        );

        return;
    }


    window.location.href =
        "login.html";
}
