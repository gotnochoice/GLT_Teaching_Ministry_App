"use client";
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { AdminChartData } from "@/lib/admin-stats";

const GREEN = "#238021";
const GOLD = "#F59E0B"; // warm accent for the line chart, like Masy's orange line

function ChartCard({ title, empty, children }: { title: string; empty: boolean; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold text-gray-700">{title}</CardTitle></CardHeader>
      <CardContent>
        {empty ? <p className="flex h-[200px] items-center justify-center text-sm text-gray-400">No data yet</p> : <ResponsiveContainer width="100%" height={200}>{children as React.ReactElement}</ResponsiveContainer>}
      </CardContent>
    </Card>
  );
}

const axis = { tick: { fontSize: 11 }, axisLine: false, tickLine: false } as const;

export function DashboardCharts({ data }: { data: AdminChartData }) {
  return (
    <div className="mt-6 grid gap-6 lg:grid-cols-2">
      <ChartCard title="New students per month" empty={data.newStudents.every((d) => d.students === 0)}>
        <BarChart data={data.newStudents} barSize={28}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="month" {...axis} />
          <YAxis allowDecimals={false} {...axis} width={30} />
          <Tooltip formatter={(v) => [v, "New students"]} />
          <Bar dataKey="students" fill={GREEN} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ChartCard>

      <ChartCard title="Attendance rate by Sunday (%)" empty={data.attendance.length === 0}>
        <LineChart data={data.attendance}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="date" {...axis} />
          <YAxis domain={[0, 100]} {...axis} width={34} />
          <Tooltip formatter={(v) => [`${v}%`, "Attendance"]} />
          <Line type="monotone" dataKey="rate" stroke={GOLD} strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
        </LineChart>
      </ChartCard>

      <ChartCard title="Students in each class" empty={data.perClass.every((d) => d.students === 0)}>
        <BarChart data={data.perClass} barSize={24}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="cls" {...axis} tickFormatter={(v: string) => v.replace("Class ", "C")} />
          <YAxis allowDecimals={false} {...axis} width={30} />
          <Tooltip formatter={(v) => [v, "Active students"]} />
          <Bar dataKey="students" fill="#378f1e" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ChartCard>

      <ChartCard title="Average score by class (%)" empty={data.avgGrade.every((d) => d.average === 0)}>
        <BarChart data={data.avgGrade} barSize={24}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="cls" {...axis} tickFormatter={(v: string) => v.replace("Class ", "C")} />
          <YAxis domain={[0, 100]} {...axis} width={34} />
          <Tooltip formatter={(v) => [`${v}%`, "Average"]} />
          <Bar dataKey="average" fill="#1a6319" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ChartCard>
    </div>
  );
}
