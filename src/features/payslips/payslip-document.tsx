import {
  Document,
  Page,
  StyleSheet,
  Text,
  View,
  renderToBuffer,
} from "@react-pdf/renderer";

/**
 * Professional PDF payslip rendered with @react-pdf/renderer.
 * This module is server-only (heavy dependency) and framework-agnostic:
 * it takes a plain data object and returns a Buffer.
 */

export interface PayslipData {
  company: {
    name: string;
    address: string;
    taxId: string;
  };
  employee: {
    fullName: string;
    employeeNumber: string;
    position: string;
    department: string;
    email: string;
  };
  period: {
    label: string;
    status: string;
  };
  figures: {
    regularHours: number;
    overtimeHours: number;
    baseSalary: string;
    overtimePay: string;
    grossSalary: string;
    employeeContrib: string;
    taxableIncome: string;
    incomeTax: string;
    netSalary: string;
    employerContrib: string;
  };
  generatedAt: string;
}

const NAVY = "#1e2f55";
const MUTED = "#64748b";
const BORDER = "#e2e8f0";
const LIGHT = "#f8fafc";

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 9,
    fontFamily: "Helvetica",
    color: "#0f172a",
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  companyName: { fontSize: 16, fontFamily: "Helvetica-Bold", color: NAVY },
  companyMeta: { color: MUTED, marginTop: 2 },
  payslipTitle: {
    fontSize: 20,
    fontFamily: "Helvetica-Bold",
    color: NAVY,
    textAlign: "right",
  },
  periodText: { textAlign: "right", color: MUTED, marginTop: 2 },
  infoGrid: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 20,
  },
  infoBox: {
    flex: 1,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 4,
    padding: 10,
  },
  infoTitle: {
    fontFamily: "Helvetica-Bold",
    fontSize: 8,
    color: MUTED,
    textTransform: "uppercase",
    marginBottom: 6,
  },
  infoLine: { flexDirection: "row", marginBottom: 3 },
  infoLabel: { width: 90, color: MUTED },
  infoValue: { flex: 1, fontFamily: "Helvetica-Bold" },
  table: {
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 4,
    marginBottom: 14,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: NAVY,
    color: "#ffffff",
    paddingVertical: 6,
    paddingHorizontal: 10,
    fontFamily: "Helvetica-Bold",
    fontSize: 8,
    textTransform: "uppercase",
  },
  row: {
    flexDirection: "row",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderTopWidth: 1,
    borderTopColor: BORDER,
  },
  rowAlt: { backgroundColor: LIGHT },
  colDesc: { flex: 3 },
  colQty: { flex: 1, textAlign: "right", color: MUTED },
  colAmount: { flex: 1.4, textAlign: "right" },
  totalRow: {
    flexDirection: "row",
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderTopWidth: 1,
    borderTopColor: NAVY,
    fontFamily: "Helvetica-Bold",
  },
  netBox: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: NAVY,
    borderRadius: 4,
    padding: 14,
    marginTop: 4,
    marginBottom: 20,
  },
  netLabel: {
    color: "#c7d2e5",
    fontSize: 10,
    textTransform: "uppercase",
    fontFamily: "Helvetica-Bold",
  },
  netValue: { color: "#ffffff", fontSize: 18, fontFamily: "Helvetica-Bold" },
  employerNote: {
    color: MUTED,
    marginBottom: 24,
  },
  footer: {
    position: "absolute",
    bottom: 30,
    left: 40,
    right: 40,
    borderTopWidth: 1,
    borderTopColor: BORDER,
    paddingTop: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    color: MUTED,
    fontSize: 7.5,
  },
});

function PayslipDocument({ data }: { data: PayslipData }) {
  const { company, employee, period, figures } = data;

  return (
    <Document
      title={`Payslip ${period.label} — ${employee.fullName}`}
      author={company.name}
    >
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.companyName}>{company.name}</Text>
            <Text style={styles.companyMeta}>{company.address}</Text>
            <Text style={styles.companyMeta}>Tax ID: {company.taxId}</Text>
          </View>
          <View>
            <Text style={styles.payslipTitle}>PAYSLIP</Text>
            <Text style={styles.periodText}>Pay period: {period.label}</Text>
            <Text style={styles.periodText}>Status: {period.status}</Text>
          </View>
        </View>

        {/* Employee / payment info */}
        <View style={styles.infoGrid}>
          <View style={styles.infoBox}>
            <Text style={styles.infoTitle}>Employee</Text>
            <View style={styles.infoLine}>
              <Text style={styles.infoLabel}>Name</Text>
              <Text style={styles.infoValue}>{employee.fullName}</Text>
            </View>
            <View style={styles.infoLine}>
              <Text style={styles.infoLabel}>Employee ID</Text>
              <Text style={styles.infoValue}>{employee.employeeNumber}</Text>
            </View>
            <View style={styles.infoLine}>
              <Text style={styles.infoLabel}>Position</Text>
              <Text style={styles.infoValue}>{employee.position}</Text>
            </View>
            <View style={styles.infoLine}>
              <Text style={styles.infoLabel}>Department</Text>
              <Text style={styles.infoValue}>{employee.department}</Text>
            </View>
            <View style={styles.infoLine}>
              <Text style={styles.infoLabel}>Email</Text>
              <Text style={styles.infoValue}>{employee.email}</Text>
            </View>
          </View>
          <View style={styles.infoBox}>
            <Text style={styles.infoTitle}>Worked time</Text>
            <View style={styles.infoLine}>
              <Text style={styles.infoLabel}>Regular hours</Text>
              <Text style={styles.infoValue}>{figures.regularHours} h</Text>
            </View>
            <View style={styles.infoLine}>
              <Text style={styles.infoLabel}>Overtime hours</Text>
              <Text style={styles.infoValue}>{figures.overtimeHours} h</Text>
            </View>
          </View>
        </View>

        {/* Earnings */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={styles.colDesc}>Earnings</Text>
            <Text style={styles.colQty}>Qty</Text>
            <Text style={styles.colAmount}>Amount</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.colDesc}>Base salary</Text>
            <Text style={styles.colQty}>{figures.regularHours} h</Text>
            <Text style={styles.colAmount}>{figures.baseSalary}</Text>
          </View>
          <View style={[styles.row, styles.rowAlt]}>
            <Text style={styles.colDesc}>Overtime pay (1.5×)</Text>
            <Text style={styles.colQty}>{figures.overtimeHours} h</Text>
            <Text style={styles.colAmount}>{figures.overtimePay}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.colDesc}>Gross salary</Text>
            <Text style={styles.colQty} />
            <Text style={styles.colAmount}>{figures.grossSalary}</Text>
          </View>
        </View>

        {/* Deductions */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={styles.colDesc}>Deductions</Text>
            <Text style={styles.colQty} />
            <Text style={styles.colAmount}>Amount</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.colDesc}>
              Social security contributions (employee)
            </Text>
            <Text style={styles.colQty} />
            <Text style={styles.colAmount}>−{figures.employeeContrib}</Text>
          </View>
          <View style={[styles.row, styles.rowAlt]}>
            <Text style={styles.colDesc}>
              Income tax (taxable base {figures.taxableIncome})
            </Text>
            <Text style={styles.colQty} />
            <Text style={styles.colAmount}>−{figures.incomeTax}</Text>
          </View>
        </View>

        {/* Net pay */}
        <View style={styles.netBox}>
          <Text style={styles.netLabel}>Net pay</Text>
          <Text style={styles.netValue}>{figures.netSalary}</Text>
        </View>

        <Text style={styles.employerNote}>
          Employer social contributions (not deducted from pay):{" "}
          {figures.employerContrib}. Total employer cost equals gross salary
          plus employer contributions.
        </Text>

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text>
            Generated {data.generatedAt} · {company.name} · Confidential
          </Text>
          <Text
            render={({ pageNumber, totalPages }) =>
              `Page ${pageNumber} of ${totalPages}`
            }
          />
        </View>
      </Page>
    </Document>
  );
}

/** Renders the payslip to a PDF buffer (used by the API route). */
export function renderPayslipPdf(data: PayslipData): Promise<Buffer> {
  return renderToBuffer(<PayslipDocument data={data} />);
}
