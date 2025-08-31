// scripts/seedMongo.js
require("dotenv").config({ path: "./.env" });
const { connectMongo } = require("../config/database");
const bcrypt = require("bcryptjs");

// Modelos
const User = require("../models/User");
const Batch = require("../models/Batch");
const Specimen = require("../models/Specimen");
const UserActivity = require("../models/UserActivity");

const SALT_ROUNDS = 12;

// Utilidades
const rand = (min, max) => Math.random() * (max - min) + min;
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const addDays = (base, d) => new Date(base.getTime() + d * 24 * 60 * 60 * 1000);

// Datos base
const ENSAYOS = ["Tracción", "Compresión", "Flexión", "Cizalla"];
const FIBRAS = ["Carbono", "Vidrio", "Aramida", "Basalto"];
const RESINAS = ["Epoxi", "Poliéster", "Viniléster"];

async function ensureIndexes() {
    // Si ya tienes los índices en los Schemas, esto no daña; solo asegura.
    await Promise.all([
        // Unicidad por (batch, orden)
        Specimen.collection.createIndex({ batch: 1, orden: 1 }, { unique: true }),
        // Búsquedas comunes
        Specimen.collection.createIndex({ ensayo: 1 }),
        Specimen.collection.createIndex({ tipo_fibra: 1 }),
        Batch.collection.createIndex({ name: 1 }),
        User.collection.createIndex({ username: 1 }, { unique: true }),
        User.collection.createIndex({ email: 1 }, { unique: true }),
        UserActivity.collection.createIndex({ created_at: -1 }),
    ]).catch((e) => {
        // Si las colecciones aún no existen, Mongoose las creará al primer insert
        // y luego este ensure se puede volver a ejecutar. Ignoramos errores de "namespace not found".
        if (!String(e).includes("NamespaceNotFound")) throw e;
    });
}

async function seedUsers() {
    const adminPass = process.env.SEED_ADMIN_PASSWORD || "admin12345";
    const userPass = process.env.SEED_USER_PASSWORD || "user12345";

    const [adminHash, userHash] = await Promise.all([
        bcrypt.hash(adminPass, SALT_ROUNDS),
        bcrypt.hash(userPass, SALT_ROUNDS),
    ]);

    const admin = await User.findOneAndUpdate(
        { username: "admin" },
        {
            username: "admin",
            full_name: "Administrador",
            email: "admin@fae.local",
            role: "admin",
            password: adminHash,
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    const demo = await User.findOneAndUpdate(
        { username: "demo" },
        {
            username: "demo",
            full_name: "Usuario Demo",
            email: "demo@fae.local",
            role: "user",
            password: userHash,
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return { admin, demo };
}

async function seedBatchesWithSpecimens(admin) {
    const baseDate = new Date();
    const batchesPayload = [
        { name: "Lote A", date: addDays(baseDate, -20), description: "Ensayos iniciales", created_by: admin._id },
        { name: "Lote B", date: addDays(baseDate, -10), description: "Muestras de validación", created_by: admin._id },
        { name: "Lote C", date: addDays(baseDate, -3), description: "Serie de control", created_by: admin._id },
    ];

    const batches = await Batch.insertMany(batchesPayload);

    const specimensPayload = [];
    for (const batch of batches) {
        const count = 10; // 10 probetas por lote
        for (let i = 1; i <= count; i++) {
            const ensayo = pick(ENSAYOS);
            const tipoFibra = pick(FIBRAS);
            const tipoResina = pick(RESINAS);

            specimensPayload.push({
                batch: batch._id,
                orden: `${String(i).padStart(2, "0")}`,
                fecha: addDays(batch.date, Math.floor(rand(0, 5))),
                orientacion: pick(["0°", "45°", "90°", "Quasi-isotrópico"]),
                descripcion: `Probeta ${i} del ${batch.name}`,
                ensayo,
                tipo_fibra: tipoFibra,
                fuerza_maxima: Math.round(rand(250, 1200) * 100) / 100,
                modulo_elasticidad: Math.round(rand(10, 150) * 100) / 100,
                tipo_resina: tipoResina,
                curado_temp_hum: `${Math.round(rand(20, 80))} °C / ${Math.round(rand(30, 80))}%`,
                created_by: admin._id,
            });
        }
    }

    const specimens = await Specimen.insertMany(specimensPayload, { ordered: false });
    return { batches, specimens };
}

async function seedActivity(user) {
    const acts = [
        { user: user._id, action: "login", details: "Inicio de sesión del seeder" },
        { user: user._id, action: "seed_data", details: "Datos de ejemplo insertados" },
    ];
    await UserActivity.insertMany(acts);
}

async function cleanCollections() {
    await Promise.all([
        User.deleteMany({}),
        Batch.deleteMany({}),
        Specimen.deleteMany({}),
        UserActivity.deleteMany({}),
    ]);
}

async function run() {
    const fresh = process.argv.includes("--fresh");
    await connectMongo();
    console.log("🔌 Conectado a MongoDB");

    if (fresh) {
        console.log("🧹 Limpiando colecciones...");
        await cleanCollections();
    }

    await ensureIndexes();

    console.log("👤 Creando usuarios...");
    const { admin, demo } = await seedUsers();

    console.log("🧪 Creando lotes y probetas...");
    const { batches, specimens } = await seedBatchesWithSpecimens(admin);

    console.log("📝 Registrando actividades...");
    await seedActivity(admin);

    console.log("✅ Seed completado.");
    console.table([
        { entidad: "Users", total: await User.estimatedDocumentCount() },
        { entidad: "Batches", total: await Batch.estimatedDocumentCount() },
        { entidad: "Specimens", total: await Specimen.estimatedDocumentCount() },
        { entidad: "UserActivity", total: await UserActivity.estimatedDocumentCount() },
    ]);

    console.log("\nℹ️  Credenciales:");
    console.log("   admin /", process.env.SEED_ADMIN_PASSWORD || "admin12345");
    console.log("   demo  /", process.env.SEED_USER_PASSWORD || "user12345");

    process.exit(0);
}

run().catch((err) => {
    console.error("❌ Error en seed:", err);
    process.exit(1);
});
