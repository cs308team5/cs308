import jwt from "jsonwebtoken";

const authMiddleware = (req, res, next) => {
    // 1. Header'dan token'ı al
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ message: "No token provided" });
    }

    const token = authHeader.split(" ")[1];

    // 2. Token'ı doğrula
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.customer = decoded; // customerId, email, name artık her route'da erişilebilir
        next();
    } catch (error) {
        return res.status(401).json({ message: "Invalid or expired token" });
    }
};

export default authMiddleware;