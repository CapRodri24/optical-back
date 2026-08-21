// src/routes/formularioUserRoutes.js
const express = require("express");
const router = express.Router();
const formularioUserController = require("../controllers/formularioUserController");

// Rutas para el formulario de usuarios
router.post("/buscar-carnet", formularioUserController.findUserByCarnet);
router.post("/verificar-usuario", formularioUserController.isUsernameTaken);
router.get("/tiendas/:tiendaId/limite", formularioUserController.getMaxUsersForStore);
router.get("/tiendas/:tiendaId/can-add", formularioUserController.canAddUserToStore);
router.post("/", formularioUserController.createUser);
router.put("/:id", formularioUserController.updateUser);

module.exports = router;