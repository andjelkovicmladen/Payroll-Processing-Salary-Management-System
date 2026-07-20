import { NotFoundError } from "@/lib/errors";
import { env } from "@/lib/env";
import { formatCurrency, formatDate } from "@/lib/format";
import { payrollRepository } from "@/features/payroll/repository";
import { periodLabel } from "@/features/payroll/dto";
import { recordAudit } from "@/features/audit/audit.service";
import { renderPayslipPdf, type PayslipData } from "./payslip-document";

/**
 * Payslip service: loads a payroll record, shapes it into presentation data,
 * and renders the PDF. Formatting (currency strings) happens here so the PDF
 * layer stays purely visual.
 */
export const payslipService = {
  async generateForRecord(
    recordId: string,
    actorId: string,
  ): Promise<{ buffer: Buffer; filename: string }> {
    const record = await payrollRepository.findRecordById(recordId);
    if (!record) throw new NotFoundError("Payroll record", recordId);

    const money = (cents: number) => formatCurrency(cents / 100);

    const data: PayslipData = {
      company: {
        name: env.COMPANY_NAME,
        address: env.COMPANY_ADDRESS,
        taxId: env.COMPANY_TAX_ID,
      },
      employee: {
        fullName: `${record.employee.firstName} ${record.employee.lastName}`,
        employeeNumber: record.employee.employeeNumber,
        position: record.employee.position,
        department: record.employee.department.name,
        email: record.employee.email,
      },
      period: {
        label: periodLabel(record.period.year, record.period.month),
        status: record.period.status,
      },
      figures: {
        regularHours: record.regularHours,
        overtimeHours: record.overtimeHours,
        baseSalary: money(record.baseSalaryCents),
        overtimePay: money(record.overtimePayCents),
        grossSalary: money(record.grossSalaryCents),
        employeeContrib: money(record.employeeContribCents),
        taxableIncome: money(record.taxableIncomeCents),
        incomeTax: money(record.incomeTaxCents),
        netSalary: money(record.netSalaryCents),
        employerContrib: money(record.employerContribCents),
      },
      generatedAt: formatDate(new Date()),
    };

    const buffer = await renderPayslipPdf(data);

    await recordAudit({
      action: "EXPORT",
      entity: "Payslip",
      entityId: recordId,
      userId: actorId,
      metadata: { period: data.period.label },
    });

    const filename = `payslip_${record.employee.employeeNumber}_${record.period.year}-${String(record.period.month).padStart(2, "0")}.pdf`;
    return { buffer, filename };
  },
};
