import pkg from "pg";
const { Pool } = pkg;
import dotenv from "dotenv";
import bcrypt from "bcryptjs";

dotenv.config();

const pool = new Pool({
  host: process.env.DB_HOST || "localhost",
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD || "Admin123*",
  database: process.env.DB_NAME || "vendas_online",
});

export async function initializeDatabase() {
  const client = await pool.connect();

  try {
    console.log("🔃 Criando tabelas...");

    // Tabela de usuários
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(20) DEFAULT 'user',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Tabela de funcionários
    await client.query(`
      CREATE TABLE IF NOT EXISTS employees (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        position VARCHAR(100) NOT NULL,
        email VARCHAR(100),
        phone VARCHAR(20),
        department VARCHAR(100),
        hire_date DATE,
        shift VARCHAR(20) DEFAULT 'day',
        status VARCHAR(20) DEFAULT 'active',
        preference VARCHAR(20) DEFAULT 'both',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Tabela de incompatibilidades
    await client.query(`
      CREATE TABLE IF NOT EXISTS incompatibilities (
        id SERIAL PRIMARY KEY,
        employee_id INTEGER REFERENCES employees(id) ON DELETE CASCADE,
        incompatible_with INTEGER REFERENCES employees(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(employee_id, incompatible_with)
      )
    `);

    // Tabela de grupos fixos
    await client.query(`
      CREATE TABLE IF NOT EXISTS fixed_groups (
        id SERIAL PRIMARY KEY,
        group_order INTEGER NOT NULL,
        employee1_id INTEGER REFERENCES employees(id) ON DELETE CASCADE,
        employee2_id INTEGER REFERENCES employees(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log("✅ Tabelas criadas");

    // Inserir admin
    const adminExists = await client.query(
      "SELECT * FROM users WHERE email = $1",
      ["admin@exemplo.com"]
    );
    if (adminExists.rows.length === 0) {
      const hashedPassword = await bcrypt.hash("admin123", 10);
      await client.query(
        "INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4)",
        ["Administrador", "admin@exemplo.com", hashedPassword, "admin"]
      );
      console.log("✅ Admin criado");
    }

    // ============================================
    // INSERIR USUÁRIO COMUM
    // ============================================
    const userExists = await client.query(
      "SELECT * FROM users WHERE email = $1",
      ["usuario@exemplo.com"]
    );
    if (userExists.rows.length === 0) {
      const hashedPassword = await bcrypt.hash("user123", 10);
      await client.query(
        "INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4)",
        ["Usuário Comum", "usuario@exemplo.com", hashedPassword, "user"]
      );
      console.log("✅ Usuário comum criado (usuario@exemplo.com / user123)");
    }

    // Inserir funcionários
    const empCount = await client.query("SELECT COUNT(*) FROM employees");
    if (parseInt(empCount.rows[0].count) === 0) {
      const employees = [
        [
          "Bruno Silva",
          "Garçom",
          "bruno@exemplo.com",
          "(11) 98765-4321",
          "Operações",
          "2023-01-15",
          "night",
          "active",
          "friday",
        ],
        [
          "Samuel Santos",
          "Garçonete",
          "samuel@exemplo.com",
          "(11) 91234-5678",
          "Operações",
          "2023-03-20",
          "day",
          "active",
          "saturday",
        ],
        [
          "Amadeu Oliveira",
          "Cozinheiro",
          "amadeu@exemplo.com",
          "(11) 99876-5432",
          "Cozinha",
          "2022-08-10",
          "night",
          "active",
          "both",
        ],
        [
          "Anderson Rocha",
          "Auxiliar",
          "anderson@exemplo.com",
          "(11) 97654-3210",
          "Operações",
          "2024-01-05",
          "day",
          "active",
          "both",
        ],
        [
          "Thor Lima",
          "Gerente",
          "thor@exemplo.com",
          "(11) 96543-2109",
          "Gestão",
          "2022-01-10",
          "day",
          "active",
          "friday",
        ],
        [
          "Laise Costa",
          "Garçonete",
          "laise@exemplo.com",
          "(11) 95432-1098",
          "Operações",
          "2023-06-15",
          "rotating",
          "active",
          "saturday",
        ],
      ];

      for (const emp of employees) {
        await client.query(
          `INSERT INTO employees (name, position, email, phone, department, hire_date, shift, status, preference) 
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          emp
        );
      }
      console.log("✅ Funcionários criados");
    }

    console.log("✅ Banco inicializado!");
  } catch (error) {
    console.error("❌ Erro:", error.message);
  } finally {
    client.release();
  }

  return pool;
}

export function getDb() {
  return pool;
}
