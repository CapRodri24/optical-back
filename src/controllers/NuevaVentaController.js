// src/controllers/NuevaVentaController.js
const nuevaVentaService = require("../services/NuevaVentaService");

// ============================================
// BUSCAR ORGÁNICOS
// ============================================

const searchOrganicos = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Usuario no autenticado"
      });
    }

    const { term, negocioId, tipo } = req.query;

    if (!negocioId) {
      return res.status(400).json({
        success: false,
        message: "ID de negocio requerido"
      });
    }

    if (!tipo) {
      return res.status(400).json({
        success: false,
        message: "Tipo de orgánico requerido (Monofocal, Bifocal, Multifocal)"
      });
    }

    const userInfo = {
      negocioId: parseInt(negocioId),
      userId: req.user.id_usuario,
      role: req.user.rol_nombre,
      username: req.user.usuario
    };

    const results = await nuevaVentaService.searchOrganicos(term, tipo, userInfo);

    res.json({
      success: true,
      data: results
    });
  } catch (error) {
    console.error("Error en searchOrganicos controller:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Error al buscar orgánicos"
    });
  }
};

// ============================================
// OBTENER PRECIO DE ORGÁNICO POR GRADO
// ============================================

const getOrganicPrice = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Usuario no autenticado"
      });
    }

    const { id } = req.params;
    const { grado, negocioId } = req.query;

    if (!negocioId) {
      return res.status(400).json({
        success: false,
        message: "ID de negocio requerido"
      });
    }

    if (!id || isNaN(Number(id))) {
      return res.status(400).json({
        success: false,
        message: "ID de orgánico inválido"
      });
    }

    const gradoNum = parseFloat(grado);
    if (isNaN(gradoNum)) {
      return res.status(400).json({
        success: false,
        message: "Grado inválido"
      });
    }

    const userInfo = {
      negocioId: parseInt(negocioId),
      userId: req.user.id_usuario,
      role: req.user.rol_nombre,
      username: req.user.usuario
    };

    const result = await nuevaVentaService.getOrganicPrice(id, gradoNum, userInfo);

    if (!result) {
      return res.status(404).json({
        success: false,
        message: "No se encontró un rango para este grado"
      });
    }

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error("Error en getOrganicPrice controller:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Error al obtener el precio del orgánico"
    });
  }
};

// ============================================
// BUSCAR MATERIALES POR TIPO
// ============================================

const searchMateriales = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Usuario no autenticado"
      });
    }

    const { tipo, term, negocioId, tiendaId } = req.query;

    if (!negocioId) {
      return res.status(400).json({
        success: false,
        message: "ID de negocio requerido"
      });
    }

    if (!tipo) {
      return res.status(400).json({
        success: false,
        message: "Tipo de material requerido"
      });
    }

    if (!tiendaId) {
      return res.status(400).json({
        success: false,
        message: "ID de tienda requerido para buscar materiales"
      });
    }

    const userInfo = {
      negocioId: parseInt(negocioId),
      tiendaId: parseInt(tiendaId),
      userId: req.user.id_usuario,
      role: req.user.rol_nombre,
      username: req.user.usuario
    };

    const results = await nuevaVentaService.searchMateriales(tipo, term, userInfo);

    res.json({
      success: true,
      data: results
    });
  } catch (error) {
    console.error("Error en searchMateriales controller:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Error al buscar materiales"
    });
  }
};

// ============================================
// BUSCAR PRODUCTOS ADICIONALES
// ============================================

const searchProductos = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Usuario no autenticado"
      });
    }

    const { term, negocioId, tiendaId } = req.query;

    if (!negocioId) {
      return res.status(400).json({
        success: false,
        message: "ID de negocio requerido"
      });
    }

    if (!tiendaId) {
      return res.status(400).json({
        success: false,
        message: "ID de tienda requerido para buscar productos"
      });
    }

    const userInfo = {
      negocioId: parseInt(negocioId),
      tiendaId: parseInt(tiendaId),
      userId: req.user.id_usuario,
      role: req.user.rol_nombre,
      username: req.user.usuario
    };

    const results = await nuevaVentaService.searchProductos(term, userInfo);

    res.json({
      success: true,
      data: results
    });
  } catch (error) {
    console.error("Error en searchProductos controller:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Error al buscar productos"
    });
  }
};

// ============================================
// REGISTRAR VENTA
// ============================================

const registrarVenta = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Usuario no autenticado"
      });
    }

    const { negocioId, ...ventaData } = req.body;

    if (!negocioId) {
      return res.status(400).json({
        success: false,
        message: "ID de negocio requerido"
      });
    }

    if (!ventaData.clientId) {
      return res.status(400).json({
        success: false,
        message: "ID de cliente requerido"
      });
    }

    if (!ventaData.tiendaId) {
      return res.status(400).json({
        success: false,
        message: "ID de tienda requerido"
      });
    }

    const userInfo = {
      negocioId: parseInt(negocioId),
      userId: req.user.id_usuario,
      role: req.user.rol_nombre,
      username: req.user.usuario
    };

    const result = await nuevaVentaService.registrarVenta(ventaData, userInfo);

    res.json({
      success: true,
      message: "Venta registrada exitosamente",
      data: result
    });
  } catch (error) {
    console.error("Error en registrarVenta controller:", error);
    res.status(400).json({
      success: false,
      message: error.message || "Error al registrar la venta"
    });
  }
};

// ============================================
// OBTENER VENTAS POR CLIENTE
// ============================================

const getVentasByClient = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Usuario no autenticado"
      });
    }

    const { clientId } = req.params;
    const { negocioId } = req.query;

    if (!negocioId) {
      return res.status(400).json({
        success: false,
        message: "ID de negocio requerido"
      });
    }

    if (!clientId) {
      return res.status(400).json({
        success: false,
        message: "ID de cliente requerido"
      });
    }

    const userInfo = {
      negocioId: parseInt(negocioId),
      userId: req.user.id_usuario,
      role: req.user.rol_nombre,
      username: req.user.usuario
    };

    const results = await nuevaVentaService.getVentasByClient(clientId, userInfo);

    res.json({
      success: true,
      data: results
    });
  } catch (error) {
    console.error("Error en getVentasByClient controller:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Error al obtener las ventas del cliente"
    });
  }
};

module.exports = {
  searchOrganicos,
  getOrganicPrice,
  searchMateriales,
  searchProductos,
  registrarVenta,
  getVentasByClient
};