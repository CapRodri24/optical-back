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
        pn.carnet_persona as carnet,
        u.password
      FROM usuario u
      INNER JOIN persona p ON u.id_persona = p.id_persona
      INNER JOIN rol r ON u.id_rol = r.id_rol
      LEFT JOIN persona_negocio pn ON p.id_persona = pn.id_persona
      WHERE u.id_usuario = $1`,
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

    return {
      id: row.id,
      username: row.username,
      name: row.name || "",
      lastname: row.lastname || "",
      role: row.role,
      status: row.status || "active",
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
        pn.carnet_persona as carnet,
        u.password
      FROM persona_negocio pn
      INNER JOIN persona p ON p.id_persona = pn.id_persona
      LEFT JOIN usuario u ON u.id_persona = p.id_persona
      LEFT JOIN rol r ON r.id_rol = u.id_rol
      WHERE pn.carnet_persona = $1`,
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

      return {
        id: row.id,
        username: row.username,
        name: row.name || "",
        lastname: row.lastname || "",
        role: row.role || "Usuario",
        status: row.status || "active",
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
      `SELECT precio FROM tienda WHERE id_tienda = $1`,
      [tiendaId]
    );
    if (result.rows.length === 0) {
      return 1;
    }
    return Math.max(1, Math.floor(parseFloat(result.rows[0].precio) / 100));
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
      negocioId,
    } = userData;

    console.log("=== Formulario - createUser ===");
    console.log("Datos recibidos:", { 
      carnet, 
      nombres, 
      apellidos, 
      role, 
      tiendaId, 
      tiendaIds, 
      negocioId 
    });

    // Verificar si la persona ya existe
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
        if (roleName === "Medidor") {
          throw new Error("Medidor ya registrado. Consulte con soporte para agregarlo a su tienda.");
        } else {
          throw new Error("Usuario ya registrado. Esta persona ya cuenta con acceso al sistema. Consulte con soporte si tiene algún problema.");
        }
      }
    }

    // Verificar si el nombre de usuario ya está tomado
    const usernameTaken = await isUsernameTaken(usuario);
    if (usernameTaken) {
      throw new Error(`El nombre de usuario "${usuario}" ya está en uso`);
    }

    const fullPhone = `${countryCode} ${phoneNumber}`;
    
    // Si la persona no existe, crearla
    if (!idPersona) {
      const personaResult = await query(
        `INSERT INTO persona (nombre, apellido, celular) 
         VALUES ($1, $2, $3) 
         RETURNING id_persona`,
        [nombres.trim(), apellidos.trim(), fullPhone]
      );
      idPersona = personaResult.rows[0].id_persona;
      console.log("Persona creada ID:", idPersona);
    } else {
      // Actualizar datos de la persona existente
      await query(
        `UPDATE persona SET nombre = $1, apellido = $2, celular = $3 WHERE id_persona = $4`,
        [nombres.trim(), apellidos.trim(), fullPhone, idPersona]
      );
      console.log("Persona actualizada ID:", idPersona);
    }

    const roleId = getRoleId(role);

    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(contraseña, saltRounds);

    // Crear usuario
    const usuarioResult = await query(
      `INSERT INTO usuario (id_persona, id_rol, usuario, password, estado) 
       VALUES ($1, $2, $3, $4, 'activo') 
       RETURNING id_usuario`,
      [idPersona, roleId, usuario.trim().toLowerCase(), hashedPassword]
    );
    const idUsuario = usuarioResult.rows[0].id_usuario;
    console.log("Usuario creado ID:", idUsuario);

    // Verificar si ya existe persona_negocio
    const carnetExistente = await query(
      'SELECT id_persona_negocio FROM persona_negocio WHERE carnet_persona = $1',
      [carnet.trim().toUpperCase()]
    );

    // Para Vendedor o Administrador: asignar a tienda usando persona_negocio y usuario_tienda
    if (role === "Vendedor" || role === "Administrador") {
      // 1. Crear persona_negocio si no existe
      if (carnetExistente.rows.length === 0) {
        // Obtener el negocio de la tienda seleccionada
        let tiendaParaNegocio = null;
        
        if (tiendaId && typeof tiendaId === 'string' && tiendaId.trim() !== "") {
          tiendaParaNegocio = tiendaId;
        } else if (tiendaIds && Array.isArray(tiendaIds) && tiendaIds.length > 0) {
          const firstValidTienda = tiendaIds.find(id => id && typeof id === 'string' && id.trim() !== "");
          if (firstValidTienda) {
            tiendaParaNegocio = firstValidTienda;
          }
        }
        
        console.log("tiendaParaNegocio:", tiendaParaNegocio);
        
        if (tiendaParaNegocio) {
          const negocioResult = await query(
            `SELECT id_negocio FROM tienda WHERE id_tienda = $1`,
            [tiendaParaNegocio]
          );
          if (negocioResult.rows.length > 0) {
            await query(
              `INSERT INTO persona_negocio (id_persona, id_negocio, carnet_persona) 
               VALUES ($1, $2, $3)`,
              [idPersona, negocioResult.rows[0].id_negocio, carnet.trim().toUpperCase()]
            );
            console.log("Persona-Negocio creado para", role);
          }
        }
      }

      // 2. Asignar tiendas usando usuario_tienda
      let tiendasAsignar = [];
      if (tiendaIds && Array.isArray(tiendaIds) && tiendaIds.length > 0) {
        tiendasAsignar = tiendaIds.filter(id => id && typeof id === 'string' && id.trim() !== "");
      } else if (tiendaId && typeof tiendaId === 'string' && tiendaId.trim() !== "") {
        tiendasAsignar = [tiendaId];
      }
      
      console.log("Tiendas a asignar:", tiendasAsignar);
      
      for (const tid of tiendasAsignar) {
        if (tid && typeof tid === 'string' && tid.trim() !== "") {
          // Usar INSERT ... ON CONFLICT DO NOTHING para evitar duplicados
          await query(
            `INSERT INTO usuario_tienda (id_usuario, id_tienda) 
             VALUES ($1, $2)
             ON CONFLICT (id_usuario, id_tienda) DO NOTHING`,
            [idUsuario, tid]
          );
          console.log("Usuario-Tienda creado para", role, ":", tid);
        }
      }
    }

    // Para Medidor: no se asigna tienda, se asigna negocio con medidor_negocio
    if (role === "Medidor") {
      // 1. Crear persona_negocio si no existe
      if (carnetExistente.rows.length === 0) {
        let negocioIdToUse = null;
        
        if (negocioId && typeof negocioId === 'string' && negocioId.trim() !== "") {
          negocioIdToUse = negocioId;
        } else if (tiendaId && typeof tiendaId === 'string' && tiendaId.trim() !== "") {
          // Obtener negocio de la tienda
          const tiendaNegocioResult = await query(
            `SELECT id_negocio FROM tienda WHERE id_tienda = $1`,
            [tiendaId]
          );
          if (tiendaNegocioResult.rows.length > 0) {
            negocioIdToUse = tiendaNegocioResult.rows[0].id_negocio;
          }
        }
        
        if (negocioIdToUse) {
          await query(
            `INSERT INTO persona_negocio (id_persona, id_negocio, carnet_persona) 
             VALUES ($1, $2, $3)`,
            [idPersona, negocioIdToUse, carnet.trim().toUpperCase()]
          );
          console.log("Persona-Negocio creado para Medidor con negocio:", negocioIdToUse);
        }
      }

      // 2. Asignar medidor al negocio usando medidor_negocio
      let negocioIdToAssign = null;
      
      if (negocioId && typeof negocioId === 'string' && negocioId.trim() !== "") {
        negocioIdToAssign = negocioId;
      } else if (tiendaId && typeof tiendaId === 'string' && tiendaId.trim() !== "") {
        const tiendaNegocioResult = await query(
          `SELECT id_negocio FROM tienda WHERE id_tienda = $1`,
          [tiendaId]
        );
        if (tiendaNegocioResult.rows.length > 0) {
          negocioIdToAssign = tiendaNegocioResult.rows[0].id_negocio;
        }
      }
      
      if (negocioIdToAssign) {
        await query(
          `INSERT INTO medidor_negocio (id_medidor, id_negocio) 
           VALUES ($1, $2)
           ON CONFLICT (id_medidor, id_negocio) DO NOTHING`,
          [idUsuario, negocioIdToAssign]
        );
        console.log("Medidor-Negocio creado:", negocioIdToAssign);
      } else {
        console.warn("No se pudo asignar negocio al medidor - sin negocioId disponible");
      }
    }

    return await getUserById(idUsuario);
  } catch (error) {
    console.error("Error en createUser:", error);
    throw error;
  }
};

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
      negocioId,
    } = userData;

    const userCheck = await query(
      'SELECT id_usuario, id_persona, id_rol FROM usuario WHERE id_usuario = $1',
      [userId]
    );
    if (userCheck.rows.length === 0) {
      throw new Error("Usuario no encontrado");
    }
    const user = userCheck.rows[0];

    if (user.id_rol === 1) {
      throw new Error("No se puede modificar un Spider Admin");
    }

    // Actualizar persona
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
      }
    }

    // Actualizar usuario
    if (username || password) {
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

      if (updates.length > 0) {
        params.push(userId);
        await query(
          `UPDATE usuario SET ${updates.join(', ')} WHERE id_usuario = $${paramCount}`,
          params
        );
      }
    }

    // Actualizar rol si se proporciona
    if (role) {
      const roleId = getRoleId(role);
      await query(
        'UPDATE usuario SET id_rol = $1 WHERE id_usuario = $2',
        [roleId, userId]
      );
    }

    // Actualizar carnet en persona_negocio
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
      }
    }

    // Obtener el rol actual del usuario
    const currentRoleResult = await query(
      'SELECT id_rol FROM usuario WHERE id_usuario = $1',
      [userId]
    );
    const currentRoleId = currentRoleResult.rows[0]?.id_rol;
    const currentRoleName = getRoleName(currentRoleId);

    // Actualizar tiendas según el rol
    if (tiendaIds !== undefined || tiendaId !== undefined) {
      // Eliminar todas las asignaciones de tienda actuales
      await query(
        'DELETE FROM usuario_tienda WHERE id_usuario = $1',
        [userId]
      );

      // Si es Medidor, no se asigna tienda
      if (currentRoleName === "Medidor") {
        // Actualizar medidor_negocio si se proporciona negocioId
        if (negocioId && typeof negocioId === 'string' && negocioId.trim() !== "") {
          await query(
            'DELETE FROM medidor_negocio WHERE id_medidor = $1',
            [userId]
          );
          await query(
            `INSERT INTO medidor_negocio (id_medidor, id_negocio) 
             VALUES ($1, $2)
             ON CONFLICT (id_medidor, id_negocio) DO NOTHING`,
            [userId, negocioId]
          );
          console.log("Medidor-Negocio actualizado:", negocioId);
        }
      } else {
        // Para Vendedor o Administrador, asignar tiendas
        let tiendasAsignar = [];
        if (tiendaIds && Array.isArray(tiendaIds) && tiendaIds.length > 0) {
          tiendasAsignar = tiendaIds.filter(id => id && typeof id === 'string' && id.trim() !== "");
        } else if (tiendaId && typeof tiendaId === 'string' && tiendaId.trim() !== "") {
          tiendasAsignar = [tiendaId];
        }

        for (const tid of tiendasAsignar) {
          if (tid && typeof tid === 'string' && tid.trim() !== "") {
            await query(
              `INSERT INTO usuario_tienda (id_usuario, id_tienda) 
               VALUES ($1, $2)
               ON CONFLICT (id_usuario, id_tienda) DO NOTHING`,
              [userId, tid]
            );
            console.log("Usuario-Tienda actualizado:", tid);
          }
        }
      }
    }

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