import { trpc } from "@/lib/trpc";
import { FileImage, Loader2, LockKeyhole, Paperclip, Send, ShieldCheck, X } from "lucide-react";
import { ClipboardEvent, FormEvent, useEffect, useRef, useState } from "react";
import { Streamdown } from "streamdown";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  source?: string[];
  image?: string;
};

const initialMessages: ChatMessage[] = [
  {
    role: "assistant",
    content:
      "Olá! Eu sou o **Upi**, seu assistente para o sistema acadêmico.\n\nPosso guiar você com base nos manuais oficiais. Descreva o que precisa fazer ou envie um print da tela em que encontrou dificuldade.",
    source: ["Base de guias do sistema acadêmico"],
  },
];

export default function Home() {
  const chatMutation = trpc.ai.chat.useMutation();
  const embedded = window.location.pathname === "/widget";
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [draft, setDraft] = useState("");
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [imageName, setImageName] = useState<string | null>(null);
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [adminUsername, setAdminUsername] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const adminLoginMutation = trpc.auth.testAdminLogin.useMutation({
    onSuccess: () => { window.location.href = "/admin/guias"; },
  });
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const scroll = scrollRef.current;
    if (scroll) scroll.scrollTop = scroll.scrollHeight;
  }, [messages, chatMutation.isPending]);

  useEffect(() => {
    if (!embedded && draft === "O André foi buscar mais café") {
      setDraft("");
      setShowAdminLogin(true);
    }
  }, [draft, embedded]);

  const sendMessage = (content = draft) => {
    const trimmed = content.trim();
    if ((!trimmed && !imageDataUrl) || chatMutation.isPending) return;

    const attachedImage = imageDataUrl ?? undefined;
    const nextMessages: ChatMessage[] = [
      ...messages,
      {
        role: "user",
        content: trimmed || "Analise este print e me diga o que devo fazer.",
        image: attachedImage,
      },
    ];
    setMessages(nextMessages);
    setDraft("");
    setImageDataUrl(null);
    setImageName(null);

    chatMutation.mutate(
      {
        messages: nextMessages.map(({ role, content }) => ({ role, content })),
        imageDataUrl: attachedImage,
      },
      {
        onSuccess: (result) => {
          setMessages((current) => [
            ...current,
            { role: "assistant", content: result.answer, source: result.usedGuideTitles.length > 0 ? result.usedGuideTitles : undefined },
          ]);
        },
        onError: () => {
          setMessages((current) => [
            ...current,
            {
              role: "assistant",
              content: "Não consegui consultar a base de guias agora. Tente novamente em instantes ou procure a coordenação.",
            },
          ]);
        },
      },
    );
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    sendMessage();
  };

  const handleFileChange = (file?: File) => {
    if (!file || !file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = () => {
      setImageDataUrl(String(reader.result));
      setImageName(file.name);
    };
    reader.readAsDataURL(file);
  };

  const handlePaste = (event: ClipboardEvent<HTMLTextAreaElement>) => {
    const imageItem = Array.from(event.clipboardData.items).find((item) => item.kind === "file" && item.type.startsWith("image/"));
    const pastedImage = imageItem?.getAsFile();
    if (!pastedImage) return;

    event.preventDefault();
    handleFileChange(new File([pastedImage], "imagem-da-area-de-transferencia.png", { type: pastedImage.type || "image/png" }));
  };

  return (
    <main className={embedded ? "min-h-screen bg-transparent text-[#46434a]" : "min-h-screen bg-[#f8f7f8] p-3 text-[#46434a] sm:p-6"}>
      <section className={embedded ? "mx-auto flex h-screen w-full flex-col overflow-hidden bg-white" : "mx-auto flex h-[calc(100vh-1.5rem)] max-w-5xl flex-col overflow-hidden rounded-2xl border border-[#d6e0ea] bg-white shadow-[0_12px_40px_rgba(18,43,80,0.12)] sm:h-[calc(100vh-3rem)]"}>
        <div className="flex items-center border-b border-[#eee8ec] px-5 py-4 sm:px-7">
          <div className="flex items-center gap-3">
            <AssistantMark size="md" />
            <div>
              <div className="font-semibold text-[#122b50]">Upi</div>
              <div className="text-xs text-[#817981]">Assistente acadêmico da UniPinhal</div>
            </div>
            {embedded && <button type="button" aria-label="Fechar Upi" onClick={() => window.parent.postMessage({ type: "up-one-close" }, "*")} className="ml-auto rounded-lg px-2 py-1 text-lg leading-none text-[#718593] transition hover:bg-[#e9f7f7] hover:text-[#122b50]">×</button>}
          </div>
        </div>

        <div ref={scrollRef} className="flex-1 space-y-5 overflow-y-auto px-4 py-5 sm:px-10 sm:py-8">
          {messages.map((message, index) => <ChatBubble key={`${index}-${message.role}`} message={message} />)}
          {chatMutation.isPending && <div className="flex items-start gap-3"><AssistantMark size="sm" /><div className="rounded-2xl rounded-tl-md bg-[#f0f5f8] px-4 py-3 text-sm text-[#526a7f]"><span className="mr-2">Consultando os guias</span><span className="inline-flex gap-1 align-middle"><i className="size-1.5 animate-bounce rounded-full bg-[#12cfd2]" /><i className="size-1.5 animate-bounce rounded-full bg-[#12cfd2] [animation-delay:120ms]" /><i className="size-1.5 animate-bounce rounded-full bg-[#12cfd2] [animation-delay:240ms]" /></span></div></div>}
        </div>

        <div className="border-t border-[#e5ebf1] bg-[#fbfcfd] p-4 sm:p-5">
          {imageName && <div className="mx-auto mb-2 flex max-w-4xl items-center gap-2 rounded-lg border border-[#c9dce5] bg-[#f0f6f8] px-3 py-2 text-xs text-[#122b50]"><FileImage className="size-4" /><span className="min-w-0 flex-1 truncate">{imageName}</span><button aria-label="Remover anexo" onClick={() => { setImageDataUrl(null); setImageName(null); }}><X className="size-4" /></button></div>}
          <form onSubmit={handleSubmit} className="mx-auto flex max-w-4xl items-end gap-2 rounded-xl border border-[#cbdbe4] bg-white p-2 shadow-[0_2px_5px_rgba(18,43,80,0.05)] focus-within:border-[#5b879f] focus-within:ring-2 focus-within:ring-[#e4eef2]"><input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(event) => handleFileChange(event.target.files?.[0])} /><button type="button" className="mb-0.5 rounded-lg p-2 text-[#718593] transition hover:bg-[#e9f7f7] hover:text-[#122b50]" aria-label="Anexar print" onClick={() => fileInputRef.current?.click()}><Paperclip className="size-[18px]" /></button><textarea value={draft} onChange={(event) => setDraft(event.target.value)} onPaste={handlePaste} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); handleSubmit(event); } }} placeholder="Descreva sua dúvida ou anexe um print..." rows={1} className="max-h-28 min-h-10 flex-1 resize-none border-0 bg-transparent px-1 py-2 text-sm text-[#334e60] outline-none placeholder:text-[#8da0ab]" disabled={chatMutation.isPending} /><button type="submit" disabled={chatMutation.isPending || (!draft.trim() && !imageDataUrl)} className={`flex size-10 shrink-0 items-center justify-center rounded-lg bg-[#122b50] text-white transition hover:bg-[#0d1f38] disabled:cursor-not-allowed disabled:bg-[#b8c8d1] ${chatMutation.isPending ? "animate-pulse motion-reduce:animate-none shadow-[0_0_0_3px_rgba(18,207,210,0.18)] motion-reduce:shadow-[0_0_0_3px_rgba(18,207,210,0.32)]" : ""}`} aria-label="Enviar mensagem" aria-busy={chatMutation.isPending}>{chatMutation.isPending ? <Loader2 className="size-4 animate-spin text-[#12cfd2] motion-reduce:animate-none" /> : <Send className="size-4 text-[#12cfd2]" />}</button></form>
          <div className="mx-auto mt-2 flex max-w-4xl items-center justify-between px-1 text-[10px] text-[#8492a1]"><span>Enter para enviar · Shift + Enter para quebrar linha</span><span className="flex items-center gap-1"><ShieldCheck className="size-3" /> Uso interno</span></div>
        </div>
      </section>
      {!embedded && showAdminLogin && <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#122b50]/30 p-4 backdrop-blur-sm"><div role="dialog" aria-modal="true" aria-labelledby="admin-login-title" className="w-full max-w-sm rounded-2xl border border-[#d7e2e8] bg-white p-6 shadow-[0_18px_60px_rgba(0,54,80,.25)]"><div className="mb-5 flex items-start justify-between"><div><div className="mb-3 flex size-10 items-center justify-center rounded-xl bg-[#eaf2f5] text-[#122b50]"><LockKeyhole className="size-5" /></div><h2 id="admin-login-title" className="text-lg font-semibold text-[#122b50]">Acesso administrativo</h2><p className="mt-1 text-xs text-[#718593]">Login de teste para gerenciar os guias.</p></div><button type="button" aria-label="Fechar login administrativo" onClick={() => setShowAdminLogin(false)} className="rounded-lg p-1 text-[#718593] hover:bg-[#eef4f6]"><X className="size-4" /></button></div><form onSubmit={(event) => { event.preventDefault(); adminLoginMutation.mutate({ username: adminUsername, password: adminPassword }); }} className="space-y-3"><label className="block text-sm font-medium text-[#43606d]">Usuário<input autoFocus required value={adminUsername} onChange={(event) => setAdminUsername(event.target.value)} className="mt-1 h-10 w-full rounded-md border border-[#cbdbe2] px-3 text-sm outline-none focus:ring-2 focus:ring-[#c4dce5]" placeholder="Admin" /></label><label className="block text-sm font-medium text-[#43606d]">Senha<input required type="password" value={adminPassword} onChange={(event) => setAdminPassword(event.target.value)} className="mt-1 h-10 w-full rounded-md border border-[#cbdbe2] px-3 text-sm outline-none focus:ring-2 focus:ring-[#c4dce5]" placeholder="Senha cadastrada no servidor" /></label>{adminLoginMutation.error && <p className="text-xs text-[#a34d43]">{adminLoginMutation.error.message}</p>}<button type="submit" disabled={adminLoginMutation.isPending} className="w-full rounded-lg bg-[#122b50] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0d1f38] disabled:opacity-60">{adminLoginMutation.isPending ? "Entrando…" : "Entrar"}</button></form></div></div>}
    </main>
  );
}

function ChatBubble({ message }: { message: ChatMessage }) {
  if (message.role === "user") {
    return <div className="flex justify-end"><div className="max-w-[86%]"><div className="rounded-2xl rounded-tr-md bg-[#122b50] px-4 py-3 text-sm leading-relaxed text-white shadow-sm">{message.image && <div className="mb-2 flex items-center gap-2 border-b border-white/20 pb-2 text-xs text-white/75"><FileImage className="size-4" /> Print anexado</div>}{message.content}</div><div className="mt-1 text-right text-[10px] text-[#7d929f]">Agora</div></div></div>;
  }
  return <div className="flex items-start gap-3"><AssistantMark size="sm" /><div className="max-w-[88%]"><div className="rounded-2xl rounded-tl-md bg-[#f0f5f8] px-4 py-3 text-sm leading-relaxed text-[#334e60]"><Streamdown>{message.content}</Streamdown></div>{message.source && <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[10px] text-[#718593]"><span className="font-semibold text-[#315f80]">Fonte:</span>{message.source.slice(0, 3).map((source) => <span key={source} className="rounded-full border border-[#d6e1ea] bg-white px-2 py-0.5">{source}</span>)}</div>}</div></div>;
}

function AssistantMark({ size }: { size: "sm" | "md" }) {
  return <div className={size === "md" ? "flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[#eaf2f5]" : "mt-1 flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#eaf2f5]"}><img src="/manus-storage/up-one-bot-transparent_f1fc341d.png" alt="" className="size-full object-contain" /></div>;
}
