// src/controllers/reportesController.js
const reportesService = require("../services/reportesService");

/**
 * Obtener reporte completo con todos los datos
 */
const getReporteCompleto = async (req, res) => {
  try {
    const { 
      filterType, 
      specificDate, 
      startDate, 
      endDate,
      tiendaId 
    } = req.query;
    
    const negocioId = req.user?.negocioId || null;
    const userId = req.user?.id_usuario;

    console.log("=== getReporteCompleto ===");
    console.log("filterType:", filterType);
    console.log("tiendaId:", tiendaId);
    console.log("negocioId:", negocioId);

    const filtros = {
      filterType: filterType || 'month',
      specificDate: specificDate || null,
      startDate: startDate || null,
      endDate: endDate || null,
      tiendaId: tiendaId || null,
      negocioId: negocioId,
      userId: userId
    };

    const result = await reportesService.getReporteCompleto(filtros);

    res.json({
      success: true,
      resumen: result.resumen,
      ventas_por_mes: result.ventas_por_mes,
      ventas_por_categoria: result.ventas_por_categoria,
      productos_mas_vendidos: result.productos_mas_vendidos,
      productos_menos_vendidos: result.productos_menos_vendidos,
      clientes_frecuentes: result.clientes_frecuentes,
      ventas_por_metodo_pago: result.ventas_por_metodo_pago
    });

  } catch (error) {
    console.error("Error en getReporteCompleto controller:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Error al obtener el reporte completo"
    });
  }
};

/**
 * Obtener resumen de ventas
 */
const getResumen = async (req, res) => {
  try {
    const { filterType, specificDate, startDate, endDate, tiendaId } = req.query;
    const negocioId = req.user?.negocioId || null;

    const filtros = {
      filterType: filterType || 'month',
      specificDate: specificDate || null,
      startDate: startDate || null,
      endDate: endDate || null,
      tiendaId: tiendaId || null,
      negocioId: negocioId
    };

    const result = await reportesService.getResumen(filtros);

    res.json({
      success: true,
      ...result
    });

  } catch (error) {
    console.error("Error en getResumen controller:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Error al obtener el resumen"
    });
  }
};

/**
 * Obtener ventas por mes
 */
const getVentasPorMes = async (req, res) => {
  try {
    const { filterType, specificDate, startDate, endDate, tiendaId } = req.query;
    const negocioId = req.user?.negocioId || null;

    const filtros = {
      filterType: filterType || 'month',
      specificDate: specificDate || null,
      startDate: startDate || null,
      endDate: endDate || null,
      tiendaId: tiendaId || null,
      negocioId: negocioId
    };

    const result = await reportesService.getVentasPorMes(filtros);

    res.json({
      success: true,
      ventas_por_mes: result
    });

  } catch (error) {
    console.error("Error en getVentasPorMes controller:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Error al obtener ventas por mes"
    });
  }
};

/**
 * Obtener ventas por categoría
 */
const getVentasPorCategoria = async (req, res) => {
  try {
    const { filterType, specificDate, startDate, endDate, tiendaId } = req.query;
    const negocioId = req.user?.negocioId || null;

    const filtros = {
      filterType: filterType || 'month',
      specificDate: specificDate || null,
      startDate: startDate || null,
      endDate: endDate || null,
      tiendaId: tiendaId || null,
      negocioId: negocioId
    };

    const result = await reportesService.getVentasPorCategoria(filtros);

    res.json({
      success: true,
      ventas_por_categoria: result
    });

  } catch (error) {
    console.error("Error en getVentasPorCategoria controller:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Error al obtener ventas por categoría"
    });
  }
};

/**
 * Obtener productos más vendidos
 */
const getTopProductos = async (req, res) => {
  try {
    const { filterType, specificDate, startDate, endDate, tiendaId } = req.query;
    const negocioId = req.user?.negocioId || null;

    const filtros = {
      filterType: filterType || 'month',
      specificDate: specificDate || null,
      startDate: startDate || null,
      endDate: endDate || null,
      tiendaId: tiendaId || null,
      negocioId: negocioId
    };

    const result = await reportesService.getTopProductos(filtros);

    res.json({
      success: true,
      productos_mas_vendidos: result
    });

  } catch (error) {
    console.error("Error en getTopProductos controller:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Error al obtener productos más vendidos"
    });
  }
};

/**
 * Obtener productos menos vendidos
 */
const getBottomProductos = async (req, res) => {
  try {
    const { filterType, specificDate, startDate, endDate, tiendaId } = req.query;
    const negocioId = req.user?.negocioId || null;

    const filtros = {
      filterType: filterType || 'month',
      specificDate: specificDate || null,
      startDate: startDate || null,
      endDate: endDate || null,
      tiendaId: tiendaId || null,
      negocioId: negocioId
    };

    const result = await reportesService.getBottomProductos(filtros);

    res.json({
      success: true,
      productos_menos_vendidos: result
    });

  } catch (error) {
    console.error("Error en getBottomProductos controller:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Error al obtener productos menos vendidos"
    });
  }
};

/**
 * Obtener clientes frecuentes
 */
const getClientesFrecuentes = async (req, res) => {
  try {
    const { filterType, specificDate, startDate, endDate, tiendaId } = req.query;
    const negocioId = req.user?.negocioId || null;

    const filtros = {
      filterType: filterType || 'month',
      specificDate: specificDate || null,
      startDate: startDate || null,
      endDate: endDate || null,
      tiendaId: tiendaId || null,
      negocioId: negocioId
    };

    const result = await reportesService.getClientesFrecuentes(filtros);

    res.json({
      success: true,
      clientes_frecuentes: result
    });

  } catch (error) {
    console.error("Error en getClientesFrecuentes controller:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Error al obtener clientes frecuentes"
    });
  }
};

/**
 * Obtener métodos de pago
 */
const getMetodosPago = async (req, res) => {
  try {
    const { filterType, specificDate, startDate, endDate, tiendaId } = req.query;
    const negocioId = req.user?.negocioId || null;

    const filtros = {
      filterType: filterType || 'month',
      specificDate: specificDate || null,
      startDate: startDate || null,
      endDate: endDate || null,
      tiendaId: tiendaId || null,
      negocioId: negocioId
    };

    const result = await reportesService.getMetodosPago(filtros);

    res.json({
      success: true,
      ventas_por_metodo_pago: result
    });

  } catch (error) {
    console.error("Error en getMetodosPago controller:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Error al obtener métodos de pago"
    });
  }
};

/**
 * Obtener movimientos de stock
 */
const getMovimientosStock = async (req, res) => {
  try {
    const { 
      filterType, 
      specificDate, 
      startDate, 
      endDate, 
      producto,
      usuario,
      searchTerm,
      tiendaId 
    } = req.query;
    
    const negocioId = req.user?.negocioId || null;

    console.log("=== getMovimientosStock ===");
    console.log("filterType:", filterType);
    console.log("producto:", producto);
    console.log("usuario:", usuario);

    const filtros = {
      filterType: filterType || 'month',
      specificDate: specificDate || null,
      startDate: startDate || null,
      endDate: endDate || null,
      producto: producto || null,
      usuario: usuario || null,
      searchTerm: searchTerm || null,
      tiendaId: tiendaId || null,
      negocioId: negocioId
    };

    const result = await reportesService.getMovimientosStock(filtros);

    res.json({
      success: true,
      movimientos: result
    });

  } catch (error) {
    console.error("Error en getMovimientosStock controller:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Error al obtener movimientos de stock"
    });
  }
};

/**
 * Obtener productos únicos para filtros
 */
const getProductosUnicos = async (req, res) => {
  try {
    const negocioId = req.user?.negocioId || null;

    const result = await reportesService.getProductosUnicos(negocioId);

    res.json({
      success: true,
      productos: result
    });

  } catch (error) {
    console.error("Error en getProductosUnicos controller:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Error al obtener productos únicos"
    });
  }
};

/**
 * Obtener usuarios únicos para filtros
 */
const getUsuariosUnicos = async (req, res) => {
  try {
    const negocioId = req.user?.negocioId || null;

    const result = await reportesService.getUsuariosUnicos(negocioId);

    res.json({
      success: true,
      usuarios: result
    });

  } catch (error) {
    console.error("Error en getUsuariosUnicos controller:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Error al obtener usuarios únicos"
    });
  }
};

/**
 * Obtener opciones de filtro de fecha
 */
const getDateFilterOptions = async (req, res) => {
  try {
    const options = [
      { value: 'today', label: 'Hoy' },
      { value: 'yesterday', label: 'Ayer' },
      { value: 'week', label: 'Esta semana' },
      { value: 'month', label: 'Este mes' },
      { value: 'specific', label: 'Fecha específica' },
      { value: 'range', label: 'Rango de fechas' }
    ];

    res.json({
      success: true,
      options
    });

  } catch (error) {
    console.error("Error en getDateFilterOptions controller:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Error al obtener opciones de filtro"
    });
  }
};

// EXPORTAR TODAS LAS FUNCIONES
module.exports = {
  getReporteCompleto,
  getResumen,
  getVentasPorMes,
  getVentasPorCategoria,
  getTopProductos,
  getBottomProductos,
  getClientesFrecuentes,
  getMetodosPago,
  getMovimientosStock,
  getProductosUnicos,
  getUsuariosUnicos,
  getDateFilterOptions
};