// src/controllers/clientesController.js
const clientesService = require("../services/clientesService");

// ============================================
// CLIENTES
// ============================================

const getClientes = async (req, res) => {
  try {
    const { negocioId, searchTerm, month } = req.query;

    console.log("🔍 getClientes - negocioId:", negocioId);

    if (!negocioId) {
      return res.status(400).json({
        success: false,
        message: "ID de negocio requerido"
      });
    }

    const negocioIdNum = parseInt(negocioId);
    if (isNaN(negocioIdNum)) {
      return res.status(400).json({
        success: false,
        message: "ID de negocio inválido"
      });
    }

    const clientes = await clientesService.getClientes({
      negocioId: negocioIdNum,
      searchTerm,
      month
    });

    res.json({
      success: true,
      data: clientes
    });
  } catch (error) {
    console.error("Error en getClientes controller:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Error al obtener clientes"
    });
  }
};

const searchClientes = async (req, res) => {
  try {
    const { term, negocioId } = req.query;

    console.log("🔍 searchClientes - term:", term, "negocioId:", negocioId);

    if (!negocioId) {
      return res.status(400).json({
        success: false,
        message: "ID de negocio requerido"
      });
    }

    const negocioIdNum = parseInt(negocioId);
    if (isNaN(negocioIdNum)) {
      return res.status(400).json({
        success: false,
        message: "ID de negocio inválido"
      });
    }

    if (!term) {
      return res.status(400).json({
        success: false,
        message: "Término de búsqueda requerido"
      });
    }

    const clientes = await clientesService.searchClientes(term, negocioIdNum);

    res.json({
      success: true,
      data: clientes
    });
  } catch (error) {
    console.error("Error en searchClientes controller:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Error al buscar clientes"
    });
  }
};

const getClienteById = async (req, res) => {
  try {
    const { id } = req.params;
    const { negocioId } = req.query;

    console.log("🔍 getClienteById - id:", id, "negocioId:", negocioId);

    if (!negocioId) {
      return res.status(400).json({
        success: false,
        message: "ID de negocio requerido"
      });
    }

    const negocioIdNum = parseInt(negocioId);
    if (isNaN(negocioIdNum)) {
      return res.status(400).json({
        success: false,
        message: "ID de negocio inválido"
      });
    }

    if (!id || isNaN(Number(id))) {
      return res.status(400).json({
        success: false,
        message: "ID de cliente inválido"
      });
    }

    const cliente = await clientesService.getClienteById(id, negocioIdNum);

    if (!cliente) {
      return res.status(404).json({
        success: false,
        message: "Cliente no encontrado"
      });
    }

    res.json({
      success: true,
      data: cliente
    });
  } catch (error) {
    console.error("Error en getClienteById controller:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Error al obtener el cliente"
    });
  }
};

const createCliente = async (req, res) => {
  try {
    const data = req.body;
    const negocioId = data.negocioId;

    console.log("🔍 createCliente - negocioId:", negocioId);
    console.log("📦 createCliente - data:", data);

    if (!negocioId) {
      return res.status(400).json({
        success: false,
        message: "ID de negocio requerido"
      });
    }

    const negocioIdNum = parseInt(negocioId);
    if (isNaN(negocioIdNum)) {
      return res.status(400).json({
        success: false,
        message: "ID de negocio inválido"
      });
    }

    if (!data.nombre || !data.nombre.trim()) {
      return res.status(400).json({
        success: false,
        message: "El nombre es requerido"
      });
    }

    if (!data.apellidos || !data.apellidos.trim()) {
      return res.status(400).json({
        success: false,
        message: "Los apellidos son requeridos"
      });
    }

    if (!data.carnet || !data.carnet.trim()) {
      return res.status(400).json({
        success: false,
        message: "El carnet es requerido"
      });
    }

    if (!data.celular || !data.celular.trim()) {
      return res.status(400).json({
        success: false,
        message: "El celular es requerido"
      });
    }

    const cliente = await clientesService.createCliente(data, negocioIdNum);

    res.status(201).json({
      success: true,
      message: "Cliente creado exitosamente",
      data: cliente
    });
  } catch (error) {
    console.error("Error en createCliente controller:", error);
    res.status(400).json({
      success: false,
      message: error.message || "Error al crear el cliente"
    });
  }
};

const updateCliente = async (req, res) => {
  try {
    const { id } = req.params;
    const data = req.body;
    const negocioId = data.negocioId;

    console.log("🔍 updateCliente - id:", id, "negocioId:", negocioId);

    if (!negocioId) {
      return res.status(400).json({
        success: false,
        message: "ID de negocio requerido"
      });
    }

    const negocioIdNum = parseInt(negocioId);
    if (isNaN(negocioIdNum)) {
      return res.status(400).json({
        success: false,
        message: "ID de negocio inválido"
      });
    }

    if (!id || isNaN(Number(id))) {
      return res.status(400).json({
        success: false,
        message: "ID de cliente inválido"
      });
    }

    const cliente = await clientesService.updateCliente(id, data, negocioIdNum);

    res.json({
      success: true,
      message: "Cliente actualizado exitosamente",
      data: cliente
    });
  } catch (error) {
    console.error("Error en updateCliente controller:", error);
    res.status(400).json({
      success: false,
      message: error.message || "Error al actualizar el cliente"
    });
  }
};

const deleteCliente = async (req, res) => {
  try {
    const { id } = req.params;
    const { negocioId } = req.query;

    console.log("🔍 deleteCliente - id:", id, "negocioId:", negocioId);

    if (!negocioId) {
      return res.status(400).json({
        success: false,
        message: "ID de negocio requerido"
      });
    }

    const negocioIdNum = parseInt(negocioId);
    if (isNaN(negocioIdNum)) {
      return res.status(400).json({
        success: false,
        message: "ID de negocio inválido"
      });
    }

    if (!id || isNaN(Number(id))) {
      return res.status(400).json({
        success: false,
        message: "ID de cliente inválido"
      });
    }

    await clientesService.deleteCliente(id, negocioIdNum);

    res.json({
      success: true,
      message: "Cliente eliminado exitosamente"
    });
  } catch (error) {
    console.error("Error en deleteCliente controller:", error);
    res.status(400).json({
      success: false,
      message: error.message || "Error al eliminar el cliente"
    });
  }
};

// ============================================
// MEDIDAS DE CLIENTES
// ============================================

const getClienteMedidas = async (req, res) => {
  try {
    const { id } = req.params;
    const { negocioId } = req.query;

    console.log("🔍 getClienteMedidas - id:", id, "negocioId:", negocioId);

    if (!negocioId) {
      return res.status(400).json({
        success: false,
        message: "ID de negocio requerido"
      });
    }

    const negocioIdNum = parseInt(negocioId);
    if (isNaN(negocioIdNum)) {
      return res.status(400).json({
        success: false,
        message: "ID de negocio inválido"
      });
    }

    if (!id || isNaN(Number(id))) {
      return res.status(400).json({
        success: false,
        message: "ID de cliente inválido"
      });
    }

    const medidas = await clientesService.getClienteMedidas(id, negocioIdNum);

    res.json({
      success: true,
      data: medidas
    });
  } catch (error) {
    console.error("Error en getClienteMedidas controller:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Error al obtener medidas del cliente"
    });
  }
};

const saveClienteMedidas = async (req, res) => {
  try {
    const { id } = req.params;
    const data = req.body;
    const negocioId = data.negocioId;

    console.log("🔍 saveClienteMedidas - id:", id, "negocioId:", negocioId);

    if (!negocioId) {
      return res.status(400).json({
        success: false,
        message: "ID de negocio requerido"
      });
    }

    const negocioIdNum = parseInt(negocioId);
    if (isNaN(negocioIdNum)) {
      return res.status(400).json({
        success: false,
        message: "ID de negocio inválido"
      });
    }

    if (!id || isNaN(Number(id))) {
      return res.status(400).json({
        success: false,
        message: "ID de cliente inválido"
      });
    }

    const medidas = await clientesService.saveClienteMedidas(id, data, negocioIdNum);

    res.json({
      success: true,
      message: "Medidas guardadas exitosamente",
      data: medidas
    });
  } catch (error) {
    console.error("Error en saveClienteMedidas controller:", error);
    res.status(400).json({
      success: false,
      message: error.message || "Error al guardar medidas"
    });
  }
};

const deleteClienteMedidas = async (req, res) => {
  try {
    const { id } = req.params;
    const { negocioId } = req.query;

    console.log("🔍 deleteClienteMedidas - id:", id, "negocioId:", negocioId);

    if (!negocioId) {
      return res.status(400).json({
        success: false,
        message: "ID de negocio requerido"
      });
    }

    const negocioIdNum = parseInt(negocioId);
    if (isNaN(negocioIdNum)) {
      return res.status(400).json({
        success: false,
        message: "ID de negocio inválido"
      });
    }

    if (!id || isNaN(Number(id))) {
      return res.status(400).json({
        success: false,
        message: "ID de cliente inválido"
      });
    }

    await clientesService.deleteClienteMedidas(id, negocioIdNum);

    res.json({
      success: true,
      message: "Medidas eliminadas exitosamente"
    });
  } catch (error) {
    console.error("Error en deleteClienteMedidas controller:", error);
    res.status(400).json({
      success: false,
      message: error.message || "Error al eliminar medidas"
    });
  }
};

// ============================================
// TIPOS DE CLIENTE
// ============================================

const getTiposCliente = async (req, res) => {
  try {
    const { negocioId } = req.query;

    console.log("🔍 getTiposCliente - negocioId:", negocioId);

    if (!negocioId) {
      return res.status(400).json({
        success: false,
        message: "ID de negocio requerido"
      });
    }

    const negocioIdNum = parseInt(negocioId);
    if (isNaN(negocioIdNum)) {
      return res.status(400).json({
        success: false,
        message: "ID de negocio inválido"
      });
    }

    const tipos = await clientesService.getTiposCliente(negocioIdNum);

    res.json({
      success: true,
      data: tipos
    });
  } catch (error) {
    console.error("Error en getTiposCliente controller:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Error al obtener tipos de cliente"
    });
  }
};

const createTipoCliente = async (req, res) => {
  try {
    const { nombre, negocioId } = req.body;

    console.log("🔍 createTipoCliente - nombre:", nombre, "negocioId:", negocioId);

    if (!negocioId) {
      return res.status(400).json({
        success: false,
        message: "ID de negocio requerido"
      });
    }

    const negocioIdNum = parseInt(negocioId);
    if (isNaN(negocioIdNum)) {
      return res.status(400).json({
        success: false,
        message: "ID de negocio inválido"
      });
    }

    if (!nombre || !nombre.trim()) {
      return res.status(400).json({
        success: false,
        message: "Nombre del tipo es requerido"
      });
    }

    const tipo = await clientesService.createTipoCliente(nombre.trim(), negocioIdNum);

    res.status(201).json({
      success: true,
      message: "Tipo de cliente creado exitosamente",
      data: tipo
    });
  } catch (error) {
    console.error("Error en createTipoCliente controller:", error);
    res.status(400).json({
      success: false,
      message: error.message || "Error al crear el tipo de cliente"
    });
  }
};

const updateTipoCliente = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, negocioId } = req.body;

    console.log("🔍 updateTipoCliente - id:", id, "nombre:", nombre, "negocioId:", negocioId);

    if (!negocioId) {
      return res.status(400).json({
        success: false,
        message: "ID de negocio requerido"
      });
    }

    const negocioIdNum = parseInt(negocioId);
    if (isNaN(negocioIdNum)) {
      return res.status(400).json({
        success: false,
        message: "ID de negocio inválido"
      });
    }

    if (!id || isNaN(Number(id))) {
      return res.status(400).json({
        success: false,
        message: "ID de tipo inválido"
      });
    }

    if (!nombre || !nombre.trim()) {
      return res.status(400).json({
        success: false,
        message: "Nombre del tipo es requerido"
      });
    }

    const tipo = await clientesService.updateTipoCliente(id, nombre.trim(), negocioIdNum);

    res.json({
      success: true,
      message: "Tipo de cliente actualizado exitosamente",
      data: tipo
    });
  } catch (error) {
    console.error("Error en updateTipoCliente controller:", error);
    res.status(400).json({
      success: false,
      message: error.message || "Error al actualizar el tipo de cliente"
    });
  }
};

const deleteTipoCliente = async (req, res) => {
  try {
    const { id } = req.params;
    const { negocioId } = req.query;

    console.log("🔍 deleteTipoCliente - id:", id, "negocioId:", negocioId);

    if (!negocioId) {
      return res.status(400).json({
        success: false,
        message: "ID de negocio requerido"
      });
    }

    const negocioIdNum = parseInt(negocioId);
    if (isNaN(negocioIdNum)) {
      return res.status(400).json({
        success: false,
        message: "ID de negocio inválido"
      });
    }

    if (!id || isNaN(Number(id))) {
      return res.status(400).json({
        success: false,
        message: "ID de tipo inválido"
      });
    }

    await clientesService.deleteTipoCliente(id, negocioIdNum);

    res.json({
      success: true,
      message: "Tipo de cliente eliminado exitosamente"
    });
  } catch (error) {
    console.error("Error en deleteTipoCliente controller:", error);
    res.status(400).json({
      success: false,
      message: error.message || "Error al eliminar el tipo de cliente"
    });
  }
};

// ============================================
// ZONAS DE CLIENTE
// ============================================

const getZonasCliente = async (req, res) => {
  try {
    const { negocioId } = req.query;

    console.log("🔍 getZonasCliente - negocioId:", negocioId);

    if (!negocioId) {
      return res.status(400).json({
        success: false,
        message: "ID de negocio requerido"
      });
    }

    const negocioIdNum = parseInt(negocioId);
    if (isNaN(negocioIdNum)) {
      return res.status(400).json({
        success: false,
        message: "ID de negocio inválido"
      });
    }

    const zonas = await clientesService.getZonasCliente(negocioIdNum);

    res.json({
      success: true,
      data: zonas
    });
  } catch (error) {
    console.error("Error en getZonasCliente controller:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Error al obtener zonas de cliente"
    });
  }
};

const createZonaCliente = async (req, res) => {
  try {
    const { nombre, negocioId } = req.body;

    console.log("🔍 createZonaCliente - nombre:", nombre, "negocioId:", negocioId);

    if (!negocioId) {
      return res.status(400).json({
        success: false,
        message: "ID de negocio requerido"
      });
    }

    const negocioIdNum = parseInt(negocioId);
    if (isNaN(negocioIdNum)) {
      return res.status(400).json({
        success: false,
        message: "ID de negocio inválido"
      });
    }

    if (!nombre || !nombre.trim()) {
      return res.status(400).json({
        success: false,
        message: "Nombre de la zona es requerido"
      });
    }

    const zona = await clientesService.createZonaCliente(nombre.trim(), negocioIdNum);

    res.status(201).json({
      success: true,
      message: "Zona de cliente creada exitosamente",
      data: zona
    });
  } catch (error) {
    console.error("Error en createZonaCliente controller:", error);
    res.status(400).json({
      success: false,
      message: error.message || "Error al crear la zona de cliente"
    });
  }
};

const updateZonaCliente = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, negocioId } = req.body;

    console.log("🔍 updateZonaCliente - id:", id, "nombre:", nombre, "negocioId:", negocioId);

    if (!negocioId) {
      return res.status(400).json({
        success: false,
        message: "ID de negocio requerido"
      });
    }

    const negocioIdNum = parseInt(negocioId);
    if (isNaN(negocioIdNum)) {
      return res.status(400).json({
        success: false,
        message: "ID de negocio inválido"
      });
    }

    if (!id || isNaN(Number(id))) {
      return res.status(400).json({
        success: false,
        message: "ID de zona inválido"
      });
    }

    if (!nombre || !nombre.trim()) {
      return res.status(400).json({
        success: false,
        message: "Nombre de la zona es requerido"
      });
    }

    const zona = await clientesService.updateZonaCliente(id, nombre.trim(), negocioIdNum);

    res.json({
      success: true,
      message: "Zona de cliente actualizada exitosamente",
      data: zona
    });
  } catch (error) {
    console.error("Error en updateZonaCliente controller:", error);
    res.status(400).json({
      success: false,
      message: error.message || "Error al actualizar la zona de cliente"
    });
  }
};

const deleteZonaCliente = async (req, res) => {
  try {
    const { id } = req.params;
    const { negocioId } = req.query;

    console.log("🔍 deleteZonaCliente - id:", id, "negocioId:", negocioId);

    if (!negocioId) {
      return res.status(400).json({
        success: false,
        message: "ID de negocio requerido"
      });
    }

    const negocioIdNum = parseInt(negocioId);
    if (isNaN(negocioIdNum)) {
      return res.status(400).json({
        success: false,
        message: "ID de negocio inválido"
      });
    }

    if (!id || isNaN(Number(id))) {
      return res.status(400).json({
        success: false,
        message: "ID de zona inválido"
      });
    }

    await clientesService.deleteZonaCliente(id, negocioIdNum);

    res.json({
      success: true,
      message: "Zona de cliente eliminada exitosamente"
    });
  } catch (error) {
    console.error("Error en deleteZonaCliente controller:", error);
    res.status(400).json({
      success: false,
      message: error.message || "Error al eliminar la zona de cliente"
    });
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