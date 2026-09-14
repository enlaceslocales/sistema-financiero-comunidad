/* ============================================================
   SISTEMA FINANCIERO
   FICHA DE PROYECTO
   ============================================================ */


let usuarioActual = null;
let perfilUsuario = null;

let proyectoActual = null;

let periodos = [];
let cuentas = [];
let categorias = [];

let ingresos = [];
let gastos = [];
let documentos = [];

let proyectoId = null;




/* ============================================================
   NAVEGACIÓN LATERAL DEL MÓDULO
   ============================================================ */

function configurarMenuLateral() {

    const ids = [
        "menuSocios",
        "menuCuotas",
        "menuFinanzas",
        "menuProyectos",
        "menuReportes",
        "menuUsuarios"
    ];

    ids.forEach(function (id) {
        const elemento = document.getElementById(id);

        if (elemento) {
            elemento.style.display = "none";
        }
    });

    if (!perfilUsuario) {
        return;
    }

    if (perfilUsuario.rol === "administrador") {
        ids.forEach(function (id) {
            const elemento = document.getElementById(id);

            if (elemento) {
                elemento.style.display = "flex";
            }
        });
    }
    else if (perfilUsuario.rol === "tesorero") {
        [
            "menuSocios",
            "menuCuotas",
            "menuFinanzas",
            "menuProyectos",
            "menuReportes"
        ].forEach(function (id) {
            const elemento = document.getElementById(id);

            if (elemento) {
                elemento.style.display = "flex";
            }
        });
    }
    else if (perfilUsuario.rol === "consulta") {
        const elemento = document.getElementById("menuReportes");

        if (elemento) {
            elemento.style.display = "flex";
        }
    }
}


/* ============================================================
   CERRAR SESIÓN DESDE LA BARRA LATERAL
   ============================================================ */

function configurarCerrarSesionLateral() {

    const boton = document.getElementById("logoutButton");

    if (!boton || boton.dataset.listenerConfigurado === "true") {
        return;
    }

    boton.addEventListener("click", async function () {

        const confirmar = confirm(
            "¿Está seguro de que desea cerrar sesión?"
        );

        if (!confirmar) {
            return;
        }

        boton.disabled = true;

        const resultado = await supabaseClient.auth.signOut();

        if (resultado.error) {
            console.error(
                "Error al cerrar sesión:",
                resultado.error
            );

            alert("No fue posible cerrar la sesión.");
            boton.disabled = false;
            return;
        }

        window.location.replace("login.html");
    });

    boton.dataset.listenerConfigurado = "true";
}


/* ============================================================
   INICIAR
   ============================================================ */

document.addEventListener(
    "DOMContentLoaded",
    async function () {

        proyectoId =
            obtenerIdProyectoDesdeURL();


        if (!proyectoId) {

            mostrarError(
                "No se especificó un proyecto válido."
            );

            return;

        }


        configurarEventos();


        await verificarSesion();

    }
);


/* ============================================================
   OBTENER ID DESDE URL
   ============================================================ */

function obtenerIdProyectoDesdeURL() {

    const parametros =
        new URLSearchParams(
            window.location.search
        );


    const id =
        parametros.get("id");


    if (!id) {

        return null;

    }


    const numero =
        Number(id);


    if (
        !Number.isInteger(numero) ||
        numero <= 0
    ) {

        return null;

    }


    return numero;

}


/* ============================================================
   VERIFICAR SESIÓN
   ============================================================ */

async function verificarSesion() {

    const resultadoSesion =
        await supabaseClient.auth.getSession();


    if (resultadoSesion.error) {

        console.error(
            "Error al comprobar sesión:",
            resultadoSesion.error
        );

        window.location.href =
            "login.html";

        return;

    }


    const session =
        resultadoSesion.data.session;


    if (!session) {

        window.location.href =
            "login.html";

        return;

    }


    usuarioActual =
        session.user;


    const resultadoPerfil =
        await supabaseClient
            .from("profiles")
            .select(
                "nombre, email, rol, activo"
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

        mostrarError(
            "No fue posible cargar el perfil del usuario."
        );

        return;

    }


    perfilUsuario =
        resultadoPerfil.data;


    configurarMenuLateral();
    configurarCerrarSesionLateral();


    if (
        !perfilUsuario ||
        !perfilUsuario.activo
    ) {

        alert(
            "Este usuario se encuentra desactivado."
        );


        await supabaseClient.auth.signOut();


        window.location.href =
            "login.html";


        return;

    }


    await cargarPeriodos();

    await cargarCuentas();

    await cargarCategorias();

    await cargarProyecto();

}


/* ============================================================
   CONFIGURAR EVENTOS
   ============================================================ */

function configurarEventos() {

    /* ========================================================
       VOLVER
       ======================================================== */

    const volver =
        document.getElementById(
            "volverProyectos"
        );


    if (volver) {

        volver.addEventListener(
            "click",
            function () {

                window.location.href =
                    "proyectos.html";

            }
        );

    }


    /* ========================================================
       INGRESOS
       ======================================================== */

    const nuevoIngreso =
        document.getElementById(
            "nuevoIngresoButton"
        );


    if (nuevoIngreso) {

        nuevoIngreso.addEventListener(
            "click",
            abrirNuevoIngreso
        );

    }


    const formularioIngreso =
        document.getElementById(
            "formIngreso"
        );


    if (formularioIngreso) {

        formularioIngreso.addEventListener(
            "submit",
            guardarIngreso
        );

    }


    const cerrarIngreso =
        document.getElementById(
            "cerrarModalIngreso"
        );


    if (cerrarIngreso) {

        cerrarIngreso.addEventListener(
            "click",
            cerrarModalIngreso
        );

    }


    const cancelarIngreso =
        document.getElementById(
            "cancelarIngreso"
        );


    if (cancelarIngreso) {

        cancelarIngreso.addEventListener(
            "click",
            cerrarModalIngreso
        );

    }


    const modalIngreso =
        document.getElementById(
            "modalIngreso"
        );


    if (modalIngreso) {

        modalIngreso.addEventListener(
            "click",
            function (event) {

                if (
                    event.target ===
                    modalIngreso
                ) {

                    cerrarModalIngreso();

                }

            }
        );

    }


    /* ========================================================
       GASTOS
       ======================================================== */

    const nuevoGasto =
        document.getElementById(
            "nuevoGastoButton"
        );


    if (nuevoGasto) {

        nuevoGasto.addEventListener(
            "click",
            abrirNuevoGasto
        );

    }


    const formularioGasto =
        document.getElementById(
            "formGasto"
        );


    if (formularioGasto) {

        formularioGasto.addEventListener(
            "submit",
            guardarGasto
        );

    }


    const cerrarGasto =
        document.getElementById(
            "cerrarModalGasto"
        );


    if (cerrarGasto) {

        cerrarGasto.addEventListener(
            "click",
            cerrarModalGasto
        );

    }


    const cancelarGasto =
        document.getElementById(
            "cancelarGasto"
        );


    if (cancelarGasto) {

        cancelarGasto.addEventListener(
            "click",
            cerrarModalGasto
        );

    }


    const modalGasto =
        document.getElementById(
            "modalGasto"
        );


    if (modalGasto) {

        modalGasto.addEventListener(
            "click",
            function (event) {

                if (
                    event.target ===
                    modalGasto
                ) {

                    cerrarModalGasto();

                }

            }
        );

    }




    /* ========================================================
       DOCUMENTACIÓN
       ======================================================== */

    const nuevoDocumento =
        document.getElementById(
            "nuevoDocumentoButton"
        );

    if (nuevoDocumento) {
        nuevoDocumento.addEventListener(
            "click",
            abrirNuevoDocumento
        );
    }

    const formularioDocumento =
        document.getElementById(
            "formDocumento"
        );

    if (formularioDocumento) {
        formularioDocumento.addEventListener(
            "submit",
            guardarDocumento
        );
    }

    const cerrarDocumento =
        document.getElementById(
            "cerrarModalDocumento"
        );

    if (cerrarDocumento) {
        cerrarDocumento.addEventListener(
            "click",
            cerrarModalDocumento
        );
    }

    const cancelarDocumento =
        document.getElementById(
            "cancelarDocumento"
        );

    if (cancelarDocumento) {
        cancelarDocumento.addEventListener(
            "click",
            cerrarModalDocumento
        );
    }

    const modalDocumento =
        document.getElementById(
            "modalDocumento"
        );

    if (modalDocumento) {
        modalDocumento.addEventListener(
            "click",
            function (event) {
                if (event.target === modalDocumento) {
                    cerrarModalDocumento();
                }
            }
        );
    }

    const archivoDocumento =
        document.getElementById(
            "documentoArchivo"
        );

    if (archivoDocumento) {
        archivoDocumento.addEventListener(
            "change",
            actualizarArchivoSeleccionado
        );
    }

}


/* ============================================================
   CARGAR PERIODOS
   ============================================================ */

async function cargarPeriodos() {

    const resultado =
        await supabaseClient
            .from("periodos_financieros")
            .select(
                "id, anio, estado"
            )
            .order(
                "anio",
                {
                    ascending: false
                }
            );


    if (resultado.error) {

        console.error(
            "Error al cargar períodos:",
            resultado.error
        );

        return;

    }


    periodos =
        resultado.data || [];

}


/* ============================================================
   CARGAR CUENTAS
   ============================================================ */

async function cargarCuentas() {

    const resultado =
        await supabaseClient
            .from("cuentas")
            .select("*")
            .order(
                "id",
                {
                    ascending: true
                }
            );


    if (resultado.error) {

        console.error(
            "Error al cargar cuentas:",
            resultado.error
        );

        cuentas = [];

        return;

    }


    cuentas =
        resultado.data || [];


    llenarSelectorCuentas();

}


/* ============================================================
   LLENAR SELECTOR DE CUENTAS
   ============================================================ */

function llenarSelectorCuentas() {

    const selectores = [
        "ingresoCuenta",
        "gastoCuenta"
    ];


    selectores.forEach(
        function (id) {

            const selector =
                document.getElementById(id);


            if (!selector) {

                return;

            }


            selector.innerHTML =
                '<option value="">Seleccione una cuenta</option>';


            cuentas.forEach(
                function (cuenta) {

                    const option =
                        document.createElement(
                            "option"
                        );


                    option.value =
                        cuenta.id;


                    option.textContent =
                        obtenerNombreCuenta(
                            cuenta
                        );


                    selector.appendChild(
                        option
                    );

                }
            );

        }
    );

}


/* ============================================================
   CARGAR CATEGORÍAS
   ============================================================ */

async function cargarCategorias() {

    const resultado =
        await supabaseClient
            .from("categorias")
            .select(
                "id, nombre, tipo, descripcion, activo"
            )
            .eq(
                "activo",
                true
            )
            .eq(
                "tipo",
                "egreso"
            )
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

        alert(
            "No fue posible cargar categorías."
        );

        return;

    }


    categorias =
        resultado.data || [];


    llenarSelectorCategorias();

}


/* ============================================================
   LLENAR SELECTOR DE CATEGORÍAS
   ============================================================ */

function llenarSelectorCategorias() {

    const selector =
        document.getElementById(
            "gastoCategoria"
        );


    if (!selector) {

        return;

    }


    selector.innerHTML =
        '<option value="">Seleccione una categoría</option>';


    categorias.forEach(
        function (categoria) {

            const option =
                document.createElement(
                    "option"
                );


            option.value =
                categoria.id;


            option.textContent =
                categoria.nombre;


            selector.appendChild(
                option
            );

        }
    );

}


/* ============================================================
   CARGAR PROYECTO
   ============================================================ */

async function cargarProyecto() {

    const resultado =
        await supabaseClient
            .from("proyectos")
            .select(
                "id, periodo_id, nombre, codigo, organismo_financiador, descripcion, fecha_postulacion, fecha_adjudicacion, monto_adjudicado, estado, responsable, observaciones, created_at"
            )
            .eq(
                "id",
                proyectoId
            )
            .single();


    if (resultado.error) {

        console.error(
            "Error al cargar proyecto:",
            resultado.error
        );


        mostrarError(
            "No fue posible cargar el proyecto."
        );


        ocultarCargando();


        return;

    }


    proyectoActual =
        resultado.data;


    renderizarProyecto();


    await cargarResumenFinanciero();

    await cargarIngresos();

    await cargarGastos();
    await cargarDocumentos();


    ocultarCargando();


    mostrarContenido();

}


/* ============================================================
   RENDERIZAR PROYECTO
   ============================================================ */

function renderizarProyecto() {

    if (!proyectoActual) {

        return;

    }


    establecerTexto(
        "proyectoNombre",
        proyectoActual.nombre
    );


    establecerTexto(
        "proyectoCodigo",
        proyectoActual.codigo
            ? "Código: " +
              proyectoActual.codigo
            : "Sin código"
    );


    establecerHTML(
        "proyectoEstado",
        crearEtiquetaEstado(
            proyectoActual.estado
        )
    );


    const periodo =
        periodos.find(
            function (elemento) {

                return (
                    Number(elemento.id) ===
                    Number(
                        proyectoActual.periodo_id
                    )
                );

            }
        );


    establecerTexto(
        "proyectoPeriodo",
        periodo
            ? `${periodo.anio} — ${capitalizar(periodo.estado)}`
            : "—"
    );


    establecerTexto(
        "proyectoFinanciador",
        proyectoActual.organismo_financiador ||
        "—"
    );


    establecerTexto(
        "proyectoResponsable",
        proyectoActual.responsable ||
        "—"
    );


    establecerTexto(
        "proyectoPostulacion",
        formatearFecha(
            proyectoActual.fecha_postulacion
        )
    );


    establecerTexto(
        "proyectoAdjudicacion",
        formatearFecha(
            proyectoActual.fecha_adjudicacion
        )
    );


    establecerTexto(
        "proyectoCreacion",
        formatearFechaHora(
            proyectoActual.created_at
        )
    );


    establecerTexto(
        "proyectoDescripcion",
        proyectoActual.descripcion ||
        "—"
    );


    establecerTexto(
        "proyectoObservaciones",
        proyectoActual.observaciones ||
        "—"
    );


    establecerTexto(
        "montoAdjudicado",
        formatearMoneda(
            proyectoActual.monto_adjudicado
        )
    );

}


/* ============================================================
   RESUMEN FINANCIERO
   ============================================================ */

async function cargarResumenFinanciero() {

    let totalIngresos = 0;
    let totalGastos = 0;


    /* ========================================================
       INGRESOS
       ======================================================== */

    const resultadoIngresos =
        await supabaseClient
            .from("proyectos_ingresos")
            .select(
                "monto"
            )
            .eq(
                "proyecto_id",
                proyectoId
            );


    if (resultadoIngresos.error) {

        console.error(
            "Error al cargar ingresos:",
            resultadoIngresos.error
        );

    }
    else {

        totalIngresos =
            (resultadoIngresos.data || [])
                .reduce(
                    function (
                        total,
                        ingreso
                    ) {

                        return (
                            total +
                            (
                                Number(
                                    ingreso.monto
                                ) || 0
                            )
                        );

                    },
                    0
                );

    }


    /* ========================================================
       GASTOS
       ======================================================== */

    const resultadoGastos =
        await supabaseClient
            .from("proyectos_gastos")
            .select(
                "monto"
            )
            .eq(
                "proyecto_id",
                proyectoId
            );


    if (resultadoGastos.error) {

        console.error(
            "Error al cargar gastos:",
            resultadoGastos.error
        );

    }
    else {

        totalGastos =
            (resultadoGastos.data || [])
                .reduce(
                    function (
                        total,
                        gasto
                    ) {

                        return (
                            total +
                            (
                                Number(
                                    gasto.monto
                                ) || 0
                            )
                        );

                    },
                    0
                );

    }


    const saldo =
        totalIngresos -
        totalGastos;


    establecerTexto(
        "totalIngresos",
        formatearMoneda(
            totalIngresos
        )
    );


    establecerTexto(
        "totalGastos",
        formatearMoneda(
            totalGastos
        )
    );


    establecerTexto(
        "saldoDisponible",
        formatearMoneda(
            saldo
        )
    );

}


/* ============================================================
   CARGAR INGRESOS
   ============================================================ */

async function cargarIngresos() {

    const contenedor =
        document.getElementById(
            "tablaIngresos"
        );


    if (contenedor) {

        contenedor.innerHTML =
            '<tr>' +
            '<td colspan="7" class="tabla-cargando">' +
            'Cargando ingresos...' +
            '</td>' +
            '</tr>';

    }


    const resultado =
        await supabaseClient
            .from("proyectos_ingresos")
            .select(
                "id, proyecto_id, movimiento_id, cuenta_id, fecha_ingreso, monto, numero_comprobante, descripcion, observacion, created_at"
            )
            .eq(
                "proyecto_id",
                proyectoId
            )
            .order(
                "fecha_ingreso",
                {
                    ascending: false
                }
            );


    if (resultado.error) {

        console.error(
            "Error al cargar ingresos:",
            resultado.error
        );


        ingresos = [];


        if (contenedor) {

            contenedor.innerHTML =
                '<tr>' +
                '<td colspan="7" class="tabla-cargando">' +
                'No fue posible cargar los ingresos.' +
                '</td>' +
                '</tr>';

        }


        return;

    }


    ingresos =
        resultado.data || [];


    renderizarIngresos();

}


/* ============================================================
   RENDERIZAR INGRESOS
   ============================================================ */

function renderizarIngresos() {

    const contenedor =
        document.getElementById(
            "tablaIngresos"
        );


    if (!contenedor) {

        return;

    }


    contenedor.innerHTML =
        "";


    if (ingresos.length === 0) {

        contenedor.innerHTML =
            '<tr>' +
            '<td colspan="7" class="tabla-cargando">' +
            'No hay ingresos registrados para este proyecto.' +
            '</td>' +
            '</tr>';

        return;

    }


    ingresos.forEach(
        function (ingreso) {

            const fila =
                document.createElement(
                    "tr"
                );


            const cuenta =
                obtenerCuenta(
                    ingreso.cuenta_id
                );


            fila.innerHTML =

                '<td>' +
                escaparHTML(
                    formatearFecha(
                        ingreso.fecha_ingreso
                    )
                ) +
                '</td>' +

                '<td>' +
                '<strong>' +
                formatearMoneda(
                    ingreso.monto
                ) +
                '</strong>' +
                '</td>' +

                '<td>' +
                escaparHTML(
                    cuenta
                        ? obtenerNombreCuenta(
                            cuenta
                        )
                        : "—"
                ) +
                '</td>' +

                '<td>' +
                escaparHTML(
                    ingreso.numero_comprobante ||
                    "—"
                ) +
                '</td>' +

                '<td>' +
                escaparHTML(
                    ingreso.descripcion ||
                    "—"
                ) +
                '</td>' +

                '<td>' +
                escaparHTML(
                    ingreso.observacion ||
                    "—"
                ) +
                '</td>' +

                '<td>' +

                '<button ' +
                'type="button" ' +
                'class="boton-tabla" ' +
                'data-ingreso-accion="editar" ' +
                'data-id="' +
                ingreso.id +
                '">' +
                'Editar' +
                '</button>' +

                '<button ' +
                'type="button" ' +
                'class="boton-tabla boton-tabla-danger" ' +
                'data-ingreso-accion="eliminar" ' +
                'data-id="' +
                ingreso.id +
                '">' +
                'Eliminar' +
                '</button>' +

                '</td>';


            contenedor.appendChild(
                fila
            );

        }
    );


    configurarBotonesIngresos();

}


/* ============================================================
   CONFIGURAR BOTONES DE INGRESOS
   ============================================================ */

function configurarBotonesIngresos() {

    const botones =
        document.querySelectorAll(
            "[data-ingreso-accion]"
        );


    botones.forEach(
        function (boton) {

            boton.addEventListener(
                "click",
                function () {

                    const accion =
                        boton.dataset.ingresoAccion;


                    const id =
                        Number(
                            boton.dataset.id
                        );


                    if (
                        accion ===
                        "editar"
                    ) {

                        abrirEditarIngreso(
                            id
                        );

                    }


                    if (
                        accion ===
                        "eliminar"
                    ) {

                        eliminarIngreso(
                            id
                        );

                    }

                }
            );

        }
    );

}


/* ============================================================
   ABRIR NUEVO INGRESO
   ============================================================ */

function abrirNuevoIngreso() {

    if (!tienePermisoFinanciero()) {

        alert(
            "No tiene permisos para registrar ingresos."
        );

        return;

    }


    const formulario =
        document.getElementById(
            "formIngreso"
        );


    if (formulario) {

        formulario.reset();

    }


    establecerValor(
        "ingresoId",
        ""
    );


    establecerValor(
        "ingresoFecha",
        obtenerFechaActual()
    );


    establecerValor(
        "ingresoMonto",
        ""
    );


    establecerValor(
        "ingresoCuenta",
        ""
    );


    establecerValor(
        "ingresoComprobante",
        ""
    );


    establecerValor(
        "ingresoDescripcion",
        ""
    );


    establecerValor(
        "ingresoObservacion",
        ""
    );


    establecerTexto(
        "tituloModalIngreso",
        "Registrar ingreso"
    );


    establecerTexto(
        "guardarIngresoButton",
        "Registrar ingreso"
    );


    abrirModalIngreso();

}


/* ============================================================
   ABRIR EDITAR INGRESO
   ============================================================ */

function abrirEditarIngreso(id) {

    if (!tienePermisoFinanciero()) {

        alert(
            "No tiene permisos para editar ingresos."
        );

        return;

    }


    const ingreso =
        ingresos.find(
            function (elemento) {

                return (
                    Number(elemento.id) ===
                    Number(id)
                );

            }
        );


    if (!ingreso) {

        alert(
            "No fue posible encontrar el ingreso."
        );

        return;

    }


    establecerValor(
        "ingresoId",
        ingreso.id
    );


    establecerValor(
        "ingresoFecha",
        ingreso.fecha_ingreso
    );


    establecerValor(
        "ingresoMonto",
        ingreso.monto
    );


    establecerValor(
        "ingresoCuenta",
        ingreso.cuenta_id
    );


    establecerValor(
        "ingresoComprobante",
        ingreso.numero_comprobante
    );


    establecerValor(
        "ingresoDescripcion",
        ingreso.descripcion
    );


    establecerValor(
        "ingresoObservacion",
        ingreso.observacion
    );


    establecerTexto(
        "tituloModalIngreso",
        "Editar ingreso"
    );


    establecerTexto(
        "guardarIngresoButton",
        "Guardar cambios"
    );


    abrirModalIngreso();

}


/* ============================================================
   GUARDAR INGRESO
   ============================================================ */

async function guardarIngreso(event) {

    event.preventDefault();


    if (!tienePermisoFinanciero()) {

        alert(
            "No tiene permisos para registrar ingresos."
        );

        return;

    }


    const id =
        document.getElementById(
            "ingresoId"
        ).value;


    const fecha =
        document.getElementById(
            "ingresoFecha"
        ).value;


    const monto =
        Number(
            document.getElementById(
                "ingresoMonto"
            ).value
        ) || 0;


    const cuentaId =
        Number(
            document.getElementById(
                "ingresoCuenta"
            ).value
        );


    const comprobante =
        document.getElementById(
            "ingresoComprobante"
        ).value.trim();


    const descripcion =
        document.getElementById(
            "ingresoDescripcion"
        ).value.trim();


    const observacion =
        document.getElementById(
            "ingresoObservacion"
        ).value.trim();


    if (!fecha) {

        alert(
            "Debe seleccionar la fecha del ingreso."
        );

        return;

    }


    if (
        !monto ||
        monto <= 0
    ) {

        alert(
            "El monto del ingreso debe ser mayor que cero."
        );

        return;

    }


    if (!cuentaId) {

        alert(
            "Debe seleccionar una cuenta."
        );

        return;

    }


    if (!obtenerCuenta(cuentaId)) {

        alert(
            "La cuenta seleccionada no existe."
        );

        return;

    }


    const datos = {

        proyecto_id:
            proyectoId,

        cuenta_id:
            cuentaId,

        fecha_ingreso:
            fecha,

        monto:
            monto,

        numero_comprobante:
            comprobante ||
            null,

        descripcion:
            descripcion ||
            null,

        observacion:
            observacion ||
            null

    };


    const boton =
        document.getElementById(
            "guardarIngresoButton"
        );


    if (boton) {

        boton.disabled =
            true;

        boton.textContent =
            id
                ? "Guardando..."
                : "Registrando...";

    }


    try {

        let resultado;
        let ingresoGuardado;


        /* ====================================================
           EDITAR INGRESO
           ==================================================== */

        if (id) {

            resultado =
                await supabaseClient
                    .from("proyectos_ingresos")
                    .update(
                        datos
                    )
                    .eq(
                        "id",
                        Number(id)
                    )
                    .eq(
                        "proyecto_id",
                        proyectoId
                    );


            if (resultado.error) {

                throw resultado.error;

            }


            const consultaActualizado =
                await supabaseClient
                    .from("proyectos_ingresos")
                    .select(
                        "id, proyecto_id, movimiento_id, cuenta_id, fecha_ingreso, monto, numero_comprobante, descripcion, observacion, created_at"
                    )
                    .eq(
                        "id",
                        Number(id)
                    )
                    .eq(
                        "proyecto_id",
                        proyectoId
                    )
                    .maybeSingle();


            if (consultaActualizado.error) {

                throw consultaActualizado.error;

            }


            ingresoGuardado =
                consultaActualizado.data;

        }


        /* ====================================================
           CREAR INGRESO
           ==================================================== */

        else {

            datos.created_by =
                usuarioActual.id;


            resultado =
                await supabaseClient
                    .from("proyectos_ingresos")
                    .insert(
                        datos
                    );


            if (resultado.error) {

                throw resultado.error;

            }


            /*
             * No usamos .select().single() directamente después del
             * INSERT. El trigger de Supabase genera el movimiento y
             * actualiza movimiento_id; luego consultamos el registro
             * ya persistido para comprobar el resultado final.
             */

            const consultaNuevo =
                await supabaseClient
                    .from("proyectos_ingresos")
                    .select(
                        "id, proyecto_id, movimiento_id, cuenta_id, fecha_ingreso, monto, numero_comprobante, descripcion, observacion, created_at"
                    )
                    .eq(
                        "proyecto_id",
                        proyectoId
                    )
                    .eq(
                        "cuenta_id",
                        cuentaId
                    )
                    .eq(
                        "fecha_ingreso",
                        fecha
                    )
                    .eq(
                        "monto",
                        monto
                    )
                    .order(
                        "id",
                        {
                            ascending: false
                        }
                    )
                    .limit(1)
                    .maybeSingle();


            if (consultaNuevo.error) {

                throw consultaNuevo.error;

            }


            ingresoGuardado =
                consultaNuevo.data;

        }


        if (!ingresoGuardado) {

            throw new Error(
                "El ingreso fue enviado, pero no fue posible verificar el registro guardado."
            );

        }


        console.log(
            "Ingreso guardado correctamente:",
            ingresoGuardado
        );


        if (
            !ingresoGuardado.movimiento_id
        ) {

            console.warn(
                "El ingreso fue guardado, pero aún no tiene movimiento_id:",
                ingresoGuardado
            );

        }


        alert(
            id
                ? "Ingreso actualizado correctamente."
                : "Ingreso registrado correctamente."
        );


        cerrarModalIngreso();


        await cargarIngresos();

        await cargarResumenFinanciero();

    }
    catch (error) {

        console.error(
            "Error al guardar ingreso:",
            error
        );


        alert(
            "No fue posible guardar el ingreso.\n\n" +
            (
                error &&
                error.message
                    ? error.message
                    : String(error)
            )
        );

    }
    finally {

        if (boton) {

            boton.disabled =
                false;

            boton.textContent =
                id
                    ? "Guardar cambios"
                    : "Registrar ingreso";

        }

    }

}

/* ============================================================
   ELIMINAR INGRESO
   ============================================================ */

async function eliminarIngreso(id) {

    if (!tienePermisoFinanciero()) {

        alert(
            "No tiene permisos para eliminar ingresos."
        );

        return;

    }


    const ingreso =
        ingresos.find(
            function (elemento) {

                return (
                    Number(elemento.id) ===
                    Number(id)
                );

            }
        );


    if (!ingreso) {

        alert(
            "No fue posible encontrar el ingreso."
        );

        return;

    }


    const confirmar =
        confirm(
            "¿Está seguro de eliminar este ingreso?\n\n" +

            "Monto: " +
            formatearMoneda(
                ingreso.monto
            ) +

            "\n\nEsta acción no se puede deshacer."
        );


    if (!confirmar) {

        return;

    }


    try {

        /* ====================================================
           ELIMINAR MOVIMIENTO ASOCIADO
           ==================================================== */

        if (ingreso.movimiento_id) {

            const resultadoMovimiento =
                await supabaseClient
                    .from("movimientos")
                    .delete()
                    .eq(
                        "id",
                        Number(
                            ingreso.movimiento_id
                        )
                    );


            if (resultadoMovimiento.error) {

                console.error(
                    "Error al eliminar movimiento del ingreso:",
                    resultadoMovimiento.error
                );


                alert(
                    "No fue posible eliminar el movimiento financiero asociado al ingreso.\n\n" +
                    resultadoMovimiento.error.message
                );

                return;

            }

        }


        /* ====================================================
           ELIMINAR INGRESO
           ==================================================== */

        const resultado =
            await supabaseClient
                .from("proyectos_ingresos")
                .delete()
                .eq(
                    "id",
                    Number(id)
                )
                .eq(
                    "proyecto_id",
                    proyectoId
                );


        if (resultado.error) {

            console.error(
                "Error al eliminar ingreso:",
                resultado.error
            );


            alert(
                "No fue posible eliminar el ingreso.\n\n" +
                resultado.error.message
            );

            return;

        }


        alert(
            "Ingreso y movimiento financiero eliminados correctamente."
        );


        await cargarIngresos();

        await cargarResumenFinanciero();

    }
    catch (error) {

        console.error(
            "Error inesperado al eliminar ingreso:",
            error
        );


        alert(
            "Ocurrió un error inesperado."
        );

    }

}


/* ============================================================
   CARGAR GASTOS
   ============================================================ */

async function cargarGastos() {

    const contenedor =
        document.getElementById(
            "tablaGastos"
        );


    if (contenedor) {

        contenedor.innerHTML =
            '<tr>' +
            '<td colspan="9" class="tabla-cargando">' +
            'Cargando gastos...' +
            '</td>' +
            '</tr>';

    }


    const resultado =
        await supabaseClient
            .from("proyectos_gastos")
            .select(
                "id, proyecto_id, movimiento_id, cuenta_id, categoria_id, fecha_gasto, monto, medio_pago, proveedor, rut_proveedor, numero_documento, descripcion, observacion, created_at"
            )
            .eq(
                "proyecto_id",
                proyectoId
            )
            .order(
                "fecha_gasto",
                {
                    ascending: false
                }
            );


    if (resultado.error) {

        console.error(
            "Error al cargar gastos:",
            resultado.error
        );


        gastos = [];


        if (contenedor) {

            contenedor.innerHTML =
                '<tr>' +
                '<td colspan="9" class="tabla-cargando">' +
                'No fue posible cargar los gastos.' +
                '</td>' +
                '</tr>';

        }


        return;

    }


    gastos =
        resultado.data || [];


    renderizarGastos();

}


/* ============================================================
   RENDERIZAR GASTOS
   ============================================================ */

function renderizarGastos() {

    const contenedor =
        document.getElementById(
            "tablaGastos"
        );


    if (!contenedor) {

        return;

    }


    contenedor.innerHTML =
        "";


    if (gastos.length === 0) {

        contenedor.innerHTML =
            '<tr>' +
            '<td colspan="9" class="tabla-cargando">' +
            'No hay gastos registrados para este proyecto.' +
            '</td>' +
            '</tr>';

        return;

    }


    gastos.forEach(
        function (gasto) {

            const fila =
                document.createElement(
                    "tr"
                );


            const cuenta =
                obtenerCuenta(
                    gasto.cuenta_id
                );


            const categoria =
                obtenerCategoria(
                    gasto.categoria_id
                );


            fila.innerHTML =

                '<td>' +
                escaparHTML(
                    formatearFecha(
                        gasto.fecha_gasto
                    )
                ) +
                '</td>' +

                '<td>' +
                '<strong>' +
                formatearMoneda(
                    gasto.monto
                ) +
                '</strong>' +
                '</td>' +

                '<td>' +
                escaparHTML(
                    cuenta
                        ? obtenerNombreCuenta(
                            cuenta
                        )
                        : "—"
                ) +
                '</td>' +

                '<td>' +
                escaparHTML(
                    categoria
                        ? categoria.nombre
                        : "—"
                ) +
                '</td>' +

                '<td>' +
                escaparHTML(
                    gasto.medio_pago ||
                    "—"
                ) +
                '</td>' +

                '<td>' +
                escaparHTML(
                    gasto.proveedor ||
                    "—"
                ) +
                '</td>' +

                '<td>' +
                escaparHTML(
                    gasto.numero_documento ||
                    "—"
                ) +
                '</td>' +

                '<td>' +
                escaparHTML(
                    gasto.descripcion ||
                    "—"
                ) +
                '</td>' +

                '<td>' +

                '<button ' +
                'type="button" ' +
                'class="boton-tabla" ' +
                'data-gasto-accion="editar" ' +
                'data-id="' +
                gasto.id +
                '">' +
                'Editar' +
                '</button>' +

                '<button ' +
                'type="button" ' +
                'class="boton-tabla boton-tabla-danger" ' +
                'data-gasto-accion="eliminar" ' +
                'data-id="' +
                gasto.id +
                '">' +
                'Eliminar' +
                '</button>' +

                '</td>';


            contenedor.appendChild(
                fila
            );

        }
    );


    configurarBotonesGastos();

}


/* ============================================================
   CONFIGURAR BOTONES DE GASTOS
   ============================================================ */

function configurarBotonesGastos() {

    const botones =
        document.querySelectorAll(
            "[data-gasto-accion]"
        );


    botones.forEach(
        function (boton) {

            boton.addEventListener(
                "click",
                function () {

                    const accion =
                        boton.dataset.gastoAccion;


                    const id =
                        Number(
                            boton.dataset.id
                        );


                    if (
                        accion ===
                        "editar"
                    ) {

                        abrirEditarGasto(
                            id
                        );

                    }


                    if (
                        accion ===
                        "eliminar"
                    ) {

                        eliminarGasto(
                            id
                        );

                    }

                }
            );

        }
    );

}


/* ============================================================
   OBTENER CATEGORÍA
   ============================================================ */

function obtenerCategoria(id) {

    return categorias.find(
        function (categoria) {

            return (
                Number(categoria.id) ===
                Number(id)
            );

        }
    );

}


/* ============================================================
   ABRIR NUEVO GASTO
   ============================================================ */

function abrirNuevoGasto() {

    if (!tienePermisoFinanciero()) {

        alert(
            "No tiene permisos para registrar gastos."
        );

        return;

    }


    const formulario =
        document.getElementById(
            "formGasto"
        );


    if (formulario) {

        formulario.reset();

    }


    establecerValor(
        "gastoId",
        ""
    );


    establecerValor(
        "gastoFecha",
        obtenerFechaActual()
    );


    establecerValor(
        "gastoMonto",
        ""
    );


    establecerValor(
        "gastoCuenta",
        ""
    );


    establecerValor(
        "gastoCategoria",
        ""
    );


    establecerValor(
        "gastoMedioPago",
        "transferencia"
    );


    establecerValor(
        "gastoProveedor",
        ""
    );


    establecerValor(
        "gastoRutProveedor",
        ""
    );


    establecerValor(
        "gastoNumeroDocumento",
        ""
    );


    establecerValor(
        "gastoDescripcion",
        ""
    );


    establecerValor(
        "gastoObservacion",
        ""
    );


    establecerTexto(
        "tituloModalGasto",
        "Registrar gasto"
    );


    establecerTexto(
        "guardarGastoButton",
        "Registrar gasto"
    );


    abrirModalGasto();

}


/* ============================================================
   ABRIR EDITAR GASTO
   ============================================================ */

function abrirEditarGasto(id) {

    if (!tienePermisoFinanciero()) {

        alert(
            "No tiene permisos para editar gastos."
        );

        return;

    }


    const gasto =
        gastos.find(
            function (elemento) {

                return (
                    Number(elemento.id) ===
                    Number(id)
                );

            }
        );


    if (!gasto) {

        alert(
            "No fue posible encontrar el gasto."
        );

        return;

    }


    establecerValor(
        "gastoId",
        gasto.id
    );


    establecerValor(
        "gastoFecha",
        gasto.fecha_gasto
    );


    establecerValor(
        "gastoMonto",
        gasto.monto
    );


    establecerValor(
        "gastoCuenta",
        gasto.cuenta_id
    );


    establecerValor(
        "gastoCategoria",
        gasto.categoria_id
    );


    establecerValor(
        "gastoMedioPago",
        gasto.medio_pago
    );


    establecerValor(
        "gastoProveedor",
        gasto.proveedor
    );


    establecerValor(
        "gastoRutProveedor",
        gasto.rut_proveedor
    );


    establecerValor(
        "gastoNumeroDocumento",
        gasto.numero_documento
    );


    establecerValor(
        "gastoDescripcion",
        gasto.descripcion
    );


    establecerValor(
        "gastoObservacion",
        gasto.observacion
    );


    establecerTexto(
        "tituloModalGasto",
        "Editar gasto"
    );


    establecerTexto(
        "guardarGastoButton",
        "Guardar cambios"
    );


    abrirModalGasto();

}


/* ============================================================
   GUARDAR GASTO
   ============================================================ */

async function guardarGasto(event) {

    event.preventDefault();


    if (!tienePermisoFinanciero()) {

        alert(
            "No tiene permisos para registrar gastos."
        );

        return;

    }


    const id =
        document.getElementById(
            "gastoId"
        ).value;


    const fecha =
        document.getElementById(
            "gastoFecha"
        ).value;


    const monto =
        Number(
            document.getElementById(
                "gastoMonto"
            ).value
        ) || 0;


    const cuentaId =
        Number(
            document.getElementById(
                "gastoCuenta"
            ).value
        );


    const categoriaId =
        Number(
            document.getElementById(
                "gastoCategoria"
            ).value
        );


    const medioPago =
        document.getElementById(
            "gastoMedioPago"
        ).value;


    const proveedor =
        document.getElementById(
            "gastoProveedor"
        ).value.trim();


    const rutProveedor =
        document.getElementById(
            "gastoRutProveedor"
        ).value.trim();


    const numeroDocumento =
        document.getElementById(
            "gastoNumeroDocumento"
        ).value.trim();


    const descripcion =
        document.getElementById(
            "gastoDescripcion"
        ).value.trim();


    const observacion =
        document.getElementById(
            "gastoObservacion"
        ).value.trim();


    /* ========================================================
       VALIDACIONES
       ======================================================== */

    if (!fecha) {

        alert(
            "Debe seleccionar la fecha del gasto."
        );

        return;

    }


    if (
        !monto ||
        monto <= 0
    ) {

        alert(
            "El monto del gasto debe ser mayor que cero."
        );

        return;

    }


    if (!cuentaId) {

        alert(
            "Debe seleccionar una cuenta."
        );

        return;

    }


    if (!obtenerCuenta(cuentaId)) {

        alert(
            "La cuenta seleccionada no existe."
        );

        return;

    }


    if (!categoriaId) {

        alert(
            "Debe seleccionar una categoría."
        );

        return;

    }


    const categoria =
        obtenerCategoria(
            categoriaId
        );


    if (
        !categoria ||
        categoria.tipo !==
        "egreso"
    ) {

        alert(
            "La categoría seleccionada no corresponde a un gasto de proyecto."
        );

        return;

    }


    if (
        medioPago !== "efectivo" &&
        medioPago !== "transferencia"
    ) {

        alert(
            "El medio de pago seleccionado no es válido."
        );

        return;

    }


    const datos = {

        proyecto_id:
            proyectoId,

        cuenta_id:
            cuentaId,

        categoria_id:
            categoriaId,

        fecha_gasto:
            fecha,

        monto:
            monto,

        medio_pago:
            medioPago,

        proveedor:
            proveedor ||
            null,

        rut_proveedor:
            rutProveedor ||
            null,

        numero_documento:
            numeroDocumento ||
            null,

        descripcion:
            descripcion ||
            null,

        observacion:
            observacion ||
            null

    };


    const boton =
        document.getElementById(
            "guardarGastoButton"
        );


    if (boton) {

        boton.disabled =
            true;

        boton.textContent =
            id
                ? "Guardando..."
                : "Registrando...";

    }


    try {

        let resultado;
        let gastoGuardado;


        /* ====================================================
           EDITAR GASTO
           ==================================================== */

        if (id) {

            resultado =
                await supabaseClient
                    .from("proyectos_gastos")
                    .update(
                        datos
                    )
                    .eq(
                        "id",
                        Number(id)
                    )
                    .eq(
                        "proyecto_id",
                        proyectoId
                    );


            if (resultado.error) {

                throw resultado.error;

            }


            const consultaActualizado =
                await supabaseClient
                    .from("proyectos_gastos")
                    .select(
                        "id, proyecto_id, movimiento_id, cuenta_id, categoria_id, fecha_gasto, monto, medio_pago, proveedor, rut_proveedor, numero_documento, descripcion, observacion, estado_rendicion, created_at"
                    )
                    .eq(
                        "id",
                        Number(id)
                    )
                    .eq(
                        "proyecto_id",
                        proyectoId
                    )
                    .maybeSingle();


            if (consultaActualizado.error) {

                throw consultaActualizado.error;

            }


            gastoGuardado =
                consultaActualizado.data;

        }


        /* ====================================================
           CREAR GASTO
           ==================================================== */

        else {

            datos.created_by =
                usuarioActual.id;


            resultado =
                await supabaseClient
                    .from("proyectos_gastos")
                    .insert(
                        datos
                    );


            if (resultado.error) {

                throw resultado.error;

            }


            /*
             * No usamos .select().single() directamente después del
             * INSERT. El trigger de Supabase genera el movimiento y
             * actualiza movimiento_id; luego consultamos el registro
             * ya persistido para comprobar el resultado final.
             */

            const consultaNuevo =
                await supabaseClient
                    .from("proyectos_gastos")
                    .select(
                        "id, proyecto_id, movimiento_id, cuenta_id, categoria_id, fecha_gasto, monto, medio_pago, proveedor, rut_proveedor, numero_documento, descripcion, observacion, estado_rendicion, created_at"
                    )
                    .eq(
                        "proyecto_id",
                        proyectoId
                    )
                    .eq(
                        "cuenta_id",
                        cuentaId
                    )
                    .eq(
                        "fecha_gasto",
                        fecha
                    )
                    .eq(
                        "monto",
                        monto
                    )
                    .order(
                        "id",
                        {
                            ascending: false
                        }
                    )
                    .limit(1)
                    .maybeSingle();


            if (consultaNuevo.error) {

                throw consultaNuevo.error;

            }


            gastoGuardado =
                consultaNuevo.data;

        }


        if (!gastoGuardado) {

            throw new Error(
                "El gasto fue enviado, pero no fue posible verificar el registro guardado."
            );

        }


        console.log(
            "Gasto guardado correctamente:",
            gastoGuardado
        );


        if (
            !gastoGuardado.movimiento_id
        ) {

            console.warn(
                "El gasto fue guardado, pero aún no tiene movimiento_id:",
                gastoGuardado
            );

        }


        alert(
            id
                ? "Gasto actualizado correctamente."
                : "Gasto registrado correctamente."
        );


        cerrarModalGasto();


        await cargarGastos();

        await cargarResumenFinanciero();

    }
    catch (error) {

        console.error(
            "Error al guardar gasto:",
            error
        );


        alert(
            "No fue posible guardar el gasto.\n\n" +
            (
                error &&
                error.message
                    ? error.message
                    : String(error)
            )
        );

    }
    finally {

        if (boton) {

            boton.disabled =
                false;

            boton.textContent =
                id
                    ? "Guardar cambios"
                    : "Registrar gasto";

        }

    }

}

/* ============================================================
   ELIMINAR GASTO
   ============================================================ */

async function eliminarGasto(id) {

    if (!tienePermisoFinanciero()) {

        alert(
            "No tiene permisos para eliminar gastos."
        );

        return;

    }


    const gasto =
        gastos.find(
            function (elemento) {

                return (
                    Number(elemento.id) ===
                    Number(id)
                );

            }
        );


    if (!gasto) {

        alert(
            "No fue posible encontrar el gasto."
        );

        return;

    }


    const confirmar =
        confirm(
            "¿Está seguro de eliminar este gasto?\n\n" +

            "Monto: " +
            formatearMoneda(
                gasto.monto
            ) +

            "\nProveedor: " +
            (
                gasto.proveedor ||
                "—"
            ) +

            "\nDocumento: " +
            (
                gasto.numero_documento ||
                "—"
            ) +

            "\n\n" +

            "También se eliminará el movimiento financiero generado por este gasto.\n\n" +

            "Esta acción no se puede deshacer."
        );


    if (!confirmar) {

        return;

    }


    try {

        /* ====================================================
           1. OBTENER MOVIMIENTO ASOCIADO
           ==================================================== */

        let movimientoId =
            gasto.movimiento_id
                ? Number(
                    gasto.movimiento_id
                )
                : null;


        /*
         * Si por alguna razón movimiento_id estuviera vacío,
         * intentamos localizarlo mediante referencia_id.
         */

        if (!movimientoId) {

            const resultadoBusqueda =
                await supabaseClient
                    .from("movimientos")
                    .select(
                        "id"
                    )
                    .eq(
                        "origen",
                        "proyecto_egreso"
                    )
                    .eq(
                        "referencia_id",
                        Number(id)
                    );


            if (resultadoBusqueda.error) {

                console.error(
                    "Error al buscar movimiento asociado:",
                    resultadoBusqueda.error
                );


                alert(
                    "No fue posible localizar el movimiento financiero asociado.\n\n" +
                    resultadoBusqueda.error.message
                );

                return;

            }


            const movimientos =
                resultadoBusqueda.data || [];


            if (
                movimientos.length > 0
            ) {

                movimientoId =
                    Number(
                        movimientos[0].id
                    );

            }

        }


        /* ====================================================
           2. ELIMINAR MOVIMIENTO
           ==================================================== */

        if (movimientoId) {

            const resultadoMovimiento =
                await supabaseClient
                    .from("movimientos")
                    .delete()
                    .eq(
                        "id",
                        movimientoId
                    );


            if (resultadoMovimiento.error) {

                console.error(
                    "Error al eliminar movimiento asociado:",
                    resultadoMovimiento.error
                );


                alert(
                    "No fue posible eliminar el movimiento financiero asociado al gasto.\n\n" +
                    resultadoMovimiento.error.message
                );

                return;

            }

        }


        /* ====================================================
           3. ELIMINAR GASTO
           ==================================================== */

        const resultadoGasto =
            await supabaseClient
                .from("proyectos_gastos")
                .delete()
                .eq(
                    "id",
                    Number(id)
                )
                .eq(
                    "proyecto_id",
                    proyectoId
                );


        if (resultadoGasto.error) {

            console.error(
                "Error al eliminar gasto:",
                resultadoGasto.error
            );


            alert(
                "No fue posible eliminar el gasto.\n\n" +
                resultadoGasto.error.message
            );

            return;

        }


        alert(
            "Gasto y movimiento financiero eliminados correctamente."
        );


        await cargarGastos();

        await cargarResumenFinanciero();

    }
    catch (error) {

        console.error(
            "Error inesperado al eliminar gasto:",
            error
        );


        alert(
            "Ocurrió un error inesperado al eliminar el gasto."
        );

    }

}


/* ============================================================
   DOCUMENTACIÓN DEL PROYECTO
   ============================================================ */

const CATEGORIAS_DOCUMENTOS = [
    { valor: "postulacion", nombre: "Postulación" },
    { valor: "adjudicacion", nombre: "Adjudicación" },
    { valor: "ejecucion", nombre: "Ejecución" },
    { valor: "rendicion", nombre: "Rendición" },
    { valor: "otros", nombre: "Otros" }
];

const TIPOS_MIME_DOCUMENTOS = [
    "application/pdf",
    "image/jpeg",
    "image/png",
    "image/webp",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "text/plain"
];

const MAX_TAMANO_DOCUMENTO = 50 * 1024 * 1024;

async function cargarDocumentos() {
    const contenedor = document.getElementById("documentosProyecto");
    if (!contenedor) return;

    contenedor.innerHTML = '<div class="documento-vacio">Cargando documentación...</div>';

    const resultado = await supabaseClient
        .from("proyectos_documentos")
        .select("id, proyecto_id, gasto_id, rendicion_id, categoria, tipo_documento, nombre_archivo, ruta_archivo, numero_documento, fecha_documento, observaciones, mime_type, tamano_bytes, created_at, created_by")
        .eq("proyecto_id", proyectoId)
        .order("created_at", { ascending: false });

    if (resultado.error) {
        console.error("Error al cargar documentación:", resultado.error);
        contenedor.innerHTML = '<div class="documento-error">No fue posible cargar la documentación del proyecto.</div>';
        return;
    }

    documentos = resultado.data || [];
    renderizarDocumentos();
}

function renderizarDocumentos() {
    const contenedor = document.getElementById("documentosProyecto");
    if (!contenedor) return;

    contenedor.innerHTML = "";

    if (documentos.length === 0) {
        contenedor.innerHTML = '<div class="documento-vacio">No hay documentos asociados a este proyecto.</div>';
        return;
    }

    CATEGORIAS_DOCUMENTOS.forEach(function (categoria) {
        const lista = documentos.filter(function (documento) {
            return documento.categoria === categoria.valor;
        });

        if (lista.length === 0) return;

        const bloque = document.createElement("div");
        bloque.className = "documentos-categoria";
        bloque.innerHTML =
            '<div class="documentos-categoria-header">' +
            '<strong>' + escaparHTML(categoria.nombre) + '</strong>' +
            '<span>' + lista.length + (lista.length === 1 ? " documento" : " documentos") + '</span>' +
            '</div>';

        lista.forEach(function (documento) {
            const item = document.createElement("div");
            item.className = "documento-item";

            const fecha = documento.fecha_documento
                ? formatearFecha(documento.fecha_documento)
                : "Fecha no indicada";
            const tamano = formatearTamanoArchivo(documento.tamano_bytes);
            const numero = documento.numero_documento
                ? "N.º " + documento.numero_documento
                : "";
            const descripcion = documento.observaciones || "";
            const gastoAsociado = obtenerGastoAsociadoDocumento(documento.gasto_id);
            const puedeEliminar = perfilUsuario && perfilUsuario.rol === "administrador";

            item.innerHTML =
                '<div class="documento-info">' +
                '<span class="documento-nombre">📄 ' + escaparHTML(documento.nombre_archivo) + '</span>' +
                '<div class="documento-meta">' +
                '<span>' + escaparHTML(documento.tipo_documento || "Documento") + '</span>' +
                '<span>' + escaparHTML(fecha) + '</span>' +
                (tamano ? '<span>' + escaparHTML(tamano) + '</span>' : '') +
                (numero ? '<span>' + escaparHTML(numero) + '</span>' : '') +
                '</div>' +
                (gastoAsociado ? '<div class="documento-meta"><span>💰 Gasto asociado: ' + escaparHTML(gastoAsociado) + '</span></div>' : '') +
                (descripcion ? '<div class="documento-meta"><span>' + escaparHTML(descripcion) + '</span></div>' : '') +
                '</div>' +
                '<div class="documento-acciones">' +
                '<button type="button" class="boton boton-secundario boton-documento" data-documento-accion="ver" data-id="' + documento.id + '">Ver</button>' +
                '<button type="button" class="boton boton-secundario boton-documento" data-documento-accion="descargar" data-id="' + documento.id + '">Descargar</button>' +
                (puedeEliminar ? '<button type="button" class="boton boton-documento-danger" data-documento-accion="eliminar" data-id="' + documento.id + '">Eliminar</button>' : '') +
                '</div>';

            bloque.appendChild(item);
        });

        contenedor.appendChild(bloque);
    });

    configurarBotonesDocumentos();
}

function obtenerGastoAsociadoDocumento(gastoId) {
    if (!gastoId) return "";

    const gasto = gastos.find(function (elemento) {
        return Number(elemento.id) === Number(gastoId);
    });

    if (!gasto) return "";

    const partes = [];

    if (gasto.fecha_gasto) {
        partes.push(formatearFecha(gasto.fecha_gasto));
    }

    partes.push(formatearMoneda(gasto.monto));

    if (gasto.proveedor) {
        partes.push(gasto.proveedor);
    }

    if (gasto.numero_documento) {
        partes.push("Doc. " + gasto.numero_documento);
    }

    return partes.join(" · ");
}

function cargarOpcionesGastosDocumento(gastoIdSeleccionado) {
    const select = document.getElementById("documentoGasto");
    if (!select) return;

    const valorActual = gastoIdSeleccionado
        ? String(gastoIdSeleccionado)
        : select.value;

    select.innerHTML =
        '<option value="">Sin asociar a un gasto específico</option>';

    if (gastos.length === 0) {
        select.disabled = true;
        return;
    }

    select.disabled = false;

    gastos.forEach(function (gasto) {
        const option = document.createElement("option");
        option.value = gasto.id;

        const detalle = [];

        if (gasto.fecha_gasto) {
            detalle.push(formatearFecha(gasto.fecha_gasto));
        }

        detalle.push(formatearMoneda(gasto.monto));

        if (gasto.proveedor) {
            detalle.push(gasto.proveedor);
        }

        if (gasto.numero_documento) {
            detalle.push("Doc. " + gasto.numero_documento);
        }

        option.textContent = detalle.join(" · ");
        select.appendChild(option);
    });

    if (valorActual && gastos.some(function (gasto) {
        return String(gasto.id) === String(valorActual);
    })) {
        select.value = valorActual;
    }
}

function configurarBotonesDocumentos() {
    const botones = document.querySelectorAll("[data-documento-accion]");
    botones.forEach(function (boton) {
        boton.addEventListener("click", async function () {
            const accion = boton.dataset.documentoAccion;
            const id = Number(boton.dataset.id);
            if (accion === "ver") await abrirDocumento(id);
            if (accion === "descargar") await descargarDocumento(id);
            if (accion === "eliminar") await eliminarDocumento(id);
        });
    });
}

function obtenerDocumento(id) {
    return documentos.find(function (documento) {
        return Number(documento.id) === Number(id);
    });
}

async function obtenerURLDocumento(documento, descargar) {
    if (!documento || !documento.ruta_archivo) {
        throw new Error("El documento no tiene una ruta de almacenamiento válida.");
    }

    const opciones = descargar
        ? { download: documento.nombre_archivo }
        : undefined;

    const resultado = await supabaseClient
        .storage
        .from("proyectos-documentos")
        .createSignedUrl(documento.ruta_archivo, 600, opciones);

    if (resultado.error) throw resultado.error;
    return resultado.data.signedUrl;
}

async function abrirDocumento(id) {
    const documento = obtenerDocumento(id);
    if (!documento) {
        alert("No fue posible encontrar el documento.");
        return;
    }

    try {
        const url = await obtenerURLDocumento(documento, false);
        window.open(url, "_blank", "noopener,noreferrer");
    } catch (error) {
        console.error("Error al abrir documento:", error);
        alert("No fue posible abrir el documento.");
    }
}

async function descargarDocumento(id) {
    const documento = obtenerDocumento(id);
    if (!documento) {
        alert("No fue posible encontrar el documento.");
        return;
    }

    try {
        const url = await obtenerURLDocumento(documento, true);
        const enlace = document.createElement("a");
        enlace.href = url;
        enlace.target = "_blank";
        enlace.rel = "noopener noreferrer";
        document.body.appendChild(enlace);
        enlace.click();
        enlace.remove();
    } catch (error) {
        console.error("Error al descargar documento:", error);
        alert("No fue posible descargar el documento.");
    }
}

function abrirNuevoDocumento() {
    if (!tienePermisoFinanciero()) {
        alert("No tiene permisos para cargar documentos.");
        return;
    }

    const formulario = document.getElementById("formDocumento");
    if (formulario) formulario.reset();

    establecerValor("documentoFecha", obtenerFechaActual());
    cargarOpcionesGastosDocumento("");

    const archivo = document.getElementById("archivoDocumentoSeleccionado");
    if (archivo) {
        archivo.textContent = "";
        archivo.style.display = "none";
    }

    const boton = document.getElementById("guardarDocumentoButton");
    if (boton) {
        boton.disabled = false;
        boton.textContent = "Subir documento";
    }

    abrirModalDocumento();
}

function actualizarArchivoSeleccionado() {
    const input = document.getElementById("documentoArchivo");
    const contenedor = document.getElementById("archivoDocumentoSeleccionado");
    if (!input || !contenedor) return;

    const archivo = input.files && input.files[0] ? input.files[0] : null;
    if (!archivo) {
        contenedor.textContent = "";
        contenedor.style.display = "none";
        return;
    }

    contenedor.textContent =
        "Archivo seleccionado: " + archivo.name + " (" + formatearTamanoArchivo(archivo.size) + ")";
    contenedor.style.display = "block";
}

async function guardarDocumento(event) {
    event.preventDefault();

    if (!tienePermisoFinanciero()) {
        alert("No tiene permisos para cargar documentos.");
        return;
    }

    const categoria = document.getElementById("documentoCategoria").value;
    const tipoDocumento = document.getElementById("documentoTipo").value;
    const numeroDocumento = document.getElementById("documentoNumero").value.trim();
    const fechaDocumento = document.getElementById("documentoFecha").value;
    const gastoId = document.getElementById("documentoGasto").value;
    const observaciones = document.getElementById("documentoObservaciones").value.trim();
    const inputArchivo = document.getElementById("documentoArchivo");
    const archivo = inputArchivo.files && inputArchivo.files[0] ? inputArchivo.files[0] : null;

    if (!categoria) {
        alert("Debe seleccionar una categoría.");
        return;
    }
    if (!tipoDocumento) {
        alert("Debe seleccionar el tipo de documento.");
        return;
    }

    if (gastoId && !gastos.some(function (gasto) {
        return Number(gasto.id) === Number(gastoId);
    })) {
        alert("El gasto seleccionado no corresponde a este proyecto.");
        return;
    }

    if (!archivo) {
        alert("Debe seleccionar un archivo.");
        return;
    }
    if (archivo.size > MAX_TAMANO_DOCUMENTO) {
        alert("El archivo supera el tamaño máximo permitido de 50 MB.");
        return;
    }
    if (archivo.type && !TIPOS_MIME_DOCUMENTOS.includes(archivo.type)) {
        alert("El tipo de archivo seleccionado no está permitido.");
        return;
    }

    const boton = document.getElementById("guardarDocumentoButton");
    if (boton) {
        boton.disabled = true;
        boton.textContent = "Subiendo...";
    }

    const ruta =
        "proyectos/" +
        proyectoId +
        "/" +
        generarIdentificadorArchivo() +
        "_" +
        sanitizarNombreArchivo(archivo.name);

    try {
        const subida = await supabaseClient
            .storage
            .from("proyectos-documentos")
            .upload(ruta, archivo, {
                cacheControl: "3600",
                upsert: false,
                contentType: archivo.type || undefined
            });

        if (subida.error) throw subida.error;

        const registro = {
                proyecto_id: proyectoId,
            gasto_id: gastoId ? Number(gastoId) : null,
            categoria: categoria,
            tipo_documento: tipoDocumento,
            nombre_archivo: archivo.name,
            ruta_archivo: ruta,
            numero_documento: numeroDocumento || null,
            fecha_documento: fechaDocumento || null,
            observaciones: observaciones || null,
            mime_type: archivo.type || null,
            tamano_bytes: archivo.size,
            created_by: usuarioActual ? usuarioActual.id : null
        };

        const insercion = await supabaseClient
            .from("proyectos_documentos")
            .insert(registro)
            .select("id, proyecto_id, gasto_id, rendicion_id, categoria, tipo_documento, nombre_archivo, ruta_archivo, numero_documento, fecha_documento, observaciones, mime_type, tamano_bytes, created_at, created_by")
            .single();

        if (insercion.error) {
            await supabaseClient.storage
                .from("proyectos-documentos")
                .remove([ruta]);
            throw insercion.error;
        }

        alert("Documento cargado correctamente.");
        cerrarModalDocumento();
        await cargarDocumentos();

    } catch (error) {
        console.error("Error al guardar documento:", error);
        alert(
            "No fue posible cargar el documento.\n\n" +
            (error.message || "Error desconocido.")
        );
    } finally {
        if (boton) {
            boton.disabled = false;
            boton.textContent = "Subir documento";
        }
    }
}

async function eliminarDocumento(id) {
    if (!perfilUsuario || perfilUsuario.rol !== "administrador") {
        alert("Solo el administrador puede eliminar documentos.");
        return;
    }

    const documento = obtenerDocumento(id);
    if (!documento) {
        alert("No fue posible encontrar el documento.");
        return;
    }

    const confirmar = window.confirm(
        "¿Está seguro de eliminar el documento " +
        documento.nombre_archivo +
        "?\n\nEl archivo será eliminado del almacenamiento del proyecto."
    );

    if (!confirmar) return;

    try {
        const eliminacionArchivo = await supabaseClient
            .storage
            .from("proyectos-documentos")
            .remove([documento.ruta_archivo]);

        if (eliminacionArchivo.error) throw eliminacionArchivo.error;

        const eliminacionRegistro = await supabaseClient
            .from("proyectos_documentos")
            .delete()
            .eq("id", Number(id))
            .eq("proyecto_id", proyectoId);

        if (eliminacionRegistro.error) throw eliminacionRegistro.error;

        alert("Documento eliminado correctamente.");
        await cargarDocumentos();

    } catch (error) {
        console.error("Error al eliminar documento:", error);
        alert(
            "No fue posible eliminar el documento.\n\n" +
            (error.message || "Error desconocido.")
        );
    }
}

function formatearTamanoArchivo(bytes) {
    const numero = Number(bytes);
    if (!numero || numero <= 0) return "";
    if (numero < 1024) return numero + " B";
    if (numero < 1024 * 1024) return (numero / 1024).toFixed(1) + " KB";
    return (numero / (1024 * 1024)).toFixed(1) + " MB";
}

function sanitizarNombreArchivo(nombre) {
    return String(nombre || "archivo")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9._-]+/g, "_")
        .replace(/_+/g, "_")
        .replace(/^_+|_+$/g, "") || "archivo";
}

function generarIdentificadorArchivo() {
    if (
        window.crypto &&
        typeof window.crypto.randomUUID === "function"
    ) {
        return window.crypto.randomUUID();
    }

    return (
        Date.now().toString(36) +
        "_" +
        Math.random().toString(36).slice(2)
    );
}


/* ============================================================
   MODAL INGRESO
   ============================================================ */

function abrirModalIngreso() {

    const modal =
        document.getElementById(
            "modalIngreso"
        );


    if (modal) {

        modal.style.display =
            "flex";

    }

}


function cerrarModalIngreso() {

    const modal =
        document.getElementById(
            "modalIngreso"
        );


    if (modal) {

        modal.style.display =
            "none";

    }

}


/* ============================================================
   MODAL GASTO
   ============================================================ */

function abrirModalGasto() {

    const modal =
        document.getElementById(
            "modalGasto"
        );


    if (modal) {

        modal.style.display =
            "flex";

    }

}


function cerrarModalGasto() {

    const modal =
        document.getElementById(
            "modalGasto"
        );


    if (modal) {

        modal.style.display =
            "none";

    }

}


/* ============================================================
   MODAL DOCUMENTO
   ============================================================ */

function abrirModalDocumento() {
    const modal = document.getElementById("modalDocumento");
    if (modal) modal.style.display = "flex";
}

function cerrarModalDocumento() {
    const modal = document.getElementById("modalDocumento");
    if (modal) modal.style.display = "none";
}


/* ============================================================
   PERMISOS
   ============================================================ */

function tienePermisoFinanciero() {

    if (!perfilUsuario) {

        return false;

    }


    return (
        perfilUsuario.rol ===
            "administrador" ||
        perfilUsuario.rol ===
            "tesorero"
    );

}


/* ============================================================
   OBTENER CUENTA
   ============================================================ */

function obtenerCuenta(id) {

    return cuentas.find(
        function (cuenta) {

            return (
                Number(cuenta.id) ===
                Number(id)
            );

        }
    );

}


/* ============================================================
   OBTENER NOMBRE DE CUENTA
   ============================================================ */

function obtenerNombreCuenta(cuenta) {

    if (!cuenta) {

        return "—";

    }


    return (
        cuenta.nombre ||
        cuenta.descripcion ||
        (
            cuenta.codigo
                ? cuenta.codigo
                : ""
        ) ||
        "Cuenta " +
        cuenta.id
    );

}


/* ============================================================
   ESTADO
   ============================================================ */

function traducirEstado(estado) {

    switch (estado) {

        case "postulado":
            return "Postulado";

        case "adjudicado":
            return "Adjudicado";

        case "en_ejecucion":
            return "En ejecución";

        case "rendido":
            return "Rendido";

        case "cerrado":
            return "Cerrado";

        case "rechazado":
            return "Rechazado";

        default:
            return estado || "—";

    }

}


function crearEtiquetaEstado(estado) {

    let clase = "";


    switch (estado) {

        case "postulado":
            clase =
                "estado-postulado";
            break;

        case "adjudicado":
            clase =
                "estado-adjudicado";
            break;

        case "en_ejecucion":
            clase =
                "estado-ejecucion";
            break;

        case "rendido":
            clase =
                "estado-rendido";
            break;

        case "cerrado":
            clase =
                "estado-cerrado";
            break;

        case "rechazado":
            clase =
                "estado-rechazado";
            break;

    }


    return (
        '<span class="estado ' +
        clase +
        '">' +
        escaparHTML(
            traducirEstado(
                estado
            )
        ) +
        '</span>'
    );

}


/* ============================================================
   FORMATO MONEDA
   ============================================================ */

function formatearMoneda(valor) {

    const numero =
        Number(valor) || 0;


    return numero.toLocaleString(
        "es-CL",
        {
            style: "currency",
            currency: "CLP",
            maximumFractionDigits: 0
        }
    );

}


/* ============================================================
   FORMATO FECHA
   ============================================================ */

function formatearFecha(fecha) {

    if (!fecha) {

        return "—";

    }


    const partes =
        String(fecha).split("-");


    if (partes.length !== 3) {

        return fecha;

    }


    return (
        partes[2] +
        "-" +
        partes[1] +
        "-" +
        partes[0]
    );

}


/* ============================================================
   FORMATO FECHA Y HORA
   ============================================================ */

function formatearFechaHora(fecha) {

    if (!fecha) {

        return "—";

    }


    const objeto =
        new Date(fecha);


    if (
        Number.isNaN(
            objeto.getTime()
        )
    ) {

        return "—";

    }


    return objeto.toLocaleString(
        "es-CL",
        {
            dateStyle: "short",
            timeStyle: "short"
        }
    );

}


/* ============================================================
   FECHA ACTUAL
   ============================================================ */

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


/* ============================================================
   CAPITALIZAR
   ============================================================ */

function capitalizar(texto) {

    if (!texto) {

        return "";

    }


    return (
        texto.charAt(0).toUpperCase() +
        texto.slice(1)
    );

}


/* ============================================================
   UTILIDADES DOM
   ============================================================ */

function establecerTexto(
    id,
    valor
) {

    const elemento =
        document.getElementById(
            id
        );


    if (!elemento) {

        return;

    }


    elemento.textContent =
        valor === null ||
        valor === undefined ||
        valor === ""
            ? "—"
            : valor;

}


function establecerHTML(
    id,
    valor
) {

    const elemento =
        document.getElementById(
            id
        );


    if (!elemento) {

        return;

    }


    elemento.innerHTML =
        valor || "—";

}


function establecerValor(
    id,
    valor
) {

    const elemento =
        document.getElementById(
            id
        );


    if (!elemento) {

        return;

    }


    elemento.value =
        valor === null ||
        valor === undefined
            ? ""
            : valor;

}


/* ============================================================
   VISIBILIDAD
   ============================================================ */

function ocultarCargando() {

    const elemento =
        document.getElementById(
            "cargandoProyecto"
        );


    if (elemento) {

        elemento.style.display =
            "none";

    }

}


function mostrarContenido() {

    const elemento =
        document.getElementById(
            "contenidoProyecto"
        );


    if (elemento) {

        elemento.style.display =
            "block";

    }

}


/* ============================================================
   ERROR
   ============================================================ */

function mostrarError(mensaje) {

    const elemento =
        document.getElementById(
            "errorProyecto"
        );


    if (!elemento) {

        return;

    }


    elemento.textContent =
        mensaje;


    elemento.style.display =
        "block";

}


/* ============================================================
   ESCAPAR HTML
   ============================================================ */

function escaparHTML(texto) {

    return String(texto)
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
