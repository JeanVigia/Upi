import fs from "node:fs/promises";
import mysql from "mysql2/promise";

const manualPath = "/home/ubuntu/upload/manual_convertido.md";
const title = "Manual — Procedimentos no Sistema SEI";
const category = "Acadêmico / Secretaria";
const summary = "Procedimentos passo a passo do SEI para alunos, disciplinas, turmas, notas, documentos, comunicação interna, programação de aulas e matrículas.";

const content = await fs.readFile(manualPath, "utf8");
if (!content.trim()) throw new Error("O manual está vazio");
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL não configurada");

const connection = await mysql.createConnection(process.env.DATABASE_URL);
try {
  const [existing] = await connection.execute("SELECT id FROM guides WHERE title = ? LIMIT 1", [title]);
  if (Array.isArray(existing) && existing.length > 0) {
    await connection.execute(
      "UPDATE guides SET category = ?, summary = ?, content = ?, status = 'active' WHERE id = ?",
      [category, summary, content, existing[0].id],
    );
    console.log(`Guia atualizado: ${existing[0].id}`);
  } else {
    const [result] = await connection.execute(
      "INSERT INTO guides (title, category, summary, content, status) VALUES (?, ?, ?, ?, 'active')",
      [title, category, summary, content],
    );
    console.log(`Guia criado: ${result.insertId}`);
  }
} finally {
  await connection.end();
}
