"use client";
import { useRouter } from "next/navigation";
import { Bar, BarChart, CartesianGrid, Legend, LabelList, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { AdminChartData } from "@/lib/admin-stats";

const GREEN = "#238021";
const LIGHT = "#6fbf4a";
const GOLD = "#F59E0B"; // warm accent for the line chart, like Masy's orange line

function ChartCard({ title, hint, empty, children }: { title: string; hint?: string; empty: boolean; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold text-gray-700">{title}</CardTitle>
        {hint && <p className="text-xs text-gray-400">{hint}</p>}
      </CardHeader>
      <CardContent>
        {empty ? <p className="flex h-[200px] items-center justify-center text-sm text-gray-400">No data yet</p> : <ResponsiveContainer width="100%" height={210}>{children as React.ReactElement}</ResponsiveContainer>}
      </CardContent>
    </Card>
  );
}

const axis = { tick: { fontSize: 11 }, axisLine: false, tickLine: false } as const;
const label = { position: "top", fontSize: 11, fill: "#4b5563" } as const;

export function DashboardCharts({ data, cohorts, selected }: { data: AdminChartData; cohorts: { id: string; name: string }[]; selected?: string }) {
  const router = useRouter();
  const scope = selected ? cohorts.find((c) => c.id === selected)?.name ?? "this cohort" : "all cohorts";
  return (
    <div className="mt-6">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-gray-900">Charts <span className="text-sm font-normal text-gray-500">· {scope}</span></h2>
        <select
          aria-label="Filter charts by cohort"
          value={selected ?? ""}
          onChange={(e) => router.push(e.target.value ? `?cohort=${encodeURIComponent(e.target.value)}` : "?")}
          className="h-9 rounded-md border border-gray-300 bg-white px-2 text-sm"
        >
          <option value="">All cohorts</option>
          {cohorts.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>
      <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
        <ChartCard title="New students per month" hint="By enrolment date, last 6 months" empty={data.newStudents.every((d) => d.students === 0)}>
          <BarChart data={data.newStudents} barSize={28} margin={{ top: 18 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="month" {...axis} />
            <YAxis allowDecimals={false} {...axis} width={28} />
            <Tooltip formatter={(v) => [v, "New students"]} />
            <Bar dataKey="students" fill={GREEN} radius={[4, 4, 0, 0]}><LabelList dataKey="students" {...label} /></Bar>
          </BarChart>
        </ChartCard>

        <ChartCard title="Attendance by Sunday" hint="Share of the cohort present (excused not counted); make-ups count" empty={data.attendance.length === 0}>
          <LineChart data={data.attendance} margin={{ top: 18, right: 14 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="label" {...axis} />
            <YAxis domain={[0, 100]} {...axis} width={44} tickFormatter={(v) => `${v}%`} />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const d = payload[0].payload as AdminChartData["attendance"][number];
                return (
                  <div className="rounded-md border border-gray-200 bg-white p-2 text-xs shadow">
                    <p className="font-semibold">{d.className}</p>
                    <p className="text-gray-600">{d.present} of {d.total} present ({d.rate}%)</p>
                  </div>
                );
              }}
            />
            <Line type="monotone" dataKey="rate" stroke={GOLD} strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }}>
              <LabelList dataKey="rate" position="top" fontSize={11} fill="#4b5563" formatter={(v) => `${v}%`} />
            </Line>
          </LineChart>
        </ChartCard>

        <ChartCard title="Where students are now" hint="Active students currently in each class, by class code" empty={data.perClass.every((d) => d.students === 0)}>
          <BarChart data={data.perClass} barSize={24} margin={{ top: 18 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="cls" {...axis} tickFormatter={(v: string) => v.match(/\d+$/)?.[0] ?? v} />
            <YAxis allowDecimals={false} {...axis} width={28} />
            <Tooltip formatter={(v) => [v, "Active students"]} />
            <Bar dataKey="students" fill={LIGHT} radius={[4, 4, 0, 0]}><LabelList dataKey="students" {...label} /></Bar>
          </BarChart>
        </ChartCard>

        <ChartCard title="Average score by class (%)" hint="Tests and assignments shown separately; shows where students struggle" empty={data.avgGrade.every((d) => d.tests === null && d.assignments === null)}>
          <BarChart data={data.avgGrade} barGap={2} margin={{ top: 18 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="cls" {...axis} tickFormatter={(v: string) => v.match(/\d+$/)?.[0] ?? v} />
            <YAxis domain={[0, 100]} {...axis} width={34} />
            <Tooltip formatter={(v, name) => [v === null ? "no scores" : `${v}%`, name]} />
            <Legend wrapperStyle={{ fontSize: 11 }} iconType="circle" />
            <Bar dataKey="tests" name="Tests" fill={GREEN} radius={[3, 3, 0, 0]} />
            <Bar dataKey="assignments" name="Assignments" fill={GOLD} radius={[3, 3, 0, 0]} />
          </BarChart>
        </ChartCard>
      </div>
    </div>
  );
}
