import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { initializeDatabase } from "./database.js";

import authRoutes from "./routes/auth.js";
import employeeRoutes from "./routes/employees.js";
import incompatibilityRoutes from "./routes/incompatibilities.js";
import fixedGroupsRoutes from "./routes/fixedGroups.js";
import generateScheduleRoutes from "./routes/generateSchedule.js";
import manualStartsRoutes from "./routes/manualStarts.js";

// Carrega variáveis do ambiente
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3333;

// ===============================
// CORS
// ===============================

const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:5173",
  "https://escala-front-end.vercel.app",
];

app.use(
  cors({
    origin: function (origin, callback) {
      // Permite Postman/mobile apps
      if (!origin) {
        return callback(null, true);
      }

      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        console.log("🚫 CORS bloqueado:", origin);
        callback(new Error("Not allowed by CORS"));
      }
    },

    credentials: true,

    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],

    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  })
);

// ===============================
// Middlewares
// ===============================

app.use(express.json());

// Logs
app.use((req, res, next) => {
  console.log(
    `📡 ${req.method} ${req.path} - Origin: ${
      req.headers.origin || "sem origin"
    }`
  );

  next();
});

// ===============================
// Inicializa banco
// ===============================

await initializeDatabase();

// ===============================
// Rotas
// ===============================

app.use("/api/auth", authRoutes);

app.use("/api/employees", employeeRoutes);

app.use("/api/incompatibilities", incompatibilityRoutes);

app.use("/api/fixed-groups", fixedGroupsRoutes);

app.use("/api/generate-schedule", generateScheduleRoutes);

app.use("/api/manual-starts", manualStartsRoutes);

// ===============================
// Health Check
// ===============================

app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    message: "API funcionando 🚀",
  });
});

// ===============================
// Teste CORS
// ===============================

app.get("/api/cors-test", (req, res) => {
  res.json({
    success: true,
    origin: req.headers.origin || "sem origin",
    message: "CORS funcionando ✅",
  });
});

// ===============================
// 404
// ===============================

app.use((req, res) => {
  res.status(404).json({
    error: "Rota não encontrada",
  });
});

// ===============================
// Error Handler
// ===============================

app.use((err, req, res, next) => {
  console.error("❌ Erro:", err.message);

  res.status(500).json({
    error: err.message || "Erro interno do servidor",
  });
});

// ===============================
// Start Server
// ===============================

app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);

  console.log("🌍 Origins permitidas:");

  allowedOrigins.forEach((origin) => {
    console.log(`✅ ${origin}`);
  });
});
