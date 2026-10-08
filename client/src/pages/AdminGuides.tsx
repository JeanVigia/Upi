import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { BookOpen, CheckCircle2, FilePlus2, LogOut, Pencil, ShieldAlert, X } from "lucide-react";
import { useEffect, useState } from "react";

type GuideForm = {
  id?: number;
  title: string;
  category: string;
  summary: string;
  content: string;
  status: "active" | "archived";
};

const emptyForm: GuideForm = {
  title: "",
  category: "Acadêmico / Professores",
  summary: "",
  content: "",
  status: "active",
};

export default function AdminGuides() {
  const { user, loading, logout } = useAuth();
  const utils = trpc.useUtils();
  const guidesQuery = trpc.guides.adminList.useQuery(undefined, { enabled: user?.role === "admin" });
  const createGuide = trpc.guides.create.useMutation({
    onSuccess: async () => {
      await utils.guides.adminList.invalidate();
      setForm(emptyForm);
      setNotice("Guia criado e publicado na base de conhecimento.");
    },
  });
  const updateGuide = trpc.guides.update.useMutation({
    onSuccess: async () => {
      await utils.guides.adminList.invalidate();
      setForm(emptyForm);
      setNotice("Guia atualizado com sucesso.");
    },
  });
  const [form, setForm] = useState<GuideForm>(emptyForm);
  const [notice, setNotice] = useState("");
  const [username, setUsername] = useState("Admin");
  const [password, setPassword] = useState("");
  const localLogin = trpc.auth.localLogin.useMutation({ onSuccess: () => window.location.reload() });

  useEffect(() => {
    if (createGuide.error) setNotice(createGuide.error.message);
    if (updateGuide.error) setNotice(updateGuide.error.message);
  }, [createGuide.error, updateGuide.error]);

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center bg-[#f3f7f8] text-sm text-[#5f7480]">Verificando acesso administrativo…</div>;
  }

  if (!user) {
    return <div className="flex min-h-screen items-center justify-center bg-[#f3f7f8] p-6"><AccessCard username={username} password={password} error={localLogin.error?.message} pending={localLogin.isPending} onUsernameChange={setUsername} onPasswordChange={setPassword} onLogin={() => localLogin.mutate({ username, password })} /></div>;
  }

  if (user.role !== "admin") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f3f7f8] p-6">
        <div className="w-full max-w-md rounded-2xl border border-[#dce7eb] bg-white p-8 text-center shadow-[0_16px_50px_rgba(0,54,80,.10)]">
          <ShieldAlert className="mx-auto mb-4 size-10 text-[#9c5d4d]" />
          <h1 className="text-xl font-semibold text-[#122b50]">Acesso restrito</h1>
          <p className="mt-2 text-sm leading-6 text-[#637984]">Esta área é exclusiva para administradores responsáveis pela base de conhecimento.</p>
          <Button className="mt-6 bg-[#122b50] hover:bg-[#0d1f38]" onClick={() => void logout()}>Sair</Button>
        </div>
      </div>
    );
  }

  const isSaving = createGuide.isPending || updateGuide.isPending;
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    setNotice("");
    if (form.id) {
      updateGuide.mutate(form as Required<GuideForm>);
    } else {
      createGuide.mutate({ title: form.title, category: form.category, summary: form.summary || undefined, content: form.content });
    }
  };

  return (
    <main className="min-h-screen bg-[#f3f7f8] text-[#294653]">
      <header className="border-b border-[#dce7eb] bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-xl bg-[#e6f0f3] text-[#122b50]"><BookOpen className="size-5" /></div>
            <div><p className="text-lg font-semibold text-[#122b50]">Upi · Administração</p><p className="text-xs text-[#71838c]">Base de conhecimento</p></div>
          </div>
          <div className="flex items-center gap-3 text-right"><div className="hidden sm:block"><p className="text-sm font-medium text-[#355563]">{user.name || "Administrador"}</p><p className="text-xs text-[#81929a]">Acesso administrativo</p></div><Button variant="outline" className="border-[#cbdbe2] text-[#496572]" onClick={() => void logout()}><LogOut className="mr-2 size-4" />Sair</Button></div>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-6 px-5 py-7 lg:grid-cols-[minmax(0,1fr)_380px] lg:px-8">
        <section className="order-2 rounded-2xl border border-[#dce7eb] bg-white p-5 shadow-[0_10px_35px_rgba(0,54,80,.06)] lg:order-1">
          <div className="mb-5 flex items-start justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[.16em] text-[#668490]">Guias cadastrados</p><h1 className="mt-1 text-2xl font-semibold text-[#122b50]">Base publicada</h1></div><span className="rounded-full bg-[#eaf3f5] px-3 py-1 text-xs font-semibold text-[#386576]">{guidesQuery.data?.length ?? 0} registros</span></div>
          {guidesQuery.isLoading && <p className="py-8 text-sm text-[#71838c]">Carregando guias…</p>}
          <div className="space-y-3">{guidesQuery.data?.map((guide) => <article key={guide.id} className="rounded-xl border border-[#e3ecef] p-4 transition hover:border-[#a9c5d0]">
            <div className="flex items-start justify-between gap-3"><div><div className="flex flex-wrap items-center gap-2"><h2 className="font-semibold text-[#164b61]">{guide.title}</h2><span className={guide.status === "active" ? "rounded-full bg-[#e9f5ee] px-2 py-0.5 text-[10px] font-semibold text-[#39704d]" : "rounded-full bg-[#f1f2f3] px-2 py-0.5 text-[10px] font-semibold text-[#68777d]"}>{guide.status === "active" ? "Publicado" : "Arquivado"}</span></div><p className="mt-1 text-xs text-[#78909a]">{guide.category}</p></div><Button variant="outline" size="sm" className="border-[#cbdbe2] text-[#416879]" onClick={() => setForm({ id: guide.id, title: guide.title, category: guide.category, summary: guide.summary || "", content: guide.content, status: guide.status })}><Pencil className="mr-1.5 size-3.5" />Editar</Button></div>
            {guide.summary && <p className="mt-3 line-clamp-2 text-sm leading-5 text-[#5c737d]">{guide.summary}</p>}
          </article>)}</div>
          {!guidesQuery.isLoading && !guidesQuery.data?.length && <div className="rounded-xl border border-dashed border-[#b9cfd8] p-8 text-center text-sm text-[#71838c]">Nenhum guia cadastrado.</div>}
        </section>

        <section className="order-1 rounded-2xl border border-[#dce7eb] bg-white p-5 shadow-[0_10px_35px_rgba(0,54,80,.06)] lg:order-2"><div className="mb-5 flex items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[.16em] text-[#668490]">Editor</p><h2 className="mt-1 text-xl font-semibold text-[#122b50]">{form.id ? "Editar guia" : "Adicionar guia"}</h2></div>{form.id && <Button variant="ghost" size="sm" className="text-[#6b818a]" onClick={() => setForm(emptyForm)}><X className="mr-1 size-4" />Cancelar</Button>}</div>
          <form onSubmit={submit} className="space-y-4"><label className="block text-sm font-medium text-[#43606d]">Título<Input required minLength={4} maxLength={180} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Ex.: Cadastro do Plano de Ensino" /></label><label className="block text-sm font-medium text-[#43606d]">Categoria<Input required minLength={2} maxLength={100} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="Acadêmico / Professores" /></label><label className="block text-sm font-medium text-[#43606d]">Resumo <span className="font-normal text-[#8a9aa1]">(opcional)</span><Input maxLength={500} value={form.summary} onChange={(e) => setForm({ ...form, summary: e.target.value })} placeholder="O que este guia ensina?" /></label><label className="block text-sm font-medium text-[#43606d]">Conteúdo do manual<Textarea required minLength={20} maxLength={50000} value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} placeholder="Descreva o procedimento em passos…" className="min-h-64 resize-y" /></label>{form.id && <label className="block text-sm font-medium text-[#43606d]">Status<select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as GuideForm["status"] })} className="mt-1 flex h-10 w-full rounded-md border border-[#cbdbe2] bg-white px-3 text-sm text-[#345765] outline-none focus:ring-2 focus:ring-[#c4dce5]"><option value="active">Publicado — usado pelo Upi</option><option value="archived">Arquivado — não usado pelo Upi</option></select></label>}{notice && <div className="flex items-start gap-2 rounded-lg bg-[#edf6f7] px-3 py-2 text-xs leading-5 text-[#376878]"><CheckCircle2 className="mt-0.5 size-4 shrink-0" />{notice}</div>}<Button type="submit" disabled={isSaving} className="w-full bg-[#122b50] hover:bg-[#0d1f38]">{isSaving ? "Salvando…" : form.id ? "Salvar alterações" : <><FilePlus2 className="mr-2 size-4" />Publicar guia</>}</Button></form>
        </section>
      </div>
    </main>
  );
}

function AccessCard({ username, password, error, pending, onUsernameChange, onPasswordChange, onLogin }: { username: string; password: string; error?: string; pending: boolean; onUsernameChange: (value: string) => void; onPasswordChange: (value: string) => void; onLogin: () => void }) {
  return <form onSubmit={(event) => { event.preventDefault(); onLogin(); }} className="w-full max-w-md rounded-2xl border border-[#dce7eb] bg-white p-8 shadow-[0_16px_50px_rgba(0,54,80,.10)]"><ShieldAlert className="mx-auto mb-4 size-10 text-[#122b50]" /><h1 className="text-center text-xl font-semibold text-[#122b50]">Área administrativa</h1><p className="mt-2 text-center text-sm leading-6 text-[#637984]">Entre com a conta local configurada no servidor.</p><label className="mt-6 block text-sm font-medium text-[#43606d]">Usuário<Input required value={username} onChange={(event) => onUsernameChange(event.target.value)} /></label><label className="mt-3 block text-sm font-medium text-[#43606d]">Senha<Input required type="password" value={password} onChange={(event) => onPasswordChange(event.target.value)} /></label>{error && <p className="mt-3 text-xs text-[#a34d43]">{error}</p>}<Button type="submit" disabled={pending} className="mt-6 w-full bg-[#122b50] hover:bg-[#0d1f38]">{pending ? "Entrando…" : "Entrar"}</Button></form>;
}
