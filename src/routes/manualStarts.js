// ========================================
// routes/manualStarts.js
// ========================================

import express from "express";

import { getDb } from "../database.js";

import { authenticateToken, isAdmin } from "../middleware/auth.js";

const router = express.Router();

router.get("/", authenticateToken, async (req, res) => {
  const db = getDb();

  try {
    const result = await db.query(`
      SELECT
        ms.*,
        e1.name AS employee1_name,
        e2.name AS employee2_name
      FROM public.manual_starts ms
      JOIN public.employees e1
        ON e1.id = ms.employee1_id
      JOIN public.employees e2
        ON e2.id = ms.employee2_id
      ORDER BY start_date
    `);

    res.json(result.rows);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: "Erro ao buscar inícios manuais",
    });
  }
});

router.post("/", authenticateToken, isAdmin, async (req, res) => {
  const db = getDb();

  const { employee1_id, employee2_id, start_date, day_type } = req.body;

  try {
    await db.query(
      `
        DELETE FROM public.manual_starts
        WHERE start_date = $1
        `,
      [start_date]
    );

    const result = await db.query(
      `
        INSERT INTO public.manual_starts
        (
          employee1_id,
          employee2_id,
          start_date,
          day_type
        )
        VALUES ($1,$2,$3,$4)
        RETURNING *
        `,
      [employee1_id, employee2_id, start_date, day_type]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: "Erro ao salvar início manual",
    });
  }
});

router.delete("/:id", authenticateToken, isAdmin, async (req, res) => {
  const db = getDb();

  try {
    await db.query(
      `
        DELETE FROM public.manual_starts
        WHERE id = $1
        `,
      [req.params.id]
    );

    res.json({
      message: "Início manual removido",
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: "Erro ao remover início manual",
    });
  }
});

export default router;
