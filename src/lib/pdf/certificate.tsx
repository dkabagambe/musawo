// PDF generation for certificates and receipts
// Uses @react-pdf/renderer

import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: {
    backgroundColor: "#ffffff",
    padding: 40,
    fontFamily: "Helvetica",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 32,
    borderBottomWidth: 2,
    borderBottomColor: "#111A3F",
    paddingBottom: 16,
  },
  title: {
    fontSize: 24,
    color: "#111A3F",
    fontFamily: "Helvetica-Bold",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 12,
    color: "#6B7280",
    marginBottom: 24,
  },
  label: {
    fontSize: 10,
    color: "#9CA3AF",
    marginBottom: 2,
  },
  value: {
    fontSize: 14,
    color: "#111827",
    fontFamily: "Helvetica-Bold",
    marginBottom: 12,
  },
  accreditation: {
    fontSize: 9,
    color: "#6B7280",
    marginTop: 24,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    paddingTop: 12,
  },
  uniqueId: {
    fontSize: 10,
    color: "#6B7280",
    fontFamily: "Helvetica",
    marginTop: 4,
  },
  footer: {
    position: "absolute",
    bottom: 32,
    left: 40,
    right: 40,
    fontSize: 8,
    color: "#9CA3AF",
    textAlign: "center",
  },
});

interface CertificatePDFProps {
  studentName: string;
  courseTitle: string;
  issuedAt: Date;
  uniqueId: string;
  accreditationText?: string;
  issuerName?: string;
}

export function CertificatePDF({
  studentName,
  courseTitle,
  issuedAt,
  uniqueId,
  accreditationText,
  issuerName = "Musawo Training Center",
}: CertificatePDFProps) {
  return (
    <Document>
      <Page size="A4" orientation="landscape" style={styles.page}>
        <View style={styles.header}>
          <View>
            <Text style={{ fontSize: 16, color: "#111A3F", fontFamily: "Helvetica-Bold" }}>
              {issuerName}
            </Text>
            <Text style={{ fontSize: 10, color: "#6B7280" }}>
              Kampala, Uganda
            </Text>
          </View>
        </View>

        <Text style={styles.title}>Certificate of Completion</Text>
        <Text style={styles.subtitle}>This is to certify that</Text>

        <Text style={{ fontSize: 28, color: "#FF6900", fontFamily: "Helvetica-Bold", marginBottom: 8 }}>
          {studentName}
        </Text>

        <Text style={styles.subtitle}>has successfully completed</Text>

        <Text style={{ fontSize: 18, color: "#111A3F", fontFamily: "Helvetica-Bold", marginBottom: 24 }}>
          {courseTitle}
        </Text>

        <Text style={styles.label}>Date of issue</Text>
        <Text style={styles.value}>
          {issuedAt.toLocaleDateString("en-UG", { day: "numeric", month: "long", year: "numeric" })}
        </Text>

        <Text style={styles.uniqueId}>Certificate ID: {uniqueId}</Text>

        {accreditationText && (
          <Text style={styles.accreditation}>{accreditationText}</Text>
        )}

        <Text style={styles.footer}>
          Verify this certificate at: www.musawo.ug/verify/{uniqueId}
        </Text>
      </Page>
    </Document>
  );
}
