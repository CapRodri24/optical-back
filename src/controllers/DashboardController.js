// src/controllers/DashboardController.js
const dashboardService = require("../services/DashboardService");

const getDashboardStats = async (req, res) => {
  try {
    const userId = req.user.id_usuario;
    const userRole = req.user.rol_nombre;

    const stats = await dashboardService.getDashboardStats(userId, userRole);

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error("Error en getDashboardStats:", error);
    res.status(500).json({
      success: false,
      message: "Error al obtener las estadísticas del dashboard"
    });
  }
};

const getSalesVariation = async (req, res) => {
  try {
    const userId = req.user.id_usuario;
    const userRole = req.user.rol_nombre;

    const variation = await dashboardService.getSalesVariation(userId, userRole);

    res.json({
      success: true,
      data: variation
    });
  } catch (error) {
    console.error("Error en getSalesVariation:", error);
    res.status(500).json({
      success: false,
      message: "Error al obtener la variación de ventas"
    });
  }
};

const getDailyGoalProgress = async (req, res) => {
  try {
    const userId = req.user.id_usuario;
    const userRole = req.user.rol_nombre;

    const progress = await dashboardService.getDailyGoalProgress(userId, userRole);

    res.json({
      success: true,
      data: progress
    });
  } catch (error) {
    console.error("Error en getDailyGoalProgress:", error);
    res.status(500).json({
      success: false,
      message: "Error al obtener el progreso de lentes vendidos"
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

    const stats = await dashboardService.getDashboardStatsByStore(userId, userRole);

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error("Error en getDashboardStatsByStore:", error);
    res.status(500).json({
      success: false,
      message: "Error al obtener las estadísticas por tienda"
    });
  }
};

const getSalesVariationByStore = async (req, res) => {
  try {
    const userId = req.user.id_usuario;
    const userRole = req.user.rol_nombre;

    const variation = await dashboardService.getSalesVariationByStore(userId, userRole);

    res.json({
      success: true,
      data: variation
    });
  } catch (error) {
    console.error("Error en getSalesVariationByStore:", error);
    res.status(500).json({
      success: false,
      message: "Error al obtener la variación de ventas por tienda"
    });
  }
};

const getDailyGoalProgressByStore = async (req, res) => {
  try {
    const userId = req.user.id_usuario;
    const userRole = req.user.rol_nombre;

    const progress = await dashboardService.getDailyGoalProgressByStore(userId, userRole);

    res.json({
      success: true,
      data: progress
    });
  } catch (error) {
    console.error("Error en getDailyGoalProgressByStore:", error);
    res.status(500).json({
      success: false,
      message: "Error al obtener el progreso de lentes vendidos por tienda"
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