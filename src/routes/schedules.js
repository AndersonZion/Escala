import express from "express";
import { getDb } from "../database.js";
import { authenticateToken, isAdmin } from "../middleware/auth.js";

const router = express.Router();

// GET - Listar escalas por data
router.get("/date/:date", authenticateToken, async (req, res) => {
  const db = getDb();
  try {
    const result = await db.query(
      `SELECT s.*, e.name as employee_name, e.position 
       FROM schedules s 
       JOIN employees e ON s.employee_id = e.id 
       WHERE s.date = $1`,
      [req.params.date]
    );
    res.json(result.rows);
  } catch (error) {
    console.error("Erro ao buscar escalas:", error);
    res.status(500).json({ error: "Erro ao buscar escalas" });
  }
});

// PUT - Atualizar escala
router.put("/:id", authenticateToken, isAdmin, async (req, res) => {
  const db = getDb();
  const { employee_id, notes } = req.body;

  try {
    await db.query(
      "UPDATE schedules SET employee_id = COALESCE($1, employee_id), notes = COALESCE($2, notes) WHERE id = $3",
      [employee_id, notes, req.params.id]
    );

    const result = await db.query("SELECT * FROM schedules WHERE id = $1", [
      req.params.id,
    ]);
    res.json(result.rows[0]);
  } catch (error) {
    console.error("Erro ao atualizar escala:", error);
    res.status(500).json({ error: "Erro ao atualizar escala" });
  }
});

export default router;
