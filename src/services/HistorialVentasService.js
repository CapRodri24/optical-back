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

const getVentas = async (filtros) => {
  try {
    const {
      dateFilterType,
      specificDate,
      startDate,
      endDate,
      selectedMetodoPago,
      searchTerm,
      tiendaId,
      sortDirection = 'desc'
    } = filtros;

    console.log("🔍 getVentas service - filtros:", filtros);

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
      WHERE 1=1
    `;

    const params = [];
    let paramIndex = 1;

    // Filtro por tienda
    if (tiendaId) {
      queryText += ` AND p.id_tienda = $${paramIndex}`;
      params.push(parseInt(tiendaId));
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

    // Mapear resultados al formato del frontend
    const ventas = result.rows.map(row => mapVentaToFrontend(row));

    // Obtener lentes y productos adicionales para cada venta
    for (let venta of ventas) {
      // Obtener lentes del pedido
      const lentesResult = await query(
        `
        SELECT 
          l.id_lente,
          l.tipo_lente,
          o.nombre_organico as material,
          m.nombre_material as frame,
          m2.nombre_material as franela,
          m3.nombre_material as estuche
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
        material: l.material || 'Sin material',
        precioMaterial: 0,
        frame: l.frame || '',
        precioFrame: 0,
        franela: l.franela || '',
        precioFranela: 0,
        estuche: l.estuche || '',
        precioEstuche: 0,
        total: 0
      }));

      // Obtener productos adicionales (materiales)
      const materialesResult = await query(
        `
        SELECT 
          m.nombre_material,
          edm.cantidad
        FROM entrega_detalle_material edm
        INNER JOIN material m ON edm.id_material = m.id_material
        INNER JOIN entrega_pendiente ep ON edm.id_entrega_pendiente = ep.id_entrega_pendiente
        WHERE ep.id_pedido = $1
        `,
        [parseInt(venta.id)]
      );

      venta.productosAdicionales = materialesResult.rows.map(m => ({
        nombre: m.nombre_material,
        precio: 0,
        cantidad: m.cantidad || 1
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

const getVentaById = async (id) => {
  try {
    console.log("🔍 getVentaById service - id:", id);

    const idNum = parseInt(id);
    if (isNaN(idNum)) {
      console.log("❌ ID inválido:", id);
      return null;
    }

    // 1. Obtener datos de la venta
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
      WHERE p.id_pedido = $1
      `,
      [idNum]
    );

    console.log("📊 Resultado venta:", result.rows.length > 0 ? result.rows[0] : "No encontrado");

    if (result.rows.length === 0) {
      console.log("❌ Venta no encontrada para ID:", idNum);
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

    console.log("📦 Venta base:", venta);

    // 2. Primero obtener la entrega_pendiente para este pedido
    const entregaResult = await query(
      `
      SELECT id_entrega_pendiente 
      FROM entrega_pendiente 
      WHERE id_pedido = $1
      `,
      [idNum]
    );

    console.log("📊 Entrega encontrada:", entregaResult.rows);

    if (entregaResult.rows.length === 0) {
      console.log("⚠️ No se encontró entrega_pendiente para el pedido:", idNum);
      // Si no hay entrega, intentar obtener lentes directamente del pedido
      // (Esto puede pasar si la venta no tiene entrega asociada)
    }

    const idEntrega = entregaResult.rows.length > 0 ? entregaResult.rows[0].id_entrega_pendiente : null;

    // 3. Obtener lentes del pedido a través de entrega_detalle_lente
    let lentesQuery = `
      SELECT 
        l.id_lente,
        l.tipo_lente,
        o.nombre_organico as material,
        m.nombre_material as frame,
        m2.nombre_material as franela,
        m3.nombre_material as estuche
      FROM lente l
      LEFT JOIN organico o ON l.id_organico = o.id_organico
      LEFT JOIN material m ON l.id_montura = m.id_material
      LEFT JOIN material m2 ON l.id_franela = m2.id_material
      LEFT JOIN material m3 ON l.id_estuche = m3.id_material
    `;

    let lentesParams = [];

    if (idEntrega) {
      // Si hay entrega, buscar a través de entrega_detalle_lente
      lentesQuery += `
        INNER JOIN entrega_detalle_lente edl ON l.id_lente = edl.id_lente
        WHERE edl.id_entrega_pendiente = $1
      `;
      lentesParams = [idEntrega];
    } else {
      // Si no hay entrega, buscar lentes asociados al pedido de otra forma
      // Esto dependerá de cómo esté estructurada tu BD
      // Por ahora, intentamos buscar por el pedido a través de alguna relación
      // Podrías tener una tabla que relacione lente con pedido directamente
      console.log("⚠️ No se encontró entrega, buscando lentes sin entrega...");
      // Como fallback, intentamos buscar lentes que estén en el pedido
      // Esto es un ejemplo, ajusta según tu esquema
      lentesQuery += `
        WHERE l.id_lente IN (
          SELECT edl.id_lente 
          FROM entrega_detalle_lente edl
          INNER JOIN entrega_pendiente ep ON edl.id_entrega_pendiente = ep.id_entrega_pendiente
          WHERE ep.id_pedido = $1
        )
      `;
      lentesParams = [idNum];
    }

    console.log("📝 Query lentes:", lentesQuery);
    console.log("📦 Params lentes:", lentesParams);

    const lentesResult = await query(lentesQuery, lentesParams);
    console.log("📊 Lentes encontrados:", lentesResult.rows.length);

    // 4. Construir items (lentes)
    let lenteIndex = 0;
    lentesResult.rows.forEach((l) => {
      lenteIndex++;
      const grupo = `Lente ${l.tipo_lente || 'No especificado'} ${lenteIndex}`;
      
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
      
      if (l.material) {
        venta.items.push({
          nombre: `Material: ${l.material}`,
          cantidad: 2,
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
    });

    // 5. Obtener productos adicionales (materiales de entrega_detalle_material)
    let materialesQuery = `
      SELECT 
        m.nombre_material,
        edm.cantidad
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

    console.log("📝 Query materiales:", materialesQuery);
    console.log("📦 Params materiales:", materialesParams);

    const materialesResult = await query(materialesQuery, materialesParams);
    console.log("📊 Materiales encontrados:", materialesResult.rows.length);

    // Agregar materiales como items
    materialesResult.rows.forEach(m => {
      venta.items.push({
        nombre: m.nombre_material,
        cantidad: m.cantidad || 1,
        precioUnitario: 0,
        subtotal: 0,
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

const getVentasByCodigo = async (codigoVenta) => {
  try {
    console.log("🔍 getVentasByCodigo service - codigoVenta:", codigoVenta);

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
      WHERE p.codigo_pedido ILIKE $1
      ORDER BY p.fecha_pedido DESC
      `,
      [`%${codigoVenta}%`]
    );

    return result.rows.map(row => mapVentaToFrontend(row));
  } catch (error) {
    console.error("Error en getVentasByCodigo service:", error);
    return [];
  }
};

// ============================================
// GET - OBTENER VENTAS POR CLIENTE
// ============================================

const getVentasByCliente = async (clientName) => {
  try {
    console.log("🔍 getVentasByCliente service - clientName:", clientName);

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
      WHERE per.nombre ILIKE $1 OR per.apellido ILIKE $1
      ORDER BY p.fecha_pedido DESC
      `,
      [`%${clientName}%`]
    );

    return result.rows.map(row => mapVentaToFrontend(row));
  } catch (error) {
    console.error("Error en getVentasByCliente service:", error);
    return [];
  }
};

// ============================================
// GET - RESUMEN DE VENTAS
// ============================================

const getResumenVentas = async (filtros) => {
  try {
    console.log("🔍 getResumenVentas service - filtros:", filtros);

    const ventas = await getVentas(filtros);

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

const getResumenClientes = async (filtros) => {
  try {
    console.log("🔍 getResumenClientes service - filtros:", filtros);

    const { tipoFiltro = 'todos' } = filtros;

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
      WHERE 1=1
    `;

    const params = [];
    let paramIndex = 1;

    if (filtros.tiendaId) {
      queryText += ` AND p.id_tienda = $${paramIndex}`;
      params.push(parseInt(filtros.tiendaId));
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

const getEstadisticasRapidas = async (tiendaId) => {
  try {
    console.log("🔍 getEstadisticasRapidas service - tiendaId:", tiendaId);

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    let queryText = `
      SELECT 
        COUNT(*) as total_ventas,
        COALESCE(SUM(total), 0) as total_monto
      FROM pedido
      WHERE fecha_pedido >= $1
    `;

    const params = [startOfMonth.toISOString()];
    let paramIndex = 2;

    if (tiendaId) {
      queryText += ` AND id_tienda = $${paramIndex}`;
      params.push(parseInt(tiendaId));
      paramIndex++;
    }

    const mesResult = await query(queryText, params);
    const totalMes = parseFloat(mesResult.rows[0]?.total_monto || 0);
    const cantidadMes = parseInt(mesResult.rows[0]?.total_ventas || 0);

    let hoyQuery = `
      SELECT 
        COUNT(*) as total_ventas,
        COALESCE(SUM(total), 0) as total_monto
      FROM pedido
      WHERE fecha_pedido >= $1 AND fecha_pedido < $2
    `;

    const hoyParams = [today.toISOString(), new Date(today.getTime() + 86400000).toISOString()];
    let hoyIndex = 3;

    if (tiendaId) {
      hoyQuery += ` AND id_tienda = $${hoyIndex}`;
      hoyParams.push(parseInt(tiendaId));
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

const getTiendas = async () => {
  try {
    console.log("🔍 getTiendas service");

    const result = await query(
      `
      SELECT 
        id_tienda as id,
        nombre_tienda as nombre
      FROM tienda
      WHERE estado = 'activo'
      ORDER BY nombre_tienda
      `
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