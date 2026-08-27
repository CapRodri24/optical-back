// src/controllers/EntregasPendientesController.js
const entregasPendientesService = require("../services/EntregasPendientesService");

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

    const { pendientes, tiendaId } = req.query;
    const { negocioId } = req.user;

    // Obtener filtros de fecha desde query params
    const dateFilter = {
      type: req.query.dateFilterType || "all",
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

    const soloPendientes = pendientes === 'true';

    const result = await entregasPendientesService.getEntregas(soloPendientes, userInfo, dateFilter);

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

    const entrega = await entregasPendientesService.getEntregaById(id, userInfo);

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

    const entrega = await entregasPendientesService.getEntregaByVentaId(ventaId, userInfo);

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
// POST - CREAR UNA NUEVA ENTREGA
// ============================================

const crearEntrega = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Usuario no autenticado"
      });
    }

    const data = req.body;
    const { negocioId } = req.user;

    console.log("🔍 crearEntrega - negocioId:", negocioId);

    if (!negocioId) {
      return res.status(400).json({
        success: false,
        message: "ID de negocio requerido"
      });
    }

    if (!data.clientName) {
      return res.status(400).json({
        success: false,
        message: "Nombre del cliente es requerido"
      });
    }

    if (!data.sistemaLente) {
      return res.status(400).json({
        success: false,
        message: "Tipo de lente es requerido"
      });
    }

    if (!data.tiendaId) {
      return res.status(400).json({
        success: false,
        message: "ID de tienda es requerido"
      });
    }

    const userInfo = {
      negocioId: parseInt(negocioId),
      userId: req.user.id_usuario,
      role: req.user.rol_nombre,
      username: req.user.usuario
    };

    const entrega = await entregasPendientesService.crearEntrega(data, userInfo);

    res.status(201).json({
      success: true,
      message: "Entrega creada exitosamente",
      data: entrega
    });
  } catch (error) {
    console.error("Error en crearEntrega controller:", error);
    res.status(400).json({
      success: false,
      message: error.message || "Error al crear la entrega"
    });
  }
};

// ============================================
// PATCH - ACTUALIZAR UNA ENTREGA
// ============================================

const actualizarEntrega = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Usuario no autenticado"
      });
    }

    const { id } = req.params;
    const data = req.body;
    const { negocioId } = req.user;

    console.log("🔍 actualizarEntrega - id:", id, "negocioId:", negocioId);

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

    const entrega = await entregasPendientesService.actualizarEntrega(id, data, userInfo);

    res.json({
      success: true,
      message: "Entrega actualizada exitosamente",
      data: entrega
    });
  } catch (error) {
    console.error("Error en actualizarEntrega controller:", error);
    res.status(400).json({
      success: false,
      message: error.message || "Error al actualizar la entrega"
    });
  }
};

// ============================================
// PATCH - MARCAR ENTREGA COMO ENTREGADA
// ============================================

const marcarEntregado = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Usuario no autenticado"
      });
    }

    const { id } = req.params;
    const { negocioId } = req.user;

    console.log("🔍 marcarEntregado - id:", id, "negocioId:", negocioId);

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

    const entrega = await entregasPendientesService.marcarEntregado(id, userInfo);

    res.json({
      success: true,
      message: "Entrega marcada como entregada",
      data: entrega
    });
  } catch (error) {
    console.error("Error en marcarEntregado controller:", error);
    res.status(400).json({
      success: false,
      message: error.message || "Error al marcar la entrega como entregada"
    });
  }
};

// ============================================
// POST - REGISTRAR UN PAGO PARA UNA ENTREGA
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

    const userInfo = {
      negocioId: parseInt(negocioId),
      userId: req.user.id_usuario,
      role: req.user.rol_nombre,
      username: req.user.usuario
    };

    const entrega = await entregasPendientesService.registrarPago(
      id,
      { monto, metodo, detalleMixto },
      registradoPor,
      userInfo
    );

    res.json({
      success: true,
      message: "Pago registrado exitosamente",
      data: entrega
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
// DELETE - ELIMINAR UNA ENTREGA
// ============================================

const eliminarEntrega = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Usuario no autenticado"
      });
    }

    const { id } = req.params;
    const { negocioId } = req.user;

    console.log("🔍 eliminarEntrega - id:", id, "negocioId:", negocioId);

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

    await entregasPendientesService.eliminarEntrega(id, userInfo);

    res.json({
      success: true,
      message: "Entrega eliminada exitosamente"
    });
  } catch (error) {
    console.error("Error en eliminarEntrega controller:", error);
    res.status(400).json({
      success: false,
      message: error.message || "Error al eliminar la entrega"
    });
  }
};

// ============================================
// GET - ESTADÍSTICAS DE ENTREGAS
// ============================================

const getEstadisticasEntregas = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Usuario no autenticado"
      });
    }

    const { tiendaId } = req.query;
    const { negocioId } = req.user;

    console.log("🔍 getEstadisticasEntregas - negocioId:", negocioId, "tiendaId:", tiendaId);

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

    const estadisticas = await entregasPendientesService.getEstadisticasEntregas(userInfo);

    res.json({
      success: true,
      data: estadisticas
    });
  } catch (error) {
    console.error("Error en getEstadisticasEntregas controller:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Error al obtener las estadísticas de entregas"
    });
  }
};

module.exports = {
  getEntregas,
  getEntregaById,
  getEntregaByVentaId,
  crearEntrega,
  actualizarEntrega,
  marcarEntregado,
  registrarPago,
  eliminarEntrega,
  getEstadisticasEntregas
};