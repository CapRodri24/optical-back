// src/controllers/DashboardController.js
const dashboardService = require("../services/DashboardService");

const getDashboardStats = async (req, res) => {
  try {
    const userId = req.user.id_usuario;
    const userRole = req.user.rol_nombre;

    console.log(`Obteniendo dashboard stats para usuario ${userId} con rol ${userRole}`);

    const stats = await dashboardService.getDashboardStats(userId, userRole);

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error("Error en getDashboardStats:", error);
    console.error("Stack trace:", error.stack);
    res.status(500).json({
      success: false,
      message: "Error al obtener las estadísticas del dashboard",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

const getSalesVariation = async (req, res) => {
  try {
    const userId = req.user.id_usuario;
    const userRole = req.user.rol_nombre;

    console.log(`Obteniendo variación de ventas para usuario ${userId}`);

    const variation = await dashboardService.getSalesVariation(userId, userRole);

    res.json({
      success: true,
      data: variation
    });
  } catch (error) {
    console.error("Error en getSalesVariation:", error);
    console.error("Stack trace:", error.stack);
    res.status(500).json({
      success: false,
      message: "Error al obtener la variación de ventas",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

const getDailyGoalProgress = async (req, res) => {
  try {
    const userId = req.user.id_usuario;
    const userRole = req.user.rol_nombre;

    console.log(`Obteniendo progreso de lentes para usuario ${userId}`);

    const progress = await dashboardService.getDailyGoalProgress(userId, userRole);

    res.json({
      success: true,
      data: progress
    });
  } catch (error) {
    console.error("Error en getDailyGoalProgress:", error);
    console.error("Stack trace:", error.stack);
    res.status(500).json({
      success: false,
      message: "Error al obtener el progreso de lentes vendidos",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ============================================
// NUEVOS CONTROLADORES PARA DATOS POR TIENDA
// ============================================

const getDashboardStatsByStore = async (req, res) => {
  try {
    const userId = req.user.id_usuario;
    const userRole = req.user.rol_nombre;

    console.log(`Obteniendo dashboard stats por tienda para usuario ${userId}`);

    const stats = await dashboardService.getDashboardStatsByStore(userId, userRole);

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error("Error en getDashboardStatsByStore:", error);
    console.error("Stack trace:", error.stack);
    res.status(500).json({
      success: false,
      message: "Error al obtener las estadísticas por tienda",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

const getSalesVariationByStore = async (req, res) => {
  try {
    const userId = req.user.id_usuario;
    const userRole = req.user.rol_nombre;

    console.log(`Obteniendo variación por tienda para usuario ${userId}`);

    const variation = await dashboardService.getSalesVariationByStore(userId, userRole);

    res.json({
      success: true,
      data: variation
    });
  } catch (error) {
    console.error("Error en getSalesVariationByStore:", error);
    console.error("Stack trace:", error.stack);
    res.status(500).json({
      success: false,
      message: "Error al obtener la variación de ventas por tienda",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

const getDailyGoalProgressByStore = async (req, res) => {
  try {
    const userId = req.user.id_usuario;
    const userRole = req.user.rol_nombre;

    console.log(`Obteniendo progreso por tienda para usuario ${userId}`);

    const progress = await dashboardService.getDailyGoalProgressByStore(userId, userRole);

    res.json({
      success: true,
      data: progress
    });
  } catch (error) {
    console.error("Error en getDailyGoalProgressByStore:", error);
    console.error("Stack trace:", error.stack);
    res.status(500).json({
      success: false,
      message: "Error al obtener el progreso de lentes vendidos por tienda",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  getDashboardStats,
  getSalesVariation,
  getDailyGoalProgress,
  getDashboardStatsByStore,
  getSalesVariationByStore,
  getDailyGoalProgressByStore
};