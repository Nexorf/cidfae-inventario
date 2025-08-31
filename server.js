const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
require("dotenv").config({ path: "./.env" });
const { connectMongo } = require("./config/database");

// Rutas
const authRoutes = require("./routes/auth");
const batchesRoutes = require("./routes/batches");
const specimensRoutes = require("./routes/specimens");
const dashboardRoutes = require("./routes/dashboard");

// Middleware auth
const { authenticateToken } = require("./middleware/auth");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(helmet());
app.use(morgan("combined"));
app.use(
    cors({
        origin: [
            process.env.CORS_ORIGIN || "http://localhost:5500",
            "http://localhost:63343",
            "http://localhost:63342",
            "http://127.0.0.1:5500"
        ],
        credentials: true, // no usamos cookies, pero no molesta
        methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Authorization"],
        optionsSuccessStatus: 204
    })
);
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

app.use(express.static("public"));
app.use(express.static("."));

app.get("/", (req, res) => res.sendFile(__dirname + "/index.html"));

// Públicas
app.use("/api/auth", authRoutes);

// Protegidas
app.use("/api/batches", authenticateToken, batchesRoutes);
app.use("/api/specimens", authenticateToken, specimensRoutes);
app.use("/api/dashboard", authenticateToken, dashboardRoutes);

app.get("/api/health", (req, res) => {
    res.json({ status: "OK", message: "FAE Inventario (Mongo) OK", timestamp: new Date().toISOString() });
});

app.use("*", (req, res) => res.status(404).json({ error: "Ruta no encontrada", message: "No existe" }));

app.use((err, req, res, next) => {
    console.error("Error:", err);
    res.status(err.status || 500).json({
        error: "Error interno del servidor",
        message: process.env.NODE_ENV === "development" ? err.message : "Algo salió mal"
    });
});

connectMongo().then(() => {
    app.listen(PORT, () => {
        console.log(`🚀 Servidor FAE Inventario (Mongo) en puerto ${PORT}`);
        console.log(`📊 API: http://localhost:${PORT}/api`);
    });
});

module.exports = app;
