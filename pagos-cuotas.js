// ============================================================
// SISTEMA FINANCIERO
// MÓDULO DE PAGOS DE CUOTAS
// ============================================================

let usuarioActual = null;
let perfilUsuario = null;

let cuotas = [];
let socios = [];
let periodos = [];
let cuentas = [];
let comprobantesPorPago = {};
let cuotaHistorialActual = null;


// ============================================================
// INICIAR MÓDULO
// ============================================================

document.addEventListener(
    "DOMContentLoaded",
    async function () {

        await verificarSesion();

    }
);


// ============================================================
// VERIFICAR SESIÓN
// ============================================================

async function verificarSesion() {

    const resultado =
        await supabaseClient.auth.getSession();

    const session =
        resultado.data.session;

    if (resultado.error) {

        console.error(
            "Error al comprobar sesión:",
            resultado.error
        );

        window.location.href =
            "login.html";

        return;
    }

    if (!session) {

        window.location.href =
            "login.html";

        return;
    }

    usuarioActual =
        session.user;


    // ========================================================
    // PERFIL
    // ========================================================

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

        alert(
            "No fue posible cargar el perfil del usuario."
        );

        return;
    }

    const perfil =
        resultadoPerfil.data;

    if (!perfil) {

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

    perfilUsuario =
        perfil;


    if (perfilUsuario.rol === "consulta") {

        window.location.href =
            "reportes.html";

        return;
    }


    mostrarUsuario();

    configurarEventos();

    await cargarSocios();

    await cargarPeriodos();

    await cargarCuentas();

    await cargarCuotas();

}


// ============================================================
// MOSTRAR USUARIO
// ============================================================

function mostrarUsuario() {

    const nombre =
        document.getElementById(
            "nombreUsuario"
        );

    const rol =
        document.getElementById(
            "rolUsuario"
        );

    if (nombre) {

        nombre.textContent =
            perfilUsuario.nombre ||
            "Usuario";

    }

    if (rol) {

        rol.textContent =
            traducirRol(
                perfilUsuario.rol
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

    const buscar =
        document.getElementById(
            "buscarSocio"
        );

    if (buscar) {

        buscar.addEventListener(
            "input",
            aplicarFiltros
        );

    }


    const estado =
        document.getElementById(
            "filtroEstado"
        );

    if (estado) {

        estado.addEventListener(
            "change",
            aplicarFiltros
        );

    }


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


    const formulario =
        document.getElementById(
            "formPago"
        );

    if (formulario) {

        formulario.addEventListener(
            "submit",
            guardarPago
        );

    }


    const cerrarPago =
        document.getElementById(
            "cerrarModalPago"
        );

    if (cerrarPago) {

        cerrarPago.addEventListener(
            "click",
            cerrarModalPago
        );

    }


    const cancelarPago =
        document.getElementById(
            "cancelarPago"
        );

    if (cancelarPago) {

        cancelarPago.addEventListener(
            "click",
            cerrarModalPago
        );

    }


    const cerrarHistorial =
        document.getElementById(
            "cerrarHistorial"
        );

    if (cerrarHistorial) {

        cerrarHistorial.addEventListener(
            "click",
            cerrarModalHistorial
        );

    }


    const cerrarHistorialInferior =
        document.getElementById(
            "cerrarHistorialInferior"
        );

    if (cerrarHistorialInferior) {

        cerrarHistorialInferior.addEventListener(
            "click",
            cerrarModalHistorial
        );

    }


    const imprimir =
        document.getElementById(
            "imprimirHistorial"
        );

    if (imprimir) {

        imprimir.addEventListener(
            "click",
            imprimirHistorial
        );

    }


    const verComprobantes =
        document.getElementById(
            "verComprobantes"
        );

    if (verComprobantes) {

        verComprobantes.addEventListener(
            "click",
            function () {

                window.location.href =
                    "comprobantes.html";

            }
        );

    }


    const irComprobantes =
        document.getElementById(
            "irComprobantesButton"
        );

    if (irComprobantes) {

        irComprobantes.addEventListener(
            "click",
            function () {

                window.location.href =
                    "comprobantes.html";

            }
        );

    }


    const modalPago =
        document.getElementById(
            "modalPago"
        );

    if (modalPago) {

        modalPago.addEventListener(
            "click",
            function (event) {

                if (
                    event.target ===
                    modalPago
                ) {

                    cerrarModalPago();

                }

            }
        );

    }


    const modalHistorial =
        document.getElementById(
            "modalHistorial"
        );

    if (modalHistorial) {

        modalHistorial.addEventListener(
            "click",
            function (event) {

                if (
                    event.target ===
                    modalHistorial
                ) {

                    cerrarModalHistorial();

                }

            }
        );

    }


    const logout =
        document.getElementById(
            "logoutButton"
        );

    if (logout) {

        logout.addEventListener(
            "click",
            cerrarSesion
        );

    }

}


// ============================================================
// CARGAR SOCIOS
// ============================================================

async function cargarSocios() {

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

        return;
    }

    socios =
        resultado.data || [];

}


// ============================================================
// CARGAR PERIODOS
// ============================================================

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


    const select =
        document.getElementById(
            "periodoSelect"
        );

    if (!select) {
        return;
    }

    select.innerHTML =
        '<option value="">Todos los períodos</option>';


    periodos.forEach(
        function (periodo) {

            const option =
                document.createElement(
                    "option"
                );

            option.value =
                periodo.id;

            option.textContent =
                periodo.anio +
                " — " +
                capitalizar(
                    periodo.estado
                );

            select.appendChild(
                option
            );

        }
    );

}


// ============================================================
// CARGAR CUENTAS
// ============================================================

async function cargarCuentas() {

    const resultado =
        await supabaseClient
            .from("cuentas")
            .select(
                "id, nombre, tipo, banco, numero_cuenta, activo"
            )
            .eq(
                "activo",
                true
            )
            .order(
                "nombre",
                {
                    ascending: true
                }
            );

    if (resultado.error) {

        console.error(
            "Error al cargar cuentas:",
            resultado.error
        );

        alert(
            "No fue posible cargar las cuentas financieras."
        );

        return;
    }

    cuentas =
        resultado.data || [];


    const select =
        document.getElementById(
            "cuentaPago"
        );

    if (!select) {
        return;
    }

    select.innerHTML =
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
                construirNombreCuenta(
                    cuenta
                );

            select.appendChild(
                option
            );

        }
    );

}


// ============================================================
// NOMBRE CUENTA
// ============================================================

function construirNombreCuenta(
    cuenta
) {

    let texto =
        cuenta.nombre;

    if (
        cuenta.tipo ===
        "bancaria"
    ) {

        if (cuenta.banco) {

            texto +=
                " — " +
                cuenta.banco;

        }

        if (cuenta.numero_cuenta) {

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


// ============================================================
// CARGAR CUOTAS
// ============================================================

async function cargarCuotas() {

    const tabla =
        document.getElementById(
            "tablaPagos"
        );

    if (tabla) {

        tabla.innerHTML =
            '<tr>' +
            '<td colspan="8" class="tabla-cargando">' +
            'Cargando cuotas...' +
            '</td>' +
            '</tr>';

    }


    const resultado =
        await supabaseClient
            .from("cuotas")
            .select(
                "id, socio_id, periodo_id, monto, estado, fecha_emision"
            )
            .order(
                "fecha_emision",
                {
                    ascending: false
                }
            );


    if (resultado.error) {

        console.error(
            "Error al cargar cuotas:",
            resultado.error
        );

        if (tabla) {

            tabla.innerHTML =
                '<tr>' +
                '<td colspan="8" class="tabla-cargando">' +
                'No fue posible cargar las cuotas.' +
                '</td>' +
                '</tr>';

        }

        return;
    }


    cuotas =
        resultado.data || [];


    await cargarTotalesPagos();

    aplicarFiltros();

}


// ============================================================
// CARGAR TOTALES DE PAGOS
// ============================================================

async function cargarTotalesPagos() {

    if (
        cuotas.length === 0
    ) {
        return;
    }


    const ids =
        cuotas.map(
            function (cuota) {

                return cuota.id;

            }
        );


    const resultado =
        await supabaseClient
            .from("pagos_cuotas")
            .select(
                "id, cuota_id, monto, estado"
            )
            .in(
                "cuota_id",
                ids
            );


    if (resultado.error) {

        console.error(
            "Error al cargar pagos:",
            resultado.error
        );

        cuotas.forEach(
            function (cuota) {

                cuota.total_pagado =
                    0;

            }
        );

        return;
    }


    const pagos =
        resultado.data || [];


    comprobantesPorPago = {};

    const pagosIds =
        pagos.map(
            function (pago) {
                return pago.id;
            }
        );

    if (pagosIds.length > 0) {

        const resultadoComprobantes =
            await supabaseClient
                .from("comprobantes_cuota")
                .select(
                    "id, pago_id, numero, estado, fecha_emision"
                )
                .in(
                    "pago_id",
                    pagosIds
                )
                .order(
                    "fecha_emision",
                    {
                        ascending: false
                    }
                );

        if (!resultadoComprobantes.error) {

            (resultadoComprobantes.data || [])
                .forEach(
                    function (comprobante) {

                        if (
                            !comprobantesPorPago[
                                comprobante.pago_id
                            ]
                        ) {

                            comprobantesPorPago[
                                comprobante.pago_id
                            ] = comprobante;

                        }

                    }
                );

        }

    }


    cuotas.forEach(
        function (cuota) {

            const pagosCuota =
                pagos.filter(
                    function (pago) {

                        return (
                            Number(
                                pago.cuota_id
                            ) ===
                            Number(
                                cuota.id
                            ) &&
                            pago.estado ===
                            "activo"
                        );

                    }
                );


            cuota.total_pagado =
                pagosCuota.reduce(
                    function (
                        total,
                        pago
                    ) {

                        return (
                            total +
                            Number(
                                pago.monto ||
                                0
                            )
                        );

                    },
                    0
                );

        }
    );

}


// ============================================================
// APLICAR FILTROS
// ============================================================

function aplicarFiltros() {

    const buscar =
        document.getElementById(
            "buscarSocio"
        );

    const estado =
        document.getElementById(
            "filtroEstado"
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


    const estadoSeleccionado =
        estado
            ? estado.value
            : "todos";


    const periodoSeleccionado =
        periodo
            ? periodo.value
            : "";


    const lista =
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


                const monto =
                    Number(
                        cuota.monto ||
                        0
                    );


                const pagado =
                    Number(
                        cuota.total_pagado ||
                        0
                    );


                const estadoCalculado =
                    determinarEstado(
                        monto,
                        pagado,
                        cuota.estado
                    );


                const coincideBusqueda =
                    texto === "" ||
                    nombre.includes(
                        texto
                    ) ||
                    rut.includes(
                        texto
                    );


                const coincideEstado =
                    estadoSeleccionado ===
                        "todos" ||
                    estadoCalculado ===
                        estadoSeleccionado;


                const coincidePeriodo =
                    periodoSeleccionado ===
                        "" ||
                    String(
                        cuota.periodo_id
                    ) ===
                    String(
                        periodoSeleccionado
                    );


                return (
                    coincideBusqueda &&
                    coincideEstado &&
                    coincidePeriodo
                );

            }
        );


    renderizarCuotas(
        lista
    );


    actualizarContador(
        lista.length
    );


    actualizarResumen();

}


// ============================================================
// DETERMINAR ESTADO
// ============================================================

function determinarEstado(
    monto,
    pagado,
    estadoOriginal
) {

    if (
        estadoOriginal ===
        "anulada"
    ) {

        return "anulada";

    }


    if (
        pagado <= 0
    ) {

        return "pendiente";

    }


    if (
        pagado < monto
    ) {

        return "parcial";

    }


    return "pagada";

}


// ============================================================
// RENDERIZAR CUOTAS
// ============================================================

function renderizarCuotas(
    lista
) {

    const tabla =
        document.getElementById(
            "tablaPagos"
        );

    if (!tabla) {
        return;
    }


    tabla.innerHTML =
        "";


    if (
        lista.length === 0
    ) {

        tabla.innerHTML =
            '<tr>' +
            '<td colspan="8" class="tabla-cargando">' +
            'No se encontraron cuotas.' +
            '</td>' +
            '</tr>';

        return;
    }


    lista.forEach(
        function (cuota) {

            const socio =
                obtenerSocio(
                    cuota.socio_id
                );


            const periodo =
                obtenerPeriodo(
                    cuota.periodo_id
                );


            const monto =
                Number(
                    cuota.monto ||
                    0
                );


            const pagado =
                Number(
                    cuota.total_pagado ||
                    0
                );


            const saldo =
                Math.max(
                    monto -
                    pagado,
                    0
                );


            const estado =
                determinarEstado(
                    monto,
                    pagado,
                    cuota.estado
                );


            const fila =
                document.createElement(
                    "tr"
                );


            fila.innerHTML =
                '<td><strong>' +
                escaparHTML(
                    socio
                        ? construirNombreCompleto(
                            socio
                        )
                        : "Socio no encontrado"
                ) +
                '</strong></td>' +

                '<td>' +
                escaparHTML(
                    periodo
                        ? String(
                            periodo.anio
                        )
                        : "—"
                ) +
                '</td>' +

                '<td><strong>' +
                formatearMoneda(
                    monto
                ) +
                '</strong></td>' +

                '<td>' +
                formatearMoneda(
                    pagado
                ) +
                '</td>' +

                '<td><strong>' +
                formatearMoneda(
                    saldo
                ) +
                '</strong></td>' +

                '<td>' +
                '<span class="' +
                obtenerClaseEstado(
                    estado
                ) +
                '">' +
                traducirEstado(
                    estado
                ) +
                '</span>' +
                '</td>' +

                '<td>' +

                (
                    saldo > 0
                        ? '<button type="button" ' +
                          'class="boton-tabla" ' +
                          'data-accion="pagar" ' +
                          'data-id="' +
                          cuota.id +
                          '">' +
                          'Registrar pago' +
                          '</button>'
                        : ''
                ) +

                ' <button type="button" ' +
                'class="boton-tabla" ' +
                'data-accion="historial" ' +
                'data-id="' +
                cuota.id +
                '">' +
                'Ver pagos' +
                '</button>' +

                '</td>' +

                '<td>' +
                '<span class="texto-secundario">Ver pagos</span>' +
                '</td>';


            tabla.appendChild(
                fila
            );

        }
    );


    tabla
        .querySelectorAll(
            '[data-accion="pagar"]'
        )
        .forEach(
            function (boton) {

                boton.addEventListener(
                    "click",
                    function () {

                        abrirModalPago(
                            Number(
                                boton.dataset.id
                            )
                        );

                    }
                );

            }
        );


    tabla
        .querySelectorAll(
            '[data-accion="historial"]'
        )
        .forEach(
            function (boton) {

                boton.addEventListener(
                    "click",
                    function () {

                        abrirHistorial(
                            Number(
                                boton.dataset.id
                            )
                        );

                    }
                );

            }
        );

    tabla
        .querySelectorAll(
            '[data-accion="comprobante"]'
        )
        .forEach(
            function (boton) {

                boton.addEventListener(
                    "click",
                    function () {

                        abrirComprobante(
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
// ABRIR MODAL PAGO
// ============================================================

function abrirModalPago(
    id
) {

    const cuota =
        cuotas.find(
            function (elemento) {

                return Number(
                    elemento.id
                ) ===
                Number(id);

            }
        );


    if (!cuota) {

        alert(
            "No fue posible encontrar la cuota."
        );

        return;
    }


    const socio =
        obtenerSocio(
            cuota.socio_id
        );


    const periodo =
        obtenerPeriodo(
            cuota.periodo_id
        );


    const monto =
        Number(
            cuota.monto ||
            0
        );


    const pagado =
        Number(
            cuota.total_pagado ||
            0
        );


    const saldo =
        Math.max(
            monto -
            pagado,
            0
        );


    if (
        saldo <= 0
    ) {

        alert(
            "Esta cuota ya se encuentra completamente pagada."
        );

        return;
    }


    document.getElementById(
        "pagoCuotaId"
    ).value =
        cuota.id;


    document.getElementById(
        "pagoSocio"
    ).textContent =
        socio
            ? construirNombreCompleto(
                socio
            )
            : "—";


    document.getElementById(
        "pagoPeriodo"
    ).textContent =
        periodo
            ? periodo.anio
            : "—";


    document.getElementById(
        "pagoMontoCuota"
    ).textContent =
        formatearMoneda(
            monto
        );


    document.getElementById(
        "pagoPagado"
    ).textContent =
        formatearMoneda(
            pagado
        );


    document.getElementById(
        "pagoSaldo"
    ).textContent =
        formatearMoneda(
            saldo
        );


    document.getElementById(
        "pagoMonto"
    ).value =
        "";


    document.getElementById(
        "pagoMonto"
    ).max =
        saldo;


    document.getElementById(
        "medioPago"
    ).value =
        "";


    document.getElementById(
        "cuentaPago"
    ).value =
        "";


    document.getElementById(
        "fechaPago"
    ).value =
        obtenerFechaActual();


    document.getElementById(
        "numeroComprobante"
    ).value =
        "";


    document.getElementById(
        "bancoOrigen"
    ).value =
        "";


    document.getElementById(
        "observacionPago"
    ).value =
        "";


    document.getElementById(
        "modalPago"
    ).style.display =
        "flex";


    document.getElementById(
        "pagoMonto"
    ).focus();

}


// ============================================================
// GUARDAR PAGO
// ============================================================

async function guardarPago(
    event
) {

    event.preventDefault();


    const cuotaId =
        Number(
            document.getElementById(
                "pagoCuotaId"
            ).value
        );


    const monto =
        Number(
            document.getElementById(
                "pagoMonto"
            ).value
        );


    const cuentaId =
        Number(
            document.getElementById(
                "cuentaPago"
            ).value
        );


    const medioPago =
        document.getElementById(
            "medioPago"
        ).value;


    const fechaPago =
        document.getElementById(
            "fechaPago"
        ).value;


    const comprobante =
        document.getElementById(
            "numeroComprobante"
        ).value.trim();


    const bancoOrigen =
        document.getElementById(
            "bancoOrigen"
        ).value.trim();


    const observacion =
        document.getElementById(
            "observacionPago"
        ).value.trim();


    if (!cuotaId) {

        alert(
            "No se ha seleccionado una cuota."
        );

        return;
    }


    if (
        !monto ||
        monto <= 0
    ) {

        alert(
            "Debe ingresar un monto válido."
        );

        return;
    }


    const cuota =
        cuotas.find(
            function (elemento) {

                return Number(
                    elemento.id
                ) === cuotaId;

            }
        );


    if (!cuota) {

        alert(
            "No fue posible encontrar la cuota."
        );

        return;
    }


    const saldo =
        Math.max(
            Number(
                cuota.monto ||
                0
            ) -
            Number(
                cuota.total_pagado ||
                0
            ),
            0
        );


    if (
        monto > saldo
    ) {

        alert(
            "El monto ingresado supera el saldo pendiente de la cuota.\n\n" +
            "Saldo pendiente: " +
            formatearMoneda(
                saldo
            )
        );

        return;
    }


    if (!medioPago) {

        alert(
            "Debe seleccionar el medio de pago."
        );

        return;
    }


    if (!cuentaId) {

        alert(
            "Debe seleccionar la cuenta de destino."
        );

        return;
    }


    if (!fechaPago) {

        alert(
            "Debe indicar la fecha del pago."
        );

        return;
    }


    const boton =
        document.getElementById(
            "guardarPago"
        );


    if (boton) {

        boton.disabled =
            true;

        boton.textContent =
            "Registrando...";

    }


    try {

        const resultado =
            await supabaseClient
                .from("pagos_cuotas")
                .insert(
                    {
                        cuota_id:
                            cuotaId,

                        cuenta_id:
                            cuentaId,

                        monto:
                            monto,

                        medio_pago:
                            medioPago,

                        fecha_pago:
                            fechaPago,

                        numero_comprobante:
                            comprobante ||
                            null,

                        banco_origen:
                            bancoOrigen ||
                            null,

                        observacion:
                            observacion ||
                            null,

                        created_by:
                            usuarioActual.id
                    }
                );


        if (resultado.error) {

            console.error(
                "Error al registrar pago:",
                resultado.error
            );

            alert(
                obtenerMensajeError(
                    resultado.error
                )
            );

            return;
        }


        const pagoRegistrado =
            resultado.data &&
            resultado.data[0]
                ? resultado.data[0]
                : null;


        if (pagoRegistrado) {

            const resultadoComprobante =
                await supabaseClient.rpc(
                    "emitir_comprobante_cuota",
                    {
                        p_pago_id:
                            pagoRegistrado.id
                    }
                );

            if (resultadoComprobante.error) {

                console.error(
                    "Pago registrado, pero no fue posible emitir el comprobante:",
                    resultadoComprobante.error
                );

                alert(
                    "El pago fue registrado correctamente, pero no fue posible emitir el comprobante en este momento.\n\n" +
                    "Puede emitirlo posteriormente desde el historial de pagos."
                );

                cerrarModalPago();

                await cargarCuotas();

                return;

            }


            const comprobante =
                obtenerResultadoComprobante(
                    resultadoComprobante.data
                );


            cerrarModalPago();

            await cargarCuotas();


            if (
                comprobante &&
                comprobante.id
            ) {

                window.location.href =
                    "comprobante.html?id=" +
                    encodeURIComponent(
                        comprobante.id
                    );

                return;

            }


            alert(
                "Pago y comprobante registrados correctamente."
            );

            return;

        }


        alert(
            "Pago registrado correctamente."
        );


        cerrarModalPago();


        await cargarCuotas();

    }
    catch (error) {

        console.error(
            "Error inesperado:",
            error
        );

        alert(
            "Ocurrió un error inesperado al registrar el pago."
        );

    }
    finally {

        if (boton) {

            boton.disabled =
                false;

            boton.textContent =
                "Registrar pago";

        }

    }

}


// ============================================================
// HISTORIAL DE PAGOS
// ============================================================

async function abrirHistorial(
    cuotaId
) {

    const cuota =
        cuotas.find(
            function (elemento) {

                return Number(
                    elemento.id
                ) ===
                Number(cuotaId);

            }
        );


    if (!cuota) {
        return;
    }


    cuotaHistorialActual =
        cuotaId;


    const contenido =
        document.getElementById(
            "historialContenido"
        );


    const acciones =
        document.getElementById(
            "accionesHistorial"
        );


    const socio =
        obtenerSocio(
            cuota.socio_id
        );


    const periodo =
        obtenerPeriodo(
            cuota.periodo_id
        );


    const montoCuota =
        Number(
            cuota.monto ||
            0
        );


    const totalPagado =
        Number(
            cuota.total_pagado ||
            0
        );


    const saldo =
        Math.max(
            montoCuota -
            totalPagado,
            0
        );


    contenido.innerHTML =
        "<div>" +

        "<p><strong>Socio:</strong> " +
        escaparHTML(
            socio
                ? construirNombreCompleto(
                    socio
                )
                : "—"
        ) +
        "</p>" +

        "<p><strong>Período:</strong> " +
        escaparHTML(
            periodo
                ? String(
                    periodo.anio
                )
                : "—"
        ) +
        "</p>" +

        "<p><strong>Monto de la cuota:</strong> " +
        formatearMoneda(
            montoCuota
        ) +
        "</p>" +

        "<p><strong>Total pagado:</strong> " +
        formatearMoneda(
            totalPagado
        ) +
        "</p>" +

        "<p><strong>Saldo pendiente:</strong> " +
        formatearMoneda(
            saldo
        ) +
        "</p>" +

        "<p>Cargando pagos...</p>" +

        "</div>";


    if (acciones) {

        acciones.style.display =
            "none";

    }


    document.getElementById(
        "modalHistorial"
    ).style.display =
        "flex";


    const resultado =
        await supabaseClient
            .from("pagos_cuotas")
            .select(
                "id, monto, medio_pago, fecha_pago, numero_comprobante, banco_origen, observacion, estado, created_at, fecha_anulacion, motivo_anulacion"
            )
            .eq(
                "cuota_id",
                cuotaId
            )
            .order(
                "fecha_pago",
                {
                    ascending: false
                }
            );


    if (resultado.error) {

        console.error(
            "Error al cargar historial:",
            resultado.error
        );

        contenido.innerHTML =
            "<p>No fue posible cargar el historial.</p>";

        return;
    }


    const pagos =
        resultado.data || [];


    // ========================================================
    // CARGAR COMPROBANTES DEL HISTORIAL DIRECTAMENTE
    // ========================================================
    // Se consulta nuevamente por los IDs de pago que pertenecen
    // a esta cuota. Esto evita depender de un mapa cargado
    // anteriormente y garantiza que los comprobantes ya emitidos
    // aparezcan inmediatamente en este historial.
    if (pagos.length > 0) {

        const idsPagosHistorial =
            pagos.map(
                function (pago) {
                    return pago.id;
                }
            );

        const resultadoComprobantesHistorial =
            await supabaseClient
                .from("comprobantes_cuota")
                .select(
                    "id, pago_id, numero, estado, fecha_emision"
                )
                .in(
                    "pago_id",
                    idsPagosHistorial
                )
                .order(
                    "fecha_emision",
                    {
                        ascending: false
                    }
                );

        if (resultadoComprobantesHistorial.error) {

            console.error(
                "Error al cargar comprobantes del historial:",
                resultadoComprobantesHistorial.error
            );

        } else {

            (resultadoComprobantesHistorial.data || [])
                .forEach(
                    function (comprobante) {

                        comprobantesPorPago[
                            comprobante.pago_id
                        ] = comprobante;

                    }
                );

        }

    }


    let html =

        "<div class='historial-resumen'>" +

        "<p><strong>Socio:</strong> " +
        escaparHTML(
            socio
                ? construirNombreCompleto(
                    socio
                )
                : "—"
        ) +
        "</p>" +

        "<p><strong>Período:</strong> " +
        escaparHTML(
            periodo
                ? String(
                    periodo.anio
                )
                : "—"
        ) +
        "</p>" +

        "<p><strong>Monto de la cuota:</strong> " +
        formatearMoneda(
            montoCuota
        ) +
        "</p>" +

        "<p><strong>Total pagado:</strong> " +
        formatearMoneda(
            totalPagado
        ) +
        "</p>" +

        "<p><strong>Saldo pendiente:</strong> " +
        formatearMoneda(
            saldo
        ) +
        "</p>" +

        "</div>";


    if (
        pagos.length === 0
    ) {

        html +=
            "<p>No existen pagos registrados para esta cuota.</p>";

        contenido.innerHTML =
            html;

        return;
    }


    html +=

        "<table class='tabla-socios'>" +

        "<thead>" +

        "<tr>" +

        "<th>Fecha</th>" +

        "<th>Monto</th>" +

        "<th>Medio</th>" +

        "<th>N.º transferencia</th>\n\n                <th>Comprobante</th>" +

        "<th>Banco</th>" +

        "<th>Estado</th>" +

        "<th>Acción</th>" +

        "</tr>" +

        "</thead>" +

        "<tbody>";


    pagos.forEach(
        function (pago) {

            html +=

                "<tr>" +

                "<td>" +
                formatearFecha(
                    pago.fecha_pago
                ) +
                "</td>" +

                "<td><strong>" +
                formatearMoneda(
                    pago.monto
                ) +
                "</strong></td>" +

                "<td>" +
                traducirMedioPago(
                    pago.medio_pago
                ) +
                "</td>" +

                "<td>" +
                escaparHTML(
                    pago.numero_comprobante ||
                    "—"
                ) +
                "</td>" +

                "<td>" +
                construirCeldaComprobante(
                    pago
                ) +
                "</td>" +

                "<td>" +
                escaparHTML(
                    pago.banco_origen ||
                    "—"
                ) +
                "</td>" +

                "<td>" +
                traducirEstadoPago(
                    pago.estado
                ) +
                "</td>" +

                "<td>" +

                (
                    pago.estado ===
                    "activo"

                        ? "<button type='button' " +
                          "class='boton-tabla boton-anular-pago' " +
                          "data-id='" +
                          pago.id +
                          "'>" +
                          "Anular" +
                          "</button>"

                        : "—"
                ) +

                "</td>" +

                "</tr>";

        }
    );


    html +=
        "</tbody></table>";


    contenido.innerHTML =
        html;


    if (acciones) {

        acciones.style.display =
            "flex";

    }


    contenido
        .querySelectorAll(
            ".boton-anular-pago"
        )
        .forEach(
            function (boton) {

                boton.addEventListener(
                    "click",
                    function () {

                        anularPago(
                            Number(
                                boton.dataset.id
                            ),
                            cuotaId
                        );

                    }
                );

            }
        );


    contenido
        .querySelectorAll(
            ".boton-comprobante-pago"
        )
        .forEach(
            function (boton) {

                boton.addEventListener(
                    "click",
                    function () {

                        abrirComprobante(
                            Number(
                                boton.dataset.id
                            )
                        );

                    }
                );

            }
        );


    contenido
        .querySelectorAll(
            ".boton-emitir-comprobante"
        )
        .forEach(
            function (boton) {

                boton.addEventListener(
                    "click",
                    async function () {

                        await emitirComprobante(
                            Number(
                                boton.dataset.id
                            ),
                            cuotaId
                        );

                    }
                );

            }
        );

}

// ============================================================

// ============================================================
// COMPROBANTES DE CUOTA
// ============================================================

function obtenerResultadoComprobante(data) {

    if (!data) {
        return null;
    }

    if (Array.isArray(data)) {
        return data[0] || null;
    }

    if (data.id) {
        return data;
    }

    if (data.comprobante) {

        return Array.isArray(data.comprobante)
            ? data.comprobante[0] || null
            : data.comprobante;

    }

    return null;

}


function construirCeldaComprobante(pago) {

    const comprobante =
        comprobantesPorPago[pago.id];

    if (comprobante) {

        return (
            "<button type='button' " +
            "class='boton-tabla boton-comprobante-pago' " +
            "data-id='" +
            pago.id +
            "'>" +
            escaparHTML(
                comprobante.numero ||
                "Ver comprobante"
            ) +
            "</button>"
        );

    }

    if (pago.estado === "activo") {

        return (
            "<button type='button' " +
            "class='boton-tabla boton-emitir-comprobante' " +
            "data-id='" +
            pago.id +
            "'>" +
            "Emitir" +
            "</button>"
        );

    }

    return "—";

}


async function emitirComprobante(
    pagoId,
    cuotaId
) {

    const confirmar =
        confirm(
            "¿Desea emitir el comprobante interno para este pago?"
        );

    if (!confirmar) {
        return;
    }


    const resultado =
        await supabaseClient.rpc(
            "emitir_comprobante_cuota",
            {
                p_pago_id:
                    pagoId
            }
        );


    if (resultado.error) {

        console.error(
            "Error al emitir comprobante:",
            resultado.error
        );

        alert(
            obtenerMensajeError(
                resultado.error
            )
        );

        return;

    }


    const comprobante =
        obtenerResultadoComprobante(
            resultado.data
        );


    if (
        !comprobante ||
        !comprobante.id
    ) {

        alert(
            "El comprobante fue procesado, pero no fue posible obtener su identificador."
        );

        return;

    }


    await cargarCuotas();

    abrirComprobante(
        pagoId
    );

}


function abrirComprobante(pagoId) {

    const comprobante =
        comprobantesPorPago[pagoId];

    if (
        comprobante &&
        comprobante.id
    ) {

        window.location.href =
            "comprobante.html?id=" +
            encodeURIComponent(
                comprobante.id
            );

        return;

    }


    alert(
        "Este pago todavía no tiene un comprobante emitido."
    );

}


// IMPRIMIR HISTORIAL
// ============================================================

function imprimirHistorial() {

    const contenido =
        document.getElementById(
            "historialContenido"
        );


    if (!contenido) {

        return;

    }


    const texto =
        contenido.textContent ||
        "";


    if (
        texto.includes(
            "Cargando pagos"
        )
    ) {

        alert(
            "Espere mientras se carga el historial."
        );

        return;
    }


    if (
        texto.includes(
            "No existen pagos registrados"
        )
    ) {

        alert(
            "No existen pagos registrados para imprimir."
        );

        return;
    }


    const ventana =
        window.open(
            "",
            "_blank",
            "width=1000,height=800"
        );


    if (!ventana) {

        alert(
            "El navegador bloqueó la ventana de impresión. Permita ventanas emergentes para este sitio."
        );

        return;
    }


    // ========================================================
    // OBTENER INFORMACIÓN DEL SOCIO Y PERÍODO
    // ========================================================

    const cuotaSeleccionada =
        cuotas.find(
            function (cuota) {

                return (
                    contenido.textContent
                        .includes(
                            construirNombreCompleto(
                                obtenerSocio(
                                    cuota.socio_id
                                ) || {}
                            )
                        )
                );

            }
        );


    let nombreSocio =
        "Socio";


    let rutSocio =
        "";


    let periodoSocio =
        "";


    if (cuotaSeleccionada) {

        const socio =
            obtenerSocio(
                cuotaSeleccionada.socio_id
            );


        const periodo =
            obtenerPeriodo(
                cuotaSeleccionada.periodo_id
            );


        if (socio) {

            nombreSocio =
                construirNombreCompleto(
                    socio
                );


            rutSocio =
                socio.rut
                    ? String(
                        socio.rut
                    )
                    : "";

        }


        if (periodo) {

            periodoSocio =
                String(
                    periodo.anio
                );

        }

    }


    // ========================================================
    // CONTENIDO A IMPRIMIR
    // ========================================================

    const contenidoImpresion =
        contenido.innerHTML
            .replace(
                /<button[\s\S]*?<\/button>/gi,
                ""
            );


    // ========================================================
    // FECHA DE EMISIÓN
    // ========================================================

    const fechaEmision =
        formatearFecha(
            obtenerFechaActual()
        );


    // ========================================================
    // DOCUMENTO DE IMPRESIÓN
    // ========================================================

    ventana.document.open();


    ventana.document.write(
        "<!DOCTYPE html>" +

        "<html lang='es'>" +

        "<head>" +

        "<meta charset='UTF-8'>" +

        "<title>Historial de pagos - " +
        escaparHTML(
            nombreSocio
        ) +
        "</title>" +


        "<style>" +

        "* {" +
        "box-sizing: border-box;" +
        "}" +


        "body {" +
        "font-family: Arial, Helvetica, sans-serif;" +
        "margin: 40px;" +
        "color: #222;" +
        "font-size: 13px;" +
        "}" +


        ".encabezado {" +
        "border-bottom: 2px solid #222;" +
        "padding-bottom: 15px;" +
        "margin-bottom: 25px;" +
        "}" +


        ".encabezado h1 {" +
        "margin: 0 0 5px 0;" +
        "font-size: 22px;" +
        "}" +


        ".encabezado p {" +
        "margin: 3px 0;" +
        "}" +


        ".titulo {" +
        "margin-bottom: 20px;" +
        "}" +


        ".titulo h2 {" +
        "margin: 0;" +
        "font-size: 18px;" +
        "}" +


        ".titulo p {" +
        "margin: 5px 0 0 0;" +
        "color: #555;" +
        "}" +


        ".historial-resumen {" +
        "border: 1px solid #ccc;" +
        "padding: 15px;" +
        "margin-bottom: 20px;" +
        "}" +


        ".historial-resumen p {" +
        "margin: 6px 0;" +
        "}" +


        "table {" +
        "width: 100%;" +
        "border-collapse: collapse;" +
        "margin-top: 20px;" +
        "}" +


        "th, td {" +
        "border: 1px solid #bbb;" +
        "padding: 8px;" +
        "text-align: left;" +
        "}" +


        "th {" +
        "background: #f0f0f0;" +
        "font-weight: bold;" +
        "}" +


        "td:nth-child(2) {" +
        "text-align: right;" +
        "}" +


        // ====================================================
        // ZONA INFERIOR DEL DOCUMENTO
        // ====================================================

        ".zona-firma {" +
        "margin-top: 55px;" +
        "min-height: 150px;" +
        "display: flex;" +
        "justify-content: space-between;" +
        "align-items: flex-end;" +
        "}" +


        ".informacion-emision {" +
        "font-size: 11px;" +
        "color: #555;" +
        "max-width: 55%;" +
        "}" +


        ".informacion-emision p {" +
        "margin: 4px 0;" +
        "}" +


        // ====================================================
        // TIMBRE CIRCULAR
        // ====================================================

        ".timbre {" +
        "width: 125px;" +
        "height: 125px;" +
        "object-fit: contain;" +
        "}" +

















        ".pie {" +
        "margin-top: 35px;" +
        "padding-top: 10px;" +
        "border-top: 1px solid #ccc;" +
        "font-size: 11px;" +
        "color: #555;" +
        "}" +


        "@media print {" +

        "body {" +
        "margin: 20mm;" +
        "}" +

        "table {" +
        "page-break-inside: auto;" +
        "}" +

        "tr {" +
        "page-break-inside: avoid;" +
        "page-break-after: auto;" +
        "}" +

        ".zona-firma {" +
        "page-break-inside: avoid;" +
        "}" +

        ".timbre {" +
        "-webkit-print-color-adjust: exact;" +
        "print-color-adjust: exact;" +
        "}" +

        "}" +


        "</style>" +

        "</head>" +


        "<body>" +


        // ====================================================
        // ENCABEZADO
        // ====================================================

        "<div class='encabezado'>" +

        "<h1>COMUNIDAD INDÍGENA JUAN CHEUQUELÉN</h1>" +

        "<p>RUT: 65.169.427-2 &nbsp;|&nbsp; Personería Jurídica N.º 2314 &nbsp;|&nbsp; Fundada 27 de julio de 2017</p>" +

        "</div>" +


        // ====================================================
        // TÍTULO
        // ====================================================

        "<div class='titulo'>" +

        "<h2>Historial de pagos de cuota</h2>" +

        "<p>Documento generado desde el Sistema Financiero</p>" +

        "</div>" +


        // ====================================================
        // CONTENIDO
        // ====================================================

        contenidoImpresion +


        // ====================================================
        // FIRMA / TIMBRE
        // ====================================================

        "<div class='zona-firma'>" +


        "<div class='informacion-emision'>" +

        "<p><strong>Documento emitido por:</strong> Tesorería</p>" +

        "<p><strong>Socio:</strong> " +
        escaparHTML(
            nombreSocio
        ) +
        "</p>" +

        (
            rutSocio
                ? "<p><strong>RUT:</strong> " +
                  escaparHTML(
                      rutSocio
                  ) +
                  "</p>"
                : ""
        ) +

        (
            periodoSocio
                ? "<p><strong>Período:</strong> " +
                  escaparHTML(
                      periodoSocio
                  ) +
                  "</p>"
                : ""
        ) +

        "</div>" +


        // ====================================================
        // TIMBRE
        // ====================================================

        "<img class='timbre' src='assets/timbre-comunidad.jpeg' alt='Timbre oficial de la Comunidad Indígena Juan Cheuquelén'>" +


        "</div>" +


        // ====================================================
        // PIE
        // ====================================================

        "<div class='pie'>" +

        "Documento generado el " +

        escaparHTML(
            fechaEmision
        ) +

        " desde el Sistema Financiero." +

        "</div>" +


        "</body>" +

        "</html>"
    );


    ventana.document.close();


    ventana.focus();


    setTimeout(
        function () {

            ventana.print();

        },
        300
    );

}


// ============================================================
// ANULAR PAGO
// ============================================================

async function anularPago(
    pagoId,
    cuotaId
) {

    const motivo =
        prompt(
            "Indique el motivo de la anulación:"
        );


    if (
        !motivo ||
        !motivo.trim()
    ) {

        return;

    }


    const confirmar =
        confirm(
            "¿Está seguro de anular este pago?"
        );


    if (!confirmar) {

        return;

    }


    const resultado =
        await supabaseClient
            .from("pagos_cuotas")
            .update(
                {
                    estado:
                        "anulado",

                    fecha_anulacion:
                        new Date()
                            .toISOString(),

                    anulado_por:
                        usuarioActual.id,

                    motivo_anulacion:
                        motivo.trim()
                }
            )
            .eq(
                "id",
                pagoId
            );


    if (resultado.error) {

        console.error(
            "Error al anular pago:",
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
        "Pago anulado correctamente."
    );


    cerrarModalHistorial();


    await cargarCuotas();

}


// ============================================================
// RESUMEN
// ============================================================

function actualizarResumen() {

    let pendientes = 0;

    let parciales = 0;

    let pagadas = 0;

    let recaudado = 0;


    cuotas.forEach(
        function (cuota) {

            const monto =
                Number(
                    cuota.monto ||
                    0
                );


            const pagado =
                Number(
                    cuota.total_pagado ||
                    0
                );


            const estado =
                determinarEstado(
                    monto,
                    pagado,
                    cuota.estado
                );


            if (
                estado ===
                "pendiente"
            ) {

                pendientes++;

            }

            else if (
                estado ===
                "parcial"
            ) {

                parciales++;

            }

            else if (
                estado ===
                "pagada"
            ) {

                pagadas++;

            }


            recaudado +=
                pagado;

        }
    );


    const pendiente =
        document.getElementById(
            "totalPendientes"
        );


    const parcial =
        document.getElementById(
            "totalParciales"
        );


    const pagada =
        document.getElementById(
            "totalPagadas"
        );


    const total =
        document.getElementById(
            "totalRecaudado"
        );


    if (pendiente) {

        pendiente.textContent =
            pendientes;

    }


    if (parcial) {

        parcial.textContent =
            parciales;

    }


    if (pagada) {

        pagada.textContent =
            pagadas;

    }


    if (total) {

        total.textContent =
            formatearMoneda(
                recaudado
            );

    }

}


// ============================================================
// CONTADOR
// ============================================================

function actualizarContador(
    cantidad
) {

    const elemento =
        document.getElementById(
            "contadorCuotas"
        );


    if (!elemento) {
        return;
    }


    elemento.textContent =
        cantidad === 1
            ? "1 cuota encontrada"
            : cantidad +
              " cuotas encontradas";

}


// ============================================================
// OBTENER SOCIO
// ============================================================

function obtenerSocio(
    id
) {

    return socios.find(
        function (socio) {

            return Number(
                socio.id
            ) ===
            Number(id);

        }
    );

}


// ============================================================
// OBTENER PERÍODO
// ============================================================

function obtenerPeriodo(
    id
) {

    return periodos.find(
        function (periodo) {

            return Number(
                periodo.id
            ) ===
            Number(id);

        }
    );

}


// ============================================================
// CONSTRUIR NOMBRE
// ============================================================

function construirNombreCompleto(
    socio
) {

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
                    ).trim() !==
                    ""
                );

            }
        )
        .join(" ");

}


// ============================================================
// CERRAR MODAL PAGO
// ============================================================

function cerrarModalPago() {

    const modal =
        document.getElementById(
            "modalPago"
        );


    if (modal) {

        modal.style.display =
            "none";

    }

}


// ============================================================
// CERRAR HISTORIAL
// ============================================================

function cerrarModalHistorial() {

    const modal =
        document.getElementById(
            "modalHistorial"
        );


    if (modal) {

        modal.style.display =
            "none";

    }

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

    return Number(
        valor || 0
    ).toLocaleString(
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


    const partes =
        String(
            fecha
        ).split("-");


    if (
        partes.length !== 3
    ) {

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


// ============================================================
// TRADUCIR MEDIO DE PAGO
// ============================================================

function traducirMedioPago(
    medio
) {

    switch (medio) {

        case "efectivo":
            return "Efectivo";

        case "transferencia":
            return "Transferencia";

        default:
            return medio ||
                "—";

    }

}


// ============================================================
// TRADUCIR ESTADO CUOTA
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
// TRADUCIR ESTADO PAGO
// ============================================================

function traducirEstadoPago(
    estado
) {

    return estado ===
        "activo"

        ? "Activo"

        : "Anulado";

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
        texto
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
// MENSAJES DE ERROR
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
        "23503"
    ) {

        return (
            "No fue posible guardar el pago porque la cuota o la cuenta seleccionada no existe."
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
        "23514"
    ) {

        return (
            "Los datos ingresados no cumplen las reglas establecidas para los pagos."
        );

    }


    return (
        error.message ||
        "No fue posible completar la operación."
    );

}


// ============================================================
// CAPITALIZAR
// ============================================================

function capitalizar(
    texto
) {

    if (!texto) {
        return "";
    }


    return (
        texto.charAt(0).toUpperCase() +
        texto.slice(1)
    );

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
        await supabaseClient
            .auth
            .signOut();


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
