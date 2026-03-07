import fs from 'fs';

let content = fs.readFileSync('server/_core/sdk.ts', 'utf-8');

const bypassLogic = `
  async authenticateRequest(req: Request): Promise<User> {
    if (process.env.BYPASS_OAUTH === "true") {
      let user = await db.getUserByOpenId("admin_bypass");
      if (!user) {
        await db.upsertUser({
          openId: "admin_bypass",
          name: "Admin User",
          email: "admin@local.test",
          loginMethod: "bypass",
          lastSignedIn: new Date(),
        });
        user = await db.getUserByOpenId("admin_bypass");
      }
      return user!;
    }

    // Regular authentication flow
`;

content = content.replace('async authenticateRequest(req: Request): Promise<User> {\n    // Regular authentication flow', bypassLogic);

fs.writeFileSync('server/_core/sdk.ts', content, 'utf-8');
console.log('SDK authentication bypassed.');
