const mongoose = require("mongoose");
const { Schema } = mongoose;

const batchSchema = new Schema(
    {
        name: { type: String, required: true, trim: true },
        date: { type: Date, required: true },
        description: { type: String },
        created_by: { type: Schema.Types.ObjectId, ref: "User" }
    },
    { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } }
);

module.exports = mongoose.model("Batch", batchSchema);
