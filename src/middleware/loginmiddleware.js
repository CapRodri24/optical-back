// src/middleware/loginmiddleware.js
const jwt = require("jsonwebtoken");
const db = require("../../db");

const authenticate = async (req, res, next) => {
  try {
    // 1. Obtener el token del header Authorization
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        success: false,
        message: "Authorization header is missing",
      });
    }

    // 2. Verificar formato del header
    const tokenParts = authHeader.split(" ");
    if (tokenParts.length !== 2 || tokenParts[0] !== "Bearer") {
      return res.status(401).json({
        success: false,
        message: "Authorization header format should be: Bearer <token>",
      });
    }

    const token = tokenParts[1];

    // 3. Verificar que el token no esté vacío
    if (!token || token === "null" || token === "undefined") {
      return res.status(401).json({
        success: false,
        message: "Authentication token is missing",
      });
    }

    // 4. Verificar y decodificar el token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "opticavision-secret-key-2024");

    console.log("=== [Middleware] Token decodificado ===");
    console.log("decoded:", decoded);

    // 5. Obtener el ID del usuario (puede estar en diferentes campos)
    const userId = decoded.id_usuario || decoded.userId || decoded.id;
    
    if (!userId) {
      console.log("Token inválido: no tiene id_usuario");
      return res.status(401).json({
        success: false,
        message: "Invalid token payload",
      });
    }

    // 6. Buscar el usuario en la base de datos
    const userQuery = `
      SELECT 
        u.id_usuario,
        u.id_persona,
        u.usuario,
        u.id_rol,
        u.estado,
        p.nombre,
        p.apellido,
        p.celular,
        r.nombre as rol_nombre
      FROM usuario u
      INNER JOIN persona p ON u.id_persona = p.id_persona
      INNER JOIN rol r ON u.id_rol = r.id_rol
      WHERE u.id_usuario = $1 AND u.estado = 'activo'
    `;
    
    const userResult = await db.query(userQuery, [userId]);
    
    console.log("Usuario encontrado:", userResult.rows.length > 0 ? userResult.rows[0].usuario : "No encontrado");
    
    if (userResult.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: "User not found or inactive",
      });
    }

    const user = userResult.rows[0];

    // 7. Obtener las tiendas del usuario
    const storesQuery = `
      SELECT 
        t.id_tienda,
        t.nombre_tienda,
        t.id_negocio,
        n.nombre_negocio,
        t.estado
      FROM usuario_tienda ut
      INNER JOIN tienda t ON ut.id_tienda = t.id_tienda
      INNER JOIN negocio n ON t.id_negocio = n.id_negocio
      WHERE ut.id_usuario = $1
      AND t.estado = 'activo'
    `;
    
    const storesResult = await db.query(storesQuery, [userId]);
    
    // 8. Obtener el negocioId y tiendaId del token o de la primera tienda
    let negocioId = decoded.negocioId || decoded.id_negocio || null;
    let tiendaId = decoded.tiendaId || decoded.id_tienda || null;
    
    // Si no hay negocioId en el token, usar el de la primera tienda
    if (!negocioId && storesResult.rows.length > 0) {
      negocioId = storesResult.rows[0].id_negocio;
    }
    
    // Si no hay tiendaId en el token, usar la primera tienda
    if (!tiendaId && storesResult.rows.length > 0) {
      tiendaId = storesResult.rows[0].id_tienda;
    }

    // 9. Adjuntar toda la información del usuario al request
    req.user = {
      id_usuario: user.id_usuario,
      id_persona: user.id_persona,
      usuario: user.usuario,
      nombre: user.nombre,
      apellido: user.apellido,
      celular: user.celular,
      id_rol: user.id_rol,
      rol_nombre: user.rol_nombre,
      estado: user.estado,
      // Información adicional del token
      negocioId: negocioId ? negocioId.toString() : null,
      tiendaId: tiendaId ? tiendaId.toString() : 'todas',
      stores: storesResult.rows,
      // Mantener compatibilidad con el controller
      tiendaSeleccionada: tiendaId ? tiendaId.toString() : 'todas',
    };

    console.log("=== [Middleware] Usuario autenticado ===");
    console.log("usuario:", req.user.usuario);
    console.log("negocioId:", req.user.negocioId);
    console.log("tiendaId:", req.user.tiendaId);
    console.log("rol:", req.user.rol_nombre);

    next();
  } catch (error) {
    console.error("Authentication error:", error);

    let errorMessage = "Authentication failed";
    if (error.name === "TokenExpiredError") {
      errorMessage = "Token expired";
    } else if (error.name === "JsonWebTokenError") {
      errorMessage = "Invalid token format";
    }

    return res.status(401).json({
      success: false,
      message: errorMessage,
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

const authorize = (requiredRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "User not authenticated",
      });
    }

    if (!requiredRoles.includes(req.user.rol_nombre)) {
      return res.status(403).json({
        success: false,
        message: "Insufficient permissions",
      });
    }

    next();
  };
};

module.exports = {
  authenticate,
  authorize,
};