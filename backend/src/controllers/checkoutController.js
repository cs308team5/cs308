export const checkout = async (req, res) => {
  const { cart, shippingAddress, paymentInfo } = req.body;

  if (!cart || !Array.isArray(cart) || cart.length === 0) {
    return res.status(400).json({
      success: false,
      message: "Cart cannot be empty for checkout.",
    });
  }

  if (!shippingAddress || !shippingAddress.address) {
    return res.status(400).json({
      success: false,
      message: "Shipping address is required.",
    });
  }

  const customer = req.customer || {};

  return res.status(200).json({
    success: true,
    message: "Checkout authorized and processed.",
    customer,
    order: {
      id: `ORDER-${Date.now()}`,
      totalItems: cart.length,
      shippingAddress,
      paymentInfo: {
        cardEnding: paymentInfo?.cardNumber?.slice(-4) || null,
      },
    },
  });
};

