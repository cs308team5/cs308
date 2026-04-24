import pool from "../config/db.js";
import { isAdminCustomer } from "../utils/adminAccess.js";

const adminMiddleware = async (req, res, next) => {
  const customerId = req.customer?.customerId;

  if (!customerId) {
    return res.status(401).json({ message: "Authentication required." });
  }

  try {
    const result = await pool.query(
      "SELECT * FROM customers WHERE customer_id = $1 LIMIT 1",
      [customerId]
    );

    const customer = result.rows[0];

    if (!customer) {
      return res.status(401).json({ message: "Customer not found." });
    }

    if (!isAdminCustomer(customer)) {
      return res.status(403).json({ message: "Admin access required." });
    }

    req.adminCustomer = customer;
    next();
  } catch (error) {
    console.error("Admin auth error:", error);
    return res.status(500).json({ message: "Server error." });
  }
};

export default adminMiddleware;
