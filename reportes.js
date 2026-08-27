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


/* ============================================================
   ROLES AUTORIZADOS
   ============================================================ */

/*
 * Reportes es un módulo de consulta.
 *
 * Roles permitidos:
 *
 * administrador
 * tesorero
 * consulta
 */

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

    /*
     * Verificar que Supabase exista.
     */

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


    /*
     * Obtener sesión actual.
     */

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


    /*
     * No existe sesión.
     */

    if (!session) {

        window.location.href =
            "login.html";

        return;

    }


    /*
     * Guardar usuario autenticado.
     */

    usuarioActual =
        session.user;


    /*
     * Obtener perfil desde profiles.
     */

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


    /*
     * El usuario debe tener un perfil.
     */

    if (!perfil) {

        console.error(
            "El usuario autenticado no posee un perfil."
        );

        await supabaseClient.auth.signOut();

        window.location.href =
            "login.html";

        return;

    }


    /*
     * Verificar usuario activo.
     */

    if (!perfil.activo) {

        alert(
            "Este usuario se encuentra desactivado."
        );

        await supabaseClient.auth.signOut();

        window.location.href =
            "login.html";

        return;

    }


    /*
     * Verificar rol autorizado.
     */

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


    /*
     * Guardar perfil.
     */

    perfilUsuario =
        perfil;


    /*
     * Mostrar usuario.
     */

    mostrarUsuario();


    /*
     * Configurar eventos.
     */

    configurarEventos();


    /*
     * Cargar información.
     */

    await cargarPeriodos();

    await cargarCuentas();

    await cargarMovimientos();


    /*
     * Inicialmente no mostrar reporte
     * hasta presionar Generar reporte.
     */

}


/* ============================================================
   MOSTRAR USUARIO ACTIVO
   ============================================================ */

function mostrarUsuario() {

    /*
     * Si reportes.html ya tiene los elementos,
     * simplemente los utilizamos.
     */

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


    /*
     * Si reportes.html no tiene usuario,
     * lo agregamos automáticamente.
     */

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


    /*
     * Evitar duplicarlo.
     */

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


    /*
     * Insertar antes de los botones.
     */

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

                anios.push(
                    anio
                );

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

        /*
         * Obtener filtros.
         */

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


        /*
         * Validar fechas.
         */

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


        /*
         * Filtrar movimientos.
         */

        let lista =
            [...movimientos];


        /*
         * FILTRO POR AÑO
         */

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


        /*
         * FILTRO FECHA DESDE
         */

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


        /*
         * FILTRO FECHA HASTA
         */

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


        /*
         * FILTRO POR CATEGORÍA
         */

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


        /*
         * Guardar reporte actual.
         */

        reporteActual =
            lista;


        /*
         * Mostrar contenido.
         */

        const contenido =
            document.getElementById(
                "contenidoReporte"
            );


        if (contenido) {

            contenido.style.display =
                "block";

        }


        /*
         * Actualizar resumen.
         */

        actualizarResumen(
            lista
        );


        /*
         * Resumen por categoría.
         */

        actualizarResumenCategorias(
            lista
        );


        /*
         * Tabla de movimientos.
         */

        actualizarTablaMovimientos(
            lista
        );


        /*
         * Cantidad.
         */

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

/*
 * Clasificación utilizada por Reportes:
 *
 * proyecto_egreso -> proyectos
 * pago_cuota      -> pago_cuota
 * subtipo reversa -> ajuste
 * ingreso         -> ingreso
 * egreso          -> egreso
 */

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


    /*
     * Proyecto.
     */

    if (
        origen === "proyecto_egreso" ||
        origen === "proyecto"
    ) {

        return "proyectos";

    }


    /*
     * Pago de cuota.
     */

    if (
        origen === "pago_cuota"
    ) {

        return "pago_cuota";

    }


    /*
     * Ajustes / reversas.
     */

    if (
        subtipo === "reversa" ||
        origen === "ajuste"
    ) {

        return "ajuste";

    }


    /*
     * Ingreso.
     */

    if (
        movimiento.tipo === "ingreso" ||
        origen === "ingreso"
    ) {

        return "ingreso";

    }


    /*
     * Egreso.
     */

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


            /*
             * No mostrar categorías completamente vacías.
             */

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


                return {

                    "Fecha":
                        formatearFecha(
                            obtenerFechaMovimiento(
                                movimiento
                            )
                        ),

                    "Categoría":
                        traducirCategoria(
                            categoria
                        ),

                    "Tipo":
                        traducirTipo(
                            movimiento.tipo
                        ),

                    "Cuenta":
                        obtenerNombreCuenta(
                            cuenta
                        ),

                    "Monto":
                        Number(
                            movimiento.monto
                        ) || 0,

                    "Descripción":
                        movimiento.descripcion ||
                        "",

                    "Observación":
                        movimiento.observacion ||
                        "",

                    "Subtipo":
                        traducirSubtipo(
                            movimiento.subtipo
                        )

                };

            }
        );


    const hoja =
        XLSX.utils.json_to_sheet(
            filas
        );


    hoja["!cols"] = [
        { wch: 12 },
        { wch: 20 },
        { wch: 12 },
        { wch: 35 },
        { wch: 15 },
        { wch: 45 },
        { wch: 45 },
        { wch: 15 }
    ];


    const libro =
        XLSX.utils.book_new();


    XLSX.utils.book_append_sheet(
        libro,
        hoja,
        "Reporte financiero"
    );


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
     * Título.
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
     * Información del usuario.
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
     * Fecha de generación.
     */

    documento.text(
        "Fecha: " +
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
     * Preparar filas.
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
     * AutoTable.
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

        startY: 38,

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

                /*
                 * No aplicar estilos especiales
                 * al encabezado.
                 */

                if (
                    data.section ===
                    "head"
                ) {

                    return;

                }

            }

    });


    /*
     * Nombre del archivo.
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