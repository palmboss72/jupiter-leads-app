import fs from 'fs';

let content = fs.readFileSync('server/_core/index.ts', 'utf-8');

const importStatement = `import basicAuth from 'express-basic-auth';\n`;
const authLogic = `
  // Basic Auth Shield
  if (process.env.ADMIN_PASSWORD) {
    app.use(basicAuth({
        users: { 'admin': process.env.ADMIN_PASSWORD },
        challenge: true,
        realm: 'Jupiter Leads',
    }));
  }
`;

content = importStatement + content;
content = content.replace('const server = createServer(app);', 'const server = createServer(app);\n' + authLogic);

fs.writeFileSync('server/_core/index.ts', content, 'utf-8');
console.log('Added Basic Auth middleware.');
