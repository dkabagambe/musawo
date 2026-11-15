import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: {
    backgroundColor: "#ffffff",
    padding: 48,
    fontFamily: "Helvetica",
    fontSize: 10,
    color: "#111827",
  },
  header: {
    marginBottom: 24,
    borderBottomWidth: 2,
    borderBottomColor: "#111A3F",
    paddingBottom: 12,
  },
  schoolName: {
    fontSize: 16,
    fontFamily: "Helvetica-Bold",
    color: "#111A3F",
  },
  schoolSub: {
    fontSize: 9,
    color: "#6B7280",
    marginTop: 2,
  },
  title: {
    fontSize: 14,
    fontFamily: "Helvetica-Bold",
    color: "#111A3F",
    marginBottom: 4,
    marginTop: 20,
  },
  fieldRow: {
    flexDirection: "row",
    marginBottom: 4,
  },
  label: {
    width: 120,
    color: "#6B7280",
  },
  value: {
    flex: 1,
    fontFamily: "Helvetica-Bold",
  },
  section: {
    marginTop: 20,
    marginBottom: 8,
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: "#111A3F",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    paddingBottom: 4,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#F3F4F6",
    padding: 6,
    fontFamily: "Helvetica-Bold",
    fontSize: 9,
    color: "#374151",
  },
  tableRow: {
    flexDirection: "row",
    padding: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
    fontSize: 9,
  },
  colItem: { flex: 3 },
  colCourse: { flex: 2 },
  colScore: { width: 60, textAlign: "right" },
  colPct: { width: 50, textAlign: "right" },
  colResult: { width: 50, textAlign: "right" },
  colDate: { width: 65, textAlign: "right" },
  footer: {
    position: "absolute",
    bottom: 32,
    left: 48,
    right: 48,
    fontSize: 8,
    color: "#9CA3AF",
    textAlign: "center",
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    paddingTop: 8,
  },
  passChip: {
    color: "#15803d",
    fontFamily: "Helvetica-Bold",
  },
  failChip: {
    color: "#dc2626",
    fontFamily: "Helvetica-Bold",
  },
  watermark: {
    position: "absolute",
    top: 290,
    left: 80,
    fontSize: 60,
    color: "#E5E7EB",
    fontFamily: "Helvetica-Bold",
    opacity: 0.15,
    transform: "rotate(-40deg)",
  },
});

export interface ResultEntry {
  itemTitle: string;
  courseTitle: string;
  score: number | null;
  maxScore: number | null;
  percentage: number | null;
  passed: boolean | null;
  gradedAt: Date | null;
  comments: string | null;
}

interface ResultsStatementPdfProps {
  studentName: string;
  studentNumber: string | null;
  programme: string;
  printedAt: Date;
  results: ResultEntry[];
  issuerName: string;
}

export default function ResultsStatementPdf({
  studentName,
  studentNumber,
  programme,
  printedAt,
  results,
  issuerName,
}: ResultsStatementPdfProps) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Watermark */}
        <Text style={styles.watermark}>OFFICIAL</Text>

        {/* Institution header */}
        <View style={styles.header}>
          <Text style={styles.schoolName}>{issuerName}</Text>
          <Text style={styles.schoolSub}>Kampala, Uganda</Text>
        </View>

        <Text style={styles.title}>Academic Results Statement</Text>

        <View style={{ marginBottom: 16 }}>
          <View style={styles.fieldRow}>
            <Text style={styles.label}>Student name</Text>
            <Text style={styles.value}>{studentName}</Text>
          </View>
          {studentNumber && (
            <View style={styles.fieldRow}>
              <Text style={styles.label}>Registration No.</Text>
              <Text style={styles.value}>{studentNumber}</Text>
            </View>
          )}
          <View style={styles.fieldRow}>
            <Text style={styles.label}>Programme</Text>
            <Text style={styles.value}>{programme}</Text>
          </View>
          <View style={styles.fieldRow}>
            <Text style={styles.label}>Date printed</Text>
            <Text style={styles.value}>
              {printedAt.toLocaleDateString("en-UG", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </Text>
          </View>
        </View>

        <Text style={styles.section}>Published Results</Text>

        {/* Table header */}
        <View style={styles.tableHeader}>
          <Text style={styles.colItem}>Assessment</Text>
          <Text style={styles.colCourse}>Course</Text>
          <Text style={styles.colScore}>Score</Text>
          <Text style={styles.colPct}>Pct</Text>
          <Text style={styles.colResult}>Result</Text>
          <Text style={styles.colDate}>Date</Text>
        </View>

        {results.map((r, i) => {
          const pct =
            r.percentage != null
              ? Math.round(r.percentage)
              : r.score != null && r.maxScore
              ? Math.round((r.score / r.maxScore) * 100)
              : null;
          return (
            <View key={i}>
              <View
                style={[styles.tableRow, i % 2 === 1 ? { backgroundColor: "#FAFAFA" } : {}]}
              >
                <Text style={styles.colItem}>{r.itemTitle}</Text>
                <Text style={styles.colCourse}>{r.courseTitle}</Text>
                <Text style={styles.colScore}>
                  {r.score != null && r.maxScore ? `${r.score}/${r.maxScore}` : "-"}
                </Text>
                <Text style={styles.colPct}>{pct != null ? `${pct}%` : "-"}</Text>
                <Text
                  style={[
                    styles.colResult,
                    r.passed === true ? styles.passChip : r.passed === false ? styles.failChip : {},
                  ]}
                >
                  {r.passed === true ? "PASS" : r.passed === false ? "FAIL" : "-"}
                </Text>
                <Text style={styles.colDate}>
                  {r.gradedAt
                    ? new Date(r.gradedAt).toLocaleDateString("en-UG", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })
                    : "-"}
                </Text>
              </View>
              {r.comments && (
                <View
                  style={{
                    padding: 4,
                    paddingLeft: 6,
                    borderBottomWidth: 1,
                    borderBottomColor: "#F3F4F6",
                    fontSize: 8,
                    color: "#6B7280",
                    fontStyle: "italic",
                  }}
                >
                  <Text>Comments: {r.comments}</Text>
                </View>
              )}
            </View>
          );
        })}

        {results.length === 0 && (
          <View style={{ padding: 12 }}>
            <Text style={{ color: "#9CA3AF" }}>No published results on record.</Text>
          </View>
        )}

        <Text style={styles.footer}>
          Official results statement for {studentName} - printed on{" "}
          {printedAt.toLocaleDateString("en-UG")} - Issued by {issuerName}
        </Text>
      </Page>
    </Document>
  );
}
