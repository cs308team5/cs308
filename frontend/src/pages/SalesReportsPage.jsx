import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Area,
  AreaChart,
} from "recharts";
import { getCurrentUser } from "../services/authService.js";
import "./SalesReportsPage.css";

function formatCurrency(value) {
  return `$${Number(value ?? 0).toFixed(2)}`;
}

function formatDateTime(value) {
  if (!value) return "—";
  return new Date(value).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function normalizeOrderStatusKey(raw) {
  if (raw == null || raw === "") return "";
  let s = String(raw).trim().toLowerCase().replace(/_/g, "-").replace(/\s+/g, "-");
  if (s === "intransit") s = "in-transit";
  if (s === "canceled") s = "cancelled";
  return s;
}

/** Matches MyOrders / AdminDeliveries delivery palette where overlap applies */
const ORDER_STATUS_META = {
  pending: { label: "Pending", className: "sales-reports-status--pending" },
  processing: { label: "Processing", className: "sales-reports-status--processing" },
  "in-transit": { label: "In transit", className: "sales-reports-status--in-transit" },
  delivered: { label: "Delivered", className: "sales-reports-status--delivered" },
  cancelled: { label: "Cancelled", className: "sales-reports-status--cancelled" },
};

function orderStatusBadge(raw) {
  const key = normalizeOrderStatusKey(raw);
  if (!key) {
    return { label: "—", className: "sales-reports-status--unknown" };
  }
  const meta = ORDER_STATUS_META[key];
  if (meta) return meta;
  const pretty = String(raw)
    .trim()
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
  return { label: pretty || "Unknown", className: "sales-reports-status--unknown" };
}

async function fetchPdfBlob(pdfUrl, token) {
  const res = await fetch(pdfUrl, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(errText || "Could not load invoice PDF.");
  }
  return res.blob();
}

function printPdfBlob(blob, titleBase) {
  const invoiceUrl = URL.createObjectURL(blob);
  const originalTitle = document.title;
  const printFrame = document.createElement("iframe");
  printFrame.style.position = "fixed";
  printFrame.style.right = "0";
  printFrame.style.bottom = "0";
  printFrame.style.width = "0";
  printFrame.style.height = "0";
  printFrame.style.border = "0";
  printFrame.src = invoiceUrl;
  printFrame.onload = () => {
    document.title = titleBase || "invoice";
    printFrame.contentWindow?.focus();
    printFrame.contentWindow?.print();
    setTimeout(() => {
      document.body.removeChild(printFrame);
      URL.revokeObjectURL(invoiceUrl);
      document.title = originalTitle;
    }, 60000);
  };
  document.body.appendChild(printFrame);
}

function formatChartDayLabel(dateKey) {
  const [y, m, d] = dateKey.split("-").map(Number);
  if (!y) return dateKey;
  const dt = new Date(y, m - 1, d);
  return dt.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function localDateKeyFromIso(iso) {
  const t = new Date(iso);
  if (Number.isNaN(t.getTime())) return null;
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`;
}

function* daysInRangeInclusive(startStr, endStr) {
  if (!startStr || !endStr) return;
  const [sy, sm, sd] = startStr.split("-").map(Number);
  const [ey, em, ed] = endStr.split("-").map(Number);
  const cur = new Date(sy, sm - 1, sd);
  const end = new Date(ey, em - 1, ed);
  if (cur > end) return;
  while (cur <= end) {
    const dayKey = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, "0")}-${String(cur.getDate()).padStart(2, "0")}`;
    yield dayKey;
    cur.setDate(cur.getDate() + 1);
  }
}

function buildDailyRevenueByInvoice(startDateInput, endDateInput, invoices) {
  const perDay = new Map();
  for (const inv of invoices) {
    const key = localDateKeyFromIso(inv.generated_at);
    if (!key) continue;
    const amt = Number(inv.total_price ?? 0);
    perDay.set(key, (perDay.get(key) ?? 0) + amt);
  }
  const rows = [];
  for (const day of daysInRangeInclusive(startDateInput, endDateInput)) {
    rows.push({
      dateKey: day,
      label: formatChartDayLabel(day),
      revenue: Number((perDay.get(day) ?? 0).toFixed(2)),
    });
  }
  return rows;
}

/** Approved refund cash by calendar day (reviewed_at), aligned with revenue loss logic */
function buildDailyApprovedRefunds(startDateInput, endDateInput, refunds) {
  const perDay = new Map();
  for (const r of refunds) {
    if (String(r.status ?? "").toLowerCase() !== "approved" || !r.reviewed_at) continue;
    const key = localDateKeyFromIso(r.reviewed_at);
    if (!key || key < startDateInput || key > endDateInput) continue;
    const amt = Number(r.quantity ?? 0) * Number(r.unit_price ?? 0);
    perDay.set(key, (perDay.get(key) ?? 0) + amt);
  }
  const rows = [];
  for (const day of daysInRangeInclusive(startDateInput, endDateInput)) {
    rows.push({
      dateKey: day,
      label: formatChartDayLabel(day),
      refundAmount: Number((perDay.get(day) ?? 0).toFixed(2)),
    });
  }
  return rows;
}

/** Refunds whose request fell in the date range, grouped by status (sum of line amounts in $) */
function buildRefundRequestsByStatus(startDateInput, endDateInput, refunds) {
  const labels = {
    pending: "Pending",
    received: "Received",
    approved: "Approved",
    rejected: "Rejected",
  };
  const agg = {
    pending: { count: 0, amount: 0 },
    received: { count: 0, amount: 0 },
    approved: { count: 0, amount: 0 },
    rejected: { count: 0, amount: 0 },
  };
  for (const r of refunds) {
    if (!r.requested_at) continue;
    const key = localDateKeyFromIso(r.requested_at);
    if (!key || key < startDateInput || key > endDateInput) continue;
    const st = String(r.status ?? "").toLowerCase();
    if (!agg[st]) continue;
    const amt = Number(r.quantity ?? 0) * Number(r.unit_price ?? 0);
    agg[st].count += 1;
    agg[st].amount += amt;
  }
  return Object.keys(labels).map((k) => ({
    key: k,
    name: labels[k],
    count: agg[k].count,
    amount: Number(agg[k].amount.toFixed(2)),
  }));
}

const REFUND_STATUS_BAR_COLORS = {
  pending: "#ca8a04",
  received: "#2563eb",
  approved: "#047857",
  rejected: "#9ca3af",
};

function ChartTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const row = payload[0];
  return (
    <div className="sales-reports-chart-tooltip">
      {payload.map((p) => (
        <div key={String(p.dataKey)} className="sales-reports-chart-tooltip-row">
          <span>{p.name}</span>
          <strong>{formatCurrency(p.value)}</strong>
        </div>
      ))}
      {row?.payload?.dateKey ? (
        <div className="sales-reports-chart-tooltip-date">{row.payload.dateKey}</div>
      ) : null}
    </div>
  );
}

function RefundStatusTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const p = payload[0]?.payload;
  if (!p) return null;
  return (
    <div className="sales-reports-chart-tooltip">
      <div className="sales-reports-chart-tooltip-title">{p.name}</div>
      <div className="sales-reports-chart-tooltip-row">
        <span>Amount</span>
        <strong>{formatCurrency(p.amount)}</strong>
      </div>
    </div>
  );
}

export default function SalesReportsPage() {
  const navigate = useNavigate();
  const user = getCurrentUser();
  const token = user?.token ?? null;

  const today = new Date();
  const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const toInputDate = (d) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

  const [startDate, setStartDate] = useState(toInputDate(firstOfMonth));
  const [endDate, setEndDate] = useState(toInputDate(today));
  const [invoices, setInvoices] = useState([]);
  const [summary, setSummary] = useState(null);
  const [refunds, setRefunds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("success");
  const [pdfBusyOrderId, setPdfBusyOrderId] = useState(null);

  const showMessage = (text, type = "success") => {
    setMessage(text);
    setMessageType(type);
    setTimeout(() => setMessage(""), 4000);
  };

  const buildQuery = useCallback(() => {
    const params = new URLSearchParams();
    if (startDate) params.set("startDate", startDate);
    if (endDate) params.set("endDate", endDate);
    const qs = params.toString();
    return qs ? `?${qs}` : "";
  }, [startDate, endDate]);

  const loadData = useCallback(async () => {
    if (!token) {
      setInvoices([]);
      setSummary(null);
      setRefunds([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const qs = buildQuery();

    try {
      const [invRes, revRes, refRes] = await Promise.all([
        fetch(`/api/invoice/manager${qs}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`/api/invoice/manager/revenue${qs}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch("/api/refunds", {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      const invData = await invRes.json().catch(() => ({}));
      const revData = await revRes.json().catch(() => ({}));
      const refData = await refRes.json().catch(() => ({}));

      if (!invRes.ok) {
        showMessage(invData.message || "Could not load invoices.", "error");
        setInvoices([]);
      } else {
        setInvoices(invData.data ?? []);
      }

      if (!revRes.ok) {
        showMessage(revData.message || "Could not load revenue summary.", "error");
        setSummary(null);
      } else {
        setSummary(revData.data ?? null);
      }

      if (!refRes.ok) {
        setRefunds([]);
      } else {
        setRefunds(refData.refunds ?? []);
      }
    } catch {
      showMessage("Network error while loading reports.", "error");
      setInvoices([]);
      setSummary(null);
      setRefunds([]);
    } finally {
      setLoading(false);
    }
  }, [token, buildQuery]);

  useEffect(() => {
    if (!token) {
      navigate("/login", { replace: true });
      return;
    }
    if (user?.role !== "sales_manager") {
      navigate("/home", { replace: true });
      return;
    }
    loadData();
    // Apply range triggers loadData manually; omit loadData deps to avoid refetch on every date input change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, user?.role, navigate]);

  const handleDownloadPdf = async (invoice) => {
    const pdfPath = invoice.pdf_url ?? `/api/invoice/manager/${invoice.order_id}/pdf`;
    setPdfBusyOrderId(invoice.order_id);
    try {
      const blob = await fetchPdfBlob(pdfPath, token);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `invoice-${invoice.order_id}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      showMessage(e.message || "Download failed.", "error");
    } finally {
      setPdfBusyOrderId(null);
    }
  };

  const handlePrintPdf = async (invoice) => {
    const pdfPath = invoice.pdf_url ?? `/api/invoice/manager/${invoice.order_id}/pdf`;
    const titleBase = `${invoice.customer_name || "customer"} - invoice-${invoice.order_id}`;
    setPdfBusyOrderId(invoice.order_id);
    try {
      const blob = await fetchPdfBlob(pdfPath, token);
      printPdfBlob(blob, titleBase);
    } catch (e) {
      showMessage(e.message || "Print failed.", "error");
    } finally {
      setPdfBusyOrderId(null);
    }
  };

  const revenueTotal = summary
    ? Number(summary.revenue ?? summary.gross_revenue ?? 0)
    : 0;
  const lossTotal = summary ? Number(summary.loss ?? summary.refunded_amount ?? 0) : 0;
  const profitTotal = summary
    ? Number(summary.profit ?? summary.net_revenue ?? 0)
    : 0;

  const periodBarData = useMemo(
    () => [
      { name: "Revenue", value: revenueTotal, fill: "var(--blue, #1B284E)" },
      { name: "Loss", value: lossTotal, fill: "#b91c1c" },
      { name: "Profit", value: profitTotal, fill: "#047857" },
    ],
    [revenueTotal, lossTotal, profitTotal]
  );

  const dailySeries = useMemo(
    () => buildDailyRevenueByInvoice(startDate, endDate, invoices),
    [startDate, endDate, invoices]
  );

  const dailyRefundSeries = useMemo(
    () => buildDailyApprovedRefunds(startDate, endDate, refunds),
    [startDate, endDate, refunds]
  );

  const refundStatusSeries = useMemo(
    () => buildRefundRequestsByStatus(startDate, endDate, refunds),
    [startDate, endDate, refunds]
  );

  if (!token || user?.role !== "sales_manager") {
    return null;
  }

  return (
    <div className="sales-reports-page">
      <div className="sales-reports-header">
        <div>
          <h1>Sales reports</h1>
          <p>Revenue, loss, and profit for the selected period.</p>
        </div>
        {message ? (
          <p className={`sales-reports-msg ${messageType}`} role="status">
            {message}
          </p>
        ) : null}
      </div>

      <section className="sales-reports-filters">
        <div className="sales-reports-filter-fields">
          <label className="sales-reports-label">
            Start date
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="sales-reports-input"
            />
          </label>
          <label className="sales-reports-label">
            End date
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="sales-reports-input"
            />
          </label>
        </div>
        <button type="button" className="sales-reports-apply" onClick={() => loadData()} disabled={loading}>
          {loading ? "Loading…" : "Apply range"}
        </button>
      </section>

      {summary && (
        <>
        <section className="sales-reports-summary" aria-label="Revenue loss profit">
          <div className="sales-reports-summary-card">
            <span>Revenue</span>
            <strong>{formatCurrency(summary.revenue ?? summary.gross_revenue)}</strong>
          </div>
          <div className="sales-reports-summary-card">
            <span>Loss</span>
            <strong>{formatCurrency(summary.loss ?? summary.refunded_amount)}</strong>
          </div>
          <div className="sales-reports-summary-card highlight">
            <span>Profit</span>
            <strong>{formatCurrency(summary.profit)}</strong>
          </div>
        </section>
        <p className="sales-reports-summary-foot">
          Based on <strong>{summary.invoice_count ?? 0}</strong> invoice{Number(summary.invoice_count) === 1 ? "" : "s"} in this range.
        </p>
        </>
      )}

      {summary && (
        <section className="sales-reports-charts" aria-label="Charts">
          <div className="sales-reports-chart-card">
            <h2 className="sales-reports-chart-title">Revenue, loss &amp; profit</h2>
            <p className="sales-reports-chart-caption">Totals for the selected date range</p>
            <div className="sales-reports-chart-inner">
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={periodBarData} margin={{ top: 8, right: 12, left: 4, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e0" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `$${v}`} />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(27, 40, 78, 0.06)" }} />
                  <Legend />
                  <Bar dataKey="value" name="Amount" radius={[8, 8, 0, 0]}>
                    {periodBarData.map((entry) => (
                      <Cell key={entry.name} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="sales-reports-chart-card">
            <h2 className="sales-reports-chart-title">Invoice revenue by day</h2>
            <p className="sales-reports-chart-caption">Sum of invoice totals per calendar day</p>
            <div className="sales-reports-chart-inner">
              {dailySeries.length === 0 ? (
                <p className="sales-reports-chart-empty">Select a date range to see daily totals.</p>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart data={dailySeries} margin={{ top: 8, right: 12, left: 4, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e0" />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
                    <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `$${v}`} />
                    <Tooltip content={<ChartTooltip />} />
                    <Legend />
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      name="Invoice revenue"
                      stroke="var(--blue, #1B284E)"
                      fill="var(--blue, #1B284E)"
                      fillOpacity={0.15}
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </section>
      )}

      {summary && (
        <section className="sales-reports-refund-section" aria-label="Refund analysis charts">
          <h2 className="sales-reports-refund-heading">Refund analysis</h2>
          <div className="sales-reports-charts-grid">
            <div className="sales-reports-chart-card sales-reports-chart-card--wide">
              <h3 className="sales-reports-chart-title">Approved refunds by day</h3>
              <p className="sales-reports-chart-caption">
                Sum of approved refund amounts per calendar day (approval date; quantity × unit price).
              </p>
              <div className="sales-reports-chart-inner">
                {dailyRefundSeries.length === 0 ? (
                  <p className="sales-reports-chart-empty">Select a date range to see daily refunds.</p>
                ) : (
                  <ResponsiveContainer width="100%" height={280}>
                    <AreaChart data={dailyRefundSeries} margin={{ top: 8, right: 12, left: 4, bottom: 8 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e0" />
                      <XAxis dataKey="label" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
                      <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `$${v}`} />
                      <Tooltip content={<ChartTooltip />} />
                      <Legend />
                      <Area
                        type="monotone"
                        dataKey="refundAmount"
                        name="Approved refunds"
                        stroke="#b91c1c"
                        fill="#b91c1c"
                        fillOpacity={0.2}
                        strokeWidth={2}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            <div className="sales-reports-chart-card sales-reports-chart-card--wide">
              <h3 className="sales-reports-chart-title">Refund amounts by status</h3>
              <p className="sales-reports-chart-caption">
                Total amount ($) per status for requests first submitted in this range (quantity × unit price).
              </p>
              <div className="sales-reports-chart-inner sales-reports-chart-inner--horizontal">
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart
                    layout="vertical"
                    data={refundStatusSeries}
                    margin={{ top: 8, right: 24, left: 8, bottom: 36 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e0" horizontal={false} />
                    <XAxis
                      type="number"
                      tick={{ fontSize: 12 }}
                      tickFormatter={(v) => `$${v}`}
                      label={{
                        value: "Amount ($)",
                        position: "insideBottom",
                        offset: -8,
                        style: { fill: "#555", fontSize: 12, fontWeight: 600 },
                      }}
                    />
                    <YAxis type="category" dataKey="name" width={88} tick={{ fontSize: 12 }} />
                    <Tooltip content={<RefundStatusTooltip />} />
                    <Bar dataKey="amount" name="Amount ($)" radius={[0, 6, 6, 0]}>
                      {refundStatusSeries.map((row) => (
                        <Cell key={row.key} fill={REFUND_STATUS_BAR_COLORS[row.key] ?? "#94a3b8"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </section>
      )}

      <section className="sales-reports-table-wrap">
        <h2 className="sales-reports-table-title">Invoices</h2>
        {loading ? (
          <p className="sales-reports-loading">Loading invoices…</p>
        ) : invoices.length === 0 ? (
          <p className="sales-reports-empty">No invoices match this date range.</p>
        ) : (
          <div className="sales-reports-table-scroll">
            <table className="sales-reports-table">
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Customer</th>
                  <th>Email</th>
                  <th>Generated</th>
                  <th>Order status</th>
                  <th className="sales-reports-num">Total</th>
                  <th className="sales-reports-actions-col sales-reports-actions-header">PDF</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => {
                  const statusBadge = inv.order_status != null && inv.order_status !== ""
                    ? orderStatusBadge(inv.order_status)
                    : null;
                  return (
                  <tr key={inv.invoice_id ?? inv.order_id}>
                    <td className="sales-reports-order-id">{inv.order_id}</td>
                    <td>{inv.customer_name ?? "—"}</td>
                    <td>{inv.customer_email ?? "—"}</td>
                    <td>{formatDateTime(inv.generated_at)}</td>
                    <td className="sales-reports-status-cell">
                      {!statusBadge ? (
                        "—"
                      ) : (
                        <span
                          className={`sales-reports-status-badge ${statusBadge.className}`}
                          title={String(inv.order_status)}
                        >
                          <span className="sales-reports-status-dot" aria-hidden />
                          {statusBadge.label}
                        </span>
                      )}
                    </td>
                    <td className="sales-reports-num">{formatCurrency(inv.total_price)}</td>
                    <td className="sales-reports-actions-cell">
                      <button
                        type="button"
                        className="sales-reports-btn secondary"
                        disabled={pdfBusyOrderId === inv.order_id}
                        onClick={() => handleDownloadPdf(inv)}
                      >
                        Download
                      </button>
                      <button
                        type="button"
                        className="sales-reports-btn"
                        disabled={pdfBusyOrderId === inv.order_id}
                        onClick={() => handlePrintPdf(inv)}
                      >
                        Print
                      </button>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
