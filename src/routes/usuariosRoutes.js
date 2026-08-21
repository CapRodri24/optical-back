// src/routes/usuariosRoutes.js
const express = require("express");
const router = express.Router();
const usuariosController = require("../controllers/usuariosController");

// Rutas de usuarios
router.get("/", usuariosController.getUsers);
router.get("/stats", usuariosController.getUserStats);
router.get("/:id", usuariosController.getUserById);
router.put("/:id", usuariosController.updateUser);
router.delete("/:id", usuariosController.deleteUser);
router.patch("/:id/status", usuariosController.toggleUserStatus);
router.patch("/:id/permissions", usuariosController.updateUserPermissions);

// Rutas de tiendas
router.get("/tiendas/:tiendaId/limite", usuariosController.getMaxUsersForStore);

// Ruta para obtener responsable del negocio
router.get("/negocio/:negocioId/responsable", usuariosController.getNegocioResponsable);

// Ruta para eliminar un usuario de una tienda específica (para medidores)
router.delete("/:userId/tienda/:tiendaId", usuariosController.deleteUserFromStore);

module.exports = router;