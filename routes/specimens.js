const express = require("express");
const { body, validationResult } = require("express-validator");
const Specimen = require("../models/Specimen");
const Batch = require("../models/Batch");
const UserActivity = require("../models/UserActivity");

const router = express.Router();

const specimenValidation = [
    body("orden").trim().isLength({ min: 1, max: 50 }),
    body("fecha").isISO8601(),
    body("orientacion").optional().trim().isLength({ max: 100 }),
    body("descripcion").optional().trim().isLength({ max: 500 }),
    body("ensayo").optional().trim().isLength({ max: 100 }),
    body("tipoFibra").optional().trim().isLength({ max: 200 }),
    body("fuerzaMaxima").optional().isNumeric(),
    body("moduloElasticidad").optional().isNumeric(),
    body("tipoResina").optional().trim().isLength({ max: 200 }),
    body("curadoTempHum").optional().trim().isLength({ max: 200 })
];

// GET /api/specimens
router.get("/", async (req, res) => {
    const {
        search,
        batch_id,
        ensayo,
        tipo_fibra,
        limit = 50,
        offset = 0,
        sort_by = "fecha",
        sort_order = "DESC"
    } = req.query;

    const q = {};
    if (batch_id) q.batch = batch_id;
    if (ensayo) q.ensayo = new RegExp(ensayo, "i");
    if (tipo_fibra) q.tipo_fibra = new RegExp(tipo_fibra, "i");

    if (search) {
        q.$or = [
            { orden: new RegExp(search, "i") },
            { descripcion: new RegExp(search, "i") },
            { ensayo: new RegExp(search, "i") },
            { tipo_fibra: new RegExp(search, "i") },
            { tipo_resina: new RegExp(search, "i") }
        ];
    }

    const allowedSortFields = ["fecha", "orden", "ensayo", "fuerza_maxima", "modulo_elasticidad"];
    const sortField = allowedSortFields.includes(String(sort_by)) ? String(sort_by) : "fecha";
    const sortOrder = String(sort_order).toUpperCase() === "ASC" ? 1 : -1;

    const [rows, total] = await Promise.all([
        Specimen.find(q)
            .populate({ path: "batch", select: "name" })
            .sort({ [sortField]: sortOrder })
            .skip(parseInt(offset))
            .limit(parseInt(limit)),
        Specimen.countDocuments(q)
    ]);

    const data = rows.map(r => ({
        ...r.toObject(),
        batch_name: r.batch?.name
    }));

    res.json({
        success: true,
        data,
        pagination: {
            total,
            limit: parseInt(limit),
            offset: parseInt(offset),
            pages: Math.ceil(total / parseInt(limit))
        }
    });
});

// GET /api/specimens/:id
router.get("/:id", async (req, res) => {
    const s = await Specimen.findById(req.params.id).populate({ path: "batch", select: "name description" });
    if (!s) return res.status(404).json({ error: "Probeta no encontrada", message: "No existe" });

    res.json({
        success: true,
        data: {
            ...s.toObject(),
            batch_name: s.batch?.name,
            batch_description: s.batch?.description
        }
    });
});

// POST /api/specimens
router.post("/", specimenValidation, async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: "Datos inválidos", details: errors.array() });

    const {
        batch_id,
        orden,
        fecha,
        orientacion,
        descripcion,
        ensayo,
        tipoFibra,
        fuerzaMaxima,
        moduloElasticidad,
        tipoResina,
        curadoTempHum
    } = req.body;

    const userId = req.user.id;

    const batch = await Batch.findById(batch_id);
    if (!batch) return res.status(404).json({ error: "Lote no encontrado", message: "No existe" });

    // Respetar unicidad (índice compuesto lo reforzará)
    const dup = await Specimen.exists({ batch: batch_id, orden });
    if (dup) return res.status(409).json({ error: "Orden duplicado", message: "Ya existe en este lote" });

    const created = await Specimen.create({
        batch: batch_id,
        orden,
        fecha,
        orientacion,
        descripcion,
        ensayo,
        tipo_fibra: tipoFibra,
        fuerza_maxima: fuerzaMaxima,
        modulo_elasticidad: moduloElasticidad,
        tipo_resina: tipoResina,
        curado_temp_hum: curadoTempHum,
        created_by: userId
    });

    await UserActivity.create({
        user: userId,
        action: "create_specimen",
        details: `Probeta "${orden}" creada en lote ${batch_id}`
    });

    res.status(201).json({ success: true, message: "Probeta creada exitosamente", data: created });
});

// PUT /api/specimens/:id
router.put("/:id", specimenValidation, async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: "Datos inválidos", details: errors.array() });

    const s = await Specimen.findById(req.params.id);
    if (!s) return res.status(404).json({ error: "Probeta no encontrada", message: "No existe" });

    const { orden } = req.body;
    if (orden && orden !== s.orden) {
        const dup = await Specimen.exists({ batch: s.batch, orden });
        if (dup) return res.status(409).json({ error: "Orden duplicado", message: "Ya existe en este lote" });
    }

    const assignMap = {
        orden: "orden",
        fecha: "fecha",
        orientacion: "orientacion",
        descripcion: "descripcion",
        ensayo: "ensayo",
        tipoFibra: "tipo_fibra",
        fuerzaMaxima: "fuerza_maxima",
        moduloElasticidad: "modulo_elasticidad",
        tipoResina: "tipo_resina",
        curadoTempHum: "curado_temp_hum"
    };
    for (const [k, v] of Object.entries(assignMap)) {
        if (req.body[k] !== undefined) s[v] = req.body[k];
    }
    await s.save();

    await UserActivity.create({
        user: req.user.id,
        action: "update_specimen",
        details: `Probeta "${s.orden}" actualizada`
    });

    res.json({ success: true, message: "Probeta actualizada exitosamente", data: s });
});

// DELETE /api/specimens/:id
router.delete("/:id", async (req, res) => {
    const s = await Specimen.findById(req.params.id);
    if (!s) return res.status(404).json({ error: "Probeta no encontrada", message: "No existe" });

    const orden = s.orden;
    await s.deleteOne();

    await UserActivity.create({
        user: req.user.id,
        action: "delete_specimen",
        details: `Probeta "${orden}" eliminada`
    });

    res.json({ success: true, message: "Probeta eliminada exitosamente" });
});

module.exports = router;
