const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });
const { connectMongo } = require("../config/database");
const bcrypt = require("bcryptjs");

const User = require("../models/User");

const SALT_ROUNDS = 12;

async function seedUsers() {
    const adminPass = process.env.SEED_ADMIN_PASSWORD;

    const [adminHash] = await Promise.all([
        bcrypt.hash(adminPass, SALT_ROUNDS),
    ]);

    const admin = await User.findOneAndUpdate(
        { username: "admin@cidfae.com.ec" },
        {
            username: "admin@cidfae.com.ec",
            full_name: "Administrador",
            email: "admin@cidfae.com.ec",
            role: "admin",
            password: adminHash,
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return { admin };
}


async function run() {
    await connectMongo();
    console.log("🔌 Conectado a MongoDB");

    console.log("👤 Creando usuarios...");
    await seedUsers();

    console.log("✅ Seed completado.");
    console.table([
        { entidad: "Users", total: await User.estimatedDocumentCount() },
    ]);
    console.log("\nℹ️  Credenciales:");
    process.exit(0);
}

run().catch((err) => {
    console.error("❌ Error en seed:", err);
    process.exit(1);
});
