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
        
        // Ensure the bypass user has admin privileges
        await db.db.update(db.schema.users).set({ role: 'admin' }).where(db.eq(db.schema.users.openId, "admin_bypass"));
        
        user = await db.getUserByOpenId("admin_bypass");
      }
      return user!;
    }
`;

content = content.replace(/async authenticateRequest\(req: Request\): Promise<User> \{\s*if \(process\.env\.BYPASS_OAUTH === \"true\"\) \{\s*let user = await db\.getUserByOpenId\(\"admin_bypass\"\);\s*if \(\!user\) \{\s*await db\.upsertUser\(\{\s*openId: \"admin_bypass\",\s*name: \"Admin User\",\s*email: \"admin@local\.test\",\s*loginMethod: \"bypass\",\s*lastSignedIn: new Date\(\),\s*\}\);\s*user = await db\.getUserByOpenId\(\"admin_bypass\"\);\s*\}\s*return user\!;\s*\}/su, updatedBypassLogic);

fs.writeFileSync('server/_core/sdk.ts', content, 'utf-8');
console.log('Fixed bypass admin role.');
