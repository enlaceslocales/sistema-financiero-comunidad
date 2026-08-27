/* ============================================================
   SISTEMA FINANCIERO
   MODULO DE FINANZAS
   ============================================================ */

let usuarioActual = null;
let perfilUsuario = null;

let movimientos = [];
let cuentas = [];
let periodos = [];


/* ============================================================
   INICIAR MODULO
   ============================================================ */

document.addEventListener(
    "DOMContentLoaded",
    async function () {

        await verificarSesion();

    }
);


/* ============================================================
   VERIFICAR SESION
   ============================================================ */

async function verificarSesion() {

    const resultadoSesion =
        await supabaseClient.auth.getSession();

    const session =
        resultadoSesion.data.session;

    const sessionError =
        resultadoSesion.error;


    if (sessionError) {

        console.error(
            "Error al comprobar la sesion:",
            sessionError
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


    const perfil =
        resultadoPerfil.data;

    const error =
        resultadoPerfil.error;


    if (error) {

        console.error(
            "Error al obtener el perfil:",
            error
        );

        alert(
            "No fue posible cargar el perfil del usuario."
        );

        return;
    }


    if (!perfil || !perfil.activo) {

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


    mostrarUsuario();

    configurarPermisos();

    configurarEventos();

    await cargarPeriodos();

    await cargarCuentas();

    await cargarMovimientos();

}


/* ============================================================
   MOSTRAR USUARIO
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

}


/* ============================================================
   PERMISOS
   ============================================================ */

function configurarPermisos() {

    const boton =
        document.getElementById(
            "nuevoMovimientoButton"
        );


    if (!boton) {
        return;
    }


    /*
       Administrador y Tesorero pueden registrar
       movimientos.

       Consulta solamente puede visualizar.
    */

    if (
        perfilUsuario.rol === "administrador" ||
        perfilUsuario.rol === "tesorero"
    ) {

        boton.style.display =
            "inline-flex";

    } else {

        boton.style.display =
            "none";

    }

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


    const cuenta =
        document.getElementById(
            "cuentaSelect"
        );


    if (cuenta) {

        cuenta.addEventListener(
            "change",
            aplicarFiltros
        );

    }


    const tipo =
        document.getElementById(
            "tipoSelect"
        );


    if (tipo) {

        tipo.addEventListener(
            "change",
            aplicarFiltros
        );

    }


    const origen =
        document.getElementById(
            "origenSelect"
        );


    if (origen) {

        origen.addEventListener(
            "change",
            aplicarFiltros
        );

    }


    const fechaDesde =
        document.getElementById(
            "fechaDesde"
        );


    if (fechaDesde) {

        fechaDesde.addEventListener(
            "change",
            aplicarFiltros
        );

    }


    const fechaHasta =
        document.getElementById(
            "fechaHasta"
        );


    if (fechaHasta) {

        fechaHasta.addEventListener(
            "change",
            aplicarFiltros
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


    /* ========================================================
       NUEVO MOVIMIENTO
       ======================================================== */

    const nuevo =
        document.getElementById(
            "nuevoMovimientoButton"
        );


    if (nuevo) {

        nuevo.addEventListener(
            "click",
            abrirNuevoMovimiento
        );

    }


    const cerrarNuevo =
        document.getElementById(
            "cerrarModalNuevoMovimiento"
        );


    if (cerrarNuevo) {

        cerrarNuevo.addEventListener(
            "click",
            cerrarNuevoMovimiento
        );

    }


    const cancelarNuevo =
        document.getElementById(
            "cancelarNuevoMovimiento"
        );


    if (cancelarNuevo) {

        cancelarNuevo.addEventListener(
            "click",
            cerrarNuevoMovimiento
        );

    }


    const formulario =
        document.getElementById(
            "formNuevoMovimiento"
        );


    if (formulario) {

        formulario.addEventListener(
            "submit",
            guardarMovimiento
        );

    }


    const modalNuevo =
        document.getElementById(
            "modalNuevoMovimiento"
        );


    if (modalNuevo) {

        modalNuevo.addEventListener(
            "click",
            function (event) {

                if (
                    event.target ===
                    modalNuevo
                ) {

                    cerrarNuevoMovimiento();

                }

            }
        );

    }


    /*
       Eventos para actualizar en tiempo real
       la disponibilidad de la cuenta.
    */

    const nuevaCuenta =
        document.getElementById(
            "nuevoCuenta"
        );


    if (nuevaCuenta) {

        nuevaCuenta.addEventListener(
            "change",
            actualizarAdvertenciaSaldo
        );

    }


    const nuevoTipo =
        document.getElementById(
            "nuevoTipo"
        );


    if (nuevoTipo) {

        nuevoTipo.addEventListener(
            "change",
            actualizarAdvertenciaSaldo
        );

    }


    const nuevoMonto =
        document.getElementById(
            "nuevoMonto"
        );


    if (nuevoMonto) {

        nuevoMonto.addEventListener(
            "input",
            actualizarAdvertenciaSaldo
        );

    }


    /* ========================================================
       MODAL DETALLE
       ======================================================== */

    const cerrar =
        document.getElementById(
            "cerrarModalMovimiento"
        );


    if (cerrar) {

        cerrar.addEventListener(
            "click",
            cerrarModalMovimiento
        );

    }


    const cerrarDetalle =
        document.getElementById(
            "cerrarDetalle"
        );


    if (cerrarDetalle) {

        cerrarDetalle.addEventListener(
            "click",
            cerrarModalMovimiento
        );

    }


    const modal =
        document.getElementById(
            "modalMovimiento"
        );


    if (modal) {

        modal.addEventListener(
            "click",
            function (event) {

                if (
                    event.target === modal
                ) {

                    cerrarModalMovimiento();

                }

            }
        );

    }


    /* ========================================================
       LOGOUT
       ======================================================== */

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


/* ============================================================
   CARGAR PERIODOS
   ============================================================ */

async function cargarPeriodos() {

    const select =
        document.getElementById(
            "periodoSelect"
        );

    const nuevoPeriodo =
        document.getElementById(
            "nuevoPeriodo"
        );


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


    if (resultado.error) {

        console.error(
            "Error al cargar periodos:",
            resultado.error
        );


        if (select) {

            select.innerHTML =
                '<option value="">Error al cargar</option>';

        }

        return;
    }


    periodos =
        resultado.data || [];


    /* ========================================================
       SELECT DE FILTRO
       ======================================================== */

    if (select) {

        select.innerHTML =
            '<option value="">Todos los periodos</option>';


        periodos.forEach(
            function (periodo) {

                const option =
                    document.createElement(
                        "option"
                    );


                option.value =
                    periodo.id;


                option.textContent =
                    `${periodo.anio} — ${capitalizar(periodo.estado)}`;


                select.appendChild(
                    option
                );

            }
        );


        if (periodos.length > 0) {

            select.value =
                periodos[0].id;

        }

    }


    /* ========================================================
       SELECT DEL FORMULARIO
       ======================================================== */

    if (nuevoPeriodo) {

        nuevoPeriodo.innerHTML =
            '<option value="">Seleccione un período</option>';


        periodos.forEach(
            function (periodo) {

                const option =
                    document.createElement(
                        "option"
                    );


                option.value =
                    periodo.id;


                option.textContent =
                    `${periodo.anio} — ${capitalizar(periodo.estado)}`;


                nuevoPeriodo.appendChild(
                    option
                );

            }
        );


        if (periodos.length > 0) {

            nuevoPeriodo.value =
                periodos[0].id;

        }

    }

}


/* ============================================================
   CARGAR CUENTAS
   ============================================================ */

async function cargarCuentas() {

    const select =
        document.getElementById(
            "cuentaSelect"
        );

    const nuevaCuenta =
        document.getElementById(
            "nuevoCuenta"
        );


    const resultado =
        await supabaseClient
            .from("cuentas")
            .select(
                "id, nombre, tipo, banco, numero_cuenta, saldo_inicial, activo"
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

        return;
    }


    cuentas =
        resultado.data || [];


    /* ========================================================
       SELECT FILTRO
       ======================================================== */

    if (select) {

        select.innerHTML =
            '<option value="">Todas las cuentas</option>';


        cuentas.forEach(
            function (cuenta) {

                const option =
                    document.createElement(
                        "option"
                    );


                option.value =
                    cuenta.id;


                option.textContent =
                    cuenta.nombre +
                    (
                        cuenta.activo
                            ? ""
                            : " — Inactiva"
                    );


                select.appendChild(
                    option
                );

            }
        );

    }


    /* ========================================================
       SELECT NUEVO MOVIMIENTO
       ======================================================== */

    if (nuevaCuenta) {

        nuevaCuenta.innerHTML =
            '<option value="">Seleccione una cuenta</option>';


        cuentas
            .filter(
                function (cuenta) {

                    return cuenta.activo === true;

                }
            )
            .forEach(
                function (cuenta) {

                    const option =
                        document.createElement(
                            "option"
                        );


                    option.value =
                        cuenta.id;


                    option.textContent =
                        cuenta.nombre;


                    nuevaCuenta.appendChild(
                        option
                    );

                }
            );

    }

}


/* ============================================================
   CARGAR MOVIMIENTOS
   ============================================================ */

async function cargarMovimientos() {

    const tabla =
        document.getElementById(
            "tablaMovimientos"
        );


    if (tabla) {

        tabla.innerHTML =
            '<tr>' +
            '<td colspan="8" class="tabla-cargando">' +
            'Cargando movimientos...' +
            '</td>' +
            '</tr>';

    }


    const resultado =
        await supabaseClient
            .from("movimientos")
            .select(
                "id, periodo_id, cuenta_id, fecha_movimiento, tipo, monto, origen, referencia_id, descripcion, observacion, created_at, created_by, subtipo"
            )
            .order(
                "fecha_movimiento",
                {
                    ascending: false
                }
            )
            .order(
                "id",
                {
                    ascending: false
                }
            );


    if (resultado.error) {

        console.error(
            "Error al cargar movimientos:",
            resultado.error
        );


        if (tabla) {

            tabla.innerHTML =
                '<tr>' +
                '<td colspan="8" class="tabla-cargando">' +
                'No fue posible cargar los movimientos.' +
                '</td>' +
                '</tr>';

        }


        actualizarResumen([]);

        return;
    }


    movimientos =
        resultado.data || [];


    aplicarFiltros();

}


/* ============================================================
   APLICAR FILTROS
   ============================================================ */

function aplicarFiltros() {

    const periodo =
        document.getElementById(
            "periodoSelect"
        );

    const cuenta =
        document.getElementById(
            "cuentaSelect"
        );

    const tipo =
        document.getElementById(
            "tipoSelect"
        );

    const origen =
        document.getElementById(
            "origenSelect"
        );

    const fechaDesde =
        document.getElementById(
            "fechaDesde"
        );

    const fechaHasta =
        document.getElementById(
            "fechaHasta"
        );


    const periodoId =
        periodo
            ? periodo.value
            : "";


    const cuentaId =
        cuenta
            ? cuenta.value
            : "";


    const tipoValor =
        tipo
            ? tipo.value
            : "todos";


    const origenValor =
        origen
            ? origen.value
            : "todos";


    const desde =
        fechaDesde
            ? fechaDesde.value
            : "";


    const hasta =
        fechaHasta
            ? fechaHasta.value
            : "";


    const filtrados =
        movimientos.filter(
            function (movimiento) {

                const coincidePeriodo =
                    !periodoId ||
                    String(
                        movimiento.periodo_id
                    ) ===
                    String(periodoId);


                const coincideCuenta =
                    !cuentaId ||
                    String(
                        movimiento.cuenta_id
                    ) ===
                    String(cuentaId);


                const coincideTipo =
                    tipoValor === "todos" ||
                    movimiento.tipo ===
                    tipoValor;


                const coincideOrigen =
                    origenValor === "todos" ||
                    movimiento.origen ===
                    origenValor;


                const fecha =
                    movimiento.fecha_movimiento ||
                    "";


                const coincideDesde =
                    !desde ||
                    fecha >= desde;


                const coincideHasta =
                    !hasta ||
                    fecha <= hasta;


                return (
                    coincidePeriodo &&
                    coincideCuenta &&
                    coincideTipo &&
                    coincideOrigen &&
                    coincideDesde &&
                    coincideHasta
                );

            }
        );


    renderizarMovimientos(
        filtrados
    );


    actualizarResumen(
        filtrados
    );


    actualizarContador(
        filtrados.length,
        movimientos.length
    );

}


/* ============================================================
   RENDERIZAR MOVIMIENTOS
   ============================================================ */

function renderizarMovimientos(lista) {

    const tabla =
        document.getElementById(
            "tablaMovimientos"
        );


    if (!tabla) {
        return;
    }


    tabla.innerHTML =
        "";


    if (lista.length === 0) {

        tabla.innerHTML =
            '<tr>' +
            '<td colspan="8" class="tabla-cargando">' +
            'No se encontraron movimientos.' +
            '</td>' +
            '</tr>';

        return;
    }


    lista.forEach(
        function (movimiento) {

            const fila =
                document.createElement(
                    "tr"
                );


            const cuenta =
                obtenerCuenta(
                    movimiento.cuenta_id
                );


            const nombreCuenta =
                cuenta
                    ? cuenta.nombre
                    : "Cuenta no encontrada";


            const tipo =
                movimiento.tipo ||
                "";


            const origen =
                movimiento.origen ||
                "";


            const monto =
                formatearMoneda(
                    movimiento.monto
                );


            const claseMonto =
                tipo === "ingreso"
                    ? "estado-activo"
                    : "estado-inactivo";


            const descripcion =
                movimiento.descripcion ||
                "—";


            fila.innerHTML =

                '<td>' +
                formatearFecha(
                    movimiento.fecha_movimiento
                ) +
                '</td>' +

                '<td>' +
                escaparHTML(
                    nombreCuenta
                ) +
                '</td>' +

                '<td>' +
                '<span class="' +
                claseMonto +
                '">' +
                traducirTipo(tipo) +
                '</span>' +
                '</td>' +

                '<td>' +
                escaparHTML(
                    traducirOrigen(origen)
                ) +
                '</td>' +

                '<td>' +
                escaparHTML(
                    descripcion
                ) +
                '</td>' +

                '<td><strong>' +
                monto +
                '</strong></td>' +

                '<td>' +
                escaparHTML(
                    traducirSubtipo(
                        movimiento.subtipo
                    )
                ) +
                '</td>' +

                '<td>' +

                '<button ' +
                'type="button" ' +
                'class="boton-tabla" ' +
                'data-accion="detalle" ' +
                'data-id="' +
                movimiento.id +
                '">' +

                'Detalle' +

                '</button>' +

                '</td>';


            tabla.appendChild(
                fila
            );

        }
    );


    const botones =
        tabla.querySelectorAll(
            '[data-accion="detalle"]'
        );


    botones.forEach(
        function (boton) {

            boton.addEventListener(
                "click",
                function () {

                    abrirDetalleMovimiento(
                        Number(
                            boton.dataset.id
                        )
                    );

                }
            );

        }
    );

}


/* ============================================================
   ACTUALIZAR RESUMEN
   ============================================================ */

function actualizarResumen(lista) {

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
            "totalIngresos"
        );


    const elementoEgresos =
        document.getElementById(
            "totalEgresos"
        );


    const elementoSaldo =
        document.getElementById(
            "saldoActual"
        );


    const elementoMovimientos =
        document.getElementById(
            "totalMovimientos"
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

    }


    if (elementoMovimientos) {

        elementoMovimientos.textContent =
            lista.length;

    }

}


/* ============================================================
   CONTADOR
   ============================================================ */

function actualizarContador(
    visible,
    total
) {

    const contador =
        document.getElementById(
            "contadorMovimientos"
        );


    if (!contador) {
        return;
    }


    if (total === 0) {

        contador.textContent =
            "No existen movimientos registrados.";

        return;
    }


    if (visible !== total) {

        contador.textContent =
            visible +
            " de " +
            total +
            " movimientos";

        return;
    }


    contador.textContent =
        total === 1
            ? "1 movimiento registrado"
            : total +
              " movimientos registrados";

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
   OBTENER PERIODO
   ============================================================ */

function obtenerPeriodo(id) {

    return periodos.find(
        function (periodo) {

            return (
                Number(periodo.id) ===
                Number(id)
            );

        }
    );

}


/* ============================================================
   CALCULAR SALDO DISPONIBLE DE UNA CUENTA
   ============================================================ */

/*
   El saldo disponible se calcula utilizando:

   saldo_inicial
   + todos los ingresos registrados
   - todos los egresos registrados

   Importante:
   Se utilizan TODOS los movimientos de la cuenta,
   independientemente de los filtros actualmente
   aplicados en pantalla.
*/

function calcularSaldoCuenta(cuentaId) {

    const cuenta =
        obtenerCuenta(
            cuentaId
        );


    if (!cuenta) {

        return {
            saldoInicial: 0,
            ingresos: 0,
            egresos: 0,
            disponible: 0
        };

    }


    const saldoInicial =
        Number(
            cuenta.saldo_inicial
        ) || 0;


    let ingresos = 0;
    let egresos = 0;


    movimientos.forEach(
        function (movimiento) {

            if (
                Number(
                    movimiento.cuenta_id
                ) !==
                Number(cuentaId)
            ) {

                return;

            }


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


    const disponible =
        saldoInicial +
        ingresos -
        egresos;


    return {
        saldoInicial,
        ingresos,
        egresos,
        disponible
    };

}


/* ============================================================
   CREAR / OBTENER ADVERTENCIA DE SALDO
   ============================================================ */

function obtenerElementoAdvertenciaSaldo() {

    let advertencia =
        document.getElementById(
            "advertenciaSaldoMovimiento"
        );


    if (advertencia) {

        return advertencia;

    }


    const monto =
        document.getElementById(
            "nuevoMonto"
        );


    if (!monto) {

        return null;

    }


    advertencia =
        document.createElement(
            "div"
        );


    advertencia.id =
        "advertenciaSaldoMovimiento";


    advertencia.style.marginTop =
        "8px";

    advertencia.style.padding =
        "10px 12px";

    advertencia.style.borderRadius =
        "6px";

    advertencia.style.fontSize =
        "14px";

    advertencia.style.lineHeight =
        "1.4";

    advertencia.style.display =
        "none";


    /*
       Se coloca inmediatamente después
       del campo de monto.
    */

    monto.parentNode.insertBefore(
        advertencia,
        monto.nextSibling
    );


    return advertencia;

}


/* ============================================================
   ACTUALIZAR ADVERTENCIA DE SALDO
   ============================================================ */

function actualizarAdvertenciaSaldo() {

    const advertencia =
        obtenerElementoAdvertenciaSaldo();


    if (!advertencia) {

        return;

    }


    const cuenta =
        document.getElementById(
            "nuevoCuenta"
        );


    const tipo =
        document.getElementById(
            "nuevoTipo"
        );


    const monto =
        document.getElementById(
            "nuevoMonto"
        );


    if (
        !cuenta ||
        !tipo ||
        !monto
    ) {

        return;

    }


    const cuentaId =
        Number(
            cuenta.value
        );


    const tipoValor =
        tipo.value;


    const montoValor =
        Number(
            monto.value
        ) || 0;


    /*
       Si no se ha seleccionado cuenta,
       no mostramos información.
    */

    if (!cuentaId) {

        advertencia.style.display =
            "none";

        return;

    }


    const datos =
        calcularSaldoCuenta(
            cuentaId
        );


    /*
       Si se selecciona ingreso,
       mostramos el saldo actual.
    */

    if (
        tipoValor ===
        "ingreso"
    ) {

        advertencia.style.display =
            "block";

        advertencia.style.backgroundColor =
            "#eef6ff";

        advertencia.style.border =
            "1px solid #b8d8f5";

        advertencia.style.color =
            "#24506f";


        advertencia.innerHTML =
            "<strong>Saldo disponible actual:</strong> " +
            formatearMoneda(
                datos.disponible
            ) +
            "<br>" +
            "<small>" +
            "Este ingreso aumentará el saldo disponible a " +
            formatearMoneda(
                datos.disponible +
                montoValor
            ) +
            "." +
            "</small>";


        return;

    }


    /*
       Si no es egreso, mostrar información
       general de saldo.
    */

    if (
        tipoValor !==
        "egreso"
    ) {

        advertencia.style.display =
            "block";

        advertencia.style.backgroundColor =
            "#f5f5f5";

        advertencia.style.border =
            "1px solid #dddddd";

        advertencia.style.color =
            "#555555";


        advertencia.innerHTML =
            "<strong>Saldo disponible:</strong> " +
            formatearMoneda(
                datos.disponible
            );


        return;

    }


    /*
       EGRESO
    */

    const saldoDespues =
        datos.disponible -
        montoValor;


    advertencia.style.display =
        "block";


    if (
        montoValor > 0 &&
        montoValor >
        datos.disponible
    ) {

        /*
           SALDO INSUFICIENTE
        */

        advertencia.style.backgroundColor =
            "#fff1f1";

        advertencia.style.border =
            "1px solid #e0a0a0";

        advertencia.style.color =
            "#9b1c1c";


        advertencia.innerHTML =
            "<strong>⚠ Saldo insuficiente</strong><br>" +
            "Disponible actualmente: " +
            formatearMoneda(
                datos.disponible
            ) +
            "<br>" +
            "Egreso solicitado: " +
            formatearMoneda(
                montoValor
            ) +
            "<br>" +
            "<strong>" +
            "El movimiento dejaría un saldo negativo de " +
            formatearMoneda(
                Math.abs(
                    saldoDespues
                )
            ) +
            "." +
            "</strong>";

    } else {

        /*
           SALDO SUFICIENTE
        */

        advertencia.style.backgroundColor =
            "#eef8f0";

        advertencia.style.border =
            "1px solid #a8d5b0";

        advertencia.style.color =
            "#256333";


        advertencia.innerHTML =
            "<strong>Saldo disponible:</strong> " +
            formatearMoneda(
                datos.disponible
            ) +
            "<br>" +
            "<small>" +
            "Saldo después del egreso: " +
            formatearMoneda(
                saldoDespues
            ) +
            "." +
            "</small>";

    }

}


/* ============================================================
   ABRIR NUEVO MOVIMIENTO
   ============================================================ */

function abrirNuevoMovimiento() {

    if (
        !perfilUsuario ||
        (
            perfilUsuario.rol !== "administrador" &&
            perfilUsuario.rol !== "tesorero"
        )
    ) {

        alert(
            "No tiene permisos para registrar movimientos."
        );

        return;
    }


    const modal =
        document.getElementById(
            "modalNuevoMovimiento"
        );


    const fecha =
        document.getElementById(
            "nuevoFecha"
        );


    const tipo =
        document.getElementById(
            "nuevoTipo"
        );


    const monto =
        document.getElementById(
            "nuevoMonto"
        );


    const descripcion =
        document.getElementById(
            "nuevoDescripcion"
        );


    const observacion =
        document.getElementById(
            "nuevoObservacion"
        );


    if (fecha) {

        /*
           Se utiliza la fecha local del navegador
           para evitar diferencias producidas por UTC.
        */

        const hoy =
            obtenerFechaLocal();

        fecha.value =
            hoy;

    }


    if (tipo) {

        tipo.value =
            "";

    }


    if (monto) {

        monto.value =
            "";

    }


    if (descripcion) {

        descripcion.value =
            "";

    }


    if (observacion) {

        observacion.value =
            "";

    }


    /*
       Limpiar advertencia anterior.
    */

    const advertencia =
        document.getElementById(
            "advertenciaSaldoMovimiento"
        );


    if (advertencia) {

        advertencia.style.display =
            "none";

        advertencia.innerHTML =
            "";

    }


    if (modal) {

        modal.style.display =
            "flex";

    }

}


/* ============================================================
   CERRAR NUEVO MOVIMIENTO
   ============================================================ */

function cerrarNuevoMovimiento() {

    const modal =
        document.getElementById(
            "modalNuevoMovimiento"
        );


    if (modal) {

        modal.style.display =
            "none";

    }


    const advertencia =
        document.getElementById(
            "advertenciaSaldoMovimiento"
        );


    if (advertencia) {

        advertencia.style.display =
            "none";

    }

}


/* ============================================================
   GUARDAR MOVIMIENTO
   ============================================================ */

async function guardarMovimiento(event) {

    event.preventDefault();


    if (
        !perfilUsuario ||
        (
            perfilUsuario.rol !== "administrador" &&
            perfilUsuario.rol !== "tesorero"
        )
    ) {

        alert(
            "No tiene permisos para registrar movimientos."
        );

        return;
    }


    const periodo =
        document.getElementById(
            "nuevoPeriodo"
        );


    const cuenta =
        document.getElementById(
            "nuevoCuenta"
        );


    const tipo =
        document.getElementById(
            "nuevoTipo"
        );


    const fecha =
        document.getElementById(
            "nuevoFecha"
        );


    const monto =
        document.getElementById(
            "nuevoMonto"
        );


    const descripcion =
        document.getElementById(
            "nuevoDescripcion"
        );


    const observacion =
        document.getElementById(
            "nuevoObservacion"
        );


    const periodoId =
        Number(
            periodo.value
        );


    const cuentaId =
        Number(
            cuenta.value
        );


    const tipoValor =
        tipo.value;


    const montoValor =
        Number(
            monto.value
        );


    const fechaValor =
        fecha.value;


    const descripcionValor =
        descripcion.value.trim();


    const observacionValor =
        observacion.value.trim();


    /* ========================================================
       VALIDACIONES
       ======================================================== */

    if (!periodoId) {

        alert(
            "Debe seleccionar un período financiero."
        );

        return;
    }


    if (!cuentaId) {

        alert(
            "Debe seleccionar una cuenta."
        );

        return;
    }


    /*
       Solamente se permiten:
       - ingreso
       - egreso
    */

    if (
        !["ingreso", "egreso"]
            .includes(tipoValor)
    ) {

        alert(
            "Debe seleccionar un tipo de movimiento válido."
        );

        return;
    }


    if (
        !montoValor ||
        montoValor <= 0
    ) {

        alert(
            "El monto debe ser mayor que cero."
        );

        return;
    }


    if (!fechaValor) {

        alert(
            "Debe ingresar la fecha del movimiento."
        );

        return;
    }


    if (!descripcionValor) {

        alert(
            "Debe ingresar una descripción."
        );

        return;
    }


    /* ========================================================
       VALIDAR PERÍODO
       ======================================================== */

    const periodoSeleccionado =
        obtenerPeriodo(
            periodoId
        );


    if (!periodoSeleccionado) {

        alert(
            "El período seleccionado no es válido."
        );

        return;
    }


    if (
        periodoSeleccionado.estado !==
        "abierto"
    ) {

        alert(
            "No se pueden registrar movimientos en un período cerrado."
        );

        return;
    }


    /* ========================================================
       VALIDAR CUENTA
       ======================================================== */

    const cuentaSeleccionada =
        obtenerCuenta(
            cuentaId
        );


    if (!cuentaSeleccionada) {

        alert(
            "La cuenta seleccionada no es válida."
        );

        return;
    }


    if (!cuentaSeleccionada.activo) {

        alert(
            "No se pueden registrar movimientos en una cuenta inactiva."
        );

        return;
    }


    /* ========================================================
       VALIDAR DISPONIBILIDAD PARA EGRESOS
       ======================================================== */

    let saldoCuenta = null;


    if (
        tipoValor ===
        "egreso"
    ) {

        saldoCuenta =
            calcularSaldoCuenta(
                cuentaId
            );


        const saldoDespues =
            saldoCuenta.disponible -
            montoValor;


        if (
            montoValor >
            saldoCuenta.disponible
        ) {

            const confirmarSaldoNegativo =
                confirm(
                    "⚠ ADVERTENCIA DE SALDO\n\n" +

                    "La cuenta seleccionada dispone actualmente de " +
                    formatearMoneda(
                        saldoCuenta.disponible
                    ) +
                    ".\n\n" +

                    "El egreso solicitado es de " +
                    formatearMoneda(
                        montoValor
                    ) +
                    ".\n\n" +

                    "Este movimiento dejaría un saldo negativo de " +
                    formatearMoneda(
                        Math.abs(
                            saldoDespues
                        )
                    ) +
                    ".\n\n" +

                    "¿Está seguro de que desea registrar este egreso?"
                );


            if (!confirmarSaldoNegativo) {

                return;

            }

        }

    }


    /* ========================================================
       CONFIRMACIÓN GENERAL
       ======================================================== */

    const confirmar =
        confirm(
            "¿Desea registrar este movimiento por " +
            formatearMoneda(montoValor) +
            "?"
        );


    if (!confirmar) {

        return;

    }


    const boton =
        document.getElementById(
            "guardarMovimientoButton"
        );


    if (boton) {

        boton.disabled =
            true;

        boton.textContent =
            "Guardando...";

    }


    try {

        /*
           Los pagos de cuotas NO se registran aquí.

           Este formulario solamente genera:
           - ingreso
           - egreso

           Los pagos de cuotas son generados
           automáticamente por pagos_cuotas.
        */


        const nuevoMovimiento = {

            periodo_id:
                periodoId,

            cuenta_id:
                cuentaId,

            fecha_movimiento:
                fechaValor,

            tipo:
                tipoValor,

            monto:
                montoValor,

            /*
               El origen coincide con el tipo.
            */

            origen:
                tipoValor,

            referencia_id:
                null,

            descripcion:
                descripcionValor,

            observacion:
                observacionValor ||
                null,

            created_by:
                usuarioActual.id,

            subtipo:
                "normal"

        };


        console.log(
            "Movimiento a registrar:",
            nuevoMovimiento
        );


        const resultado =
            await supabaseClient
                .from("movimientos")
                .insert(
                    nuevoMovimiento
                )
                .select()
                .single();


        if (resultado.error) {

            console.error(
                "Error al guardar movimiento:",
                resultado.error
            );

            alert(
                "No fue posible registrar el movimiento.\n\n" +
                resultado.error.message
            );

            return;
        }


        console.log(
            "Movimiento registrado:",
            resultado.data
        );


        /*
           Mostrar información adicional cuando
           se registra un egreso.
        */

        if (
            tipoValor ===
            "egreso"
        ) {

            const nuevoSaldo =
                calcularSaldoCuenta(
                    cuentaId
                );


            /*
               El movimiento recién insertado todavía
               no está en el array local, por lo que
               calculamos manualmente el saldo posterior.
            */

            const saldoPosterior =
                nuevoSaldo.disponible -
                montoValor;


            alert(
                "Movimiento registrado correctamente.\n\n" +
                "Saldo disponible después del egreso: " +
                formatearMoneda(
                    saldoPosterior
                )
            );

        } else {

            alert(
                "Movimiento registrado correctamente."
            );

        }


        cerrarNuevoMovimiento();


        await cargarMovimientos();

    }

    catch (error) {

        console.error(
            "Error inesperado:",
            error
        );


        alert(
            "Ocurrió un error inesperado al registrar el movimiento."
        );

    }

    finally {

        if (boton) {

            boton.disabled =
                false;

            boton.textContent =
                "Guardar movimiento";

        }

    }

}


/* ============================================================
   ABRIR DETALLE
   ============================================================ */

function abrirDetalleMovimiento(id) {

    const movimiento =
        movimientos.find(
            function (elemento) {

                return (
                    Number(elemento.id) ===
                    Number(id)
                );

            }
        );


    if (!movimiento) {

        alert(
            "No fue posible encontrar el movimiento seleccionado."
        );

        return;
    }


    const cuenta =
        obtenerCuenta(
            movimiento.cuenta_id
        );


    const periodo =
        obtenerPeriodo(
            movimiento.periodo_id
        );


    establecerTexto(
        "detalleFecha",
        formatearFecha(
            movimiento.fecha_movimiento
        )
    );


    establecerTexto(
        "detalleCuenta",
        cuenta
            ? cuenta.nombre
            : "Cuenta no encontrada"
    );


    establecerTexto(
        "detalleTipo",
        traducirTipo(
            movimiento.tipo
        )
    );


    establecerTexto(
        "detalleOrigen",
        traducirOrigen(
            movimiento.origen
        )
    );


    establecerTexto(
        "detalleMonto",
        formatearMoneda(
            movimiento.monto
        )
    );


    establecerTexto(
        "detalleSubtipo",
        traducirSubtipo(
            movimiento.subtipo
        )
    );


    establecerTexto(
        "detalleDescripcion",
        movimiento.descripcion ||
        ""
    );


    establecerTexto(
        "detalleObservacion",
        movimiento.observacion ||
        ""
    );


    const modal =
        document.getElementById(
            "modalMovimiento"
        );


    if (modal) {

        modal.style.display =
            "flex";

    }


    console.log(
        "Detalle movimiento:",
        {
            movimiento,
            cuenta,
            periodo
        }
    );

}


/* ============================================================
   ESTABLECER TEXTO
   ============================================================ */

function establecerTexto(
    id,
    valor
) {

    const elemento =
        document.getElementById(
            id
        );


    if (elemento) {

        elemento.value =
            valor || "";

    }

}


/* ============================================================
   CERRAR MODAL DETALLE
   ============================================================ */

function cerrarModalMovimiento() {

    const modal =
        document.getElementById(
            "modalMovimiento"
        );


    if (modal) {

        modal.style.display =
            "none";

    }

}


/* ============================================================
   LIMPIAR FILTROS
   ============================================================ */

function limpiarFiltros() {

    const periodo =
        document.getElementById(
            "periodoSelect"
        );


    const cuenta =
        document.getElementById(
            "cuentaSelect"
        );


    const tipo =
        document.getElementById(
            "tipoSelect"
        );


    const origen =
        document.getElementById(
            "origenSelect"
        );


    const desde =
        document.getElementById(
            "fechaDesde"
        );


    const hasta =
        document.getElementById(
            "fechaHasta"
        );


    if (periodo) {

        periodo.value =
            "";

    }


    if (cuenta) {

        cuenta.value =
            "";

    }


    if (tipo) {

        tipo.value =
            "todos";

    }


    if (origen) {

        origen.value =
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


    aplicarFiltros();

}


/* ============================================================
   TRADUCIR TIPO
   ============================================================ */

function traducirTipo(tipo) {

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
   TRADUCIR ORIGEN
   ============================================================ */

function traducirOrigen(origen) {

    switch (origen) {

        case "pago_cuota":
            return "Pago de cuota";

        case "ingreso":
            return "Ingreso";

        case "egreso":
            return "Egreso";

        default:
            return origen || "—";

    }

}


/* ============================================================
   TRADUCIR SUBTIPO
   ============================================================ */

function traducirSubtipo(subtipo) {

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
   FORMATEAR MONEDA
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
   FORMATEAR FECHA
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
   OBTENER FECHA LOCAL
   ============================================================ */

function obtenerFechaLocal() {

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


/* ============================================================
   CERRAR SESION
   ============================================================ */

async function cerrarSesion() {

    const confirmar =
        confirm(
            "¿Esta seguro de que desea cerrar la sesion?"
        );


    if (!confirmar) {

        return;

    }


    const resultado =
        await supabaseClient.auth.signOut();


    if (resultado.error) {

        console.error(
            "Error al cerrar sesion:",
            resultado.error
        );


        alert(
            "No fue posible cerrar la sesion."
        );


        return;

    }


    window.location.href =
        "login.html";

}
