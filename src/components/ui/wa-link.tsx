import { MessageCircle } from "lucide-react";
import { waLink } from "@/lib/phone";

/** One-tap WhatsApp chat (free click-to-chat link). Renders nothing if there is no usable number. */
export function WaLink({ phone, text, label = "WhatsApp" }: { phone: string | null | undefined; text?: string; label?: string }) {
  const href = waLink(phone, text);
  if (!href) return null;
  return (
    <a href={href} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-medium text-brand hover:underline">
      <MessageCircle className="h-3.5 w-3.5" />{label}
    </a>
  );
}
