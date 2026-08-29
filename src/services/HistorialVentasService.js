// src/services/HistorialVentasService.js
const { query } = require("../../db");
const { pool } = require("../../db");

// ============================================
// FUNCIONES DE UTILIDAD PARA FILTROS DE FECHA
// ============================================

const buildDateFilter = (dateFilterType, specificDate, startDate, endDate, startParamIndex = 1) => {
  let dateCondition = "";
  const params = [];
  let paramIndex = startParamIndex;

  if (!dateFilterType || dateFilterType === 'all') {
    return { dateCondition, params, paramIndex };
  }

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  switch (dateFilterType) {
    case 'today': {
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      dateCondition = ` AND p.fecha_pedido >= $${paramIndex} AND p.fecha_pedido < $${paramIndex + 1}`;
      params.push(today.toISOString(), tomorrow.toISOString());
      paramIndex += 2;
      break;
    }
    case 'yesterday': {
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      dateCondition = ` AND p.fecha_pedido >= $${paramIndex} AND p.fecha_pedido < $${paramIndex + 1}`;
      params.push(yesterday.toISOString(), today.toISOString());
      paramIndex += 2;
      break;
    }
    case 'thisWeek': {
      const startOfWeek = new Date(today);
      const day = today.getDay() || 7;
      startOfWeek.setDate(today.getDate() - day + 1);
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(endOfWeek.getDate() + 7);
      dateCondition = ` AND p.fecha_pedido >= $${paramIndex} AND p.fecha_pedido < $${paramIndex + 1}`;
      params.push(startOfWeek.toISOString(), endOfWeek.toISOString());
      paramIndex += 2;
      break;
    }
    case 'lastWeek': {
      const startOfLastWeek = new Date(today);
      const day = today.getDay() || 7;
      startOfLastWeek.setDate(today.getDate() - day - 6);
      const endOfLastWeek = new Date(startOfLastWeek);
      endOfLastWeek.setDate(endOfLastWeek.getDate() + 7);
      dateCondition = ` AND p.fecha_pedido >= $${paramIndex} AND p.fecha_pedido < $${paramIndex + 1}`;
      params.push(startOfLastWeek.toISOString(), endOfLastWeek.toISOString());
      paramIndex += 2;
      break;
    }
    case 'thisMonth': {
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
      dateCondition = ` AND p.fecha_pedido >= $${paramIndex} AND p.fecha_pedido < $${paramIndex + 1}`;
      params.push(startOfMonth.toISOString(), endOfMonth.toISOString());
      paramIndex += 2;
      break;
    }
    case 'lastMonth': {
      const startOfLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const endOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      dateCondition = ` AND p.fecha_pedido >= $${paramIndex} AND p.fecha_pedido < $${paramIndex + 1}`;
      params.push(startOfLastMonth.toISOString(), endOfLastMonth.toISOString());
      paramIndex += 2;
      break;
    }
    case 'specific': {
      if (specificDate) {
        const date = new Date(specificDate);
        const nextDay = new Date(date);
        nextDay.setDate(nextDay.getDate() + 1);
        dateCondition = ` AND p.fecha_pedido >= $${paramIndex} AND p.fecha_pedido < $${paramIndex + 1}`;
        params.push(date.toISOString(), nextDay.toISOString());
        paramIndex += 2;
      }
      break;
    }
    case 'range': {
      if (startDate && endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        end.setDate(end.getDate() + 1);
        dateCondition = ` AND p.fecha_pedido >= $${paramIndex} AND p.fecha_pedido < $${paramIndex + 1}`;
        params.push(start.toISOString(), end.toISOString());
        paramIndex += 2;
      }
      break;
    }
    default:
      break;
  }

  return { dateCondition, params, paramIndex };
};

// ============================================
// FUNCIÓN PARA CONVERTIR VENTA A FORMATO FRONTEND
// ============================================

const mapVentaToFrontend = (row) => {
  return {
    id: row.id_pedido?.toString(),
    codigoVenta: row.codigo_pedido,
    fecha: row.fecha_pedido,
    usuario: row.usuario || 'Sistema',
    metodoPago: row.metodo_pago || 'efectivo',
    subtotal: parseFloat(row.sub_total || 0),
    descuento: parseFloat(row.descuento || 0),
    total: parseFloat(row.total || 0),
    clientName: row.cliente_nombre || 'Cliente',
    tiendaId: row.id_tienda?.toString(),
    pagoEfectivo: parseFloat(row.monto_efectivo || 0),
    pagoQR: parseFloat(row.monto_qr || 0),
    lentes: [],
    productosAdicionales: []
  };
};

// ============================================
// GET - OBTENER VENTAS CON FILTROS
// ============================================

const getVentas = async (filtros, userInfo) => {
  try {
    const {
      dateFilterType,
      specificDate,
      startDate,
      endDate,
      selectedMetodoPago,
      searchTerm,
      tiendaId: tiendaIdFiltro,
      sortDirection = 'desc'
    } = filtros;

    const { negocioId, tiendaId } = userInfo;

    if (!negocioId) {
      console.warn("⚠️ negocioId no proporcionado");
      return [];
    }

    let queryText = `
      SELECT 
        p.id_pedido,
        p.codigo_pedido,
        p.fecha_pedido,
        p.sub_total,
        p.descuento,
        p.total,
        p.estado_pago,
        p.id_tienda,
        per.nombre || ' ' || per.apellido as cliente_nombre,
        COALESCE(SUM(v.monto_efectivo), 0) as monto_efectivo,
        COALESCE(SUM(v.monto_qr), 0) as monto_qr,
        COALESCE(
          (SELECT v2.metodo_pago 
           FROM venta v2 
           WHERE v2.id_pedido = p.id_pedido 
           ORDER BY v2.fecha_hora DESC 
           LIMIT 1),
          'efectivo'
        ) as metodo_pago,
        u.usuario
      FROM pedido p
      INNER JOIN persona per ON p.id_cliente = per.id_persona
      LEFT JOIN venta v ON p.id_pedido = v.id_pedido
      LEFT JOIN usuario u ON u.id_usuario = (
        SELECT v2.id_usuario 
        FROM venta v2 
        WHERE v2.id_pedido = p.id_pedido 
        ORDER BY v2.fecha_hora DESC 
        LIMIT 1
      )
      INNER JOIN tienda t ON p.id_tienda = t.id_tienda
      WHERE t.id_negocio = $1
    `;

    const params = [parseInt(negocioId)];
    let paramIndex = 2;

    if (tiendaId && tiendaId !== 'todas') {
      queryText += ` AND p.id_tienda = $${paramIndex}`;
      params.push(parseInt(tiendaId));
      paramIndex++;
    }

    if (tiendaIdFiltro && tiendaIdFiltro !== 'todas' && tiendaIdFiltro !== tiendaId) {
      queryText += ` AND p.id_tienda = $${paramIndex}`;
      params.push(parseInt(tiendaIdFiltro));
      paramIndex++;
    }

    if (searchTerm && searchTerm.trim() !== '') {
      const searchPattern = `%${searchTerm.trim()}%`;
      queryText += ` AND (
        p.codigo_pedido ILIKE $${paramIndex} OR 
        per.nombre ILIKE $${paramIndex} OR 
        per.apellido ILIKE $${paramIndex} OR
        u.usuario ILIKE $${paramIndex}
      )`;
      params.push(searchPattern);
      paramIndex++;
    }

    if (selectedMetodoPago && selectedMetodoPago !== 'all') {
      if (selectedMetodoPago === 'efectivo') {
        queryText += ` AND EXISTS (
          SELECT 1 FROM venta v2 
          WHERE v2.id_pedido = p.id_pedido 
          AND v2.monto_efectivo IS NOT NULL 
          AND v2.monto_efectivo > 0
        )`;
      } else if (selectedMetodoPago === 'qr') {
        queryText += ` AND EXISTS (
          SELECT 1 FROM venta v2 
          WHERE v2.id_pedido = p.id_pedido 
          AND v2.monto_qr IS NOT NULL 
          AND v2.monto_qr > 0
        )`;
      } else if (selectedMetodoPago === 'mixto') {
        queryText += ` AND EXISTS (
          SELECT 1 FROM venta v2 
          WHERE v2.id_pedido = p.id_pedido 
          AND v2.monto_efectivo IS NOT NULL 
          AND v2.monto_efectivo > 0 
          AND v2.monto_qr IS NOT NULL 
          AND v2.monto_qr > 0
        )`;
      }
    }

    const { dateCondition, params: dateParams, paramIndex: newParamIndex } = buildDateFilter(
      dateFilterType,
      specificDate,
      startDate,
      endDate,
      paramIndex
    );
    queryText += dateCondition;
    params.push(...dateParams);
    paramIndex = newParamIndex;

    queryText += ` GROUP BY p.id_pedido, p.codigo_pedido, p.fecha_pedido, p.sub_total, p.descuento, p.total, p.estado_pago, p.id_tienda, per.nombre, per.apellido, u.usuario`;
    queryText += ` ORDER BY p.fecha_pedido ${sortDirection === 'desc' ? 'DESC' : 'ASC'}`;

    const result = await query(queryText, params);

    if (result.rows.length === 0) {
      return [];
    }

    const ventas = result.rows.map(row => mapVentaToFrontend(row));

    for (let venta of ventas) {
      const lentesResult = await query(
        `
        SELECT 
          l.id_lente,
          l.tipo_lente,
          o.nombre_organico as organico,
          m.nombre_material as frame,
          m2.nombre_material as franela,
          m3.nombre_material as estuche,
          edl.total as total_lente
        FROM entrega_detalle_lente edl
        INNER JOIN lente l ON edl.id_lente = l.id_lente
        INNER JOIN entrega_pendiente ep ON edl.id_entrega_pendiente = ep.id_entrega_pendiente
        LEFT JOIN organico o ON l.id_organico = o.id_organico
        LEFT JOIN material m ON l.id_montura = m.id_material
        LEFT JOIN material m2 ON l.id_franela = m2.id_material
        LEFT JOIN material m3 ON l.id_estuche = m3.id_material
        WHERE ep.id_pedido = $1
        `,
        [parseInt(venta.id)]
      );

      venta.lentes = lentesResult.rows.map(l => ({
        id: l.id_lente?.toString(),
        tipo: l.tipo_lente || 'No especificado',
        organico: l.organico || 'Sin orgánico',
        frame: l.frame || '',
        franela: l.franela || '',
        estuche: l.estuche || '',
        total: parseFloat(l.total_lente || 0)
      }));

      const materialesResult = await query(
        `
        SELECT 
          m.nombre_material,
          edm.cantidad,
          edm.total as total_material
        FROM entrega_detalle_material edm
        INNER JOIN material m ON edm.id_material = m.id_material
        INNER JOIN entrega_pendiente ep ON edm.id_entrega_pendiente = ep.id_entrega_pendiente
        WHERE ep.id_pedido = $1
        `,
        [parseInt(venta.id)]
      );

      venta.productosAdicionales = materialesResult.rows.map(m => ({
        nombre: m.nombre_material,
        cantidad: m.cantidad || 1,
        total: parseFloat(m.total_material || 0)
      }));
    }

    return ventas;
  } catch (error) {
    console.error("Error en getVentas service:", error);
    throw new Error(error.message || "Error al obtener las ventas");
  }
};

// ============================================
// GET - OBTENER VENTA POR ID
// ============================================

const getVentaById = async (id, userInfo) => {
  try {
    const { negocioId } = userInfo;

    const idNum = parseInt(id);
    if (isNaN(idNum)) {
      return null;
    }

    if (!negocioId) {
      return null;
    }

    const result = await query(
      `
      SELECT 
        p.id_pedido,
        p.codigo_pedido,
        p.fecha_pedido,
        p.sub_total,
        p.descuento,
        p.total,
        p.estado_pago,
        p.id_tienda,
        per.nombre || ' ' || per.apellido as cliente_nombre,
        COALESCE(SUM(v.monto_efectivo), 0) as monto_efectivo,
        COALESCE(SUM(v.monto_qr), 0) as monto_qr,
        COALESCE(
          (SELECT v2.metodo_pago 
           FROM venta v2 
           WHERE v2.id_pedido = p.id_pedido 
           ORDER BY v2.fecha_hora DESC 
           LIMIT 1),
          'efectivo'
        ) as metodo_pago,
        u.usuario
      FROM pedido p
      INNER JOIN persona per ON p.id_cliente = per.id_persona
      LEFT JOIN venta v ON p.id_pedido = v.id_pedido
      LEFT JOIN usuario u ON u.id_usuario = (
        SELECT v2.id_usuario 
        FROM venta v2 
        WHERE v2.id_pedido = p.id_pedido 
        ORDER BY v2.fecha_hora DESC 
        LIMIT 1
      )
      INNER JOIN tienda t ON p.id_tienda = t.id_tienda
      WHERE p.id_pedido = $1 AND t.id_negocio = $2
      GROUP BY p.id_pedido, p.codigo_pedido, p.fecha_pedido, p.sub_total, p.descuento, p.total, p.estado_pago, p.id_tienda, per.nombre, per.apellido, u.usuario
      `,
      [idNum, parseInt(negocioId)]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    
    const venta = {
      id: row.id_pedido?.toString(),
      codigoVenta: row.codigo_pedido,
      fecha: row.fecha_pedido,
      usuario: row.usuario || 'Sistema',
      subtotal: parseFloat(row.sub_total || 0),
      descuento: parseFloat(row.descuento || 0),
      total: parseFloat(row.total || 0),
      metodoPago: row.metodo_pago || 'efectivo',
      clientName: row.cliente_nombre || 'Cliente',
      tiendaId: row.id_tienda?.toString(),
      pagoEfectivo: parseFloat(row.monto_efectivo || 0),
      pagoQR: parseFloat(row.monto_qr || 0),
      items: []
    };

    const entregaResult = await query(
      `SELECT id_entrega_pendiente FROM entrega_pendiente WHERE id_pedido = $1`,
      [idNum]
    );

    const idEntrega = entregaResult.rows.length > 0 ? entregaResult.rows[0].id_entrega_pendiente : null;

    let lentesQuery = `
      SELECT 
        l.id_lente,
        l.tipo_lente,
        o.nombre_organico as organico,
        m.nombre_material as frame,
        m2.nombre_material as franela,
        m3.nombre_material as estuche,
        edl.total as total_lente
      FROM lente l
      LEFT JOIN organico o ON l.id_organico = o.id_organico
      LEFT JOIN material m ON l.id_montura = m.id_material
      LEFT JOIN material m2 ON l.id_franela = m2.id_material
      LEFT JOIN material m3 ON l.id_estuche = m3.id_material
    `;

    let lentesParams = [];

    if (idEntrega) {
      lentesQuery += `
        INNER JOIN entrega_detalle_lente edl ON l.id_lente = edl.id_lente
        WHERE edl.id_entrega_pendiente = $1
      `;
      lentesParams = [idEntrega];
    } else {
      lentesQuery += `
        INNER JOIN entrega_detalle_lente edl ON l.id_lente = edl.id_lente
        INNER JOIN entrega_pendiente ep ON edl.id_entrega_pendiente = ep.id_entrega_pendiente
        WHERE ep.id_pedido = $1
      `;
      lentesParams = [idNum];
    }

    const lentesResult = await query(lentesQuery, lentesParams);

    lentesResult.rows.forEach((l) => {
      const grupo = `Lente ${l.tipo_lente || 'No especificado'}`;
      const totalLente = parseFloat(l.total_lente || 0);
      
      if (l.frame) {
        venta.items.push({
          nombre: `Montura: ${l.frame}`,
          cantidad: 1,
          precioUnitario: 0,
          subtotal: 0,
          esLente: true,
          grupo: grupo
        });
      }
      
      if (l.organico) {
        venta.items.push({
          nombre: `Orgánico: ${l.organico}`,
          cantidad: 1,
          precioUnitario: 0,
          subtotal: 0,
          esLente: true,
          grupo: grupo
        });
      }
      
      if (l.franela) {
        venta.items.push({
          nombre: `Franela: ${l.franela}`,
          cantidad: 1,
          precioUnitario: 0,
          subtotal: 0,
          esLente: true,
          grupo: grupo
        });
      }
      
      if (l.estuche) {
        venta.items.push({
          nombre: `Estuche: ${l.estuche}`,
          cantidad: 1,
          precioUnitario: 0,
          subtotal: 0,
          esLente: true,
          grupo: grupo
        });
      }

      if (totalLente > 0) {
        venta.items.push({
          nombre: `Total Lente`,
          cantidad: 1,
          precioUnitario: totalLente,
          subtotal: totalLente,
          esLente: true,
          grupo: grupo,
          esTotal: true
        });
      }
    });

    let materialesQuery = `
      SELECT 
        m.nombre_material,
        edm.cantidad,
        edm.total as total_material
      FROM entrega_detalle_material edm
      INNER JOIN material m ON edm.id_material = m.id_material
    `;

    let materialesParams = [];

    if (idEntrega) {
      materialesQuery += ` WHERE edm.id_entrega_pendiente = $1`;
      materialesParams = [idEntrega];
    } else {
      materialesQuery += `
        INNER JOIN entrega_pendiente ep ON edm.id_entrega_pendiente = ep.id_entrega_pendiente
        WHERE ep.id_pedido = $1
      `;
      materialesParams = [idNum];
    }

    const materialesResult = await query(materialesQuery, materialesParams);

    materialesResult.rows.forEach(m => {
      const totalMaterial = parseFloat(m.total_material || 0);
      const cantidad = parseInt(m.cantidad || 1);
      
      venta.items.push({
        nombre: m.nombre_material,
        cantidad: cantidad,
        precioUnitario: cantidad > 0 ? totalMaterial / cantidad : 0,
        subtotal: totalMaterial,
        esLente: false,
        grupo: 'Productos Adicionales'
      });
    });

    return venta;
  } catch (error) {
    console.error("Error en getVentaById service:", error);
    return null;
  }
};

// ============================================
// GET - OBTENER VENTAS POR CÓDIGO
// ============================================

const getVentasByCodigo = async (codigoVenta, userInfo) => {
  try {
    const { negocioId, tiendaId } = userInfo;

    if (!negocioId) {
      return [];
    }

    let queryText = `
      SELECT 
        p.id_pedido,
        p.codigo_pedido,
        p.fecha_pedido,
        p.sub_total,
        p.descuento,
        p.total,
        p.estado_pago,
        p.id_tienda,
        per.nombre || ' ' || per.apellido as cliente_nombre,
        COALESCE(SUM(v.monto_efectivo), 0) as monto_efectivo,
        COALESCE(SUM(v.monto_qr), 0) as monto_qr,
        COALESCE(
          (SELECT v2.metodo_pago 
           FROM venta v2 
           WHERE v2.id_pedido = p.id_pedido 
           ORDER BY v2.fecha_hora DESC 
           LIMIT 1),
          'efectivo'
        ) as metodo_pago,
        u.usuario
      FROM pedido p
      INNER JOIN persona per ON p.id_cliente = per.id_persona
      LEFT JOIN venta v ON p.id_pedido = v.id_pedido
      LEFT JOIN usuario u ON u.id_usuario = (
        SELECT v2.id_usuario 
        FROM venta v2 
        WHERE v2.id_pedido = p.id_pedido 
        ORDER BY v2.fecha_hora DESC 
        LIMIT 1
      )
      INNER JOIN tienda t ON p.id_tienda = t.id_tienda
      WHERE p.codigo_pedido ILIKE $1 AND t.id_negocio = $2
      GROUP BY p.id_pedido, p.codigo_pedido, p.fecha_pedido, p.sub_total, p.descuento, p.total, p.estado_pago, p.id_tienda, per.nombre, per.apellido, u.usuario
    `;

    const params = [`%${codigoVenta}%`, parseInt(negocioId)];
    let paramIndex = 3;

    if (tiendaId && tiendaId !== 'todas') {
      queryText += ` AND p.id_tienda = $${paramIndex}`;
      params.push(parseInt(tiendaId));
      paramIndex++;
    }

    queryText += ` ORDER BY p.fecha_pedido DESC`;

    const result = await query(queryText, params);

    return result.rows.map(row => mapVentaToFrontend(row));
  } catch (error) {
    console.error("Error en getVentasByCodigo service:", error);
    return [];
  }
};

// ============================================
// GET - OBTENER VENTAS POR CLIENTE
// ============================================

const getVentasByCliente = async (clientName, userInfo) => {
  try {
    const { negocioId, tiendaId } = userInfo;

    if (!negocioId) {
      return [];
    }

    let queryText = `
      SELECT 
        p.id_pedido,
        p.codigo_pedido,
        p.fecha_pedido,
        p.sub_total,
        p.descuento,
        p.total,
        p.estado_pago,
        p.id_tienda,
        per.nombre || ' ' || per.apellido as cliente_nombre,
        COALESCE(SUM(v.monto_efectivo), 0) as monto_efectivo,
        COALESCE(SUM(v.monto_qr), 0) as monto_qr,
        COALESCE(
          (SELECT v2.metodo_pago 
           FROM venta v2 
           WHERE v2.id_pedido = p.id_pedido 
           ORDER BY v2.fecha_hora DESC 
           LIMIT 1),
          'efectivo'
        ) as metodo_pago,
        u.usuario
      FROM pedido p
      INNER JOIN persona per ON p.id_cliente = per.id_persona
      LEFT JOIN venta v ON p.id_pedido = v.id_pedido
      LEFT JOIN usuario u ON u.id_usuario = (
        SELECT v2.id_usuario 
        FROM venta v2 
        WHERE v2.id_pedido = p.id_pedido 
        ORDER BY v2.fecha_hora DESC 
        LIMIT 1
      )
      INNER JOIN tienda t ON p.id_tienda = t.id_tienda
      WHERE (per.nombre ILIKE $1 OR per.apellido ILIKE $1) AND t.id_negocio = $2
      GROUP BY p.id_pedido, p.codigo_pedido, p.fecha_pedido, p.sub_total, p.descuento, p.total, p.estado_pago, p.id_tienda, per.nombre, per.apellido, u.usuario
    `;

    const params = [`%${clientName}%`, parseInt(negocioId)];
    let paramIndex = 3;

    if (tiendaId && tiendaId !== 'todas') {
      queryText += ` AND p.id_tienda = $${paramIndex}`;
      params.push(parseInt(tiendaId));
      paramIndex++;
    }

    queryText += ` ORDER BY p.fecha_pedido DESC`;

    const result = await query(queryText, params);

    return result.rows.map(row => mapVentaToFrontend(row));
  } catch (error) {
    console.error("Error en getVentasByCliente service:", error);
    return [];
  }
};

// ============================================
// GET - RESUMEN DE VENTAS
// ============================================

const getResumenVentas = async (filtros, userInfo) => {
  try {
    const ventas = await getVentas(filtros, userInfo);

    const resumen = ventas.reduce((acc, v) => {
      acc.totalEfectivo += v.pagoEfectivo || 0;
      acc.totalQR += v.pagoQR || 0;
      acc.totalVentas += v.total || 0;
      if (v.metodoPago === 'mixto') {
        acc.totalMixto += v.total || 0;
      }
      return acc;
    }, { totalVentas: 0, totalEfectivo: 0, totalQR: 0, totalMixto: 0 });

    return {
      ...resumen,
      cantidadVentas: ventas.length
    };
  } catch (error) {
    console.error("Error en getResumenVentas service:", error);
    return {
      totalVentas: 0,
      totalEfectivo: 0,
      totalQR: 0,
      totalMixto: 0,
      cantidadVentas: 0
    };
  }
};

// ============================================
// GET - RESUMEN POR CLIENTE
// ============================================

const getResumenClientes = async (filtros, userInfo) => {
  try {
    const { negocioId, tiendaId } = userInfo;
    const { tipoFiltro = 'todos' } = filtros;

    if (!negocioId) {
      return [];
    }

    let queryText = `
      SELECT 
        per.nombre || ' ' || per.apellido as nombre,
        COALESCE(SUM(v.monto_efectivo), 0) as total_efectivo,
        COALESCE(SUM(v.monto_qr), 0) as total_qr,
        COALESCE(SUM(p.total), 0) as total_general,
        COUNT(DISTINCT p.id_pedido) as total_ventas
      FROM pedido p
      INNER JOIN persona per ON p.id_cliente = per.id_persona
      LEFT JOIN venta v ON p.id_pedido = v.id_pedido
      INNER JOIN tienda t ON p.id_tienda = t.id_tienda
      WHERE t.id_negocio = $1
    `;

    const params = [parseInt(negocioId)];
    let paramIndex = 2;

    if (tiendaId && tiendaId !== 'todas') {
      queryText += ` AND p.id_tienda = $${paramIndex}`;
      params.push(parseInt(tiendaId));
      paramIndex++;
    }

    if (filtros.searchTerm && filtros.searchTerm.trim() !== '') {
      const searchPattern = `%${filtros.searchTerm.trim()}%`;
      queryText += ` AND (per.nombre ILIKE $${paramIndex} OR per.apellido ILIKE $${paramIndex})`;
      params.push(searchPattern);
      paramIndex++;
    }

    const { dateCondition, params: dateParams, paramIndex: newParamIndex } = buildDateFilter(
      filtros.dateFilterType,
      filtros.specificDate,
      filtros.startDate,
      filtros.endDate,
      paramIndex
    );
    queryText += dateCondition;
    params.push(...dateParams);
    paramIndex = newParamIndex;

    queryText += ` GROUP BY per.id_persona, per.nombre, per.apellido ORDER BY total_general DESC`;

    const result = await query(queryText, params);

    let clientes = result.rows.map(row => ({
      nombre: row.nombre,
      totalEfectivo: parseFloat(row.total_efectivo || 0),
      totalQR: parseFloat(row.total_qr || 0),
      totalMixto: 0,
      totalGeneral: parseFloat(row.total_general || 0)
    }));

    clientes = clientes.map(c => ({
      ...c,
      totalMixto: (c.totalEfectivo > 0 && c.totalQR > 0) ? c.totalGeneral : 0
    }));

    if (tipoFiltro === 'efectivo') {
      clientes = clientes.filter(c => c.totalEfectivo > 0);
    } else if (tipoFiltro === 'qr') {
      clientes = clientes.filter(c => c.totalQR > 0);
    } else if (tipoFiltro === 'mixto') {
      clientes = clientes.filter(c => c.totalEfectivo > 0 && c.totalQR > 0);
    }

    return clientes;
  } catch (error) {
    console.error("Error en getResumenClientes service:", error);
    return [];
  }
};

// ============================================
// GET - ESTADÍSTICAS RÁPIDAS
// ============================================

const getEstadisticasRapidas = async (tiendaIdFiltro, userInfo) => {
  try {
    const { negocioId, tiendaId } = userInfo;

    if (!negocioId) {
      return {
        totalVentasHoy: 0,
        totalVentasMes: 0,
        promedioVenta: 0,
        cantidadVentasHoy: 0
      };
    }

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    let queryText = `
      SELECT 
        COUNT(*) as total_ventas,
        COALESCE(SUM(total), 0) as total_monto
      FROM pedido p
      INNER JOIN tienda t ON p.id_tienda = t.id_tienda
      WHERE t.id_negocio = $1 AND p.fecha_pedido >= $2
    `;

    const params = [parseInt(negocioId), startOfMonth.toISOString()];
    let paramIndex = 3;

    const tiendaEfectiva = tiendaIdFiltro && tiendaIdFiltro !== 'todas' ? tiendaIdFiltro : tiendaId;
    if (tiendaEfectiva && tiendaEfectiva !== 'todas') {
      queryText += ` AND p.id_tienda = $${paramIndex}`;
      params.push(parseInt(tiendaEfectiva));
      paramIndex++;
    }

    const mesResult = await query(queryText, params);
    const totalMes = parseFloat(mesResult.rows[0]?.total_monto || 0);
    const cantidadMes = parseInt(mesResult.rows[0]?.total_ventas || 0);

    let hoyQuery = `
      SELECT 
        COUNT(*) as total_ventas,
        COALESCE(SUM(total), 0) as total_monto
      FROM pedido p
      INNER JOIN tienda t ON p.id_tienda = t.id_tienda
      WHERE t.id_negocio = $1 AND p.fecha_pedido >= $2 AND p.fecha_pedido < $3
    `;

    const hoyParams = [parseInt(negocioId), today.toISOString(), new Date(today.getTime() + 86400000).toISOString()];
    let hoyIndex = 4;

    if (tiendaEfectiva && tiendaEfectiva !== 'todas') {
      hoyQuery += ` AND p.id_tienda = $${hoyIndex}`;
      hoyParams.push(parseInt(tiendaEfectiva));
    }

    const hoyResult = await query(hoyQuery, hoyParams);
    const totalHoy = parseFloat(hoyResult.rows[0]?.total_monto || 0);
    const cantidadHoy = parseInt(hoyResult.rows[0]?.total_ventas || 0);

    const promedio = cantidadMes > 0 ? totalMes / cantidadMes : 0;

    return {
      totalVentasHoy: totalHoy,
      totalVentasMes: totalMes,
      promedioVenta: promedio,
      cantidadVentasHoy: cantidadHoy
    };
  } catch (error) {
    console.error("Error en getEstadisticasRapidas service:", error);
    return {
      totalVentasHoy: 0,
      totalVentasMes: 0,
      promedioVenta: 0,
      cantidadVentasHoy: 0
    };
  }
};

// ============================================
// GET - TIENDAS DISPONIBLES
// ============================================

const getTiendas = async (negocioId) => {
  try {
    if (!negocioId) {
      return [];
    }

    const result = await query(
      `
      SELECT 
        id_tienda as id,
        nombre_tienda as nombre
      FROM tienda
      WHERE id_negocio = $1 AND estado = 'activo'
      ORDER BY nombre_tienda
      `,
      [parseInt(negocioId)]
    );

    return result.rows.map(row => ({
      id: row.id.toString(),
      nombre: row.nombre
    }));
  } catch (error) {
    console.error("Error en getTiendas service:", error);
    return [];
  }
};

// ============================================
// GET - MÉTODOS DE PAGO DISPONIBLES
// ============================================

const getMetodosPago = async () => {
  try {
    return ["all", "efectivo", "qr", "mixto"];
  } catch (error) {
    console.error("Error en getMetodosPago service:", error);
    return ["all"];
  }
};

// ============================================
// GET - TIPOS DE FILTRO DE FECHA
// ============================================

const getTiposFiltroFecha = async () => {
  try {
    return ["all", "today", "yesterday", "thisWeek", "lastWeek", "thisMonth", "lastMonth", "specific", "range"];
  } catch (error) {
    console.error("Error en getTiposFiltroFecha service:", error);
    return ["all"];
  }
};

// ============================================
// DELETE - ANULAR VENTA (CON CAJA CORREGIDO)
// ============================================

const anularVenta = async (id, userInfo) => {
  const { negocioId, tiendaId, userId, username } = userInfo;

  console.log("🔍 anularVenta service - id:", id, "userInfo:", userInfo);

  const idNum = parseInt(id);
  if (isNaN(idNum)) {
    throw new Error("ID de venta inválido");
  }

  if (!negocioId) {
    throw new Error("Negocio ID es requerido");
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. VERIFICAR QUE EL PEDIDO EXISTA Y PERTENEZCA AL NEGOCIO
    const pedidoResult = await client.query(
      `
      SELECT 
        p.id_pedido, 
        p.id_tienda, 
        p.total,
        p.sub_total,
        p.descuento,
        p.id_cliente,
        p.codigo_pedido
      FROM pedido p
      INNER JOIN tienda t ON p.id_tienda = t.id_tienda
      WHERE p.id_pedido = $1 AND t.id_negocio = $2
      `,
      [idNum, parseInt(negocioId)]
    );

    if (pedidoResult.rows.length === 0) {
      throw new Error("Pedido no encontrado o no pertenece al negocio");
    }

    const pedido = pedidoResult.rows[0];
    const tiendaIdPedido = pedido.id_tienda;

    // 2. OBTENER LA ENTREGA PENDIENTE
    const entregaResult = await client.query(
      `
      SELECT id_entrega_pendiente 
      FROM entrega_pendiente 
      WHERE id_pedido = $1
      `,
      [idNum]
    );

    const idEntrega = entregaResult.rows.length > 0 ? entregaResult.rows[0].id_entrega_pendiente : null;

    // 3. OBTENER Y REINGRESAR STOCK DE MATERIALES DE LA ENTREGA
    if (idEntrega) {
      const materialesEntrega = await client.query(
        `
        SELECT 
          edm.id_material,
          edm.cantidad,
          mt.id_material_tienda
        FROM entrega_detalle_material edm
        INNER JOIN material_tienda mt ON mt.id_material = edm.id_material AND mt.id_tienda = $1
        WHERE edm.id_entrega_pendiente = $2
        `,
        [tiendaIdPedido, idEntrega]
      );

      for (const mat of materialesEntrega.rows) {
        if (mat.id_material_tienda) {
          const stockAntes = await client.query(
            `SELECT stock FROM material_tienda WHERE id_material_tienda = $1`,
            [mat.id_material_tienda]
          );

          const stockAnterior = stockAntes.rows[0]?.stock || 0;

          await client.query(
            `
            UPDATE material_tienda 
            SET stock = stock + $1 
            WHERE id_material_tienda = $2
            `,
            [mat.cantidad, mat.id_material_tienda]
          );

          await client.query(
            `
            INSERT INTO movimientos_stock (
              id_material_tienda,
              id_usuario,
              cantidad_anterior,
              cantidad_nueva,
              cantidad_modificada,
              fecha_movimiento
            )
            VALUES ($1, $2, $3, $4, $5, TIMEZONE('America/La_Paz', NOW()))
            `,
            [mat.id_material_tienda, userId, stockAnterior, stockAnterior + mat.cantidad, mat.cantidad]
          );
        }
      }

      // 4. ELIMINAR DETALLES DE LENTES
      await client.query(
        `DELETE FROM entrega_detalle_lente WHERE id_entrega_pendiente = $1`,
        [idEntrega]
      );

      // 5. ELIMINAR DETALLES DE MATERIALES
      await client.query(
        `DELETE FROM entrega_detalle_material WHERE id_entrega_pendiente = $1`,
        [idEntrega]
      );

      // 6. ELIMINAR LA ENTREGA PENDIENTE
      await client.query(
        `DELETE FROM entrega_pendiente WHERE id_entrega_pendiente = $1`,
        [idEntrega]
      );
    }

    // 7. OBTENER LA CAJA DE LA TIENDA
    const cajaResult = await client.query(
      `
      SELECT id_caja, total 
      FROM caja 
      WHERE id_tienda = $1
      `,
      [tiendaIdPedido]
    );

    if (cajaResult.rows.length === 0) {
      throw new Error("No se encontró la caja de la tienda");
    }

    const caja = cajaResult.rows[0];
    const idCaja = caja.id_caja;

    // 8. OBTENER EL TOTAL DE EFECTIVO PAGADO EN LA VENTA
    const pagosResult = await client.query(
      `
      SELECT 
        COALESCE(SUM(monto_efectivo), 0) as total_efectivo,
        COALESCE(SUM(monto_qr), 0) as total_qr
      FROM venta
      WHERE id_pedido = $1
      `,
      [idNum]
    );

    const totalEfectivoVenta = parseFloat(pagosResult.rows[0]?.total_efectivo || 0);
    const totalQRVenta = parseFloat(pagosResult.rows[0]?.total_qr || 0);

    console.log(`💰 Total efectivo a reembolsar: ${totalEfectivoVenta} Bs`);
    console.log(`💰 Total QR a reembolsar: ${totalQRVenta} Bs`);

    // 9. ELIMINAR LAS TRANSACCIONES DE CAJA RELACIONADAS CON ESTA VENTA
    // Primero obtenemos las transacciones para saber cuánto se registró
    const transaccionesResult = await client.query(
      `
      SELECT 
        id_transaccion_caja,
        monto,
        tipo_movimiento,
        monto_nuevo,
        monto_anterior
      FROM transaccion_caja
      WHERE id_venta = $1 AND id_caja = $2
      ORDER BY fecha DESC
      `,
      [pedido.codigo_pedido, idCaja]
    );

    console.log(`📊 Encontradas ${transaccionesResult.rows.length} transacciones de caja para eliminar`);

    // Si hay efectivo que devolver, restar de la caja
    if (totalEfectivoVenta > 0) {
      // Obtener el total actual de la caja
      const cajaActual = await client.query(
        `SELECT total FROM caja WHERE id_caja = $1`,
        [idCaja]
      );

      const totalActual = parseFloat(cajaActual.rows[0]?.total || 0);
      
      // Calcular el nuevo total restando el efectivo que se devuelve
      const nuevoTotal = Math.max(0, totalActual - totalEfectivoVenta);

      console.log(`💰 Caja: total actual ${totalActual} Bs, restando ${totalEfectivoVenta} Bs = ${nuevoTotal} Bs`);

      // Actualizar el total de la caja
      await client.query(
        `
        UPDATE caja 
        SET total = $1 
        WHERE id_caja = $2
        `,
        [nuevoTotal, idCaja]
      );

      // Registrar el egreso por anulación (movimiento de reversión)
      await client.query(
        `
        INSERT INTO transaccion_caja (
          id_caja,
          id_usuario,
          monto_nuevo,
          monto_anterior,
          monto,
          tipo_movimiento,
          descripcion,
          id_venta,
          fecha
        )
        VALUES (
          $1, 
          $2, 
          $3,
          $4,
          $5,
          'egreso',
          $6,
          $7,
          TIMEZONE('America/La_Paz', NOW())
        )
        `,
        [
          idCaja,
          userId,
          nuevoTotal,
          totalActual,
          totalEfectivoVenta,
          `ANULACIÓN - Devolución efectivo Venta ${pedido.codigo_pedido}`,
          pedido.codigo_pedido
        ]
      );

      console.log(`✅ Registrado egreso de ${totalEfectivoVenta} Bs por anulación`);
    }

    // 10. ELIMINAR LAS TRANSACCIONES ORIGINALES DE CAJA (las que se crearon al pagar)
    if (transaccionesResult.rows.length > 0) {
      await client.query(
        `DELETE FROM transaccion_caja WHERE id_venta = $1 AND id_caja = $2`,
        [pedido.codigo_pedido, idCaja]
      );
      console.log(`✅ Eliminadas ${transaccionesResult.rows.length} transacciones de caja originales`);
    }

    // 11. ELIMINAR REGISTROS DE VENTA
    await client.query(
      `DELETE FROM venta WHERE id_pedido = $1`,
      [idNum]
    );

    // 12. ELIMINAR PAGO PENDIENTE
    await client.query(
      `DELETE FROM pago_pendiente WHERE id_pedido = $1`,
      [idNum]
    );

    // 13. ELIMINAR EL PEDIDO
    await client.query(
      `DELETE FROM pedido WHERE id_pedido = $1`,
      [idNum]
    );

    await client.query('COMMIT');

    console.log(`✅ Venta ${pedido.codigo_pedido} anulada correctamente por ${username}`);
    console.log(`💰 Efectivo devuelto: ${totalEfectivoVenta} Bs`);
    console.log(`💰 QR devuelto: ${totalQRVenta} Bs (no afecta caja)`);

    return {
      success: true,
      message: `Venta ${pedido.codigo_pedido} anulada correctamente`,
      codigoVenta: pedido.codigo_pedido,
      efectivoDevuelto: totalEfectivoVenta,
      qrDevuelto: totalQRVenta
    };

  } catch (error) {
    await client.query('ROLLBACK');
    console.error("❌ Error en anularVenta service:", error);
    throw new Error(error.message || "Error al anular la venta");
  } finally {
    client.release();
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
  getTiposFiltroFecha,
  anularVenta
};