import { PrismaClient, UserRole } from "@prisma/client";
import { hash } from "argon2";

const prisma = new PrismaClient();

const ARGON2_OPTIONS = { type: 2 as const, memoryCost: 65536, timeCost: 3, parallelism: 1 };

async function main() {
  console.log("🌱 Seeding Musawo Training Center database…");

  // ─── Site Settings ───────────────────────────────────────────────
  const defaultSettings: Array<{ key: string; value: string; description?: string }> = [
    { key: "site.name", value: "Musawo Training Center", description: "Platform display name" },
    { key: "site.domain", value: "learn.musawotraining.ug", description: "Platform domain" },
    { key: "site.supportEmail", value: "training@musawo.ug", description: "Support email address" },
    { key: "site.supportPhone", value: "+256 700 000000", description: "Support phone number" },
    { key: "course.freePreviewPercent", value: "12", description: "% of lessons free before payment" },
    { key: "payment.gateway", value: "pesapal", description: "Active payment gateway: pesapal or flutterwave" },
    { key: "payment.currency", value: "UGX", description: "Currency code" },
    { key: "payment.pesapalConsumerKey", value: "", description: "Pesapal v3 consumer key" },
    { key: "payment.pesapalConsumerSecret", value: "", description: "Pesapal v3 consumer secret" },
    { key: "payment.pesapalCallbackUrl", value: "/api/webhooks/pesapal", description: "Pesapal IPN URL" },
    { key: "payment.flutterwaveSecretKey", value: "", description: "Flutterwave secret key" },
    { key: "video.bunnyStreamApiKey", value: "", description: "Bunny Stream API key" },
    { key: "video.bunnyLibraryId", value: "", description: "Bunny Stream library ID" },
    { key: "video.bunnySigningKey", value: "", description: "Bunny signed-URL key" },
    { key: "storage.s3Endpoint", value: "", description: "S3-compatible endpoint" },
    { key: "storage.s3Bucket", value: "mtc-files", description: "S3 bucket name" },
    { key: "storage.s3AccessKey", value: "", description: "S3 access key ID" },
    { key: "storage.s3SecretKey", value: "", description: "S3 secret access key" },
    { key: "email.resendApiKey", value: "", description: "Resend API key" },
    { key: "sms.provider", value: "africas-talking", description: "SMS provider" },
    { key: "sms.apiKey", value: "", description: "SMS API key" },
    { key: "sms.senderId", value: "MUSAWO", description: "SMS sender ID" },
    { key: "whatsapp.accessToken", value: "", description: "WhatsApp Business Cloud token" },
    { key: "whatsapp.phoneNumberId", value: "", description: "WhatsApp Business phone number ID" },
    { key: "partner.defaultName", value: "Musawo", description: "Default partner name on campaign pages" },
    { key: "exam.tabSwitchAlertThreshold", value: "3", description: "Tab switches before tutor alert" },
    { key: "exam.defaultAttemptLimit", value: "2", description: "Default exam attempt limit" },
    { key: "certificate.issuerName", value: "Musawo Training Center", description: "Certificate issuer text" },
  ];

  for (const setting of defaultSettings) {
    await prisma.siteSetting.upsert({
      where: { key: setting.key },
      update: {},
      create: setting,
    });
  }
  console.log("  ✓ Site settings");

  // ─── Users ──────────────────────────────────────────────────────
  const adminHash = await hash("Admin1234!", ARGON2_OPTIONS);
  const tutorHash = await hash("Tutor1234!", ARGON2_OPTIONS);
  const studentHash = await hash("Student1234!", ARGON2_OPTIONS);

  const admin = await prisma.user.upsert({
    where: { email: "admin@musawotraining.ug" },
    update: {},
    create: {
      name: "MTC Admin",
      email: "admin@musawotraining.ug",
      passwordHash: adminHash,
      role: UserRole.ADMIN,
      status: "ACTIVE",
      emailVerified: new Date(),
      dataConsentAt: new Date(),
    },
  });

  const tutor = await prisma.user.upsert({
    where: { email: "tutor@musawotraining.ug" },
    update: {},
    create: {
      name: "Grace Nakato",
      email: "tutor@musawotraining.ug",
      passwordHash: tutorHash,
      role: UserRole.TUTOR,
      status: "ACTIVE",
      emailVerified: new Date(),
      dataConsentAt: new Date(),
    },
  });

  const student = await prisma.user.upsert({
    where: { email: "student@example.com" },
    update: {},
    create: {
      name: "Sarah Auma",
      email: "student@example.com",
      phone: "+256701234567",
      passwordHash: studentHash,
      role: UserRole.STUDENT,
      status: "ACTIVE",
      emailVerified: new Date(),
      dataConsentAt: new Date(),
    },
  });

  console.log("  ✓ Users (admin, tutor, student)");

  // ─── Courses ────────────────────────────────────────────────────
  const COURSES = [
    {
      slug: "cna",
      title: "Certified Nursing Care Assistant (CNA)",
      shortDescription:
        "Our flagship certification equips learners with practical skills to work as qualified nursing care assistants across Uganda.",
      description: `Our flagship certification provides a comprehensive foundation for nursing care work in homes, hospitals, clinics, and community care settings across Uganda.

You will learn patient-centred care, safety practices, infection prevention, hygiene and personal care support, basic clinical procedures, care for elderly patients, and professional ethics.

Upon completion, you will receive a nationally recognised certificate accredited by Uganda's Ministry of Health and Ministry of Education and Sports.`,
      fullFeeUgx: 850000,
      instalmentCount: 3,
      freePreviewPercent: 12,
      durationWeeks: 12,
      accreditationText:
        "Accredited by Uganda Ministry of Health and Ministry of Education and Sports",
    },
    {
      slug: "basic-nursing-care",
      title: "Basic Nursing Care Assistant",
      shortDescription:
        "An accessible, practical entry point into healthcare work with a strong foundation in patient care.",
      description: `An accessible entry point into healthcare work designed for learners who want to begin serving patients quickly.

You will learn essential patient care skills, safety and hygiene, basic clinical practices, professional communication, supporting healthcare teams, and basic first aid and emergency response.

Graduates receive a nationally recognised certificate and are eligible for placement support through the Musawo network.`,
      fullFeeUgx: 450000,
      instalmentCount: 2,
      freePreviewPercent: 12,
      durationWeeks: 8,
      accreditationText:
        "Accredited by Uganda Ministry of Health and Ministry of Education and Sports",
    },
    {
      slug: "child-care-safety",
      title: "Babysitting, Child Care & Safety Management",
      shortDescription:
        "Child development, daily care routines, first aid, and safety management for professional and family carers.",
      description: `Children need attentive, informed carers who understand child development and can keep them safe. This course is for anyone stepping into a childcare role.

You will learn child development basics, age-appropriate care practices, daily care routines (feeding, hygiene, rest, stimulation), recognising signs of illness or distress, first aid and emergency response for infants and children, and safety management in home and community settings.`,
      fullFeeUgx: 350000,
      instalmentCount: 2,
      freePreviewPercent: 15,
      durationWeeks: 6,
      accreditationText:
        "Accredited by Uganda Ministry of Education and Sports",
    },
  ];

  for (const courseData of COURSES) {
    const course = await prisma.course.upsert({
      where: { slug: courseData.slug },
      update: {},
      create: {
        ...courseData,
        status: "PUBLISHED",
        tutorId: tutor.id,
      },
    });

    // Create blocks and sample lessons
    const blockDefs = getBlocksForCourse(courseData.slug);
    for (const blockDef of blockDefs) {
      const existingBlock = await prisma.block.findFirst({
        where: { courseId: course.id, order: blockDef.order },
      });
      if (existingBlock) continue;

      const block = await prisma.block.create({
        data: {
          courseId: course.id,
          order: blockDef.order,
          title: blockDef.title,
          description: blockDef.description,
        },
      });

      for (const lessonDef of blockDef.lessons) {
        await prisma.lesson.create({
          data: {
            blockId: block.id,
            order: lessonDef.order,
            title: lessonDef.title,
            type: lessonDef.type as "VIDEO" | "NOTES" | "QUIZ",
            isFree: lessonDef.isFree,
          },
        });
      }
    }
  }

  console.log("  ✓ Courses (3) with blocks and lessons");

  // ─── Discount Codes ─────────────────────────────────────────────
  await prisma.discountCode.upsert({
    where: { code: "SCHOLAR2026" },
    update: {},
    create: {
      code: "SCHOLAR2026",
      type: "SCHOLARSHIP",
      value: 100,
      maxUses: 20,
      expiresAt: new Date("2027-12-31"),
      createdBy: admin.id,
    },
  });

  await prisma.discountCode.upsert({
    where: { code: "LAUNCH20" },
    update: {},
    create: {
      code: "LAUNCH20",
      type: "PERCENTAGE",
      value: 20,
      maxUses: 50,
      expiresAt: new Date("2026-12-31"),
      createdBy: admin.id,
    },
  });

  console.log("  ✓ Discount codes (SCHOLAR2026, LAUNCH20)");

  // ─── Sample Resources ────────────────────────────────────────────
  await prisma.resource.upsert({
    where: { id: "seed-resource-1" },
    update: {},
    create: {
      id: "seed-resource-1",
      title: "Uganda Healthcare Worker Reference Guide",
      description:
        "A free reference guide for community health workers in Uganda covering infection prevention, basic procedures, and patient communication.",
      s3Key: "resources/placeholder-guide.pdf",
      category: "Reference",
      isPublic: true,
      uploadedBy: admin.id,
    },
  });

  console.log("  ✓ Resources");

  console.log("\n🎉 Seed complete!");
  console.log("\nLogin credentials:");
  console.log("  Admin:   admin@musawotraining.ug / Admin1234!");
  console.log("  Tutor:   tutor@musawotraining.ug / Tutor1234!");
  console.log("  Student: student@example.com / Student1234!");
}

function getBlocksForCourse(slug: string) {
  if (slug === "cna") {
    return [
      {
        order: 1,
        title: "Foundations of Nursing Care",
        description: "Introduction to nursing care, patient dignity, and healthcare settings in Uganda.",
        lessons: [
          { order: 1, title: "Welcome and course overview", type: "VIDEO", isFree: true },
          { order: 2, title: "What is nursing care?", type: "NOTES", isFree: true },
          { order: 3, title: "The healthcare system in Uganda", type: "VIDEO", isFree: false },
          { order: 4, title: "Block 1 quiz", type: "QUIZ", isFree: false },
        ],
      },
      {
        order: 2,
        title: "Infection Prevention and Control",
        description: "Hand hygiene, PPE, waste disposal, and preventing healthcare-associated infections.",
        lessons: [
          { order: 1, title: "Standard precautions", type: "VIDEO", isFree: false },
          { order: 2, title: "Hand hygiene technique", type: "VIDEO", isFree: false },
          { order: 3, title: "PPE and waste management notes", type: "NOTES", isFree: false },
          { order: 4, title: "Infection control quiz", type: "QUIZ", isFree: false },
        ],
      },
      {
        order: 3,
        title: "Personal Care and Hygiene",
        description: "Bathing, oral care, dressing, and maintaining patient dignity.",
        lessons: [
          { order: 1, title: "Assisting with personal care", type: "VIDEO", isFree: false },
          { order: 2, title: "Oral hygiene and grooming", type: "NOTES", isFree: false },
          { order: 3, title: "Personal care quiz", type: "QUIZ", isFree: false },
        ],
      },
    ];
  }

  if (slug === "basic-nursing-care") {
    return [
      {
        order: 1,
        title: "Introduction to Patient Care",
        description: "Core concepts of basic nursing care and professional conduct.",
        lessons: [
          { order: 1, title: "Welcome and introduction", type: "VIDEO", isFree: true },
          { order: 2, title: "Patient-centred care principles", type: "NOTES", isFree: true },
          { order: 3, title: "Communication in care settings", type: "VIDEO", isFree: false },
        ],
      },
      {
        order: 2,
        title: "Safety and Basic Procedures",
        description: "Safe patient handling, vital signs, and basic clinical tasks.",
        lessons: [
          { order: 1, title: "Safe patient handling", type: "VIDEO", isFree: false },
          { order: 2, title: "Taking basic vital signs", type: "NOTES", isFree: false },
          { order: 3, title: "Safety quiz", type: "QUIZ", isFree: false },
        ],
      },
    ];
  }

  // child-care-safety
  return [
    {
      order: 1,
      title: "Child Development Basics",
      description: "Understanding child development stages and age-appropriate care.",
      lessons: [
        { order: 1, title: "Welcome and course overview", type: "VIDEO", isFree: true },
        { order: 2, title: "Child development stages", type: "NOTES", isFree: true },
        { order: 3, title: "Age-appropriate activities", type: "VIDEO", isFree: false },
      ],
    },
    {
      order: 2,
      title: "Daily Care Routines and First Aid",
      description: "Feeding, hygiene, rest routines, and emergency first aid for children.",
      lessons: [
        { order: 1, title: "Daily care routines", type: "VIDEO", isFree: false },
        { order: 2, title: "First aid for children", type: "NOTES", isFree: false },
        { order: 3, title: "Emergency response quiz", type: "QUIZ", isFree: false },
      ],
    },
  ];
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
