import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from "recharts";
import { Users, TrendingUp, MapPin, Building2, ArrowRight } from "lucide-react";
import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

const CHART_COLORS = [
  "oklch(0.50 0.20 252)", "oklch(0.62 0.18 195)", "oklch(0.58 0.18 145)",
  "oklch(0.68 0.18 55)", "oklch(0.60 0.18 310)", "oklch(0.55 0.18 25)", "oklch(0.65 0.16 280)",
];

const STATUS_COLORS: Record<string, string> = {
  new: "#3b82f6", contacted: "#06b6d4", qualified: "#22c55e", unqualified: "#f97316", converted: "#10b981",
};
const STATUS_LABELS: Record<string, string> = {
  new: "New", contacted: "Contacted", qualified: "Qualified", unqualified: "Unqualified", converted: "Converted",
};

const SOURCE_LABELS: Record<string, string> = {
  google_places: "Google Places", llm_generated: "AI Generated", csv_import: "CSV Import",
  manual: "Manual Entry", scraper: "Scraper",
};

function StatCard({ title, value, icon: Icon, color, loading }: {
  title: string; value: string | number; icon: React.ElementType; color: string; loading?: boolean;
}) {
  return (
    <Card className="shadow-sm hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            {loading ? <Skeleton className="h-8 w-20 mt-1" /> : (
              <p className="text-3xl font-bold text-foreground mt-1" style={{ fontFamily: "'Sora', sans-serif" }}>{value}</p>
            )}
          </div>
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
            <Icon className="w-6 h-6 text-white" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Dashboard() {
  const { data: analytics, isLoading } = trpc.leads.analytics.useQuery();

  const totalLeads = analytics?.total ?? 0;
  const industriesCount = analytics?.byIndustry?.length ?? 0;
  const locationsCount = analytics?.byLocation?.length ?? 0;
  const convertedCount = analytics?.byStatus?.find((s) => s.name === "converted")?.value ?? 0;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: "'Sora', sans-serif" }}>Dashboard</h1>
        <p className="text-muted-foreground mt-1">Overview of your lead pipeline and activity</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Leads" value={totalLeads.toLocaleString()} icon={Users} color="bg-primary" loading={isLoading} />
        <StatCard title="Industries" value={industriesCount} icon={Building2} color="bg-cyan-500" loading={isLoading} />
        <StatCard title="Locations" value={locationsCount} icon={MapPin} color="bg-emerald-500" loading={isLoading} />
        <StatCard title="Converted" value={convertedCount} icon={TrendingUp} color="bg-violet-500" loading={isLoading} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Leads by Industry */}
        <Card className="shadow-sm">
          <CardHeader className="pb-2"><CardTitle className="text-base font-semibold">Leads by Industry</CardTitle></CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}</div>
            ) : analytics?.byIndustry && analytics.byIndustry.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={analytics.byIndustry.slice(0, 8)} layout="vertical" margin={{ left: 8, right: 16, top: 4, bottom: 4 }}>
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={110} />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]} name="Leads">
                    {analytics.byIndustry.slice(0, 8).map((_, index) => (
                      <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-64 flex items-center justify-center text-muted-foreground text-sm">No industry data yet. Start by scraping leads.</div>
            )}
          </CardContent>
        </Card>

        {/* Lead Status */}
        <Card className="shadow-sm">
          <CardHeader className="pb-2"><CardTitle className="text-base font-semibold">Lead Status Breakdown</CardTitle></CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-64 flex items-center justify-center"><Skeleton className="w-40 h-40 rounded-full" /></div>
            ) : analytics?.byStatus && analytics.byStatus.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={analytics.byStatus} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={3} dataKey="value" nameKey="name"
                    label={({ name, percent }) => `${STATUS_LABELS[name] ?? name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                    {analytics.byStatus.map((entry, index) => (
                      <Cell key={index} fill={STATUS_COLORS[entry.name] ?? CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} formatter={(value, name) => [value, STATUS_LABELS[name as string] ?? name]} />
                  <Legend formatter={(value) => STATUS_LABELS[value] ?? value} iconType="circle" iconSize={8} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-64 flex items-center justify-center text-muted-foreground text-sm">No status data yet.</div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Lead Sources */}
        <Card className="shadow-sm">
          <CardHeader className="pb-2"><CardTitle className="text-base font-semibold">Lead Sources</CardTitle></CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-6 w-full" />)}</div>
            ) : analytics?.bySource && analytics.bySource.length > 0 ? (
              <div className="space-y-3">
                {analytics.bySource.map((src, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-sm text-foreground">{SOURCE_LABELS[src.name] ?? src.name}</span>
                        <span className="text-sm font-semibold text-foreground">{src.value}</span>
                      </div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{
                          width: `${(src.value / (analytics.bySource[0]?.value ?? 1)) * 100}%`,
                          backgroundColor: CHART_COLORS[i % CHART_COLORS.length],
                        }} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-40 flex items-center justify-center text-muted-foreground text-sm">No source data yet.</div>
            )}
          </CardContent>
        </Card>

        {/* Recent Leads */}
        <Card className="shadow-sm">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-base font-semibold">Recent Leads</CardTitle>
            <Link href="/leads">
              <span className="text-sm text-primary hover:underline flex items-center gap-1 cursor-pointer">View all <ArrowRight className="w-3 h-3" /></span>
            </Link>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
            ) : analytics?.recentLeads && analytics.recentLeads.length > 0 ? (
              <div className="space-y-3">
                {analytics.recentLeads.map((lead) => (
                  <Link key={lead.id} href={`/leads/${lead.id}`}>
                    <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/60 transition-colors cursor-pointer">
                      <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm flex-shrink-0">
                        {(lead.firstName?.[0] ?? lead.companyName?.[0] ?? "?").toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {[lead.firstName, lead.lastName].filter(Boolean).join(" ") || lead.companyName || "Unknown"}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {lead.title ?? ""}{lead.title && lead.companyName ? " · " : ""}{lead.companyName ?? ""}
                        </p>
                      </div>
                      <Badge variant="secondary" className={`text-xs flex-shrink-0 ${
                        lead.source === "google_places" ? "bg-green-100 text-green-700" :
                        lead.source === "csv_import" ? "bg-purple-100 text-purple-700" :
                        "bg-blue-100 text-blue-700"
                      }`}>
                        {SOURCE_LABELS[lead.source ?? "manual"] ?? lead.source}
                      </Badge>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="h-40 flex flex-col items-center justify-center text-muted-foreground text-sm gap-2">
                <Users className="w-8 h-8 opacity-30" />
                <p>No leads yet. Use the scraper to find leads.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
