import fs from 'fs';

let content = fs.readFileSync('server/_core/sdk.ts', 'utf-8');

const updatedBypassLogic = `
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
      
      // Ensure the bypass user always has admin privileges so tRPC routers don't throw 10001
      user!.role = "admin";
      return user!;
    }
    
    // Regular authentication flow
`;

// Replace the previous bypass hack entirely
content = content.replace(/async authenticateRequest\(req: Request\): Promise<User> \{\s*if \(process\.env\.BYPASS_OAUTH === \"true\"\) \{\s.*?\s*return user\!;\s*\}\s*\/\/ Regular authentication flow/su, updatedBypassLogic);

fs.writeFileSync('server/_core/sdk.ts', content, 'utf-8');
console.log('Fixed bypass admin role.');
