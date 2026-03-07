import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Mock the db module
vi.mock("./db", () => ({
  getLeads: vi.fn().mockResolvedValue({ leads: [], total: 0 }),
  getLeadById: vi.fn().mockResolvedValue(undefined),
  createLead: vi.fn().mockResolvedValue({
    id: 1,
    firstName: "Jane",
    lastName: "Doe",
    title: "CTO",
    email: "jane@example.com",
    phone: "+1-555-0100",
    companyName: "Acme Corp",
    companyWebsite: "acme.com",
    industry: "Technology",
    companySize: "51-200",
    location: "San Francisco, CA",
    country: "United States",
    linkedinUrl: "linkedin.com/in/janedoe",
    status: "new",
    source: "manual",
    notes: null,
    tags: null,
    createdAt: new Date("2025-01-01"),
    updatedAt: new Date("2025-01-01"),
  }),
  updateLead: vi.fn().mockResolvedValue(null),
  deleteLead: vi.fn().mockResolvedValue(undefined),
  bulkInsertLeads: vi.fn().mockResolvedValue(0),
  getLeadAnalytics: vi.fn().mockResolvedValue({
    total: 42,
    byIndustry: [{ name: "Technology", value: 20 }],
    byLocation: [{ name: "San Francisco, CA", value: 15 }],
    byStatus: [{ name: "new", value: 30 }],
    recentLeads: [],
  }),
  createScrapeJob: vi.fn().mockResolvedValue({
    id: 99,
    status: "running",
    progress: 0,
    totalFound: 0,
    savedCount: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  }),
  getScrapeJob: vi.fn().mockResolvedValue({
    id: 99,
    status: "running",
    progress: 50,
    totalFound: 0,
    savedCount: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  }),
  updateScrapeJob: vi.fn().mockResolvedValue(null),
  getRecentScrapeJobs: vi.fn().mockResolvedValue([]),
}));

function createCtx(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
}

describe("leads.list", () => {
  it("returns empty list when no leads exist", async () => {
    const caller = appRouter.createCaller(createCtx());
    const result = await caller.leads.list({ page: 1, pageSize: 25 });
    expect(result.leads).toEqual([]);
    expect(result.total).toBe(0);
  });

  it("accepts filter parameters without error", async () => {
    const caller = appRouter.createCaller(createCtx());
    const result = await caller.leads.list({
      search: "tech",
      industry: "Technology",
      location: "San Francisco",
      page: 1,
      pageSize: 10,
    });
    expect(result).toBeDefined();
  });
});

describe("leads.create", () => {
  it("creates a lead and returns it", async () => {
    const caller = appRouter.createCaller(createCtx());
    const result = await caller.leads.create({
      firstName: "Jane",
      lastName: "Doe",
      title: "CTO",
      email: "jane@example.com",
      companyName: "Acme Corp",
      status: "new",
    });
    expect(result).toBeDefined();
    expect(result?.firstName).toBe("Jane");
    expect(result?.email).toBe("jane@example.com");
  });
});

describe("leads.analytics", () => {
  it("returns analytics data with expected shape", async () => {
    const caller = appRouter.createCaller(createCtx());
    const result = await caller.leads.analytics();
    expect(result).not.toBeNull();
    expect(result?.total).toBe(42);
    expect(Array.isArray(result?.byIndustry)).toBe(true);
    expect(Array.isArray(result?.byLocation)).toBe(true);
    expect(Array.isArray(result?.byStatus)).toBe(true);
  });
});

describe("leads.exportCsv", () => {
  it("returns CSV string", async () => {
    const caller = appRouter.createCaller(createCtx());
    const result = await caller.leads.exportCsv({});
    expect(typeof result.csv).toBe("string");
    expect(result.csv).toContain("First Name");
    expect(result.csv).toContain("Company");
  });
});

describe("leads.delete", () => {
  it("returns success on delete", async () => {
    const caller = appRouter.createCaller(createCtx());
    const result = await caller.leads.delete({ id: 1 });
    expect(result.success).toBe(true);
  });
});

describe("scrape.status", () => {
  it("returns job status", async () => {
    const caller = appRouter.createCaller(createCtx());
    const result = await caller.scrape.status({ jobId: 99 });
    expect(result).toBeDefined();
    expect(result?.status).toBe("running");
    expect(result?.progress).toBe(50);
  });
});

describe("scrape.history", () => {
  it("returns empty array when no jobs", async () => {
    const caller = appRouter.createCaller(createCtx());
    const result = await caller.scrape.history();
    expect(Array.isArray(result)).toBe(true);
  });
});

describe("auth.logout", () => {
  it("clears session cookie and returns success", async () => {
    const ctx = createCtx();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.logout();
    expect(result.success).toBe(true);
  });
});
