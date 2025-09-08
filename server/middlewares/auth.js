import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export const protect = async (req, res, next) => {
    // Extract token from "Authorization: Bearer <token>"
    let token = req.headers.authorization;

    if (!token) {
        return res.status(403).json({ message: 'No token provided' });
    }

    try {
        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const userId = decoded.id;

        // Find the user in the database
        const user = await User.findById(userId);

        if (!user) {
            // User not found, return 404
            return res.status(404).json({ success: false, message: "Not authorized, user not found" });
        }

        // Attach user info to the request object
        req.user = user;

        // Proceed to the next middleware or route handler
        next();
    } catch (error) {
        // If token is invalid or expired, return 401
        return res.status(401).json({ message: "Not authorized, token failed" });
    }
};
