import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { getCurrentUser, updateProfile } from "../services/authService.js";
import "./ProfilePage.css";

const formatRole = (role) => {
  if (role === "product_manager") return "Product Manager";
  if (role === "sales_manager") return "Sales Manager";
  return "Customer";
};

export default function ProfilePage() {
  const navigate = useNavigate();
  const [user, setUser] = useState(() => getCurrentUser());
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState({
    name: user?.name || "",
    email: user?.email || "",
    taxId: user?.tax_id || "",
    address: user?.address || "",
  });
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");
  const [saving, setSaving] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const cancelEdit = () => {
    setForm({
      name: user?.name || "",
      email: user?.email || "",
      taxId: user?.tax_id || "",
      address: user?.address || "",
    });
    setMessage("");
    setMessageType("");
    setIsEditing(false);
  };

  const saveProfile = async (event) => {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    setMessageType("");

    const result = await updateProfile(form);

    if (!result.success) {
      setMessage(result.message);
      setMessageType("error");
      setSaving(false);
      return;
    }

    setUser(result.data);
    setMessage(result.message);
    setMessageType("success");
    setIsEditing(false);
    setSaving(false);
  };

  return (
    <main className="profile-page">
      <section className="profile-header">
        <p className="profile-kicker">Account</p>
        <h1>Profile</h1>
        <p className="profile-subtitle">
          Customer properties required by the project document.
        </p>
      </section>

      <section className="profile-panel">
        <div className="profile-avatar" aria-hidden="true">
          {(user?.name || user?.username || user?.email || "?").slice(0, 1).toUpperCase()}
        </div>

        <div className="profile-identity">
          <h2>{user?.name || "Unnamed user"}</h2>
          <p>{formatRole(user?.role)}</p>
        </div>

        {isEditing ? (
          <form className="profile-form" onSubmit={saveProfile}>
            <label>
              <span>Name</span>
              <input name="name" value={form.name} onChange={handleChange} required />
            </label>
            <label>
              <span>Email Address</span>
              <input
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                required
              />
            </label>
            <label>
              <span>Tax ID</span>
              <input name="taxId" value={form.taxId} onChange={handleChange} required />
            </label>
            <label className="profile-wide">
              <span>Home Address</span>
              <textarea
                name="address"
                value={form.address}
                onChange={handleChange}
                rows={3}
                required
              />
            </label>
            <div className="profile-form-note profile-wide">
              Password is stored securely as a hash and is not editable here.
            </div>
            <div className="profile-actions profile-wide">
              <button type="submit" disabled={saving}>
                {saving ? "Saving..." : "Save Changes"}
              </button>
              <button type="button" onClick={cancelEdit} disabled={saving}>
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <dl className="profile-details">
            <div>
              <dt>Customer ID</dt>
              <dd>{user?.customerId || user?.customer_id || "Not available"}</dd>
            </div>
            <div>
              <dt>Name</dt>
              <dd>{user?.name || "Not set"}</dd>
            </div>
            <div>
              <dt>Tax ID</dt>
              <dd>{user?.tax_id || "Not set"}</dd>
            </div>
            <div>
              <dt>Email Address</dt>
              <dd>{user?.email || "Not set"}</dd>
            </div>
            <div className="profile-wide">
              <dt>Home Address</dt>
              <dd>{user?.address || "Not set"}</dd>
            </div>
            <div className="profile-wide">
              <dt>Password</dt>
              <dd>Stored securely as a hash and never displayed.</dd>
            </div>
          </dl>
        )}

        {message && (
          <p className={`profile-message ${messageType}`}>
            {message}
          </p>
        )}

        {!isEditing && (
          <div className="profile-actions">
            <button type="button" onClick={() => setIsEditing(true)}>
              Edit Profile
            </button>
            <button type="button" onClick={() => navigate("/my-orders")}>
              View Orders
            </button>
            <button type="button" onClick={() => navigate("/wishlist")}>
              View Wishlist
            </button>
          </div>
        )}
      </section>
    </main>
  );
}
