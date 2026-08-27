// src/services/PagosPendientesService.js
const { query } = require("../../db");

// ============================================
// MAPEO DE DATOS
// ============================================

const mapEntregaToFrontend = (row, pagos = []) => {
  const medidas = {
    lejosDerecho: {
      esfera: row.lejos_od_esfera || "",
      cilindro: row.lejos_od_cilindro || "",
      eje: row.lejos_od_eje || "",
      av: ""
    },
    lejosIzquierdo: {
      esfera: row.lejos_oi_esfera || "",
      cilindro: row.lejos_oi_cilindro || "",
      eje: row.lejos_oi_eje || "",
      av: ""
    },
    cercaDerecho: {
      esfera: row.cerca_od_esfera || "",
      cilindro: row.cerca_od_cilindro || "",
      eje: row.cerca_od_eje || "",
      av: ""
    },
    cercaIzquierdo: {
      esfera: row.cerca_oi_esfera || "",
      cilindro: row.cerca_oi_cilindro || "",
      eje: row.cerca_oi_eje || "",
      av: ""
    },
    dip: row.dip || "",
    add: row.add_medida || ""
  };

  const accesorios = {
    franela: row.franela_nombre || "",
    estuche: row.estuche_nombre || ""
  };

  return {
    id: row.id_entrega_pendiente?.toString(),
    ventaId: row.codigo_pedido || "",
    clientName: `${row.nombre || ''} ${row.apellido || ''}`.trim() || "Cliente",
    clientPhone: row.celular || "",
    sistemaLente: row.tipo_lente || "Lejos",
    materialName: row.nombre_organico || "Sin material",
    frameName: row.nombre_montura || "",
    total: parseFloat(row.total_pedido || 0),
    montoPagado: parseFloat(row.monto_pagado || 0),
    estadoEntrega: row.estado_entrega || "Pendiente",
    estadoPago: row.estado_pago || "Pendiente",
    fechaVenta: row.fecha_pedido ? new Date(row.fecha_pedido).toLocaleDateString('es-BO') : "",
    fechaVentaRaw: row.fecha_pedido || "",
    fechaEntregaEstimada: row.fecha_entrega_estimada || "",
    vendedor: row.vendedor || "",
    registradoPor: row.registrado_por || "",
    pagos: pagos,
    tiendaId: row.id_tienda?.toString() || "",
    tiendaNombre: row.nombre_tienda || "",
    medidas: medidas,
    accesorios: accesorios
  };
};

// ============================================
// FUNCIÓN PARA OBTENER PAGOS DE UNA ENTREGA
// ============================================

const getPagosByEntregaId = async (idPedido) => {
  try {
    const result = await query(
      `
      SELECT 
        v.id_venta,
        v.monto_pagado as monto,
        v.metodo_pago as metodo,
        v.monto_efectivo,
        v.monto_qr,
        v.fecha_hora as fecha,
        u.usuario as registrado_por
      FROM venta v
      LEFT JOIN usuario u ON v.id_usuario = u.id_usuario
      WHERE v.id_pedido = $1
      ORDER BY v.fecha_hora ASC
      `,
      [idPedido]
    );

    return result.rows.map(row => {
      const pago = {
        monto: parseFloat(row.monto || 0),
        metodo: row.metodo || "Efectivo",
        fecha: row.fecha ? new Date(row.fecha).toLocaleDateString('es-BO') : "",
        registradoPor: row.registrado_por || "Sistema"
      };

      if (row.metodo === "Mixto") {
        pago.detalleMixto = {
          qr: parseFloat(row.monto_qr || 0),
          efectivo: parseFloat(row.monto_efectivo || 0)
        };
      }

      return pago;
    });
  } catch (error) {
    console.error("Error getting pagos by entrega:", error);
    return [];
  }
};

// ============================================
// FUNCIÓN PARA APLICAR FILTROS DE FECHA
// ============================================

const applyDateFilters = (queryText, params, dateFilter) => {
  if (!dateFilter || dateFilter.type === "all") {
    return { queryText, params };
  }

  let filterQuery = "";
  const { type, specificDate, startDate, endDate } = dateFilter;

  switch (type) {
    case "today": {
      filterQuery = ` AND DATE(p.fecha_pedido) = CURRENT_DATE`;
      break;
    }
    case "yesterday": {
      filterQuery = ` AND DATE(p.fecha_pedido) = CURRENT_DATE - INTERVAL '1 day'`;
      break;
    }
    case "thisWeek": {
      filterQuery = ` AND DATE(p.fecha_pedido) >= DATE_TRUNC('week', CURRENT_DATE) 
                      AND DATE(p.fecha_pedido) <= DATE_TRUNC('week', CURRENT_DATE) + INTERVAL '6 days'`;
      break;
    }
    case "lastWeek": {
      filterQuery = ` AND DATE(p.fecha_pedido) >= DATE_TRUNC('week', CURRENT_DATE - INTERVAL '7 days')
                      AND DATE(p.fecha_pedido) <= DATE_TRUNC('week', CURRENT_DATE - INTERVAL '7 days') + INTERVAL '6 days'`;
      break;
    }
    case "thisMonth": {
      filterQuery = ` AND DATE(p.fecha_pedido) >= DATE_TRUNC('month', CURRENT_DATE)
                      AND DATE(p.fecha_pedido) <= DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month' - INTERVAL '1 day'`;
      break;
    }
    case "lastMonth": {
      filterQuery = ` AND DATE(p.fecha_pedido) >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month')
                      AND DATE(p.fecha_pedido) <= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month') + INTERVAL '1 month' - INTERVAL '1 day'`;
      break;
    }
    case "specific": {
      if (specificDate) {
        const date = new Date(specificDate);
        const formattedDate = date.toISOString().split('T')[0];
        filterQuery = ` AND DATE(p.fecha_pedido) = '${formattedDate}'::date`;
      }
      break;
    }
    case "range": {
      if (startDate && endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        const formattedStart = start.toISOString().split('T')[0];
        const formattedEnd = end.toISOString().split('T')[0];
        filterQuery = ` AND DATE(p.fecha_pedido) >= '${formattedStart}'::date 
                        AND DATE(p.fecha_pedido) <= '${formattedEnd}'::date`;
      }
      break;
    }
  }

  return { queryText: queryText + filterQuery, params };
};

// ============================================
// FUNCIÓN PARA REGISTRAR MOVIMIENTO EN CAJA (SOLO EFECTIVO)
// ============================================

const registrarMovimientoCaja = async (tiendaId, userId, montoEfectivo, idVenta) => {
  try {
    if (montoEfectivo <= 0) {
      console.log("ℹ️ No hay monto en efectivo para registrar en caja");
      return;
    }

    const cajaResult = await query(
      `
      SELECT id_caja, total, estado 
      FROM caja 
      WHERE id_tienda = $1
      `,
      [parseInt(tiendaId)]
    );

    if (cajaResult.rows.length === 0) {
      throw new Error(`No se encontró caja para la tienda con ID ${tiendaId}`);
    }

    const caja = cajaResult.rows[0];

    if (caja.estado !== 'abierta') {
      throw new Error(`La caja de la tienda está cerrada. No se pueden registrar pagos en efectivo.`);
    }

    const idCaja = caja.id_caja;
    const montoAnterior = parseFloat(caja.total || 0);
    const montoNuevo = montoAnterior + montoEfectivo;

    await query(
      `
      UPDATE caja 
      SET total = $1 
      WHERE id_caja = $2
      `,
      [montoNuevo, idCaja]
    );

    await query(
      `
      INSERT INTO transaccion_caja (
        id_caja,
        id_usuario,
        monto_nuevo,
        monto_anterior,
        monto,
        tipo_movimiento,
        descripcion,
        id_venta
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `,
      [
        idCaja,
        parseInt(userId),
        montoNuevo,
        montoAnterior,
        montoEfectivo,
        'ingreso',
        `Pago en efectivo registrado`,
        idVenta
      ]
    );

    console.log(`✅ Movimiento de caja registrado: +Bs ${montoEfectivo} (Caja ID: ${idCaja}, Tienda: ${tiendaId})`);
  } catch (error) {
    console.error("Error registrando movimiento en caja:", error);
    throw new Error(error.message || "Error al registrar el movimiento en caja");
  }
};

// ============================================
// GET - OBTENER ENTREGAS CON SALDO PENDIENTE (CON FILTROS DE FECHA)
// ============================================

const getEntregasConSaldo = async (userInfo, dateFilter = null) => {
  try {
    const { negocioId, tiendaId, role } = userInfo;

    console.log("🔍 getEntregasConSaldo service - negocioId:", negocioId, "tiendaId:", tiendaId, "role:", role);

    if (!negocioId) {
      console.warn("⚠️ negocioId no proporcionado");
      return { conSaldo: [], completos: [] };
    }

    let queryText = `
      SELECT 
        ep.id_entrega_pendiente,
        ep.estado_entrega,
        ep.fecha_entrega as fecha_entrega_estimada,
        p.id_pedido,
        p.codigo_pedido,
        p.fecha_pedido,
        p.total as total_pedido,
        p.estado_pago,
        p.id_tienda,
        per.id_persona,
        per.nombre,
        per.apellido,
        per.celular,
        per.id_medida,
        t.nombre_tienda,
        COALESCE(
          (SELECT SUM(v2.monto_pagado) FROM venta v2 WHERE v2.id_pedido = p.id_pedido),
          0
        ) as monto_pagado
      FROM entrega_pendiente ep
      INNER JOIN pedido p ON ep.id_pedido = p.id_pedido
      INNER JOIN persona per ON p.id_cliente = per.id_persona
      INNER JOIN tienda t ON p.id_tienda = t.id_tienda
      WHERE t.id_negocio = $1
    `;

    const params = [parseInt(negocioId)];
    let paramIndex = 2;

    let tiendaParaFiltrar = null;

    if (role === "Vendedor" || role === "Medidor") {
      if (tiendaId && tiendaId !== 'todas') {
        tiendaParaFiltrar = tiendaId;
      }
    } else if (role === "Administrador" && tiendaId && tiendaId !== 'todas') {
      tiendaParaFiltrar = tiendaId;
    }

    if (tiendaParaFiltrar) {
      queryText += ` AND p.id_tienda = $${paramIndex}`;
      params.push(parseInt(tiendaParaFiltrar));
      paramIndex++;
    }

    // Aplicar filtros de fecha
    const dateFilterResult = applyDateFilters(queryText, params, dateFilter);
    queryText = dateFilterResult.queryText;

    queryText += ` ORDER BY p.fecha_pedido DESC`;

    console.log("📝 Query getEntregasConSaldo:", queryText);
    console.log("📦 Params:", params);

    const result = await query(queryText, params);

    if (result.rows.length === 0) {
      return { conSaldo: [], completos: [] };
    }

    const conSaldo = [];
    const completos = [];

    for (const row of result.rows) {
      const pagos = await getPagosByEntregaId(row.id_pedido);

      let medidas = null;
      if (row.id_medida) {
        const medidaResult = await query(
          `
          SELECT 
            lejos_od_esfera,
            lejos_od_cilindro,
            lejos_od_eje,
            lejos_oi_esfera,
            lejos_oi_cilindro,
            lejos_oi_eje,
            cerca_od_esfera,
            cerca_od_cilindro,
            cerca_od_eje,
            cerca_oi_esfera,
            cerca_oi_cilindro,
            cerca_oi_eje,
            dip,
            add_medida
          FROM medida
          WHERE id_medida = $1
          `,
          [row.id_medida]
        );
        if (medidaResult.rows.length > 0) {
          medidas = medidaResult.rows[0];
        }
      }

      const lenteResult = await query(
        `
        SELECT 
          l.tipo_lente,
          o.nombre_organico,
          m.nombre_material as nombre_montura,
          m2.nombre_material as franela_nombre,
          m3.nombre_material as estuche_nombre,
          edl.total as total_lente
        FROM entrega_detalle_lente edl
        INNER JOIN lente l ON edl.id_lente = l.id_lente
        INNER JOIN entrega_pendiente ep ON edl.id_entrega_pendiente = ep.id_entrega_pendiente
        LEFT JOIN organico o ON l.id_organico = o.id_organico
        LEFT JOIN material m ON l.id_montura = m.id_material
        LEFT JOIN material m2 ON l.id_franela = m2.id_material
        LEFT JOIN material m3 ON l.id_estuche = m3.id_material
        WHERE ep.id_pedido = $1
        LIMIT 1
        `,
        [row.id_pedido]
      );

      const lenteInfo = lenteResult.rows[0] || {};
      const entregaData = {
        ...row,
        ...medidas,
        ...lenteInfo,
        pagos: pagos
      };

      const entrega = mapEntregaToFrontend(entregaData, pagos);

      if (row.estado_pago === "Completo") {
        completos.push(entrega);
      } else {
        conSaldo.push(entrega);
      }
    }

    return { conSaldo, completos };
  } catch (error) {
    console.error("Error en getEntregasConSaldo service:", error);
    return { conSaldo: [], completos: [] };
  }
};

// ============================================
// GET - OBTENER TODAS LAS ENTREGAS (CON FILTROS DE FECHA)
// ============================================

const getEntregas = async (userInfo, dateFilter = null) => {
  try {
    const { negocioId, tiendaId, role } = userInfo;

    console.log("🔍 getEntregas service - negocioId:", negocioId, "tiendaId:", tiendaId, "role:", role);

    if (!negocioId) {
      console.warn("⚠️ negocioId no proporcionado");
      return { conSaldo: [], completos: [] };
    }

    let queryText = `
      SELECT 
        ep.id_entrega_pendiente,
        ep.estado_entrega,
        ep.fecha_entrega as fecha_entrega_estimada,
        p.id_pedido,
        p.codigo_pedido,
        p.fecha_pedido,
        p.total as total_pedido,
        p.estado_pago,
        p.id_tienda,
        per.id_persona,
        per.nombre,
        per.apellido,
        per.celular,
        per.id_medida,
        t.nombre_tienda,
        COALESCE(
          (SELECT SUM(v2.monto_pagado) FROM venta v2 WHERE v2.id_pedido = p.id_pedido),
          0
        ) as monto_pagado
      FROM entrega_pendiente ep
      INNER JOIN pedido p ON ep.id_pedido = p.id_pedido
      INNER JOIN persona per ON p.id_cliente = per.id_persona
      INNER JOIN tienda t ON p.id_tienda = t.id_tienda
      WHERE t.id_negocio = $1
    `;

    const params = [parseInt(negocioId)];
    let paramIndex = 2;

    let tiendaParaFiltrar = null;

    if (role === "Vendedor" || role === "Medidor") {
      if (tiendaId && tiendaId !== 'todas') {
        tiendaParaFiltrar = tiendaId;
      }
    } else if (role === "Administrador" && tiendaId && tiendaId !== 'todas') {
      tiendaParaFiltrar = tiendaId;
    }

    if (tiendaParaFiltrar) {
      queryText += ` AND p.id_tienda = $${paramIndex}`;
      params.push(parseInt(tiendaParaFiltrar));
      paramIndex++;
    }

    // Aplicar filtros de fecha
    const dateFilterResult = applyDateFilters(queryText, params, dateFilter);
    queryText = dateFilterResult.queryText;

    queryText += ` ORDER BY p.fecha_pedido DESC`;

    console.log("📝 Query getEntregas:", queryText);
    console.log("📦 Params:", params);

    const result = await query(queryText, params);

    if (result.rows.length === 0) {
      return { conSaldo: [], completos: [] };
    }

    const conSaldo = [];
    const completos = [];

    for (const row of result.rows) {
      const pagos = await getPagosByEntregaId(row.id_pedido);

      let medidas = null;
      if (row.id_medida) {
        const medidaResult = await query(
          `
          SELECT 
            lejos_od_esfera,
            lejos_od_cilindro,
            lejos_od_eje,
            lejos_oi_esfera,
            lejos_oi_cilindro,
            lejos_oi_eje,
            cerca_od_esfera,
            cerca_od_cilindro,
            cerca_od_eje,
            cerca_oi_esfera,
            cerca_oi_cilindro,
            cerca_oi_eje,
            dip,
            add_medida
          FROM medida
          WHERE id_medida = $1
          `,
          [row.id_medida]
        );
        if (medidaResult.rows.length > 0) {
          medidas = medidaResult.rows[0];
        }
      }

      const lenteResult = await query(
        `
        SELECT 
          l.tipo_lente,
          o.nombre_organico,
          m.nombre_material as nombre_montura,
          m2.nombre_material as franela_nombre,
          m3.nombre_material as estuche_nombre,
          edl.total as total_lente
        FROM entrega_detalle_lente edl
        INNER JOIN lente l ON edl.id_lente = l.id_lente
        INNER JOIN entrega_pendiente ep ON edl.id_entrega_pendiente = ep.id_entrega_pendiente
        LEFT JOIN organico o ON l.id_organico = o.id_organico
        LEFT JOIN material m ON l.id_montura = m.id_material
        LEFT JOIN material m2 ON l.id_franela = m2.id_material
        LEFT JOIN material m3 ON l.id_estuche = m3.id_material
        WHERE ep.id_pedido = $1
        LIMIT 1
        `,
        [row.id_pedido]
      );

      const lenteInfo = lenteResult.rows[0] || {};
      const entregaData = {
        ...row,
        ...medidas,
        ...lenteInfo,
        pagos: pagos
      };

      const entrega = mapEntregaToFrontend(entregaData, pagos);

      if (row.estado_pago === "Completo") {
        completos.push(entrega);
      } else {
        conSaldo.push(entrega);
      }
    }

    return { conSaldo, completos };
  } catch (error) {
    console.error("Error en getEntregas service:", error);
    return { conSaldo: [], completos: [] };
  }
};

// ============================================
// GET - OBTENER ENTREGA POR ID
// ============================================

const getEntregaById = async (id, userInfo) => {
  try {
    const { negocioId } = userInfo;

    console.log("🔍 getEntregaById service - id:", id);

    if (!negocioId) {
      console.warn("⚠️ negocioId no proporcionado");
      return null;
    }

    const idNum = parseInt(id);
    if (isNaN(idNum)) {
      console.warn("⚠️ ID inválido:", id);
      return null;
    }

    const result = await query(
      `
      SELECT 
        ep.id_entrega_pendiente,
        ep.estado_entrega,
        ep.fecha_entrega as fecha_entrega_estimada,
        p.id_pedido,
        p.codigo_pedido,
        p.fecha_pedido,
        p.total as total_pedido,
        p.estado_pago,
        p.id_tienda,
        per.id_persona,
        per.nombre,
        per.apellido,
        per.celular,
        per.id_medida,
        t.nombre_tienda,
        COALESCE(
          (SELECT SUM(v2.monto_pagado) FROM venta v2 WHERE v2.id_pedido = p.id_pedido),
          0
        ) as monto_pagado
      FROM entrega_pendiente ep
      INNER JOIN pedido p ON ep.id_pedido = p.id_pedido
      INNER JOIN persona per ON p.id_cliente = per.id_persona
      INNER JOIN tienda t ON p.id_tienda = t.id_tienda
      WHERE ep.id_entrega_pendiente = $1 AND t.id_negocio = $2
      `,
      [idNum, parseInt(negocioId)]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    const pagos = await getPagosByEntregaId(row.id_pedido);

    let medidas = null;
    if (row.id_medida) {
      const medidaResult = await query(
        `
        SELECT 
          lejos_od_esfera,
          lejos_od_cilindro,
          lejos_od_eje,
          lejos_oi_esfera,
          lejos_oi_cilindro,
          lejos_oi_eje,
          cerca_od_esfera,
          cerca_od_cilindro,
          cerca_od_eje,
          cerca_oi_esfera,
          cerca_oi_cilindro,
          cerca_oi_eje,
          dip,
          add_medida
        FROM medida
        WHERE id_medida = $1
        `,
        [row.id_medida]
      );
      if (medidaResult.rows.length > 0) {
        medidas = medidaResult.rows[0];
      }
    }

    const lenteResult = await query(
      `
      SELECT 
        l.tipo_lente,
        o.nombre_organico,
        m.nombre_material as nombre_montura,
        m2.nombre_material as franela_nombre,
        m3.nombre_material as estuche_nombre,
        edl.total as total_lente
      FROM entrega_detalle_lente edl
      INNER JOIN lente l ON edl.id_lente = l.id_lente
      INNER JOIN entrega_pendiente ep ON edl.id_entrega_pendiente = ep.id_entrega_pendiente
      LEFT JOIN organico o ON l.id_organico = o.id_organico
      LEFT JOIN material m ON l.id_montura = m.id_material
      LEFT JOIN material m2 ON l.id_franela = m2.id_material
      LEFT JOIN material m3 ON l.id_estuche = m3.id_material
      WHERE ep.id_pedido = $1
      LIMIT 1
      `,
      [row.id_pedido]
    );

    const lenteInfo = lenteResult.rows[0] || {};
    const entregaData = {
      ...row,
      ...medidas,
      ...lenteInfo,
      pagos: pagos
    };

    return mapEntregaToFrontend(entregaData, pagos);
  } catch (error) {
    console.error("Error en getEntregaById service:", error);
    return null;
  }
};

// ============================================
// GET - OBTENER ENTREGA POR ID DE VENTA
// ============================================

const getEntregaByVentaId = async (ventaId, userInfo) => {
  try {
    const { negocioId } = userInfo;

    console.log("🔍 getEntregaByVentaId service - ventaId:", ventaId);

    if (!negocioId) {
      console.warn("⚠️ negocioId no proporcionado");
      return null;
    }

    const result = await query(
      `
      SELECT 
        ep.id_entrega_pendiente
      FROM entrega_pendiente ep
      INNER JOIN pedido p ON ep.id_pedido = p.id_pedido
      INNER JOIN tienda t ON p.id_tienda = t.id_tienda
      WHERE p.codigo_pedido = $1 AND t.id_negocio = $2
      `,
      [ventaId, parseInt(negocioId)]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return await getEntregaById(result.rows[0].id_entrega_pendiente, userInfo);
  } catch (error) {
    console.error("Error en getEntregaByVentaId service:", error);
    return null;
  }
};

// ============================================
// GET - HISTORIAL DE PAGOS
// ============================================

const getHistorialPagos = async (id, userInfo) => {
  try {
    const { negocioId } = userInfo;

    console.log("🔍 getHistorialPagos service - id:", id);

    if (!negocioId) {
      console.warn("⚠️ negocioId no proporcionado");
      return [];
    }

    const idNum = parseInt(id);
    if (isNaN(idNum)) {
      console.warn("⚠️ ID inválido:", id);
      return [];
    }

    const entregaResult = await query(
      `
      SELECT p.id_pedido
      FROM entrega_pendiente ep
      INNER JOIN pedido p ON ep.id_pedido = p.id_pedido
      INNER JOIN tienda t ON p.id_tienda = t.id_tienda
      WHERE ep.id_entrega_pendiente = $1 AND t.id_negocio = $2
      `,
      [idNum, parseInt(negocioId)]
    );

    if (entregaResult.rows.length === 0) {
      return [];
    }

    const idPedido = entregaResult.rows[0].id_pedido;
    const pagos = await getPagosByEntregaId(idPedido);

    return pagos;
  } catch (error) {
    console.error("Error en getHistorialPagos service:", error);
    return [];
  }
};

// ============================================
// POST - REGISTRAR PAGO (CON CAJA)
// ============================================

const registrarPago = async (id, pagoData, registradoPor, userInfo) => {
  try {
    const { negocioId, userId } = userInfo;
    const { monto, metodo, detalleMixto } = pagoData;

    console.log("🔍 registrarPago service - id:", id, "monto:", monto, "metodo:", metodo);

    if (!negocioId) {
      throw new Error("ID de negocio requerido");
    }

    const idNum = parseInt(id);
    if (isNaN(idNum)) {
      throw new Error("ID de entrega inválido");
    }

    const entregaResult = await query(
      `
      SELECT 
        p.id_pedido,
        p.id_cliente,
        p.id_tienda,
        p.total,
        p.estado_pago,
        p.codigo_pedido
      FROM entrega_pendiente ep
      INNER JOIN pedido p ON ep.id_pedido = p.id_pedido
      INNER JOIN tienda t ON p.id_tienda = t.id_tienda
      WHERE ep.id_entrega_pendiente = $1 AND t.id_negocio = $2
      `,
      [idNum, parseInt(negocioId)]
    );

    if (entregaResult.rows.length === 0) {
      throw new Error("Entrega no encontrada");
    }

    const pedido = entregaResult.rows[0];
    const totalPedido = parseFloat(pedido.total || 0);
    const tiendaId = pedido.id_tienda;

    const pagosActualesResult = await query(
      `
      SELECT COALESCE(SUM(monto_pagado), 0) as total_pagado
      FROM venta
      WHERE id_pedido = $1
      `,
      [pedido.id_pedido]
    );

    const montoPagadoActual = parseFloat(pagosActualesResult.rows[0].total_pagado || 0);
    const nuevoMontoPagado = montoPagadoActual + monto;

    if (nuevoMontoPagado > totalPedido) {
      throw new Error(`El monto total pagado (${nuevoMontoPagado.toFixed(2)}) excede el total del pedido (${totalPedido.toFixed(2)})`);
    }

    let nuevoEstadoPago = "Parcial";
    if (nuevoMontoPagado >= totalPedido) {
      nuevoEstadoPago = "Completo";
    }

    let montoEfectivo = 0;
    let montoQR = 0;
    let metodoPago = metodo;

    if (metodo === "Mixto" && detalleMixto) {
      montoEfectivo = detalleMixto.efectivo;
      montoQR = detalleMixto.qr;
      metodoPago = "Mixto";
    } else if (metodo === "Efectivo") {
      montoEfectivo = monto;
    } else if (metodo === "QR") {
      montoQR = monto;
    }

    const ventaResult = await query(
      `
      INSERT INTO venta (
        id_pedido,
        id_usuario,
        monto_pagado,
        metodo_pago,
        monto_efectivo,
        monto_qr,
        descripcion
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id_venta
      `,
      [
        pedido.id_pedido,
        parseInt(userId),
        monto,
        metodoPago,
        montoEfectivo,
        montoQR,
        `Pago registrado por ${registradoPor}`
      ]
    );

    const idVenta = ventaResult.rows[0].id_venta;

    await query(
      `
      UPDATE pedido 
      SET estado_pago = $1 
      WHERE id_pedido = $2
      `,
      [nuevoEstadoPago, pedido.id_pedido]
    );

    const saldoPendiente = totalPedido - nuevoMontoPagado;

    const pagoPendienteResult = await query(
      `
      SELECT id_pago_pendiente 
      FROM pago_pendiente 
      WHERE id_pedido = $1
      `,
      [pedido.id_pedido]
    );

    if (pagoPendienteResult.rows.length > 0) {
      await query(
        `
        UPDATE pago_pendiente 
        SET monto_pagado = $1,
            saldo_pendiente = $2,
            estado_pago = $3
        WHERE id_pedido = $4
        `,
        [nuevoMontoPagado, saldoPendiente, nuevoEstadoPago, pedido.id_pedido]
      );
    } else {
      await query(
        `
        INSERT INTO pago_pendiente (
          id_pedido,
          total,
          monto_pagado,
          saldo_pendiente,
          estado_pago
        ) VALUES ($1, $2, $3, $4, $5)
        `,
        [pedido.id_pedido, totalPedido, nuevoMontoPagado, saldoPendiente, nuevoEstadoPago]
      );
    }

    if (montoEfectivo > 0) {
      await registrarMovimientoCaja(tiendaId, userId, montoEfectivo, idVenta);
    } else {
      console.log("ℹ️ No se registra movimiento en caja (pago con QR o sin efectivo)");
    }

    const entregaActualizada = await getEntregaById(id, userInfo);

    return entregaActualizada;
  } catch (error) {
    console.error("Error en registrarPago service:", error);
    throw new Error(error.message || "Error al registrar el pago");
  }
};

// ============================================
// GET - ESTADÍSTICAS DE PAGOS
// ============================================

const getEstadisticasPagos = async (userInfo) => {
  try {
    const { negocioId, tiendaId, role } = userInfo;

    console.log("🔍 getEstadisticasPagos service - negocioId:", negocioId, "tiendaId:", tiendaId, "role:", role);

    if (!negocioId) {
      console.warn("⚠️ negocioId no proporcionado");
      return { pendientes: 0, parciales: 0, saldoTotal: 0 };
    }

    let queryText = `
      SELECT 
        p.id_pedido,
        p.estado_pago,
        p.total,
        COALESCE(
          (SELECT SUM(v2.monto_pagado) FROM venta v2 WHERE v2.id_pedido = p.id_pedido),
          0
        ) as monto_pagado
      FROM pedido p
      INNER JOIN tienda t ON p.id_tienda = t.id_tienda
      WHERE t.id_negocio = $1
        AND p.estado_pago != 'Completo'
        AND p.estado_pago != 'Pendiente'
    `;

    const params = [parseInt(negocioId)];
    let paramIndex = 2;

    let tiendaParaFiltrar = null;

    if (role === "Vendedor" || role === "Medidor") {
      if (tiendaId && tiendaId !== 'todas') {
        tiendaParaFiltrar = tiendaId;
      }
    } else if (role === "Administrador" && tiendaId && tiendaId !== 'todas') {
      tiendaParaFiltrar = tiendaId;
    }

    if (tiendaParaFiltrar) {
      queryText += ` AND p.id_tienda = $${paramIndex}`;
      params.push(parseInt(tiendaParaFiltrar));
      paramIndex++;
    }

    const result = await query(queryText, params);

    let pendientes = 0;
    let parciales = 0;
    let saldoTotal = 0;

    for (const row of result.rows) {
      const total = parseFloat(row.total || 0);
      const montoPagado = parseFloat(row.monto_pagado || 0);
      const saldo = total - montoPagado;

      if (row.estado_pago === 'Pendiente') {
        pendientes++;
      } else if (row.estado_pago === 'Parcial') {
        parciales++;
      }

      saldoTotal += saldo;
    }

    return {
      pendientes,
      parciales,
      saldoTotal
    };
  } catch (error) {
    console.error("Error en getEstadisticasPagos service:", error);
    return { pendientes: 0, parciales: 0, saldoTotal: 0 };
  }
};

module.exports = {
  getEntregasConSaldo,
  getEntregas,
  getEntregaById,
  getEntregaByVentaId,
  getHistorialPagos,
  registrarPago,
  getEstadisticasPagos
};