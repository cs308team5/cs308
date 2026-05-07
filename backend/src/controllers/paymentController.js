import pool from "../config/db.js";
import { createOrder } from "./orderController.js";
import { sendInvoiceEmailForOrder } from "./invoiceController.js";

// Test kart numaraları
const ALWAYS_DECLINE = "4000000000000002";
const ALWAYS_APPROVE = "4111111111111111";

// Luhn algoritması - kart numarası geçerli mi?
function luhnCheck(cardNumber) {
    const digits = cardNumber.replace(/\s/g, "").split("").reverse();
    let sum = 0;
    for (let i = 0; i < digits.length; i++) {
        let d = parseInt(digits[i]);
        if (i % 2 === 1) {
            d *= 2;
            if (d > 9) d -= 9;
        }
        sum += d;
    }
    return sum % 10 === 0;
}

// Son kullanma tarihi geçerli mi?
function isCardExpired(month, year) {
    const now = new Date();
    const expiry = new Date(`20${year}`, month - 1, 1);
    return expiry < now;
}

export const processPayment = async (req, res) => {
    const {
        cardNumber,
        cvv,
        expiryMonth,
        expiryYear,
        amount,
        cart_items,
        delivery_address,
        shippingAddress,
        billing_address,
        recipientEmail,
    } = req.body;
    const customerId = req.customer?.customerId ?? req.customer?.customer_id;

    if (!customerId) {
        return res.status(401).json({
            success: false,
            message: "Unauthorized.",
        });
    }

    // 1. Alan kontrolü
    if (!cardNumber || !cvv || !expiryMonth || !expiryYear || !amount) {
        return res.status(400).json({
            success: false,
            message: "Card number, CVV, expiry date and amount are required.",
        });
    }

    // 2. Kart numarası sadece rakam mı?
    const cleanCard = cardNumber.replace(/\s/g, "");
    if (!/^\d{16}$/.test(cleanCard)) {
        return res.status(400).json({
            success: false,
            message: "Card number must be 16 digits.",
        });
    }

    // 3. CVV kontrolü
    if (!/^\d{3,4}$/.test(cvv)) {
        return res.status(400).json({
            success: false,
            message: "CVV must be 3 or 4 digits.",
        });
    }

    // 4. Son kullanma tarihi kontrolü
    if (isCardExpired(expiryMonth, expiryYear)) {
        return res.status(400).json({
            success: false,
            message: "Card has expired.",
        });
    }

    // 5. Luhn kontrolü
    if (!luhnCheck(cleanCard)) {
        return res.status(400).json({
            success: false,
            message: "Invalid card number.",
        });
    }

    // 6. Tutar kontrolü
    if (amount <= 0) {
        return res.status(400).json({
            success: false,
            message: "Amount must be greater than 0.",
        });
    }

    // 7. Simülasyon mantığı
    const transactionId = "TXN-" + Date.now();

    if (cleanCard === ALWAYS_DECLINE) {
        return res.status(200).json({
            success: false,
            message: "Payment declined by bank.",
            transactionId,
        });
    }

    // 8. ödeme onaylandıysa order ı kaydet
    if (cart_items?.length) {
        try {
            const submittedDeliveryAddress = delivery_address ?? shippingAddress;
            const orderDeliveryAddress =
                submittedDeliveryAddress && typeof submittedDeliveryAddress === "object"
                    ? { ...submittedDeliveryAddress, billingAddress: billing_address }
                    : submittedDeliveryAddress;

            const { order_id } = await createOrder(
                customerId,
                cart_items,
                amount,
                orderDeliveryAddress
            );

            let invoiceEmailSent = true;
            let invoiceEmailError = null;
            try {
                await sendInvoiceEmailForOrder(order_id, customerId, {
                    recipientEmail,
                });
            } catch (emailError) {
                invoiceEmailSent = false;
                invoiceEmailError = emailError.message;
                console.error("Invoice email send failed after checkout:", emailError);
            }

            return res.status(200).json({
                success: true,
                message: "Payment approved.",
                transactionId,
                amount,
                order_id,
                invoiceEmailSent,
                ...(invoiceEmailError ? { invoiceEmailError } : {}),
            });
        } catch (error) {
            console.error("Order creation failed:", error);
            return res.status(500).json({
                success: false,
                message: "Payment approved but order could not be saved.",
            });
        }
    }

    // ALWAYS_APPROVE veya diğer geçerli kartlar → başarılı
    return res.status(200).json({
        success: true,
        message: "Payment approved.",
        transactionId,
        amount,
    });
};
