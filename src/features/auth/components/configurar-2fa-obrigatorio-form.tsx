"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ShieldAlert, Loader2, Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  iniciarConfiguracao2FA,
  confirmarAtivacao2FA,
} from "@/features/auth/actions/duplo-fator-actions";

export function Configurar2FAObrigatorioForm() {
  const router = useRouter();
  const [qrCodeDataUrl, setQrCodeDataUrl] = React.useState<string | null>(null);
  const [secretPendente, setSecretPendente] = React.useState<string | null>(null);
  const [codigo, setCodigo] = React.useState("");
  const [erro, setErro] = React.useState<string | null>(null);
  const [carregando, setCarregando] = React.useState(true);
  const [concluido, setConcluido] = React.useState(false);

  React.useEffect(() => {
    iniciarConfiguracao2FA().then((r) => {
      setCarregando(false);
      if ("erro" in r) {
        setErro(r.erro);
        return;
      }
      setQrCodeDataUrl(r.qrCodeDataUrl);
      setSecretPendente(r.secret);
    });
  }, []);

  async function confirmar() {
    if (!secretPendente) return;
    setErro(null);
    setCarregando(true);
    const r = await confirmarAtivacao2FA(secretPendente, codigo);
    setCarregando(false);
    if ("erro" in r) {
      setErro(r.erro);
      return;
    }
    setConcluido(true);
    setTimeout(() => {
      router.push("/painel");
      router.refresh();
    }, 1500);
  }

  if (concluido) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-secondary/30 px-4">
        <div className="w-full max-w-md rounded-xl border border-border bg-background p-8 text-center shadow-card-md">
          <Check className="mx-auto h-10 w-10 text-success" />
          <h1 className="mt-3 text-lg font-semibold text-foreground">2FA configurado!</h1>
          <p className="mt-1 text-sm text-muted-foreground">Entrando no sistema...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-secondary/30 px-4">
      <div className="w-full max-w-md rounded-xl border border-border bg-background p-8 shadow-card-md">
        <div className="mb-4 flex flex-col items-center gap-2 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-warning/10">
            <ShieldAlert className="h-6 w-6 text-warning" />
          </div>
          <h1 className="text-lg font-semibold text-foreground">
            Configuração de segurança obrigatória
          </h1>
          <p className="text-sm text-muted-foreground">
            O administrador exigiu autenticação em 2 fatores pra sua conta. Configure agora pra
            continuar — essa etapa não pode ser pulada.
          </p>
        </div>

        {carregando && !qrCodeDataUrl ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : qrCodeDataUrl ? (
          <div className="flex flex-col items-center gap-4">
            <p className="text-sm text-foreground">
              Escaneia com o Google Authenticator, Authy, ou app parecido:
            </p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={qrCodeDataUrl}
              alt="QR code de configuração do 2FA"
              className="h-48 w-48 rounded-lg border border-border"
            />
            <div className="flex w-full flex-col gap-2">
              <input
                value={codigo}
                onChange={(e) => setCodigo(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="Código de 6 dígitos"
                maxLength={6}
                inputMode="numeric"
                autoFocus
                className="rounded-lg border border-input bg-background px-3 py-2 text-center tracking-[0.3em] focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
              {erro && <p className="text-xs text-destructive">{erro}</p>}
              <Button onClick={confirmar} disabled={carregando || codigo.length !== 6}>
                {carregando ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Check className="mr-1.5 h-4 w-4" />}
                Confirmar e continuar
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-center text-sm text-destructive">{erro}</p>
        )}
      </div>
    </div>
  );
}
