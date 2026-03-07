import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Mail, Globe, Sparkles, Loader2, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { Link } from "wouter";

export default function Enrichment() {
  const [emailRunning, setEmailRunning] = useState(false);
  const [websiteRunning, setWebsiteRunning] = useState(false);

  const { data: emailCandidates, isLoading: emailLoading } = trpc.leads.needingEnrichment.useQuery(
    { type: "email_finder", limit: 20 }
  );
  const { data: websiteCandidates, isLoading: websiteLoading } = trpc.leads.needingEnrichment.useQuery(
    { type: "website_analysis", limit: 20 }
  );
  const { data: recentJobs, isLoading: jobsLoading, refetch: refetchJobs } = trpc.enrichment.recentJobs.useQuery();

  const utils = trpc.useUtils();

  const emailMutation = trpc.enrichment.findEmails.useMutation({
    onSuccess: (data) => {
      toast.success(`Processed ${data.processed} leads, enriched ${data.enriched} with emails.`);
      setEmailRunning(false);
      utils.leads.needingEnrichment.invalidate();
      utils.leads.list.invalidate();
      refetchJobs();
    },
    onError: (err) => {
      toast.error(err.message);
      setEmailRunning(false);
    },
  });

  const websiteMutation = trpc.enrichment.analyzeWebsites.useMutation({
    onSuccess: (data) => {
      toast.success(`Analyzed ${data.processed} websites, enriched ${data.enriched} leads.`);
      setWebsiteRunning(false);
      utils.leads.needingEnrichment.invalidate();
      utils.leads.list.invalidate();
      refetchJobs();
    },
    onError: (err) => {
      toast.error(err.message);
      setWebsiteRunning(false);
    },
  });

  const handleRunEmails = () => {
    if (!emailCandidates || emailCandidates.length === 0) return;
    setEmailRunning(true);
    emailMutation.mutate({ leadIds: emailCandidates.map((l) => l.id) });
  };

  const handleRunWebsite = () => {
    if (!websiteCandidates || websiteCandidates.length === 0) return;
    setWebsiteRunning(true);
    websiteMutation.mutate({ leadIds: websiteCandidates.slice(0, 10).map((l) => l.id) });
  };

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: "'Sora', sans-serif" }}>
          Enrichment
        </h1>
        <p className="text-muted-foreground mt-1">
          Find emails, analyze websites, and score online presence to identify your best prospects
        </p>
      </div>

      {/* Enrichment Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Email Finder */}
        <Card className="shadow-sm border-blue-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Mail className="w-5 h-5 text-blue-600" />
              Email Finder
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Uses Hunter.io to search for business email addresses based on company websites in your leads.
            </p>
            <div className="p-3 bg-blue-50 rounded-lg">
              <p className="text-sm font-medium text-blue-800">
                {emailLoading ? (
                  <Skeleton className="h-4 w-40" />
                ) : (
                  `${emailCandidates?.length ?? 0} leads have websites but no email`
                )}
              </p>
              <p className="text-xs text-blue-600 mt-1">
                Requires Hunter.io API key (Settings → API Keys)
              </p>
            </div>
            <Button
              onClick={handleRunEmails}
              disabled={emailRunning || !emailCandidates?.length}
              className="w-full gap-2"
              variant="default"
            >
              {emailRunning ? (
                <><Loader2 className="w-4 h-4 animate-spin" />Finding Emails...</>
              ) : (
                <><Mail className="w-4 h-4" />Find Emails ({emailCandidates?.length ?? 0} leads)</>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Website Analysis */}
        <Card className="shadow-sm border-purple-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Globe className="w-5 h-5 text-purple-600" />
              Website Analysis &amp; Quality Score
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Uses AI to evaluate each website's quality, identify SEO problems, and score their online presence from 1-10. Fills in industry, company size, services, and specialties. Low scores = high opportunity prospects.
            </p>
            <div className="p-3 bg-purple-50 rounded-lg">
              <p className="text-sm font-medium text-purple-800">
                {websiteLoading ? (
                  <Skeleton className="h-4 w-40" />
                ) : (
                  `${websiteCandidates?.length ?? 0} leads need website quality scoring`
                )}
              </p>
              <p className="text-xs text-purple-600 mt-1">
                Processes 10 at a time · ~2 sec per lead · Updates Opportunity Score
              </p>
            </div>
            <Button
              onClick={handleRunWebsite}
              disabled={websiteRunning || !websiteCandidates?.length}
              className="w-full gap-2 bg-purple-600 hover:bg-purple-700"
            >
              {websiteRunning ? (
                <><Loader2 className="w-4 h-4 animate-spin" />Analyzing Websites...</>
              ) : (
                <><Globe className="w-4 h-4" />Analyze Websites (next 10)</>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Recent Enrichment Jobs */}
      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Recent Enrichment Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          {jobsLoading ? (
            <div className="space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
          ) : !recentJobs || recentJobs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Sparkles className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No enrichment jobs yet. Run an enrichment above to get started.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {recentJobs.map((job) => (
                <div key={job.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/40 text-sm">
                  {job.status === "completed" ? (
                    <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                  ) : job.status === "failed" ? (
                    <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                  ) : (
                    <Loader2 className="w-4 h-4 text-blue-500 animate-spin flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {job.enrichmentType === "email_finder" ? "📧 Email" : "🌐 Website"}
                      </Badge>
                      <Link href={`/leads/${job.leadId}`}>
                        <span className="text-primary hover:underline cursor-pointer text-xs">
                          Lead #{job.leadId}
                        </span>
                      </Link>
                    </div>
                    {job.error && <p className="text-xs text-destructive mt-1 truncate">{job.error}</p>}
                  </div>
                  <span className="text-xs text-muted-foreground flex-shrink-0">
                    {new Date(job.createdAt).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
