// src/services/DashboardService.js
const { query } = require("../../db");

// Obtener tiendas disponibles para el usuario
const getUserTiendas = async (userId, userRole) => {
  try {
    let queryStr = "";
    let params = [];

    if (userRole === 'Spider Admin') {
      queryStr = `
        SELECT t.id_tienda, t.nombre_tienda
        FROM tienda t
        WHERE t.estado = 'activo'
      `;
    } else {
      queryStr = `
        SELECT t.id_tienda, t.nombre_tienda
        FROM tienda t
        INNER JOIN usuario_tienda ut ON ut.id_tienda = t.id_tienda
        WHERE ut.id_usuario = $1 AND t.estado = 'activo'
      `;
      params = [userId];
    }

    const result = await query(queryStr, params);
    return result.rows.map(row => ({
      id_tienda: row.id_tienda,
      nombre_tienda: row.nombre_tienda
    }));
  } catch (error) {
    console.error("Error en getUserTiendas:", error);
    throw new Error("Error al obtener las tiendas del usuario");
  }
};

// Helper para construir la lista de IDs de forma segura
const buildTiendasStr = (tiendasIds) => {
  if (!tiendasIds || tiendasIds.length === 0) return '';
  return tiendasIds.join(',');
};

// Obtener estadísticas del dashboard (consolidadas)
const getDashboardStats = async (userId, userRole) => {
  try {
    const tiendas = await getUserTiendas(userId, userRole);
    const tiendasIds = tiendas.map(t => t.id_tienda);
    
    if (tiendasIds.length === 0) {
      return {
        ventasHoy: 0,
        ventasAyer: 0,
        productosBajoStock: 0,
        cajaAbierta: false,
        ultimaVenta: "Sin ventas"
      };
    }

    // Usar $1, $2, etc. para parámetros en lugar de concatenación
    const tiendasStr = buildTiendasStr(tiendasIds);
    
    // Obtener ventas de hoy
    const ventasHoyQuery = `
      SELECT COALESCE(SUM(p.total), 0) as total
      FROM pedido p
      WHERE p.id_tienda = ANY($1::int[])
        AND DATE(p.fecha_pedido) = CURRENT_DATE
        AND p.estado_pago != 'Pendiente'
    `;
    const ventasHoyResult = await query(ventasHoyQuery, [tiendasIds]);
    const ventasHoy = parseFloat(ventasHoyResult.rows[0]?.total || 0);

    // Obtener ventas de ayer
    const ventasAyerQuery = `
      SELECT COALESCE(SUM(p.total), 0) as total
      FROM pedido p
      WHERE p.id_tienda = ANY($1::int[])
        AND DATE(p.fecha_pedido) = CURRENT_DATE - INTERVAL '1 day'
        AND p.estado_pago != 'Pendiente'
    `;
    const ventasAyerResult = await query(ventasAyerQuery, [tiendasIds]);
    const ventasAyer = parseFloat(ventasAyerResult.rows[0]?.total || 0);

    // Obtener productos con stock bajo (menor al mínimo)
    const bajoStockQuery = `
      SELECT COUNT(*) as total
      FROM material_tienda mt
      WHERE mt.id_tienda = ANY($1::int[])
        AND mt.stock < mt.stock_minimo
        AND mt.stock_minimo > 0
    `;
    const bajoStockResult = await query(bajoStockQuery, [tiendasIds]);
    const productosBajoStock = parseInt(bajoStockResult.rows[0]?.total || 0);

    // Obtener estado de caja (cualquier caja abierta en las tiendas)
    const cajaQuery = `
      SELECT EXISTS (
        SELECT 1 
        FROM caja c
        WHERE c.id_tienda = ANY($1::int[])
          AND c.estado = 'abierta'
      ) as abierta
    `;
    const cajaResult = await query(cajaQuery, [tiendasIds]);
    const cajaAbierta = cajaResult.rows[0]?.abierta || false;

    // Obtener última venta
    const ultimaVentaQuery = `
      SELECT 
        CASE 
          WHEN EXTRACT(EPOCH FROM (NOW() - p.fecha_pedido)) < 60 THEN 'Hace ' || EXTRACT(EPOCH FROM (NOW() - p.fecha_pedido))::INT || ' segundos'
          WHEN EXTRACT(EPOCH FROM (NOW() - p.fecha_pedido)) < 3600 THEN 'Hace ' || EXTRACT(EPOCH FROM (NOW() - p.fecha_pedido))::INT / 60 || ' minutos'
          WHEN EXTRACT(EPOCH FROM (NOW() - p.fecha_pedido)) < 86400 THEN 'Hace ' || EXTRACT(EPOCH FROM (NOW() - p.fecha_pedido))::INT / 3600 || ' horas'
          ELSE 'Hace más de 1 día'
        END as ultima_venta
      FROM pedido p
      WHERE p.id_tienda = ANY($1::int[])
        AND p.estado_pago != 'Pendiente'
      ORDER BY p.fecha_pedido DESC
      LIMIT 1
    `;
    const ultimaVentaResult = await query(ultimaVentaQuery, [tiendasIds]);
    const ultimaVenta = ultimaVentaResult.rows[0]?.ultima_venta || "Sin ventas";

    return {
      ventasHoy,
      ventasAyer,
      productosBajoStock,
      cajaAbierta,
      ultimaVenta
    };
  } catch (error) {
    console.error("Error en getDashboardStats:", error);
    throw new Error("Error al obtener las estadísticas del dashboard");
  }
};

// Obtener variación de ventas (consolidada)
const getSalesVariation = async (userId, userRole) => {
  try {
    const tiendas = await getUserTiendas(userId, userRole);
    const tiendasIds = tiendas.map(t => t.id_tienda);
    
    if (tiendasIds.length === 0) {
      return { hoy: 0, ayer: 0, porcentaje: 0, esPositivo: true };
    }

    const queryStr = `
      SELECT 
        COALESCE(SUM(CASE WHEN DATE(fecha_pedido) = CURRENT_DATE THEN total ELSE 0 END), 0) as hoy,
        COALESCE(SUM(CASE WHEN DATE(fecha_pedido) = CURRENT_DATE - INTERVAL '1 day' THEN total ELSE 0 END), 0) as ayer
      FROM pedido
      WHERE id_tienda = ANY($1::int[])
        AND estado_pago != 'Pendiente'
        AND DATE(fecha_pedido) >= CURRENT_DATE - INTERVAL '1 day'
    `;

    const result = await query(queryStr, [tiendasIds]);
    const hoy = parseFloat(result.rows[0]?.hoy || 0);
    const ayer = parseFloat(result.rows[0]?.ayer || 0);
    
    let porcentaje = 0;
    if (ayer === 0 && hoy === 0) {
      porcentaje = 0;
    } else if (ayer === 0) {
      porcentaje = 100;
    } else {
      porcentaje = ((hoy - ayer) / ayer) * 100;
    }

    return {
      hoy,
      ayer,
      porcentaje,
      esPositivo: porcentaje >= 0
    };
  } catch (error) {
    console.error("Error en getSalesVariation:", error);
    throw new Error("Error al obtener la variación de ventas");
  }
};

// Obtener progreso de lentes vendidos (consolidado)
const getDailyGoalProgress = async (userId, userRole) => {
  try {
    const tiendas = await getUserTiendas(userId, userRole);
    const tiendasIds = tiendas.map(t => t.id_tienda);
    
    if (tiendasIds.length === 0) {
      return { 
        actual: 0, 
        meta: 10, 
        porcentaje: 0
      };
    }

    const lentesVendidosQuery = `
      SELECT COUNT(DISTINCT edl.id_lente) as total_lentes
      FROM pedido p
      INNER JOIN entrega_pendiente ep ON ep.id_pedido = p.id_pedido
      INNER JOIN entrega_detalle_lente edl ON edl.id_entrega_pendiente = ep.id_entrega_pendiente
      WHERE p.id_tienda = ANY($1::int[])
        AND DATE(p.fecha_pedido) = CURRENT_DATE
        AND p.estado_pago != 'Pendiente'
    `;

    const lentesResult = await query(lentesVendidosQuery, [tiendasIds]);
    const lentesVendidos = parseInt(lentesResult.rows[0]?.total_lentes || 0);

    const metaDiaria = 10;
    let porcentaje = 0;
    if (metaDiaria > 0) {
      porcentaje = Math.min(100, (lentesVendidos / metaDiaria) * 100);
    }

    return {
      actual: lentesVendidos,
      meta: metaDiaria,
      porcentaje
    };
  } catch (error) {
    console.error("Error en getDailyGoalProgress:", error);
    throw new Error("Error al obtener el progreso de lentes vendidos");
  }
};

// ============================================
// NUEVAS FUNCIONES PARA DATOS POR TIENDA
// ============================================

// Obtener estadísticas por tienda
const getDashboardStatsByStore = async (userId, userRole) => {
  try {
    const tiendas = await getUserTiendas(userId, userRole);
    
    if (tiendas.length === 0) {
      return [];
    }

    const tiendasIds = tiendas.map(t => t.id_tienda);

    // Obtener ventas de hoy por tienda
    const ventasHoyQuery = `
      SELECT 
        p.id_tienda,
        t.nombre_tienda,
        COALESCE(SUM(p.total), 0) as ventas_hoy
      FROM pedido p
      INNER JOIN tienda t ON t.id_tienda = p.id_tienda
      WHERE p.id_tienda = ANY($1::int[])
        AND DATE(p.fecha_pedido) = CURRENT_DATE
        AND p.estado_pago != 'Pendiente'
      GROUP BY p.id_tienda, t.nombre_tienda
    `;
    const ventasHoyResult = await query(ventasHoyQuery, [tiendasIds]);

    // Obtener ventas de ayer por tienda
    const ventasAyerQuery = `
      SELECT 
        p.id_tienda,
        COALESCE(SUM(p.total), 0) as ventas_ayer
      FROM pedido p
      WHERE p.id_tienda = ANY($1::int[])
        AND DATE(p.fecha_pedido) = CURRENT_DATE - INTERVAL '1 day'
        AND p.estado_pago != 'Pendiente'
      GROUP BY p.id_tienda
    `;
    const ventasAyerResult = await query(ventasAyerQuery, [tiendasIds]);

    // Obtener stock bajo por tienda
    const bajoStockQuery = `
      SELECT 
        mt.id_tienda,
        COUNT(*) as total
      FROM material_tienda mt
      WHERE mt.id_tienda = ANY($1::int[])
        AND mt.stock < mt.stock_minimo
        AND mt.stock_minimo > 0
      GROUP BY mt.id_tienda
    `;
    const bajoStockResult = await query(bajoStockQuery, [tiendasIds]);

    // Obtener estado de caja por tienda
    const cajaQuery = `
      SELECT 
        c.id_tienda,
        c.estado = 'abierta' as abierta
      FROM caja c
      WHERE c.id_tienda = ANY($1::int[])
    `;
    const cajaResult = await query(cajaQuery, [tiendasIds]);

    // Obtener última venta por tienda
    const ultimaVentaQuery = `
      SELECT DISTINCT ON (p.id_tienda)
        p.id_tienda,
        CASE 
          WHEN EXTRACT(EPOCH FROM (NOW() - p.fecha_pedido)) < 60 THEN 'Hace ' || EXTRACT(EPOCH FROM (NOW() - p.fecha_pedido))::INT || ' segundos'
          WHEN EXTRACT(EPOCH FROM (NOW() - p.fecha_pedido)) < 3600 THEN 'Hace ' || EXTRACT(EPOCH FROM (NOW() - p.fecha_pedido))::INT / 60 || ' minutos'
          WHEN EXTRACT(EPOCH FROM (NOW() - p.fecha_pedido)) < 86400 THEN 'Hace ' || EXTRACT(EPOCH FROM (NOW() - p.fecha_pedido))::INT / 3600 || ' horas'
          ELSE 'Hace más de 1 día'
        END as ultima_venta
      FROM pedido p
      WHERE p.id_tienda = ANY($1::int[])
        AND p.estado_pago != 'Pendiente'
      ORDER BY p.id_tienda, p.fecha_pedido DESC
    `;
    const ultimaVentaResult = await query(ultimaVentaQuery, [tiendasIds]);

    // Construir mapa de resultados
    const ventasHoyMap = {};
    ventasHoyResult.rows.forEach(row => {
      ventasHoyMap[row.id_tienda] = {
        nombre_tienda: row.nombre_tienda,
        ventas_hoy: parseFloat(row.ventas_hoy)
      };
    });

    const ventasAyerMap = {};
    ventasAyerResult.rows.forEach(row => {
      ventasAyerMap[row.id_tienda] = parseFloat(row.ventas_ayer);
    });

    const bajoStockMap = {};
    bajoStockResult.rows.forEach(row => {
      bajoStockMap[row.id_tienda] = parseInt(row.total);
    });

    const cajaMap = {};
    cajaResult.rows.forEach(row => {
      cajaMap[row.id_tienda] = row.abierta;
    });

    const ultimaVentaMap = {};
    ultimaVentaResult.rows.forEach(row => {
      ultimaVentaMap[row.id_tienda] = row.ultima_venta;
    });

    // Combinar resultados
    const result = tiendas.map(tienda => {
      const hoy = ventasHoyMap[tienda.id_tienda];
      return {
        id_tienda: tienda.id_tienda,
        nombre_tienda: hoy?.nombre_tienda || tienda.nombre_tienda,
        ventasHoy: hoy?.ventas_hoy || 0,
        ventasAyer: ventasAyerMap[tienda.id_tienda] || 0,
        productosBajoStock: bajoStockMap[tienda.id_tienda] || 0,
        cajaAbierta: cajaMap[tienda.id_tienda] || false,
        ultimaVenta: ultimaVentaMap[tienda.id_tienda] || "Sin ventas"
      };
    });

    return result;
  } catch (error) {
    console.error("Error en getDashboardStatsByStore:", error);
    throw new Error("Error al obtener las estadísticas por tienda");
  }
};

// Obtener variación de ventas por tienda
const getSalesVariationByStore = async (userId, userRole) => {
  try {
    const tiendas = await getUserTiendas(userId, userRole);
    
    if (tiendas.length === 0) {
      return [];
    }

    const tiendasIds = tiendas.map(t => t.id_tienda);

    const queryStr = `
      SELECT 
        p.id_tienda,
        t.nombre_tienda,
        COALESCE(SUM(CASE WHEN DATE(fecha_pedido) = CURRENT_DATE THEN total ELSE 0 END), 0) as hoy,
        COALESCE(SUM(CASE WHEN DATE(fecha_pedido) = CURRENT_DATE - INTERVAL '1 day' THEN total ELSE 0 END), 0) as ayer
      FROM pedido p
      INNER JOIN tienda t ON t.id_tienda = p.id_tienda
      WHERE p.id_tienda = ANY($1::int[])
        AND p.estado_pago != 'Pendiente'
        AND DATE(p.fecha_pedido) >= CURRENT_DATE - INTERVAL '1 day'
      GROUP BY p.id_tienda, t.nombre_tienda
    `;

    const result = await query(queryStr, [tiendasIds]);
    
    // Crear mapa para todas las tiendas
    const tiendaMap = {};
    tiendas.forEach(t => {
      tiendaMap[t.id_tienda] = {
        id_tienda: t.id_tienda,
        nombre_tienda: t.nombre_tienda,
        hoy: 0,
        ayer: 0,
        porcentaje: 0,
        esPositivo: true
      };
    });

    // Actualizar con datos de la consulta
    result.rows.forEach(row => {
      const hoy = parseFloat(row.hoy || 0);
      const ayer = parseFloat(row.ayer || 0);
      let porcentaje = 0;
      if (ayer === 0 && hoy === 0) {
        porcentaje = 0;
      } else if (ayer === 0) {
        porcentaje = 100;
      } else {
        porcentaje = ((hoy - ayer) / ayer) * 100;
      }

      tiendaMap[row.id_tienda] = {
        id_tienda: row.id_tienda,
        nombre_tienda: row.nombre_tienda,
        hoy,
        ayer,
        porcentaje,
        esPositivo: porcentaje >= 0
      };
    });

    return Object.values(tiendaMap);
  } catch (error) {
    console.error("Error en getSalesVariationByStore:", error);
    throw new Error("Error al obtener la variación de ventas por tienda");
  }
};

// Obtener progreso de lentes por tienda
const getDailyGoalProgressByStore = async (userId, userRole) => {
  try {
    const tiendas = await getUserTiendas(userId, userRole);
    
    if (tiendas.length === 0) {
      return [];
    }

    const tiendasIds = tiendas.map(t => t.id_tienda);

    const lentesVendidosQuery = `
      SELECT 
        p.id_tienda,
        t.nombre_tienda,
        COUNT(DISTINCT edl.id_lente) as total_lentes
      FROM pedido p
      INNER JOIN tienda t ON t.id_tienda = p.id_tienda
      INNER JOIN entrega_pendiente ep ON ep.id_pedido = p.id_pedido
      INNER JOIN entrega_detalle_lente edl ON edl.id_entrega_pendiente = ep.id_entrega_pendiente
      WHERE p.id_tienda = ANY($1::int[])
        AND DATE(p.fecha_pedido) = CURRENT_DATE
        AND p.estado_pago != 'Pendiente'
      GROUP BY p.id_tienda, t.nombre_tienda
    `;

    const lentesResult = await query(lentesVendidosQuery, [tiendasIds]);
    
    const metaDiaria = 10;
    const tiendaMap = {};
    
    tiendas.forEach(t => {
      tiendaMap[t.id_tienda] = {
        id_tienda: t.id_tienda,
        nombre_tienda: t.nombre_tienda,
        actual: 0,
        meta: metaDiaria,
        porcentaje: 0
      };
    });

    lentesResult.rows.forEach(row => {
      const actual = parseInt(row.total_lentes || 0);
      let porcentaje = 0;
      if (metaDiaria > 0) {
        porcentaje = Math.min(100, (actual / metaDiaria) * 100);
      }
      tiendaMap[row.id_tienda] = {
        id_tienda: row.id_tienda,
        nombre_tienda: row.nombre_tienda,
        actual,
        meta: metaDiaria,
        porcentaje
      };
    });

    return Object.values(tiendaMap);
  } catch (error) {
    console.error("Error en getDailyGoalProgressByStore:", error);
    throw new Error("Error al obtener el progreso de lentes vendidos por tienda");
  }
};

module.exports = {
  getDashboardStats,
  getSalesVariation,
  getDailyGoalProgress,
  getDashboardStatsByStore,
  getSalesVariationByStore,
  getDailyGoalProgressByStore
};