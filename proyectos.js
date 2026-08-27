/* ============================================================
   SISTEMA FINANCIERO
   MODULO DE PROYECTOS
   ============================================================ */

let usuarioActual = null;
let perfilUsuario = null;

let proyectos = [];
let periodos = [];

let proyectoEditando = null;


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
            "Error al comprobar la sesión:",
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


    perfilUsuario =
        resultadoPerfil.data;


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


    configurarEventos();

    await cargarPeriodos();

    await cargarProyectos();

}


/* ============================================================
   CONFIGURAR EVENTOS
   ============================================================ */

function configurarEventos() {

    const nuevo =
        document.getElementById(
            "nuevoProyectoButton"
        );


    if (nuevo) {

        nuevo.addEventListener(
            "click",
            abrirNuevoProyecto
        );

    }


    const formulario =
        document.getElementById(
            "formProyecto"
        );


    if (formulario) {

        formulario.addEventListener(
            "submit",
            guardarProyecto
        );

    }


    const cerrar =
        document.getElementById(
            "cerrarModalProyecto"
        );


    if (cerrar) {

        cerrar.addEventListener(
            "click",
            cerrarModalProyecto
        );

    }


    const cancelar =
        document.getElementById(
            "cancelarProyecto"
        );


    if (cancelar) {

        cancelar.addEventListener(
            "click",
            cerrarModalProyecto
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


    const estado =
        document.getElementById(
            "estadoSelect"
        );


    if (estado) {

        estado.addEventListener(
            "change",
            aplicarFiltros
        );

    }


    const buscar =
        document.getElementById(
            "buscarProyecto"
        );


    if (buscar) {

        buscar.addEventListener(
            "input",
            aplicarFiltros
        );

    }


    const modal =
        document.getElementById(
            "modalProyecto"
        );


    if (modal) {

        modal.addEventListener(
            "click",
            function (event) {

                if (
                    event.target === modal
                ) {

                    cerrarModalProyecto();

                }

            }
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


    const filtro =
        document.getElementById(
            "periodoSelect"
        );


    const formulario =
        document.getElementById(
            "proyectoPeriodo"
        );


    if (filtro) {

        filtro.innerHTML =
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
                    `${periodo.anio} — ${capitalizar(periodo.estado)}`;


                filtro.appendChild(
                    option
                );

            }
        );

    }


    if (formulario) {

        formulario.innerHTML =
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


                formulario.appendChild(
                    option
                );

            }
        );

    }

}


/* ============================================================
   CARGAR PROYECTOS
   ============================================================ */

async function cargarProyectos() {

    const tabla =
        document.getElementById(
            "tablaProyectos"
        );


    if (tabla) {

        tabla.innerHTML =
            '<tr>' +
            '<td colspan="7" class="tabla-cargando">' +
            'Cargando proyectos...' +
            '</td>' +
            '</tr>';

    }


    const resultado =
        await supabaseClient
            .from("proyectos")
            .select(
                "id, periodo_id, nombre, codigo, organismo_financiador, descripcion, fecha_postulacion, fecha_adjudicacion, monto_adjudicado, estado, responsable, observaciones, created_at, updated_at, created_by"
            )
            .order(
                "created_at",
                {
                    ascending: false
                }
            );


    if (resultado.error) {

        console.error(
            "Error al cargar proyectos:",
            resultado.error
        );


        if (tabla) {

            tabla.innerHTML =
                '<tr>' +
                '<td colspan="7" class="tabla-cargando">' +
                'No fue posible cargar los proyectos.' +
                '</td>' +
                '</tr>';

        }

        return;
    }


    proyectos =
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


    const estado =
        document.getElementById(
            "estadoSelect"
        );


    const buscar =
        document.getElementById(
            "buscarProyecto"
        );


    const periodoId =
        periodo
            ? periodo.value
            : "";


    const estadoValor =
        estado
            ? estado.value
            : "";


    const textoBusqueda =
        buscar
            ? buscar.value
                .trim()
                .toLowerCase()
            : "";


    const filtrados =
        proyectos.filter(
            function (proyecto) {

                const coincidePeriodo =
                    !periodoId ||
                    String(
                        proyecto.periodo_id
                    ) ===
                    String(periodoId);


                const coincideEstado =
                    !estadoValor ||
                    proyecto.estado ===
                    estadoValor;


                const nombre =
                    String(
                        proyecto.nombre || ""
                    )
                    .toLowerCase();


                const codigo =
                    String(
                        proyecto.codigo || ""
                    )
                    .toLowerCase();


                const coincideBusqueda =
                    !textoBusqueda ||
                    nombre.includes(
                        textoBusqueda
                    ) ||
                    codigo.includes(
                        textoBusqueda
                    );


                return (
                    coincidePeriodo &&
                    coincideEstado &&
                    coincideBusqueda
                );

            }
        );


    renderizarProyectos(
        filtrados
    );


    actualizarResumen(
        filtrados
    );

}


/* ============================================================
   RENDERIZAR PROYECTOS
   ============================================================ */

function renderizarProyectos(lista) {

    const tabla =
        document.getElementById(
            "tablaProyectos"
        );


    if (!tabla) {
        return;
    }


    tabla.innerHTML =
        "";


    if (lista.length === 0) {

        tabla.innerHTML =
            '<tr>' +
            '<td colspan="7" class="tabla-cargando">' +
            'No se encontraron proyectos.' +
            '</td>' +
            '</tr>';

        return;
    }


    lista.forEach(
        function (proyecto) {

            const fila =
                document.createElement(
                    "tr"
                );


            const periodo =
                obtenerPeriodo(
                    proyecto.periodo_id
                );


            fila.innerHTML =

                '<td>' +
                '<strong>' +
                escaparHTML(
                    proyecto.nombre
                ) +
                '</strong>' +
                '</td>' +

                '<td>' +
                escaparHTML(
                    proyecto.codigo ||
                    "—"
                ) +
                '</td>' +

                '<td>' +
                (
                    periodo
                        ? periodo.anio
                        : "—"
                ) +
                '</td>' +

                '<td>' +
                escaparHTML(
                    proyecto.organismo_financiador ||
                    "—"
                ) +
                '</td>' +

                '<td>' +
                crearEtiquetaEstado(
                    proyecto.estado
                ) +
                '</td>' +

                '<td>' +
                formatearMoneda(
                    proyecto.monto_adjudicado
                ) +
                '</td>' +

                '<td>' +

                '<button ' +
                'type="button" ' +
                'class="boton-tabla" ' +
                'data-accion="detalle" ' +
                'data-id="' +
                proyecto.id +
                '">' +
                'Detalle' +
                '</button>' +

                '<button ' +
                'type="button" ' +
                'class="boton-tabla" ' +
                'data-accion="editar" ' +
                'data-id="' +
                proyecto.id +
                '">' +
                'Editar' +
                '</button>' +

                '</td>';


            tabla.appendChild(
                fila
            );

        }
    );


    const botones =
        tabla.querySelectorAll(
            "[data-accion]"
        );


    botones.forEach(
        function (boton) {

            boton.addEventListener(
                "click",
                function () {

                    const id =
                        Number(
                            boton.dataset.id
                        );


                    const accion =
                        boton.dataset.accion;


                    /* ====================================================
                       DETALLE
                       Ahora se abre la página independiente del proyecto.
                       ==================================================== */

                    if (
                        accion ===
                        "detalle"
                    ) {

                        window.location.href =
                            "proyecto_detalle.html?id=" +
                            id;

                    }


                    /* ====================================================
                       EDITAR
                       ==================================================== */

                    if (
                        accion ===
                        "editar"
                    ) {

                        abrirEditarProyecto(
                            id
                        );

                    }

                }
            );

        }
    );

}


/* ============================================================
   RESUMEN
   ============================================================ */

function actualizarResumen(lista) {

    const total =
        lista.length;


    const adjudicados =
        lista.filter(
            function (proyecto) {

                return (
                    proyecto.estado ===
                    "adjudicado"
                );

            }
        ).length;


    const ejecucion =
        lista.filter(
            function (proyecto) {

                return (
                    proyecto.estado ===
                    "en_ejecucion"
                );

            }
        ).length;


    const monto =
        lista.reduce(
            function (total, proyecto) {

                return (
                    total +
                    (
                        Number(
                            proyecto.monto_adjudicado
                        ) || 0
                    )
                );

            },
            0
        );


    establecerTexto(
        "totalProyectos",
        total
    );


    establecerTexto(
        "proyectosAdjudicados",
        adjudicados
    );


    establecerTexto(
        "proyectosEjecucion",
        ejecucion
    );


    establecerTexto(
        "montoAdjudicado",
        formatearMoneda(monto)
    );

}


/* ============================================================
   ABRIR NUEVO PROYECTO
   ============================================================ */

function abrirNuevoProyecto() {

    proyectoEditando =
        null;


    const formulario =
        document.getElementById(
            "formProyecto"
        );


    if (formulario) {

        formulario.reset();

    }


    establecerValor(
        "proyectoId",
        ""
    );


    establecerValor(
        "proyectoMonto",
        "0"
    );


    establecerValor(
        "proyectoEstado",
        "postulado"
    );


    const titulo =
        document.getElementById(
            "tituloModalProyecto"
        );


    if (titulo) {

        titulo.textContent =
            "Nuevo proyecto";

    }


    const boton =
        document.getElementById(
            "guardarProyectoButton"
        );


    if (boton) {

        boton.textContent =
            "Guardar proyecto";

    }


    abrirModalProyecto();

}


/* ============================================================
   ABRIR EDITAR
   ============================================================ */

function abrirEditarProyecto(id) {

    const proyecto =
        proyectos.find(
            function (elemento) {

                return (
                    Number(elemento.id) ===
                    Number(id)
                );

            }
        );


    if (!proyecto) {

        alert(
            "No fue posible encontrar el proyecto."
        );

        return;
    }


    proyectoEditando =
        proyecto;


    establecerValor(
        "proyectoId",
        proyecto.id
    );


    establecerValor(
        "proyectoPeriodo",
        proyecto.periodo_id
    );


    establecerValor(
        "proyectoNombre",
        proyecto.nombre
    );


    establecerValor(
        "proyectoCodigo",
        proyecto.codigo
    );


    establecerValor(
        "proyectoFinanciador",
        proyecto.organismo_financiador
    );


    establecerValor(
        "proyectoMonto",
        proyecto.monto_adjudicado
    );


    establecerValor(
        "proyectoEstado",
        proyecto.estado
    );


    establecerValor(
        "proyectoResponsable",
        proyecto.responsable
    );


    establecerValor(
        "proyectoPostulacion",
        proyecto.fecha_postulacion
    );


    establecerValor(
        "proyectoAdjudicacion",
        proyecto.fecha_adjudicacion
    );


    establecerValor(
        "proyectoDescripcion",
        proyecto.descripcion
    );


    establecerValor(
        "proyectoObservaciones",
        proyecto.observaciones
    );


    const titulo =
        document.getElementById(
            "tituloModalProyecto"
        );


    if (titulo) {

        titulo.textContent =
            "Editar proyecto";

    }


    const boton =
        document.getElementById(
            "guardarProyectoButton"
        );


    if (boton) {

        boton.textContent =
            "Guardar cambios";

    }


    abrirModalProyecto();

}


/* ============================================================
   GUARDAR PROYECTO
   ============================================================ */

async function guardarProyecto(event) {

    event.preventDefault();


    if (!perfilUsuario) {

        alert(
            "No se pudo identificar al usuario."
        );

        return;
    }


    if (
        perfilUsuario.rol !== "administrador" &&
        perfilUsuario.rol !== "tesorero"
    ) {

        alert(
            "No tiene permisos para gestionar proyectos."
        );

        return;
    }


    const id =
        document.getElementById(
            "proyectoId"
        ).value;


    const periodoId =
        Number(
            document.getElementById(
                "proyectoPeriodo"
            ).value
        );


    const nombre =
        document.getElementById(
            "proyectoNombre"
        ).value.trim();


    const codigo =
        document.getElementById(
            "proyectoCodigo"
        ).value.trim();


    const financiador =
        document.getElementById(
            "proyectoFinanciador"
        ).value.trim();


    const monto =
        Number(
            document.getElementById(
                "proyectoMonto"
            ).value
        ) || 0;


    const estado =
        document.getElementById(
            "proyectoEstado"
        ).value;


    const responsable =
        document.getElementById(
            "proyectoResponsable"
        ).value.trim();


    const fechaPostulacion =
        document.getElementById(
            "proyectoPostulacion"
        ).value;


    const fechaAdjudicacion =
        document.getElementById(
            "proyectoAdjudicacion"
        ).value;


    const descripcion =
        document.getElementById(
            "proyectoDescripcion"
        ).value.trim();


    const observaciones =
        document.getElementById(
            "proyectoObservaciones"
        ).value.trim();


    /* ========================================================
       VALIDACIONES
       ======================================================== */

    if (!periodoId) {

        alert(
            "Debe seleccionar un período financiero."
        );

        return;
    }


    if (!nombre) {

        alert(
            "Debe ingresar el nombre del proyecto."
        );

        return;
    }


    if (monto < 0) {

        alert(
            "El monto adjudicado no puede ser negativo."
        );

        return;
    }


    if (
        ![
            "postulado",
            "adjudicado",
            "en_ejecucion",
            "rendido",
            "cerrado",
            "rechazado"
        ].includes(estado)
    ) {

        alert(
            "El estado seleccionado no es válido."
        );

        return;
    }


    const periodo =
        obtenerPeriodo(
            periodoId
        );


    if (!periodo) {

        alert(
            "El período seleccionado no existe."
        );

        return;
    }


    /* ========================================================
       DATOS
       ======================================================== */

    const datos = {

        periodo_id:
            periodoId,

        nombre:
            nombre,

        codigo:
            codigo ||
            null,

        organismo_financiador:
            financiador ||
            null,

        descripcion:
            descripcion ||
            null,

        fecha_postulacion:
            fechaPostulacion ||
            null,

        fecha_adjudicacion:
            fechaAdjudicacion ||
            null,

        monto_adjudicado:
            monto,

        estado:
            estado,

        responsable:
            responsable ||
            null,

        observaciones:
            observaciones ||
            null

    };


    const boton =
        document.getElementById(
            "guardarProyectoButton"
        );


    if (boton) {

        boton.disabled =
            true;

        boton.textContent =
            id
                ? "Guardando..."
                : "Creando...";

    }


    try {

        let resultado;


        if (id) {

            resultado =
                await supabaseClient
                    .from("proyectos")
                    .update(
                        datos
                    )
                    .eq(
                        "id",
                        Number(id)
                    )
                    .select()
                    .single();

        } else {

            datos.created_by =
                usuarioActual.id;


            resultado =
                await supabaseClient
                    .from("proyectos")
                    .insert(
                        datos
                    )
                    .select()
                    .single();

        }


        if (resultado.error) {

            console.error(
                "Error al guardar proyecto:",
                resultado.error
            );


            alert(
                "No fue posible guardar el proyecto.\n\n" +
                resultado.error.message
            );

            return;
        }


        alert(
            id
                ? "Proyecto actualizado correctamente."
                : "Proyecto creado correctamente."
        );


        cerrarModalProyecto();


        await cargarProyectos();

    }

    catch (error) {

        console.error(
            "Error inesperado:",
            error
        );


        alert(
            "Ocurrió un error inesperado."
        );

    }

    finally {

        if (boton) {

            boton.disabled =
                false;

            boton.textContent =
                id
                    ? "Guardar cambios"
                    : "Guardar proyecto";

        }

    }

}


/* ============================================================
   MODALES
   ============================================================ */

function abrirModalProyecto() {

    const modal =
        document.getElementById(
            "modalProyecto"
        );


    if (modal) {

        modal.style.display =
            "flex";

    }

}


function cerrarModalProyecto() {

    const modal =
        document.getElementById(
            "modalProyecto"
        );


    if (modal) {

        modal.style.display =
            "none";

    }

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

    let clase =
        "";


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

        default:
            clase =
                "";

    }


    return (
        '<span class="estado ' +
        clase +
        '">' +
        escaparHTML(
            traducirEstado(estado)
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


/* ============================================================
   ESTABLECER VALOR
   ============================================================ */

function establecerValor(
    id,
    valor
) {

    const elemento =
        document.getElementById(
            id
        );


    if (elemento) {

        elemento.value =
            valor === null ||
            valor === undefined
                ? ""
                : valor;

    }

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

