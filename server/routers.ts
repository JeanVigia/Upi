import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { MessageContent, invokeLLM } from "./_core/llm";
import { adminProcedure, publicProcedure, router } from "./_core/trpc";
import { createTestAdminSession, TEST_ADMIN_COOKIE } from "./_core/context";
import { createGuide, getActiveGuides, getAllGuides, getDb, updateGuide } from "./db";
import { guides } from "../drizzle/schema";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { ENV } from "./_core/env";

const DEFAULT_GUIDES = [
  {
    id: -1,
    title: "Lançamento de notas e frequência",
    category: "Acadêmico",
    summary: "Como registrar, revisar e publicar notas da turma.",
    content:
      "Para lançar notas: 1) abra o menu Acadêmico; 2) acesse Diário de Classe; 3) selecione a turma e a disciplina; 4) entre na aba Notas; 5) preencha os campos e clique em Salvar. Para registrar presença, use a aba Frequência e finalize em Salvar. A publicação só deve ser feita depois da revisão dos lançamentos.",
  },
  {
    id: -2,
    title: "Acesso, permissões e troca de senha",
    category: "Acesso",
    summary: "Orientações para entrar no sistema e solicitar permissões.",
    content:
      "Para alterar a senha: abra o menu do usuário no canto superior direito, escolha Segurança e depois Alterar senha. Se um menu ou turma não aparecer, confirme se o vínculo acadêmico está ativo e solicite a revisão de permissão à coordenação. Não compartilhe sua senha com terceiros.",
  },
  {
    id: -3,
    title: "Relatórios da coordenação",
    category: "Gestão",
    summary: "Como localizar relatórios e acompanhar pendências.",
    content:
      "Para consultar relatórios: abra Avaliação Institucional ou Acadêmico, escolha Relatórios, aplique os filtros de período e turma e clique em Gerar. Se o relatório estiver vazio, revise os filtros e confirme se os lançamentos foram salvos antes de gerar novamente.",
  },
];

const messageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1).max(12000),
});

function normalizeAnswer(content: string | Array<{ type: string; text?: string }>) {
  if (typeof content === "string") return content.trim();
  return content
    .filter((part) => part.type === "text")
    .map((part) => part.text ?? "")
    .join("\n")
    .trim();
}

export function selectChatModel(imageDataUrl?: string) {
  return imageDataUrl ? "gemini-3.1-pro-preview" : "gemini-3-flash-preview";
}

export function responseNeedsContinuation(finishReason: string | null | undefined) {
  return finishReason === "length";
}

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    testAdminLogin: publicProcedure
      .input(z.object({ username: z.string(), password: z.string() }))
      .mutation(async ({ ctx, input }) => {
        if (!ENV.testAdminPassword || input.username !== "Admin" || input.password !== ENV.testAdminPassword) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "Usuário ou senha de teste inválidos." });
        }
        const token = await createTestAdminSession();
        if (!token) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Login de teste indisponível." });
        ctx.res.cookie(TEST_ADMIN_COOKIE, token, { ...getSessionCookieOptions(ctx.req), maxAge: 60 * 60 * 1000 });
        return { success: true } as const;
      }),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      ctx.res.clearCookie(TEST_ADMIN_COOKIE, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  guides: router({
    list: publicProcedure.query(async () => {
      const savedGuides = await getActiveGuides();
      return savedGuides.length > 0 ? savedGuides : DEFAULT_GUIDES;
    }),
    adminList: adminProcedure.query(async () => getAllGuides()),
    create: adminProcedure
      .input(
        z.object({
          title: z.string().trim().min(4).max(180),
          category: z.string().trim().min(2).max(100),
          summary: z.string().trim().max(500).optional(),
          content: z.string().trim().min(20).max(50000),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        try {
          const db = await getDb();
          if (!db) throw new Error("Database unavailable");
          return createGuide({ ...input, status: "active" });
        } catch {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Não foi possível salvar este guia." });
        }
      }),
    update: adminProcedure
      .input(
        z.object({
          id: z.number().int().positive(),
          title: z.string().trim().min(4).max(180),
          category: z.string().trim().min(2).max(100),
          summary: z.string().trim().max(500).optional(),
          content: z.string().trim().min(20).max(50000),
          status: z.enum(["active", "archived"]),
        }),
      )
      .mutation(async ({ input }) => {
        try {
          return await updateGuide(input.id, {
            title: input.title,
            category: input.category,
            summary: input.summary,
            content: input.content,
            status: input.status,
          });
        } catch {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Não foi possível atualizar este guia." });
        }
      }),
  }),

  ai: router({
    chat: publicProcedure
      .input(
        z.object({
          messages: z.array(messageSchema).min(1).max(12),
          imageDataUrl: z.string().max(8_000_000).optional(),
        }),
      )
      .mutation(async ({ input }) => {
        const savedGuides = await getActiveGuides();
        const knowledge = (savedGuides.length > 0 ? savedGuides : DEFAULT_GUIDES)
          .map((guide) => `GUIA: ${guide.title}\nCATEGORIA: ${guide.category}\nCONTEÚDO:\n${guide.content}`)
          .join("\n\n---\n\n");

        const systemPrompt = `Você é o Upi, assistente interno do sistema acadêmico. Responda sempre em português do Brasil, com linguagem clara, cordial e prática.\n\nREGRA INEGOCIÁVEL: sua única fonte de verdade é a BASE DE GUIAS abaixo. Não use conhecimento geral, não invente nomes de telas, botões, permissões ou procedimentos. Se a pergunta não estiver coberta pelos guias, diga exatamente que não encontrou essa orientação na base disponível e recomende procurar a coordenação.\n\nQuando houver um print, não use cores para identificar ou diferenciar botões, menus ou ícones. Ignore completamente azul, roxo, vinho, tonalidades, brilho e contraste como critérios de decisão. Priorize, nesta ordem: (1) texto visível no elemento, (2) formato e contorno — circular, quadrado, retangular, arredondado ou apenas ícone —, (3) desenho do ícone — engrenagem, lápis, lixeira, seta, clipe, disquete ou outro formato claramente visível —, (4) posição e relação com os demais elementos e (5) rótulos, campos e títulos próximos. Descreva o formato do ícone ou botão somente quando ele estiver realmente visível; se a imagem estiver pequena, cortada, borrada ou ambígua, diga isso e peça um print mais nítido. Nunca conclua algo que não possa ser sustentado pelos guias ou claramente observado no print.\n\nFormato preferido: uma resposta direta, passos numerados quando aplicável e uma linha final “Fonte: ...” com o(s) título(s) do guia usado(s).\n\nBASE DE GUIAS:\n${knowledge}`;

        const history: Array<{ role: "user" | "assistant"; content: MessageContent | MessageContent[] }> = input.messages.slice(-8).map((message) => ({
          role: message.role,
          content: message.content,
        }));
        const last = history[history.length - 1];
        if (input.imageDataUrl && last.role === "user") {
          const lastText = typeof last.content === "string" ? last.content : "";
          const lastContent: MessageContent[] = [
            { type: "text", text: lastText },
            { type: "image_url", image_url: { url: input.imageDataUrl, detail: "high" } },
          ];
          history[history.length - 1] = { ...last, content: lastContent };
        }

        const response = await invokeLLM({
          model: selectChatModel(input.imageDataUrl),
          maxTokens: 2400,
          messages: [
            { role: "system", content: systemPrompt },
            ...history,
          ],
        });
        const firstChoice = response.choices[0];
        let answer = normalizeAnswer(firstChoice?.message.content ?? "");

        if (responseNeedsContinuation(firstChoice?.finish_reason) && answer) {
          const continuation = await invokeLLM({
            model: selectChatModel(input.imageDataUrl),
            maxTokens: 1200,
            messages: [
              { role: "system", content: systemPrompt },
              ...history,
              { role: "assistant", content: answer },
              { role: "user", content: "Continue exatamente do ponto em que parou. Não repita o que já foi escrito, conclua todos os passos e finalize a resposta." },
            ],
          });
          const continuationText = normalizeAnswer(continuation.choices[0]?.message.content ?? "");
          if (continuationText) answer = `${answer}\n\n${continuationText}`;
        }

        if (!answer) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "A IA não retornou uma resposta." });

        return {
          answer,
          imageAnalyzed: Boolean(input.imageDataUrl),
          // The answer itself includes the guide source selected by the model.
          // Do not claim every active guide was used for every response.
          usedGuideTitles: [],
        };
      }),
  }),
});

export type AppRouter = typeof appRouter;
