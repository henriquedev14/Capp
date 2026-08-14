-- Management Intelligence / Analytics
-- 1) separa meta física de kits/dia da meta em U.H.;
-- 2) cria instrumentação mínima de Engenharia (executor/prazo/bloqueio/retrabalho)
--    sem inventar histórico anterior à implantação.

ALTER TABLE "configuracao_sistema"
ADD COLUMN "meta_kits_finalizados_dia" DECIMAL(10,2) NOT NULL DEFAULT 50;

CREATE TABLE "engenharia_controles" (
    "id" TEXT NOT NULL,
    "referencia_tipo" TEXT NOT NULL,
    "referencia_id" TEXT NOT NULL,
    "empreendimento_id" TEXT NOT NULL,
    "tipologia_id" TEXT,
    "executor_id" TEXT,
    "prazo" TIMESTAMP(3),
    "bloqueado_em" TIMESTAMP(3),
    "motivo_bloqueio" TEXT,
    "minutos_bloqueados" INTEGER NOT NULL DEFAULT 0,
    "retrabalhos" INTEGER NOT NULL DEFAULT 0,
    "instrumentado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "engenharia_controles_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "engenharia_controles_referencia_tipo_referencia_id_key"
ON "engenharia_controles"("referencia_tipo", "referencia_id");

CREATE INDEX "engenharia_controles_empreendimento_id_idx"
ON "engenharia_controles"("empreendimento_id");

CREATE INDEX "engenharia_controles_executor_id_idx"
ON "engenharia_controles"("executor_id");

CREATE INDEX "engenharia_controles_bloqueado_em_idx"
ON "engenharia_controles"("bloqueado_em");

ALTER TABLE "engenharia_controles"
ADD CONSTRAINT "engenharia_controles_executor_id_fkey"
FOREIGN KEY ("executor_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "engenharia_controle_eventos" (
    "id" TEXT NOT NULL,
    "controle_id" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "motivo" TEXT,
    "meta" TEXT,
    "registrado_por_id" TEXT,
    "ocorrido_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "engenharia_controle_eventos_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "engenharia_controle_eventos_controle_id_ocorrido_em_idx"
ON "engenharia_controle_eventos"("controle_id", "ocorrido_em");

CREATE INDEX "engenharia_controle_eventos_tipo_ocorrido_em_idx"
ON "engenharia_controle_eventos"("tipo", "ocorrido_em");

ALTER TABLE "engenharia_controle_eventos"
ADD CONSTRAINT "engenharia_controle_eventos_controle_id_fkey"
FOREIGN KEY ("controle_id") REFERENCES "engenharia_controles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Instrumenta também os levantamentos já existentes, mas a data de
-- instrumentação deixa explícito que bloqueios/retrabalhos anteriores a
-- esta migration não podem ser reconstruídos com segurança.
INSERT INTO "engenharia_controles" (
  "id", "referencia_tipo", "referencia_id", "empreendimento_id", "tipologia_id", "executor_id", "instrumentado_em", "created_at", "updated_at"
)
SELECT 'ec-eletrica-' || "id", 'ELETRICA', "id", "empreendimento_id", "tipologia_id", "criado_por_id", CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "levantamentos_eletricos"
ON CONFLICT ("referencia_tipo", "referencia_id") DO NOTHING;

INSERT INTO "engenharia_controles" (
  "id", "referencia_tipo", "referencia_id", "empreendimento_id", "tipologia_id", "executor_id", "instrumentado_em", "created_at", "updated_at"
)
SELECT 'ec-hidraulica-' || "id", 'HIDRAULICA', "id", "empreendimento_id", "tipologia_id", "criado_por_id", CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "levantamentos_hidraulicos"
ON CONFLICT ("referencia_tipo", "referencia_id") DO NOTHING;

INSERT INTO "engenharia_controles" (
  "id", "referencia_tipo", "referencia_id", "empreendimento_id", "tipologia_id", "executor_id", "instrumentado_em", "created_at", "updated_at"
)
SELECT 'ec-materiais-' || "id", 'MATERIAIS', "id", "empreendimento_id", "tipologia_id", "criado_por_id", CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "levantamentos_materiais"
ON CONFLICT ("referencia_tipo", "referencia_id") DO NOTHING;
