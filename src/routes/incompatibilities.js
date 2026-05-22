import express from "express";
import { getDb } from "../database.js";
import { authenticateToken, isAdmin } from "../middleware/auth.js";

const router = express.Router();

// GET - Listar incompatibilidades
router.get("/", authenticateToken, async (req, res) => {
  const db = getDb();
  try {
    const result = await db.query(`
      SELECT i.*, e1.name as employee_name, e1.position as employee_position,
             e2.name as incompatible_name, e2.position as incompatible_position
      FROM incompatibilities i
      JOIN employees e1 ON i.employee_id = e1.id
      JOIN employees e2 ON i.incompatible_with = e2.id
    `);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: "Erro ao buscar incompatibilidades" });
  }
});

// POST - Adicionar incompatibilidade
router.post("/", authenticateToken, isAdmin, async (req, res) => {
  const db = getDb();
  const { employee_id, incompatible_with } = req.body;

  try {
    await db.query(
      "INSERT INTO incompatibilities (employee_id, incompatible_with) VALUES ($1, $2), ($2, $1)",
      [employee_id, incompatible_with]
    );
    res.status(201).json({ message: "Incompatibilidade criada" });
  } catch (error) {
    res.status(500).json({ error: "Erro ao criar incompatibilidade" });
  }
});

// DELETE - Remover incompatibilidade
router.delete("/:emp1/:emp2", authenticateToken, isAdmin, async (req, res) => {
  const db = getDb();
  const { emp1, emp2 } = req.params;

  try {
    await db.query(
      "DELETE FROM incompatibilities WHERE (employee_id = $1 AND incompatible_with = $2) OR (employee_id = $2 AND incompatible_with = $1)",
      [emp1, emp2]
    );
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: "Erro ao remover incompatibilidade" });
  }
});

export default router;
