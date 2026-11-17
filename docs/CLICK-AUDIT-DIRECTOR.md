# Click Audit: DIRECTOR

Generated: 2026-11-17T11:00:06.000Z

Base URL: http://localhost:3000

Login: director@mtc.ac.ug

## Summary

| Total nav pages | PASS | FAIL |
|---|---|---|
| 6 | 0 | 6 |

## Page Results

| Page | Final URL | Redirected | Verdict |
|---|---|---|---|
| `/` | `/` | no | **FAIL** |
| `/director` | `/director?tab=general` | yes | **FAIL** |
| `/director/approvals` | `/director/approvals` | no | **FAIL** |
| `/director/reports` | `/director/reports` | no | **FAIL** |
| `/director/audit` | `/director/audit` | no | **FAIL** |
| `/director/finance` | `/director/finance` | no | **FAIL** |

## Console Errors

| Page | Message |
|---|---|
| `/director` | Failed to fetch RSC payload for http://localhost:3000/director?tab=general. Falling back to browser navigation. TypeError: Failed to fetch
    at f (http://localhost:3000/_next/static/chunks/2117-7ad2 |
| `/` | Failed to load resource: net::ERR_SSL_PROTOCOL_ERROR |
| `/` | Failed to fetch RSC payload for http://localhost:3000/login. Falling back to browser navigation. TypeError: Failed to fetch
    at f (http://localhost:3000/_next/static/chunks/2117-7ad2b431b65340f1.js |

---
*Run `node scripts/click-audit.mjs --role DIRECTOR` to regenerate.*
