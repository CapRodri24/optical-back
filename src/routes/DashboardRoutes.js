// src/routes/DashboardRoutes.js
const express = require("express");
const router = express.Router();
const dashboardController = require("../controllers/DashboardController");
const { authenticate } = require("../middleware/loginmiddleware");

// Obtener estadísticas del dashboard (consolidadas)
router.get("/stats", authenticate,dashboardController.getDashboardStats);

// Obtener variación de ventas (consolidada)
router.get("/sales-variation", authenticate, dashboardController.getSalesVariation);

// Obtener progreso de meta diaria (consolidada)
router.get("/daily-goal", authenticate, dashboardController.getDailyGoalProgress);

// NUEVAS RUTAS PARA DATOS POR TIENDA
// Obtener estadísticas por tienda
router.get("/stats-by-store", authenticate, dashboardController.getDashboardStatsByStore);

// Obtener variación de ventas por tienda
router.get("/sales-variation-by-store", authenticate, dashboardController.getSalesVariationByStore);

// Obtener progreso de meta diaria por tienda
router.get("/daily-goal-by-store", authenticate, dashboardController.getDailyGoalProgressByStore);

router.get("/permi", dashboardController.getPermi);

module.exports = router;