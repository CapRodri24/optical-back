// src/controllers/ConfiguracionController.js
const configuracionService = require("../services/ConfiguracionService");
const multer = require("multer");
const path = require("path");

// Configurar multer para manejar archivos en memoria
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten archivos JPG y PNG'));
    }
  }
});

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

// CORREGIDO: Usar multer para manejar el logo como archivo
const subirLogo = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id_usuario;

    // Usar multer para procesar el archivo
    upload.single('logo')(req, res, async (err) => {
      if (err) {
        return res.status(400).json({
          success: false,
          message: err.message || "Error al subir el archivo"
        });
      }

      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: "Logo es requerido"
        });
      }

      // Convertir el buffer a base64
      const logoBase64 = req.file.buffer.toString('base64');

      const resultado = await configuracionService.subirLogo({
        tiendaId: id,
        userId,
        logo: logoBase64
      });

      res.json({
        success: true,
        data: resultado,
        message: "Logo actualizado correctamente"
      });
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