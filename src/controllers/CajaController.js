// src/controllers/cajaController.js
const cajaService = require("../services/CajaService");

/**
 * Obtener estado actual de la caja
 */
const getEstado = async (req, res) => {
  try {
    const { tiendaId } = req.query;
    const userId = req.user?.id_usuario;

    console.log("=== Get Estado Caja ===");
    console.log("tiendaId:", tiendaId);
    console.log("userId:", userId);

    if (!tiendaId) {
      return res.status(400).json({
        success: false,
        message: "El ID de la tienda es requerido"
      });
    }

    const result = await cajaService.getEstado(tiendaId, userId);

    res.json({
      success: true,
      idcaja: result.idcaja,
      total: result.total,
      estado: result.estado,
      fecha_apertura: result.fecha_apertura,
      fecha_cierre: result.fecha_cierre
    });

  } catch (error) {
    console.error("Error en getEstado controller:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Error al obtener el estado de la caja"
    });
  }
};

/**
 * Obtener movimientos con filtros
 */
const getMovimientos = async (req, res) => {
  try {
    const { 
      tiendaId, 
      filterType, 
      specificDate, 
      startDate, 
      endDate, 
      sortOrder 
    } = req.query;
    const userId = req.user?.id_usuario;

    console.log("=== Get Movimientos Caja ===");
    console.log("tiendaId:", tiendaId);
    console.log("filterType:", filterType);

    if (!tiendaId) {
      return res.status(400).json({
        success: false,
        message: "El ID de la tienda es requerido"
      });
    }

    const result = await cajaService.getMovimientos({
      tiendaId,
      userId,
      filterType: filterType || 'today',
      specificDate: specificDate || null,
      startDate: startDate || null,
      endDate: endDate || null,
      sortOrder: sortOrder || 'desc'
    });

    res.json({
      success: true,
      movimientos: result.movimientos,
      totales: result.totales
    });

  } catch (error) {
    console.error("Error en getMovimientos controller:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Error al obtener los movimientos"
    });
  }
};

/**
 * Obtener totales del día
 */
const getTotalesHoy = async (req, res) => {
  try {
    const { tiendaId } = req.query;
    const userId = req.user?.id_usuario;

    console.log("=== Get Totales Hoy Caja ===");
    console.log("tiendaId:", tiendaId);

    if (!tiendaId) {
      return res.status(400).json({
        success: false,
        message: "El ID de la tienda es requerido"
      });
    }

    const result = await cajaService.getTotalesHoy(tiendaId, userId);

    res.json({
      success: true,
      ingresos: result.ingresos,
      egresos: result.egresos,
      total_movimientos: result.total_movimientos
    });

  } catch (error) {
    console.error("Error en getTotalesHoy controller:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Error al obtener los totales del día"
    });
  }
};

/**
 * Obtener estadísticas rápidas de caja
 */
const getStats = async (req, res) => {
  try {
    const { tiendaId } = req.query;
    const userId = req.user?.id_usuario;

    console.log("=== Get Stats Caja ===");
    console.log("tiendaId:", tiendaId);

    if (!tiendaId) {
      return res.status(400).json({
        success: false,
        message: "El ID de la tienda es requerido"
      });
    }

    const result = await cajaService.getStats(tiendaId, userId);

    res.json({
      success: true,
      totalCaja: result.totalCaja,
      ingresosHoy: result.ingresosHoy,
      egresosHoy: result.egresosHoy,
      movimientosHoy: result.movimientosHoy,
      estado: result.estado
    });

  } catch (error) {
    console.error("Error en getStats controller:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Error al obtener las estadísticas"
    });
  }
};

/**
 * Registrar un movimiento (ingreso o egreso)
 */
const registrarMovimiento = async (req, res) => {
  try {
    const { tipo, monto, descripcion, tiendaId, ventaId } = req.body;
    const userId = req.user?.id_usuario;
    const username = req.user?.usuario || "admin";

    console.log("=== Registrar Movimiento Caja ===");
    console.log("tipo:", tipo);
    console.log("monto:", monto);
    console.log("tiendaId:", tiendaId);

    if (!tiendaId) {
      return res.status(400).json({
        success: false,
        message: "El ID de la tienda es requerido"
      });
    }

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "El ID del usuario es requerido"
      });
    }

    if (!tipo || !monto || !descripcion) {
      return res.status(400).json({
        success: false,
        message: "Tipo, monto y descripción son requeridos"
      });
    }

    if (tipo !== 'ingreso' && tipo !== 'egreso') {
      return res.status(400).json({
        success: false,
        message: "Tipo de movimiento inválido. Debe ser 'ingreso' o 'egreso'"
      });
    }

    if (monto <= 0) {
      return res.status(400).json({
        success: false,
        message: "El monto debe ser mayor a 0"
      });
    }

    const result = await cajaService.registrarMovimiento({
      tipo,
      monto,
      descripcion,
      tiendaId,
      userId,
      username,
      ventaId: ventaId || null
    });

    res.status(201).json({
      success: true,
      message: "Movimiento registrado exitosamente",
      movimiento: result.movimiento,
      caja: result.caja
    });

  } catch (error) {
    console.error("Error en registrarMovimiento controller:", error);
    res.status(400).json({
      success: false,
      message: error.message || "Error al registrar el movimiento"
    });
  }
};

/**
 * Abrir caja
 */
const abrirCaja = async (req, res) => {
  try {
    const { monto, tiendaId } = req.body;
    const userId = req.user?.id_usuario;
    const username = req.user?.usuario || "admin";

    console.log("=== Abrir Caja ===");
    console.log("monto:", monto);
    console.log("tiendaId:", tiendaId);
    console.log("userId:", userId);

    if (!tiendaId) {
      return res.status(400).json({
        success: false,
        message: "El ID de la tienda es requerido"
      });
    }

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "El ID del usuario es requerido"
      });
    }

    if (monto === undefined || monto === null || monto < 0) {
      return res.status(400).json({
        success: false,
        message: "El monto de apertura es requerido y debe ser mayor o igual a 0"
      });
    }

    const result = await cajaService.abrirCaja({
      monto,
      tiendaId,
      userId,
      username
    });

    res.json({
      success: true,
      message: "Caja abierta exitosamente",
      caja: result.caja,
      movimiento: result.movimiento
    });

  } catch (error) {
    console.error("Error en abrirCaja controller:", error);
    res.status(400).json({
      success: false,
      message: error.message || "Error al abrir la caja"
    });
  }
};

/**
 * Cerrar caja
 */
const cerrarCaja = async (req, res) => {
  try {
    const { monto, tiendaId } = req.body;
    const userId = req.user?.id_usuario;
    const username = req.user?.usuario || "admin";

    console.log("=== Cerrar Caja ===");
    console.log("monto:", monto);
    console.log("tiendaId:", tiendaId);
    console.log("userId:", userId);

    if (!tiendaId) {
      return res.status(400).json({
        success: false,
        message: "El ID de la tienda es requerido"
      });
    }

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "El ID del usuario es requerido"
      });
    }

    if (monto === undefined || monto === null || monto < 0) {
      return res.status(400).json({
        success: false,
        message: "El monto de cierre es requerido y debe ser mayor o igual a 0"
      });
    }

    const result = await cajaService.cerrarCaja({
      monto,
      tiendaId,
      userId,
      username
    });

    res.json({
      success: true,
      message: "Caja cerrada exitosamente",
      caja: result.caja,
      movimiento: result.movimiento
    });

  } catch (error) {
    console.error("Error en cerrarCaja controller:", error);
    res.status(400).json({
      success: false,
      message: error.message || "Error al cerrar la caja"
    });
  }
};

/**
 * Obtener tipos de movimiento disponibles
 */
const getTiposMovimiento = async (req, res) => {
  try {
    const tipos = [
      { value: 'ingreso', label: 'Ingreso' },
      { value: 'egreso', label: 'Egreso' },
      { value: 'apertura', label: 'Apertura' },
      { value: 'cierre', label: 'Cierre' }
    ];

    res.json({
      success: true,
      tipos
    });

  } catch (error) {
    console.error("Error en getTiposMovimiento controller:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Error al obtener los tipos de movimiento"
    });
  }
};

module.exports = {
  getEstado,
  getMovimientos,
  getTotalesHoy,
  getStats,
  registrarMovimiento,
  abrirCaja,
  cerrarCaja,
  getTiposMovimiento
};