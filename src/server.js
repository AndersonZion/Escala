import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { initializeDatabase } from "./database.js";
import authRoutes from "./routes/auth.js";
import employeeRoutes from "./routes/employees.js";
import incompatibilityRoutes from "./routes/incompatibilities.js";
import fixedGroupsRoutes from "./routes/fixedGroups.js";
import generateScheduleRoutes from "./routes/generateSchedule.js"; // ← ADICIONAR

dotenv.config();

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
app.use("/api/generate-schedule", generateScheduleRoutes); // ← ADICIONAR

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", message: "API funcionando!" });
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
});
