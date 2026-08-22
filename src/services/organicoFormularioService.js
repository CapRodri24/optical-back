// src/services/organicoFormularioService.js
const { query } = require("../../db");

const getTiendasDisponibles = async (userId, userRole) => {
  try {
    let queryStr = "";
    let params = [];

    if (userRole === 'Spider Admin') {
      queryStr = `
        SELECT 
          t.id_tienda as id,
          t.nombre_tienda as nombre,
          t.id_negocio as id_negocio
        FROM tienda t
        WHERE t.estado = 'activo'
      `;
      params = [];
    } else {
      queryStr = `
        SELECT 
          t.id_tienda as id,
          t.nombre_tienda as nombre,
          t.id_negocio as id_negocio
        FROM tienda t
        INNER JOIN usuario_tienda ut ON ut.id_tienda = t.id_tienda
        WHERE ut.id_usuario = $1 AND t.estado = 'activo'
      `;
      params = [userId];
    }

    const result = await query(queryStr, params);
    return result.rows;
  } catch (error) {
    console.error("Error en getTiendasDisponibles:", error);
    throw new Error("Error al obtener las tiendas disponibles");
  }
};

module.exports = {
  getTiendasDisponibles
};