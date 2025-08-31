const express = require("express");
const { body, validationResult } = require("express-validator");
const { generateToken, hashPassword, verifyPassword } = require("../middleware/auth");
const User = require("../models/User");
const UserActivity = require("../models/UserActivity");
const jwt = require("jsonwebtoken");

const router = express.Router();

const loginValidation = [
    body("username").trim().isLength({ min: 3 }).withMessage("Usuario inválido"),
    body("password").isLength({ min: 6 }).withMessage("Contraseña inválida")
];

const registerValidation = [
    body("username").trim().isLength({ min: 3 }).matches(/^[a-zA-Z0-9_]+$/),
    body("password").isLength({ min: 6 }),
    body("email").isEmail().normalizeEmail(),
    body("fullName").trim().isLength({ min: 2 })
];

router.post("/login", loginValidation, async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: "Datos inválidos", details: errors.array() });

    const { username, password } = req.body;

    const user = await User.findOne({ username });
    if (!user) return res.status(401).json({ error: "Credenciales inválidas", message: "Usuario o contraseña incorrectos" });

    const ok = await verifyPassword(password, user.password);
    if (!ok) return res.status(401).json({ error: "Credenciales inválidas", message: "Usuario o contraseña incorrectos" });

    const token = generateToken(user);

    await UserActivity.create({ user: user._id, action: "login", details: "Inicio de sesión exitoso" });

    res.json({
        success: true,
        message: "Inicio de sesión exitoso",
        token,
        user: {
            id: user._id,
            username: user.username,
            fullName: user.full_name,
            email: user.email,
            role: user.role
        }
    });
});

router.post("/register", registerValidation, async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: "Datos inválidos", details: errors.array() });

    const { username, password, email, fullName } = req.body;

    const exists = await User.exists({ $or: [{ username }, { email }] });
    if (exists) return res.status(409).json({ error: "Usuario ya existe", message: "Username o email ya registrados" });

    const hashed = await hashPassword(password);
    const user = await User.create({
        username,
        password: hashed,
        email,
        full_name: fullName,
        role: "user"
    });

    const token = generateToken(user);

    res.status(201).json({
        success: true,
        message: "Usuario registrado exitosamente",
        token,
        user: {
            id: user._id,
            username: user.username,
            fullName: user.full_name,
            email: user.email,
            role: user.role
        }
    });
});

router.get("/me", async (req, res) => {
    try {
        const token = req.headers.authorization?.split(" ")[1];
        if (!token) return res.status(401).json({ error: "Token requerido", message: "Proporcione token" });

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id).select("_id username email full_name role");
        if (!user) return res.status(404).json({ error: "Usuario no encontrado", message: "No existe" });

        res.json({ success: true, user });
    } catch (e) {
        res.status(500).json({ error: "Error interno del servidor", message: "Error al obtener usuario" });
    }
});

module.exports = router;
