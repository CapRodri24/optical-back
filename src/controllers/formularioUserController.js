// src/controllers/formularioUserController.js
const formularioUserService = require("../services/formularioUserService");

// ============================================
// FORMULARIO DE USUARIOS
// ============================================

const findUserByCarnet = async (req, res) => {
  try {
    const { carnet } = req.body;
    if (!carnet) {
      return res.status(400).json({ success: false, message: "Carnet es requerido" });
    }
    const user = await formularioUserService.findUserByCarnet(carnet);
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
    const taken = await formularioUserService.isUsernameTaken(username, excludeUserId);
    res.json({ success: true, taken });
  } catch (error) {
    console.error("Error en isUsernameTaken:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

const getMaxUsersForStore = async (req, res) => {
  try {
    const { tiendaId } = req.params;
    const maxUsers = await formularioUserService.getMaxUsersForStore(tiendaId);
    res.json({ success: true, maxUsers });
  } catch (error) {
    console.error("Error en getMaxUsersForStore:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

const canAddUserToStore = async (req, res) => {
  try {
    const { tiendaId } = req.params;
    const canAdd = await formularioUserService.canAddUserToStore(tiendaId);
    res.json({ success: true, canAdd });
  } catch (error) {
    console.error("Error en canAddUserToStore:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

const createUser = async (req, res) => {
  try {
    const userData = req.body;
    const newUser = await formularioUserService.createUser(userData);
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
    const updatedUser = await formularioUserService.updateUser(id, userData);
    res.json({ success: true, user: updatedUser });
  } catch (error) {
    console.error("Error en updateUser:", error);
    res.status(400).json({ success: false, message: error.message });
  }
};

module.exports = {
  findUserByCarnet,
  isUsernameTaken,
  getMaxUsersForStore,
  canAddUserToStore,
  createUser,
  updateUser,
};