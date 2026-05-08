import pool from "../config/db.js";


function formatDeliveryAddress(deliveryAddress) {
    if (!deliveryAddress) {
        return "";
    }

    if (typeof deliveryAddress === "string") {
        return deliveryAddress.trim();
    }

    return [
        deliveryAddress.address,
        deliveryAddress.street,
        deliveryAddress.city,
        deliveryAddress.state,
        deliveryAddress.zip,
        deliveryAddress.country,
    ]
        .filter(Boolean)
        .join(", ")
        .trim();
}

function formatOptionalAddress(address) {
    if (!address) {
        return null;
    }

    if (typeof address === "string") {
        return address.trim() || null;
    }

    const formattedAddress = [
        address.address,
        address.street,
        address.city,
        address.state,
        address.zip,
        address.country,
    ]
        .filter(Boolean)
        .join(", ")
        .trim();

    return formattedAddress || null;
}

export async function createOrder(customer_id, cart_items, total_price, deliveryAddress) {
    const formattedDeliveryAddress = formatDeliveryAddress(deliveryAddress);
    const formattedBillingAddress = formatOptionalAddress(deliveryAddress?.billingAddress);
    const phone =
        typeof deliveryAddress === "object" ? deliveryAddress.phone?.trim() || null : null;

    const client = await pool.connect();
    try {
        await client.query("BEGIN");

        const orderResult = await client.query(
            `INSERT INTO orders (customer_id, total_price, status) VALUES ($1, $2, 'pending') RETURNING order_id`,
            [customer_id, total_price]
        );
        const order_id = orderResult.rows[0].order_id;

        for (const item of cart_items) {
            await client.query(
                `INSERT INTO order_items (order_id, product_id, quantity, unit_price) VALUES ($1, $2, $3, $4)`,
                [order_id, item.product_id, item.quantity, item.price ?? item.unit_price]
            );

            const stockResult = await client.query(
                `UPDATE products SET stock_quantity = stock_quantity - $1
                 WHERE id = $2 AND stock_quantity >= $1
                 RETURNING stock_quantity`,
                [item.quantity, item.product_id]
            );

            if (stockResult.rowCount === 0) {
                throw new Error(`Insufficient stock for product ${item.product_id}.`);
            }
        }

        await client.query(
            `INSERT INTO deliveries (order_id, customer_id, delivery_address, billing_address, phone, status)
             VALUES ($1, $2, $3, $4, $5, 'processing')`,
            [order_id, customer_id, formattedDeliveryAddress, formattedBillingAddress, phone]
        );

        await client.query(
            `DELETE FROM cart_items WHERE customer_id = $1`,
            [customer_id]
        );

        await client.query("COMMIT");
        return { success: true, order_id };
    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
}
