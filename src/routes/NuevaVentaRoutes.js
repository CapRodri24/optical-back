// src/routes/NuevaVentaRoutes.js
const express = require("express");
const router = express.Router();
const nuevaVentaController = require("../controllers/NuevaVentaController");
const { authenticate } = require("../middleware/loginmiddleware");

// ============================================
// TODAS LAS RUTAS REQUIEREN AUTENTICACIÓN
// ============================================

router.use(authenticate);

// ============================================
// RUTAS DE BÚSQUEDA
// ============================================

// Buscar orgánicos
router.get("/organicos/search", nuevaVentaController.searchOrganicos);

// Obtener precio de un orgánico por grado
router.get("/organicos/:id/price", nuevaVentaController.getOrganicPrice);

// Buscar materiales por tipo (Montura, Franela, Estuche)
router.get("/materiales/search", nuevaVentaController.searchMateriales);

// Buscar productos adicionales
router.get("/productos/search", nuevaVentaController.searchProductos);

// ============================================
// RUTA DE REGISTRO DE VENTA
// ============================================

// Registrar nueva venta
router.post("/registrar", nuevaVentaController.registrarVenta);

// Obtener ventas por cliente
router.get("/clientes/:clientId/ventas", nuevaVentaController.getVentasByClient);

module.exports = router;