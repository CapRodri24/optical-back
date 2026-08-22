// src/routes/materialesRoutes.js
const express = require("express");
const router = express.Router();
const materialesController = require("../controllers/materialesController");

// ============================================
// RUTAS ESTÁTICAS (DEBEN IR PRIMERO)
// ============================================

// Rutas de tiendas
router.get("/tiendas", materialesController.getTiendas);

// Rutas de tipos de material
router.get("/types", materialesController.getMaterialTypes);
router.post("/types", materialesController.createMaterialType);
router.put("/types/:nombre", materialesController.updateMaterialType);
router.delete("/types/:nombre", materialesController.deleteMaterialType);

// Rutas de estadísticas y alertas
router.get("/stats", materialesController.getMaterialStats);
router.get("/low-stock", materialesController.getLowStockAlerts);

// Rutas de stock
router.post("/add-stock", materialesController.addStock);
router.post("/transfer-stock", materialesController.transferStock);

// ============================================
// RUTAS DINÁMICAS (DEBEN IR AL FINAL)
// ============================================

// Rutas de materiales (con :id)
router.get("/", materialesController.getMateriales);
router.post("/", materialesController.createMaterial);
router.get("/:id", materialesController.getMaterialById);
router.put("/:id", materialesController.updateMaterial);
router.delete("/:id", materialesController.deleteMaterial);

module.exports = router;