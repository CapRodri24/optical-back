// src/routes/reportesRoutes.js
const express = require("express");
const router = express.Router();
const reportesController = require("../controllers/reportesController");
const { authenticate } = require("../middleware/loginmiddleware");

// Todas las rutas requieren autenticación
router.get("/completo", authenticate, reportesController.getReporteCompleto);
router.get("/resumen", authenticate, reportesController.getResumen);
router.get("/ventas-por-mes", authenticate, reportesController.getVentasPorMes);
router.get("/ventas-por-categoria", authenticate, reportesController.getVentasPorCategoria);
router.get("/top-productos", authenticate, reportesController.getTopProductos);
router.get("/bottom-productos", authenticate, reportesController.getBottomProductos);
router.get("/clientes-frecuentes", authenticate, reportesController.getClientesFrecuentes);
router.get("/metodos-pago", authenticate, reportesController.getMetodosPago);
router.get("/movimientos-stock", authenticate, reportesController.getMovimientosStock);
router.get("/productos-unicos", authenticate, reportesController.getProductosUnicos);
router.get("/usuarios-unicos", authenticate, reportesController.getUsuariosUnicos);
router.get("/date-filter-options", authenticate, reportesController.getDateFilterOptions);

module.exports = router;