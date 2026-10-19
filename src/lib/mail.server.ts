// E-mails transactionnels WHITE SAYY via Resend (https://resend.com).
// Sans RESEND_API_KEY, tout est ignoré en silence : la commande n'est jamais bloquée par un e-mail.
// Secrets serveur : RESEND_API_KEY (obligatoire pour envoyer), MAIL_FROM (ex. "WHITE SAYY <commandes@ton-domaine.fr>").

const esc = (s: unknown) =>
  String(s ?? "").replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string,
  );
const eur = (n: unknown) =>
  Number(n || 0)
    .toFixed(2)
    .replace(".", ",") + " €";

export async function sendMail(
  to: string | undefined,
  subject: string,
  html: string,
): Promise<boolean> {
  const key = process.env["RESEND_API_KEY"];
  if (!key || !to) return false;
  const from = process.env["MAIL_FROM"] || "WHITE SAYY <onboarding@resend.dev>";
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: [to], subject, html }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

function layout(title: string, body: string): string {
  return `<div style="background:#0a0a0a;color:#f2f0eb;font-family:Arial,Helvetica,sans-serif;padding:32px 16px">
  <div style="max-width:560px;margin:0 auto">
    <div style="font-weight:900;font-size:22px;letter-spacing:.06em">WHITE SAYY</div>
    <h1 style="font-size:26px;line-height:1.1;text-transform:uppercase;margin:28px 0 16px">${title}</h1>
    ${body}
    <p style="color:#8d8b87;font-size:12px;margin-top:32px">WHITE SAYY — Une identité.</p>
  </div></div>`;
}

export type PaidOrder = {
  id: string;
  items?: { id: string; size?: string; qty: number }[];
  customer?: {
    email?: string;
    name?: string;
    address?: string;
    zip?: string;
    city?: string;
    country?: string;
    phone?: string;
    promoCode?: string;
    promoDiscount?: number;
  };
  shipping?: number;
  total?: number;
};

type PaidOrderShop = {
  products?: { id: string; name?: string }[];
  settings?: { contactEmail?: string };
};

export async function notifyPaidOrder(order: PaidOrder, shop: PaidOrderShop): Promise<void> {
  const products = shop.products ?? [];
  const nameOf = (id: string) => products.find((p) => p.id === id)?.name ?? id;
  const c = order.customer ?? {};
  const rows = (order.items ?? [])
    .map(
      (it) =>
        `<tr><td style="padding:6px 0">${esc(nameOf(it.id))} — ${esc(it.size)}</td><td align="right">× ${Number(it.qty) || 1}</td></tr>`,
    )
    .join("");
  const totals = `<p style="margin:14px 0 0;color:#8d8b87">Livraison : ${eur(order?.shipping)}${c.promoCode ? ` · Code ${esc(c.promoCode)} : −${eur(c.promoDiscount)}` : ""}</p>
    <p style="margin:6px 0 0;font-size:18px"><strong>Total : ${eur(order?.total)}</strong></p>`;
  const table = `<table width="100%" cellspacing="0" cellpadding="0" style="border-top:1px solid #222;border-bottom:1px solid #222;margin:10px 0">${rows}</table>${totals}`;
  const address = `${esc(c.name)}<br>${esc(c.address)}<br>${esc(c.zip)} ${esc(c.city)}<br>${esc(c.country)}`;

  await sendMail(
    c.email,
    `WHITE SAYY — commande ${order?.id} confirmée`,
    layout(
      "Merci pour ta commande",
      `<p>Ton paiement est bien reçu. Voici le récapitulatif de la commande <strong>${esc(order?.id)}</strong>.</p>${table}<p style="margin-top:18px"><strong>Livraison à</strong><br>${address}</p><p>Tu recevras un e-mail avec ton numéro de suivi dès l'expédition.</p>`,
    ),
  );
  const owner = shop.settings?.contactEmail;
  if (owner) {
    await sendMail(
      owner,
      `Nouvelle commande payée ${order?.id} — ${eur(order?.total)}`,
      layout(
        "Nouvelle commande",
        `<p>Commande <strong>${esc(order?.id)}</strong> payée.</p>${table}<p style="margin-top:18px"><strong>Client</strong><br>${address}<br>${esc(c.email)}${c.phone ? `<br>${esc(c.phone)}` : ""}</p><p>À expédier depuis l'admin, onglet Commandes.</p>`,
      ),
    );
  }
}
