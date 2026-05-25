import express from "express";
import { getDb } from "../database.js";
import { authenticateToken, isAdmin } from "../middleware/auth.js";
import {
  format,
  eachDayOfInterval,
  startOfMonth,
  endOfMonth,
  getDay,
  isBefore,
} from "date-fns";
import { ptBR } from "date-fns/locale";

const router = express.Router();

const isFriday = (date) => getDay(date) === 5;
const isSaturday = (date) => getDay(date) === 6;

// Função para verificar disponibilidade por preferência
const isAvailableForDay = (employee, date) => {
  if (!employee) return false;
  const preference = employee.preference || "both";
  const isFridayDay = isFriday(date);
  const isSaturdayDay = isSaturday(date);

  if (isFridayDay && preference === "friday") return true;
  if (isSaturdayDay && preference === "saturday") return true;
  if (preference === "both") return true;
  return false;
};

// Função para carregar grupos fixos
async function loadFixedGroups(db) {
  const result = await db.query(
    "SELECT * FROM fixed_groups ORDER BY group_order"
  );
  return result.rows.map((row) => [row.employee1_id, row.employee2_id]);
}

// Função para salvar continuidade
async function saveContinuity(db, year, month, lastGroupIndex) {
  await db.query(
    `INSERT INTO continuity (year, month, last_group_index) 
     VALUES ($1, $2, $3) 
     ON CONFLICT (year, month) DO UPDATE SET last_group_index = $3`,
    [year, month, lastGroupIndex]
  );
}

// Função para obter próximo índice de início
async function getNextStartIndex(db, year, month) {
  let prevYear = year;
  let prevMonth = month - 1;
  if (prevMonth < 0) {
    prevMonth = 11;
    prevYear = year - 1;
  }

  const result = await db.query(
    "SELECT last_group_index FROM continuity WHERE year = $1 AND month = $2",
    [prevYear, prevMonth]
  );

  if (result.rows.length > 0) {
    const lastIndex = result.rows[0].last_group_index;
    const groups = await loadFixedGroups(db);
    return (lastIndex + 1) % groups.length;
  }

  return 0;
}

// POST - Gerar escala para um mês específico
router.post(
  "/generate/:year/:month",
  authenticateToken,
  isAdmin,
  async (req, res) => {
    const db = getDb();
    const { year, month } = req.params;
    const yearNum = parseInt(year);
    const monthNum = parseInt(month) - 1;

    try {
      const start = startOfMonth(new Date(yearNum, monthNum, 1));
      const end = endOfMonth(new Date(yearNum, monthNum, 1));
      const days = eachDayOfInterval({ start, end });
      const workDays = days.filter((day) => isFriday(day) || isSaturday(day));

      // 1. Carregar grupos fixos
      const groupsIds = await loadFixedGroups(db);
      const groups = [];
      for (const group of groupsIds) {
        const emp1 = await db.query("SELECT * FROM employees WHERE id = $1", [
          group[0],
        ]);
        const emp2 = await db.query("SELECT * FROM employees WHERE id = $1", [
          group[1],
        ]);
        if (emp1.rows[0] && emp2.rows[0]) {
          groups.push([emp1.rows[0], emp2.rows[0]]);
        }
      }

      if (groups.length === 0) {
        return res.status(400).json({
          error: "Nenhum grupo fixo encontrado. Crie grupos primeiro.",
        });
      }

      // 2. Buscar configuração manual
      const manualStartResult = await db.query(
        "SELECT * FROM manual_starts WHERE start_date >= $1 AND start_date <= $2 ORDER BY start_date LIMIT 1",
        [format(start, "yyyy-MM-dd"), format(end, "yyyy-MM-dd")]
      );
      const manualStart = manualStartResult.rows[0];

      let startGroupIndex = 0;
      let manualStartIndex = -1;

      if (manualStart) {
        const manualGroupIndex = groups.findIndex(
          (g) =>
            g[0] &&
            g[0].id === manualStart.employee1_id &&
            g[1] &&
            g[1].id === manualStart.employee2_id
        );
        if (manualGroupIndex !== -1) {
          startGroupIndex = manualGroupIndex;
        }
        for (let i = 0; i < workDays.length; i++) {
          if (format(workDays[i], "yyyy-MM-dd") === manualStart.start_date) {
            manualStartIndex = i;
            break;
          }
        }
      } else {
        startGroupIndex = await getNextStartIndex(db, yearNum, monthNum);
      }

      console.log(`📌 Grupo inicial: ${startGroupIndex + 1}`);
      console.log(`📅 Dias de trabalho: ${workDays.length}`);

      // 3. Remover escalas antigas
      await db.query("DELETE FROM schedules WHERE date >= $1 AND date <= $2", [
        format(start, "yyyy-MM-dd"),
        format(end, "yyyy-MM-dd"),
      ]);

      // 4. Gerar nova escala
      let groupCounter = 0;
      let lastGroupUsed = -1;
      const schedules = [];

      for (let i = 0; i < workDays.length; i++) {
        const day = workDays[i];
        const dateStr = format(day, "yyyy-MM-dd");
        const dayOfWeek = format(day, "EEEE", { locale: ptBR });

        const isBeforeManual =
          manualStart && isBefore(day, new Date(manualStart.start_date));
        if (isBeforeManual) {
          console.log(
            `⏸️ Dia ${format(
              day,
              "dd/MM"
            )} - anterior à data manual, sem escala`
          );
          continue;
        }

        let currentGroupIndex;
        if (manualStart && manualStartIndex !== -1 && i >= manualStartIndex) {
          const offset = groupCounter % groups.length;
          currentGroupIndex = (startGroupIndex + offset) % groups.length;
        } else {
          currentGroupIndex = (startGroupIndex + groupCounter) % groups.length;
        }

        const currentGroup = groups[currentGroupIndex];
        if (
          currentGroup &&
          currentGroup.length === 2 &&
          currentGroup[0] &&
          currentGroup[1]
        ) {
          await db.query(
            "INSERT INTO schedules (date, employee_id, shift, notes) VALUES ($1, $2, $3, $4)",
            [
              dateStr,
              currentGroup[0].id,
              "day",
              `Turno Diurno - ${dayOfWeek} (Grupo ${currentGroupIndex + 1})`,
            ]
          );
          await db.query(
            "INSERT INTO schedules (date, employee_id, shift, notes) VALUES ($1, $2, $3, $4)",
            [
              dateStr,
              currentGroup[1].id,
              "night",
              `Turno Noturno - ${dayOfWeek} (Grupo ${currentGroupIndex + 1})`,
            ]
          );
          schedules.push({
            date: dateStr,
            group: currentGroupIndex + 1,
            day: currentGroup[0].name,
            night: currentGroup[1].name,
          });
          lastGroupUsed = currentGroupIndex;
          groupCounter++;
        }
      }

      if (lastGroupUsed !== -1) {
        await saveContinuity(db, yearNum, monthNum, lastGroupUsed);
      }

      res.json({ message: "Escala gerada com sucesso!", schedules });
    } catch (error) {
      console.error("Erro ao gerar escala:", error);
      res
        .status(500)
        .json({ error: "Erro ao gerar escala", details: error.message });
    }
  }
);

// GET - Buscar escala do mês
router.get("/:year/:month", authenticateToken, async (req, res) => {
  const db = getDb();
  const { year, month } = req.params;

  try {
    const result = await db.query(
      `SELECT s.*, e.name as employee_name, e.position 
       FROM schedules s 
       JOIN employees e ON s.employee_id = e.id 
       WHERE EXTRACT(YEAR FROM s.date) = $1 AND EXTRACT(MONTH FROM s.date) = $2
       ORDER BY s.date, s.shift`,
      [year, month]
    );
    res.json(result.rows);
  } catch (error) {
    console.error("Erro ao buscar escala:", error);
    res.status(500).json({ error: "Erro ao buscar escala" });
  }
});

// DELETE - Excluir escala do mês
router.delete("/:year/:month", authenticateToken, isAdmin, async (req, res) => {
  const db = getDb();
  const { year, month } = req.params;

  try {
    const result = await db.query(
      "DELETE FROM schedules WHERE EXTRACT(YEAR FROM date) = $1 AND EXTRACT(MONTH FROM date) = $2",
      [year, month]
    );

    res.json({
      message: `Escala de ${month}/${year} excluída com sucesso!`,
      deletedCount: result.rowCount,
    });
  } catch (error) {
    console.error("Erro ao excluir escala:", error);
    res.status(500).json({ error: "Erro ao excluir escala" });
  }
});

export default router;
