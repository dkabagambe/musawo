import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔄 Updating course fees and names from official PDF...\n');

  const updates = [
    {
      slug: 'medical-home-caregiver',
      title: 'Certificate in Medical Home Care',
      fullFeeUgx: 1800000,
      internationalFeeUgx: 638,
    },
    {
      slug: 'basic-home-caregiver',
      title: 'Certificate in Basic Home Care',
      fullFeeUgx: 1800000,
      internationalFeeUgx: 638,
    },
    {
      slug: 'babysitting-childcare-safety',
      title: 'Basic Certificate in Babysitting, childcare, and Safety management',
      fullFeeUgx: 500000,
      internationalFeeUgx: 166,
    },
    {
      slug: 'mental-health-support-advocacy',
      title: 'Certificate in Mental Health Support and Advocacy',
      fullFeeUgx: 1800000,
      internationalFeeUgx: 638,
    },
    {
      slug: 'care-older-persons-disability',
      title: 'Basic Certificate in care of Older persons and persons with Disability (Geriatric)',
      fullFeeUgx: 1800000,
      internationalFeeUgx: 638,
    },
    {
      slug: 'basic-life-support-first-aid',
      title: 'Certificate in Basic Life Support',
      fullFeeUgx: 350000,
      internationalFeeUgx: 138,
    },
    {
      slug: 'advanced-life-support',
      title: 'Certificate in Advanced Life Support',
      fullFeeUgx: 600000,
      internationalFeeUgx: 138,
    },
    {
      slug: 'advanced-first-aid',
      title: 'Certificate in First Aid',
      fullFeeUgx: 350000,
      internationalFeeUgx: 138,
      feeContactOnly: false,
    },
  ];

  for (const update of updates) {
    const course = await prisma.course.findUnique({
      where: { slug: update.slug },
    });

    if (!course) {
      console.log(`⚠️  Course not found: ${update.slug}`);
      continue;
    }

    await prisma.course.update({
      where: { slug: update.slug },
      data: {
        title: update.title,
        fullFeeUgx: update.fullFeeUgx,
        internationalFeeUgx: update.internationalFeeUgx,
        ...(update.feeContactOnly !== undefined && { feeContactOnly: update.feeContactOnly }),
      },
    });

    console.log(`✅ Updated: ${update.title}`);
    console.log(`   UGX: ${update.fullFeeUgx.toLocaleString()}, USD: ${update.internationalFeeUgx}`);
  }

  console.log('\n✨ All courses updated successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
