//src/server.js

import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { initializeDatabase } from "./database.js";
import authRoutes from "./routes/auth.js";
import employeeRoutes from "./routes/employees.js";
import scheduleRoutes from "./routes/schedules.js";
import incompatibilityRoutes from "./routes/incompatibilities.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3333;

app.use(cors());
app.use(express.json());

// Inicializar banco de dados
await initializeDatabase();

// Rotas
app.use("/api/auth", authRoutes);
app.use("/api/employees", employeeRoutes);
app.use("/api/schedules", scheduleRoutes);
app.use("/api/incompatibilities", incompatibilityRoutes);

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", message: "API funcionando!" });
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
});
