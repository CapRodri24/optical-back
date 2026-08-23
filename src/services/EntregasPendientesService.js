// src/services/EntregasPendientesService.js
const { query } = require("../../db");

// ============================================
// MAPEO DE DATOS
// ============================================

const mapEntregaToFrontend = (row, pagos = []) => {
  // Extraer medidas de la tabla medida
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

  // Extraer accesorios
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
    fechaEntregaEstimada: row.fecha_entrega_estimada || "",
    vendedor: row.vendedor || "",
    registradoPor: row.usuario_registro || row.registrado_por || "",
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
// GET - OBTENER TODAS LAS ENTREGAS
// ============================================

const getEntregas = async (soloPendientes, userInfo) => {
  try {
    const { negocioId, tiendaId, role } = userInfo;

    console.log("🔍 getEntregas service - negocioId:", negocioId, "tiendaId:", tiendaId, "role:", role, "soloPendientes:", soloPendientes);

    if (!negocioId) {
      console.warn("⚠️ negocioId no proporcionado");
      return [];
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
        ) as monto_pagado,
        u.usuario as usuario_registro
      FROM entrega_pendiente ep
      INNER JOIN pedido p ON ep.id_pedido = p.id_pedido
      INNER JOIN persona per ON p.id_cliente = per.id_persona
      INNER JOIN tienda t ON p.id_tienda = t.id_tienda
      LEFT JOIN usuario u ON ep.id_usuario = u.id_usuario
      WHERE t.id_negocio = $1
    `;

    const params = [parseInt(negocioId)];
    let paramIndex = 2;

    if (soloPendientes) {
      queryText += ` AND ep.estado_entrega = 'Pendiente'`;
    }

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

    queryText += ` ORDER BY p.fecha_pedido DESC`;

    console.log("📝 Query getEntregas:", queryText);
    console.log("📦 Params:", params);

    const result = await query(queryText, params);

    if (result.rows.length === 0) {
      return [];
    }

    const entregas = [];
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

      entregas.push(mapEntregaToFrontend(entregaData, pagos));
    }

    return entregas;
  } catch (error) {
    console.error("Error en getEntregas service:", error);
    return [];
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
        ) as monto_pagado,
        u.usuario as usuario_registro
      FROM entrega_pendiente ep
      INNER JOIN pedido p ON ep.id_pedido = p.id_pedido
      INNER JOIN persona per ON p.id_cliente = per.id_persona
      INNER JOIN tienda t ON p.id_tienda = t.id_tienda
      LEFT JOIN usuario u ON ep.id_usuario = u.id_usuario
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
// POST - CREAR UNA NUEVA ENTREGA
// ============================================

const crearEntrega = async (data, userInfo) => {
  try {
    const { negocioId, userId } = userInfo;
    const {
      ventaId,
      clientName,
      clientPhone,
      sistemaLente,
      materialName,
      frameName,
      total,
      montoPagado,
      fechaVenta,
      fechaEntregaEstimada,
      vendedor,
      registradoPor,
      tiendaId,
      tiendaNombre,
      medidas,
      accesorios
    } = data;

    console.log("🔍 crearEntrega service - clientName:", clientName, "tiendaId:", tiendaId);

    if (!negocioId) {
      throw new Error("ID de negocio requerido");
    }

    // 1. Buscar o crear el cliente
    let clienteResult = await query(
      `
      SELECT id_persona 
      FROM persona 
      WHERE nombre ILIKE $1 AND apellido ILIKE $2
      `,
      [clientName.split(' ')[0] || '', clientName.split(' ').slice(1).join(' ') || '']
    );

    let idCliente;
    if (clienteResult.rows.length === 0) {
      const parts = clientName.split(' ');
      const nombre = parts[0] || 'Cliente';
      const apellido = parts.slice(1).join(' ') || '';

      const newCliente = await query(
        `
        INSERT INTO persona (nombre, apellido, celular, estado)
        VALUES ($1, $2, $3, 'activo')
        RETURNING id_persona
        `,
        [nombre, apellido, clientPhone || '']
      );
      idCliente = newCliente.rows[0].id_persona;

      await query(
        `
        INSERT INTO persona_negocio (id_persona, id_negocio, carnet_persona)
        VALUES ($1, $2, $3)
        `,
        [idCliente, parseInt(negocioId), `CI-${Date.now()}`]
      );
    } else {
      idCliente = clienteResult.rows[0].id_persona;
    }

    // 2. Crear el pedido
    const codigoPedido = ventaId || `VTA-${Date.now().toString().slice(-6)}`;
    const estadoPago = montoPagado >= total ? 'Completo' : 'Parcial';

    const pedidoResult = await query(
      `
      INSERT INTO pedido (
        codigo_pedido,
        id_cliente,
        id_tienda,
        fecha_pedido,
        sub_total,
        descuento,
        total,
        estado_pago
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id_pedido
      `,
      [
        codigoPedido,
        idCliente,
        parseInt(tiendaId),
        fechaVenta || new Date(),
        0,
        0,
        total,
        estadoPago
      ]
    );

    const idPedido = pedidoResult.rows[0].id_pedido;

    // 3. Crear la entrega pendiente con id_usuario
    const entregaResult = await query(
      `
      INSERT INTO entrega_pendiente (
        id_pedido,
        fecha_entrega,
        estado_entrega,
        id_usuario
      ) VALUES ($1, $2, $3, $4)
      RETURNING id_entrega_pendiente
      `,
      [idPedido, fechaEntregaEstimada || new Date(), 'Pendiente', parseInt(userId)]
    );

    const idEntrega = entregaResult.rows[0].id_entrega_pendiente;

    // 4. Si hay medidas, guardarlas
    if (medidas) {
      await query(
        `
        UPDATE persona 
        SET id_medida = (
          INSERT INTO medida (
            lejos_od_esfera, lejos_od_cilindro, lejos_od_eje,
            lejos_oi_esfera, lejos_oi_cilindro, lejos_oi_eje,
            cerca_od_esfera, cerca_od_cilindro, cerca_od_eje,
            cerca_oi_esfera, cerca_oi_cilindro, cerca_oi_eje,
            dip, add_medida
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
          RETURNING id_medida
        ) 
        WHERE id_persona = $15
        `,
        [
          medidas.lejosDerecho?.esfera || null,
          medidas.lejosDerecho?.cilindro || null,
          medidas.lejosDerecho?.eje || null,
          medidas.lejosIzquierdo?.esfera || null,
          medidas.lejosIzquierdo?.cilindro || null,
          medidas.lejosIzquierdo?.eje || null,
          medidas.cercaDerecho?.esfera || null,
          medidas.cercaDerecho?.cilindro || null,
          medidas.cercaDerecho?.eje || null,
          medidas.cercaIzquierdo?.esfera || null,
          medidas.cercaIzquierdo?.cilindro || null,
          medidas.cercaIzquierdo?.eje || null,
          medidas.dip || null,
          medidas.add || null,
          idCliente
        ]
      );
    }

    // 5. Crear un lente
    const lenteResult = await query(
      `
      INSERT INTO lente (
        id_organico,
        id_montura,
        id_franela,
        id_estuche,
        tipo_lente
      ) VALUES (
        (SELECT id_organico FROM organico WHERE nombre_organico = $1 AND id_negocio = $2 LIMIT 1),
        (SELECT id_material FROM material WHERE nombre_material = $3 AND id_negocio = $2 LIMIT 1),
        (SELECT id_material FROM material WHERE nombre_material = $4 AND id_negocio = $2 LIMIT 1),
        (SELECT id_material FROM material WHERE nombre_material = $5 AND id_negocio = $2 LIMIT 1),
        $6
      )
      RETURNING id_lente
      `,
      [
        materialName || 'Orgánico CR-39',
        parseInt(negocioId),
        frameName || 'Montura Genérica',
        accesorios?.franela || null,
        accesorios?.estuche || null,
        sistemaLente || 'Lejos'
      ]
    );

    if (lenteResult.rows.length > 0) {
      const idLente = lenteResult.rows[0].id_lente;
      await query(
        `
        INSERT INTO entrega_detalle_lente (id_entrega_pendiente, id_lente, total)
        VALUES ($1, $2, $3)
        `,
        [idEntrega, idLente, total]
      );
    }

    // 6. Si hay monto pagado, registrar la venta
    if (montoPagado > 0) {
      await query(
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
        `,
        [
          idPedido,
          parseInt(userId),
          montoPagado,
          'Efectivo',
          montoPagado,
          0,
          `Pago inicial registrado por ${registradoPor || 'Sistema'}`
        ]
      );
    }

    return await getEntregaById(idEntrega, userInfo);
  } catch (error) {
    console.error("Error en crearEntrega service:", error);
    throw new Error(error.message || "Error al crear la entrega");
  }
};

// ============================================
// PATCH - ACTUALIZAR UNA ENTREGA
// ============================================

const actualizarEntrega = async (id, data, userInfo) => {
  try {
    const { negocioId } = userInfo;

    console.log("🔍 actualizarEntrega service - id:", id);

    if (!negocioId) {
      throw new Error("ID de negocio requerido");
    }

    const idNum = parseInt(id);
    if (isNaN(idNum)) {
      throw new Error("ID de entrega inválido");
    }

    const existing = await getEntregaById(id, userInfo);
    if (!existing) {
      throw new Error("Entrega no encontrada");
    }

    const updates = [];
    const params = [];
    let paramIndex = 1;

    if (data.estadoEntrega) {
      updates.push(`estado_entrega = $${paramIndex}`);
      params.push(data.estadoEntrega);
      paramIndex++;
    }

    if (data.fechaEntregaEstimada) {
      updates.push(`fecha_entrega = $${paramIndex}`);
      params.push(data.fechaEntregaEstimada);
      paramIndex++;
    }

    if (updates.length > 0) {
      params.push(idNum);
      await query(
        `UPDATE entrega_pendiente SET ${updates.join(', ')} WHERE id_entrega_pendiente = $${paramIndex}`,
        params
      );
    }

    return await getEntregaById(id, userInfo);
  } catch (error) {
    console.error("Error en actualizarEntrega service:", error);
    throw new Error(error.message || "Error al actualizar la entrega");
  }
};

// ============================================
// PATCH - MARCAR ENTREGA COMO ENTREGADA
// ============================================

const marcarEntregado = async (id, userInfo) => {
  try {
    const { negocioId, userId } = userInfo;

    console.log("🔍 marcarEntregado service - id:", id, "userId:", userId);

    if (!negocioId) {
      throw new Error("ID de negocio requerido");
    }

    const idNum = parseInt(id);
    if (isNaN(idNum)) {
      throw new Error("ID de entrega inválido");
    }

    const existing = await getEntregaById(id, userInfo);
    if (!existing) {
      throw new Error("Entrega no encontrada");
    }

    if (existing.estadoEntrega === "Entregado") {
      throw new Error("Esta entrega ya fue marcada como entregada");
    }

    // Actualizar estado_entrega, fecha_entrega con NOW() y id_usuario
    await query(
      `
      UPDATE entrega_pendiente 
      SET estado_entrega = 'Entregado', 
          fecha_entrega = TIMEZONE('America/La_Paz', NOW()),
          id_usuario = $1
      WHERE id_entrega_pendiente = $2
      `,
      [parseInt(userId), idNum]
    );

    return await getEntregaById(id, userInfo);
  } catch (error) {
    console.error("Error en marcarEntregado service:", error);
    throw new Error(error.message || "Error al marcar la entrega como entregada");
  }
};

// ============================================
// POST - REGISTRAR UN PAGO PARA UNA ENTREGA
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
      WHERE ep.id_entrega_pendiente = $1
      `,
      [idNum]
    );

    if (entregaResult.rows.length === 0) {
      throw new Error("Entrega no encontrada");
    }

    const pedido = entregaResult.rows[0];
    const totalPedido = parseFloat(pedido.total || 0);

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

    const nuevoEstadoPago = nuevoMontoPagado >= totalPedido ? "Completo" : "Parcial";

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

    await query(
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

    return await getEntregaById(id, userInfo);
  } catch (error) {
    console.error("Error en registrarPago service:", error);
    throw new Error(error.message || "Error al registrar el pago");
  }
};

// ============================================
// DELETE - ELIMINAR UNA ENTREGA
// ============================================

const eliminarEntrega = async (id, userInfo) => {
  try {
    const { negocioId } = userInfo;

    console.log("🔍 eliminarEntrega service - id:", id);

    if (!negocioId) {
      throw new Error("ID de negocio requerido");
    }

    const idNum = parseInt(id);
    if (isNaN(idNum)) {
      throw new Error("ID de entrega inválido");
    }

    const existing = await getEntregaById(id, userInfo);
    if (!existing) {
      throw new Error("Entrega no encontrada");
    }

    await query(
      `
      DELETE FROM entrega_detalle_lente 
      WHERE id_entrega_pendiente = $1
      `,
      [idNum]
    );

    await query(
      `
      DELETE FROM entrega_detalle_material 
      WHERE id_entrega_pendiente = $1
      `,
      [idNum]
    );

    await query(
      `
      DELETE FROM entrega_pendiente 
      WHERE id_entrega_pendiente = $1
      `,
      [idNum]
    );

    return true;
  } catch (error) {
    console.error("Error en eliminarEntrega service:", error);
    throw new Error(error.message || "Error al eliminar la entrega");
  }
};

// ============================================
// GET - ESTADÍSTICAS DE ENTREGAS
// ============================================

const getEstadisticasEntregas = async (userInfo) => {
  try {
    const { negocioId, tiendaId, role } = userInfo;

    console.log("🔍 getEstadisticasEntregas service - negocioId:", negocioId, "tiendaId:", tiendaId);

    if (!negocioId) {
      console.warn("⚠️ negocioId no proporcionado");
      return { pendientes: 0, entregados: 0, total: 0 };
    }

    let queryText = `
      SELECT 
        ep.estado_entrega,
        COUNT(*) as cantidad
      FROM entrega_pendiente ep
      INNER JOIN pedido p ON ep.id_pedido = p.id_pedido
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

    queryText += ` GROUP BY ep.estado_entrega`;

    const result = await query(queryText, params);

    let pendientes = 0;
    let entregados = 0;

    for (const row of result.rows) {
      if (row.estado_entrega === 'Pendiente') {
        pendientes = parseInt(row.cantidad);
      } else if (row.estado_entrega === 'Entregado') {
        entregados = parseInt(row.cantidad);
      }
    }

    return {
      pendientes,
      entregados,
      total: pendientes + entregados
    };
  } catch (error) {
    console.error("Error en getEstadisticasEntregas service:", error);
    return { pendientes: 0, entregados: 0, total: 0 };
  }
};

module.exports = {
  getEntregas,
  getEntregaById,
  getEntregaByVentaId,
  crearEntrega,
  actualizarEntrega,
  marcarEntregado,
  registrarPago,
  eliminarEntrega,
  getEstadisticasEntregas
};