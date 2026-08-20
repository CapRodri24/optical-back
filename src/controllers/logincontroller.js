// src/controllers/logincontroller.js
const loginService = require("../services/loginservice");

const login = async (req, res) => {
  try {
    const { username, password } = req.body;

    console.log("=== Login Controller ===");
    console.log("Username:", username);

    // Validar campos requeridos
    if (!username || !password) {
      console.log("Campos faltantes");
      return res.status(400).json({
        success: false,
        message: "Usuario y contraseña son requeridos"
      });
    }

    const result = await loginService.authenticateUser(username, password);

    console.log("Resultado autenticación:", result.success);
    if (result.success) {
      console.log("Tiendas en respuesta:", result.stores?.length || 0);
      console.log("Usuario tiendaIds:", result.user.tiendaIds);
      
      res.json({
        success: true,
        message: "Inicio de sesión exitoso",
        token: result.token,
        user: result.user,
        stores: result.stores || [],
        negocioId: result.negocioId
      });
    } else {
      res.status(401).json({
        success: false,
        message: result.message
      });
    }
  } catch (error) {
    console.error("Error en login controller:", error);
    res.status(500).json({
      success: false,
      message: "Error interno del servidor"
    });
  }
};

const logout = async (req, res) => {
  try {
    res.json({
      success: true,
      message: "Sesión cerrada exitosamente"
    });
  } catch (error) {
    console.error("Error en logout controller:", error);
    res.status(500).json({
      success: false,
      message: "Error interno del servidor"
    });
  }
};

const verifyToken = async (req, res) => {
  try {
    if (req.user) {
      const stores = await loginService.getUserStores(req.user.id_usuario);
      
      console.log("=== verifyToken ===");
      console.log("Usuario:", req.user.usuario);
      console.log("Tiendas encontradas:", stores.length);
      
      res.json({
        success: true,
        user: req.user,
        stores: stores || []
      });
    } else {
      res.status(401).json({
        success: false,
        message: "Token inválido o expirado"
      });
    }
  } catch (error) {
    console.error("Error en verifyToken controller:", error);
    res.status(500).json({
      success: false,
      message: "Error interno del servidor"
    });
  }
};

const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id_usuario;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Contraseña actual y nueva son requeridas"
      });
    }

    const result = await loginService.changePassword(userId, currentPassword, newPassword);

    if (result.success) {
      res.json({
        success: true,
        message: "Contraseña cambiada exitosamente"
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.message
      });
    }
  } catch (error) {
    console.error("Error en changePassword controller:", error);
    res.status(500).json({
      success: false,
      message: "Error interno del servidor"
    });
  }
};

const getCurrentUser = async (req, res) => {
  try {
    if (req.user) {
      const stores = await loginService.getUserStores(req.user.id_usuario);
      
      console.log("=== getCurrentUser ===");
      console.log("Usuario:", req.user.usuario);
      console.log("Tiendas encontradas:", stores.length);
      
      res.json({
        success: true,
        user: req.user,
        stores: stores || []
      });
    } else {
      res.status(401).json({
        success: false,
        message: "Usuario no autenticado"
      });
    }
  } catch (error) {
    console.error("Error en getCurrentUser controller:", error);
    res.status(500).json({
      success: false,
      message: "Error interno del servidor"
    });
  }
};

module.exports = {
  login,
  logout,
  verifyToken,
  changePassword,
  getCurrentUser
};