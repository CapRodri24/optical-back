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

const getUsers = async (tiendaId, negocioId) => {
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
        pn.carnet_persona as carnet
      FROM usuario u
      INNER JOIN persona p ON u.id_persona = p.id_persona
      INNER JOIN rol r ON u.id_rol = r.id_rol
      LEFT JOIN persona_negocio pn ON p.id_persona = pn.id_persona
      WHERE u.estado != 'eliminado'
        AND u.id_usuario IN (
          SELECT ut.id_usuario 
          FROM usuario_tienda ut
          INNER JOIN tienda t ON ut.id_tienda = t.id_tienda
    `;

    const params = [];

    if (negocioId) {
      queryText += ` WHERE t.id_negocio = $1`;
      params.push(negocioId);
    }

    if (tiendaId) {
      if (negocioId) {
        queryText += ` AND t.id_tienda = $${params.length + 1}`;
      } else {
        queryText += ` WHERE t.id_tienda = $${params.length + 1}`;
      }
      params.push(tiendaId);
    }

    queryText += ` )`;

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

      const statusMap = {
        'activo': 'active',
        'inactivo': 'inactive',
      };

      users.push({
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
      });
    }

    const uniqueUsers = [];
    const seenIds = new Set();
    for (const user of users) {
      if (!seenIds.has(user.id)) {
        seenIds.add(user.id);
        uniqueUsers.push(user);
      }
    }

    return uniqueUsers;
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
        const usernameTaken = await query(
          'SELECT id_usuario FROM usuario WHERE usuario = $1 AND id_usuario != $2',
          [username.trim().toLowerCase(), userId]
        );
        if (usernameTaken.rows.length > 0) {
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
        const statusMap = {
          'active': 'activo',
          'inactive': 'inactivo',
        };
        updates.push(`estado = $${paramCount}`);
        params.push(statusMap[status] || 'inactivo');
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

      await query('DELETE FROM usuario_tienda WHERE id_usuario = $1', [userId]);

      for (const tid of tiendasAsignar) {
        if (tid && tid.trim() !== "") {
          await query(
            `INSERT INTO usuario_tienda (id_usuario, id_tienda) VALUES ($1, $2)`,
            [userId, tid]
          );
        }
      }
    }

    if (grantedPermissions !== undefined || revokedPermissions !== undefined) {
      await query('DELETE FROM usuario_permiso WHERE id_usuario = $1', [userId]);

      if (grantedPermissions && grantedPermissions.length > 0) {
        for (const perm of grantedPermissions) {
          const permResult = await query(
            'SELECT id_permiso FROM permiso WHERE nombre = $1',
            [perm]
          );
          if (permResult.rows.length > 0) {
            await query(
              `INSERT INTO usuario_permiso (id_usuario, id_permiso, tipo) VALUES ($1, $2, 'concedido')`,
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
              `INSERT INTO usuario_permiso (id_usuario, id_permiso, tipo) VALUES ($1, $2, 'revocado')`,
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

    await query("UPDATE usuario SET estado = 'eliminado' WHERE id_usuario = $1", [userId]);

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

    await query("UPDATE usuario SET estado = $1 WHERE id_usuario = $2", [newStatus, userId]);

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

    await query('DELETE FROM usuario_permiso WHERE id_usuario = $1', [userId]);

    if (granted && granted.length > 0) {
      for (const perm of granted) {
        const permResult = await query(
          'SELECT id_permiso FROM permiso WHERE nombre = $1',
          [perm]
        );
        if (permResult.rows.length > 0) {
          await query(
            `INSERT INTO usuario_permiso (id_usuario, id_permiso, tipo) VALUES ($1, $2, 'concedido')`,
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
            `INSERT INTO usuario_permiso (id_usuario, id_permiso, tipo) VALUES ($1, $2, 'revocado')`,
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
    const totalResult = await query('SELECT COUNT(*) as total FROM usuario WHERE estado != \'eliminado\'');
    const total = parseInt(totalResult.rows[0].total);

    const activosResult = await query("SELECT COUNT(*) as total FROM usuario WHERE estado = 'activo'");
    const activos = parseInt(activosResult.rows[0].total);

    const inactivosResult = await query("SELECT COUNT(*) as total FROM usuario WHERE estado = 'inactivo'");
    const inactivos = parseInt(inactivosResult.rows[0].total);

    const porRolResult = await query(
      `SELECT r.nombre as role, COUNT(*) as total 
       FROM usuario u
       INNER JOIN rol r ON u.id_rol = r.id_rol
       WHERE u.estado != 'eliminado'
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
// TIENDAS - Solo lo necesario
// ============================================

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

// ============================================
// NEGOCIO - Responsable
// ============================================

const getNegocioResponsable = async (negocioId) => {
  try {
    if (!negocioId) return null;
    const result = await query(
      `SELECT responsable_id FROM negocio WHERE id_negocio = $1`,
      [negocioId]
    );
    if (result.rows.length === 0) return null;
    return result.rows[0].responsable_id;
  } catch (error) {
    console.error("Error en getNegocioResponsable:", error);
    return null;
  }
};

// ============================================
// ELIMINAR USUARIO DE TIENDA (para medidores)
// ============================================

const deleteUserFromStore = async (userId, tiendaId) => {
  try {
    // Verificar que el usuario existe
    const userCheck = await query(
      'SELECT id_usuario, id_rol FROM usuario WHERE id_usuario = $1 AND estado != \'eliminado\'',
      [userId]
    );
    if (userCheck.rows.length === 0) {
      throw new Error("Usuario no encontrado");
    }

    const user = userCheck.rows[0];

    // Verificar que el usuario sea un medidor
    if (user.id_rol !== 4) {
      throw new Error("Solo se pueden eliminar medidores de tiendas");
    }

    // Verificar que la tienda existe
    const tiendaCheck = await query(
      'SELECT id_tienda, id_negocio FROM tienda WHERE id_tienda = $1',
      [tiendaId]
    );
    if (tiendaCheck.rows.length === 0) {
      throw new Error("Tienda no encontrada");
    }

    // Verificar que el medidor tiene la tienda asignada
    const assignCheck = await query(
      'SELECT id_usuario_tienda FROM usuario_tienda WHERE id_usuario = $1 AND id_tienda = $2',
      [userId, tiendaId]
    );
    if (assignCheck.rows.length === 0) {
      throw new Error("El medidor no está asignado a esta tienda");
    }

    // Eliminar la asignación
    await query(
      'DELETE FROM usuario_tienda WHERE id_usuario = $1 AND id_tienda = $2',
      [userId, tiendaId]
    );

    // Verificar si el medidor tiene otras tiendas asignadas en este negocio
    const negocioId = tiendaCheck.rows[0].id_negocio;
    const remainingTiendas = await query(
      `SELECT ut.id_tienda 
       FROM usuario_tienda ut
       INNER JOIN tienda t ON ut.id_tienda = t.id_tienda
       WHERE ut.id_usuario = $1 AND t.id_negocio = $2`,
      [userId, negocioId]
    );

    // Si no tiene más tiendas en este negocio, eliminar persona_negocio
    if (remainingTiendas.rows.length === 0) {
      // Obtener id_persona del usuario
      const personaResult = await query(
        'SELECT id_persona FROM usuario WHERE id_usuario = $1',
        [userId]
      );
      if (personaResult.rows.length > 0) {
        const idPersona = personaResult.rows[0].id_persona;
        
        // Eliminar persona_negocio de este negocio
        await query(
          'DELETE FROM persona_negocio WHERE id_persona = $1 AND id_negocio = $2',
          [idPersona, negocioId]
        );
        console.log(`Persona-Negocio eliminado para el medidor ${userId} en el negocio ${negocioId}`);
      }

      // Verificar si el medidor tiene tiendas en otros negocios
      const otrasTiendas = await query(
        'SELECT id_tienda FROM usuario_tienda WHERE id_usuario = $1',
        [userId]
      );
      
      // Si no tiene más tiendas en ningún negocio, desactivar al medidor
      if (otrasTiendas.rows.length === 0) {
        await query(
          "UPDATE usuario SET estado = 'inactivo' WHERE id_usuario = $1",
          [userId]
        );
        console.log(`Medidor ${userId} desactivado porque no tiene más tiendas asignadas`);
      }
    }

    return { success: true };
  } catch (error) {
    console.error("Error en deleteUserFromStore:", error);
    throw error;
  }
};

module.exports = {
  getUsers,
  getUserById,
  updateUser,
  deleteUser,
  toggleUserStatus,
  updateUserPermissions,
  getUserStats,
  getMaxUsersForStore,
  getNegocioResponsable,
  deleteUserFromStore,
};