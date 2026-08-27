// src/controllers/PagosPendientesController.js
const pagosPendientesService = require("../services/PagosPendientesService");

// ============================================
// GET - OBTENER ENTREGAS CON SALDO PENDIENTE
// ============================================

const getEntregasConSaldo = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Usuario no autenticado"
      });
    }

    const { tiendaId } = req.query;
    const { negocioId } = req.user;

    // Obtener filtros de fecha desde query params
    const dateFilter = {
      type: req.query.dateFilterType || "today",
      specificDate: req.query.specificDate || null,
      startDate: req.query.startDate || null,
      endDate: req.query.endDate || null
    };

    console.log("🔍 getEntregasConSaldo - negocioId:", negocioId, "tiendaId:", tiendaId, "dateFilter:", dateFilter);

    if (!negocioId) {
      return res.status(400).json({
        success: false,
        message: "ID de negocio requerido"
      });
    }

    const userInfo = {
      negocioId: parseInt(negocioId),
      tiendaId: tiendaId || 'todas',
      userId: req.user.id_usuario,
      role: req.user.rol_nombre,
      username: req.user.usuario
    };

    const result = await pagosPendientesService.getEntregasConSaldo(userInfo, dateFilter);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error("Error en getEntregasConSaldo controller:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Error al obtener las entregas con saldo"
    });
  }
};

// ============================================
// GET - OBTENER TODAS LAS ENTREGAS
// ============================================

const getEntregas = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Usuario no autenticado"
      });
    }

    const { tiendaId } = req.query;
    const { negocioId } = req.user;

    // Obtener filtros de fecha desde query params
    const dateFilter = {
      type: req.query.dateFilterType || "today",
      specificDate: req.query.specificDate || null,
      startDate: req.query.startDate || null,
      endDate: req.query.endDate || null
    };

    console.log("🔍 getEntregas - negocioId:", negocioId, "tiendaId:", tiendaId, "dateFilter:", dateFilter);

    if (!negocioId) {
      return res.status(400).json({
        success: false,
        message: "ID de negocio requerido"
      });
    }

    const userInfo = {
      negocioId: parseInt(negocioId),
      tiendaId: tiendaId || 'todas',
      userId: req.user.id_usuario,
      role: req.user.rol_nombre,
      username: req.user.usuario
    };

    const result = await pagosPendientesService.getEntregas(userInfo, dateFilter);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error("Error en getEntregas controller:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Error al obtener las entregas"
    });
  }
};

// ============================================
// GET - OBTENER ENTREGA POR ID
// ============================================

const getEntregaById = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Usuario no autenticado"
      });
    }

    const { id } = req.params;
    const { negocioId } = req.user;

    console.log("🔍 getEntregaById - id:", id, "negocioId:", negocioId);

    if (!negocioId) {
      return res.status(400).json({
        success: false,
        message: "ID de negocio requerido"
      });
    }

    if (!id || isNaN(Number(id))) {
      return res.status(400).json({
        success: false,
        message: "ID de entrega inválido"
      });
    }

    const userInfo = {
      negocioId: parseInt(negocioId),
      userId: req.user.id_usuario,
      role: req.user.rol_nombre,
      username: req.user.usuario
    };

    const entrega = await pagosPendientesService.getEntregaById(id, userInfo);

    if (!entrega) {
      return res.status(404).json({
        success: false,
        message: "Entrega no encontrada"
      });
    }

    res.json({
      success: true,
      data: entrega
    });
  } catch (error) {
    console.error("Error en getEntregaById controller:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Error al obtener la entrega"
    });
  }
};

// ============================================
// GET - OBTENER ENTREGA POR ID DE VENTA
// ============================================

const getEntregaByVentaId = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Usuario no autenticado"
      });
    }

    const { ventaId } = req.params;
    const { negocioId } = req.user;

    console.log("🔍 getEntregaByVentaId - ventaId:", ventaId, "negocioId:", negocioId);

    if (!negocioId) {
      return res.status(400).json({
        success: false,
        message: "ID de negocio requerido"
      });
    }

    if (!ventaId) {
      return res.status(400).json({
        success: false,
        message: "ID de venta requerido"
      });
    }

    const userInfo = {
      negocioId: parseInt(negocioId),
      userId: req.user.id_usuario,
      role: req.user.rol_nombre,
      username: req.user.usuario
    };

    const entrega = await pagosPendientesService.getEntregaByVentaId(ventaId, userInfo);

    if (!entrega) {
      return res.status(404).json({
        success: false,
        message: "Entrega no encontrada para esta venta"
      });
    }

    res.json({
      success: true,
      data: entrega
    });
  } catch (error) {
    console.error("Error en getEntregaByVentaId controller:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Error al obtener la entrega por venta"
    });
  }
};

// ============================================
// GET - OBTENER HISTORIAL DE PAGOS
// ============================================

const getHistorialPagos = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Usuario no autenticado"
      });
    }

    const { id } = req.params;
    const { negocioId } = req.user;

    console.log("🔍 getHistorialPagos - id:", id, "negocioId:", negocioId);

    if (!negocioId) {
      return res.status(400).json({
        success: false,
        message: "ID de negocio requerido"
      });
    }

    if (!id || isNaN(Number(id))) {
      return res.status(400).json({
        success: false,
        message: "ID de entrega inválido"
      });
    }

    const userInfo = {
      negocioId: parseInt(negocioId),
      userId: req.user.id_usuario,
      role: req.user.rol_nombre,
      username: req.user.usuario
    };

    const pagos = await pagosPendientesService.getHistorialPagos(id, userInfo);

    res.json({
      success: true,
      data: pagos
    });
  } catch (error) {
    console.error("Error en getHistorialPagos controller:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Error al obtener el historial de pagos"
    });
  }
};

// ============================================
// POST - REGISTRAR PAGO
// ============================================

const registrarPago = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Usuario no autenticado"
      });
    }

    const { id } = req.params;
    const { monto, metodo, detalleMixto } = req.body;
    const { negocioId } = req.user;
    const registradoPor = req.user.usuario || "Usuario";

    console.log("🔍 registrarPago - id:", id, "monto:", monto, "metodo:", metodo);
    console.log("🔍 registrarPago - negocioId:", negocioId, "registradoPor:", registradoPor);

    if (!negocioId) {
      return res.status(400).json({
        success: false,
        message: "ID de negocio requerido"
      });
    }

    if (!id || isNaN(Number(id))) {
      return res.status(400).json({
        success: false,
        message: "ID de entrega inválido"
      });
    }

    if (!monto || monto <= 0) {
      return res.status(400).json({
        success: false,
        message: "El monto debe ser mayor a 0"
      });
    }

    if (!metodo || !["QR", "Efectivo", "Mixto"].includes(metodo)) {
      return res.status(400).json({
        success: false,
        message: "Método de pago inválido"
      });
    }

    if (metodo === "Mixto" && (!detalleMixto || detalleMixto.qr <= 0 || detalleMixto.efectivo <= 0)) {
      return res.status(400).json({
        success: false,
        message: "Para pago mixto, ambos montos (QR y Efectivo) deben ser mayores a 0"
      });
    }

    const userInfo = {
      negocioId: parseInt(negocioId),
      userId: req.user.id_usuario,
      role: req.user.rol_nombre,
      username: req.user.usuario
    };

    const entregaActualizada = await pagosPendientesService.registrarPago(
      id,
      { monto, metodo, detalleMixto },
      registradoPor,
      userInfo
    );

    res.json({
      success: true,
      message: "Pago registrado exitosamente",
      data: entregaActualizada
    });
  } catch (error) {
    console.error("Error en registrarPago controller:", error);
    res.status(400).json({
      success: false,
      message: error.message || "Error al registrar el pago"
    });
  }
};

// ============================================
// GET - ESTADÍSTICAS DE PAGOS
// ============================================

const getEstadisticasPagos = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Usuario no autenticado"
      });
    }

    const { tiendaId } = req.query;
    const { negocioId } = req.user;

    console.log("🔍 getEstadisticasPagos - negocioId:", negocioId, "tiendaId:", tiendaId);

    if (!negocioId) {
      return res.status(400).json({
        success: false,
        message: "ID de negocio requerido"
      });
    }

    const userInfo = {
      negocioId: parseInt(negocioId),
      tiendaId: tiendaId || 'todas',
      userId: req.user.id_usuario,
      role: req.user.rol_nombre,
      username: req.user.usuario
    };

    const estadisticas = await pagosPendientesService.getEstadisticasPagos(userInfo);

    res.json({
      success: true,
      data: estadisticas
    });
  } catch (error) {
    console.error("Error en getEstadisticasPagos controller:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Error al obtener las estadísticas de pagos"
    });
  }
};

module.exports = {
  getEntregasConSaldo,
  getEntregas,
  getEntregaById,
  getEntregaByVentaId,
  getHistorialPagos,
  registrarPago,
  getEstadisticasPagos
};