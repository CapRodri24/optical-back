// src/routes/ConfiguracionRoutes.js
const express = require("express");
const router = express.Router();
const configuracionController = require("../controllers/ConfiguracionController");
const { authenticate } = require("../middleware/loginmiddleware");

// ============================================
// RUTAS DE TIENDAS
// ============================================

// Obtener todas las tiendas del administrador
router.get("/tiendas", authenticate, configuracionController.getTiendasAdmin);

// Obtener una tienda por ID
router.get("/tienda/:id", authenticate, configuracionController.getTiendaById);

// Actualizar información de una tienda
router.put("/tienda/:id", authenticate, configuracionController.actualizarTienda);

// Subir logo de una tienda
router.post("/tienda/:id/logo", authenticate, configuracionController.subirLogo);

// Obtener logo de una tienda
router.get("/tienda/:id/logo", authenticate, configuracionController.getLogo);

// ============================================
// RUTAS DE SOLICITUDES
// ============================================

// Obtener solicitudes del administrador
router.get("/solicitudes", authenticate, configuracionController.getSolicitudes);

// Crear una nueva solicitud (nueva tienda o más usuarios)
router.post("/solicitudes", authenticate, configuracionController.crearSolicitud);

// Actualizar estado de una solicitud
router.put("/solicitudes/:id", authenticate, configuracionController.actualizarSolicitud);

// ============================================
// RUTAS DE PAGOS
// ============================================

// Obtener pagos de tiendas
router.get("/pagos", authenticate, configuracionController.getPagos);

module.exports = router;