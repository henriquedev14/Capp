import "dotenv/config";
import bcrypt from "bcryptjs";
import { prisma } from "./client";

async function main() {
  const email = process.env.SEED_ADMIN_EMAIL ?? "admin@hgigroup.com.br";
  const senha = process.env.TEST_PASSWORD ?? "TrocarSenha123!";

  console.log("\n=== DIAGNOSTICO DE LOGIN ===");
  console.log(`E-mail testado: ${email}`);
  console.log(`Senha testada: ${senha}`);

  // 1. Verificar se usuario existe
  const usuario = await prisma.usuario.findUnique({
    where: { email },
    select: { id: true, email: true, senhaHash: true, ativo: true },
  });

  if (!usuario) {
    console.log("\n USUARIO NAO ENCONTRADO no banco.");
    console.log("   Execute o seed primeiro.");
    return;
  }

  console.log("\nUsuario encontrado:");
  console.log(`   ID: ${usuario.id}`);
  console.log(`   Ativo: ${usuario.ativo}`);
  console.log(`   Tem senhaHash: ${!!usuario.senhaHash}`);
  if (usuario.senhaHash) {
    console.log(`   Hash (primeiros 20 chars): ${usuario.senhaHash.substring(0, 20)}...`);
  }

  if (!usuario.senhaHash) {
    console.log("\nSENHA HASH ESTA VAZIA — o usuario nao tem senha definida.");
    return;
  }

  // 2. Testar a senha
  const senhaCorreta = await bcrypt.compare(senha, usuario.senhaHash);
  console.log(`\nSenha "${senha}": ${senhaCorreta ? "CORRETA" : "INCORRETA"}`);

  // 3. Sempre redefinir a senha para garantir
  const novaHash = await bcrypt.hash(senha, 10);
  await prisma.usuario.update({
    where: { email },
    data: { senhaHash: novaHash },
  });
  console.log(`\nSenha redefinida para "${senha}" com sucesso.`);
  console.log("   Tente logar agora com essa senha.");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
