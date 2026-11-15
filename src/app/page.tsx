import Image from "next/image";
import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { getUser } from "@/lib/session";
import { getOfficeWhatsapp } from "@/lib/progress";
import { waLink } from "@/lib/phone";
import { APP_NAME, dashboardPath } from "@/lib/utils";

// Floating topic chips around the card: [label, position classes, rotation, duration, delay]
const CHIPS: [string, string, string, string, string][] = [
  ["Salvation", "left-[8%] top-[18%]", "-6deg", "5s", "0s"],
  ["Prayer", "right-[10%] top-[20%]", "5deg", "6s", "0.6s"],
  ["The Word", "left-[4%] top-[48%]", "-3deg", "6s", "1.2s"],
  ["Holy Spirit", "right-[6%] top-[42%]", "4deg", "5s", "0.3s"],
  ["Evangelism", "left-[12%] bottom-[20%]", "5deg", "7s", "0.9s"],
  ["Holiness", "right-[14%] bottom-[22%]", "-4deg", "6s", "1.5s"],
  ["Purpose", "left-[38%] top-[6%]", "3deg", "5s", "0.4s"],
  ["Fellowship", "right-[26%] bottom-[14%]", "-5deg", "7s", "1s"],
];

export default async function Home() {
  const user = await getUser();
  const chat = waLink(await getOfficeWhatsapp(), "Hello, I'd like to join the next class.");
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#06100a] px-4 py-10">
      {/* dot grid + colour glows */}
      <div aria-hidden className="bg-dots absolute inset-0" />
      <div aria-hidden className="animate-pulse-glow absolute -left-40 top-1/4 h-[520px] w-[520px] rounded-full bg-brand blur-[140px]" />
      <div aria-hidden className="animate-pulse-glow absolute -right-32 top-10 h-[460px] w-[460px] rounded-full bg-emerald-700 blur-[150px]" style={{ animationDelay: "2s" }} />
      <div aria-hidden className="animate-pulse-glow absolute -bottom-40 right-1/4 h-[440px] w-[440px] rounded-full bg-lime-500/60 blur-[160px]" style={{ animationDelay: "4s" }} />

      {CHIPS.map(([label, pos, rot, dur, delay], i) => (
        <span
          key={label}
          aria-hidden
          className={`absolute hidden rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-sm font-medium text-white/40 backdrop-blur md:inline-block ${pos} ${i % 2 ? "animate-float-reverse" : "animate-float"}`}
          style={{ ["--r" as string]: rot, ["--dur" as string]: dur, ["--delay" as string]: delay }}
        >
          {label}
        </span>
      ))}

      <section className="relative w-full max-w-xl rounded-3xl border border-white/10 bg-white/[0.06] p-8 text-center shadow-2xl backdrop-blur-xl sm:p-10">
        <div className="mx-auto mb-5 h-28 w-28 overflow-hidden rounded-full bg-white p-1 ring-4 ring-brand/40">
          <Image src="/logo.jpg" alt="GLT" width={112} height={112} className="h-full w-full rounded-full object-cover" priority />
        </div>
        <h1 className="text-3xl font-bold leading-tight tracking-tight text-white sm:text-4xl">{APP_NAME}</h1>
        <p className="mt-2 text-lg font-medium text-brand-light">Your discipleship learning portal</p>

        <div className="mt-6 flex flex-wrap justify-center gap-2 text-sm text-white/80">
          {["9 classes", "Sundays", "In person & online"].map((t) => (
            <span key={t} className="rounded-full border border-white/10 bg-white/5 px-4 py-1.5 font-medium">{t}</span>
          ))}
        </div>

        <div className="my-7 h-px bg-white/10" />

        <div className="space-y-3">
          <Link href={user ? dashboardPath(user.role) : "/login"} className="block rounded-lg bg-brand px-6 py-4 text-lg font-semibold text-white shadow-lg shadow-black/30 transition-colors hover:bg-brand-dark">
            {user ? "Go to my dashboard" : "Sign in to your account"}
          </Link>
          {!user && (
            <Link href="/join" className="block rounded-lg border border-white/15 bg-white/5 px-6 py-4 text-lg font-semibold text-white transition-colors hover:bg-white/10">
              Join the next class
            </Link>
          )}
        </div>

        <p className="mt-6 text-sm text-white/45">
          Already spoken to us on WhatsApp? You&apos;re in the right place.
          {chat && (
            <>
              {" "}
              <a href={chat} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-medium text-brand-light hover:underline"><MessageCircle className="h-4 w-4" />Chat with us</a>
            </>
          )}
        </p>
      </section>

      <p className="absolute bottom-4 left-0 right-0 text-center text-xs text-white/30">© {new Date().getFullYear()} GLT Church · God&apos;s Love Tabernacle International Church</p>
    </main>
  );
}
