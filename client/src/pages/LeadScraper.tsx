import { useState, useEffect, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Zap, CheckCircle2, XCircle, Clock, Loader2, Users, ChevronRight, MapPin } from "lucide-react";
import { toast } from "sonner";
import { Link } from "wouter";

const CONTRACTOR_TRADES = [
  "Roofing Contractor",
  "HVAC Contractor",
  "Plumber",
  "Electrician",
  "General Contractor",
  "Landscaper",
  "Painting Contractor",
  "Pest Control",
  "Solar Installation",
  "Window Installation",
  "Concrete Contractor",
  "Fencing Contractor",
  "Pool Builder",
  "Flooring Contractor",
  "Home Remodeling",
];

const ARIZONA_LOCATIONS = [
  "Tucson, AZ",
  "Phoenix, AZ",
  "Scottsdale, AZ",
  "Mesa, AZ",
  "Chandler, AZ",
  "Gilbert, AZ",
  "Tempe, AZ",
  "Peoria, AZ",
  "Surprise, AZ",
  "Flagstaff, AZ",
  "Prescott, AZ",
  "Yuma, AZ",
  "Sierra Vista, AZ",
  "Maricopa County, AZ",
  "Pima County, AZ",
];

const STATUS_ICONS: Record<string, React.ReactNode> = {
  pending: <Clock className="w-4 h-4 text-muted-foreground" />,
  running: <Loader2 className="w-4 h-4 text-primary animate-spin" />,
  completed: <CheckCircle2 className="w-4 h-4 text-green-500" />,
  failed: <XCircle className="w-4 h-4 text-destructive" />,
};

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-muted text-muted-foreground",
  running: "bg-blue-100 text-blue-700",
  completed: "bg-green-100 text-green-700",
  failed: "bg-red-100 text-red-700",
};

export default function LeadScraper() {
  const [form, setForm] = useState({
    industry: "all",
    jobTitle: "",
    location: "",
    companySize: "all",
    keywords: "",
    maxResults: "20",
    mode: "google_places" as "google_places" | "llm_generate",
  });
  const [activeJobId, setActiveJobId] = useState<number | null>(null);
  const [lastMode, setLastMode] = useState<string>("");
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const utils = trpc.useUtils();
  const { data: history, refetch: refetchHistory } = trpc.scrape.history.useQuery();
  const { data: activeJob } = trpc.scrape.status.useQuery(
    { jobId: activeJobId! },
    { enabled: activeJobId !== null }
  );

  const startMutation = trpc.scrape.start.useMutation({
    onSuccess: (data) => {
      setActiveJobId(data.jobId);
      setLastMode(data.mode);
      toast.info("Scraping started...");
    },
    onError: (err) => toast.error(`Failed to start: ${err.message}`),
  });

  useEffect(() => {
    if (!activeJobId) return;
    if (activeJob?.status === "completed" || activeJob?.status === "failed") {
      if (pollingRef.current) clearInterval(pollingRef.current);
      refetchHistory();
      utils.leads.list.invalidate();
      utils.leads.analytics.invalidate();
      if (activeJob.status === "completed") {
        toast.success(`Done! Found ${activeJob.savedCount} leads.`);
      } else {
        toast.error(`Failed: ${activeJob.errorMessage}`);
      }
      return;
    }
    if (pollingRef.current) clearInterval(pollingRef.current);
    pollingRef.current = setInterval(() => {
      utils.scrape.status.invalidate({ jobId: activeJobId });
    }, 2000);
    return () => { if (pollingRef.current) clearInterval(pollingRef.current); };
  }, [activeJobId, activeJob?.status]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    startMutation.mutate({
      industry: form.industry !== "all" ? form.industry : undefined,
      jobTitle: form.jobTitle || undefined,
      location: form.location || undefined,
      companySize: form.companySize !== "all" ? form.companySize : undefined,
      keywords: form.keywords || undefined,
      maxResults: parseInt(form.maxResults) || 20,
      mode: "google_places",
    });
  };

  const set = (field: string, value: string) => setForm((prev) => ({ ...prev, [field]: value }));
  const isRunning = activeJob?.status === "running" || activeJob?.status === "pending";

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: "'Sora', sans-serif" }}>Lead Scraper</h1>
        <p className="text-muted-foreground mt-1">Find real contractors and businesses using Google Places</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3">
          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Zap className="w-4 h-4 text-primary" />
                Search Parameters
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-start gap-2 p-3 bg-green-50 border border-green-200 rounded-lg mb-4 text-sm">
                <MapPin className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-green-800">Real Business Data</p>
                  <p className="text-green-700 text-xs">Returns actual businesses from Google Maps with real phone numbers, websites, ratings, and reviews. Requires a Google Places API key in Settings.</p>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label>Business Type / Trade</Label>
                  <Select value={form.jobTitle} onValueChange={(v) => set("jobTitle", v)}>
                    <SelectTrigger><SelectValue placeholder="Select a contractor trade..." /></SelectTrigger>
                    <SelectContent>
                      {CONTRACTOR_TRADES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Location</Label>
                  <Select value={form.location} onValueChange={(v) => set("location", v)}>
                    <SelectTrigger><SelectValue placeholder="Select a location..." /></SelectTrigger>
                    <SelectContent>
                      {ARIZONA_LOCATIONS.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Input
                    value={ARIZONA_LOCATIONS.includes(form.location) ? "" : form.location}
                    onChange={(e) => set("location", e.target.value)}
                    placeholder="...or type a custom location"
                    className="mt-1"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Additional Keywords (optional)</Label>
                  <Input value={form.keywords} onChange={(e) => set("keywords", e.target.value)} placeholder="e.g. commercial, residential, licensed" />
                </div>

                <div className="space-y-1.5">
                  <Label>Max Results</Label>
                  <Select value={form.maxResults} onValueChange={(v) => set("maxResults", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10 leads</SelectItem>
                      <SelectItem value="20">20 leads</SelectItem>
                      <SelectItem value="40">40 leads</SelectItem>
                      <SelectItem value="60">60 leads</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button type="submit" className="w-full gap-2" disabled={startMutation.isPending || isRunning}>
                  {isRunning ? (
                    <><Loader2 className="w-4 h-4 animate-spin" />Scraping in progress...</>
                  ) : (
                    <><Search className="w-4 h-4" />Start Scraping</>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2 space-y-4">
          {activeJobId && activeJob && (
            <Card className="shadow-sm border-primary/20">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  {STATUS_ICONS[activeJob.status]}
                  Current Job
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Progress</span>
                  <span className="font-medium">{activeJob.progress}%</span>
                </div>
                <Progress value={activeJob.progress} className="h-2" />
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="bg-muted/50 rounded-lg p-2 text-center">
                    <p className="text-muted-foreground text-xs">Found</p>
                    <p className="font-bold text-lg">{activeJob.totalFound}</p>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-2 text-center">
                    <p className="text-muted-foreground text-xs">Saved</p>
                    <p className="font-bold text-lg">{activeJob.savedCount}</p>
                  </div>
                </div>
                <Badge className={`w-full justify-center capitalize ${STATUS_COLORS[activeJob.status]}`} variant="secondary">
                  {activeJob.status === "running" ? "Searching for leads..." : activeJob.status}
                </Badge>
                {activeJob.status === "completed" && (
                  <Link href="/leads">
                    <Button variant="outline" size="sm" className="w-full gap-2">
                      <Users className="w-4 h-4" />View Leads<ChevronRight className="w-3 h-3" />
                    </Button>
                  </Link>
                )}
                {activeJob.errorMessage && (
                  <p className="text-xs text-destructive bg-destructive/10 rounded p-2">{activeJob.errorMessage}</p>
                )}
              </CardContent>
            </Card>
          )}

          <Card className="shadow-sm">
            <CardHeader className="pb-3"><CardTitle className="text-base">Recent Jobs</CardTitle></CardHeader>
            <CardContent>
              {!history || history.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No scraping jobs yet</p>
              ) : (
                <div className="space-y-2">
                  {history.map((job) => (
                    <div key={job.id} className="flex items-center gap-2 p-2 rounded-lg bg-muted/40 text-sm">
                      {STATUS_ICONS[job.status]}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">
                          {[job.industry, job.jobTitle, job.location].filter(Boolean).join(", ") || "General search"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {job.savedCount} saved · {job.scrapeMode === "google_places" ? "📍 Places" : "🤖 AI"} · {new Date(job.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <Badge variant="secondary" className={`text-xs flex-shrink-0 ${STATUS_COLORS[job.status]}`}>{job.status}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
