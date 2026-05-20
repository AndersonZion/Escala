import {
  format,
  eachDayOfInterval,
  startOfMonth,
  endOfMonth,
  getDay,
} from "date-fns";
import { ptBR } from "date-fns/locale";

// Verificar se é sexta ou sábado
const isFriday = (date) => getDay(date) === 5;
const isSaturday = (date) => getDay(date) === 6;

// Verificar se funcionário está disponível para o dia
function isAvailableForDay(employee, day) {
  const preference = employee.preference || "both";
  const isFridayDay = isFriday(day);
  const isSaturdayDay = isSaturday(day);

  if (isFridayDay && preference === "friday") return true;
  if (isSaturdayDay && preference === "saturday") return true;
  if (preference === "both") return true;

  return false;
}

// Verificar compatibilidade (incompatibilidades)
async function isCompatible(db, emp1Id, emp2Id) {
  const result = await db.query(
    "SELECT * FROM incompatibilities WHERE employee_id = $1 AND incompatible_with = $2",
    [emp1Id, emp2Id]
  );
  return result.rows.length === 0;
}

// Criar grupos respeitando preferências
async function createGroupsWithPreferences(employees, db) {
  const activeEmployees = employees.filter((e) => e.status === "active");

  // Separar por preferência
  const fridayOnly = activeEmployees.filter((e) => e.preference === "friday");
  const saturdayOnly = activeEmployees.filter(
    (e) => e.preference === "saturday"
  );
  const both = activeEmployees.filter((e) => e.preference === "both");

  // Embaralhar arrays
  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  const groups = [];
  const used = new Set();

  // Primeiro, tentar formar grupos com quem prefere sexta e sábado especificamente
  const allPref = [
    ...shuffle(fridayOnly),
    ...shuffle(saturdayOnly),
    ...shuffle(both),
  ];

  for (let i = 0; i < allPref.length; i++) {
    if (used.has(allPref[i].id)) continue;

    let found = false;
    for (let j = i + 1; j < allPref.length; j++) {
      if (used.has(allPref[j].id)) continue;

      // Verificar compatibilidade
      if (await isCompatible(db, allPref[i].id, allPref[j].id)) {
        groups.push([allPref[i], allPref[j]]);
        used.add(allPref[i].id);
        used.add(allPref[j].id);
        found = true;
        break;
      }
    }

    if (!found && !used.has(allPref[i].id)) {
      // Tentar emparelhar com alguém já usado? Ou deixar sozinho
      groups.push([allPref[i]]);
      used.add(allPref[i].id);
    }
  }

  return groups.filter((g) => g.length === 2);
}

// Gerar sequência de dias respeitando disponibilidade
export async function generateScheduleWithPreferences(
  db,
  employees,
  year,
  month
) {
  const start = startOfMonth(new Date(year, month - 1, 1));
  const end = endOfMonth(new Date(year, month - 1, 1));
  const days = eachDayOfInterval({ start, end });

  // Filtrar apenas sextas e sábados
  const workDays = days.filter((day) => isFriday(day) || isSaturday(day));

  // Criar grupos
  const groups = await createGroupsWithPreferences(employees, db);

  if (groups.length === 0) {
    console.log("⚠️ Nenhum grupo formado com as preferências atuais");
    return [];
  }

  // Distribuir grupos pelos dias
  const schedules = [];
  let groupIndex = 0;

  for (const day of workDays) {
    const dateStr = format(day, "yyyy-MM-dd");
    const dayOfWeek = format(day, "EEEE", { locale: ptBR });
    const group = groups[groupIndex % groups.length];

    if (group && group.length >= 2) {
      // Verificar disponibilidade para o dia
      const dayAvailable = isAvailableForDay(group[0], day);
      const nightAvailable = isAvailableForDay(group[1], day);

      // Se o funcionário não está disponível, tentar trocar
      if (!dayAvailable || !nightAvailable) {
        console.log(
          `⚠️ Funcionário não disponível para ${dateStr}, ajustando...`
        );
        // Aqui você pode implementar uma lógica de reatribuição
      }

      schedules.push({
        date: dateStr,
        employee_id: group[0].id,
        shift: "day",
        notes: `Turno Diurno - ${dayOfWeek} (Grupo ${
          (groupIndex % groups.length) + 1
        })`,
      });

      schedules.push({
        date: dateStr,
        employee_id: group[1].id,
        shift: "night",
        notes: `Turno Noturno - ${dayOfWeek} (Grupo ${
          (groupIndex % groups.length) + 1
        })`,
      });
    }

    groupIndex++;
  }

  return schedules;
}

export { isFriday, isSaturday, isAvailableForDay };
