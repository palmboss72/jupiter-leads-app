import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";
import { invokeLLM } from "./_core/llm";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // ─── Leads ────────────────────────────────────────────────────────────────

  leads: router({
    list: publicProcedure
      .input(z.object({
        search: z.string().optional(),
        industry: z.string().optional(),
        location: z.string().optional(),
        companySize: z.string().optional(),
        status: z.string().optional(),
        title: z.string().optional(),
        source: z.string().optional(),
        sortBy: z.enum(["newest", "opportunity", "rating_low", "reviews_low", "website_quality"]).default("newest"),
        page: z.number().min(1).default(1),
        pageSize: z.number().min(1).max(200).default(50),
      }))
      .query(async ({ input }) => {
        return db.getLeads(input);
      }),

    get: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return db.getLeadById(input.id);
      }),

    create: publicProcedure
      .input(z.object({
        firstName: z.string().optional(),
        lastName: z.string().optional(),
        title: z.string().optional(),
        email: z.string().optional(),
        phone: z.string().optional(),
        linkedinUrl: z.string().optional(),
        companyName: z.string().optional(),
        companyWebsite: z.string().optional(),
        industry: z.string().optional(),
        companySize: z.enum(["1-10", "11-50", "51-200", "201-500", "501-1000", "1001-5000", "5001+"]).optional(),
        location: z.string().optional(),
        country: z.string().optional(),
        status: z.enum(["new", "contacted", "qualified", "unqualified", "converted"]).default("new"),
        notes: z.string().optional(),
        source: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        return db.createLead(input);
      }),

    update: publicProcedure
      .input(z.object({
        id: z.number(),
        firstName: z.string().optional(),
        lastName: z.string().optional(),
        title: z.string().optional(),
        email: z.string().optional(),
        phone: z.string().optional(),
        linkedinUrl: z.string().optional(),
        companyName: z.string().optional(),
        companyWebsite: z.string().optional(),
        industry: z.string().optional(),
        companySize: z.enum(["1-10", "11-50", "51-200", "201-500", "501-1000", "1001-5000", "5001+"]).optional(),
        location: z.string().optional(),
        country: z.string().optional(),
        status: z.enum(["new", "contacted", "qualified", "unqualified", "converted"]).optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        return db.updateLead(id, data);
      }),

    delete: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteLead(input.id);
        return { success: true };
      }),

    // CSV Import - maps CSV columns to lead fields
    csvImport: publicProcedure
      .input(z.object({
        rows: z.array(z.record(z.string(), z.any())),
      }))
      .mutation(async ({ input }) => {
        const validRows = input.rows.filter((row) =>
          Object.values(row).some((v) => v !== null && v !== undefined && v !== "")
        );
        if (validRows.length === 0) return { success: false, count: 0 };

        const validSizes = ["1-10", "11-50", "51-200", "201-500", "501-1000", "1001-5000", "5001+"] as const;
        type ValidSize = (typeof validSizes)[number];

        const mapped = validRows.map((row) => ({
          firstName: row.firstName || row.first_name || row["First Name"] || undefined,
          lastName: row.lastName || row.last_name || row["Last Name"] || undefined,
          title: row.title || row.jobTitle || row["Job Title"] || row["Title"] || undefined,
          email: row.email || row.Email || row["Email Address"] || undefined,
          phone: row.phone || row.Phone || row["Phone Number"] || undefined,
          companyName: row.companyName || row.company || row.Company || row["Company Name"] || undefined,
          companyWebsite: row.companyWebsite || row.website || row.Website || row["Company Website"] || undefined,
          industry: row.industry || row.Industry || undefined,
          companySize: validSizes.includes(row.companySize as ValidSize) ? (row.companySize as ValidSize) : undefined,
          location: row.location || row.Location || row.city || row.City || undefined,
          country: row.country || row.Country || undefined,
          linkedinUrl: row.linkedinUrl || row.linkedin || row.LinkedIn || undefined,
          source: "csv_import" as const,
          status: "new" as const,
        }));

        const saved = await db.bulkInsertLeads(mapped);
        return { success: true, count: saved };
      }),

    exportCsv: publicProcedure
      .input(z.object({
        search: z.string().optional(),
        industry: z.string().optional(),
        location: z.string().optional(),
        companySize: z.string().optional(),
        status: z.string().optional(),
        title: z.string().optional(),
      }))
      .query(async ({ input }) => {
        const { leads } = await db.getLeads({ ...input, pageSize: 10000 });
        const headers = [
          "ID", "First Name", "Last Name", "Title", "Email", "Phone",
          "Company", "Website", "Industry", "Company Size", "Location",
          "Country", "Rating", "Reviews", "Address", "Website Quality Score",
          "Opportunity Score", "Status", "Source", "LinkedIn", "Notes", "Created At",
        ];
        const rows = leads.map((l) => [
          l.id, l.firstName ?? "", l.lastName ?? "", l.title ?? "",
          l.email ?? "", l.phone ?? "", l.companyName ?? "",
          l.companyWebsite ?? "", l.industry ?? "", l.companySize ?? "",
          l.location ?? "", l.country ?? "", l.googleRating ?? "",
          l.googleReviewCount ?? "", l.address ?? "",
          l.websiteQualityScore ?? "",
          (l as any).opportunityScore ?? "",
          l.status, l.source ?? "", l.linkedinUrl ?? "",
          (l.notes ?? "").replace(/\n/g, " "), l.createdAt.toISOString(),
        ]);
        const csv = [headers, ...rows]
          .map((row) => row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
          .join("\n");
        return { csv };
      }),

    analytics: publicProcedure.query(async () => {
      return db.getLeadAnalytics();
    }),

    // Get leads needing enrichment
    needingEnrichment: publicProcedure
      .input(z.object({ type: z.string(), limit: z.number().max(100).default(50) }))
      .query(async ({ input }) => {
        return db.getLeadsForEnrichment(input.type, input.limit);
      }),
  }),

  // ─── Scraping ─────────────────────────────────────────────────────────────

  scrape: router({
    start: publicProcedure
      .input(z.object({
        industry: z.string().optional(),
        jobTitle: z.string().optional(),
        location: z.string().optional(),
        companySize: z.string().optional(),
        keywords: z.string().optional(),
        maxResults: z.number().min(1).max(100).default(20),
        mode: z.enum(["google_places", "llm_generate"]).default("google_places"),
      }))
      .mutation(async ({ ctx, input }) => {
        const job = await db.createScrapeJob({
          ...input,
          scrapeMode: input.mode,
          status: "running",
          progress: 0,
        });
        if (!job) throw new Error("Failed to create scrape job");

        // Check for Google Places API key
        let googleApiKey: string | null = null;
        const actingUser = ctx.user || { id: 1 }; // Fallback to local admin user id 1

        if (input.mode === "google_places") {
          googleApiKey = await db.getApiKey(actingUser.id, "google_places");
        }

        if (input.mode === "google_places" && googleApiKey) {
          runGooglePlacesScrape(job.id, input, googleApiKey).catch(console.error);
        } else {
          const geminiApiKey = await db.getApiKey(actingUser.id, "gemini");
          if (!geminiApiKey && input.mode === "llm_generate") {
            throw new Error("Google Gemini API Key is not configured. Go to Settings to add it.");
          }
          runLLMScrape(job.id, input, geminiApiKey || "").catch(console.error);
        }

        return { jobId: job.id, mode: googleApiKey ? "google_places" : "llm_generate" };
      }),

    status: publicProcedure
      .input(z.object({ jobId: z.number() }))
      .query(async ({ input }) => {
        return db.getScrapeJob(input.jobId);
      }),

    history: publicProcedure.query(async () => {
      return db.getRecentScrapeJobs(10);
    }),
  }),

  // ─── Enrichment ───────────────────────────────────────────────────────────

  enrichment: router({
    // Run email enrichment via Hunter.io
    findEmails: publicProcedure
      .input(z.object({ leadIds: z.array(z.number()) }))
      .mutation(async ({ ctx, input }) => {
        const actingUser = ctx.user || { id: 1 };
        const hunterKey = await db.getApiKey(actingUser.id, "hunter");
        if (!hunterKey) throw new Error("Hunter.io API key not configured. Go to Settings to add it.");

        const leads = await db.getLeadsByIds(input.leadIds);
        let enriched = 0;

        for (const lead of leads) {
          if (!lead.companyWebsite || lead.email) continue;

          try {
            const domain = lead.companyWebsite.replace(/^https?:\/\//, "").replace(/\/.*$/, "");
            const hunterUrl = `https://api.hunter.io/v2/domain-search?domain=${domain}&api_key=${hunterKey}&limit=5`;
            const resp = await fetch(hunterUrl);
            const data = await resp.json();

            if (data.data?.emails?.length > 0) {
              const bestEmail = data.data.emails[0];
              await db.updateLead(lead.id, {
                email: bestEmail.value,
                enrichmentStatus: "partial",
                lastEnrichedAt: new Date(),
              });
              await db.createEnrichmentJob({
                leadId: lead.id,
                enrichmentType: "email_finder",
                status: "completed",
                result: JSON.stringify({
                  email: bestEmail.value,
                  confidence: bestEmail.confidence,
                  type: bestEmail.type,
                  sources: bestEmail.sources?.length ?? 0,
                }),
              });
              enriched++;
            } else {
              await db.createEnrichmentJob({
                leadId: lead.id,
                enrichmentType: "email_finder",
                status: "completed",
                result: JSON.stringify({ found: false }),
              });
            }
          } catch (err) {
            await db.createEnrichmentJob({
              leadId: lead.id,
              enrichmentType: "email_finder",
              status: "failed",
              error: err instanceof Error ? err.message : String(err),
            });
          }
        }

        return { success: true, processed: leads.length, enriched };
      }),

    // Run LLM-based website analysis
    analyzeWebsites: publicProcedure
      .input(z.object({ leadIds: z.array(z.number()) }))
      .mutation(async ({ ctx, input }) => {
        const actingUser = ctx.user || { id: 1 };
        const geminiApiKey = await db.getApiKey(actingUser.id, "gemini");
        if (!geminiApiKey) throw new Error("Google Gemini API Key is not configured. Go to Settings to add it.");

        const leads = await db.getLeadsByIds(input.leadIds);
        let enriched = 0;

        for (const lead of leads) {
          if (!lead.companyWebsite) continue;

          try {
            const response = await invokeLLM({
              apiKey: geminiApiKey,
              messages: [
                {
                  role: "system",
                  content: `You are a business research assistant. Analyze the company based on the information provided and return structured JSON. Return ONLY valid JSON with no markdown fences.`,
                },
                {
                  role: "user",
                  content: `Research the company at website: ${lead.companyWebsite}
Company name: ${lead.companyName ?? "Unknown"}
Location: ${lead.location ?? "Unknown"}
Industry: ${lead.industry ?? "Unknown"}

Return JSON with these fields (use null for unknown):
{
  "industry": "specific industry category",
  "companySize": "estimated employee count range: 1-10, 11-50, 51-200, 201-500, 501-1000, 1001-5000, 5001+",
  "description": "brief company description (1-2 sentences)",
  "services": "key services offered",
  "targetMarket": "who they serve",
  "founded": "year if known",
  "specialties": "key specialties or differentiators"
}`,
                },
              ],
              response_format: { type: "json_object" },
            });

            const rawContent = response.choices?.[0]?.message?.content;
            if (!rawContent) throw new Error("No LLM response");
            const content = typeof rawContent === "string" ? rawContent : JSON.stringify(rawContent);
            const parsed = JSON.parse(content);

            const validSizes = ["1-10", "11-50", "51-200", "201-500", "501-1000", "1001-5000", "5001+"] as const;
            const updates: Record<string, any> = {
              enrichmentStatus: "partial",
              lastEnrichedAt: new Date(),
            };
            if (parsed.industry && !lead.industry) updates.industry = parsed.industry;
            if (validSizes.includes(parsed.companySize) && !lead.companySize) updates.companySize = parsed.companySize;
            if (parsed.description || parsed.services || parsed.specialties) {
              const notesParts = [
                lead.notes ?? "",
                parsed.description ? `Description: ${parsed.description}` : "",
                parsed.services ? `Services: ${parsed.services}` : "",
                parsed.specialties ? `Specialties: ${parsed.specialties}` : "",
                parsed.targetMarket ? `Target Market: ${parsed.targetMarket}` : "",
              ].filter(Boolean);
              updates.notes = notesParts.join("\n");
            }

            await db.updateLead(lead.id, updates);
            await db.createEnrichmentJob({
              leadId: lead.id,
              enrichmentType: "website_analysis",
              status: "completed",
              result: content,
            });
            enriched++;
            // Rate limit delay for Gemini API
            await new Promise((r) => setTimeout(r, 2000));
          } catch (err) {
            await db.createEnrichmentJob({
              leadId: lead.id,
              enrichmentType: "website_analysis",
              status: "failed",
              error: err instanceof Error ? err.message : String(err),
            });
          }
          // Rate limit delay even on failure
          await new Promise((r) => setTimeout(r, 2000));
        }

        return { success: true, processed: leads.length, enriched };
      }),

    // Get enrichment history for a lead
    history: publicProcedure
      .input(z.object({ leadId: z.number() }))
      .query(async ({ input }) => {
        return db.getEnrichmentJobsByLead(input.leadId);
      }),

    recentJobs: publicProcedure.query(async () => {
      return db.getRecentEnrichmentJobs(20);
    }),
  }),

  // ─── API Settings ─────────────────────────────────────────────────────────

  settings: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      const settings = await db.getApiSettings(ctx.user.id);
      // Mask API keys for display
      return settings.map((s) => ({
        ...s,
        apiKey: s.apiKey.slice(0, 8) + "..." + s.apiKey.slice(-4),
        rawKeyLength: s.apiKey.length,
      }));
    }),

    upsert: protectedProcedure
      .input(z.object({
        provider: z.string(),
        apiKey: z.string().min(1),
      }))
      .mutation(async ({ ctx, input }) => {
        return db.upsertApiSetting(ctx.user.id, input.provider, input.apiKey);
      }),

    delete: protectedProcedure
      .input(z.object({ provider: z.string() }))
      .mutation(async ({ ctx, input }) => {
        await db.deleteApiSetting(ctx.user.id, input.provider);
        return { success: true };
      }),

    // Test if a Google Places API key works
    testGooglePlaces: protectedProcedure.mutation(async ({ ctx }) => {
      const apiKey = await db.getApiKey(ctx.user.id, "google_places");
      if (!apiKey) return { success: false, error: "No API key configured" };

      try {
        const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=plumber+in+Tucson+AZ&key=${apiKey}`;
        const resp = await fetch(url);
        const data = await resp.json();
        if (data.status === "OK" || data.status === "ZERO_RESULTS") {
          return { success: true, message: `API key valid. Status: ${data.status}` };
        }
        return { success: false, error: `API returned: ${data.status} - ${data.error_message ?? ""}` };
      } catch (err) {
        return { success: false, error: err instanceof Error ? err.message : "Connection failed" };
      }
    }),

    testHunter: protectedProcedure.mutation(async ({ ctx }) => {
      const apiKey = await db.getApiKey(ctx.user.id, "hunter");
      if (!apiKey) return { success: false, error: "No API key configured" };

      try {
        const url = `https://api.hunter.io/v2/account?api_key=${apiKey}`;
        const resp = await fetch(url);
        const data = await resp.json();
        if (data.data) {
          return {
            success: true,
            message: `Connected! ${data.data.requests?.searches?.available ?? "?"} searches remaining this month.`,
          };
        }
        return { success: false, error: data.errors?.[0]?.details ?? "Invalid key" };
      } catch (err) {
        return { success: false, error: err instanceof Error ? err.message : "Connection failed" };
      }
    }),

    testGemini: protectedProcedure.mutation(async ({ ctx }) => {
      const apiKey = await db.getApiKey(ctx.user.id, "gemini");
      if (!apiKey) return { success: false, error: "No API key configured" };

      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
        const resp = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contents: [{ parts: [{ text: "Hello" }] }] })
        });
        const data = await resp.json();
        if (data.error) return { success: false, error: data.error.message };
        return { success: true, message: "Connected to Gemini API successfully!" };
      } catch (err) {
        return { success: false, error: err instanceof Error ? err.message : "Connection failed" };
      }
    }),
  }),
});

// ─── Google Places Scrape Runner ──────────────────────────────────────────────

async function runGooglePlacesScrape(
  jobId: number,
  params: { industry?: string; jobTitle?: string; location?: string; keywords?: string; maxResults?: number },
  apiKey: string
) {
  const maxResults = params.maxResults ?? 20;

  try {
    await db.updateScrapeJob(jobId, { status: "running", progress: 10 });

    // Build search query for Google Places
    const queryParts: string[] = [];
    if (params.keywords) queryParts.push(params.keywords);
    if (params.industry) queryParts.push(params.industry);
    if (params.jobTitle) queryParts.push(params.jobTitle);
    if (queryParts.length === 0) queryParts.push("contractor");

    const searchQuery = queryParts.join(" ");
    const locationStr = params.location || "Arizona";

    await db.updateScrapeJob(jobId, { progress: 20 });

    // Google Places Text Search API
    const allPlaces: any[] = [];
    let nextPageToken: string | null = null;

    // Fetch pages until we have enough results
    for (let page = 0; page < 3 && allPlaces.length < maxResults; page++) {
      let url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(searchQuery + " in " + locationStr)}&key=${apiKey}`;
      if (nextPageToken) {
        url = `https://maps.googleapis.com/maps/api/place/textsearch/json?pagetoken=${nextPageToken}&key=${apiKey}`;
        // Google requires a short delay between page token requests
        await new Promise((r) => setTimeout(r, 2000));
      }

      const resp = await fetch(url);
      const data = await resp.json();

      if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
        throw new Error(`Google Places API error: ${data.status} - ${data.error_message ?? ""}`);
      }

      if (data.results) {
        allPlaces.push(...data.results);
      }

      nextPageToken = data.next_page_token ?? null;
      if (!nextPageToken) break;

      await db.updateScrapeJob(jobId, { progress: 20 + (page + 1) * 15 });
    }

    await db.updateScrapeJob(jobId, { progress: 60 });

    // Now get details for each place (phone, website)
    const places = allPlaces.slice(0, maxResults);
    const detailedLeads: any[] = [];

    for (let i = 0; i < places.length; i++) {
      const place = places[i];
      let phone = "";
      let website = "";

      try {
        const detailUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${place.place_id}&fields=formatted_phone_number,website,url&key=${apiKey}`;
        const detailResp = await fetch(detailUrl);
        const detailData = await detailResp.json();
        if (detailData.result) {
          phone = detailData.result.formatted_phone_number ?? "";
          website = detailData.result.website ?? "";
        }
      } catch {
        // Skip detail errors, still save the lead
      }

      detailedLeads.push({
        companyName: place.name ?? "",
        address: place.formatted_address ?? "",
        location: place.formatted_address ?? "",
        country: "US",
        phone,
        companyWebsite: website ? website.replace(/^https?:\/\//, "").replace(/\/$/, "") : "",
        industry: params.industry || "Home Services",
        googlePlaceId: place.place_id ?? "",
        googleRating: place.rating ? String(place.rating) : null,
        googleReviewCount: place.user_ratings_total ?? 0,
        source: "google_places",
        status: "new" as const,
      });

      // Update progress
      if (i % 5 === 0) {
        await db.updateScrapeJob(jobId, { progress: 60 + Math.round((i / places.length) * 30) });
      }
    }

    await db.updateScrapeJob(jobId, { progress: 90 });

    // Deduplicate by googlePlaceId
    const unique = detailedLeads.filter((lead, index, self) =>
      index === self.findIndex((l) => l.googlePlaceId === lead.googlePlaceId)
    );

    const saved = await db.bulkInsertLeads(unique);

    await db.updateScrapeJob(jobId, {
      status: "completed",
      progress: 100,
      totalFound: allPlaces.length,
      savedCount: saved,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await db.updateScrapeJob(jobId, { status: "failed", errorMessage: message, progress: 0 });
  }
}

// ─── LLM Scrape Runner (fallback when no API key) ────────────────────────────

async function runLLMScrape(
  jobId: number,
  params: { industry?: string; jobTitle?: string; location?: string; companySize?: string; keywords?: string; maxResults?: number },
  apiKey: string
) {
  const maxResults = params.maxResults ?? 20;

  try {
    await db.updateScrapeJob(jobId, { status: "running", progress: 10 });

    const prompt = buildLLMScrapePrompt(params, maxResults);
    await db.updateScrapeJob(jobId, { progress: 30 });

    const response = await invokeLLM({
      apiKey,
      messages: [
        {
          role: "system",
          content: "You are a B2B lead generation assistant. Generate realistic, diverse, and plausible lead data based on the given parameters. Return ONLY valid JSON with no markdown fences.",
        },
        { role: "user", content: prompt },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "leads_result",
          strict: true,
          schema: {
            type: "object",
            properties: {
              leads: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    firstName: { type: "string" },
                    lastName: { type: "string" },
                    title: { type: "string" },
                    email: { type: "string" },
                    phone: { type: "string" },
                    companyName: { type: "string" },
                    companyWebsite: { type: "string" },
                    industry: { type: "string" },
                    companySize: { type: "string" },
                    location: { type: "string" },
                    country: { type: "string" },
                    linkedinUrl: { type: "string" },
                  },
                  required: ["firstName", "lastName", "title", "email", "phone", "companyName", "companyWebsite", "industry", "companySize", "location", "country", "linkedinUrl"],
                  additionalProperties: false,
                },
              },
            },
            required: ["leads"],
            additionalProperties: false,
          },
        },
      },
    });

    await db.updateScrapeJob(jobId, { progress: 70 });

    const rawContent = response.choices?.[0]?.message?.content;
    if (!rawContent) throw new Error("No content from LLM");
    const content = typeof rawContent === "string" ? rawContent : JSON.stringify(rawContent);
    const parsed = JSON.parse(content) as { leads: Record<string, string>[] };
    const leadsData = parsed.leads ?? [];

    const validSizes = ["1-10", "11-50", "51-200", "201-500", "501-1000", "1001-5000", "5001+"] as const;
    type ValidSize = (typeof validSizes)[number];

    const insertData = leadsData.map((l) => ({
      firstName: l.firstName,
      lastName: l.lastName,
      title: l.title,
      email: l.email,
      phone: l.phone,
      companyName: l.companyName,
      companyWebsite: l.companyWebsite,
      industry: l.industry,
      companySize: validSizes.includes(l.companySize as ValidSize) ? (l.companySize as ValidSize) : undefined,
      location: l.location,
      country: l.country,
      linkedinUrl: l.linkedinUrl,
      source: "llm_generated",
      status: "new" as const,
    }));

    const saved = await db.bulkInsertLeads(insertData);

    await db.updateScrapeJob(jobId, {
      status: "completed",
      progress: 100,
      totalFound: leadsData.length,
      savedCount: saved,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await db.updateScrapeJob(jobId, { status: "failed", errorMessage: message, progress: 0 });
  }
}

function buildLLMScrapePrompt(
  params: { industry?: string; jobTitle?: string; location?: string; companySize?: string; keywords?: string },
  count: number
): string {
  const parts: string[] = [`Generate exactly ${count} realistic B2B leads with the following criteria:`];
  if (params.industry) parts.push(`- Industry: ${params.industry}`);
  if (params.jobTitle) parts.push(`- Job Title: ${params.jobTitle}`);
  if (params.location) parts.push(`- Location: ${params.location}`);
  if (params.companySize) parts.push(`- Company Size: ${params.companySize} employees`);
  if (params.keywords) parts.push(`- Keywords: ${params.keywords}`);
  parts.push(
    `\nEach lead must have: firstName, lastName, title, email, phone, companyName, companyWebsite, industry, companySize (one of: 1-10, 11-50, 51-200, 201-500, 501-1000, 1001-5000, 5001+), location, country, linkedinUrl.`,
    `Make the data diverse and realistic.`
  );
  return parts.join("\n");
}

export type AppRouter = typeof appRouter;
