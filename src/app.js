const express = require("express")
const cookieparser = require("cookie-parser")
const cors = require('cors')

// routes
const authRoutes = require('../src/routes/auth.routes')
const chatRoutes = require('../src/routes/chats.routes')

const app = express()

// middlewares
app.use(express.json({ limit: '10mb' })) // Add request size limit
app.use(cookieparser())

// Enhanced CORS configuration
app.use(cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    optionsSuccessStatus: 200
}))

// Security headers middleware
app.use((req, res, next) => {
    // Prevent clickjacking
    res.setHeader('X-Frame-Options', 'DENY')
    // Prevent MIME type sniffing
    res.setHeader('X-Content-Type-Options', 'nosniff')
    // Enable XSS protection
    res.setHeader('X-XSS-Protection', '1; mode=block')
    next()
})

// using routes
app.use('/api/auth', authRoutes)
app.use('/api/chat', chatRoutes)


module.exports = app


// in day 26 we deep dive into vector databse and its approach for Ai and LLM 