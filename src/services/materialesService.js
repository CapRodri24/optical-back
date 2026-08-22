// src/services/materialesService.js
const { query } = require("../../db");

// ============================================
// UTILIDADES
// ============================================

const getStockTotal = (stockPorTienda) => {
  if (!stockPorTienda) return 0;
  return Object.values(stockPorTienda).reduce((sum, val) => sum + val, 0);
};

const hasLowStock = (stockPorTienda, stockMinimo) => {
  if (!stockPorTienda || !stockMinimo) return false;
  for (const tiendaId of Object.keys(stockPorTienda)) {
    const stock = stockPorTienda[tiendaId] || 0;
    const minimo = stockMinimo[tiendaId] || 0;
    if (stock < minimo) {
      return true;
    }
  }
  return false;
};

// ============================================
// MATERIALES
// ============================================

const getMateriales = async (filtros) => {
  try {
    const { negocioId, searchTerm, tipo, showLowStock, tiendaId, sortKey, sortDirection } = filtros;

    console.log("🔍 getMateriales service - negocioId:", negocioId);

    const negocioIdNum = parseInt(negocioId);
    if (isNaN(negocioIdNum)) {
      console.warn("Invalid negocioId:", negocioId);
      return [];
    }

    let queryText = `
      SELECT 
        m.id_material as id,
        m.nombre_material as nombre,
        tm.nombre_tipo_material as tipo,
        m.precio_compra as "precioCompra",
        m.precio_venta as "precioVenta",
        m.codigo_material as codigo,
        COALESCE(
          (SELECT jsonb_object_agg(mt.id_tienda, mt.stock) 
           FROM material_tienda mt 
           WHERE mt.id_material = m.id_material),
          '{}'::jsonb
        ) as "stockPorTienda",
        COALESCE(
          (SELECT jsonb_object_agg(mt.id_tienda, mt.stock_minimo) 
           FROM material_tienda mt 
           WHERE mt.id_material = m.id_material),
          '{}'::jsonb
        ) as "stockMinimo"
      FROM material m
      INNER JOIN tipo_material tm ON m.id_tipo_material = tm.id_tipo_material
      WHERE m.id_negocio = $1
    `;

    const params = [negocioIdNum];
    let paramCount = 1;

    if (searchTerm) {
      paramCount++;
      queryText += ` AND (m.nombre_material ILIKE $${paramCount} OR m.codigo_material ILIKE $${paramCount})`;
      params.push(`%${searchTerm}%`);
    }

    if (tipo) {
      paramCount++;
      queryText += ` AND tm.nombre_tipo_material = $${paramCount}`;
      params.push(tipo);
    }

    if (tiendaId) {
      paramCount++;
      queryText += ` AND EXISTS (
        SELECT 1 FROM material_tienda mt 
        WHERE mt.id_material = m.id_material AND mt.id_tienda = $${paramCount}
      )`;
      params.push(tiendaId);
    }

    if (sortKey) {
      const sortMapping = {
        'nombre': 'm.nombre_material',
        'tipo': 'tm.nombre_tipo_material',
        'precioCompra': 'm.precio_compra',
        'precioVenta': 'm.precio_venta'
      };
      const sortField = sortMapping[sortKey] || 'm.nombre_material';
      const direction = sortDirection === 'desc' ? 'DESC' : 'ASC';
      queryText += ` ORDER BY ${sortField} ${direction}`;
    } else {
      queryText += ` ORDER BY m.nombre_material ASC`;
    }

    const result = await query(queryText, params);
    let materiales = result.rows || [];

    if (showLowStock) {
      materiales = materiales.filter(m => {
        const stockMinimo = m.stockMinimo || {};
        const stockPorTienda = m.stockPorTienda || {};
        return hasLowStock(stockPorTienda, stockMinimo);
      });
    }

    return materiales;
  } catch (error) {
    console.error("Error en getMateriales service:", error);
    return [];
  }
};

const getMaterialById = async (id, negocioId) => {
  try {
    console.log("🔍 getMaterialById service - id:", id, "negocioId:", negocioId);

    const materialId = parseInt(id);
    if (isNaN(materialId)) {
      console.warn("Invalid material ID:", id);
      return null;
    }

    const negocioIdNum = parseInt(negocioId);
    if (isNaN(negocioIdNum)) {
      console.warn("Invalid negocioId:", negocioId);
      return null;
    }

    const result = await query(
      `
      SELECT 
        m.id_material as id,
        m.nombre_material as nombre,
        tm.nombre_tipo_material as tipo,
        m.precio_compra as "precioCompra",
        m.precio_venta as "precioVenta",
        m.codigo_material as codigo,
        COALESCE(
          (SELECT jsonb_object_agg(mt.id_tienda, mt.stock) 
           FROM material_tienda mt 
           WHERE mt.id_material = m.id_material),
          '{}'::jsonb
        ) as "stockPorTienda",
        COALESCE(
          (SELECT jsonb_object_agg(mt.id_tienda, mt.stock_minimo) 
           FROM material_tienda mt 
           WHERE mt.id_material = m.id_material),
          '{}'::jsonb
        ) as "stockMinimo"
      FROM material m
      INNER JOIN tipo_material tm ON m.id_tipo_material = tm.id_tipo_material
      WHERE m.id_material = $1 AND m.id_negocio = $2
      `,
      [materialId, negocioIdNum]
    );

    return result.rows[0] || null;
  } catch (error) {
    console.error("Error en getMaterialById service:", error);
    return null;
  }
};

const createMaterial = async (data, negocioId) => {
  try {
    const { nombre, tipo, codigo, precioCompra, precioVenta, stockPorTienda, stockMinimoPorTienda, tiendasSeleccionadas } = data;

    console.log("🔍 createMaterial service - nombre:", nombre, "tipo:", tipo, "negocioId:", negocioId);

    const negocioIdNum = parseInt(negocioId);
    if (isNaN(negocioIdNum)) {
      throw new Error("ID de negocio inválido");
    }

    // 1. Obtener o crear el tipo de material
    let tipoMaterialResult = await query(
      'SELECT id_tipo_material FROM tipo_material WHERE nombre_tipo_material = $1',
      [tipo]
    );

    let idTipoMaterial;
    if (tipoMaterialResult.rows.length === 0) {
      const newType = await query(
        'INSERT INTO tipo_material (nombre_tipo_material, es_sistema) VALUES ($1, false) RETURNING id_tipo_material',
        [tipo]
      );
      idTipoMaterial = newType.rows[0].id_tipo_material;
    } else {
      idTipoMaterial = tipoMaterialResult.rows[0].id_tipo_material;
    }

    // 2. Crear el material
    const materialResult = await query(
      `
      INSERT INTO material (
        id_negocio, 
        nombre_material, 
        codigo_material, 
        id_tipo_material, 
        precio_compra, 
        precio_venta
      ) VALUES ($1, $2, $3, $4, $5, $6) 
      RETURNING id_material
      `,
      [negocioIdNum, nombre, codigo || null, idTipoMaterial, precioCompra || 0, precioVenta]
    );

    const idMaterial = materialResult.rows[0].id_material;

    // 3. Asignar stock a las tiendas seleccionadas
    const tiendas = tiendasSeleccionadas || Object.keys(stockPorTienda || {});
    for (const tiendaId of tiendas) {
      const stock = stockPorTienda?.[tiendaId] || 0;
      const stockMinimo = stockMinimoPorTienda?.[tiendaId] || 0;
      
      await query(
        `
        INSERT INTO material_tienda (id_material, id_tienda, stock, stock_minimo)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (id_material, id_tienda) 
        DO UPDATE SET stock = $3, stock_minimo = $4
        `,
        [idMaterial, tiendaId, stock, stockMinimo]
      );
    }

    return await getMaterialById(idMaterial, negocioId);
  } catch (error) {
    console.error("Error en createMaterial service:", error);
    throw new Error(error.message || "Error al crear el material");
  }
};

const updateMaterial = async (id, data, negocioId) => {
  try {
    const { nombre, tipo, codigo, precioCompra, precioVenta, stockPorTienda, stockMinimoPorTienda, tiendasSeleccionadas } = data;

    console.log("🔍 updateMaterial service - id:", id, "negocioId:", negocioId);

    const materialId = parseInt(id);
    if (isNaN(materialId)) {
      throw new Error("ID de material inválido");
    }

    const negocioIdNum = parseInt(negocioId);
    if (isNaN(negocioIdNum)) {
      throw new Error("ID de negocio inválido");
    }

    const existing = await getMaterialById(materialId, negocioId);
    if (!existing) {
      throw new Error("Material no encontrado");
    }

    if (tipo && tipo !== existing.tipo) {
      let tipoMaterialResult = await query(
        'SELECT id_tipo_material FROM tipo_material WHERE nombre_tipo_material = $1',
        [tipo]
      );

      let idTipoMaterial;
      if (tipoMaterialResult.rows.length === 0) {
        const newType = await query(
          'INSERT INTO tipo_material (nombre_tipo_material, es_sistema) VALUES ($1, false) RETURNING id_tipo_material',
          [tipo]
        );
        idTipoMaterial = newType.rows[0].id_tipo_material;
      } else {
        idTipoMaterial = tipoMaterialResult.rows[0].id_tipo_material;
      }

      await query(
        'UPDATE material SET id_tipo_material = $1 WHERE id_material = $2',
        [idTipoMaterial, materialId]
      );
    }

    const updates = [];
    const params = [];
    let paramCount = 1;

    if (nombre !== undefined) {
      updates.push(`nombre_material = $${paramCount}`);
      params.push(nombre);
      paramCount++;
    }

    if (codigo !== undefined) {
      updates.push(`codigo_material = $${paramCount}`);
      params.push(codigo);
      paramCount++;
    }

    if (precioCompra !== undefined) {
      updates.push(`precio_compra = $${paramCount}`);
      params.push(precioCompra);
      paramCount++;
    }

    if (precioVenta !== undefined) {
      updates.push(`precio_venta = $${paramCount}`);
      params.push(precioVenta);
      paramCount++;
    }

    if (updates.length > 0) {
      params.push(materialId);
      await query(
        `UPDATE material SET ${updates.join(', ')} WHERE id_material = $${paramCount}`,
        params
      );
    }

    if (tiendasSeleccionadas) {
      await query(
        'DELETE FROM material_tienda WHERE id_material = $1',
        [materialId]
      );

      for (const tiendaId of tiendasSeleccionadas) {
        const stock = stockPorTienda?.[tiendaId] || 0;
        const stockMinimo = stockMinimoPorTienda?.[tiendaId] || 0;
        
        await query(
          `
          INSERT INTO material_tienda (id_material, id_tienda, stock, stock_minimo)
          VALUES ($1, $2, $3, $4)
          `,
          [materialId, tiendaId, stock, stockMinimo]
        );
      }
    }

    return await getMaterialById(materialId, negocioId);
  } catch (error) {
    console.error("Error en updateMaterial service:", error);
    throw new Error(error.message || "Error al actualizar el material");
  }
};

const deleteMaterial = async (id, negocioId) => {
  try {
    console.log("🔍 deleteMaterial service - id:", id, "negocioId:", negocioId);

    const materialId = parseInt(id);
    if (isNaN(materialId)) {
      throw new Error("ID de material inválido");
    }

    const negocioIdNum = parseInt(negocioId);
    if (isNaN(negocioIdNum)) {
      throw new Error("ID de negocio inválido");
    }

    const existing = await getMaterialById(materialId, negocioId);
    if (!existing) {
      throw new Error("Material no encontrado");
    }

    await query(
      'DELETE FROM material_tienda WHERE id_material = $1',
      [materialId]
    );

    await query(
      'DELETE FROM material WHERE id_material = $1 AND id_negocio = $2',
      [materialId, negocioIdNum]
    );

    return true;
  } catch (error) {
    console.error("Error en deleteMaterial service:", error);
    throw new Error(error.message || "Error al eliminar el material");
  }
};

const addStock = async (materialId, tiendaId, cantidad, negocioId) => {
  try {
    console.log("🔍 addStock service - materialId:", materialId, "tiendaId:", tiendaId, "cantidad:", cantidad, "negocioId:", negocioId);

    const materialIdNum = parseInt(materialId);
    if (isNaN(materialIdNum)) {
      throw new Error("ID de material inválido");
    }

    const negocioIdNum = parseInt(negocioId);
    if (isNaN(negocioIdNum)) {
      throw new Error("ID de negocio inválido");
    }

    const existing = await getMaterialById(materialIdNum, negocioId);
    if (!existing) {
      throw new Error("Material no encontrado");
    }

    const tiendaResult = await query(
      'SELECT id_tienda FROM tienda WHERE id_tienda = $1 AND id_negocio = $2',
      [tiendaId, negocioIdNum]
    );
    if (tiendaResult.rows.length === 0) {
      throw new Error("Tienda no encontrada");
    }

    await query(
      `
      INSERT INTO material_tienda (id_material, id_tienda, stock, stock_minimo)
      VALUES ($1, $2, $3, (
        SELECT COALESCE(stock_minimo, 0) FROM material_tienda 
        WHERE id_material = $1 AND id_tienda = $2
      ))
      ON CONFLICT (id_material, id_tienda) 
      DO UPDATE SET stock = material_tienda.stock + $3
      `,
      [materialIdNum, tiendaId, cantidad]
    );

    return await getMaterialById(materialIdNum, negocioId);
  } catch (error) {
    console.error("Error en addStock service:", error);
    throw new Error(error.message || "Error al agregar stock");
  }
};

const transferStock = async (materialId, tiendaOrigen, tiendaDestino, cantidad, negocioId) => {
  try {
    console.log("🔍 transferStock service - materialId:", materialId, "origen:", tiendaOrigen, "destino:", tiendaDestino, "cantidad:", cantidad, "negocioId:", negocioId);

    const materialIdNum = parseInt(materialId);
    if (isNaN(materialIdNum)) {
      throw new Error("ID de material inválido");
    }

    const negocioIdNum = parseInt(negocioId);
    if (isNaN(negocioIdNum)) {
      throw new Error("ID de negocio inválido");
    }

    const existing = await getMaterialById(materialIdNum, negocioId);
    if (!existing) {
      throw new Error("Material no encontrado");
    }

    const stockOrigenResult = await query(
      'SELECT stock FROM material_tienda WHERE id_material = $1 AND id_tienda = $2',
      [materialIdNum, tiendaOrigen]
    );
    
    if (stockOrigenResult.rows.length === 0) {
      throw new Error("No hay stock en la tienda de origen");
    }

    const stockOrigen = stockOrigenResult.rows[0].stock || 0;
    if (stockOrigen < cantidad) {
      throw new Error(`Stock insuficiente. Disponible: ${stockOrigen}`);
    }

    await query(
      `
      UPDATE material_tienda 
      SET stock = stock - $1 
      WHERE id_material = $2 AND id_tienda = $3
      `,
      [cantidad, materialIdNum, tiendaOrigen]
    );

    await query(
      `
      INSERT INTO material_tienda (id_material, id_tienda, stock, stock_minimo)
      VALUES ($1, $2, $3, 0)
      ON CONFLICT (id_material, id_tienda) 
      DO UPDATE SET stock = material_tienda.stock + $3
      `,
      [materialIdNum, tiendaDestino, cantidad]
    );

    return await getMaterialById(materialIdNum, negocioId);
  } catch (error) {
    console.error("Error en transferStock service:", error);
    throw new Error(error.message || "Error al transferir stock");
  }
};

// ============================================
// TIPOS DE MATERIAL
// ============================================

const getMaterialTypes = async (negocioId) => {
  try {
    console.log("🔍 getMaterialTypes service - negocioId:", negocioId);

    const negocioIdNum = parseInt(negocioId);
    if (isNaN(negocioIdNum)) {
      console.warn("Invalid negocioId:", negocioId);
      return [];
    }

    const result = await query(
      'SELECT nombre_tipo_material as nombre FROM tipo_material ORDER BY nombre_tipo_material'
    );
    return result.rows.map(r => r.nombre);
  } catch (error) {
    console.error("Error en getMaterialTypes service:", error);
    return [];
  }
};

const createMaterialType = async (nombre, negocioId) => {
  try {
    console.log("🔍 createMaterialType service - nombre:", nombre, "negocioId:", negocioId);

    const negocioIdNum = parseInt(negocioId);
    if (isNaN(negocioIdNum)) {
      throw new Error("ID de negocio inválido");
    }

    const existing = await query(
      'SELECT id_tipo_material FROM tipo_material WHERE nombre_tipo_material = $1',
      [nombre]
    );

    if (existing.rows.length > 0) {
      throw new Error("Este tipo ya existe");
    }

    await query(
      'INSERT INTO tipo_material (nombre_tipo_material, es_sistema) VALUES ($1, false)',
      [nombre]
    );

    return await getMaterialTypes(negocioId);
  } catch (error) {
    console.error("Error en createMaterialType service:", error);
    throw new Error(error.message || "Error al crear el tipo");
  }
};

const updateMaterialType = async (oldName, newName, negocioId) => {
  try {
    console.log("🔍 updateMaterialType service - oldName:", oldName, "newName:", newName, "negocioId:", negocioId);

    const negocioIdNum = parseInt(negocioId);
    if (isNaN(negocioIdNum)) {
      throw new Error("ID de negocio inválido");
    }

    const existing = await query(
      'SELECT id_tipo_material FROM tipo_material WHERE nombre_tipo_material = $1',
      [oldName]
    );

    if (existing.rows.length === 0) {
      throw new Error("Tipo no encontrado");
    }

    if (oldName !== newName) {
      const duplicate = await query(
        'SELECT id_tipo_material FROM tipo_material WHERE nombre_tipo_material = $1',
        [newName]
      );

      if (duplicate.rows.length > 0) {
        throw new Error("Ya existe un tipo con ese nombre");
      }
    }

    await query(
      'UPDATE tipo_material SET nombre_tipo_material = $1 WHERE nombre_tipo_material = $2',
      [newName, oldName]
    );

    return await getMaterialTypes(negocioId);
  } catch (error) {
    console.error("Error en updateMaterialType service:", error);
    throw new Error(error.message || "Error al actualizar el tipo");
  }
};

const deleteMaterialType = async (nombre, negocioId) => {
  try {
    console.log("🔍 deleteMaterialType service - nombre:", nombre, "negocioId:", negocioId);

    const negocioIdNum = parseInt(negocioId);
    if (isNaN(negocioIdNum)) {
      throw new Error("ID de negocio inválido");
    }

    const existing = await query(
      'SELECT id_tipo_material FROM tipo_material WHERE nombre_tipo_material = $1',
      [nombre]
    );

    if (existing.rows.length === 0) {
      throw new Error("Tipo no encontrado");
    }

    const materialsUsing = await query(
      'SELECT COUNT(*) as count FROM material WHERE id_tipo_material = $1 AND id_negocio = $2',
      [existing.rows[0].id_tipo_material, negocioIdNum]
    );

    if (parseInt(materialsUsing.rows[0].count) > 0) {
      throw new Error("No se puede eliminar el tipo porque hay materiales que lo usan");
    }

    await query(
      'DELETE FROM tipo_material WHERE id_tipo_material = $1',
      [existing.rows[0].id_tipo_material]
    );

    return await getMaterialTypes(negocioId);
  } catch (error) {
    console.error("Error en deleteMaterialType service:", error);
    throw new Error(error.message || "Error al eliminar el tipo");
  }
};

// ============================================
// ESTADÍSTICAS Y ALERTAS
// ============================================

const getMaterialStats = async (negocioId) => {
  try {
    console.log("🔍 getMaterialStats service - negocioId:", negocioId);

    const negocioIdNum = parseInt(negocioId);
    if (isNaN(negocioIdNum)) {
      console.warn("Invalid negocioId:", negocioId);
      return {
        totalMateriales: 0,
        totalMonturas: 0,
        totalStock: 0,
        lowStockCount: 0,
        tiposCount: {}
      };
    }

    const totalMateriales = await query(
      'SELECT COUNT(*) as total FROM material WHERE id_negocio = $1',
      [negocioIdNum]
    );

    const totalMonturas = await query(
      `
      SELECT COUNT(*) as total 
      FROM material m
      INNER JOIN tipo_material tm ON m.id_tipo_material = tm.id_tipo_material
      WHERE m.id_negocio = $1 AND tm.nombre_tipo_material = 'Montura'
      `,
      [negocioIdNum]
    );

    const totalStock = await query(
      'SELECT COALESCE(SUM(stock), 0) as total FROM material_tienda mt INNER JOIN material m ON mt.id_material = m.id_material WHERE m.id_negocio = $1',
      [negocioIdNum]
    );

    const lowStock = await query(
      `
      SELECT COUNT(DISTINCT mt.id_material) as total
      FROM material_tienda mt
      INNER JOIN material m ON mt.id_material = m.id_material
      WHERE m.id_negocio = $1 AND mt.stock < mt.stock_minimo
      `,
      [negocioIdNum]
    );

    const tiposCount = await query(
      `
      SELECT tm.nombre_tipo_material as tipo, COUNT(*) as count
      FROM material m
      INNER JOIN tipo_material tm ON m.id_tipo_material = tm.id_tipo_material
      WHERE m.id_negocio = $1
      GROUP BY tm.nombre_tipo_material
      `,
      [negocioIdNum]
    );

    const tiposCountObj = {};
    tiposCount.rows.forEach(r => {
      tiposCountObj[r.tipo] = parseInt(r.count);
    });

    return {
      totalMateriales: parseInt(totalMateriales.rows[0].total) || 0,
      totalMonturas: parseInt(totalMonturas.rows[0].total) || 0,
      totalStock: parseInt(totalStock.rows[0].total) || 0,
      lowStockCount: parseInt(lowStock.rows[0].total) || 0,
      tiposCount: tiposCountObj
    };
  } catch (error) {
    console.error("Error en getMaterialStats service:", error);
    return {
      totalMateriales: 0,
      totalMonturas: 0,
      totalStock: 0,
      lowStockCount: 0,
      tiposCount: {}
    };
  }
};

const getLowStockAlerts = async (negocioId) => {
  try {
    console.log("🔍 getLowStockAlerts service - negocioId:", negocioId);

    const negocioIdNum = parseInt(negocioId);
    if (isNaN(negocioIdNum)) {
      console.warn("Invalid negocioId:", negocioId);
      return [];
    }

    const result = await query(
      `
      SELECT 
        m.id_material as "materialId",
        m.nombre_material as nombre,
        tm.nombre_tipo_material as tipo,
        mt.id_tienda as "tiendaId",
        t.nombre_tienda as "tiendaNombre",
        mt.stock as "stockActual",
        mt.stock_minimo as "stockMinimo"
      FROM material_tienda mt
      INNER JOIN material m ON mt.id_material = m.id_material
      INNER JOIN tipo_material tm ON m.id_tipo_material = tm.id_tipo_material
      INNER JOIN tienda t ON mt.id_tienda = t.id_tienda
      WHERE m.id_negocio = $1 AND mt.stock < mt.stock_minimo
      ORDER BY m.nombre_material, t.nombre_tienda
      `,
      [negocioIdNum]
    );

    return result.rows || [];
  } catch (error) {
    console.error("Error en getLowStockAlerts service:", error);
    return [];
  }
};

// ============================================
// TIENDAS
// ============================================

const getTiendas = async (negocioId) => {
  try {
    console.log("🔍 getTiendas service - negocioId:", negocioId);

    const negocioIdNum = parseInt(negocioId);
    if (isNaN(negocioIdNum)) {
      console.warn("⚠️ Invalid negocioId:", negocioId);
      return [];
    }
    
    const result = await query(
      'SELECT id_tienda as id, nombre_tienda as nombre FROM tienda WHERE id_negocio = $1 AND estado = $2 ORDER BY nombre_tienda',
      [negocioIdNum, 'activo']
    );
    
    console.log("✅ Tiendas encontradas:", result.rows.length);
    return result.rows || [];
  } catch (error) {
    console.error("Error en getTiendas service:", error);
    return [];
  }
};

module.exports = {
  getMateriales,
  getMaterialById,
  createMaterial,
  updateMaterial,
  deleteMaterial,
  addStock,
  transferStock,
  getMaterialTypes,
  createMaterialType,
  updateMaterialType,
  deleteMaterialType,
  getMaterialStats,
  getLowStockAlerts,
  getTiendas
};