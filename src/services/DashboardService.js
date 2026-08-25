// src/services/DashboardService.js
const { query } = require("../../db");

// Obtener tiendas disponibles para el usuario
const getUserTiendas = async (userId, userRole) => {
  try {
    let queryStr = "";
    let params = [];

    if (userRole === 'Spider Admin') {
      queryStr = `
        SELECT t.id_tienda
        FROM tienda t
        WHERE t.estado = 'activo'
      `;
    } else {
      queryStr = `
        SELECT t.id_tienda
        FROM tienda t
        INNER JOIN usuario_tienda ut ON ut.id_tienda = t.id_tienda
        WHERE ut.id_usuario = $1 AND t.estado = 'activo'
      `;
      params = [userId];
    }

    const result = await query(queryStr, params);
    return result.rows.map(row => row.id_tienda);
  } catch (error) {
    console.error("Error en getUserTiendas:", error);
    throw new Error("Error al obtener las tiendas del usuario");
  }
};

// Obtener estadísticas del dashboard
const getDashboardStats = async (userId, userRole) => {
  try {
    const tiendas = await getUserTiendas(userId, userRole);
    
    if (tiendas.length === 0) {
      return {
        ventasHoy: 0,
        ventasAyer: 0,
        productosBajoStock: 0,
        cajaAbierta: false,
        ultimaVenta: "Sin ventas"
      };
    }

    const tiendasStr = tiendas.join(',');

    // Obtener ventas de hoy
    const ventasHoyQuery = `
      SELECT COALESCE(SUM(p.total), 0) as total
      FROM pedido p
      WHERE p.id_tienda IN (${tiendasStr})
        AND DATE(p.fecha_pedido) = CURRENT_DATE
        AND p.estado_pago != 'Pendiente'
    `;
    const ventasHoyResult = await query(ventasHoyQuery);
    const ventasHoy = parseFloat(ventasHoyResult.rows[0]?.total || 0);

    // Obtener ventas de ayer
    const ventasAyerQuery = `
      SELECT COALESCE(SUM(p.total), 0) as total
      FROM pedido p
      WHERE p.id_tienda IN (${tiendasStr})
        AND DATE(p.fecha_pedido) = CURRENT_DATE - INTERVAL '1 day'
        AND p.estado_pago != 'Pendiente'
    `;
    const ventasAyerResult = await query(ventasAyerQuery);
    const ventasAyer = parseFloat(ventasAyerResult.rows[0]?.total || 0);

    // Obtener productos con stock bajo (menor al mínimo)
    const bajoStockQuery = `
      SELECT COUNT(*) as total
      FROM material_tienda mt
      WHERE mt.id_tienda IN (${tiendasStr})
        AND mt.stock < mt.stock_minimo
        AND mt.stock_minimo > 0
    `;
    const bajoStockResult = await query(bajoStockQuery);
    const productosBajoStock = parseInt(bajoStockResult.rows[0]?.total || 0);

    // Obtener estado de caja (cualquier caja abierta en las tiendas)
    const cajaQuery = `
      SELECT EXISTS (
        SELECT 1 
        FROM caja c
        WHERE c.id_tienda IN (${tiendasStr})
          AND c.estado = 'abierta'
      ) as abierta
    `;
    const cajaResult = await query(cajaQuery);
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
      WHERE p.id_tienda IN (${tiendasStr})
        AND p.estado_pago != 'Pendiente'
      ORDER BY p.fecha_pedido DESC
      LIMIT 1
    `;
    const ultimaVentaResult = await query(ultimaVentaQuery);
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

// Obtener variación de ventas
const getSalesVariation = async (userId, userRole) => {
  try {
    const tiendas = await getUserTiendas(userId, userRole);
    
    if (tiendas.length === 0) {
      return { hoy: 0, ayer: 0, porcentaje: 0, esPositivo: true };
    }

    const tiendasStr = tiendas.join(',');

    const queryStr = `
      SELECT 
        COALESCE(SUM(CASE WHEN DATE(fecha_pedido) = CURRENT_DATE THEN total ELSE 0 END), 0) as hoy,
        COALESCE(SUM(CASE WHEN DATE(fecha_pedido) = CURRENT_DATE - INTERVAL '1 day' THEN total ELSE 0 END), 0) as ayer
      FROM pedido
      WHERE id_tienda IN (${tiendasStr})
        AND estado_pago != 'Pendiente'
        AND DATE(fecha_pedido) >= CURRENT_DATE - INTERVAL '1 day'
    `;

    const result = await query(queryStr);
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

// Obtener progreso de lentes vendidos
const getDailyGoalProgress = async (userId, userRole) => {
  try {
    const tiendas = await getUserTiendas(userId, userRole);
    
    if (tiendas.length === 0) {
      return { 
        actual: 0, 
        meta: 10, 
        porcentaje: 0
      };
    }

    const tiendasStr = tiendas.join(',');

    // Contar lentes vendidos hoy (de la tabla pedido)
    // Un pedido puede tener múltiples lentes en entrega_detalle_lente
    const lentesVendidosQuery = `
      SELECT COUNT(DISTINCT edl.id_lente) as total_lentes
      FROM pedido p
      INNER JOIN entrega_pendiente ep ON ep.id_pedido = p.id_pedido
      INNER JOIN entrega_detalle_lente edl ON edl.id_entrega_pendiente = ep.id_entrega_pendiente
      WHERE p.id_tienda IN (${tiendasStr})
        AND DATE(p.fecha_pedido) = CURRENT_DATE
        AND p.estado_pago != 'Pendiente'
    `;

    const lentesResult = await query(lentesVendidosQuery);
    const lentesVendidos = parseInt(lentesResult.rows[0]?.total_lentes || 0);

    // Meta diaria: 10 lentes por defecto (se puede configurar)
    const metaDiaria = 10;

    // Calcular porcentaje
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

module.exports = {
  getDashboardStats,
  getSalesVariation,
  getDailyGoalProgress
};