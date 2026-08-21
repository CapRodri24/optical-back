// src/controllers/usuariosController.js
const usuariosService = require("../services/usuariosService");

// ============================================
// USUARIOS
// ============================================

const getUsers = async (req, res) => {
  try {
    const { tiendaId } = req.query;
    const users = await usuariosService.getUsers(tiendaId);
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

const findUserByCarnet = async (req, res) => {
  try {
    const { carnet } = req.body;
    if (!carnet) {
      return res.status(400).json({ success: false, message: "Carnet es requerido" });
    }
    const user = await usuariosService.findUserByCarnet(carnet);
    res.json({ success: true, user });
  } catch (error) {
    console.error("Error en findUserByCarnet:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

const isUsernameTaken = async (req, res) => {
  try {
    const { username, excludeUserId } = req.body;
    if (!username) {
      return res.status(400).json({ success: false, message: "Usuario es requerido" });
    }
    const taken = await usuariosService.isUsernameTaken(username, excludeUserId);
    res.json({ success: true, taken });
  } catch (error) {
    console.error("Error en isUsernameTaken:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

const createUser = async (req, res) => {
  try {
    const userData = req.body;
    const newUser = await usuariosService.createUser(userData);
    res.status(201).json({ success: true, user: newUser });
  } catch (error) {
    console.error("Error en createUser:", error);
    res.status(400).json({ success: false, message: error.message });
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
// TIENDAS
// ============================================

const getTiendas = async (req, res) => {
  try {
    const tiendas = await usuariosService.getTiendas();
    res.json({ success: true, tiendas });
  } catch (error) {
    console.error("Error en getTiendas:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

const getAdminStores = async (req, res) => {
  try {
    const { adminId } = req.params;
    const stores = await usuariosService.getAdminStores(adminId);
    res.json({ success: true, stores });
  } catch (error) {
    console.error("Error en getAdminStores:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

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

const setMaxUsersForStore = async (req, res) => {
  try {
    const { tiendaId } = req.params;
    const { maxUsers } = req.body;
    await usuariosService.setMaxUsersForStore(tiendaId, maxUsers);
    res.json({ success: true, message: "Límite actualizado exitosamente" });
  } catch (error) {
    console.error("Error en setMaxUsersForStore:", error);
    res.status(400).json({ success: false, message: error.message });
  }
};

const canAddUserToStore = async (req, res) => {
  try {
    const { tiendaId } = req.params;
    const canAdd = await usuariosService.canAddUserToStore(tiendaId);
    res.json({ success: true, canAdd });
  } catch (error) {
    console.error("Error en canAddUserToStore:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ============================================
// SOLICITUDES DE TIENDAS
// ============================================

const getStoreRequests = async (req, res) => {
  try {
    const requests = await usuariosService.getStoreRequests();
    res.json({ success: true, requests });
  } catch (error) {
    console.error("Error en getStoreRequests:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

const addStoreRequest = async (req, res) => {
  try {
    const request = req.body;
    const newRequest = await usuariosService.addStoreRequest(request);
    res.status(201).json({ success: true, request: newRequest });
  } catch (error) {
    console.error("Error en addStoreRequest:", error);
    res.status(400).json({ success: false, message: error.message });
  }
};

const updateStoreRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { estado } = req.body;
    const updatedRequest = await usuariosService.updateStoreRequest(id, estado);
    res.json({ success: true, request: updatedRequest });
  } catch (error) {
    console.error("Error en updateStoreRequest:", error);
    res.status(400).json({ success: false, message: error.message });
  }
};

// ============================================
// SOLICITUDES DE AUMENTO DE USUARIOS
// ============================================

const getUserLimitRequests = async (req, res) => {
  try {
    const requests = await usuariosService.getUserLimitRequests();
    res.json({ success: true, requests });
  } catch (error) {
    console.error("Error en getUserLimitRequests:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

const addUserLimitRequest = async (req, res) => {
  try {
    const request = req.body;
    const newRequest = await usuariosService.addUserLimitRequest(request);
    res.status(201).json({ success: true, request: newRequest });
  } catch (error) {
    console.error("Error en addUserLimitRequest:", error);
    res.status(400).json({ success: false, message: error.message });
  }
};

const updateUserLimitRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { estado } = req.body;
    const updatedRequest = await usuariosService.updateUserLimitRequest(id, estado);
    res.json({ success: true, request: updatedRequest });
  } catch (error) {
    console.error("Error en updateUserLimitRequest:", error);
    res.status(400).json({ success: false, message: error.message });
  }
};

// ============================================
// PAGOS
// ============================================

const getStorePayments = async (req, res) => {
  try {
    const payments = await usuariosService.getStorePayments();
    res.json({ success: true, payments });
  } catch (error) {
    console.error("Error en getStorePayments:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

const updateStorePayment = async (req, res) => {
  try {
    const { tiendaId } = req.params;
    const { proximoPago, monto } = req.body;
    const payment = await usuariosService.updateStorePayment(tiendaId, proximoPago, monto);
    res.json({ success: true, payment });
  } catch (error) {
    console.error("Error en updateStorePayment:", error);
    res.status(400).json({ success: false, message: error.message });
  }
};

// ============================================
// MEDIDORES
// ============================================

const getMedidorAssignmentRequests = async (req, res) => {
  try {
    const requests = await usuariosService.getMedidorAssignmentRequests();
    res.json({ success: true, requests });
  } catch (error) {
    console.error("Error en getMedidorAssignmentRequests:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

const addMedidorAssignmentRequest = async (req, res) => {
  try {
    const request = req.body;
    const newRequest = await usuariosService.addMedidorAssignmentRequest(request);
    res.status(201).json({ success: true, request: newRequest });
  } catch (error) {
    console.error("Error en addMedidorAssignmentRequest:", error);
    res.status(400).json({ success: false, message: error.message });
  }
};

const updateMedidorAssignmentRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { estado } = req.body;
    const updatedRequest = await usuariosService.updateMedidorAssignmentRequest(id, estado);
    res.json({ success: true, request: updatedRequest });
  } catch (error) {
    console.error("Error en updateMedidorAssignmentRequest:", error);
    res.status(400).json({ success: false, message: error.message });
  }
};

const assignMedidorToStore = async (req, res) => {
  try {
    const { medidorId, tiendaId } = req.body;
    const medidor = await usuariosService.assignMedidorToStore(medidorId, tiendaId);
    res.json({ success: true, user: medidor });
  } catch (error) {
    console.error("Error en assignMedidorToStore:", error);
    res.status(400).json({ success: false, message: error.message });
  }
};

const removeMedidorFromStore = async (req, res) => {
  try {
    const { medidorId, tiendaId } = req.body;
    const medidor = await usuariosService.removeMedidorFromStore(medidorId, tiendaId);
    res.json({ success: true, user: medidor });
  } catch (error) {
    console.error("Error en removeMedidorFromStore:", error);
    res.status(400).json({ success: false, message: error.message });
  }
};

const getMedidorStores = async (req, res) => {
  try {
    const { medidorId } = req.params;
    const stores = await usuariosService.getMedidorStores(medidorId);
    res.json({ success: true, stores });
  } catch (error) {
    console.error("Error en getMedidorStores:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  // Usuarios
  getUsers,
  getUserById,
  findUserByCarnet,
  isUsernameTaken,
  createUser,
  updateUser,
  deleteUser,
  toggleUserStatus,
  updateUserPermissions,
  getUserStats,
  // Tiendas
  getTiendas,
  getAdminStores,
  getMaxUsersForStore,
  setMaxUsersForStore,
  canAddUserToStore,
  // Solicitudes tiendas
  getStoreRequests,
  addStoreRequest,
  updateStoreRequest,
  // Solicitudes usuarios
  getUserLimitRequests,
  addUserLimitRequest,
  updateUserLimitRequest,
  // Pagos
  getStorePayments,
  updateStorePayment,
  // Medidores
  getMedidorAssignmentRequests,
  addMedidorAssignmentRequest,
  updateMedidorAssignmentRequest,
  assignMedidorToStore,
  removeMedidorFromStore,
  getMedidorStores,
};