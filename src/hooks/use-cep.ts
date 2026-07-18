"use client";

import * as React from "react";

export interface EnderecoViaCep {
  logradouro: string;
  bairro: string;
  localidade: string;
  uf: string;
  erro?: boolean;
}

export type StatusCep = "idle" | "buscando" | "encontrado" | "nao_encontrado" | "erro";

interface UseCepOptions {
  onEncontrado: (dados: EnderecoViaCep) => void;
}

/**
 * Hook que monitora um valor de CEP e, quando completo (8 dígitos),
 * busca automaticamente o endereço na API pública do ViaCEP.
 * A API é gratuita, pública e CORS-friendly — chamada direto do browser.
 */
export function useCep({ onEncontrado }: UseCepOptions) {
  const [status, setStatus] = React.useState<StatusCep>("idle");
  const abortRef = React.useRef<AbortController | null>(null);

  async function buscarCep(cep: string) {
    const digits = cep.replace(/\D/g, "");
    if (digits.length !== 8) {
      setStatus("idle");
      return;
    }

    abortRef.current?.abort();
    abortRef.current = new AbortController();

    setStatus("buscando");

    try {
      const resp = await fetch(`https://viacep.com.br/ws/${digits}/json/`, {
        signal: abortRef.current.signal,
      });

      if (!resp.ok) {
        setStatus("erro");
        return;
      }

      const dados: EnderecoViaCep = await resp.json();

      if (dados.erro) {
        setStatus("nao_encontrado");
        return;
      }

      setStatus("encontrado");
      onEncontrado(dados);
    } catch (e) {
      if (e instanceof Error && e.name === "AbortError") return;
      setStatus("erro");
    }
  }

  return { status, buscarCep };
}
