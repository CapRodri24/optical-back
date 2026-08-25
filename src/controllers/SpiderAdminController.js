// src/controllers/SpiderAdminController.js
const spiderAdminService = require("../services/SpiderAdminService");

const getDashboardStats = async (req, res) => {
  try {
    const stats = await spiderAdminService.getDashboardStats();

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error("Error en getDashboardStats:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Error al obtener estadísticas"
    });
  }
};

const getIngresosMensuales = async (req, res) => {
  try {
    const ingresos = await spiderAdminService.getIngresosMensuales();

    res.json({
      success: true,
      data: ingresos
    });
  } catch (error) {
    console.error("Error en getIngresosMensuales:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Error al obtener ingresos mensuales"
    });
  }
};

const getNegocios = async (req, res) => {
  try {
    const negocios = await spiderAdminService.getNegocios();

    res.json({
      success: true,
      data: negocios
    });
  } catch (error) {
    console.error("Error en getNegocios:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Error al obtener negocios"
    });
  }
};

const getNegocioById = async (req, res) => {
  try {
    const { id } = req.params;
    const negocio = await spiderAdminService.getNegocioById(id);

    if (!negocio) {
      return res.status(404).json({
        success: false,
        message: "Negocio no encontrado"
      });
    }

    res.json({
      success: true,
      data: negocio
    });
  } catch (error) {
    console.error("Error en getNegocioById:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Error al obtener negocio"
    });
  }
};

const getAdmins = async (req, res) => {
  try {
    const admins = await spiderAdminService.getAdmins();

    res.json({
      success: true,
      data: admins
    });
  } catch (error) {
    console.error("Error en getAdmins:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Error al obtener administradores"
    });
  }
};

const getAdminById = async (req, res) => {
  try {
    const { id } = req.params;
    const admin = await spiderAdminService.getAdminById(id);

    if (!admin) {
      return res.status(404).json({
        success: false,
        message: "Administrador no encontrado"
      });
    }

    res.json({
      success: true,
      data: admin
    });
  } catch (error) {
    console.error("Error en getAdminById:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Error al obtener administrador"
    });
  }
};

const getTiendas = async (req, res) => {
  try {
    const tiendas = await spiderAdminService.getTiendas();

    res.json({
      success: true,
      data: tiendas
    });
  } catch (error) {
    console.error("Error en getTiendas:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Error al obtener tiendas"
    });
  }
};

const getTiendaById = async (req, res) => {
  try {
    const { id } = req.params;
    const tienda = await spiderAdminService.getTiendaById(id);

    if (!tienda) {
      return res.status(404).json({
        success: false,
        message: "Tienda no encontrada"
      });
    }

    res.json({
      success: true,
      data: tienda
    });
  } catch (error) {
    console.error("Error en getTiendaById:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Error al obtener tienda"
    });
  }
};

const createStore = async (req, res) => {
  try {
    const { adminId, nombre, ubicacion, telefono, countryCode } = req.body;

    if (!adminId || !nombre || !ubicacion || !telefono) {
      return res.status(400).json({
        success: false,
        message: "Todos los campos son requeridos"
      });
    }

    const nuevaTienda = await spiderAdminService.createStore({
      adminId,
      nombre,
      ubicacion,
      telefono,
      countryCode: countryCode || "+591"
    });

    res.json({
      success: true,
      data: nuevaTienda,
      message: "Tienda creada correctamente"
    });
  } catch (error) {
    console.error("Error en createStore:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Error al crear tienda"
    });
  }
};

const updateUserLimit = async (req, res) => {
  try {
    const { id } = req.params;
    const { newLimit } = req.body;

    if (!newLimit || newLimit < 1) {
      return res.status(400).json({
        success: false,
        message: "El límite debe ser mayor a 0"
      });
    }

    const tienda = await spiderAdminService.updateUserLimit({
      storeId: id,
      newLimit
    });

    res.json({
      success: true,
      data: tienda,
      message: "Límite actualizado correctamente"
    });
  } catch (error) {
    console.error("Error en updateUserLimit:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Error al actualizar límite"
    });
  }
};

const getPaymentHistory = async (req, res) => {
  try {
    const { tiendaId } = req.params;
    const payments = await spiderAdminService.getPaymentHistory(tiendaId);

    res.json({
      success: true,
      data: payments
    });
  } catch (error) {
    console.error("Error en getPaymentHistory:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Error al obtener historial de pagos"
    });
  }
};

const getAllPayments = async (req, res) => {
  try {
    const payments = await spiderAdminService.getAllPayments();

    res.json({
      success: true,
      data: payments
    });
  } catch (error) {
    console.error("Error en getAllPayments:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Error al obtener pagos"
    });
  }
};

const registerPayment = async (req, res) => {
  try {
    const { adminId, storeId, monto, metodo, pagoEfectivo, pagoQR } = req.body;

    if (!adminId || !storeId || !monto || !metodo) {
      return res.status(400).json({
        success: false,
        message: "Todos los campos son requeridos"
      });
    }

    if (monto <= 0) {
      return res.status(400).json({
        success: false,
        message: "El monto debe ser mayor a 0"
      });
    }

    if (metodo === "Mixto") {
      const efectivo = parseFloat(pagoEfectivo) || 0;
      const qr = parseFloat(pagoQR) || 0;
      if (efectivo + qr !== monto) {
        return res.status(400).json({
          success: false,
          message: "El total pagado no coincide con el monto a pagar"
        });
      }
    }

    const pago = await spiderAdminService.registerPayment({
      adminId,
      storeId,
      monto,
      metodo,
      pagoEfectivo: pagoEfectivo || 0,
      pagoQR: pagoQR || 0
    });

    res.json({
      success: true,
      data: pago,
      message: "Pago registrado correctamente"
    });
  } catch (error) {
    console.error("Error en registerPayment:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Error al registrar pago"
    });
  }
};

const getRequests = async (req, res) => {
  try {
    const requests = await spiderAdminService.getRequests();

    res.json({
      success: true,
      data: requests
    });
  } catch (error) {
    console.error("Error en getRequests:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Error al obtener solicitudes"
    });
  }
};

const approveRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { adminId } = req.body;

    if (!adminId) {
      return res.status(400).json({
        success: false,
        message: "AdminId es requerido"
      });
    }

    const request = await spiderAdminService.approveRequest({
      requestId: id,
      adminId
    });

    res.json({
      success: true,
      data: request,
      message: "Solicitud aprobada correctamente"
    });
  } catch (error) {
    console.error("Error en approveRequest:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Error al aprobar solicitud"
    });
  }
};

const rejectRequest = async (req, res) => {
  try {
    const { id } = req.params;

    const request = await spiderAdminService.rejectRequest(id);

    res.json({
      success: true,
      data: request,
      message: "Solicitud rechazada correctamente"
    });
  } catch (error) {
    console.error("Error en rejectRequest:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Error al rechazar solicitud"
    });
  }
};

const getTiendaLogos = async (req, res) => {
  try {
    const logos = await spiderAdminService.getTiendaLogos();

    res.json({
      success: true,
      data: logos
    });
  } catch (error) {
    console.error("Error en getTiendaLogos:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Error al obtener logos"
    });
  }
};

const saveTiendaLogo = async (req, res) => {
  try {
    const { tiendaId } = req.params;
    const { logo } = req.body;

    if (!logo) {
      return res.status(400).json({
        success: false,
        message: "Logo es requerido"
      });
    }

    const logoSize = Buffer.from(logo.split(',')[1] || logo, 'base64').length;
    if (logoSize > 5 * 1024 * 1024) {
      return res.status(400).json({
        success: false,
        message: "El logo no puede superar los 5MB"
      });
    }

    const mimeType = logo.match(/^data:(image\/[a-zA-Z]+);base64,/);
    if (!mimeType) {
      return res.status(400).json({
        success: false,
        message: "Formato de imagen no válido"
      });
    }

    const format = mimeType[1];
    if (format !== 'image/jpeg' && format !== 'image/png') {
      return res.status(400).json({
        success: false,
        message: "Solo se permiten formatos JPG y PNG"
      });
    }

    await spiderAdminService.saveTiendaLogo(tiendaId, logo);

    res.json({
      success: true,
      message: "Logo guardado correctamente"
    });
  } catch (error) {
    console.error("Error en saveTiendaLogo:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Error al guardar logo"
    });
  }
};

module.exports = {
  getDashboardStats,
  getIngresosMensuales,
  getNegocios,
  getNegocioById,
  getAdmins,
  getAdminById,
  getTiendas,
  getTiendaById,
  createStore,
  updateUserLimit,
  getPaymentHistory,
  getAllPayments,
  registerPayment,
  getRequests,
  approveRequest,
  rejectRequest,
  getTiendaLogos,
  saveTiendaLogo
};