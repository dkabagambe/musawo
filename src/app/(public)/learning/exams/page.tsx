import PageHero from "@/components/public/PageHero";
import CTABand from "@/components/public/CTABand";
import ContactBand from "@/components/public/ContactBand";
import SideNav from "@/components/public/SideNav";
import AnimateIn from "@/components/public/AnimateIn";
import StaggerGrid from "@/components/public/StaggerGrid";
import { getContactInfo } from "@/lib/contact";
import { Award, FileText, QrCode, Clock, CheckCircle, AlertCircle } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Exams and Certificates",
  description: "How assessments work and what your Musawo Training Center digital certificate looks like.",
};

const LEARNING_NAV = [
  { label: "How you will learn",     href: "/learning/how-you-learn" },
  { label: "Live classes",           href: "/learning/live-classes" },
  { label: "Exams and certificates", href: "/learning/exams" },
  { label: "Free resources",         href: "/resources" },
];

const ASSESSMENTS = [
  {
    icon: FileText,
    title: "Weekly quizzes",
    weight: "Not graded",
    body: "Short 5 to 10 question quizzes after each lesson module. These help you check your understanding and are not counted towards your final grade.",
  },
  {
    icon: CheckCircle,
    title: "Written assignments",
    weight: "30% of final grade",
    body: "One written assignment per course block (3 to 4 blocks per course). Submitted online and marked by your tutor within 5 working days.",
  },
  {
    icon: Clock,
    title: "Mid-course assessment",
    weight: "20% of final grade",
    body: "A timed online test at the halfway point of the course covering all content from the first half. 90 minutes, open book.",
  },
  {
    icon: Award,
    title: "Final examination",
    weight: "50% of final grade",
    body: "A proctored online examination at the end of the course. 2 hours, closed book. A minimum score of 60% is required to pass.",
  },
];

export default async function ExamsPage() {
  const contact = await getContactInfo();

  return (
    <div>
      <PageHero
        image="/assets/healthcare-services.webp"
        imageAlt="Musawo Training Center student completing their certificate"
        title="Exams and Certificates"
        description="Clear assessment structure and a nationally recognised digital certificate you can share anywhere."
        breadcrumbs={[
          { label: "Learning", href: "/learning/how-you-learn" },
          { label: "Exams and certificates" },
        ]}
        boxSide="left"
        objectPosition="right center"
      />

      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-12 sm:py-16 lg:py-20">
        <div className="flex gap-12 items-start">
          <SideNav title="Learning" items={LEARNING_NAV} />

          <div className="flex-1 min-w-0">

            {/* Assessment types */}
            <AnimateIn className="mb-10">
              <p className="section-eyebrow">Assessments</p>
              <h2
                className="mt-2 mb-4 font-bold text-balance"
                style={{ fontSize: "clamp(1.5rem, 2.8vw, 2.25rem)" }}
              >
                How you are assessed
              </h2>
              <p className="text-gray-500 text-base leading-relaxed max-w-xl">
                Our assessment model spreads the workload across the course so you are not relying on one high-stakes exam.
              </p>
            </AnimateIn>

            <StaggerGrid className="grid sm:grid-cols-2 gap-5 mb-14">
              {ASSESSMENTS.map(({ icon: Icon, title, weight, body }) => (
                <div key={title} className="bg-white rounded-2xl border border-border p-6">
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Icon className="w-4 h-4 text-primary" aria-hidden="true" />
                    </div>
                    <span className="text-xs font-bold text-accent bg-accent/10 px-2.5 py-1 rounded-full">
                      {weight}
                    </span>
                  </div>
                  <h3 className="font-bold text-primary text-sm mb-2">{title}</h3>
                  <p className="text-xs text-gray-500 leading-relaxed">{body}</p>
                </div>
              ))}
            </StaggerGrid>

            {/* Grading */}
            <AnimateIn className="mb-12">
              <h2
                className="font-bold text-primary mb-5"
                style={{ fontSize: "clamp(1.25rem, 2vw, 1.625rem)" }}
              >
                Grading scale
              </h2>
              <div className="bg-white rounded-2xl border border-border overflow-hidden">
                <table className="table w-full text-sm">
                  <thead>
                    <tr>
                      <th>Score</th>
                      <th>Grade</th>
                      <th>Result</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { score: "80% and above", grade: "Distinction",    result: "Pass - certificate issued" },
                      { score: "65% to 79%",    grade: "Credit",         result: "Pass - certificate issued" },
                      { score: "60% to 64%",    grade: "Pass",           result: "Pass - certificate issued" },
                      { score: "50% to 59%",    grade: "Supplementary",  result: "One resit attempt allowed" },
                      { score: "Below 50%",     grade: "Fail",           result: "Must retake the course" },
                    ].map(({ score, grade, result }) => (
                      <tr key={score}>
                        <td className="font-medium text-primary">{score}</td>
                        <td>{grade}</td>
                        <td className={result.startsWith("Pass") ? "text-green-700 font-medium" : "text-gray-500"}>
                          {result}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </AnimateIn>

            {/* Certificate section */}
            <AnimateIn>
              <h2
                className="font-bold text-primary mb-5"
                style={{ fontSize: "clamp(1.25rem, 2vw, 1.625rem)" }}
              >
                Your digital certificate
              </h2>
              <div className="grid sm:grid-cols-2 gap-5">
                <div className="bg-white rounded-2xl border border-border p-6">
                  <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center mb-4">
                    <Award className="w-4 h-4 text-primary" aria-hidden="true" />
                  </div>
                  <h3 className="font-bold text-primary text-sm mb-2">Issued within 48 hours</h3>
                  <p className="text-xs text-gray-500 leading-relaxed">
                    Once you pass your final examination, your certificate is generated automatically and available to download from your student portal within 48 hours.
                  </p>
                </div>
                <div className="bg-white rounded-2xl border border-border p-6">
                  <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center mb-4">
                    <QrCode className="w-4 h-4 text-primary" aria-hidden="true" />
                  </div>
                  <h3 className="font-bold text-primary text-sm mb-2">QR verification</h3>
                  <p className="text-xs text-gray-500 leading-relaxed">
                    Every certificate has a unique QR code. Employers can scan it to verify authenticity in seconds at verify.musawotraining.ug.
                  </p>
                </div>
                <div className="bg-white rounded-2xl border border-border p-6">
                  <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center mb-4">
                    <FileText className="w-4 h-4 text-primary" aria-hidden="true" />
                  </div>
                  <h3 className="font-bold text-primary text-sm mb-2">PDF format</h3>
                  <p className="text-xs text-gray-500 leading-relaxed">
                    Download a high-quality PDF you can print or share digitally. Your certificate is stored permanently in your account.
                  </p>
                </div>
                <div className="bg-white rounded-2xl border border-border p-6">
                  <div className="w-10 h-10 bg-success/10 rounded-xl flex items-center justify-center mb-4">
                    <CheckCircle className="w-4 h-4 text-success" aria-hidden="true" />
                  </div>
                  <h3 className="font-bold text-primary text-sm mb-2">Ministry accredited</h3>
                  <p className="text-xs text-gray-500 leading-relaxed">
                    Our certificates are recognised by Uganda's Ministry of Health and Ministry of Education and Sports.
                  </p>
                </div>
              </div>
            </AnimateIn>

            {/* Resit policy */}
            <AnimateIn className="mt-10">
              <div className="bg-[#F1F7F5] rounded-2xl border border-border p-6">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-primary/60 flex-shrink-0 mt-0.5" aria-hidden="true" />
                  <div>
                    <h3 className="font-bold text-primary mb-2">Resit policy</h3>
                    <p className="text-sm text-gray-600 leading-relaxed">
                      If you score between 50% and 59% on the final examination, you are entitled to one resit attempt at no extra charge within the same intake period. If you score below 50%, you must re-enrol in the next intake. Contact us at info@musawo.ug to discuss your options.
                    </p>
                  </div>
                </div>
              </div>
            </AnimateIn>

          </div>
        </div>
      </div>

      <CTABand
        heading="Work towards your certificate."
        subheading="Clear assessments, recognised qualification, employment support."
        whatsappUrl={contact.whatsappUrl}
      />
      <ContactBand whatsappUrl={contact.whatsappUrl} />
    </div>
  );
}
