// src/routes/EntregasPendientesRoutes.js
const express = require("express");
const router = express.Router();
const entregasPendientesController = require("../controllers/EntregasPendientesController");
const { authenticate } = require("../middleware/loginmiddleware");

// ============================================
// TODAS LAS RUTAS REQUIEREN AUTENTICACIÓN
// ============================================

router.use(authenticate);

// ============================================
// RUTAS ESTÁTICAS (DEBEN IR PRIMERO)
// ============================================

// Obtener estadísticas de entregas
router.get("/estadisticas", entregasPendientesController.getEstadisticasEntregas);

// ============================================
// RUTAS DINÁMICAS (DEBEN IR AL FINAL)
// ============================================

// Obtener todas las entregas
router.get("/", entregasPendientesController.getEntregas);

// Obtener una entrega por ID
router.get("/:id", entregasPendientesController.getEntregaById);

// Obtener una entrega por ID de venta
router.get("/venta/:ventaId", entregasPendientesController.getEntregaByVentaId);

// Crear una nueva entrega
router.post("/", entregasPendientesController.crearEntrega);

// Actualizar una entrega
router.patch("/:id", entregasPendientesController.actualizarEntrega);

// Marcar una entrega como entregada
router.patch("/:id/entregar", entregasPendientesController.marcarEntregado);

// Registrar un pago para una entrega
router.post("/:id/pagos", entregasPendientesController.registrarPago);

// Eliminar una entrega
router.delete("/:id", entregasPendientesController.eliminarEntrega);

module.exports = router;