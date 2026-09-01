// src/services/clientesService.js
const { query } = require("../../db");

// ============================================
// CLIENTES
// ============================================

const getClientes = async (filtros) => {
  try {
    const { negocioId, searchTerm, month } = filtros;

    console.log("🔍 getClientes service - negocioId:", negocioId);

    const negocioIdNum = parseInt(negocioId);
    if (isNaN(negocioIdNum)) {
      console.warn("Invalid negocioId:", negocioId);
      return [];
    }

    let queryText = `
      SELECT 
        p.id_persona as id,
        p.nombre,
        p.apellido as apellidos,
        p.celular,
        TO_CHAR(p.fecha_nacimiento, 'YYYY-MM-DD') as fecha_nacimiento,
        pn.carnet_persona as carnet,
        tc.nombre_tipo_cliente as tipo_cliente,
        tc.id_tipo_cliente as tipo_cliente_id,
        cz.nombre_zona as zona_cliente,
        cz.id_cliente_zona as zona_cliente_id
      FROM persona p
      INNER JOIN persona_negocio pn ON p.id_persona = pn.id_persona
      LEFT JOIN tipo_cliente tc ON p.id_tipo_cliente = tc.id_tipo_cliente
      LEFT JOIN cliente_zona cz ON p.id_cliente_zona = cz.id_cliente_zona
      WHERE pn.id_negocio = $1
      AND p.estado = 'activo'
    `;

    const params = [negocioIdNum];
    let paramCount = 1;

    if (searchTerm) {
      paramCount++;
      queryText += ` AND (
        p.nombre ILIKE $${paramCount} OR 
        p.apellido ILIKE $${paramCount} OR 
        pn.carnet_persona ILIKE $${paramCount} OR 
        p.celular ILIKE $${paramCount}
      )`;
      params.push(`%${searchTerm}%`);
    }

    if (month && month !== 'all') {
      paramCount++;
      queryText += ` AND EXTRACT(MONTH FROM p.fecha_nacimiento) = $${paramCount}`;
      params.push(parseInt(month));
    }

    queryText += ` ORDER BY p.nombre, p.apellido`;

    const result = await query(queryText, params);
    return result.rows || [];
  } catch (error) {
    console.error("Error en getClientes service:", error);
    return [];
  }
};

const searchClientes = async (term, negocioId) => {
  try {
    console.log("🔍 searchClientes service - term:", term, "negocioId:", negocioId);

    const negocioIdNum = parseInt(negocioId);
    if (isNaN(negocioIdNum)) {
      console.warn("Invalid negocioId:", negocioId);
      return [];
    }

    const result = await query(
      `
      SELECT 
        p.id_persona as id,
        p.nombre,
        p.apellido as apellidos,
        p.celular,
        TO_CHAR(p.fecha_nacimiento, 'YYYY-MM-DD') as fecha_nacimiento,
        pn.carnet_persona as carnet,
        tc.nombre_tipo_cliente as tipo_cliente,
        cz.nombre_zona as zona_cliente
      FROM persona p
      INNER JOIN persona_negocio pn ON p.id_persona = pn.id_persona
      LEFT JOIN tipo_cliente tc ON p.id_tipo_cliente = tc.id_tipo_cliente
      LEFT JOIN cliente_zona cz ON p.id_cliente_zona = cz.id_cliente_zona
      WHERE pn.id_negocio = $1
      AND p.estado = 'activo'
      AND (
        p.nombre ILIKE $2 OR 
        p.apellido ILIKE $2 OR 
        pn.carnet_persona ILIKE $2 OR 
        p.celular ILIKE $2
      )
      ORDER BY p.nombre, p.apellido
      LIMIT 20
      `,
      [negocioIdNum, `%${term}%`]
    );

    return result.rows || [];
  } catch (error) {
    console.error("Error en searchClientes service:", error);
    return [];
  }
};

const getClienteById = async (id, negocioId) => {
  try {
    console.log("🔍 getClienteById service - id:", id, "negocioId:", negocioId);

    const clienteId = parseInt(id);
    if (isNaN(clienteId)) {
      console.warn("Invalid client ID:", id);
      return null;
    }

    const negocioIdNum = parseInt(negocioId);
    if (isNaN(negocioIdNum)) {
      console.warn("Invalid negocioId:", negocioId);
      return null;
    }

    const result = await query(
      `
      SELECT 
        p.id_persona as id,
        p.nombre,
        p.apellido as apellidos,
        p.celular,
        TO_CHAR(p.fecha_nacimiento, 'YYYY-MM-DD') as fecha_nacimiento,
        pn.carnet_persona as carnet,
        tc.nombre_tipo_cliente as tipo_cliente,
        tc.id_tipo_cliente as tipo_cliente_id,
        cz.nombre_zona as zona_cliente,
        cz.id_cliente_zona as zona_cliente_id
      FROM persona p
      INNER JOIN persona_negocio pn ON p.id_persona = pn.id_persona
      LEFT JOIN tipo_cliente tc ON p.id_tipo_cliente = tc.id_tipo_cliente
      LEFT JOIN cliente_zona cz ON p.id_cliente_zona = cz.id_cliente_zona
      WHERE p.id_persona = $1 AND pn.id_negocio = $2
      AND p.estado = 'activo'
      `,
      [clienteId, negocioIdNum]
    );

    return result.rows[0] || null;
  } catch (error) {
    console.error("Error en getClienteById service:", error);
    return null;
  }
};

const createCliente = async (data, negocioId) => {
  try {
    const { nombre, apellidos, carnet, celular, fechaNacimiento, tipoClienteId, zonaClienteId } = data;

    console.log("🔍 createCliente service - nombre:", nombre, "negocioId:", negocioId);
    console.log("📦 createCliente - data recibida:", data);

    const negocioIdNum = parseInt(negocioId);
    if (isNaN(negocioIdNum)) {
      throw new Error("ID de negocio inválido");
    }

    const existing = await query(
      'SELECT id_persona_negocio FROM persona_negocio WHERE id_negocio = $1 AND carnet_persona = $2',
      [negocioIdNum, carnet]
    );

    if (existing.rows.length > 0) {
      throw new Error("Ya existe un cliente con este carnet");
    }

    let tipoClienteIdFinal = null;
    if (tipoClienteId) {
      const tipoResult = await query(
        'SELECT id_tipo_cliente FROM tipo_cliente WHERE id_tipo_cliente = $1 AND id_negocio = $2',
        [tipoClienteId, negocioIdNum]
      );
      if (tipoResult.rows.length === 0) {
        throw new Error("El tipo de cliente no existe o no pertenece a este negocio");
      }
      tipoClienteIdFinal = tipoClienteId;
    }

    let zonaClienteIdFinal = null;
    if (zonaClienteId) {
      const zonaResult = await query(
        'SELECT id_cliente_zona FROM cliente_zona WHERE id_cliente_zona = $1 AND id_negocio = $2 AND estado = $3',
        [zonaClienteId, negocioIdNum, 'activo']
      );
      if (zonaResult.rows.length === 0) {
        throw new Error("La zona de cliente no existe o no pertenece a este negocio");
      }
      zonaClienteIdFinal = zonaClienteId;
    }

    const personaResult = await query(
      `
      INSERT INTO persona (nombre, apellido, celular, fecha_nacimiento, id_tipo_cliente, id_cliente_zona)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id_persona
      `,
      [nombre.trim(), apellidos.trim(), celular.trim(), fechaNacimiento || null, tipoClienteIdFinal, zonaClienteIdFinal]
    );

    const idPersona = personaResult.rows[0].id_persona;

    await query(
      'INSERT INTO persona_negocio (id_persona, id_negocio, carnet_persona) VALUES ($1, $2, $3)',
      [idPersona, negocioIdNum, carnet.trim()]
    );

    return await getClienteById(idPersona, negocioId);
  } catch (error) {
    console.error("Error en createCliente service:", error);
    throw new Error(error.message || "Error al crear el cliente");
  }
};

const updateCliente = async (id, data, negocioId) => {
  try {
    const { nombre, apellidos, carnet, celular, fechaNacimiento, tipoClienteId, zonaClienteId } = data;

    console.log("🔍 updateCliente service - id:", id, "negocioId:", negocioId);
    console.log("📦 updateCliente - data recibida:", data);

    const clienteId = parseInt(id);
    if (isNaN(clienteId)) {
      throw new Error("ID de cliente inválido");
    }

    const negocioIdNum = parseInt(negocioId);
    if (isNaN(negocioIdNum)) {
      throw new Error("ID de negocio inválido");
    }

    const existing = await getClienteById(clienteId, negocioId);
    if (!existing) {
      throw new Error("Cliente no encontrado");
    }

    if (carnet && carnet !== existing.carnet) {
      const carnetExists = await query(
        'SELECT id_persona_negocio FROM persona_negocio WHERE id_negocio = $1 AND carnet_persona = $2 AND id_persona != $3',
        [negocioIdNum, carnet, clienteId]
      );
      if (carnetExists.rows.length > 0) {
        throw new Error("Ya existe un cliente con este carnet");
      }
    }

    let tipoClienteIdFinal = null;
    if (tipoClienteId) {
      const tipoResult = await query(
        'SELECT id_tipo_cliente FROM tipo_cliente WHERE id_tipo_cliente = $1 AND id_negocio = $2',
        [tipoClienteId, negocioIdNum]
      );
      if (tipoResult.rows.length === 0) {
        throw new Error("El tipo de cliente no existe o no pertenece a este negocio");
      }
      tipoClienteIdFinal = tipoClienteId;
    }

    let zonaClienteIdFinal = null;
    if (zonaClienteId) {
      const zonaResult = await query(
        'SELECT id_cliente_zona FROM cliente_zona WHERE id_cliente_zona = $1 AND id_negocio = $2 AND estado = $3',
        [zonaClienteId, negocioIdNum, 'activo']
      );
      if (zonaResult.rows.length === 0) {
        throw new Error("La zona de cliente no existe o no pertenece a este negocio");
      }
      zonaClienteIdFinal = zonaClienteId;
    }

    await query(
      `
      UPDATE persona 
      SET 
        nombre = $1,
        apellido = $2,
        celular = $3,
        fecha_nacimiento = $4,
        id_tipo_cliente = $5,
        id_cliente_zona = $6
      WHERE id_persona = $7
      `,
      [nombre.trim(), apellidos.trim(), celular.trim(), fechaNacimiento || null, tipoClienteIdFinal, zonaClienteIdFinal, clienteId]
    );

    if (carnet && carnet !== existing.carnet) {
      await query(
        'UPDATE persona_negocio SET carnet_persona = $1 WHERE id_persona = $2 AND id_negocio = $3',
        [carnet.trim(), clienteId, negocioIdNum]
      );
    }

    return await getClienteById(clienteId, negocioId);
  } catch (error) {
    console.error("Error en updateCliente service:", error);
    throw new Error(error.message || "Error al actualizar el cliente");
  }
};

const deleteCliente = async (id, negocioId) => {
  try {
    console.log("🔍 deleteCliente service - id:", id, "negocioId:", negocioId);

    const clienteId = parseInt(id);
    if (isNaN(clienteId)) {
      throw new Error("ID de cliente inválido");
    }

    const negocioIdNum = parseInt(negocioId);
    if (isNaN(negocioIdNum)) {
      throw new Error("ID de negocio inválido");
    }

    const existing = await getClienteById(clienteId, negocioId);
    if (!existing) {
      throw new Error("Cliente no encontrado");
    }

    const pedidosResult = await query(
      'SELECT COUNT(*) as count FROM pedido WHERE id_cliente = $1',
      [clienteId]
    );

    const hasPedidos = parseInt(pedidosResult.rows[0].count) > 0;

    if (hasPedidos) {
      await query(
        'UPDATE persona SET estado = $1 WHERE id_persona = $2',
        ['inactivo', clienteId]
      );
      return true;
    } else {
      await query(
        'DELETE FROM persona_negocio WHERE id_persona = $1 AND id_negocio = $2',
        [clienteId, negocioIdNum]
      );
      
      await query(
        'DELETE FROM persona WHERE id_persona = $1',
        [clienteId]
      );
      return true;
    }
  } catch (error) {
    console.error("Error en deleteCliente service:", error);
    throw new Error(error.message || "Error al eliminar el cliente");
  }
};

// ============================================
// MEDIDAS DE CLIENTES
// ============================================

const getClienteMedidas = async (id, negocioId) => {
  try {
    console.log("🔍 getClienteMedidas service - id:", id, "negocioId:", negocioId);

    const clienteId = parseInt(id);
    if (isNaN(clienteId)) {
      console.warn("Invalid client ID:", id);
      return null;
    }

    const negocioIdNum = parseInt(negocioId);
    if (isNaN(negocioIdNum)) {
      console.warn("Invalid negocioId:", negocioId);
      return null;
    }

    const cliente = await getClienteById(clienteId, negocioId);
    if (!cliente) {
      throw new Error("Cliente no encontrado");
    }

    const result = await query(
      `
      SELECT 
        m.id_medida,
        m.lejos_od_esfera as "lejosDerecho.esfera",
        m.lejos_od_cilindro as "lejosDerecho.cilindro",
        m.lejos_od_eje as "lejosDerecho.eje",
        m.lejos_oi_esfera as "lejosIzquierdo.esfera",
        m.lejos_oi_cilindro as "lejosIzquierdo.cilindro",
        m.lejos_oi_eje as "lejosIzquierdo.eje",
        m.cerca_od_esfera as "cercaDerecho.esfera",
        m.cerca_od_cilindro as "cercaDerecho.cilindro",
        m.cerca_od_eje as "cercaDerecho.eje",
        m.cerca_oi_esfera as "cercaIzquierdo.esfera",
        m.cerca_oi_cilindro as "cercaIzquierdo.cilindro",
        m.cerca_oi_eje as "cercaIzquierdo.eje",
        m.dip,
        m.add_medida as add
      FROM medida m
      INNER JOIN persona p ON p.id_medida = m.id_medida
      WHERE p.id_persona = $1
      `,
      [clienteId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    
    return {
      lejosDerecho: {
        esfera: row["lejosDerecho.esfera"] || "",
        cilindro: row["lejosDerecho.cilindro"] || "",
        eje: row["lejosDerecho.eje"] || "",
        av: ""
      },
      lejosIzquierdo: {
        esfera: row["lejosIzquierdo.esfera"] || "",
        cilindro: row["lejosIzquierdo.cilindro"] || "",
        eje: row["lejosIzquierdo.eje"] || "",
        av: ""
      },
      cercaDerecho: {
        esfera: row["cercaDerecho.esfera"] || "",
        cilindro: row["cercaDerecho.cilindro"] || "",
        eje: row["cercaDerecho.eje"] || "",
        av: ""
      },
      cercaIzquierdo: {
        esfera: row["cercaIzquierdo.esfera"] || "",
        cilindro: row["cercaIzquierdo.cilindro"] || "",
        eje: row["cercaIzquierdo.eje"] || "",
        av: ""
      },
      dip: row.dip || "",
      add: row.add || ""
    };
  } catch (error) {
    console.error("Error en getClienteMedidas service:", error);
    return null;
  }
};

const saveClienteMedidas = async (id, data, negocioId) => {
  try {
    console.log("🔍 saveClienteMedidas service - id:", id, "negocioId:", negocioId);

    const clienteId = parseInt(id);
    if (isNaN(clienteId)) {
      throw new Error("ID de cliente inválido");
    }

    const negocioIdNum = parseInt(negocioId);
    if (isNaN(negocioIdNum)) {
      throw new Error("ID de negocio inválido");
    }

    const cliente = await getClienteById(clienteId, negocioId);
    if (!cliente) {
      throw new Error("Cliente no encontrado");
    }

    const { lejosDerecho, lejosIzquierdo, cercaDerecho, cercaIzquierdo, dip, add } = data;

    const existingMedidas = await query(
      'SELECT id_medida FROM persona WHERE id_persona = $1',
      [clienteId]
    );

    let idMedida;

    if (existingMedidas.rows.length > 0 && existingMedidas.rows[0].id_medida) {
      idMedida = existingMedidas.rows[0].id_medida;
      await query(
        `
        UPDATE medida SET
          lejos_od_esfera = $1,
          lejos_od_cilindro = $2,
          lejos_od_eje = $3,
          lejos_oi_esfera = $4,
          lejos_oi_cilindro = $5,
          lejos_oi_eje = $6,
          cerca_od_esfera = $7,
          cerca_od_cilindro = $8,
          cerca_od_eje = $9,
          cerca_oi_esfera = $10,
          cerca_oi_cilindro = $11,
          cerca_oi_eje = $12,
          dip = $13,
          add_medida = $14
        WHERE id_medida = $15
        `,
        [
          lejosDerecho?.esfera || null,
          lejosDerecho?.cilindro || null,
          lejosDerecho?.eje || null,
          lejosIzquierdo?.esfera || null,
          lejosIzquierdo?.cilindro || null,
          lejosIzquierdo?.eje || null,
          cercaDerecho?.esfera || null,
          cercaDerecho?.cilindro || null,
          cercaDerecho?.eje || null,
          cercaIzquierdo?.esfera || null,
          cercaIzquierdo?.cilindro || null,
          cercaIzquierdo?.eje || null,
          dip || null,
          add || null,
          idMedida
        ]
      );
    } else {
      const result = await query(
        `
        INSERT INTO medida (
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
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        RETURNING id_medida
        `,
        [
          lejosDerecho?.esfera || null,
          lejosDerecho?.cilindro || null,
          lejosDerecho?.eje || null,
          lejosIzquierdo?.esfera || null,
          lejosIzquierdo?.cilindro || null,
          lejosIzquierdo?.eje || null,
          cercaDerecho?.esfera || null,
          cercaDerecho?.cilindro || null,
          cercaDerecho?.eje || null,
          cercaIzquierdo?.esfera || null,
          cercaIzquierdo?.cilindro || null,
          cercaIzquierdo?.eje || null,
          dip || null,
          add || null
        ]
      );
      idMedida = result.rows[0].id_medida;

      await query(
        'UPDATE persona SET id_medida = $1 WHERE id_persona = $2',
        [idMedida, clienteId]
      );
    }

    return await getClienteMedidas(clienteId, negocioId);
  } catch (error) {
    console.error("Error en saveClienteMedidas service:", error);
    throw new Error(error.message || "Error al guardar medidas");
  }
};

const deleteClienteMedidas = async (id, negocioId) => {
  try {
    console.log("🔍 deleteClienteMedidas service - id:", id, "negocioId:", negocioId);

    const clienteId = parseInt(id);
    if (isNaN(clienteId)) {
      throw new Error("ID de cliente inválido");
    }

    const negocioIdNum = parseInt(negocioId);
    if (isNaN(negocioIdNum)) {
      throw new Error("ID de negocio inválido");
    }

    const cliente = await getClienteById(clienteId, negocioId);
    if (!cliente) {
      throw new Error("Cliente no encontrado");
    }

    const medidaResult = await query(
      'SELECT id_medida FROM persona WHERE id_persona = $1',
      [clienteId]
    );

    if (medidaResult.rows.length > 0 && medidaResult.rows[0].id_medida) {
      const idMedida = medidaResult.rows[0].id_medida;
      
      await query(
        'UPDATE persona SET id_medida = NULL WHERE id_persona = $1',
        [clienteId]
      );

      await query(
        'DELETE FROM medida WHERE id_medida = $1',
        [idMedida]
      );
    }

    return true;
  } catch (error) {
    console.error("Error en deleteClienteMedidas service:", error);
    throw new Error(error.message || "Error al eliminar medidas");
  }
};

// ============================================
// TIPOS DE CLIENTE
// ============================================

const getTiposCliente = async (negocioId) => {
  try {
    console.log("🔍 getTiposCliente service - negocioId:", negocioId);

    const negocioIdNum = parseInt(negocioId);
    if (isNaN(negocioIdNum)) {
      console.warn("Invalid negocioId:", negocioId);
      return [];
    }

    const result = await query(
      'SELECT id_tipo_cliente as id, nombre_tipo_cliente as nombre FROM tipo_cliente WHERE id_negocio = $1 ORDER BY nombre_tipo_cliente',
      [negocioIdNum]
    );

    return result.rows || [];
  } catch (error) {
    console.error("Error en getTiposCliente service:", error);
    return [];
  }
};

const createTipoCliente = async (nombre, negocioId) => {
  try {
    console.log("🔍 createTipoCliente service - nombre:", nombre, "negocioId:", negocioId);

    const negocioIdNum = parseInt(negocioId);
    if (isNaN(negocioIdNum)) {
      throw new Error("ID de negocio inválido");
    }

    const existing = await query(
      'SELECT id_tipo_cliente FROM tipo_cliente WHERE id_negocio = $1 AND nombre_tipo_cliente = $2',
      [negocioIdNum, nombre]
    );

    if (existing.rows.length > 0) {
      throw new Error("Ya existe un tipo de cliente con este nombre");
    }

    const result = await query(
      'INSERT INTO tipo_cliente (nombre_tipo_cliente, id_negocio) VALUES ($1, $2) RETURNING id_tipo_cliente as id, nombre_tipo_cliente as nombre',
      [nombre, negocioIdNum]
    );

    return result.rows[0];
  } catch (error) {
    console.error("Error en createTipoCliente service:", error);
    throw new Error(error.message || "Error al crear el tipo de cliente");
  }
};

const updateTipoCliente = async (id, nombre, negocioId) => {
  try {
    console.log("🔍 updateTipoCliente service - id:", id, "nombre:", nombre, "negocioId:", negocioId);

    const tipoId = parseInt(id);
    if (isNaN(tipoId)) {
      throw new Error("ID de tipo inválido");
    }

    const negocioIdNum = parseInt(negocioId);
    if (isNaN(negocioIdNum)) {
      throw new Error("ID de negocio inválido");
    }

    const existing = await query(
      'SELECT id_tipo_cliente FROM tipo_cliente WHERE id_tipo_cliente = $1 AND id_negocio = $2',
      [tipoId, negocioIdNum]
    );

    if (existing.rows.length === 0) {
      throw new Error("Tipo de cliente no encontrado");
    }

    const duplicate = await query(
      'SELECT id_tipo_cliente FROM tipo_cliente WHERE id_negocio = $1 AND nombre_tipo_cliente = $2 AND id_tipo_cliente != $3',
      [negocioIdNum, nombre, tipoId]
    );

    if (duplicate.rows.length > 0) {
      throw new Error("Ya existe un tipo de cliente con este nombre");
    }

    const result = await query(
      'UPDATE tipo_cliente SET nombre_tipo_cliente = $1 WHERE id_tipo_cliente = $2 RETURNING id_tipo_cliente as id, nombre_tipo_cliente as nombre',
      [nombre, tipoId]
    );

    return result.rows[0];
  } catch (error) {
    console.error("Error en updateTipoCliente service:", error);
    throw new Error(error.message || "Error al actualizar el tipo de cliente");
  }
};

const deleteTipoCliente = async (id, negocioId) => {
  try {
    console.log("🔍 deleteTipoCliente service - id:", id, "negocioId:", negocioId);

    const tipoId = parseInt(id);
    if (isNaN(tipoId)) {
      throw new Error("ID de tipo inválido");
    }

    const negocioIdNum = parseInt(negocioId);
    if (isNaN(negocioIdNum)) {
      throw new Error("ID de negocio inválido");
    }

    const existing = await query(
      'SELECT id_tipo_cliente FROM tipo_cliente WHERE id_tipo_cliente = $1 AND id_negocio = $2',
      [tipoId, negocioIdNum]
    );

    if (existing.rows.length === 0) {
      throw new Error("Tipo de cliente no encontrado");
    }

    const clientesUsing = await query(
      'SELECT COUNT(*) as count FROM persona WHERE id_tipo_cliente = $1',
      [tipoId]
    );

    if (parseInt(clientesUsing.rows[0].count) > 0) {
      throw new Error("No se puede eliminar el tipo porque hay clientes que lo usan");
    }

    await query(
      'DELETE FROM tipo_cliente WHERE id_tipo_cliente = $1',
      [tipoId]
    );

    return true;
  } catch (error) {
    console.error("Error en deleteTipoCliente service:", error);
    throw new Error(error.message || "Error al eliminar el tipo de cliente");
  }
};

// ============================================
// ZONAS DE CLIENTE
// ============================================

const getZonasCliente = async (negocioId) => {
  try {
    console.log("🔍 getZonasCliente service - negocioId:", negocioId);

    const negocioIdNum = parseInt(negocioId);
    if (isNaN(negocioIdNum)) {
      console.warn("Invalid negocioId:", negocioId);
      return [];
    }

    const result = await query(
      'SELECT id_cliente_zona as id, nombre_zona as nombre FROM cliente_zona WHERE id_negocio = $1 AND estado = $2 ORDER BY nombre_zona',
      [negocioIdNum, 'activo']
    );

    return result.rows || [];
  } catch (error) {
    console.error("Error en getZonasCliente service:", error);
    return [];
  }
};

const createZonaCliente = async (nombre, negocioId) => {
  try {
    console.log("🔍 createZonaCliente service - nombre:", nombre, "negocioId:", negocioId);

    const negocioIdNum = parseInt(negocioId);
    if (isNaN(negocioIdNum)) {
      throw new Error("ID de negocio inválido");
    }

    const existing = await query(
      'SELECT id_cliente_zona FROM cliente_zona WHERE id_negocio = $1 AND nombre_zona = $2 AND estado = $3',
      [negocioIdNum, nombre, 'activo']
    );

    if (existing.rows.length > 0) {
      throw new Error("Ya existe una zona de cliente con este nombre");
    }

    const result = await query(
      'INSERT INTO cliente_zona (nombre_zona, id_negocio) VALUES ($1, $2) RETURNING id_cliente_zona as id, nombre_zona as nombre',
      [nombre, negocioIdNum]
    );

    return result.rows[0];
  } catch (error) {
    console.error("Error en createZonaCliente service:", error);
    throw new Error(error.message || "Error al crear la zona de cliente");
  }
};

const updateZonaCliente = async (id, nombre, negocioId) => {
  try {
    console.log("🔍 updateZonaCliente service - id:", id, "nombre:", nombre, "negocioId:", negocioId);

    const zonaId = parseInt(id);
    if (isNaN(zonaId)) {
      throw new Error("ID de zona inválido");
    }

    const negocioIdNum = parseInt(negocioId);
    if (isNaN(negocioIdNum)) {
      throw new Error("ID de negocio inválido");
    }

    const existing = await query(
      'SELECT id_cliente_zona FROM cliente_zona WHERE id_cliente_zona = $1 AND id_negocio = $2 AND estado = $3',
      [zonaId, negocioIdNum, 'activo']
    );

    if (existing.rows.length === 0) {
      throw new Error("Zona de cliente no encontrada");
    }

    const duplicate = await query(
      'SELECT id_cliente_zona FROM cliente_zona WHERE id_negocio = $1 AND nombre_zona = $2 AND id_cliente_zona != $3 AND estado = $4',
      [negocioIdNum, nombre, zonaId, 'activo']
    );

    if (duplicate.rows.length > 0) {
      throw new Error("Ya existe una zona de cliente con este nombre");
    }

    const result = await query(
      'UPDATE cliente_zona SET nombre_zona = $1 WHERE id_cliente_zona = $2 RETURNING id_cliente_zona as id, nombre_zona as nombre',
      [nombre, zonaId]
    );

    return result.rows[0];
  } catch (error) {
    console.error("Error en updateZonaCliente service:", error);
    throw new Error(error.message || "Error al actualizar la zona de cliente");
  }
};

const deleteZonaCliente = async (id, negocioId) => {
  try {
    console.log("🔍 deleteZonaCliente service - id:", id, "negocioId:", negocioId);

    const zonaId = parseInt(id);
    if (isNaN(zonaId)) {
      throw new Error("ID de zona inválido");
    }

    const negocioIdNum = parseInt(negocioId);
    if (isNaN(negocioIdNum)) {
      throw new Error("ID de negocio inválido");
    }

    const existing = await query(
      'SELECT id_cliente_zona FROM cliente_zona WHERE id_cliente_zona = $1 AND id_negocio = $2 AND estado = $3',
      [zonaId, negocioIdNum, 'activo']
    );

    if (existing.rows.length === 0) {
      throw new Error("Zona de cliente no encontrada");
    }

    const clientesUsing = await query(
      'SELECT COUNT(*) as count FROM persona WHERE id_cliente_zona = $1',
      [zonaId]
    );

    if (parseInt(clientesUsing.rows[0].count) > 0) {
      throw new Error("No se puede eliminar la zona porque hay clientes que la usan");
    }

    await query(
      'UPDATE cliente_zona SET estado = $1 WHERE id_cliente_zona = $2',
      ['eliminado', zonaId]
    );

    return true;
  } catch (error) {
    console.error("Error en deleteZonaCliente service:", error);
    throw new Error(error.message || "Error al eliminar la zona de cliente");
  }
};

module.exports = {
  getClientes,
  searchClientes,
  getClienteById,
  createCliente,
  updateCliente,
  deleteCliente,
  getClienteMedidas,
  saveClienteMedidas,
  deleteClienteMedidas,
  getTiposCliente,
  createTipoCliente,
  updateTipoCliente,
  deleteTipoCliente,
  getZonasCliente,
  createZonaCliente,
  updateZonaCliente,
  deleteZonaCliente
};