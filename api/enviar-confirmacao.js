export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', 'https://www.apostilasimples.com.br');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { numero, nome, email, link } = req.body;
  if (!email || !numero || !nome) return res.status(400).json({ error: 'Campos obrigatórios ausentes' });

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F6F6F8;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F6F6F8;padding:40px 20px;">
<tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">
  <tr><td style="background:#141416;border-radius:16px 16px 0 0;padding:28px 36px;text-align:center;">
    <p style="margin:0;font-size:26px;font-weight:800;color:#ffffff;letter-spacing:.01em;">i<span style="color:#EC008C">z</span>idoc</p>
  </td></tr>
  <tr><td style="background:#ffffff;padding:36px 36px 28px;border-left:1px solid #E9E9EF;border-right:1px solid #E9E9EF;">
    <p style="margin:0 0 6px;font-size:22px;font-weight:700;color:#141416;">Olá, ${nome}!</p>
    <p style="margin:0 0 24px;font-size:15px;color:#6E6E78;line-height:1.6;">Seu pedido de apostilamento foi recebido com sucesso. Acompanhe o status em tempo real pelo link abaixo.</p>
    <div style="background:#F6F6F8;border-radius:12px;padding:20px 24px;margin-bottom:24px;border:1px solid #E9E9EF;">
      <p style="margin:0 0 4px;font-size:11px;font-weight:700;color:#6E6E78;text-transform:uppercase;letter-spacing:.08em;">Número do protocolo</p>
      <p style="margin:0;font-size:26px;font-weight:700;color:#EC008C;font-family:monospace;letter-spacing:.06em;">${numero}</p>
    </div>
    <div style="margin-bottom:28px;">
      <p style="margin:0 0 12px;font-size:13px;font-weight:700;color:#141416;">Etapas do seu pedido:</p>
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr><td style="padding:8px 0;border-bottom:1px solid #F6F6F8;">
          <table><tr>
            <td style="width:28px;height:28px;border-radius:50%;background:#DDF0E9;text-align:center;vertical-align:middle;font-size:14px;color:#00875A;">✓</td>
            <td style="padding-left:12px;font-size:14px;color:#141416;font-weight:600;">Pedido recebido</td>
          </tr></table>
        </td></tr>
        <tr><td style="padding:8px 0;border-bottom:1px solid #F6F6F8;">
          <table><tr>
            <td style="width:28px;height:28px;border-radius:50%;background:#FCE4F1;text-align:center;vertical-align:middle;font-size:14px;color:#EC008C;">→</td>
            <td style="padding-left:12px;font-size:14px;color:#6E6E78;">Em apostilamento no cartório</td>
          </tr></table>
        </td></tr>
        <tr><td style="padding:8px 0;">
          <table><tr>
            <td style="width:28px;height:28px;border-radius:50%;background:#F6F6F8;text-align:center;vertical-align:middle;font-size:14px;color:#8A8A94;">○</td>
            <td style="padding-left:12px;font-size:14px;color:#8A8A94;">PDF apostilado entregue</td>
          </tr></table>
        </td></tr>
      </table>
    </div>
    <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
      <a href="${link}" style="display:inline-block;background:#00875A;color:#ffffff;font-size:15px;font-weight:700;padding:14px 32px;border-radius:50px;text-decoration:none;letter-spacing:.02em;">Acompanhar meu pedido</a>
    </td></tr></table>
    <p style="margin:20px 0 0;font-size:12px;color:#8A8A94;text-align:center;">Ou acesse: <a href="${link}" style="color:#EC008C;">${link}</a></p>
  </td></tr>
  <tr><td style="background:#FAFAFB;border:1px solid #E9E9EF;border-top:none;border-radius:0 0 16px 16px;padding:20px 36px;text-align:center;">
    <p style="margin:0;font-size:12px;color:#8A8A94;line-height:1.6;">Dúvidas? Fale com a gente pelo WhatsApp.<br>contato@apostilasimples.com.br</p>
  </td></tr>
</table>
</td></tr>
</table>
</body></html>`;

  const resend = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.RESEND_API_KEY}`
    },
    body: JSON.stringify({
      from: 'izidoc <contato@apostilasimples.com.br>',
      to: [email],
      subject: `Pedido ${numero} recebido | izidoc`,
      html
    })
  });

  const data = await resend.json();
  if (!resend.ok) return res.status(500).json({ error: data });
  return res.status(200).json({ ok: true, id: data.id });
}
