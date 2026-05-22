import {
  format,
  eachDayOfInterval,
  startOfMonth,
  endOfMonth,
  getDay,
  isBefore,
} from "date-fns";
import { ptBR } from "date-fns/locale";

const isFriday = (date) => getDay(date) === 5;
const isSaturday = (date) => getDay(date) === 6;

// Função para verificar compatibilidade
export async function isCompatible(db, emp1Id, emp2Id) {
  const result = await db.query(
    "SELECT * FROM incompatibilities WHERE employee_id = $1 AND incompatible_with = $2",
    [emp1Id, emp2Id]
  );
  return result.rows.length === 0;
}

// Função para verificar disponibilidade por preferência
export function isAvailableForDay(employee, date) {
  const preference = employee.preference || "both";
  if (isFriday(date) && preference === "friday") return true;
  if (isSaturday(date) && preference === "saturday") return true;
  if (preference === "both") return true;
  return false;
}

// Função para criar grupos fixos
export async function createFixedGroups(db, employees) {
  const activeEmployees = employees.filter(
    (employee) => employee.status === "active"
  );

  const shuffled = [...activeEmployees];

  // Embaralhar
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));

    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  const groups = [];
  const usedIds = new Set();
  const leftoverEmployees = [];

  for (let i = 0; i < shuffled.length; i++) {
    const employee = shuffled[i];

    // já usado
    if (usedIds.has(employee.id)) {
      continue;
    }

    let partner = null;

    // procurar parceiro compatível
    for (let j = i + 1; j < shuffled.length; j++) {
      const candidate = shuffled[j];

      if (usedIds.has(candidate.id)) {
        continue;
      }

      const compatible = await isCompatible(db, employee.id, candidate.id);

      if (compatible) {
        partner = candidate;
        break;
      }
    }

    // encontrou parceiro
    if (partner) {
      groups.push([employee, partner]);

      usedIds.add(employee.id);
      usedIds.add(partner.id);
    } else {
      // fica sem dupla
      leftoverEmployees.push(employee);

      usedIds.add(employee.id);
    }
  }

  return {
    groups,
    leftoverEmployees,
  };
}

// Função para salvar grupos fixos
export async function saveFixedGroups(groups) {
  try {
    for (const [index, item] of groups.entries()) {
      console.log(`📝 Atualizando grupo ${index}:`, item);

      const groupResult = await pool.query(
        "SELECT * FROM fixed_groups WHERE id = $1",
        [index + 1]
      );

      const group = groupResult.rows[0];

      // =========================
      // CORREÇÃO PRINCIPAL
      // =========================
      if (!group) {
        console.log(`⚠️ Grupo ${index + 1} não encontrado`);
        continue;
      }

      await pool.query(
        `
        UPDATE fixed_groups
        SET employee1_id = $1,
            employee2_id = $2
        WHERE id = $3
        `,
        [item.employee1_id || null, item.employee2_id || null, group.id]
      );

      console.log(`✅ Grupo ${index + 1} salvo com sucesso`);
    }
  } catch (error) {
    console.error("Erro ao salvar grupos fixos:", error);
    throw error;
  }
}

// Função para carregar grupos fixos
export async function loadFixedGroups(db) {
  const result = await db.query(
    "SELECT * FROM fixed_groups ORDER BY group_order"
  );
  return result.rows.map((row) => [row.employee1_id, row.employee2_id]);
}

// Função para obter continuidade
export async function getNextStartIndex(db, year, month) {
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
    return (lastIndex + 1) % 3;
  }

  return 0;
}

// Função para salvar continuidade
export async function saveContinuity(db, year, month, lastGroupIndex) {
  await db.query(
    `INSERT INTO continuity (year, month, last_group_index) 
     VALUES ($1, $2, $3) 
     ON CONFLICT (year, month) DO UPDATE SET last_group_index = $3`,
    [year, month, lastGroupIndex]
  );
}
