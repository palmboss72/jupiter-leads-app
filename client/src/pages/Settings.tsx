import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Key, MapPin, Mail, Trash2, CheckCircle2, XCircle, Loader2, ExternalLink, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

const API_PROVIDERS = [
  {
    id: "google_places",
    name: "Google Places API",
    icon: MapPin,
    color: "text-green-600",
    bgColor: "bg-green-50",
    borderColor: "border-green-200",
    description: "Required for scraping real business data from Google Maps. Returns actual phone numbers, websites, ratings, and addresses.",
    signupUrl: "https://console.cloud.google.com/apis/credentials",
    signupLabel: "Google Cloud Console",
    pricing: "10,000 free Essentials calls/month. Text Search: $5/1K calls (Essentials). Place Details: $5-$25/1K depending on fields.",
    setup: [
      "Go to Google Cloud Console and create a project",
      "Enable 'Places API (New)' in APIs & Services → Library",
      "Create an API key in APIs & Services → Credentials",
      "Restrict the key to Places API only (recommended)",
    ],
  },
  {
    id: "hunter",
    name: "Hunter.io",
    icon: Mail,
    color: "text-orange-600",
    bgColor: "bg-orange-50",
    borderColor: "border-orange-200",
    description: "Email finder service. Searches the web for business emails associated with company domains.",
    signupUrl: "https://hunter.io/users/sign_up",
    signupLabel: "Hunter.io Sign Up",
    pricing: "Free: 25 searches/month. Starter ($49/mo): 500 searches. Growth ($149/mo): 5,000 searches.",
    setup: [
      "Create a free account at hunter.io",
      "Go to API Keys in your dashboard",
      "Copy your API key",
    ],
  },
  {
    id: "gemini",
    name: "Google Gemini AI Data Extraction",
    icon: Loader2,
    color: "text-blue-600",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200",
    description: "Required for the AI Generate Scraping fallback and Website Enrichment Analysis.",
    signupUrl: "https://aistudio.google.com/app/apikey",
    signupLabel: "Google AI Studio",
    pricing: "Free tier provides 15 requests per minute, which is more than enough for processing leads locally.",
    setup: [
      "Go to Google AI Studio and sign in with a Google account",
      "Click 'Get API Key' in the left sidebar and 'Create API Key'",
      "Copy your new API key and paste it below",
    ],
  },
];

export default function Settings() {
  const [newKeys, setNewKeys] = useState<Record<string, string>>({});
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [expandedProvider, setExpandedProvider] = useState<string | null>(null);

  const { data: settings, isLoading, refetch } = trpc.settings.list.useQuery();

  const upsertMutation = trpc.settings.upsert.useMutation({
    onSuccess: () => {
      toast.success("API key saved");
      setNewKeys({});
      refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteMutation = trpc.settings.delete.useMutation({
    onSuccess: () => {
      toast.success("API key removed");
      refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const testGoogleMutation = trpc.settings.testGooglePlaces.useMutation({
    onSuccess: (data) => {
      if (data.success) toast.success(data.message);
      else toast.error(data.error);
    },
    onError: (err) => toast.error(err.message),
  });

  const testHunterMutation = trpc.settings.testHunter.useMutation({
    onSuccess: (data) => {
      if (data.success) toast.success(data.message);
      else toast.error(data.error);
    },
    onError: (err) => toast.error(err.message),
  });

  const testGeminiMutation = trpc.settings.testGemini.useMutation({
    onSuccess: (data) => {
      if (data.success) toast.success(data.message);
      else toast.error(data.error);
    },
    onError: (err) => toast.error(err.message),
  });

  const getExistingKey = (provider: string) =>
    settings?.find((s) => s.provider === provider);

  const handleSave = (provider: string) => {
    const key = newKeys[provider];
    if (!key?.trim()) return;
    upsertMutation.mutate({ provider, apiKey: key.trim() });
  };

  const handleTest = (provider: string) => {
    if (provider === "google_places") testGoogleMutation.mutate();
    if (provider === "hunter") testHunterMutation.mutate();
    if (provider === "gemini") testGeminiMutation.mutate();
  };

  const isTesting = (provider: string) =>
    (provider === "google_places" && testGoogleMutation.isPending) ||
    (provider === "hunter" && testHunterMutation.isPending) ||
    (provider === "gemini" && testGeminiMutation.isPending);

  return (
    <div className="p-6 space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: "'Sora', sans-serif" }}>
          Settings
        </h1>
        <p className="text-muted-foreground mt-1">
          Manage API keys for real data scraping and enrichment
        </p>
      </div>

      <div className="space-y-4">
        {API_PROVIDERS.map((provider) => {
          const Icon = provider.icon;
          const existing = getExistingKey(provider.id);
          const isExpanded = expandedProvider === provider.id;

          return (
            <Card key={provider.id} className={`shadow-sm ${provider.borderColor}`}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Icon className={`w-5 h-5 ${provider.color}`} />
                    {provider.name}
                  </CardTitle>
                  {existing ? (
                    <Badge variant="secondary" className="bg-green-100 text-green-700 gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Connected
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="bg-muted text-muted-foreground">
                      Not configured
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">{provider.description}</p>

                {/* Existing key display */}
                {existing && (
                  <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
                    <Key className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <span className="text-sm font-mono flex-1">
                      {showKeys[provider.id] ? existing.apiKey : "••••••••••••"}
                    </span>
                    <button
                      onClick={() => setShowKeys((prev) => ({ ...prev, [provider.id]: !prev[provider.id] }))}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      {showKeys[provider.id] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleTest(provider.id)}
                      disabled={isTesting(provider.id)}
                      className="text-xs"
                    >
                      {isTesting(provider.id) ? <Loader2 className="w-3 h-3 animate-spin" /> : "Test"}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteMutation.mutate({ provider: provider.id })}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                )}

                {/* Add/Update key */}
                <div className="space-y-2">
                  <Label className="text-xs">{existing ? "Replace API Key" : "Enter API Key"}</Label>
                  <div className="flex gap-2">
                    <Input
                      type="password"
                      value={newKeys[provider.id] ?? ""}
                      onChange={(e) => setNewKeys((prev) => ({ ...prev, [provider.id]: e.target.value }))}
                      placeholder={`Paste your ${provider.name} key here...`}
                      className="font-mono text-sm"
                    />
                    <Button
                      onClick={() => handleSave(provider.id)}
                      disabled={!newKeys[provider.id]?.trim() || upsertMutation.isPending}
                      size="sm"
                    >
                      {upsertMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save"}
                    </Button>
                  </div>
                </div>

                {/* Setup instructions (collapsible) */}
                <button
                  onClick={() => setExpandedProvider(isExpanded ? null : provider.id)}
                  className="text-xs text-primary hover:underline"
                >
                  {isExpanded ? "Hide setup instructions" : "Show setup instructions"}
                </button>

                {isExpanded && (
                  <div className={`p-4 rounded-lg ${provider.bgColor} space-y-3`}>
                    <p className="text-xs font-semibold text-foreground">Setup Steps:</p>
                    <ol className="text-xs text-muted-foreground space-y-1.5 list-decimal list-inside">
                      {provider.setup.map((step, i) => <li key={i}>{step}</li>)}
                    </ol>
                    <div className="pt-2 border-t border-border/30">
                      <p className="text-xs font-semibold text-foreground mb-1">Pricing:</p>
                      <p className="text-xs text-muted-foreground">{provider.pricing}</p>
                    </div>
                    <a
                      href={provider.signupUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                    >
                      {provider.signupLabel} <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Recommendations */}
      <Card className="shadow-sm bg-primary/5 border-primary/20">
        <CardContent className="p-5 space-y-3">
          <p className="text-sm font-semibold text-primary">Recommended Setup for Contractor Lead Generation</p>
          <div className="text-xs text-muted-foreground space-y-2">
            <p>
              <strong>Step 1 — Google Places API:</strong> This is the priority. It gives you real contractor businesses
              with actual phone numbers, websites, Google ratings, and review counts. The free tier covers about 10,000
              searches per month. For your BSAI use case targeting Arizona contractors, this alone delivers enormous value.
            </p>
            <p>
              <strong>Step 2 — Hunter.io:</strong> Once you have leads with websites from Google Places, Hunter finds
              the business email addresses behind those websites. The free tier gives you 25 searches/month — enough to
              test. The $49/month Starter plan gives you 500 searches, which is plenty for a targeted local market.
            </p>
            <p>
              <strong>Step 3 — Website Analysis:</strong> This uses the built-in AI (no extra API key needed) to analyze
              contractor websites and fill in services, specialties, and company details. Good for qualifying leads before
              outreach.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
