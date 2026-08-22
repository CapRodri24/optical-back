// src/controllers/organicoFormularioController.js
const organicoFormularioService = require("../services/organicoFormularioService");

const getTiendasDisponibles = async (req, res) => {
  try {
    const userId = req.user.id_usuario;
    const userRole = req.user.rol_nombre;

    const tiendas = await organicoFormularioService.getTiendasDisponibles(userId, userRole);

    res.json({
      success: true,
      data: tiendas
    });
  } catch (error) {
    console.error("Error en getTiendasDisponibles:", error);
    res.status(500).json({
      success: false,
      message: "Error al obtener las tiendas disponibles"
    });
  }
};

module.exports = {
  getTiendasDisponibles
};