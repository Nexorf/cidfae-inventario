const express = require("express");
const Specimen = require("../models/Specimen");
const Batch = require("../models/Batch");
const User = require("../models/User");
const UserActivity = require("../models/UserActivity");

const router = express.Router();

// /api/dashboard/stats
router.get("/stats", async (_req, res) => {
    const [total_specimens, total_batches, total_users, recent_tests] = await Promise.all([
        Specimen.estimatedDocumentCount(),
        Batch.estimatedDocumentCount(),
        User.estimatedDocumentCount(),
        Specimen.countDocuments({ fecha: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } })
    ]);

    const ensayos = await Specimen.aggregate([
        { $match: { ensayo: { $nin: [null, ""] } } },
        {
            $group: {
                _id: "$ensayo",
                count: { $sum: 1 },
                avg_fuerza_maxima: { $avg: "$fuerza_maxima" },
                avg_modulo_elasticidad: { $avg: "$modulo_elasticidad" }
            }
        },
        { $sort: { count: -1 } }
    ]);

    const fibras = await Specimen.aggregate([
        { $match: { tipo_fibra: { $nin: [null, ""] } } },
        { $group: { _id: "$tipo_fibra", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 }
    ]);

    const recentSpecimens = await Specimen.find().sort({ created_at: -1 }).limit(5).populate("batch", "name");
    const recentBatches = await Batch.aggregate([
        {
            $lookup: { from: "specimens", localField: "_id", foreignField: "batch", as: "specimens" }
        },
        { $addFields: { specimen_count: { $size: "$specimens" } } },
        { $project: { specimens: 0 } },
        { $sort: { created_at: -1 } },
        { $limit: 5 }
    ]);

    res.json({
        success: true,
        data: {
            general: {
                totalSpecimens: total_specimens,
                totalBatches: total_batches,
                recentTests: recent_tests,
                totalUsers: total_users
            },
            ensayos: ensayos.map(e => ({
                ensayo: e._id,
                count: e.count,
                avg_fuerza_maxima: e.avg_fuerza_maxima,
                avg_modulo_elasticidad: e.avg_modulo_elasticidad
            })),
            fibras: fibras.map(f => ({ tipo_fibra: f._id, count: f.count })),
            recentSpecimens: recentSpecimens.map(s => ({
                ...s.toObject(),
                batch_name: s.batch?.name
            })),
            recentBatches
        }
    });
});

// /api/dashboard/activity
router.get("/activity", async (req, res) => {
    const limit = parseInt(req.query.limit || "20");
    const data = await UserActivity.find().sort({ created_at: -1 }).limit(limit).populate("user", "username full_name");
    res.json({ success: true, data });
});

// /api/dashboard/charts
router.get("/charts", async (_req, res) => {
    const specimensByMonth = await Specimen.aggregate([
        { $match: { fecha: { $gte: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000) } } },
        { $group: { _id: { $dateToString: { format: "%Y-%m-01", date: "$fecha" } }, count: { $sum: 1 } } },
        { $sort: { _id: 1 } }
    ]);

    const batchesByMonth = await Batch.aggregate([
        { $match: { created_at: { $gte: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000) } } },
        { $group: { _id: { $dateToString: { format: "%Y-%m-01", date: "$created_at" } }, count: { $sum: 1 } } },
        { $sort: { _id: 1 } }
    ]);

    const fuerzaByEnsayo = await Specimen.aggregate([
        { $match: { fuerza_maxima: { $ne: null }, ensayo: { $ne: null } } },
        {
            $group: {
                _id: "$ensayo",
                avg_fuerza: { $avg: "$fuerza_maxima" },
                min_fuerza: { $min: "$fuerza_maxima" },
                max_fuerza: { $max: "$fuerza_maxima" }
            }
        },
        { $sort: { avg_fuerza: -1 } }
    ]);

    const moduloByEnsayo = await Specimen.aggregate([
        { $match: { modulo_elasticidad: { $ne: null }, ensayo: { $ne: null } } },
        {
            $group: {
                _id: "$ensayo",
                avg_modulo: { $avg: "$modulo_elasticidad" },
                min_modulo: { $min: "$modulo_elasticidad" },
                max_modulo: { $max: "$modulo_elasticidad" }
            }
        },
        { $sort: { avg_modulo: -1 } }
    ]);

    res.json({
        success: true,
        data: {
            specimensByMonth,
            batchesByMonth,
            fuerzaByEnsayo,
            moduloByEnsayo
        }
    });
});

// /api/dashboard/reports
router.get("/reports", async (req, res) => {
    const { start_date, end_date, batch_id } = req.query;
    const q = {};
    if (start_date) q.fecha = { ...(q.fecha || {}), $gte: new Date(start_date) };
    if (end_date) q.fecha = { ...(q.fecha || {}), $lte: new Date(end_date) };
    if (batch_id) q.batch = batch_id;

    const specimens = await Specimen.find(q).populate("batch", "name").sort({ fecha: -1 });

    const statsAgg = await Specimen.aggregate([
        { $match: q },
        {
            $group: {
                _id: null,
                total_specimens: { $sum: 1 },
                total_batches: { $addToSet: "$batch" },
                unique_ensayos: { $addToSet: "$ensayo" },
                avg_fuerza_maxima: { $avg: "$fuerza_maxima" },
                avg_modulo_elasticidad: { $avg: "$modulo_elasticidad" }
            }
        },
        {
            $project: {
                _id: 0,
                total_specimens: 1,
                total_batches: { $size: "$total_batches" },
                unique_ensayos: { $size: "$unique_ensayos" },
                avg_fuerza_maxima: 1,
                avg_modulo_elasticidad: 1
            }
        }
    ]);

    res.json({
        success: true,
        data: {
            specimens: specimens.map(s => ({ ...s.toObject(), batch_name: s.batch?.name })),
            stats: statsAgg[0] || {
                total_specimens: 0,
                total_batches: 0,
                unique_ensayos: 0,
                avg_fuerza_maxima: null,
                avg_modulo_elasticidad: null
            }
        }
    });
});

module.exports = router;
