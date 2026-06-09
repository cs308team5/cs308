import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getCurrentUser } from "../services/authService.js";
import "./AdminPage.css";

function formatCurrency(value) {
  return `$${Number(value ?? 0).toFixed(2)}`;
}

function formatDate(value) {
  if (!value) return "No date";
  return new Date(value).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function AdminInvoicesPage() {
  const navigate = useNavigate();
  const user = getCurrentUser();
  const token = user?.token ?? null;
  const isProductManager = user?.role === "product_manager";
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const [previewTitle, setPreviewTitle] = useState("");
  const [busyOrderId, setBusyOrderId] = useState(null);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  useEffect(() => {
    if (!token || !isProductManager) {
      setLoading(false);
      return;
    }

    const loadInvoices = async () => {
      try {
        const res = await fetch("/api/invoice/product-manager", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();

        if (!res.ok) {
          setMessage(data.message || "Could not load invoices.");
          setInvoices([]);
          return;
        }

        setInvoices(data.data ?? []);
      } catch {
        setMessage("Could not load invoices.");
      } finally {
        setLoading(false);
      }
    };

    loadInvoices();
  }, [isProductManager, token]);

  const fetchInvoiceBlob = async (invoice) => {
    const res = await fetch(invoice.pdf_url ?? `/api/invoice/product-manager/${invoice.order_id}/pdf`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      throw new Error("Could not load invoice.");
    }

    return res.blob();
  };

  const previewInvoice = async (invoice) => {
    setBusyOrderId(invoice.order_id);
    try {
      const blob = await fetchInvoiceBlob(invoice);
      const url = URL.createObjectURL(blob);
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
      setPreviewUrl(url);
      setPreviewTitle(`Invoice for order #${invoice.order_id}`);
    } catch {
      setMessage("Could not preview invoice.");
    } finally {
      setBusyOrderId(null);
    }
  };

  const closePreview = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl("");
    setPreviewTitle("");
  };

  const downloadInvoice = async (invoice) => {
    setBusyOrderId(invoice.order_id);
    try {
      const blob = await fetchInvoiceBlob(invoice);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `invoice-${invoice.order_id}.pdf`;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch {
      setMessage("Could not download invoice.");
    } finally {
      setBusyOrderId(null);
    }
  };

  if (!token || !isProductManager) {
    return (
      <main className="admin-content">
        <div className="admin-guard-card">
          <h2 className="brand">Product manager access required</h2>
          <p className="admin-empty">Please log in with a product manager account to view invoices.</p>
          <button className="admin-btn add-product" onClick={() => navigate("/login")}>Go to Login</button>
        </div>
      </main>
    );
  }

  return (
    <main className="admin-content">
      <div className="admin-panel">
        <div className="admin-header">
          <div>
            <p className="admin-kicker">Invoices</p>
            <h1 className="admin-title">Product Manager Invoice View</h1>
          </div>
          {message && <p className="admin-msg error">{message}</p>}
        </div>

        <div className="admin-list">
          {loading && <p className="admin-empty">Loading invoices...</p>}
          {!loading && invoices.length === 0 && (
            <p className="admin-empty">No invoices found.</p>
          )}
          {invoices.map((invoice) => (
            <div className="admin-card product-card" key={invoice.invoice_id ?? invoice.order_id}>
              <div className="product-card-info">
                <span className="admin-product-name brand">Order #{invoice.order_id}</span>
                <span className="product-category">{invoice.customer_name} - {invoice.customer_email}</span>
                <span className="product-price">{formatCurrency(invoice.total_price)}</span>
                <span className="product-stock">{formatDate(invoice.generated_at)}</span>
              </div>
              <div className="admin-actions">
                <button
                  className="admin-btn add-product"
                  disabled={busyOrderId === invoice.order_id}
                  onClick={() => previewInvoice(invoice)}
                >
                  Preview
                </button>
                <button
                  className="admin-btn approve"
                  disabled={busyOrderId === invoice.order_id}
                  onClick={() => downloadInvoice(invoice)}
                >
                  Download PDF
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
      {previewUrl && (
        <div className="admin-invoice-preview-overlay" role="dialog" aria-modal="true">
          <div className="admin-invoice-preview-modal">
            <div className="admin-invoice-preview-header">
              <div>
                <h2>{previewTitle}</h2>
                <p>Product manager invoice preview</p>
              </div>
              <button
                type="button"
                className="admin-invoice-preview-close"
                onClick={closePreview}
                aria-label="Close invoice preview"
              >
                ×
              </button>
            </div>
            <iframe
              className="admin-invoice-preview-frame"
              src={`${previewUrl}#toolbar=0&navpanes=0`}
              title={previewTitle}
            />
          </div>
        </div>
      )}
    </main>
  );
}
