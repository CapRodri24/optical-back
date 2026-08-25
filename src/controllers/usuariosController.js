// src/controllers/usuariosController.js
const usuariosService = require("../services/usuariosService");

// ============================================
// USUARIOS
// ============================================

const getUsers = async (req, res) => {
  try {
    const { tiendaId, negocioId } = req.query;
    const users = await usuariosService.getUsers(tiendaId, negocioId);
    res.json({ success: true, users });
  } catch (error) {
    console.error("Error en getUsers:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

const getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await usuariosService.getUserById(id);
    if (!user) {
      return res.status(404).json({ success: false, message: "Usuario no encontrado" });
    }
    res.json({ success: true, user });
  } catch (error) {
    console.error("Error en getUserById:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const userData = req.body;
    const updatedUser = await usuariosService.updateUser(id, userData);
    res.json({ success: true, user: updatedUser });
  } catch (error) {
    console.error("Error en updateUser:", error);
    res.status(400).json({ success: false, message: error.message });
  }
};

const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    await usuariosService.deleteUser(id);
    res.json({ success: true, message: "Usuario eliminado exitosamente" });
  } catch (error) {
    console.error("Error en deleteUser:", error);
    res.status(400).json({ success: false, message: error.message });
  }
};

const toggleUserStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const updatedUser = await usuariosService.toggleUserStatus(id);
    res.json({ success: true, user: updatedUser });
  } catch (error) {
    console.error("Error en toggleUserStatus:", error);
    res.status(400).json({ success: false, message: error.message });
  }
};

const updateUserPermissions = async (req, res) => {
  try {
    const { id } = req.params;
    const { granted, revoked } = req.body;
    const updatedUser = await usuariosService.updateUserPermissions(id, granted, revoked);
    res.json({ success: true, user: updatedUser });
  } catch (error) {
    console.error("Error en updateUserPermissions:", error);
    res.status(400).json({ success: false, message: error.message });
  }
};

const getUserStats = async (req, res) => {
  try {
    const stats = await usuariosService.getUserStats();
    res.json({ success: true, stats });
  } catch (error) {
    console.error("Error en getUserStats:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ============================================
// NUEVO: CAMBIAR CONTRASEÑA
// ============================================

const changePassword = async (req, res) => {
  try {
    const { id } = req.params;
    const { currentPassword, newPassword } = req.body;
    
    // Validar que los campos estén presentes
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ 
        success: false, 
        message: "La contraseña actual y la nueva contraseña son obligatorias" 
      });
    }
    
    // Validar que la nueva contraseña tenga al menos 6 caracteres
    if (newPassword.length < 6) {
      return res.status(400).json({ 
        success: false, 
        message: "La nueva contraseña debe tener al menos 6 caracteres" 
      });
    }
    
    // Validar que la nueva contraseña contenga letras y números
    if (!/[a-zA-Z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      return res.status(400).json({ 
        success: false, 
        message: "La nueva contraseña debe contener al menos una letra y un número" 
      });
    }
    
    // Cambiar la contraseña
    const result = await usuariosService.changePassword(id, currentPassword, newPassword);
    res.json(result);
  } catch (error) {
    console.error("Error en changePassword:", error);
    res.status(400).json({ 
      success: false, 
      message: error.message || "Error al cambiar la contraseña" 
    });
  }
};

// ============================================
// TIENDAS - Solo lo necesario
// ============================================

const getMaxUsersForStore = async (req, res) => {
  try {
    const { tiendaId } = req.params;
    const maxUsers = await usuariosService.getMaxUsersForStore(tiendaId);
    res.json({ success: true, maxUsers });
  } catch (error) {
    console.error("Error en getMaxUsersForStore:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ============================================
// NEGOCIO - Responsable
// ============================================

const getNegocioResponsable = async (req, res) => {
  try {
    const { negocioId } = req.params;
    const responsableId = await usuariosService.getNegocioResponsable(negocioId);
    res.json({ success: true, responsableId });
  } catch (error) {
    console.error("Error en getNegocioResponsable:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ============================================
// ELIMINAR USUARIO DE TIENDA (para medidores)
// ============================================

const deleteUserFromStore = async (req, res) => {
  try {
    const { userId, tiendaId } = req.params;
    const result = await usuariosService.deleteUserFromStore(userId, tiendaId);
    res.json({ success: true, message: "Usuario eliminado de la tienda exitosamente" });
  } catch (error) {
    console.error("Error en deleteUserFromStore:", error);
    res.status(400).json({ success: false, message: error.message });
  }
};

module.exports = {
  getUsers,
  getUserById,
  updateUser,
  deleteUser,
  toggleUserStatus,
  updateUserPermissions,
  getUserStats,
  changePassword, // <--- NUEVO
  getMaxUsersForStore,
  getNegocioResponsable,
  deleteUserFromStore,
};