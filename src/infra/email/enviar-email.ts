/**
 * Envio de e-mail transacional via Resend — com um "modo degradado"
 * consciente: se RESEND_API_KEY ainda não estiver configurado de verdade
 * (só o placeholder do .env.example), NÃO tenta enviar e-mail nenhum —
 * em vez disso, registra o conteúdo no log do servidor, pra quem estiver
 * de olho no terminal/logs conseguir recuperar o link manualmente
 * enquanto o Resend não é configurado.
 *
 * Isso existe porque o "esqueci minha senha" e outras notificações
 * dependem de e-mail funcionando — sem esse fallback, o recurso ficaria
 * completamente inutilizável até alguém configurar o Resend.
 */

function resendConfigurado(): boolean {
  const key = process.env.RESEND_API_KEY;
  return !!key && !key.includes("troque_por_sua_chave");
}

export async function enviarEmail(dados: {
  para: string;
  assunto: string;
  corpoTexto: string;
  corpoHtml?: string;
}): Promise<{ enviado: boolean }> {
  if (!resendConfigurado()) {
    console.warn(
      `[email] RESEND_API_KEY não configurado — e-mail NÃO enviado de verdade.\n` +
        `Para: ${dados.para}\nAssunto: ${dados.assunto}\n\n${dados.corpoTexto}\n`
    );
    return { enviado: false };
  }

  try {
    const { Resend } = await import("resend");
    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from: process.env.EMAIL_FROM || "ConstruApp <sistema@construapp.com.br>",
      to: dados.para,
      subject: dados.assunto,
      text: dados.corpoTexto,
      html: dados.corpoHtml ?? `<pre>${dados.corpoTexto}</pre>`,
    });
    return { enviado: true };
  } catch (e) {
    console.error("[email] falha ao enviar via Resend:", e);
    return { enviado: false };
  }
}
