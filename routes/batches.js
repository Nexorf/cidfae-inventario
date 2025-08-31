const express = require("express");
const { body, validationResult } = require("express-validator");
const Batch = require("../models/Batch");
const Specimen = require("../models/Specimen");
const UserActivity = require("../models/UserActivity");

const router = express.Router();

const batchValidation = [
    body("name").trim().isLength({ min: 3, max: 255 }),
    body("date").isISO8601(),
    body("description").optional().trim().isLength({ max: 1000 })
];

// GET /api/batches
router.get("/", async (_req, res) => {
    const batches = await Batch.aggregate([
        {
            $lookup: { from: "specimens", localField: "_id", foreignField: "batch", as: "specimens" }
        },
        {
            $addFields: { specimen_count: { $size: "$specimens" } }
        },
        { $project: { specimens: 0 } },
        { $sort: { created_at: -1 } }
    ]);

    res.json({ success: true, data: batches, count: batches.length });
});

// GET /api/batches/:id
router.get("/:id", async (req, res) => {
    const batch = await Batch.findById(req.params.id);
    if (!batch) return res.status(404).json({ error: "Lote no encontrado", message: "No existe" });

    const specimens = await Specimen.find({ batch: batch._id }).sort({ orden: 1 });
    res.json({ success: true, data: { ...batch.toObject(), specimens } });
});

// POST /api/batches
router.post("/", batchValidation, async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: "Datos inválidos", details: errors.array() });

    const { name, date, description, specimens = [] } = req.body;
    const userId = req.user.id;

    const batch = await Batch.create({ name, date, description, created_by: userId });

    if (Array.isArray(specimens) && specimens.length) {
        const docs = specimens.map(s => ({
            batch: batch._id,
            orden: s.orden,
            fecha: s.fecha,
            orientacion: s.orientacion,
            descripcion: s.descripcion,
            ensayo: s.ensayo,
            tipo_fibra: s.tipoFibra,
            fuerza_maxima: s.fuerzaMaxima,
            modulo_elasticidad: s.moduloElasticidad,
            tipo_resina: s.tipoResina,
            curado_temp_hum: s.curadoTempHum,
            created_by: userId
        }));
        await Specimen.insertMany(docs, { ordered: false }).catch(() => {}); // ignora duplicados por índice
    }

    await UserActivity.create({
        user: userId,
        action: "create_batch",
        details: `Lote "${name}" creado con ${specimens.length} probetas`
    });

    res.status(201).json({
        success: true,
        message: "Lote creado exitosamente",
        data: { id: batch._id, name, date, description }
    });
});

// PUT /api/batches/:id
router.put("/:id", batchValidation, async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: "Datos inválidos", details: errors.array() });

    const { name, date, description, specimens } = req.body;
    const userId = req.user.id;

    const batch = await Batch.findById(req.params.id);
    if (!batch) return res.status(404).json({ error: "Lote no encontrado", message: "No existe" });

    batch.name = name;
    batch.date = date;
    batch.description = description;
    await batch.save();

    if (Array.isArray(specimens)) {
        await Specimen.deleteMany({ batch: batch._id });
        const docs = specimens.map(s => ({
            batch: batch._id,
            orden: s.orden,
            fecha: s.fecha,
            orientacion: s.orientacion,
            descripcion: s.descripcion,
            ensayo: s.ensayo,
            tipo_fibra: s.tipoFibra,
            fuerza_maxima: s.fuerzaMaxima,
            modulo_elasticidad: s.moduloElasticidad,
            tipo_resina: s.tipoResina,
            curado_temp_hum: s.curadoTempHum,
            created_by: userId
        }));
        if (docs.length) await Specimen.insertMany(docs, { ordered: false }).catch(() => {});
    }

    await UserActivity.create({ user: userId, action: "update_batch", details: `Lote "${name}" actualizado` });

    res.json({ success: true, message: "Lote actualizado exitosamente" });
});

// DELETE /api/batches/:id
router.delete("/:id", async (req, res) => {
    const userId = req.user.id;

    const batch = await Batch.findById(req.params.id);
    if (!batch) return res.status(404).json({ error: "Lote no encontrado", message: "No existe" });

    await Specimen.deleteMany({ batch: batch._id });
    await batch.deleteOne();

    await UserActivity.create({ user: userId, action: "delete_batch", details: `Lote "${batch.name}" eliminado` });

    res.json({ success: true, message: "Lote eliminado exitosamente" });
});

module.exports = router;
