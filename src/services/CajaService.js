// src/services/cajaService.js
const { query } = require("../../db");

/**
 * Obtener o crear una caja para una tienda
 */
const getOrCreateCaja = async (tiendaId) => {
  try {
    // Buscar caja existente
    let result = await query(
      `SELECT id_caja, id_tienda, nombre_caja, total, estado 
       FROM caja 
       WHERE id_tienda = $1`,
      [tiendaId]
    );

    // Si no existe, crear una
    if (result.rows.length === 0) {
      const newCaja = await query(
        `INSERT INTO caja (id_tienda, nombre_caja, total, estado) 
         VALUES ($1, 'Caja Principal', 0, 'cerrada') 
         RETURNING id_caja, id_tienda, nombre_caja, total, estado`,
        [tiendaId]
      );
      return newCaja.rows[0];
    }

    return result.rows[0];
  } catch (error) {
    console.error("Error en getOrCreateCaja:", error);
    throw new Error("Error al obtener/crear la caja");
  }
};

/**
 * Obtener estado actual de la caja
 */
const getEstado = async (tiendaId, userId) => {
  try {
    const caja = await getOrCreateCaja(tiendaId);

    return {
      idcaja: caja.id_caja,
      total: parseFloat(caja.total),
      estado: caja.estado,
      fecha_apertura: null,
      fecha_cierre: null
    };
  } catch (error) {
    console.error("Error en getEstado:", error);
    throw error;
  }
};

/**
 * Obtener movimientos con filtros
 */
const getMovimientos = async (filtros) => {
  try {
    const { tiendaId, filterType, specificDate, startDate, endDate, sortOrder } = filtros;

    // Obtener la caja
    const caja = await getOrCreateCaja(tiendaId);

    let whereClauses = ['tc.id_caja = $1'];
    let params = [caja.id_caja];
    let paramCount = 2;

    // Filtros de fecha
    switch (filterType) {
      case 'today':
        whereClauses.push(`DATE(tc.fecha) = CURRENT_DATE`);
        break;
      case 'yesterday':
        whereClauses.push(`DATE(tc.fecha) = CURRENT_DATE - INTERVAL '1 day'`);
        break;
      case 'week':
        whereClauses.push(`tc.fecha >= CURRENT_DATE - INTERVAL '7 days'`);
        break;
      case 'month':
        whereClauses.push(`tc.fecha >= CURRENT_DATE - INTERVAL '30 days'`);
        break;
      case 'specific':
        if (specificDate) {
          const date = new Date(specificDate);
          whereClauses.push(`DATE(tc.fecha) = $${paramCount}`);
          params.push(date.toISOString().split('T')[0]);
          paramCount++;
        }
        break;
      case 'range':
        if (startDate && endDate) {
          whereClauses.push(`DATE(tc.fecha) BETWEEN $${paramCount} AND $${paramCount + 1}`);
          const start = new Date(startDate);
          const end = new Date(endDate);
          params.push(start.toISOString().split('T')[0]);
          params.push(end.toISOString().split('T')[0]);
          paramCount += 2;
        }
        break;
      default:
        whereClauses.push(`DATE(tc.fecha) = CURRENT_DATE`);
    }

    const order = sortOrder === 'asc' ? 'ASC' : 'DESC';

    const queryText = `
      SELECT 
        tc.id_transaccion_caja,
        tc.fecha,
        tc.monto,
        tc.monto_anterior,
        tc.monto_nuevo,
        tc.tipo_movimiento,
        tc.descripcion,
        tc.id_venta,
        u.usuario as usuario_username
      FROM transaccion_caja tc
      LEFT JOIN usuario u ON tc.id_usuario = u.id_usuario
      WHERE ${whereClauses.join(' AND ')}
      ORDER BY tc.fecha ${order}
    `;

    const result = await query(queryText, params);

    const movimientos = result.rows.map(row => ({
      idmovimiento_caja: row.id_transaccion_caja.toString(),
      tipo: row.tipo_movimiento,
      monto: parseFloat(row.monto),
      monto_anterior: parseFloat(row.monto_anterior),
      monto_nuevo: parseFloat(row.monto_nuevo),
      descripcion: row.descripcion || '',
      fecha: row.fecha.toISOString(),
      usuario_username: row.usuario_username || 'admin',
      ventaId: row.id_venta
    }));

    // Calcular totales
    const ingresos = movimientos
      .filter(m => m.tipo === 'ingreso')
      .reduce((sum, m) => sum + m.monto, 0);

    const egresos = movimientos
      .filter(m => m.tipo === 'egreso')
      .reduce((sum, m) => sum + m.monto, 0);

    return {
      movimientos,
      totales: {
        ingresos,
        egresos,
        total_movimientos: movimientos.length
      }
    };
  } catch (error) {
    console.error("Error en getMovimientos:", error);
    throw error;
  }
};

/**
 * Obtener totales del día
 */
const getTotalesHoy = async (tiendaId, userId) => {
  try {
    const caja = await getOrCreateCaja(tiendaId);

    const result = await query(
      `SELECT 
        COALESCE(SUM(CASE WHEN tipo_movimiento = 'ingreso' THEN monto ELSE 0 END), 0) as ingresos,
        COALESCE(SUM(CASE WHEN tipo_movimiento = 'egreso' THEN monto ELSE 0 END), 0) as egresos,
        COUNT(*) as total_movimientos
       FROM transaccion_caja 
       WHERE id_caja = $1 AND DATE(fecha) = CURRENT_DATE`,
      [caja.id_caja]
    );

    const row = result.rows[0];

    return {
      ingresos: parseFloat(row.ingresos),
      egresos: parseFloat(row.egresos),
      total_movimientos: parseInt(row.total_movimientos)
    };
  } catch (error) {
    console.error("Error en getTotalesHoy:", error);
    throw error;
  }
};

/**
 * Obtener estadísticas rápidas de caja
 */
const getStats = async (tiendaId, userId) => {
  try {
    const caja = await getOrCreateCaja(tiendaId);

    const result = await query(
      `SELECT 
        COALESCE(SUM(CASE WHEN tipo_movimiento = 'ingreso' AND DATE(fecha) = CURRENT_DATE THEN monto ELSE 0 END), 0) as ingresos_hoy,
        COALESCE(SUM(CASE WHEN tipo_movimiento = 'egreso' AND DATE(fecha) = CURRENT_DATE THEN monto ELSE 0 END), 0) as egresos_hoy,
        COUNT(CASE WHEN DATE(fecha) = CURRENT_DATE THEN 1 END) as movimientos_hoy
       FROM transaccion_caja 
       WHERE id_caja = $1`,
      [caja.id_caja]
    );

    const row = result.rows[0];

    return {
      totalCaja: parseFloat(caja.total),
      ingresosHoy: parseFloat(row.ingresos_hoy),
      egresosHoy: parseFloat(row.egresos_hoy),
      movimientosHoy: parseInt(row.movimientos_hoy),
      estado: caja.estado
    };
  } catch (error) {
    console.error("Error en getStats:", error);
    throw error;
  }
};

/**
 * Registrar un movimiento
 */
const registrarMovimiento = async (data) => {
  try {
    const { tipo, monto, descripcion, tiendaId, userId, username, ventaId } = data;

    // Obtener la caja
    const caja = await getOrCreateCaja(tiendaId);

    // Verificar que la caja esté abierta
    if (caja.estado !== 'abierta') {
      throw new Error("La caja está cerrada. Debe abrirla primero.");
    }

    // Verificar que no haya egreso mayor al saldo
    if (tipo === 'egreso' && parseFloat(caja.total) - monto < 0) {
      throw new Error(`Saldo insuficiente. Saldo actual: ${parseFloat(caja.total).toFixed(2)} Bs`);
    }

    const montoAnterior = parseFloat(caja.total);
    const montoNuevo = tipo === 'ingreso' 
      ? montoAnterior + monto 
      : montoAnterior - monto;

    // Registrar la transacción
    const result = await query(
      `INSERT INTO transaccion_caja (
        id_caja, fecha, id_usuario, monto_nuevo, monto_anterior, 
        monto, tipo_movimiento, descripcion, id_venta
      ) VALUES ($1, NOW(), $2, $3, $4, $5, $6, $7, $8)
      RETURNING id_transaccion_caja, fecha, monto, monto_anterior, monto_nuevo, 
                tipo_movimiento, descripcion, id_venta`,
      [
        caja.id_caja,
        userId,
        montoNuevo,
        montoAnterior,
        monto,
        tipo,
        descripcion,
        ventaId || null
      ]
    );

    // Actualizar el total de la caja
    await query(
      `UPDATE caja SET total = $1 WHERE id_caja = $2`,
      [montoNuevo, caja.id_caja]
    );

    const row = result.rows[0];

    return {
      movimiento: {
        idmovimiento_caja: row.id_transaccion_caja.toString(),
        tipo: row.tipo_movimiento,
        monto: parseFloat(row.monto),
        monto_anterior: parseFloat(row.monto_anterior),
        monto_nuevo: parseFloat(row.monto_nuevo),
        descripcion: row.descripcion || '',
        fecha: row.fecha.toISOString(),
        usuario_username: username,
        ventaId: row.id_venta
      },
      caja: {
        id_caja: caja.id_caja,
        total: montoNuevo,
        estado: caja.estado
      }
    };
  } catch (error) {
    console.error("Error en registrarMovimiento:", error);
    throw error;
  }
};

/**
 * Abrir caja
 */
const abrirCaja = async (data) => {
  try {
    const { monto, tiendaId, userId, username } = data;

    console.log("=== abrirCaja Service ===");
    console.log("monto:", monto);
    console.log("tiendaId:", tiendaId);

    // Obtener la caja
    const caja = await getOrCreateCaja(tiendaId);

    // Verificar que la caja esté cerrada
    if (caja.estado === 'abierta') {
      throw new Error("La caja ya está abierta");
    }

    const montoAnterior = parseFloat(caja.total);
    const montoNuevo = monto;

    // Registrar la transacción de apertura
    const result = await query(
      `INSERT INTO transaccion_caja (
        id_caja, fecha, id_usuario, monto_nuevo, monto_anterior, 
        monto, tipo_movimiento, descripcion, id_venta
      ) VALUES ($1, NOW(), $2, $3, $4, $5, 'apertura', 'Apertura de caja', NULL)
      RETURNING id_transaccion_caja, fecha, monto, monto_anterior, monto_nuevo, 
                tipo_movimiento, descripcion`,
      [
        caja.id_caja,
        userId,
        montoNuevo,
        montoAnterior,
        monto
      ]
    );

    // Actualizar el estado y total de la caja
    await query(
      `UPDATE caja SET total = $1, estado = 'abierta' WHERE id_caja = $2`,
      [montoNuevo, caja.id_caja]
    );

    const row = result.rows[0];

    return {
      caja: {
        id_caja: caja.id_caja,
        total: montoNuevo,
        estado: 'abierta'
      },
      movimiento: {
        idmovimiento_caja: row.id_transaccion_caja.toString(),
        tipo: row.tipo_movimiento,
        monto: parseFloat(row.monto),
        monto_anterior: parseFloat(row.monto_anterior),
        monto_nuevo: parseFloat(row.monto_nuevo),
        descripcion: row.descripcion || '',
        fecha: row.fecha.toISOString(),
        usuario_username: username
      }
    };
  } catch (error) {
    console.error("Error en abrirCaja:", error);
    throw error;
  }
};

/**
 * Cerrar caja
 */
const cerrarCaja = async (data) => {
  try {
    const { monto, tiendaId, userId, username } = data;

    console.log("=== cerrarCaja Service ===");
    console.log("monto:", monto);
    console.log("tiendaId:", tiendaId);

    // Obtener la caja
    const caja = await getOrCreateCaja(tiendaId);

    // Verificar que la caja esté abierta
    if (caja.estado === 'cerrada') {
      throw new Error("La caja ya está cerrada");
    }

    const totalActual = parseFloat(caja.total);

    // Verificar que el monto coincida con el total
    if (Math.abs(monto - totalActual) > 0.01) {
      throw new Error(
        `El monto ingresado (${monto.toFixed(2)} Bs) no coincide con el total de la caja (${totalActual.toFixed(2)} Bs)`
      );
    }

    const montoAnterior = totalActual;
    const montoNuevo = totalActual;

    // Registrar la transacción de cierre
    const result = await query(
      `INSERT INTO transaccion_caja (
        id_caja, fecha, id_usuario, monto_nuevo, monto_anterior, 
        monto, tipo_movimiento, descripcion, id_venta
      ) VALUES ($1, NOW(), $2, $3, $4, $5, 'cierre', 'Cierre de caja', NULL)
      RETURNING id_transaccion_caja, fecha, monto, monto_anterior, monto_nuevo, 
                tipo_movimiento, descripcion`,
      [
        caja.id_caja,
        userId,
        montoNuevo,
        montoAnterior,
        monto
      ]
    );

    // Actualizar el estado de la caja
    await query(
      `UPDATE caja SET estado = 'cerrada' WHERE id_caja = $1`,
      [caja.id_caja]
    );

    const row = result.rows[0];

    return {
      caja: {
        id_caja: caja.id_caja,
        total: montoNuevo,
        estado: 'cerrada'
      },
      movimiento: {
        idmovimiento_caja: row.id_transaccion_caja.toString(),
        tipo: row.tipo_movimiento,
        monto: parseFloat(row.monto),
        monto_anterior: parseFloat(row.monto_anterior),
        monto_nuevo: parseFloat(row.monto_nuevo),
        descripcion: row.descripcion || '',
        fecha: row.fecha.toISOString(),
        usuario_username: username
      }
    };
  } catch (error) {
    console.error("Error en cerrarCaja:", error);
    throw error;
  }
};

module.exports = {
  getEstado,
  getMovimientos,
  getTotalesHoy,
  getStats,
  registrarMovimiento,
  abrirCaja,
  cerrarCaja
};