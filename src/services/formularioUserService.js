// src/services/formularioUserService.js
const { query } = require("../../db");
const bcrypt = require("bcrypt");

// ============================================
// CONSTANTES
// ============================================

const ROL_IDS = {
  "Spider Admin": 1,
  "Administrador": 2,
  "Vendedor": 3,
  "Medidor": 4,
};

const ROL_NAMES = {
  1: "Spider Admin",
  2: "Administrador",
  3: "Vendedor",
  4: "Medidor",
};

// ============================================
// FUNCIONES AUXILIARES
// ============================================

const getRoleId = (roleName) => {
  const id = ROL_IDS[roleName];
  if (!id) throw new Error(`Rol inválido: ${roleName}`);
  return id;
};

const getRoleName = (roleId) => {
  return ROL_NAMES[roleId] || "Desconocido";
};

const getPermissionsForUser = async (userId, roleId) => {
  const defaultPerms = await query(
    `SELECT p.nombre 
     FROM rol_permiso rp
     INNER JOIN permiso p ON rp.id_permiso = p.id_permiso
     WHERE rp.id_rol = $1`,
    [roleId]
  );

  const defaultPermissionNames = defaultPerms.rows.map(row => row.nombre);

  const grantedPerms = await query(
    `SELECT p.nombre 
     FROM usuario_permiso up
     INNER JOIN permiso p ON up.id_permiso = p.id_permiso
     WHERE up.id_usuario = $1 AND up.tipo = 'concedido'`,
    [userId]
  );
  const grantedNames = grantedPerms.rows.map(row => row.nombre);

  const revokedPerms = await query(
    `SELECT p.nombre 
     FROM usuario_permiso up
     INNER JOIN permiso p ON up.id_permiso = p.id_permiso
     WHERE up.id_usuario = $1 AND up.tipo = 'revocado'`,
    [userId]
  );
  const revokedNames = revokedPerms.rows.map(row => row.nombre);

  const allPermissions = [...defaultPermissionNames];
  grantedNames.forEach(p => {
    if (!allPermissions.includes(p)) allPermissions.push(p);
  });
  const finalPermissions = allPermissions.filter(p => !revokedNames.includes(p));

  return {
    granted: grantedNames,
    revoked: revokedNames,
    permissions: finalPermissions,
  };
};

const getUserById = async (userId) => {
  try {
    const result = await query(
      `SELECT 
        u.id_usuario as id,
        u.usuario as username,
        p.nombre as name,
        p.apellido as lastname,
        u.id_rol,
        r.nombre as role,
        u.estado as status,
        p.celular as phoneNumber,
        pn.carnet_persona as carnet
      FROM usuario u
      INNER JOIN persona p ON u.id_persona = p.id_persona
      INNER JOIN rol r ON u.id_rol = r.id_rol
      LEFT JOIN persona_negocio pn ON p.id_persona = pn.id_persona
      WHERE u.id_usuario = $1 AND u.estado != 'eliminado'`,
      [userId]
    );

    if (result.rows.length === 0) return null;

    const row = result.rows[0];

    const tiendasResult = await query(
      `SELECT t.id_tienda as id, t.nombre_tienda as nombre
       FROM usuario_tienda ut
       INNER JOIN tienda t ON ut.id_tienda = t.id_tienda
       WHERE ut.id_usuario = $1`,
      [row.id]
    );
    const tiendas = tiendasResult.rows;

    const permissions = await getPermissionsForUser(row.id, row.id_rol);

    const statusMap = {
      'activo': 'active',
      'inactivo': 'inactive',
    };

    return {
      id: row.id,
      username: row.username,
      name: row.name || "",
      lastname: row.lastname || "",
      role: row.role,
      status: statusMap[row.status] || 'inactive',
      phoneNumber: row.phonenumber || "",
      carnet: row.carnet || "",
      tiendaIds: tiendas.map(t => t.id),
      tiendaId: tiendas.length > 0 ? tiendas[0].id : null,
      tiendaNombre: tiendas.length > 0 ? tiendas[0].nombre : null,
      grantedPermissions: permissions.granted,
      revokedPermissions: permissions.revoked,
    };
  } catch (error) {
    console.error("Error en getUserById:", error);
    throw error;
  }
};

// ============================================
// FUNCIONES DEL SERVICIO
// ============================================

const findUserByCarnet = async (carnet) => {
  try {
    if (!carnet || carnet.trim().length < 6) {
      return null;
    }

    const result = await query(
      `SELECT 
        u.id_usuario as id,
        u.usuario as username,
        p.nombre as name,
        p.apellido as lastname,
        u.id_rol,
        r.nombre as role,
        u.estado as status,
        p.celular as phoneNumber,
        pn.carnet_persona as carnet
      FROM persona_negocio pn
      INNER JOIN persona p ON p.id_persona = pn.id_persona
      LEFT JOIN usuario u ON u.id_persona = p.id_persona
      LEFT JOIN rol r ON r.id_rol = u.id_rol
      WHERE pn.carnet_persona = $1 AND u.estado != 'eliminado'`,
      [carnet.trim().toUpperCase()]
    );

    if (result.rows.length === 0) return null;

    const row = result.rows[0];

    if (row.id) {
      const tiendasResult = await query(
        `SELECT t.id_tienda as id, t.nombre_tienda as nombre
         FROM usuario_tienda ut
         INNER JOIN tienda t ON ut.id_tienda = t.id_tienda
         WHERE ut.id_usuario = $1`,
        [row.id]
      );
      const tiendas = tiendasResult.rows;

      const permissions = await getPermissionsForUser(row.id, row.id_rol);

      const statusMap = {
        'activo': 'active',
        'inactivo': 'inactive',
      };

      return {
        id: row.id,
        username: row.username,
        name: row.name || "",
        lastname: row.lastname || "",
        role: row.role || "Usuario",
        status: statusMap[row.status] || 'inactive',
        phoneNumber: row.phonenumber || "",
        carnet: row.carnet || "",
        tiendaIds: tiendas.map(t => t.id),
        tiendaId: tiendas.length > 0 ? tiendas[0].id : null,
        tiendaNombre: tiendas.length > 0 ? tiendas[0].nombre : null,
        grantedPermissions: permissions.granted,
        revokedPermissions: permissions.revoked,
      };
    }

    return {
      id: null,
      username: null,
      name: row.name || "",
      lastname: row.lastname || "",
      role: null,
      status: null,
      phoneNumber: row.phonenumber || "",
      carnet: row.carnet || "",
      tiendaIds: [],
      tiendaId: null,
      tiendaNombre: null,
      grantedPermissions: [],
      revokedPermissions: [],
    };
  } catch (error) {
    console.error("Error en findUserByCarnet:", error);
    throw error;
  }
};

const isUsernameTaken = async (username, excludeUserId) => {
  try {
    let queryText = 'SELECT id_usuario FROM usuario WHERE usuario = $1';
    const params = [username.trim().toLowerCase()];

    if (excludeUserId) {
      queryText += ' AND id_usuario != $2';
      params.push(excludeUserId);
    }

    const result = await query(queryText, params);
    return result.rows.length > 0;
  } catch (error) {
    console.error("Error en isUsernameTaken:", error);
    throw error;
  }
};

const getMaxUsersForStore = async (tiendaId) => {
  try {
    if (!tiendaId || tiendaId.trim() === "") return 1;
    const result = await query(
      `SELECT cant_usuarios FROM tienda WHERE id_tienda = $1`,
      [tiendaId]
    );
    if (result.rows.length === 0) {
      return 1;
    }
    return parseInt(result.rows[0].cant_usuarios) || 1;
  } catch (error) {
    console.error("Error en getMaxUsersForStore:", error);
    return 1;
  }
};

const canAddUserToStore = async (tiendaId) => {
  try {
    if (!tiendaId || tiendaId.trim() === "") return false;
    const maxUsers = await getMaxUsersForStore(tiendaId);
    const usersResult = await query(
      `SELECT COUNT(*) as total 
       FROM usuario_tienda ut
       INNER JOIN usuario u ON ut.id_usuario = u.id_usuario
       WHERE ut.id_tienda = $1 AND u.estado = 'activo'`,
      [tiendaId]
    );
    const currentUsers = parseInt(usersResult.rows[0].total);
    return currentUsers < maxUsers;
  } catch (error) {
    console.error("Error en canAddUserToStore:", error);
    return false;
  }
};

// ============================================
// CREAR USUARIO
// ============================================

// src/services/formularioUserService.js - Solo la función createUser corregida

const createUser = async (userData) => {
  try {
    const {
      carnet,
      nombres,
      apellidos,
      countryCode,
      phoneNumber,
      usuario,
      contraseña,
      tiendaId,
      tiendaIds,
      role,
    } = userData;

    console.log("=== createUser ===");
    console.log("Datos recibidos:", { 
      carnet, 
      nombres, 
      apellidos, 
      role, 
      tiendaId, 
      tiendaIds 
    });

    // 1. Verificar si la persona ya existe por carnet
    const carnetCheck = await query(
      `SELECT p.id_persona, u.id_usuario, u.id_rol
       FROM persona_negocio pn
       INNER JOIN persona p ON p.id_persona = pn.id_persona
       LEFT JOIN usuario u ON u.id_persona = p.id_persona
       WHERE pn.carnet_persona = $1`,
      [carnet.trim().toUpperCase()]
    );

    let idPersona = null;
    let existingUserId = null;

    if (carnetCheck.rows.length > 0) {
      const row = carnetCheck.rows[0];
      idPersona = row.id_persona;
      existingUserId = row.id_usuario;
      
      if (existingUserId) {
        const roleName = getRoleName(row.id_rol);
        throw new Error(`Usuario ya registrado como "${roleName}". Consulte con soporte si tiene algún problema.`);
      }
    }

    // 2. Verificar si el nombre de usuario ya está tomado
    const usernameTaken = await isUsernameTaken(usuario);
    if (usernameTaken) {
      throw new Error(`El nombre de usuario "${usuario}" ya está en uso`);
    }

    const fullPhone = `${countryCode} ${phoneNumber}`;
    
    // 3. Crear o actualizar persona
    if (!idPersona) {
      const personaResult = await query(
        `INSERT INTO persona (nombre, apellido, celular) 
         VALUES ($1, $2, $3) 
         RETURNING id_persona`,
        [nombres.trim(), apellidos.trim(), fullPhone]
      );
      idPersona = personaResult.rows[0].id_persona;
      console.log("✅ Persona creada ID:", idPersona);
    } else {
      await query(
        `UPDATE persona SET nombre = $1, apellido = $2, celular = $3 WHERE id_persona = $4`,
        [nombres.trim(), apellidos.trim(), fullPhone, idPersona]
      );
      console.log("✅ Persona actualizada ID:", idPersona);
    }

    // 4. Obtener roleId
    const roleId = getRoleId(role);

    // 5. Crear usuario
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(contraseña, saltRounds);

    const usuarioResult = await query(
      `INSERT INTO usuario (id_persona, id_rol, usuario, password, estado) 
       VALUES ($1, $2, $3, $4, 'activo') 
       RETURNING id_usuario`,
      [idPersona, roleId, usuario.trim().toLowerCase(), hashedPassword]
    );
    const idUsuario = usuarioResult.rows[0].id_usuario;
    console.log("✅ Usuario creado ID:", idUsuario);

    // 6. Determinar las tiendas a asignar según el rol
    let tiendasAsignar = [];

    if (role === "Vendedor") {
      // Vendedor: UNA sola tienda
      if (tiendaId && typeof tiendaId === 'string' && tiendaId.trim() !== "") {
        tiendasAsignar = [tiendaId];
      } else {
        throw new Error("El vendedor debe tener una tienda asignada");
      }
    } else if (role === "Administrador" || role === "Medidor") {
      // Administrador o Medidor: UNA O MÁS tiendas
      if (tiendaIds && Array.isArray(tiendaIds) && tiendaIds.length > 0) {
        tiendasAsignar = tiendaIds.filter(id => id && typeof id === 'string' && id.trim() !== "");
      } else if (tiendaId && typeof tiendaId === 'string' && tiendaId.trim() !== "") {
        tiendasAsignar = [tiendaId];
      } else {
        throw new Error(`El ${role} debe tener al menos una tienda asignada`);
      }
    }

    console.log("📌 Tiendas a asignar:", tiendasAsignar);

    // 7. Obtener el negocio de la primera tienda (para persona_negocio)
    let negocioIdToUse = null;
    if (tiendasAsignar.length > 0) {
      const negocioResult = await query(
        `SELECT id_negocio FROM tienda WHERE id_tienda = $1`,
        [tiendasAsignar[0]]
      );
      if (negocioResult.rows.length > 0) {
        negocioIdToUse = negocioResult.rows[0].id_negocio;
        console.log("✅ Negocio obtenido de tienda:", negocioIdToUse);
      }
    }

    if (!negocioIdToUse) {
      console.warn("⚠️ No se pudo obtener negocioId - sin tienda disponible");
    }

    // 8. Crear persona_negocio (si no existe)
    if (negocioIdToUse) {
      const carnetExistente = await query(
        'SELECT id_persona_negocio FROM persona_negocio WHERE id_persona = $1 AND id_negocio = $2',
        [idPersona, negocioIdToUse]
      );

      if (carnetExistente.rows.length === 0) {
        await query(
          `INSERT INTO persona_negocio (id_persona, id_negocio, carnet_persona) 
           VALUES ($1, $2, $3)`,
          [idPersona, negocioIdToUse, carnet.trim().toUpperCase()]
        );
        console.log("✅ Persona-Negocio creado con negocio:", negocioIdToUse);
      } else {
        console.log("ℹ️ Persona-Negocio ya existe");
      }
    } else {
      console.warn("⚠️ No se pudo crear persona_negocio - sin negocioId disponible");
    }

    // 9. Asignar tiendas a usuario_tienda (TODOS los roles usan la misma tabla)
    for (const tid of tiendasAsignar) {
      if (tid && typeof tid === 'string' && tid.trim() !== "") {
        await query(
          `INSERT INTO usuario_tienda (id_usuario, id_tienda) 
           VALUES ($1, $2)
           ON CONFLICT (id_usuario, id_tienda) DO NOTHING`,
          [idUsuario, tid]
        );
        console.log("✅ Usuario-Tienda creado:", tid);
      }
    }

    console.log("=== createUser completado exitosamente ===");
    return await getUserById(idUsuario);
  } catch (error) {
    console.error("❌ Error en createUser:", error);
    throw error;
  }
};

// ============================================
// ACTUALIZAR USUARIO
// ============================================

const updateUser = async (userId, userData) => {
  try {
    const {
      name,
      lastname,
      phoneNumber,
      username,
      carnet,
      password,
      tiendaId,
      tiendaIds,
      role,
      status,
    } = userData;

    console.log("=== updateUser ===");
    console.log("Datos recibidos:", { userId, name, lastname, phoneNumber, username, carnet, password, tiendaId, tiendaIds, role, status });

    // 1. Verificar que el usuario existe
    const userCheck = await query(
      'SELECT id_usuario, id_persona, id_rol FROM usuario WHERE id_usuario = $1',
      [userId]
    );
    if (userCheck.rows.length === 0) {
      throw new Error("Usuario no encontrado");
    }
    const user = userCheck.rows[0];

    // 2. Si es Spider Admin, no se puede modificar
    if (user.id_rol === 1) {
      throw new Error("No se puede modificar un Spider Admin");
    }

    // 3. Actualizar persona (si hay cambios)
    if (name || lastname || phoneNumber) {
      const updates = [];
      const params = [];
      let paramCount = 1;

      if (name) {
        updates.push(`nombre = $${paramCount}`);
        params.push(name.trim());
        paramCount++;
      }
      if (lastname) {
        updates.push(`apellido = $${paramCount}`);
        params.push(lastname.trim());
        paramCount++;
      }
      if (phoneNumber) {
        updates.push(`celular = $${paramCount}`);
        params.push(phoneNumber);
        paramCount++;
      }

      if (updates.length > 0) {
        params.push(user.id_persona);
        await query(
          `UPDATE persona SET ${updates.join(', ')} WHERE id_persona = $${paramCount}`,
          params
        );
        console.log("Persona actualizada");
      }
    }

    // 4. Actualizar usuario (username, password, status)
    if (username || password || status !== undefined) {
      const updates = [];
      const params = [];
      let paramCount = 1;

      if (username) {
        const usernameTaken = await isUsernameTaken(username, userId);
        if (usernameTaken) {
          throw new Error(`El nombre de usuario "${username}" ya está en uso`);
        }
        updates.push(`usuario = $${paramCount}`);
        params.push(username.trim().toLowerCase());
        paramCount++;
      }
      if (password && password.length > 0) {
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);
        updates.push(`password = $${paramCount}`);
        params.push(hashedPassword);
        paramCount++;
      }
      if (status !== undefined) {
        // Convertir de 'active'/'inactive' a 'activo'/'inactivo' para la BD
        const statusMap = {
          'active': 'activo',
          'inactive': 'inactivo',
        };
        updates.push(`estado = $${paramCount}`);
        params.push(statusMap[status] || 'inactivo');
        paramCount++;
        console.log("Estado a actualizar:", statusMap[status] || 'inactivo');
      }

      if (updates.length > 0) {
        params.push(userId);
        await query(
          `UPDATE usuario SET ${updates.join(', ')} WHERE id_usuario = $${paramCount}`,
          params
        );
        console.log("Usuario actualizado");
      }
    }

    // 5. Actualizar rol si se proporciona
    if (role) {
      const roleId = getRoleId(role);
      await query(
        'UPDATE usuario SET id_rol = $1 WHERE id_usuario = $2',
        [roleId, userId]
      );
      console.log("Rol actualizado a:", role);
    }

    // 6. Actualizar carnet en persona_negocio
    if (carnet) {
      const carnetExists = await query(
        'SELECT id_persona_negocio FROM persona_negocio WHERE id_persona = $1',
        [user.id_persona]
      );
      
      if (carnetExists.rows.length > 0) {
        await query(
          `UPDATE persona_negocio SET carnet_persona = $1 WHERE id_persona = $2`,
          [carnet.trim().toUpperCase(), user.id_persona]
        );
        console.log("Carnet actualizado en persona_negocio");
      }
    }

    // 7. ACTUALIZAR TIENDAS - ELIMINAR TODAS Y VOLVER A CREAR
    // Obtener el rol actual para saber cómo manejar las tiendas
    const currentRoleResult = await query(
      'SELECT id_rol FROM usuario WHERE id_usuario = $1',
      [userId]
    );
    const currentRoleId = currentRoleResult.rows[0]?.id_rol;
    const currentRoleName = getRoleName(currentRoleId);

    console.log("Rol actual:", currentRoleName);
    console.log("tiendaId recibido:", tiendaId);
    console.log("tiendaIds recibido:", tiendaIds);

    // 7a. ELIMINAR todas las tiendas actuales del usuario
    await query(
      'DELETE FROM usuario_tienda WHERE id_usuario = $1',
      [userId]
    );
    console.log("Usuario_tienda eliminado (todas las relaciones)");

    // 7b. Determinar las nuevas tiendas a asignar según el rol
    let tiendasAsignar = [];

    if (role) {
      // Si se está cambiando el rol, usar la lógica del nuevo rol
      if (role === "Vendedor") {
        // Vendedor: UNA sola tienda
        if (tiendaId && typeof tiendaId === 'string' && tiendaId.trim() !== "") {
          tiendasAsignar = [tiendaId];
        }
      } else if (role === "Administrador" || role === "Medidor") {
        // Administrador o Medidor: UNA O MÁS tiendas
        if (tiendaIds && Array.isArray(tiendaIds) && tiendaIds.length > 0) {
          tiendasAsignar = tiendaIds.filter(id => id && typeof id === 'string' && id.trim() !== "");
        } else if (tiendaId && typeof tiendaId === 'string' && tiendaId.trim() !== "") {
          tiendasAsignar = [tiendaId];
        }
      }
    } else {
      // Si no se está cambiando el rol, usar la lógica del rol actual
      if (currentRoleName === "Vendedor") {
        if (tiendaId && typeof tiendaId === 'string' && tiendaId.trim() !== "") {
          tiendasAsignar = [tiendaId];
        }
      } else if (currentRoleName === "Administrador" || currentRoleName === "Medidor") {
        if (tiendaIds && Array.isArray(tiendaIds) && tiendaIds.length > 0) {
          tiendasAsignar = tiendaIds.filter(id => id && typeof id === 'string' && id.trim() !== "");
        } else if (tiendaId && typeof tiendaId === 'string' && tiendaId.trim() !== "") {
          tiendasAsignar = [tiendaId];
        }
      }
    }

    console.log("Tiendas a asignar:", tiendasAsignar);

    // 7c. CREAR las nuevas relaciones usuario_tienda
    for (const tid of tiendasAsignar) {
      if (tid && typeof tid === 'string' && tid.trim() !== "") {
        await query(
          `INSERT INTO usuario_tienda (id_usuario, id_tienda) 
           VALUES ($1, $2)
           ON CONFLICT (id_usuario, id_tienda) DO NOTHING`,
          [userId, tid]
        );
        console.log("Usuario-Tienda creado:", tid);
      }
    }

    // 8. Si el rol cambió a Medidor, actualizar persona_negocio si es necesario
    if (role === "Medidor" && tiendasAsignar.length > 0) {
      // Obtener el negocio de la primera tienda
      const negocioResult = await query(
        `SELECT id_negocio FROM tienda WHERE id_tienda = $1`,
        [tiendasAsignar[0]]
      );
      if (negocioResult.rows.length > 0) {
        const negocioId = negocioResult.rows[0].id_negocio;
        // Verificar si ya existe persona_negocio
        const personaNegocioExists = await query(
          'SELECT id_persona_negocio FROM persona_negocio WHERE id_persona = $1 AND id_negocio = $2',
          [user.id_persona, negocioId]
        );
        if (personaNegocioExists.rows.length === 0) {
          await query(
            `INSERT INTO persona_negocio (id_persona, id_negocio, carnet_persona) 
             VALUES ($1, $2, $3)
             ON CONFLICT (id_persona, id_negocio) DO NOTHING`,
            [user.id_persona, negocioId, carnet || `USR-${userId}`]
          );
          console.log("Persona-Negocio creado para medidor");
        }
      }
    }

    console.log("=== updateUser completado ===");
    return await getUserById(userId);
  } catch (error) {
    console.error("Error en updateUser:", error);
    throw error;
  }
};

module.exports = {
  findUserByCarnet,
  isUsernameTaken,
  getMaxUsersForStore,
  canAddUserToStore,
  createUser,
  updateUser,
};