// src/services/HistorialVentasService.js
const { query } = require("../../db");

// ============================================
// FUNCIONES DE UTILIDAD PARA FILTROS DE FECHA
// ============================================

const buildDateFilter = (dateFilterType, specificDate, startDate, endDate) => {
  let dateCondition = "";
  const params = [];
  let paramIndex = 1;

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

    console.log("🔍 getVentas service - negocioId:", negocioId, "tiendaId:", tiendaId);
    console.log("🔍 getVentas service - filtros:", filtros);

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
        COALESCE(v.monto_efectivo, 0) as monto_efectivo,
        COALESCE(v.monto_qr, 0) as monto_qr,
        u.usuario,
        v.metodo_pago
      FROM pedido p
      INNER JOIN persona per ON p.id_cliente = per.id_persona
      LEFT JOIN venta v ON p.id_pedido = v.id_pedido
      LEFT JOIN usuario u ON v.id_usuario = u.id_usuario
      INNER JOIN tienda t ON p.id_tienda = t.id_tienda
      WHERE t.id_negocio = $1
    `;

    const params = [parseInt(negocioId)];
    let paramIndex = 2;

    // Si el usuario tiene una tienda específica, filtrar por ella
    if (tiendaId && tiendaId !== 'todas') {
      queryText += ` AND p.id_tienda = $${paramIndex}`;
      params.push(parseInt(tiendaId));
      paramIndex++;
    }

    // Si el frontend envía un filtro de tienda específico (para administradores)
    if (tiendaIdFiltro && tiendaIdFiltro !== 'todas' && tiendaIdFiltro !== tiendaId) {
      queryText += ` AND p.id_tienda = $${paramIndex}`;
      params.push(parseInt(tiendaIdFiltro));
      paramIndex++;
    }

    // Filtro por búsqueda (backend)
    if (searchTerm) {
      queryText += ` AND (
        p.codigo_pedido ILIKE $${paramIndex} OR 
        per.nombre ILIKE $${paramIndex} OR 
        per.apellido ILIKE $${paramIndex} OR
        u.usuario ILIKE $${paramIndex}
      )`;
      params.push(`%${searchTerm}%`);
      paramIndex++;
    }

    // Filtro por método de pago
    if (selectedMetodoPago && selectedMetodoPago !== 'all') {
      if (selectedMetodoPago === 'efectivo') {
        queryText += ` AND COALESCE(v.monto_efectivo, 0) > 0`;
      } else if (selectedMetodoPago === 'qr') {
        queryText += ` AND COALESCE(v.monto_qr, 0) > 0`;
      } else if (selectedMetodoPago === 'mixto') {
        queryText += ` AND COALESCE(v.monto_efectivo, 0) > 0 AND COALESCE(v.monto_qr, 0) > 0`;
      }
    }

    // Filtro por fecha
    const { dateCondition, params: dateParams } = buildDateFilter(
      dateFilterType,
      specificDate,
      startDate,
      endDate
    );
    queryText += dateCondition;
    params.push(...dateParams);

    // Ordenamiento
    queryText += ` ORDER BY p.fecha_pedido ${sortDirection === 'desc' ? 'DESC' : 'ASC'}`;

    console.log("📝 Query:", queryText);
    console.log("📦 Params:", params);

    const result = await query(queryText, params);

    if (result.rows.length === 0) {
      return [];
    }

    const ventas = result.rows.map(row => mapVentaToFrontend(row));

    for (let venta of ventas) {
      // Obtener lentes del pedido con sus totales
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

      // Obtener productos adicionales (materiales) con sus totales
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
// GET - OBTENER VENTA POR ID (DETALLE COMPLETO)
// ============================================

const getVentaById = async (id, userInfo) => {
  try {
    console.log("🔍 getVentaById service - id:", id, "userInfo:", userInfo);

    const { negocioId, tiendaId } = userInfo;

    const idNum = parseInt(id);
    if (isNaN(idNum)) {
      console.log("❌ ID inválido:", id);
      return null;
    }

    if (!negocioId) {
      console.warn("⚠️ negocioId no proporcionado");
      return null;
    }

    // 1. Obtener datos de la venta verificando que pertenezca al negocio
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
        COALESCE(v.monto_efectivo, 0) as monto_efectivo,
        COALESCE(v.monto_qr, 0) as monto_qr,
        u.usuario,
        v.metodo_pago
      FROM pedido p
      INNER JOIN persona per ON p.id_cliente = per.id_persona
      LEFT JOIN venta v ON p.id_pedido = v.id_pedido
      LEFT JOIN usuario u ON v.id_usuario = u.id_usuario
      INNER JOIN tienda t ON p.id_tienda = t.id_tienda
      WHERE p.id_pedido = $1 AND t.id_negocio = $2
      `,
      [idNum, parseInt(negocioId)]
    );

    if (result.rows.length === 0) {
      console.log("❌ Venta no encontrada o no pertenece al negocio:", idNum);
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

    // 2. Obtener la entrega_pendiente
    const entregaResult = await query(
      `
      SELECT id_entrega_pendiente 
      FROM entrega_pendiente 
      WHERE id_pedido = $1
      `,
      [idNum]
    );

    const idEntrega = entregaResult.rows.length > 0 ? entregaResult.rows[0].id_entrega_pendiente : null;

    // 3. Obtener lentes con sus totales
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

    // 4. Construir items (lentes)
    let lenteIndex = 0;
    lentesResult.rows.forEach((l) => {
      lenteIndex++;
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

      // Agregar el total del lente como un item al final del grupo
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

    // 5. Obtener productos adicionales (materiales) con sus totales
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

    // Agregar materiales como items
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

    console.log("✅ Items finales:", venta.items.length);

    return venta;
  } catch (error) {
    console.error("❌ Error en getVentaById service:", error);
    return null;
  }
};

// ============================================
// GET - OBTENER VENTAS POR CÓDIGO
// ============================================

const getVentasByCodigo = async (codigoVenta, userInfo) => {
  try {
    console.log("🔍 getVentasByCodigo service - codigoVenta:", codigoVenta);

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
        COALESCE(v.monto_efectivo, 0) as monto_efectivo,
        COALESCE(v.monto_qr, 0) as monto_qr,
        u.usuario,
        v.metodo_pago
      FROM pedido p
      INNER JOIN persona per ON p.id_cliente = per.id_persona
      LEFT JOIN venta v ON p.id_pedido = v.id_pedido
      LEFT JOIN usuario u ON v.id_usuario = u.id_usuario
      INNER JOIN tienda t ON p.id_tienda = t.id_tienda
      WHERE p.codigo_pedido ILIKE $1 AND t.id_negocio = $2
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
    console.log("🔍 getVentasByCliente service - clientName:", clientName);

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
        COALESCE(v.monto_efectivo, 0) as monto_efectivo,
        COALESCE(v.monto_qr, 0) as monto_qr,
        u.usuario,
        v.metodo_pago
      FROM pedido p
      INNER JOIN persona per ON p.id_cliente = per.id_persona
      LEFT JOIN venta v ON p.id_pedido = v.id_pedido
      LEFT JOIN usuario u ON v.id_usuario = u.id_usuario
      INNER JOIN tienda t ON p.id_tienda = t.id_tienda
      WHERE (per.nombre ILIKE $1 OR per.apellido ILIKE $1) AND t.id_negocio = $2
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
    console.log("🔍 getResumenVentas service - filtros:", filtros);

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
    console.log("🔍 getResumenClientes service - filtros:", filtros);

    const { negocioId, tiendaId } = userInfo;
    const { tipoFiltro = 'todos' } = filtros;

    if (!negocioId) {
      console.warn("⚠️ negocioId no proporcionado");
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

    if (filtros.searchTerm) {
      queryText += ` AND (per.nombre ILIKE $${paramIndex} OR per.apellido ILIKE $${paramIndex})`;
      params.push(`%${filtros.searchTerm}%`);
      paramIndex++;
    }

    const { dateCondition, params: dateParams } = buildDateFilter(
      filtros.dateFilterType,
      filtros.specificDate,
      filtros.startDate,
      filtros.endDate
    );
    queryText += dateCondition;
    params.push(...dateParams);

    queryText += ` GROUP BY per.id_persona, per.nombre, per.apellido ORDER BY total_general DESC`;

    console.log("📝 Query resumen clientes:", queryText);
    console.log("📦 Params:", params);

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
    console.log("🔍 getEstadisticasRapidas service - tiendaIdFiltro:", tiendaIdFiltro);

    const { negocioId, tiendaId } = userInfo;

    if (!negocioId) {
      console.warn("⚠️ negocioId no proporcionado");
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

    // Si el usuario tiene una tienda específica, filtrar por ella
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
// GET - TIENDAS DISPONIBLES (SOLO DEL NEGOCIO)
// ============================================

const getTiendas = async (negocioId) => {
  try {
    console.log("🔍 getTiendas service - negocioId:", negocioId);

    if (!negocioId) {
      console.warn("⚠️ negocioId no proporcionado, retornando array vacío");
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

    console.log("📊 Tiendas encontradas:", result.rows.length);

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
    console.log("🔍 getMetodosPago service");
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
    console.log("🔍 getTiposFiltroFecha service");
    return ["all", "today", "yesterday", "thisWeek", "lastWeek", "thisMonth", "lastMonth", "specific", "range"];
  } catch (error) {
    console.error("Error en getTiposFiltroFecha service:", error);
    return ["all"];
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