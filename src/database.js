import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Carregar ENV antes de qualquer import que use process.env
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

// IMPORTS depois do dotenv
import { initializeDatabase } from "./database.js";
import authRoutes from "./routes/auth.js";
import employeeRoutes from "./routes/employees.js";
import incompatibilityRoutes from "./routes/incompatibilities.js";
import fixedGroupsRoutes from "./routes/fixedGroups.js";
import generateScheduleRoutes from "./routes/generateSchedule.js";
import manualStartsRoutes from "./routes/manualStarts.js";

const app = express();
const PORT = process.env.PORT || 3333;

app.use(cors());
app.use(express.json());

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
  res.json({
    status: "ok",
    environment: process.env.NODE_ENV || "development",
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
  console.log(`🌍 Ambiente: ${process.env.NODE_ENV || "development"}`);
});
