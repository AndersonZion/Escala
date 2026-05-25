// ========================================
// routes/manualStarts.js
// ========================================
import express from "express";
import { getDb } from "../database.js";
import { authenticateToken, isAdmin } from "../middleware/auth.js";

const router = express.Router();

// GET - Buscar todas as configurações manuais
router.get("/", authenticateToken, async (req, res) => {
  const db = getDb();
  try {
    const result = await db.query(`
      SELECT ms.*, 
        e1.name as employee1_name, e1.position as employee1_position,
        e2.name as employee2_name, e2.position as employee2_position
      FROM manual_starts ms
      JOIN employees e1 ON ms.employee1_id = e1.id
      JOIN employees e2 ON ms.employee2_id = e2.id
      ORDER BY ms.start_date DESC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error("Erro ao buscar configurações manuais:", error);
    res.status(500).json({ error: "Erro ao buscar configurações manuais" });
  }
});

// POST - Adicionar configuração manual
router.post("/", authenticateToken, isAdmin, async (req, res) => {
  const db = getDb();
  const { employee1_id, employee2_id, start_date, day_type } = req.body;

  try {
    // Verificar se já existe configuração para esta data
    const existing = await db.query(
      "SELECT * FROM manual_starts WHERE start_date = $1",
      [start_date]
    );

    if (existing.rows.length > 0) {
      // Atualizar existente
      await db.query(
        "UPDATE manual_starts SET employee1_id = $1, employee2_id = $2, day_type = $3 WHERE start_date = $4",
        [employee1_id, employee2_id, day_type, start_date]
      );
    } else {
      // Inserir nova
      await db.query(
        "INSERT INTO manual_starts (employee1_id, employee2_id, start_date, day_type) VALUES ($1, $2, $3, $4)",
        [employee1_id, employee2_id, start_date, day_type]
      );
    }

    res.status(201).json({ message: "Configuração manual salva com sucesso!" });
  } catch (error) {
    console.error("Erro ao salvar configuração manual:", error);
    res.status(500).json({ error: "Erro ao salvar configuração manual" });
  }
});

// DELETE - Remover configuração manual
router.delete("/:id", authenticateToken, isAdmin, async (req, res) => {
  const db = getDb();
  const { id } = req.params;

  try {
    await db.query("DELETE FROM manual_starts WHERE id = $1", [id]);
    res.status(200).json({ message: "Configuração removida com sucesso!" });
  } catch (error) {
    console.error("Erro ao remover configuração manual:", error);
    res.status(500).json({ error: "Erro ao remover configuração manual" });
  }
});

export default router;
