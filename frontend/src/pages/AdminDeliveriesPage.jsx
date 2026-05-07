import { useEffect, useMemo, useState } from "react";
import { getCurrentUser } from "../services/authService.js";
import "./AdminDeliveriesPage.css";

const STATUS_OPTIONS = ["processing", "in-transit", "delivered"];

const STATUS_CONFIG = {
  processing: { label: "Processing", className: "processing" },
  "in-transit": { label: "In Transit", className: "in-transit" },
  delivered: { label: "Delivered", className: "delivered" },
};

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

export default function AdminDeliveriesPage() {
  const user = getCurrentUser();
  const token = user?.token ?? null;
  const [deliveries, setDeliveries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("success");

  const counts = useMemo(() => {
    return deliveries.reduce(
      (acc, delivery) => {
        const status = delivery.status ?? "processing";
        acc[status] = (acc[status] ?? 0) + 1;
        return acc;
      },
      { processing: 0, "in-transit": 0, delivered: 0 }
    );
  }, [deliveries]);

  useEffect(() => {
    fetchDeliveries();
  }, [token]);

  const showMessage = (text, type = "success") => {
    setMessage(text);
    setMessageType(type);
    setTimeout(() => setMessage(""), 3000);
  };

  const fetchDeliveries = async () => {
    if (!token) {
      setDeliveries([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/deliveries/admin", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();

      if (!res.ok) {
        showMessage(data.message || "Could not load deliveries.", "error");
        setDeliveries([]);
        return;
      }

      setDeliveries(data.data ?? []);
    } catch {
      showMessage("Could not load deliveries.", "error");
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (deliveryId, status) => {
    const previousDeliveries = deliveries;
    setSavingId(deliveryId);
    setDeliveries((current) =>
      current.map((delivery) =>
        delivery.delivery_id === deliveryId
          ? { ...delivery, status, is_completed: status === "delivered" }
          : delivery
      )
    );

    try {
      const res = await fetch(`/api/deliveries/${deliveryId}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();

      if (!res.ok) {
        setDeliveries(previousDeliveries);
        showMessage(data.message || "Could not update delivery.", "error");
        return;
      }

      setDeliveries((current) =>
        current.map((delivery) =>
          delivery.delivery_id === deliveryId
            ? { ...delivery, ...data.delivery }
            : delivery
        )
      );
      showMessage("Delivery status updated.");
    } catch {
      setDeliveries(previousDeliveries);
      showMessage("Could not update delivery.", "error");
    } finally {
      setSavingId(null);
    }
  };

  return (
    <main className="admin-deliveries-page">
      <header className="admin-deliveries-header">
        <div>
          <h1>Deliveries</h1>
          <p>Update order delivery status for the admin demo.</p>
        </div>
        {message && <p className={`delivery-admin-msg ${messageType}`}>{message}</p>}
      </header>

      <section className="delivery-summary" aria-label="Delivery status summary">
        {STATUS_OPTIONS.map((status) => (
          <div className="delivery-summary-item" key={status}>
            <span>{STATUS_CONFIG[status].label}</span>
            <strong>{counts[status] ?? 0}</strong>
          </div>
        ))}
      </section>

      {loading ? (
        <p className="delivery-admin-empty">Loading deliveries...</p>
      ) : deliveries.length === 0 ? (
        <p className="delivery-admin-empty">No deliveries found.</p>
      ) : (
        <section className="delivery-admin-list">
          {deliveries.map((delivery) => {
            const status = delivery.status ?? "processing";
            const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.processing;
            const items = (delivery.items ?? []).filter((item) => item.name);

            return (
              <article className="delivery-admin-card" key={delivery.delivery_id}>
                <div className="delivery-card-main">
                  <div className="delivery-order-meta">
                    <span className="delivery-order-id">Order #{delivery.order_id}</span>
                    <span>{formatDate(delivery.created_at)}</span>
                  </div>
                  <h2>{delivery.customer_name || "Customer"}</h2>
                  <p>{delivery.customer_email}</p>
                  {delivery.delivery_address && (
                    <p className="delivery-address-line">{delivery.delivery_address}</p>
                  )}
                </div>

                <div className="delivery-card-controls">
                  <span className={`delivery-status-pill ${config.className}`}>
                    {config.label}
                  </span>
                  <select
                    value={status}
                    disabled={savingId === delivery.delivery_id}
                    onChange={(event) => updateStatus(delivery.delivery_id, event.target.value)}
                    aria-label={`Delivery status for order ${delivery.order_id}`}
                  >
                    {STATUS_OPTIONS.map((option) => (
                      <option value={option} key={option}>
                        {STATUS_CONFIG[option].label}
                      </option>
                    ))}
                  </select>
                  <strong>{formatCurrency(delivery.total_price)}</strong>
                </div>

                {items.length > 0 && (
                  <div className="delivery-items">
                    {items.map((item, index) => (
                      <div className="delivery-item" key={`${delivery.delivery_id}-${index}`}>
                        {item.image_url && <img src={item.image_url} alt={item.name} />}
                        <span>{item.name}</span>
                        <small>Qty {item.quantity}</small>
                      </div>
                    ))}
                  </div>
                )}
              </article>
            );
          })}
        </section>
      )}
    </main>
  );
}
