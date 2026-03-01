const jwt = require("jsonwebtoken");
const userModel = require("../model/user.model");
const tokenBlacklistModel = require("../model/blackList.model");

async function authMiddleware(req, res, next) {
  // First, try token from cookies; otherwise check the Authorization header for a Bearer token.
  const token = req.cookies?.token || req.headers?.authorization?.split(" ")[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized: No token provided",
    });
  }

  // Check if the token is blacklisted (i.e., if the user has logged out)
  const isBlacklisted = await tokenBlacklistModel.findOne({ token });
  if (isBlacklisted) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized: Token has been blacklisted",
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);

    const user = await userModel.findById(decoded.userId);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized: User not found",
      });
    }

    // Attach user information to the request object for use in subsequent middleware and route handlers
    req.user = {
      id: user._id,
      email: user.email,
      name: user.name,
    };

    next();
  } catch (error) {
    console.error("Error in auth middleware:", error);
    return res.status(401).json({
      success: false,
      message: "Unauthorized: Invalid token",
    });
  }
}

async function authSystemUserMiddleware(req, res, next) {
  // First, try token from cookies; otherwise check the Authorization header for a Bearer token.
  const token = req.cookies?.token || req.headers?.authorization?.split(" ")[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized: No token provided",
    });
  }

  // Check if the token is blacklisted (i.e., if the user has logged out)
  const isBlacklisted = await tokenBlacklistModel.findOne({ token });
  if (isBlacklisted) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized: Token has been blacklisted",
    });
  }

  try {
    // Verify the token and decode it to get the user ID
    const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);

    // Fetch the user from the database using the decoded user ID, and include the systemUser field in the query result
    const user = await userModel.findById(decoded.userId).select("+systemUser");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized: User not found",
      });
    }

    if (!user.systemUser) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: User does not have system user privileges",
      });
    }

    req.user = user; // Attach the full user object to the request for use in route handlers that require system user privileges

    next();
  } catch (error) {
    console.error("Error in authSystemUserMiddleware:", error);
    return res.status(401).json({
      success: false,
      message: "Unauthorized: Invalid token",
    });
  }
}

module.exports = {
  authMiddleware,
  authSystemUserMiddleware,
};
