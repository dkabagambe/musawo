import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  // Find the Medical Home Care course
  const course = await prisma.course.findFirst({
    where: {
      slug: 'medical-home-caregiver',
    },
  });

  if (!course) {
    console.log('Medical Home Care course not found');
    return;
  }

  console.log('Found course:', course.title);
  console.log('Current fullFeeUgx:', course.fullFeeUgx);
  console.log('Current internationalFeeUgx:', course.internationalFeeUgx);

  // Calculate international fee in UGX (at rate of 3600 UGX per USD)
  // USD 639 (based on UGX 2,300,000) = 2,300,400 UGX at 3600 rate
  const internationalFeeUgx = 639 * 3600;

  // Update the course
  const updated = await prisma.course.update({
    where: { id: course.id },
    data: {
      internationalFeeUgx: internationalFeeUgx,
    },
  });

  console.log('\n✅ Course updated!');
  console.log('New internationalFeeUgx:', updated.internationalFeeUgx);
  console.log('USD equivalent (at 3600 rate):', Math.round(updated.internationalFeeUgx / 3600));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
