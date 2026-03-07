import fs from 'fs';

let content = fs.readFileSync('drizzle/schema.ts', 'utf-8');

// Replace imports
content = content.replace(/import\s*\{[^}]*\}\s*from\s*"drizzle-orm\/mysql-core";/g, 'import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";');

// Replace table
content = content.replace(/mysqlTable/g, 'sqliteTable');

// Replace types
content = content.replace(/int\(/g, 'integer(');
content = content.replace(/varchar\(/g, 'text(');
content = content.replace(/mysqlEnum\(/g, 'text(');
content = content.replace(/timestamp\(/g, 'integer(');
content = content.replace(/boolean\(/g, 'integer(');
content = content.replace(/json\(/g, 'text(');

// Clean up text() args
content = content.replace(/text\("([^"]+)",\s*\{[^}]+\}\)/g, 'text("$1")');
content = content.replace(/text\("([^"]+)",\s*\[[^\]]+\]\)/g, 'text("$1")');

fs.writeFileSync('drizzle/schema.ts', content, 'utf-8');

console.log('Schema migrated to SQLite');
