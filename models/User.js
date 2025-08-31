const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
    {
        username: { type: String, unique: true, required: true, trim: true, minlength: 3 },
        password: { type: String, required: true },
        email: { type: String, unique: true, required: true, lowercase: true, trim: true },
        full_name: { type: String, required: true, trim: true },
        role: { type: String, enum: ["admin", "user"], default: "user" }
    },
    { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } }
);

module.exports = mongoose.model("User", userSchema);
