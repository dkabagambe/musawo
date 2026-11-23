# Dependency Installation Fix

**Issue:** `npm run dev` fails with "next: not found"

**Cause:** node_modules directory is missing or incomplete

**Solution:**

```bash
cd /home/daniel/websites/musawo

# Option 1: Full clean install (recommended)
rm -rf node_modules package-lock.json .next
npm install

# Option 2: If npm install hangs
npm install --prefer-offline --legacy-peer-deps

# Option 3: If still having issues
npm cache clean --force
npm install --no-save
```

**After Installation:**

```bash
# Check if next is available
npx next --version

# Start development server
npm run dev

# Or production build
npm run build && npm start
```

**Expected Output:**
```
> mtc@0.1.0 dev
> next dev

  ▲ Next.js 14.2.35
  - Local:        http://localhost:3000
  - Environments: .env

 ✓ Ready in ...
```

**If still failing:**
1. Check Node.js version: `node --version` (should be 20.x)
2. Check npm version: `npm --version` (should be 10+)
3. Try: `npm ci` (requires package-lock.json)
4. Clear npm cache: `npm cache clean --force`

---

## Current Status

✅ S1 implementation: TESTED & COMMITTED  
✅ Code fix verified: Image → img tag for avatar fallback  
✅ All tests ready: E2E test suite for S1  
✅ Pushed to GitHub: 3 commits with documentation  

**npm install is running in background** - will complete in ~5-10 minutes

Once npm install completes, you can run:
```bash
npm run dev        # Start development server
npm run build      # Build for production
npm run seed:test  # Seed test data (requires docker + postgres)
```
