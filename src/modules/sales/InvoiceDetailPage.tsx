import { Link, useParams } from "react-router-dom";
import { Printer, ArrowLeft, Undo2, CheckCircle2, XCircle } from "lucide-react";
import { customers } from "@/mock/customers";
import { users } from "@/mock/users";
import { returns } from "@/mock/returns";
import { auditLogs } from "@/mock/admin";
import { useData } from "@/hooks/useData";
import { mockApi } from "@/services/mockApi";
import { useAuthStore } from "@/store/auth";
import { StickyPageHeader } from "@/components/ui/StickyPageHeader";
import { StatusBadge, Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { WorkflowSteps } from "@/components/ui/Progress";
import { LoadingState, ErrorState } from "@/components/ui/States";
import { formatMoney, formatDate, formatNumber, formatDateShort } from "@/utils/format";
import { toast } from "@/store/ui";
import { getCustomerBalance } from "@/services/ledger";
import { postInvoice, cancelInvoice } from "@/services/sales.service";
import { can } from "@/config/permissions";
import { dataScopeOf } from "@/config/authority";
import type { Invoice } from "@/types";

export function InvoiceDetailPage() {
  const { id } = useParams();
  const { user } = useAuthStore();
  const { data: invoice, loading, error, refetch } = useData<Invoice>(
    () =>
      mockApi.sales.getById(id ?? "").then((i) => {
        if (!i) throw new Error("الفاتورة غير موجودة");
        return i;
      }),
    [id]
  );

  if (loading) return <LoadingState label="جارٍ تحميل الفاتورة..." />;
  if (error || !invoice) return <ErrorState message={error ?? "الفاتورة غير موجودة"} onRetry={refetch} />;

  const customer = customers.find((c) => c.id === invoice.customerId);
  const rep = users.find((u) => u.id === invoice.repId);
  const invoiceReturns = returns.filter((r) => r.invoiceId === invoice.id);
  const logs = auditLogs.filter((l) => l.entity === "invoice" || l.entity === "SalesInvoice");
  const subtotal = invoice.items.reduce((s, i) => s + i.price * i.qty, 0);
  const totalDiscount = subtotal - invoice.net;

  const customerBalance = customer ? getCustomerBalance(customer.id) : null;
  const canApprove = can("sales.approve", user?.role ?? "REPRESENTATIVE");
  const canCancel = can("sales.cancel", user?.role ?? "REPRESENTATIVE");

  const steps = [
    { label: "مسودة", status: (invoice.status === "draft" ? "current" : "done") as "current" | "done" },
    { label: "مقدمة", status: (invoice.status === "submitted" ? "current" : "done") as "current" | "done" },
    { label: "معتمدة", status: (invoice.status === "approved" ? "current" : invoice.status === "completed" ? "done" : "pending") as "current" | "done" | "pending" },
    { label: "منفذة", status: (invoice.status === "completed" ? "current" : "pending") as "current" | "pending" },
  ];

  return (
    <div>
      <StickyPageHeader
        crumbs={[{ label: "المبيعات", path: "/sales" }, { label: invoice.invoiceNumber }]}
        title={`الفاتورة ${invoice.invoiceNumber}`}
        description={`${formatDate(invoice.date)} · ${invoice.type === "cash" ? "بيع نقدي" : "بيع آجل"}`}
        actions={
          <>
            {invoice.status === "submitted" && canApprove && (
              <Button variant="primary" icon={<CheckCircle2 size={15} />} onClick={() => {
                if (!user) return;
                const result = postInvoice(invoice.id, { id: user.id, role: user.role, scope: dataScopeOf[user.role], owns: true });
                if (result.success) { toast.success("تم اعتماد الفاتورة", result.invoice?.invoiceNumber ?? ""); refetch(); }
                else { toast.error("فشل الاعتماد", result.reason ?? ""); }
              }}>اعتماد</Button>
            )}
            {invoice.status !== "cancelled" && canCancel && (
              <Button variant="danger" icon={<XCircle size={15} />} onClick={() => {
                if (!user) return;
                const result = cancelInvoice(invoice.id, { id: user.id, role: user.role, scope: dataScopeOf[user.role], owns: true }, "إلغاء من تفاصيل الفاتورة");
                if (result.success) { toast.success("تم إلغاء الفاتورة", result.invoice?.invoiceNumber ?? ""); refetch(); }
                else { toast.error("فشل الإلغاء", result.reason ?? ""); }
              }}>إلغاء</Button>
            )}
            <Button variant="secondary" icon={<Printer size={15} />} onClick={() => window.print()}>طباعة</Button>
            <Link to={`/returns/new?invoice=${invoice.id}`} className="btn btn-secondary" style={{ textDecoration: "none" }}>
              <Undo2 size={15} /> مرتجع
            </Link>
            <Link to="/sales" className="btn btn-ghost" style={{ textDecoration: "none" }}>
              <ArrowLeft size={15} /> رجوع
            </Link>
          </>
        }
      />

      <Card title="حالة العملية">
        <WorkflowSteps steps={steps} />
      </Card>

      <div className="grid-2-1" style={{ marginTop: "var(--space-4)" }}>
        <div className="stack">
          <div className="invoice-doc">
            <div className="invoice-head">
              <div>
                <h3 style={{ fontSize: "var(--font-size-xl)" }}>فاتورة مبيعات</h3>
                <div className="muted" style={{ fontSize: "var(--font-size-sm)" }}>
                  رقم الفاتورة: <b className="num">{invoice.invoiceNumber}</b> · رقم الطلب: <b className="num">{invoice.number}</b>
                </div>
              </div>
              <div style={{ textAlign: "left" }}>
                <div style={{ fontWeight: 700 }}>نظام التوزيع الميداني</div>
                <div className="muted" style={{ fontSize: "var(--font-size-xs)" }}>الفرع الرئيسي — الرياض</div>
                <div className="muted" style={{ fontSize: "var(--font-size-xs)" }}>الرياض، المملكة العربية السعودية</div>
              </div>
            </div>
            <div className="invoice-body">
              <div className="grid-2" style={{ marginBottom: "var(--space-4)" }}>
                <div>
                  <div className="faint" style={{ fontSize: "var(--font-size-xs)" }}>العميل</div>
                  <b>{customer?.name}</b>
                  <div className="muted" style={{ fontSize: "var(--font-size-xs)" }}>{customer?.address}</div>
                  <div className="num" style={{ direction: "ltr", textAlign: "right", fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)" }}>{customer?.phone}</div>
                </div>
                <div>
                  <div className="faint" style={{ fontSize: "var(--font-size-xs)" }}>المندوب</div>
                  <b>{rep?.name}</b>
                  <div className="muted" style={{ fontSize: "var(--font-size-xs)" }}>تاريخ الفاتورة: {formatDate(invoice.date)}</div>
                  {invoice.dueDate && <div className="muted" style={{ fontSize: "var(--font-size-xs)" }}>استحقاق: {formatDate(invoice.dueDate)}</div>}
                </div>
              </div>
              <div className="table-wrap" style={{ border: "none", boxShadow: "none" }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>المنتج</th>
                      <th className="numeric">الكمية</th>
                      <th className="numeric">السعر</th>
                      <th className="numeric">الخصم</th>
                      <th className="numeric">الإجمالي</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoice.items.map((it, idx) => (
                      <tr key={idx}>
                        <td className="num">{idx + 1}</td>
                        <td>{it.productName}</td>
                        <td className="numeric num">{formatNumber(it.qty)}</td>
                        <td className="numeric num">{formatMoney(it.price)}</td>
                        <td className="numeric num">{it.discountRate}%</td>
                        <td className="numeric num" style={{ fontWeight: 600 }}>{formatMoney(it.lineTotal)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "var(--space-4)" }}>
                <dl className="dl" style={{ minWidth: 280 }}>
                  <dt>المجموع الفرعي</dt><dd className="num">{formatMoney(subtotal)}</dd>
                  <dt>الخصومات</dt><dd className="num" style={{ color: "var(--color-danger)" }}>- {formatMoney(totalDiscount)}</dd>
                  <dt>الإجمالي النهائي</dt><dd className="num" style={{ fontWeight: 700, fontSize: "var(--font-size-lg)" }}>{formatMoney(invoice.net)}</dd>
                  <dt>المدفوع</dt><dd className="num" style={{ color: "var(--color-success)" }}>{formatMoney(invoice.paid)}</dd>
                  <dt>المتبقي</dt><dd className="num" style={{ color: invoice.net - invoice.paid > 0 ? "var(--color-warning)" : "var(--color-success)" }}>{formatMoney(invoice.net - invoice.paid)}</dd>
                </dl>
              </div>
              {invoice.notes && <div className="muted" style={{ fontSize: "var(--font-size-sm)", marginTop: "var(--space-4)" }}>ملاحظات: {invoice.notes}</div>}
            </div>
          </div>

          {invoiceReturns.length > 0 && (
            <Card title="المرتجعات المرتبطة بهذه الفاتورة">
              <div className="stack-sm">
                {invoiceReturns.map((r) => (
                  <div key={r.id} className="flex-between" style={{ borderBottom: "1px solid var(--color-divider)", paddingBottom: 8 }}>
                    <div>
                      <b className="num">{r.number}</b>
                      <span className="muted" style={{ fontSize: "var(--font-size-sm)" }}> · {formatDateShort(r.date)} · {r.condition === "good" ? "سليم" : "تالف"}</span>
                    </div>
                    <span style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>
                      <b className="num">{formatMoney(r.totalAmount)}</b>
                      <StatusBadge status={r.status} />
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>

        <div className="stack">
          <Card title="ملخص مالي">
            <div className="stack-sm">
              <div className="flex-between"><span className="muted">الإجمالي</span><b className="num">{formatMoney(invoice.net)}</b></div>
              <div className="flex-between"><span className="muted">المسدد</span><span className="num" style={{ color: "var(--color-success)" }}>{formatMoney(invoice.paid)}</span></div>
              <div className="flex-between"><span className="muted">المتبقي</span><span className="num" style={{ color: "var(--color-warning)" }}>{formatMoney(invoice.net - invoice.paid)}</span></div>
              <div className="flex-between"><span className="muted">حالة الدفع</span><StatusBadge status={invoice.paymentStatus} /></div>
            </div>
          </Card>

          <Card title="التحقق الائتماني" subtitle={invoice.type === "cash" ? "عملية نقدية" : "عملية آجلة"}>
            {invoice.type === "credit" && customer && customerBalance ? (
              <div className="stack-sm">
                <div className="flex-between"><span className="muted">رصيد العميل بعد الفاتورة</span><b className="num">{formatMoney(customerBalance.balance + (invoice.net - invoice.paid))}</b></div>
                <div className="flex-between"><span className="muted">الحد الائتماني</span><b className="num">{formatMoney(customer.creditLimit)}</b></div>
                {customerBalance.balance + (invoice.net - invoice.paid) > customer.creditLimit && (
                  <Badge tone="warning" dot>تجاوز حد ائتماني — يتطلب اعتماد</Badge>
                )}
              </div>
            ) : (
              <div className="muted" style={{ fontSize: "var(--font-size-sm)" }}>لا يوجد تحقق ائتماني للعمليات النقدية</div>
            )}
          </Card>

          <Card title="التدقيق" subtitle={`${logs.length} عملية مسجلة`}>
            {logs.length === 0 ? (
              <div className="muted" style={{ fontSize: "var(--font-size-sm)" }}>لا توجد عمليات تدقيق إضافية</div>
            ) : (
              <div className="timeline">
                {logs.slice(0, 3).map((l) => (
                  <div key={l.id} className="timeline-item">
                    <div className="timeline-rail"><span className="timeline-dot done" /><span className="timeline-line" /></div>
                    <div className="timeline-content">
                      <div className="timeline-title">{l.actor} — {l.action}</div>
                      <div className="timeline-meta"><span>{l.entity}</span><span>{formatDate(l.at.slice(0, 10))}</span></div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}