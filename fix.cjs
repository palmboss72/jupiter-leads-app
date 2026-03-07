const fs = require('fs');

let schema = fs.readFileSync('drizzle/schema.ts', 'utf-8');

schema = schema.replace(/integer\("id"\)\.autoincrement\(\)\.primaryKey\(\)/g, 'integer("id", { mode: "number" }).primaryKey({ autoIncrement: true })');

if (!schema.includes('import { sql }')) {
    schema = schema.replace(/from "drizzle-orm\/sqlite-core";/, 'from "drizzle-orm/sqlite-core";\nimport { sql } from "drizzle-orm";');
}

schema = schema.replace(/integer\("createdAt"\)\.defaultNow\(\)/g, 'integer("createdAt", { mode: "timestamp" }).default(sql`(unixepoch())`)');
schema = schema.replace(/integer\("updatedAt"\)\.defaultNow\(\)/g, 'integer("updatedAt", { mode: "timestamp" }).default(sql`(unixepoch())`)');
schema = schema.replace(/integer\("lastSignedIn"\)\.defaultNow\(\)/g, 'integer("lastSignedIn", { mode: "timestamp" }).default(sql`(unixepoch())`)');
schema = schema.replace(/integer\("lastEnrichedAt"\)/g, 'integer("lastEnrichedAt", { mode: "timestamp" })');

schema = schema.replace(/integer\("isActive"\)\.default\(1\)/g, 'integer("isActive", { mode: "boolean" }).default(true)');
schema = schema.replace(/integer\("isActive"\)\.default\(true\)/g, 'integer("isActive", { mode: "boolean" }).default(true)');

fs.writeFileSync('drizzle/schema.ts', schema, 'utf-8');

let router = fs.readFileSync('server/routers.ts', 'utf-8');
// Error: Type 'Date' is not assignable to type 'number'.
router = router.replace(/lastEnrichedAt: new Date\(\)/g, 'lastEnrichedAt: new Date()');

let db = fs.readFileSync('server/db.ts', 'utf-8');
db = db.replace(/eq\(apiSettings\.isActive, true\)/g, 'eq(apiSettings.isActive, true)');

fs.writeFileSync('server/routers.ts', router, 'utf-8');
fs.writeFileSync('server/db.ts', db, 'utf-8');

console.log('Done fixing types.');
