// src/routes/crearTiendaroutes.js
const express = require("express");
const router = express.Router();
const crearTiendaController = require("../controllers/crearTiendaController");

router.post("/crear", crearTiendaController.crearTienda);
router.post("/validar-carnet", crearTiendaController.validarCarnet);
router.post("/validar-usuario", crearTiendaController.validarUsuario);
router.get("/stats", crearTiendaController.getStats);
router.get("/tiendas", crearTiendaController.getTiendas);
router.get("/tienda/:id", crearTiendaController.getTiendaById);
router.put("/tienda/:id", crearTiendaController.updateTienda);
router.delete("/tienda/:id", crearTiendaController.deleteTienda);
router.get("/tienda/:id/estado", crearTiendaController.verificarEstadoTienda);

module.exports = router;