import { useState, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { Link } from "wouter";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Search,
  Download,
  Upload,
  Filter,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Plus,
  X,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Archive,
  ArchiveRestore,
} from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import AddLeadDialog from "@/components/AddLeadDialog";

const INDUSTRIES = [
  "Construction",
  "Home Services",
  "Roofing",
  "HVAC",
  "Plumbing",
  "Electrical",
  "Technology",
  "Healthcare",
  "Finance",
  "Education",
  "Retail",
  "Manufacturing",
  "Real Estate",
  "Marketing",
  "Legal",
  "Consulting",
  "Media",
  "Logistics",
  "Energy",
  "Hospitality",
];

const COMPANY_SIZES = [
  "1-10",
  "11-50",
  "51-200",
  "201-500",
  "501-1000",
  "1001-5000",
  "5001+",
];

const STATUSES = ["new", "contacted", "qualified", "unqualified", "converted"];

const STATUS_COLORS: Record<string, string> = {
  new: "bg-blue-100 text-blue-700",
  contacted: "bg-cyan-100 text-cyan-700",
  qualified: "bg-green-100 text-green-700",
  unqualified: "bg-orange-100 text-orange-700",
  converted: "bg-emerald-100 text-emerald-700",
};

const SORT_KEYS = ["newest", "opportunity", "rating_low", "reviews_low", "website_quality"] as const;
type SortKey = (typeof SORT_KEYS)[number];

function SortableHeader({
  label,
  sortKey,
  currentSort,
  sortDir,
  onSort,
}: {
  label: string;
  sortKey: SortKey;
  currentSort: string;
  sortDir: "asc" | "desc";
  onSort: (key: SortKey) => void;
}) {
  const active = currentSort === sortKey;
  return (
    <button
      className={`flex items-center gap-1 font-semibold hover:text-primary transition-colors ${active ? "text-primary" : "text-foreground"}`}
      onClick={() => onSort(sortKey)}
    >
      {label}
      {active
        ? sortDir === "asc"
          ? <ArrowUp className="w-3 h-3" />
          : <ArrowDown className="w-3 h-3" />
        : <ArrowUpDown className="w-3 h-3 opacity-40" />}
    </button>
  );
}

export default function LeadsDatabase() {
  const [search, setSearch] = useState("");
  const [industry, setIndustry] = useState("all");
  const [location, setLocation] = useState("");
  const [companySize, setCompanySize] = useState("all");
  const [status, setStatus] = useState("all");
  const [title, setTitle] = useState("");
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [sortBy, setSortBy] = useState("newest");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [showArchived, setShowArchived] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [showFilenameDialog, setShowFilenameDialog] = useState(false);
  const [exportFilename, setExportFilename] = useState("");

  const handleSort = (key: SortKey) => {
    if (sortBy === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortBy(key);
      setSortDir("desc");
    }
    setPage(1);
  };

  const pageSize = 25;

  const filters = {
    search: search || undefined,
    industry: industry !== "all" ? industry : undefined,
    location: location || undefined,
    companySize: companySize !== "all" ? companySize : undefined,
    status: status !== "all" ? status : undefined,
    title: title || undefined,
    sortBy: sortBy as "newest" | "opportunity" | "rating_low" | "reviews_low" | "website_quality",
    sortDir,
    page,
    pageSize,
    includeArchived: showArchived,
  };

  const { data, isLoading, refetch } = trpc.leads.list.useQuery(filters);

  const archiveMutation = trpc.leads.archive.useMutation({
    onSuccess: () => {
      toast.success("Lead archived");
      utils.leads.list.invalidate();
      utils.leads.analytics.invalidate();
    },
    onError: () => toast.error("Failed to archive lead"),
  });

  const unarchiveMutation = trpc.leads.unarchive.useMutation({
    onSuccess: () => {
      toast.success("Lead restored");
      utils.leads.list.invalidate();
      utils.leads.analytics.invalidate();
    },
    onError: () => toast.error("Failed to restore lead"),
  });
  const { data: csvData } = trpc.leads.exportCsv.useQuery(
    {
      search: filters.search,
      industry: filters.industry,
      location: filters.location,
      companySize: filters.companySize,
      status: filters.status,
      title: filters.title,
    },
    { enabled: false }
  );

  const utils = trpc.useUtils();

  const deleteMutation = trpc.leads.delete.useMutation({
    onSuccess: () => {
      toast.success("Lead deleted");
      utils.leads.list.invalidate();
      utils.leads.analytics.invalidate();
    },
    onError: () => toast.error("Failed to delete lead"),
  });

  const handleExport = useCallback(async () => {
    try {
      const result = await utils.leads.exportCsv.fetch({
        search: filters.search,
        industry: filters.industry,
        location: filters.location,
        companySize: filters.companySize,
        status: filters.status,
        title: filters.title,
      });
      if (!result?.csv) return;
      const blob = new Blob([result.csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `jupiter-leads-${new Date().toISOString().split("T")[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`Exported ${data?.total ?? 0} leads`);
    } catch {
      toast.error("Export failed");
    }
  }, [filters, data?.total, utils]);

  const csvImportMutation = trpc.leads.csvImport.useMutation({
    onSuccess: (result) => {
      toast.success(`Imported ${result.count} leads`);
      utils.leads.list.invalidate();
      utils.leads.analytics.invalidate();
    },
    onError: () => toast.error("CSV import failed"),
  });

  const handleImportCSV = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
        if (lines.length < 2) { toast.error("CSV file is empty"); return; }

        const headers = lines[0].split(',').map(h => h.replace(/^"|"$/g, '').trim());
        const rows = lines.slice(1).map(line => {
          // Handle quoted CSV fields
          const values: string[] = [];
          let current = '';
          let inQuotes = false;
          for (const char of line) {
            if (char === '"') { inQuotes = !inQuotes; }
            else if (char === ',' && !inQuotes) { values.push(current.trim()); current = ''; }
            else { current += char; }
          }
          values.push(current.trim());

          const row: Record<string, string> = {};
          headers.forEach((h, i) => { row[h] = values[i] ?? ''; });
          return row;
        });

        csvImportMutation.mutate({ rows });
      } catch { toast.error("Failed to parse CSV"); }
    };
    reader.readAsText(file);
    e.target.value = '';
  }, []);

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === leads.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(leads.map((l) => l.id)));
    }
  };

  const buildAutoFilename = () => {
    const parts: string[] = [];
    if (filters.industry) parts.push(filters.industry.toLowerCase().replace(/\s+/g, "-"));
    if (filters.location) parts.push(filters.location.toLowerCase().replace(/[,\s]+/g, "-"));
    parts.push(new Date().toISOString().split("T")[0]);
    return `jupiter-${parts.join("-")}`;
  };

  const openExportSelected = () => {
    setExportFilename(buildAutoFilename());
    setShowFilenameDialog(true);
  };

  const downloadSelectedCsv = () => {
    const selected = leads.filter((l) => selectedIds.has(l.id));
    const headers = [
      "ID", "First Name", "Last Name", "Title", "Email", "Phone",
      "Company", "Website", "Industry", "Company Size", "Location",
      "Country", "Rating", "Reviews", "Address", "Website Quality Score",
      "Opportunity Score", "Status", "Source", "LinkedIn", "Notes", "Created At",
    ];
    const rows = selected.map((l) => [
      l.id, l.firstName ?? "", l.lastName ?? "", l.title ?? "",
      l.email ?? "", l.phone ?? "", l.companyName ?? "",
      l.companyWebsite ?? "", l.industry ?? "", l.companySize ?? "",
      l.location ?? "", l.country ?? "", l.googleRating ?? "",
      l.googleReviewCount ?? "", l.address ?? "",
      (l as any).websiteQualityScore ?? "",
      (l as any).opportunityScore ?? "",
      l.status, l.source ?? "", l.linkedinUrl ?? "",
      (l.notes ?? "").replace(/\n/g, " "), l.createdAt,
    ]);
    const csv = [headers, ...rows]
      .map((row) => row.map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${exportFilename.trim() || buildAutoFilename()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setShowFilenameDialog(false);
    setSelectedIds(new Set());
    toast.success(`Downloaded ${selected.length} leads`);
  };

  const resetFilters = () => {
    setSearch("");
    setIndustry("all");
    setLocation("");
    setCompanySize("all");
    setStatus("all");
    setTitle("");
    setSortBy("newest");
    setPage(1);
  };

  const hasActiveFilters =
    search || industry !== "all" || location || companySize !== "all" || status !== "all" || title;

  const totalPages = Math.ceil((data?.total ?? 0) / pageSize);
  const leads = data?.leads ?? [];

  return (
    <div className="p-6 space-y-4 max-w-full">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: "'Sora', sans-serif" }}>
            Lead Database
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {data?.total ?? 0} leads total
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={showArchived ? "default" : "outline"}
            size="sm"
            onClick={() => { setShowArchived(!showArchived); setPage(1); }}
            className="gap-2"
          >
            <Archive className="w-4 h-4" />
            {showArchived ? "Viewing Archived" : "View Archived"}
          </Button>
          <label>
            <input type="file" accept=".csv" onChange={handleImportCSV} className="hidden" />
            <Button variant="outline" size="sm" className="gap-2" asChild>
              <span><Upload className="w-4 h-4" />Import CSV</span>
            </Button>
          </label>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            className="gap-2"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </Button>
          <Button size="sm" onClick={() => setAddOpen(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            Add Lead
          </Button>
        </div>
      </div>

      {/* Selection toolbar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center justify-between bg-primary/10 border border-primary/20 rounded-lg px-4 py-2">
          <span className="text-sm font-medium text-primary">{selectedIds.size} lead{selectedIds.size !== 1 ? "s" : ""} selected</span>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => setSelectedIds(new Set())} className="gap-1">
              <X className="w-3 h-3" />Clear
            </Button>
            <Button size="sm" onClick={openExportSelected} className="gap-2">
              <Download className="w-4 h-4" />Download Selected
            </Button>
          </div>
        </div>
      )}

      {/* Filename dialog */}
      {showFilenameDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-background rounded-xl shadow-xl p-6 w-full max-w-sm space-y-4">
            <h2 className="text-base font-semibold">Name your CSV file</h2>
            <div className="flex items-center gap-2">
              <Input
                value={exportFilename}
                onChange={(e) => setExportFilename(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && downloadSelectedCsv()}
                autoFocus
              />
              <span className="text-sm text-muted-foreground">.csv</span>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowFilenameDialog(false)}>Cancel</Button>
              <Button size="sm" onClick={downloadSelectedCsv}>Download</Button>
            </div>
          </div>
        </div>
      )}

      {/* Search & Filter Bar */}
      <Card className="shadow-sm">
        <CardContent className="p-4 space-y-3">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, company, email, or title..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="pl-9"
              />
            </div>
            <Select value={sortBy} onValueChange={(v) => { setSortBy(v); setPage(1); }}>
              <SelectTrigger className="w-[200px] text-sm">
                <SelectValue placeholder="Sort by..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest First</SelectItem>
                <SelectItem value="opportunity">🎯 Opportunity Score</SelectItem>
                <SelectItem value="rating_low">⭐ Lowest Rating</SelectItem>
                <SelectItem value="reviews_low">📊 Fewest Reviews</SelectItem>
                <SelectItem value="website_quality">🌐 Worst Website</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setShowFilters(!showFilters)}
              className={showFilters ? "bg-primary text-white hover:bg-primary/90" : ""}
            >
              <Filter className="w-4 h-4" />
            </Button>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={resetFilters} className="gap-1 text-muted-foreground">
                <X className="w-3 h-3" />
                Clear
              </Button>
            )}
          </div>

          {showFilters && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 pt-1">
              <Select value={industry} onValueChange={(v) => { setIndustry(v); setPage(1); }}>
                <SelectTrigger className="text-sm">
                  <SelectValue placeholder="Industry" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Industries</SelectItem>
                  {INDUSTRIES.map((i) => (
                    <SelectItem key={i} value={i}>{i}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Input
                placeholder="Location"
                value={location}
                onChange={(e) => { setLocation(e.target.value); setPage(1); }}
                className="text-sm"
              />

              <Select value={companySize} onValueChange={(v) => { setCompanySize(v); setPage(1); }}>
                <SelectTrigger className="text-sm">
                  <SelectValue placeholder="Company Size" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sizes</SelectItem>
                  {COMPANY_SIZES.map((s) => (
                    <SelectItem key={s} value={s}>{s} employees</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1); }}>
                <SelectTrigger className="text-sm">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  {STATUSES.map((s) => (
                    <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Input
                placeholder="Job Title"
                value={title}
                onChange={(e) => { setTitle(e.target.value); setPage(1); }}
                className="text-sm"
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead className="w-10">
                  <input
                    type="checkbox"
                    className="w-4 h-4 cursor-pointer"
                    checked={leads.length > 0 && selectedIds.size === leads.length}
                    onChange={toggleSelectAll}
                  />
                </TableHead>
                <TableHead className="font-semibold text-foreground w-48">Contact</TableHead>
                <TableHead className="font-semibold text-foreground">Company</TableHead>
                <TableHead className="font-semibold text-foreground">Industry</TableHead>
                <TableHead className="font-semibold text-foreground">Location</TableHead>
                <TableHead className="font-semibold text-foreground">
                  <SortableHeader label="⭐ Rating" sortKey="rating_low" currentSort={sortBy} sortDir={sortDir} onSort={handleSort} />
                </TableHead>
                <TableHead className="font-semibold text-foreground">
                  <SortableHeader label="Reviews" sortKey="reviews_low" currentSort={sortBy} sortDir={sortDir} onSort={handleSort} />
                </TableHead>
                <TableHead className="font-semibold text-foreground">
                  <SortableHeader label="🌐 Web" sortKey="website_quality" currentSort={sortBy} sortDir={sortDir} onSort={handleSort} />
                </TableHead>
                <TableHead className="font-semibold text-foreground">
                  <SortableHeader label="🎯 Opp." sortKey="opportunity" currentSort={sortBy} sortDir={sortDir} onSort={handleSort} />
                </TableHead>
                <TableHead className="font-semibold text-foreground">Status</TableHead>
                <TableHead className="font-semibold text-foreground w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                [...Array(8)].map((_, i) => (
                  <TableRow key={i}>
                    {[...Array(10)].map((_, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : leads.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={11} className="text-center py-16 text-muted-foreground">
                    <div className="flex flex-col items-center gap-2">
                      <Search className="w-8 h-8 opacity-30" />
                      <p className="font-medium">No leads found</p>
                      <p className="text-sm">
                        {hasActiveFilters
                          ? "Try adjusting your filters"
                          : "Use the Lead Scraper to find leads"}
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                leads.map((lead) => (
                  <TableRow
                    key={lead.id}
                    className={`hover:bg-muted/40 transition-colors cursor-pointer ${selectedIds.has(lead.id) ? "bg-primary/5" : ""}`}
                  >
                    <TableCell>
                      <input
                        type="checkbox"
                        className="w-4 h-4 cursor-pointer"
                        checked={selectedIds.has(lead.id)}
                        onChange={() => toggleSelect(lead.id)}
                      />
                    </TableCell>
                    <TableCell>
                      <Link href={`/leads/${lead.id}`}>
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold flex-shrink-0">
                            {(lead.firstName?.[0] ?? lead.companyName?.[0] ?? "?").toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-foreground truncate hover:text-primary transition-colors">
                              {[lead.firstName, lead.lastName].filter(Boolean).join(" ") || "—"}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">{lead.email ?? "—"}</p>
                          </div>
                        </div>
                      </Link>
                    </TableCell>
                    <TableCell>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate max-w-[160px]">
                          {lead.companyName ?? "—"}
                        </p>
                        {lead.companyWebsite ? (
                          <a
                            href={`https://${lead.companyWebsite.replace(/^https?:\/\//, "")}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-primary hover:underline flex items-center gap-0.5"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {lead.companyWebsite.replace(/^https?:\/\//, "").split("/")[0]}
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        ) : (
                          <span className="text-xs text-red-500 font-medium">No website</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{lead.industry ?? "—"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[120px] truncate">
                      {lead.location ?? "—"}
                    </TableCell>
                    <TableCell className="text-sm">
                      {lead.googleRating ? (
                        <span className={
                          parseFloat(lead.googleRating) < 3.0 ? "text-red-600 font-bold" :
                          parseFloat(lead.googleRating) < 4.0 ? "text-orange-600 font-semibold" :
                          "text-green-600"
                        }>
                          {parseFloat(lead.googleRating).toFixed(1)}
                        </span>
                      ) : <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell className="text-sm">
                      {lead.googleReviewCount != null ? (
                        <span className={
                          lead.googleReviewCount < 5 ? "text-red-600 font-bold" :
                          lead.googleReviewCount < 10 ? "text-orange-600 font-semibold" :
                          "text-muted-foreground"
                        }>
                          {lead.googleReviewCount}
                        </span>
                      ) : <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell className="text-sm">
                      {lead.websiteQualityScore != null ? (
                        <Badge variant="secondary" className={`text-xs font-bold ${
                          lead.websiteQualityScore <= 3 ? "bg-red-100 text-red-700" :
                          lead.websiteQualityScore <= 5 ? "bg-orange-100 text-orange-700" :
                          lead.websiteQualityScore <= 7 ? "bg-yellow-100 text-yellow-700" :
                          "bg-green-100 text-green-700"
                        }`}>
                          {lead.websiteQualityScore}/10
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {(lead as any).opportunityScore != null ? (
                        <Badge variant="secondary" className={`text-xs font-bold ${
                          (lead as any).opportunityScore >= 60 ? "bg-red-100 text-red-700" :
                          (lead as any).opportunityScore >= 30 ? "bg-orange-100 text-orange-700" :
                          "bg-green-100 text-green-700"
                        }`}>
                          {(lead as any).opportunityScore}
                        </Badge>
                      ) : "—"}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={`text-xs capitalize ${STATUS_COLORS[lead.status] ?? ""}`}
                      >
                        {lead.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Link href={`/leads/${lead.id}`}>
                          <Button variant="ghost" size="icon" className="w-7 h-7">
                            <ExternalLink className="w-3.5 h-3.5" />
                          </Button>
                        </Link>
                        {showArchived ? (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="w-7 h-7 text-green-600 hover:text-green-700"
                            onClick={(e) => { e.stopPropagation(); unarchiveMutation.mutate({ id: lead.id }); }}
                            title="Restore lead"
                          >
                            <ArchiveRestore className="w-3.5 h-3.5" />
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="w-7 h-7 text-muted-foreground hover:text-orange-600"
                            onClick={(e) => { e.stopPropagation(); archiveMutation.mutate({ id: lead.id }); }}
                            title="Archive lead"
                          >
                            <Archive className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-muted/20">
            <p className="text-sm text-muted-foreground">
              Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, data?.total ?? 0)} of{" "}
              {data?.total ?? 0}
            </p>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                className="w-8 h-8"
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-sm px-2">
                {page} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="icon"
                className="w-8 h-8"
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      <AddLeadDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        onSuccess={() => {
          refetch();
          utils.leads.analytics.invalidate();
        }}
      />
    </div>
  );
}
