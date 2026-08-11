import { prisma } from "./client";

async function main() {
  const papeis = await prisma.papel.findMany({
    where: { nome: { contains: "oordenad", mode: "insensitive" } },
    include: {
      usuarios: { include: { usuario: { select: { nome: true, email: true } } } },
      permissoes: { include: { permissao: { select: { chave: true } } } },
    },
  });

  if (papeis.length === 0) {
    console.log("Nenhum papel com 'Coordenador' no nome encontrado.");
    const todos = await prisma.papel.findMany({ select: { nome: true } });
    console.log("Papéis existentes:", todos.map((p) => p.nome).join(", "));
    return;
  }

  for (const p of papeis) {
    const chaves = p.permissoes.map((pp) => pp.permissao.chave);
    console.log(`\nPapel: ${p.nome}`);
    console.log(
      `Usuários com esse papel: ${p.usuarios.map((up) => `${up.usuario.nome} (${up.usuario.email})`).join(", ") || "nenhum"}`
    );
    console.log(`Tem empreendimento:ver: ${chaves.includes("empreendimento:ver")}`);
    console.log(`Tem empreendimento:ver_apenas_proprios: ${chaves.includes("empreendimento:ver_apenas_proprios")}`);
    console.log(`Total de permissões desse papel: ${chaves.length}`);
  }
}

main()
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect());
