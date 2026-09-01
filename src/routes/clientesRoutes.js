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

// Rutas de zonas de cliente
router.get("/zonas", clientesController.getZonasCliente);
router.post("/zonas", clientesController.createZonaCliente);
router.put("/zonas/:id", clientesController.updateZonaCliente);
router.delete("/zonas/:id", clientesController.deleteZonaCliente);

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


module.exports = router;