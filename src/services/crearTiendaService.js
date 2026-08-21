// src/services/crearTiendaService.js
const { query } = require("../../db");
const bcrypt = require("bcrypt");

const crearTienda = async (tiendaData, responsableData) => {
  console.log("=== Crear Tienda Service ===");
  console.log("Tienda:", tiendaData);
  console.log("Responsable:", responsableData);

  try {
    // 1. Validar que el carnet no exista en persona_negocio
    const carnetCheck = await query(
      `SELECT p.id_persona, p.nombre, p.apellido, pn.carnet_persona
       FROM persona_negocio pn
       INNER JOIN persona p ON p.id_persona = pn.id_persona
       WHERE pn.carnet_persona = $1`,
      [responsableData.carnet.trim()]
    );

    if (carnetCheck.rows.length > 0) {
      const user = carnetCheck.rows[0];
      throw new Error(`El carnet ${responsableData.carnet} ya está registrado por ${user.nombre} ${user.apellido}`);
    }

    // 2. Validar que el nombre de usuario no exista
    const userCheck = await query(
      'SELECT id_usuario FROM usuario WHERE usuario = $1',
      [responsableData.usuario.trim().toLowerCase()]
    );

    if (userCheck.rows.length > 0) {
      throw new Error('El nombre de usuario no está disponible');
    }

    // 3. Crear PERSONA
    const personaResult = await query(
      `INSERT INTO persona (nombre, apellido, celular) 
       VALUES ($1, $2, $3) 
       RETURNING id_persona`,
      [
        responsableData.nombres.trim(),
        responsableData.apellidos.trim(),
        responsableData.telefono.trim()
      ]
    );
    const idPersona = personaResult.rows[0].id_persona;
    console.log("Persona creada ID:", idPersona);

    // 4. Crear NEGOCIO
    const nombreNegocio = `Negocio de ${responsableData.nombres.trim()} ${responsableData.apellidos.trim()}`;
    const negocioResult = await query(
      `INSERT INTO negocio (nombre_negocio, responsable_id) 
       VALUES ($1, $2) 
       RETURNING id_negocio`,
      [nombreNegocio, idPersona]
    );
    const idNegocio = negocioResult.rows[0].id_negocio;
    console.log("Negocio creado ID:", idNegocio);

    // 5. Crear TIENDA
    const fechaPago = new Date();
    fechaPago.setDate(fechaPago.getDate() + 14);

    const tiendaResult = await query(
      `INSERT INTO tienda (
        id_negocio, 
        nombre_tienda, 
        ubicacion, 
        celular, 
        fecha_pago, 
        estado, 
        precio,
        cant_usuarios
      ) 
       VALUES ($1, $2, $3, $4, $5, 'activo', 500.00, 1) 
       RETURNING id_tienda`,
      [
        idNegocio,
        tiendaData.nombre.trim(),
        tiendaData.ubicacion.trim(),
        tiendaData.telefono.trim(),
        fechaPago
      ]
    );
    const idTienda = tiendaResult.rows[0].id_tienda;
    console.log("Tienda creada ID:", idTienda);

    // 6. Crear USUARIO (rol Administrador = 2)
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(responsableData.contraseña, saltRounds);

    const usuarioResult = await query(
      `INSERT INTO usuario (id_persona, id_rol, usuario, password, estado) 
       VALUES ($1, $2, $3, $4, 'activo') 
       RETURNING id_usuario`,
      [idPersona, 2, responsableData.usuario.trim().toLowerCase(), hashedPassword]
    );
    const idUsuario = usuarioResult.rows[0].id_usuario;
    console.log("Usuario creado ID:", idUsuario);

    // 7. Relacionar PERSONA con NEGOCIO (guardar carnet)
    await query(
      `INSERT INTO persona_negocio (id_persona, id_negocio, carnet_persona) 
       VALUES ($1, $2, $3)`,
      [idPersona, idNegocio, responsableData.carnet.trim()]
    );
    console.log("Persona-Negocio creado");

    // 8. Relacionar USUARIO con TIENDA
    await query(
      `INSERT INTO usuario_tienda (id_usuario, id_tienda) 
       VALUES ($1, $2)`,
      [idUsuario, idTienda]
    );
    console.log("Usuario-Tienda creado");

    return {
      tienda: {
        id: idTienda,
        nombre: tiendaData.nombre.trim(),
        ubicacion: tiendaData.ubicacion.trim(),
        telefono: tiendaData.telefono.trim(),
        fechaPago: fechaPago.toISOString(),
        estado: 'activo'
      },
      responsable: {
        id: idPersona,
        idUsuario: idUsuario,
        nombre: responsableData.nombres.trim(),
        apellido: responsableData.apellidos.trim(),
        carnet: responsableData.carnet.trim(),
        usuario: responsableData.usuario.trim().toLowerCase()
      },
      mensaje: `Tienda "${tiendaData.nombre}" creada exitosamente. Tienes 14 días gratis.`
    };

  } catch (error) {
    console.error("Error en crearTienda service:", error);
    throw error;
  }
};

const validarCarnet = async (carnet) => {
  try {
    console.log("=== Validar Carnet Service ===");
    console.log("Carnet:", carnet);

    // Buscar la persona por carnet
    const personaResult = await query(
      `SELECT 
        p.id_persona, 
        p.nombre, 
        p.apellido, 
        p.celular,
        pn.carnet_persona
       FROM persona p
       INNER JOIN persona_negocio pn ON p.id_persona = pn.id_persona
       WHERE pn.carnet_persona = $1`,
      [carnet.trim()]
    );

    if (personaResult.rows.length === 0) {
      return { existe: false, usuario: null };
    }

    const persona = personaResult.rows[0];

    // Obtener TODAS las tiendas asociadas a esta persona
    const tiendasResult = await query(
      `SELECT 
        t.id_tienda,
        t.nombre_tienda,
        t.estado,
        t.fecha_pago,
        n.id_negocio,
        n.nombre_negocio
       FROM persona_negocio pn
       INNER JOIN negocio n ON n.id_negocio = pn.id_negocio
       INNER JOIN tienda t ON t.id_negocio = n.id_negocio
       WHERE pn.carnet_persona = $1
       ORDER BY t.id_tienda`,
      [carnet.trim()]
    );

    // Obtener el rol del usuario
    const rolResult = await query(
      `SELECT r.nombre as rol
       FROM usuario u
       INNER JOIN rol r ON r.id_rol = u.id_rol
       WHERE u.id_persona = $1
       LIMIT 1`,
      [persona.id_persona]
    );

    const rol = rolResult.rows.length > 0 ? rolResult.rows[0].rol : 'Usuario';

    // Construir lista de tiendas
    const tiendas = tiendasResult.rows.map(row => ({
      tiendaId: row.id_tienda,
      tiendaNombre: row.nombre_tienda,
      estado: row.estado,
      fechaPago: row.fecha_pago,
      negocioId: row.id_negocio,
      negocioNombre: row.nombre_negocio
    }));

    // Si tiene tiendas, devolverlas todas
    if (tiendas.length > 0) {
      return {
        existe: true,
        usuario: {
          carnet: persona.carnet_persona,
          name: persona.nombre,
          lastname: persona.apellido,
          phoneNumber: persona.celular,
          role: rol,
          tiendas: tiendas,
          tiendaId: tiendas[0].tiendaId,
          tiendaNombre: tiendas[0].tiendaNombre,
          negocioId: tiendas[0].negocioId,
          negocioNombre: tiendas[0].negocioNombre,
          tieneMultiplesTiendas: tiendas.length > 1
        }
      };
    }

    return { existe: false, usuario: null };

  } catch (error) {
    console.error("Error en validarCarnet service:", error);
    throw new Error("Error al validar el carnet");
  }
};

const validarUsuario = async (usuario) => {
  try {
    console.log("=== Validar Usuario Service ===");
    console.log("Usuario:", usuario);

    if (!usuario || usuario.trim().length < 3) {
      return {
        disponible: false,
        mensaje: "El usuario debe tener al menos 3 caracteres"
      };
    }

    if (usuario.trim().length > 50) {
      return {
        disponible: false,
        mensaje: "El usuario debe tener máximo 50 caracteres"
      };
    }

    const result = await query(
      'SELECT id_usuario FROM usuario WHERE usuario = $1',
      [usuario.trim().toLowerCase()]
    );

    if (result.rows.length > 0) {
      return {
        disponible: false,
        mensaje: "Este nombre de usuario ya está en uso"
      };
    }

    return { disponible: true, mensaje: null };

  } catch (error) {
    console.error("Error en validarUsuario service:", error);
    throw new Error("Error al validar el usuario");
  }
};

const getStats = async () => {
  try {
    const totalTiendas = await query('SELECT COUNT(*) as total FROM tienda');
    const tiendasActivas = await query("SELECT COUNT(*) as total FROM tienda WHERE estado = 'activo'");
    const tiendasInactivas = await query("SELECT COUNT(*) as total FROM tienda WHERE estado = 'inactivo'");
    const totalUsuarios = await query('SELECT COUNT(*) as total FROM usuario');
    
    const expirandoResult = await query(`
      SELECT COUNT(*) as total 
      FROM tienda 
      WHERE estado = 'activo' 
        AND fecha_pago < NOW() + INTERVAL '7 days'
        AND fecha_pago > NOW()
    `);

    return {
      totalTiendas: parseInt(totalTiendas.rows[0].total),
      tiendasActivas: parseInt(tiendasActivas.rows[0].total),
      tiendasInactivas: parseInt(tiendasInactivas.rows[0].total),
      totalUsuarios: parseInt(totalUsuarios.rows[0].total),
      expirando: parseInt(expirandoResult.rows[0].total)
    };
  } catch (error) {
    console.error("Error en getStats service:", error);
    throw new Error("Error al obtener estadísticas");
  }
};

const getTiendas = async () => {
  try {
    const result = await query(`
      SELECT 
        t.id_tienda,
        t.nombre_tienda,
        t.ubicacion,
        t.celular,
        t.fecha_pago,
        t.estado,
        t.precio,
        t.cant_usuarios,
        n.nombre_negocio,
        n.id_negocio,
        p.nombre as responsable_nombre,
        p.apellido as responsable_apellido,
        p.celular as responsable_celular
      FROM tienda t
      INNER JOIN negocio n ON t.id_negocio = n.id_negocio
      INNER JOIN persona p ON n.responsable_id = p.id_persona
      ORDER BY t.id_tienda DESC
    `);
    return result.rows;
  } catch (error) {
    console.error("Error en getTiendas service:", error);
    throw new Error("Error al obtener tiendas");
  }
};

const getTiendaById = async (id) => {
  try {
    const result = await query(`
      SELECT 
        t.id_tienda,
        t.nombre_tienda,
        t.ubicacion,
        t.celular,
        t.fecha_pago,
        t.estado,
        t.precio,
        t.cant_usuarios,
        n.id_negocio,
        n.nombre_negocio,
        p.id_persona as responsable_id,
        p.nombre as responsable_nombre,
        p.apellido as responsable_apellido,
        p.celular as responsable_celular
      FROM tienda t
      INNER JOIN negocio n ON t.id_negocio = n.id_negocio
      INNER JOIN persona p ON n.responsable_id = p.id_persona
      WHERE t.id_tienda = $1
    `, [id]);

    if (result.rows.length === 0) return null;
    return result.rows[0];
  } catch (error) {
    console.error("Error en getTiendaById service:", error);
    throw new Error("Error al obtener la tienda");
  }
};

const updateTienda = async (id, data) => {
  try {
    const checkResult = await query(
      'SELECT id_tienda FROM tienda WHERE id_tienda = $1',
      [id]
    );

    if (checkResult.rows.length === 0) {
      throw new Error("Tienda no encontrada");
    }

    const updates = [];
    const values = [];
    let paramCount = 1;

    if (data.nombre_tienda !== undefined) {
      updates.push(`nombre_tienda = $${paramCount}`);
      values.push(data.nombre_tienda);
      paramCount++;
    }
    if (data.ubicacion !== undefined) {
      updates.push(`ubicacion = $${paramCount}`);
      values.push(data.ubicacion);
      paramCount++;
    }
    if (data.celular !== undefined) {
      updates.push(`celular = $${paramCount}`);
      values.push(data.celular);
      paramCount++;
    }
    if (data.estado !== undefined) {
      updates.push(`estado = $${paramCount}`);
      values.push(data.estado);
      paramCount++;
    }
    if (data.precio !== undefined) {
      updates.push(`precio = $${paramCount}`);
      values.push(data.precio);
      paramCount++;
    }
    if (data.cant_usuarios !== undefined) {
      updates.push(`cant_usuarios = $${paramCount}`);
      values.push(data.cant_usuarios);
      paramCount++;
    }
    if (data.fecha_pago !== undefined) {
      updates.push(`fecha_pago = $${paramCount}`);
      values.push(data.fecha_pago);
      paramCount++;
    }

    if (updates.length === 0) {
      throw new Error("No hay datos para actualizar");
    }

    values.push(id);
    const queryText = `
      UPDATE tienda 
      SET ${updates.join(', ')} 
      WHERE id_tienda = $${paramCount} 
      RETURNING *
    `;

    const result = await query(queryText, values);
    return result.rows[0];
  } catch (error) {
    console.error("Error en updateTienda service:", error);
    throw error;
  }
};

const deleteTienda = async (id) => {
  try {
    const checkResult = await query(
      'SELECT id_tienda FROM tienda WHERE id_tienda = $1',
      [id]
    );

    if (checkResult.rows.length === 0) {
      throw new Error("Tienda no encontrada");
    }

    await query(
      "UPDATE tienda SET estado = 'eliminado' WHERE id_tienda = $1",
      [id]
    );

    return true;
  } catch (error) {
    console.error("Error en deleteTienda service:", error);
    throw error;
  }
};

const verificarEstadoTienda = async (id) => {
  try {
    const result = await query(`
      SELECT 
        id_tienda,
        nombre_tienda,
        estado,
        fecha_pago,
        NOW() as fecha_actual
      FROM tienda 
      WHERE id_tienda = $1
    `, [id]);

    if (result.rows.length === 0) {
      throw new Error("Tienda no encontrada");
    }

    const tienda = result.rows[0];

    if (tienda.estado === 'eliminado') {
      return {
        activa: false,
        diasRestantes: 0,
        estado: 'eliminado',
        mensaje: 'La tienda ha sido eliminada'
      };
    }

    if (tienda.estado === 'inactivo') {
      return {
        activa: false,
        diasRestantes: 0,
        estado: 'inactivo',
        mensaje: 'La tienda está inactiva'
      };
    }

    const fechaPago = new Date(tienda.fecha_pago);
    const hoy = new Date();
    const diffTime = fechaPago.getTime() - hoy.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    const activa = diffDays > 0 && tienda.estado === 'activo';

    let mensaje = "";
    if (activa) {
      if (diffDays <= 7) {
        mensaje = `⚠️ Su período de prueba vence en ${diffDays} días. Realice el pago para continuar.`;
      } else {
        mensaje = `✅ Tienda activa. ${diffDays} días restantes del período de prueba.`;
      }
    } else {
      mensaje = "❌ El período de prueba ha expirado. Realice el pago para reactivar la tienda.";
    }

    return {
      activa,
      diasRestantes: Math.max(0, diffDays),
      estado: tienda.estado,
      fechaPago: tienda.fecha_pago,
      mensaje
    };
  } catch (error) {
    console.error("Error en verificarEstadoTienda service:", error);
    throw error;
  }
};

module.exports = {
  crearTienda,
  validarCarnet,
  validarUsuario,
  getStats,
  getTiendas,
  getTiendaById,
  updateTienda,
  deleteTienda,
  verificarEstadoTienda
};