// src/routes/MedidasOftalmicasRoutes.js
const express = require("express");
const router = express.Router();
const medidasOftalmicasController = require("../controllers/MedidasOftalmicasController");

// ============================================
// RUTAS DE MEDIDAS OFTÁLMICAS
// ============================================

// Obtener medidas de un cliente
router.get("/:clientId", medidasOftalmicasController.getMedidas);

// Guardar o actualizar medidas de un cliente
router.post("/", medidasOftalmicasController.saveMedidas);

// Eliminar medidas de un cliente
router.delete("/:clientId", medidasOftalmicasController.deleteMedidas);

module.exports = router;