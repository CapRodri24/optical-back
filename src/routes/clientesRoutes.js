// src/routes/clientesRoutes.js
const express = require("express");
const router = express.Router();
const clientesController = require("../controllers/clientesController");

// ============================================
// RUTAS ESTÁTICAS (DEBEN IR PRIMERO)
// ============================================

// Rutas de tipos de cliente
router.get("/tipos", clientesController.getTiposCliente);
router.post("/tipos", clientesController.createTipoCliente);
router.put("/tipos/:id", clientesController.updateTipoCliente);
router.delete("/tipos/:id", clientesController.deleteTipoCliente);

// ============================================
// RUTAS DINÁMICAS (DEBEN IR AL FINAL)
// ============================================

// Rutas de clientes
router.get("/", clientesController.getClientes);
router.get("/search", clientesController.searchClientes);
router.get("/:id", clientesController.getClienteById);
router.post("/", clientesController.createCliente);
router.put("/:id", clientesController.updateCliente);
router.delete("/:id", clientesController.deleteCliente);

// Rutas de medidas de clientes
router.get("/:id/medidas", clientesController.getClienteMedidas);
router.post("/:id/medidas", clientesController.saveClienteMedidas);
router.delete("/:id/medidas", clientesController.deleteClienteMedidas);

// Rutas de ventas de clientes
router.get("/:id/ventas", clientesController.getClienteVentas);

module.exports = router;