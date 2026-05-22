import express from "express";
import { getDb } from "../database.js";
import { authenticateToken, isAdmin } from "../middleware/auth.js";

const router = express.Router();

// GET - Listar funcionários
router.get("/", authenticateToken, async (req, res) => {
  const db = getDb();
  try {
    const result = await db.query("SELECT * FROM employees ORDER BY name");
    res.json(result.rows);
  } catch (error) {
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
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Funcionário não encontrado" });
    }
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: "Erro ao buscar funcionário" });
  }
});

// POST - Criar funcionário
router.post("/", authenticateToken, isAdmin, async (req, res) => {
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
    const result = await db.query(
      `INSERT INTO employees (name, position, email, phone, department, hire_date, shift, status, preference) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [
        name,
        position,
        email,
        phone,
        department,
        hire_date,
        shift,
        status,
        preference || "both",
      ]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: "Erro ao criar funcionário" });
  }
});

// PUT - Atualizar funcionário
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
        preference = COALESCE($9, preference)
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
    res.status(500).json({ error: "Erro ao atualizar funcionário" });
  }
});

// DELETE - Remover funcionário
router.delete("/:id", authenticateToken, isAdmin, async (req, res) => {
  const db = getDb();
  try {
    await db.query("DELETE FROM employees WHERE id = $1", [req.params.id]);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: "Erro ao remover funcionário" });
  }
});

export default router;
