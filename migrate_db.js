import fs from 'fs';

let content = fs.readFileSync('server/db.ts', 'utf-8');

// Replace imports
content = content.replace(/import\s*\{\s*drizzle\s*\}\s*from\s*"drizzle-orm\/mysql2";/, 'import { drizzle } from "drizzle-orm/libsql";\nimport { createClient } from "@libsql/client";');

// Replace connection logic
content = content.replace(/_db = drizzle\(process\.env\.DATABASE_URL\);/g, `
      const client = createClient({ url: "file:sqlite.db" });
      _db = drizzle(client);
`);

// Replace onDuplicateKeyUpdate (SQLite uses onConflictDoUpdate)
content = content.replace(/\.onDuplicateKeyUpdate\(\{ set: updateSet \}\)/g, '.onConflictDoUpdate({ target: users.openId, set: updateSet })');

fs.writeFileSync('server/db.ts', content, 'utf-8');
console.log('Database client migrated to SQLite');
