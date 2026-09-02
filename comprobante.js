/**
 * COMPROBANTE DE PAGO DE CUOTA
 * Comunidad Indígena Juan Cheuquelén
 *
 * Este archivo está sincronizado con comprobante.html y comprobante.css.
 * El documento utiliza el snapshot histórico almacenado en
 * public.comprobantes_cuota para que una reimpresión conserve los datos
 * originales del comprobante.
 */

"use strict";

let comprobanteActual = null;
let usuarioActual = null;
let perfilUsuario = null;

document.addEventListener("DOMContentLoaded", iniciarComprobante);

async function iniciarComprobante() {
    mostrarCarga(true);
    ocultarError();

    try {
        const session = await obtenerSesion();

        if (!session) {
            window.location.href = "login.html";
            return;
        }

        usuarioActual = session.user;

        perfilUsuario = await cargarPerfil(usuarioActual.id);

        if (!perfilUsuario || perfilUsuario.activo === false) {
            await cerrarSesion();
            return;
        }

        if (!["administrador", "tesorero"].includes(perfilUsuario.rol)) {
            window.location.href = "reportes.html";
            return;
        }

        configurarEventos();

        const comprobanteId = obtenerIdDesdeURL();

        if (!comprobanteId) {
            throw new Error("No se indicó el comprobante que se desea consultar.");
        }

        await cargarComprobante(comprobanteId);
    } catch (error) {
        console.error("Error al cargar comprobante:", error);
        mostrarError(obtenerMensajeError(error));
    } finally {
        mostrarCarga(false);
    }
}

async function obtenerSesion() {
    const { data, error } = await supabaseClient.auth.getSession();

    if (error) {
        throw error;
    }

    return data.session || null;
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

function configurarEventos() {
    const imprimir = document.getElementById("imprimirComprobante");

    if (imprimir) {
        imprimir.addEventListener("click", imprimirComprobante);
    }

    const volverComprobantes = document.getElementById("volverComprobantes");

    if (volverComprobantes) {
        volverComprobantes.addEventListener("click", function () {
            window.location.href = "comprobantes.html";
        });
    }

    const volverPagos = document.getElementById("volverPagos");

    if (volverPagos) {
        volverPagos.addEventListener("click", function () {
            window.location.href = "pagos-cuotas.html";
        });
    }
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
        .select(
            [
                "id",
                "pago_id",
                "anio",
                "correlativo",
                "numero",
                "fecha_emision",
                "estado",
                "emitido_por",
                "estado_pago",
                "socio_nombre",
                "socio_rut",
                "periodo_anio",
                "monto_pagado",
                "fecha_pago",
                "medio_pago",
                "referencia_pago",
                "banco_origen",
                "observacion",
                "cantidad_impresiones",
                "ultima_impresion_at",
                "ultima_impresion_por",
                "created_at"
            ].join(",")
        )
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

    const hoja = document.getElementById("hojaComprobante");
    const acciones = document.getElementById("accionesComprobante");

    if (hoja) {
        hoja.style.display = "";
    }

    if (acciones) {
        acciones.style.display = "flex";
    }

    document.title = `${data.numero || "Comprobante"} - Pago de cuota`;
}

function renderizarComprobante(c) {
    const numero = c.numero || "—";
    const socio = c.socio_nombre || "—";
    const rut = c.socio_rut || "—";
    const periodo = c.periodo_anio || c.anio || "—";
    const fechaEmision = formatearFecha(c.fecha_emision);
    const monto = formatearMoneda(c.monto_pagado);
    const medio = traducirMedioPago(c.medio_pago);
    const estado = obtenerEstadoVisible(c);
    const referencia = c.referencia_pago || "—";
    const observacion = c.observacion || "Sin observaciones";

    asignarTexto("numeroOriginal", numero);
    asignarTexto("numeroCopia", numero);

    asignarTexto("socioOriginal", socio);
    asignarTexto("socioCopia", socio);

    asignarTexto("rutOriginal", rut);
    asignarTexto("rutCopia", rut);

    asignarTexto("periodoOriginal", periodo);
    asignarTexto("periodoCopia", periodo);

    asignarTexto("fechaOriginal", fechaEmision);
    asignarTexto("fechaCopia", fechaEmision);

    asignarTexto("montoOriginal", monto);
    asignarTexto("montoCopia", monto);

    asignarTexto("medioOriginal", medio);
    asignarTexto("medioCopia", medio);

    asignarTexto("estadoOriginal", estado);
    asignarTexto("estadoCopia", estado);

    asignarTexto("referenciaOriginal", referencia);
    asignarTexto("referenciaCopia", referencia);

    asignarTexto("observacionOriginal", observacion);
    asignarTexto("observacionCopia", observacion);

    document.querySelectorAll(".estado-pagado").forEach(function (elemento) {
        elemento.classList.toggle(
            "estado-anulado",
            String(c.estado || "").toLowerCase() === "anulado"
        );
    });
}

function obtenerEstadoVisible(c) {
    if (String(c.estado || "").toLowerCase() === "anulado") {
        return "ANULADO";
    }

    const estadoPago = String(c.estado_pago || "").toLowerCase();

    const estados = {
        pendiente: "PENDIENTE",
        parcial: "PARCIAL",
        pagada: "PAGADO",
        pagado: "PAGADO",
        anulada: "ANULADO",
        anulado: "ANULADO"
    };

    return estados[estadoPago] || String(c.estado_pago || c.estado || "EMITIDO").toUpperCase();
}

function asignarTexto(id, valor) {
    const elemento = document.getElementById(id);

    if (elemento) {
        elemento.textContent = valor == null || valor === "" ? "—" : String(valor);
    }
}

async function imprimirComprobante() {
    if (!comprobanteActual || !comprobanteActual.id) {
        mostrarError("No hay un comprobante cargado para imprimir.");
        return;
    }

    const boton = document.getElementById("imprimirComprobante");

    if (boton) {
        boton.disabled = true;
        boton.dataset.textoOriginal = boton.textContent;
        boton.textContent = "Registrando impresión...";
    }

    try {
        const registro = await registrarImpresion(comprobanteActual.id);

        if (registro) {
            if (registro.cantidad_impresiones != null) {
                comprobanteActual.cantidad_impresiones = registro.cantidad_impresiones;
            }

            if (registro.ultima_impresion_at) {
                comprobanteActual.ultima_impresion_at = registro.ultima_impresion_at;
            }
        }

        document.body.classList.add("preparando-impresion");

        // El comprobante ya tiene su número. Imprimir/reimprimir nunca
        // genera otro número.
        window.setTimeout(function () {
            window.print();
        }, 100);
    } catch (error) {
        console.error("Error al registrar impresión:", error);
        mostrarError(
            "No fue posible registrar la impresión del comprobante. " +
            obtenerMensajeError(error)
        );
    } finally {
        if (boton) {
            boton.disabled = false;
            boton.textContent = boton.dataset.textoOriginal || "🖨️ Imprimir comprobante";
            delete boton.dataset.textoOriginal;
        }
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

    if (Array.isArray(data)) {
        return data[0] || null;
    }

    return data || null;
}

window.addEventListener("afterprint", function () {
    document.body.classList.remove("preparando-impresion");
});

function mostrarCarga(mostrar) {
    const carga = document.getElementById("estadoCarga");

    if (carga) {
        carga.style.display = mostrar ? "" : "none";
    }
}

function mostrarError(mensaje) {
    const error = document.getElementById("errorCarga");

    if (!error) {
        console.error(mensaje);
        return;
    }

    error.textContent = mensaje || "Ocurrió un error inesperado.";
    error.style.display = "";
}

function ocultarError() {
    const error = document.getElementById("errorCarga");

    if (error) {
        error.textContent = "";
        error.style.display = "none";
    }
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
    if (!valor) {
        return "—";
    }

    // Para una fecha SQL YYYY-MM-DD se evita el desfase horario.
    const texto = String(valor);

    if (/^\\d{4}-\\d{2}-\\d{2}$/.test(texto)) {
        const partes = texto.split("-");
        return `${partes[2]}-${partes[1]}-${partes[0]}`;
    }

    const fecha = new Date(valor);

    if (Number.isNaN(fecha.getTime())) {
        return texto;
    }

    return new Intl.DateTimeFormat("es-CL", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric"
    }).format(fecha);
}

function traducirMedioPago(medio) {
    const clave = String(medio || "").toLowerCase();

    const medios = {
        efectivo: "Efectivo",
        transferencia: "Transferencia",
        deposito: "Depósito",
        depósito: "Depósito",
        cheque: "Cheque",
        otro: "Otro"
    };

    return medios[clave] || medio || "—";
}

function obtenerMensajeError(error) {
    if (!error) {
        return "Ocurrió un error inesperado.";
    }

    if (typeof error === "string") {
        return error;
    }

    if (error.code === "PGRST116") {
        return "No se encontró el comprobante solicitado.";
    }

    return error.message || error.details || error.hint || "Ocurrió un error inesperado.";
}

async function cerrarSesion() {
    try {
        await supabaseClient.auth.signOut();
    } catch (error) {
        console.error("Error al cerrar sesión:", error);
    } finally {
        window.location.href = "login.html";
    }
}
