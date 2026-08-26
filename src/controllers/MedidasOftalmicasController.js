// src/controllers/MedidasOftalmicasController.js
const medidasOftalmicasService = require("../services/MedidasOftalmicasService");

/**
 * Obtener las medidas oftálmicas de un cliente
 */
const getMedidas = async (req, res) => {
  try {
    const { clientId } = req.params;

    console.log("=== Get Medidas Oftálmicas ===");
    console.log("clientId:", clientId);

    if (!clientId) {
      return res.status(400).json({
        success: false,
        message: "El ID del cliente es requerido"
      });
    }

    const result = await medidasOftalmicasService.getMedidas(clientId);

    // ✅ Cambio: Si no hay medidas, devolver 200 con data: null en lugar de 404
    if (!result) {
      return res.json({
        success: true,
        data: null,
        message: "El cliente no tiene medidas registradas"
      });
    }

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error("Error en getMedidas controller:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Error al obtener las medidas"
    });
  }
};

/**
 * Guardar o actualizar las medidas oftálmicas de un cliente
 */
const saveMedidas = async (req, res) => {
  try {
    const { 
      clientId, 
      lejosDerecho, 
      lejosIzquierdo, 
      cercaDerecho, 
      cercaIzquierdo, 
      dip, 
      add 
    } = req.body;

    console.log("=== Save Medidas Oftálmicas ===");
    console.log("clientId:", clientId);

    if (!clientId) {
      return res.status(400).json({
        success: false,
        message: "El ID del cliente es requerido"
      });
    }

    const result = await medidasOftalmicasService.saveMedidas({
      clientId,
      lejosDerecho,
      lejosIzquierdo,
      cercaDerecho,
      cercaIzquierdo,
      dip,
      add
    });

    res.json({
      success: true,
      message: "Medidas guardadas exitosamente",
      data: result
    });

  } catch (error) {
    console.error("Error en saveMedidas controller:", error);
    res.status(400).json({
      success: false,
      message: error.message || "Error al guardar las medidas"
    });
  }
};

/**
 * Eliminar las medidas oftálmicas de un cliente
 */
const deleteMedidas = async (req, res) => {
  try {
    const { clientId } = req.params;

    console.log("=== Delete Medidas Oftálmicas ===");
    console.log("clientId:", clientId);

    if (!clientId) {
      return res.status(400).json({
        success: false,
        message: "El ID del cliente es requerido"
      });
    }

    await medidasOftalmicasService.deleteMedidas(clientId);

    res.json({
      success: true,
      message: "Medidas eliminadas exitosamente"
    });

  } catch (error) {
    console.error("Error en deleteMedidas controller:", error);
    res.status(400).json({
      success: false,
      message: error.message || "Error al eliminar las medidas"
    });
  }
};

module.exports = {
  getMedidas,
  saveMedidas,
  deleteMedidas
};