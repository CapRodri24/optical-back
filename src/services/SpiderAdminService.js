// src/services/SpiderAdminService.js
const { query } = require("../../db");

// ============================================
// FUNCIONES DE UTILIDAD
// ============================================

// Obtener todos los negocios con sus responsables y tiendas
const getNegociosList = async () => {
  try {
    const queryStr = `
      SELECT 
        n.id_negocio as id,
        n.nombre_negocio,
        n.responsable_id,
        p.id_persona,
        p.nombre,
        p.apellido,
        p.celular,
        u.id_usuario
      FROM negocio n
      INNER JOIN persona p ON p.id_persona = n.responsable_id
      LEFT JOIN usuario u ON u.id_persona = p.id_persona
      WHERE u.id_rol = (SELECT id_rol FROM rol WHERE nombre = 'Administrador')
        AND u.estado = 'activo'
      ORDER BY n.nombre_negocio
    `;

    const result = await query(queryStr);
    return result.rows;
  } catch (error) {
    console.error("Error en getNegociosList:", error);
    throw new Error("Error al obtener negocios");
  }
};

// Obtener tiendas de un negocio
const getStoresByNegocio = async (negocioId) => {
  try {
    if (!negocioId) {
      return [];
    }

    const queryStr = `
      SELECT 
        t.id_tienda as id,
        t.nombre_tienda as nombre,
        t.ubicacion,
        t.celular as telefono,
        t.cant_usuarios as limite_usuarios,
        t.estado,
        t.fecha_pago as proximo_pago,
        t.precio,
        t.logo,
        t.id_negocio,
        n.nombre_negocio,
        COUNT(DISTINCT ut.id_usuario) as usuarios_actuales
      FROM tienda t
      LEFT JOIN usuario_tienda ut ON ut.id_tienda = t.id_tienda
      LEFT JOIN negocio n ON n.id_negocio = t.id_negocio
      WHERE t.id_negocio = $1 AND t.estado != 'eliminado'
      GROUP BY t.id_tienda, n.nombre_negocio
      ORDER BY t.nombre_tienda
    `;

    const result = await query(queryStr, [negocioId]);

    return result.rows.map(row => ({
      id: String(row.id),
      nombre: row.nombre,
      ubicacion: row.ubicacion || "",
      telefono: row.telefono || "",
      countryCode: "+591",
      fechaCreacion: new Date().toISOString().slice(0, 10),
      usuarios: parseInt(row.usuarios_actuales) || 0,
      limiteUsuarios: row.limite_usuarios || 1,
      logo: row.logo ? row.logo.toString('base64') : "",
      proximoPago: row.proximo_pago ? row.proximo_pago.toISOString() : new Date(Date.now() + 86400000 * 30).toISOString(),
      montoPago: row.precio ? parseFloat(row.precio) : 500,
      estado: row.estado || "activo",
      negocioId: row.id_negocio ? String(row.id_negocio) : null,
      negocioNombre: row.nombre_negocio
    }));
  } catch (error) {
    console.error(`Error en getStoresByNegocio para negocio ${negocioId}:`, error);
    return [];
  }
};

// ============================================
// FUNCIONES DE ESTADÍSTICAS
// ============================================

const getDashboardStats = async () => {
  try {
    const tiendasQuery = `SELECT COUNT(*) as total FROM tienda WHERE estado != 'eliminado'`;
    const tiendasResult = await query(tiendasQuery);

    const usuariosQuery = `SELECT COUNT(*) as total FROM usuario WHERE estado = 'activo'`;
    const usuariosResult = await query(usuariosQuery);

    const ingresosQuery = `
      SELECT COALESCE(SUM(precio), 0) as total
      FROM tienda
      WHERE estado != 'eliminado'
    `;
    const ingresosResult = await query(ingresosQuery);

    const requestsQuery = `
      SELECT COUNT(*) as total
      FROM solicitud_tienda
      WHERE estado = 'pendiente'
    `;
    const requestsResult = await query(requestsQuery);

    return {
      totalTiendas: parseInt(tiendasResult.rows[0]?.total || 0),
      totalUsuarios: parseInt(usuariosResult.rows[0]?.total || 0),
      totalVentas: 0,
      totalIngresos: parseFloat(ingresosResult.rows[0]?.total || 0),
      requestsPendientes: parseInt(requestsResult.rows[0]?.total || 0)
    };
  } catch (error) {
    console.error("Error en getDashboardStats:", error);
    throw new Error("Error al obtener estadísticas del dashboard");
  }
};

const getVentasMensuales = async () => {
  try {
    return [];
  } catch (error) {
    console.error("Error en getVentasMensuales:", error);
    return [];
  }
};

// ============================================
// FUNCIONES DE NEGOCIOS
// ============================================

const getNegocios = async () => {
  try {
    const negocios = await getNegociosList();

    const result = [];
    for (const negocio of negocios) {
      try {
        const tiendas = await getStoresByNegocio(negocio.id);

        result.push({
          id: String(negocio.id),
          nombreNegocio: negocio.nombre_negocio,
          responsable: `${negocio.nombre} ${negocio.apellido}`.trim(),
          telefono: negocio.celular || "",
          responsableId: String(negocio.id_persona),
          usuarioId: negocio.id_usuario ? String(negocio.id_usuario) : null,
          tiendas
        });
      } catch (storeError) {
        console.error(`Error obteniendo tiendas del negocio ${negocio.id}:`, storeError);
        result.push({
          id: String(negocio.id),
          nombreNegocio: negocio.nombre_negocio,
          responsable: `${negocio.nombre} ${negocio.apellido}`.trim(),
          telefono: negocio.celular || "",
          responsableId: String(negocio.id_persona),
          usuarioId: negocio.id_usuario ? String(negocio.id_usuario) : null,
          tiendas: []
        });
      }
    }

    return result;
  } catch (error) {
    console.error("Error en getNegocios:", error);
    throw new Error("Error al obtener negocios con tiendas");
  }
};

const getNegocioById = async (negocioId) => {
  try {
    const queryStr = `
      SELECT 
        n.id_negocio as id,
        n.nombre_negocio,
        n.responsable_id,
        p.id_persona,
        p.nombre,
        p.apellido,
        p.celular,
        u.id_usuario
      FROM negocio n
      INNER JOIN persona p ON p.id_persona = n.responsable_id
      LEFT JOIN usuario u ON u.id_persona = p.id_persona
      WHERE n.id_negocio = $1
    `;

    const result = await query(queryStr, [negocioId]);

    if (result.rows.length === 0) {
      return null;
    }

    const negocio = result.rows[0];
    const tiendas = await getStoresByNegocio(negocio.id);

    return {
      id: String(negocio.id),
      nombreNegocio: negocio.nombre_negocio,
      responsable: `${negocio.nombre} ${negocio.apellido}`.trim(),
      telefono: negocio.celular || "",
      responsableId: String(negocio.id_persona),
      usuarioId: negocio.id_usuario ? String(negocio.id_usuario) : null,
      tiendas
    };
  } catch (error) {
    console.error("Error en getNegocioById:", error);
    throw new Error("Error al obtener negocio");
  }
};

// ============================================
// FUNCIONES DE ADMINISTRADORES (Backward compatible)
// ============================================

const getAdmins = async () => {
  try {
    return await getNegocios();
  } catch (error) {
    console.error("Error en getAdmins:", error);
    throw new Error("Error al obtener administradores con tiendas");
  }
};

const getAdminById = async (adminId) => {
  try {
    const queryStr = `
      SELECT 
        n.id_negocio as id,
        n.nombre_negocio,
        n.responsable_id,
        p.id_persona,
        p.nombre,
        p.apellido,
        p.celular,
        u.id_usuario
      FROM negocio n
      INNER JOIN persona p ON p.id_persona = n.responsable_id
      LEFT JOIN usuario u ON u.id_persona = p.id_persona
      WHERE u.id_usuario = $1
    `;

    const result = await query(queryStr, [adminId]);

    if (result.rows.length === 0) {
      return null;
    }

    const negocio = result.rows[0];
    const tiendas = await getStoresByNegocio(negocio.id);

    return {
      id: String(negocio.id),
      responsable: `${negocio.nombre} ${negocio.apellido}`.trim(),
      telefono: negocio.celular || "",
      negocioId: String(negocio.id),
      negocioNombre: negocio.nombre_negocio,
      tiendas
    };
  } catch (error) {
    console.error("Error en getAdminById:", error);
    throw new Error("Error al obtener administrador");
  }
};

const getTiendas = async () => {
  try {
    const queryStr = `
      SELECT 
        t.id_tienda as id,
        t.nombre_tienda as nombre,
        t.ubicacion,
        t.celular as telefono,
        t.cant_usuarios as limite_usuarios,
        t.estado,
        t.fecha_pago as proximo_pago,
        t.precio,
        t.logo,
        t.id_negocio,
        n.nombre_negocio,
        COUNT(DISTINCT ut.id_usuario) as usuarios_actuales
      FROM tienda t
      LEFT JOIN usuario_tienda ut ON ut.id_tienda = t.id_tienda
      LEFT JOIN negocio n ON n.id_negocio = t.id_negocio
      WHERE t.estado != 'eliminado'
      GROUP BY t.id_tienda, n.nombre_negocio
      ORDER BY t.nombre_tienda
    `;

    const result = await query(queryStr);

    return result.rows.map(row => ({
      id: String(row.id),
      nombre: row.nombre,
      ubicacion: row.ubicacion || "",
      telefono: row.telefono || "",
      countryCode: "+591",
      fechaCreacion: new Date().toISOString().slice(0, 10),
      usuarios: parseInt(row.usuarios_actuales) || 0,
      limiteUsuarios: row.limite_usuarios || 1,
      logo: row.logo ? row.logo.toString('base64') : "",
      proximoPago: row.proximo_pago ? row.proximo_pago.toISOString() : new Date(Date.now() + 86400000 * 30).toISOString(),
      montoPago: row.precio ? parseFloat(row.precio) : 500,
      estado: row.estado || "activo",
      negocioId: row.id_negocio ? String(row.id_negocio) : null,
      negocioNombre: row.nombre_negocio
    }));
  } catch (error) {
    console.error("Error en getTiendas:", error);
    throw new Error("Error al obtener tiendas");
  }
};

const getTiendaById = async (tiendaId) => {
  try {
    const queryStr = `
      SELECT 
        t.id_tienda as id,
        t.nombre_tienda as nombre,
        t.ubicacion,
        t.celular as telefono,
        t.cant_usuarios as limite_usuarios,
        t.estado,
        t.fecha_pago as proximo_pago,
        t.precio,
        t.logo,
        t.id_negocio,
        n.nombre_negocio,
        COUNT(DISTINCT ut.id_usuario) as usuarios_actuales
      FROM tienda t
      LEFT JOIN usuario_tienda ut ON ut.id_tienda = t.id_tienda
      LEFT JOIN negocio n ON n.id_negocio = t.id_negocio
      WHERE t.id_tienda = $1 AND t.estado != 'eliminado'
      GROUP BY t.id_tienda, n.nombre_negocio
    `;

    const result = await query(queryStr, [tiendaId]);

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      id: String(row.id),
      nombre: row.nombre,
      ubicacion: row.ubicacion || "",
      telefono: row.telefono || "",
      countryCode: "+591",
      fechaCreacion: new Date().toISOString().slice(0, 10),
      usuarios: parseInt(row.usuarios_actuales) || 0,
      limiteUsuarios: row.limite_usuarios || 1,
      logo: row.logo ? row.logo.toString('base64') : "",
      proximoPago: row.proximo_pago ? row.proximo_pago.toISOString() : new Date(Date.now() + 86400000 * 30).toISOString(),
      montoPago: row.precio ? parseFloat(row.precio) : 500,
      estado: row.estado || "activo",
      negocioId: row.id_negocio ? String(row.id_negocio) : null,
      negocioNombre: row.nombre_negocio
    };
  } catch (error) {
    console.error("Error en getTiendaById:", error);
    throw new Error("Error al obtener tienda");
  }
};

const createStore = async ({ adminId, nombre, ubicacion, telefono, countryCode }) => {
  try {
    const adminCheck = await query(
      `SELECT u.id_usuario, n.id_negocio
       FROM usuario u
       INNER JOIN persona p ON p.id_persona = u.id_persona
       INNER JOIN negocio n ON n.responsable_id = p.id_persona
       WHERE u.id_usuario = $1 AND u.estado = 'activo'`,
      [adminId]
    );

    if (adminCheck.rows.length === 0) {
      throw new Error("Administrador no encontrado o no es responsable de un negocio");
    }

    const negocioId = adminCheck.rows[0].id_negocio;
    const telefonoCompleto = `${countryCode} ${telefono}`;
    const fechaPago = new Date();
    fechaPago.setDate(fechaPago.getDate() + 30);

    const insertQuery = `
      INSERT INTO tienda (
        id_negocio,
        nombre_tienda,
        ubicacion,
        celular,
        cant_usuarios,
        estado,
        fecha_pago,
        precio
      ) VALUES ($1, $2, $3, $4, $5, 'activo', $6, $7)
      RETURNING 
        id_tienda as id,
        nombre_tienda as nombre,
        ubicacion,
        celular as telefono,
        cant_usuarios as limite_usuarios,
        fecha_pago as proximo_pago,
        precio
    `;

    const result = await query(insertQuery, [
      negocioId,
      nombre,
      ubicacion,
      telefonoCompleto,
      1,
      fechaPago,
      500
    ]);

    const row = result.rows[0];

    await query(
      `INSERT INTO usuario_tienda (id_usuario, id_tienda) VALUES ($1, $2)`,
      [adminId, row.id]
    );

    const nombreCaja = `Caja ${nombre}`;
    await query(
      `INSERT INTO caja (id_tienda, nombre_caja, total, estado) 
       VALUES ($1, $2, $3, $4)`,
      [row.id, nombreCaja, 0, 'cerrada']
    );

    return {
      id: String(row.id),
      nombre: row.nombre,
      ubicacion: row.ubicacion || "",
      telefono: row.telefono || "",
      countryCode: "+591",
      fechaCreacion: new Date().toISOString().slice(0, 10),
      usuarios: 0,
      limiteUsuarios: row.limite_usuarios || 1,
      logo: "",
      proximoPago: row.proximo_pago.toISOString(),
      montoPago: row.precio ? parseFloat(row.precio) : 500
    };
  } catch (error) {
    console.error("Error en createStore:", error);
    throw new Error(error.message || "Error al crear tienda");
  }
};

const updateUserLimit = async ({ storeId, newLimit }) => {
  try {
    const queryStr = `
      UPDATE tienda
      SET cant_usuarios = $1
      WHERE id_tienda = $2 AND estado != 'eliminado'
      RETURNING 
        id_tienda as id,
        nombre_tienda as nombre,
        cant_usuarios as limite_usuarios
    `;

    const result = await query(queryStr, [newLimit, storeId]);

    if (result.rows.length === 0) {
      throw new Error("Tienda no encontrada");
    }

    const row = result.rows[0];
    return {
      id: String(row.id),
      nombre: row.nombre,
      limiteUsuarios: row.limite_usuarios
    };
  } catch (error) {
    console.error("Error en updateUserLimit:", error);
    throw new Error(error.message || "Error al actualizar límite");
  }
};

// ============================================
// FUNCIONES DE PAGOS
// ============================================

const getPaymentHistory = async (tiendaId) => {
  try {
    const queryStr = `
      SELECT 
        id_pago as id,
        id_tienda as tienda_id,
        monto,
        metodo,
        pago_efectivo,
        pago_qr,
        fecha_pago as fecha,
        estado
      FROM pago_tienda
      WHERE id_tienda = $1
      ORDER BY fecha_pago DESC
    `;

    const result = await query(queryStr, [tiendaId]);

    return result.rows.map(row => ({
      id: String(row.id),
      tiendaId: String(row.tienda_id),
      fecha: row.fecha.toISOString(),
      monto: parseFloat(row.monto) || 0,
      metodo: row.metodo,
      pagoEfectivo: row.pago_efectivo ? parseFloat(row.pago_efectivo) : undefined,
      pagoQR: row.pago_qr ? parseFloat(row.pago_qr) : undefined,
      estado: row.estado
    }));
  } catch (error) {
    console.error("Error en getPaymentHistory:", error);
    throw new Error("Error al obtener historial de pagos");
  }
};

const getAllPayments = async () => {
  try {
    const queryStr = `
      SELECT 
        id_pago as id,
        id_tienda as tienda_id,
        monto,
        metodo,
        pago_efectivo,
        pago_qr,
        fecha_pago as fecha,
        estado
      FROM pago_tienda
      ORDER BY fecha_pago DESC
    `;

    const result = await query(queryStr);

    return result.rows.map(row => ({
      id: String(row.id),
      tiendaId: String(row.tienda_id),
      fecha: row.fecha.toISOString(),
      monto: parseFloat(row.monto) || 0,
      metodo: row.metodo,
      pagoEfectivo: row.pago_efectivo ? parseFloat(row.pago_efectivo) : undefined,
      pagoQR: row.pago_qr ? parseFloat(row.pago_qr) : undefined,
      estado: row.estado
    }));
  } catch (error) {
    console.error("Error en getAllPayments:", error);
    throw new Error("Error al obtener pagos");
  }
};

const registerPayment = async ({ adminId, storeId, monto, metodo, pagoEfectivo, pagoQR }) => {
  try {
    const storeCheck = await query(
      `SELECT id_tienda FROM tienda WHERE id_tienda = $1 AND estado != 'eliminado'`,
      [storeId]
    );

    if (storeCheck.rows.length === 0) {
      throw new Error("Tienda no encontrada");
    }

    const adminAccess = await query(
      `SELECT id_usuario_tienda FROM usuario_tienda WHERE id_usuario = $1 AND id_tienda = $2`,
      [adminId, storeId]
    );

    if (adminAccess.rows.length === 0) {
      throw new Error("El administrador no tiene acceso a esta tienda");
    }

    const insertQuery = `
      INSERT INTO pago_tienda (
        id_tienda,
        monto,
        metodo,
        pago_efectivo,
        pago_qr,
        id_admin,
        estado,
        fecha_pago
      ) VALUES ($1, $2, $3, $4, $5, $6, 'completado', NOW())
      RETURNING 
        id_pago as id,
        id_tienda as tienda_id,
        monto,
        metodo,
        pago_efectivo,
        pago_qr,
        fecha_pago as fecha
    `;

    const result = await query(insertQuery, [
      storeId,
      monto,
      metodo,
      pagoEfectivo || 0,
      pagoQR || 0,
      adminId
    ]);

    const row = result.rows[0];

    const fechaPago = new Date();
    fechaPago.setDate(fechaPago.getDate() + 30);

    await query(
      `UPDATE tienda SET fecha_pago = $1 WHERE id_tienda = $2`,
      [fechaPago, storeId]
    );

    return {
      id: String(row.id),
      tiendaId: String(row.tienda_id),
      fecha: row.fecha.toISOString(),
      monto: parseFloat(row.monto) || 0,
      metodo: row.metodo,
      pagoEfectivo: row.pago_efectivo ? parseFloat(row.pago_efectivo) : undefined,
      pagoQR: row.pago_qr ? parseFloat(row.pago_qr) : undefined
    };
  } catch (error) {
    console.error("Error en registerPayment:", error);
    throw new Error(error.message || "Error al registrar pago");
  }
};

// ============================================
// FUNCIONES DE SOLICITUDES
// ============================================

const getRequests = async () => {
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
        s.id_tienda,
        s.id_negocio,
        n.nombre_negocio,
        t.nombre_tienda as tienda_existente_nombre
      FROM solicitud_tienda s
      LEFT JOIN negocio n ON n.id_negocio = s.id_negocio
      LEFT JOIN tienda t ON t.id_tienda = s.id_tienda
      ORDER BY s.fecha_solicitud DESC
    `;

    const result = await query(queryStr);

    return result.rows.map(row => {
      const tipo = row.tipo || 'nueva_tienda';
      const tipoLabel = tipo === 'mas_usuarios' ? 'Solicitud de más usuarios' : 'Solicitud de nueva tienda';
      
      return {
        id: String(row.id),
        adminId: String(row.admin_id),
        adminName: row.admin_name,
        tiendaNombre: row.tienda_nombre,
        ubicacion: row.ubicacion,
        telefono: row.telefono,
        countryCode: "+591",
        estado: row.estado || "pendiente",
        fechaSolicitud: row.fecha_solicitud.toISOString(),
        fechaRespuesta: row.fecha_respuesta ? row.fecha_respuesta.toISOString() : undefined,
        tipo: tipo,
        tipoLabel: tipoLabel,
        cantidadUsuarios: row.cantidad_usuarios || 0,
        tiendaId: row.id_tienda ? String(row.id_tienda) : undefined,
        tiendaExistenteNombre: row.tienda_existente_nombre,
        negocioId: row.id_negocio ? String(row.id_negocio) : undefined,
        negocioNombre: row.nombre_negocio
      };
    });
  } catch (error) {
    console.error("Error en getRequests:", error);
    throw new Error("Error al obtener solicitudes");
  }
};

const approveRequest = async ({ requestId, adminId }) => {
  try {
    // 1. Obtener la solicitud
    const getQuery = `
      SELECT 
        s.id_solicitud, 
        s.tienda_nombre, 
        s.ubicacion, 
        s.telefono, 
        s.id_negocio, 
        s.id_admin, 
        s.admin_name,
        s.tipo,
        s.cantidad_usuarios,
        s.id_tienda
      FROM solicitud_tienda s
      WHERE s.id_solicitud = $1 AND s.estado = 'pendiente'
    `;
    const getResult = await query(getQuery, [requestId]);

    if (getResult.rows.length === 0) {
      throw new Error("Solicitud no encontrada o ya procesada");
    }

    const solicitud = getResult.rows[0];
    const tipo = solicitud.tipo || 'nueva_tienda';

    // 2. Si es solicitud de más usuarios
    if (tipo === 'mas_usuarios') {
      if (!solicitud.id_tienda) {
        throw new Error("No se encontró la tienda para actualizar el límite");
      }

      // Obtener el límite actual de la tienda
      const tiendaActual = await query(
        `SELECT id_tienda, nombre_tienda, cant_usuarios 
         FROM tienda 
         WHERE id_tienda = $1 AND estado != 'eliminado'`,
        [solicitud.id_tienda]
      );

      if (tiendaActual.rows.length === 0) {
        throw new Error("Tienda no encontrada");
      }

      const limiteActual = tiendaActual.rows[0].cant_usuarios || 1;
      const cantidadSolicitada = solicitud.cantidad_usuarios || 1;
      const nuevoLimite = limiteActual + cantidadSolicitada;

      // Actualizar el límite (sumando)
      const updateQuery = `
        UPDATE tienda
        SET cant_usuarios = $1
        WHERE id_tienda = $2 AND estado != 'eliminado'
        RETURNING id_tienda, nombre_tienda, cant_usuarios
      `;

      const updateResult = await query(updateQuery, [nuevoLimite, solicitud.id_tienda]);

      if (updateResult.rows.length === 0) {
        throw new Error("Tienda no encontrada");
      }

      // Actualizar solicitud
      await query(
        `UPDATE solicitud_tienda
         SET estado = 'aprobada', fecha_respuesta = NOW()
         WHERE id_solicitud = $1`,
        [requestId]
      );

      return {
        id: String(solicitud.id_solicitud),
        adminId: String(solicitud.id_admin),
        adminName: solicitud.admin_name,
        tiendaNombre: solicitud.tienda_nombre,
        ubicacion: solicitud.ubicacion,
        telefono: solicitud.telefono,
        countryCode: "+591",
        estado: 'aprobada',
        fechaSolicitud: new Date().toISOString(),
        fechaRespuesta: new Date().toISOString(),
        tipo: 'mas_usuarios',
        tipoLabel: 'Solicitud de más usuarios',
        cantidadUsuarios: nuevoLimite,
        cantidadSolicitada: cantidadSolicitada,
        limiteAnterior: limiteActual,
        tiendaId: String(solicitud.id_tienda),
        tiendaExistenteNombre: updateResult.rows[0].nombre_tienda,
        negocioId: solicitud.id_negocio ? String(solicitud.id_negocio) : undefined,
        mensaje: `Límite de usuarios actualizado de ${limiteActual} a ${nuevoLimite} (+${cantidadSolicitada}) para la tienda ${updateResult.rows[0].nombre_tienda}`
      };
    }

    // 3. Si es solicitud de nueva tienda (tipo === 'nueva_tienda')
    const negocioId = solicitud.id_negocio;

    let idNegocio = negocioId;
    if (!idNegocio) {
      const adminInfo = await query(
        `SELECT p.id_persona, p.nombre, p.apellido
         FROM usuario u
         INNER JOIN persona p ON p.id_persona = u.id_persona
         WHERE u.id_usuario = $1`,
        [solicitud.id_admin]
      );

      if (adminInfo.rows.length === 0) {
        throw new Error("Administrador no encontrado");
      }

      const persona = adminInfo.rows[0];
      const nombreNegocio = `Negocio de ${persona.nombre} ${persona.apellido}`;

      const negocioResult = await query(
        `INSERT INTO negocio (nombre_negocio, responsable_id) 
         VALUES ($1, $2) 
         RETURNING id_negocio`,
        [nombreNegocio, persona.id_persona]
      );

      idNegocio = negocioResult.rows[0].id_negocio;

      await query(
        `INSERT INTO persona_negocio (id_persona, id_negocio, carnet_persona) 
         VALUES ($1, $2, $3)`,
        [persona.id_persona, idNegocio, 'PENDIENTE']
      );
    }

    // Crear la tienda
    const fechaPago = new Date();
    fechaPago.setDate(fechaPago.getDate() + 30);

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
      ) VALUES ($1, $2, $3, $4, $5, 'activo', $6, $7)
      RETURNING id_tienda, nombre_tienda, cant_usuarios
    `;

    const telefonoCompleto = `+591 ${solicitud.telefono}`;

    const storeResult = await query(createStoreQuery, [
      idNegocio,
      solicitud.tienda_nombre,
      solicitud.ubicacion,
      telefonoCompleto,
      1,
      fechaPago,
      500
    ]);

    const newTiendaId = storeResult.rows[0].id_tienda;

    // Vincular admin a la tienda
    await query(
      `INSERT INTO usuario_tienda (id_usuario, id_tienda) VALUES ($1, $2)`,
      [solicitud.id_admin, newTiendaId]
    );

    // Crear caja para la tienda
    const nombreCaja = `Caja ${solicitud.tienda_nombre}`;
    await query(
      `INSERT INTO caja (id_tienda, nombre_caja, total, estado) 
       VALUES ($1, $2, $3, $4)`,
      [newTiendaId, nombreCaja, 0, 'cerrada']
    );

    // Actualizar solicitud
    const updateQuery = `
      UPDATE solicitud_tienda
      SET estado = 'aprobada', 
          fecha_respuesta = NOW(),
          id_tienda = $1,
          id_negocio = $2
      WHERE id_solicitud = $3
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
        id_tienda,
        id_negocio
    `;

    const result = await query(updateQuery, [newTiendaId, idNegocio, requestId]);

    const row = result.rows[0];
    return {
      id: String(row.id),
      adminId: String(row.admin_id),
      adminName: row.admin_name,
      tiendaNombre: row.tienda_nombre,
      ubicacion: row.ubicacion,
      telefono: row.telefono,
      countryCode: "+591",
      estado: row.estado || "pendiente",
      fechaSolicitud: row.fecha_solicitud.toISOString(),
      fechaRespuesta: row.fecha_respuesta ? row.fecha_respuesta.toISOString() : undefined,
      tipo: row.tipo || 'nueva_tienda',
      tipoLabel: 'Solicitud de nueva tienda',
      cantidadUsuarios: row.cantidad_usuarios || 0,
      tiendaId: row.id_tienda ? String(row.id_tienda) : undefined,
      tiendaExistenteNombre: storeResult.rows[0].nombre_tienda,
      negocioId: row.id_negocio ? String(row.id_negocio) : undefined,
      mensaje: `Tienda "${solicitud.tienda_nombre}" creada exitosamente`
    };
  } catch (error) {
    console.error("Error en approveRequest:", error);
    throw new Error(error.message || "Error al aprobar solicitud");
  }
};

const rejectRequest = async (requestId) => {
  try {
    const updateQuery = `
      UPDATE solicitud_tienda
      SET estado = 'rechazada', fecha_respuesta = NOW()
      WHERE id_solicitud = $1 AND estado = 'pendiente'
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
        id_tienda,
        id_negocio
    `;

    const result = await query(updateQuery, [requestId]);

    if (result.rows.length === 0) {
      throw new Error("Solicitud no encontrada o ya procesada");
    }

    const row = result.rows[0];
    const tipo = row.tipo || 'nueva_tienda';
    const tipoLabel = tipo === 'mas_usuarios' ? 'Solicitud de más usuarios' : 'Solicitud de nueva tienda';

    return {
      id: String(row.id),
      adminId: String(row.admin_id),
      adminName: row.admin_name,
      tiendaNombre: row.tienda_nombre,
      ubicacion: row.ubicacion,
      telefono: row.telefono,
      countryCode: "+591",
      estado: row.estado || "pendiente",
      fechaSolicitud: row.fecha_solicitud.toISOString(),
      fechaRespuesta: row.fecha_respuesta ? row.fecha_respuesta.toISOString() : undefined,
      tipo: tipo,
      tipoLabel: tipoLabel,
      cantidadUsuarios: row.cantidad_usuarios || 0,
      tiendaId: row.id_tienda ? String(row.id_tienda) : undefined,
      negocioId: row.id_negocio ? String(row.id_negocio) : undefined
    };
  } catch (error) {
    console.error("Error en rejectRequest:", error);
    throw new Error(error.message || "Error al rechazar solicitud");
  }
};

// ============================================
// FUNCIONES DE LOGOS
// ============================================

const getTiendaLogos = async () => {
  try {
    const queryStr = `
      SELECT id_tienda, logo
      FROM tienda
      WHERE logo IS NOT NULL AND estado != 'eliminado'
    `;

    const result = await query(queryStr);

    const logos = {};
    result.rows.forEach(row => {
      logos[String(row.id_tienda)] = row.logo.toString('base64');
    });

    return logos;
  } catch (error) {
    console.error("Error en getTiendaLogos:", error);
    return {};
  }
};

const saveTiendaLogo = async (tiendaId, logo) => {
  try {
    const logoBuffer = Buffer.from(logo.split(',')[1] || logo, 'base64');

    const queryStr = `
      UPDATE tienda
      SET logo = $1
      WHERE id_tienda = $2 AND estado != 'eliminado'
    `;

    await query(queryStr, [logoBuffer, tiendaId]);
  } catch (error) {
    console.error("Error en saveTiendaLogo:", error);
    throw new Error("Error al guardar logo");
  }
};

module.exports = {
  getDashboardStats,
  getVentasMensuales,
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