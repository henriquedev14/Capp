"use client";

import * as React from "react";
import { Heart, X } from "lucide-react";

// Pop-up de paz/motivação — aparece nos horários combinados (08h, 12h,
// 16h, 20h), uma vez por horário por dia (guardado no localStorage do
// navegador para não repetir se a pessoa ficar com a aba aberta).
const HORARIOS = ["08:00", "12:00", "16:00", "20:00"];

const MENSAGENS = [
  "Respira fundo. Você está fazendo o seu melhor, e isso já é muito. 💛",
  "Um pouco de água, um pouco de alongamento — seu corpo agradece.",
  "Lembra: nenhum sistema é mais importante que o seu bem-estar hoje.",
  "Se o dia tá corrido, tudo bem pausar 2 minutinhos. O trabalho espera.",
  "Você é mais do que suas tarefas de hoje. Paz pra você. ✨",
  "Um café, uma pausa, um sorriso — pequenas coisas que fazem diferença.",
  "Obrigado por construir algo com tanto cuidado. Isso se nota.",
  "Se puder, olhe pela janela um instante. O dia também é seu.",
];

function horarioAtual(): string {
  const agora = new Date();
  return `${String(agora.getHours()).padStart(2, "0")}:${String(agora.getMinutes()).padStart(2, "0")}`;
}

function chaveDoDia(horario: string): string {
  const hoje = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  return `mensagem-motivacional:${hoje}:${horario}`;
}

export function MensagemMotivacional() {
  const [mensagem, setMensagem] = React.useState<string | null>(null);

  React.useEffect(() => {
    function verificar() {
      const agora = horarioAtual();
      if (!HORARIOS.includes(agora)) return;

      const chave = chaveDoDia(agora);
      try {
        if (localStorage.getItem(chave)) return; // já mostrou nesse horário hoje
        localStorage.setItem(chave, "1");
      } catch {
        // localStorage indisponível — mostra mesmo assim, sem persistir
      }

      const escolhida = MENSAGENS[Math.floor(Math.random() * MENSAGENS.length)];
      setMensagem(escolhida ?? null);
    }

    verificar(); // checa imediatamente ao montar (caso já esteja no minuto certo)
    const intervalo = setInterval(verificar, 30_000); // confere a cada 30s
    return () => clearInterval(intervalo);
  }, []);

  if (!mensagem) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[100] max-w-sm animate-in slide-in-from-bottom-4 fade-in duration-300">
      <div className="flex items-start gap-3 rounded-xl border border-primary/20 bg-card px-4 py-3.5 shadow-lg">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
          <Heart className="h-4 w-4 text-primary" fill="currentColor" />
        </div>
        <p className="flex-1 text-sm text-foreground leading-relaxed pt-1">{mensagem}</p>
        <button
          onClick={() => setMensagem(null)}
          className="text-muted-foreground hover:text-foreground shrink-0"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
