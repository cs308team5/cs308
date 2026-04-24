const ADMIN_ROLE_VALUES = new Set(["admin", "administrator"]);

const truthyValues = new Set([true, 1, "1", "true", "yes"]);

const normalizeEmail = (value) => String(value ?? "").trim().toLowerCase();

export const getConfiguredAdminEmails = () =>
  new Set(
    String(process.env.ADMIN_EMAILS ?? "")
      .split(",")
      .map((value) => normalizeEmail(value))
      .filter(Boolean)
  );

export const isAdminCustomer = (customer) => {
  if (!customer) {
    return false;
  }

  const adminEmailSet = getConfiguredAdminEmails();
  const email = normalizeEmail(customer.email);

  return (
    truthyValues.has(customer.is_admin) ||
    truthyValues.has(customer.isAdmin) ||
    ADMIN_ROLE_VALUES.has(String(customer.role ?? "").trim().toLowerCase()) ||
    ADMIN_ROLE_VALUES.has(String(customer.user_role ?? "").trim().toLowerCase()) ||
    ADMIN_ROLE_VALUES.has(String(customer.customer_type ?? "").trim().toLowerCase()) ||
    ADMIN_ROLE_VALUES.has(String(customer.account_type ?? "").trim().toLowerCase()) ||
    (email && adminEmailSet.has(email))
  );
};
