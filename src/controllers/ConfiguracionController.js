// src/controllers/ConfiguracionController.js
const configuracionService = require("../services/ConfiguracionService");

// ============================================
// CONTROLADORES DE TIENDAS
// ============================================

const getTiendasAdmin = async (req, res) => {
  try {
    const userId = req.user.id_usuario;
    const userRole = req.user.rol_nombre;

    const tiendas = await configuracionService.getTiendasAdmin(userId, userRole);

    res.json({
      success: true,
      data: tiendas
    });
  } catch (error) {
    console.error("Error en getTiendasAdmin:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Error al obtener las tiendas"
    });
  }
};

const getTiendaById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id_usuario;

    const tienda = await configuracionService.getTiendaById(id, userId);

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
      message: error.message || "Error al obtener la tienda"
    });
  }
};

const actualizarTienda = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id_usuario;
    const { telefono, ubicacion, countryCode } = req.body;

    if (!telefono || !ubicacion) {
      return res.status(400).json({
        success: false,
        message: "Teléfono y ubicación son requeridos"
      });
    }

    const tiendaActualizada = await configuracionService.actualizarTienda({
      tiendaId: id,
      userId,
      telefono,
      ubicacion,
      countryCode
    });

    res.json({
      success: true,
      data: tiendaActualizada,
      message: "Tienda actualizada correctamente"
    });
  } catch (error) {
    console.error("Error en actualizarTienda:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Error al actualizar la tienda"
    });
  }
};

const subirLogo = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id_usuario;
    const { logo } = req.body;

    if (!logo) {
      return res.status(400).json({
        success: false,
        message: "Logo es requerido"
      });
    }

    // Validar tamaño de la imagen (máximo 5MB)
    const logoSize = Buffer.from(logo.split(',')[1] || logo, 'base64').length;
    if (logoSize > 5 * 1024 * 1024) {
      return res.status(400).json({
        success: false,
        message: "El logo no puede superar los 5MB"
      });
    }

    // Validar formato de la imagen (jpg o png)
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

    const resultado = await configuracionService.subirLogo({
      tiendaId: id,
      userId,
      logo
    });

    res.json({
      success: true,
      data: resultado,
      message: "Logo actualizado correctamente"
    });
  } catch (error) {
    console.error("Error en subirLogo:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Error al subir el logo"
    });
  }
};

const getLogo = async (req, res) => {
  try {
    const { id } = req.params;

    const logo = await configuracionService.getLogo(id);

    res.json({
      success: true,
      data: { logo }
    });
  } catch (error) {
    console.error("Error en getLogo:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Error al obtener el logo"
    });
  }
};

// ============================================
// CONTROLADORES DE SOLICITUDES
// ============================================

const getSolicitudes = async (req, res) => {
  try {
    const userId = req.user.id_usuario;

    const solicitudes = await configuracionService.getSolicitudes(userId);

    res.json({
      success: true,
      data: solicitudes
    });
  } catch (error) {
    console.error("Error en getSolicitudes:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Error al obtener las solicitudes"
    });
  }
};

const crearSolicitud = async (req, res) => {
  try {
    const userId = req.user.id_usuario;
    const { 
      tiendaNombre, 
      ubicacion, 
      telefono, 
      tipo, 
      cantidadUsuarios, 
      tiendaId 
    } = req.body;

    console.log("📥 Crear solicitud - Body recibido:", req.body);

    // Validaciones
    if (!tiendaNombre || !ubicacion || !telefono) {
      return res.status(400).json({
        success: false,
        message: "Todos los campos son requeridos"
      });
    }

    if (tipo === "mas_usuarios" && (!tiendaId || !cantidadUsuarios || cantidadUsuarios < 1)) {
      return res.status(400).json({
        success: false,
        message: "Para solicitar más usuarios, especifica la tienda y la cantidad"
      });
    }

    // Obtener datos del usuario y su negocio
    const userData = await configuracionService.getUserData(userId);
    
    console.log("👤 UserData obtenido:", userData);
    
    if (!userData) {
      return res.status(404).json({
        success: false,
        message: "Usuario no encontrado"
      });
    }

    const solicitud = await configuracionService.crearSolicitud({
      adminId: userId,
      adminName: userData.nombre,
      tiendaNombre,
      ubicacion,
      telefono,
      tipo: tipo || "nueva_tienda",
      cantidadUsuarios: cantidadUsuarios || 0,
      tiendaId: tiendaId || null,
      negocioId: userData.negocioId
    });

    console.log("✅ Solicitud creada:", solicitud);

    res.json({
      success: true,
      data: solicitud,
      message: "Solicitud creada correctamente"
    });
  } catch (error) {
    console.error("Error en crearSolicitud:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Error al crear la solicitud"
    });
  }
};

const actualizarSolicitud = async (req, res) => {
  try {
    const { id } = req.params;
    const { estado } = req.body;

    if (!estado || !["aprobada", "rechazada"].includes(estado)) {
      return res.status(400).json({
        success: false,
        message: "Estado inválido. Debe ser 'aprobada' o 'rechazada'"
      });
    }

    const solicitud = await configuracionService.actualizarSolicitud(id, estado);

    res.json({
      success: true,
      data: solicitud,
      message: `Solicitud ${estado} correctamente`
    });
  } catch (error) {
    console.error("Error en actualizarSolicitud:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Error al actualizar la solicitud"
    });
  }
};

// ============================================
// CONTROLADORES DE PAGOS
// ============================================

const getPagos = async (req, res) => {
  try {
    const userId = req.user.id_usuario;

    const pagos = await configuracionService.getPagos(userId);

    res.json({
      success: true,
      data: pagos
    });
  } catch (error) {
    console.error("Error en getPagos:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Error al obtener los pagos"
    });
  }
};

module.exports = {
  getTiendasAdmin,
  getTiendaById,
  actualizarTienda,
  subirLogo,
  getLogo,
  getSolicitudes,
  crearSolicitud,
  actualizarSolicitud,
  getPagos
};