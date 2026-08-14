/**
 * Pipeline visual do Modo Legado — deixa claro que as etapas
 * anteriores não aconteceram DENTRO do sistema (não finge que foram
 * concluídas), só a etapa atual (Produção) é real pro ERP. Puramente
 * visual — não mexe em nenhuma lógica de status. Desenhado com o
 * Henrique em 13/08/2026.
 */
const ETAPAS_ANTERIORES = ["Prospecção", "Comercial", "Engenharia", "Negociação", "Contrato", "Suprimentos"];

export function PipelineLegadoView() {
  return (
    <div className="flex overflow-hidden rounded-xl border border-border">
      {ETAPAS_ANTERIORES.map((nome) => (
        <div key={nome} className="flex-1 border-r border-border bg-secondary/30 px-2.5 py-3 text-center last:border-r-0">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{nome}</p>
          <p className="mt-0.5 text-[9px] font-mono text-muted-foreground/70">Legado · N.A.</p>
        </div>
      ))}
      <div className="flex-1 bg-primary px-2.5 py-3 text-center">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-primary-foreground">Produção</p>
        <p className="mt-0.5 text-[9px] font-mono text-primary-foreground/80">Atual</p>
      </div>
    </div>
  );
}
