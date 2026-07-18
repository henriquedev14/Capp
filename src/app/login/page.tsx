import { HardHat } from "lucide-react";
import { Suspense } from "react";
import { LoginForm } from "@/features/auth/components/login-form";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen">
      {/* Painel esquerdo — identidade HGI */}
      <div
        className="hidden lg:flex lg:w-[45%] flex-col justify-between p-10 xl:p-14"
        style={{ background: "#0F1318" }}
      >
        {/* Logo HGI no topo */}
        <div className="flex items-center gap-3">
          <span className="text-xl font-black tracking-tight text-white">HGI</span>
          <div className="h-5 w-px bg-white/20" />
          <span className="text-xs font-semibold uppercase tracking-widest text-white/40">
            Grupo HGI
          </span>
        </div>

        {/* Conteúdo central */}
        <div className="flex flex-col gap-8">
          <div
            className="w-fit rounded-full border px-4 py-1.5 text-xs font-bold uppercase tracking-widest"
            style={{ borderColor: "#FF731D", color: "#FF731D" }}
          >
            Plataforma de Gestão
          </div>

          <div className="flex flex-col gap-4">
            <h1 className="text-3xl xl:text-4xl font-black leading-tight tracking-tight text-white">
              Soluções industriais{" "}
              <span style={{ color: "#FF731D" }}>inteligentes</span>
            </h1>
            <p className="text-sm leading-relaxed text-white/50 max-w-xs">
              Infraestrutura, tecnologia e inovação para grandes projetos industriais — tudo em um só lugar.
            </p>
          </div>
        </div>

        {/* Rodapé */}
        <div className="flex items-center justify-between">
          <p className="text-xs text-white/20">
            © {new Date().getFullYear()} Grupo HGI. Todos os direitos reservados.
          </p>
          <p className="text-xs text-white/20">v1.0.0</p>
        </div>
      </div>

      {/* Painel direito — formulário */}
      <div className="flex flex-1 flex-col items-center justify-center bg-white px-6 py-12 dark:bg-background">
        <div className="w-full max-w-sm">
          {/* Logo ConstructApp */}
          <div className="mb-10 flex flex-col items-center gap-3 text-center">
            <div
              className="flex h-[72px] w-[72px] items-center justify-center rounded-[22px]"
              style={{
                background: "linear-gradient(135deg, #FF8A2A, #FF5A00)",
                boxShadow: "0 16px 40px -10px rgba(255,106,0,0.55), inset 0 1px 0 rgba(255,255,255,0.3)",
              }}
            >
              <HardHat className="h-9 w-9 text-white" strokeWidth={2} />
            </div>
            <div className="flex flex-col leading-none">
              <span className="text-2xl font-bold tracking-tight text-gray-900 dark:text-foreground">
                Constru<span style={{ color: "#FF731D" }}>App</span>
              </span>
              <span className="mt-1.5 text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-muted-foreground">
                by HGI Group
              </span>
            </div>
          </div>

          {/* Formulário */}
          <div className="rounded-2xl border border-gray-100 bg-white p-8 shadow-sm dark:border-border dark:bg-card">
            <div className="mb-6">
              <h2 className="text-xl font-bold tracking-tight text-gray-900 dark:text-foreground">
                Entrar na sua conta
              </h2>
              <p className="mt-1.5 text-sm text-gray-500 dark:text-muted-foreground">
                Acesse com o e-mail e senha cadastrados pelo seu administrador.
              </p>
            </div>

            <Suspense fallback={null}>
              <LoginForm />
            </Suspense>
          </div>

          <p className="mt-6 text-center text-xs text-gray-400 dark:text-muted-foreground">
            Problemas para acessar?{" "}
            <a
              href="mailto:suporte@hgigroup.com.br"
              className="font-medium"
              style={{ color: "#FF731D" }}
            >
              Fale com o suporte
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
