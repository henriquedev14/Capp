-- AlterTable
ALTER TABLE "levantamentos_eletricos" ADD COLUMN     "validado_por_id" TEXT;
-- AlterTable
ALTER TABLE "levantamentos_hidraulicos" ADD COLUMN     "validado_por_id" TEXT;
-- AlterTable
ALTER TABLE "levantamentos_materiais" ADD COLUMN     "validado_por_id" TEXT;
-- AddForeignKey
ALTER TABLE "levantamentos_materiais" ADD CONSTRAINT "levantamentos_materiais_validado_por_id_fkey" FOREIGN KEY ("validado_por_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "levantamentos_hidraulicos" ADD CONSTRAINT "levantamentos_hidraulicos_validado_por_id_fkey" FOREIGN KEY ("validado_por_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "levantamentos_eletricos" ADD CONSTRAINT "levantamentos_eletricos_validado_por_id_fkey" FOREIGN KEY ("validado_por_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;
