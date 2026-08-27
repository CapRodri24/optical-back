// src/routes/PagosPendientesRoutes.js
const express = require("express");
const router = express.Router();
const pagosPendientesController = require("../controllers/PagosPendientesController");
const { authenticate } = require("../middleware/loginmiddleware");

// ============================================
// TODAS LAS RUTAS REQUIEREN AUTENTICACIÓN
// ============================================

router.use(authenticate);

// ============================================
// RUTAS ESTÁTICAS (DEBEN IR PRIMERO)
// ============================================

// Obtener estadísticas de pagos
router.get("/estadisticas", pagosPendientesController.getEstadisticasPagos);

// ============================================
// RUTAS DINÁMICAS (DEBEN IR AL FINAL)
// ============================================

// Obtener todas las entregas con saldo pendiente
// Query params: tiendaId, dateFilterType, specificDate, startDate, endDate
router.get("/con-saldo", pagosPendientesController.getEntregasConSaldo);

// Obtener todas las entregas
// Query params: tiendaId, dateFilterType, specificDate, startDate, endDate
router.get("/", pagosPendientesController.getEntregas);

// Obtener una entrega por ID
router.get("/:id", pagosPendientesController.getEntregaById);

// Obtener una entrega por ID de venta
router.get("/venta/:ventaId", pagosPendientesController.getEntregaByVentaId);

// Obtener historial de pagos de una entrega
router.get("/:id/pagos", pagosPendientesController.getHistorialPagos);

// Registrar un pago para una entrega
router.post("/:id/pagos", pagosPendientesController.registrarPago);

module.exports = router;