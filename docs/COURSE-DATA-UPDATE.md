# Course Data Update from Official PDF

**Date:** November 17, 2026  
**Source:** docs/FEES STRUCTURE MTC V1.final.pdf  
**Status:** ✅ Complete

## Summary

Updated all course names, fees (UGX and USD), and durations across the entire system to match the official MTC fees structure PDF.

## Changes Made

### Course Name Updates

1. **"Certificate in Medical Home Care Course"** → **"Certificate in Medical Home Care"**
   - Removed "Course" suffix
   
2. **"Basic Certificate in Babysitting, Child Care and Safety Management"** → **"Basic Certificate in Babysitting, childcare, and Safety management"**
   - Changed capitalization to match official PDF

3. **"Certificate in Advanced First Aid"** → **"Certificate in First Aid"**
   - Removed "Advanced" prefix

4. **"Basic Certificate in Care of Older Persons and Persons with Disability"** → **"Basic Certificate in care of Older persons and persons with Disability (Geriatric)"**
   - Updated capitalization and added (Geriatric) suffix

### Fee Updates (UGX / USD)

| Course | Old UGX | Old USD | New UGX | New USD |
|--------|---------|---------|---------|---------|
| Medical Home Care | 2,300,000 | 2,300,400 | **1,800,000** | **638** |
| Basic Home Care | 1,800,000 | null | **1,800,000** | **638** |
| Babysitting & Childcare | 1,200,000 | null | **500,000** | **166** |
| Mental Health Support | 1,800,000 | null | **1,800,000** | **638** |
| Care of Older Persons (Geriatric) | 1,800,000 | null | **1,800,000** | **638** |
| Basic Life Support | 600,000 | null | **350,000** | **138** |
| Advanced Life Support | 900,000 | null | **600,000** | **138** |
| First Aid | contact | contact | **350,000** | **138** |

### Duration Confirmations

All durations were verified and are correct:
- **3 months:** Medical Home Care, Basic Home Care, Mental Health Support, Care of Older Persons
- **2 months:** Babysitting & Childcare
- **1 month:** Basic Life Support, Advanced Life Support, First Aid

## Files Updated

1. **prisma/seed.ts**
   - Updated COURSE_DEFS array with correct titles, fees (fullFeeUgx, internationalFeeUgx)
   - Updated upsert logic to include internationalFeeUgx

2. **src/app/(public)/courses/page.tsx**
   - Updated STATIC_COURSE_ITEMS array with correct titles and fees

3. **src/app/(public)/courses/[slug]/page.tsx**
   - Updated STATIC object with correct titles and fees for all 8 courses
   - Fixed international fee display (removed /3600 calculation)

4. **src/app/(public)/page.tsx** (Home page)
   - Updated STATIC_COURSES array with correct titles and fees
   - Fixed international fee display (removed /3600 calculation)

5. **src/app/(public)/courses/CoursesClient.tsx**
   - Fixed international fee display (removed /3600 calculation)

6. **src/app/(principal)/principal/programmes/page.tsx**
   - Fixed international fee display (removed /3600 calculation)

## Verification

- ✅ All course titles match PDF
- ✅ All fees (UGX and USD) match PDF
- ✅ All durations confirmed correct
- ✅ Six files updated consistently
- ✅ Home page STATIC_COURSES updated
- ✅ International fee display fixed (removed incorrect /3600 calculation)
- ✅ Committed and pushed to remote

## Commits

1. `b07f251` - feat: update course names, fees, and durations per official PDF
2. `c3d36a8` - fix: update home page courses and international fee display

## Next Steps

1. Run database seed: `npm run db:seed` (if needed to update existing data)
2. Verify home page displays correct course information
3. Verify individual course pages show correct fees
4. Test course enrollment with updated pricing

## Notes

- International fees (USD) are now populated for all courses except previously marked "contact only"
- The PDF specifies USD prices but the system uses internationalFeeUgx field name (legacy naming)
- All prices are per the official PDF dated as final version
