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
    console.error("Erro ao buscar incompatibilidades:", error);
    res.status(500).json({ error: "Erro ao buscar incompatibilidades" });
  }
});

export default router;
