export const parseFiniteNumber = (value) => {
  if (value === "" || value === null || value === undefined) {
    return null;
  }

  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : null;
};

export const parsePositivePrice = (value) => {
  const numericValue = parseFiniteNumber(value);
  return numericValue !== null && numericValue > 0 ? numericValue : null;
};

export const parseNonNegativeMoney = (value) => {
  const numericValue = parseFiniteNumber(value);
  return numericValue !== null && numericValue >= 0 ? numericValue : null;
};

export const parseNonNegativeInteger = (value) => {
  const numericValue = parseFiniteNumber(value);
  return Number.isInteger(numericValue) && numericValue >= 0 ? numericValue : null;
};

export const parsePercentage = (value) => {
  const numericValue = parseFiniteNumber(value);
  return numericValue !== null && numericValue >= 0 && numericValue <= 100
    ? numericValue
    : null;
};

export const normalizeDeliveryStatus = (value) => {
  if (typeof value !== "string") {
    return null;
  }

  const status = value.trim().toLowerCase();
  const allowedStatuses = new Set(["processing", "in-transit", "delivered"]);
  return allowedStatuses.has(status) ? status : null;
};
