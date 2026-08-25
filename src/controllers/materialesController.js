// src/controllers/materialesController.js
const materialesService = require("../services/materialesService");

// ============================================
// MATERIALES
// ============================================

const getMateriales = async (req, res) => {
  try {
    const { 
      searchTerm, 
      tipo, 
      showLowStock, 
      tiendaId, 
      sortKey, 
      sortDirection,
      negocioId
    } = req.query;

    console.log("🔍 getMateriales - negocioId:", negocioId);
    
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

    const filtros = {
      searchTerm,
      tipo: tipo !== "todos" ? tipo : undefined,
      showLowStock: showLowStock === "true",
      tiendaId: tiendaId !== "todas" ? tiendaId : undefined,
      sortKey,
      sortDirection: sortDirection || 'asc',
      negocioId: negocioIdNum
    };

    const materiales = await materialesService.getMateriales(filtros);

    res.json({
      success: true,
      data: materiales
    });
  } catch (error) {
    console.error("Error en getMateriales controller:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Error al obtener materiales"
    });
  }
};

const getMaterialById = async (req, res) => {
  try {
    const { id } = req.params;
    const negocioId = req.query.negocioId;

    console.log("🔍 getMaterialById - id:", id, "negocioId:", negocioId);

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
        message: "ID de material inválido"
      });
    }

    const material = await materialesService.getMaterialById(id, negocioIdNum);

    if (!material) {
      return res.status(404).json({
        success: false,
        message: "Material no encontrado"
      });
    }

    res.json({
      success: true,
      data: material
    });
  } catch (error) {
    console.error("Error en getMaterialById controller:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Error al obtener el material"
    });
  }
};

const createMaterial = async (req, res) => {
  try {
    const data = req.body;
    const negocioId = data.negocioId;

    console.log("🔍 createMaterial - negocioId:", negocioId);
    console.log("📦 createMaterial - data:", data);

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

    if (!data.tipo || !data.tipo.trim()) {
      return res.status(400).json({
        success: false,
        message: "El tipo es requerido"
      });
    }

    if (!data.precioVenta || data.precioVenta <= 0) {
      return res.status(400).json({
        success: false,
        message: "El precio de venta es requerido y debe ser mayor a 0"
      });
    }

    if (!data.tiendasSeleccionadas || data.tiendasSeleccionadas.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Debe seleccionar al menos una tienda"
      });
    }

    const material = await materialesService.createMaterial(data, negocioIdNum);

    res.status(201).json({
      success: true,
      message: "Material creado exitosamente",
      data: material
    });
  } catch (error) {
    console.error("Error en createMaterial controller:", error);
    res.status(400).json({
      success: false,
      message: error.message || "Error al crear el material"
    });
  }
};

const updateMaterial = async (req, res) => {
  try {
    const { id } = req.params;
    const data = req.body;
    const negocioId = data.negocioId;

    console.log("🔍 updateMaterial - id:", id, "negocioId:", negocioId);

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
        message: "ID de material inválido"
      });
    }

    const material = await materialesService.updateMaterial(id, data, negocioIdNum);

    res.json({
      success: true,
      message: "Material actualizado exitosamente",
      data: material
    });
  } catch (error) {
    console.error("Error en updateMaterial controller:", error);
    res.status(400).json({
      success: false,
      message: error.message || "Error al actualizar el material"
    });
  }
};

const deleteMaterial = async (req, res) => {
  try {
    const { id } = req.params;
    const negocioId = req.query.negocioId;

    console.log("🔍 deleteMaterial - id:", id, "negocioId:", negocioId);

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
        message: "ID de material inválido"
      });
    }

    await materialesService.deleteMaterial(id, negocioIdNum);

    res.json({
      success: true,
      message: "Material eliminado exitosamente"
    });
  } catch (error) {
    console.error("Error en deleteMaterial controller:", error);
    res.status(400).json({
      success: false,
      message: error.message || "Error al eliminar el material"
    });
  }
};

const addStock = async (req, res) => {
  try {
    const { materialId, tiendaId, cantidad, negocioId, userId } = req.body;

    console.log("🔍 addStock - materialId:", materialId, "tiendaId:", tiendaId, "cantidad:", cantidad, "negocioId:", negocioId, "userId:", userId);

    // Validar userId
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "ID de usuario requerido"
      });
    }

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

    if (!materialId || isNaN(Number(materialId))) {
      return res.status(400).json({
        success: false,
        message: "ID de material inválido"
      });
    }

    if (!tiendaId) {
      return res.status(400).json({
        success: false,
        message: "ID de tienda requerido"
      });
    }

    if (!cantidad || cantidad <= 0) {
      return res.status(400).json({
        success: false,
        message: "La cantidad debe ser mayor a 0"
      });
    }

    const material = await materialesService.addStock(
      materialId, 
      tiendaId, 
      cantidad, 
      negocioIdNum,
      userId
    );

    res.json({
      success: true,
      message: "Stock agregado exitosamente",
      data: material
    });
  } catch (error) {
    console.error("Error en addStock controller:", error);
    res.status(400).json({
      success: false,
      message: error.message || "Error al agregar stock"
    });
  }
};

const transferStock = async (req, res) => {
  try {
    const { materialId, tiendaOrigen, tiendaDestino, cantidad, negocioId, userId } = req.body;

    console.log("🔍 transferStock - materialId:", materialId, "origen:", tiendaOrigen, "destino:", tiendaDestino, "cantidad:", cantidad, "negocioId:", negocioId, "userId:", userId);

    // Validar userId
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "ID de usuario requerido"
      });
    }

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

    if (!materialId || isNaN(Number(materialId))) {
      return res.status(400).json({
        success: false,
        message: "ID de material inválido"
      });
    }

    if (!tiendaOrigen || !tiendaDestino) {
      return res.status(400).json({
        success: false,
        message: "Tienda origen y destino son requeridas"
      });
    }

    if (!cantidad || cantidad <= 0) {
      return res.status(400).json({
        success: false,
        message: "La cantidad debe ser mayor a 0"
      });
    }

    const material = await materialesService.transferStock(
      materialId, 
      tiendaOrigen, 
      tiendaDestino, 
      cantidad, 
      negocioIdNum,
      userId
    );

    res.json({
      success: true,
      message: "Stock transferido exitosamente",
      data: material
    });
  } catch (error) {
    console.error("Error en transferStock controller:", error);
    res.status(400).json({
      success: false,
      message: error.message || "Error al transferir stock"
    });
  }
};

// ============================================
// TIPOS DE MATERIAL
// ============================================

const getMaterialTypes = async (req, res) => {
  try {
    const negocioId = req.query.negocioId;

    console.log("🔍 getMaterialTypes - negocioId:", negocioId);

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

    const types = await materialesService.getMaterialTypes(negocioIdNum);

    res.json({
      success: true,
      data: types
    });
  } catch (error) {
    console.error("Error en getMaterialTypes controller:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Error al obtener tipos de material"
    });
  }
};

const createMaterialType = async (req, res) => {
  try {
    const { nombre, negocioId } = req.body;

    console.log("🔍 createMaterialType - nombre:", nombre, "negocioId:", negocioId);

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

    const types = await materialesService.createMaterialType(nombre.trim(), negocioIdNum);

    res.status(201).json({
      success: true,
      message: "Tipo creado exitosamente",
      data: types
    });
  } catch (error) {
    console.error("Error en createMaterialType controller:", error);
    res.status(400).json({
      success: false,
      message: error.message || "Error al crear el tipo"
    });
  }
};

const updateMaterialType = async (req, res) => {
  try {
    const { nombre: oldName } = req.params;
    const { nombre: newName, negocioId } = req.body;

    console.log("🔍 updateMaterialType - oldName:", oldName, "newName:", newName, "negocioId:", negocioId);

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

    if (!oldName || !newName || !newName.trim()) {
      return res.status(400).json({
        success: false,
        message: "Nombre viejo y nuevo son requeridos"
      });
    }

    const types = await materialesService.updateMaterialType(oldName, newName.trim(), negocioIdNum);

    res.json({
      success: true,
      message: "Tipo actualizado exitosamente",
      data: types
    });
  } catch (error) {
    console.error("Error en updateMaterialType controller:", error);
    res.status(400).json({
      success: false,
      message: error.message || "Error al actualizar el tipo"
    });
  }
};

const deleteMaterialType = async (req, res) => {
  try {
    const { nombre } = req.params;
    const negocioId = req.query.negocioId;

    console.log("🔍 deleteMaterialType - nombre:", nombre, "negocioId:", negocioId);

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

    if (!nombre) {
      return res.status(400).json({
        success: false,
        message: "Nombre del tipo es requerido"
      });
    }

    const types = await materialesService.deleteMaterialType(nombre, negocioIdNum);

    res.json({
      success: true,
      message: "Tipo eliminado exitosamente",
      data: types
    });
  } catch (error) {
    console.error("Error en deleteMaterialType controller:", error);
    res.status(400).json({
      success: false,
      message: error.message || "Error al eliminar el tipo"
    });
  }
};

// ============================================
// ESTADÍSTICAS Y ALERTAS
// ============================================

const getMaterialStats = async (req, res) => {
  try {
    const negocioId = req.query.negocioId;

    console.log("🔍 getMaterialStats - negocioId:", negocioId);

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

    const stats = await materialesService.getMaterialStats(negocioIdNum);

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error("Error en getMaterialStats controller:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Error al obtener estadísticas"
    });
  }
};

const getLowStockAlerts = async (req, res) => {
  try {
    const negocioId = req.query.negocioId;

    console.log("🔍 getLowStockAlerts - negocioId:", negocioId);

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

    const alerts = await materialesService.getLowStockAlerts(negocioIdNum);

    res.json({
      success: true,
      data: alerts
    });
  } catch (error) {
    console.error("Error en getLowStockAlerts controller:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Error al obtener alertas de stock bajo"
    });
  }
};

// ============================================
// TIENDAS
// ============================================

const getTiendas = async (req, res) => {
  try {
    const negocioId = req.query.negocioId;

    console.log("🔍 getTiendas - negocioId recibido:", negocioId);

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

    const tiendas = await materialesService.getTiendas(negocioIdNum);

    res.json({
      success: true,
      data: tiendas
    });
  } catch (error) {
    console.error("Error en getTiendas controller:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Error al obtener tiendas"
    });
  }
};

module.exports = {
  getMateriales,
  getMaterialById,
  createMaterial,
  updateMaterial,
  deleteMaterial,
  addStock,
  transferStock,
  getMaterialTypes,
  createMaterialType,
  updateMaterialType,
  deleteMaterialType,
  getMaterialStats,
  getLowStockAlerts,
  getTiendas
};