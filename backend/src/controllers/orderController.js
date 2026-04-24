import pool from "../config/db.js";


function formatDeliveryAddress(deliveryAddress) {
    if (!deliveryAddress) {
        return null;
    }

    if (typeof deliveryAddress === "string") {
        return deliveryAddress.trim();
    }

    const addressParts = [
        deliveryAddress.address,
        deliveryAddress.street,
        deliveryAddress.city,
        deliveryAddress.state,
        deliveryAddress.zip,
        deliveryAddress.country,
    ];

    return addressParts.filter(Boolean).join(", ").trim();
}

export async function createOrder(customer_id, cart_items, total_price, deliveryAddress) {
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
        }

        const formattedDeliveryAddress = formatDeliveryAddress(deliveryAddress);

        await client.query(
            `INSERT INTO deliveries (order_id, customer_id, delivery_address)
             VALUES ($1, $2, $3)`,
            [order_id, customer_id, formattedDeliveryAddress || null]
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
