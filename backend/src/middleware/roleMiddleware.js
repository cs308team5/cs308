import pool from "../config/db.js";
import { normalizeRole } from "../utils/adminAccess.js";

export const requireRole = (...allowedRoles) => {
  const normalizedAllowedRoles = allowedRoles.map(normalizeRole);

  return async (req, res, next) => {
    const customerId = req.customer?.customerId ?? req.customer?.customer_id;

    if (!customerId) {
      return res.status(401).json({ message: "Authentication required." });
    }

    try {
      const result = await pool.query(
        "SELECT customer_id, role FROM customers WHERE customer_id = $1 LIMIT 1",
        [customerId]
      );

      const customer = result.rows[0];

      if (!customer) {
        return res.status(401).json({ message: "Customer not found." });
      }

      const role = normalizeRole(customer.role);

      if (!normalizedAllowedRoles.includes(role)) {
        return res.status(403).json({ message: "Insufficient role permissions." });
      }

      req.customerRole = role;
      next();
    } catch (error) {
      console.error("Role auth error:", error);
      return res.status(500).json({ message: "Server error." });
    }
  };
};

export const requireSalesManager = requireRole("sales_manager");
export const requireProductManager = requireRole("product_manager");
