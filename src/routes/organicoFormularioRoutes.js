// src/routes/organicoFormularioRoutes.js
const express = require("express");
const router = express.Router();
const organicoFormularioController = require("../controllers/organicoFormularioController");
const { authenticate } = require("../middleware/loginmiddleware");

// Solo obtener tiendas disponibles (información)
router.get("/tiendas", authenticate, organicoFormularioController.getTiendasDisponibles);

module.exports = router;