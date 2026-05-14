import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
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
      setLoading(false);
      return;
    }

    setLoading(true);
    const qs = buildQuery();

    try {
      const [invRes, revRes] = await Promise.all([
        fetch(`/api/invoice/manager${qs}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`/api/invoice/manager/revenue${qs}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      const invData = await invRes.json().catch(() => ({}));
      const revData = await revRes.json().catch(() => ({}));

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
    } catch {
      showMessage("Network error while loading reports.", "error");
      setInvoices([]);
      setSummary(null);
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
