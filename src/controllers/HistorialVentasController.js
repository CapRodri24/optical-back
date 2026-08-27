// src/controllers/HistorialVentasController.js
const historialVentasService = require("../services/HistorialVentasService");

// ============================================
// GET - OBTENER VENTAS CON FILTROS
// ============================================

const getVentas = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Usuario no autenticado"
      });
    }

    const {
      dateFilterType,
      specificDate,
      startDate,
      endDate,
      selectedMetodoPago,
      searchTerm,
      tiendaId,
      sortDirection = "desc",
      negocioId
    } = req.query;

    console.log("🔍 getVentas - usuario:", req.user.usuario);
    console.log("🔍 getVentas - negocioId recibido:", negocioId);
    console.log("🔍 getVentas - searchTerm recibido:", searchTerm);

    if (!negocioId) {
      return res.status(400).json({
        success: false,
        message: "Negocio ID es requerido"
      });
    }

    const userInfo = {
      negocioId: parseInt(negocioId),
      tiendaId: tiendaId || 'todas',
      userId: req.user.id_usuario,
      role: req.user.rol_nombre,
      username: req.user.usuario
    };

    const ventas = await historialVentasService.getVentas({
      dateFilterType,
      specificDate,
      startDate,
      endDate,
      selectedMetodoPago,
      searchTerm,
      tiendaId,
      sortDirection
    }, userInfo);

    res.json({
      success: true,
      data: ventas
    });
  } catch (error) {
    console.error("Error en getVentas controller:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Error al obtener las ventas"
    });
  }
};

// ============================================
// GET - OBTENER VENTA POR ID
// ============================================

const getVentaById = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Usuario no autenticado"
      });
    }

    const { id } = req.params;
    const { negocioId, tiendaId } = req.query;

    console.log("🔍 getVentaById - id:", id, "negocioId:", negocioId);

    if (!id || isNaN(Number(id))) {
      return res.status(400).json({
        success: false,
        message: "ID de venta inválido"
      });
    }

    if (!negocioId) {
      return res.status(400).json({
        success: false,
        message: "Negocio ID es requerido"
      });
    }

    const userInfo = {
      negocioId: parseInt(negocioId),
      tiendaId: tiendaId || 'todas',
      userId: req.user.id_usuario,
      role: req.user.rol_nombre,
      username: req.user.usuario
    };

    const venta = await historialVentasService.getVentaById(id, userInfo);

    if (!venta) {
      return res.status(404).json({
        success: false,
        message: "Venta no encontrada"
      });
    }

    res.json({
      success: true,
      data: venta
    });
  } catch (error) {
    console.error("Error en getVentaById controller:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Error al obtener la venta"
    });
  }
};

// ============================================
// GET - OBTENER VENTAS POR CÓDIGO
// ============================================

const getVentasByCodigo = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Usuario no autenticado"
      });
    }

    const { codigoVenta } = req.params;
    const { negocioId, tiendaId } = req.query;

    console.log("🔍 getVentasByCodigo - codigoVenta:", codigoVenta);

    if (!codigoVenta) {
      return res.status(400).json({
        success: false,
        message: "Código de venta requerido"
      });
    }

    if (!negocioId) {
      return res.status(400).json({
        success: false,
        message: "Negocio ID es requerido"
      });
    }

    const userInfo = {
      negocioId: parseInt(negocioId),
      tiendaId: tiendaId || 'todas',
      userId: req.user.id_usuario,
      role: req.user.rol_nombre,
      username: req.user.usuario
    };

    const ventas = await historialVentasService.getVentasByCodigo(codigoVenta, userInfo);

    res.json({
      success: true,
      data: ventas
    });
  } catch (error) {
    console.error("Error en getVentasByCodigo controller:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Error al obtener las ventas por código"
    });
  }
};

// ============================================
// GET - OBTENER VENTAS POR CLIENTE
// ============================================

const getVentasByCliente = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Usuario no autenticado"
      });
    }

    const { clientName } = req.params;
    const { negocioId, tiendaId } = req.query;

    console.log("🔍 getVentasByCliente - clientName:", clientName);

    if (!clientName) {
      return res.status(400).json({
        success: false,
        message: "Nombre de cliente requerido"
      });
    }

    if (!negocioId) {
      return res.status(400).json({
        success: false,
        message: "Negocio ID es requerido"
      });
    }

    const userInfo = {
      negocioId: parseInt(negocioId),
      tiendaId: tiendaId || 'todas',
      userId: req.user.id_usuario,
      role: req.user.rol_nombre,
      username: req.user.usuario
    };

    const ventas = await historialVentasService.getVentasByCliente(clientName, userInfo);

    res.json({
      success: true,
      data: ventas
    });
  } catch (error) {
    console.error("Error en getVentasByCliente controller:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Error al obtener las ventas del cliente"
    });
  }
};

// ============================================
// GET - RESUMEN DE VENTAS
// ============================================

const getResumenVentas = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Usuario no autenticado"
      });
    }

    const {
      dateFilterType,
      specificDate,
      startDate,
      endDate,
      selectedMetodoPago,
      searchTerm,
      tiendaId,
      negocioId
    } = req.query;

    console.log("🔍 getResumenVentas - negocioId recibido:", negocioId);

    if (!negocioId) {
      return res.status(400).json({
        success: false,
        message: "Negocio ID es requerido"
      });
    }

    const userInfo = {
      negocioId: parseInt(negocioId),
      tiendaId: tiendaId || 'todas',
      userId: req.user.id_usuario,
      role: req.user.rol_nombre,
      username: req.user.usuario
    };

    const resumen = await historialVentasService.getResumenVentas({
      dateFilterType,
      specificDate,
      startDate,
      endDate,
      selectedMetodoPago,
      searchTerm,
      tiendaId
    }, userInfo);

    res.json({
      success: true,
      data: resumen
    });
  } catch (error) {
    console.error("Error en getResumenVentas controller:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Error al obtener el resumen de ventas"
    });
  }
};

// ============================================
// GET - RESUMEN POR CLIENTE
// ============================================

const getResumenClientes = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Usuario no autenticado"
      });
    }

    const {
      dateFilterType,
      specificDate,
      startDate,
      endDate,
      selectedMetodoPago,
      searchTerm,
      tiendaId,
      tipoFiltro = "todos",
      negocioId
    } = req.query;

    console.log("🔍 getResumenClientes - negocioId recibido:", negocioId);

    if (!negocioId) {
      return res.status(400).json({
        success: false,
        message: "Negocio ID es requerido"
      });
    }

    const userInfo = {
      negocioId: parseInt(negocioId),
      tiendaId: tiendaId || 'todas',
      userId: req.user.id_usuario,
      role: req.user.rol_nombre,
      username: req.user.usuario
    };

    const resumenClientes = await historialVentasService.getResumenClientes({
      dateFilterType,
      specificDate,
      startDate,
      endDate,
      selectedMetodoPago,
      searchTerm,
      tiendaId,
      tipoFiltro
    }, userInfo);

    res.json({
      success: true,
      data: resumenClientes
    });
  } catch (error) {
    console.error("Error en getResumenClientes controller:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Error al obtener el resumen por cliente"
    });
  }
};

// ============================================
// GET - ESTADÍSTICAS RÁPIDAS
// ============================================

const getEstadisticasRapidas = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Usuario no autenticado"
      });
    }

    const { tiendaId, negocioId } = req.query;

    if (!negocioId) {
      return res.status(400).json({
        success: false,
        message: "Negocio ID es requerido"
      });
    }

    const userInfo = {
      negocioId: parseInt(negocioId),
      tiendaId: tiendaId || 'todas',
      userId: req.user.id_usuario,
      role: req.user.rol_nombre,
      username: req.user.usuario
    };

    const estadisticas = await historialVentasService.getEstadisticasRapidas(tiendaId, userInfo);

    res.json({
      success: true,
      data: estadisticas
    });
  } catch (error) {
    console.error("Error en getEstadisticasRapidas controller:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Error al obtener las estadísticas rápidas"
    });
  }
};

// ============================================
// GET - TIENDAS DISPONIBLES
// ============================================

const getTiendas = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Usuario no autenticado"
      });
    }

    const { negocioId } = req.query;

    console.log("🔍 getTiendas - negocioId recibido:", negocioId);

    if (!negocioId) {
      return res.status(400).json({
        success: false,
        message: "Negocio ID es requerido"
      });
    }

    const tiendas = await historialVentasService.getTiendas(parseInt(negocioId));

    res.json({
      success: true,
      data: tiendas
    });
  } catch (error) {
    console.error("Error en getTiendas controller:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Error al obtener las tiendas"
    });
  }
};

// ============================================
// GET - MÉTODOS DE PAGO DISPONIBLES
// ============================================

const getMetodosPago = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Usuario no autenticado"
      });
    }

    console.log("🔍 getMetodosPago");

    const metodos = await historialVentasService.getMetodosPago();

    res.json({
      success: true,
      data: metodos
    });
  } catch (error) {
    console.error("Error en getMetodosPago controller:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Error al obtener los métodos de pago"
    });
  }
};

// ============================================
// GET - TIPOS DE FILTRO DE FECHA
// ============================================

const getTiposFiltroFecha = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Usuario no autenticado"
      });
    }

    console.log("🔍 getTiposFiltroFecha");

    const tipos = await historialVentasService.getTiposFiltroFecha();

    res.json({
      success: true,
      data: tipos
    });
  } catch (error) {
    console.error("Error en getTiposFiltroFecha controller:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Error al obtener los tipos de filtro de fecha"
    });
  }
};

module.exports = {
  getVentas,
  getVentaById,
  getVentasByCodigo,
  getVentasByCliente,
  getResumenVentas,
  getResumenClientes,
  getEstadisticasRapidas,
  getTiendas,
  getMetodosPago,
  getTiposFiltroFecha
};