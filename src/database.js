//src/database.js

import pkg from "pg";
const { Pool } = pkg;
import dotenv from "dotenv";
import bcrypt from "bcryptjs";

dotenv.config();

// Configuração do banco
const pool = new Pool({
  host: process.env.DB_HOST || "localhost",
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD || "Admin123*",
  database: process.env.DB_NAME || "vendas_online",
});

// Função para inicializar tabelas
export async function initializeDatabase() {
  const client = await pool.connect();

  try {
    // Criar tabela de usuários
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

    // Criar tabela de funcionários
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
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Criar tabela de escalas
    await client.query(`
      CREATE TABLE IF NOT EXISTS schedules (
        id SERIAL PRIMARY KEY,
        date DATE NOT NULL,
        employee_id INTEGER REFERENCES employees(id) ON DELETE CASCADE,
        shift VARCHAR(10) NOT NULL,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Criar tabela de incompatibilidades
    await client.query(`
      CREATE TABLE IF NOT EXISTS incompatibilities (
        id SERIAL PRIMARY KEY,
        employee_id INTEGER REFERENCES employees(id) ON DELETE CASCADE,
        incompatible_with INTEGER REFERENCES employees(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(employee_id, incompatible_with)
      )
    `);

    // Criar tabela de grupos mensais
    await client.query(`
      CREATE TABLE IF NOT EXISTS monthly_groups (
        id SERIAL PRIMARY KEY,
        year INTEGER NOT NULL,
        month INTEGER NOT NULL,
        groups_data JSONB NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(year, month)
      )
    `);

    // Inserir usuário admin padrão
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
    }

    // Inserir usuário comum padrão
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
    }

    // Inserir funcionários padrão
    const employeesCount = await client.query("SELECT COUNT(*) FROM employees");
    if (parseInt(employeesCount.rows[0].count) === 0) {
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
        ],
        [
          "Ana Costa",
          "Auxiliar",
          "ana@exemplo.com",
          "(11) 97654-3210",
          "Operações",
          "2024-01-05",
          "day",
          "active",
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
        ],
        [
          "Fernanda Rocha",
          "Garçonete",
          "fernanda@exemplo.com",
          "(11) 95432-1098",
          "Operações",
          "2023-06-15",
          "rotating",
          "active",
        ],
      ];

      for (const emp of employees) {
        await client.query(
          `INSERT INTO employees (name, position, email, phone, department, hire_date, shift, status) 
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          emp
        );
      }
    }

    // Inserir incompatibilidade Samuel e Thor
    const incompatExists = await client.query(
      `SELECT * FROM incompatibilities WHERE (employee_id = 2 AND incompatible_with = 5) OR (employee_id = 5 AND incompatible_with = 2)`
    );
    if (incompatExists.rows.length === 0) {
      await client.query(
        "INSERT INTO incompatibilities (employee_id, incompatible_with) VALUES ($1, $2)",
        [2, 5]
      );
      await client.query(
        "INSERT INTO incompatibilities (employee_id, incompatible_with) VALUES ($1, $2)",
        [5, 2]
      );
    }

    console.log("✅ Banco de dados PostgreSQL inicializado!");
  } catch (error) {
    console.error("Erro ao inicializar banco:", error);
    throw error;
  } finally {
    client.release();
  }

  return pool;
}

export function getDb() {
  return pool;
}
