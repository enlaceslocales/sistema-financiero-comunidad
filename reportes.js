/* ============================================================
   SISTEMA FINANCIERO
   MÓDULO DE REPORTES
   ============================================================ */

/*
 * IMPORTANTE:
 *
 * Este archivo NO declara supabaseClient.
 *
 * supabaseClient es creado por:
 *
 *      config.js
 *
 * y reportes.html debe cargar config.js antes de reportes.js.
 */


/* ============================================================
   VARIABLES DEL MÓDULO
   ============================================================ */

let usuarioActual = null;
let perfilUsuario = null;

let movimientos = [];
let periodos = [];
let cuentas = [];

let reporteActual = [];


/*
 * Información financiera disponible para el reporte.
 *
 * Se utiliza tanto para la pantalla como para
 * las exportaciones PDF y Excel.
 */

let resumenDisponible = {

    anio: "",
    fechaCorte: "",
    cajaComunidad: 0,
    cuentaBancaria: 0,
    totalDisponible: 0

};


/* ============================================================
   ROLES AUTORIZADOS
   ============================================================ */

const ROLES_REPORTES_AUTORIZADOS = [

    "administrador",
    "tesorero",
    "consulta"

];


/* ============================================================
   INICIO DEL MÓDULO
   ============================================================ */

document.addEventListener(
    "DOMContentLoaded",
    async function () {

        try {

            await verificarSesion();

        }
        catch (error) {

            console.error(
                "Error al iniciar el módulo de reportes:",
                error
            );

        }

    }
);


/* ============================================================
   VERIFICAR SESIÓN Y PERMISOS
   ============================================================ */

async function verificarSesion() {

    if (
        typeof supabaseClient === "undefined" ||
        !supabaseClient
    ) {

        console.error(
            "supabaseClient no está disponible. " +
            "Verifique que config.js se cargue antes de reportes.js."
        );

        alert(
            "No fue posible iniciar el sistema financiero."
        );

        return;

    }


    const resultadoSesion =
        await supabaseClient.auth.getSession();


    if (resultadoSesion.error) {

        console.error(
            "Error al comprobar la sesión:",
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
            "Error al obtener el perfil:",
            resultadoPerfil.error
        );

        alert(
            "No fue posible verificar el perfil del usuario."
        );

        await supabaseClient.auth.signOut();

        window.location.href =
            "login.html";

        return;

    }


    const perfil =
        resultadoPerfil.data;


    if (!perfil) {

        console.error(
            "El usuario autenticado no posee un perfil."
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


    if (
        !ROLES_REPORTES_AUTORIZADOS.includes(
            perfil.rol
        )
    ) {

        alert(
            "No tiene permisos para acceder al módulo de reportes."
        );

        await supabaseClient.auth.signOut();

        window.location.href =
            "login.html";

        return;

    }


    perfilUsuario =
        perfil;


    mostrarUsuario();

    configurarEventos();

    await cargarPeriodos();

    await cargarCuentas();

    await cargarMovimientos();

}


/* ============================================================
   MOSTRAR USUARIO ACTIVO
   ============================================================ */

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
            perfilUsuario.nombre ||
            "Usuario";

    }


    if (rolUsuario) {

        rolUsuario.textContent =
            traducirRol(
                perfilUsuario.rol
            );

    }


    if (
        !nombreUsuario &&
        !rolUsuario
    ) {

        crearPanelUsuario();

    }

}


/* ============================================================
   CREAR PANEL DE USUARIO
   ============================================================ */

function crearPanelUsuario() {

    const contenedor =
        document.querySelector(
            ".reportes-header-acciones"
        );


    if (!contenedor) {

        return;

    }


    if (
        document.getElementById(
            "usuarioReporte"
        )
    ) {

        return;

    }


    const usuario =
        document.createElement(
            "div"
        );


    usuario.id =
        "usuarioReporte";

    usuario.className =
        "usuario";


    usuario.innerHTML =
        `
        <div class="usuario-icono">
            ♙
        </div>

        <div>
            <strong id="nombreUsuario">
                ${escaparHTML(
                    perfilUsuario.nombre ||
                    "Usuario"
                )}
            </strong>

            <span id="rolUsuario">
                ${escaparHTML(
                    traducirRol(
                        perfilUsuario.rol
                    )
                )}
            </span>
        </div>
        `;


    contenedor.prepend(
        usuario
    );

}


/* ============================================================
   TRADUCIR ROL
   ============================================================ */

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


/* ============================================================
   CONFIGURAR EVENTOS
   ============================================================ */

function configurarEventos() {

    const generar =
        document.getElementById(
            "generarReporteButton"
        );


    if (generar) {

        generar.addEventListener(
            "click",
            generarReporte
        );

    }


    const limpiar =
        document.getElementById(
            "limpiarFiltrosButton"
        );


    if (limpiar) {

        limpiar.addEventListener(
            "click",
            limpiarFiltros
        );

    }


    const exportarExcel =
        document.getElementById(
            "exportarExcelButton"
        );


    if (exportarExcel) {

        exportarExcel.addEventListener(
            "click",
            exportarExcelReporte
        );

    }


    const exportarPdf =
        document.getElementById(
            "exportarPdfButton"
        );


    if (exportarPdf) {

        exportarPdf.addEventListener(
            "click",
            exportarPdfReporte
        );

    }


    const volver =
        document.getElementById(
            "volverButton"
        );


    if (volver) {

        volver.addEventListener(
            "click",
            function () {

                window.location.href =
                    "dashboard.html";

            }
        );

    }

}


/* ============================================================
   CARGAR PERÍODOS
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

        mostrarError(
            "No fue posible cargar los períodos financieros."
        );

        return;

    }


    periodos =
        resultado.data || [];


    llenarSelectorAnios();

}


/* ============================================================
   LLENAR SELECTOR DE AÑOS
   ============================================================ */

function llenarSelectorAnios() {

    const selector =
        document.getElementById(
            "filtroAnio"
        );


    if (!selector) {

        return;

    }


    selector.innerHTML =
        `
        <option value="">
            Todos los años
        </option>
        `;


    const anios =
        [];


    periodos.forEach(
        function (periodo) {

            const anio =
                Number(
                    periodo.anio
                );


            if (
                anio &&
                !anios.includes(anio)
            ) {

                anios.push(anio);

            }

        }
    );


    anios.sort(
        function (a, b) {
            return b - a;
        }
    );


    anios.forEach(
        function (anio) {

            const option =
                document.createElement(
                    "option"
                );


            option.value =
                anio;


            option.textContent =
                anio;


            selector.appendChild(
                option
            );

        }
    );

}


/* ============================================================
   CARGAR CUENTAS
   ============================================================ */

async function cargarCuentas() {

    const resultado =
        await supabaseClient
            .from("cuentas")
            .select(
                "id, nombre, tipo, banco, numero_cuenta, activo"
            )
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

}


/* ============================================================
   CARGAR MOVIMIENTOS
   ============================================================ */

async function cargarMovimientos() {

    mostrarCargando(
        true
    );


    const resultado =
        await supabaseClient
            .from("movimientos")
            .select(
                `
                id,
                periodo_id,
                cuenta_id,
                fecha_movimiento,
                tipo,
                monto,
                origen,
                referencia_id,
                descripcion,
                observacion,
                subtipo
                `
            )
            .order(
                "fecha_movimiento",
                {
                    ascending: false
                }
            );


    if (resultado.error) {

        console.error(
            "Error al cargar movimientos:",
            resultado.error
        );

        mostrarError(
            "No fue posible cargar los movimientos financieros."
        );

        mostrarCargando(
            false
        );

        return;

    }


    movimientos =
        resultado.data || [];


    console.log(
        "Movimientos cargados:",
        movimientos.length
    );


    mostrarCargando(
        false
    );

}


/* ============================================================
   GENERAR REPORTE
   ============================================================ */

async function generarReporte() {

    limpiarMensajeError();

    mostrarCargando(
        true
    );


    try {

        const anio =
            document.getElementById(
                "filtroAnio"
            )?.value || "";


        const categoria =
            document.getElementById(
                "filtroCategoria"
            )?.value || "todos";


        const desde =
            document.getElementById(
                "filtroDesde"
            )?.value || "";


        const hasta =
            document.getElementById(
                "filtroHasta"
            )?.value || "";


        if (
            desde &&
            hasta &&
            desde > hasta
        ) {

            mostrarError(
                "La fecha desde no puede ser posterior a la fecha hasta."
            );

            mostrarCargando(
                false
            );

            return;

        }


        let lista =
            [...movimientos];


        /* ====================================================
           FILTRO POR AÑO
           ==================================================== */

        if (anio) {

            lista =
                lista.filter(
                    function (movimiento) {

                        const fecha =
                            obtenerFechaMovimiento(
                                movimiento
                            );


                        if (!fecha) {

                            return false;

                        }


                        return (
                            Number(
                                fecha.substring(
                                    0,
                                    4
                                )
                            ) ===
                            Number(anio)
                        );

                    }
                );

        }


        /* ====================================================
           FILTRO FECHA DESDE
           ==================================================== */

        if (desde) {

            lista =
                lista.filter(
                    function (movimiento) {

                        const fecha =
                            obtenerFechaMovimiento(
                                movimiento
                            );


                        return (
                            fecha &&
                            fecha >= desde
                        );

                    }
                );

        }


        /* ====================================================
           FILTRO FECHA HASTA
           ==================================================== */

        if (hasta) {

            lista =
                lista.filter(
                    function (movimiento) {

                        const fecha =
                            obtenerFechaMovimiento(
                                movimiento
                            );


                        return (
                            fecha &&
                            fecha <= hasta
                        );

                    }
                );

        }


        /* ====================================================
           FILTRO POR CATEGORÍA
           ==================================================== */

        if (
            categoria &&
            categoria !== "todos"
        ) {

            lista =
                lista.filter(
                    function (movimiento) {

                        return clasificarMovimiento(
                            movimiento
                        ) === categoria;

                    }
                );

        }


        reporteActual =
            lista;


        /* ====================================================
           CALCULAR SALDOS DISPONIBLES
           ==================================================== */

        resumenDisponible =
            calcularSaldosDisponibles(
                anio,
                desde,
                hasta
            );


        /* ====================================================
           MOSTRAR CONTENIDO
           ==================================================== */

        const contenido =
            document.getElementById(
                "contenidoReporte"
            );


        if (contenido) {

            contenido.style.display =
                "block";

        }


        /* ====================================================
           ACTUALIZAR RESUMEN
           ==================================================== */

        actualizarResumen(
            lista
        );


        /* ====================================================
           ACTUALIZAR SALDOS DISPONIBLES
           ==================================================== */

        actualizarSaldosDisponibles(
            resumenDisponible
        );


        /* ====================================================
           RESUMEN POR CATEGORÍA
           ==================================================== */

        actualizarResumenCategorias(
            lista
        );


        /* ====================================================
           TABLA DE MOVIMIENTOS
           ==================================================== */

        actualizarTablaMovimientos(
            lista
        );


        /* ====================================================
           CANTIDAD
           ==================================================== */

        const textoCantidad =
            document.getElementById(
                "textoCantidadMovimientos"
            );


        if (textoCantidad) {

            textoCantidad.textContent =
                lista.length === 1
                    ? "1 movimiento encontrado."
                    : lista.length +
                      " movimientos encontrados.";

        }


    }
    catch (error) {

        console.error(
            "Error generando reporte:",
            error
        );


        mostrarError(
            "Ocurrió un error al generar el reporte."
        );

    }
    finally {

        mostrarCargando(
            false
        );

    }

}


/* ============================================================
   CALCULAR SALDOS DISPONIBLES
   ============================================================ */

/*
 * IMPORTANTE:
 *
 * El saldo disponible NO se calcula utilizando únicamente
 * reporteActual, porque reporteActual puede tener filtros
 * por categoría.
 *
 * Ejemplo:
 *
 * Si filtramos solamente "Pago de cuotas", eso no significa
 * que el dinero disponible de la comunidad corresponda
 * solamente a esos movimientos.
 *
 * Por eso se utilizan TODOS los movimientos financieros
 * hasta la fecha de corte correspondiente.
 */

function calcularSaldosDisponibles(
    anio,
    desde,
    hasta
) {

    let fechaCorte =
        "";


    /*
     * Si existe una fecha "hasta",
     * esa es la fecha de corte.
     */

    if (hasta) {

        fechaCorte =
            hasta;

    }


    /*
     * Si no existe "hasta" pero se seleccionó
     * un año, utilizamos el 31 de diciembre
     * de ese año.
     */

    else if (anio) {

        fechaCorte =
            String(anio) +
            "-12-31";

    }


    /*
     * Si no hay año ni fecha hasta,
     * utilizamos la fecha del movimiento
     * más reciente disponible.
     */

    else {

        const fechas =
            movimientos
                .map(
                    function (movimiento) {

                        return obtenerFechaMovimiento(
                            movimiento
                        );

                    }
                )
                .filter(
                    function (fecha) {

                        return !!fecha;

                    }
                )
                .sort();


        if (fechas.length > 0) {

            fechaCorte =
                fechas[
                    fechas.length - 1
                ];

        }

    }


    /*
     * Si todavía no existe fecha de corte,
     * calculamos sobre todos los movimientos.
     */

    const movimientosParaSaldo =
        movimientos.filter(
            function (movimiento) {

                if (!fechaCorte) {

                    return true;

                }


                const fecha =
                    obtenerFechaMovimiento(
                        movimiento
                    );


                if (!fecha) {

                    return false;

                }


                return fecha <= fechaCorte;

            }
        );


    let cajaComunidad =
        0;


    let cuentaBancaria =
        0;


    movimientosParaSaldo.forEach(
        function (movimiento) {

            const monto =
                Number(
                    movimiento.monto
                ) || 0;


            let valor =
                0;


            if (
                movimiento.tipo ===
                "ingreso"
            ) {

                valor =
                    monto;

            }


            else if (
                movimiento.tipo ===
                "egreso"
            ) {

                valor =
                    -monto;

            }


            const cuenta =
                obtenerCuenta(
                    movimiento.cuenta_id
                );


            /*
             * Cuenta bancaria.
             */

            if (
                cuenta &&
                cuenta.tipo ===
                "bancaria"
            ) {

                cuentaBancaria +=
                    valor;

            }


            /*
             * Todo lo que no sea bancaria
             * se considera caja/efectivo.
             */

            else {

                cajaComunidad +=
                    valor;

            }

        }
    );


    const totalDisponible =
        cajaComunidad +
        cuentaBancaria;


    return {

        anio:
            anio
                ? String(anio)
                : "Todos",

        fechaCorte:
            fechaCorte,

        cajaComunidad:
            cajaComunidad,

        cuentaBancaria:
            cuentaBancaria,

        totalDisponible:
            totalDisponible

    };

}


/* ============================================================
   ACTUALIZAR SALDOS DISPONIBLES EN PANTALLA
   ============================================================ */

function actualizarSaldosDisponibles(
    resumen
) {

    /*
     * Esta función busca diferentes IDs posibles
     * para no romper el HTML actual.
     *
     * Si posteriormente agregamos las tarjetas:
     *
     * saldoCajaComunidad
     * saldoCuentaBancaria
     * saldoTotalDisponible
     * anioReportado
     *
     * se actualizarán automáticamente.
     */

    const anioElement =
        document.getElementById(
            "anioReportado"
        );


    const cajaElement =
        document.getElementById(
            "saldoCajaComunidad"
        );


    const bancoElement =
        document.getElementById(
            "saldoCuentaBancaria"
        );


    const totalElement =
        document.getElementById(
            "saldoTotalDisponible"
        );


    if (anioElement) {

        anioElement.textContent =
            resumen.anio;

    }


    if (cajaElement) {

        cajaElement.textContent =
            formatearMoneda(
                resumen.cajaComunidad
            );

    }


    if (bancoElement) {

        bancoElement.textContent =
            formatearMoneda(
                resumen.cuentaBancaria
            );

    }


    if (totalElement) {

        totalElement.textContent =
            formatearMoneda(
                resumen.totalDisponible
            );

    }

}


/* ============================================================
   OBTENER FECHA DEL MOVIMIENTO
   ============================================================ */

function obtenerFechaMovimiento(
    movimiento
) {

    if (
        !movimiento ||
        !movimiento.fecha_movimiento
    ) {

        return "";

    }


    return String(
        movimiento.fecha_movimiento
    ).substring(
        0,
        10
    );

}


/* ============================================================
   CLASIFICAR MOVIMIENTO
   ============================================================ */

function clasificarMovimiento(
    movimiento
) {

    if (!movimiento) {

        return "otros";

    }


    const origen =
        String(
            movimiento.origen ||
            ""
        ).toLowerCase();


    const subtipo =
        String(
            movimiento.subtipo ||
            ""
        ).toLowerCase();


    if (
        origen === "proyecto_egreso" ||
        origen === "proyecto"
    ) {

        return "proyectos";

    }


    if (
        origen === "pago_cuota"
    ) {

        return "pago_cuota";

    }


    if (
        subtipo === "reversa" ||
        origen === "ajuste"
    ) {

        return "ajuste";

    }


    if (
        movimiento.tipo === "ingreso" ||
        origen === "ingreso"
    ) {

        return "ingreso";

    }


    if (
        movimiento.tipo === "egreso" ||
        origen === "egreso"
    ) {

        return "egreso";

    }


    return "otros";

}


/* ============================================================
   ACTUALIZAR RESUMEN GENERAL
   ============================================================ */

function actualizarResumen(
    lista
) {

    let ingresos = 0;

    let egresos = 0;


    lista.forEach(
        function (movimiento) {

            const monto =
                Number(
                    movimiento.monto
                ) || 0;


            if (
                movimiento.tipo ===
                "ingreso"
            ) {

                ingresos +=
                    monto;

            }


            if (
                movimiento.tipo ===
                "egreso"
            ) {

                egresos +=
                    monto;

            }

        }
    );


    const saldo =
        ingresos -
        egresos;


    const elementoIngresos =
        document.getElementById(
            "resumenIngresos"
        );


    const elementoEgresos =
        document.getElementById(
            "resumenEgresos"
        );


    const elementoSaldo =
        document.getElementById(
            "resumenSaldo"
        );


    const elementoMovimientos =
        document.getElementById(
            "resumenMovimientos"
        );


    if (elementoIngresos) {

        elementoIngresos.textContent =
            formatearMoneda(
                ingresos
            );

    }


    if (elementoEgresos) {

        elementoEgresos.textContent =
            formatearMoneda(
                egresos
            );

    }


    if (elementoSaldo) {

        elementoSaldo.textContent =
            formatearMoneda(
                saldo
            );


        elementoSaldo.classList.remove(
            "resultado-positivo",
            "resultado-negativo"
        );


        if (saldo > 0) {

            elementoSaldo.classList.add(
                "resultado-positivo"
            );

        }


        if (saldo < 0) {

            elementoSaldo.classList.add(
                "resultado-negativo"
            );

        }

    }


    if (elementoMovimientos) {

        elementoMovimientos.textContent =
            lista.length;

    }

}


/* ============================================================
   RESUMEN POR CATEGORÍA
   ============================================================ */

function actualizarResumenCategorias(
    lista
) {

    const tabla =
        document.getElementById(
            "tablaResumenCategorias"
        );


    if (!tabla) {

        return;

    }


    const categorias = {

        proyectos: {
            nombre: "Proyectos",
            ingresos: 0,
            egresos: 0,
            movimientos: 0
        },

        pago_cuota: {
            nombre: "Pago de cuotas",
            ingresos: 0,
            egresos: 0,
            movimientos: 0
        },

        ingreso: {
            nombre: "Ingresos",
            ingresos: 0,
            egresos: 0,
            movimientos: 0
        },

        egreso: {
            nombre: "Egresos",
            ingresos: 0,
            egresos: 0,
            movimientos: 0
        },

        ajuste: {
            nombre: "Ajustes",
            ingresos: 0,
            egresos: 0,
            movimientos: 0
        }

    };


    lista.forEach(
        function (movimiento) {

            const categoria =
                clasificarMovimiento(
                    movimiento
                );


            if (
                !categorias[categoria]
            ) {

                return;

            }


            const monto =
                Number(
                    movimiento.monto
                ) || 0;


            categorias[categoria]
                .movimientos++;


            if (
                movimiento.tipo ===
                "ingreso"
            ) {

                categorias[categoria]
                    .ingresos +=
                    monto;

            }


            if (
                movimiento.tipo ===
                "egreso"
            ) {

                categorias[categoria]
                    .egresos +=
                    monto;

            }

        }
    );


    const orden = [

        "proyectos",
        "pago_cuota",
        "ingreso",
        "egreso",
        "ajuste"

    ];


    let html = "";


    orden.forEach(
        function (clave) {

            const item =
                categorias[clave];


            if (
                item.movimientos === 0
            ) {

                return;

            }


            const saldo =
                item.ingresos -
                item.egresos;


            html +=
                `
                <tr>

                    <td>
                        <strong>
                            ${escaparHTML(
                                item.nombre
                            )}
                        </strong>
                    </td>

                    <td class="ingreso">
                        ${escaparHTML(
                            formatearMoneda(
                                item.ingresos
                            )
                        )}
                    </td>

                    <td class="egreso">
                        ${escaparHTML(
                            formatearMoneda(
                                item.egresos
                            )
                        )}
                    </td>

                    <td class="${saldo >= 0 ? "ingreso" : "egreso"}">
                        ${escaparHTML(
                            formatearMoneda(
                                saldo
                            )
                        )}
                    </td>

                    <td>
                        ${item.movimientos}
                    </td>

                </tr>
                `;

        }
    );


    if (!html) {

        html =
            `
            <tr>

                <td
                    colspan="5"
                    class="tabla-vacia"
                >
                    No existen movimientos para los filtros seleccionados.
                </td>

            </tr>
            `;

    }


    tabla.innerHTML =
        html;

}


/* ============================================================
   ACTUALIZAR TABLA DE MOVIMIENTOS
   ============================================================ */

function actualizarTablaMovimientos(
    lista
) {

    const tabla =
        document.getElementById(
            "tablaMovimientos"
        );


    if (!tabla) {

        return;

    }


    if (
        !lista ||
        lista.length === 0
    ) {

        tabla.innerHTML =
            `
            <tr>

                <td
                    colspan="8"
                    class="tabla-vacia"
                >
                    No existen movimientos para los filtros seleccionados.
                </td>

            </tr>
            `;

        return;

    }


    let html = "";


    lista.forEach(
        function (movimiento) {

            const cuenta =
                obtenerCuenta(
                    movimiento.cuenta_id
                );


            const categoria =
                clasificarMovimiento(
                    movimiento
                );


            const monto =
                Number(
                    movimiento.monto
                ) || 0;


            html +=
                `
                <tr>

                    <td>
                        ${escaparHTML(
                            formatearFecha(
                                obtenerFechaMovimiento(
                                    movimiento
                                )
                            )
                        )}
                    </td>

                    <td>
                        ${escaparHTML(
                            traducirCategoria(
                                categoria
                            )
                        )}
                    </td>

                    <td>
                        <span class="${movimiento.tipo === "ingreso" ? "ingreso" : "egreso"}">
                            ${escaparHTML(
                                traducirTipo(
                                    movimiento.tipo
                                )
                            )}
                        </span>
                    </td>

                    <td>
                        ${escaparHTML(
                            obtenerNombreCuenta(
                                cuenta
                            )
                        )}
                    </td>

                    <td>
                        <strong class="${movimiento.tipo === "ingreso" ? "ingreso" : "egreso"}">
                            ${escaparHTML(
                                formatearMoneda(
                                    monto
                                )
                            )}
                        </strong>
                    </td>

                    <td>
                        ${escaparHTML(
                            movimiento.descripcion ||
                            "—"
                        )}
                    </td>

                    <td>
                        ${escaparHTML(
                            movimiento.observacion ||
                            "—"
                        )}
                    </td>

                    <td>
                        ${escaparHTML(
                            traducirSubtipo(
                                movimiento.subtipo
                            )
                        )}
                    </td>

                </tr>
                `;

        }
    );


    tabla.innerHTML =
        html;

}


/* ============================================================
   TRADUCIR CATEGORÍA
   ============================================================ */

function traducirCategoria(
    categoria
) {

    switch (categoria) {

        case "proyectos":
            return "Proyectos";

        case "pago_cuota":
            return "Pago de cuotas";

        case "ingreso":
            return "Ingresos";

        case "egreso":
            return "Egresos";

        case "ajuste":
            return "Ajustes";

        default:
            return "Otros";

    }

}


/* ============================================================
   TRADUCIR TIPO
   ============================================================ */

function traducirTipo(
    tipo
) {

    switch (tipo) {

        case "ingreso":
            return "Ingreso";

        case "egreso":
            return "Egreso";

        default:
            return tipo || "—";

    }

}


/* ============================================================
   TRADUCIR SUBTIPO
   ============================================================ */

function traducirSubtipo(
    subtipo
) {

    switch (subtipo) {

        case "normal":
            return "Normal";

        case "reversa":
            return "Reversa";

        default:
            return subtipo || "Normal";

    }

}


/* ============================================================
   OBTENER CUENTA
   ============================================================ */

function obtenerCuenta(
    id
) {

    return cuentas.find(
        function (cuenta) {

            return (
                Number(
                    cuenta.id
                ) ===
                Number(id)
            );

        }
    );

}


/* ============================================================
   OBTENER NOMBRE DE CUENTA
   ============================================================ */

function obtenerNombreCuenta(
    cuenta
) {

    if (!cuenta) {

        return "Cuenta no encontrada";

    }


    let texto =
        cuenta.nombre ||
        "Cuenta";


    if (
        cuenta.tipo ===
        "bancaria"
    ) {

        if (
            cuenta.banco
        ) {

            texto +=
                " — " +
                cuenta.banco;

        }


        if (
            cuenta.numero_cuenta
        ) {

            texto +=
                " (" +
                cuenta.numero_cuenta +
                ")";

        }

    }

    else {

        texto +=
            " — Efectivo";

    }


    return texto;

}


/* ============================================================
   FORMATEAR MONEDA
   ============================================================ */

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
            style: "currency",
            currency: "CLP",
            maximumFractionDigits: 0
        }
    );

}


/* ============================================================
   FORMATEAR FECHA
   ============================================================ */

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
            "-"
        );


    if (
        partes.length !== 3
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


/* ============================================================
   LIMPIAR FILTROS
   ============================================================ */

function limpiarFiltros() {

    const anio =
        document.getElementById(
            "filtroAnio"
        );


    const categoria =
        document.getElementById(
            "filtroCategoria"
        );


    const desde =
        document.getElementById(
            "filtroDesde"
        );


    const hasta =
        document.getElementById(
            "filtroHasta"
        );


    if (anio) {

        anio.value =
            "";

    }


    if (categoria) {

        categoria.value =
            "todos";

    }


    if (desde) {

        desde.value =
            "";

    }


    if (hasta) {

        hasta.value =
            "";

    }


    const contenido =
        document.getElementById(
            "contenidoReporte"
        );


    if (contenido) {

        contenido.style.display =
            "none";

    }


    reporteActual =
        [];


    resumenDisponible = {

        anio: "",
        fechaCorte: "",
        cajaComunidad: 0,
        cuentaBancaria: 0,
        totalDisponible: 0

    };


    limpiarMensajeError();

}


/* ============================================================
   EXPORTAR A EXCEL
   ============================================================ */

function exportarExcelReporte() {

    if (
        !reporteActual ||
        reporteActual.length === 0
    ) {

        alert(
            "Primero debe generar un reporte con información."
        );

        return;

    }


    if (
        typeof XLSX === "undefined"
    ) {

        alert(
            "No fue posible cargar la herramienta de exportación Excel."
        );

        return;

    }


    /*
     * ========================================================
     * RESUMEN FINANCIERO INICIAL
     * ========================================================
     */

    const filasResumen = [

        [
            "REPORTE FINANCIERO"
        ],

        [],

        [
            "Año reportado",
            resumenDisponible.anio
        ],

        [
            "Fecha de corte",
            resumenDisponible.fechaCorte
                ? formatearFecha(
                    resumenDisponible.fechaCorte
                )
                : "—"
        ],

        [
            "Monto disponible — Caja Comunidad",
            resumenDisponible.cajaComunidad
        ],

        [
            "Monto disponible — Cuenta Bancaria",
            resumenDisponible.cuentaBancaria
        ],

        [
            "MONTO TOTAL DISPONIBLE",
            resumenDisponible.totalDisponible
        ],

        [],

        [
            "DETALLE DE MOVIMIENTOS"
        ],

        []

    ];


    /*
     * ========================================================
     * MOVIMIENTOS
     * ========================================================
     */

    const filas =
        reporteActual.map(
            function (movimiento) {

                const cuenta =
                    obtenerCuenta(
                        movimiento.cuenta_id
                    );


                const categoria =
                    clasificarMovimiento(
                        movimiento
                    );


                return [

                    formatearFecha(
                        obtenerFechaMovimiento(
                            movimiento
                        )
                    ),

                    traducirCategoria(
                        categoria
                    ),

                    traducirTipo(
                        movimiento.tipo
                    ),

                    obtenerNombreCuenta(
                        cuenta
                    ),

                    Number(
                        movimiento.monto
                    ) || 0,

                    movimiento.descripcion ||
                    "",

                    movimiento.observacion ||
                    "",

                    traducirSubtipo(
                        movimiento.subtipo
                    )

                ];

            }
        );


    /*
     * ========================================================
     * CONSTRUIR HOJA EXCEL
     * ========================================================
     */

    const datosExcel =
        filasResumen.concat(

            [

                [
                    "Fecha",
                    "Categoría",
                    "Tipo",
                    "Cuenta",
                    "Monto",
                    "Descripción",
                    "Observación",
                    "Subtipo"
                ]

            ],

            filas

        );


    const hoja =
        XLSX.utils.aoa_to_sheet(
            datosExcel
        );


    /*
     * Anchos de columnas.
     */

    hoja["!cols"] = [

        { wch: 20 },
        { wch: 32 },
        { wch: 15 },
        { wch: 40 },
        { wch: 20 },
        { wch: 45 },
        { wch: 45 },
        { wch: 15 }

    ];


    /*
     * Formato monetario para los saldos.
     */

    const celdasMonetarias = [

        "B5",
        "B6",
        "B7"

    ];


    celdasMonetarias.forEach(
        function (celda) {

            if (
                hoja[celda]
            ) {

                hoja[celda].z =
                    '$ #,##0';

            }

        }
    );


    /*
     * Formato monetario para columna
     * de movimientos.
     *
     * Los movimientos comienzan después
     * de las filas de resumen.
     */

    const primeraFilaMovimientos =
        12;


    for (
        let fila = primeraFilaMovimientos;
        fila <
        primeraFilaMovimientos +
        filas.length;
        fila++
    ) {

        const celda =
            hoja[
                "E" +
                fila
            ];


        if (celda) {

            celda.z =
                '$ #,##0';

        }

    }


    /*
     * Crear libro.
     */

    const libro =
        XLSX.utils.book_new();


    XLSX.utils.book_append_sheet(
        libro,
        hoja,
        "Reporte financiero"
    );


    /*
     * Fecha de generación.
     */

    const fecha =
        new Date()
            .toISOString()
            .substring(
                0,
                10
            );


    XLSX.writeFile(
        libro,
        "reporte-financiero-" +
        fecha +
        ".xlsx"
    );

}


/* ============================================================
   EXPORTAR A PDF
   ============================================================ */

function exportarPdfReporte() {

    if (
        !reporteActual ||
        reporteActual.length === 0
    ) {

        alert(
            "Primero debe generar un reporte con información."
        );

        return;

    }


    if (
        typeof window.jspdf ===
        "undefined"
    ) {

        alert(
            "No fue posible cargar la herramienta de exportación PDF."
        );

        return;

    }


    const jsPDF =
        window.jspdf.jsPDF;


    const documento =
        new jsPDF(
            "landscape",
            "mm",
            "a4"
        );


    /*
     * ========================================================
     * TÍTULO
     * ========================================================
     */

    documento.setFontSize(
        18
    );


    documento.text(
        "Reporte financiero",
        14,
        15
    );


    /*
     * ========================================================
     * INFORMACIÓN DEL USUARIO
     * ========================================================
     */

    documento.setFontSize(
        9
    );


    documento.text(
        "Generado por: " +
        (
            perfilUsuario?.nombre ||
            "Usuario"
        ),
        14,
        22
    );


    documento.text(
        "Rol: " +
        traducirRol(
            perfilUsuario?.rol
        ),
        14,
        27
    );


    /*
     * ========================================================
     * FECHA DE GENERACIÓN
     * ========================================================
     */

    documento.text(
        "Fecha de generación: " +
        formatearFecha(
            new Date()
                .toISOString()
                .substring(
                    0,
                    10
                )
        ),
        14,
        32
    );


    /*
     * ========================================================
     * BLOQUE DE DISPONIBILIDAD FINANCIERA
     * ========================================================
     */

    documento.setFontSize(
        11
    );


    documento.text(
        "Situación de disponibilidad financiera",
        14,
        40
    );


    documento.setFontSize(
        9
    );


    documento.text(
        "Año reportado: " +
        resumenDisponible.anio,
        14,
        47
    );


    documento.text(
        "Fecha de corte: " +
        (
            resumenDisponible.fechaCorte
                ? formatearFecha(
                    resumenDisponible.fechaCorte
                )
                : "—"
        ),
        14,
        52
    );


    documento.text(
        "Caja Comunidad: " +
        formatearMoneda(
            resumenDisponible.cajaComunidad
        ),
        90,
        47
    );


    documento.text(
        "Cuenta Bancaria: " +
        formatearMoneda(
            resumenDisponible.cuentaBancaria
        ),
        90,
        52
    );


    documento.setFontSize(
        10
    );


    documento.text(
        "TOTAL DISPONIBLE: " +
        formatearMoneda(
            resumenDisponible.totalDisponible
        ),
        180,
        49
    );


    /*
     * ========================================================
     * PREPARAR FILAS
     * ========================================================
     */

    const filas =
        reporteActual.map(
            function (movimiento) {

                const cuenta =
                    obtenerCuenta(
                        movimiento.cuenta_id
                    );


                return [

                    formatearFecha(
                        obtenerFechaMovimiento(
                            movimiento
                        )
                    ),

                    traducirCategoria(
                        clasificarMovimiento(
                            movimiento
                        )
                    ),

                    traducirTipo(
                        movimiento.tipo
                    ),

                    obtenerNombreCuenta(
                        cuenta
                    ),

                    formatearMoneda(
                        movimiento.monto
                    ),

                    movimiento.descripcion ||
                    "—",

                    movimiento.observacion ||
                    "—",

                    traducirSubtipo(
                        movimiento.subtipo
                    )

                ];

            }
        );


    /*
     * ========================================================
     * AUTOTABLE
     * ========================================================
     */

    if (
        typeof documento.autoTable !==
        "function"
    ) {

        alert(
            "No fue posible cargar la herramienta de tablas PDF."
        );

        return;

    }


    documento.autoTable({

        startY: 60,

        head: [[

            "Fecha",
            "Categoría",
            "Tipo",
            "Cuenta",
            "Monto",
            "Descripción",
            "Observación",
            "Subtipo"

        ]],

        body:
            filas,

        styles: {

            fontSize: 7,

            cellPadding: 2

        },

        headStyles: {

            fontSize: 7

        },

        columnStyles: {

            0: {
                cellWidth: 23
            },

            1: {
                cellWidth: 28
            },

            2: {
                cellWidth: 20
            },

            3: {
                cellWidth: 42
            },

            4: {
                cellWidth: 28
            },

            5: {
                cellWidth: 55
            },

            6: {
                cellWidth: 55
            },

            7: {
                cellWidth: 25
            }

        },

        didParseCell:
            function (data) {

                if (
                    data.section ===
                    "head"
                ) {

                    return;

                }

            }

    });


    /*
     * ========================================================
     * NOMBRE DEL ARCHIVO
     * ========================================================
     */

    const fecha =
        new Date()
            .toISOString()
            .substring(
                0,
                10
            );


    documento.save(
        "reporte-financiero-" +
        fecha +
        ".pdf"
    );

}


/* ============================================================
   MOSTRAR / OCULTAR CARGANDO
   ============================================================ */

function mostrarCargando(
    mostrar
) {

    const elemento =
        document.getElementById(
            "cargandoReporte"
        );


    if (!elemento) {

        return;

    }


    elemento.style.display =
        mostrar
            ? "flex"
            : "none";

}


/* ============================================================
   MOSTRAR ERROR
   ============================================================ */

function mostrarError(
    mensaje
) {

    const elemento =
        document.getElementById(
            "mensajeError"
        );


    if (!elemento) {

        alert(
            mensaje
        );

        return;

    }


    elemento.textContent =
        mensaje;


    elemento.style.display =
        "block";

}


/* ============================================================
   LIMPIAR ERROR
   ============================================================ */

function limpiarMensajeError() {

    const elemento =
        document.getElementById(
            "mensajeError"
        );


    if (!elemento) {

        return;

    }


    elemento.textContent =
        "";


    elemento.style.display =
        "none";

}


/* ============================================================
   ESCAPAR HTML
   ============================================================ */

function escaparHTML(
    texto
) {

    return String(
        texto ?? ""
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


/* ============================================================
   FIN DEL MÓDULO
   ============================================================ */
