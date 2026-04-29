import pool from "../config/db.js";

function formatDeliveryAddress(shippingAddress) {
  if (!shippingAddress) {
    return "";
  }

  if (typeof shippingAddress === "string") {
    return shippingAddress.trim();
  }

  const addressParts = [
    shippingAddress.address,
    shippingAddress.street,
    shippingAddress.city,
    shippingAddress.state,
    shippingAddress.zip,
    shippingAddress.country,
  ];

  return addressParts.filter(Boolean).join(", ").trim();
}

export const checkout = async (req, res) => {
  const { cart, shippingAddress, paymentInfo } = req.body;

  if (!cart || !Array.isArray(cart) || cart.length === 0) {
    return res.status(400).json({
      success: false,
      message: "Cart cannot be empty for checkout.",
    });
  }

  const deliveryAddress = formatDeliveryAddress(shippingAddress);

  if (!deliveryAddress) {
    return res.status(400).json({
      success: false,
      message: "Shipping address is required.",
    });
  }

  if (!req.customer || !req.customer.customerId) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized.",
    });
  }

  const customerId = req.customer.customerId;

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    let totalPrice = 0;

    for (const item of cart) {
      if (
        !item.product_id ||
        !item.quantity ||
        !item.unit_price ||
        item.quantity <= 0 ||
        item.unit_price < 0
      ) {
        throw new Error("Invalid cart item.");
      }

      totalPrice += Number(item.quantity) * Number(item.unit_price);
    }

    const orderResult = await client.query(
      `
      INSERT INTO orders (customer_id, total_price, status, created_at)
      VALUES ($1, $2, $3, NOW())
      RETURNING order_id, customer_id, total_price, status, created_at
      `,
      [customerId, totalPrice, "pending"]
    );

    const order = orderResult.rows[0];
    const orderId = order.order_id;

    for (const item of cart) {
      await client.query(
        `
        INSERT INTO order_items (order_id, product_id, quantity, unit_price)
        VALUES ($1, $2, $3, $4)
        `,
        [
          orderId,
          item.product_id,
          Number(item.quantity),
          Number(item.unit_price),
        ]
      );
    }

    await client.query(
      `
      INSERT INTO deliveries (order_id, customer_id, delivery_address, status)
      VALUES ($1, $2, $3, 'processing')
      `,
      [orderId, customerId, deliveryAddress]
    );

    await client.query("COMMIT");

    return res.status(201).json({
      success: true,
      message: "Checkout completed successfully.",
      customer: req.customer,
      order: {
        id: orderId,
        totalItems: cart.length,
        totalPrice,
        status: order.status,
        shippingAddress,
        paymentInfo: {
          cardEnding: paymentInfo?.cardNumber?.slice(-4) || null,
        },
        created_at: order.created_at,
      },
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Checkout error:", error);

    return res.status(500).json({
      success: false,
      message: "Checkout failed.",
      error: error.message,
    });
  } finally {
    client.release();
  }
};
