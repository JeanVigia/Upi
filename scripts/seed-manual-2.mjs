import mysql from "mysql2/promise";

const title = "Registro de Aula — Guia passo a passo via SEI";
const category = "Acadêmico / Professores";
const summary = "Como acessar Registro de Aula, preencher campos obrigatórios, escolher a data, registrar observações e lançar a presença dos alunos.";
const content = `# Registro de Aula

Guia passo a passo via sistema SEI para professores.

## 1. Acessar o menu
Para iniciar o registro de uma aula, acesse o Sistema SEI. No menu lateral esquerdo, procure e clique na opção “Acadêmico”. No submenu que se abre, selecione “Registrar Aula”.

## 2. Preencher os campos obrigatórios
Na tela carregada, preencha todos os campos obrigatórios para liberar o calendário de aulas. Depois, selecione o dia em que deseja fazer o registro.

As datas sinalizadas com círculos vermelhos no calendário correspondem aos dias em que as aulas precisam ser registradas.

## 3. Selecionar a data e preencher o registro
Selecione a data desejada no calendário. Dois campos serão exibidos; preencha esses campos antes de passar para a próxima etapa.

## 4. Registrar a lista de presença
Role a página para baixo até encontrar a lista de alunos. Defina a presença de cada aluno: a opção “On” indica aluno presente e a opção “Off” indica aluno ausente.

Depois de revisar a lista de presença, clique no botão “Gravar” localizado na parte inferior da tela.

## Suporte
Em caso de dúvidas sobre o preenchimento do Plano de Ensino ou do Registro de Aula, consulte o departamento de T.I. para mais informações e suporte.`;

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
