// ============================================================
// SISTEMA FINANCIERO
// MODULO DE CUOTAS
// ============================================================

let usuarioActual = null;
let perfilUsuario = null;

let cuotas = [];
let socios = [];
let periodos = [];
let categorias = [];


// ============================================================
// INICIAR MODULO
// ============================================================

document.addEventListener("DOMContentLoaded", async function () {
    await verificarSesion();
});


// ============================================================
// VERIFICAR SESION
// ============================================================

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

        window.location.href = "login.html";

        return;
    }

    if (!session) {

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
            .select("nombre, email, rol, activo")
            .eq("id", usuarioActual.id)
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

    if (!perfil) {

        alert(
            "No existe un perfil asociado al usuario."
        );

        await supabaseClient.auth.signOut();

        window.location.href = "login.html";

        return;
    }

    if (!perfil.activo) {

        alert(
            "Este usuario se encuentra desactivado."
        );

        await supabaseClient.auth.signOut();

        window.location.href = "login.html";

        return;
    }

    perfilUsuario = perfil;

    mostrarUsuario();

    configurarEventos();

    await cargarSocios();

    await cargarPeriodos();

    await cargarCategorias();

    await cargarCuotas();
}


// ============================================================
// MOSTRAR USUARIO
// ============================================================

function mostrarUsuario() {

    const nombreUsuario =
        document.getElementById("nombreUsuario");

    const rolUsuario =
        document.getElementById("rolUsuario");

    if (nombreUsuario) {

        nombreUsuario.textContent =
            perfilUsuario.nombre || "Usuario";
    }

    if (rolUsuario) {

        rolUsuario.textContent =
            traducirRol(perfilUsuario.rol);
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

    const irPagosCuotasButton =
        document.getElementById("irPagosCuotasButton");

    if (irPagosCuotasButton) {

        irPagosCuotasButton.addEventListener(
            "click",
            function () {

                window.location.href =
                    "pagos-cuotas.html";

            }
        );
    }


    // ========================================================
    // BOTON GENERAR REPORTE PDF
    // ========================================================

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


    const nuevaCuotaButton =
        document.getElementById("nuevaCuotaButton");

    if (nuevaCuotaButton) {

        nuevaCuotaButton.addEventListener(
            "click",
            abrirModalNuevaCuota
        );
    }


    const cerrarModal =
        document.getElementById("cerrarModalCuota");

    if (cerrarModal) {

        cerrarModal.addEventListener(
            "click",
            cerrarModalCuota
        );
    }


    const cancelar =
        document.getElementById("cancelarCuota");

    if (cancelar) {

        cancelar.addEventListener(
            "click",
            cerrarModalCuota
        );
    }


    const formulario =
        document.getElementById("formCuota");

    if (formulario) {

        formulario.addEventListener(
            "submit",
            guardarCuota
        );
    }


    const buscar =
        document.getElementById("buscarCuota");

    if (buscar) {

        buscar.addEventListener(
            "input",
            aplicarFiltros
        );
    }


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


    const periodo =
        document.getElementById("periodoSelect");

    if (periodo) {

        periodo.addEventListener(
            "change",
            aplicarFiltros
        );
    }


    const modal =
        document.getElementById("modalCuota");

    if (modal) {

        modal.addEventListener(
            "click",
            function (event) {

                if (event.target === modal) {

                    cerrarModalCuota();
                }
            }
        );
    }


    const logoutButton =
        document.getElementById("logoutButton");

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

        alert(
            "No fue posible cargar los socios."
        );

        return;
    }

    socios =
        resultado.data || [];

    llenarSelectSocios();
}


// ============================================================
// LLENAR SELECT DE SOCIOS
// ============================================================

function llenarSelectSocios() {

    const select =
        document.getElementById("socioSelect");

    if (!select) {
        return;
    }

    select.innerHTML =
        '<option value="">Seleccione un socio</option>';

    socios.forEach(function (socio) {

        const option =
            document.createElement("option");

        option.value =
            socio.id;

        const nombre =
            construirNombreCompleto(socio);

        option.textContent =
            socio.rut
                ? nombre + " - " + socio.rut
                : nombre;

        select.appendChild(option);
    });
}


// ============================================================
// CARGAR PERIODOS
// ============================================================

async function cargarPeriodos() {

    const resultado =
        await supabaseClient
            .from("periodos_financieros")
            .select("*")
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

        return;
    }

    periodos =
        resultado.data || [];

    llenarSelectPeriodos();
}


// ============================================================
// OBTENER NOMBRE DE PERIODO
// ============================================================

function obtenerNombrePeriodo(periodo) {

    if (!periodo) {
        return "Periodo";
    }

    const campos = [
        "nombre",
        "descripcion",
        "periodo",
        "anio",
        "año"
    ];

    for (
        let i = 0;
        i < campos.length;
        i++
    ) {

        const campo =
            campos[i];

        if (
            periodo[campo] !== undefined &&
            periodo[campo] !== null &&
            String(periodo[campo]).trim() !== ""
        ) {

            return String(
                periodo[campo]
            );
        }
    }

    return "Periodo #" + periodo.id;
}


// ============================================================
// LLENAR SELECT DE PERIODOS
// ============================================================

function llenarSelectPeriodos() {

    const selectPrincipal =
        document.getElementById("periodoSelect");

    const selectModal =
        document.getElementById("periodoCuotaSelect");

    if (selectPrincipal) {

        selectPrincipal.innerHTML =
            '<option value="">Todos los periodos</option>';
    }

    if (selectModal) {

        selectModal.innerHTML =
            '<option value="">Seleccione un periodo</option>';
    }

    periodos.forEach(function (periodo) {

        const nombre =
            obtenerNombrePeriodo(periodo);

        if (selectPrincipal) {

            const optionPrincipal =
                document.createElement("option");

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
                document.createElement("option");

            optionModal.value =
                periodo.id;

            optionModal.textContent =
                nombre;

            selectModal.appendChild(
                optionModal
            );
        }
    });
}


// ============================================================
// CARGAR CATEGORIAS
// ============================================================

async function cargarCategorias() {

    const resultado =
        await supabaseClient
            .from("categorias")
            .select("*");

    if (resultado.error) {

        console.error(
            "Error al cargar categorias:",
            resultado.error
        );

        return;
    }

    categorias =
        resultado.data || [];

    llenarSelectCategorias();
}


// ============================================================
// OBTENER NOMBRE DE CATEGORIA
// ============================================================

function obtenerNombreCategoria(categoria) {

    if (!categoria) {
        return "Sin categoria";
    }

    const campos = [
        "nombre",
        "descripcion",
        "categoria"
    ];

    for (
        let i = 0;
        i < campos.length;
        i++
    ) {

        const campo =
            campos[i];

        if (
            categoria[campo] !== undefined &&
            categoria[campo] !== null &&
            String(categoria[campo]).trim() !== ""
        ) {

            return String(
                categoria[campo]
            );
        }
    }

    return "Categoria #" + categoria.id;
}


// ============================================================
// LLENAR CATEGORIAS
// ============================================================

function llenarSelectCategorias() {

    const select =
        document.getElementById("categoriaSelect");

    if (!select) {
        return;
    }

    select.innerHTML =
        '<option value="">Sin categoria</option>';

    categorias.forEach(function (categoria) {

        const option =
            document.createElement("option");

        option.value =
            categoria.id;

        option.textContent =
            obtenerNombreCategoria(categoria);

        select.appendChild(option);
    });
}


// ============================================================
// CARGAR CUOTAS
// ============================================================

async function cargarCuotas() {

    const tabla =
        document.getElementById("tablaCuotas");

    if (tabla) {

        tabla.innerHTML =
            '<tr>' +
            '<td colspan="8" class="tabla-cargando">' +
            'Cargando cuotas...' +
            '</td>' +
            '</tr>';
    }

    console.log(
        "Iniciando consulta de cuotas..."
    );

    const resultado =
        await supabaseClient
            .from("cuotas")
            .select(
                "id, socio_id, periodo_id, categoria_id, fecha_emision, fecha_vencimiento, monto, estado, observaciones, created_at, updated_at, created_by"
            )
            .order(
                "fecha_emision",
                {
                    ascending: false
                }
            );

    console.log(
        "Resultado consulta cuotas:",
        resultado
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

        actualizarResumen();

        return;
    }

    cuotas =
        resultado.data || [];

    console.log(
        "Cuotas cargadas correctamente:",
        cuotas
    );

    aplicarFiltros();
}


// ============================================================
// APLICAR FILTROS
// ============================================================

function aplicarFiltros() {

    const buscar =
        document.getElementById("buscarCuota");

    const filtroEstado =
        document.getElementById(
            "filtroEstadoCuota"
        );

    const periodo =
        document.getElementById("periodoSelect");

    const texto =
        buscar
            ? buscar.value.trim().toLowerCase()
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
        cuotas.filter(function (cuota) {

            const socio =
                obtenerSocio(cuota.socio_id);

            const nombre =
                socio
                    ? construirNombreCompleto(
                        socio
                    ).toLowerCase()
                    : "";

            const rut =
                socio && socio.rut
                    ? String(
                        socio.rut
                    ).toLowerCase()
                    : "";

            const coincideBusqueda =
                texto === "" ||
                nombre.includes(texto) ||
                rut.includes(texto);

            const coincideEstado =
                estado === "todos" ||
                cuota.estado === estado;

            const coincidePeriodo =
                periodoId === "" ||
                String(cuota.periodo_id) ===
                String(periodoId);

            return (
                coincideBusqueda &&
                coincideEstado &&
                coincidePeriodo
            );
        });

    renderizarCuotas(filtradas);

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

    return socios.find(function (socio) {

        return Number(socio.id) === Number(id);

    });
}


// ============================================================
// OBTENER PERIODO
// ============================================================

function obtenerPeriodo(id) {

    return periodos.find(function (periodo) {

        return Number(periodo.id) === Number(id);

    });
}


// ============================================================
// OBTENER CATEGORIA
// ============================================================

function obtenerCategoria(id) {

    return categorias.find(function (categoria) {

        return Number(categoria.id) === Number(id);

    });
}


// ============================================================
// RENDERIZAR CUOTAS
// ============================================================

function renderizarCuotas(lista) {

    const tabla =
        document.getElementById("tablaCuotas");

    if (!tabla) {
        return;
    }

    tabla.innerHTML = "";

    if (lista.length === 0) {

        tabla.innerHTML =
            '<tr>' +
            '<td colspan="8" class="tabla-cargando">' +
            'No se encontraron cuotas.' +
            '</td>' +
            '</tr>';

        return;
    }

    lista.forEach(function (cuota) {

        const fila =
            document.createElement("tr");

        const socio =
            obtenerSocio(cuota.socio_id);

        const periodo =
            obtenerPeriodo(cuota.periodo_id);

        const categoria =
            obtenerCategoria(cuota.categoria_id);

        const nombreSocio =
            socio
                ? construirNombreCompleto(socio)
                : "Socio no encontrado";

        const nombrePeriodo =
            obtenerNombrePeriodo(periodo);

        const nombreCategoria =
            obtenerNombreCategoria(categoria);

        const monto =
            formatearMoneda(cuota.monto);

        const estado =
            cuota.estado || "pendiente";

        const claseEstado =
            obtenerClaseEstado(estado);

        fila.innerHTML =
            '<td><strong>' +
            escaparHTML(nombreSocio) +
            '</strong></td>' +

            '<td>' +
            escaparHTML(nombrePeriodo) +
            '</td>' +

            '<td>' +
            escaparHTML(nombreCategoria) +
            '</td>' +

            '<td>' +
            formatearFecha(
                cuota.fecha_emision
            ) +
            '</td>' +

            '<td>' +
            formatearFecha(
                cuota.fecha_vencimiento
            ) +
            '</td>' +

            '<td><strong>' +
            monto +
            '</strong></td>' +

            '<td>' +
            '<span class="' +
            claseEstado +
            '">' +
            traducirEstado(estado) +
            '</span>' +
            '</td>' +

            '<td>' +
            '<button type="button" ' +
            'class="boton-tabla" ' +
            'data-accion="editar" ' +
            'data-id="' +
            cuota.id +
            '">' +
            'Editar' +
            '</button>' +
            '</td>';

        tabla.appendChild(fila);
    });

    const botonesEditar =
        tabla.querySelectorAll(
            '[data-accion="editar"]'
        );

    botonesEditar.forEach(function (boton) {

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
    });
}


// ============================================================
// ACTUALIZAR RESUMEN
// ============================================================

function actualizarResumen() {

    const pagadas =
        cuotas.filter(function (cuota) {

            return cuota.estado === "pagada";

        }).length;

    const pendientes =
        cuotas.filter(function (cuota) {

            return cuota.estado === "pendiente";

        }).length;

    const parciales =
        cuotas.filter(function (cuota) {

            return cuota.estado === "parcial";

        }).length;

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
// CONTADOR
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
            : total + " cuotas registradas";
}


// ============================================================
// ABRIR MODAL NUEVA CUOTA
// ============================================================

function abrirModalNuevaCuota() {

    const modal =
        document.getElementById("modalCuota");

    const titulo =
        document.getElementById(
            "modalTituloCuota"
        );

    const formulario =
        document.getElementById("formCuota");

    if (!modal || !titulo || !formulario) {
        return;
    }

    formulario.reset();

    document.getElementById(
        "cuotaId"
    ).value = "";

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
// ABRIR MODAL EDITAR
// ============================================================

function abrirModalEditarCuota(id) {

    const cuota =
        cuotas.find(function (elemento) {

            return Number(elemento.id) === Number(id);

        });

    if (!cuota) {

        alert(
            "No fue posible encontrar la cuota seleccionada."
        );

        return;
    }

    const modal =
        document.getElementById("modalCuota");

    const titulo =
        document.getElementById(
            "modalTituloCuota"
        );

    if (!modal || !titulo) {
        return;
    }

    titulo.textContent =
        "Editar cuota";

    document.getElementById(
        "cuotaId"
    ).value =
        cuota.id;

    document.getElementById(
        "socioSelect"
    ).value =
        cuota.socio_id;

    document.getElementById(
        "periodoCuotaSelect"
    ).value =
        cuota.periodo_id;

    document.getElementById(
        "categoriaSelect"
    ).value =
        cuota.categoria_id || "";

    document.getElementById(
        "montoCuota"
    ).value =
        cuota.monto || "";

    document.getElementById(
        "fechaEmision"
    ).value =
        cuota.fecha_emision || "";

    document.getElementById(
        "fechaVencimiento"
    ).value =
        cuota.fecha_vencimiento || "";

    document.getElementById(
        "estadoCuota"
    ).value =
        cuota.estado || "pendiente";

    document.getElementById(
        "observacionesCuota"
    ).value =
        cuota.observaciones || "";

    modal.style.display =
        "flex";

    document.getElementById(
        "socioSelect"
    ).focus();
}


// ============================================================
// CERRAR MODAL
// ============================================================

function cerrarModalCuota() {

    const modal =
        document.getElementById("modalCuota");

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

        cuotaId.value =
            "";
    }
}


// ============================================================
// GUARDAR CUOTA
// ============================================================

async function guardarCuota(event) {

    event.preventDefault();

    const boton =
        document.getElementById(
            "guardarCuota"
        );

    const cuotaId =
        obtenerValor("cuotaId");

    const socioId =
        obtenerValor("socioSelect");

    const periodoId =
        obtenerValor("periodoCuotaSelect");

    const categoriaId =
        obtenerValor("categoriaSelect");

    const monto =
        obtenerValor("montoCuota");

    const fechaEmision =
        obtenerValor("fechaEmision");

    const fechaVencimiento =
        obtenerValor("fechaVencimiento");

    const estado =
        obtenerValor("estadoCuota") ||
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
            "Debe seleccionar un periodo financiero."
        );

        return;
    }

    if (!monto || Number(monto) <= 0) {

        alert(
            "Debe ingresar un monto valido."
        );

        return;
    }

    const datosCuota = {

        socio_id:
            Number(socioId),

        periodo_id:
            Number(periodoId),

        categoria_id:
            categoriaId
                ? Number(categoriaId)
                : null,

        fecha_emision:
            fechaEmision ||
            obtenerFechaActual(),

        fecha_vencimiento:
            fechaVencimiento ||
            null,

        monto:
            Number(monto),

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

        if (cuotaId) {

            const resultado =
                await supabaseClient
                    .from("cuotas")
                    .update(
                        {
                            ...datosCuota,
                            updated_at:
                                new Date().toISOString()
                        }
                    )
                    .eq(
                        "id",
                        Number(cuotaId)
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
            "Error inesperado:",
            error
        );

        alert(
            "Ocurrio un error inesperado al guardar la cuota."
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
// ============================================================
// REPORTE DETALLADO DE CUOTAS - PDF
// ============================================================
// ============================================================


// ============================================================
// CARGAR LIBRERIAS PDF
// ============================================================

async function cargarLibreriasPDF() {

    if (
        window.jspdf &&
        window.jspdf.jsPDF
    ) {

        return true;
    }

    return new Promise(function (resolve) {

        const script =
            document.createElement("script");

        script.src =
            "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";

        script.onload =
            function () {

                const scriptTabla =
                    document.createElement("script");

                scriptTabla.src =
                    "https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js";

                scriptTabla.onload =
                    function () {

                        resolve(true);
                    };

                scriptTabla.onerror =
                    function () {

                        resolve(false);
                    };

                document.head.appendChild(
                    scriptTabla
                );
            };

        script.onerror =
            function () {

                resolve(false);
            };

        document.head.appendChild(
            script
        );
    });
}


// ============================================================
// GENERAR REPORTE PDF
// ============================================================

async function generarReporteCuotasPDF() {

    const boton =
        document.getElementById(
            "generarReporteCuotasButton"
        );

    const periodoSelect =
        document.getElementById(
            "periodoSelect"
        );

    const estadoSelect =
        document.getElementById(
            "filtroEstadoCuota"
        );

    const periodoId =
        periodoSelect
            ? periodoSelect.value
            : "";

    const estado =
        estadoSelect
            ? estadoSelect.value
            : "todos";


    // ========================================================
    // VALIDAR PERIODO
    // ========================================================

    if (!periodoId) {

        alert(
            "Seleccione un período financiero antes de generar el reporte."
        );

        return;
    }


    const periodo =
        obtenerPeriodo(periodoId);


    if (!periodo) {

        alert(
            "No fue posible identificar el período seleccionado."
        );

        return;
    }


    // ========================================================
    // ESTADO DEL BOTON
    // ========================================================

    if (boton) {

        boton.disabled =
            true;

        boton.dataset.textoOriginal =
            boton.textContent;

        boton.textContent =
            "Generando PDF...";
    }


    try {

        // ====================================================
        // CARGAR LIBRERIAS
        // ====================================================

        const librerias =
            await cargarLibreriasPDF();

        if (!librerias) {

            alert(
                "No fue posible cargar las herramientas necesarias para generar el PDF."
            );

            return;
        }


        // ====================================================
        // CONSULTAR RPC
        // ====================================================

        const estadoRPC =
            estado === "todos"
                ? null
                : estado;

        const resultado =
            await supabaseClient.rpc(
                "reporte_detallado_cuotas",
                {
                    p_periodo_id:
                        Number(periodoId),

                    p_estado:
                        estadoRPC,

                    p_socio_id:
                        null
                }
            );


        if (resultado.error) {

            console.error(
                "Error al generar reporte detallado:",
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


        if (datos.length === 0) {

            alert(
                "No existen registros de cuotas para los criterios seleccionados."
            );

            return;
        }


        // ====================================================
        // CREAR PDF
        // ====================================================

        const jsPDF =
            window.jspdf.jsPDF;

        const doc =
            new jsPDF(
                {
                    orientation: "landscape",
                    unit: "mm",
                    format: "a4"
                }
            );


        // ====================================================
        // CONFIGURACION GENERAL
        // ====================================================

        const margen =
            12;

        let posicionY =
            14;


        // ====================================================
        // TITULO
        // ====================================================

        doc.setFont(
            "helvetica",
            "bold"
        );

        doc.setFontSize(
            16
        );

        doc.text(
            "SISTEMA FINANCIERO",
            margen,
            posicionY
        );

        posicionY +=
            7;


        doc.setFontSize(
            12
        );

        doc.text(
            "Comunidad Juan Cheuquelen",
            margen,
            posicionY
        );

        posicionY +=
            8;


        doc.setFont(
            "helvetica",
            "bold"
        );

        doc.setFontSize(
            14
        );

        doc.text(
            "Reporte detallado de cuotas",
            margen,
            posicionY
        );

        posicionY +=
            7;


        // ====================================================
        // INFORMACION DEL REPORTE
        // ====================================================

        doc.setFont(
            "helvetica",
            "normal"
        );

        doc.setFontSize(
            9
        );

        const nombrePeriodo =
            obtenerNombrePeriodo(
                periodo
            );

        doc.text(
            "Período: " +
            nombrePeriodo,
            margen,
            posicionY
        );

        posicionY +=
            5;


        doc.text(
            "Estado consultado: " +
            traducirEstadoReporte(estado),
            margen,
            posicionY
        );

        posicionY +=
            5;


        doc.text(
            "Fecha de generación: " +
            formatearFecha(
                obtenerFechaActual()
            ),
            margen,
            posicionY
        );

        posicionY +=
            8;


        // ====================================================
        // RESUMEN
        // ====================================================

        const resumen =
            calcularResumenReporte(
                datos
            );


        doc.setFont(
            "helvetica",
            "bold"
        );

        doc.setFontSize(
            10
        );

        doc.text(
            "Resumen:",
            margen,
            posicionY
        );

        posicionY +=
            5;


        doc.setFont(
            "helvetica",
            "normal"
        );

        doc.text(
            "Cuotas: " +
            resumen.totalCuotas,
            margen,
            posicionY
        );

        doc.text(
            "Pagadas: " +
            resumen.pagadas,
            margen + 42,
            posicionY
        );

        doc.text(
            "Parciales: " +
            resumen.parciales,
            margen + 82,
            posicionY
        );

        doc.text(
            "Pendientes: " +
            resumen.pendientes,
            margen + 125,
            posicionY
        );

        posicionY +=
            5;


        doc.text(
            "Monto cuotas: " +
            formatearMoneda(
                resumen.montoTotal
            ),
            margen,
            posicionY
        );

        doc.text(
            "Total pagado: " +
            formatearMoneda(
                resumen.totalPagado
            ),
            margen + 70,
            posicionY
        );

        doc.text(
            "Saldo pendiente: " +
            formatearMoneda(
                resumen.saldoPendiente
            ),
            margen + 145,
            posicionY
        );

        posicionY +=
            8;


        // ====================================================
        // TABLA PRINCIPAL
        // ====================================================

        const filas =
            [];


        datos.forEach(function (registro) {

            const pagos =
                normalizarPagos(
                    registro.pagos
                );


            const detallePagos =
                construirDetallePagosPDF(
                    pagos
                );


            filas.push(
                [
                    registro.socio_nombre || "—",

                    registro.socio_rut || "—",

                    registro.categoria_nombre || "—",

                    formatearFecha(
                        registro.fecha_emision
                    ),

                    formatearFecha(
                        registro.fecha_vencimiento
                    ),

                    formatearMoneda(
                        registro.monto_cuota
                    ),

                    traducirEstado(
                        registro.estado_cuota
                    ),

                    formatearMoneda(
                        registro.total_pagado
                    ),

                    formatearMoneda(
                        registro.saldo_pendiente
                    ),

                    String(
                        registro.cantidad_pagos || 0
                    ),

                    registro.modalidad_pago ||
                    "Sin pagos",

                    detallePagos
                ]
            );
        });


        doc.autoTable(
            {
                startY: posicionY,

                head: [
                    [
                        "Socio",
                        "RUT",
                        "Categoría",
                        "Emisión",
                        "Vencimiento",
                        "Cuota",
                        "Estado",
                        "Pagado",
                        "Saldo",
                        "N° pagos",
                        "Modalidad",
                        "Detalle de pagos"
                    ]
                ],

                body:
                    filas,

                theme:
                    "grid",

                styles:
                    {
                        font:
                            "helvetica",

                        fontSize:
                            7,

                        cellPadding:
                            2,

                        valign:
                            "top",

                        overflow:
                            "linebreak"
                    },

                headStyles:
                    {
                        fontStyle:
                            "bold",

                        halign:
                            "center"
                    },

                columnStyles:
                    {
                        0:
                            {
                                cellWidth:
                                    34
                            },

                        1:
                            {
                                cellWidth:
                                    24
                            },

                        2:
                            {
                                cellWidth:
                                    25
                            },

                        3:
                            {
                                cellWidth:
                                    18
                            },

                        4:
                            {
                                cellWidth:
                                    20
                            },

                        5:
                            {
                                cellWidth:
                                    20
                            },

                        6:
                            {
                                cellWidth:
                                    18
                            },

                        7:
                            {
                                cellWidth:
                                    20
                            },

                        8:
                            {
                                cellWidth:
                                    20
                            },

                        9:
                            {
                                cellWidth:
                                    13
                            },

                        10:
                            {
                                cellWidth:
                                    25
                            },

                        11:
                            {
                                cellWidth:
                                    65
                            }
                    },

                margin:
                    {
                        left:
                            margen,

                        right:
                            margen
                    },

                didDrawPage:
                    function (data) {

                        agregarEncabezadoPiePDF(
                            doc,
                            data,
                            nombrePeriodo
                        );
                    }
            }
        );


        // ====================================================
        // NOMBRE DEL ARCHIVO
        // ====================================================

        const anio =
            periodo.anio ||
            "periodo";

        const fecha =
            obtenerFechaActual();

        const nombreArchivo =
            "reporte_detallado_cuotas_" +
            anio +
            "_" +
            fecha +
            ".pdf";


        doc.save(
            nombreArchivo
        );


    } catch (error) {

        console.error(
            "Error inesperado al generar PDF:",
            error
        );

        alert(
            "Ocurrió un error inesperado al generar el reporte PDF."
        );


    } finally {

        if (boton) {

            boton.disabled =
                false;

            boton.textContent =
                boton.dataset.textoOriginal ||
                "Generar reporte PDF";
        }
    }
}


// ============================================================
// NORMALIZAR PAGOS
// ============================================================

function normalizarPagos(pagos) {

    if (!pagos) {
        return [];
    }

    if (Array.isArray(pagos)) {
        return pagos;
    }

    if (typeof pagos === "string") {

        try {

            const resultado =
                JSON.parse(pagos);

            return Array.isArray(resultado)
                ? resultado
                : [];

        } catch (error) {

            console.error(
                "No fue posible interpretar los pagos:",
                error
            );

            return [];
        }
    }

    return [];
}


// ============================================================
// CONSTRUIR DETALLE DE PAGOS PARA PDF
// ============================================================

function construirDetallePagosPDF(pagos) {

    if (!pagos || pagos.length === 0) {

        return "Sin pagos registrados";
    }

    return pagos.map(
        function (pago, indice) {

            const numero =
                indice + 1;

            const fecha =
                formatearFecha(
                    pago.fecha_pago
                );

            const monto =
                formatearMoneda(
                    pago.monto
                );

            const medio =
                pago.medio_pago ||
                "—";

            const comprobante =
                pago.numero_comprobante ||
                "—";

            const banco =
                pago.banco_origen ||
                "—";

            const observacion =
                pago.observacion ||
                "—";

            const estado =
                pago.estado ||
                "activo";

            let detalle =
                numero +
                ". " +
                fecha +
                " | " +
                monto +
                " | " +
                medio;

            if (
                comprobante !== "—"
            ) {

                detalle +=
                    " | Comp.: " +
                    comprobante;
            }

            if (
                banco !== "—"
            ) {

                detalle +=
                    " | Banco: " +
                    banco;
            }

            if (
                observacion !== "—"
            ) {

                detalle +=
                    " | Obs.: " +
                    observacion;
            }

            if (
                estado !== "activo"
            ) {

                detalle +=
                    " | Estado: " +
                    estado;
            }

            return detalle;
        }
    ).join(
        "\n"
    );
}


// ============================================================
// RESUMEN DEL REPORTE
// ============================================================

function calcularResumenReporte(datos) {

    let montoTotal =
        0;

    let totalPagado =
        0;

    let saldoPendiente =
        0;

    let pagadas =
        0;

    let parciales =
        0;

    let pendientes =
        0;


    datos.forEach(
        function (registro) {

            montoTotal +=
                Number(
                    registro.monto_cuota
                ) || 0;

            totalPagado +=
                Number(
                    registro.total_pagado
                ) || 0;

            saldoPendiente +=
                Number(
                    registro.saldo_pendiente
                ) || 0;


            switch (
                registro.estado_cuota
            ) {

                case "pagada":

                    pagadas++;

                    break;

                case "parcial":

                    parciales++;

                    break;

                case "pendiente":

                    pendientes++;

                    break;
            }
        }
    );


    return {

        totalCuotas:
            datos.length,

        pagadas:
            pagadas,

        parciales:
            parciales,

        pendientes:
            pendientes,

        montoTotal:
            montoTotal,

        totalPagado:
            totalPagado,

        saldoPendiente:
            saldoPendiente
    };
}


// ============================================================
// TRADUCIR ESTADO DEL REPORTE
// ============================================================

function traducirEstadoReporte(estado) {

    switch (estado) {

        case "todos":
            return "Todos";

        case "pagada":
            return "Pagadas";

        case "parcial":
            return "Parciales";

        case "pendiente":
            return "Pendientes";

        case "anulada":
            return "Anuladas";

        default:
            return estado || "Todos";
    }
}


// ============================================================
// ENCABEZADO Y PIE DEL PDF
// ============================================================

function agregarEncabezadoPiePDF(
    doc,
    data,
    nombrePeriodo
) {

    const numeroPagina =
        doc.internal.getNumberOfPages();

    const anchoPagina =
        doc.internal.pageSize.getWidth();

    const altoPagina =
        doc.internal.pageSize.getHeight();


    // ========================================================
    // PIE DE PAGINA
    // ========================================================

    doc.setFont(
        "helvetica",
        "normal"
    );

    doc.setFontSize(
        7
    );

    doc.text(
        "Sistema Financiero - Comunidad Juan Cheuquelen",
        12,
        altoPagina - 8
    );

    doc.text(
        "Período: " +
        nombrePeriodo,
        anchoPagina / 2,
        altoPagina - 8,
        {
            align:
                "center"
        }
    );

    doc.text(
        "Página " +
        numeroPagina,
        anchoPagina - 12,
        altoPagina - 8,
        {
            align:
                "right"
        }
    );
}


// ============================================================
// OBTENER VALOR
// ============================================================

function obtenerValor(id) {

    const elemento =
        document.getElementById(id);

    if (!elemento) {
        return "";
    }

    return elemento.value.trim();
}


// ============================================================
// CONSTRUIR NOMBRE
// ============================================================

function construirNombreCompleto(socio) {

    return [
        socio.nombres,
        socio.apellido_paterno,
        socio.apellido_materno
    ]
        .filter(function (parte) {

            return (
                parte &&
                String(parte).trim() !== ""
            );

        })
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


// ============================================================
// FORMATEAR FECHA
// ============================================================

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


// ============================================================
// TRADUCIR ESTADO
// ============================================================

function traducirEstado(estado) {

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
            return estado || "—";
    }
}


// ============================================================
// CLASE ESTADO
// ============================================================

function obtenerClaseEstado(estado) {

    switch (estado) {

        case "pagada":
            return "estado-activo";

        case "pendiente":
            return "estado-inactivo";

        case "parcial":
            return "estado-parcial";

        case "anulada":
            return "estado-inactivo";

        default:
            return "estado-inactivo";
    }
}


// ============================================================
// ESCAPAR HTML
// ============================================================

function escaparHTML(texto) {

    return String(texto)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


// ============================================================
// MENSAJES DE ERROR
// ============================================================

function obtenerMensajeError(error) {

    if (!error) {

        return "Ocurrio un error desconocido.";
    }

    console.error(
        "Detalle del error:",
        error
    );

    if (error.code === "23505") {

        return (
            "Ya existe una cuota para el socio y periodo seleccionados."
        );
    }

    if (error.code === "23503") {

        return (
            "No fue posible guardar la cuota porque uno de los registros relacionados no existe."
        );
    }

    if (error.code === "23514") {

        return (
            "Los datos ingresados no cumplen las reglas establecidas para las cuotas."
        );
    }

    if (error.code === "42501") {

        return (
            "No tiene permisos para realizar esta operacion."
        );
    }

    return (
        error.message ||
        "No fue posible completar la operacion."
    );
}


// ============================================================
// CERRAR SESION
// ============================================================

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

    window.location.replace(
        "login.html"
    );
}
