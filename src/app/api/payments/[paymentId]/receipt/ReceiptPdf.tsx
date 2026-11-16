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
    width: 130,
    color: "#6B7280",
  },
  value: {
    flex: 1,
    fontFamily: "Helvetica-Bold",
  },
  amountBox: {
    marginTop: 20,
    padding: 16,
    backgroundColor: "#F3F4F6",
    borderRadius: 8,
    alignItems: "center",
  },
  amountLabel: {
    fontSize: 10,
    color: "#6B7280",
    marginBottom: 4,
  },
  amountValue: {
    fontSize: 28,
    fontFamily: "Helvetica-Bold",
    color: "#111A3F",
  },
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

interface ReceiptPdfProps {
  studentName: string;
  studentNumber: string | null;
  courseTitle: string;
  amount: number;
  method: string;
  receiptNumber: string;
  paidAt: Date;
  gatewayRef: string | null;
  issuerName: string;
}

export default function ReceiptPdf({
  studentName,
  studentNumber,
  courseTitle,
  amount,
  method,
  receiptNumber,
  paidAt,
  gatewayRef,
  issuerName,
}: ReceiptPdfProps) {
  const methodLabel: Record<string, string> = {
    MTN_MOMO: "MTN MoMo",
    AIRTEL_MONEY: "Airtel Money",
    BANK_TRANSFER: "Bank Transfer",
    CARD: "Card",
    MANUAL: "Manual",
  };

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Watermark */}
        <Text style={styles.watermark}>PAID</Text>

        {/* Institution header */}
        <View style={styles.header}>
          <Text style={styles.schoolName}>{issuerName}</Text>
          <Text style={styles.schoolSub}>Kampala, Uganda</Text>
        </View>

        <Text style={styles.title}>Payment Receipt</Text>

        <View style={{ marginBottom: 16 }}>
          <View style={styles.fieldRow}>
            <Text style={styles.label}>Receipt No.</Text>
            <Text style={styles.value}>{receiptNumber}</Text>
          </View>
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
            <Text style={styles.label}>Course</Text>
            <Text style={styles.value}>{courseTitle}</Text>
          </View>
          <View style={styles.fieldRow}>
            <Text style={styles.label}>Date paid</Text>
            <Text style={styles.value}>
              {paidAt.toLocaleDateString("en-UG", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </Text>
          </View>
          <View style={styles.fieldRow}>
            <Text style={styles.label}>Payment method</Text>
            <Text style={styles.value}>{methodLabel[method] ?? method}</Text>
          </View>
          {gatewayRef && (
            <View style={styles.fieldRow}>
              <Text style={styles.label}>Reference</Text>
              <Text style={styles.value}>{gatewayRef}</Text>
            </View>
          )}
        </View>

        {/* Amount box */}
        <View style={styles.amountBox}>
          <Text style={styles.amountLabel}>Amount received</Text>
          <Text style={styles.amountValue}>UGX {amount.toLocaleString()}</Text>
        </View>

        <Text style={styles.footer}>
          Official receipt for {studentName} - issued by {issuerName} on{" "}
          {paidAt.toLocaleDateString("en-UG")}
        </Text>
      </Page>
    </Document>
  );
}
