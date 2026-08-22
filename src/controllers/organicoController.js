// src/controllers/organicoController.js
const organicoService = require("../services/organicoService");

const getOrganicos = async (req, res) => {
  try {
    const { negocioId } = req.query;
    const userId = req.user.id_usuario;
    const userRole = req.user.rol_nombre;

    console.log("=== getOrganicos Controller ===");
    console.log("userId:", userId);
    console.log("userRole:", userRole);
    console.log("negocioId:", negocioId);

    const organicos = await organicoService.getOrganicos(userId, userRole, negocioId);
    
    res.json({
      success: true,
      data: organicos
    });
  } catch (error) {
    console.error("Error en getOrganicos:", error);
    res.status(500).json({
      success: false,
      message: "Error al obtener los orgánicos"
    });
  }
};

const createOrganico = async (req, res) => {
  try {
    const { nombre, rangos } = req.body;
    const userId = req.user.id_usuario;
    const userRole = req.user.rol_nombre;

    console.log("=== createOrganico Controller ===");
    console.log("userId:", userId);
    console.log("nombre:", nombre);
    console.log("rangos:", rangos?.length);

    if (!nombre || !rangos || rangos.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Nombre y rangos son requeridos"
      });
    }

    const nuevoOrganico = await organicoService.createOrganico(userId, userRole, {
      nombre,
      rangos
    });

    res.status(201).json({
      success: true,
      data: nuevoOrganico,
      message: "Orgánico creado exitosamente"
    });
  } catch (error) {
    console.error("Error en createOrganico:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Error al crear el orgánico"
    });
  }
};

const updateOrganico = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, rangos } = req.body;
    const userId = req.user.id_usuario;
    const userRole = req.user.rol_nombre;

    console.log("=== updateOrganico Controller ===");
    console.log("id:", id);
    console.log("nombre:", nombre);
    console.log("rangos:", rangos?.length);

    if (!nombre || !rangos || rangos.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Nombre y rangos son requeridos"
      });
    }

    const organicoActualizado = await organicoService.updateOrganico(userId, userRole, id, {
      nombre,
      rangos
    });

    res.json({
      success: true,
      data: organicoActualizado,
      message: "Orgánico actualizado exitosamente"
    });
  } catch (error) {
    console.error("Error en updateOrganico:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Error al actualizar el orgánico"
    });
  }
};

const deleteOrganico = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id_usuario;
    const userRole = req.user.rol_nombre;

    console.log("=== deleteOrganico Controller ===");
    console.log("id:", id);

    await organicoService.deleteOrganico(userId, userRole, id);

    res.json({
      success: true,
      message: "Orgánico eliminado exitosamente"
    });
  } catch (error) {
    console.error("Error en deleteOrganico:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Error al eliminar el orgánico"
    });
  }
};

module.exports = {
  getOrganicos,
  createOrganico,
  updateOrganico,
  deleteOrganico
};