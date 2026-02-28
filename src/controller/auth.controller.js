const jwt = require("jsonwebtoken");
const userModel = require("../model/user.model");
const { sendRegistrationEmail } = require("../services/email.service");
const tokenBlacklistModel = require("../model/blacklist.model");

/* 
* user registration controller
* POST - /api/auth/register
*/

async function userRegisterController(req, res){
    try {
        const {name, email, password} = req.body;

        // Check if user already exists
        const existingUser = await userModel.findOne({email});

        // If user exists, return error
        if(existingUser){
            return res.status(422).json({
                success: false,
                message: "User already exists with this email"
            });
        }

        // Create new user
        const user = await userModel.create({
            name,
            email,
            password
        })

        // Generate JWT token after successful registration
        const token = jwt.sign({userId: user._id}, process.env.JWT_SECRET_KEY, {expiresIn: "4d"});

        // Set HttpOnly cookie
        res.cookie("token", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production", // Set secure flag in production
            sameSite: "strict", // This helps prevent CSRF attacks
            maxAge: 4 * 24 * 60 * 60 * 1000 // 4 days
        });

        res.status(201).json({
            success: true,
            message: "User registered successfully",
            data: {
                user: {
                    _id: user._id,
                    name: user.name,
                    email: user.email
                },
                token
            }
        });

        return await sendRegistrationEmail(user.email, user.name);

    } catch (error) {
        console.error("Error in user registration controller:", error);
        return res.status(500).json({
            success: false,
            message: "Internal Server Error"
        });
    }
}

/* 
* user login controller
* POST - /api/auth/login
*/
async function userLoginController(req, res){
    const {email, password} = req.body;

    try {
        // Check if user exists
        // We need to select the password field explicitly as it is set to select: false in the schema
        const user = await userModel.findOne({email}).select("+password");

        // If user does not exist, return error
        if(!user){
            return res.status(401).json({
                success: false,
                message: "Invalid email or password"
            });
        }

        // Compare passwords
        const isPasswordValid = await user.comparePassword(password);

        // If password is invalid, return error
        if(!isPasswordValid){
            return res.status(401).json({
                success: false,
                message: "Invalid email or password"
            });
        }

        // Generate JWT token
        const token = jwt.sign({userId: user._id}, process.env.JWT_SECRET_KEY, {expiresIn: "4d"});

        // Set HttpOnly cookie
        res.cookie("token", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production", // Set secure flag in production
            sameSite: "strict", // This helps prevent CSRF attacks
            maxAge: 4 * 24 * 60 * 60 * 1000 // 4 days
        });

        return res.status(200).json({
            success: true,
            message: "User logged in successfully",
            data: {
                user: {
                    _id: user._id,
                    name: user.name,
                    email: user.email
                },
                token
            }
        });

    } catch (error) {
        console.error("Error in user login controller:", error);
        return res.status(500).json({
            success: false,
            message: "Internal Server Error"
        });
    }
}

/* 
* user logout controller
* POST - /api/auth/logout
*/
async function userLogoutController(req, res){
    try {
        // Add token to blacklist
        const token = req.cookies.token || req.headers.authorization?.split(" ")[1]; // Get token from cookie or Authorization header

        // Clear the cookie on the client side
        res.clearCookie("token"); 

        // Blacklist the token to prevent future use until it expires
        if(token){
            await tokenBlacklistModel.create({token});
        }


        return res.status(200).json({
            success: true,
            message: "User logged out successfully"
        });

    } catch (error) {
        console.error("Error in user logout controller:", error);
        return res.status(500).json({
            success: false,
            message: "Internal Server Error"
        });
    }
}

module.exports = {
    userRegisterController,
    userLoginController,
    userLogoutController
};