// src/routes/cajaRoutes.js
const express = require("express");
const router = express.Router();
const cajaController = require("../controllers/CajaController");
const { authenticate } = require("../middleware/loginmiddleware");

// TODAS las rutas de caja requieren autenticación
router.get("/estado", authenticate, cajaController.getEstado);
router.get("/movimientos", authenticate, cajaController.getMovimientos);
router.get("/totales-hoy", authenticate, cajaController.getTotalesHoy);
router.get("/stats", authenticate, cajaController.getStats);
router.post("/movimiento", authenticate, cajaController.registrarMovimiento);
router.post("/abrir", authenticate, cajaController.abrirCaja);
router.post("/cerrar", authenticate, cajaController.cerrarCaja);
router.get("/tipos-movimiento", authenticate, cajaController.getTiposMovimiento);

module.exports = router;