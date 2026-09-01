// src/services/NuevaVentaService.js
const { query } = require("../../db");

// ============================================
// BUSCAR ORGÁNICOS (FILTRADO POR TIPO Y GRADO)
// ============================================

const searchOrganicos = async (term, tipo, grado, userInfo) => {
  try {
    const { negocioId } = userInfo;

    let searchQuery = `
      SELECT 
        o.id_organico,
        o.nombre_organico,
        o.tipo,
        ro.id_rango_organico,
        ro.precio_compra,
        ro.precio_venta,
        ro.inicio,
        ro.fin
      FROM organico o
      INNER JOIN rango_organico ro ON o.id_organico = ro.id_organico
      WHERE o.id_negocio = $1 AND o.estado = 'activo'
        AND o.tipo = $2
        AND $3 >= ro.inicio AND $3 <= ro.fin
    `;

    const params = [parseInt(negocioId), tipo, grado];

    if (term && term.trim()) {
      searchQuery += ` AND o.nombre_organico ILIKE $4`;
      params.push(`%${term.trim()}%`);
    }

    searchQuery += ` ORDER BY o.nombre_organico, ro.inicio`;

    const result = await query(searchQuery, params);

    const organicMap = {};
    for (const row of result.rows) {
      if (!organicMap[row.id_organico]) {
        organicMap[row.id_organico] = {
          id_organico: row.id_organico,
          nombre_organico: row.nombre_organico,
          tipo: row.tipo,
          rangos: []
        };
      }
      organicMap[row.id_organico].rangos.push({
        id_rango_organico: row.id_rango_organico,
        precio_compra: parseFloat(row.precio_compra),
        precio_venta: parseFloat(row.precio_venta),
        inicio: parseFloat(row.inicio),
        fin: parseFloat(row.fin)
      });
    }

    return Object.values(organicMap);
  } catch (error) {
    console.error("Error en searchOrganicos service:", error);
    return [];
  }
};

// ============================================
// OBTENER PRECIO DE ORGÁNICO POR GRADO
// ============================================

const getOrganicPrice = async (organicoId, grado, userInfo) => {
  try {
    const { negocioId } = userInfo;

    const result = await query(
      `
      SELECT 
        ro.id_rango_organico,
        ro.precio_compra,
        ro.precio_venta,
        ro.inicio,
        ro.fin
      FROM rango_organico ro
      INNER JOIN organico o ON ro.id_organico = o.id_organico
      WHERE ro.id_organico = $1 
        AND o.id_negocio = $2 
        AND $3 >= ro.inicio 
        AND $3 <= ro.fin
      LIMIT 1
      `,
      [parseInt(organicoId), parseInt(negocioId), grado]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return {
      id_rango_organico: result.rows[0].id_rango_organico,
      precio_compra: parseFloat(result.rows[0].precio_compra),
      precio_venta: parseFloat(result.rows[0].precio_venta),
      inicio: parseFloat(result.rows[0].inicio),
      fin: parseFloat(result.rows[0].fin)
    };
  } catch (error) {
    console.error("Error en getOrganicPrice service:", error);
    return null;
  }
};

// ============================================
// BUSCAR MATERIALES POR TIPO (CON FILTRO POR TIENDA)
// ============================================

const searchMateriales = async (tipo, term, userInfo) => {
  try {
    const { negocioId, tiendaId } = userInfo;

    let queryText = `
      SELECT 
        m.id_material as id,
        m.nombre_material as nombre,
        m.codigo_material as codigo,
        m.precio_compra as precioCompra,
        m.precio_venta as precioVenta,
        tm.nombre_tipo_material as categoria,
        COALESCE(mt.stock, 0) as stock
      FROM material m
      INNER JOIN tipo_material tm ON m.id_tipo_material = tm.id_tipo_material
      INNER JOIN material_tienda mt ON m.id_material = mt.id_material AND mt.id_tienda = $3
      WHERE m.id_negocio = $1
        AND tm.nombre_tipo_material ILIKE $2
    `;

    const params = [parseInt(negocioId), tipo, parseInt(tiendaId)];

    if (term && term.trim()) {
      queryText += ` AND (m.nombre_material ILIKE $4 OR m.codigo_material ILIKE $4)`;
      params.push(`%${term.trim()}%`);
    }

    queryText += ` ORDER BY m.nombre_material LIMIT 20`;

    const result = await query(queryText, params);

    return result.rows.map(row => ({
      id: row.id,
      nombre: row.nombre,
      codigo: row.codigo || '',
      categoria: row.categoria,
      precioCompra: parseFloat(row.preciocompra || 0),
      precioVenta: parseFloat(row.precioventa || 0),
      stock: parseInt(row.stock || 0)
    }));
  } catch (error) {
    console.error("Error en searchMateriales service:", error);
    return [];
  }
};

// ============================================
// BUSCAR PRODUCTOS ADICIONALES (CON FILTRO POR TIENDA)
// ============================================

const searchProductos = async (term, userInfo) => {
  try {
    const { negocioId, tiendaId } = userInfo;

    let queryText = `
      SELECT 
        m.id_material as id,
        m.nombre_material as nombre,
        m.precio_venta as precio,
        tm.nombre_tipo_material as tipo
      FROM material m
      INNER JOIN tipo_material tm ON m.id_tipo_material = tm.id_tipo_material
      INNER JOIN material_tienda mt ON m.id_material = mt.id_material AND mt.id_tienda = $2
      WHERE m.id_negocio = $1
    `;

    const params = [parseInt(negocioId), parseInt(tiendaId)];

    if (term && term.trim()) {
      queryText += ` AND m.nombre_material ILIKE $3`;
      params.push(`%${term.trim()}%`);
    }

    queryText += ` ORDER BY m.nombre_material LIMIT 20`;

    const result = await query(queryText, params);

    return result.rows.map(row => ({
      id: row.id,
      nombre: row.nombre,
      precio: parseFloat(row.precio || 0),
      tipo: row.tipo || 'Producto'
    }));
  } catch (error) {
    console.error("Error en searchProductos service:", error);
    return [];
  }
};

// ============================================
// GENERAR CÓDIGO DE VENTA POR TIENDA Y DÍA (FORMATO DDMMYY)
// ============================================

const generarCodigoVenta = async (tiendaId) => {
  try {
    const now = new Date();
    const dia = String(now.getDate()).padStart(2, '0');
    const mes = String(now.getMonth() + 1).padStart(2, '0');
    const anio = String(now.getFullYear()).slice(-2); // Últimos 2 dígitos del año (ej: 2026 → 26)
    const diaMesAnio = dia + mes + anio; // Ej: 310826
    
    const result = await query(
      `
      SELECT codigo_pedido 
      FROM pedido 
      WHERE id_tienda = $1 
        AND DATE(fecha_pedido) = CURRENT_DATE
      ORDER BY id_pedido DESC 
      LIMIT 1
      `,
      [parseInt(tiendaId)]
    );
    
    let numero = 1;
    if (result.rows.length > 0) {
      const ultimoCodigo = result.rows[0].codigo_pedido;
      // Buscar el número al final del código (después del último guion)
      const partes = ultimoCodigo.split('-');
      if (partes.length >= 2) {
        const ultimoNumero = parseInt(partes[partes.length - 1]);
        if (!isNaN(ultimoNumero)) {
          numero = ultimoNumero + 1;
        }
      }
    }
    
    return `VTA${diaMesAnio}-${numero}`; // Formato: VTA310826-1
  } catch (error) {
    console.error("Error generando código de venta:", error);
    // Fallback con timestamp
    const now = new Date();
    const dia = String(now.getDate()).padStart(2, '0');
    const mes = String(now.getMonth() + 1).padStart(2, '0');
    const anio = String(now.getFullYear()).slice(-2);
    return `VTA${dia}${mes}${anio}-${Date.now()}`;
  }
};

// ============================================
// DESCONTAR STOCK DE MATERIALES
// ============================================

const descontarStockMaterial = async (idMaterial, tiendaId, cantidad) => {
  try {
    // Verificar stock actual
    const stockResult = await query(
      `
      SELECT stock, id_material_tienda
      FROM material_tienda
      WHERE id_material = $1 AND id_tienda = $2
      `,
      [parseInt(idMaterial), parseInt(tiendaId)]
    );

    if (stockResult.rows.length === 0) {
      console.warn(`⚠️ Material ${idMaterial} no encontrado en tienda ${tiendaId}`);
      return false;
    }

    const currentStock = parseInt(stockResult.rows[0].stock) || 0;
    const idMaterialTienda = stockResult.rows[0].id_material_tienda;

    if (currentStock < cantidad) {
      console.warn(`⚠️ Stock insuficiente para material ${idMaterial}: ${currentStock} < ${cantidad}`);
      return false;
    }

    const newStock = currentStock - cantidad;

    // Actualizar stock
    await query(
      `
      UPDATE material_tienda
      SET stock = $1
      WHERE id_material_tienda = $2
      `,
      [newStock, idMaterialTienda]
    );

    console.log(`✅ Stock descontado: Material ${idMaterial}, Tienda ${tiendaId}, ${cantidad} unidades (${currentStock} → ${newStock})`);
    return true;
  } catch (error) {
    console.error("Error descontando stock:", error);
    throw new Error(`Error al descontar stock del material: ${error.message}`);
  }
};

// ============================================
// REGISTRAR MOVIMIENTO EN CAJA
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
        `Pago en efectivo registrado en venta`,
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
// REGISTRAR VENTA CON DESCUENTO DE STOCK
// ============================================

const registrarVenta = async (ventaData, userInfo) => {
  const { negocioId, userId, username } = userInfo;
  const {
    clientId,
    tiendaId,
    sistemaLente,
    total,
    montoPagado,
    subtotal,
    descuento,
    motivoDescuento,
    metodoPago,
    pagoEfectivo,
    pagoQR,
    medidas,
    lentes,
    productos
  } = ventaData;

  console.log("📝 registrarVenta - tiendaId:", tiendaId, "negocioId:", negocioId);
  console.log("📝 Cantidad de lentes:", lentes?.length || 0);
  console.log("📝 Cantidad de productos:", productos?.length || 0);
  console.log("📝 Motivo descuento:", motivoDescuento || "Sin motivo");

  try {
    // 1. Generar código de venta
    const codigoVenta = await generarCodigoVenta(tiendaId);
    console.log("📝 Código de venta generado:", codigoVenta);

    // 2. Obtener o crear la medida para el cliente
    let idMedida = null;
    
    const clienteResult = await query(
      `SELECT id_medida FROM persona WHERE id_persona = $1`,
      [parseInt(clientId)]
    );

    if (clienteResult.rows.length > 0 && clienteResult.rows[0].id_medida) {
      idMedida = clienteResult.rows[0].id_medida;
    }

    if (!idMedida) {
      const medidaResult = await query(
        `
        INSERT INTO medida (
          lejos_od_esfera, lejos_od_cilindro, lejos_od_eje,
          lejos_oi_esfera, lejos_oi_cilindro, lejos_oi_eje,
          cerca_od_esfera, cerca_od_cilindro, cerca_od_eje,
          cerca_oi_esfera, cerca_oi_cilindro, cerca_oi_eje,
          dip, add_medida
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        RETURNING id_medida
        `,
        [
          medidas.lejosDerecho.esfera || '', medidas.lejosDerecho.cilindro || '', medidas.lejosDerecho.eje || '',
          medidas.lejosIzquierdo.esfera || '', medidas.lejosIzquierdo.cilindro || '', medidas.lejosIzquierdo.eje || '',
          medidas.cercaDerecho.esfera || '', medidas.cercaDerecho.cilindro || '', medidas.cercaDerecho.eje || '',
          medidas.cercaIzquierdo.esfera || '', medidas.cercaIzquierdo.cilindro || '', medidas.cercaIzquierdo.eje || '',
          medidas.dip || '', medidas.add || ''
        ]
      );
      idMedida = medidaResult.rows[0].id_medida;

      await query(
        `UPDATE persona SET id_medida = $1 WHERE id_persona = $2`,
        [idMedida, parseInt(clientId)]
      );
    } else {
      await query(
        `
        UPDATE medida SET
          lejos_od_esfera = $1, lejos_od_cilindro = $2, lejos_od_eje = $3,
          lejos_oi_esfera = $4, lejos_oi_cilindro = $5, lejos_oi_eje = $6,
          cerca_od_esfera = $7, cerca_od_cilindro = $8, cerca_od_eje = $9,
          cerca_oi_esfera = $10, cerca_oi_cilindro = $11, cerca_oi_eje = $12,
          dip = $13, add_medida = $14
        WHERE id_medida = $15
        `,
        [
          medidas.lejosDerecho.esfera || '', medidas.lejosDerecho.cilindro || '', medidas.lejosDerecho.eje || '',
          medidas.lejosIzquierdo.esfera || '', medidas.lejosIzquierdo.cilindro || '', medidas.lejosIzquierdo.eje || '',
          medidas.cercaDerecho.esfera || '', medidas.cercaDerecho.cilindro || '', medidas.cercaDerecho.eje || '',
          medidas.cercaIzquierdo.esfera || '', medidas.cercaIzquierdo.cilindro || '', medidas.cercaIzquierdo.eje || '',
          medidas.dip || '', medidas.add || '',
          parseInt(idMedida)
        ]
      );
    }

    // 3. Crear UN SOLO pedido para TODOS los lentes y productos
    const estadoPago = montoPagado >= total ? 'Completo' : (montoPagado > 0 ? 'Parcial' : 'Pendiente');

    const pedidoResult = await query(
      `
      INSERT INTO pedido (
        codigo_pedido,
        id_cliente,
        id_tienda,
        sub_total,
        descuento,
        total,
        estado_pago,
        motivo_descripcion
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id_pedido
      `,
      [
        codigoVenta,
        parseInt(clientId),
        parseInt(tiendaId),
        parseFloat(subtotal || 0),
        parseFloat(descuento || 0),
        parseFloat(total || 0),
        estadoPago,
        motivoDescuento || null
      ]
    );

    const idPedido = pedidoResult.rows[0].id_pedido;
    console.log("📝 Pedido creado ID:", idPedido);

    // 4. Crear UNA SOLA entrega pendiente para el pedido
    const entregaResult = await query(
      `
      INSERT INTO entrega_pendiente (
        id_pedido,
        estado_entrega,
        id_usuario
      ) VALUES ($1, 'Pendiente', $2)
      RETURNING id_entrega_pendiente
      `,
      [idPedido, parseInt(userId)]
    );

    const idEntrega = entregaResult.rows[0].id_entrega_pendiente;
    console.log("📝 Entrega pendiente creada ID:", idEntrega);

    // 5. Registrar TODOS los lentes en la MISMA entrega Y DESCONTAR STOCK
    if (lentes && lentes.length > 0) {
      console.log(`📝 Registrando ${lentes.length} lentes...`);
      
      for (let i = 0; i < lentes.length; i++) {
        const lente = lentes[i];
        console.log(`📝 Lente ${i + 1}:`, lente.tipo);
        
        let idOrganico = null;
        if (lente.materialId && lente.materialId !== 'Sin material' && lente.materialId !== '') {
          const organicoResult = await query(
            `
            SELECT id_organico FROM organico 
            WHERE id_organico = $1 AND id_negocio = $2 AND estado = 'activo'
            `,
            [parseInt(lente.materialId), parseInt(negocioId)]
          );
          if (organicoResult.rows.length > 0) {
            idOrganico = organicoResult.rows[0].id_organico;
          }
        }

        let idMontura = null;
        if (lente.frameId && lente.frameId !== 'Sin montura' && lente.frameId !== '') {
          const monturaResult = await query(
            `
            SELECT m.id_material 
            FROM material m
            INNER JOIN tipo_material tm ON m.id_tipo_material = tm.id_tipo_material
            INNER JOIN material_tienda mt ON m.id_material = mt.id_material AND mt.id_tienda = $3
            WHERE m.id_material = $1 
              AND m.id_negocio = $2 
              AND tm.nombre_tipo_material = 'Montura'
            `,
            [parseInt(lente.frameId), parseInt(negocioId), parseInt(tiendaId)]
          );
          if (monturaResult.rows.length > 0) {
            idMontura = monturaResult.rows[0].id_material;
            // Descontar stock de la montura (1 unidad)
            await descontarStockMaterial(idMontura, tiendaId, 1);
          }
        }

        let idFranela = null;
        if (lente.franela && lente.franela !== '') {
          const franelaResult = await query(
            `
            SELECT m.id_material 
            FROM material m
            INNER JOIN tipo_material tm ON m.id_tipo_material = tm.id_tipo_material
            INNER JOIN material_tienda mt ON m.id_material = mt.id_material AND mt.id_tienda = $3
            WHERE m.id_material = $1 
              AND m.id_negocio = $2 
              AND tm.nombre_tipo_material = 'Franela'
            `,
            [parseInt(lente.franela), parseInt(negocioId), parseInt(tiendaId)]
          );
          if (franelaResult.rows.length > 0) {
            idFranela = franelaResult.rows[0].id_material;
            // Descontar stock de la franela (1 unidad)
            await descontarStockMaterial(idFranela, tiendaId, 1);
          }
        }

        let idEstuche = null;
        if (lente.estuche && lente.estuche !== '') {
          const estucheResult = await query(
            `
            SELECT m.id_material 
            FROM material m
            INNER JOIN tipo_material tm ON m.id_tipo_material = tm.id_tipo_material
            INNER JOIN material_tienda mt ON m.id_material = mt.id_material AND mt.id_tienda = $3
            WHERE m.id_material = $1 
              AND m.id_negocio = $2 
              AND tm.nombre_tipo_material = 'Estuche'
            `,
            [parseInt(lente.estuche), parseInt(negocioId), parseInt(tiendaId)]
          );
          if (estucheResult.rows.length > 0) {
            idEstuche = estucheResult.rows[0].id_material;
            // Descontar stock del estuche (1 unidad)
            await descontarStockMaterial(idEstuche, tiendaId, 1);
          }
        }

        // Crear el lente
        const lenteResult = await query(
          `
          INSERT INTO lente (
            id_organico,
            id_montura,
            id_franela,
            id_estuche,
            tipo_lente
          ) VALUES ($1, $2, $3, $4, $5)
          RETURNING id_lente
          `,
          [
            idOrganico,
            idMontura,
            idFranela,
            idEstuche,
            lente.tipo || 'Lejos'
          ]
        );

        const idLente = lenteResult.rows[0].id_lente;
        console.log(`📝 Lente ${i + 1} creado ID:`, idLente);

        // Asociar el lente a la MISMA entrega pendiente
        await query(
          `
          INSERT INTO entrega_detalle_lente (
            id_entrega_pendiente,
            id_lente,
            total
          ) VALUES ($1, $2, $3)
          `,
          [
            idEntrega,
            idLente,
            parseFloat(lente.precioTotal || 0)
          ]
        );
        console.log(`📝 Lente ${i + 1} asociado a entrega ${idEntrega}`);
      }
    }

    // 6. Registrar TODOS los productos adicionales en la MISMA entrega Y DESCONTAR STOCK
    if (productos && productos.length > 0) {
      console.log(`📝 Registrando ${productos.length} productos adicionales...`);
      
      for (const producto of productos) {
        // Buscar el material por nombre
        const materialResult = await query(
          `
          SELECT m.id_material, mt.stock
          FROM material m
          INNER JOIN material_tienda mt ON m.id_material = mt.id_material AND mt.id_tienda = $3
          WHERE m.nombre_material ILIKE $1 
            AND m.id_negocio = $2 
          LIMIT 1
          `,
          [producto.nombre, parseInt(negocioId), parseInt(tiendaId)]
        );

        let idMaterial = null;
        if (materialResult.rows.length > 0) {
          idMaterial = materialResult.rows[0].id_material;
          const cantidad = producto.cantidad || 1;
          // Descontar stock del producto
          await descontarStockMaterial(idMaterial, tiendaId, cantidad);
        }

        if (idMaterial) {
          await query(
            `
            INSERT INTO entrega_detalle_material (
              id_entrega_pendiente,
              id_material,
              cantidad,
              total
            ) VALUES ($1, $2, $3, $4)
            `,
            [
              idEntrega,
              idMaterial,
              producto.cantidad || 1,
              parseFloat(producto.precio || 0) * (producto.cantidad || 1)
            ]
          );
          console.log(`📝 Producto "${producto.nombre}" asociado a entrega ${idEntrega}`);
        }
      }
    }

    // 7. Registrar el pago en venta
    if (montoPagado > 0) {
      let metodoPagoDB = metodoPago;
      let montoEfectivo = 0;
      let montoQR = 0;

      if (metodoPago === 'Efectivo') {
        montoEfectivo = parseFloat(montoPagado);
      } else if (metodoPago === 'QR') {
        montoQR = parseFloat(montoPagado);
      } else if (metodoPago === 'Mixto') {
        montoEfectivo = parseFloat(pagoEfectivo || 0);
        montoQR = parseFloat(pagoQR || 0);
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
          idPedido,
          parseInt(userId),
          parseFloat(montoPagado),
          metodoPagoDB,
          montoEfectivo,
          montoQR,
          `Venta registrada por ${username || 'Sistema'}`
        ]
      );

      const idVenta = ventaResult.rows[0].id_venta;
      console.log("📝 Venta registrada ID:", idVenta);

      const saldoPendiente = parseFloat(total) - parseFloat(montoPagado);

      // Crear o actualizar pago pendiente
      const pagoPendienteResult = await query(
        `SELECT id_pago_pendiente FROM pago_pendiente WHERE id_pedido = $1`,
        [idPedido]
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
          [parseFloat(montoPagado), saldoPendiente, estadoPago, idPedido]
        );
        console.log("✅ Pago pendiente ACTUALIZADO para pedido:", idPedido);
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
          [
            idPedido,
            parseFloat(total),
            parseFloat(montoPagado),
            saldoPendiente,
            estadoPago
          ]
        );
        console.log("✅ Pago pendiente CREADO para pedido:", idPedido);
      }

      if (montoEfectivo > 0) {
        await registrarMovimientoCaja(tiendaId, userId, montoEfectivo, idVenta);
      }
    }

    console.log(`✅ Venta completada con éxito. Pedido: ${codigoVenta}`);
    
    return {
      idPedido,
      codigoVenta,
      estadoPago,
      total
    };
  } catch (error) {
    console.error("Error en registrarVenta service:", error);
    throw new Error(error.message || "Error al registrar la venta");
  }
};

// ============================================
// OBTENER VENTAS POR CLIENTE
// ============================================

const getVentasByClient = async (clientId, userInfo) => {
  try {
    const { negocioId } = userInfo;

    const result = await query(
      `
      SELECT 
        p.id_pedido,
        p.codigo_pedido,
        p.fecha_pedido,
        p.total,
        p.sub_total,
        p.descuento,
        p.estado_pago,
        p.motivo_descripcion,
        COALESCE(
          (SELECT SUM(v.monto_pagado) FROM venta v WHERE v.id_pedido = p.id_pedido),
          0
        ) as monto_pagado
      FROM pedido p
      INNER JOIN tienda t ON p.id_tienda = t.id_tienda
      WHERE p.id_cliente = $1 AND t.id_negocio = $2
      ORDER BY p.fecha_pedido DESC
      `,
      [parseInt(clientId), parseInt(negocioId)]
    );

    return result.rows.map(row => ({
      id: row.id_pedido,
      codigo: row.codigo_pedido,
      fecha: row.fecha_pedido,
      total: parseFloat(row.total || 0),
      subtotal: parseFloat(row.sub_total || 0),
      descuento: parseFloat(row.descuento || 0),
      motivoDescuento: row.motivo_descripcion || '',
      estadoPago: row.estado_pago,
      montoPagado: parseFloat(row.monto_pagado || 0)
    }));
  } catch (error) {
    console.error("Error en getVentasByClient service:", error);
    return [];
  }
};

module.exports = {
  searchOrganicos,
  getOrganicPrice,
  searchMateriales,
  searchProductos,
  registrarVenta,
  getVentasByClient
};