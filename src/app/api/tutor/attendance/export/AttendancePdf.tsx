import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page:    { padding: 28, fontSize: 9, fontFamily: "Helvetica" },
  title:   { fontSize: 16, marginBottom: 4 },
  caption: { color: "#555", marginBottom: 4, fontSize: 9 },
  unit:    { color: "#333", fontWeight: "bold", marginBottom: 14, fontSize: 9 },
  header:  { flexDirection: "row", backgroundColor: "#e8f2ef", padding: 6, fontWeight: "bold" },
  row:     { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#ddd", padding: 6 },
  name:    { width: "25%" },
  num:     { width: "16%" },
  mark:    { width: "11%" },
  mins:    { width: "10%" },
  pct:     { width: "10%" },
  comment: { width: "17%" },
});

type RowData = {
  name: string;
  studentNumber: string | null;
  startMark: string | null;
  endMark: string | null;
  startComment: string | null;
  endComment: string | null;
  joinedAt: string | null;
  leftAt: string | null;
  minutes: number;
  percentage: number;
};

export default function AttendancePdf({
  title,
  course,
  courseUnit,
  rows,
}: {
  title: string;
  course: string;
  courseUnit?: string;
  rows: RowData[];
}) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>Class attendance</Text>
        <Text style={styles.caption}>{course} · {title}</Text>
        {courseUnit && <Text style={styles.unit}>Course unit: {courseUnit}</Text>}

        <View style={styles.header}>
          <Text style={styles.name}>Student</Text>
          <Text style={styles.num}>Student no.</Text>
          <Text style={styles.mark}>Start</Text>
          <Text style={styles.comment}>Start comment</Text>
          <Text style={styles.mark}>End</Text>
          <Text style={styles.mins}>Minutes</Text>
          <Text style={styles.pct}>Attendance</Text>
        </View>

        {rows.map((row, index) => (
          <View key={`${row.studentNumber ?? ""}-${index}`} style={styles.row}>
            <Text style={styles.name}>{row.name}</Text>
            <Text style={styles.num}>{row.studentNumber ?? "-"}</Text>
            <Text style={styles.mark}>{row.startMark ?? "-"}</Text>
            <Text style={styles.comment}>{row.startComment ?? ""}</Text>
            <Text style={styles.mark}>{row.endMark ?? "-"}</Text>
            <Text style={styles.mins}>{row.minutes}</Text>
            <Text style={styles.pct}>{row.percentage}%</Text>
          </View>
        ))}
      </Page>
    </Document>
  );
}
