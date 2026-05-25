import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { initializeDatabase } from "./database.js";
import authRoutes from "./routes/auth.js";
import employeeRoutes from "./routes/employees.js";
import incompatibilityRoutes from "./routes/incompatibilities.js";
import fixedGroupsRoutes from "./routes/fixedGroups.js";
import generateScheduleRoutes from "./routes/generateSchedule.js";
import manualStartsRoutes from "./routes/manualStarts.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// FORÇAR uso do .env.production para dev:prod
if (process.env.NODE_ENV === "production") {
  dotenv.config({ path: path.join(__dirname, "../.env.production") });
  console.log("📦 Usando .env.production (Neon)");
} else {
  dotenv.config({ path: path.join(__dirname, "../.env") });
  console.log("📦 Usando .env (Local)");
}

console.log(
  "📦 DATABASE_URL:",
  process.env.DATABASE_URL ? "Configurada" : "NÃO CONFIGURADA"
);
console.log(
  "🌍 FRONTEND_URL:",
  process.env.FRONTEND_URL || "Não configurada (CORS liberado apenas para dev)"
);

const app = express();
const PORT = process.env.PORT || 3333;

// 🔥 CONFIGURAÇÃO CORRETA DO CORS
const allowedOrigins = process.env.FRONTEND_URL
  ? [process.env.FRONTEND_URL, "http://localhost:3000", "http://localhost:5173"]
  : ["http://localhost:3000", "http://localhost:5173"]; // desenvolvimento

const corsOptions = {
  origin: function (origin, callback) {
    // Permite requisições sem origin (como mobile apps, Postman, etc)
    if (!origin) return callback(null, true);

    if (
      allowedOrigins.indexOf(origin) !== -1 ||
      process.env.NODE_ENV !== "production"
    ) {
      callback(null, true);
    } else {
      console.warn(`🚫 CORS bloqueou requisição de: ${origin}`);
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true, // Se você usa cookies/tokens JWT em headers
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  optionsSuccessStatus: 200,
};

// Aplica CORS com as opções
app.use(cors(corsOptions));
app.options("*", cors(corsOptions)); // Suporte para preflight requests

app.use(express.json());

// Log para debug (útil em produção)
app.use((req, res, next) => {
  console.log(
    `${req.method} ${req.path} - Origin: ${req.headers.origin || "sem origin"}`
  );
  next();
});

// Inicializar banco
await initializeDatabase();

// Rotas
app.use("/api/auth", authRoutes);
app.use("/api/employees", employeeRoutes);
app.use("/api/incompatibilities", incompatibilityRoutes);
app.use("/api/fixed-groups", fixedGroupsRoutes);
app.use("/api/generate-schedule", generateScheduleRoutes);
app.use("/api/manual-starts", manualStartsRoutes);

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", message: "API funcionando!" });
});

// Rota de teste CORS
app.get("/api/cors-test", (req, res) => {
  res.json({
    message: "CORS está funcionando! 🎉",
    origin: req.headers.origin || "no origin",
    env: process.env.NODE_ENV,
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
  console.log(`🌍 Ambiente: ${process.env.NODE_ENV || "development"}`);
  console.log(`🔒 CORS permitindo: ${allowedOrigins.join(", ")}`);
});
