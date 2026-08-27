// src/routes/HistorialVentasRoutes.js
const express = require("express");
const router = express.Router();
const historialVentasController = require("../controllers/HistorialVentasController");
const { authenticate } = require("../middleware/loginmiddleware");

// ============================================
// TODAS LAS RUTAS REQUIEREN AUTENTICACIÓN
// ============================================

router.use(authenticate);

// ============================================
// RUTAS ESTÁTICAS (DEBEN IR PRIMERO)
// ============================================

// Obtener resumen de ventas
router.get("/resumen", historialVentasController.getResumenVentas);

// Obtener resumen por cliente
router.get("/resumen-clientes", historialVentasController.getResumenClientes);

// Obtener estadísticas rápidas
router.get("/estadisticas", historialVentasController.getEstadisticasRapidas);

// Obtener tiendas disponibles
router.get("/tiendas", historialVentasController.getTiendas);

// Obtener métodos de pago disponibles
router.get("/metodos-pago", historialVentasController.getMetodosPago);

// Obtener tipos de filtro de fecha disponibles
router.get("/tipos-filtro-fecha", historialVentasController.getTiposFiltroFecha);

// ============================================
// RUTAS DINÁMICAS (DEBEN IR AL FINAL)
// ============================================

// Obtener todas las ventas con filtros
// Query params: dateFilterType, specificDate, startDate, endDate, selectedMetodoPago, searchTerm, tiendaId, sortDirection, negocioId
router.get("/", historialVentasController.getVentas);

// Obtener venta por ID
// Query params: negocioId, tiendaId
router.get("/:id", historialVentasController.getVentaById);

// Obtener ventas por código
// Query params: negocioId, tiendaId
router.get("/codigo/:codigoVenta", historialVentasController.getVentasByCodigo);

// Obtener ventas por cliente
// Query params: negocioId, tiendaId
router.get("/cliente/:clientName", historialVentasController.getVentasByCliente);

module.exports = router;