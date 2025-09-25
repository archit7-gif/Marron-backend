const userModel = require('../models/user.model');
const jwt = require('jsonwebtoken');

const authUser = async (req, res, next) => {
    const { token } = req.cookies;
    
    if (!token) {
        return res.status(401).json({ message: "No token provided, unauthorized" })
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Check if token is expired (jwt.verify handles this automatically)
        const user = await userModel.findById(decoded.id).select("-password");
        
        if (!user) {
            return res.status(404).json({ message: "User not found" })
        }

        req.user = user;
        next();
    } catch (err) {
        // Handle specific JWT errors
        if (err.name === 'TokenExpiredError') {
            // Clear expired cookie
            res.clearCookie("token", {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict'
            })
            return res.status(401).json({ message: "Token expired, please login again" })
        }
        
        if (err.name === 'JsonWebTokenError') {
            return res.status(403).json({ message: "Invalid token" })
        }
        
        return res.status(403).json({ message: "Authentication failed" })
    }
};

module.exports = { authUser };

