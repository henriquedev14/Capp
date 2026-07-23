"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, ShieldOff, Loader2, Check, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PasswordInput } from "@/components/ui/password-input";
import {
  iniciarConfiguracao2FA,
  confirmarAtivacao2FA,
  desativar2FA,
} from "@/features/auth/actions/duplo-fator-actions";

interface Props {
  ativo: boolean;
  obrigatorio: boolean;
}

export function DuploFatorManager({ ativo: ativoInicial, obrigatorio }: Props) {
  const router = useRouter();
  const [ativo, setAtivo] = React.useState(ativoInicial);
  const [etapa, setEtapa] = React.useState<"idle" | "configurando" | "desativando">("idle");
  const [qrCodeDataUrl, setQrCodeDataUrl] = React.useState<string | null>(null);
  const [secretPendente, setSecretPendente] = React.useState<string | null>(null);
  const [codigo, setCodigo] = React.useState("");
  const [senhaAtual, setSenhaAtual] = React.useState("");
  const [erro, setErro] = React.useState<string | null>(null);
  const [carregando, setCarregando] = React.useState(false);

  async function iniciarAtivacao() {
    setErro(null);
    setCarregando(true);
    try {
      const r = await iniciarConfiguracao2FA();
      if ("erro" in r) {
        setErro(r.erro);
        return;
      }
      setQrCodeDataUrl(r.qrCodeDataUrl);
      setSecretPendente(r.secret);
      setEtapa("configurando");
    } finally {
      setCarregando(false);
    }
  }

  async function confirmar() {
    if (!secretPendente) return;
    setErro(null);
    setCarregando(true);
    try {
      const r = await confirmarAtivacao2FA(secretPendente, codigo);
      if ("erro" in r) {
        setErro(r.erro);
        return;
      }
      setAtivo(true);
      setEtapa("idle");
      setQrCodeDataUrl(null);
      setSecretPendente(null);
      setCodigo("");
      router.refresh();
    } finally {
      setCarregando(false);
    }
  }

  async function confirmarDesativacao() {
    setErro(null);
    setCarregando(true);
    try {
      const r = await desativar2FA(senhaAtual);
      if ("erro" in r) {
        setErro(r.erro);
        return;
      }
      setAtivo(false);
      setEtapa("idle");
      setSenhaAtual("");
      router.refresh();
    } finally {
      setCarregando(false);
    }
  }

  if (etapa === "configurando" && qrCodeDataUrl) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-4 pt-5 text-center">
          <p className="text-sm text-foreground">
            Escaneia esse QR code com o Google Authenticator, Authy, ou app parecido:
          </p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qrCodeDataUrl} alt="QR code de configuração do 2FA" className="h-48 w-48 rounded-lg border border-border" />
          <div className="flex w-full max-w-xs flex-col gap-2">
            <input
              value={codigo}
              onChange={(e) => setCodigo(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="Código de 6 dígitos"
              maxLength={6}
              inputMode="numeric"
              className="rounded-lg border border-input bg-background px-3 py-2 text-center tracking-[0.3em] focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            {erro && <p className="text-xs text-destructive">{erro}</p>}
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => {
                  setEtapa("idle");
                  setQrCodeDataUrl(null);
                  setSecretPendente(null);
                  setErro(null);
                }}
              >
                Cancelar
              </Button>
              <Button size="sm" className="flex-1" onClick={confirmar} disabled={carregando || codigo.length !== 6}>
                {carregando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                Confirmar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (etapa === "desativando") {
    return (
      <Card>
        <CardContent className="flex flex-col gap-3 pt-5">
          <p className="text-sm text-foreground">Confirma sua senha atual pra desativar o 2FA:</p>
          <PasswordInput
            value={senhaAtual}
            onChange={(e) => setSenhaAtual(e.target.value)}
            placeholder="Senha atual"
            className="focus-visible:ring-destructive/30"
          />
          {erro && <p className="text-xs text-destructive">{erro}</p>}
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => { setEtapa("idle"); setErro(null); setSenhaAtual(""); }}>
              Cancelar
            </Button>
            <Button
              size="sm"
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={confirmarDesativacao}
              disabled={carregando || !senhaAtual}
            >
              {carregando ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
              Desativar 2FA
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="flex items-center justify-between gap-3 pt-5">
        <div className="flex items-center gap-3">
          <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${ativo ? "bg-success/10" : "bg-secondary"}`}>
            {ativo ? <ShieldCheck className="h-[18px] w-[18px] text-success" /> : <ShieldOff className="h-[18px] w-[18px] text-muted-foreground" />}
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-medium text-foreground">Autenticação em 2 fatores</span>
            <span className="text-xs text-muted-foreground">
              {ativo ? "Ativada — pede código a cada login" : "Desativada"}
            </span>
          </div>
        </div>
        {ativo ? (
          obrigatorio ? (
            <span className="text-xs font-medium text-muted-foreground">
              Obrigatório (definido por Admin)
            </span>
          ) : (
            <Button variant="outline" size="sm" onClick={() => setEtapa("desativando")}>
              Desativar
            </Button>
          )
        ) : (
          <Button size="sm" onClick={iniciarAtivacao} disabled={carregando}>
            {carregando ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Ativar
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
