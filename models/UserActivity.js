const mongoose = require("mongoose");
const { Schema } = mongoose;

const userActivitySchema = new Schema(
    {
        user: { type: Schema.Types.ObjectId, ref: "User" },
        action: { type: String, required: true },
        details: { type: String }
    },
    { timestamps: { createdAt: "created_at", updatedAt: false } }
);

module.exports = mongoose.model("UserActivity", userActivitySchema);
