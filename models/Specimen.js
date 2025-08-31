const mongoose = require("mongoose");
const { Schema } = mongoose;

const specimenSchema = new Schema(
    {
        batch: { type: Schema.Types.ObjectId, ref: "Batch", required: true, index: true },
        orden: { type: String, required: true, trim: true },
        fecha: { type: Date, required: true },
        orientacion: { type: String },
        descripcion: { type: String },
        ensayo: { type: String, index: true },
        tipo_fibra: { type: String, index: true },
        fuerza_maxima: { type: Number },
        modulo_elasticidad: { type: Number },
        tipo_resina: { type: String },
        curado_temp_hum: { type: String },
        created_by: { type: Schema.Types.ObjectId, ref: "User" }
    },
    { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } }
);

// Unicidad de orden dentro del mismo lote
specimenSchema.index({ batch: 1, orden: 1 }, { unique: true });

module.exports = mongoose.model("Specimen", specimenSchema);
