// src/routes/organicoRoutes.js
const express = require("express");
const router = express.Router();
const organicoController = require("../controllers/organicoController");
const { authenticate } = require("../middleware/loginmiddleware");

router.get("/", authenticate, organicoController.getOrganicos);
router.post("/", authenticate, organicoController.createOrganico);
router.put("/:id", authenticate, organicoController.updateOrganico);
router.delete("/:id", authenticate, organicoController.deleteOrganico);

module.exports = router;