// ============================================================
// SISTEMA FINANCIERO
// CONTROL PRINCIPAL DEL DASHBOARD
// ============================================================


// ============================================================
// VARIABLES GLOBALES
// ============================================================

let perfilUsuario = null;
let periodosDisponibles = [];

let sistemaInicializado = false;


// ============================================================
// VERIFICAR SESIÓN
// ============================================================

async function verificarSesion() {

    const {
        data: { session },
        error: sessionError
    } = await supabaseClient.auth.getSession();


    // --------------------------------------------------------
    // ERROR AL COMPROBAR SESIÓN
    // --------------------------------------------------------

    if (sessionError) {

        console.error(
            "Error al comprobar sesión:",
            sessionError
        );

        redirigirAlLogin();

        return false;
    }


    // --------------------------------------------------------
    // NO EXISTE SESIÓN
    // --------------------------------------------------------

    if (!session) {

        redirigirAlLogin();

        return false;
    }


    console.log(
        "Usuario autenticado:",
        session.user.email
    );


    // ========================================================
    // OBTENER PERFIL DEL USUARIO
    // ========================================================

    const {
        data: perfil,
        error
    } = await supabaseClient
        .from("profiles")
        .select(
            "nombre, email, rol, activo"
        )
        .eq(
            "id",
            session.user.id
        )
        .single();


    // --------------------------------------------------------
    // ERROR AL OBTENER PERFIL
    // --------------------------------------------------------

    if (error) {

        console.error(
            "Error al obtener perfil:",
            error
        );

        alert(
            "No fue posible cargar el perfil del usuario."
        );

        return false;
    }


    // --------------------------------------------------------
    // USUARIO DESACTIVADO
    // --------------------------------------------------------

    if (!perfil || !perfil.activo) {

        alert(
            "Este usuario se encuentra desactivado."
        );

        await supabaseClient.auth.signOut();

        redirigirAlLogin();

        return false;
    }


    // --------------------------------------------------------
    // GUARDAR PERFIL
    // --------------------------------------------------------

    perfilUsuario = perfil;


    console.log(
        "Perfil:",
        perfilUsuario
    );


    // ========================================================
    // MOSTRAR INFORMACIÓN DEL USUARIO
    // ========================================================

    mostrarUsuario(perfil);


    // ========================================================
    // CONFIGURAR MENÚ SEGÚN ROL
    // ========================================================

    configurarMenu(perfil.rol);


    // ========================================================
    // CARGAR PERÍODOS
    // ========================================================

    await cargarPeriodos();


    // ========================================================
    // CARGAR DASHBOARD
    // ========================================================

    await cargarDashboard();


    return true;
}


// ============================================================
// REDIRIGIR AL LOGIN
// ============================================================

function redirigirAlLogin() {

    /*
     * replace() evita que la página protegida quede como
     * destino inmediato dentro del historial de navegación.
     */

    window.location.replace("login.html");

}


// ============================================================
// MOSTRAR USUARIO
// ============================================================

function mostrarUsuario(perfil) {

    const nombre =
        document.getElementById(
            "nombreUsuario"
        );

    const rol =
        document.getElementById(
            "rolUsuario"
        );

    const titulo =
        document.getElementById(
            "bienvenidaTitulo"
        );

    const texto =
        document.getElementById(
            "bienvenidaTexto"
        );


    // --------------------------------------------------------
    // NOMBRE
    // --------------------------------------------------------

    if (nombre) {

        nombre.textContent =
            perfil.nombre || "Usuario";

    }


    // --------------------------------------------------------
    // ROL
    // --------------------------------------------------------

    if (rol) {

        rol.textContent =
            traducirRol(
                perfil.rol
            );

    }


    // --------------------------------------------------------
    // TÍTULO DE BIENVENIDA
    // --------------------------------------------------------

    if (titulo) {

        titulo.textContent =
            `Bienvenido, ${perfil.nombre || "usuario"}`;

    }


    // --------------------------------------------------------
    // DESCRIPCIÓN
    // --------------------------------------------------------

    if (texto) {

        texto.textContent =
            obtenerDescripcionRol(
                perfil.rol
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
// DESCRIPCIÓN DEL ROL
// ============================================================

function obtenerDescripcionRol(rol) {

    switch (rol) {

        case "administrador":

            return (
                "Tiene acceso completo a la administración " +
                "del sistema."
            );


        case "tesorero":

            return (
                "Puede gestionar socios, cuotas, finanzas, " +
                "proyectos y consultar información financiera."
            );


        case "consulta":

            return (
                "Tiene acceso exclusivamente a la visualización " +
                "de reportes."
            );


        default:

            return (
                "Bienvenido al Sistema Financiero."
            );

    }

}


// ============================================================
// CONFIGURAR MENÚ
// ============================================================

function configurarMenu(rol) {

    const menuSocios =
        document.getElementById(
            "menuSocios"
        );

    const menuCuotas =
        document.getElementById(
            "menuCuotas"
        );

    const menuFinanzas =
        document.getElementById(
            "menuFinanzas"
        );

    const menuProyectos =
        document.getElementById(
            "menuProyectos"
        );

    const menuReportes =
        document.getElementById(
            "menuReportes"
        );

    const menuUsuarios =
        document.getElementById(
            "menuUsuarios"
        );


    // ========================================================
    // OCULTAR TODO INICIALMENTE
    // ========================================================

    if (menuSocios) {

        menuSocios.style.display =
            "none";

    }


    if (menuCuotas) {

        menuCuotas.style.display =
            "none";

    }


    if (menuFinanzas) {

        menuFinanzas.style.display =
            "none";

    }


    if (menuProyectos) {

        menuProyectos.style.display =
            "none";

    }


    if (menuReportes) {

        menuReportes.style.display =
            "none";

    }


    if (menuUsuarios) {

        menuUsuarios.style.display =
            "none";

    }


    // ========================================================
    // ADMINISTRADOR
    // ========================================================

    if (rol === "administrador") {

        if (menuSocios) {

            menuSocios.style.display =
                "block";

        }


        if (menuCuotas) {

            menuCuotas.style.display =
                "block";

        }


        if (menuFinanzas) {

            menuFinanzas.style.display =
                "block";

        }


        if (menuProyectos) {

            menuProyectos.style.display =
                "block";

        }


        if (menuReportes) {

            menuReportes.style.display =
                "block";

        }


        if (menuUsuarios) {

            menuUsuarios.style.display =
                "block";

        }

    }


    // ========================================================
    // TESORERO
    // ========================================================

    else if (rol === "tesorero") {

        if (menuSocios) {

            menuSocios.style.display =
                "block";

        }


        if (menuCuotas) {

            menuCuotas.style.display =
                "block";

        }


        if (menuFinanzas) {

            menuFinanzas.style.display =
                "block";

        }


        if (menuProyectos) {

            menuProyectos.style.display =
                "block";

        }


        if (menuReportes) {

            menuReportes.style.display =
                "block";

        }

    }


    // ========================================================
    // CONSULTA
    // ========================================================

    else if (rol === "consulta") {

        if (menuReportes) {

            menuReportes.style.display =
                "block";

        }

    }

}


// ============================================================
// CARGAR PERÍODOS
// ============================================================

async function cargarPeriodos() {

    const select =
        document.getElementById(
            "periodoSelect"
        );


    // --------------------------------------------------------
    // SI NO EXISTE SELECT
    // --------------------------------------------------------

    if (!select) {

        return;

    }


    const {
        data,
        error
    } = await supabaseClient
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


    // --------------------------------------------------------
    // ERROR
    // --------------------------------------------------------

    if (error) {

        console.error(
            "Error al cargar períodos:",
            error
        );

        select.innerHTML =
            `<option value="">Error al cargar</option>`;

        return;
    }


    // --------------------------------------------------------
    // GUARDAR PERÍODOS
    // --------------------------------------------------------

    periodosDisponibles =
        data || [];


    select.innerHTML =
        "";


    // --------------------------------------------------------
    // SIN PERÍODOS
    // --------------------------------------------------------

    if (
        periodosDisponibles.length === 0
    ) {

        select.innerHTML =
            `<option value="">No existen períodos</option>`;

        return;
    }


    // ========================================================
    // CREAR OPCIONES
    // ========================================================

    periodosDisponibles.forEach(
        function (periodo) {

            const option =
                document.createElement(
                    "option"
                );


            option.value =
                periodo.id;


            option.textContent =
                `${periodo.anio} — ${capitalizar(
                    periodo.estado
                )}`;


            select.appendChild(
                option
            );

        }
    );


    // ========================================================
    // SELECCIONAR PRIMER PERÍODO
    // ========================================================

    select.value =
        periodosDisponibles[0].id;


    // ========================================================
    // CAMBIAR PERÍODO
    // ========================================================

    if (
        select.dataset.listenerConfigurado !==
        "true"
    ) {

        select.addEventListener(
            "change",
            async function () {

                await cargarDashboard();

            }
        );


        select.dataset.listenerConfigurado =
            "true";

    }

}


// ============================================================
// CARGAR DASHBOARD
// ============================================================

async function cargarDashboard() {

    const select =
        document.getElementById(
            "periodoSelect"
        );


    // --------------------------------------------------------
    // SI NO EXISTE SELECTOR
    // --------------------------------------------------------

    if (
        !select ||
        !select.value
    ) {

        return;

    }


    const periodoId =
        Number(
            select.value
        );


    console.log(
        "Cargando reporte del período:",
        periodoId
    );


    // ========================================================
    // LLAMAR FUNCIÓN RPC DE SUPABASE
    // ========================================================

    const {
        data,
        error
    } = await supabaseClient.rpc(
        "reporte_resumen_financiero",
        {
            p_periodo_id:
                periodoId
        }
    );


    // --------------------------------------------------------
    // ERROR
    // --------------------------------------------------------

    if (error) {

        console.error(
            "Error al cargar resumen financiero:",
            error
        );

        alert(
            "No fue posible cargar el resumen financiero."
        );

        return;
    }


    console.log(
        "Reporte recibido:",
        data
    );


    // --------------------------------------------------------
    // SIN DATOS
    // --------------------------------------------------------

    if (
        !data ||
        data.length === 0
    ) {

        limpiarDashboard();

        return;
    }


    // --------------------------------------------------------
    // RESUMEN
    // --------------------------------------------------------

    const resumen =
        data[0];


    mostrarResumen(
        resumen
    );

}


// ============================================================
// MOSTRAR RESUMEN
// ============================================================

function mostrarResumen(resumen) {

    // ========================================================
    // VALORES FINANCIEROS
    // ========================================================

    const ingresos =
        Number(
            resumen.total_ingresos || 0
        );


    const egresos =
        Number(
            resumen.total_egresos || 0
        );


    const saldo =
        Number(
            resumen.saldo || 0
        );


    // ========================================================
    // TARJETAS FINANCIERAS
    // ========================================================

    const totalIngresos =
        document.getElementById(
            "totalIngresos"
        );


    const totalEgresos =
        document.getElementById(
            "totalEgresos"
        );


    const saldoActual =
        document.getElementById(
            "saldoActual"
        );


    if (totalIngresos) {

        totalIngresos.textContent =
            formatoMoneda(
                ingresos
            );

    }


    if (totalEgresos) {

        totalEgresos.textContent =
            formatoMoneda(
                egresos
            );

    }


    if (saldoActual) {

        saldoActual.textContent =
            formatoMoneda(
                saldo
            );

    }


    // ========================================================
    // CUOTAS
    // ========================================================

    const cuotasPagadas =
        document.getElementById(
            "cuotasPagadas"
        );


    const cuotasPendientes =
        document.getElementById(
            "cuotasPendientes"
        );


    const cuotasParciales =
        document.getElementById(
            "cuotasParciales"
        );


    if (cuotasPagadas) {

        cuotasPagadas.textContent =
            resumen.cuotas_pagadas || 0;

    }


    if (cuotasPendientes) {

        cuotasPendientes.textContent =
            resumen.cuotas_pendientes || 0;

    }


    if (cuotasParciales) {

        cuotasParciales.textContent =
            resumen.cuotas_parciales || 0;

    }


    // ========================================================
    // INFORMACIÓN DEL PERÍODO
    // ========================================================

    const anioPeriodo =
        document.getElementById(
            "anioPeriodo"
        );


    const estadoPeriodo =
        document.getElementById(
            "estadoPeriodo"
        );


    const resumenPeriodo =
        document.getElementById(
            "resumenPeriodo"
        );


    if (anioPeriodo) {

        anioPeriodo.textContent =
            resumen.anio || "—";

    }


    if (estadoPeriodo) {

        const estado =
            resumen.estado_periodo || "";


        estadoPeriodo.textContent =
            capitalizar(
                estado
            );


        estadoPeriodo.className =
            `estado-periodo ${estado}`;

    }


    if (resumenPeriodo) {

        resumenPeriodo.textContent =
            resumen.anio
                ? `Resumen financiero correspondiente al año ${resumen.anio}.`
                : "Seleccione un período para visualizar la información.";

    }


    // ========================================================
    // RESULTADO
    // ========================================================

    const resultado =
        document.getElementById(
            "resultadoPeriodo"
        );


    if (resultado) {

        resultado.textContent =
            formatoMoneda(
                saldo
            );


        resultado.className =
            saldo >= 0
                ? "resultado-positivo"
                : "resultado-negativo";

    }

}


// ============================================================
// LIMPIAR DASHBOARD
// ============================================================

function limpiarDashboard() {

    // --------------------------------------------------------
    // VALORES FINANCIEROS
    // --------------------------------------------------------

    const ids = [

        "totalIngresos",
        "totalEgresos",
        "saldoActual"

    ];


    ids.forEach(
        function (id) {

            const elemento =
                document.getElementById(
                    id
                );


            if (elemento) {

                elemento.textContent =
                    formatoMoneda(0);

            }

        }
    );


    // --------------------------------------------------------
    // CUOTAS
    // --------------------------------------------------------

    const cuotas = [

        "cuotasPagadas",
        "cuotasPendientes",
        "cuotasParciales"

    ];


    cuotas.forEach(
        function (id) {

            const elemento =
                document.getElementById(
                    id
                );


            if (elemento) {

                elemento.textContent =
                    "0";

            }

        }
    );


    // --------------------------------------------------------
    // INFORMACIÓN DEL PERÍODO
    // --------------------------------------------------------

    const anio =
        document.getElementById(
            "anioPeriodo"
        );


    const estado =
        document.getElementById(
            "estadoPeriodo"
        );


    const resumen =
        document.getElementById(
            "resumenPeriodo"
        );


    const resultado =
        document.getElementById(
            "resultadoPeriodo"
        );


    if (anio) {

        anio.textContent =
            "—";

    }


    if (estado) {

        estado.textContent =
            "—";

        estado.className =
            "estado-periodo";

    }


    if (resumen) {

        resumen.textContent =
            "No existen datos financieros para el período seleccionado.";

    }


    if (resultado) {

        resultado.textContent =
            formatoMoneda(0);

        resultado.className =
            "resultado-positivo";

    }

}


// ============================================================
// FORMATEAR MONEDA
// ============================================================

function formatoMoneda(valor) {

    const numero =
        Number(valor) || 0;


    return new Intl.NumberFormat(
        "es-CL",
        {
            style: "currency",
            currency: "CLP",
            maximumFractionDigits: 0
        }
    ).format(
        numero
    );

}


// ============================================================
// CAPITALIZAR
// ============================================================

function capitalizar(texto) {

    if (!texto) {

        return "";

    }


    const textoString =
        String(texto);


    return (
        textoString.charAt(0).toUpperCase() +
        textoString.slice(1)
    );

}


// ============================================================
// CERRAR SESIÓN
// ============================================================

function configurarCerrarSesion() {

    const logoutButton =
        document.getElementById(
            "logoutButton"
        );


    if (
        !logoutButton ||
        logoutButton.dataset.listenerConfigurado ===
        "true"
    ) {

        return;

    }


    logoutButton.addEventListener(
        "click",
        async function () {

            const confirmar =
                confirm(
                    "¿Está seguro de que desea cerrar sesión?"
                );


            if (!confirmar) {

                return;

            }


            logoutButton.disabled =
                true;


            const {
                error
            } =
                await supabaseClient.auth.signOut();


            if (error) {

                console.error(
                    "Error al cerrar sesión:",
                    error
                );


                alert(
                    "No fue posible cerrar la sesión."
                );


                logoutButton.disabled =
                    false;


                return;

            }


            /*
             * replace() reemplaza el Dashboard en el historial
             * por login.html.
             */

            window.location.replace(
                "login.html"
            );

        }
    );


    logoutButton.dataset.listenerConfigurado =
        "true";

}


// ============================================================
// CONTROL DE PÁGINA DESDE EL HISTORIAL
// ============================================================

window.addEventListener(
    "pageshow",
    async function (event) {

        /*
         * pageshow también se ejecuta cuando el navegador
         * recupera una página desde el historial/bfcache.
         *
         * Volvemos a comprobar la sesión para evitar que
         * una página protegida quede visible después de
         * cerrar sesión.
         */

        if (event.persisted) {

            console.log(
                "Página recuperada desde el historial. " +
                "Comprobando sesión..."
            );

            const sesionValida =
                await verificarSesion();


            if (!sesionValida) {

                return;

            }

        }

    }
);


// ============================================================
// INICIAR SISTEMA
// ============================================================

configurarCerrarSesion();

verificarSesion();