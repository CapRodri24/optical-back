// src/services/loginservice.js
const { query } = require("../../db");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const authenticateUser = async (username, password) => {
  try {
    console.log("=== authenticateUser ===");
    console.log("Username:", username);
    
    // 1. Buscar usuario en la base de datos
    const userQuery = `
      SELECT 
        u.id_usuario,
        u.id_persona,
        u.usuario,
        u.password,
        u.id_rol,
        u.estado,
        p.nombre,
        p.apellido,
        p.celular,
        r.nombre as rol_nombre
      FROM usuario u
      INNER JOIN persona p ON u.id_persona = p.id_persona
      INNER JOIN rol r ON u.id_rol = r.id_rol
      WHERE u.usuario = $1
    `;

    const result = await query(userQuery, [username]);

    if (result.rows.length === 0) {
      console.log("Usuario no encontrado");
      return {
        success: false,
        message: "Usuario no encontrado"
      };
    }

    const user = result.rows[0];
    console.log("Usuario encontrado:", user.usuario, "Rol:", user.rol_nombre);

    // 2. Verificar estado del usuario
    if (user.estado !== 'activo') {
      console.log("Usuario inactivo");
      return {
        success: false,
        message: "Usuario inactivo"
      };
    }

    // 3. Verificar contraseña
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      console.log("Contraseña incorrecta");
      return {
        success: false,
        message: "Contraseña incorrecta"
      };
    }

    console.log("Contraseña correcta");

    // 4. Obtener tiendas del usuario
    const storesQuery = `
      SELECT 
        t.id_tienda,
        t.nombre_tienda,
        t.id_negocio,
        n.nombre_negocio
      FROM usuario_tienda ut
      INNER JOIN tienda t ON ut.id_tienda = t.id_tienda
      INNER JOIN negocio n ON t.id_negocio = n.id_negocio
      WHERE ut.id_usuario = $1
    `;

    const storesResult = await query(storesQuery, [user.id_usuario]);
    console.log("Tiendas encontradas (usuario):", storesResult.rows.length);
    
    // Si es Spider Admin, obtener TODAS las tiendas
    let stores = storesResult.rows;
    if (user.rol_nombre === 'Spider Admin') {
      console.log("Es Spider Admin, obteniendo TODAS las tiendas");
      const allStoresQuery = `
        SELECT 
          t.id_tienda,
          t.nombre_tienda,
          t.id_negocio,
          n.nombre_negocio
        FROM tienda t
        INNER JOIN negocio n ON t.id_negocio = n.id_negocio
        WHERE t.estado = 'activo'
      `;
      const allStoresResult = await query(allStoresQuery);
      stores = allStoresResult.rows;
      console.log("Tiendas totales (Spider Admin):", stores.length);
    }

    // 5. Obtener permisos del usuario
    const permissionsQuery = `
      SELECT 
        p.nombre as permiso_nombre,
        up.tipo
      FROM usuario_permiso up
      INNER JOIN permiso p ON up.id_permiso = p.id_permiso
      WHERE up.id_usuario = $1
      UNION
      SELECT 
        p.nombre as permiso_nombre,
        'concedido' as tipo
      FROM rol_permiso rp
      INNER JOIN permiso p ON rp.id_permiso = p.id_permiso
      WHERE rp.id_rol = $2
    `;

    const permissionsResult = await query(permissionsQuery, [user.id_usuario, user.id_rol]);

    const grantedPermissions = permissionsResult.rows
      .filter(row => row.tipo === 'concedido')
      .map(row => row.permiso_nombre);

    const revokedPermissions = permissionsResult.rows
      .filter(row => row.tipo === 'revocado')
      .map(row => row.permiso_nombre);

    console.log("Permisos concedidos:", grantedPermissions);
    console.log("Permisos revocados:", revokedPermissions);

    // 6. Generar token JWT
    const token = jwt.sign(
      {
        id_usuario: user.id_usuario,
        id_persona: user.id_persona,
        usuario: user.usuario,
        rol: user.rol_nombre,
        id_rol: user.id_rol
      },
      process.env.JWT_SECRET || "opticavision-secret-key-2024",
      { expiresIn: "24h" }
    );

    // 7. Preparar datos del usuario para retornar
    const userData = {
      id_usuario: user.id_usuario,
      id_persona: user.id_persona,
      username: user.usuario,
      name: user.nombre,
      lastname: user.apellido,
      role: user.rol_nombre,
      id_rol: user.id_rol,
      phoneNumber: user.celular,
      status: user.estado,
      grantedPermissions: grantedPermissions,
      revokedPermissions: revokedPermissions,
      tiendaIds: stores.map(s => s.id_tienda),
      tiendaNombre: stores.length > 0 ? stores[0].nombre_tienda : null,
      negocioId: stores.length > 0 ? stores[0].id_negocio : null,
      stores: stores
    };

    console.log("Datos de usuario a retornar:");
    console.log("- tiendaIds:", userData.tiendaIds);
    console.log("- tiendaNombre:", userData.tiendaNombre);
    console.log("- stores:", userData.stores.length);

    return {
      success: true,
      message: "Autenticación exitosa",
      token,
      user: userData,
      stores: stores,
      negocioId: stores.length > 0 ? stores[0].id_negocio : null
    };

  } catch (error) {
    console.error("Error en authService:", error);
    throw new Error("Error al autenticar usuario");
  }
};

const getUserStores = async (userId) => {
  try {
    console.log("=== getUserStores ===");
    console.log("userId:", userId);
    
    const storesQuery = `
      SELECT 
        t.id_tienda,
        t.nombre_tienda,
        t.id_negocio,
        n.nombre_negocio
      FROM usuario_tienda ut
      INNER JOIN tienda t ON ut.id_tienda = t.id_tienda
      INNER JOIN negocio n ON t.id_negocio = n.id_negocio
      WHERE ut.id_usuario = $1
    `;

    const result = await query(storesQuery, [userId]);
    console.log("Tiendas encontradas:", result.rows.length);
    return result.rows;
  } catch (error) {
    console.error("Error al obtener tiendas del usuario:", error);
    return [];
  }
};

const changePassword = async (userId, currentPassword, newPassword) => {
  try {
    // 1. Obtener contraseña actual del usuario
    const userQuery = `
      SELECT password 
      FROM usuario 
      WHERE id_usuario = $1
    `;

    const result = await query(userQuery, [userId]);

    if (result.rows.length === 0) {
      return {
        success: false,
        message: "Usuario no encontrado"
      };
    }

    const user = result.rows[0];

    // 2. Verificar contraseña actual
    const isPasswordValid = await bcrypt.compare(currentPassword, user.password);

    if (!isPasswordValid) {
      return {
        success: false,
        message: "Contraseña actual incorrecta"
      };
    }

    // 3. Validar nueva contraseña
    if (newPassword.length < 6) {
      return {
        success: false,
        message: "La nueva contraseña debe tener al menos 6 caracteres"
      };
    }

    // 4. Hash de la nueva contraseña
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    // 5. Actualizar contraseña en la base de datos
    const updateQuery = `
      UPDATE usuario 
      SET password = $1 
      WHERE id_usuario = $2
    `;

    await query(updateQuery, [hashedPassword, userId]);

    return {
      success: true,
      message: "Contraseña cambiada exitosamente"
    };

  } catch (error) {
    console.error("Error al cambiar contraseña:", error);
    throw new Error("Error al cambiar contraseña");
  }
};

const getUsuarioByUsername = async (username) => {
  try {
    const userQuery = `
      SELECT 
        u.id_usuario,
        u.id_persona,
        u.usuario,
        u.password,
        u.id_rol,
        u.estado,
        p.nombre,
        p.apellido,
        p.celular,
        r.nombre as rol_nombre
      FROM usuario u
      INNER JOIN persona p ON u.id_persona = p.id_persona
      INNER JOIN rol r ON u.id_rol = r.id_rol
      WHERE u.usuario = $1
    `;

    const result = await query(userQuery, [username]);

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0];
  } catch (error) {
    console.error("Error al obtener usuario:", error);
    return null;
  }
};

module.exports = {
  authenticateUser,
  getUserStores,
  changePassword,
  getUsuarioByUsername
};