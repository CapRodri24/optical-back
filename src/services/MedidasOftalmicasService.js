// src/services/MedidasOftalmicasService.js
const { query } = require("../../db");

/**
 * Obtener las medidas oftálmicas de un cliente
 */
const getMedidas = async (clientId) => {
  try {
    console.log("🔍 getMedidas service - clientId:", clientId);

    const clienteId = parseInt(clientId);
    if (isNaN(clienteId)) {
      throw new Error("ID de cliente inválido");
    }

    // Verificar que el cliente existe
    const clienteResult = await query(
      'SELECT id_persona FROM persona WHERE id_persona = $1 AND estado = $2',
      [clienteId, 'activo']
    );

    if (clienteResult.rows.length === 0) {
      throw new Error("Cliente no encontrado");
    }

    // Obtener las medidas del cliente
    const result = await query(
      `
      SELECT 
        p.id_persona as client_id,
        m.lejos_od_esfera,
        m.lejos_od_cilindro,
        m.lejos_od_eje,
        m.lejos_oi_esfera,
        m.lejos_oi_cilindro,
        m.lejos_oi_eje,
        m.cerca_od_esfera,
        m.cerca_od_cilindro,
        m.cerca_od_eje,
        m.cerca_oi_esfera,
        m.cerca_oi_cilindro,
        m.cerca_oi_eje,
        m.dip,
        m.add_medida as add
      FROM persona p
      LEFT JOIN medida m ON p.id_medida = m.id_medida
      WHERE p.id_persona = $1
      `,
      [clienteId]
    );

    if (result.rows.length === 0 || !result.rows[0].lejos_od_esfera) {
      return null;
    }

    const row = result.rows[0];

    return {
      clientId: row.client_id.toString(),
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
      add: row.add || ""
    };
  } catch (error) {
    console.error("Error en getMedidas service:", error);
    throw new Error(error.message || "Error al obtener las medidas");
  }
};

/**
 * Calcular medidas de cerca basado en ADD
 */
const calcularMedidasCerca = (lejosDerecho, lejosIzquierdo, addValue) => {
  if (!addValue || addValue === '+' || addValue === '-') {
    return {
      cercaDerecho: { esfera: "", cilindro: "", eje: "", av: "" },
      cercaIzquierdo: { esfera: "", cilindro: "", eje: "", av: "" }
    };
  }

  const addNum = parseFloat(addValue);
  if (isNaN(addNum)) {
    return {
      cercaDerecho: { esfera: "", cilindro: "", eje: "", av: "" },
      cercaIzquierdo: { esfera: "", cilindro: "", eje: "", av: "" }
    };
  }

  const result = {
    cercaDerecho: { ...lejosDerecho },
    cercaIzquierdo: { ...lejosIzquierdo }
  };

  // Calcular esfera de cerca = esfera_lejos + ADD
  if (lejosDerecho.esfera) {
    const farNum = parseFloat(lejosDerecho.esfera);
    if (!isNaN(farNum)) {
      result.cercaDerecho.esfera = (farNum + addNum).toFixed(2);
    }
  }

  if (lejosIzquierdo.esfera) {
    const farNum = parseFloat(lejosIzquierdo.esfera);
    if (!isNaN(farNum)) {
      result.cercaIzquierdo.esfera = (farNum + addNum).toFixed(2);
    }
  }

  return result;
};

/**
 * Guardar o actualizar las medidas oftálmicas de un cliente
 */
const saveMedidas = async (data) => {
  try {
    const { 
      clientId, 
      lejosDerecho, 
      lejosIzquierdo, 
      cercaDerecho, 
      cercaIzquierdo, 
      dip, 
      add
    } = data;

    console.log("🔍 saveMedidas service - clientId:", clientId);
    console.log("📊 ADD recibido:", add);

    const clienteId = parseInt(clientId);
    if (isNaN(clienteId)) {
      throw new Error("ID de cliente inválido");
    }

    // ✅ VALIDAR QUE ADD SEA OBLIGATORIO
    if (!add || add === '+' || add === '-') {
      throw new Error("El campo ADD es obligatorio para guardar las medidas");
    }

    const addNum = parseFloat(add);
    if (isNaN(addNum)) {
      throw new Error("El valor de ADD no es válido");
    }

    // Verificar que el cliente existe
    const clienteResult = await query(
      'SELECT id_persona, id_medida FROM persona WHERE id_persona = $1 AND estado = $2',
      [clienteId, 'activo']
    );

    if (clienteResult.rows.length === 0) {
      throw new Error("Cliente no encontrado");
    }

    const currentIdMedida = clienteResult.rows[0].id_medida;

    // ✅ Calcular medidas de cerca automáticamente si no vienen del frontend
    let finalCercaDerecho = cercaDerecho;
    let finalCercaIzquierdo = cercaIzquierdo;

    // Si el frontend no envió medidas de cerca o están vacías, las calculamos
    const tieneCercaDerecho = cercaDerecho?.esfera && cercaDerecho.esfera !== "";
    const tieneCercaIzquierdo = cercaIzquierdo?.esfera && cercaIzquierdo.esfera !== "";

    if (!tieneCercaDerecho || !tieneCercaIzquierdo) {
      const medidasCalculadas = calcularMedidasCerca(lejosDerecho, lejosIzquierdo, add);
      if (!tieneCercaDerecho) {
        finalCercaDerecho = medidasCalculadas.cercaDerecho;
      }
      if (!tieneCercaIzquierdo) {
        finalCercaIzquierdo = medidasCalculadas.cercaIzquierdo;
      }
      console.log("📊 Medidas de cerca calculadas automáticamente");
    }

    // Preparar datos de medidas
    const medidas = {
      lejos_od_esfera: lejosDerecho?.esfera || null,
      lejos_od_cilindro: lejosDerecho?.cilindro || null,
      lejos_od_eje: lejosDerecho?.eje || null,
      lejos_oi_esfera: lejosIzquierdo?.esfera || null,
      lejos_oi_cilindro: lejosIzquierdo?.cilindro || null,
      lejos_oi_eje: lejosIzquierdo?.eje || null,
      cerca_od_esfera: finalCercaDerecho?.esfera || null,
      cerca_od_cilindro: finalCercaDerecho?.cilindro || null,
      cerca_od_eje: finalCercaDerecho?.eje || null,
      cerca_oi_esfera: finalCercaIzquierdo?.esfera || null,
      cerca_oi_cilindro: finalCercaIzquierdo?.cilindro || null,
      cerca_oi_eje: finalCercaIzquierdo?.eje || null,
      dip: dip || null,
      add_medida: add
    };

    let idMedida;

    if (currentIdMedida) {
      // Actualizar medidas existentes
      idMedida = currentIdMedida;
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
          medidas.lejos_od_esfera,
          medidas.lejos_od_cilindro,
          medidas.lejos_od_eje,
          medidas.lejos_oi_esfera,
          medidas.lejos_oi_cilindro,
          medidas.lejos_oi_eje,
          medidas.cerca_od_esfera,
          medidas.cerca_od_cilindro,
          medidas.cerca_od_eje,
          medidas.cerca_oi_esfera,
          medidas.cerca_oi_cilindro,
          medidas.cerca_oi_eje,
          medidas.dip,
          medidas.add_medida,
          idMedida
        ]
      );
    } else {
      // Crear nuevas medidas
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
          medidas.lejos_od_esfera,
          medidas.lejos_od_cilindro,
          medidas.lejos_od_eje,
          medidas.lejos_oi_esfera,
          medidas.lejos_oi_cilindro,
          medidas.lejos_oi_eje,
          medidas.cerca_od_esfera,
          medidas.cerca_od_cilindro,
          medidas.cerca_od_eje,
          medidas.cerca_oi_esfera,
          medidas.cerca_oi_cilindro,
          medidas.cerca_oi_eje,
          medidas.dip,
          medidas.add_medida
        ]
      );
      idMedida = result.rows[0].id_medida;

      // Asociar las medidas al cliente
      await query(
        'UPDATE persona SET id_medida = $1 WHERE id_persona = $2',
        [idMedida, clienteId]
      );
    }

    // Retornar las medidas guardadas
    return await getMedidas(clienteId);

  } catch (error) {
    console.error("Error en saveMedidas service:", error);
    throw new Error(error.message || "Error al guardar las medidas");
  }
};

/**
 * Eliminar las medidas oftálmicas de un cliente
 */
const deleteMedidas = async (clientId) => {
  try {
    console.log("🔍 deleteMedidas service - clientId:", clientId);

    const clienteId = parseInt(clientId);
    if (isNaN(clienteId)) {
      throw new Error("ID de cliente inválido");
    }

    // Verificar que el cliente existe
    const clienteResult = await query(
      'SELECT id_persona, id_medida FROM persona WHERE id_persona = $1 AND estado = $2',
      [clienteId, 'activo']
    );

    if (clienteResult.rows.length === 0) {
      throw new Error("Cliente no encontrado");
    }

    const idMedida = clienteResult.rows[0].id_medida;

    if (!idMedida) {
      throw new Error("El cliente no tiene medidas asociadas");
    }

    // Desasociar la medida del cliente
    await query(
      'UPDATE persona SET id_medida = NULL WHERE id_persona = $1',
      [clienteId]
    );

    // Eliminar la medida
    await query(
      'DELETE FROM medida WHERE id_medida = $1',
      [idMedida]
    );

    return true;
  } catch (error) {
    console.error("Error en deleteMedidas service:", error);
    throw new Error(error.message || "Error al eliminar las medidas");
  }
};

module.exports = {
  getMedidas,
  saveMedidas,
  deleteMedidas
};