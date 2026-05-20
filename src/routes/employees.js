import express from "express";
import { getDb } from "../database.js";
import { authenticateToken, isAdmin } from "../middleware/auth.js";

const router = express.Router();

// GET - Listar todos os funcionários
router.get("/", authenticateToken, async (req, res) => {
  const db = getDb();
  try {
    const result = await db.query(
      "SELECT * FROM employees WHERE status = $1 ORDER BY name",
      ["active"]
    );
    res.json(result.rows);
  } catch (error) {
    console.error("Erro ao buscar funcionários:", error);
    res.status(500).json({ error: "Erro ao buscar funcionários" });
  }
});

// GET - Buscar funcionário por ID
router.get("/:id", authenticateToken, async (req, res) => {
  const db = getDb();
  try {
    const result = await db.query("SELECT * FROM employees WHERE id = $1", [
      req.params.id,
    ]);
    const employee = result.rows[0];

    if (!employee) {
      return res.status(404).json({ error: "Funcionário não encontrado" });
    }
    res.json(employee);
  } catch (error) {
    console.error("Erro ao buscar funcionário:", error);
    res.status(500).json({ error: "Erro ao buscar funcionário" });
  }
});

// PUT - Atualizar funcionário (incluindo preferência)
router.put("/:id", authenticateToken, isAdmin, async (req, res) => {
  const db = getDb();
  const {
    name,
    position,
    email,
    phone,
    department,
    hire_date,
    shift,
    status,
    preference,
  } = req.body;

  try {
    await db.query(
      `UPDATE employees SET 
        name = COALESCE($1, name),
        position = COALESCE($2, position),
        email = COALESCE($3, email),
        phone = COALESCE($4, phone),
        department = COALESCE($5, department),
        hire_date = COALESCE($6, hire_date),
        shift = COALESCE($7, shift),
        status = COALESCE($8, status),
        preference = COALESCE($9, preference, 'both')
      WHERE id = $10`,
      [
        name,
        position,
        email,
        phone,
        department,
        hire_date,
        shift,
        status,
        preference,
        req.params.id,
      ]
    );

    const result = await db.query("SELECT * FROM employees WHERE id = $1", [
      req.params.id,
    ]);
    res.json(result.rows[0]);
  } catch (error) {
    console.error("Erro ao atualizar funcionário:", error);
    res.status(500).json({ error: "Erro ao atualizar funcionário" });
  }
});

export default router;
