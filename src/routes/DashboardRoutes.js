// src/routes/DashboardRoutes.js
const express = require("express");
const router = express.Router();
const dashboardController = require("../controllers/DashboardController");
const { authenticate } = require("../middleware/loginmiddleware");

// Obtener estadísticas del dashboard
router.get("/stats", authenticate, dashboardController.getDashboardStats);

// Obtener variación de ventas
router.get("/sales-variation", authenticate, dashboardController.getSalesVariation);

// Obtener progreso de meta diaria (lentes vendidos)
router.get("/daily-goal", authenticate, dashboardController.getDailyGoalProgress);

module.exports = router;