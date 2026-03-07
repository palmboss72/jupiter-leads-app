import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  ArrowLeft,
  Mail,
  Phone,
  Globe,
  Linkedin,
  Building2,
  MapPin,
  Users,
  Pencil,
  Trash2,
  Save,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

const STATUS_COLORS: Record<string, string> = {
  new: "bg-blue-100 text-blue-700",
  contacted: "bg-cyan-100 text-cyan-700",
  qualified: "bg-green-100 text-green-700",
  unqualified: "bg-orange-100 text-orange-700",
  converted: "bg-emerald-100 text-emerald-700",
};

const COMPANY_SIZES = ["1-10", "11-50", "51-200", "201-500", "501-1000", "1001-5000", "5001+"] as const;
const STATUSES = ["new", "contacted", "qualified", "unqualified", "converted"] as const;

export default function LeadDetail() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const [editing, setEditing] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editForm, setEditForm] = useState<Record<string, string>>({});

  const leadId = parseInt(id ?? "0");
  const { data: lead, isLoading, refetch } = trpc.leads.get.useQuery({ id: leadId });
  const utils = trpc.useUtils();

  const updateMutation = trpc.leads.update.useMutation({
    onSuccess: () => {
      toast.success("Lead updated");
      setEditing(false);
      refetch();
      utils.leads.analytics.invalidate();
    },
    onError: () => toast.error("Failed to update lead"),
  });

  const deleteMutation = trpc.leads.delete.useMutation({
    onSuccess: () => {
      toast.success("Lead deleted");
      utils.leads.list.invalidate();
      utils.leads.analytics.invalidate();
      navigate("/leads");
    },
    onError: () => toast.error("Failed to delete lead"),
  });

  const startEdit = () => {
    if (!lead) return;
    setEditForm({
      firstName: lead.firstName ?? "",
      lastName: lead.lastName ?? "",
      title: lead.title ?? "",
      email: lead.email ?? "",
      phone: lead.phone ?? "",
      linkedinUrl: lead.linkedinUrl ?? "",
      companyName: lead.companyName ?? "",
      companyWebsite: lead.companyWebsite ?? "",
      industry: lead.industry ?? "",
      companySize: lead.companySize ?? "",
      location: lead.location ?? "",
      country: lead.country ?? "",
      status: lead.status,
      notes: lead.notes ?? "",
    });
    setEditing(true);
  };

  const handleSave = () => {
    updateMutation.mutate({
      id: leadId,
      ...editForm,
      companySize: editForm.companySize as typeof COMPANY_SIZES[number] | undefined || undefined,
      status: editForm.status as typeof STATUSES[number] | undefined,
    });
  };

  const set = (field: string, value: string) =>
    setEditForm((prev) => ({ ...prev, [field]: value }));

  if (isLoading) {
    return (
      <div className="p-6 max-w-4xl mx-auto space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="p-6 text-center">
        <p className="text-muted-foreground">Lead not found.</p>
        <Button variant="link" onClick={() => navigate("/leads")}>
          Back to database
        </Button>
      </div>
    );
  }

  const fullName = [lead.firstName, lead.lastName].filter(Boolean).join(" ") || "Unknown";

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/leads")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold text-foreground" style={{ fontFamily: "'Sora', sans-serif" }}>
              {fullName}
            </h1>
            <p className="text-sm text-muted-foreground">
              {lead.title ?? ""}
              {lead.title && lead.companyName ? " · " : ""}
              {lead.companyName ?? ""}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {editing ? (
            <>
              <Button variant="outline" size="sm" onClick={() => setEditing(false)} className="gap-1">
                <X className="w-4 h-4" /> Cancel
              </Button>
              <Button size="sm" onClick={handleSave} disabled={updateMutation.isPending} className="gap-1">
                <Save className="w-4 h-4" />
                {updateMutation.isPending ? "Saving..." : "Save"}
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" size="sm" onClick={startEdit} className="gap-1">
                <Pencil className="w-4 h-4" /> Edit
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDeleteOpen(true)}
                className="gap-1 text-destructive hover:text-destructive"
              >
                <Trash2 className="w-4 h-4" /> Delete
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left: Contact Info */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {editing ? (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label>First Name</Label>
                      <Input value={editForm.firstName} onChange={(e) => set("firstName", e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <Label>Last Name</Label>
                      <Input value={editForm.lastName} onChange={(e) => set("lastName", e.target.value)} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label>Job Title</Label>
                      <Input value={editForm.title} onChange={(e) => set("title", e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <Label>Email</Label>
                      <Input type="email" value={editForm.email} onChange={(e) => set("email", e.target.value)} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label>Phone</Label>
                      <Input value={editForm.phone} onChange={(e) => set("phone", e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <Label>LinkedIn</Label>
                      <Input value={editForm.linkedinUrl} onChange={(e) => set("linkedinUrl", e.target.value)} />
                    </div>
                  </div>
                </>
              ) : (
                <div className="space-y-3">
                  {lead.email && (
                    <div className="flex items-center gap-3">
                      <Mail className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      <a href={`mailto:${lead.email}`} className="text-sm text-primary hover:underline">
                        {lead.email}
                      </a>
                    </div>
                  )}
                  {lead.phone && (
                    <div className="flex items-center gap-3">
                      <Phone className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      <a href={`tel:${lead.phone}`} className="text-sm text-foreground hover:text-primary">
                        {lead.phone}
                      </a>
                    </div>
                  )}
                  {lead.linkedinUrl && (
                    <div className="flex items-center gap-3">
                      <Linkedin className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      <a
                        href={lead.linkedinUrl.startsWith("http") ? lead.linkedinUrl : `https://${lead.linkedinUrl}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-primary hover:underline"
                      >
                        {lead.linkedinUrl}
                      </a>
                    </div>
                  )}
                  {!lead.email && !lead.phone && !lead.linkedinUrl && (
                    <p className="text-sm text-muted-foreground">No contact details available.</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Company Information</CardTitle>
            </CardHeader>
            <CardContent>
              {editing ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label>Company Name</Label>
                      <Input value={editForm.companyName} onChange={(e) => set("companyName", e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <Label>Website</Label>
                      <Input value={editForm.companyWebsite} onChange={(e) => set("companyWebsite", e.target.value)} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label>Industry</Label>
                      <Input value={editForm.industry} onChange={(e) => set("industry", e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <Label>Company Size</Label>
                      <Select value={editForm.companySize} onValueChange={(v) => set("companySize", v)}>
                        <SelectTrigger><SelectValue placeholder="Select size" /></SelectTrigger>
                        <SelectContent>
                          {COMPANY_SIZES.map((s) => <SelectItem key={s} value={s}>{s} employees</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label>Location</Label>
                      <Input value={editForm.location} onChange={(e) => set("location", e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <Label>Country</Label>
                      <Input value={editForm.country} onChange={(e) => set("country", e.target.value)} />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {lead.companyName && (
                    <div className="flex items-center gap-3">
                      <Building2 className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      <span className="text-sm font-medium">{lead.companyName}</span>
                    </div>
                  )}
                  {lead.companyWebsite && (
                    <div className="flex items-center gap-3">
                      <Globe className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      <a
                        href={lead.companyWebsite.startsWith("http") ? lead.companyWebsite : `https://${lead.companyWebsite}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-primary hover:underline"
                      >
                        {lead.companyWebsite}
                      </a>
                    </div>
                  )}
                  {lead.location && (
                    <div className="flex items-center gap-3">
                      <MapPin className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      <span className="text-sm">{[lead.location, lead.country].filter(Boolean).join(", ")}</span>
                    </div>
                  )}
                  {lead.companySize && (
                    <div className="flex items-center gap-3">
                      <Users className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      <span className="text-sm">{lead.companySize} employees</span>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Google Places Data (if present) */}
          {(lead.googleRating || lead.googleReviewCount || lead.address || lead.googlePlaceId) && (
            <Card className="shadow-sm border-green-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-green-600" />
                  Google Places Data
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  {lead.googleRating && (
                    <div>
                      <span className="text-muted-foreground block text-xs">Rating</span>
                      <span className="font-semibold text-foreground flex items-center gap-1">
                        ⭐ {lead.googleRating}/5
                      </span>
                    </div>
                  )}
                  {lead.googleReviewCount != null && (
                    <div>
                      <span className="text-muted-foreground block text-xs">Reviews</span>
                      <span className="font-semibold text-foreground">{lead.googleReviewCount.toLocaleString()}</span>
                    </div>
                  )}
                </div>
                {lead.address && (
                  <div className="mt-3">
                    <span className="text-muted-foreground block text-xs">Address</span>
                    <span className="text-sm text-foreground">{lead.address}</span>
                  </div>
                )}
                {lead.googlePlaceId && (
                  <a
                    href={`https://www.google.com/maps/place/?q=place_id:${lead.googlePlaceId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-3"
                  >
                    View on Google Maps →
                  </a>
                )}
              </CardContent>
            </Card>
          )}

          {/* Notes */}
          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Notes</CardTitle>
            </CardHeader>
            <CardContent>
              {editing ? (
                <Textarea
                  value={editForm.notes}
                  onChange={(e) => set("notes", e.target.value)}
                  rows={4}
                  placeholder="Add notes..."
                />
              ) : (
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {lead.notes || "No notes yet."}
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right: Metadata */}
        <div className="space-y-4">
          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Lead Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {editing ? (
                <Select value={editForm.status} onValueChange={(v) => set("status", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUSES.map((s) => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              ) : (
                <Badge className={`capitalize ${STATUS_COLORS[lead.status] ?? ""}`} variant="secondary">
                  {lead.status}
                </Badge>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Source</span>
                <Badge variant="secondary" className={`text-xs ${
                  lead.source === "google_places" ? "bg-green-100 text-green-700" :
                  lead.source === "csv_import" ? "bg-purple-100 text-purple-700" :
                  lead.source === "llm_generated" ? "bg-amber-100 text-amber-700" :
                  "bg-muted text-muted-foreground"
                }`}>
                  {lead.source === "google_places" ? "📍 Google Places" :
                   lead.source === "csv_import" ? "📄 CSV Import" :
                   lead.source === "llm_generated" ? "🤖 AI Generated" :
                   lead.source ?? "manual"}
                </Badge>
              </div>
              {lead.enrichmentStatus && lead.enrichmentStatus !== "none" && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Enrichment</span>
                  <Badge variant="secondary" className={`text-xs ${
                    lead.enrichmentStatus === "complete" ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"
                  }`}>
                    {lead.enrichmentStatus === "complete" ? "✓ Complete" : "◐ Partial"}
                  </Badge>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Industry</span>
                <span className="font-medium">{lead.industry ?? "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Created</span>
                <span className="font-medium">{new Date(lead.createdAt).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Updated</span>
                <span className="font-medium">{new Date(lead.updatedAt).toLocaleDateString()}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Lead</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{fullName}</strong>? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteMutation.mutate({ id: leadId })}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
