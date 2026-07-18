import { validarTokenResetSenha } from "@/features/auth/actions/reset-senha-actions";
import { RedefinirSenhaForm } from "@/features/auth/components/redefinir-senha-form";

export default async function RedefinirSenhaPage({ params }: { params: { token: string } }) {
  const { valido, nome } = await validarTokenResetSenha(params.token);
  return <RedefinirSenhaForm token={params.token} valido={valido} nome={nome} />;
}
