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
    const { nombre, tipo, rangos } = req.body;  // Añadido tipo
    const userId = req.user.id_usuario;
    const userRole = req.user.rol_nombre;

    console.log("=== createOrganico Controller ===");
    console.log("userId:", userId);
    console.log("nombre:", nombre);
    console.log("tipo:", tipo);  // Añadido log
    console.log("rangos:", rangos?.length);

    if (!nombre || !tipo || !rangos || rangos.length === 0) {  // Añadido validación de tipo
      return res.status(400).json({
        success: false,
        message: "Nombre, tipo y rangos son requeridos"
      });
    }

    // Validar que el tipo sea uno de los permitidos
    const tiposPermitidos = ['Monofocal', 'Bifocal', 'Multifocal'];
    if (!tiposPermitidos.includes(tipo)) {
      return res.status(400).json({
        success: false,
        message: "Tipo inválido. Debe ser Monofocal, Bifocal o Multifocal"
      });
    }

    const nuevoOrganico = await organicoService.createOrganico(userId, userRole, {
      nombre,
      tipo,  // Añadido tipo
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
    const { nombre, tipo, rangos } = req.body;  // Añadido tipo
    const userId = req.user.id_usuario;
    const userRole = req.user.rol_nombre;

    console.log("=== updateOrganico Controller ===");
    console.log("id:", id);
    console.log("nombre:", nombre);
    console.log("tipo:", tipo);  // Añadido log
    console.log("rangos:", rangos?.length);

    if (!nombre || !tipo || !rangos || rangos.length === 0) {  // Añadido validación de tipo
      return res.status(400).json({
        success: false,
        message: "Nombre, tipo y rangos son requeridos"
      });
    }

    // Validar que el tipo sea uno de los permitidos
    const tiposPermitidos = ['Monofocal', 'Bifocal', 'Multifocal'];
    if (!tiposPermitidos.includes(tipo)) {
      return res.status(400).json({
        success: false,
        message: "Tipo inválido. Debe ser Monofocal, Bifocal o Multifocal"
      });
    }

    const organicoActualizado = await organicoService.updateOrganico(userId, userRole, id, {
      nombre,
      tipo,  // Añadido tipo
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