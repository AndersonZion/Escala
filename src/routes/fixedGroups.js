import express from "express";
import { getDb } from "../database.js";
import { authenticateToken, isAdmin } from "../middleware/auth.js";

const router = express.Router();

// GET - Buscar grupos fixos
router.get("/", authenticateToken, async (req, res) => {
  const db = getDb();
  try {
    const result = await db.query(
      "SELECT * FROM fixed_groups ORDER BY group_order"
    );

    const groupsWithNames = [];
    for (const row of result.rows) {
      const emp1 = await db.query(
        "SELECT id, name, position, preference FROM employees WHERE id = $1",
        [row.employee1_id]
      );
      const emp2 = await db.query(
        "SELECT id, name, position, preference FROM employees WHERE id = $1",
        [row.employee2_id]
      );
      groupsWithNames.push([emp1.rows[0], emp2.rows[0]]);
    }

    res.json(groupsWithNames);
  } catch (error) {
    console.error("Erro ao buscar grupos:", error);
    res.status(500).json({ error: "Erro ao buscar grupos" });
  }
});

// POST - Gerar grupos aleatórios
router.post("/generate", authenticateToken, isAdmin, async (req, res) => {
  const db = getDb();
  try {
    const employeesResult = await db.query(
      "SELECT * FROM employees WHERE status = $1",
      ["active"]
    );
    const employees = employeesResult.rows;

    if (employees.length < 2) {
      return res
        .status(400)
        .json({ error: "Precisa de pelo menos 2 funcionários" });
    }

    // Embaralhar
    const shuffled = [...employees];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    // Formar grupos de 2
    const groups = [];
    for (let i = 0; i < shuffled.length - 1; i += 2) {
      groups.push([shuffled[i].id, shuffled[i + 1].id]);
    }

    // Limpar e salvar
    await db.query("DELETE FROM fixed_groups");
    for (let i = 0; i < groups.length; i++) {
      await db.query(
        "INSERT INTO fixed_groups (group_order, employee1_id, employee2_id) VALUES ($1, $2, $3)",
        [i + 1, groups[i][0], groups[i][1]]
      );
    }

    // Buscar nomes
    const groupsWithNames = [];
    for (const group of groups) {
      const emp1 = await db.query(
        "SELECT id, name, position, preference FROM employees WHERE id = $1",
        [group[0]]
      );
      const emp2 = await db.query(
        "SELECT id, name, position, preference FROM employees WHERE id = $1",
        [group[1]]
      );
      groupsWithNames.push([emp1.rows[0], emp2.rows[0]]);
    }

    res.json({ message: "Grupos gerados!", groups: groupsWithNames });
  } catch (error) {
    console.error("Erro ao gerar grupos:", error);
    res.status(500).json({ error: "Erro ao gerar grupos" });
  }
});

// PUT - Atualizar grupo específico
router.put("/:index", authenticateToken, isAdmin, async (req, res) => {
  const db = getDb();
  const { index } = req.params;
  const { employee1_id, employee2_id } = req.body;
  const idx = parseInt(index);

  try {
    const existing = await db.query(
      "SELECT * FROM fixed_groups WHERE group_order = $1",
      [idx + 1]
    );

    if (existing.rows.length === 0) {
      await db.query(
        "INSERT INTO fixed_groups (group_order, employee1_id, employee2_id) VALUES ($1, $2, $3)",
        [idx + 1, employee1_id, employee2_id]
      );
    } else {
      await db.query(
        "UPDATE fixed_groups SET employee1_id = $1, employee2_id = $2 WHERE group_order = $3",
        [employee1_id, employee2_id, idx + 1]
      );
    }

    const emp1 = await db.query(
      "SELECT id, name, position, preference FROM employees WHERE id = $1",
      [employee1_id]
    );
    const emp2 = await db.query(
      "SELECT id, name, position, preference FROM employees WHERE id = $1",
      [employee2_id]
    );

    res.json({
      message: "Grupo atualizado!",
      group: [emp1.rows[0], emp2.rows[0]],
    });
  } catch (error) {
    console.error("Erro ao atualizar grupo:", error);
    res.status(500).json({ error: "Erro ao atualizar grupo" });
  }
});

export default router;
