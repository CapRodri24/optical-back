// src/services/organicoService.js
const { query } = require("../../db");

const getOrganicos = async (userId, userRole, negocioId = null) => {
  try {
    console.log("=== getOrganicos Service ===");
    console.log("userId:", userId);
    console.log("userRole:", userRole);
    console.log("negocioId:", negocioId);

    let negocioIds = [];

    // Si se pasa negocioId, usarlo directamente
    if (negocioId) {
      negocioIds = [parseInt(negocioId)];
      console.log("Usando negocioId específico:", negocioIds);
    } else {
      // Obtener el negocio del usuario
      let negocioQuery = "";
      let negocioParams = [];

      if (userRole === 'Spider Admin') {
        negocioQuery = `
          SELECT id_negocio 
          FROM tienda 
          WHERE estado = 'activo'
        `;
        negocioParams = [];
      } else {
        negocioQuery = `
          SELECT DISTINCT t.id_negocio 
          FROM usuario_tienda ut
          INNER JOIN tienda t ON ut.id_tienda = t.id_tienda
          WHERE ut.id_usuario = $1 AND t.estado = 'activo'
        `;
        negocioParams = [userId];
      }

      const negocioResult = await query(negocioQuery, negocioParams);
      negocioIds = negocioResult.rows.map(row => row.id_negocio);
    }

    console.log("Negocios encontrados:", negocioIds);

    if (negocioIds.length === 0) {
      console.log("No se encontraron negocios");
      return [];
    }

    // Obtener orgánicos activos de los negocios
    const organicosQuery = `
      SELECT 
        id_organico,
        nombre_organico as nombre,
        estado
      FROM organico
      WHERE id_negocio = ANY($1::integer[])
      AND estado = 'activo'
      ORDER BY nombre_organico
    `;

    const organicosResult = await query(organicosQuery, [negocioIds]);

    console.log("Orgánicos encontrados:", organicosResult.rows.length);

    const organicos = [];
    for (const org of organicosResult.rows) {
      const rangosQuery = `
        SELECT 
          id_rango_organico as id,
          precio_compra as "precioCompra",
          precio_venta as "precioVenta",
          inicio as "esferaInicio",
          fin as "esferaFin"
        FROM rango_organico
        WHERE id_organico = $1
        ORDER BY inicio ASC
      `;

      const rangosResult = await query(rangosQuery, [org.id_organico]);

      const rangos = rangosResult.rows.map(r => ({
        id: String(r.id),
        esferaInicio: parseFloat(r.esferaInicio),
        esferaFin: parseFloat(r.esferaFin),
        cilindroInicio: -parseFloat(r.esferaInicio),
        cilindroFin: -parseFloat(r.esferaFin),
        precioCompra: parseFloat(r.precioCompra),
        precioVenta: parseFloat(r.precioVenta)
      }));

      organicos.push({
        id: String(org.id_organico),
        nombre: org.nombre,
        estado: org.estado,
        rangos: rangos
      });
    }

    console.log("Total de orgánicos retornados:", organicos.length);
    return organicos;
  } catch (error) {
    console.error("Error en getOrganicos:", error);
    return [];
  }
};

const createOrganico = async (userId, userRole, data) => {
  try {
    const { nombre, rangos } = data;

    console.log("=== createOrganico Service ===");
    console.log("userId:", userId);
    console.log("nombre:", nombre);
    console.log("rangos:", rangos.length);

    // Obtener el negocio del usuario
    let negocioQuery = "";
    let negocioParams = [];

    if (userRole === 'Spider Admin') {
      negocioQuery = `
        SELECT id_negocio 
        FROM tienda 
        WHERE estado = 'activo'
        LIMIT 1
      `;
      negocioParams = [];
    } else {
      negocioQuery = `
        SELECT t.id_negocio 
        FROM usuario_tienda ut
        INNER JOIN tienda t ON ut.id_tienda = t.id_tienda
        WHERE ut.id_usuario = $1 AND t.estado = 'activo'
        LIMIT 1
      `;
      negocioParams = [userId];
    }

    const negocioResult = await query(negocioQuery, negocioParams);

    if (negocioResult.rows.length === 0) {
      throw new Error("No tienes tiendas activas para crear orgánicos");
    }

    const negocioId = negocioResult.rows[0].id_negocio;
    console.log("negocioId:", negocioId);

    // Verificar si ya existe un orgánico con el mismo nombre en este negocio
    const checkDuplicateQuery = `
      SELECT id_organico 
      FROM organico 
      WHERE nombre_organico = $1 AND id_negocio = $2 AND estado = 'activo'
    `;

    const duplicateResult = await query(checkDuplicateQuery, [nombre, negocioId]);

    if (duplicateResult.rows.length > 0) {
      throw new Error(`Ya existe un orgánico con el nombre "${nombre}" en este negocio`);
    }

    // 1. Insertar el orgánico
    const insertOrganicoQuery = `
      INSERT INTO organico (nombre_organico, id_negocio, estado)
      VALUES ($1, $2, 'activo')
      RETURNING id_organico
    `;

    const organicoResult = await query(insertOrganicoQuery, [nombre, negocioId]);
    const organicoId = organicoResult.rows[0].id_organico;

    console.log("Orgánico creado con ID:", organicoId);

    // 2. Insertar los rangos
    for (const rango of rangos) {
      const insertRangoQuery = `
        INSERT INTO rango_organico (
          id_organico,
          precio_compra,
          precio_venta,
          inicio,
          fin
        ) VALUES ($1, $2, $3, $4, $5)
        RETURNING id_rango_organico
      `;

      const rangoResult = await query(insertRangoQuery, [
        organicoId,
        rango.precioCompra,
        rango.precioVenta,
        rango.esferaInicio,
        rango.esferaFin
      ]);

      rango.id = String(rangoResult.rows[0].id_rango_organico);
    }

    console.log("Total de rangos insertados:", rangos.length);

    return {
      id: String(organicoId),
      nombre,
      estado: 'activo',
      rangos
    };
  } catch (error) {
    console.error("Error en createOrganico:", error);
    throw new Error(error.message || "Error al crear el orgánico");
  }
};

const updateOrganico = async (userId, userRole, organicoId, data) => {
  try {
    const { nombre, rangos } = data;

    console.log("=== updateOrganico Service ===");
    console.log("organicoId:", organicoId);
    console.log("nombre:", nombre);
    console.log("rangos:", rangos.length);

    // Verificar que el orgánico existe y está activo
    const checkQuery = `
      SELECT id_organico, id_negocio
      FROM organico 
      WHERE id_organico = $1 AND estado = 'activo'
    `;

    const checkResult = await query(checkQuery, [organicoId]);

    if (checkResult.rows.length === 0) {
      throw new Error("Orgánico no encontrado o fue eliminado");
    }

    const negocioId = checkResult.rows[0].id_negocio;

    // Verificar si ya existe otro orgánico con el mismo nombre en este negocio
    const checkDuplicateQuery = `
      SELECT id_organico 
      FROM organico 
      WHERE nombre_organico = $1 AND id_negocio = $2 AND estado = 'activo' AND id_organico != $3
    `;

    const duplicateResult = await query(checkDuplicateQuery, [nombre, negocioId, organicoId]);

    if (duplicateResult.rows.length > 0) {
      throw new Error(`Ya existe un orgánico con el nombre "${nombre}" en este negocio`);
    }

    // 1. Actualizar nombre
    const updateNombreQuery = `
      UPDATE organico 
      SET nombre_organico = $1 
      WHERE id_organico = $2
    `;

    await query(updateNombreQuery, [nombre, organicoId]);

    // 2. Eliminar rangos existentes
    const deleteRangosQuery = `
      DELETE FROM rango_organico 
      WHERE id_organico = $1
    `;

    await query(deleteRangosQuery, [organicoId]);

    // 3. Insertar nuevos rangos
    for (const rango of rangos) {
      const insertRangoQuery = `
        INSERT INTO rango_organico (
          id_organico,
          precio_compra,
          precio_venta,
          inicio,
          fin
        ) VALUES ($1, $2, $3, $4, $5)
        RETURNING id_rango_organico
      `;

      const rangoResult = await query(insertRangoQuery, [
        organicoId,
        rango.precioCompra,
        rango.precioVenta,
        rango.esferaInicio,
        rango.esferaFin
      ]);

      rango.id = String(rangoResult.rows[0].id_rango_organico);
    }

    console.log("Total de rangos actualizados:", rangos.length);

    return {
      id: String(organicoId),
      nombre,
      estado: 'activo',
      rangos
    };
  } catch (error) {
    console.error("Error en updateOrganico:", error);
    throw new Error(error.message || "Error al actualizar el orgánico");
  }
};

const deleteOrganico = async (userId, userRole, organicoId) => {
  try {
    console.log("=== deleteOrganico Service ===");
    console.log("organicoId:", organicoId);

    // Verificar que el orgánico existe y está activo
    const checkQuery = `
      SELECT id_organico 
      FROM organico 
      WHERE id_organico = $1 AND estado = 'activo'
    `;

    const checkResult = await query(checkQuery, [organicoId]);

    if (checkResult.rows.length === 0) {
      throw new Error("Orgánico no encontrado o ya fue eliminado");
    }

    // Verificar si el orgánico está siendo usado en algún lente
    const checkLenteQuery = `
      SELECT COUNT(*) as count 
      FROM lente 
      WHERE id_organico = $1
    `;

    const lenteResult = await query(checkLenteQuery, [organicoId]);

    if (parseInt(lenteResult.rows[0].count) > 0) {
      throw new Error("No se puede eliminar el orgánico porque está siendo usado en lentes");
    }

    // Soft delete - actualizar estado a 'eliminado'
    const deleteQuery = `
      UPDATE organico 
      SET estado = 'eliminado' 
      WHERE id_organico = $1
    `;

    await query(deleteQuery, [organicoId]);

    console.log("Orgánico marcado como eliminado:", organicoId);

    return { success: true };
  } catch (error) {
    console.error("Error en deleteOrganico:", error);
    throw new Error(error.message || "Error al eliminar el orgánico");
  }
};

module.exports = {
  getOrganicos,
  createOrganico,
  updateOrganico,
  deleteOrganico
};