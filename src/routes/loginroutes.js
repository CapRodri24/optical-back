// src/routes/loginroutes.js
const express = require("express");
const router = express.Router();
const loginController = require("../controllers/logincontroller");
const { authenticate } = require("../middleware/loginmiddleware");

// Rutas de autenticación
router.post("/auth/login", loginController.login);
router.post("/auth/logout", loginController.logout);
router.get("/auth/verify", authenticate, loginController.verifyToken);
router.post("/auth/change-password", authenticate, loginController.changePassword);
router.get("/auth/me", authenticate, loginController.getCurrentUser);

module.exports = router;