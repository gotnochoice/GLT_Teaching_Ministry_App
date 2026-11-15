import Link from "next/link";
import Image from "next/image";
import { BookOpen, ClipboardCheck, HandHeart, GraduationCap } from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getUser } from "@/lib/session";
import { APP_NAME, dashboardPath } from "@/lib/utils";

const steps = [
  { icon: BookOpen, title: "Nine classes", text: "Weekly classes every Sunday, in person or online, taken in order." },
  { icon: ClipboardCheck, title: "A test and an assignment", text: "Every class ends with a test and an assignment before you move on." },
  { icon: HandHeart, title: "Prayer & evangelism", text: "Two prayers and two evangelism outings — required, verified by your teacher." },
  { icon: GraduationCap, title: "Exam & internship", text: "A final exam and a ministry internship, then graduation." },
];

export default async function Home() {
  const user = await getUser();
  return (
    <>
      <Navbar user={user ?? undefined} />
      <main>
        <section className="bg-ink px-6 py-24 text-white">
          <div className="mx-auto max-w-3xl text-center">
            <Image src="/logo-white.png" alt="GLT" width={110} height={102} className="mx-auto mb-6 h-24 w-auto" priority />
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.3em] text-brand-light">GLT Church · Worldwide</p>
            <h1 className="font-display text-5xl uppercase leading-none tracking-wide sm:text-7xl">{APP_NAME}<span className="block text-brand-light">Grow in the Word.</span></h1>
            <p className="mx-auto mt-4 max-w-xl text-lg text-white/80">
              Grow in the faith through nine guided classes. Track your classes, tests, assignments and graduation in one place.
            </p>
            <div className="mt-8">
              <Link href={user ? dashboardPath(user.role) : "/login"}>
                <Button size="lg" className="rounded-none px-8 uppercase tracking-widest">{user ? "Go to my dashboard" : "Log in"}</Button>
              </Link>
            </div>
          </div>
        </section>
        <section className="mx-auto grid max-w-5xl gap-4 px-6 py-14 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map(({ icon: Icon, title, text }) => (
            <Card key={title}>
              <CardContent className="p-5">
                <Icon className="mb-3 h-6 w-6 text-brand" />
                <h3 className="font-display text-xl uppercase tracking-wide text-ink">{title}</h3>
                <p className="mt-1 text-sm text-gray-500">{text}</p>
              </CardContent>
            </Card>
          ))}
        </section>
      </main>
    </>
  );
}
