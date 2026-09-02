/* =========================================================
   SISTEMA FINANCIERO
   Módulo: Cuotas
   Comunidad Indígena Juan Cheuquelen
   ========================================================= */


/* =========================================================
   VARIABLES GLOBALES
   ========================================================= */

let usuarioActual = null;
let perfilUsuario = null;

let cuotas = [];
let socios = [];
let periodos = [];
let categorias = [];


/* =========================================================
   INICIO
   ========================================================= */

document.addEventListener("DOMContentLoaded", () => {
    verificarSesion();
});


/* =========================================================
   SESIÓN Y AUTENTICACIÓN
   ========================================================= */

async function verificarSesion() {

    try {

        const {
            data: { session },
            error: sessionError
        } = await supabaseClient.auth.getSession();

        if (sessionError) {
            throw sessionError;
        }

        if (!session) {
            window.location.href = "login.html";
            return;
        }

        usuarioActual = session.user;

        const { data: perfil, error: perfilError } =
            await supabaseClient
                .from("profiles")
                .select("nombre,email,rol,activo")
                .eq("id", usuarioActual.id)
                .maybeSingle();

        if (perfilError) {
            throw perfilError;
        }

        if (!perfil) {
            alert("No se encontró el perfil del usuario.");
            await cerrarSesion();
            return;
        }

        if (perfil.activo === false) {
            alert("Tu usuario se encuentra desactivado.");
            await cerrarSesion();
            return;
        }

        perfilUsuario = perfil;

        /*
         * El rol consulta solamente puede acceder
         * al módulo de reportes.
         */
        if (perfilUsuario.rol === "consulta") {
            window.location.href = "reportes.html";
            return;
        }

        /*
         * Solo administrador y tesorero pueden
         * administrar cuotas.
         */
        if (
            perfilUsuario.rol !== "administrador" &&
            perfilUsuario.rol !== "tesorero"
        ) {
            alert("No tienes permisos para acceder al módulo de cuotas.");
            window.location.href = "index.html";
            return;
        }

        mostrarUsuario();

        configurarEventos();

        await cargarSocios();
        await cargarPeriodos();
        await cargarCategorias();
        await cargarCuotas();

    } catch (error) {

        console.error("Error verificando sesión:", error);

        alert(
            "No fue posible verificar la sesión.\n\n" +
            obtenerMensajeError(error)
        );

        window.location.href = "login.html";
    }
}


/* =========================================================
   MOSTRAR USUARIO
   ========================================================= */

function mostrarUsuario() {

    const nombreElement = document.getElementById("usuarioNombre");
    const rolElement = document.getElementById("usuarioRol");

    if (nombreElement) {

        nombreElement.textContent =
            perfilUsuario?.nombre ||
            perfilUsuario?.email ||
            usuarioActual?.email ||
            "Usuario";
    }

    if (rolElement) {
        rolElement.textContent =
            traducirRol(perfilUsuario?.rol);
    }
}


/* =========================================================
   TRADUCIR ROL
   ========================================================= */

function traducirRol(rol) {

    const roles = {

        administrador: "Administrador",

        tesorero: "Tesorero",

        consulta: "Consulta"
    };

    return roles[rol] || rol || "Usuario";
}


/* =========================================================
   CONFIGURAR EVENTOS
   ========================================================= */

function configurarEventos() {

    /* -----------------------------------------------------
       IR A PAGOS DE CUOTAS
       ----------------------------------------------------- */

    const irPagosCuotasButton =
        document.getElementById("irPagosCuotasButton");

    if (irPagosCuotasButton) {

        irPagosCuotasButton.addEventListener("click", () => {

            window.location.href = "pagos-cuotas.html";
        });
    }


    /* -----------------------------------------------------
       IR A COMPROBANTES
       ----------------------------------------------------- */

    const irComprobantesButton =
        document.getElementById("irComprobantesButton");

    if (irComprobantesButton) {

        irComprobantesButton.addEventListener("click", () => {

            window.location.href = "comprobantes.html";
        });
    }


    /* -----------------------------------------------------
       GENERAR REPORTE
       ----------------------------------------------------- */

    const generarReporteCuotasButton =
        document.getElementById("generarReporteCuotasButton");

    if (generarReporteCuotasButton) {

        generarReporteCuotasButton.addEventListener(
            "click",
            generarReporteCuotasPDF
        );
    }


    /* -----------------------------------------------------
       NUEVA CUOTA
       ----------------------------------------------------- */

    const nuevaCuotaButton =
        document.getElementById("nuevaCuotaButton");

    if (nuevaCuotaButton) {

        nuevaCuotaButton.addEventListener(
            "click",
            abrirModalNuevaCuota
        );
    }


    /* -----------------------------------------------------
       CERRAR MODAL
       ----------------------------------------------------- */

    const cerrarModalButton =
        document.getElementById("cerrarModalCuota");

    if (cerrarModalButton) {

        cerrarModalButton.addEventListener(
            "click",
            cerrarModalCuota
        );
    }


    const cancelarModalButton =
        document.getElementById("cancelarModalCuota");

    if (cancelarModalButton) {

        cancelarModalButton.addEventListener(
            "click",
            cerrarModalCuota
        );
    }


    /* -----------------------------------------------------
       FORMULARIO CUOTA
       ----------------------------------------------------- */

    const formulario =
        document.getElementById("formCuota");

    if (formulario) {

        formulario.addEventListener(
            "submit",
            guardarCuota
        );
    }


    /* -----------------------------------------------------
       BUSCADOR
       ----------------------------------------------------- */

    const buscarCuota =
        document.getElementById("buscarCuota");

    if (buscarCuota) {

        buscarCuota.addEventListener(
            "input",
            aplicarFiltros
        );
    }


    /* -----------------------------------------------------
       FILTRO ESTADO
       ----------------------------------------------------- */

    const filtroEstado =
        document.getElementById("filtroEstadoCuota");

    if (filtroEstado) {

        filtroEstado.addEventListener(
            "change",
            aplicarFiltros
        );
    }


    /* -----------------------------------------------------
       FILTRO PERÍODO
       ----------------------------------------------------- */

    const periodoSelect =
        document.getElementById("periodoSelect");

    if (periodoSelect) {

        periodoSelect.addEventListener(
            "change",
            aplicarFiltros
        );
    }


    /* -----------------------------------------------------
       CERRAR MODAL AL HACER CLICK FUERA
       ----------------------------------------------------- */

    const modal =
        document.getElementById("modalCuota");

    if (modal) {

        modal.addEventListener("click", (event) => {

            if (event.target === modal) {
                cerrarModalCuota();
            }
        });
    }


    /* -----------------------------------------------------
       ESC PARA CERRAR MODAL
       ----------------------------------------------------- */

    document.addEventListener("keydown", (event) => {

        if (event.key === "Escape") {

            const modalActual =
                document.getElementById("modalCuota");

            if (
                modalActual &&
                !modalActual.classList.contains("oculto") &&
                modalActual.style.display !== "none"
            ) {
                cerrarModalCuota();
            }
        }
    });


    /* -----------------------------------------------------
       CERRAR SESIÓN
       ----------------------------------------------------- */

    const cerrarSesionButton =
        document.getElementById("cerrarSesionButton");

    if (cerrarSesionButton) {

        cerrarSesionButton.addEventListener(
            "click",
            cerrarSesion
        );
    }
}


/* =========================================================
   CARGAR SOCIOS
   ========================================================= */

async function cargarSocios() {

    try {

        const { data, error } =
            await supabaseClient
                .from("socios")
                .select(`
                    id,
                    nombres,
                    apellido_paterno,
                    apellido_materno,
                    rut,
                    estado
                `)
                .order("apellido_paterno", {
                    ascending: true
                })
                .order("nombres", {
                    ascending: true
                });

        if (error) {
            throw error;
        }

        socios = data || [];

        llenarSelectSocios();

    } catch (error) {

        console.error("Error cargando socios:", error);

        alert(
            "No fue posible cargar los socios.\n\n" +
            obtenerMensajeError(error)
        );
    }
}


/* =========================================================
   LLENAR SELECT DE SOCIOS
   ========================================================= */

function llenarSelectSocios() {

    const select =
        document.getElementById("socioCuota");

    if (!select) {
        return;
    }

    select.innerHTML =
        '<option value="">Seleccione un socio</option>';

    socios.forEach((socio) => {

        const option =
            document.createElement("option");

        option.value = socio.id;

        option.textContent =
            construirNombreCompleto(socio);

        if (socio.rut) {
            option.textContent +=
                ` — ${socio.rut}`;
        }

        select.appendChild(option);
    });
}


/* =========================================================
   CARGAR PERÍODOS
   ========================================================= */

async function cargarPeriodos() {

    try {

        const { data, error } =
            await supabaseClient
                .from("periodos_financieros")
                .select("*")
                .order("anio", {
                    ascending: false
                });

        if (error) {
            throw error;
        }

        periodos = data || [];

        llenarSelectPeriodos();

    } catch (error) {

        console.error("Error cargando períodos:", error);

        alert(
            "No fue posible cargar los períodos financieros.\n\n" +
            obtenerMensajeError(error)
        );
    }
}


/* =========================================================
   OBTENER NOMBRE PERÍODO
   ========================================================= */

function obtenerNombrePeriodo(periodoId) {

    const periodo =
        periodos.find(
            (item) => String(item.id) === String(periodoId)
        );

    if (!periodo) {
        return "Sin período";
    }

    return periodo.anio
        ? String(periodo.anio)
        : `Período ${periodo.id}`;
}


/* =========================================================
   LLENAR SELECT PERÍODOS
   ========================================================= */

function llenarSelectPeriodos() {

    const selectPeriodo =
        document.getElementById("periodoCuota");

    const filtroPeriodo =
        document.getElementById("periodoSelect");


    /* -----------------------------------------------------
       SELECT DEL FORMULARIO
       ----------------------------------------------------- */

    if (selectPeriodo) {

        selectPeriodo.innerHTML =
            '<option value="">Seleccione un período</option>';

        periodos.forEach((periodo) => {

            const option =
                document.createElement("option");

            option.value = periodo.id;

            option.textContent =
                periodo.anio || `Período ${periodo.id}`;

            selectPeriodo.appendChild(option);
        });
    }


    /* -----------------------------------------------------
       FILTRO
       ----------------------------------------------------- */

    if (filtroPeriodo) {

        const valorActual =
            filtroPeriodo.value;

        filtroPeriodo.innerHTML =
            '<option value="">Todos los períodos</option>';

        periodos.forEach((periodo) => {

            const option =
                document.createElement("option");

            option.value = periodo.id;

            option.textContent =
                periodo.anio || `Período ${periodo.id}`;

            filtroPeriodo.appendChild(option);
        });

        if (
            valorActual &&
            periodos.some(
                (periodo) =>
                    String(periodo.id) ===
                    String(valorActual)
            )
        ) {
            filtroPeriodo.value = valorActual;
        }
    }
}


/* =========================================================
   CARGAR CATEGORÍAS
   ========================================================= */

async function cargarCategorias() {

    try {

        const { data, error } =
            await supabaseClient
                .from("categorias")
                .select("*")
                .order("nombre", {
                    ascending: true
                });

        if (error) {
            throw error;
        }

        categorias = data || [];

        llenarSelectCategorias();

    } catch (error) {

        console.error(
            "Error cargando categorías:",
            error
        );

        alert(
            "No fue posible cargar las categorías.\n\n" +
            obtenerMensajeError(error)
        );
    }
}


/* =========================================================
   OBTENER NOMBRE CATEGORÍA
   ========================================================= */

function obtenerNombreCategoria(categoriaId) {

    const categoria =
        categorias.find(
            (item) =>
                String(item.id) ===
                String(categoriaId)
        );

    if (!categoria) {
        return "Sin categoría";
    }

    return categoria.nombre || "Sin categoría";
}


/* =========================================================
   LLENAR SELECT CATEGORÍAS
   ========================================================= */

function llenarSelectCategorias() {

    const select =
        document.getElementById("categoriaCuota");

    if (!select) {
        return;
    }

    select.innerHTML =
        '<option value="">Seleccione una categoría</option>';

    categorias.forEach((categoria) => {

        const option =
            document.createElement("option");

        option.value = categoria.id;

        option.textContent =
            categoria.nombre || "Sin nombre";

        select.appendChild(option);
    });
}


/* =========================================================
   CARGAR CUOTAS
   ========================================================= */

async function cargarCuotas() {

    const tabla =
        document.getElementById("tablaCuotas");

    if (tabla) {

        tabla.innerHTML = `
            <tr>
                <td
                    colspan="8"
                    class="tabla-cargando"
                >
                    Cargando cuotas...
                </td>
            </tr>
        `;
    }

    try {

        const { data, error } =
            await supabaseClient
                .from("cuotas")
                .select(`
                    id,
                    socio_id,
                    periodo_id,
                    categoria_id,
                    fecha_emision,
                    fecha_vencimiento,
                    monto,
                    estado,
                    observaciones,
                    created_at,
                    updated_at,
                    created_by
                `)
                .order("fecha_emision", {
                    ascending: false
                });

        if (error) {
            throw error;
        }

        cuotas = data || [];

        aplicarFiltros();

    } catch (error) {

        console.error(
            "Error cargando cuotas:",
            error
        );

        if (tabla) {

            tabla.innerHTML = `
                <tr>
                    <td
                        colspan="8"
                        class="tabla-cargando"
                    >
                        No fue posible cargar las cuotas.
                    </td>
                </tr>
            `;
        }

        alert(
            "No fue posible cargar las cuotas.\n\n" +
            obtenerMensajeError(error)
        );
    }
}


/* =========================================================
   APLICAR FILTROS
   ========================================================= */

function aplicarFiltros() {

    const buscar =
        (
            document.getElementById("buscarCuota")?.value ||
            ""
        )
            .trim()
            .toLowerCase();

    const estado =
        document.getElementById(
            "filtroEstadoCuota"
        )?.value || "";

    const periodoId =
        document.getElementById(
            "periodoSelect"
        )?.value || "";


    const resultado =
        cuotas.filter((cuota) => {

            const socio =
                obtenerSocio(cuota.socio_id);

            const nombreSocio =
                socio
                    ? construirNombreCompleto(socio)
                    : "";

            const rutSocio =
                socio?.rut || "";

            const coincideBusqueda =
                !buscar ||
                nombreSocio
                    .toLowerCase()
                    .includes(buscar) ||
                rutSocio
                    .toLowerCase()
                    .includes(buscar);

            const coincideEstado =
                !estado ||
                cuota.estado === estado;

            const coincidePeriodo =
                !periodoId ||
                String(cuota.periodo_id) ===
                    String(periodoId);

            return (
                coincideBusqueda &&
                coincideEstado &&
                coincidePeriodo
            );
        });


    renderizarCuotas(resultado);

    actualizarResumen(resultado);

    actualizarContador(
        resultado.length,
        cuotas.length
    );
}


/* =========================================================
   OBTENER SOCIO
   ========================================================= */

function obtenerSocio(socioId) {

    return socios.find(
        (socio) =>
            String(socio.id) ===
            String(socioId)
    ) || null;
}


/* =========================================================
   OBTENER PERÍODO
   ========================================================= */

function obtenerPeriodo(periodoId) {

    return periodos.find(
        (periodo) =>
            String(periodo.id) ===
            String(periodoId)
    ) || null;
}


/* =========================================================
   OBTENER CATEGORÍA
   ========================================================= */

function obtenerCategoria(categoriaId) {

    return categorias.find(
        (categoria) =>
            String(categoria.id) ===
            String(categoriaId)
    ) || null;
}


/* =========================================================
   RENDERIZAR CUOTAS
   ========================================================= */

function renderizarCuotas(lista) {

    const tabla =
        document.getElementById("tablaCuotas");

    if (!tabla) {
        return;
    }

    if (!lista.length) {

        tabla.innerHTML = `
            <tr>
                <td
                    colspan="8"
                    class="tabla-cargando"
                >
                    No se encontraron cuotas.
                </td>
            </tr>
        `;

        return;
    }

    tabla.innerHTML = "";

    lista.forEach((cuota) => {

        const socio =
            obtenerSocio(cuota.socio_id);

        const periodo =
            obtenerPeriodo(cuota.periodo_id);

        const categoria =
            obtenerCategoria(cuota.categoria_id);

        const fila =
            document.createElement("tr");

        const estadoClase =
            obtenerClaseEstado(cuota.estado);

        fila.innerHTML = `

            <td>
                <strong>
                    ${escaparHTML(
                        socio
                            ? construirNombreCompleto(socio)
                            : "Socio no encontrado"
                    )}
                </strong>

                ${
                    socio?.rut
                        ? `
                            <small
                                class="texto-secundario"
                            >
                                ${escaparHTML(socio.rut)}
                            </small>
                          `
                        : ""
                }
            </td>

            <td>
                ${escaparHTML(
                    periodo?.anio ||
                    obtenerNombrePeriodo(cuota.periodo_id)
                )}
            </td>

            <td>
                ${escaparHTML(
                    categoria?.nombre ||
                    obtenerNombreCategoria(
                        cuota.categoria_id
                    )
                )}
            </td>

            <td>
                ${formatearFecha(
                    cuota.fecha_emision
                )}
            </td>

            <td>
                ${formatearFecha(
                    cuota.fecha_vencimiento
                )}
            </td>

            <td>
                <strong class="monto-cuota">
                    ${formatearMoneda(
                        cuota.monto
                    )}
                </strong>
            </td>

            <td>
                <span
                    class="estado-cuota ${estadoClase}"
                >
                    ${escaparHTML(
                        traducirEstado(cuota.estado)
                    )}
                </span>
            </td>

            <td>

                <div class="acciones-socio">

                    <button
                        type="button"
                        class="boton-accion"
                        title="Editar cuota"
                        onclick="abrirModalEditarCuota('${cuota.id}')"
                    >
                        ✏️
                    </button>

                </div>

            </td>
        `;

        tabla.appendChild(fila);
    });
}


/* =========================================================
   ACTUALIZAR RESUMEN
   ========================================================= */

function actualizarResumen(lista) {

    const pagadas =
        lista.filter(
            (cuota) =>
                cuota.estado === "pagada"
        ).length;

    const pendientes =
        lista.filter(
            (cuota) =>
                cuota.estado === "pendiente"
        ).length;

    const parciales =
        lista.filter(
            (cuota) =>
                cuota.estado === "parcial"
        ).length;


    const totalPagadas =
        document.getElementById(
            "totalCuotasPagadas"
        );

    const totalPendientes =
        document.getElementById(
            "totalCuotasPendientes"
        );

    const totalParciales =
        document.getElementById(
            "totalCuotasParciales"
        );


    if (totalPagadas) {
        totalPagadas.textContent = pagadas;
    }

    if (totalPendientes) {
        totalPendientes.textContent = pendientes;
    }

    if (totalParciales) {
        totalParciales.textContent = parciales;
    }
}


/* =========================================================
   ACTUALIZAR CONTADOR
   ========================================================= */

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

    contador.textContent =
        visible === total
            ? `${total} cuota${total === 1 ? "" : "s"}`
            : `${visible} de ${total} cuotas`;
}


/* =========================================================
   ABRIR MODAL NUEVA CUOTA
   ========================================================= */

function abrirModalNuevaCuota() {

    const modal =
        document.getElementById("modalCuota");

    const formulario =
        document.getElementById("formCuota");

    if (!modal || !formulario) {
        return;
    }

    formulario.reset();

    const titulo =
        document.getElementById(
            "tituloModalCuota"
        );

    const id =
        document.getElementById(
            "cuotaId"
        );

    const botonGuardar =
        document.getElementById(
            "guardarCuota"
        );


    if (titulo) {
        titulo.textContent =
            "Nueva cuota";
    }

    if (id) {
        id.value = "";
    }

    if (botonGuardar) {
        botonGuardar.textContent =
            "Guardar cuota";
    }


    const estado =
        document.getElementById(
            "estadoCuota"
        );

    if (estado) {
        estado.value = "pendiente";
    }


    mostrarModalCuota();
}


/* =========================================================
   ABRIR MODAL EDITAR CUOTA
   ========================================================= */

function abrirModalEditarCuota(cuotaId) {

    const cuota =
        cuotas.find(
            (item) =>
                String(item.id) ===
                String(cuotaId)
        );

    if (!cuota) {

        alert(
            "No se encontró la cuota seleccionada."
        );

        return;
    }


    const modal =
        document.getElementById("modalCuota");

    const titulo =
        document.getElementById(
            "tituloModalCuota"
        );

    const id =
        document.getElementById(
            "cuotaId"
        );

    const socio =
        document.getElementById(
            "socioCuota"
        );

    const periodo =
        document.getElementById(
            "periodoCuota"
        );

    const categoria =
        document.getElementById(
            "categoriaCuota"
        );

    const fechaEmision =
        document.getElementById(
            "fechaEmisionCuota"
        );

    const fechaVencimiento =
        document.getElementById(
            "fechaVencimientoCuota"
        );

    const monto =
        document.getElementById(
            "montoCuota"
        );

    const estado =
        document.getElementById(
            "estadoCuota"
        );

    const observaciones =
        document.getElementById(
            "observacionesCuota"
        );

    const botonGuardar =
        document.getElementById(
            "guardarCuota"
        );


    if (titulo) {
        titulo.textContent =
            "Editar cuota";
    }

    if (id) {
        id.value = cuota.id;
    }

    if (socio) {
        socio.value = cuota.socio_id || "";
    }

    if (periodo) {
        periodo.value = cuota.periodo_id || "";
    }

    if (categoria) {
        categoria.value =
            cuota.categoria_id || "";
    }

    if (fechaEmision) {
        fechaEmision.value =
            cuota.fecha_emision
                ? cuota.fecha_emision.substring(0, 10)
                : "";
    }

    if (fechaVencimiento) {
        fechaVencimiento.value =
            cuota.fecha_vencimiento
                ? cuota.fecha_vencimiento.substring(0, 10)
                : "";
    }

    if (monto) {
        monto.value =
            cuota.monto ?? "";
    }

    if (estado) {
        estado.value =
            cuota.estado || "pendiente";
    }

    if (observaciones) {
        observaciones.value =
            cuota.observaciones || "";
    }

    if (botonGuardar) {
        botonGuardar.textContent =
            "Guardar cambios";
    }

    mostrarModalCuota();
}


/* =========================================================
   MOSTRAR MODAL
   ========================================================= */

function mostrarModalCuota() {

    const modal =
        document.getElementById("modalCuota");

    if (!modal) {
        return;
    }

    modal.style.display = "flex";

    modal.classList.remove("oculto");

    document.body.style.overflow = "hidden";
}


/* =========================================================
   CERRAR MODAL
   ========================================================= */

function cerrarModalCuota() {

    const modal =
        document.getElementById("modalCuota");

    if (!modal) {
        return;
    }

    modal.style.display = "none";

    modal.classList.add("oculto");

    document.body.style.overflow = "";
}


/* =========================================================
   GUARDAR CUOTA
   ========================================================= */

async function guardarCuota(event) {

    event.preventDefault();


    if (
        !perfilUsuario ||
        (
            perfilUsuario.rol !== "administrador" &&
            perfilUsuario.rol !== "tesorero"
        )
    ) {

        alert(
            "No tienes permisos para administrar cuotas."
        );

        return;
    }


    const cuotaId =
        document.getElementById(
            "cuotaId"
        )?.value || null;

    const socioId =
        document.getElementById(
            "socioCuota"
        )?.value || null;

    const periodoId =
        document.getElementById(
            "periodoCuota"
        )?.value || null;

    const categoriaId =
        document.getElementById(
            "categoriaCuota"
        )?.value || null;

    const fechaEmision =
        document.getElementById(
            "fechaEmisionCuota"
        )?.value || null;

    const fechaVencimiento =
        document.getElementById(
            "fechaVencimientoCuota"
        )?.value || null;

    const montoValor =
        document.getElementById(
            "montoCuota"
        )?.value;

    const estado =
        document.getElementById(
            "estadoCuota"
        )?.value || "pendiente";

    const observaciones =
        document.getElementById(
            "observacionesCuota"
        )?.value?.trim() || null;

    const botonGuardar =
        document.getElementById(
            "guardarCuota"
        );


    /* -----------------------------------------------------
       VALIDACIONES
       ----------------------------------------------------- */

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

    if (!categoriaId) {

        alert(
            "Debe seleccionar una categoría."
        );

        return;
    }

    if (!montoValor) {

        alert(
            "Debe ingresar el monto de la cuota."
        );

        return;
    }


    const monto =
        Number(montoValor);


    if (
        !Number.isFinite(monto) ||
        monto <= 0
    ) {

        alert(
            "El monto de la cuota debe ser mayor que cero."
        );

        return;
    }


    if (!fechaEmision) {

        alert(
            "Debe ingresar la fecha de emisión."
        );

        return;
    }


    if (
        fechaVencimiento &&
        fechaVencimiento < fechaEmision
    ) {

        alert(
            "La fecha de vencimiento no puede ser anterior a la fecha de emisión."
        );

        return;
    }


    /* -----------------------------------------------------
       BLOQUEAR BOTÓN
       ----------------------------------------------------- */

    if (botonGuardar) {

        botonGuardar.disabled = true;

        botonGuardar.textContent =
            cuotaId
                ? "Guardando..."
                : "Creando...";
    }


    try {

        const datos = {

            socio_id: socioId,

            periodo_id: periodoId,

            categoria_id: categoriaId,

            fecha_emision: fechaEmision,

            fecha_vencimiento:
                fechaVencimiento || null,

            monto: monto,

            estado: estado,

            observaciones:
                observaciones
        };


        /* -------------------------------------------------
           ACTUALIZAR
           ------------------------------------------------- */

        if (cuotaId) {

            const { error } =
                await supabaseClient
                    .from("cuotas")
                    .update(datos)
                    .eq("id", cuotaId);

            if (error) {
                throw error;
            }


            alert(
                "La cuota fue actualizada correctamente."
            );

        }

        /* -------------------------------------------------
           CREAR
           ------------------------------------------------- */

        else {

            datos.created_by =
                usuarioActual.id;

            const { error } =
                await supabaseClient
                    .from("cuotas")
                    .insert(datos);

            if (error) {
                throw error;
            }


            alert(
                "La cuota fue creada correctamente."
            );
        }


        cerrarModalCuota();

        await cargarCuotas();

    } catch (error) {

        console.error(
            "Error guardando cuota:",
            error
        );


        /*
         * Error típico cuando existe una cuota
         * única para socio + período.
         */
        if (
            error?.code === "23505" ||
            error?.message
                ?.toLowerCase()
                .includes("duplicate")
        ) {

            alert(
                "Ya existe una cuota registrada para este socio y período."
            );

        } else {

            alert(
                "No fue posible guardar la cuota.\n\n" +
                obtenerMensajeError(error)
            );
        }

    } finally {

        if (botonGuardar) {

            botonGuardar.disabled = false;

            botonGuardar.textContent =
                cuotaId
                    ? "Guardar cambios"
                    : "Guardar cuota";
        }
    }
}


/* =========================================================
   CARGAR LIBRERÍAS PDF
   ========================================================= */

async function cargarLibreriasPDF() {

    /*
     * jsPDF
     */

    if (!window.jspdf) {

        await cargarScript(
            "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"
        );
    }


    /*
     * AutoTable
     */

    if (
        !window.jspdf?.jsPDF?.API?.autoTable
    ) {

        await cargarScript(
            "https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js"
        );
    }


    if (!window.jspdf?.jsPDF) {

        throw new Error(
            "No fue posible cargar jsPDF."
        );
    }
}


/* =========================================================
   CARGAR SCRIPT
   ========================================================= */

function cargarScript(src) {

    return new Promise(
        (resolve, reject) => {

            const script =
                document.createElement("script");

            script.src = src;

            script.onload = resolve;

            script.onerror = () =>
                reject(
                    new Error(
                        `No fue posible cargar ${src}`
                    )
                );

            document.head.appendChild(script);
        }
    );
}


/* =========================================================
   GENERAR REPORTE PDF
   ========================================================= */

async function generarReporteCuotasPDF() {

    try {

        await cargarLibreriasPDF();


        const periodoId =
            document.getElementById(
                "periodoSelect"
            )?.value || null;

        const estado =
            document.getElementById(
                "filtroEstadoCuota"
            )?.value || null;


        /*
         * El reporte utiliza la RPC existente
         * para obtener el detalle completo de las
         * cuotas y sus pagos.
         */

        const { data, error } =
            await supabaseClient.rpc(
                "reporte_detallado_cuotas",
                {
                    p_periodo_id:
                        periodoId
                            ? Number(periodoId)
                            : null,

                    p_estado:
                        estado || null,

                    p_socio_id:
                        null
                }
            );


        if (error) {
            throw error;
        }


        const registros =
            Array.isArray(data)
                ? data
                : [];


        if (!registros.length) {

            alert(
                "No existen datos para generar el reporte con los filtros seleccionados."
            );

            return;
        }


        const {
            jsPDF
        } = window.jspdf;


        const pdf =
            new jsPDF({
                orientation: "landscape",
                unit: "mm",
                format: "a4"
            });


        const periodoTexto =
            periodoId
                ? obtenerNombrePeriodo(periodoId)
                : "Todos los períodos";


        agregarEncabezadoPiePDF(
            pdf,
            "REPORTE DETALLADO DE CUOTAS",
            periodoTexto
        );


        const columnas = [

            "Socio",

            "RUT",

            "Período",

            "Categoría",

            "Emisión",

            "Vencimiento",

            "Cuota",

            "Pagado",

            "Saldo",

            "Estado",

            "Detalle pagos"
        ];


        const filas =
            registros.map(
                (registro) => {

                    const socio =
                        registro.socio ||
                        registro.socio_nombre ||
                        "";

                    const rut =
                        registro.rut ||
                        registro.socio_rut ||
                        "";

                    const periodo =
                        registro.periodo ||
                        registro.periodo_anio ||
                        "";

                    const categoria =
                        registro.categoria ||
                        registro.categoria_nombre ||
                        "";

                    const monto =
                        Number(
                            registro.monto ||
                            0
                        );

                    const pagado =
                        Number(
                            registro.pagado ||
                            registro.total_pagado ||
                            0
                        );

                    const saldo =
                        Number(
                            registro.saldo ??
                            (monto - pagado)
                        );

                    const pagos =
                        normalizarPagos(
                            registro
                        );

                    return [

                        socio,

                        rut,

                        periodo,

                        categoria,

                        formatearFecha(
                            registro.fecha_emision
                        ),

                        formatearFecha(
                            registro.fecha_vencimiento
                        ),

                        formatearMoneda(
                            monto
                        ),

                        formatearMoneda(
                            pagado
                        ),

                        formatearMoneda(
                            saldo
                        ),

                        traducirEstadoReporte(
                            registro.estado
                        ),

                        construirDetallePagosPDF(
                            pagos
                        )
                    ];
                }
            );


        pdf.autoTable({

            head: [columnas],

            body: filas,

            startY: 30,

            theme: "grid",

            styles: {

                fontSize: 7,

                cellPadding: 2,

                valign: "middle"
            },

            headStyles: {

                fontSize: 7,

                fontStyle: "bold"
            },

            columnStyles: {

                0: {
                    cellWidth: 38
                },

                1: {
                    cellWidth: 25
                },

                2: {
                    cellWidth: 18
                },

                3: {
                    cellWidth: 28
                },

                4: {
                    cellWidth: 22
                },

                5: {
                    cellWidth: 22
                },

                6: {
                    cellWidth: 22
                },

                7: {
                    cellWidth: 22
                },

                8: {
                    cellWidth: 22
                },

                9: {
                    cellWidth: 20
                },

                10: {
                    cellWidth: 50
                }
            },

            didDrawPage: () => {

                agregarEncabezadoPiePDF(
                    pdf,
                    "REPORTE DETALLADO DE CUOTAS",
                    periodoTexto
                );
            }
        });


        const resumen =
            calcularResumenReporte(
                registros
            );


        let finalY =
            pdf.lastAutoTable?.finalY ||
            30;


        if (
            finalY + 30 >
            pdf.internal.pageSize.getHeight() - 15
        ) {

            pdf.addPage();

            finalY = 20;
        }


        pdf.setFontSize(8);

        pdf.setFont(undefined, "bold");

        pdf.text(
            "Resumen",
            14,
            finalY + 10
        );


        pdf.setFont(undefined, "normal");

        pdf.text(
            `Cuotas: ${resumen.total}`,
            14,
            finalY + 17
        );

        pdf.text(
            `Pagadas: ${resumen.pagadas}`,
            55,
            finalY + 17
        );

        pdf.text(
            `Parciales: ${resumen.parciales}`,
            95,
            finalY + 17
        );

        pdf.text(
            `Pendientes: ${resumen.pendientes}`,
            145,
            finalY + 17
        );

        pdf.text(
            `Total emitido: ${formatearMoneda(resumen.totalCuotas)}`,
            205,
            finalY + 17
        );

        pdf.text(
            `Total pagado: ${formatearMoneda(resumen.totalPagado)}`,
            270,
            finalY + 17
        );


        const fechaArchivo =
            obtenerFechaActual()
                .replaceAll("-", "");


        pdf.save(
            `reporte-cuotas-${fechaArchivo}.pdf`
        );

    } catch (error) {

        console.error(
            "Error generando reporte:",
            error
        );

        alert(
            "No fue posible generar el reporte PDF.\n\n" +
            obtenerMensajeError(error)
        );
    }
}


/* =========================================================
   NORMALIZAR PAGOS
   ========================================================= */

function normalizarPagos(registro) {

    if (
        Array.isArray(
            registro?.pagos
        )
    ) {

        return registro.pagos;
    }


    if (
        typeof registro?.pagos ===
        "string"
    ) {

        try {

            const pagos =
                JSON.parse(
                    registro.pagos
                );

            return Array.isArray(pagos)
                ? pagos
                : [];

        } catch {

            return [];
        }
    }


    return [];
}


/* =========================================================
   CONSTRUIR DETALLE PAGOS PDF
   ========================================================= */

function construirDetallePagosPDF(
    pagos
) {

    if (!pagos.length) {
        return "Sin pagos";
    }


    return pagos
        .map((pago) => {

            const fecha =
                formatearFecha(
                    pago.fecha_pago
                );

            const monto =
                formatearMoneda(
                    Number(
                        pago.monto || 0
                    )
                );

            const medio =
                pago.medio_pago ||
                "Sin medio";

            return `${fecha} - ${monto} - ${medio}`;

        })
        .join("\n");
}


/* =========================================================
   CALCULAR RESUMEN REPORTE
   ========================================================= */

function calcularResumenReporte(
    registros
) {

    let totalCuotas = 0;

    let totalPagado = 0;

    let pagadas = 0;

    let parciales = 0;

    let pendientes = 0;


    registros.forEach(
        (registro) => {

            const monto =
                Number(
                    registro.monto ||
                    0
                );

            const pagado =
                Number(
                    registro.pagado ||
                    registro.total_pagado ||
                    0
                );


            totalCuotas += monto;

            totalPagado += pagado;


            if (
                registro.estado ===
                "pagada"
            ) {

                pagadas++;

            } else if (
                registro.estado ===
                "parcial"
            ) {

                parciales++;

            } else if (
                registro.estado ===
                "pendiente"
            ) {

                pendientes++;
            }
        }
    );


    return {

        total:
            registros.length,

        pagadas,

        parciales,

        pendientes,

        totalCuotas,

        totalPagado
    };
}


/* =========================================================
   TRADUCIR ESTADO REPORTE
   ========================================================= */

function traducirEstadoReporte(
    estado
) {

    return traducirEstado(estado);
}


/* =========================================================
   ENCABEZADO / PIE PDF
   ========================================================= */

function agregarEncabezadoPiePDF(
    pdf,
    titulo,
    periodo
) {

    const ancho =
        pdf.internal.pageSize.getWidth();

    const alto =
        pdf.internal.pageSize.getHeight();


    pdf.setFontSize(13);

    pdf.setFont(undefined, "bold");

    pdf.text(
        "COMUNIDAD INDÍGENA JUAN CHEUQUELÉN",
        14,
        12
    );


    pdf.setFontSize(8);

    pdf.setFont(undefined, "normal");

    pdf.text(
        "RUT: 65.169.427-2",
        14,
        17
    );

    pdf.text(
        "Personería Jurídica N.º 2314",
        14,
        22
    );


    pdf.setFontSize(11);

    pdf.setFont(undefined, "bold");

    pdf.text(
        titulo,
        ancho - 14,
        12,
        {
            align: "right"
        }
    );


    pdf.setFontSize(8);

    pdf.setFont(undefined, "normal");

    pdf.text(
        `Período: ${periodo}`,
        ancho - 14,
        17,
        {
            align: "right"
        }
    );


    pdf.text(
        `Generado: ${formatearFecha(new Date())}`,
        ancho - 14,
        22,
        {
            align: "right"
        }
    );


    pdf.setFontSize(7);

    pdf.text(
        "Sistema Financiero - Comunidad Indígena Juan Cheuquelén",
        14,
        alto - 8
    );


    pdf.text(
        `Página ${pdf.internal.getNumberOfPages()}`,
        ancho - 14,
        alto - 8,
        {
            align: "right"
        }
    );
}


/* =========================================================
   OBTENER VALOR
   ========================================================= */

function obtenerValor(
    objeto,
    propiedades,
    valorPorDefecto = ""
) {

    if (!objeto) {
        return valorPorDefecto;
    }

    for (
        const propiedad of propiedades
    ) {

        if (
            objeto[propiedad] !==
            undefined &&
            objeto[propiedad] !==
            null &&
            objeto[propiedad] !== ""
        ) {

            return objeto[propiedad];
        }
    }

    return valorPorDefecto;
}


/* =========================================================
   CONSTRUIR NOMBRE COMPLETO
   ========================================================= */

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
            (parte) =>
                parte &&
                String(parte).trim()
        )
        .join(" ")
        .trim();
}


/* =========================================================
   OBTENER FECHA ACTUAL
   ========================================================= */

function obtenerFechaActual() {

    const fecha =
        new Date();

    const year =
        fecha.getFullYear();

    const month =
        String(
            fecha.getMonth() + 1
        ).padStart(2, "0");

    const day =
        String(
            fecha.getDate()
        ).padStart(2, "0");


    return `${year}-${month}-${day}`;
}


/* =========================================================
   FORMATEAR MONEDA
   ========================================================= */

function formatearMoneda(
    valor
) {

    const numero =
        Number(valor || 0);

    return numero.toLocaleString(
        "es-CL",
        {
            style: "currency",
            currency: "CLP",
            maximumFractionDigits: 0
        }
    );
}


/* =========================================================
   FORMATEAR FECHA
   ========================================================= */

function formatearFecha(
    fecha
) {

    if (!fecha) {
        return "-";
    }


    const fechaObjeto =
        fecha instanceof Date
            ? fecha
            : new Date(fecha);


    if (
        Number.isNaN(
            fechaObjeto.getTime()
        )
    ) {
        return "-";
    }


    const dia =
        String(
            fechaObjeto.getDate()
        ).padStart(2, "0");

    const mes =
        String(
            fechaObjeto.getMonth() + 1
        ).padStart(2, "0");

    const anio =
        fechaObjeto.getFullYear();


    return `${dia}-${mes}-${anio}`;
}


/* =========================================================
   TRADUCIR ESTADO
   ========================================================= */

function traducirEstado(
    estado
) {

    const estados = {

        pagada: "Pagada",

        pendiente: "Pendiente",

        parcial: "Parcial",

        anulada: "Anulada",

        activa: "Activa",

        inactiva: "Inactiva"
    };


    return estados[estado] ||
        estado ||
        "Sin estado";
}


/* =========================================================
   OBTENER CLASE ESTADO
   ========================================================= */

function obtenerClaseEstado(
    estado
) {

    const clases = {

        pagada: "pagada",

        pendiente: "pendiente",

        parcial: "parcial",

        anulada: "anulada"
    };


    return clases[estado] ||
        "pendiente";
}


/* =========================================================
   ESCAPAR HTML
   ========================================================= */

function escaparHTML(
    valor
) {

    if (
        valor ===
        null ||
        valor ===
        undefined
    ) {
        return "";
    }


    return String(valor)

        .replaceAll(
            "&",
            "&amp;"
        )

        .replaceAll(
            "<",
            "&lt;"
        )

        .replaceAll(
            ">",
            "&gt;"
        )

        .replaceAll(
            '"',
            "&quot;"
        )

        .replaceAll(
            "'",
            "&#039;"
        );
}


/* =========================================================
   OBTENER MENSAJE ERROR
   ========================================================= */

function obtenerMensajeError(
    error
) {

    if (!error) {
        return "Error desconocido.";
    }


    if (
        typeof error ===
        "string"
    ) {
        return error;
    }


    if (
        error.message
    ) {
        return error.message;
    }


    if (
        error.details
    ) {
        return error.details;
    }


    if (
        error.hint
    ) {
        return error.hint;
    }


    try {

        return JSON.stringify(
            error
        );

    } catch {

        return "Error desconocido.";
    }
}


/* =========================================================
   CERRAR SESIÓN
   ========================================================= */

async function cerrarSesion() {

    try {

        const {
            error
        } =
            await supabaseClient.auth.signOut();

        if (error) {
            throw error;
        }

        window.location.href =
            "login.html";

    } catch (error) {

        console.error(
            "Error cerrando sesión:",
            error
        );

        alert(
            "No fue posible cerrar la sesión.\n\n" +
            obtenerMensajeError(error)
        );
    }
}
