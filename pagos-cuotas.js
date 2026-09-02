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

        await supabaseClient.auth.signOut();

        window.location.href =
            "login.html";

        return;
    }


    perfilUsuario =
        resultadoPerfil.data;


    if (!perfilUsuario) {

        await supabaseClient.auth.signOut();

        window.location.href =
            "login.html";

        return;
    }


    if (perfilUsuario.activo === false) {

        alert(
            "Su usuario se encuentra desactivado."
        );

        await supabaseClient.auth.signOut();

        window.location.href =
            "login.html";

        return;
    }


    // ========================================================
    // CONTROL DE ROL
    // ========================================================

    const rol =
        perfilUsuario.rol;


    if (
        rol !== "administrador" &&
        rol !== "tesorero" &&
        rol !== "consulta"
    ) {

        alert(
            "Su usuario no tiene permisos para acceder a este módulo."
        );

        window.location.href =
            "login.html";

        return;
    }


    // ========================================================
    // USUARIO DE CONSULTA
    // ========================================================

    if (rol === "consulta") {

        window.location.href =
            "reportes.html";

        return;
    }


    // ========================================================
    // MOSTRAR USUARIO
    // ========================================================

    const elementoUsuario =
        document.getElementById(
            "usuarioActual"
        );


    if (elementoUsuario) {

        elementoUsuario.textContent =
            perfilUsuario.nombre ||
            perfilUsuario.email ||
            "Usuario";

    }


    // ========================================================
    // INICIAR CARGA
    // ========================================================

    await cargarDatosIniciales();

    configurarEventos();

    await cargarCuotas();

}


// ============================================================
// CARGAR DATOS INICIALES
// ============================================================

async function cargarDatosIniciales() {

    await Promise.all([
        cargarSocios(),
        cargarPeriodos(),
        cargarCuentas()
    ]);

}


// ============================================================
// CARGAR SOCIOS
// ============================================================

async function cargarSocios() {

    const resultado =
        await supabaseClient
            .from("socios")
            .select(
                `
                id,
                nombres,
                apellido_paterno,
                apellido_materno,
                rut,
                estado
                `
            )
            .order(
                "apellido_paterno",
                {
                    ascending: true
                }
            );


    if (resultado.error) {

        console.error(
            "Error al cargar socios:",
            resultado.error
        );

        socios = [];

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

        periodos = [];

        return;
    }


    periodos =
        resultado.data || [];

}


// ============================================================
// CARGAR CUENTAS
// ============================================================

async function cargarCuentas() {

    const resultado =
        await supabaseClient
            .from("cuentas")
            .select(
                `
                id,
                nombre,
                tipo,
                banco,
                numero_cuenta,
                saldo_inicial,
                activo
                `
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

        cuentas = [];

        return;
    }


    cuentas =
        resultado.data || [];

}


// ============================================================
// CONFIGURAR EVENTOS
// ============================================================

function configurarEventos() {

    const botonCerrarSesion =
        document.getElementById(
            "cerrarSesion"
        );


    if (botonCerrarSesion) {

        botonCerrarSesion.addEventListener(
            "click",
            cerrarSesion
        );

    }


    const botonActualizar =
        document.getElementById(
            "actualizarDatos"
        );


    if (botonActualizar) {

        botonActualizar.addEventListener(
            "click",
            async function () {

                await cargarCuotas();

            }
        );

    }


    const filtroPeriodo =
        document.getElementById(
            "filtroPeriodo"
        );


    if (filtroPeriodo) {

        filtroPeriodo.addEventListener(
            "change",
            cargarCuotas
        );

    }


    const filtroEstado =
        document.getElementById(
            "filtroEstado"
        );


    if (filtroEstado) {

        filtroEstado.addEventListener(
            "change",
            cargarCuotas
        );

    }


    const filtroBusqueda =
        document.getElementById(
            "filtroBusqueda"
        );


    if (filtroBusqueda) {

        filtroBusqueda.addEventListener(
            "input",
            aplicarFiltrosLocales
        );

    }


    const botonNuevaCuota =
        document.getElementById(
            "nuevaCuota"
        );


    if (botonNuevaCuota) {

        botonNuevaCuota.addEventListener(
            "click",
            abrirModalPago
        );

    }


    const botonCerrarModal =
        document.getElementById(
            "cerrarModalPago"
        );


    if (botonCerrarModal) {

        botonCerrarModal.addEventListener(
            "click",
            cerrarModalPago
        );

    }


    const botonCancelarPago =
        document.getElementById(
            "cancelarPago"
        );


    if (botonCancelarPago) {

        botonCancelarPago.addEventListener(
            "click",
            cerrarModalPago
        );

    }


    const formularioPago =
        document.getElementById(
            "formPago"
        );


    if (formularioPago) {

        formularioPago.addEventListener(
            "submit",
            guardarPago
        );

    }


    const medioPago =
        document.getElementById(
            "medioPago"
        );


    if (medioPago) {

        medioPago.addEventListener(
            "change",
            actualizarCamposMedioPago
        );

    }


    const botonCerrarHistorial =
        document.getElementById(
            "cerrarHistorial"
        );


    if (botonCerrarHistorial) {

        botonCerrarHistorial.addEventListener(
            "click",
            cerrarHistorial
        );

    }


    const botonCerrarHistorialInferior =
        document.getElementById(
            "cerrarHistorialInferior"
        );


    if (botonCerrarHistorialInferior) {

        botonCerrarHistorialInferior.addEventListener(
            "click",
            cerrarHistorial
        );

    }


    const botonImprimirHistorial =
        document.getElementById(
            "imprimirHistorial"
        );


    if (botonImprimirHistorial) {

        botonImprimirHistorial.addEventListener(
            "click",
            imprimirHistorial
        );

    }


    const botonVerComprobantes =
        document.getElementById(
            "verComprobantes"
        );


    if (botonVerComprobantes) {

        botonVerComprobantes.addEventListener(
            "click",
            abrirGestionComprobantes
        );

    }


    const botonIrComprobantes =
        document.getElementById(
            "irComprobantesButton"
        );


    if (botonIrComprobantes) {

        botonIrComprobantes.addEventListener(
            "click",
            abrirGestionComprobantes
        );

    }


    window.addEventListener(
        "click",
        function (evento) {

            const modalPago =
                document.getElementById(
                    "modalPago"
                );

            const modalHistorial =
                document.getElementById(
                    "modalHistorial"
                );


            if (
                evento.target ===
                modalPago
            ) {

                cerrarModalPago();

            }


            if (
                evento.target ===
                modalHistorial
            ) {

                cerrarHistorial();

            }

        }
    );

}


// ============================================================
// CERRAR SESIÓN
// ============================================================

async function cerrarSesion() {

    try {

        await supabaseClient.auth.signOut();

    } catch (error) {

        console.error(
            "Error al cerrar sesión:",
            error
        );

    }

    window.location.href =
        "login.html";

}


// ============================================================
// CARGAR CUOTAS
// ============================================================

async function cargarCuotas() {

    mostrarCargandoCuotas();


    const filtroPeriodo =
        document.getElementById(
            "filtroPeriodo"
        );


    const filtroEstado =
        document.getElementById(
            "filtroEstado"
        );


    let consulta =
        supabaseClient
            .from("cuotas")
            .select(
                `
                id,
                socio_id,
                periodo_id,
                categoria_id,
                fecha_emision,
                fecha_vencimiento,
                monto,
                estado,
                observaciones,
                socios (
                    id,
                    nombres,
                    apellido_paterno,
                    apellido_materno,
                    rut
                ),
                periodos_financieros (
                    id,
                    anio,
                    estado
                ),
                categorias (
                    id,
                    nombre
                )
                `
            )
            .order(
                "id",
                {
                    ascending: false
                }
            );


    if (
        filtroPeriodo &&
        filtroPeriodo.value
    ) {

        consulta =
            consulta.eq(
                "periodo_id",
                filtroPeriodo.value
            );

    }


    if (
        filtroEstado &&
        filtroEstado.value
    ) {

        consulta =
            consulta.eq(
                "estado",
                filtroEstado.value
            );

    }


    const resultado =
        await consulta;


    if (resultado.error) {

        console.error(
            "Error al cargar cuotas:",
            resultado.error
        );

        mostrarErrorCuotas(
            "No fue posible cargar las cuotas."
        );

        return;
    }


    cuotas =
        resultado.data || [];


    await cargarTotalesPagos();

    aplicarFiltrosLocales();

}


// ============================================================
// CARGAR TOTALES DE PAGOS
// ============================================================

async function cargarTotalesPagos() {

    if (!cuotas.length) {

        comprobantesPorPago = {};

        cuotas.forEach(
            function (cuota) {

                cuota.total_pagado = 0;
                cuota.saldo = Number(
                    cuota.monto || 0
                );

            }
        );

        return;
    }


    const cuotasIds =
        cuotas.map(
            function (cuota) {

                return cuota.id;

            }
        );


    const resultado =
        await supabaseClient
            .from("pagos_cuotas")
            .select(
                `
                id,
                cuota_id,
                monto,
                estado,
                fecha_pago
                `
            )
            .in(
                "cuota_id",
                cuotasIds
            );


    if (resultado.error) {

        console.error(
            "Error al cargar pagos de cuotas:",
            resultado.error
        );

        cuotas.forEach(
            function (cuota) {

                cuota.total_pagado = 0;

                cuota.saldo =
                    Number(
                        cuota.monto || 0
                    );

            }
        );

        return;
    }


    const pagos =
        resultado.data || [];


    const totales =
        {};


    pagos.forEach(
        function (pago) {

            if (
                pago.estado &&
                pago.estado !== "activo"
            ) {

                return;
            }


            const cuotaId =
                pago.cuota_id;


            if (
                !totales[cuotaId]
            ) {

                totales[cuotaId] =
                    0;

            }


            totales[cuotaId] +=
                Number(
                    pago.monto || 0
                );

        }
    );


    cuotas.forEach(
        function (cuota) {

            const montoCuota =
                Number(
                    cuota.monto || 0
                );


            const totalPagado =
                Number(
                    totales[cuota.id] || 0
                );


            cuota.total_pagado =
                totalPagado;


            cuota.saldo =
                Math.max(
                    montoCuota -
                    totalPagado,
                    0
                );

        }
    );


    // ========================================================
    // COMPROBANTES ASOCIADOS
    // ========================================================

    const pagosIds =
        pagos
            .map(
                function (pago) {

                    return pago.id;

                }
            )
            .filter(
                function (id) {

                    return id !== null &&
                           id !== undefined;

                }
            );


    comprobantesPorPago =
        {};


    if (!pagosIds.length) {

        return;
    }


    const resultadoComprobantes =
        await supabaseClient
            .from(
                "comprobantes_cuota"
            )
            .select(
                `
                id,
                pago_id,
                numero,
                fecha_emision,
                estado,
                cantidad_impresiones
                `
            )
            .in(
                "pago_id",
                pagosIds
            );


    if (
        resultadoComprobantes.error
    ) {

        console.warn(
            "No fue posible cargar los comprobantes asociados:",
            resultadoComprobantes.error
        );

        return;
    }


    (
        resultadoComprobantes.data ||
        []
    ).forEach(
        function (comprobante) {

            comprobantesPorPago[
                comprobante.pago_id
            ] = comprobante;

        }
    );

}


// ============================================================
// APLICAR FILTROS LOCALES
// ============================================================

function aplicarFiltrosLocales() {

    const filtroBusqueda =
        document.getElementById(
            "filtroBusqueda"
        );


    let textoBusqueda =
        "";


    if (filtroBusqueda) {

        textoBusqueda =
            (
                filtroBusqueda.value ||
                ""
            )
                .trim()
                .toLowerCase();

    }


    let cuotasFiltradas =
        cuotas.slice();


    if (textoBusqueda) {

        cuotasFiltradas =
            cuotasFiltradas.filter(
                function (cuota) {

                    const socio =
                        cuota.socios ||
                        {};


                    const nombre =
                        [
                            socio.nombres,
                            socio.apellido_paterno,
                            socio.apellido_materno
                        ]
                            .filter(Boolean)
                            .join(" ");


                    const rut =
                        socio.rut ||
                        "";


                    const texto =
                        (
                            nombre +
                            " " +
                            rut
                        )
                            .toLowerCase();


                    return texto.includes(
                        textoBusqueda
                    );

                }
            );

    }


    renderizarCuotas(
        cuotasFiltradas
    );

}


// ============================================================
// MOSTRAR CARGANDO
// ============================================================

function mostrarCargandoCuotas() {

    const tabla =
        document.getElementById(
            "tablaCuotas"
        );


    if (tabla) {

        tabla.innerHTML = `
            <tr>
                <td colspan="8" class="estado-tabla">
                    Cargando cuotas...
                </td>
            </tr>
        `;

    }

}


// ============================================================
// MOSTRAR ERROR
// ============================================================

function mostrarErrorCuotas(
    mensaje
) {

    const tabla =
        document.getElementById(
            "tablaCuotas"
        );


    if (tabla) {

        tabla.innerHTML = `
            <tr>
                <td colspan="8" class="estado-tabla error">
                    ${escapeHtml(mensaje)}
                </td>
            </tr>
        `;

    }

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


    if (!lista.length) {

        tabla.innerHTML = `
            <tr>
                <td colspan="8" class="estado-tabla">
                    No se encontraron cuotas.
                </td>
            </tr>
        `;

        return;
    }


    tabla.innerHTML =
        lista
            .map(
                function (cuota) {

                    return construirFilaCuota(
                        cuota
                    );

                }
            )
            .join("");


    actualizarResumen(
        lista
    );

}


// ============================================================
// CONSTRUIR FILA DE CUOTA
// ============================================================

function construirFilaCuota(
    cuota
) {

    const socio =
        cuota.socios ||
        {};


    const periodo =
        cuota.periodos_financieros ||
        {};


    const nombreSocio =
        [
            socio.nombres,
            socio.apellido_paterno,
            socio.apellido_materno
        ]
            .filter(Boolean)
            .join(" ");


    const monto =
        Number(
            cuota.monto || 0
        );


    const pagado =
        Number(
            cuota.total_pagado || 0
        );


    const saldo =
        Number(
            cuota.saldo || 0
        );


    const estadoVisual =
        determinarEstadoVisual(
            cuota,
            pagado,
            saldo
        );


    return `
        <tr>
            <td>
                <div class="nombre-socio">
                    ${escapeHtml(nombreSocio || "Sin nombre")}
                </div>
                <div class="texto-secundario">
                    ${escapeHtml(socio.rut || "")}
                </div>
            </td>

            <td>
                ${escapeHtml(
                    String(
                        periodo.anio || "-"
                    )
                )}
            </td>

            <td>
                ${formatearMoneda(
                    monto
                )}
            </td>

            <td>
                ${formatearMoneda(
                    pagado
                )}
            </td>

            <td>
                ${formatearMoneda(
                    saldo
                )}
            </td>

            <td>
                <span class="badge ${estadoVisual.clase}">
                    ${escapeHtml(
                        estadoVisual.texto
                    )}
                </span>
            </td>

            <td>
                <button
                    type="button"
                    class="btn btn-primary btn-sm"
                    onclick="abrirModalPago(${cuota.id})"
                >
                    Registrar pago
                </button>

                <button
                    type="button"
                    class="btn btn-secondary btn-sm"
                    onclick="verHistorialCuota(${cuota.id})"
                >
                    Ver pagos
                </button>
            </td>

            <td>
                <span class="texto-secundario">
                    Ver pagos
                </span>
            </td>
        </tr>
    `;

}


// ============================================================
// DETERMINAR ESTADO VISUAL
// ============================================================

function determinarEstadoVisual(
    cuota,
    pagado,
    saldo
) {

    if (
        cuota.estado ===
        "anulada"
    ) {

        return {
            texto: "Anulada",
            clase: "badge-danger"
        };

    }


    if (
        saldo <= 0 &&
        pagado > 0
    ) {

        return {
            texto: "Pagada",
            clase: "badge-success"
        };

    }


    if (
        pagado > 0 &&
        saldo > 0
    ) {

        return {
            texto: "Parcial",
            clase: "badge-warning"
        };

    }


    return {
        texto: "Pendiente",
        clase: "badge-secondary"
    };

}


// ============================================================
// ACTUALIZAR RESUMEN
// ============================================================

function actualizarResumen(
    lista
) {

    const totalCuotas =
        lista.length;


    const totalMonto =
        lista.reduce(
            function (total, cuota) {

                return total +
                    Number(
                        cuota.monto || 0
                    );

            },
            0
        );


    const totalPagado =
        lista.reduce(
            function (total, cuota) {

                return total +
                    Number(
                        cuota.total_pagado || 0
                    );

            },
            0
        );


    const totalSaldo =
        lista.reduce(
            function (total, cuota) {

                return total +
                    Number(
                        cuota.saldo || 0
                    );

            },
            0
        );


    actualizarElementoTexto(
        "totalCuotas",
        String(totalCuotas)
    );


    actualizarElementoTexto(
        "totalMonto",
        formatearMoneda(totalMonto)
    );


    actualizarElementoTexto(
        "totalPagado",
        formatearMoneda(totalPagado)
    );


    actualizarElementoTexto(
        "totalSaldo",
        formatearMoneda(totalSaldo)
    );

}


// ============================================================
// ABRIR MODAL DE PAGO
// ============================================================

function abrirModalPago(
    cuotaId
) {

    const modal =
        document.getElementById(
            "modalPago"
        );


    if (!modal) {

        return;
    }


    const cuota =
        cuotas.find(
            function (item) {

                return Number(
                    item.id
                ) === Number(
                    cuotaId
                );

            }
        );


    if (!cuota) {

        alert(
            "No fue posible encontrar la cuota seleccionada."
        );

        return;
    }


    const socio =
        cuota.socios ||
        {};


    const nombreSocio =
        [
            socio.nombres,
            socio.apellido_paterno,
            socio.apellido_materno
        ]
            .filter(Boolean)
            .join(" ");


    actualizarElementoTexto(
        "nombreSocioPago",
        nombreSocio || "Sin nombre"
    );


    actualizarElementoTexto(
        "rutSocioPago",
        socio.rut || ""
    );


    actualizarElementoTexto(
        "montoCuotaPago",
        formatearMoneda(
            cuota.monto || 0
        )
    );


    actualizarElementoTexto(
        "saldoCuotaPago",
        formatearMoneda(
            cuota.saldo || 0
        )
    );


    const inputCuota =
        document.getElementById(
            "pagoCuotaId"
        );


    if (inputCuota) {

        inputCuota.value =
            cuota.id;

    }


    const inputMonto =
        document.getElementById(
            "pagoMonto"
        );


    if (inputMonto) {

        inputMonto.value =
            cuota.saldo > 0
                ? cuota.saldo
                : cuota.monto;

    }


    const inputFecha =
        document.getElementById(
            "fechaPago"
        );


    if (inputFecha) {

        inputFecha.value =
            obtenerFechaActual();

    }


    cargarCuentasEnSelect();

    actualizarCamposMedioPago();


    modal.classList.add(
        "activo"
    );


    document.body.classList.add(
        "modal-abierto"
    );

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

        modal.classList.remove(
            "activo"
        );

    }


    document.body.classList.remove(
        "modal-abierto"
    );


    limpiarFormularioPago();

}


// ============================================================
// LIMPIAR FORMULARIO
// ============================================================

function limpiarFormularioPago() {

    const formulario =
        document.getElementById(
            "formPago"
        );


    if (formulario) {

        formulario.reset();

    }


    const inputCuota =
        document.getElementById(
            "pagoCuotaId"
        );


    if (inputCuota) {

        inputCuota.value =
            "";

    }


    const fecha =
        document.getElementById(
            "fechaPago"
        );


    if (fecha) {

        fecha.value =
            obtenerFechaActual();

    }


    actualizarCamposMedioPago();

}


// ============================================================
// CARGAR CUENTAS EN SELECT
// ============================================================

function cargarCuentasEnSelect() {

    const select =
        document.getElementById(
            "cuentaPago"
        );


    if (!select) {

        return;
    }


    select.innerHTML = `
        <option value="">
            Seleccione una cuenta
        </option>
    `;


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

    const partes = [];


    if (cuenta.nombre) {

        partes.push(
            cuenta.nombre
        );

    }


    if (cuenta.banco) {

        partes.push(
            cuenta.banco
        );

    }


    if (
        cuenta.numero_cuenta
    ) {

        partes.push(
            `N.º ${cuenta.numero_cuenta}`
        );

    }


    return partes.join(
        " — "
    );

}


// ============================================================
// ACTUALIZAR CAMPOS SEGÚN MEDIO DE PAGO
// ============================================================

function actualizarCamposMedioPago() {

    const medioPago =
        document.getElementById(
            "medioPago"
        );


    const campoComprobante =
        document.getElementById(
            "campoNumeroComprobante"
        );


    const campoBanco =
        document.getElementById(
            "campoBancoOrigen"
        );


    if (!medioPago) {

        return;
    }


    const medio =
        medioPago.value;


    const esTransferencia =
        medio ===
        "transferencia";


    if (campoComprobante) {

        campoComprobante.style.display =
            esTransferencia
                ? ""
                : "none";

    }


    if (campoBanco) {

        campoBanco.style.display =
            esTransferencia
                ? ""
                : "none";

    }


    const inputComprobante =
        document.getElementById(
            "numeroComprobante"
        );


    if (
        inputComprobante
    ) {

        inputComprobante.required =
            esTransferencia;

    }


    const inputBanco =
        document.getElementById(
            "bancoOrigen"
        );


    if (inputBanco) {

        inputBanco.required =
            false;

    }

}


// ============================================================
// GUARDAR PAGO
// ============================================================

async function guardarPago(
    evento
) {

    evento.preventDefault();


    const cuotaId =
        document.getElementById(
            "pagoCuotaId"
        )?.value;


    const monto =
        Number(
            document.getElementById(
                "pagoMonto"
            )?.value || 0
        );


    const medioPago =
        document.getElementById(
            "medioPago"
        )?.value;


    const cuentaId =
        document.getElementById(
            "cuentaPago"
        )?.value;


    const fechaPago =
        document.getElementById(
            "fechaPago"
        )?.value;


    const numeroComprobante =
        document.getElementById(
            "numeroComprobante"
        )?.value
        ?.trim() || null;


    const bancoOrigen =
        document.getElementById(
            "bancoOrigen"
        )?.value
        ?.trim() || null;


    const observacion =
        document.getElementById(
            "observacionPago"
        )?.value
        ?.trim() || null;


    if (!cuotaId) {

        alert(
            "No se ha seleccionado una cuota."
        );

        return;
    }


    if (
        !Number.isFinite(monto) ||
        monto <= 0
    ) {

        alert(
            "Ingrese un monto de pago válido."
        );

        return;
    }


    if (!medioPago) {

        alert(
            "Seleccione el medio de pago."
        );

        return;
    }


    if (!cuentaId) {

        alert(
            "Seleccione la cuenta en la que se recibió el pago."
        );

        return;
    }


    if (!fechaPago) {

        alert(
            "Seleccione la fecha del pago."
        );

        return;
    }


    if (
        medioPago ===
        "transferencia" &&
        !numeroComprobante
    ) {

        alert(
            "Ingrese el número de comprobante de la transferencia."
        );

        return;
    }


    const cuota =
        cuotas.find(
            function (item) {

                return Number(
                    item.id
                ) === Number(
                    cuotaId
                );

            }
        );


    if (!cuota) {

        alert(
            "No fue posible encontrar la cuota."
        );

        return;
    }


    const saldoActual =
        Number(
            cuota.saldo || 0
        );


    if (
        saldoActual <= 0
    ) {

        alert(
            "La cuota seleccionada no tiene saldo pendiente."
        );

        return;
    }


    if (
        monto >
        saldoActual
    ) {

        alert(
            `El monto ingresado supera el saldo pendiente de ${formatearMoneda(saldoActual)}.`
        );

        return;
    }


    const botonGuardar =
        document.getElementById(
            "guardarPago"
        );


    if (botonGuardar) {

        botonGuardar.disabled =
            true;

        botonGuardar.dataset.textoOriginal =
            botonGuardar.textContent;

        botonGuardar.textContent =
            "Guardando...";

    }


    try {

        const resultado =
            await supabaseClient
                .from(
                    "pagos_cuotas"
                )
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
                            numeroComprobante,

                        banco_origen:
                            bancoOrigen,

                        observacion:
                            observacion,

                        estado:
                            "activo",

                        created_by:
                            usuarioActual?.id ||
                            null
                    }
                )
                .select(
                    "*"
                )
                .single();


        if (resultado.error) {

            console.error(
                "Error al registrar pago:",
                resultado.error
            );

            alert(
                obtenerMensajeError(
                    resultado.error,
                    "No fue posible registrar el pago."
                )
            );

            return;
        }


        const pagoCreado =
            resultado.data;


        cerrarModalPago();


        await cargarCuotas();


        // ====================================================
        // EMITIR COMPROBANTE INTERNO
        // ====================================================

        if (
            pagoCreado &&
            pagoCreado.id
        ) {

            const resultadoComprobante =
                await emitirComprobante(
                    pagoCreado.id,
                    true
                );


            if (
                resultadoComprobante &&
                resultadoComprobante.success
            ) {

                abrirComprobante(
                    pagoCreado.id
                );

            } else {

                alert(
                    "El pago fue registrado correctamente, pero no fue posible emitir automáticamente el comprobante. Puede emitirlo posteriormente desde el historial de pagos."
                );

            }

        }


    } catch (error) {

        console.error(
            "Error inesperado al registrar pago:",
            error
        );

        alert(
            obtenerMensajeError(
                error,
                "Ocurrió un error inesperado al registrar el pago."
            )
        );


    } finally {

        if (botonGuardar) {

            botonGuardar.disabled =
                false;

            botonGuardar.textContent =
                botonGuardar.dataset.textoOriginal ||
                "Guardar pago";

        }

    }

}


// ============================================================
// EMITIR COMPROBANTE
// ============================================================

async function emitirComprobante(
    pagoId,
    mostrarMensajes = false
) {

    try {

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


            if (mostrarMensajes) {

                alert(
                    obtenerMensajeError(
                        resultado.error,
                        "No fue posible emitir el comprobante."
                    )
                );

            }


            return {
                success: false,
                error: resultado.error
            };

        }


        const comprobante =
            obtenerResultadoComprobante(
                resultado.data
            );


        if (!comprobante) {

            if (mostrarMensajes) {

                alert(
                    "El comprobante no fue generado correctamente."
                );

            }


            return {
                success: false,
                error: new Error(
                    "RPC sin comprobante"
                )
            };

        }


        comprobantesPorPago[
            pagoId
        ] =
            comprobante;


        return {
            success: true,
            data: comprobante
        };


    } catch (error) {

        console.error(
            "Error inesperado al emitir comprobante:",
            error
        );


        if (mostrarMensajes) {

            alert(
                obtenerMensajeError(
                    error,
                    "No fue posible emitir el comprobante."
                )
            );

        }


        return {
            success: false,
            error: error
        };

    }

}


// ============================================================
// OBTENER RESULTADO COMPROBANTE
// ============================================================

function obtenerResultadoComprobante(
    data
) {

    if (!data) {

        return null;
    }


    if (
        Array.isArray(data)
    ) {

        if (!data.length) {

            return null;

        }


        return data[0];

    }


    if (
        typeof data ===
        "object"
    ) {

        if (
            Array.isArray(
                data.data
            )
        ) {

            return data.data[0] ||
                null;

        }


        if (
            data.id ||
            data.numero ||
            data.pago_id
        ) {

            return data;

        }

    }


    return null;

}


// ============================================================
// ABRIR COMPROBANTE
// ============================================================

function abrirComprobante(
    pagoId
) {

    if (!pagoId) {

        return;
    }


    const comprobante =
        comprobantesPorPago[
            pagoId
        ];


    if (
        comprobante &&
        comprobante.id
    ) {

        window.open(
            `comprobante.html?id=${encodeURIComponent(comprobante.id)}`,
            "_blank"
        );

        return;
    }


    window.open(
        `comprobante.html?pago_id=${encodeURIComponent(pagoId)}`,
        "_blank"
    );

}


// ============================================================
// ABRIR GESTIÓN DE COMPROBANTES
// ============================================================

function abrirGestionComprobantes() {

    window.location.href =
        "comprobantes.html";

}


// ============================================================
// VER HISTORIAL DE CUOTA
// ============================================================

async function verHistorialCuota(
    cuotaId
) {

    const cuota =
        cuotas.find(
            function (item) {

                return Number(
                    item.id
                ) === Number(
                    cuotaId
                );

            }
        );


    if (!cuota) {

        alert(
            "No fue posible encontrar la cuota."
        );

        return;
    }


    cuotaHistorialActual =
        cuota;


    const modal =
        document.getElementById(
            "modalHistorial"
        );


    const contenido =
        document.getElementById(
            "historialContenido"
        );


    if (!modal || !contenido) {

        return;
    }


    contenido.innerHTML = `
        <div class="estado-tabla">
            Cargando historial de pagos...
        </div>
    `;


    modal.classList.add(
        "activo"
    );


    document.body.classList.add(
        "modal-abierto"
    );


    const resultado =
        await supabaseClient
            .from("pagos_cuotas")
            .select(
                `
                id,
                cuota_id,
                cuenta_id,
                monto,
                medio_pago,
                fecha_pago,
                numero_comprobante,
                banco_origen,
                observacion,
                estado,
                fecha_anulacion,
                anulado_por,
                motivo_anulacion,
                created_at,
                cuentas (
                    id,
                    nombre,
                    banco,
                    numero_cuenta
                )
                `
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


        contenido.innerHTML = `
            <div class="estado-tabla error">
                No fue posible cargar el historial de pagos.
            </div>
        `;

        return;
    }


    const pagos =
        resultado.data || [];


    await cargarComprobantesHistorial(
        pagos
    );


    renderizarHistorialCuota(
        cuota,
        pagos
    );

}


// ============================================================
// CARGAR COMPROBANTES DEL HISTORIAL
// ============================================================

async function cargarComprobantesHistorial(
    pagos
) {

    if (!pagos.length) {

        return;
    }


    const ids =
        pagos
            .map(
                function (pago) {

                    return pago.id;

                }
            )
            .filter(
                function (id) {

                    return id !== null &&
                           id !== undefined;

                }
            );


    if (!ids.length) {

        return;
    }


    const resultado =
        await supabaseClient
            .from(
                "comprobantes_cuota"
            )
            .select(
                `
                id,
                pago_id,
                numero,
                fecha_emision,
                estado,
                cantidad_impresiones
                `
            )
            .in(
                "pago_id",
                ids
            );


    if (resultado.error) {

        console.warn(
            "No fue posible cargar comprobantes del historial:",
            resultado.error
        );

        return;
    }


    (
        resultado.data ||
        []
    ).forEach(
        function (comprobante) {

            comprobantesPorPago[
                comprobante.pago_id
            ] =
                comprobante;

        }
    );

}


// ============================================================
// RENDERIZAR HISTORIAL
// ============================================================

function renderizarHistorialCuota(
    cuota,
    pagos
) {

    const contenido =
        document.getElementById(
            "historialContenido"
        );


    if (!contenido) {

        return;
    }


    const socio =
        cuota.socios ||
        {};


    const nombreSocio =
        [
            socio.nombres,
            socio.apellido_paterno,
            socio.apellido_materno
        ]
            .filter(Boolean)
            .join(" ");


    const montoCuota =
        Number(
            cuota.monto || 0
        );


    const totalPagado =
        pagos.reduce(
            function (total, pago) {

                if (
                    pago.estado &&
                    pago.estado !==
                        "activo"
                ) {

                    return total;

                }


                return total +
                    Number(
                        pago.monto || 0
                    );

            },
            0
        );


    const saldo =
        Math.max(
            montoCuota -
            totalPagado,
            0
        );


    let html = `
        <div class="historial-resumen">
            <div>
                <strong>Socio:</strong>
                ${escapeHtml(
                    nombreSocio || "Sin nombre"
                )}
            </div>

            <div>
                <strong>RUT:</strong>
                ${escapeHtml(
                    socio.rut || "-"
                )}
            </div>

            <div>
                <strong>Período:</strong>
                ${escapeHtml(
                    String(
                        cuota.periodos_financieros?.anio ||
                        "-"
                    )
                )}
            </div>

            <div>
                <strong>Monto cuota:</strong>
                ${formatearMoneda(
                    montoCuota
                )}
            </div>

            <div>
                <strong>Total pagado:</strong>
                ${formatearMoneda(
                    totalPagado
                )}
            </div>

            <div>
                <strong>Saldo:</strong>
                ${formatearMoneda(
                    saldo
                )}
            </div>
        </div>
    `;


    if (!pagos.length) {

        html += `
            <div class="estado-tabla">
                Este socio aún no registra pagos para esta cuota.
            </div>
        `;

        contenido.innerHTML =
            html;

        return;
    }


    html += `
        <div class="tabla-responsive">
            <table class="tabla-datos">
                <thead>
                    <tr>
                        <th>Fecha</th>
                        <th>Monto</th>
                        <th>Medio de pago</th>
                        <th>N.º transferencia</th>
                        <th>Comprobante</th>
                        <th>Estado</th>
                        <th>Observación</th>
                    </tr>
                </thead>

                <tbody>
    `;


    pagos.forEach(
        function (pago) {

            const comprobante =
                comprobantesPorPago[
                    pago.id
                ];


            html += `
                <tr>
                    <td>
                        ${formatearFecha(
                            pago.fecha_pago
                        )}
                    </td>

                    <td>
                        ${formatearMoneda(
                            pago.monto
                        )}
                    </td>

                    <td>
                        ${escapeHtml(
                            formatearMedioPago(
                                pago.medio_pago
                            )
                        )}
                    </td>

                    <td>
                        ${escapeHtml(
                            pago.numero_comprobante ||
                            "-"
                        )}
                    </td>

                    <td>
                        ${construirCeldaComprobante(
                            pago
                        )}
                    </td>

                    <td>
                        ${construirEstadoPago(
                            pago
                        )}
                    </td>

                    <td>
                        ${escapeHtml(
                            pago.observacion ||
                            "-"
                        )}
                    </td>
                </tr>
            `;

        }
    );


    html += `
                </tbody>
            </table>
        </div>
    `;


    contenido.innerHTML =
        html;

}


// ============================================================
// CELDA COMPROBANTE
// ============================================================

function construirCeldaComprobante(
    pago
) {

    const comprobante =
        comprobantesPorPago[
            pago.id
        ];


    if (comprobante) {

        return `
            <button
                type="button"
                class="btn btn-secondary btn-sm"
                onclick="abrirComprobante(${Number(pago.id)})"
            >
                🧾 ${escapeHtml(
                    comprobante.numero ||
                    "Comprobante"
                )}
            </button>
        `;

    }


    if (
        pago.estado ===
        "activo"
    ) {

        return `
            <button
                type="button"
                class="btn btn-outline-primary btn-sm"
                onclick="emitirComprobanteRetroactivo(${Number(pago.id)})"
            >
                Emitir
            </button>
        `;

    }


    return `
        <span class="texto-secundario">
            No disponible
        </span>
    `;

}


// ============================================================
// EMITIR COMPROBANTE RETROACTIVO
// ============================================================

async function emitirComprobanteRetroactivo(
    pagoId
) {

    if (!pagoId) {

        return;
    }


    const confirmar =
        confirm(
            "¿Desea emitir el comprobante de pago para este pago histórico?"
        );


    if (!confirmar) {

        return;
    }


    const resultado =
        await emitirComprobante(
            pagoId,
            true
        );


    if (
        !resultado ||
        !resultado.success
    ) {

        return;
    }


    alert(
        `Comprobante ${resultado.data.numero} emitido correctamente.`
    );


    if (
        cuotaHistorialActual &&
        cuotaHistorialActual.id
    ) {

        await verHistorialCuota(
            cuotaHistorialActual.id
        );

    }


    abrirComprobante(
        pagoId
    );

}


// ============================================================
// CONSTRUIR ESTADO DE PAGO
// ============================================================

function construirEstadoPago(
    pago
) {

    if (
        pago.estado ===
        "anulado"
    ) {

        return `
            <span class="badge badge-danger">
                Anulado
            </span>
        `;

    }


    return `
        <span class="badge badge-success">
            Activo
        </span>
    `;

}


// ============================================================
// FORMATEAR MEDIO DE PAGO
// ============================================================

function formatearMedioPago(
    medio
) {

    const valores = {

        efectivo:
            "Efectivo",

        transferencia:
            "Transferencia",

        deposito:
            "Depósito",

        cheque:
            "Cheque",

        otro:
            "Otro"

    };


    return valores[
        medio
    ] ||
        medio ||
        "-";

}


// ============================================================
// CERRAR HISTORIAL
// ============================================================

function cerrarHistorial() {

    const modal =
        document.getElementById(
            "modalHistorial"
        );


    if (modal) {

        modal.classList.remove(
            "activo"
        );

    }


    document.body.classList.remove(
        "modal-abierto"
    );


    cuotaHistorialActual =
        null;

}


// ============================================================
// IMPRIMIR HISTORIAL
// ============================================================

function imprimirHistorial() {

    if (
        !cuotaHistorialActual
    ) {

        alert(
            "No hay un historial seleccionado para imprimir."
        );

        return;
    }


    imprimirHistorialCuota(
        cuotaHistorialActual
    );

}


// ============================================================
// IMPRIMIR HISTORIAL DE CUOTA
// ============================================================

async function imprimirHistorialCuota(
    cuota
) {

    const resultado =
        await supabaseClient
            .from("pagos_cuotas")
            .select(
                `
                id,
                cuota_id,
                cuenta_id,
                monto,
                medio_pago,
                fecha_pago,
                numero_comprobante,
                banco_origen,
                observacion,
                estado,
                created_at,
                cuentas (
                    id,
                    nombre,
                    banco,
                    numero_cuenta
                )
                `
            )
            .eq(
                "cuota_id",
                cuota.id
            )
            .order(
                "fecha_pago",
                {
                    ascending: true
                }
            );


    if (resultado.error) {

        console.error(
            "Error al obtener historial para impresión:",
            resultado.error
        );

        alert(
            "No fue posible preparar el historial para impresión."
        );

        return;
    }


    const pagos =
        resultado.data || [];


    await cargarComprobantesHistorial(
        pagos
    );


    const socio =
        cuota.socios ||
        {};


    const nombreSocio =
        [
            socio.nombres,
            socio.apellido_paterno,
            socio.apellido_materno
        ]
            .filter(Boolean)
            .join(" ");


    const periodo =
        cuota.periodos_financieros ||
        {};


    const totalPagado =
        pagos.reduce(
            function (total, pago) {

                if (
                    pago.estado &&
                    pago.estado !==
                        "activo"
                ) {

                    return total;

                }


                return total +
                    Number(
                        pago.monto || 0
                    );

            },
            0
        );


    const saldo =
        Math.max(
            Number(
                cuota.monto || 0
            ) -
            totalPagado,
            0
        );


    const fechaGeneracion =
        new Date()
            .toLocaleString(
                "es-CL"
            );


    const sello =
        "assets/timbre-comunidad.jpeg";


    let filas =
        "";


    pagos.forEach(
        function (pago) {

            const comprobante =
                comprobantesPorPago[
                    pago.id
                ];


            filas += `
                <tr>
                    <td>
                        ${escapeHtml(
                            formatearFecha(
                                pago.fecha_pago
                            )
                        )}
                    </td>

                    <td class="numero">
                        ${formatearMoneda(
                            pago.monto
                        )}
                    </td>

                    <td>
                        ${escapeHtml(
                            formatearMedioPago(
                                pago.medio_pago
                            )
                        )}
                    </td>

                    <td>
                        ${escapeHtml(
                            pago.numero_comprobante ||
                            "-"
                        )}
                    </td>

                    <td>
                        ${escapeHtml(
                            pago.banco_origen ||
                            "-"
                        )}
                    </td>

                    <td>
                        ${escapeHtml(
                            comprobante?.numero ||
                            "Sin emitir"
                        )}
                    </td>

                    <td>
                        ${escapeHtml(
                            pago.estado ===
                                "anulado"
                                ? "Anulado"
                                : "Activo"
                        )}
                    </td>
                </tr>
            `;

        }
    );


    if (!filas) {

        filas = `
            <tr>
                <td colspan="7">
                    No existen pagos registrados.
                </td>
            </tr>
        `;

    }


    const ventana =
        window.open(
            "",
            "_blank",
            "width=1100,height=800"
        );


    if (!ventana) {

        alert(
            "El navegador bloqueó la ventana de impresión. Permita ventanas emergentes para este sitio."
        );

        return;
    }


    ventana.document.write(`
        <!DOCTYPE html>
        <html lang="es">
        <head>
            <meta charset="UTF-8">

            <title>
                Historial de pagos de cuotas
            </title>

            <style>

                @page {
                    size: A4;
                    margin: 15mm;
                }

                * {
                    box-sizing: border-box;
                }

                body {
                    margin: 0;
                    font-family: Arial, Helvetica, sans-serif;
                    color: #17324d;
                    background: #ffffff;
                    font-size: 12px;
                }

                .documento {
                    width: 100%;
                    max-width: 180mm;
                    margin: 0 auto;
                }

                .encabezado {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    border-bottom: 3px solid #1d5d91;
                    padding-bottom: 10px;
                    margin-bottom: 14px;
                }

                .encabezado-texto {
                    flex: 1;
                }

                .encabezado h1 {
                    margin: 0 0 5px 0;
                    font-size: 18px;
                    color: #174f7d;
                }

                .encabezado h2 {
                    margin: 0;
                    font-size: 13px;
                    font-weight: normal;
                    color: #4f6678;
                }

                .sello {
                    width: 80px;
                    height: 80px;
                    object-fit: contain;
                    margin-left: 15px;
                }

                .titulo {
                    text-align: center;
                    margin: 18px 0;
                }

                .titulo h2 {
                    margin: 0;
                    font-size: 17px;
                    color: #174f7d;
                }

                .datos {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 8px 20px;
                    border: 1px solid #b9c8d5;
                    padding: 12px;
                    margin-bottom: 14px;
                }

                .dato strong {
                    color: #174f7d;
                }

                .resumen {
                    display: grid;
                    grid-template-columns: repeat(3, 1fr);
                    gap: 10px;
                    margin-bottom: 15px;
                }

                .resumen-item {
                    border: 1px solid #b9c8d5;
                    padding: 10px;
                    text-align: center;
                }

                .resumen-item strong {
                    display: block;
                    font-size: 10px;
                    color: #5b7182;
                    text-transform: uppercase;
                    margin-bottom: 4px;
                }

                .resumen-item span {
                    font-size: 15px;
                    font-weight: bold;
                    color: #174f7d;
                }

                table {
                    width: 100%;
                    border-collapse: collapse;
                    margin-top: 10px;
                }

                th {
                    background: #174f7d;
                    color: #ffffff;
                    padding: 7px;
                    text-align: left;
                    font-size: 10px;
                }

                td {
                    border: 1px solid #cbd6df;
                    padding: 7px;
                    vertical-align: top;
                }

                tbody tr:nth-child(even) {
                    background: #f3f7fa;
                }

                .numero {
                    text-align: right;
                    white-space: nowrap;
                }

                .nota {
                    margin-top: 15px;
                    padding: 10px;
                    border-left: 4px solid #174f7d;
                    background: #f3f7fa;
                    color: #4f6678;
                    font-size: 10px;
                }

                .pie {
                    margin-top: 18px;
                    border-top: 1px solid #cbd6df;
                    padding-top: 8px;
                    color: #687b89;
                    font-size: 9px;
                    display: flex;
                    justify-content: space-between;
                }

                @media print {
                    body {
                        print-color-adjust: exact;
                        -webkit-print-color-adjust: exact;
                    }
                }

            </style>
        </head>

        <body>

            <div class="documento">

                <div class="encabezado">

                    <div class="encabezado-texto">

                        <h1>
                            COMUNIDAD INDÍGENA JUAN CHEUQUELÉN
                        </h1>

                        <h2>
                            RUT: 65.169.427-2
                            &nbsp; | &nbsp;
                            Personería Jurídica N.º 2314
                        </h2>

                        <h2>
                            Fundada el 27 de julio de 2017
                        </h2>

                    </div>

                    <img
                        class="sello"
                        src="${sello}"
                        alt="Timbre oficial de la comunidad"
                    >

                </div>


                <div class="titulo">

                    <h2>
                        HISTORIAL DE PAGOS DE CUOTA
                    </h2>

                </div>


                <div class="datos">

                    <div class="dato">
                        <strong>Socio:</strong>
                        ${escapeHtml(
                            nombreSocio || "-"
                        )}
                    </div>

                    <div class="dato">
                        <strong>RUT:</strong>
                        ${escapeHtml(
                            socio.rut || "-"
                        )}
                    </div>

                    <div class="dato">
                        <strong>Período:</strong>
                        ${escapeHtml(
                            String(
                                periodo.anio ||
                                "-"
                            )
                        )}
                    </div>

                    <div class="dato">
                        <strong>Concepto:</strong>
                        Cuota socio
                    </div>

                </div>


                <div class="resumen">

                    <div class="resumen-item">

                        <strong>
                            Monto cuota
                        </strong>

                        <span>
                            ${formatearMoneda(
                                cuota.monto
                            )}
                        </span>

                    </div>

                    <div class="resumen-item">

                        <strong>
                            Total pagado
                        </strong>

                        <span>
                            ${formatearMoneda(
                                totalPagado
                            )}
                        </span>

                    </div>

                    <div class="resumen-item">

                        <strong>
                            Saldo
                        </strong>

                        <span>
                            ${formatearMoneda(
                                saldo
                            )}
                        </span>

                    </div>

                </div>


                <table>

                    <thead>

                        <tr>

                            <th>
                                Fecha de pago
                            </th>

                            <th>
                                Monto
                            </th>

                            <th>
                                Medio
                            </th>

                            <th>
                                N.º transferencia
                            </th>

                            <th>
                                Banco origen
                            </th>

                            <th>
                                Comprobante
                            </th>

                            <th>
                                Estado
                            </th>

                        </tr>

                    </thead>

                    <tbody>

                        ${filas}

                    </tbody>

                </table>


                <div class="nota">

                    Este documento corresponde exclusivamente
                    al historial interno de pagos registrados
                    por la Comunidad Indígena Juan Cheuquelén.
                    La fecha de generación de este historial
                    no modifica las fechas originales de los
                    pagos registrados.

                </div>


                <div class="pie">

                    <span>
                        Documento interno de la comunidad
                    </span>

                    <span>
                        Generado: ${escapeHtml(
                            fechaGeneracion
                        )}
                    </span>

                </div>

            </div>

        </body>
        </html>
    `);


    ventana.document.close();


    ventana.focus();


    setTimeout(
        function () {

            ventana.print();

        },
        500
    );

}


// ============================================================
// UTILIDADES
// ============================================================

function actualizarElementoTexto(
    id,
    texto
) {

    const elemento =
        document.getElementById(
            id
        );


    if (elemento) {

        elemento.textContent =
            texto;

    }

}


function formatearMoneda(
    valor
) {

    const numero =
        Number(
            valor || 0
        );


    return numero.toLocaleString(
        "es-CL",
        {
            style: "currency",
            currency: "CLP",
            maximumFractionDigits: 0
        }
    );

}


function formatearFecha(
    fecha
) {

    if (!fecha) {

        return "-";

    }


    const fechaObj =
        new Date(
            `${fecha}T00:00:00`
        );


    if (
        Number.isNaN(
            fechaObj.getTime()
        )
    ) {

        return String(
            fecha
        );

    }


    return fechaObj.toLocaleDateString(
        "es-CL"
    );

}


function obtenerFechaActual() {

    const ahora =
        new Date();


    const year =
        ahora.getFullYear();


    const month =
        String(
            ahora.getMonth() + 1
        ).padStart(
            2,
            "0"
        );


    const day =
        String(
            ahora.getDate()
        ).padStart(
            2,
            "0"
        );


    return `${year}-${month}-${day}`;

}


function escapeHtml(
    valor
) {

    if (
        valor === null ||
        valor === undefined
    ) {

        return "";

    }


    return String(
        valor
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


function obtenerMensajeError(
    error,
    mensajePorDefecto
) {

    if (
        error &&
        error.message
    ) {

        return error.message;

    }


    if (
        error &&
        error.error_description
    ) {

        return error.error_description;

    }


    if (
        error &&
        error.details
    ) {

        return error.details;

    }


    return mensajePorDefecto ||
        "Ocurrió un error.";

}

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
        ).value
        .trim();


    const bancoOrigen =
        document.getElementById(
            "bancoOrigen"
        ).value
        .trim();


    const observacion =
        document.getElementById(
            "observacionPago"
        ).value
        .trim();


    if (!cuotaId) {

        alert(
            "No se ha seleccionado una cuota."
        );

        return;
    }


    if (
        !Number.isFinite(
            monto
        ) ||
        monto <= 0
    ) {

        alert(
            "Debe ingresar un monto válido."
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


    const cuota =
        cuotas.find(
            function (elemento) {

                return Number(
                    elemento.id
                ) ===
                Number(
                    cuotaId
                );

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
        saldo <= 0
    ) {

        alert(
            "Esta cuota ya se encuentra completamente pagada."
        );

        return;
    }


    if (
        monto >
        saldo
    ) {

        alert(
            "El monto ingresado supera el saldo pendiente de la cuota."
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
                )
                .select(
                    "*"
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


    const modal =
        document.getElementById(
            "modalHistorial"
        );


    if (modal) {

        modal.style.display =
            "flex";

    }


    const resultado =
        await supabaseClient
            .from("pagos_cuotas")
            .select(
                `
                id,
                cuota_id,
                cuenta_id,
                monto,
                medio_pago,
                fecha_pago,
                numero_comprobante,
                banco_origen,
                observacion,
                estado,
                fecha_anulacion,
                anulado_por,
                motivo_anulacion,
                created_at
                `
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
            "<p class='mensaje-error'>" +
            "No fue posible cargar el historial de pagos." +
            "</p>";

        return;
    }


    const pagos =
        resultado.data ||
        [];


    const pagosIds =
        pagos.map(
            function (pago) {
                return pago.id;
            }
        );


    comprobantesPorPago = {};


    if (
        pagosIds.length > 0
    ) {

        const resultadoComprobantes =
            await supabaseClient
                .from(
                    "comprobantes_cuota"
                )
                .select(
                    `
                    id,
                    pago_id,
                    numero,
                    estado,
                    fecha_emision,
                    cantidad_impresiones
                    `
                )
                .in(
                    "pago_id",
                    pagosIds
                );


        if (
            !resultadoComprobantes.error
        ) {

            (
                resultadoComprobantes.data ||
                []
            ).forEach(
                function (
                    comprobante
                ) {

                    comprobantesPorPago[
                        comprobante.pago_id
                    ] =
                        comprobante;

                }
            );

        }

    }


    let html =
        "<div>";


    html +=
        "<p><strong>Socio:</strong> " +
        escaparHTML(
            socio
                ? construirNombreCompleto(
                    socio
                )
                : "—"
        ) +
        "</p>";


    html +=
        "<p><strong>RUT:</strong> " +
        escaparHTML(
            socio &&
            socio.rut
                ? socio.rut
                : "—"
        ) +
        "</p>";


    html +=
        "<p><strong>Período:</strong> " +
        escaparHTML(
            periodo
                ? String(
                    periodo.anio
                )
                : "—"
        ) +
        "</p>";


    html +=
        "<p><strong>Monto de la cuota:</strong> " +
        formatearMoneda(
            montoCuota
        ) +
        "</p>";


    html +=
        "<p><strong>Total pagado:</strong> " +
        formatearMoneda(
            totalPagado
        ) +
        "</p>";


    html +=
        "<p><strong>Saldo pendiente:</strong> " +
        formatearMoneda(
            saldo
        ) +
        "</p>";


    if (
        pagos.length === 0
    ) {

        html +=
            "<p>No existen pagos registrados para esta cuota.</p>";

    }
    else {

        html +=
            "<div class='tabla-responsive'>" +

            "<table class='tabla-datos'>" +

            "<thead>" +

            "<tr>" +

            "<th>Fecha</th>" +

            "<th>Monto</th>" +

            "<th>Medio de pago</th>" +

            "<th>N.º transferencia</th>" +

            "<th>Banco origen</th>" +

            "<th>Comprobante</th>" +

            "<th>Estado</th>" +

            "<th>Observación</th>" +

            "</tr>" +

            "</thead>" +

            "<tbody>";


        pagos.forEach(
            function (pago) {

                const comprobante =
                    comprobantesPorPago[
                        pago.id
                    ];


                html +=
                    "<tr>" +

                    "<td>" +
                    escaparHTML(
                        formatearFecha(
                            pago.fecha_pago
                        )
                    ) +
                    "</td>" +

                    "<td>" +
                    formatearMoneda(
                        pago.monto
                    ) +
                    "</td>" +

                    "<td>" +
                    escaparHTML(
                        formatearMedioPago(
                            pago.medio_pago
                        )
                    ) +
                    "</td>" +

                    "<td>" +
                    escaparHTML(
                        pago.numero_comprobante ||
                        "—"
                    ) +
                    "</td>" +

                    "<td>" +
                    escaparHTML(
                        pago.banco_origen ||
                        "—"
                    ) +
                    "</td>" +

                    "<td>" +
                    construirCeldaComprobante(
                        pago
                    ) +
                    "</td>" +

                    "<td>" +
                    construirEstadoPago(
                        pago
                    ) +
                    "</td>" +

                    "<td>" +
                    escaparHTML(
                        pago.observacion ||
                        "—"
                    ) +
                    "</td>" +

                    "</tr>";

            }
        );


        html +=
            "</tbody>" +
            "</table>" +
            "</div>";

    }


    html +=
        "</div>";


    contenido.innerHTML =
        html;


    if (acciones) {

        acciones.style.display =
            "flex";

    }

}


// ============================================================
// CELDA DE COMPROBANTE
// ============================================================

function construirCeldaComprobante(
    pago
) {

    const comprobante =
        comprobantesPorPago[
            pago.id
        ];


    if (
        comprobante &&
        comprobante.id
    ) {

        return (
            "<button " +
            "type='button' " +
            "class='boton-tabla' " +
            "data-accion='comprobante' " +
            "data-id='" +
            pago.id +
            "'>" +
            "🧾 " +
            escaparHTML(
                comprobante.numero ||
                "Comprobante"
            ) +
            "</button>"
        );

    }


    if (
        pago.estado ===
        "activo"
    ) {

        return (
            "<button " +
            "type='button' " +
            "class='boton-tabla' " +
            "data-accion='emitir-comprobante' " +
            "data-id='" +
            pago.id +
            "'>" +
            "Emitir" +
            "</button>"
        );

    }


    return (
        "<span class='texto-secundario'>" +
        "No disponible" +
        "</span>"
    );

}


// ============================================================
// EMITIR COMPROBANTE RETROACTIVO
// ============================================================

async function emitirComprobanteRetroactivo(
    pagoId
) {

    if (!pagoId) {
        return;
    }


    const confirmado =
        window.confirm(
            "¿Desea emitir el comprobante interno correspondiente a este pago?"
        );


    if (!confirmado) {
        return;
    }


    try {

        const resultado =
            await supabaseClient.rpc(
                "emitir_comprobante_cuota",
                {
                    p_pago_id:
                        pagoId
                }
            );


        if (
            resultado.error
        ) {

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
            !comprobante
        ) {

            alert(
                "El comprobante no fue generado correctamente."
            );

            return;
        }


        comprobantesPorPago[
            pagoId
        ] =
            comprobante;


        alert(
            "Comprobante " +
            (
                comprobante.numero ||
                ""
            ) +
            " emitido correctamente."
        );


        await abrirHistorial(
            cuotaHistorialActual
        );


    }
    catch (error) {

        console.error(
            "Error inesperado al emitir comprobante:",
            error
        );

        alert(
            "No fue posible emitir el comprobante."
        );

    }

}


// ============================================================
// RESULTADO DE COMPROBANTE
// ============================================================

function obtenerResultadoComprobante(
    data
) {

    if (
        !data
    ) {

        return null;

    }


    if (
        Array.isArray(data)
    ) {

        if (
            data.length === 0
        ) {

            return null;

        }


        return data[0];

    }


    if (
        typeof data ===
        "object"
    ) {

        if (
            data.id
        ) {

            return data;

        }


        if (
            data.comprobante
        ) {

            return data.comprobante;

        }


        if (
            Array.isArray(
                data.data
            ) &&
            data.data.length > 0
        ) {

            return data.data[0];

        }

    }


    return null;

}


// ============================================================
// ABRIR COMPROBANTE
// ============================================================

function abrirComprobante(
    pagoId
) {

    const comprobante =
        comprobantesPorPago[
            pagoId
        ];


    if (
        !comprobante ||
        !comprobante.id
    ) {

        alert(
            "Este pago todavía no tiene un comprobante emitido."
        );

        return;
    }


    window.location.href =
        "comprobante.html?id=" +
        encodeURIComponent(
            comprobante.id
        );

}


// ============================================================
// CERRAR MODAL HISTORIAL
// ============================================================

function cerrarHistorial() {

    const modal =
        document.getElementById(
            "modalHistorial"
        );


    if (modal) {

        modal.style.display =
            "none";

    }


    cuotaHistorialActual =
        null;

}


// ============================================================
// IMPRIMIR HISTORIAL
// ============================================================

async function imprimirHistorial() {

    if (
        !cuotaHistorialActual
    ) {

        alert(
            "No hay un historial seleccionado."
        );

        return;
    }


    const cuota =
        cuotas.find(
            function (elemento) {

                return Number(
                    elemento.id
                ) ===
                Number(
                    cuotaHistorialActual
                );

            }
        );


    if (!cuota) {

        alert(
            "No fue posible encontrar la cuota."
        );

        return;
    }


    const resultado =
        await supabaseClient
            .from("pagos_cuotas")
            .select(
                `
                id,
                cuota_id,
                cuenta_id,
                monto,
                medio_pago,
                fecha_pago,
                numero_comprobante,
                banco_origen,
                observacion,
                estado,
                created_at
                `
            )
            .eq(
                "cuota_id",
                cuota.id
            )
            .order(
                "fecha_pago",
                {
                    ascending: true
                }
            );


    if (
        resultado.error
    ) {

        console.error(
            "Error al preparar impresión:",
            resultado.error
        );

        alert(
            "No fue posible preparar el historial para impresión."
        );

        return;
    }


    const pagos =
        resultado.data ||
        [];


    const pagosIds =
        pagos.map(
            function (pago) {
                return pago.id;
            }
        );


    comprobantesPorPago = {};


    if (
        pagosIds.length > 0
    ) {

        const resultadoComprobantes =
            await supabaseClient
                .from(
                    "comprobantes_cuota"
                )
                .select(
                    `
                    id,
                    pago_id,
                    numero,
                    estado,
                    fecha_emision
                    `
                )
                .in(
                    "pago_id",
                    pagosIds
                );


        if (
            !resultadoComprobantes.error
        ) {

            (
                resultadoComprobantes.data ||
                []
            ).forEach(
                function (
                    comprobante
                ) {

                    comprobantesPorPago[
                        comprobante.pago_id
                    ] =
                        comprobante;

                }
            );

        }

    }


    const socio =
        obtenerSocio(
            cuota.socio_id
        );


    const periodo =
        obtenerPeriodo(
            cuota.periodo_id
        );


    const nombreSocio =
        socio
            ? construirNombreCompleto(
                socio
            )
            : "—";


    const totalPagado =
        pagos.reduce(
            function (
                total,
                pago
            ) {

                if (
                    pago.estado !==
                    "activo"
                ) {

                    return total;

                }


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


    const montoCuota =
        Number(
            cuota.monto ||
            0
        );


    const saldo =
        Math.max(
            montoCuota -
            totalPagado,
            0
        );


    const fechaGeneracion =
        new Date()
            .toLocaleString(
                "es-CL"
            );


    let filas =
        "";


    pagos.forEach(
        function (pago) {

            const comprobante =
                comprobantesPorPago[
                    pago.id
                ];


            filas +=
                "<tr>" +

                "<td>" +
                escaparHTML(
                    formatearFecha(
                        pago.fecha_pago
                    )
                ) +
                "</td>" +

                "<td class='numero'>" +
                formatearMoneda(
                    pago.monto
                ) +
                "</td>" +

                "<td>" +
                escaparHTML(
                    formatearMedioPago(
                        pago.medio_pago
                    )
                ) +
                "</td>" +

                "<td>" +
                escaparHTML(
                    pago.numero_comprobante ||
                    "—"
                ) +
                "</td>" +

                "<td>" +
                escaparHTML(
                    pago.banco_origen ||
                    "—"
                ) +
                "</td>" +

                "<td>" +
                escaparHTML(
                    comprobante
                        ? comprobante.numero
                        : "Sin emitir"
                ) +
                "</td>" +

                "<td>" +
                escaparHTML(
                    pago.estado ===
                    "activo"
                        ? "Activo"
                        : "Anulado"
                ) +
                "</td>" +

                "</tr>";

        }
    );


    if (
        filas ===
        ""
    ) {

        filas =
            "<tr>" +
            "<td colspan='7'>" +
            "No existen pagos registrados." +
            "</td>" +
            "</tr>";

    }


    const ventana =
        window.open(
            "",
            "_blank"
        );


    if (!ventana) {

        alert(
            "El navegador bloqueó la ventana de impresión."
        );

        return;
    }


    ventana.document.write(
        "<!DOCTYPE html>" +

        "<html lang='es'>" +

        "<head>" +

        "<meta charset='UTF-8'>" +

        "<title>" +
        "Historial de pagos de cuotas" +
        "</title>" +

        "<style>" +

        "@page {" +
        "size: A4;" +
        "margin: 15mm;" +
        "}" +

        "* {" +
        "box-sizing: border-box;" +
        "}" +

        "body {" +
        "margin: 0;" +
        "font-family: Arial, Helvetica, sans-serif;" +
        "color: #17324d;" +
        "background: #fff;" +
        "font-size: 11px;" +
        "}" +

        ".documento {" +
        "width: 100%;" +
        "max-width: 180mm;" +
        "margin: 0 auto;" +
        "}" +

        ".encabezado {" +
        "display: flex;" +
        "justify-content: space-between;" +
        "align-items: center;" +
        "border-bottom: 3px solid #1d5d91;" +
        "padding-bottom: 10px;" +
        "margin-bottom: 15px;" +
        "}" +

        ".encabezado-texto {" +
        "flex: 1;" +
        "}" +

        ".encabezado h1 {" +
        "margin: 0 0 4px 0;" +
        "font-size: 17px;" +
        "color: #174f7d;" +
        "}" +

        ".encabezado h2 {" +
        "margin: 2px 0;" +
        "font-size: 11px;" +
        "font-weight: normal;" +
        "color: #506777;" +
        "}" +

        ".sello {" +
        "width: 78px;" +
        "height: 78px;" +
        "object-fit: contain;" +
        "margin-left: 15px;" +
        "}" +

        ".titulo {" +
        "text-align: center;" +
        "margin: 15px 0;" +
        "}" +

        ".titulo h2 {" +
        "margin: 0;" +
        "font-size: 16px;" +
        "color: #174f7d;" +
        "}" +

        ".datos {" +
        "display: grid;" +
        "grid-template-columns: 1fr 1fr;" +
        "gap: 8px 20px;" +
        "border: 1px solid #bdccd7;" +
        "padding: 11px;" +
        "margin-bottom: 12px;" +
        "}" +

        ".dato strong {" +
        "color: #174f7d;" +
        "}" +

        ".resumen {" +
        "display: grid;" +
        "grid-template-columns: repeat(3, 1fr);" +
        "gap: 8px;" +
        "margin-bottom: 13px;" +
        "}" +

        ".resumen-item {" +
        "border: 1px solid #bdccd7;" +
        "padding: 9px;" +
        "text-align: center;" +
        "}" +

        ".resumen-item strong {" +
        "display: block;" +
        "font-size: 9px;" +
        "text-transform: uppercase;" +
        "color: #5b7182;" +
        "margin-bottom: 3px;" +
        "}" +

        ".resumen-item span {" +
        "font-size: 14px;" +
        "font-weight: bold;" +
        "color: #174f7d;" +
        "}" +

        "table {" +
        "width: 100%;" +
        "border-collapse: collapse;" +
        "margin-top: 8px;" +
        "}" +

        "th {" +
        "background: #174f7d;" +
        "color: #fff;" +
        "padding: 6px;" +
        "text-align: left;" +
        "font-size: 9px;" +
        "}" +

        "td {" +
        "border: 1px solid #cbd6df;" +
        "padding: 6px;" +
        "vertical-align: top;" +
        "}" +

        "tbody tr:nth-child(even) {" +
        "background: #f3f7fa;" +
        "}" +

        ".numero {" +
        "text-align: right;" +
        "white-space: nowrap;" +
        "}" +

        ".nota {" +
        "margin-top: 13px;" +
        "padding: 9px;" +
        "border-left: 4px solid #174f7d;" +
        "background: #f3f7fa;" +
        "color: #506777;" +
        "font-size: 9px;" +
        "}" +

        ".pie {" +
        "margin-top: 15px;" +
        "padding-top: 7px;" +
        "border-top: 1px solid #cbd6df;" +
        "display: flex;" +
        "justify-content: space-between;" +
        "font-size: 8px;" +
        "color: #687b89;" +
        "}" +

        "@media print {" +
        "body {" +
        "print-color-adjust: exact;" +
        "-webkit-print-color-adjust: exact;" +
        "}" +
        "}" +

        "</style>" +

        "</head>" +

        "<body>" +

        "<div class='documento'>" +

        "<div class='encabezado'>" +

        "<div class='encabezado-texto'>" +

        "<h1>" +
        "COMUNIDAD INDÍGENA JUAN CHEUQUELÉN" +
        "</h1>" +

        "<h2>" +
        "RUT: 65.169.427-2" +
        " &nbsp; | &nbsp; " +
        "Personería Jurídica N.º 2314" +
        "</h2>" +

        "<h2>" +
        "Fundada el 27 de julio de 2017" +
        "</h2>" +

        "</div>" +

        "<img " +
        "class='sello' " +
        "src='assets/timbre-comunidad.jpeg' " +
        "alt='Timbre oficial de la comunidad'>" +

        "</div>" +

        "<div class='titulo'>" +

        "<h2>" +
        "HISTORIAL DE PAGOS DE CUOTA" +
        "</h2>" +

        "</div>" +

        "<div class='datos'>" +

        "<div class='dato'>" +
        "<strong>Socio:</strong> " +
        escaparHTML(
            nombreSocio
        ) +
        "</div>" +

        "<div class='dato'>" +
        "<strong>RUT:</strong> " +
        escaparHTML(
            socio &&
            socio.rut
                ? socio.rut
                : "—"
        ) +
        "</div>" +

        "<div class='dato'>" +
        "<strong>Período:</strong> " +
        escaparHTML(
            periodo
                ? String(
                    periodo.anio
                )
                : "—"
        ) +
        "</div>" +

        "<div class='dato'>" +
        "<strong>Concepto:</strong> " +
        "Cuota socio" +
        "</div>" +

        "</div>" +

        "<div class='resumen'>" +

        "<div class='resumen-item'>" +
        "<strong>Monto cuota</strong>" +
        "<span>" +
        formatearMoneda(
            montoCuota
        ) +
        "</span>" +
        "</div>" +

        "<div class='resumen-item'>" +
        "<strong>Total pagado</strong>" +
        "<span>" +
        formatearMoneda(
            totalPagado
        ) +
        "</span>" +
        "</div>" +

        "<div class='resumen-item'>" +
        "<strong>Saldo</strong>" +
        "<span>" +
        formatearMoneda(
            saldo
        ) +
        "</span>" +
        "</div>" +

        "</div>" +

        "<table>" +

        "<thead>" +

        "<tr>" +

        "<th>Fecha de pago</th>" +

        "<th>Monto</th>" +

        "<th>Medio</th>" +

        "<th>N.º transferencia</th>" +

        "<th>Banco origen</th>" +

        "<th>Comprobante</th>" +

        "<th>Estado</th>" +

        "</tr>" +

        "</thead>" +

        "<tbody>" +

        filas +

        "</tbody>" +

        "</table>" +

        "<div class='nota'>" +

        "Este documento corresponde exclusivamente " +
        "al historial interno de pagos registrados " +
        "por la Comunidad Indígena Juan Cheuquelén. " +
        "La fecha de generación de este historial " +
        "no modifica las fechas originales de los " +
        "pagos registrados." +

        "</div>" +

        "<div class='pie'>" +

        "<span>" +
        "Documento interno de la comunidad" +
        "</span>" +

        "<span>" +
        "Generado: " +
        escaparHTML(
            fechaGeneracion
        ) +
        "</span>" +

        "</div>" +

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
        500
    );

}


// ============================================================
// ACTUALIZAR RESUMEN
// ============================================================

function actualizarResumen() {

    const totalCuotas =
        cuotas.length;


    const totalMonto =
        cuotas.reduce(
            function (
                total,
                cuota
            ) {

                return (
                    total +
                    Number(
                        cuota.monto ||
                        0
                    )
                );

            },
            0
        );


    const totalPagado =
        cuotas.reduce(
            function (
                total,
                cuota
            ) {

                return (
                    total +
                    Number(
                        cuota.total_pagado ||
                        0
                    )
                );

            },
            0
        );


    const totalSaldo =
        Math.max(
            totalMonto -
            totalPagado,
            0
        );


    const elementoTotal =
        document.getElementById(
            "totalCuotas"
        );


    const elementoMonto =
        document.getElementById(
            "totalMonto"
        );


    const elementoPagado =
        document.getElementById(
            "totalPagado"
        );


    const elementoSaldo =
        document.getElementById(
            "totalSaldo"
        );


    if (elementoTotal) {

        elementoTotal.textContent =
            totalCuotas;

    }


    if (elementoMonto) {

        elementoMonto.textContent =
            formatearMoneda(
                totalMonto
            );

    }


    if (elementoPagado) {

        elementoPagado.textContent =
            formatearMoneda(
                totalPagado
            );

    }


    if (elementoSaldo) {

        elementoSaldo.textContent =
            formatearMoneda(
                totalSaldo
            );

    }

}


// ============================================================
// ACTUALIZAR CONTADOR
// ============================================================

function actualizarContador(
    cantidad
) {

    const elemento =
        document.getElementById(
            "contadorCuotas"
        );


    if (elemento) {

        elemento.textContent =
            cantidad;

    }

}


// ============================================================
// OBTENER SOCIO
// ============================================================

function obtenerSocio(
    socioId
) {

    return socios.find(
        function (socio) {

            return Number(
                socio.id
            ) ===
            Number(
                socioId
            );

        }
    ) || null;

}


// ============================================================
// OBTENER PERÍODO
// ============================================================

function obtenerPeriodo(
    periodoId
) {

    return periodos.find(
        function (periodo) {

            return Number(
                periodo.id
            ) ===
            Number(
                periodoId
            );

        }
    ) || null;

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
                    parte !== null &&
                    parte !== undefined &&
                    String(
                        parte
                    ).trim() !== ""
                );

            }
        )
        .join(" ")
        .trim();

}


// ============================================================
// FORMATEAR MONEDA
// ============================================================

function formatearMoneda(
    valor
) {

    const numero =
        Number(
            valor || 0
        );


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


    const partes =
        String(
            fecha
        ).split("-");


    if (
        partes.length ===
        3
    ) {

        return (
            partes[2] +
            "/" +
            partes[1] +
            "/" +
            partes[0]
        );

    }


    const fechaObj =
        new Date(
            fecha
        );


    if (
        Number.isNaN(
            fechaObj.getTime()
        )
    ) {

        return String(
            fecha
        );

    }


    return fechaObj.toLocaleDateString(
        "es-CL"
    );

}


// ============================================================
// FECHA ACTUAL
// ============================================================

function obtenerFechaActual() {

    const ahora =
        new Date();


    const year =
        ahora.getFullYear();


    const mes =
        String(
            ahora.getMonth() + 1
        ).padStart(
            2,
            "0"
        );


    const dia =
        String(
            ahora.getDate()
        ).padStart(
            2,
            "0"
        );


    return (
        year +
        "-" +
        mes +
        "-" +
        dia
    );

}


// ============================================================
// MEDIO DE PAGO
// ============================================================

function formatearMedioPago(
    medio
) {

    const medios = {

        efectivo:
            "Efectivo",

        transferencia:
            "Transferencia",

        deposito:
            "Depósito",

        cheque:
            "Cheque",

        otro:
            "Otro"

    };


    return (
        medios[
            medio
        ] ||
        medio ||
        "—"
    );

}


// ============================================================
// ESTADO VISUAL
// ============================================================

function obtenerClaseEstado(
    estado
) {

    switch (
        estado
    ) {

        case "pagada":

            return "estado-pagada";

        case "parcial":

            return "estado-parcial";

        case "anulada":

            return "estado-anulada";

        case "pendiente":

        default:

            return "estado-pendiente";

    }

}


// ============================================================
// TRADUCIR ESTADO
// ============================================================

function traducirEstado(
    estado
) {

    switch (
        estado
    ) {

        case "pagada":

            return "Pagada";

        case "parcial":

            return "Parcial";

        case "anulada":

            return "Anulada";

        case "pendiente":

        default:

            return "Pendiente";

    }

}


// ============================================================
// ESTADO DE PAGO
// ============================================================

function construirEstadoPago(
    pago
) {

    if (
        pago.estado ===
        "anulado"
    ) {

        return (
            "<span class='estado-anulado'>" +
            "Anulado" +
            "</span>"
        );

    }


    return (
        "<span class='estado-activo'>" +
        "Activo" +
        "</span>"
    );

}


// ============================================================
// ESCAPAR HTML
// ============================================================

function escaparHTML(
    valor
) {

    if (
        valor === null ||
        valor === undefined
    ) {

        return "";

    }


    return String(
        valor
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

    if (
        error &&
        error.message
    ) {

        return error.message;

    }


    if (
        error &&
        error.details
    ) {

        return error.details;

    }


    if (
        error &&
        error.hint
    ) {

        return error.hint;

    }


    return (
        "No fue posible completar la operación."
    );

}


// ============================================================
// EVENTOS DE COMPROBANTES
// ============================================================

document.addEventListener(
    "click",
    function (event) {

        const boton =
            event.target.closest(
                "[data-accion='emitir-comprobante']"
            );


        if (!boton) {
            return;
        }


        const pagoId =
            Number(
                boton.dataset.id
            );


        emitirComprobanteRetroactivo(
            pagoId
        );

    }
);


// ============================================================
// BOTÓN COMPROBANTES
// ============================================================

function configurarBotonComprobantes() {

    const boton =
        document.getElementById(
            "verComprobantes"
        );


    if (boton) {

        boton.addEventListener(
            "click",
            function () {

                window.location.href =
                    "comprobantes.html";

            }
        );

    }


    const botonCabecera =
        document.getElementById(
            "irComprobantesButton"
        );


    if (botonCabecera) {

        botonCabecera.addEventListener(
            "click",
            function () {

                window.location.href =
                    "comprobantes.html";

            }
        );

    }

}


// ============================================================
// INICIALIZAR BOTONES ADICIONALES
// ============================================================

document.addEventListener(
    "DOMContentLoaded",
    function () {

        configurarBotonComprobantes();

    }
);

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


    const recaudadoElemento =
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


    if (recaudadoElemento) {

        recaudadoElemento.textContent =
            formatearMoneda(
                recaudado
            );

    }

}


// ============================================================
// CERRAR MODAL DE HISTORIAL
// ============================================================

function cerrarModalHistorial() {

    const modal =
        document.getElementById(
            "modalHistorial"
        );


    if (!modal) {

        return;

    }


    modal.classList.remove(
        "mostrar"
    );

}


// ============================================================
// CERRAR MODAL DE PAGO
// ============================================================

function cerrarModalPago() {

    const modal =
        document.getElementById(
            "modalPago"
        );


    if (!modal) {

        return;

    }


    modal.classList.remove(
        "mostrar"
    );


    const formulario =
        document.getElementById(
            "formPago"
        );


    if (formulario) {

        formulario.reset();

    }


    const pagoCuotaId =
        document.getElementById(
            "pagoCuotaId"
        );


    if (pagoCuotaId) {

        pagoCuotaId.value =
            "";

    }


    const cuotaSeleccionada =
        document.getElementById(
            "cuotaSeleccionada"
        );


    if (cuotaSeleccionada) {

        cuotaSeleccionada.value =
            "";

    }

}


// ============================================================
// CERRAR MODAL AL HACER CLICK FUERA
// ============================================================

document.addEventListener(
    "click",
    function (evento) {

        const modalPago =
            document.getElementById(
                "modalPago"
            );


        const modalHistorial =
            document.getElementById(
                "modalHistorial"
            );


        if (
            evento.target ===
            modalPago
        ) {

            cerrarModalPago();

        }


        if (
            evento.target ===
            modalHistorial
        ) {

            cerrarModalHistorial();

        }

    }
);


// ============================================================
// TECLA ESC
// ============================================================

document.addEventListener(
    "keydown",
    function (evento) {

        if (
            evento.key !==
            "Escape"
        ) {

            return;

        }


        cerrarModalPago();

        cerrarModalHistorial();

    }
);


// ============================================================
// EVENTOS DINÁMICOS DE TABLA
// ============================================================

document.addEventListener(
    "click",
    async function (evento) {

        const botonPago =
            evento.target.closest(
                ".boton-pagar-cuota"
            );


        if (botonPago) {

            const cuotaId =
                botonPago.dataset.id;


            if (cuotaId) {

                abrirModalPago(
                    cuotaId
                );

            }

            return;

        }


        const botonHistorial =
            evento.target.closest(
                ".boton-historial-pagos"
            );


        if (botonHistorial) {

            const cuotaId =
                botonHistorial.dataset.id;


            if (cuotaId) {

                abrirHistorial(
                    cuotaId
                );

            }

            return;

        }


        const botonComprobante =
            evento.target.closest(
                ".boton-comprobante-pago"
            );


        if (botonComprobante) {

            const pagoId =
                botonComprobante.dataset.id;


            if (pagoId) {

                abrirComprobante(
                    pagoId
                );

            }

            return;

        }


        const botonEmitir =
            evento.target.closest(
                ".boton-emitir-comprobante"
            );


        if (botonEmitir) {

            const pagoId =
                botonEmitir.dataset.id;


            if (pagoId) {

                await emitirComprobante(
                    pagoId
                );

            }

            return;

        }


        const botonAnular =
            evento.target.closest(
                ".boton-anular-pago"
            );


        if (botonAnular) {

            const pagoId =
                botonAnular.dataset.id;


            const cuotaId =
                botonAnular.dataset.cuotaId;


            if (pagoId) {

                await anularPago(
                    pagoId,
                    cuotaId
                );

            }

            return;

        }

    }
);


// ============================================================
// FILTROS
// ============================================================

function configurarFiltros() {

    const filtroSocio =
        document.getElementById(
            "filtroSocio"
        );


    const filtroEstado =
        document.getElementById(
            "filtroEstado"
        );


    const filtroPeriodo =
        document.getElementById(
            "filtroPeriodo"
        );


    if (filtroSocio) {

        filtroSocio.addEventListener(
            "input",
            function () {

                aplicarFiltros();

            }
        );

    }


    if (filtroEstado) {

        filtroEstado.addEventListener(
            "change",
            function () {

                aplicarFiltros();

            }
        );

    }


    if (filtroPeriodo) {

        filtroPeriodo.addEventListener(
            "change",
            function () {

                aplicarFiltros();

            }
        );

    }

}


// ============================================================
// LIMPIAR FILTROS
// ============================================================

function limpiarFiltros() {

    const filtroSocio =
        document.getElementById(
            "filtroSocio"
        );


    const filtroEstado =
        document.getElementById(
            "filtroEstado"
        );


    const filtroPeriodo =
        document.getElementById(
            "filtroPeriodo"
        );


    if (filtroSocio) {

        filtroSocio.value =
            "";

    }


    if (filtroEstado) {

        filtroEstado.value =
            "";

    }


    if (filtroPeriodo) {

        filtroPeriodo.value =
            "";

    }


    aplicarFiltros();

}


// ============================================================
// CARGAR PERÍODOS EN FILTRO
// ============================================================

function cargarFiltroPeriodos() {

    const select =
        document.getElementById(
            "filtroPeriodo"
        );


    if (!select) {

        return;

    }


    select.innerHTML =
        "<option value=''>Todos los períodos</option>";


    periodos.forEach(
        function (periodo) {

            const option =
                document.createElement(
                    "option"
                );


            option.value =
                periodo.id;


            option.textContent =
                periodo.anio;


            select.appendChild(
                option
            );

        }
    );

}


// ============================================================
// CARGAR DATOS INICIALES
// ============================================================

async function iniciar() {

    try {

        mostrarCargando(
            true
        );


        await cargarUsuario();


        if (
            !usuarioActual
        ) {

            return;

        }


        if (
            usuarioActual.rol ===
            "consulta"
        ) {

            window.location.href =
                "reportes.html";

            return;

        }


        await cargarDatosBase();

        await cargarCuotas();

        configurarFiltros();

        cargarFiltroPeriodos();

        actualizarResumen();

    }

    catch (error) {

        console.error(
            "Error al iniciar página:",
            error
        );


        mostrarError(
            error
        );

    }

    finally {

        mostrarCargando(
            false
        );

    }

}


// ============================================================
// INICIO
// ============================================================

document.addEventListener(
    "DOMContentLoaded",
    function () {

        iniciar();

    }
);
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
