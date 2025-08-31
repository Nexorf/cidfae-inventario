// config/database.js
const mongoose = require("mongoose");
require("dotenv").config({ path: "./.env" });

let isConnected = false;

async function connectMongo() {
    if (isConnected) return mongoose.connection;

    const uri = process.env.MONGODB_URI || "mongodb://localhost:27017/fae_inventario";
    mongoose.set("strictQuery", true);

    await mongoose.connect(uri, {
        // opciones modernas por defecto en Mongoose 8
    });

    isConnected = true;
    console.log("✅ Conectado a MongoDB");
    return mongoose.connection;
}

module.exports = { connectMongo };
