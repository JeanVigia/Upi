import mysql from "mysql2/promise";

const title = "Cadastro do Plano de Ensino — Guia Rápido";
const category = "Acadêmico / Professores";
const summary = "Fluxo em quatro etapas para localizar a disciplina, iniciar um novo documento, preencher os dados e o formulário acadêmico e gravar o plano de ensino.";
const content = `# Cadastro do Plano de Ensino

Guia rápido para registrar sua disciplina no sistema acadêmico.

## Caminho crítico em quatro etapas

1. **Acessar:** localizar a disciplina e iniciar um novo documento.
2. **Dados iniciais:** preencher a identificação, o período e o turno.
3. **Formulário do Plano de Ensino:** preencher as seções acadêmicas.
4. **Conclusão:** gravar e finalizar o processo.

## 1. Acessar: iniciar o documento

Acesse a tela do Plano de Ensino, localize a disciplina desejada e clique no ícone de **novo documento**, representado por uma folha com a ponta dobrada.

## 2. Dados iniciais: identificação da disciplina

Preencha os campos solicitados:

- **Descrição:** insira o nome da disciplina.
- **Ano e Semestre:** informe o período correspondente.
- **Turno:** indique o horário, por exemplo, “Noturno 90 min”.

Confirme se os dados estão corretos antes de avançar.

## 3. Formulário do Plano de Ensino

Avance para a aba **Formulário do Plano de Ensino** e preencha as seções solicitadas:

- Justificativa;
- Ementa;
- Semanas;
- Competências Humanísticas;
- Competências Específicas do Nível.

## 4. Conclusão: salvar o progresso

Depois de preencher todos os dados, desça até a parte inferior da página e clique no botão **GRAVAR** para salvar e finalizar o processo.

**Atenção:** sair da página antes de clicar em “GRAVAR” pode resultar na perda dos dados preenchidos.

## Checklist de conclusão

- [ ] Disciplina localizada;
- [ ] Ícone de novo documento selecionado;
- [ ] Dados iniciais preenchidos;
- [ ] Formulário preenchido;
- [ ] Dados gravados.

O processo estará concluído quando o plano estiver gravado no sistema.`;

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

  const [rows] = await connection.execute(
    "SELECT id, title, status, CHAR_LENGTH(content) AS contentLength FROM guides WHERE title = ? LIMIT 1",
    [title],
  );
  console.log("Verificação:", JSON.stringify(rows));
} finally {
  await connection.end();
}
