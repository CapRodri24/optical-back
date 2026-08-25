// src/services/reportesService.js
const { query } = require("../../db");

/**
 * Construir filtros de fecha para las consultas SQL
 */
const buildDateFilters = (filtros) => {
  const { filterType, specificDate, startDate, endDate } = filtros;
  let whereClauses = [];
  let params = [];
  let paramCount = 1;

  switch (filterType) {
    case 'today':
      whereClauses.push(`DATE(v.fecha_hora) = CURRENT_DATE`);
      break;
    case 'yesterday':
      whereClauses.push(`DATE(v.fecha_hora) = CURRENT_DATE - INTERVAL '1 day'`);
      break;
    case 'week': {
      whereClauses.push(`DATE(v.fecha_hora) >= DATE_TRUNC('week', CURRENT_DATE)`);
      whereClauses.push(`DATE(v.fecha_hora) <= DATE_TRUNC('week', CURRENT_DATE) + INTERVAL '6 days'`);
      break;
    }
    case 'month':
      whereClauses.push(`DATE(v.fecha_hora) >= DATE_TRUNC('month', CURRENT_DATE)`);
      whereClauses.push(`DATE(v.fecha_hora) <= DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month' - INTERVAL '1 day'`);
      break;
    case 'specific':
      if (specificDate) {
        const date = new Date(specificDate);
        const dateStr = date.toISOString().split('T')[0];
        whereClauses.push(`DATE(v.fecha_hora) = $${paramCount}`);
        params.push(dateStr);
        paramCount++;
      }
      break;
    case 'range':
      if (startDate && endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        const startStr = start.toISOString().split('T')[0];
        const endStr = end.toISOString().split('T')[0];
        whereClauses.push(`DATE(v.fecha_hora) BETWEEN $${paramCount} AND $${paramCount + 1}`);
        params.push(startStr, endStr);
        paramCount += 2;
      }
      break;
    default:
      whereClauses.push(`DATE(v.fecha_hora) >= DATE_TRUNC('month', CURRENT_DATE)`);
      whereClauses.push(`DATE(v.fecha_hora) <= DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month' - INTERVAL '1 day'`);
  }

  return { whereClauses, params, paramCount };
};

/**
 * Construir filtros de fecha para movimientos de stock (usa fecha_movimiento)
 */
const buildStockDateFilters = (filtros) => {
  const { filterType, specificDate, startDate, endDate } = filtros;
  let whereClauses = [];
  let params = [];
  let paramCount = 1;

  switch (filterType) {
    case 'today':
      whereClauses.push(`DATE(ms.fecha_movimiento) = CURRENT_DATE`);
      break;
    case 'yesterday':
      whereClauses.push(`DATE(ms.fecha_movimiento) = CURRENT_DATE - INTERVAL '1 day'`);
      break;
    case 'week':
      whereClauses.push(`DATE(ms.fecha_movimiento) >= DATE_TRUNC('week', CURRENT_DATE)`);
      whereClauses.push(`DATE(ms.fecha_movimiento) <= DATE_TRUNC('week', CURRENT_DATE) + INTERVAL '6 days'`);
      break;
    case 'month':
      whereClauses.push(`DATE(ms.fecha_movimiento) >= DATE_TRUNC('month', CURRENT_DATE)`);
      whereClauses.push(`DATE(ms.fecha_movimiento) <= DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month' - INTERVAL '1 day'`);
      break;
    case 'specific':
      if (specificDate) {
        const date = new Date(specificDate);
        const dateStr = date.toISOString().split('T')[0];
        whereClauses.push(`DATE(ms.fecha_movimiento) = $${paramCount}`);
        params.push(dateStr);
        paramCount++;
      }
      break;
    case 'range':
      if (startDate && endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        const startStr = start.toISOString().split('T')[0];
        const endStr = end.toISOString().split('T')[0];
        whereClauses.push(`DATE(ms.fecha_movimiento) BETWEEN $${paramCount} AND $${paramCount + 1}`);
        params.push(startStr, endStr);
        paramCount += 2;
      }
      break;
    default:
      whereClauses.push(`DATE(ms.fecha_movimiento) >= DATE_TRUNC('month', CURRENT_DATE)`);
      whereClauses.push(`DATE(ms.fecha_movimiento) <= DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month' - INTERVAL '1 day'`);
  }

  return { whereClauses, params, paramCount };
};

/**
 * Obtener reporte completo
 */
const getReporteCompleto = async (filtros) => {
  try {
    console.log("=== getReporteCompleto Service ===");

    const [resumen, ventasPorMes, ventasPorCategoria, topProductos, bottomProductos, clientesFrecuentes, metodosPago] = await Promise.all([
      getResumen(filtros),
      getVentasPorMes(filtros),
      getVentasPorCategoria(filtros),
      getTopProductos(filtros),
      getBottomProductos(filtros),
      getClientesFrecuentes(filtros),
      getMetodosPago(filtros)
    ]);

    return {
      resumen,
      ventas_por_mes: ventasPorMes,
      ventas_por_categoria: ventasPorCategoria,
      productos_mas_vendidos: topProductos,
      productos_menos_vendidos: bottomProductos,
      clientes_frecuentes: clientesFrecuentes,
      ventas_por_metodo_pago: metodosPago
    };
  } catch (error) {
    console.error("Error en getReporteCompleto service:", error);
    throw error;
  }
};

/**
 * Obtener resumen de ventas
 */
const getResumen = async (filtros) => {
  try {
    const { tiendaId, negocioId } = filtros;
    const { whereClauses, params, paramCount } = buildDateFilters(filtros);

    let queryText = `
      SELECT 
        COALESCE(SUM(v.monto_pagado), 0) as total_ventas,
        COUNT(DISTINCT v.id_venta) as cantidad_ventas,
        COUNT(DISTINCT p.id_persona) as clientes_atendidos,
        COUNT(DISTINCT edl.id_lente) + COUNT(DISTINCT edm.id_material) as productos_vendidos
      FROM venta v
      INNER JOIN pedido pe ON v.id_pedido = pe.id_pedido
      INNER JOIN tienda t ON pe.id_tienda = t.id_tienda
      INNER JOIN negocio n ON t.id_negocio = n.id_negocio
      INNER JOIN persona p ON pe.id_cliente = p.id_persona
      LEFT JOIN entrega_pendiente ep ON pe.id_pedido = ep.id_pedido
      LEFT JOIN entrega_detalle_lente edl ON ep.id_entrega_pendiente = edl.id_entrega_pendiente
      LEFT JOIN entrega_detalle_material edm ON ep.id_entrega_pendiente = edm.id_entrega_pendiente
      WHERE 1=1
    `;

    if (whereClauses.length > 0) {
      queryText += ` AND ${whereClauses.join(' AND ')}`;
    }

    let currentParam = paramCount;

    if (tiendaId) {
      queryText += ` AND t.id_tienda = $${currentParam}`;
      params.push(tiendaId);
      currentParam++;
    }

    if (negocioId) {
      queryText += ` AND n.id_negocio = $${currentParam}`;
      params.push(negocioId);
      currentParam++;
    }

    const result = await query(queryText, params);
    const row = result.rows[0];

    return {
      total_ventas: parseFloat(row.total_ventas || 0),
      cantidad_ventas: parseInt(row.cantidad_ventas || 0),
      ganancia_neta: parseFloat(row.total_ventas || 0) * 0.4,
      productos_vendidos: parseInt(row.productos_vendidos || 0),
      clientes_atendidos: parseInt(row.clientes_atendidos || 0)
    };
  } catch (error) {
    console.error("Error en getResumen service:", error);
    throw error;
  }
};

/**
 * Obtener ventas por mes (últimos 6 meses)
 */
const getVentasPorMes = async (filtros) => {
  try {
    const { tiendaId, negocioId } = filtros;

    let queryText = `
      SELECT 
        TO_CHAR(DATE_TRUNC('month', v.fecha_hora), 'Mon') as mes,
        EXTRACT(MONTH FROM v.fecha_hora) as mes_numero,
        EXTRACT(YEAR FROM v.fecha_hora) as anio,
        COALESCE(SUM(v.monto_pagado), 0) as ventas,
        COALESCE(SUM(v.monto_pagado) * 0.4, 0) as ganancia
      FROM venta v
      INNER JOIN pedido pe ON v.id_pedido = pe.id_pedido
      INNER JOIN tienda t ON pe.id_tienda = t.id_tienda
      INNER JOIN negocio n ON t.id_negocio = n.id_negocio
      WHERE v.fecha_hora >= DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '5 months'
        AND v.fecha_hora <= CURRENT_DATE
    `;

    const params = [];
    let paramCount = 1;

    if (tiendaId) {
      queryText += ` AND t.id_tienda = $${paramCount}`;
      params.push(tiendaId);
      paramCount++;
    }

    if (negocioId) {
      queryText += ` AND n.id_negocio = $${paramCount}`;
      params.push(negocioId);
      paramCount++;
    }

    queryText += `
      GROUP BY DATE_TRUNC('month', v.fecha_hora), EXTRACT(MONTH FROM v.fecha_hora), EXTRACT(YEAR FROM v.fecha_hora)
      ORDER BY DATE_TRUNC('month', v.fecha_hora) ASC
    `;

    const result = await query(queryText, params);

    const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    
    return result.rows.map(row => ({
      mes: row.mes || meses[parseInt(row.mes_numero) - 1] || '---',
      ventas: parseFloat(row.ventas || 0),
      ganancia: parseFloat(row.ganancia || 0)
    }));
  } catch (error) {
    console.error("Error en getVentasPorMes service:", error);
    throw error;
  }
};

/**
 * Obtener ventas por categoría (tipo de lente)
 */
const getVentasPorCategoria = async (filtros) => {
  try {
    const { tiendaId, negocioId } = filtros;
    const { whereClauses, params, paramCount } = buildDateFilters(filtros);

    let queryText = `
      SELECT 
        COALESCE(l.tipo_lente, 'Sin categoría') as nombre_categoria,
        COALESCE(SUM(v.monto_pagado), 0) as total_venta
      FROM venta v
      INNER JOIN pedido pe ON v.id_pedido = pe.id_pedido
      INNER JOIN tienda t ON pe.id_tienda = t.id_tienda
      INNER JOIN negocio n ON t.id_negocio = n.id_negocio
      LEFT JOIN entrega_pendiente ep ON pe.id_pedido = ep.id_pedido
      LEFT JOIN entrega_detalle_lente edl ON ep.id_entrega_pendiente = edl.id_entrega_pendiente
      LEFT JOIN lente l ON edl.id_lente = l.id_lente
      WHERE 1=1
    `;

    if (whereClauses.length > 0) {
      queryText += ` AND ${whereClauses.join(' AND ')}`;
    }

    let currentParam = paramCount;

    if (tiendaId) {
      queryText += ` AND t.id_tienda = $${currentParam}`;
      params.push(tiendaId);
      currentParam++;
    }

    if (negocioId) {
      queryText += ` AND n.id_negocio = $${currentParam}`;
      params.push(negocioId);
      currentParam++;
    }

    queryText += `
      GROUP BY l.tipo_lente
      ORDER BY total_venta DESC
    `;

    const result = await query(queryText, params);

    const total = result.rows.reduce((sum, row) => sum + parseFloat(row.total_venta || 0), 0);

    return result.rows.map(row => ({
      nombre_categoria: row.nombre_categoria,
      total_venta: parseFloat(row.total_venta || 0),
      porcentaje: total > 0 ? (parseFloat(row.total_venta || 0) / total) * 100 : 0
    }));
  } catch (error) {
    console.error("Error en getVentasPorCategoria service:", error);
    throw error;
  }
};

/**
 * Obtener productos más vendidos
 */
const getTopProductos = async (filtros) => {
  try {
    const { tiendaId, negocioId } = filtros;
    const { whereClauses, params, paramCount } = buildDateFilters(filtros);

    let queryText = `
      SELECT 
        m.nombre_material as nombre,
        COALESCE(SUM(edm.cantidad), 0) as cantidad_vendida,
        COALESCE(SUM(edm.total), 0) as total_venta,
        COALESCE(SUM(edm.total) * 0.4, 0) as ganancia
      FROM venta v
      INNER JOIN pedido pe ON v.id_pedido = pe.id_pedido
      INNER JOIN tienda t ON pe.id_tienda = t.id_tienda
      INNER JOIN negocio n ON t.id_negocio = n.id_negocio
      LEFT JOIN entrega_pendiente ep ON pe.id_pedido = ep.id_pedido
      LEFT JOIN entrega_detalle_material edm ON ep.id_entrega_pendiente = edm.id_entrega_pendiente
      LEFT JOIN material m ON edm.id_material = m.id_material
      WHERE m.id_material IS NOT NULL
    `;

    if (whereClauses.length > 0) {
      queryText += ` AND ${whereClauses.join(' AND ')}`;
    }

    let currentParam = paramCount;

    if (tiendaId) {
      queryText += ` AND t.id_tienda = $${currentParam}`;
      params.push(tiendaId);
      currentParam++;
    }

    if (negocioId) {
      queryText += ` AND n.id_negocio = $${currentParam}`;
      params.push(negocioId);
      currentParam++;
    }

    queryText += `
      GROUP BY m.id_material, m.nombre_material
      ORDER BY cantidad_vendida DESC
      LIMIT 10
    `;

    const result = await query(queryText, params);

    return result.rows.map(row => ({
      id_producto: row.nombre,
      nombre: row.nombre,
      cantidad_vendida: parseInt(row.cantidad_vendida || 0),
      total_venta: parseFloat(row.total_venta || 0),
      ganancia: parseFloat(row.ganancia || 0)
    }));
  } catch (error) {
    console.error("Error en getTopProductos service:", error);
    throw error;
  }
};

/**
 * Obtener productos menos vendidos
 */
const getBottomProductos = async (filtros) => {
  try {
    const { tiendaId, negocioId } = filtros;
    const { whereClauses, params, paramCount } = buildDateFilters(filtros);

    let queryText = `
      SELECT 
        m.nombre_material as nombre,
        COALESCE(SUM(edm.cantidad), 0) as cantidad_vendida,
        COALESCE(SUM(edm.total), 0) as total_venta,
        COALESCE(SUM(edm.total) * 0.4, 0) as ganancia
      FROM venta v
      INNER JOIN pedido pe ON v.id_pedido = pe.id_pedido
      INNER JOIN tienda t ON pe.id_tienda = t.id_tienda
      INNER JOIN negocio n ON t.id_negocio = n.id_negocio
      LEFT JOIN entrega_pendiente ep ON pe.id_pedido = ep.id_pedido
      LEFT JOIN entrega_detalle_material edm ON ep.id_entrega_pendiente = edm.id_entrega_pendiente
      LEFT JOIN material m ON edm.id_material = m.id_material
      WHERE m.id_material IS NOT NULL
    `;

    if (whereClauses.length > 0) {
      queryText += ` AND ${whereClauses.join(' AND ')}`;
    }

    let currentParam = paramCount;

    if (tiendaId) {
      queryText += ` AND t.id_tienda = $${currentParam}`;
      params.push(tiendaId);
      currentParam++;
    }

    if (negocioId) {
      queryText += ` AND n.id_negocio = $${currentParam}`;
      params.push(negocioId);
      currentParam++;
    }

    queryText += `
      GROUP BY m.id_material, m.nombre_material
      HAVING COALESCE(SUM(edm.cantidad), 0) > 0
      ORDER BY cantidad_vendida ASC
      LIMIT 10
    `;

    const result = await query(queryText, params);

    return result.rows.map(row => ({
      id_producto: row.nombre,
      nombre: row.nombre,
      cantidad_vendida: parseInt(row.cantidad_vendida || 0),
      total_venta: parseFloat(row.total_venta || 0),
      ganancia: parseFloat(row.ganancia || 0)
    }));
  } catch (error) {
    console.error("Error en getBottomProductos service:", error);
    throw error;
  }
};

/**
 * Obtener clientes frecuentes
 */
const getClientesFrecuentes = async (filtros) => {
  try {
    const { tiendaId, negocioId } = filtros;
    const { whereClauses, params, paramCount } = buildDateFilters(filtros);

    let queryText = `
      SELECT 
        p.nombre || ' ' || p.apellido as nombre,
        COUNT(v.id_venta) as visitas,
        MAX(v.fecha_hora) as ultima_compra
      FROM venta v
      INNER JOIN pedido pe ON v.id_pedido = pe.id_pedido
      INNER JOIN tienda t ON pe.id_tienda = t.id_tienda
      INNER JOIN negocio n ON t.id_negocio = n.id_negocio
      INNER JOIN persona p ON pe.id_cliente = p.id_persona
      WHERE 1=1
    `;

    if (whereClauses.length > 0) {
      queryText += ` AND ${whereClauses.join(' AND ')}`;
    }

    let currentParam = paramCount;

    if (tiendaId) {
      queryText += ` AND t.id_tienda = $${currentParam}`;
      params.push(tiendaId);
      currentParam++;
    }

    if (negocioId) {
      queryText += ` AND n.id_negocio = $${currentParam}`;
      params.push(negocioId);
      currentParam++;
    }

    queryText += `
      GROUP BY p.id_persona, p.nombre, p.apellido
      HAVING COUNT(v.id_venta) > 1
      ORDER BY visitas DESC
      LIMIT 10
    `;

    const result = await query(queryText, params);

    return result.rows.map(row => ({
      nombre: row.nombre,
      visitas: parseInt(row.visitas || 0),
      ultimaCompra: row.ultima_compra ? new Date(row.ultima_compra).toLocaleDateString('es-BO') : 'N/A'
    }));
  } catch (error) {
    console.error("Error en getClientesFrecuentes service:", error);
    throw error;
  }
};

/**
 * Obtener métodos de pago
 */
const getMetodosPago = async (filtros) => {
  try {
    const { tiendaId, negocioId } = filtros;
    const { whereClauses, params, paramCount } = buildDateFilters(filtros);

    let queryText = `
      SELECT 
        v.metodo_pago as name,
        COUNT(v.id_venta) as value
      FROM venta v
      INNER JOIN pedido pe ON v.id_pedido = pe.id_pedido
      INNER JOIN tienda t ON pe.id_tienda = t.id_tienda
      INNER JOIN negocio n ON t.id_negocio = n.id_negocio
      WHERE 1=1
    `;

    if (whereClauses.length > 0) {
      queryText += ` AND ${whereClauses.join(' AND ')}`;
    }

    let currentParam = paramCount;

    if (tiendaId) {
      queryText += ` AND t.id_tienda = $${currentParam}`;
      params.push(tiendaId);
      currentParam++;
    }

    if (negocioId) {
      queryText += ` AND n.id_negocio = $${currentParam}`;
      params.push(negocioId);
      currentParam++;
    }

    queryText += `
      GROUP BY v.metodo_pago
      ORDER BY value DESC
    `;

    const result = await query(queryText, params);

    const methodMap = {
      'Efectivo': 'Efectivo',
      'QR': 'QR',
      'Mixto': 'Mixto'
    };

    return result.rows.map(row => ({
      name: methodMap[row.name] || row.name,
      value: parseInt(row.value || 0)
    }));
  } catch (error) {
    console.error("Error en getMetodosPago service:", error);
    throw error;
  }
};

/**
 * Obtener movimientos de stock desde la tabla movimientos_stock
 */
const getMovimientosStock = async (filtros) => {
  try {
    const { tiendaId, negocioId, producto, usuario, searchTerm } = filtros;
    const { whereClauses, params, paramCount } = buildStockDateFilters(filtros);

    let queryText = `
      SELECT 
        ms.id_movimiento_stock as id,
        ms.fecha_movimiento as fecha,
        m.nombre_material as producto,
        ms.cantidad_modificada as cantidad,
        ms.cantidad_anterior as stock_anterior,
        ms.cantidad_nueva as stock_nuevo,
        u.usuario as usuario,
        t.nombre_tienda as sucursal
      FROM movimientos_stock ms
      INNER JOIN material_tienda mt ON ms.id_material_tienda = mt.id_material_tienda
      INNER JOIN material m ON mt.id_material = m.id_material
      INNER JOIN tienda t ON mt.id_tienda = t.id_tienda
      INNER JOIN negocio n ON t.id_negocio = n.id_negocio
      LEFT JOIN usuario u ON ms.id_usuario = u.id_usuario
      WHERE 1=1
    `;

    if (whereClauses.length > 0) {
      queryText += ` AND ${whereClauses.join(' AND ')}`;
    }

    let currentParam = paramCount;

    if (tiendaId) {
      queryText += ` AND t.id_tienda = $${currentParam}`;
      params.push(tiendaId);
      currentParam++;
    }

    if (negocioId) {
      queryText += ` AND n.id_negocio = $${currentParam}`;
      params.push(negocioId);
      currentParam++;
    }

    if (producto && producto !== 'todos' && producto !== 'null') {
      queryText += ` AND m.nombre_material = $${currentParam}`;
      params.push(producto);
      currentParam++;
    }

    if (usuario && usuario !== 'todos' && usuario !== 'null') {
      queryText += ` AND u.usuario = $${currentParam}`;
      params.push(usuario);
      currentParam++;
    }

    if (searchTerm) {
      queryText += ` AND (m.nombre_material ILIKE $${currentParam} OR u.usuario ILIKE $${currentParam} OR t.nombre_tienda ILIKE $${currentParam})`;
      params.push(`%${searchTerm}%`);
      currentParam++;
    }

    queryText += `
      ORDER BY ms.fecha_movimiento DESC
      LIMIT 100
    `;

    const result = await query(queryText, params);

    return result.rows.map(row => ({
      id: parseInt(row.id),
      fecha: row.fecha.toISOString ? row.fecha.toISOString() : new Date(row.fecha).toISOString(),
      producto: row.producto || 'Producto desconocido',
      cantidad: parseInt(row.cantidad || 0),
      stockAnterior: parseInt(row.stock_anterior || 0),
      stockNuevo: parseInt(row.stock_nuevo || 0),
      usuario: row.usuario || 'admin',
      sucursal: row.sucursal || 'Sin sucursal'
    }));
  } catch (error) {
    console.error("Error en getMovimientosStock service:", error);
    throw error;
  }
};

/**
 * Obtener productos únicos para filtros
 */
const getProductosUnicos = async (negocioId) => {
  try {
    let queryText = `
      SELECT DISTINCT m.nombre_material as producto
      FROM material m
      INNER JOIN material_tienda mt ON m.id_material = mt.id_material
      INNER JOIN tienda t ON mt.id_tienda = t.id_tienda
      WHERE 1=1
    `;

    const params = [];

    if (negocioId) {
      queryText += ` AND t.id_negocio = $1`;
      params.push(negocioId);
    }

    queryText += ` ORDER BY m.nombre_material`;

    const result = await query(queryText, params);

    return result.rows.map(row => row.producto);
  } catch (error) {
    console.error("Error en getProductosUnicos service:", error);
    return [];
  }
};

/**
 * Obtener usuarios únicos para filtros
 */
const getUsuariosUnicos = async (negocioId) => {
  try {
    let queryText = `
      SELECT DISTINCT u.usuario
      FROM usuario u
      INNER JOIN usuario_tienda ut ON u.id_usuario = ut.id_usuario
      INNER JOIN tienda t ON ut.id_tienda = t.id_tienda
      WHERE 1=1
    `;

    const params = [];

    if (negocioId) {
      queryText += ` AND t.id_negocio = $1`;
      params.push(negocioId);
    }

    queryText += ` ORDER BY u.usuario`;

    const result = await query(queryText, params);

    return result.rows.map(row => row.usuario);
  } catch (error) {
    console.error("Error en getUsuariosUnicos service:", error);
    return [];
  }
};

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
  getUsuariosUnicos
};