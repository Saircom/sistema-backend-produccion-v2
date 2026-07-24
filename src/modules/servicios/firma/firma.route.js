import express from "express";
import * as FirmaController from "./firma.controller.js";

const router = express.Router();

// Crear o actualizar mediante "Upsert" (POST)
router.post("/", FirmaController.save);

// Obtener la firma de un servicio (GET)
router.get("/:id_servicio", FirmaController.getByServicio);

// Actualizar la firma de un servicio existente (PUT)
router.put("/:id_servicio", FirmaController.update);

export default router;