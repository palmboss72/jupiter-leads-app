import {
  integer,
  sqliteTable,
  text,
} from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const users = sqliteTable("users", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  openId: text("openId").notNull().unique(),
  name: text("name"),
  email: text("email"),
  loginMethod: text("loginMethod"),
  role: text("role").default("user").notNull(),
  createdAt: integer("createdAt", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
  lastSignedIn: integer("lastSignedIn", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export const leads = sqliteTable("leads", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  firstName: text("firstName"),
  lastName: text("lastName"),
  title: text("title"),
  email: text("email"),
  phone: text("phone"),
  linkedinUrl: text("linkedinUrl"),
  companyName: text("companyName"),
  companyWebsite: text("companyWebsite"),
  industry: text("industry"),
  companySize: text("companySize"),
  location: text("location"),
  country: text("country"),
  // Google Places fields
  googlePlaceId: text("googlePlaceId"),
  googleRating: text("googleRating"),
  googleReviewCount: integer("googleReviewCount"),
  address: text("address"),
  // Lead metadata
  status: text("status")
    .default("new").notNull(),
  source: text("source").default("manual"),
  notes: text("notes"),
  tags: text("tags").$type<string[]>(),
  enrichmentStatus: text("enrichmentStatus")
    .default("none").notNull(),
  lastEnrichedAt: integer("lastEnrichedAt", { mode: "timestamp" }),
  createdAt: integer("createdAt", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
});

export type Lead = typeof leads.$inferSelect;
export type InsertLead = typeof leads.$inferInsert;

export const scrapeJobs = sqliteTable("scrapeJobs", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  industry: text("industry"),
  jobTitle: text("jobTitle"),
  location: text("location"),
  companySize: text("companySize"),
  keywords: text("keywords"),
  maxResults: integer("maxResults").default(50),
  scrapeMode: text("scrapeMode").default("google_places"),
  status: text("status")
    .default("pending").notNull(),
  progress: integer("progress").default(0),
  totalFound: integer("totalFound").default(0),
  savedCount: integer("savedCount").default(0),
  errorMessage: text("errorMessage"),
  createdAt: integer("createdAt", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
});

export type ScrapeJob = typeof scrapeJobs.$inferSelect;
export type InsertScrapeJob = typeof scrapeJobs.$inferInsert;

export const enrichmentJobs = sqliteTable("enrichmentJobs", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  leadId: integer("leadId").notNull(),
  enrichmentType: text("enrichmentType").notNull(),
  status: text("status")
    .default("pending").notNull(),
  result: text("result"),
  error: text("error"),
  createdAt: integer("createdAt", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
});

export type EnrichmentJob = typeof enrichmentJobs.$inferSelect;
export type InsertEnrichmentJob = typeof enrichmentJobs.$inferInsert;

export const apiSettings = sqliteTable("apiSettings", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  userId: integer("userId").notNull(),
  provider: text("provider").notNull(),
  apiKey: text("apiKey").notNull(),
  isActive: integer("isActive", { mode: "boolean" }).default(true).notNull(),
  createdAt: integer("createdAt", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
});

export type ApiSetting = typeof apiSettings.$inferSelect;
export type InsertApiSetting = typeof apiSettings.$inferInsert;
