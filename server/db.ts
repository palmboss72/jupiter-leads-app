import { and, asc, desc, eq, getTableColumns, like, or, sql, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import { InsertUser, leads, scrapeJobs, users, enrichmentJobs, apiSettings } from "../drizzle/schema";
import type { InsertLead, InsertScrapeJob, InsertEnrichmentJob } from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      
      const client = createClient({ url: process.env.TURSO_DATABASE_URL, authToken: process.env.TURSO_AUTH_TOKEN });
      _db = drizzle(client);

    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ─── Users ────────────────────────────────────────────────────────────────────

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;
  try {
    const values: InsertUser = { openId: user.openId };
    const updateSet: Record<string, unknown> = {};
    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];
    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };
    textFields.forEach(assignNullable);
    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = "admin";
      updateSet.role = "admin";
    }
    if (!values.lastSignedIn) values.lastSignedIn = new Date();
    if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();
    await db.insert(users).values(values).onConflictDoUpdate({ target: users.openId, set: updateSet });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ─── Leads ────────────────────────────────────────────────────────────────────

export interface LeadFilters {
  search?: string;
  industry?: string;
  location?: string;
  companySize?: string;
  status?: string;
  title?: string;
  source?: string;
  sortBy?: string;
  page?: number;
  pageSize?: number;
}

export async function getLeads(filters: LeadFilters = {}) {
  const db = await getDb();
  if (!db) return { leads: [], total: 0 };

  const { search, industry, location, companySize, status, title, source, page = 1, pageSize = 50, sortBy = "newest" } = filters;
  const offset = (page - 1) * pageSize;

  const conditions = [];

  if (search) {
    conditions.push(
      or(
        like(leads.firstName, `%${search}%`),
        like(leads.lastName, `%${search}%`),
        like(leads.companyName, `%${search}%`),
        like(leads.email, `%${search}%`),
        like(leads.title, `%${search}%`)
      )
    );
  }
  if (industry) conditions.push(like(leads.industry, `%${industry}%`));
  if (location) conditions.push(like(leads.location, `%${location}%`));
  if (companySize) conditions.push(sql`${leads.companySize} = ${companySize}`);
  if (status) conditions.push(sql`${leads.status} = ${status}`);
  if (title) conditions.push(like(leads.title, `%${title}%`));
  if (source) conditions.push(like(leads.source, `%${source}%`));

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const scoreExpr = sql<number>`(
    CASE WHEN ${leads.companyWebsite} IS NULL OR ${leads.companyWebsite} = '' THEN 30 ELSE 0 END
    + CASE WHEN ${leads.googleRating} IS NULL THEN 15
           WHEN CAST(${leads.googleRating} AS REAL) < 3.0 THEN 30
           WHEN CAST(${leads.googleRating} AS REAL) < 4.0 THEN 20
           ELSE 0 END
    + CASE WHEN ${leads.googleReviewCount} IS NULL THEN 15
           WHEN ${leads.googleReviewCount} < 5 THEN 30
           WHEN ${leads.googleReviewCount} < 10 THEN 20
           ELSE 0 END
    + CASE WHEN ${leads.phone} IS NULL OR ${leads.phone} = '' THEN 10 ELSE 0 END
  )`.as('opportunityScore');

  const allColumns = getTableColumns(leads);

  let orderClause;
  if (sortBy === "opportunity") {
    orderClause = desc(scoreExpr);
  } else if (sortBy === "rating_low") {
    orderClause = asc(leads.googleRating);
  } else if (sortBy === "reviews_low") {
    orderClause = asc(leads.googleReviewCount);
  } else if (sortBy === "website_quality") {
    orderClause = asc(leads.websiteQualityScore);
  } else {
    orderClause = desc(leads.createdAt);
  }

  const [rows, countResult] = await Promise.all([
    db.select({ ...allColumns, opportunityScore: scoreExpr })
      .from(leads).where(whereClause).orderBy(orderClause).limit(pageSize).offset(offset),
    db.select({ count: sql<number>`count(*)` }).from(leads).where(whereClause),
  ]);

  return { leads: rows, total: Number(countResult[0]?.count ?? 0) };
}

export async function getLeadById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(leads).where(eq(leads.id, id)).limit(1);
  return result[0];
}

export async function createLead(data: InsertLead) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(leads).values(data);
  const result = await db.select().from(leads).orderBy(desc(leads.createdAt)).limit(1);
  return result[0];
}

export async function updateLead(id: number, data: Partial<InsertLead>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(leads).set(data).where(eq(leads.id, id));
  return getLeadById(id);
}

export async function deleteLead(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(leads).where(eq(leads.id, id));
}

export async function bulkInsertLeads(data: InsertLead[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (data.length === 0) return 0;
  await db.insert(leads).values(data);
  return data.length;
}

export async function getLeadsByIds(ids: number[]) {
  const db = await getDb();
  if (!db) return [];
  if (ids.length === 0) return [];
  return db.select().from(leads).where(inArray(leads.id, ids));
}

export async function getLeadsForEnrichment(type: string, limit = 50) {
  const db = await getDb();
  if (!db) return [];

  if (type === "email_finder") {
    // Leads that have a company website but no email
    return db.select().from(leads)
      .where(and(
        sql`${leads.companyWebsite} IS NOT NULL`,
        sql`${leads.companyWebsite} != ''`,
        or(sql`${leads.email} IS NULL`, sql`${leads.email} = ''`)
      ))
      .orderBy(desc(leads.createdAt))
      .limit(limit);
  }

  if (type === "website_analysis") {
    // Leads that have a website but sparse data
    return db.select().from(leads)
      .where(and(
        sql`${leads.companyWebsite} IS NOT NULL`,
        sql`${leads.companyWebsite} != ''`,
        sql`${leads.enrichmentStatus} != 'complete'`
      ))
      .orderBy(desc(leads.createdAt))
      .limit(limit);
  }

  return [];
}

// ─── Analytics ────────────────────────────────────────────────────────────────

export async function getLeadAnalytics() {
  const db = await getDb();
  if (!db) return null;

  const [totalResult, byIndustry, byLocation, byStatus, bySource, recentLeads] = await Promise.all([
    db.select({ count: sql<number>`count(*)` }).from(leads),
    db.select({ industry: leads.industry, count: sql<number>`count(*)` })
      .from(leads).where(sql`${leads.industry} is not null`)
      .groupBy(leads.industry).orderBy(desc(sql`count(*)`)).limit(10),
    db.select({ location: leads.location, count: sql<number>`count(*)` })
      .from(leads).where(sql`${leads.location} is not null`)
      .groupBy(leads.location).orderBy(desc(sql`count(*)`)).limit(10),
    db.select({ status: leads.status, count: sql<number>`count(*)` })
      .from(leads).groupBy(leads.status),
    db.select({ source: leads.source, count: sql<number>`count(*)` })
      .from(leads).groupBy(leads.source).orderBy(desc(sql`count(*)`)).limit(5),
    db.select().from(leads).orderBy(desc(leads.createdAt)).limit(5),
  ]);

  return {
    total: Number(totalResult[0]?.count ?? 0),
    byIndustry: byIndustry.map((r) => ({ name: r.industry ?? "Unknown", value: Number(r.count) })),
    byLocation: byLocation.map((r) => ({ name: r.location ?? "Unknown", value: Number(r.count) })),
    byStatus: byStatus.map((r) => ({ name: r.status, value: Number(r.count) })),
    bySource: bySource.map((r) => ({ name: r.source ?? "manual", value: Number(r.count) })),
    recentLeads,
  };
}

// ─── Scrape Jobs ──────────────────────────────────────────────────────────────

export async function createScrapeJob(data: InsertScrapeJob) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(scrapeJobs).values(data);
  const result = await db.select().from(scrapeJobs).orderBy(desc(scrapeJobs.createdAt)).limit(1);
  return result[0];
}

export async function getScrapeJob(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(scrapeJobs).where(eq(scrapeJobs.id, id)).limit(1);
  return result[0];
}

export async function updateScrapeJob(id: number, data: Partial<InsertScrapeJob>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(scrapeJobs).set(data).where(eq(scrapeJobs.id, id));
  return getScrapeJob(id);
}

export async function getRecentScrapeJobs(limit = 10) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(scrapeJobs).orderBy(desc(scrapeJobs.createdAt)).limit(limit);
}

// ─── Enrichment Jobs ──────────────────────────────────────────────────────────

export async function createEnrichmentJob(data: InsertEnrichmentJob) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(enrichmentJobs).values(data);
  const result = await db.select().from(enrichmentJobs).orderBy(desc(enrichmentJobs.createdAt)).limit(1);
  return result[0];
}

export async function updateEnrichmentJob(id: number, data: Partial<InsertEnrichmentJob>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(enrichmentJobs).set(data).where(eq(enrichmentJobs.id, id));
}

export async function getEnrichmentJobsByLead(leadId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(enrichmentJobs).where(eq(enrichmentJobs.leadId, leadId)).orderBy(desc(enrichmentJobs.createdAt));
}

export async function getRecentEnrichmentJobs(limit = 20) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(enrichmentJobs).orderBy(desc(enrichmentJobs.createdAt)).limit(limit);
}

// ─── API Settings ─────────────────────────────────────────────────────────────

export async function getApiSettings(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(apiSettings).where(eq(apiSettings.userId, userId));
}

export async function getApiKey(userId: number, provider: string) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(apiSettings)
    .where(and(eq(apiSettings.userId, userId), eq(apiSettings.provider, provider), eq(apiSettings.isActive, true)))
    .limit(1);
  return result[0]?.apiKey ?? null;
}

export async function upsertApiSetting(userId: number, provider: string, apiKey: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const existing = await db.select().from(apiSettings)
    .where(and(eq(apiSettings.userId, userId), eq(apiSettings.provider, provider)))
    .limit(1);
  
  if (existing.length > 0) {
    await db.update(apiSettings).set({ apiKey, isActive: true })
      .where(eq(apiSettings.id, existing[0].id));
  } else {
    await db.insert(apiSettings).values({ userId, provider, apiKey });
  }
  return { success: true };
}

export async function deleteApiSetting(userId: number, provider: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(apiSettings)
    .where(and(eq(apiSettings.userId, userId), eq(apiSettings.provider, provider)));
}
