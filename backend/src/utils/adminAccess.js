export const CUSTOMER_ROLE = "customer";
export const SALES_MANAGER_ROLE = "sales_manager";
export const PRODUCT_MANAGER_ROLE = "product_manager";

const ROLE_ALIASES = new Map([
  ["customer", CUSTOMER_ROLE],
  ["sales_manager", SALES_MANAGER_ROLE],
  ["salesmanager", SALES_MANAGER_ROLE],
  ["sales", SALES_MANAGER_ROLE],
  ["product_manager", PRODUCT_MANAGER_ROLE],
  ["productmanager", PRODUCT_MANAGER_ROLE],
  ["product", PRODUCT_MANAGER_ROLE],
]);

export const normalizeRole = (value) => {
  const normalized = String(value ?? CUSTOMER_ROLE)
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");

  return ROLE_ALIASES.get(normalized) ?? CUSTOMER_ROLE;
};

export const hasRole = (customer, roles) => {
  if (!customer) {
    return false;
  }

  return roles.includes(normalizeRole(customer.role));
};

export const isSalesManager = (customer) =>
  hasRole(customer, [SALES_MANAGER_ROLE]);

export const isProductManager = (customer) =>
  hasRole(customer, [PRODUCT_MANAGER_ROLE]);

export const isManager = (customer) =>
  hasRole(customer, [SALES_MANAGER_ROLE, PRODUCT_MANAGER_ROLE]);
