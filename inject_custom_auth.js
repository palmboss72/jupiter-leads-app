import fs from 'fs';

let content = fs.readFileSync('server/_core/index.ts', 'utf-8');

// Remove the import statement
content = content.replace(`import basicAuth from 'express-basic-auth';\n`, '');

// Replace the basicAuth usage with a custom inline middleware
const customAuthLogic = `
  // Basic Auth Shield
  if (process.env.ADMIN_PASSWORD) {
    app.use((req, res, next) => {
      const b64auth = (req.headers.authorization || '').split(' ')[1] || '';
      const [login, password] = Buffer.from(b64auth, 'base64').toString().split(':');

      if (login === 'admin' && password === process.env.ADMIN_PASSWORD) {
        return next();
      }

      res.set('WWW-Authenticate', 'Basic realm="Jupiter Leads"');
      res.status(401).send('Authentication required.');
    });
  }
`;

// Extract the old logic
const oldAuthLogic = `
  // Basic Auth Shield
  if (process.env.ADMIN_PASSWORD) {
    app.use(basicAuth({
        users: { 'admin': process.env.ADMIN_PASSWORD },
        challenge: true,
        realm: 'Jupiter Leads',
    }));
  }
`;

content = content.replace(oldAuthLogic, customAuthLogic);
fs.writeFileSync('server/_core/index.ts', content, 'utf-8');
console.log('Injected custom auth middleware.');
