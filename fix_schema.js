const fs = require('fs');
let text = fs.readFileSync('drizzle/schema.ts', 'utf-8');

// Fix primary key integer autoincrement
text = text.replace(/integer\("([^"]+)"\)\.autoincrement\(\)\.primaryKey\(\)/g, 'integer("$1", { mode: "number" }).primaryKey({ autoIncrement: true })');

// SQLite integers don't have defaultNow
text = text.replace(/\.defaultNow\(\)/g, '');

// Boolean defaults should be 1/0 in sqlite, but this project uses integer for boolean
text = text.replace(/\.default\(true\)/g, '.default(1)');

fs.writeFileSync('drizzle/schema.ts', text, 'utf-8');
console.log('Fixed schema types for SQLite.');
