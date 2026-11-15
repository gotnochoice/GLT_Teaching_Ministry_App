/** Pure helpers (safe in server and client components). */

/** Digits-only local numbers (e.g. 0803...) become E.164 using DEFAULT_COUNTRY_CODE (default Nigeria, 234). */
export function toE164(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const raw = phone.replace(/[\s\-().]/g, "");
  if (raw.startsWith("+")) return /^\+\d{8,15}$/.test(raw) ? raw : null;
  const cc = process.env.NEXT_PUBLIC_DEFAULT_COUNTRY_CODE ?? process.env.DEFAULT_COUNTRY_CODE ?? "234";
  const full = raw.startsWith("00") ? `+${raw.slice(2)}` : `+${cc}${raw.replace(/^0+/, "")}`;
  return /^\+\d{8,15}$/.test(full) ? full : null;
}

/** Click-to-chat link: opens WhatsApp with the person (and optional pre-filled text). Free, no API. */
export function waLink(phone: string | null | undefined, text?: string): string | null {
  const e164 = toE164(phone);
  if (!e164) return null;
  return `https://wa.me/${e164.slice(1)}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
}

/** Only genuine WhatsApp invite links are accepted for class groups. */
export function isWhatsAppGroupLink(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === "https:" && (u.hostname === "chat.whatsapp.com" || u.hostname === "whatsapp.com" && u.pathname.startsWith("/channel/"));
  } catch {
    return false;
  }
}
