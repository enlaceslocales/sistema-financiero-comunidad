/**
 * COMPROBANTE DE PAGO DE CUOTA
 * Comunidad Indígena Juan Cheuquelén
 *
 * Este módulo:
 * - Lee el comprobante por su ID desde comprobantes_cuota.
 * - Utiliza los datos históricos/snapshot guardados al momento de emisión.
 * - Mantiene el mismo número al reimprimir.
 * - Registra cada impresión mediante registrar_impresion_comprobante_cuota.
 */

"use strict";

let comprobanteActual = null;
let usuarioActual = null;
let perfilUsuario = null;

document.addEventListener("DOMContentLoaded", iniciarComprobante);

async function iniciarComprobante() {
    try {
        mostrarCargando(true);

        const sesion = await obtenerSesion();

        if (!sesion) {
            window.location.href = "login.html";
            return;
        }

        usuarioActual = sesion.user;

        const perfil = await cargarPerfil(usuarioActual.id);

        if (!perfil || perfil.activo === false) {
            await cerrarSesion();
            return;
        }

        perfilUsuario = perfil;

        // Solo administrador y tesorero pueden consultar/imprimir comprobantes.
        if (!["administrador", "tesorero"].includes(perfilUsuario.rol)) {
            window.location.href = "reportes.html";
            return;
        }

        mostrarUsuario();

        const comprobanteId = obtenerIdDesdeURL();

        if (!comprobanteId) {
            mostrarError("No se indicó el comprobante que se desea consultar.");
            return;
        }

        configurarEventos();

        await cargarComprobante(comprobanteId);
    } catch (error) {
        console.error("Error al iniciar comprobante:", error);
        mostrarError(obtenerMensajeError(error));
    } finally {
        mostrarCargando(false);
    }
}

async function obtenerSesion() {
    const { data, error } = await supabaseClient.auth.getSession();

    if (error) {
        throw error;
    }

    return data?.session || null;
}

async function cargarPerfil(usuarioId) {
    const { data, error } = await supabaseClient
        .from("profiles")
        .select("id,nombre,email,rol,activo")
        .eq("id", usuarioId)
        .single();

    if (error) {
        throw error;
    }

    return data;
}

function mostrarUsuario() {
    const elementos = [
        document.getElementById("usuarioNombre"),
        document.getElementById("nombreUsuario"),
        document.getElementById("userName")
    ];

    const nombre = perfilUsuario?.nombre || perfilUsuario?.email || "Usuario";

    elementos.forEach((elemento) => {
        if (elemento) {
            elemento.textContent = nombre;
        }
    });

    const rolElementos = [
        document.getElementById("usuarioRol"),
        document.getElementById("rolUsuario"),
        document.getElementById("userRole")
    ];

    rolElementos.forEach((elemento) => {
        if (elemento) {
            elemento.textContent = traducirRol(perfilUsuario?.rol);
        }
    });
}

function traducirRol(rol) {
    const roles = {
        administrador: "Administrador",
        tesorero: "Tesorero",
        consulta: "Consulta"
    };

    return roles[rol] || rol || "";
}

function configurarEventos() {
    const imprimir = document.getElementById("imprimirComprobante");
    if (imprimir) {
        imprimir.addEventListener("click", imprimirComprobante);
    }

    const volver = document.getElementById("volverComprobantes");
    if (volver) {
        volver.addEventListener("click", () => {
            window.location.href = "comprobantes.html";
        });
    }

    const volverPagos = document.getElementById("volverPagos");
    if (volverPagos) {
        volverPagos.addEventListener("click", () => {
            window.location.href = "pagos-cuotas.html";
        });
    }

    const volverHistorial = document.getElementById("volverHistorial");
    if (volverHistorial) {
        volverHistorial.addEventListener("click", () => {
            const pagoId = comprobanteActual?.pago_id;
            if (pagoId) {
                window.location.href = `pagos-cuotas.html?pago=${encodeURIComponent(pagoId)}`;
            } else {
                window.location.href = "pagos-cuotas.html";
            }
        });
    }

    const cerrarSesionButton = document.getElementById("cerrarSesion");
    if (cerrarSesionButton) {
        cerrarSesionButton.addEventListener("click", cerrarSesion);
    }

    const imprimirDirecto = document.getElementById("imprimirDirecto");
    if (imprimirDirecto) {
        imprimirDirecto.addEventListener("click", imprimirComprobante);
    }

    // Si el usuario utiliza Ctrl+P o el comando de impresión del navegador,
    // no se genera un nuevo número: el número pertenece al comprobante.
    window.addEventListener("beforeprint", () => {
        prepararVistaImpresion();
    });
}

function obtenerIdDesdeURL() {
    const params = new URLSearchParams(window.location.search);

    return (
        params.get("id") ||
        params.get("comprobante_id") ||
        params.get("comprobanteId")
    );
}

async function cargarComprobante(comprobanteId) {
    const { data, error } = await supabaseClient
        .from("comprobantes_cuota")
        .select(`
            id,
            pago_id,
            anio,
            correlativo,
            numero,
            fecha_emision,
            estado,
            emitido_por,
            estado_pago,
            socio_nombre,
            socio_rut,
            periodo_anio,
            monto_pagado,
            fecha_pago,
            medio_pago,
            referencia_pago,
            banco_origen,
            observacion,
            cantidad_impresiones,
            ultima_impresion_at,
            ultima_impresion_por,
            created_at
        `)
        .eq("id", comprobanteId)
        .single();

    if (error) {
        throw error;
    }

    if (!data) {
        throw new Error("El comprobante solicitado no existe.");
    }

    comprobanteActual = data;

    renderizarComprobante(data);
    actualizarInformacionImpresion(data);
    actualizarTitulo(data);
}

function renderizarComprobante(comprobante) {
    // Los IDs se asignan de forma tolerante para que el JS funcione
    // tanto con la plantilla principal como con pequeñas variantes.
    const originales = document.querySelectorAll("[data-comprobante]");

    originales.forEach((elemento) => {
        const campo = elemento.dataset.comprobante;
        elemento.textContent = valorCampoComprobante(comprobante, campo);
    });

    // Campos habituales del ORIGINAL y de la COPIA.
    asignarATodos("numeroComprobante", comprobante.numero);
    asignarATodos("numero", comprobante.numero);

    asignarATodos("fechaEmision", formatearFecha(comprobante.fecha_emision));
    asignarATodos("fechaPago", formatearFecha(comprobante.fecha_pago));

    asignarATodos("socioNombre", comprobante.socio_nombre || "—");
    asignarATodos("socioRut", comprobante.socio_rut || "—");

    asignarATodos(
        "periodoAnio",
        comprobante.periodo_anio || comprobante.anio || "—"
    );

    asignarATodos(
        "montoPagado",
        formatearMoneda(comprobante.monto_pagado)
    );

    asignarATodos(
        "medioPago",
        traducirMedioPago(comprobante.medio_pago)
    );

    asignarATodos(
        "estadoPago",
        traducirEstadoPago(comprobante.estado_pago || comprobante.estado)
    );

    asignarATodos(
        "referenciaPago",
        comprobante.referencia_pago || "—"
    );

    asignarATodos(
        "bancoOrigen",
        comprobante.banco_origen || "—"
    );

    asignarATodos(
        "observacion",
        comprobante.observacion || "Sin observaciones"
    );

    // Algunos diseños pueden usar nombres diferentes.
    asignarATodos("nombreSocio", comprobante.socio_nombre || "—");
    asignarATodos("rutSocio", comprobante.socio_rut || "—");
    asignarATodos("anioPeriodo", comprobante.periodo_anio || comprobante.anio || "—");
    asignarATodos("monto", formatearMoneda(comprobante.monto_pagado));
    asignarATodos("metodoPago", traducirMedioPago(comprobante.medio_pago));
    asignarATodos("estado", traducirEstadoPago(comprobante.estado_pago || comprobante.estado));
    asignarATodos("referenciaTransferencia", comprobante.referencia_pago || "—");

    // El concepto es fijo según el diseño aprobado.
    asignarATodos("concepto", "Cuota socio");
}

function valorCampoComprobante(comprobante, campo) {
    const valores = {
        numero: comprobante.numero,
        numeroComprobante: comprobante.numero,
        fechaEmision: formatearFecha(comprobante.fecha_emision),
        fechaPago: formatearFecha(comprobante.fecha_pago),
        socioNombre: comprobante.socio_nombre,
        socioRut: comprobante.socio_rut,
        periodoAnio: comprobante.periodo_anio || comprobante.anio,
        montoPagado: formatearMoneda(comprobante.monto_pagado),
        medioPago: traducirMedioPago(comprobante.medio_pago),
        estadoPago: traducirEstadoPago(comprobante.estado_pago || comprobante.estado),
        referenciaPago: comprobante.referencia_pago || "—",
        bancoOrigen: comprobante.banco_origen || "—",
        observacion: comprobante.observacion || "Sin observaciones",
        concepto: "Cuota socio"
    };

    return valores[campo] ?? "—";
}

function asignarATodos(id, valor) {
    document.querySelectorAll(`#${id}`).forEach((elemento) => {
        elemento.textContent = valor ?? "—";
    });

    // También admite clases con el mismo nombre para original/copia.
    document.querySelectorAll(`.${id}`).forEach((elemento) => {
        elemento.textContent = valor ?? "—";
    });
}

function actualizarTitulo(comprobante) {
    if (!comprobante) return;

    const numero = comprobante.numero || "Comprobante";

    document.title = `${numero} - Comprobante de pago de cuota`;

    const titulo = document.getElementById("tituloComprobante");
    if (titulo && !titulo.dataset.manual) {
        titulo.textContent = "COMPROBANTE DE PAGO DE CUOTA";
    }
}

function actualizarInformacionImpresion(comprobante) {
    const cantidad = Number(comprobante.cantidad_impresiones || 0);

    asignarATodos("cantidadImpresiones", String(cantidad));

    if (comprobante.ultima_impresion_at) {
        asignarATodos(
            "ultimaImpresion",
            formatearFechaHora(comprobante.ultima_impresion_at)
        );
    } else {
        asignarATodos("ultimaImpresion", "Aún no impreso");
    }

    asignarATodos(
        "estadoComprobante",
        traducirEstadoComprobante(comprobante.estado)
    );
}

async function imprimirComprobante() {
    if (!comprobanteActual?.id) {
        mostrarError("No hay un comprobante cargado para imprimir.");
        return;
    }

    try {
        bloquearBotonImpresion(true);
        ocultarError();

        // Registrar la impresión ANTES de abrir el diálogo.
        // De esta manera cada impresión iniciada desde el botón queda
        // registrada como primera impresión o reimpresión.
        const registro = await registrarImpresion(comprobanteActual.id);

        if (registro) {
            comprobanteActual.cantidad_impresiones =
                Number(registro.cantidad_impresiones ?? comprobanteActual.cantidad_impresiones ?? 0);

            comprobanteActual.ultima_impresion_at =
                registro.ultima_impresion_at || new Date().toISOString();

            comprobanteActual.ultima_impresion_por =
                registro.ultima_impresion_por || usuarioActual?.id || null;

            actualizarInformacionImpresion(comprobanteActual);
        }

        prepararVistaImpresion();

        // Dejamos que el navegador gestione el formato A4 definido por CSS.
        setTimeout(() => {
            window.print();
        }, 100);
    } catch (error) {
        console.error("Error al registrar impresión:", error);
        mostrarError(
            "No fue posible registrar la impresión del comprobante. " +
            obtenerMensajeError(error)
        );
    } finally {
        bloquearBotonImpresion(false);
    }
}

async function registrarImpresion(comprobanteId) {
    const { data, error } = await supabaseClient.rpc(
        "registrar_impresion_comprobante_cuota",
        {
            p_comprobante_id: comprobanteId
        }
    );

    if (error) {
        throw error;
    }

    // La función puede devolver un objeto o una fila.
    if (Array.isArray(data)) {
        return data[0] || null;
    }

    return data || null;
}

function prepararVistaImpresion() {
    document.body.classList.add("modo-impresion");

    // Si existen controles de pantalla, se ocultan mediante CSS.
    const controles = document.querySelectorAll(
        ".no-print, .acciones-comprobante, #accionesComprobante"
    );

    controles.forEach((elemento) => {
        elemento.setAttribute("data-ocultar-impresion", "true");
    });
}

window.addEventListener("afterprint", () => {
    document.body.classList.remove("modo-impresion");

    document
        .querySelectorAll("[data-ocultar-impresion='true']")
        .forEach((elemento) => {
            elemento.removeAttribute("data-ocultar-impresion");
        });
});

function bloquearBotonImpresion(bloquear) {
    const botones = [
        document.getElementById("imprimirComprobante"),
        document.getElementById("imprimirDirecto")
    ];

    botones.forEach((boton) => {
        if (!boton) return;

        boton.disabled = bloquear;

        if (bloquear) {
            boton.dataset.textoOriginal = boton.textContent;
            boton.textContent = "Registrando impresión...";
        } else if (boton.dataset.textoOriginal) {
            boton.textContent = boton.dataset.textoOriginal;
            delete boton.dataset.textoOriginal;
        }
    });
}

function mostrarCargando(mostrar) {
    const cargando = document.getElementById("cargandoComprobante");

    if (cargando) {
        cargando.style.display = mostrar ? "" : "none";
    }
}

function mostrarError(mensaje) {
    const error = document.getElementById("errorComprobante");

    if (error) {
        error.textContent = mensaje || "Ocurrió un error.";
        error.style.display = "";
        return;
    }

    console.error(mensaje);
}

function ocultarError() {
    const error = document.getElementById("errorComprobante");

    if (error) {
        error.textContent = "";
        error.style.display = "none";
    }
}

function traducirMedioPago(medio) {
    const medios = {
        efectivo: "Efectivo",
        transferencia: "Transferencia",
        deposito: "Depósito",
        depósito: "Depósito",
        cheque: "Cheque",
        otro: "Otro"
    };

    return medios[String(medio || "").toLowerCase()] || medio || "—";
}

function traducirEstadoPago(estado) {
    const estados = {
        pendiente: "Pendiente",
        parcial: "Parcial",
        pagada: "Pagada",
        pagado: "Pagado",
        anulada: "Anulada",
        anulado: "Anulado",
        activa: "Activa",
        activo: "Activo"
    };

    return estados[String(estado || "").toLowerCase()] || estado || "—";
}

function traducirEstadoComprobante(estado) {
    const estados = {
        emitido: "Emitido",
        anulado: "Anulado"
    };

    return estados[String(estado || "").toLowerCase()] || estado || "—";
}

function formatearMoneda(valor) {
    const numero = Number(valor || 0);

    return new Intl.NumberFormat("es-CL", {
        style: "currency",
        currency: "CLP",
        maximumFractionDigits: 0
    }).format(numero);
}

function formatearFecha(valor) {
    if (!valor) return "—";

    const fecha = new Date(valor);

    if (Number.isNaN(fecha.getTime())) {
        return String(valor);
    }

    return new Intl.DateTimeFormat("es-CL", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric"
    }).format(fecha);
}

function formatearFechaHora(valor) {
    if (!valor) return "—";

    const fecha = new Date(valor);

    if (Number.isNaN(fecha.getTime())) {
        return String(valor);
    }

    return new Intl.DateTimeFormat("es-CL", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
    }).format(fecha);
}

function obtenerMensajeError(error) {
    if (!error) {
        return "Ocurrió un error inesperado.";
    }

    if (typeof error === "string") {
        return error;
    }

    return (
        error.message ||
        error.details ||
        error.hint ||
        "Ocurrió un error inesperado."
    );
}

async function cerrarSesion() {
    try {
        const { error } = await supabaseClient.auth.signOut();

        if (error) {
            throw error;
        }
    } catch (error) {
        console.error("Error al cerrar sesión:", error);
    } finally {
        window.location.href = "login.html";
    }
}
