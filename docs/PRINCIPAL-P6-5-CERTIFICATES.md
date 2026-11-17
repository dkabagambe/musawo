# PRINCIPAL P6.5: CERTIFICATES - IMPLEMENTATION SUMMARY

## Completed Features

### 1. Enhanced Eligibility Checker with Comprehensive Requirements
- **Requirements checklist per student** (principal.md P6.5):
  - ✅ Lessons Complete (enrolment status COMPLETED)
  - ✅ Exams Passed (all exams for the course)
  - ✅ Practicals Signed (checked via enrolment status)
  - ✅ Log Book Signed (checked via enrolment status)
  - ✅ Attendance ≥75% (calculated from live class attendance)
  - ✅ Fees 100% (totalAmountUgx vs paidAmountUgx from enrolment)

- **Visual checklist display**:
  - Each requirement shown with ✓ or ✗ indicator
  - Green for met, red for unmet
  - Detailed metrics (e.g., "Attendance ≥75% (82%, 18/22)")
  - Card-based layout showing all requirements at a glance

### 2. Batch Certificate Issuance Requests
- **Selection interface**:
  - Checkboxes for eligible students
  - Batch request button shows count
  - Course filter to narrow down students

- **Approval workflow**:
  - Creates ApprovalRequest with type "CERTIFICATE_ISSUANCE"
  - Sends to Director for approval
  - Includes student details, course, and principal's reason
  - All requests audit logged

- **API endpoint**: `POST /api/principal/certificates/request-batch`
  - Accepts array of {studentId, courseId} objects
  - Requires reason (minimum 10 characters)
  - Creates individual approval requests for each certificate
  - Comprehensive audit logging

### 3. Certificate Revocation Workflow
- **Revocation request interface**:
  - Revoke button on issued certificates
  - Reason required (minimum 10 characters)
  - Confirmation dialog
  - Sends to Director for approval

- **API endpoint**: `POST /api/principal/certificates/revoke`
  - Creates ApprovalRequest with type "CERTIFICATE_REVOCATION"
  - Includes certificate details and reason
  - Audit logged
  - Certificate not actually revoked until Director approves

### 4. Status Tracking
- **Five-tab interface**:
  1. **Eligibility**: Students meeting all requirements (with detailed checklist)
  2. **Issued**: Active certificates (with revoke option)
  3. **Pending Approval**: Requests awaiting Director decision
  4. **Revoked**: Certificates that have been revoked (with reason and date)
  5. **Verification**: Public verification lookup tool

- **Course filter**:
  - Available on Eligibility, Issued, and Revoked tabs
  - Dropdown showing all published courses
  - Filters results to selected course

### 5. Public Verification Page
- **Route**: `/verify/[certificateId]`
- **Features**:
  - Beautiful gradient design with institution branding
  - Valid certificate: Green checkmark, full details displayed
  - Revoked certificate: Red X, revocation date and reason shown
  - Not found: 404 page
  - Every verification attempt logged to cert_verifications table

- **Certificate details displayed**:
  - Certificate ID (uniqueId)
  - Date issued
  - Student name and number
  - Course title and code
  - Issuing institution info

### 6. Verification API
- **Endpoint**: `GET /api/certificates/verify/[certificateId]`
- **Returns**:
  - valid: boolean
  - revoked: boolean
  - certificate details (if found)
- **Logs every verification** to database
- **Used by**: CertificatesView inline verification tool

## Database Schema (Existing, No Changes)

### Certificate Model
```prisma
model Certificate {
  id            String    @id @default(cuid())
  userId        String
  courseId      String
  uniqueId      String    @unique // e.g. MTC-2026-CNA-00042
  issuedAt      DateTime  @default(now())
  fileS3Key     String?
  revokedAt     DateTime?
  revokedReason String?
  revokedBy     String?
  
  user          User
  course        Course
  verifications CertVerification[]
}
```

### CertVerification Model
```prisma
model CertVerification {
  id            String   @id @default(cuid())
  certificateId String
  checkedAt     DateTime @default(now())
  ipAddress     String?
  userAgent     String?
  
  certificate Certificate
}
```

## Files Created/Modified

### Created
1. `/src/app/verify/[certificateId]/page.tsx` - Public verification page
2. `/src/app/api/certificates/verify/[certificateId]/route.ts` - Verification API
3. `/docs/PRINCIPAL-P6-5-CERTIFICATES.md` - This file

### Modified
1. `/src/app/(principal)/principal/certificates/page.tsx`
   - Enhanced eligibility calculation with all 6 requirements
   - Added attendance calculation from live classes
   - Added fees check from enrolment data
   - Removed unnecessary includes and queries

2. `/src/app/(principal)/principal/certificates/CertificatesView.tsx`
   - Replaced table layout with card-based layout for eligibility
   - Added comprehensive requirements checklist display
   - Visual indicators (✓/✗) for each requirement
   - Detailed metrics for each requirement

3. `/src/app/api/principal/certificates/request-batch/route.ts`
   - Fixed to accept {studentId, courseId} array format
   - Added proper validation
   - Enhanced metadata in approval requests
   - Correct approval type: CERTIFICATE_ISSUANCE

4. `/src/app/api/principal/certificates/revoke/route.ts`
   - Fixed approval type: CERTIFICATE_REVOCATION
   - Enhanced metadata
   - Improved audit logging
   - Added minimum reason length validation

## Permissions

- `certificates.issue` - Required to request certificate issuance
- `certificates.revoke` - Required to request certificate revocation
- Principal role has both permissions by default

## Approval Flow

1. **Principal** reviews eligibility and selects eligible students
2. **Principal** clicks "Request Certificates" with reason
3. System creates `ApprovalRequest` (type: CERTIFICATE_ISSUANCE, status: SUBMITTED)
4. **Director** reviews request in approvals inbox
5. **Director** approves → Certificates issued, students notified
6. **Director** rejects → Returns to Principal with reason

## Revocation Flow

1. **Principal** clicks "Revoke" on issued certificate with reason
2. System creates `ApprovalRequest` (type: CERTIFICATE_REVOCATION, status: SUBMITTED)
3. **Director** reviews revocation request
4. **Director** approves → Certificate revokedAt set, reason stored
5. Revoked certificate shows as invalid on verification page

## Notes

- Certificate template and signatories management not yet implemented (would need additional UI/models)
- Practicals and log book tracking use enrolment COMPLETED status as proxy
- Public verification page is fully functional and accessible to anyone
- All certificate operations are audit logged
- Revocation requires Director approval (cannot be done by Principal alone)

## Testing Checklist

Per principal.md P6.8 requirements:
- [ ] Principal can view eligible students with full checklist
- [ ] All 6 requirements correctly calculated and displayed
- [ ] Batch certificate request creates approval for Director
- [ ] Certificate revocation creates approval for Director
- [ ] Public verification page shows valid certificates
- [ ] Public verification page shows revoked certificates correctly
- [ ] Verification attempts logged to database
- [ ] Works at 390px and 1440px in light/dark theme
- [ ] Playwright test for certificate flow (Student → Principal → Director → Student)

## Next Steps (Not in P6.5 scope)

- Certificate template management UI
- Signatories management (Principal selects who signs)
- PDF certificate generation with QR codes
- S3 storage for generated certificates (fileS3Key)
- Email notifications when certificate issued
- Student download certificate feature
- Bulk certificate generation for graduating class
