// ============================================================
// SISTEMA FINANCIERO
// REGISTRO DE COMPROBANTES DE CUOTA
// ============================================================

let perfilUsuario = null;
let registrosComprobantes = [];


document.addEventListener(
    "DOMContentLoaded",
    async function () {
        await iniciarModulo();
    }
);


async function iniciarModulo() {

    const sesionResultado =
        await supabaseClient.auth.getSession();

    if (
        sesionResultado.error ||
        !sesionResultado.data.session
    ) {
        window.location.href = "login.html";
        return;
    }

    const usuario =
        sesionResultado.data.session.user;

    const perfilResultado =
        await supabaseClient
            .from("profiles")
            .select("nombre, email, rol, activo")
            .eq("id", usuario.id)
            .single();

    if (
        perfilResultado.error ||
        !perfilResultado.data ||
        !perfilResultado.data.activo
    ) {
        await supabaseClient.auth.signOut();
        window.location.href = "login.html";
        return;
    }

    perfilUsuario =
        perfilResultado.data;

    if (
        perfilUsuario.rol !== "administrador" &&
        perfilUsuario.rol !== "tesorero"
    ) {
        window.location.href = "reportes.html";
        return;
    }

    mostrarUsuario();
    configurarEventos();
    await cargarComprobantes();
}


function mostrarUsuario() {

    const nombre =
        document.getElementById("nombreUsuario");

    const rol =
        document.getElementById("rolUsuario");

    if (nombre) {
        nombre.textContent =
            perfilUsuario.nombre || "Usuario";
    }

    if (rol) {
        rol.textContent =
            traducirRol(perfilUsuario.rol);
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

    const buscar =
        document.getElementById("buscarComprobante");

    const periodo =
        document.getElementById("periodoComprobante");

    const estado =
        document.getElementById("estadoComprobante");

    if (buscar) {
        buscar.addEventListener(
            "input",
            aplicarFiltros
        );
    }

    if (periodo) {
        periodo.addEventListener(
            "change",
            aplicarFiltros
        );
    }

    if (estado) {
        estado.addEventListener(
            "change",
            aplicarFiltros
        );
    }

    const logout =
        document.getElementById("logoutButton");

    if (logout) {
        logout.addEventListener(
            "click",
            async function () {
                await supabaseClient.auth.signOut();
                window.location.href = "login.html";
            }
        );
    }
}


// ============================================================
// CARGA DE TODOS LOS PAGOS
// ============================================================

async function cargarComprobantes() {

    const tabla =
        document.getElementById("tablaComprobantes");

    if (tabla) {
        tabla.innerHTML =
            '<tr><td colspan="8" class="tabla-cargando">Cargando pagos y comprobantes...</td></tr>';
    }

    const pagosResultado =
        await supabaseClient
            .from("pagos_cuotas")
            .select(
                "id, cuota_id, monto, medio_pago, fecha_pago, numero_comprobante, estado, created_at"
            )
            .order(
                "fecha_pago",
                { ascending: false }
            );

    if (pagosResultado.error) {
        console.error(
            "Error al cargar pagos:",
            pagosResultado.error
        );

        if (tabla) {
            tabla.innerHTML =
                '<tr><td colspan="8" class="tabla-cargando">No fue posible cargar los pagos.</td></tr>';
        }

        return;
    }

    const pagos =
        pagosResultado.data || [];

    if (pagos.length === 0) {
        registrosComprobantes = [];
        llenarPeriodos([]);
        aplicarFiltros();
        return;
    }

    const pagoIds =
        pagos.map(
            function (pago) {
                return pago.id;
            }
        );

    const comprobantesResultado =
        await supabaseClient
            .from("comprobantes_cuota")
            .select(
                "id, pago_id, numero, anio, correlativo, fecha_emision, estado, cantidad_impresiones, ultima_impresion_at"
            )
            .in(
                "pago_id",
                pagoIds
            );

    if (comprobantesResultado.error) {
        console.error(
            "Error al cargar comprobantes:",
            comprobantesResultado.error
        );
    }

    const comprobantes =
        comprobantesResultado.data || [];

    const comprobanteMap = {};

    comprobantes.forEach(
        function (comprobante) {
            comprobanteMap[
                String(comprobante.pago_id)
            ] = comprobante;
        }
    );

    const cuotaIds =
        pagos
            .map(
                function (pago) {
                    return pago.cuota_id;
                }
            )
            .filter(Boolean);

    let cuotas = [];

    if (cuotaIds.length > 0) {
        const cuotasResultado =
            await supabaseClient
                .from("cuotas")
                .select("id, socio_id, periodo_id")
                .in(
                    "id",
                    cuotaIds
                );

        if (cuotasResultado.error) {
            console.error(
                "Error al cargar cuotas:",
                cuotasResultado.error
            );
        } else {
            cuotas =
                cuotasResultado.data || [];
        }
    }

    const cuotaMap = {};

    cuotas.forEach(
        function (cuota) {
            cuotaMap[
                String(cuota.id)
            ] = cuota;
        }
    );

    const socioIds =
        cuotas
            .map(
                function (cuota) {
                    return cuota.socio_id;
                }
            )
            .filter(Boolean);

    const periodoIds =
        cuotas
            .map(
                function (cuota) {
                    return cuota.periodo_id;
                }
            )
            .filter(Boolean);

    let socios = [];
    let periodos = [];

    if (socioIds.length > 0) {
        const sociosResultado =
            await supabaseClient
                .from("socios")
                .select(
                    "id, nombres, apellido_paterno, apellido_materno, rut"
                )
                .in(
                    "id",
                    socioIds
                );

        if (!sociosResultado.error) {
            socios =
                sociosResultado.data || [];
        } else {
            console.error(
                "Error al cargar socios:",
                sociosResultado.error
            );
        }
    }

    if (periodoIds.length > 0) {
        const periodosResultado =
            await supabaseClient
                .from("periodos_financieros")
                .select("id, anio")
                .in(
                    "id",
                    periodoIds
                );

        if (!periodosResultado.error) {
            periodos =
                periodosResultado.data || [];
        } else {
            console.error(
                "Error al cargar períodos:",
                periodosResultado.error
            );
        }
    }

    const socioMap = {};

    socios.forEach(
        function (socio) {
            socioMap[
                String(socio.id)
            ] = socio;
        }
    );

    const periodoMap = {};

    periodos.forEach(
        function (periodo) {
            periodoMap[
                String(periodo.id)
            ] = periodo;
        }
    );

    registrosComprobantes =
        pagos.map(
            function (pago) {

                const comprobante =
                    comprobanteMap[
                        String(pago.id)
                    ] || null;

                const cuota =
                    cuotaMap[
                        String(pago.cuota_id)
                    ] || null;

                const socio =
                    cuota
                        ? socioMap[
                            String(cuota.socio_id)
                        ] || null
                        : null;

                const periodo =
                    cuota
                        ? periodoMap[
                            String(cuota.periodo_id)
                        ] || null
                        : null;

                return {
                    comprobante,
                    pago,
                    cuota,
                    socio,
                    periodo
                };
            }
        );

    llenarPeriodos(periodos);
    aplicarFiltros();
}


function llenarPeriodos(periodos) {

    const select =
        document.getElementById("periodoComprobante");

    if (!select) {
        return;
    }

    const actual =
        select.value;

    const anios =
        Array.from(
            new Set(
                (periodos || []).map(
                    function (periodo) {
                        return periodo.anio;
                    }
                )
            )
        ).sort(
            function (a, b) {
                return b - a;
            }
        );

    select.innerHTML =
        '<option value="">Todos</option>';

    anios.forEach(
        function (anio) {
            const option =
                document.createElement("option");

            option.value = anio;
            option.textContent = anio;

            select.appendChild(option);
        }
    );

    if (
        actual &&
        anios.includes(Number(actual))
    ) {
        select.value = actual;
    }
}


// ============================================================
// FILTROS
// ============================================================

function aplicarFiltros() {

    const buscar =
        document.getElementById("buscarComprobante");

    const periodo =
        document.getElementById("periodoComprobante");

    const estado =
        document.getElementById("estadoComprobante");

    const texto =
        buscar
            ? buscar.value.trim().toLowerCase()
            : "";

    const anioSeleccionado =
        periodo
            ? periodo.value
            : "";

    const estadoSeleccionado =
        estado
            ? estado.value
            : "";

    const lista =
        registrosComprobantes.filter(
            function (item) {

                const comprobante =
                    item.comprobante;

                const pago =
                    item.pago;

                const socio =
                    item.socio;

                const periodoItem =
                    item.periodo;

                const nombre =
                    socio
                        ? construirNombreCompleto(socio).toLowerCase()
                        : "";

                const rut =
                    socio && socio.rut
                        ? String(socio.rut).toLowerCase()
                        : "";

                const numero =
                    comprobante && comprobante.numero
                        ? String(comprobante.numero).toLowerCase()
                        : "";

                const coincideTexto =
                    texto === "" ||
                    numero.includes(texto) ||
                    nombre.includes(texto) ||
                    rut.includes(texto) ||
                    String(pago.id).includes(texto);

                const anio =
                    comprobante
                        ? comprobante.anio
                        : periodoItem
                            ? periodoItem.anio
                            : "";

                const coincideAnio =
                    anioSeleccionado === "" ||
                    String(anio) === String(anioSeleccionado);

                const estadoRegistro =
                    comprobante
                        ? comprobante.estado
                        : pago.estado === "activo"
                            ? "pendiente"
                            : pago.estado;

                const coincideEstado =
                    estadoSeleccionado === "" ||
                    estadoRegistro === estadoSeleccionado;

                return (
                    coincideTexto &&
                    coincideAnio &&
                    coincideEstado
                );
            }
        );

    renderizarComprobantes(lista);
}


// ============================================================
// TABLA
// ============================================================

function renderizarComprobantes(lista) {

    const tabla =
        document.getElementById("tablaComprobantes");

    const contador =
        document.getElementById("contadorComprobantes");

    if (contador) {
        contador.textContent =
            lista.length === 1
                ? "1 pago encontrado"
                : lista.length + " pagos encontrados";
    }

    if (!tabla) {
        return;
    }

    if (lista.length === 0) {
        tabla.innerHTML =
            '<tr><td colspan="8" class="tabla-cargando">No se encontraron pagos.</td></tr>';
        return;
    }

    tabla.innerHTML = "";

    lista.forEach(
        function (item) {

            const comprobante =
                item.comprobante;

            const pago =
                item.pago;

            const socio =
                item.socio;

            const periodo =
                item.periodo;

            const fila =
                document.createElement("tr");

            const numeroHTML =
                comprobante
                    ? "<strong>" +
                      escaparHTML(comprobante.numero) +
                      "</strong>"
                    : "<span style='color:#7b8794;'>Pendiente</span>";

            const fechaEmisionHTML =
                comprobante
                    ? formatearFecha(comprobante.fecha_emision)
                    : "—";

            const estadoHTML =
                comprobante
                    ? traducirEstado(comprobante.estado)
                    : "Pendiente de emisión";

            const impresionesHTML =
                comprobante
                    ? String(comprobante.cantidad_impresiones || 0)
                    : "—";

            const accionHTML =
                comprobante
                    ? "<button type='button' class='boton-tabla boton-comprobante' data-id='" +
                      comprobante.id +
                      "'>🧾 Ver comprobante</button>"
                    : pago.estado === "activo"
                        ? "<button type='button' class='boton-tabla boton-emitir-comprobante' data-pago-id='" +
                          pago.id +
                          "'>🧾 Emitir comprobante</button>"
                        : "—";

            fila.innerHTML =
                "<td>" +
                numeroHTML +
                "</td>" +

                "<td>" +
                escaparHTML(
                    socio
                        ? construirNombreCompleto(socio)
                        : "Socio no identificado"
                ) +
                "</td>" +

                "<td>" +
                escaparHTML(
                    periodo
                        ? String(periodo.anio)
                        : "—"
                ) +
                "</td>" +

                "<td>" +
                fechaEmisionHTML +
                "</td>" +

                "<td><strong>" +
                formatearMoneda(pago.monto) +
                "</strong></td>" +

                "<td>" +
                estadoHTML +
                "</td>" +

                "<td>" +
                impresionesHTML +
                "</td>" +

                "<td>" +
                accionHTML +
                "</td>";

            tabla.appendChild(fila);
        }
    );

    tabla
        .querySelectorAll(".boton-comprobante")
        .forEach(
            function (boton) {
                boton.addEventListener(
                    "click",
                    function () {
                        abrirComprobante(
                            Number(boton.dataset.id)
                        );
                    }
                );
            }
        );

    tabla
        .querySelectorAll(".boton-emitir-comprobante")
        .forEach(
            function (boton) {
                boton.addEventListener(
                    "click",
                    async function () {
                        await emitirComprobante(
                            Number(boton.dataset.pagoId)
                        );
                    }
                );
            }
        );
}


// ============================================================
// EMISIÓN DESDE PAGOS HISTÓRICOS
// ============================================================

async function emitirComprobante(pagoId) {

    if (!pagoId) {
        return;
    }

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
                p_pago_id: pagoId
            }
        );

    if (resultado.error) {
        console.error(
            "Error al emitir comprobante:",
            resultado.error
        );

        alert(
            obtenerMensajeError(resultado.error)
        );

        return;
    }

    const comprobante =
        Array.isArray(resultado.data)
            ? resultado.data[0]
            : resultado.data;

    if (
        !comprobante ||
        !comprobante.id
    ) {
        alert(
            "El comprobante fue procesado, pero no fue posible obtener su identificador."
        );
        return;
    }

    window.open(
        "comprobante.html?id=" +
        encodeURIComponent(comprobante.id),
        "_blank"
    );

    await cargarComprobantes();
}


function abrirComprobante(comprobanteId) {

    if (!comprobanteId) {
        return;
    }

    const ventana =
        window.open(
            "comprobante.html?id=" +
            encodeURIComponent(comprobanteId),
            "_blank"
        );

    if (!ventana) {
        alert(
            "El navegador bloqueó la ventana. Permita ventanas emergentes para este sitio."
        );
    }
}


// ============================================================
// UTILIDADES
// ============================================================

function construirNombreCompleto(socio) {

    return [
        socio.nombres,
        socio.apellido_paterno,
        socio.apellido_materno
    ]
        .filter(
            function (valor) {
                return valor && String(valor).trim();
            }
        )
        .map(
            function (valor) {
                return String(valor).trim();
            }
        )
        .join(" ") || "Socio no identificado";
}


function formatearMoneda(valor) {

    return Number(valor || 0).toLocaleString(
        "es-CL",
        {
            style: "currency",
            currency: "CLP",
            maximumFractionDigits: 0
        }
    );
}


function formatearFecha(fecha) {

    if (!fecha) {
        return "—";
    }

    const partes =
        String(fecha).slice(0, 10).split("-");

    if (partes.length !== 3) {
        return String(fecha);
    }

    return (
        partes[2] +
        "/" +
        partes[1] +
        "/" +
        partes[0]
    );
}


function traducirEstado(estado) {

    switch (estado) {
        case "vigente":
            return "Vigente";
        case "anulado":
            return "Anulado";
        case "pendiente":
            return "Pendiente de emisión";
        default:
            return estado || "—";
    }
}


function escaparHTML(valor) {

    return String(valor == null ? "" : valor)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


function obtenerMensajeError(error) {

    if (!error) {
        return "No fue posible completar la operación.";
    }

    return (
        error.message ||
        error.details ||
        error.hint ||
        "No fue posible completar la operación."
    );
}
