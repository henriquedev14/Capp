export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Pencil,
  MapPin,
  Building2,
  Calendar,
  User,
  FileText,
  Calculator,
  Factory,
  FileUp,
  Layers,
  DoorOpen,
  Lock,
  Eye,
  AlertTriangle,
} from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/features/empreendimentos/components/status-badge";
import { TierBadge } from "@/features/tiers/components/tier-badge";
import { StatusChangeButton } from "@/features/empreendimentos/components/status-change-button";
import { Timeline } from "@/features/empreendimentos/components/timeline";
import { listarDocumentosEmpreendimento } from "@/features/documentos/actions/documento-actions";
import { ExcluirEmpreendimentoButton } from "@/features/empreendimentos/components/excluir-empreendimento-button";
import { MenuAcoesSecundarias } from "@/components/ui/menu-acoes-secundarias";
import { JornadaEmpreendimento } from "@/features/empreendimentos/components/jornada-empreendimento";
import { calcularStatusProducaoEmpreendimento } from "@/features/producao/lib/gestao-producao";
import { TIPOS_EMPREENDIMENTO, TIPOS_ESTRUTURA } from "@/features/empreendimentos/constants";
import { EmpreendimentoPrismaRepository } from "@/infra/db/prisma/repositories/empreendimento-prisma-repository";
import { UsuarioPrismaRepository } from "@/infra/db/prisma/repositories/usuario-prisma-repository";
import { EstruturaFisicaPrismaRepository } from "@/infra/db/prisma/repositories/estrutura-fisica-prisma-repository";
import { TimelinePrismaRepository } from "@/infra/db/prisma/repositories/timeline-prisma-repository";
import { LevantamentoPrismaRepository } from "@/infra/db/prisma/repositories/levantamento-prisma-repository";
import { LevantamentoHidraulicoPrismaRepository } from "@/infra/db/prisma/repositories/levantamento-hidraulico-prisma-repository";
import { LevantamentoMateriaisPrismaRepository } from "@/infra/db/prisma/repositories/levantamento-materiais-prisma-repository";
import { ehGestorSenior } from "@/infra/auth/eh-gestor-senior";
import { getServerSession } from "next-auth";
import { authOptions } from "@/infra/auth/auth-options.full";
import { prisma } from "@/infra/db/prisma/client";
import { ResponsabilidadeEtapaCard } from "@/features/empreendimentos/components/responsabilidade-etapa-card";
import { CronogramaRemessasCard } from "@/features/empreendimentos/components/cronograma-remessas-card";
import { listarPavimentosParaCronograma } from "@/features/empreendimentos/actions/cronograma-remessas-actions";

const empreendimentoRepo = new EmpreendimentoPrismaRepository();
const usuarioRepo = new UsuarioPrismaRepository();
const estruturaFisicaRepo = new EstruturaFisicaPrismaRepository();
const timelineRepo = new TimelinePrismaRepository();
const levantamentoRepo = new LevantamentoPrismaRepository();
const levantamentoHidraulicoRepo = new LevantamentoHidraulicoPrismaRepository();
const levantamentoMateriaisRepo = new LevantamentoMateriaisPrismaRepository();

function labelTipo(tipo: string): string {
  return TIPOS_EMPREENDIMENTO.find((t) => t.value === tipo)?.label ?? tipo;
}

function labelEstrutura(tipo?: string | null): string {
  if (!tipo) return "Não informado";
  return TIPOS_ESTRUTURA.find((t) => t.value === tipo)?.label ?? tipo;
}

function formatarData(data?: Date | null): string {
  if (!data) return "Não definida";
  return new Date(data).toLocaleDateString("pt-BR");
}

export default async function EmpreendimentoDetalhePage({
  params,
}: {
  params: { id: string };
}) {
  const empreendimento = await empreendimentoRepo.findById(params.id);
  if (!empreendimento) notFound();
  const podeAlterarStatusLivremente = await ehGestorSenior();
  const sessao = await getServerSession(authOptions);
  const conclusoes = await prisma.empreendimento.findUnique({
    where: { id: params.id },
    select: { comercialConcluidoEm: true, engenhariaConcluidaEm: true, orcamentacaoConcluidaEm: true },
  });
  const linhasCronograma = await listarPavimentosParaCronograma(params.id);
  const statusProducaoEmpreendimento = await calcularStatusProducaoEmpreendimento(params.id);

  // Central de Pendências — só o que dá pra afirmar com dado real já
  // disponível nessa página, sem inventar. Cada item aponta pra onde
  // resolver, não fica genérico tipo "atenção".
  const remessasSemPlanejamento = linhasCronograma.filter((l) => !l.dataPrevistaRemessa).length;
  const pendencias: { titulo: string; detalhe: string; href?: string }[] = [];
  if (remessasSemPlanejamento > 0 && linhasCronograma.length > 0) {
    pendencias.push({
      titulo: `${remessasSemPlanejamento} de ${linhasCronograma.length} remessa(s) sem planejamento`,
      detalhe: "Sem data prevista, o Financeiro e a Produção não sabem quando essa parte vai ser entregue.",
    });
  }
  if (["COMERCIAL", "PROSPECCAO"].includes(empreendimento.status) && !empreendimento.responsavelComercialUserId) {
    pendencias.push({
      titulo: "Sem responsável Comercial definido",
      detalhe: "Ninguém está formalmente cuidando dessa etapa agora.",
    });
  }
  if (empreendimento.status === "ORCAMENTACAO" && !empreendimento.responsavelOrcamentacaoUserId) {
    pendencias.push({
      titulo: "Sem responsável de Orçamentação definido",
      detalhe: "Ninguém está formalmente cuidando dessa etapa agora.",
    });
  }

  const [respComercial, respEngenharia, respOrcamentacao, torres, tipologias, eventos] =
    await Promise.all([
      empreendimento.responsavelComercialUserId
        ? usuarioRepo.findById(empreendimento.responsavelComercialUserId)
        : null,
      empreendimento.responsavelEngenhariaUserId
        ? usuarioRepo.findById(empreendimento.responsavelEngenhariaUserId)
        : null,
      empreendimento.responsavelOrcamentacaoUserId
        ? usuarioRepo.findById(empreendimento.responsavelOrcamentacaoUserId)
        : null,
      estruturaFisicaRepo.buscarEstrutura(params.id),
      estruturaFisicaRepo.buscarTipologias(params.id),
      timelineRepo.buscarEventos(params.id),
    ]);

  // Documentos anexados (contratos, plantas, fotos). Blindado: se `db push`
  // ainda não rodou pro campo `conteudo` do DocumentoEmpreendimento, não
  // derruba a página inteira — só mostra a lista vazia com aviso.
  let documentos: Awaited<ReturnType<typeof listarDocumentosEmpreendimento>> = [];
  try {
    documentos = await listarDocumentosEmpreendimento(params.id);
  } catch (e) {
    console.error("[empreendimento/page] erro ao carregar documentos:", e);
  }

  // Busca status dos levantamentos por tipologia
  const statusLevantamentos = await Promise.all(
    tipologias.map(async (t) => {
      const lev = await levantamentoRepo.buscarPorTipologia(params.id, t.id);
      return { tipologiaId: t.id, tipologiaNome: t.nome, status: lev?.status ?? null, pecas: lev?.pecas.length ?? 0 };
    })
  );
  const levValidado = statusLevantamentos.some((l) => l.status === "VALIDADO");
  const levRascunho = statusLevantamentos.some((l) => l.status === "RASCUNHO");
  const temLevantamento = levValidado || levRascunho;

  // Status do levantamento hidráulico — considera todos os subtipos
  // (PEX, Água Fria, Água Quente, Esgoto) de todas as tipologias.
  const levantamentosHidraulicos = empreendimento.kitHidraulico
    ? await levantamentoHidraulicoRepo.buscarTodosPorEmpreendimento(params.id)
    : [];
  const levHidValidado = levantamentosHidraulicos.some((l) => l.status === "VALIDADO");
  const levHidRascunho = levantamentosHidraulicos.some((l) => l.status === "RASCUNHO");

  // Status do levantamento de materiais — só faz sentido se o empreendimento
  // tem kit elétrico (o catálogo hoje cobre elétrico/QDC).
  const levantamentosMateriais = empreendimento.kitEletrico
    ? await levantamentoMateriaisRepo.buscarTodosPorEmpreendimento(params.id)
    : [];
  const levMatValidado = levantamentosMateriais.some((l) => l.status === "VALIDADO");
  const levMatRascunho = levantamentosMateriais.some((l) => l.status === "RASCUNHO");

  const totalUnidades = torres.reduce(
    (acc, torre) =>
      acc + torre.pavimentos.reduce((accP, pav) => accP + pav.unidades.length, 0),
    0
  );

  const kitsAtivos = [
    empreendimento.kitEletrico && "Elétrico",
    empreendimento.kitHidraulico && "Hidráulico",
    empreendimento.kitQdc && "QDC",
  ].filter(Boolean) as string[];

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/empreendimentos"
        className="flex w-fit items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar para Empreendimentos
      </Link>

      {/* Cabeçalho com status em destaque */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <PageHeader
          breadcrumb={["Empreendimentos", empreendimento.nome]}
          title={
            <span className="flex items-center gap-2.5">
              <span className="inline-flex items-center rounded-md bg-secondary px-2 py-0.5 text-sm font-mono font-medium text-muted-foreground">
                {empreendimento.codigo}
              </span>
              {empreendimento.nome}
            </span>
          }
          description={
            <span className="flex items-center gap-2 flex-wrap">
              <span>{empreendimento.cidade} / {empreendimento.estado} — {labelTipo(empreendimento.tipo)}</span>
              <TierBadge tier={empreendimento.tier} />
            </span>
          }
        />
        <div className="flex items-center gap-2 shrink-0">
          <StatusChangeButton
            empreendimentoId={empreendimento.id}
            statusAtual={empreendimento.status}
            podeAlterarLivremente={podeAlterarStatusLivremente}
          />
          <Link href={`/empreendimentos/${empreendimento.id}/editar`}>
            <Button variant="outline" size="sm">
              <Pencil className="h-4 w-4" />
              Editar
            </Button>
          </Link>
          <MenuAcoesSecundarias>
            <ExcluirEmpreendimentoButton
              empreendimentoId={empreendimento.id}
              empreendimentoNome={empreendimento.nome}
            />
          </MenuAcoesSecundarias>
        </div>
      </div>

      <JornadaEmpreendimento statusAtual={empreendimento.status} />

      {pendencias.length > 0 && (
        <Card className="border-l-4 border-l-warning">
          <CardContent className="flex flex-col gap-2 pt-5">
            <div className="mb-1 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-warning" />
              <h2 className="text-sm font-bold uppercase tracking-wide text-foreground">
                O que precisa de atenção ({pendencias.length})
              </h2>
            </div>
            {pendencias.map((p, i) => (
              <div key={i} className="border-l-2 border-l-warning bg-warning/[0.03] px-3 py-2.5">
                <p className="text-sm font-semibold text-foreground">{p.titulo}</p>
                <p className="text-xs text-muted-foreground">{p.detalhe}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Responsabilidade por etapa — Comercial/Engenharia/Orçamentação
          assumem e concluem sua parte, cada conclusão avança o status
          automaticamente (substitui o avanço manual pra essas 3 transições
          iniciais; StatusChangeButton acima continua disponível pra
          gestores como override manual). */}
      <ResponsabilidadeEtapaCard
        empreendimentoId={empreendimento.id}
        statusAtual={empreendimento.status}
        usuarioLogadoId={sessao?.user?.id ?? null}
        areas={[
          {
            area: "COMERCIAL",
            label: "Comercial",
            responsavelId: empreendimento.responsavelComercialUserId ?? null,
            responsavelNome: respComercial?.nome ?? null,
            concluidoEm: conclusoes?.comercialConcluidoEm?.toISOString() ?? null,
            statusEsperado: "PROSPECCAO",
          },
          {
            area: "ENGENHARIA",
            label: "Engenharia (levantamentos)",
            responsavelId: empreendimento.responsavelEngenhariaUserId ?? null,
            responsavelNome: respEngenharia?.nome ?? null,
            concluidoEm: conclusoes?.engenhariaConcluidaEm?.toISOString() ?? null,
            statusEsperado: "COMERCIAL",
          },
          {
            area: "ORCAMENTACAO",
            label: "Orçamentação (proposta)",
            responsavelId: empreendimento.responsavelOrcamentacaoUserId ?? null,
            responsavelNome: respOrcamentacao?.nome ?? null,
            concluidoEm: conclusoes?.orcamentacaoConcluidaEm?.toISOString() ?? null,
            statusEsperado: "ORCAMENTACAO",
          },
        ]}
      />

      <CronogramaRemessasCard linhas={linhasCronograma} />

      {/* Layout principal: dados + timeline */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">

          {/* Informações gerais */}
          <Card>
            <CardHeader className="flex-row items-center gap-3 border-b border-border pb-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent">
                <Building2 className="h-[18px] w-[18px] text-accent-foreground" />
              </div>
              <CardTitle className="text-[15px]">Informações gerais</CardTitle>
            </CardHeader>
            <CardContent className="pt-5">
              <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Campo label="Cliente (construtora)" valor={empreendimento.construtora} />
                <Campo label="Incorporadora" valor={empreendimento.incorporadora ?? "—"} />
                <div className="sm:col-span-2">
                  <dt className="text-xs text-muted-foreground mb-1 flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5" />
                    Endereço
                  </dt>
                  <dd className="text-sm font-medium">
                    {empreendimento.endereco}, {empreendimento.cidade} / {empreendimento.estado}
                  </dd>
                </div>
                <Campo label="Tipo de empreendimento" valor={labelTipo(empreendimento.tipo)} />
                <Campo label="Tipo de estrutura" valor={labelEstrutura(empreendimento.tipoEstrutura)} />
                <div className="sm:col-span-2">
                  <dt className="text-xs text-muted-foreground mb-1">Tipos de kit</dt>
                  <dd className="flex flex-wrap gap-2 mt-1">
                    {kitsAtivos.length > 0 ? kitsAtivos.map((kit) => (
                      <span key={kit} className="rounded-full bg-primary/10 text-primary px-2.5 py-0.5 text-xs font-medium">
                        {kit}
                      </span>
                    )) : (
                      <span className="text-sm text-muted-foreground">Nenhum selecionado</span>
                    )}
                  </dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          {/* Estrutura física */}
          {torres.length > 0 && (
            <Card>
              <CardHeader className="flex-row items-center gap-3 border-b border-border pb-4">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent">
                  <Layers className="h-[18px] w-[18px] text-accent-foreground" />
                </div>
                <CardTitle className="text-[15px]">Estrutura física</CardTitle>
              </CardHeader>
              <CardContent className="pt-5">
                <div className="flex flex-col gap-4">
                  <div className="flex flex-wrap gap-x-8 gap-y-3">
                    <ResumoNumero label="Torres" valor={torres.length} />
                    <ResumoNumero label="Unidades" valor={totalUnidades} />
                    <ResumoNumero label="Tipologias" valor={tipologias.length} />
                    <div className="flex flex-col">
                      <span className="text-xs text-muted-foreground mb-1">Hall</span>
                      <span className="flex items-center gap-1.5 text-sm font-medium">
                        <DoorOpen className="h-3.5 w-3.5 text-muted-foreground" />
                        {empreendimento.temHall ? "Sim" : "Não"}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col divide-y divide-border border-t border-border pt-3">
                    {torres.map((torre) => (
                      <div key={torre.id} className="flex items-center justify-between py-2">
                        <span className="text-sm font-medium">{torre.nome}</span>
                        <span className="text-xs text-muted-foreground">
                          {torre.pavimentos.length} pavimentos · {torre.pavimentos[0]?.unidades.length ?? 0} unid./pav.
                        </span>
                      </div>
                    ))}
                  </div>
                  {tipologias.length > 0 && (
                    <div className="flex flex-wrap gap-2 border-t border-border pt-3">
                      {tipologias.map((t) => (
                        <span key={t.id} className="rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-secondary-foreground">
                          {t.nome}{t.areaPrivativa ? ` · ${t.areaPrivativa}m²` : ""}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Informações comerciais */}
          <Card>
            <CardHeader className="flex-row items-center gap-3 border-b border-border pb-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent">
                <Calendar className="h-[18px] w-[18px] text-accent-foreground" />
              </div>
              <CardTitle className="text-[15px]">Informações comerciais</CardTitle>
            </CardHeader>
            <CardContent className="pt-5">
              <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Campo label="Responsável comercial" valor={empreendimento.responsavelComercial} />
                <div>
                  <dt className="text-xs text-muted-foreground mb-1">Status</dt>
                  <dd><StatusBadge status={empreendimento.status} size="md" /></dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground mb-1">Tier (multiplicador do serviço HGI)</dt>
                  <dd><TierBadge tier={empreendimento.tier} fallback="sem-tier" size="md" /></dd>
                </div>
                <Campo label="Data prevista de início" valor={formatarData(empreendimento.dataPrevistaInicio)} />
                <Campo label="Data prevista de entrega" valor={formatarData(empreendimento.dataPrevistaEntrega)} />
              </dl>
            </CardContent>
          </Card>

          {/* Responsáveis */}
          <Card>
            <CardHeader className="flex-row items-center gap-3 border-b border-border pb-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent">
                <User className="h-[18px] w-[18px] text-accent-foreground" />
              </div>
              <CardTitle className="text-[15px]">Responsáveis internos</CardTitle>
            </CardHeader>
            <CardContent className="pt-5">
              <dl className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <Campo label="Comercial" valor={respComercial?.nome ?? "Não atribuído"} />
                <Campo label="Engenharia" valor={respEngenharia?.nome ?? "Não atribuído"} />
                <Campo label="Orçamentação" valor={respOrcamentacao?.nome ?? "Não atribuído"} />
              </dl>
            </CardContent>
          </Card>

          {empreendimento.observacoes && (
            <Card>
              <CardHeader className="flex-row items-center gap-3 border-b border-border pb-4">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent">
                  <FileText className="h-[18px] w-[18px] text-accent-foreground" />
                </div>
                <CardTitle className="text-[15px]">Observações</CardTitle>
              </CardHeader>
              <CardContent className="pt-5">
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {empreendimento.observacoes}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Timeline */}
          <Card>
            <CardHeader className="flex-row items-center gap-3 border-b border-border pb-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent">
                <GitCommitHorizontal className="h-[18px] w-[18px] text-accent-foreground" />
              </div>
              <CardTitle className="text-[15px]">Timeline</CardTitle>
            </CardHeader>
            <CardContent className="pt-5">
              <Timeline
                empreendimentoId={empreendimento.id}
                eventos={eventos}
              />
            </CardContent>
          </Card>
        </div>

        {/* Coluna lateral — módulos futuros */}
        <div className="flex flex-col gap-6">
          {/* Card unificado "Levantamentos" — abre hub com 3 sub-módulos.
              Gate de fase: só libera clique/acessar em ORCAMENTACAO em diante.
              Antes disso (PROSPECCAO/COMERCIAL) fica bloqueado com aviso. */}
          <ModuloComGate
            icon={Layers}
            titulo="Levantamentos"
            descricao={
              (() => {
                const partes: string[] = [];
                if (empreendimento.kitEletrico) partes.push("Elétrico");
                if (empreendimento.kitHidraulico) partes.push("Hidráulico");
                if (empreendimento.kitEletrico) partes.push("Materiais");
                return partes.join(" · ") || "Sem kits configurados";
              })()
            }
            href={`/empreendimentos/${empreendimento.id}/levantamentos`}
            badge={(() => {
              // Prioridade visual: se todos VALIDADOS → success; se algum
              // rascunho → warning; senão nada.
              const todosValidados =
                (!empreendimento.kitEletrico || levValidado) &&
                (!empreendimento.kitHidraulico || levHidValidado) &&
                (!empreendimento.kitEletrico || levMatValidado);
              const algumEmAndamento =
                levValidado || levRascunho || levHidValidado || levHidRascunho ||
                levMatValidado || levMatRascunho;
              if (todosValidados && algumEmAndamento)
                return { label: "Completo", cor: "success" as const };
              if (algumEmAndamento)
                return { label: "Em andamento", cor: "warning" as const };
              return undefined;
            })()}
            statusEmpreendimento={empreendimento.status}
            fasesLiberadas={FASES_LEVANTAMENTO_LIBERADAS}
            fasesConsulta={FASES_LEVANTAMENTO_CONSULTA}
          />
          <ModuloComGate
            icon={Calculator}
            titulo="Orçamentação"
            descricao="Valor do empreendimento e proposta"
            href={`/empreendimentos/${empreendimento.id}/orcamento`}
            statusEmpreendimento={empreendimento.status}
            fasesLiberadas={FASES_ORCAMENTO_LIBERADAS}
            fasesConsulta={FASES_ORCAMENTO_CONSULTA}
          />
          <ModuloFuturoCard
            icon={FileUp}
            titulo="Documentos"
            descricao="Contratos, plantas, fotos"
            href={`/empreendimentos/${empreendimento.id}/documentos`}
            badge={
              documentos.length > 0
                ? { label: `${documentos.length}`, cor: "primary" as const }
                : undefined
            }
          />
          <ModuloComGate
            icon={Factory}
            titulo="Produção"
            descricao={
              statusProducaoEmpreendimento.status === "SEM_TIPOLOGIA"
                ? "Sem tipologias cadastradas ainda"
                : `${statusProducaoEmpreendimento.progressoMedio}% em média · ${statusProducaoEmpreendimento.tipologiasConcluidas} de ${statusProducaoEmpreendimento.totalTipologias} tipologia(s) concluída(s)`
            }
            href="/producao"
            badge={(() => {
              if (statusProducaoEmpreendimento.status === "CONCLUIDA")
                return { label: "Concluída", cor: "success" as const };
              if (statusProducaoEmpreendimento.status === "EM_ANDAMENTO")
                return { label: "Em andamento", cor: "warning" as const };
              return undefined;
            })()}
            statusEmpreendimento={empreendimento.status}
            fasesLiberadas={FASES_PRODUCAO_LIBERADAS}
            fasesConsulta={FASES_PRODUCAO_CONSULTA}
          />
        </div>
      </div>
    </div>
  );
}

function Campo({ label, valor }: { label: string; valor: string }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground mb-1">{label}</dt>
      <dd className="text-sm font-medium">{valor}</dd>
    </div>
  );
}

function ResumoNumero({ label, valor }: { label: string; valor: number }) {
  return (
    <div className="flex flex-col">
      <span className="text-xs text-muted-foreground mb-1">{label}</span>
      <span className="text-xl font-semibold text-foreground">{valor}</span>
    </div>
  );
}

function GitCommitHorizontal({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="12" cy="12" r="3"/>
      <line x1="3" y1="12" x2="9" y2="12"/>
      <line x1="15" y1="12" x2="21" y2="12"/>
    </svg>
  );
}

function ModuloFuturoCard({
  icon: Icon,
  titulo,
  descricao,
  href,
  badge,
}: {
  icon: React.ComponentType<{ className?: string }>;
  titulo: string;
  descricao: string;
  href?: string;
  badge?: { label: string; cor: "success" | "warning" | "primary" };
}) {
  const conteudo = (
    <CardContent className="flex items-start gap-3 pt-5">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-secondary">
        <Icon className="h-[18px] w-[18px] text-muted-foreground" />
      </div>
      <div className="flex flex-col gap-0.5 flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-foreground">{titulo}</span>
          {badge && (
            <span className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${
              badge.cor === "success" ? "bg-success/15 text-success" :
              badge.cor === "warning" ? "bg-warning/15 text-warning" :
              "bg-primary/15 text-primary"
            }`}>
              {badge.label}
            </span>
          )}
        </div>
        <span className="text-xs text-muted-foreground">{descricao}</span>
        {href ? (
          <span className="mt-1.5 text-[10px] font-medium uppercase tracking-wide text-primary">
            Acessar →
          </span>
        ) : (
          <span className="mt-1.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground/60">
            Módulo futuro
          </span>
        )}
      </div>
    </CardContent>
  );

  if (href) {
    return (
      <Card className="hover:border-primary/40 transition-colors cursor-pointer">
        <Link href={href}>{conteudo}</Link>
      </Card>
    );
  }

  return <Card className="border-dashed">{conteudo}</Card>;
}

// Regras de gate por módulo — cada card decide sozinho quando libera edição
// e quando vira consulta. Fora dos dois Sets, o card fica bloqueado.
//
// LEVANTAMENTOS: parte técnica. Só se mexe em ORCAMENTACAO. A partir de
// NEGOCIACAO já é histórico (a HGI não redimensiona projeto durante a
// negociação — se precisar, volta pra ORCAMENTACAO).
const FASES_LEVANTAMENTO_LIBERADAS = new Set(["ORCAMENTACAO"]);
const FASES_LEVANTAMENTO_CONSULTA = new Set([
  "NEGOCIACAO",
  "CONTRATADO",
  "SUPRIMENTOS",
  "PRODUCAO",
  "CONCLUIDO",
  "ARQUIVADO",
]);

// ORÇAMENTO: continua editável em NEGOCIACAO porque cliente pode pedir
// desconto e a HGI ajusta o preço direto (sem voltar de fase). Vira
// só-consulta depois de CONTRATADO.
const FASES_ORCAMENTO_LIBERADAS = new Set(["ORCAMENTACAO", "NEGOCIACAO"]);
const FASES_PRODUCAO_LIBERADAS = new Set(["SUPRIMENTOS", "PRODUCAO"]);
const FASES_PRODUCAO_CONSULTA = new Set(["CONCLUIDO", "ARQUIVADO"]);
const FASES_ORCAMENTO_CONSULTA = new Set([
  "CONTRATADO",
  "SUPRIMENTOS",
  "PRODUCAO",
  "CONCLUIDO",
  "ARQUIVADO",
]);

const FASES_LABELS: Record<string, string> = {
  PROSPECCAO: "Prospecção",
  COMERCIAL: "Comercial",
  ORCAMENTACAO: "Orçamentação",
  NEGOCIACAO: "Negociação",
  CONTRATADO: "Contratado",
  SUPRIMENTOS: "Suprimentos",
  PRODUCAO: "Produção",
  CONCLUIDO: "Concluído",
  ARQUIVADO: "Arquivado",
};

// Card com gate de fase — decide entre 3 modos:
//   1. LIBERADO (fase atual permite editar)   → mesma UI do ModuloFuturoCard, clicável
//   2. CONSULTA (fase já passou)              → clicável mas com badge "Consulta" cinza
//   3. BLOQUEADO (fase ainda não chegou)      → não clicável, cadeado + aviso
function ModuloComGate({
  icon: Icon,
  titulo,
  descricao,
  href,
  badge,
  statusEmpreendimento,
  fasesLiberadas,
  fasesConsulta,
}: {
  icon: React.ComponentType<{ className?: string }>;
  titulo: string;
  descricao: string;
  href: string;
  badge?: { label: string; cor: "success" | "warning" | "primary" };
  statusEmpreendimento: string;
  fasesLiberadas: Set<string>;
  fasesConsulta: Set<string>;
}) {
  const liberado = fasesLiberadas.has(statusEmpreendimento);
  const consulta = !liberado && fasesConsulta.has(statusEmpreendimento);
  const bloqueado = !liberado && !consulta;

  // Descobre próxima fase permitida pra mostrar aviso claro no bloqueado.
  const primeiraFaseLiberada = Array.from(fasesLiberadas)[0] ?? "ORCAMENTACAO";
  const labelFaseAlvo = FASES_LABELS[primeiraFaseLiberada] ?? primeiraFaseLiberada;

  const conteudo = (
    <CardContent className="flex items-start gap-3 pt-5">
      <div
        className={
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg " +
          (bloqueado ? "bg-muted" : "bg-secondary")
        }
      >
        <Icon
          className={
            "h-[18px] w-[18px] " +
            (bloqueado ? "text-muted-foreground/60" : "text-muted-foreground")
          }
        />
      </div>
      <div className="flex flex-col gap-0.5 flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className={
              "text-sm font-medium " +
              (bloqueado ? "text-muted-foreground" : "text-foreground")
            }
          >
            {titulo}
          </span>
          {badge && !bloqueado && (
            <span
              className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                badge.cor === "success"
                  ? "bg-success/15 text-success"
                  : badge.cor === "warning"
                    ? "bg-warning/15 text-warning"
                    : "bg-primary/15 text-primary"
              }`}
            >
              {badge.label}
            </span>
          )}
          {consulta && (
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
              <Eye className="h-2.5 w-2.5" />
              Consulta
            </span>
          )}
          {bloqueado && (
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
              <Lock className="h-2.5 w-2.5" />
              Bloqueado
            </span>
          )}
        </div>
        <span className="text-xs text-muted-foreground">{descricao}</span>
        {liberado && (
          <span className="mt-1.5 text-[10px] font-medium uppercase tracking-wide text-primary">
            Acessar →
          </span>
        )}
        {consulta && (
          <span className="mt-1.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            Ver histórico →
          </span>
        )}
        {bloqueado && (
          <span className="mt-1.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground/60">
            Libera na fase de {labelFaseAlvo}
          </span>
        )}
      </div>
    </CardContent>
  );

  if (bloqueado) {
    return (
      <Card
        className="border-dashed bg-muted/20"
        title={`Este módulo será liberado quando o empreendimento estiver em ${labelFaseAlvo}.`}
      >
        {conteudo}
      </Card>
    );
  }

  return (
    <Card
      className={
        "hover:border-primary/40 transition-colors cursor-pointer " +
        (consulta ? "bg-muted/10" : "")
      }
    >
      <Link href={href}>{conteudo}</Link>
    </Card>
  );
}
