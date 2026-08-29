// src/controllers/NuevaVentaController.js
const nuevaVentaService = require("../services/NuevaVentaService");

// ============================================
// BUSCAR ORGÁNICOS (CON FILTRO POR GRADO)
// ============================================

const searchOrganicos = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Usuario no autenticado"
      });
    }

    const { term, negocioId, tipo, grado } = req.query;

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

    if (!grado || isNaN(parseFloat(grado))) {
      return res.status(400).json({
        success: false,
        message: "Grado requerido para filtrar los orgánicos"
      });
    }

    const userInfo = {
      negocioId: parseInt(negocioId),
      userId: req.user.id_usuario,
      role: req.user.rol_nombre,
      username: req.user.usuario
    };

    const results = await nuevaVentaService.searchOrganicos(term, tipo, parseFloat(grado), userInfo);

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

    if (!ventaData.tiendaId) {
      return res.status(400).json({
        success: false,
        message: "ID de tienda requerido"
      });
    }

    // Validar que haya al menos un producto o lente
    const tieneLentes = ventaData.lentes && ventaData.lentes.length > 0;
    const tieneProductos = ventaData.productos && ventaData.productos.length > 0;

    if (!tieneLentes && !tieneProductos) {
      return res.status(400).json({
        success: false,
        message: "Debe agregar al menos un lente o un producto"
      });
    }

    // Si tiene lentes, es obligatorio el cliente
    if (tieneLentes && !ventaData.clientId) {
      return res.status(400).json({
        success: false,
        message: "ID de cliente requerido para ventas con lentes"
      });
    }

    // Si solo tiene productos, el cliente es opcional
    // Si no tiene cliente, creamos un cliente genérico "Venta sin cliente"
    if (!ventaData.clientId && tieneProductos && !tieneLentes) {
      // Crear un cliente genérico para ventas sin cliente
      const { query } = require("../../db");
      
      // Buscar si ya existe el cliente genérico
      const clienteGenericoResult = await query(
        `
        SELECT id_persona FROM persona 
        WHERE nombre = 'Venta' AND apellido = 'Sin Cliente' 
        AND id_tipo_cliente IS NULL
        LIMIT 1
        `,
        []
      );

      let clienteId;
      if (clienteGenericoResult.rows.length > 0) {
        clienteId = clienteGenericoResult.rows[0].id_persona;
      } else {
        // Crear cliente genérico
        const newClienteResult = await query(
          `
          INSERT INTO persona (nombre, apellido, celular, estado)
          VALUES ('Venta', 'Sin Cliente', '0', 'activo')
          RETURNING id_persona
          `,
          []
        );
        clienteId = newClienteResult.rows[0].id_persona;
      }
      
      ventaData.clientId = clienteId;
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
      data: {
        idPedido: result.idPedido,
        codigoVenta: result.codigoVenta,
        estadoPago: result.estadoPago,
        total: result.total
      }
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