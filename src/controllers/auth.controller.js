

const userModel = require("../models/user.model")
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')

// Password validation function
const validatePassword = (password) => {
    // At least 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special character
    const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,20}$/;
    return regex.test(password);
}

const registerUser = async(req,res)=>{
    const {fullname : {firstname , lastname}, email ,password} = req.body
    
    if (!firstname || !lastname || !email || !password) {
        return res.status(400).json({ message: "Provide required details"});
    }

    // Password validation
    if (!validatePassword(password)) {
        return res.status(400).json({ 
            message: "Password must be 8-20 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character (@$!%*?&)" 
        });
    }

    const isUserExist = await userModel.findOne({ email})
    if(isUserExist){ 
        return res.status(400).json({ message : "User already exists"})
    }

    // Hashing password
    const HashPassword = await bcrypt.hash(password,10)
    const user = await userModel.create({
        fullname : {firstname , lastname }, 
        email, 
        password : HashPassword
    })

    // Token with expiry (24 hours)
    const token = jwt.sign(
        {id: user._id}, 
        process.env.JWT_SECRET, 
        { expiresIn: '24h' }
    )

    // Secure cookie options
    const cookieOptions = {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 24 * 60 * 60 * 1000 // 24 hours in milliseconds
    }

    res.cookie("token", token, cookieOptions)
    res.status(201).json({
        message : "User registered successfully",
        user: {
            email : user.email,
            _id : user._id,
            fullname : user.fullname
        }
    })
}

// FIXED LOGIN FUNCTION WITH PROPER STATUS CODES
const loginUser = async(req,res)=>{
    const { email ,password } = req.body
    
    if (!email || !password) {
        return res.status(400).json({ message: "Please provide email and password" })
    }

    // STEP 1: Check if user exists - 404 if not found
    const user = await userModel.findOne({ email })
    if(!user){
        return res.status(404).json({ message: "User Not Found. Please register first." })
    }

    // STEP 2: Check password - 401 if incorrect
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
        return res.status(401).json({ message: "Invalid Credentials." })
    }

    // SUCCESS: Generate token and login
    const token = jwt.sign(
        {id: user._id}, 
        process.env.JWT_SECRET, 
        { expiresIn: '24h' }
    )

    // Secure cookie options
    const cookieOptions = {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 24 * 60 * 60 * 1000 // 24 hours in milliseconds
    }

    res.cookie("token", token, cookieOptions)
    res.status(200).json({
        message : "Logged in successfully",
        user: {
            email : user.email,
            _id : user._id,
            fullname : user.fullname
        }
    })
}

const logoutUser = async(req,res)=>{
    try {
        // Clear the cookie
        res.clearCookie("token", {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict'
        })
        
        res.status(200).json({
            message: "Logged out successfully"
        })
    } catch (error) {
        res.status(500).json({
            message: "Error during logout"
        })
    }
}

module.exports = {
    registerUser,
    loginUser,
    logoutUser
}
