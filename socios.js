let usuarioActual = null;
let perfilUsuario = null;
let socios = [];

document.addEventListener("DOMContentLoaded", async () => {
    await verificarSesion();
});

async function verificarSesion() {
    const {
        data: { session },
        error: sessionError
    } = await supabaseClient.auth.getSession();

    if (sessionError) {
        console.error(
            "Error al comprobar la sesión:",
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

    const {
        data: perfil,
        error
    } = await supabaseClient
        .from("profiles")
        .select("nombre, email, rol, activo")
        .eq("id", usuarioActual.id)
        .single();

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
            "No existe un perfil asociado a este usuario."
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

    if (
        perfilUsuario.rol !== "administrador" &&
        perfilUsuario.rol !== "tesorero"
    ) {
        alert(
            "No tiene permisos para administrar socios."
        );

        window.location.href = "dashboard.html";

        return;
    }

    mostrarUsuario();

    configurarEventos();

    await cargarSocios();
}

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
    const nuevoSocioButton =
        document.getElementById(
            "nuevoSocioButton"
        );

    if (nuevoSocioButton) {
        nuevoSocioButton.addEventListener(
            "click",
            abrirModalNuevoSocio
        );
    }


    /* =====================================================
       BOTONES DE NÓMINA
       ===================================================== */

    const exportarExcelButton =
        document.getElementById(
            "exportarExcelButton"
        );

    if (exportarExcelButton) {
        exportarExcelButton.addEventListener(
            "click",
            exportarNominaExcel
        );
    }


    const exportarPdfButton =
        document.getElementById(
            "exportarPdfButton"
        );

    if (exportarPdfButton) {
        exportarPdfButton.addEventListener(
            "click",
            exportarNominaPDF
        );
    }


    const imprimirNominaButton =
        document.getElementById(
            "imprimirNominaButton"
        );

    if (imprimirNominaButton) {
        imprimirNominaButton.addEventListener(
            "click",
            imprimirNominaSocios
        );
    }


    /* =====================================================
       MODAL
       ===================================================== */

    const cerrarModal =
        document.getElementById(
            "cerrarModal"
        );

    if (cerrarModal) {
        cerrarModal.addEventListener(
            "click",
            cerrarModalSocio
        );
    }


    const cancelarSocio =
        document.getElementById(
            "cancelarSocio"
        );

    if (cancelarSocio) {
        cancelarSocio.addEventListener(
            "click",
            cerrarModalSocio
        );
    }


    const formSocio =
        document.getElementById(
            "formSocio"
        );

    if (formSocio) {
        formSocio.addEventListener(
            "submit",
            guardarSocio
        );
    }


    /* =====================================================
       BÚSQUEDA
       ===================================================== */

    const buscarSocio =
        document.getElementById(
            "buscarSocio"
        );

    if (buscarSocio) {
        buscarSocio.addEventListener(
            "input",
            aplicarFiltros
        );
    }


    /* =====================================================
       FILTRO ESTADO
       ===================================================== */

    const filtroEstado =
        document.getElementById(
            "filtroEstado"
        );

    if (filtroEstado) {
        filtroEstado.addEventListener(
            "change",
            aplicarFiltros
        );
    }


    /* =====================================================
       CERRAR MODAL HACIENDO CLICK AFUERA
       ===================================================== */

    const modal =
        document.getElementById(
            "modalSocio"
        );

    if (modal) {
        modal.addEventListener(
            "click",
            (event) => {
                if (event.target === modal) {
                    cerrarModalSocio();
                }
            }
        );
    }


    /* =====================================================
       CERRAR SESIÓN
       ===================================================== */

    const logoutButton =
        document.getElementById(
            "logoutButton"
        );

    if (logoutButton) {
        logoutButton.addEventListener(
            "click",
            cerrarSesion
        );
    }
}

async function cargarSocios() {
    const tabla =
        document.getElementById(
            "tablaSocios"
        );

    if (tabla) {
        tabla.innerHTML = `
            <tr>
                <td colspan="6" class="tabla-cargando">
                    Cargando socios...
                </td>
            </tr>
        `;
    }

    const {
        data,
        error
    } = await supabaseClient
        .from("socios")
        .select(`
            id,
            nombres,
            apellido_paterno,
            apellido_materno,
            rut,
            telefono,
            email,
            direccion,
            fecha_ingreso,
            estado,
            observaciones,
            created_at,
            updated_at
        `)
        .order("apellido_paterno", {
            ascending: true,
            nullsFirst: false
        })
        .order("nombres", {
            ascending: true
        });

    if (error) {
        console.error(
            "Error al cargar socios:",
            error
        );

        if (tabla) {
            tabla.innerHTML = `
                <tr>
                    <td colspan="6" class="tabla-cargando">
                        No fue posible cargar los socios.
                    </td>
                </tr>
            `;
        }

        actualizarContador(0);

        return;
    }

    socios = data || [];

    aplicarFiltros();
}

function aplicarFiltros() {
    const buscarInput =
        document.getElementById(
            "buscarSocio"
        );

    const filtroEstado =
        document.getElementById(
            "filtroEstado"
        );

    const textoBusqueda =
        buscarInput
            ? buscarInput.value
                .trim()
                .toLowerCase()
            : "";

    const estadoSeleccionado =
        filtroEstado
            ? filtroEstado.value
            : "todos";

    const sociosFiltrados =
        socios.filter((socio) => {

            const nombreCompleto =
                construirNombreCompleto(
                    socio
                )
                .toLowerCase();

            const rut =
                socio.rut
                    ? socio.rut.toLowerCase()
                    : "";

            const coincideBusqueda =
                textoBusqueda === "" ||
                nombreCompleto.includes(
                    textoBusqueda
                ) ||
                rut.includes(
                    textoBusqueda
                );

            const coincideEstado =
                estadoSeleccionado === "todos" ||
                socio.estado ===
                    estadoSeleccionado;

            return (
                coincideBusqueda &&
                coincideEstado
            );
        });

    renderizarSocios(
        sociosFiltrados
    );

    actualizarContador(
        sociosFiltrados.length,
        socios.length
    );
}

function renderizarSocios(lista) {
    const tabla =
        document.getElementById(
            "tablaSocios"
        );

    if (!tabla) {
        return;
    }

    tabla.innerHTML = "";

    if (lista.length === 0) {
        tabla.innerHTML = `
            <tr>
                <td colspan="6" class="tabla-cargando">
                    No se encontraron socios.
                </td>
            </tr>
        `;

        return;
    }

    lista.forEach((socio) => {
        const fila =
            document.createElement(
                "tr"
            );

        const nombre =
            construirNombreCompleto(
                socio
            );

        const rut =
            socio.rut || "—";

        const telefono =
            socio.telefono || "—";

        const email =
            socio.email || "—";

        const estado =
            socio.estado || "—";

        const claseEstado =
            estado === "activo"
                ? "estado-activo"
                : "estado-inactivo";

        fila.innerHTML = `
            <td>
                <strong>
                    ${escaparHTML(nombre)}
                </strong>
            </td>

            <td>
                ${escaparHTML(rut)}
            </td>

            <td>
                ${escaparHTML(telefono)}
            </td>

            <td>
                ${escaparHTML(email)}
            </td>

            <td>
                <span class="${claseEstado}">
                    ${capitalizar(estado)}
                </span>
            </td>

            <td>
                <button
                    type="button"
                    class="boton-tabla"
                    data-accion="editar"
                    data-id="${socio.id}"
                >
                    Editar
                </button>
            </td>
        `;

        tabla.appendChild(fila);
    });

    const botonesEditar =
        tabla.querySelectorAll(
            '[data-accion="editar"]'
        );

    botonesEditar.forEach(
        (boton) => {

            boton.addEventListener(
                "click",
                () => {

                    const id =
                        Number(
                            boton.dataset.id
                        );

                    abrirModalEditarSocio(
                        id
                    );
                }
            );
        }
    );
}

function construirNombreCompleto(socio) {
    return [
        socio.nombres,
        socio.apellido_paterno,
        socio.apellido_materno
    ]
        .filter((parte) => {
            return (
                parte &&
                parte.trim() !== ""
            );
        })
        .join(" ");
}

function actualizarContador(
    cantidadVisible,
    cantidadTotal = cantidadVisible
) {
    const contador =
        document.getElementById(
            "contadorSocios"
        );

    if (!contador) {
        return;
    }

    if (cantidadTotal === 0) {
        contador.textContent =
            "No existen socios registrados.";

        return;
    }

    if (
        cantidadVisible !==
        cantidadTotal
    ) {
        contador.textContent =
            `${cantidadVisible} de ${cantidadTotal} socios`;

        return;
    }

    contador.textContent =
        cantidadTotal === 1
            ? "1 socio registrado"
            : `${cantidadTotal} socios registrados`;
}

function abrirModalNuevoSocio() {
    const modal =
        document.getElementById(
            "modalSocio"
        );

    const titulo =
        document.getElementById(
            "modalTitulo"
        );

    const form =
        document.getElementById(
            "formSocio"
        );

    if (
        !modal ||
        !titulo ||
        !form
    ) {
        return;
    }

    form.reset();

    const socioId =
        document.getElementById(
            "socioId"
        );

    if (socioId) {
        socioId.value = "";
    }

    titulo.textContent =
        "Nuevo socio";

    const estado =
        document.getElementById(
            "estado"
        );

    if (estado) {
        estado.value =
            "activo";
    }

    const fechaIngreso =
        document.getElementById(
            "fechaIngreso"
        );

    if (fechaIngreso) {
        fechaIngreso.value =
            obtenerFechaActual();
    }

    modal.style.display =
        "flex";

    const nombres =
        document.getElementById(
            "nombres"
        );

    if (nombres) {
        nombres.focus();
    }
}

function abrirModalEditarSocio(id) {
    const socio =
        socios.find(
            (elemento) =>
                Number(elemento.id) ===
                Number(id)
        );

    if (!socio) {
        alert(
            "No fue posible encontrar el socio seleccionado."
        );

        return;
    }

    const modal =
        document.getElementById(
            "modalSocio"
        );

    const titulo =
        document.getElementById(
            "modalTitulo"
        );

    if (
        !modal ||
        !titulo
    ) {
        return;
    }

    titulo.textContent =
        "Editar socio";

    document.getElementById(
        "socioId"
    ).value =
        socio.id;

    document.getElementById(
        "nombres"
    ).value =
        socio.nombres || "";

    document.getElementById(
        "apellidoPaterno"
    ).value =
        socio.apellido_paterno || "";

    document.getElementById(
        "apellidoMaterno"
    ).value =
        socio.apellido_materno || "";

    document.getElementById(
        "rut"
    ).value =
        socio.rut || "";

    document.getElementById(
        "telefono"
    ).value =
        socio.telefono || "";

    document.getElementById(
        "email"
    ).value =
        socio.email || "";

    document.getElementById(
        "direccion"
    ).value =
        socio.direccion || "";

    document.getElementById(
        "fechaIngreso"
    ).value =
        socio.fecha_ingreso || "";

    document.getElementById(
        "estado"
    ).value =
        socio.estado || "activo";

    document.getElementById(
        "observaciones"
    ).value =
        socio.observaciones || "";

    modal.style.display =
        "flex";

    document.getElementById(
        "nombres"
    ).focus();
}

function cerrarModalSocio() {
    const modal =
        document.getElementById(
            "modalSocio"
        );

    if (!modal) {
        return;
    }

    modal.style.display =
        "none";

    const form =
        document.getElementById(
            "formSocio"
        );

    if (form) {
        form.reset();
    }

    const socioId =
        document.getElementById(
            "socioId"
        );

    if (socioId) {
        socioId.value = "";
    }
}

async function guardarSocio(event) {
    event.preventDefault();

    const botonGuardar =
        document.getElementById(
            "guardarSocio"
        );

    const socioId =
        document.getElementById(
            "socioId"
        )
            .value
            .trim();

    const datosSocio = {
        nombres:
            obtenerValor(
                "nombres"
            ),

        apellido_paterno:
            obtenerValor(
                "apellidoPaterno"
            ),

        apellido_materno:
            obtenerValor(
                "apellidoMaterno"
            ),

        rut:
            obtenerValor(
                "rut"
            ) || null,

        telefono:
            obtenerValor(
                "telefono"
            ) || null,

        email:
            obtenerValor(
                "email"
            ) || null,

        direccion:
            obtenerValor(
                "direccion"
            ) || null,

        fecha_ingreso:
            obtenerValor(
                "fechaIngreso"
            ) || null,

        estado:
            obtenerValor(
                "estado"
            ) || "activo",

        observaciones:
            obtenerValor(
                "observaciones"
            ) || null
    };

    if (!datosSocio.nombres) {
        alert(
            "Debe ingresar los nombres del socio."
        );

        const nombres =
            document.getElementById(
                "nombres"
            );

        if (nombres) {
            nombres.focus();
        }

        return;
    }

    if (botonGuardar) {
        botonGuardar.disabled =
            true;

        botonGuardar.textContent =
            socioId
                ? "Actualizando..."
                : "Guardando...";
    }

    try {

        if (socioId) {

            const {
                error
            } = await supabaseClient
                .from("socios")
                .update({
                    ...datosSocio,
                    updated_at:
                        new Date().toISOString()
                })
                .eq(
                    "id",
                    Number(socioId)
                );

            if (error) {
                console.error(
                    "Error al actualizar socio:",
                    error
                );

                alert(
                    obtenerMensajeError(
                        error
                    )
                );

                return;
            }

            alert(
                "Socio actualizado correctamente."
            );

        } else {

            const {
                error
            } = await supabaseClient
                .from("socios")
                .insert({
                    ...datosSocio,
                    created_by:
                        usuarioActual.id
                });

            if (error) {
                console.error(
                    "Error al crear socio:",
                    error
                );

                alert(
                    obtenerMensajeError(
                        error
                    )
                );

                return;
            }

            alert(
                "Socio registrado correctamente."
            );
        }

        cerrarModalSocio();

        await cargarSocios();

    } catch (error) {

        console.error(
            "Error inesperado al guardar socio:",
            error
        );

        alert(
            "Ocurrió un error inesperado al guardar el socio."
        );

    } finally {

        if (botonGuardar) {
            botonGuardar.disabled =
                false;

            botonGuardar.textContent =
                "Guardar socio";
        }
    }
}


/* =========================================================
   NÓMINA DE SOCIOS ACTIVOS
   ========================================================= */

function obtenerSociosActivos() {
    return socios
        .filter((socio) => {
            return (
                String(
                    socio.estado || ""
                )
                    .trim()
                    .toLowerCase() ===
                "activo"
            );
        })
        .sort((a, b) => {

            const apellidoA =
                String(
                    a.apellido_paterno || ""
                )
                    .trim()
                    .toLowerCase();

            const apellidoB =
                String(
                    b.apellido_paterno || ""
                )
                    .trim()
                    .toLowerCase();

            const comparacionApellido =
                apellidoA.localeCompare(
                    apellidoB,
                    "es",
                    {
                        sensitivity:
                            "base"
                    }
                );

            if (
                comparacionApellido !== 0
            ) {
                return comparacionApellido;
            }

            const nombresA =
                String(
                    a.nombres || ""
                )
                    .trim()
                    .toLowerCase();

            const nombresB =
                String(
                    b.nombres || ""
                )
                    .trim()
                    .toLowerCase();

            return nombresA.localeCompare(
                nombresB,
                "es",
                {
                    sensitivity:
                        "base"
                }
            );
        });
}

function formatearFechaNomina(fecha) {
    if (!fecha) {
        return "—";
    }

    const texto =
        String(fecha).trim();

    const partes =
        texto.split("-");

    if (
        partes.length === 3 &&
        partes[0].length === 4
    ) {
        return (
            partes[2] +
            "-" +
            partes[1] +
            "-" +
            partes[0]
        );
    }

    return texto;
}

function obtenerAnioActual() {
    return new Date()
        .getFullYear();
}

function obtenerNombreArchivoNomina(
    extension
) {
    return (
        "Nomina_Socios_Activos_" +
        obtenerAnioActual() +
        "." +
        extension
    );
}

function construirDatosNomina() {
    const sociosActivos =
        obtenerSociosActivos();

    return sociosActivos.map(
        (socio, indice) => {

            return {
                numero:
                    indice + 1,

                nombre:
                    construirNombreCompleto(
                        socio
                    ) || "—",

                rut:
                    socio.rut || "—",

                telefono:
                    socio.telefono || "—",

                email:
                    socio.email || "—",

                direccion:
                    socio.direccion || "—",

                fechaIngreso:
                    formatearFechaNomina(
                        socio.fecha_ingreso
                    )
            };
        }
    );
}


/* =========================================================
   EXPORTAR EXCEL
   ========================================================= */

function exportarNominaExcel() {
    const datos =
        construirDatosNomina();

    if (datos.length === 0) {
        alert(
            "No existen socios activos para generar la nómina."
        );

        return;
    }

    if (
        typeof XLSX ===
        "undefined"
    ) {
        alert(
            "No fue posible cargar el módulo de Excel."
        );

        return;
    }

    const filas =
        datos.map(
            (socio) => {

                return {
                    "N.º":
                        socio.numero,

                    "Nombre completo":
                        socio.nombre,

                    "RUT":
                        socio.rut,

                    "Teléfono":
                        socio.telefono,

                    "Correo":
                        socio.email,

                    "Dirección":
                        socio.direccion,

                    "Fecha de ingreso":
                        socio.fechaIngreso
                };
            }
        );

    const hoja =
        XLSX.utils.json_to_sheet(
            filas
        );

    hoja["!cols"] = [
        {
            wch: 7
        },
        {
            wch: 35
        },
        {
            wch: 16
        },
        {
            wch: 16
        },
        {
            wch: 32
        },
        {
            wch: 35
        },
        {
            wch: 18
        }
    ];

    const libro =
        XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(
        libro,
        hoja,
        "Socios Activos"
    );

    XLSX.writeFile(
        libro,
        obtenerNombreArchivoNomina(
            "xlsx"
        )
    );
}


/* =========================================================
   EXPORTAR PDF
   ========================================================= */

function exportarNominaPDF() {
    const datos =
        construirDatosNomina();

    if (datos.length === 0) {
        alert(
            "No existen socios activos para generar la nómina."
        );

        return;
    }

    if (
        typeof window.jspdf ===
        "undefined"
    ) {
        alert(
            "No fue posible cargar el módulo PDF."
        );

        return;
    }

    const {
        jsPDF
    } = window.jspdf;

    const documento =
        new jsPDF({
            orientation:
                "landscape",

            unit:
                "mm",

            format:
                "a4"
        });

    const margenIzquierdo =
        15;

    const anio =
        obtenerAnioActual();

    const fechaGeneracion =
        formatearFechaNomina(
            obtenerFechaActual()
        );


    /* =====================================================
       ENCABEZADO
       ===================================================== */

    documento.setFont(
        "helvetica",
        "bold"
    );

    documento.setFontSize(
        15
    );

    documento.text(
        "COMUNIDAD INDÍGENA JUAN CHEUQUELÉN",
        margenIzquierdo,
        16
    );


    documento.setFont(
        "helvetica",
        "normal"
    );

    documento.setFontSize(
        9
    );

    documento.text(
        "RUT: 65.169.427-2",
        margenIzquierdo,
        22
    );

    documento.text(
        "Personería Jurídica N.º 2314",
        margenIzquierdo,
        27
    );


    documento.setFont(
        "helvetica",
        "bold"
    );

    documento.setFontSize(
        14
    );

    documento.text(
        "NÓMINA DE SOCIOS ACTIVOS",
        margenIzquierdo,
        38
    );


    documento.setFont(
        "helvetica",
        "normal"
    );

    documento.setFontSize(
        9
    );

    documento.text(
        "Año: " + anio,
        margenIzquierdo,
        44
    );


    /* =====================================================
       TABLA
       ===================================================== */

    const filas =
        datos.map(
            (socio) => {

                return [
                    socio.numero,
                    socio.nombre,
                    socio.rut,
                    socio.telefono,
                    socio.email,
                    socio.direccion,
                    socio.fechaIngreso
                ];
            }
        );

    documento.autoTable({
        startY:
            50,

        margin: {
            left:
                margenIzquierdo,

            right:
                margenIzquierdo
        },

        head: [[
            "N.º",
            "Nombre completo",
            "RUT",
            "Teléfono",
            "Correo",
            "Dirección",
            "Fecha de ingreso"
        ]],

        body:
            filas,

        theme:
            "grid",

        styles: {
            font:
                "helvetica",

            fontSize:
                8,

            cellPadding:
                3,

            valign:
                "middle"
        },

        headStyles: {
            fontStyle:
                "bold"
        },

        columnStyles: {
            0: {
                cellWidth:
                    12
            },

            1: {
                cellWidth:
                    55
            },

            2: {
                cellWidth:
                    28
            },

            3: {
                cellWidth:
                    28
            },

            4: {
                cellWidth:
                    58
            },

            5: {
                cellWidth:
                    60
            },

            6: {
                cellWidth:
                    30
            }
        }
    });


    /* =====================================================
       PIE
       ===================================================== */

    const posicionFinal =
        documento.lastAutoTable
            ? documento.lastAutoTable
                .finalY + 10
            : 180;

    documento.setFont(
        "helvetica",
        "bold"
    );

    documento.setFontSize(
        9
    );

    documento.text(
        "Total de socios activos: " +
            datos.length,
        margenIzquierdo,
        posicionFinal
    );


    documento.setFont(
        "helvetica",
        "normal"
    );

    documento.text(
        "Fecha de generación: " +
            fechaGeneracion,
        margenIzquierdo,
        posicionFinal + 6
    );


    documento.save(
        obtenerNombreArchivoNomina(
            "pdf"
        )
    );
}


/* =========================================================
   IMPRIMIR NÓMINA
   ========================================================= */

function imprimirNominaSocios() {
    const datos =
        construirDatosNomina();

    if (datos.length === 0) {
        alert(
            "No existen socios activos para imprimir la nómina."
        );

        return;
    }

    const ventana =
        window.open(
            "",
            "_blank"
        );

    if (!ventana) {
        alert(
            "El navegador bloqueó la ventana de impresión. Permita las ventanas emergentes para este sitio."
        );

        return;
    }

    const anio =
        obtenerAnioActual();

    const fechaGeneracion =
        formatearFechaNomina(
            obtenerFechaActual()
        );

    const filas =
        datos.map(
            (socio) => {

                return `
                    <tr>

                        <td>
                            ${escaparHTML(
                                socio.numero
                            )}
                        </td>

                        <td>
                            ${escaparHTML(
                                socio.nombre
                            )}
                        </td>

                        <td>
                            ${escaparHTML(
                                socio.rut
                            )}
                        </td>

                        <td>
                            ${escaparHTML(
                                socio.telefono
                            )}
                        </td>

                        <td>
                            ${escaparHTML(
                                socio.email
                            )}
                        </td>

                        <td>
                            ${escaparHTML(
                                socio.direccion
                            )}
                        </td>

                        <td>
                            ${escaparHTML(
                                socio.fechaIngreso
                            )}
                        </td>

                    </tr>
                `;
            }
        )
        .join("");


    ventana.document.open();

    ventana.document.write(`
        <!DOCTYPE html>

        <html lang="es">

        <head>

            <meta charset="UTF-8">

            <title>
                Nómina de Socios Activos
            </title>

            <style>

                @page {
                    size: A4 landscape;
                    margin: 12mm;
                }

                * {
                    box-sizing: border-box;
                }

                body {
                    margin: 0;
                    padding: 0;
                    font-family:
                        Arial,
                        Helvetica,
                        sans-serif;
                    color: #111;
                    background: #fff;
                }

                .encabezado {
                    margin-bottom: 8mm;
                }

                .comunidad {
                    font-size: 18px;
                    font-weight: bold;
                    margin-bottom: 2mm;
                }

                .dato {
                    font-size: 10px;
                    margin-bottom: 1mm;
                }

                .titulo {
                    font-size: 16px;
                    font-weight: bold;
                    margin-top: 6mm;
                    margin-bottom: 2mm;
                }

                .subtitulo {
                    font-size: 10px;
                    margin-bottom: 6mm;
                }

                table {
                    width: 100%;
                    border-collapse: collapse;
                    table-layout: fixed;
                }

                th,
                td {
                    border: 1px solid #777;
                    padding: 5px;
                    font-size: 8px;
                    text-align: left;
                    vertical-align: middle;
                    word-wrap: break-word;
                }

                th {
                    font-weight: bold;
                    background: #eeeeee;
                }

                th:nth-child(1),
                td:nth-child(1) {
                    width: 5%;
                    text-align: center;
                }

                th:nth-child(2),
                td:nth-child(2) {
                    width: 21%;
                }

                th:nth-child(3),
                td:nth-child(3) {
                    width: 9%;
                }

                th:nth-child(4),
                td:nth-child(4) {
                    width: 10%;
                }

                th:nth-child(5),
                td:nth-child(5) {
                    width: 19%;
                }

                th:nth-child(6),
                td:nth-child(6) {
                    width: 27%;
                }

                th:nth-child(7),
                td:nth-child(7) {
                    width: 9%;
                    text-align: center;
                }

                .pie {
                    margin-top: 7mm;
                    font-size: 9px;
                }

                .total {
                    font-weight: bold;
                    margin-bottom: 2mm;
                }

                .fecha {
                    margin-bottom: 0;
                }

            </style>

        </head>

        <body>

            <div class="encabezado">

                <div class="comunidad">
                    COMUNIDAD INDÍGENA JUAN CHEUQUELÉN
                </div>

                <div class="dato">
                    RUT: 65.169.427-2
                </div>

                <div class="dato">
                    Personería Jurídica N.º 2314
                </div>

                <div class="titulo">
                    NÓMINA DE SOCIOS ACTIVOS
                </div>

                <div class="subtitulo">
                    Año: ${anio}
                </div>

            </div>


            <table>

                <thead>

                    <tr>

                        <th>
                            N.º
                        </th>

                        <th>
                            Nombre completo
                        </th>

                        <th>
                            RUT
                        </th>

                        <th>
                            Teléfono
                        </th>

                        <th>
                            Correo
                        </th>

                        <th>
                            Dirección
                        </th>

                        <th>
                            Fecha de ingreso
                        </th>

                    </tr>

                </thead>

                <tbody>

                    ${filas}

                </tbody>

            </table>


            <div class="pie">

                <div class="total">
                    Total de socios activos:
                    ${datos.length}
                </div>

                <div class="fecha">
                    Fecha de generación:
                    ${fechaGeneracion}
                </div>

            </div>


        </body>

        </html>
    `);

    ventana.document.close();


    /* =====================================================
       ESPERAR A QUE EL DOCUMENTO ESTÉ LISTO
       ===================================================== */

    ventana.focus();

    setTimeout(
        () => {

            try {
                ventana.print();
            } catch (error) {
                console.error(
                    "Error al abrir impresión:",
                    error
                );
            }

        },
        400
    );
}


/* =========================================================
   FUNCIONES GENERALES
   ========================================================= */

function obtenerValor(id) {
    const elemento =
        document.getElementById(id);

    if (!elemento) {
        return "";
    }

    return elemento.value.trim();
}

function obtenerFechaActual() {
    const fecha =
        new Date();

    const anio =
        fecha.getFullYear();

    const mes =
        String(
            fecha.getMonth() + 1
        )
            .padStart(
                2,
                "0"
            );

    const dia =
        String(
            fecha.getDate()
        )
            .padStart(
                2,
                "0"
            );

    return (
        `${anio}-${mes}-${dia}`
    );
}

function capitalizar(texto) {
    if (!texto) {
        return "";
    }

    return (
        texto.charAt(0).toUpperCase() +
        texto.slice(1)
    );
}

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

function obtenerMensajeError(error) {
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
        "23505"
    ) {
        return (
            "El RUT ingresado ya se encuentra registrado."
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

    return (
        error.message ||
        "No fue posible completar la operación."
    );
}

async function cerrarSesion() {
    const confirmar =
        confirm(
            "¿Está seguro de que desea cerrar la sesión?"
        );

    if (!confirmar) {
        return;
    }

    const {
        error
    } = await supabaseClient
        .auth
        .signOut();

    if (error) {
        console.error(
            "Error al cerrar sesión:",
            error
        );

        alert(
            "No fue posible cerrar la sesión."
        );

        return;
    }

    window.location.href =
        "login.html";
}