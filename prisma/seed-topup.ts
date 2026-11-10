/**
 * Musawo Training Center - Top-up Seed
 *
 * Fills in missing demo data ON TOP of the base seed:
 *  - Adds students up to 35 (for the 30-student group demo)
 *  - Adds 35+ applications (all statuses)
 *  - Adds exams for every course (with questions and attempts)
 *  - Overlapping live classes across 3 instructors (concurrency demo)
 *  - Attendance for all live classes
 *  - Breakaway groups for the big 30-student class
 *  - More support tickets (all statuses, all roles)
 *  - More approvals (all 6 workflow states)
 *  - More forum threads / announcements
 *  - Practical sessions & equipment requests
 *
 * Safe to run repeatedly (upsert / count-guards throughout).
 *
 * Run:  npm run db:seed-topup
 */

import {
  PrismaClient,
  UserRole,
  EnrolmentStatus,
  PaymentStatus,
  PaymentMethod,
  PaymentGateway,
  LedgerEntryType,
  AuditAction,
  ApprovalRequestStatus,
  ApprovalRequestType,
  LiveClassStatus,
  ExamStatus,
  AttemptStatus,
  TicketStatus,
  TicketPriority,
} from "@prisma/client";
import { hash } from "argon2";
import { randomBytes } from "crypto";
import { formatStudentNumber } from "../src/lib/students/number-format";

const prisma = new PrismaClient();
const ARGON2_OPTIONS = { type: 2 as const, memoryCost: 65536, timeCost: 3, parallelism: 1 };
const DEMO_PW = "Demo1234!";

const now = new Date();
const daysAgo  = (d: number) => new Date(now.getTime() - d * 86_400_000);
const daysFrom = (d: number) => new Date(now.getTime() + d * 86_400_000);
const hoursAgo = (h: number) => new Date(now.getTime() - h * 3_600_000);
const hoursFrom = (h: number) => new Date(now.getTime() + h * 3_600_000);

async function pw() { return hash(DEMO_PW, ARGON2_OPTIONS); }

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function rng(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }
function approvalToken() { return randomBytes(32).toString("hex"); }
function txRef() { return `TXN-${randomBytes(4).toString("hex").toUpperCase()}`; }

// ─────────────────────────────────────────────────────────────────────────────
// EXTRA STUDENTS (top up to 35)
// ─────────────────────────────────────────────────────────────────────────────

const EXTRA_STUDENTS = [
  // MHC cohort (fill to 30 for the group demo)
  { name: "Aisha Nakabugo",     email: "s.nakabugo@example.com",  phone: "+256700200001", courseCode: "MHC", status: EnrolmentStatus.ACTIVE },
  { name: "Emmanuel Ssali",     email: "s.ssali@example.com",     phone: "+256700200002", courseCode: "MHC", status: EnrolmentStatus.ACTIVE },
  { name: "Patience Nalwoga",   email: "s.nalwoga@example.com",   phone: "+256700200003", courseCode: "MHC", status: EnrolmentStatus.ACTIVE },
  { name: "Godfrey Kato",       email: "s.kato@example.com",      phone: "+256700200004", courseCode: "MHC", status: EnrolmentStatus.PARTIALLY_PAID },
  { name: "Lydia Namukasa",     email: "s.namukasa@example.com",  phone: "+256700200005", courseCode: "MHC", status: EnrolmentStatus.ACTIVE },
  { name: "Robert Musoke",      email: "s.musoke@example.com",    phone: "+256700200006", courseCode: "MHC", status: EnrolmentStatus.ACTIVE },
  { name: "Christine Ndagire",  email: "s.ndagire@example.com",   phone: "+256700200007", courseCode: "MHC", status: EnrolmentStatus.ACTIVE },
  { name: "Julius Kabuura",     email: "s.kabuura@example.com",   phone: "+256700200008", courseCode: "MHC", status: EnrolmentStatus.PENDING_PAYMENT },
  { name: "Dorcas Akello",      email: "s.dorcas@example.com",    phone: "+256700200009", courseCode: "MHC", status: EnrolmentStatus.ACTIVE },
  { name: "Henry Bwambale",     email: "s.bwambale@example.com",  phone: "+256700200010", courseCode: "MHC", status: EnrolmentStatus.ACTIVE },
  { name: "Prossy Nakawombe",   email: "s.nakawombe@example.com", phone: "+256700200011", courseCode: "MHC", status: EnrolmentStatus.ACTIVE },
  { name: "Simon Ochieng",      email: "s.ochieng@example.com",   phone: "+256700200012", courseCode: "MHC", status: EnrolmentStatus.ACTIVE },
  { name: "Margret Ayet",       email: "s.ayet@example.com",      phone: "+256700200013", courseCode: "MHC", status: EnrolmentStatus.ACTIVE },
  { name: "Joshua Ssempijja",   email: "s.ssempijja@example.com", phone: "+256700200014", courseCode: "MHC", status: EnrolmentStatus.PARTIALLY_PAID },
  { name: "Winnie Nabacwa",     email: "s.nabacwa@example.com",   phone: "+256700200015", courseCode: "MHC", status: EnrolmentStatus.ACTIVE },
  { name: "David Walugembe",    email: "s.walugembe@example.com", phone: "+256700200016", courseCode: "MHC", status: EnrolmentStatus.ACTIVE },
  { name: "Beatrice Nabirye",   email: "s.bnabirye@example.com",  phone: "+256700200017", courseCode: "MHC", status: EnrolmentStatus.ACTIVE },
  { name: "Michael Okwir",      email: "s.okwir@example.com",     phone: "+256700200018", courseCode: "MHC", status: EnrolmentStatus.OVERDUE },
  { name: "Faridah Nalule",     email: "s.nalule@example.com",    phone: "+256700200019", courseCode: "MHC", status: EnrolmentStatus.ACTIVE },
  { name: "Allan Kyagulanyi",   email: "s.kyagulanyi@example.com",phone: "+256700200020", courseCode: "MHC", status: EnrolmentStatus.ACTIVE },
  { name: "Juliet Namuddu",     email: "s.namuddu@example.com",   phone: "+256700200021", courseCode: "MHC", status: EnrolmentStatus.ACTIVE },
  // BHC cohort
  { name: "Caroline Akello",    email: "s.cakello@example.com",   phone: "+256700200022", courseCode: "BHC", status: EnrolmentStatus.ACTIVE },
  { name: "Philip Omara",       email: "s.omara@example.com",     phone: "+256700200023", courseCode: "BHC", status: EnrolmentStatus.ACTIVE },
  { name: "Agnes Namutebi",     email: "s.agnesn@example.com",    phone: "+256700200024", courseCode: "BHC", status: EnrolmentStatus.PARTIALLY_PAID },
  { name: "Richard Mwesigwa",   email: "s.mwesigwa@example.com",  phone: "+256700200025", courseCode: "BHC", status: EnrolmentStatus.ACTIVE },
  { name: "Harriet Atim",       email: "s.hatim@example.com",     phone: "+256700200026", courseCode: "BCS", status: EnrolmentStatus.ACTIVE },
  { name: "Isaac Kigozi",       email: "s.kigozi@example.com",    phone: "+256700200027", courseCode: "BCS", status: EnrolmentStatus.ACTIVE },
  // MHA cohort
  { name: "Stella Namuyomba",   email: "s.namuyomba@example.com", phone: "+256700200028", courseCode: "MHA", status: EnrolmentStatus.ACTIVE },
  { name: "Felix Okello",       email: "s.fokello@example.com",   phone: "+256700200029", courseCode: "MHA", status: EnrolmentStatus.PENDING_PAYMENT },
  { name: "Janet Kyomugisha",   email: "s.kyomugisha@example.com",phone: "+256700200030", courseCode: "MHA", status: EnrolmentStatus.ACTIVE },
  // BLS cohort
  { name: "Dr. Esther Achen",   email: "s.achen@example.com",     phone: "+256700200031", courseCode: "BLS", status: EnrolmentStatus.ACTIVE },
  { name: "Nurse Sarah Arach",  email: "s.arach@example.com",     phone: "+256700200032", courseCode: "BLS", status: EnrolmentStatus.COMPLETED },
  // COP cohort
  { name: "Maria Nakato",       email: "s.nakato@example.com",    phone: "+256700200033", courseCode: "COP", status: EnrolmentStatus.ACTIVE },
  // ALS cohort (Advanced Life Support — the 7th production course)
  { name: "Dr. James Lubega",   email: "s.lubega@example.com",    phone: "+256700200034", courseCode: "ALS", status: EnrolmentStatus.ACTIVE },
  { name: "Susan Laker",        email: "s.laker@example.com",     phone: "+256700200035", courseCode: "ALS", status: EnrolmentStatus.PENDING_PAYMENT },
];

// ─────────────────────────────────────────────────────────────────────────────
// APPLICATIONS (one per extra student + a few extras for the admissions flow)
// ─────────────────────────────────────────────────────────────────────────────

const DISTRICTS = ["Kampala","Wakiso","Mukono","Jinja","Mbale","Gulu","Mbarara","Masaka","Lira","Soroti"];
const HOW_HEARD = ["Community Health Workers (CHW)","Village Health Teams (VHT)","Friend or family","Social media","Radio or TV","Poster or flyer","Other"];
const QUALIFICATIONS = ["O-Level Certificate","A-Level Certificate","Diploma in Nursing","Bachelor of Science Nursing","Certificate in Clinical Medicine"];
const GENDERS = ["Female","Male"];

async function main() {
  console.log("\n🌱 Top-up seed starting…\n");

  const hashedPw = await pw();

  // ── Load existing staff ────────────────────────────────────────
  const [director, principal, schoolAdmin, tutor, tutor2, tutor3] = await Promise.all([
    prisma.user.findUnique({ where: { email: "director@mtc.ac.ug" } }),
    prisma.user.findUnique({ where: { email: "principal@mtc.ac.ug" } }),
    prisma.user.findUnique({ where: { email: "admin@mtc.ac.ug" } }),
    prisma.user.findUnique({ where: { email: "tutor@mtc.ac.ug" } }),
    prisma.user.findUnique({ where: { email: "tutor2@mtc.ac.ug" } }),
    prisma.user.findUnique({ where: { email: "tutor3@mtc.ac.ug" } }),
  ]);

  if (!director || !principal || !schoolAdmin || !tutor || !tutor2 || !tutor3) {
    throw new Error("Base staff accounts not found - run base seed first: npm run db:seed");
  }

  // ── Load courses ───────────────────────────────────────────────
  const courses = await prisma.course.findMany();
  const courseMap: Record<string, typeof courses[0]> = {};
  for (const c of courses) if (c.courseCode) courseMap[c.courseCode] = c;

  if (!courseMap["MHC"]) {
    throw new Error("Courses not seeded - run base seed first");
  }

  // ── Load intakes ───────────────────────────────────────────────
  const intakes = await prisma.intake.findMany({ where: { isOpen: true } });
  const intakeForCourse = (courseId: string) =>
    intakes.find((i) => i.courseId === courseId) ?? intakes[0];

  // ── Extra students ────────────────────────────────────────────
  const currentStudentCount = await prisma.user.count({ where: { role: UserRole.STUDENT } });
  const newStudents: typeof courses = [];

  if (currentStudentCount < 35) {
    console.log(`  📋 Adding extra students (currently ${currentStudentCount}, target 35+)…`);
    let snSeq = 100; // start high to avoid conflicts with base seed
    for (const def of EXTRA_STUDENTS) {
      const existing = await prisma.user.findUnique({ where: { email: def.email } });
      if (existing) continue;
      const course = courseMap[def.courseCode];
      if (!course) continue;
      snSeq++;
      const sn = formatStudentNumber(def.courseCode, 2026, snSeq);
      // ensure no SN conflict
      const snConflict = await prisma.user.findUnique({ where: { studentNumber: sn } });
      const finalSn = snConflict ? formatStudentNumber(def.courseCode, 2026, snSeq + 500) : sn;

      const student = await prisma.user.create({
        data: {
          name: def.name,
          email: def.email,
          phone: def.phone,
          passwordHash: hashedPw,
          studentNumber: finalSn,
          role: UserRole.STUDENT,
          status: "ACTIVE",
          emailVerified: daysAgo(rng(5, 30)),
          dataConsentAt: daysAgo(rng(5, 30)),
        },
      });

      // Enrol student
      const courseObj = courseMap[def.courseCode];
      const intake = intakeForCourse(courseObj.id);
      const totalFee = courseObj.fullFeeUgx ?? 1800000;
      const paidAmt = def.status === EnrolmentStatus.ACTIVE
        ? totalFee
        : def.status === EnrolmentStatus.PARTIALLY_PAID
          ? Math.ceil(totalFee * 0.5)
          : def.status === EnrolmentStatus.COMPLETED
            ? totalFee
            : 0;
      const paidPct = totalFee > 0 ? Math.round((paidAmt / totalFee) * 100) : 0;

      const enr = await prisma.enrolment.create({
        data: {
          userId: student.id,
          courseId: courseObj.id,
          intakeId: intake.id,
          status: def.status,
          planType: paidPct === 100 ? "FULL" : "INSTALMENT",
          totalAmountUgx: totalFee,
          paidAmountUgx: paidAmt,
          paidPercent: paidPct,
          unlockedBlockOrder: paidPct >= 100 ? 6 : paidPct >= 67 ? 3 : paidPct >= 50 ? 2 : 1,
          overdueSince: def.status === EnrolmentStatus.OVERDUE ? daysAgo(14) : null,
          graceUntil: def.status === EnrolmentStatus.OVERDUE ? daysFrom(7) : null,
        },
      });

      // Payment record for paid students
      if (paidAmt > 0) {
        await prisma.payment.create({
          data: {
            enrolmentId: enr.id,
            amount: paidAmt,
            method: pick([PaymentMethod.MTN_MOMO, PaymentMethod.AIRTEL_MONEY]),
            gateway: PaymentGateway.MANUAL,
            gatewayRef: txRef(),
            status: PaymentStatus.COMPLETED,
            paidAt: daysAgo(rng(10, 60)),
          },
        });
        await prisma.ledgerEntry.create({
          data: {
            enrolmentId: enr.id,
            type: LedgerEntryType.PAYMENT,
            amount: paidAmt,
            balanceAfter: paidAmt,
            description: `Payment via Mobile Money`,
            createdAt: daysAgo(rng(10, 60)),
          },
        });
      }
      // @ts-expect-error collecting for downstream use
      newStudents.push(student);
    }
    console.log(`  ✓ Extra students added (now ${await prisma.user.count({ where: { role: UserRole.STUDENT } })} students)`);
  } else {
    console.log(`  ℹ  Students already at ${currentStudentCount} - skipping extra students`);
  }

  // ── Applications ──────────────────────────────────────────────
  const existingApplications = await prisma.application.count();
  if (existingApplications < 10) {
    console.log("  📋 Seeding applications…");
    const appDefs = [
      // submitted / under review
      { name: "Nambozo Irene", email: "app.nambozo@example.com", course: "MHC", status: "SUBMITTED", days: 3 },
      { name: "Ssekamwa Tonny", email: "app.ssekamwa@example.com", course: "MHC", status: "SUBMITTED", days: 2 },
      { name: "Nakato Rose", email: "app.nakato@example.com", course: "BHC", status: "UNDER_REVIEW", days: 5 },
      { name: "Opio Benson", email: "app.opio@example.com", course: "BHC", status: "UNDER_REVIEW", days: 4 },
      { name: "Akello Grace", email: "app.akello@example.com", course: "MHC", status: "SUBMITTED", days: 1 },
      { name: "Musinguzi John", email: "app.musinguzi@example.com", course: "BCS", status: "SUBMITTED", days: 1 },
      // accepted (turned into students)
      { name: "Asiimwe Doreen", email: "app.asiimwe@example.com", course: "MHC", status: "ACCEPTED", days: 10 },
      { name: "Tumwine Geoffrey", email: "app.tumwine@example.com", course: "BLS", status: "ACCEPTED", days: 14 },
      { name: "Nabirye Annet", email: "app.annet2@example.com", course: "MHA", status: "ACCEPTED", days: 8 },
      // rejected
      { name: "Kizza Ronald", email: "app.kizza@example.com", course: "BLS", status: "REJECTED", days: 20, reason: "Does not meet professional qualification requirement for this course." },
      { name: "Nabukenya Olivia", email: "app.nabukenya@example.com", course: "ALS", status: "REJECTED", days: 18, reason: "No current BLS certification provided." },
      // withdrawn
      { name: "Mubiru Patrick", email: "app.mubiru@example.com", course: "BHC", status: "WITHDRAWN", days: 15 },
    ] as Array<{ name: string; email: string; course: string; status: string; days: number; reason?: string }>;

    for (const a of appDefs) {
      const courseObj = courseMap[a.course];
      if (!courseObj) continue;
      const existing = await prisma.application.findFirst({ where: { email: a.email } });
      if (existing) continue;
      const intake = intakeForCourse(courseObj.id);
      await prisma.application.create({
        data: {
          courseId: courseObj.id,
          intakeId: intake.id,
          fullName: a.name,
          email: a.email,
          phone: `+25670${rng(1000000, 9999999)}`,
          category: courseObj.category,
          highestQualification: pick(QUALIFICATIONS),
          gender: pick(GENDERS),
          district: pick(DISTRICTS),
          howHeard: pick(HOW_HEARD),
          status: a.status as "SUBMITTED" | "UNDER_REVIEW" | "ACCEPTED" | "REJECTED" | "WITHDRAWN",
          reviewedById: ["ACCEPTED","REJECTED"].includes(a.status) ? schoolAdmin.id : null,
          reviewedAt: ["ACCEPTED","REJECTED"].includes(a.status) ? daysAgo(a.days - 2) : null,
          rejectionReason: a.reason ?? null,
          dataConsentAt: daysAgo(a.days),
          createdAt: daysAgo(a.days),
        },
      });
    }
    console.log(`  ✓ Applications (${await prisma.application.count()} total)`);
  } else {
    console.log(`  ℹ  Applications already seeded (${existingApplications})`);
  }

  // ── Extra Exams (one per remaining course) ─────────────────────
  const examCount = await prisma.exam.count();
  if (examCount < 8) {
    console.log("  📋 Seeding exams for all courses…");
    const examCourses = [
      { code: "BHC", title: "Basic Home Care: Module 2 Assessment", mins: 25, pass: 60 },
      { code: "BCS", title: "Babysitting & Child Care: Mid-Course Test", mins: 20, pass: 60 },
      { code: "MHA", title: "Mental Health Support: End of Course Exam", mins: 45, pass: 65 },
      { code: "COP", title: "Care of Older Persons: Final Assessment", mins: 40, pass: 65 },
      { code: "BLS", title: "Basic Life Support: Practical Theory Exam", mins: 30, pass: 75 },
      { code: "ALS", title: "Advanced Life Support: Certification Exam", mins: 45, pass: 75 },
    ];

    for (const ed of examCourses) {
      const course = courseMap[ed.code];
      if (!course) continue;
      const exists = await prisma.exam.findFirst({ where: { courseId: course.id } });
      if (exists) continue;

      const exam = await prisma.exam.create({
        data: {
          courseId: course.id,
          title: ed.title,
          timeLimitMin: ed.mins,
          attemptLimit: 2,
          passPercent: ed.pass,
          shuffleQuestions: true,
          status: ExamStatus.PUBLISHED,
        },
      });

      // 5 MCQ questions per exam
      const questions = [
        { text: "Which of the following is a core principle of person-centred care?", type: "MCQ", opts: ["Efficiency above all", "Treating all patients the same", "Respecting individual needs and preferences", "Reducing costs"], correct: "Respecting individual needs and preferences", pts: 5 },
        { text: "What should you do first when you arrive at a patient's home?", type: "MCQ", opts: ["Begin treatment immediately", "Introduce yourself and explain your role", "Check all medications", "Call the family"], correct: "Introduce yourself and explain your role", pts: 5 },
        { text: "Hand hygiene should be performed before and after patient contact.", type: "TRUE_FALSE", opts: ["True", "False"], correct: "True", pts: 5 },
        { text: "Which of the following indicates a change in a patient's condition that must be reported?", type: "MCQ", opts: ["Patient asks for water", "Sudden change in breathing rate", "Patient wants to rest", "Patient requests a different pillow"], correct: "Sudden change in breathing rate", pts: 5 },
        { text: "Briefly describe how you would document a patient observation during a home visit.", type: "SHORT_ANSWER", opts: null, correct: null, pts: 10 },
      ];

      for (const q of questions) {
        await prisma.quizQuestion.create({
          data: {
            examId: exam.id,
            text: q.text,
            type: q.type as "MCQ" | "TRUE_FALSE" | "SHORT_ANSWER",
            options: q.opts ? JSON.stringify(q.opts) : undefined,
            correctAnswer: q.correct ?? undefined,
            points: q.pts,
          },
        });
      }

      // Add some attempts for BLS (completed student)
      if (ed.code === "BLS") {
        const blsCompletedStudent = await prisma.user.findUnique({ where: { email: "s.arach@example.com" } });
        const blsEnr = blsCompletedStudent
          ? await prisma.enrolment.findFirst({ where: { userId: blsCompletedStudent.id } })
          : null;
        if (blsCompletedStudent && blsEnr) {
          await prisma.examAttempt.create({
            data: {
              examId: exam.id,
              userId: blsCompletedStudent.id,
              number: 1,
              status: AttemptStatus.MARKED,
              score: 22,
              maxScore: 30,
              passed: true,
              answers: JSON.stringify({ q1: "Respecting individual needs and preferences" }),
              startedAt: daysAgo(10),
              submittedAt: daysAgo(10),
            },
          });
        }
      }
    }
    console.log(`  ✓ Exams seeded (${await prisma.exam.count()} total)`);
  } else {
    console.log(`  ℹ  Exams already seeded (${examCount})`);
  }

  // ── Overlapping Live Classes (concurrency demo) ────────────────
  const liveClassCount = await prisma.liveClass.count();
  if (liveClassCount < 15) {
    console.log("  📋 Seeding overlapping live classes for concurrency demo…");

    // Classes happening NOW / today (simulate simultaneous sessions)
    const simultaneousSlots = [
      // TODAY - all three instructors teaching at the same time
      { title: "MHC Block 5: Elderly Care - Tutor Joel", courseCode: "MHC", tutorId: tutor.id, daysOffset: 0, hour: 9, min: 0, dur: 90, status: LiveClassStatus.LIVE },
      { title: "BHC First Aid Live Session", courseCode: "BHC", tutorId: tutor2.id, daysOffset: 0, hour: 9, min: 0, dur: 60, status: LiveClassStatus.LIVE },
      { title: "BCS Child Safety Live Tutorial", courseCode: "BCS", tutorId: tutor3.id, daysOffset: 0, hour: 9, min: 30, dur: 60, status: LiveClassStatus.LIVE },
      // UPCOMING - next 2 weeks
      { title: "MHA Mental Health: Crisis Response", courseCode: "MHA", tutorId: tutor.id, daysOffset: 2, hour: 14, min: 0, dur: 90, status: LiveClassStatus.SCHEDULED },
      { title: "COP Dementia Care Workshop", courseCode: "COP", tutorId: tutor2.id, daysOffset: 2, hour: 14, min: 0, dur: 90, status: LiveClassStatus.SCHEDULED },
      { title: "BLS CPR Practical Review", courseCode: "BLS", tutorId: tutor3.id, daysOffset: 2, hour: 14, min: 30, dur: 60, status: LiveClassStatus.SCHEDULED },
      { title: "ALS ACLS Algorithm Session", courseCode: "ALS", tutorId: tutor.id, daysOffset: 4, hour: 10, min: 0, dur: 120, status: LiveClassStatus.SCHEDULED },
      { title: "MHC Final Revision (Intake 6)", courseCode: "MHC", tutorId: tutor.id, daysOffset: 6, hour: 18, min: 0, dur: 90, status: LiveClassStatus.SCHEDULED },
      { title: "ALS Emergency Scenarios", courseCode: "ALS", tutorId: tutor2.id, daysOffset: 6, hour: 18, min: 0, dur: 60, status: LiveClassStatus.SCHEDULED },
      // PAST - for recordings / replay
      { title: "MHC Block 1: Foundations - Recorded", courseCode: "MHC", tutorId: tutor.id, daysOffset: -21, hour: 9, min: 0, dur: 90, status: LiveClassStatus.COMPLETED, recordingUrl: "https://meet.google.com/recording/demo-mhc-b1" },
      { title: "BHC Intro Session - Recorded", courseCode: "BHC", tutorId: tutor2.id, daysOffset: -18, hour: 14, min: 0, dur: 60, status: LiveClassStatus.COMPLETED, recordingUrl: "https://meet.google.com/recording/demo-bhc-intro" },
      { title: "MHA Introduction to Mental Health", courseCode: "MHA", tutorId: tutor.id, daysOffset: -10, hour: 18, min: 0, dur: 90, status: LiveClassStatus.COMPLETED, recordingUrl: "https://meet.google.com/recording/demo-mha-1" },
    ];

    // Load all students for attendance seeding
    const allStudents = await prisma.user.findMany({ where: { role: UserRole.STUDENT } });

    for (const slot of simultaneousSlots) {
      const course = courseMap[slot.courseCode];
      if (!course) continue;
      const existing = await prisma.liveClass.findFirst({
        where: { courseId: course.id, title: slot.title },
      });
      if (existing) continue;

      const scheduledAt = daysFrom(slot.daysOffset);
      scheduledAt.setUTCHours(slot.hour - 3, slot.min, 0, 0); // EAT = UTC+3

      const lc = await prisma.liveClass.create({
        data: {
          courseId: course.id,
          tutorId: slot.tutorId,
          title: slot.title,
          scheduledAt,
          durationMin: slot.dur,
          joinUrl: `https://meet.google.com/mtc-demo-${randomBytes(3).toString("hex")}`,
          platform: "link",
          status: slot.status,
          recordingUrl: slot.recordingUrl ?? null,
        },
      });

      // Set recording status via raw SQL (the field may exist as a column)
      await prisma.$executeRawUnsafe(
        `UPDATE live_classes SET "recordingStatus" = $1, "recordingEnabled" = true WHERE id = $2`,
        slot.recordingUrl ? "AVAILABLE" : "PENDING",
        lc.id,
      ).catch(() => { /* column may not exist in older migrations */ });

      // Attendance for completed classes
      if (slot.status === LiveClassStatus.COMPLETED) {
        const enrolledStudents = await prisma.enrolment.findMany({
          where: { courseId: course.id, status: { in: ["ACTIVE", "PARTIALLY_PAID", "COMPLETED"] } },
          select: { userId: true },
          take: 15,
        });
        for (const { userId } of enrolledStudents) {
          const alreadyMarked = await prisma.attendance.findFirst({
            where: { liveClassId: lc.id, userId },
          });
          if (alreadyMarked) continue;
          const joined = new Date(scheduledAt.getTime() + rng(0, 10) * 60_000);
          await prisma.attendance.create({
            data: {
              liveClassId: lc.id,
              userId,
              joinedAt: joined,
              markedPresent: true,
            },
          });
          await prisma.$executeRawUnsafe(
            `UPDATE attendance SET "admittedAt" = $1, "leftAt" = $2, "startMark" = 'PRESENT'::"AttendanceMark", "endMark" = 'PRESENT'::"AttendanceMark" WHERE "liveClassId" = $3 AND "userId" = $4`,
            joined,
            new Date(joined.getTime() + slot.dur * 60_000),
            lc.id,
            userId,
          ).catch(() => {});
        }
      }

      // Attendance for LIVE classes (students currently in class)
      if (slot.status === LiveClassStatus.LIVE) {
        const enrolledStudents = await prisma.enrolment.findMany({
          where: { courseId: course.id, status: { in: ["ACTIVE", "PARTIALLY_PAID"] } },
          select: { userId: true },
          take: 20,
        });
        for (const { userId } of enrolledStudents.slice(0, Math.min(8, enrolledStudents.length))) {
          const alreadyJoined = await prisma.attendance.findFirst({ where: { liveClassId: lc.id, userId } });
          if (alreadyJoined) continue;
          await prisma.attendance.create({
            data: {
              liveClassId: lc.id,
              userId,
              joinedAt: hoursAgo(1),
              markedPresent: true,
            },
          });
          // Speak status
          await prisma.$executeRawUnsafe(
            `UPDATE attendance SET "speakStatus" = 'LISTEN_ONLY'::"SpeakStatus", "admittedAt" = $1 WHERE "liveClassId" = $2 AND "userId" = $3`,
            hoursAgo(1),
            lc.id,
            userId,
          ).catch(() => {});
        }
        // Give one student speak rights
        const firstEnrolled = enrolledStudents[0];
        if (firstEnrolled) {
          await prisma.$executeRawUnsafe(
            `UPDATE attendance SET "speakStatus" = 'CAN_SPEAK'::"SpeakStatus" WHERE "liveClassId" = $1 AND "userId" = $2`,
            lc.id,
            firstEnrolled.userId,
          ).catch(() => {});
        }
      }
    }
    console.log(`  ✓ Live classes (${await prisma.liveClass.count()} total, 3 currently LIVE)`);
  } else {
    console.log(`  ℹ  Live classes already seeded (${liveClassCount})`);
  }

  // ── Breakaway Groups for 30-student MHC class ──────────────────
  const groupCount = await prisma.classGroup.count();
  const mhcLiveClass = await prisma.liveClass.findFirst({
    where: {
      courseId: courseMap["MHC"]?.id,
      status: { in: [LiveClassStatus.LIVE, LiveClassStatus.COMPLETED] },
    },
    orderBy: { scheduledAt: "desc" },
  });

  if (groupCount < 6 && mhcLiveClass) {
    console.log("  📋 Seeding 30-student breakaway groups…");

    // Get all MHC enrolled students
    const mhcEnrolments = await prisma.enrolment.findMany({
      where: {
        courseId: mhcLiveClass.courseId,
        status: { in: ["ACTIVE", "PARTIALLY_PAID", "COMPLETED"] },
      },
      select: { userId: true },
      take: 30,
    });

    const studentIds = mhcEnrolments.map((e) => e.userId);
    const existingGroupsForClass = await prisma.classGroup.count({ where: { liveClassId: mhcLiveClass.id } });

    if (existingGroupsForClass < 6 && studentIds.length >= 6) {
      const GROUP_NAMES = ["Group Acholi", "Group Baganda", "Group Banyoro", "Group Basoga", "Group Batooro", "Group Lugbara"];
      const groupSize = Math.ceil(studentIds.length / GROUP_NAMES.length);

      for (let i = 0; i < GROUP_NAMES.length; i++) {
        const slice = studentIds.slice(i * groupSize, (i + 1) * groupSize);
        if (slice.length === 0) continue;
        const existingGroup = await prisma.classGroup.findFirst({
          where: { liveClassId: mhcLiveClass.id, name: GROUP_NAMES[i] },
        });
        if (existingGroup) continue;

        const group = await prisma.classGroup.create({
          data: {
            liveClassId: mhcLiveClass.id,
            name: GROUP_NAMES[i],
            meetLink: `https://meet.google.com/demo-grp-${String.fromCharCode(97 + i)}`,
            members: {
              create: slice.map((uid) => ({ userId: uid })),
            },
          },
        });

        // Group forum thread
        const threadExists = await prisma.forumThread.findFirst({
          where: { groupId: group.id },
        });
        if (!threadExists) {
          const thread = await prisma.forumThread.create({
            data: {
              courseId: mhcLiveClass.courseId,
              liveClassId: mhcLiveClass.id,
              groupId: group.id,
              authorId: tutor.id,
              title: `${GROUP_NAMES[i]} - Group Work Thread`,
              body: `Use this thread to coordinate your group submission. Each member should contribute at least one point.`,
              createdAt: daysAgo(rng(1, 5)),
            },
          });
          // First reply from a group member
          if (slice[0]) {
            await prisma.forumReply.create({
              data: {
                threadId: thread.id,
                authorId: slice[0],
                body: `I will start by summarising the first point from today's session.`,
                createdAt: daysAgo(rng(1, 3)),
              },
            });
          }
        }

        // Group work submission for first 3 groups
        if (i < 3) {
          const submissionExists = await prisma.groupWorkSubmission.findFirst({ where: { groupId: group.id } });
          if (!submissionExists) {
            await prisma.groupWorkSubmission.create({
              data: {
                groupId: group.id,
                liveClassId: mhcLiveClass.id,
                title: `${GROUP_NAMES[i]} - Case Study Summary`,
                body: `Our group analysed the infection control scenario. Key findings: (1) PPE was not donned correctly; (2) hand hygiene was omitted at moment 2; (3) waste disposal did not follow standard precautions. Recommended actions listed.`,
                groupMark: i === 0 ? 85 : i === 1 ? 78 : null,
                gradedAt: i < 2 ? daysAgo(3) : null,
                gradedBy: i < 2 ? tutor.id : null,
              },
            });
          }
        }
      }
      console.log(`  ✓ Breakaway groups (${await prisma.classGroup.count()} total, 6 in MHC class)`);
    } else {
      console.log(`  ℹ  Groups already exist for MHC class or not enough students`);
    }
  } else {
    console.log(`  ℹ  Groups already seeded (${groupCount})`);
  }

  // ── Support Tickets (all statuses, all roles) ──────────────────
  const ticketCount = await prisma.supportTicket.count();
  if (ticketCount < 15) {
    console.log("  📋 Seeding support tickets for all roles…");
    const allStudents = await prisma.user.findMany({
      where: { role: UserRole.STUDENT, status: "ACTIVE" },
      take: 10,
    });
    const itadmin = await prisma.user.findUnique({ where: { email: "itadmin@mtc.ac.ug" } });

    const ticketDefs = [
      // Students
      { userId: allStudents[0]?.id ?? director.id, subject: "Video lesson not loading on mobile", body: "The Block 3 lesson 2 video will not play on my Android phone. I have tried three times. My data is working fine for other sites.", status: TicketStatus.OPEN, priority: TicketPriority.HIGH, days: 1 },
      { userId: allStudents[1]?.id ?? director.id, subject: "Exam timer stopped mid-attempt", body: "The countdown timer disappeared during my Block 2 exam. The exam closed after 10 minutes but I still had 20 minutes remaining.", status: TicketStatus.IN_PROGRESS, priority: TicketPriority.HIGH, days: 2, staffReply: "We have reviewed the attempt logs and found a network timeout. We are granting you a second free attempt. Please check your Results page." },
      { userId: allStudents[2]?.id ?? director.id, subject: "Certificate QR code not scanning", body: "The QR code on my downloaded certificate does not scan with any app I try. I need to show my employer next week.", status: TicketStatus.RESOLVED, priority: TicketPriority.NORMAL, days: 7, staffReply: "The certificate has been re-generated with a corrected QR code. Please download it again from the Certificates section." },
      { userId: allStudents[3]?.id ?? director.id, subject: "Wrong name on student profile", body: "My student profile shows 'Paul Opio' but my preferred name is 'Paul Opio-Achan'. Please update.", status: TicketStatus.OPEN, priority: TicketPriority.LOW, days: 3 },
      { userId: allStudents[4]?.id ?? director.id, subject: "Cannot submit assignment - file too large", body: "I am trying to upload my Infection Control scenario PDF (4.2 MB) but I get an error saying the file is too large. What is the maximum?", status: TicketStatus.RESOLVED, priority: TicketPriority.NORMAL, days: 5, staffReply: "Maximum file size is 5 MB. Try compressing your PDF using a free tool like ilovepdf.com - this should bring it under the limit." },
      // Instructor tickets
      { userId: tutor.id, subject: "Attendance download missing student data", body: "When I download the attendance CSV for the Block 2 class, 3 students are missing even though they attended. Their names are listed on screen but not in the download.", status: TicketStatus.OPEN, priority: TicketPriority.HIGH, days: 1 },
      { userId: tutor2.id, subject: "Request to add a co-instructor to BHC class", body: "I would like Atim Jennifer added as a co-instructor to the Basic Home Caregiver course so she can upload materials and take roll call.", status: TicketStatus.CLOSED, priority: TicketPriority.LOW, days: 10, staffReply: "Co-instructor access has been granted. Atim Jennifer can now manage materials for the BHC course." },
      // Admin tickets
      { userId: schoolAdmin.id, subject: "Bulk student import - guidance needed", body: "I need to register 30 students for the November intake. Is there a bulk CSV import feature, or do I need to create accounts one by one?", status: TicketStatus.IN_PROGRESS, priority: TicketPriority.NORMAL, days: 2, staffReply: "We are working on a bulk import tool. In the meantime, each account must be created individually. We will notify you when bulk import is ready." },
      // Principal
      { userId: principal.id, subject: "Approval notification emails not arriving", body: "I have submitted 4 approval requests but received no email confirmations. Our Director says he has not received any notifications either.", status: TicketStatus.IN_PROGRESS, priority: TicketPriority.HIGH, days: 1, staffReply: "We are investigating the email delivery issue. The Resend API logs show the emails are being queued but not delivered. We will update you within 4 hours." },
      // Director
      { userId: director.id, subject: "Report export - date filter not working", body: "On the Reports page, when I set a date range of October 1 to November 1, the export still shows data from September. The filter does not seem to apply to CSV exports.", status: TicketStatus.OPEN, priority: TicketPriority.NORMAL, days: 2 },
    ];

    for (const td of ticketDefs) {
      if (!td.userId) continue;
      const existing = await prisma.supportTicket.findFirst({ where: { userId: td.userId, subject: td.subject } });
      if (existing) continue;
      const ticket = await prisma.supportTicket.create({
        data: {
          userId: td.userId,
          subject: td.subject,
          body: td.body,
          status: td.status,
          priority: td.priority,
          createdAt: daysAgo(td.days),
          assignedTo: itadmin?.id ?? null,
        },
      });
      if (td.staffReply && itadmin) {
        await prisma.supportReply.create({
          data: {
            ticketId: ticket.id,
            authorId: itadmin.id,
            body: td.staffReply,
            isStaff: true,
            createdAt: daysAgo(td.days - 1),
          },
        });
      }
    }
    console.log(`  ✓ Support tickets (${await prisma.supportTicket.count()} total)`);
  } else {
    console.log(`  ℹ  Support tickets already seeded (${ticketCount})`);
  }

  // ── More Approvals (all 6 workflow states) ─────────────────────
  const approvalCount = await prisma.approvalRequest.count();
  if (approvalCount < 12) {
    console.log("  📋 Seeding approvals in all workflow states…");

    const allStudentsList = await prisma.user.findMany({ where: { role: UserRole.STUDENT }, take: 6 });
    const enrolments = await prisma.enrolment.findMany({ take: 6 });
    const enrolMap: Record<string, string> = {};
    for (const e of enrolments) enrolMap[e.userId] = e.id;

    const approvalDefs = [
      // DRAFT - prepared but not submitted
      { type: ApprovalRequestType.CERTIFICATE_ISSUANCE, status: ApprovalRequestStatus.DRAFT, init: schoolAdmin.id, student: allStudentsList[0], reason: "Student James Ssemwogerere has completed all course requirements. Requesting certificate issuance.", amount: null, days: 1 },
      // IN_REVIEW - submitted and being reviewed
      { type: ApprovalRequestType.ADMISSION, status: ApprovalRequestStatus.IN_REVIEW, init: schoolAdmin.id, student: allStudentsList[1], reason: "New student Aisha Nakabugo has submitted all required documents and passed the eligibility check. Requesting admission approval for MHC November intake.", amount: null, days: 3 },
      // APPROVED
      { type: ApprovalRequestType.ADMISSION, status: ApprovalRequestStatus.APPROVED, init: schoolAdmin.id, student: allStudentsList[2], reason: "Student Ronald Mugisha - all documents verified. Requesting admission approval.", amount: null, days: 10 },
      { type: ApprovalRequestType.CERTIFICATE_ISSUANCE, status: ApprovalRequestStatus.APPROVED, init: schoolAdmin.id, student: allStudentsList[3], reason: "Student completed CNA with distinction. Certificate approved for issuance.", amount: null, days: 20 },
      // REJECTED - with comment
      { type: ApprovalRequestType.REFUND, status: ApprovalRequestStatus.REJECTED, init: principal.id, student: allStudentsList[4], reason: "Student withdrew after Block 3. Requesting 20% refund.", amount: 460000, days: 15 },
      // APPLIED - workflow completed
      { type: ApprovalRequestType.COURSE_CHANGE, status: ApprovalRequestStatus.APPLIED, init: principal.id, student: null, reason: "Updating MHC course syllabus to include updated WHO hand hygiene guidelines (2023 revision). All lesson references updated.", amount: null, days: 30 },
      { type: ApprovalRequestType.PAYMENT_PROOF, status: ApprovalRequestStatus.SUBMITTED, init: schoolAdmin.id, student: allStudentsList[0], reason: "Student Harriet Namutebi submitted MTN MoMo proof of payment UGX 766,667 (first instalment). Transaction ID: MTN-2026-NEW-001.", amount: 766667, days: 2 },
      { type: ApprovalRequestType.WAIVER, status: ApprovalRequestStatus.SUBMITTED, init: schoolAdmin.id, student: allStudentsList[1], reason: "Student is a certified community health worker (CHW). Requesting 15% fee waiver per MoH partnership agreement.", amount: 270000, days: 4 },
      { type: ApprovalRequestType.EQUIPMENT_REQUEST, status: ApprovalRequestStatus.SUBMITTED, init: schoolAdmin.id, student: null, reason: "Request for practical lab supplies for November 2026 intake: 30 x CPR mannequins (rental), 30 x BP cuffs, 60 x gloves packs, 30 x thermometers. Estimated cost: UGX 1,200,000.", amount: 1200000, days: 1 },
    ];

    for (const ad of approvalDefs) {
      const existing = await prisma.approvalRequest.findFirst({
        where: { type: ad.type, status: ad.status, initiatorId: ad.init },
      });
      if (existing) continue;
      await prisma.approvalRequest.create({
        data: {
          type: ad.type,
          status: ad.status,
          initiatorId: ad.init,
          studentId: ad.student?.id ?? null,
          enrolmentId: ad.student ? (enrolMap[ad.student.id] ?? null) : null,
          amount: ad.amount,
          reason: ad.reason,
          approvalToken: approvalToken(),
          decidedById: (ad.status === ApprovalRequestStatus.APPROVED || ad.status === ApprovalRequestStatus.APPLIED || ad.status === ApprovalRequestStatus.REJECTED) ? director.id : null,
          decidedAt: (ad.status === ApprovalRequestStatus.APPROVED || ad.status === ApprovalRequestStatus.APPLIED || ad.status === ApprovalRequestStatus.REJECTED) ? daysAgo(ad.days - 1) : null,
          decisionNote: ad.status === ApprovalRequestStatus.REJECTED ? "Refund request does not meet the criteria in section 4.2 of the fee policy. Students withdrawing after Block 2 are not entitled to a refund. Please refer to the policy document." : null,
          createdAt: daysAgo(ad.days),
        },
      });
    }
    console.log(`  ✓ Approvals (${await prisma.approvalRequest.count()} total, all 6 states covered)`);
  } else {
    console.log(`  ℹ  Approvals already seeded (${approvalCount})`);
  }

  // ── More Announcements ─────────────────────────────────────────
  const announcementCount = await prisma.announcement.count();
  if (announcementCount < 10) {
    console.log("  📋 Seeding more announcements…");
    await prisma.announcement.createMany({
      data: [
        { authorId: principal.id, courseId: null, title: "November 2026 intake - welcome all new students!", body: "We warmly welcome all students joining the November 2026 intake. Please ensure your fees are paid and your profile is complete before your first live class. Attendance is compulsory.", pinned: true, createdAt: daysAgo(2) },
        { authorId: tutor.id, courseId: courseMap["MHC"]?.id ?? null, title: "MHC Block 5 materials uploaded", body: "I have uploaded the reading notes and practical guide for Block 5: Care of Elderly and Vulnerable Patients. Please read before our next live class.", pinned: false, createdAt: daysAgo(1) },
        { authorId: tutor2.id, courseId: courseMap["BHC"]?.id ?? null, title: "BHC group work submissions due Friday", body: "All BHC groups must submit their group work summary by Friday 5pm EAT. Upload it in the Group Work tab of your live class page.", pinned: false, createdAt: daysAgo(3) },
        { authorId: schoolAdmin.id, courseId: null, title: "Skills lab sessions - December timetable", body: "The December practical sessions timetable is now available. Check the Timetable section to see your assigned session. All students must attend at least 4 sessions.", pinned: true, createdAt: daysAgo(4) },
        { authorId: director.id, courseId: null, title: "Platform update - new features available", body: "We have rolled out several improvements: faster video loading, downloadable attendance sheets, and improved exam timer display. Thank you for your patience.", pinned: false, createdAt: daysAgo(6) },
        { authorId: tutor3.id, courseId: courseMap["BCS"]?.id ?? null, title: "BCS practical session - bring your ID", body: "All students attending this week's practical session must bring their student ID card or their student number. Access will not be granted without identification.", pinned: false, createdAt: daysAgo(2) },
      ],
    });
    console.log(`  ✓ Announcements (${await prisma.announcement.count()} total)`);
  } else {
    console.log(`  ℹ  Announcements already seeded (${announcementCount})`);
  }

  // ── More Forum Threads ─────────────────────────────────────────
  const forumCount = await prisma.forumThread.count();
  if (forumCount < 10) {
    console.log("  📋 Seeding forum threads…");
    const activeStudents = await prisma.user.findMany({ where: { role: UserRole.STUDENT, status: "ACTIVE" }, take: 8 });

    const threadDefs = [
      { course: "BHC", author: tutor2.id, title: "BHC: Week 2 recap - what we covered", body: "Great session this week! We covered safe patient handling, vital signs, and basic wound care. Please review your notes before next session.", pinned: true },
      { course: "MHA", author: activeStudents[0]?.id ?? tutor.id, title: "Resources for learning more about Uganda mental health policy", body: "Has anyone found good resources on mental health policy in Uganda beyond what is in the notes? I am looking for the national mental health strategic plan.", pinned: false },
      { course: "BLS", author: activeStudents[1]?.id ?? tutor.id, title: "CPR practice - tips from a nurse", body: "For anyone nervous about the CPR practical: I work in a hospital and the key is COMPRESSION RATE. 100-120 per minute is faster than most people think. Practice counting aloud.", pinned: false },
      { course: "MHC", author: activeStudents[2]?.id ?? tutor.id, title: "Sharing: my first home care visit experience", body: "I completed my first observed home care visit yesterday at a community clinic in Nakawa. It was very different from the classroom. Happy to share notes with anyone preparing.", pinned: false },
    ];

    for (const td of threadDefs) {
      const course = courseMap[td.course];
      if (!course) continue;
      const exists = await prisma.forumThread.findFirst({ where: { courseId: course.id, title: td.title } });
      if (exists) continue;
      const thread = await prisma.forumThread.create({
        data: {
          courseId: course.id,
          authorId: td.author,
          title: td.title,
          body: td.body,
          pinned: td.pinned,
          createdAt: daysAgo(rng(1, 7)),
        },
      });
      // Add a reply
      const replier = pick([...activeStudents.map(s => s.id), tutor.id]);
      if (replier) {
        await prisma.forumReply.create({
          data: {
            threadId: thread.id,
            authorId: replier,
            body: `Thank you for sharing this. Very helpful for all of us.`,
            createdAt: daysAgo(rng(0, 3)),
          },
        });
      }
    }
    console.log(`  ✓ Forum threads (${await prisma.forumThread.count()} total)`);
  } else {
    console.log(`  ℹ  Forum threads already seeded (${forumCount})`);
  }

  // ── Practical Sessions & Equipment ─────────────────────────────
  const practicalCount = await prisma.practicalSession.count();
  if (practicalCount < 6) {
    console.log("  📋 Seeding practical sessions and equipment…");

    const venues = await prisma.venue.findMany();
    const venue = venues[0] ?? await prisma.venue.create({
      data: { name: "MTC Skills Lab - Lugala", location: "Lugala Trading Center, Lubaga, Kampala", capacity: 30 },
    });

    const sessions = [
      { course: "MHC", title: "Block 3 Practical: Personal Care Skills", date: daysFrom(7) },
      { course: "MHC", title: "Block 4 Practical: Vital Signs Workshop", date: daysFrom(10) },
      { course: "BHC", title: "First Aid Practical: CPR Stations", date: daysFrom(8) },
      { course: "BCS", title: "Infant Care Practical", date: daysFrom(9) },
      { course: "BLS", title: "BLS: AED and CPR Mannequin Lab", date: daysFrom(5) },
      { course: "MHA", title: "Mental Health: Role-play Scenarios", date: daysFrom(12) },
    ];

    for (const s of sessions) {
      const course = courseMap[s.course];
      if (!course) continue;
      const exists = await prisma.practicalSession.findFirst({ where: { title: s.title } });
      if (exists) continue;
      const endsAt = new Date(s.date.getTime() + 3 * 60 * 60 * 1000); // 3 hours
      const ps = await prisma.practicalSession.create({
        data: {
          venueId: venue.id,
          title: s.title,
          startsAt: s.date,
          endsAt,
          courseName: course.title,
          createdById: schoolAdmin.id,
        },
      });

      // Equipment items for each practical session
      const equipment = [
        { name: "CPR Mannequin (adult)", quantity: 5 },
        { name: "Blood pressure cuff (manual)", quantity: 10 },
        { name: "Thermometers (digital)", quantity: 10 },
        { name: "Gloves (latex free)", quantity: 60 },
        { name: "Hand sanitiser 500ml", quantity: 5 },
      ];
      for (const eq of equipment) {
        await prisma.practicalEquipmentItem.create({
          data: {
            practicalSessionId: ps.id,
            name: eq.name,
            needed: eq.quantity,
            available: Math.max(0, eq.quantity - rng(0, 2)),
          },
        });
      }
    }
    console.log(`  ✓ Practical sessions (${await prisma.practicalSession.count()} total) with equipment`);
  } else {
    console.log(`  ℹ  Practical sessions already seeded (${practicalCount})`);
  }

  // ── Notifications top-up ──────────────────────────────────────
  const notifCount = await prisma.notification.count();
  if (notifCount < 20) {
    console.log("  📋 Adding notifications for all roles…");
    const activeStudents = await prisma.user.findMany({ where: { role: UserRole.STUDENT }, take: 8 });
    const notifs = [
      { userId: principal.id, type: "APPROVAL_NEEDED", subject: "9 approvals pending", body: "You have 9 approval requests awaiting your decision in the Approvals Inbox.", readAt: null },
      { userId: tutor.id, type: "CLASS_REMINDER", subject: "Live class starts in 30 minutes", body: "MHC Block 5 live class starts in 30 minutes. Your students are waiting.", readAt: null },
      { userId: tutor2.id, type: "CLASS_REMINDER", subject: "BHC live class now live", body: "Your BHC First Aid live session is now active. Students are joining.", readAt: null },
      { userId: tutor3.id, type: "ASSIGNMENT_SUBMITTED", subject: "New assignment submission", body: "A student submitted the Personal Care Reflection Journal. Please review.", readAt: null },
      { userId: schoolAdmin.id, type: "APPLICATION_SUBMITTED", subject: "5 new applications", body: "5 new course applications have been submitted and are awaiting your review in Admissions.", readAt: null },
      ...(activeStudents.slice(0, 5).map((s, i) => ({
        userId: s.id,
        type: i % 2 === 0 ? "CLASS_REMINDER" : "PAYMENT_REMINDER",
        subject: i % 2 === 0 ? "Live class in 1 hour" : "Payment due soon",
        body: i % 2 === 0 ? "A live class you are enrolled in starts in 1 hour. Check your timetable." : "Your next fee instalment is due in 7 days. Pay via MTN MoMo or Airtel Money.",
        readAt: null as Date | null,
      }))),
    ];

    for (const n of notifs) {
      const exists = await prisma.notification.findFirst({ where: { userId: n.userId, subject: n.subject } });
      if (exists) continue;
      await prisma.notification.create({
        data: { userId: n.userId, channel: "IN_APP", type: n.type, subject: n.subject, body: n.body, readAt: n.readAt },
      });
    }
    console.log(`  ✓ Notifications (${await prisma.notification.count()} total)`);
  } else {
    console.log(`  ℹ  Notifications already seeded (${notifCount})`);
  }

  // ── Audit log top-up ──────────────────────────────────────────
  const auditCount = await prisma.auditLog.count();
  if (auditCount < 50) {
    console.log("  📋 Adding audit log entries…");
    const allStaff = [director, principal, schoolAdmin, tutor, tutor2, tutor3];
    const allActiveStudents = await prisma.user.findMany({ where: { role: UserRole.STUDENT, status: "ACTIVE" }, take: 10 });
    const auditEntries = [
      ...allStaff.map(u => ({ actorId: u.id, action: AuditAction.LOGIN, entityType: "User", entityId: u.id, ip: `197.239.${rng(1,255)}.${rng(1,255)}`, createdAt: daysAgo(rng(0, 2)) })),
      ...allStaff.map(u => ({ actorId: u.id, action: AuditAction.LOGIN, entityType: "User", entityId: u.id, ip: `41.210.${rng(1,255)}.${rng(1,255)}`, createdAt: daysAgo(rng(3, 7)) })),
      ...allActiveStudents.slice(0, 5).map(s => ({ actorId: s.id, action: AuditAction.LOGIN, entityType: "User", entityId: s.id, ip: `197.239.${rng(1,255)}.${rng(1,255)}`, createdAt: daysAgo(rng(0, 3)) })),
      { actorId: schoolAdmin.id, action: AuditAction.ENROLMENT_CREATED, entityType: "Enrolment", entityId: "demo-enr-new", metadata: JSON.stringify({ count: 35, intake: "November 2026" }), createdAt: daysAgo(5) },
      { actorId: principal.id, action: AuditAction.PAYMENT_CONFIRMED, entityType: "Payment", entityId: "demo-p-1", metadata: JSON.stringify({ amount: 1800000, method: "MTN_MOMO" }), createdAt: daysAgo(3) },
      { actorId: director.id, action: AuditAction.APPROVAL_APPROVED, entityType: "ApprovalRequest", entityId: "demo-ap-1", metadata: JSON.stringify({ decision: "APPROVED", type: "ADMISSION" }), createdAt: daysAgo(2) },
      { actorId: director.id, action: AuditAction.APPROVAL_APPROVED, entityType: "ApprovalRequest", entityId: "demo-ap-2", metadata: JSON.stringify({ decision: "REJECTED", type: "REFUND", comment: "Does not meet refund criteria" }), createdAt: daysAgo(1) },
      { actorId: schoolAdmin.id, action: AuditAction.ROLE_CHANGED, entityType: "User", entityId: tutor.id, metadata: JSON.stringify({ role: "INSTRUCTOR", assignedBy: "ADMIN" }), createdAt: daysAgo(30) },
      { actorId: principal.id, action: AuditAction.SETTINGS_CHANGED, entityType: "SiteSetting", entityId: "feature.ACADEMIC_REGISTRAR_ACTIVE", metadata: JSON.stringify({ from: "false", to: "false" }), createdAt: daysAgo(10) },
    ];

    for (const e of auditEntries) {
      await prisma.auditLog.create({ data: e });
    }
    console.log(`  ✓ Audit log (${await prisma.auditLog.count()} entries)`);
  } else {
    console.log(`  ℹ  Audit log already full (${auditCount})`);
  }

  // ── Final summary ─────────────────────────────────────────────
  const summary = await prisma.$queryRaw<Array<Record<string, bigint>>>`
    SELECT 
      (SELECT COUNT(*) FROM users WHERE role = 'STUDENT') AS students,
      (SELECT COUNT(*) FROM users WHERE role != 'STUDENT') AS staff,
      (SELECT COUNT(*) FROM courses) AS courses,
      (SELECT COUNT(*) FROM enrolments) AS enrolments,
      (SELECT COUNT(*) FROM applications) AS applications,
      (SELECT COUNT(*) FROM live_classes) AS live_classes,
      (SELECT COUNT(*) FROM live_classes WHERE status = 'LIVE') AS live_now,
      (SELECT COUNT(*) FROM exams) AS exams,
      (SELECT COUNT(*) FROM class_groups) AS groups,
      (SELECT COUNT(*) FROM support_tickets) AS tickets,
      (SELECT COUNT(*) FROM approval_requests) AS approvals,
      (SELECT COUNT(*) FROM attendance) AS attendance,
      (SELECT COUNT(*) FROM forum_threads) AS forum_threads,
      (SELECT COUNT(*) FROM announcements) AS announcements,
      (SELECT COUNT(*) FROM practical_sessions) AS practical_sessions
  `;

  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("🎉 Top-up seed complete! Database summary:");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  if (summary[0]) {
    for (const [k, v] of Object.entries(summary[0])) {
      console.log(`   ${k.padEnd(22)} ${v}`);
    }
  }
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
