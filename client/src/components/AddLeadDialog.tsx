import { useState } from "react";
import { trpc } from "@/lib/trpc";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

interface AddLeadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

const COMPANY_SIZES = ["1-10", "11-50", "51-200", "201-500", "501-1000", "1001-5000", "5001+"] as const;
const STATUSES = ["new", "contacted", "qualified", "unqualified", "converted"] as const;

export default function AddLeadDialog({ open, onOpenChange, onSuccess }: AddLeadDialogProps) {
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    title: "",
    email: "",
    phone: "",
    companyName: "",
    companyWebsite: "",
    industry: "",
    companySize: "" as typeof COMPANY_SIZES[number] | "",
    location: "",
    country: "",
    linkedinUrl: "",
    status: "new" as typeof STATUSES[number],
    notes: "",
  });

  const createMutation = trpc.leads.create.useMutation({
    onSuccess: () => {
      toast.success("Lead added successfully");
      onOpenChange(false);
      onSuccess?.();
      setForm({
        firstName: "", lastName: "", title: "", email: "", phone: "",
        companyName: "", companyWebsite: "", industry: "", companySize: "",
        location: "", country: "", linkedinUrl: "", status: "new", notes: "",
      });
    },
    onError: () => toast.error("Failed to add lead"),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({
      ...form,
      companySize: form.companySize || undefined,
    });
  };

  const set = (field: string, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle style={{ fontFamily: "'Sora', sans-serif" }}>Add New Lead</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>First Name</Label>
              <Input value={form.firstName} onChange={(e) => set("firstName", e.target.value)} placeholder="John" />
            </div>
            <div className="space-y-1">
              <Label>Last Name</Label>
              <Input value={form.lastName} onChange={(e) => set("lastName", e.target.value)} placeholder="Smith" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Job Title</Label>
              <Input value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="VP of Sales" />
            </div>
            <div className="space-y-1">
              <Label>Email</Label>
              <Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="john@company.com" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Phone</Label>
              <Input value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="+1 (555) 000-0000" />
            </div>
            <div className="space-y-1">
              <Label>LinkedIn URL</Label>
              <Input value={form.linkedinUrl} onChange={(e) => set("linkedinUrl", e.target.value)} placeholder="linkedin.com/in/johnsmith" />
            </div>
          </div>

          <div className="border-t pt-3">
            <p className="text-sm font-semibold text-muted-foreground mb-3">Company Information</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Company Name</Label>
                <Input value={form.companyName} onChange={(e) => set("companyName", e.target.value)} placeholder="Acme Corp" />
              </div>
              <div className="space-y-1">
                <Label>Website</Label>
                <Input value={form.companyWebsite} onChange={(e) => set("companyWebsite", e.target.value)} placeholder="acme.com" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 mt-3">
              <div className="space-y-1">
                <Label>Industry</Label>
                <Input value={form.industry} onChange={(e) => set("industry", e.target.value)} placeholder="Technology" />
              </div>
              <div className="space-y-1">
                <Label>Company Size</Label>
                <Select value={form.companySize} onValueChange={(v) => set("companySize", v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select size" />
                  </SelectTrigger>
                  <SelectContent>
                    {COMPANY_SIZES.map((s) => (
                      <SelectItem key={s} value={s}>{s} employees</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 mt-3">
              <div className="space-y-1">
                <Label>Location</Label>
                <Input value={form.location} onChange={(e) => set("location", e.target.value)} placeholder="San Francisco, CA" />
              </div>
              <div className="space-y-1">
                <Label>Country</Label>
                <Input value={form.country} onChange={(e) => set("country", e.target.value)} placeholder="United States" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => set("status", v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => (
                    <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1">
            <Label>Notes</Label>
            <Textarea
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
              placeholder="Add any notes about this lead..."
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? "Adding..." : "Add Lead"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
