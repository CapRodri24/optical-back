// src/routes/SpiderAdminRoutes.js
const express = require("express");
const router = express.Router();
const spiderAdminController = require("../controllers/SpiderAdminController");
const { authenticate } = require("../middleware/loginmiddleware");

// ============================================
// RUTAS DE ESTADÍSTICAS
// ============================================

router.get("/dashboard/stats", authenticate, spiderAdminController.getDashboardStats);
router.get("/dashboard/ventas-mensuales", authenticate, spiderAdminController.getVentasMensuales);

// ============================================
// RUTAS DE NEGOCIOS
// ============================================

router.get("/negocios", authenticate, spiderAdminController.getNegocios);
router.get("/negocio/:id", authenticate, spiderAdminController.getNegocioById);

// ============================================
// RUTAS DE ADMINISTRADORES (Backward compatible)
// ============================================

router.get("/admins", authenticate, spiderAdminController.getAdmins);
router.get("/admin/:id", authenticate, spiderAdminController.getAdminById);

// ============================================
// RUTAS DE TIENDAS
// ============================================

router.get("/tiendas", authenticate, spiderAdminController.getTiendas);
router.get("/tienda/:id", authenticate, spiderAdminController.getTiendaById);
router.post("/tiendas", authenticate, spiderAdminController.createStore);
router.put("/tienda/:id/limite", authenticate, spiderAdminController.updateUserLimit);

// ============================================
// RUTAS DE PAGOS
// ============================================

router.get("/pagos/:tiendaId", authenticate, spiderAdminController.getPaymentHistory);
router.get("/pagos", authenticate, spiderAdminController.getAllPayments);
router.post("/pagos", authenticate, spiderAdminController.registerPayment);

// ============================================
// RUTAS DE SOLICITUDES
// ============================================

router.get("/solicitudes", authenticate, spiderAdminController.getRequests);
router.put("/solicitudes/:id/aprobar", authenticate, spiderAdminController.approveRequest);
router.put("/solicitudes/:id/rechazar", authenticate, spiderAdminController.rejectRequest);

// ============================================
// RUTAS DE LOGOS
// ============================================

router.get("/logos", authenticate, spiderAdminController.getTiendaLogos);
router.post("/logo/:tiendaId", authenticate, spiderAdminController.saveTiendaLogo);

module.exports = router;