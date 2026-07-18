/**
 * Política de senha forte, compartilhada por todos os pontos onde uma
 * senha é definida (cadastro de usuário, troca obrigatória, reset via
 * e-mail, troca voluntária). Antes, cada lugar só verificava 8+
 * caracteres — dava pra cadastrar "12345678" como senha.
 *
 * Regra: mínimo 8 caracteres, pelo menos 1 letra maiúscula, 1 minúscula
 * e 1 número. Não exige caractere especial de propósito — o público
 * dessa empresa é operacional/administrativo, não técnico, e exigir
 * demais tende a fazer as pessoas anotarem a senha em um papel colado
 * no monitor, o que é pior pra segurança do que a regra em si.
 */
export function validarSenhaForte(senha: string): { valida: true } | { valida: false; erro: string } {
  if (senha.length < 8) {
    return { valida: false, erro: "A senha precisa ter pelo menos 8 caracteres." };
  }
  if (!/[A-Z]/.test(senha)) {
    return { valida: false, erro: "A senha precisa ter pelo menos uma letra maiúscula." };
  }
  if (!/[a-z]/.test(senha)) {
    return { valida: false, erro: "A senha precisa ter pelo menos uma letra minúscula." };
  }
  if (!/[0-9]/.test(senha)) {
    return { valida: false, erro: "A senha precisa ter pelo menos um número." };
  }
  return { valida: true };
}
