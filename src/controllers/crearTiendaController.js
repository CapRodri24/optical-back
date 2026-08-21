// src/controllers/crearTiendaController.js
const crearTiendaService = require("../services/crearTiendaService");

const crearTienda = async (req, res) => {
  try {
    const { tienda, responsable } = req.body;

    console.log("=== Crear Tienda Controller ===");
    console.log("Datos tienda:", tienda);
    console.log("Datos responsable:", responsable);

    if (!tienda || !responsable) {
      return res.status(400).json({
        success: false,
        message: "Datos de tienda y responsable son requeridos"
      });
    }

    if (!tienda.nombre || !tienda.ubicacion || !tienda.telefono) {
      return res.status(400).json({
        success: false,
        message: "Nombre, ubicación y teléfono de la tienda son requeridos"
      });
    }

    if (!responsable.carnet || !responsable.nombres || !responsable.apellidos || 
        !responsable.telefono || !responsable.usuario || !responsable.contraseña) {
      return res.status(400).json({
        success: false,
        message: "Todos los datos del responsable son requeridos"
      });
    }

    const result = await crearTiendaService.crearTienda(tienda, responsable);

    console.log("Tienda creada exitosamente ID:", result.tienda.id);

    res.status(201).json({
      success: true,
      message: result.mensaje,
      tienda: result.tienda,
      responsable: result.responsable
    });

  } catch (error) {
    console.error("Error en crearTienda controller:", error);
    res.status(400).json({
      success: false,
      message: error.message || "Error al crear la tienda"
    });
  }
};

const validarCarnet = async (req, res) => {
  try {
    const { carnet } = req.body;

    console.log("=== Validar Carnet Controller ===");
    console.log("Carnet:", carnet);

    if (!carnet) {
      return res.status(400).json({
        success: false,
        message: "Carnet es requerido"
      });
    }

    const result = await crearTiendaService.validarCarnet(carnet);

    res.json({
      success: true,
      existe: result.existe,
      usuario: result.usuario || null
    });

  } catch (error) {
    console.error("Error en validarCarnet controller:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Error al validar el carnet"
    });
  }
};

const validarUsuario = async (req, res) => {
  try {
    const { usuario } = req.body;

    console.log("=== Validar Usuario Controller ===");
    console.log("Usuario:", usuario);

    if (!usuario) {
      return res.status(400).json({
        success: false,
        message: "Usuario es requerido"
      });
    }

    const result = await crearTiendaService.validarUsuario(usuario);

    res.json({
      success: true,
      disponible: result.disponible,
      mensaje: result.mensaje || null
    });

  } catch (error) {
    console.error("Error en validarUsuario controller:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Error al validar el usuario"
    });
  }
};

const getStats = async (req, res) => {
  try {
    const stats = await crearTiendaService.getStats();
    res.json({ success: true, stats });
  } catch (error) {
    console.error("Error en getStats controller:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Error al obtener estadísticas"
    });
  }
};

const getTiendas = async (req, res) => {
  try {
    const tiendas = await crearTiendaService.getTiendas();
    res.json({ success: true, tiendas });
  } catch (error) {
    console.error("Error en getTiendas controller:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Error al obtener tiendas"
    });
  }
};

const getTiendaById = async (req, res) => {
  try {
    const { id } = req.params;
    const tienda = await crearTiendaService.getTiendaById(id);

    if (!tienda) {
      return res.status(404).json({
        success: false,
        message: "Tienda no encontrada"
      });
    }

    res.json({ success: true, tienda });
  } catch (error) {
    console.error("Error en getTiendaById controller:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Error al obtener la tienda"
    });
  }
};

const updateTienda = async (req, res) => {
  try {
    const { id } = req.params;
    const data = req.body;

    const tienda = await crearTiendaService.updateTienda(id, data);

    res.json({
      success: true,
      message: "Tienda actualizada exitosamente",
      tienda
    });
  } catch (error) {
    console.error("Error en updateTienda controller:", error);
    res.status(400).json({
      success: false,
      message: error.message || "Error al actualizar la tienda"
    });
  }
};

const deleteTienda = async (req, res) => {
  try {
    const { id } = req.params;
    await crearTiendaService.deleteTienda(id);

    res.json({
      success: true,
      message: "Tienda eliminada exitosamente"
    });
  } catch (error) {
    console.error("Error en deleteTienda controller:", error);
    res.status(400).json({
      success: false,
      message: error.message || "Error al eliminar la tienda"
    });
  }
};

const verificarEstadoTienda = async (req, res) => {
  try {
    const { id } = req.params;
    const resultado = await crearTiendaService.verificarEstadoTienda(id);

    res.json({ success: true, ...resultado });
  } catch (error) {
    console.error("Error en verificarEstadoTienda controller:", error);
    res.status(400).json({
      success: false,
      message: error.message || "Error al verificar el estado de la tienda"
    });
  }
};

module.exports = {
  crearTienda,
  validarCarnet,
  validarUsuario,
  getStats,
  getTiendas,
  getTiendaById,
  updateTienda,
  deleteTienda,
  verificarEstadoTienda
};