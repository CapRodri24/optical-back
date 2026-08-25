// src/services/ConfiguracionService.js
const { query } = require("../../db");

// ============================================
// FUNCIONES DE UTILIDAD
// ============================================

// Obtener datos del usuario y su negocio
const getUserData = async (userId) => {
  try {
    const queryStr = `
      SELECT 
        u.id_usuario,
        p.nombre,
        p.apellido,
        p.celular,
        n.id_negocio,
        n.nombre_negocio
      FROM usuario u
      INNER JOIN persona p ON p.id_persona = u.id_persona
      INNER JOIN usuario_tienda ut ON ut.id_usuario = u.id_usuario
      INNER JOIN tienda t ON t.id_tienda = ut.id_tienda
      INNER JOIN negocio n ON n.id_negocio = t.id_negocio
      WHERE u.id_usuario = $1
      LIMIT 1
    `;

    const result = await query(queryStr, [userId]);
    
    if (result.rows.length === 0) {
      return null;
    }

    return {
      id_usuario: result.rows[0].id_usuario,
      nombre: `${result.rows[0].nombre} ${result.rows[0].apellido}`,
      celular: result.rows[0].celular,
      negocioId: result.rows[0].id_negocio,
      negocioNombre: result.rows[0].nombre_negocio
    };
  } catch (error) {
    console.error("Error en getUserData:", error);
    throw new Error("Error al obtener datos del usuario");
  }
};

// Verificar si el usuario tiene acceso a una tienda
const verifyUserStoreAccess = async (userId, tiendaId) => {
  try {
    const queryStr = `
      SELECT 1
      FROM usuario_tienda
      WHERE id_usuario = $1 AND id_tienda = $2
    `;

    const result = await query(queryStr, [userId, tiendaId]);
    return result.rows.length > 0;
  } catch (error) {
    console.error("Error en verifyUserStoreAccess:", error);
    return false;
  }
};

// ============================================
// FUNCIONES DE TIENDAS
// ============================================

// Obtener tiendas del administrador - MODIFICADO para incluir logo
const getTiendasAdmin = async (userId, userRole) => {
  try {
    let queryStr = "";
    let params = [];

    if (userRole === 'Spider Admin') {
      queryStr = `
        SELECT 
          t.id_tienda as id,
          t.nombre_tienda as nombre,
          t.celular as telefono,
          t.ubicacion,
          t.logo,
          t.cant_usuarios as max_usuarios,
          t.estado,
          COUNT(DISTINCT ut.id_usuario) as usuarios_actuales,
          t.fecha_pago,
          t.precio
        FROM tienda t
        LEFT JOIN usuario_tienda ut ON ut.id_tienda = t.id_tienda
        WHERE t.estado != 'eliminado'
        GROUP BY t.id_tienda
        ORDER BY t.nombre_tienda
      `;
    } else {
      queryStr = `
        SELECT 
          t.id_tienda as id,
          t.nombre_tienda as nombre,
          t.celular as telefono,
          t.ubicacion,
          t.logo,
          t.cant_usuarios as max_usuarios,
          t.estado,
          COUNT(DISTINCT ut.id_usuario) as usuarios_actuales,
          t.fecha_pago,
          t.precio
        FROM tienda t
        INNER JOIN usuario_tienda ut2 ON ut2.id_tienda = t.id_tienda
        LEFT JOIN usuario_tienda ut ON ut.id_tienda = t.id_tienda
        WHERE ut2.id_usuario = $1 AND t.estado != 'eliminado'
        GROUP BY t.id_tienda
        ORDER BY t.nombre_tienda
      `;
      params = [userId];
    }

    const result = await query(queryStr, params);

    return result.rows.map(row => ({
      id: String(row.id),
      nombre: row.nombre,
      telefono: row.telefono || "",
      ubicacion: row.ubicacion || "",
      logo: row.logo ? row.logo.toString('base64') : "", // <--- MODIFICADO: incluir logo
      maxUsuarios: row.max_usuarios || 1,
      usuariosActuales: parseInt(row.usuarios_actuales) || 0,
      estado: row.estado || "activo",
      fechaPago: row.fecha_pago,
      precio: parseFloat(row.precio) || 500
    }));
  } catch (error) {
    console.error("Error en getTiendasAdmin:", error);
    throw new Error("Error al obtener las tiendas del administrador");
  }
};

// Obtener tienda por ID
const getTiendaById = async (tiendaId, userId) => {
  try {
    // Verificar acceso
    const hasAccess = await verifyUserStoreAccess(userId, tiendaId);
    if (!hasAccess) {
      throw new Error("No tienes acceso a esta tienda");
    }

    const queryStr = `
      SELECT 
        t.id_tienda as id,
        t.nombre_tienda as nombre,
        t.celular as telefono,
        t.ubicacion,
        t.logo,
        t.cant_usuarios as max_usuarios,
        t.estado,
        COUNT(DISTINCT ut.id_usuario) as usuarios_actuales,
        t.fecha_pago,
        t.precio
      FROM tienda t
      LEFT JOIN usuario_tienda ut ON ut.id_tienda = t.id_tienda
      WHERE t.id_tienda = $1 AND t.estado != 'eliminado'
      GROUP BY t.id_tienda
    `;

    const result = await query(queryStr, [tiendaId]);

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      id: String(row.id),
      nombre: row.nombre,
      telefono: row.telefono || "",
      ubicacion: row.ubicacion || "",
      logo: row.logo ? row.logo.toString('base64') : "",
      maxUsuarios: row.max_usuarios || 1,
      usuariosActuales: parseInt(row.usuarios_actuales) || 0,
      estado: row.estado || "activo",
      fechaPago: row.fecha_pago,
      precio: parseFloat(row.precio) || 500
    };
  } catch (error) {
    console.error("Error en getTiendaById:", error);
    throw new Error("Error al obtener la tienda");
  }
};

// Actualizar tienda
const actualizarTienda = async ({ tiendaId, userId, telefono, ubicacion, countryCode }) => {
  try {
    // Verificar acceso
    const hasAccess = await verifyUserStoreAccess(userId, tiendaId);
    if (!hasAccess) {
      throw new Error("No tienes acceso a esta tienda");
    }

    // Formatear teléfono con código de país
    const telefonoCompleto = `${countryCode} ${telefono}`;

    const queryStr = `
      UPDATE tienda
      SET celular = $1, ubicacion = $2
      WHERE id_tienda = $3 AND estado != 'eliminado'
      RETURNING 
        id_tienda as id,
        nombre_tienda as nombre,
        celular as telefono,
        ubicacion,
        logo
    `;

    const result = await query(queryStr, [telefonoCompleto, ubicacion, tiendaId]);

    if (result.rows.length === 0) {
      throw new Error("Tienda no encontrada");
    }

    return {
      id: String(result.rows[0].id),
      nombre: result.rows[0].nombre,
      telefono: result.rows[0].telefono || "",
      ubicacion: result.rows[0].ubicacion || "",
      logo: result.rows[0].logo ? result.rows[0].logo.toString('base64') : ""
    };
  } catch (error) {
    console.error("Error en actualizarTienda:", error);
    throw new Error(error.message || "Error al actualizar la tienda");
  }
};

// Subir logo de tienda
const subirLogo = async ({ tiendaId, userId, logo }) => {
  try {
    // Verificar acceso
    const hasAccess = await verifyUserStoreAccess(userId, tiendaId);
    if (!hasAccess) {
      throw new Error("No tienes acceso a esta tienda");
    }

    // logo ya viene como base64 desde el controlador
    const logoBuffer = Buffer.from(logo, 'base64');

    const queryStr = `
      UPDATE tienda
      SET logo = $1
      WHERE id_tienda = $2 AND estado != 'eliminado'
      RETURNING 
        id_tienda as id,
        logo
    `;

    const result = await query(queryStr, [logoBuffer, tiendaId]);

    if (result.rows.length === 0) {
      throw new Error("Tienda no encontrada");
    }

    return {
      logo: result.rows[0].logo ? result.rows[0].logo.toString('base64') : ""
    };
  } catch (error) {
    console.error("Error en subirLogo:", error);
    throw new Error(error.message || "Error al subir el logo");
  }
};

// Obtener logo de tienda
const getLogo = async (tiendaId) => {
  try {
    const queryStr = `
      SELECT logo
      FROM tienda
      WHERE id_tienda = $1 AND estado != 'eliminado'
    `;

    const result = await query(queryStr, [tiendaId]);

    if (result.rows.length === 0 || !result.rows[0].logo) {
      return null;
    }

    return result.rows[0].logo.toString('base64');
  } catch (error) {
    console.error("Error en getLogo:", error);
    throw new Error("Error al obtener el logo");
  }
};

// ============================================
// FUNCIONES DE SOLICITUDES
// ============================================

// Obtener solicitudes del administrador
const getSolicitudes = async (userId) => {
  try {
    const queryStr = `
      SELECT 
        s.id_solicitud as id,
        s.id_admin as admin_id,
        s.admin_name,
        s.tienda_nombre,
        s.ubicacion,
        s.telefono,
        s.estado,
        s.fecha_solicitud,
        s.fecha_respuesta,
        s.tipo,
        s.cantidad_usuarios,
        s.id_tienda
      FROM solicitud_tienda s
      WHERE s.id_admin = $1
      ORDER BY s.fecha_solicitud DESC
    `;

    const result = await query(queryStr, [userId]);

    return result.rows.map(row => ({
      id: String(row.id),
      adminId: String(row.admin_id),
      adminName: row.admin_name,
      tiendaNombre: row.tienda_nombre,
      ubicacion: row.ubicacion,
      telefono: row.telefono,
      estado: row.estado || "pendiente",
      fechaSolicitud: row.fecha_solicitud.toISOString(),
      fechaRespuesta: row.fecha_respuesta ? row.fecha_respuesta.toISOString() : undefined,
      tipo: row.tipo || "nueva_tienda",
      cantidadUsuarios: row.cantidad_usuarios || 0,
      tiendaId: row.id_tienda ? String(row.id_tienda) : undefined
    }));
  } catch (error) {
    console.error("Error en getSolicitudes:", error);
    throw new Error("Error al obtener las solicitudes");
  }
};

// Crear solicitud
const crearSolicitud = async ({
  adminId,
  adminName,
  tiendaNombre,
  ubicacion,
  telefono,
  tipo,
  cantidadUsuarios,
  tiendaId,
  negocioId
}) => {
  try {
    const queryStr = `
      INSERT INTO solicitud_tienda (
        id_admin,
        admin_name,
        tienda_nombre,
        ubicacion,
        telefono,
        estado,
        fecha_solicitud,
        tipo,
        cantidad_usuarios,
        id_tienda,
        id_negocio
      ) VALUES ($1, $2, $3, $4, $5, 'pendiente', NOW(), $6, $7, $8, $9)
      RETURNING 
        id_solicitud as id,
        id_admin as admin_id,
        admin_name,
        tienda_nombre,
        ubicacion,
        telefono,
        estado,
        fecha_solicitud,
        tipo,
        cantidad_usuarios,
        id_tienda
    `;

    const params = [
      adminId,
      adminName,
      tiendaNombre,
      ubicacion,
      telefono,
      tipo || "nueva_tienda",
      cantidadUsuarios || 0,
      tiendaId || null,
      negocioId || null
    ];

    console.log("📝 Creando solicitud con params:", { adminId, adminName, tiendaNombre, ubicacion, telefono, tipo, cantidadUsuarios, tiendaId, negocioId });

    const result = await query(queryStr, params);

    const row = result.rows[0];
    return {
      id: String(row.id),
      adminId: String(row.admin_id),
      adminName: row.admin_name,
      tiendaNombre: row.tienda_nombre,
      ubicacion: row.ubicacion,
      telefono: row.telefono,
      estado: row.estado || "pendiente",
      fechaSolicitud: row.fecha_solicitud.toISOString(),
      tipo: row.tipo || "nueva_tienda",
      cantidadUsuarios: row.cantidad_usuarios || 0,
      tiendaId: row.id_tienda ? String(row.id_tienda) : undefined
    };
  } catch (error) {
    console.error("Error en crearSolicitud:", error);
    throw new Error("Error al crear la solicitud");
  }
};

// Actualizar solicitud
const actualizarSolicitud = async (solicitudId, estado) => {
  try {
    // Primero obtener la solicitud
    const getQuery = `
      SELECT id_solicitud, tipo, tienda_nombre, ubicacion, telefono, id_negocio, cantidad_usuarios
      FROM solicitud_tienda
      WHERE id_solicitud = $1
    `;
    const getResult = await query(getQuery, [solicitudId]);

    if (getResult.rows.length === 0) {
      throw new Error("Solicitud no encontrada");
    }

    const solicitud = getResult.rows[0];

    // Actualizar solicitud
    const updateQuery = `
      UPDATE solicitud_tienda
      SET estado = $1, fecha_respuesta = NOW()
      WHERE id_solicitud = $2
      RETURNING 
        id_solicitud as id,
        id_admin as admin_id,
        admin_name,
        tienda_nombre,
        ubicacion,
        telefono,
        estado,
        fecha_solicitud,
        fecha_respuesta,
        tipo,
        cantidad_usuarios,
        id_tienda
    `;

    const result = await query(updateQuery, [estado, solicitudId]);

    // Si es aprobada y es nueva tienda, crear la tienda con estado 'inactivo'
    if (estado === 'aprobada' && solicitud.tipo === 'nueva_tienda') {
      // Crear la tienda con estado 'inactivo'
      const createStoreQuery = `
        INSERT INTO tienda (
          id_negocio,
          nombre_tienda,
          ubicacion,
          celular,
          cant_usuarios,
          estado,
          fecha_pago,
          precio
        ) VALUES ($1, $2, $3, $4, $5, 'inactivo', NOW() + INTERVAL '30 days', $6)
        RETURNING id_tienda
      `;

      const storeResult = await query(createStoreQuery, [
        solicitud.id_negocio,
        solicitud.tienda_nombre,
        solicitud.ubicacion,
        solicitud.telefono,
        1,
        500
      ]);

      const newTiendaId = storeResult.rows[0].id_tienda;

      // Actualizar solicitud con el ID de la tienda creada
      const updateStoreQuery = `
        UPDATE solicitud_tienda
        SET id_tienda = $1
        WHERE id_solicitud = $2
      `;
      await query(updateStoreQuery, [newTiendaId, solicitudId]);
    }

    // Si es aprobada y es más usuarios
    if (estado === 'aprobada' && solicitud.tipo === 'mas_usuarios') {
      // Actualizar la cantidad de usuarios de la tienda
      const updateUserCountQuery = `
        UPDATE tienda
        SET cant_usuarios = cant_usuarios + $1
        WHERE id_tienda = (
          SELECT id_tienda 
          FROM solicitud_tienda 
          WHERE id_solicitud = $2
        )
      `;
      await query(updateUserCountQuery, [solicitud.cantidad_usuarios, solicitudId]);
    }

    const row = result.rows[0];
    return {
      id: String(row.id),
      adminId: String(row.admin_id),
      adminName: row.admin_name,
      tiendaNombre: row.tienda_nombre,
      ubicacion: row.ubicacion,
      telefono: row.telefono,
      estado: row.estado || "pendiente",
      fechaSolicitud: row.fecha_solicitud.toISOString(),
      fechaRespuesta: row.fecha_respuesta ? row.fecha_respuesta.toISOString() : undefined,
      tipo: row.tipo || "nueva_tienda",
      cantidadUsuarios: row.cantidad_usuarios || 0,
      tiendaId: row.id_tienda ? String(row.id_tienda) : undefined
    };
  } catch (error) {
    console.error("Error en actualizarSolicitud:", error);
    throw new Error(error.message || "Error al actualizar la solicitud");
  }
};

// ============================================
// FUNCIONES DE PAGOS
// ============================================

// Obtener pagos del administrador
const getPagos = async (userId) => {
  try {
    const queryStr = `
      SELECT 
        t.id_tienda as tienda_id,
        t.nombre_tienda as tienda_nombre,
        t.fecha_pago as proximo_pago,
        t.precio as monto,
        t.estado,
        t.fecha_pago as fecha_pago
      FROM tienda t
      INNER JOIN usuario_tienda ut ON ut.id_tienda = t.id_tienda
      WHERE ut.id_usuario = $1 AND t.estado != 'eliminado'
      ORDER BY t.nombre_tienda
    `;

    const result = await query(queryStr, [userId]);

    return result.rows.map(row => {
      const fechaPago = row.proximo_pago ? new Date(row.proximo_pago) : new Date();
      const hoy = new Date();
      const pagado = fechaPago > hoy;

      return {
        tiendaId: String(row.tienda_id),
        tiendaNombre: row.tienda_nombre,
        proximoPago: row.proximo_pago ? row.proximo_pago.toISOString() : new Date().toISOString(),
        monto: parseFloat(row.monto) || 500,
        pagado: pagado,
        fechaPago: row.fecha_pago ? row.fecha_pago.toISOString() : undefined
      };
    });
  } catch (error) {
    console.error("Error en getPagos:", error);
    throw new Error("Error al obtener los pagos");
  }
};

module.exports = {
  getUserData,
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