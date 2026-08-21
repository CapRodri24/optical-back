// src/routes/usuariosRoutes.js
const express = require("express");
const router = express.Router();
const usuariosController = require("../controllers/usuariosController");

// Rutas de usuarios
router.get("/", usuariosController.getUsers);
router.get("/stats", usuariosController.getUserStats);
router.get("/:id", usuariosController.getUserById);
router.post("/buscar-carnet", usuariosController.findUserByCarnet);
router.post("/verificar-usuario", usuariosController.isUsernameTaken);
router.post("/", usuariosController.createUser);
router.put("/:id", usuariosController.updateUser);
router.delete("/:id", usuariosController.deleteUser);
router.patch("/:id/status", usuariosController.toggleUserStatus);
router.patch("/:id/permissions", usuariosController.updateUserPermissions);

// Rutas de tiendas
router.get("/tiendas", usuariosController.getTiendas);
router.get("/admin-stores/:adminId", usuariosController.getAdminStores);
router.get("/tiendas/:tiendaId/limite", usuariosController.getMaxUsersForStore);
router.put("/tiendas/:tiendaId/limite", usuariosController.setMaxUsersForStore);
router.get("/tiendas/:tiendaId/can-add", usuariosController.canAddUserToStore);

// Solicitudes de tiendas
router.get("/solicitudes/tiendas", usuariosController.getStoreRequests);
router.post("/solicitudes/tiendas", usuariosController.addStoreRequest);
router.patch("/solicitudes/tiendas/:id", usuariosController.updateStoreRequest);

// Solicitudes de aumento de usuarios
router.get("/solicitudes/usuarios", usuariosController.getUserLimitRequests);
router.post("/solicitudes/usuarios", usuariosController.addUserLimitRequest);
router.patch("/solicitudes/usuarios/:id", usuariosController.updateUserLimitRequest);

// Pagos
router.get("/pagos", usuariosController.getStorePayments);
router.put("/pagos/:tiendaId", usuariosController.updateStorePayment);

// Medidores
router.get("/medidores/solicitudes", usuariosController.getMedidorAssignmentRequests);
router.post("/medidores/solicitudes", usuariosController.addMedidorAssignmentRequest);
router.patch("/medidores/solicitudes/:id", usuariosController.updateMedidorAssignmentRequest);
router.post("/medidores/asignar", usuariosController.assignMedidorToStore);
router.post("/medidores/remover", usuariosController.removeMedidorFromStore);
router.get("/medidores/:medidorId/tiendas", usuariosController.getMedidorStores);

module.exports = router;