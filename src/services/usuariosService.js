// src/services/usuariosService.js
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

// ============================================
// USUARIOS
// ============================================

const getUsers = async (tiendaId) => {
  try {
    let queryText = `
      SELECT 
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
    `;

    const params = [];

    if (tiendaId) {
      queryText += `
        WHERE u.id_usuario IN (
          SELECT ut.id_usuario 
          FROM usuario_tienda ut 
          WHERE ut.id_tienda = $1
          UNION
          SELECT mn.id_medidor 
          FROM medidor_negocio mn
          INNER JOIN tienda t ON t.id_negocio = mn.id_negocio
          WHERE t.id_tienda = $1
        )
      `;
      params.push(tiendaId);
    }

    queryText += ` ORDER BY p.nombre ASC`;

    const result = await query(queryText, params);

    const users = [];
    for (const row of result.rows) {
      const tiendasResult = await query(
        `SELECT t.id_tienda as id, t.nombre_tienda as nombre
         FROM usuario_tienda ut
         INNER JOIN tienda t ON ut.id_tienda = t.id_tienda
         WHERE ut.id_usuario = $1`,
        [row.id]
      );
      const tiendas = tiendasResult.rows;

      const permissions = await getPermissionsForUser(row.id, row.id_rol);

      users.push({
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
        password: row.password,
      });
    }

    return users;
  } catch (error) {
    console.error("Error en getUsers:", error);
    throw error;
  }
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

    if (!row.id) return null;

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
    console.log("Datos:", { carnet, nombres, apellidos, role, tiendaId, tiendaIds });

    const carnetCheck = await query(
      `SELECT p.id_persona, u.id_usuario 
       FROM persona_negocio pn
       INNER JOIN persona p ON p.id_persona = pn.id_persona
       LEFT JOIN usuario u ON u.id_persona = p.id_persona
       WHERE pn.carnet_persona = $1`,
      [carnet.trim().toUpperCase()]
    );

    if (carnetCheck.rows.length > 0) {
      const row = carnetCheck.rows[0];
      if (row.id_usuario) {
        throw new Error("Esta persona ya cuenta con acceso al sistema, consulte con soporte si tiene algún problema");
      }
    }

    const usernameTaken = await isUsernameTaken(usuario);
    if (usernameTaken) {
      throw new Error(`El nombre de usuario "${usuario}" ya está en uso`);
    }

    const fullPhone = `${countryCode} ${phoneNumber}`;
    const personaResult = await query(
      `INSERT INTO persona (nombre, apellido, celular) 
       VALUES ($1, $2, $3) 
       RETURNING id_persona`,
      [nombres.trim(), apellidos.trim(), fullPhone]
    );
    const idPersona = personaResult.rows[0].id_persona;
    console.log("Persona creada ID:", idPersona);

    const roleId = getRoleId(role);

    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(contraseña, saltRounds);

    const usuarioResult = await query(
      `INSERT INTO usuario (id_persona, id_rol, usuario, password, estado) 
       VALUES ($1, $2, $3, $4, 'activo') 
       RETURNING id_usuario`,
      [idPersona, roleId, usuario.trim().toLowerCase(), hashedPassword]
    );
    const idUsuario = usuarioResult.rows[0].id_usuario;
    console.log("Usuario creado ID:", idUsuario);

    const carnetExistente = await query(
      'SELECT id_persona_negocio FROM persona_negocio WHERE carnet_persona = $1',
      [carnet.trim().toUpperCase()]
    );

    if (carnetExistente.rows.length === 0) {
      const tiendaParaNegocio = tiendaIds && tiendaIds.length > 0 && tiendaIds[0] ? tiendaIds[0] : tiendaId;
      
      if (tiendaParaNegocio && tiendaParaNegocio.trim() !== "") {
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
          console.log("Persona-Negocio creado");
        }
      }
    }

    const tiendasAsignar = tiendaIds && tiendaIds.length > 0 
      ? tiendaIds.filter(id => id && id.trim() !== "") 
      : (tiendaId && tiendaId.trim() !== "" ? [tiendaId] : []);
    
    for (const tid of tiendasAsignar) {
      if (tid && tid.trim() !== "") {
        await query(
          `INSERT INTO usuario_tienda (id_usuario, id_tienda) 
           VALUES ($1, $2)`,
          [idUsuario, tid]
        );
        console.log("Usuario-Tienda creado:", tid);
      }
    }

    if (role === "Medidor") {
      const tiendaParaNegocio = tiendasAsignar.length > 0 ? tiendasAsignar[0] : null;
      
      if (tiendaParaNegocio && tiendaParaNegocio.trim() !== "") {
        const negocioResult = await query(
          `SELECT id_negocio FROM tienda WHERE id_tienda = $1`,
          [tiendaParaNegocio]
        );
        if (negocioResult.rows.length > 0) {
          await query(
            `INSERT INTO medidor_negocio (id_medidor, id_negocio) 
             VALUES ($1, $2)
             ON CONFLICT (id_medidor, id_negocio) DO NOTHING`,
            [idUsuario, negocioResult.rows[0].id_negocio]
          );
          console.log("Medidor-Negocio creado");
        }
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
      status,
      grantedPermissions,
      revokedPermissions,
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

    if (username || password || status) {
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
      if (status) {
        updates.push(`estado = $${paramCount}`);
        params.push(status);
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

    if (carnet) {
      await query(
        `UPDATE persona_negocio SET carnet_persona = $1 
         WHERE id_persona = $2`,
        [carnet.trim().toUpperCase(), user.id_persona]
      );
    }

    if (tiendaIds !== undefined || tiendaId !== undefined) {
      const tiendasAsignar = tiendaIds && tiendaIds.length > 0 
        ? tiendaIds.filter(id => id && id.trim() !== "") 
        : (tiendaId && tiendaId.trim() !== "" ? [tiendaId] : []);

      await query(
        'DELETE FROM usuario_tienda WHERE id_usuario = $1',
        [userId]
      );

      for (const tid of tiendasAsignar) {
        if (tid && tid.trim() !== "") {
          await query(
            `INSERT INTO usuario_tienda (id_usuario, id_tienda) 
             VALUES ($1, $2)`,
            [userId, tid]
          );
        }
      }

      const roleResult = await query(
        'SELECT id_rol FROM usuario WHERE id_usuario = $1',
        [userId]
      );
      if (roleResult.rows.length > 0 && roleResult.rows[0].id_rol === 4) {
        await query(
          'DELETE FROM medidor_negocio WHERE id_medidor = $1',
          [userId]
        );
        
        if (tiendasAsignar.length > 0 && tiendasAsignar[0] && tiendasAsignar[0].trim() !== "") {
          const negocioResult = await query(
            'SELECT id_negocio FROM tienda WHERE id_tienda = $1',
            [tiendasAsignar[0]]
          );
          if (negocioResult.rows.length > 0) {
            await query(
              `INSERT INTO medidor_negocio (id_medidor, id_negocio) 
               VALUES ($1, $2)
               ON CONFLICT (id_medidor, id_negocio) DO NOTHING`,
              [userId, negocioResult.rows[0].id_negocio]
            );
          }
        }
      }
    }

    if (grantedPermissions !== undefined || revokedPermissions !== undefined) {
      await query(
        'DELETE FROM usuario_permiso WHERE id_usuario = $1',
        [userId]
      );

      if (grantedPermissions && grantedPermissions.length > 0) {
        for (const perm of grantedPermissions) {
          const permResult = await query(
            'SELECT id_permiso FROM permiso WHERE nombre = $1',
            [perm]
          );
          if (permResult.rows.length > 0) {
            await query(
              `INSERT INTO usuario_permiso (id_usuario, id_permiso, tipo) 
               VALUES ($1, $2, 'concedido')`,
              [userId, permResult.rows[0].id_permiso]
            );
          }
        }
      }

      if (revokedPermissions && revokedPermissions.length > 0) {
        for (const perm of revokedPermissions) {
          const permResult = await query(
            'SELECT id_permiso FROM permiso WHERE nombre = $1',
            [perm]
          );
          if (permResult.rows.length > 0) {
            await query(
              `INSERT INTO usuario_permiso (id_usuario, id_permiso, tipo) 
               VALUES ($1, $2, 'revocado')`,
              [userId, permResult.rows[0].id_permiso]
            );
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

const deleteUser = async (userId) => {
  try {
    const userCheck = await query(
      'SELECT id_usuario, id_rol FROM usuario WHERE id_usuario = $1',
      [userId]
    );
    if (userCheck.rows.length === 0) {
      throw new Error("Usuario no encontrado");
    }

    const user = userCheck.rows[0];

    if (user.id_rol === 1 || user.id_rol === 2) {
      throw new Error("No se puede eliminar un administrador");
    }

    await query(
      "UPDATE usuario SET estado = 'eliminado' WHERE id_usuario = $1",
      [userId]
    );

    return true;
  } catch (error) {
    console.error("Error en deleteUser:", error);
    throw error;
  }
};

const toggleUserStatus = async (userId) => {
  try {
    const userCheck = await query(
      'SELECT id_usuario, id_rol, estado FROM usuario WHERE id_usuario = $1',
      [userId]
    );
    if (userCheck.rows.length === 0) {
      throw new Error("Usuario no encontrado");
    }

    const user = userCheck.rows[0];

    if (user.id_rol === 1 || user.id_rol === 2) {
      throw new Error("No se puede cambiar el estado de un administrador");
    }

    const newStatus = user.estado === 'activo' ? 'inactivo' : 'activo';

    await query(
      "UPDATE usuario SET estado = $1 WHERE id_usuario = $2",
      [newStatus, userId]
    );

    return await getUserById(userId);
  } catch (error) {
    console.error("Error en toggleUserStatus:", error);
    throw error;
  }
};

const updateUserPermissions = async (userId, granted, revoked) => {
  try {
    const userCheck = await query(
      'SELECT id_usuario, id_rol FROM usuario WHERE id_usuario = $1',
      [userId]
    );
    if (userCheck.rows.length === 0) {
      throw new Error("Usuario no encontrado");
    }

    const user = userCheck.rows[0];

    if (user.id_rol === 1 || user.id_rol === 2) {
      throw new Error("No se pueden modificar los permisos de administradores");
    }

    await query(
      'DELETE FROM usuario_permiso WHERE id_usuario = $1',
      [userId]
    );

    if (granted && granted.length > 0) {
      for (const perm of granted) {
        const permResult = await query(
          'SELECT id_permiso FROM permiso WHERE nombre = $1',
          [perm]
        );
        if (permResult.rows.length > 0) {
          await query(
            `INSERT INTO usuario_permiso (id_usuario, id_permiso, tipo) 
             VALUES ($1, $2, 'concedido')`,
            [userId, permResult.rows[0].id_permiso]
          );
        }
      }
    }

    if (revoked && revoked.length > 0) {
      for (const perm of revoked) {
        const permResult = await query(
          'SELECT id_permiso FROM permiso WHERE nombre = $1',
          [perm]
        );
        if (permResult.rows.length > 0) {
          await query(
            `INSERT INTO usuario_permiso (id_usuario, id_permiso, tipo) 
             VALUES ($1, $2, 'revocado')`,
            [userId, permResult.rows[0].id_permiso]
          );
        }
      }
    }

    return await getUserById(userId);
  } catch (error) {
    console.error("Error en updateUserPermissions:", error);
    throw error;
  }
};

const getUserStats = async () => {
  try {
    const totalResult = await query('SELECT COUNT(*) as total FROM usuario');
    const total = parseInt(totalResult.rows[0].total);

    const activosResult = await query(
      "SELECT COUNT(*) as total FROM usuario WHERE estado = 'activo'"
    );
    const activos = parseInt(activosResult.rows[0].total);

    const inactivosResult = await query(
      "SELECT COUNT(*) as total FROM usuario WHERE estado = 'inactivo'"
    );
    const inactivos = parseInt(inactivosResult.rows[0].total);

    const porRolResult = await query(
      `SELECT r.nombre as role, COUNT(*) as total 
       FROM usuario u
       INNER JOIN rol r ON u.id_rol = r.id_rol
       GROUP BY r.nombre`
    );

    const porRol = {
      "Spider Admin": 0,
      "Administrador": 0,
      "Vendedor": 0,
      "Medidor": 0,
    };

    porRolResult.rows.forEach(row => {
      if (row.role in porRol) {
        porRol[row.role] = parseInt(row.total);
      }
    });

    return { total, activos, inactivos, porRol };
  } catch (error) {
    console.error("Error en getUserStats:", error);
    throw error;
  }
};

// ============================================
// TIENDAS
// ============================================

const getTiendas = async () => {
  try {
    const result = await query(
      `SELECT id_tienda as id, nombre_tienda as nombre 
       FROM tienda 
       WHERE estado != 'eliminado'
       ORDER BY nombre_tienda`
    );
    return result.rows;
  } catch (error) {
    console.error("Error en getTiendas:", error);
    throw error;
  }
};

const getAdminStores = async (adminId) => {
  try {
    const tiendasResult = await query(
      `SELECT t.id_tienda, t.nombre_tienda, t.estado
       FROM usuario_tienda ut
       INNER JOIN tienda t ON ut.id_tienda = t.id_tienda
       WHERE ut.id_usuario = $1 AND t.estado != 'eliminado'`,
      [adminId]
    );

    const stores = [];
    for (const row of tiendasResult.rows) {
      const usersResult = await query(
        `SELECT COUNT(*) as total 
         FROM usuario_tienda ut
         INNER JOIN usuario u ON ut.id_usuario = u.id_usuario
         WHERE ut.id_tienda = $1 AND u.estado = 'activo'`,
        [row.id_tienda]
      );
      const usuarios = parseInt(usersResult.rows[0].total);

      const limiteResult = await query(
        `SELECT precio FROM tienda WHERE id_tienda = $1`,
        [row.id_tienda]
      );
      const limite = limiteResult.rows.length > 0 ? Math.max(1, Math.floor(parseFloat(limiteResult.rows[0].precio) / 100)) : 5;

      const pagoResult = await query(
        `SELECT fecha_pago FROM tienda WHERE id_tienda = $1`,
        [row.id_tienda]
      );
      const fechaPago = pagoResult.rows.length > 0 ? pagoResult.rows[0].fecha_pago : null;

      stores.push({
        id: row.id_tienda,
        nombre: row.nombre_tienda,
        usuarios: usuarios,
        limite: limite,
        proximoPago: fechaPago,
        montoPago: 500,
        pagado: false,
      });
    }

    return stores;
  } catch (error) {
    console.error("Error en getAdminStores:", error);
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

const setMaxUsersForStore = async (tiendaId, maxUsers) => {
  try {
    const newPrecio = maxUsers * 100;
    await query(
      `UPDATE tienda SET precio = $1 WHERE id_tienda = $2`,
      [newPrecio, tiendaId]
    );
  } catch (error) {
    console.error("Error en setMaxUsersForStore:", error);
    throw error;
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
// SOLICITUDES DE TIENDAS (PENDIENTES DE IMPLEMENTAR)
// ============================================

const getStoreRequests = async () => {
  return [];
};

const addStoreRequest = async (request) => {
  throw new Error("Funcionalidad no implementada aún");
};

const updateStoreRequest = async (requestId, estado) => {
  throw new Error("Funcionalidad no implementada aún");
};

// ============================================
// SOLICITUDES DE AUMENTO DE USUARIOS (PENDIENTES DE IMPLEMENTAR)
// ============================================

const getUserLimitRequests = async () => {
  return [];
};

const addUserLimitRequest = async (request) => {
  throw new Error("Funcionalidad no implementada aún");
};

const updateUserLimitRequest = async (requestId, estado) => {
  throw new Error("Funcionalidad no implementada aún");
};

// ============================================
// PAGOS
// ============================================

const getStorePayments = async () => {
  try {
    const result = await query(
      `SELECT id_tienda as tiendaId, fecha_pago as proximoPago, precio as monto
       FROM tienda 
       WHERE estado != 'eliminado'`
    );
    return result.rows.map(row => ({
      tiendaId: row.tiendaid,
      proximoPago: row.proximopago,
      monto: parseFloat(row.monto),
      pagado: false,
    }));
  } catch (error) {
    console.error("Error en getStorePayments:", error);
    return [];
  }
};

const updateStorePayment = async (tiendaId, proximoPago, monto) => {
  try {
    await query(
      `UPDATE tienda SET fecha_pago = $1, precio = $2 WHERE id_tienda = $3`,
      [proximoPago, monto, tiendaId]
    );
    return { tiendaId, proximoPago, monto, pagado: false };
  } catch (error) {
    console.error("Error en updateStorePayment:", error);
    throw error;
  }
};

// ============================================
// MEDIDORES
// ============================================

const getMedidorAssignmentRequests = async () => {
  return [];
};

const addMedidorAssignmentRequest = async (request) => {
  throw new Error("Funcionalidad no implementada aún");
};

const updateMedidorAssignmentRequest = async (requestId, estado) => {
  throw new Error("Funcionalidad no implementada aún");
};

const assignMedidorToStore = async (medidorId, tiendaId) => {
  try {
    const userCheck = await query(
      'SELECT id_rol FROM usuario WHERE id_usuario = $1',
      [medidorId]
    );
    if (userCheck.rows.length === 0) {
      throw new Error("Usuario no encontrado");
    }
    if (userCheck.rows[0].id_rol !== 4) {
      throw new Error("El usuario no es un medidor");
    }

    const tiendaCheck = await query(
      'SELECT id_tienda, id_negocio FROM tienda WHERE id_tienda = $1',
      [tiendaId]
    );
    if (tiendaCheck.rows.length === 0) {
      throw new Error("Tienda no encontrada");
    }

    await query(
      `INSERT INTO usuario_tienda (id_usuario, id_tienda) 
       VALUES ($1, $2)
       ON CONFLICT (id_usuario, id_tienda) DO NOTHING`,
      [medidorId, tiendaId]
    );

    const negocioId = tiendaCheck.rows[0].id_negocio;
    await query(
      `INSERT INTO medidor_negocio (id_medidor, id_negocio) 
       VALUES ($1, $2)
       ON CONFLICT (id_medidor, id_negocio) DO NOTHING`,
      [medidorId, negocioId]
    );

    return await getUserById(medidorId);
  } catch (error) {
    console.error("Error en assignMedidorToStore:", error);
    throw error;
  }
};

const removeMedidorFromStore = async (medidorId, tiendaId) => {
  try {
    const userCheck = await query(
      'SELECT id_rol FROM usuario WHERE id_usuario = $1',
      [medidorId]
    );
    if (userCheck.rows.length === 0) {
      throw new Error("Usuario no encontrado");
    }
    if (userCheck.rows[0].id_rol !== 4) {
      throw new Error("El usuario no es un medidor");
    }

    const tiendasResult = await query(
      'SELECT id_tienda FROM usuario_tienda WHERE id_usuario = $1',
      [medidorId]
    );
    if (tiendasResult.rows.length <= 1) {
      throw new Error("El medidor debe tener al menos una tienda asignada");
    }

    await query(
      'DELETE FROM usuario_tienda WHERE id_usuario = $1 AND id_tienda = $2',
      [medidorId, tiendaId]
    );

    const negocioResult = await query(
      'SELECT id_negocio FROM tienda WHERE id_tienda = $1',
      [tiendaId]
    );
    if (negocioResult.rows.length > 0) {
      await query(
        'DELETE FROM medidor_negocio WHERE id_medidor = $1 AND id_negocio = $2',
        [medidorId, negocioResult.rows[0].id_negocio]
      );
    }

    return await getUserById(medidorId);
  } catch (error) {
    console.error("Error en removeMedidorFromStore:", error);
    throw error;
  }
};

const getMedidorStores = async (medidorId) => {
  try {
    const result = await query(
      `SELECT t.id_tienda as id, t.nombre_tienda as nombre
       FROM usuario_tienda ut
       INNER JOIN tienda t ON ut.id_tienda = t.id_tienda
       WHERE ut.id_usuario = $1 AND t.estado != 'eliminado'`,
      [medidorId]
    );
    return result.rows;
  } catch (error) {
    console.error("Error en getMedidorStores:", error);
    throw error;
  }
};

module.exports = {
  getUsers,
  getUserById,
  findUserByCarnet,
  isUsernameTaken,
  createUser,
  updateUser,
  deleteUser,
  toggleUserStatus,
  updateUserPermissions,
  getUserStats,
  getTiendas,
  getAdminStores,
  getMaxUsersForStore,
  setMaxUsersForStore,
  canAddUserToStore,
  getStoreRequests,
  addStoreRequest,
  updateStoreRequest,
  getUserLimitRequests,
  addUserLimitRequest,
  updateUserLimitRequest,
  getStorePayments,
  updateStorePayment,
  getMedidorAssignmentRequests,
  addMedidorAssignmentRequest,
  updateMedidorAssignmentRequest,
  assignMedidorToStore,
  removeMedidorFromStore,
  getMedidorStores,
};