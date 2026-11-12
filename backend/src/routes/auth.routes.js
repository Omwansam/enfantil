const express = require("express");
const {
    registerUser,
    registerAdmin,
    loginUser,
    logoutUser,
    getMe,
    forgotPassword,
    verifyResetToken,
    resetPassword,
} = require("../controllers/auth.controller");
const protect = require("../middleware/protect.middleware");
const authorize = require("../middleware/authorize.middleware");
const {
    loginLimiter,
    loginIpLimiter,
    registerLimiter,
    registerAttemptLimiter,
    forgotPasswordLimiter,
    forgotPasswordIpLimiter,
    resetPasswordLimiter,
} = require("../middleware/rate-limit.middleware");

const authRouter = express.Router();

authRouter.post("/register", registerAttemptLimiter, registerLimiter, registerUser);

authRouter.post(
    "/admin/register",
    protect,
    authorize("admin"),
    registerAdmin
);

// Two limiters per endpoint: the narrow one stops guessing at a single account,
// the wide one stops one host spraying attempts across many accounts.
authRouter.post("/login", loginIpLimiter, loginLimiter, loginUser);
authRouter.post("/logout", logoutUser);
authRouter.get("/me", protect, getMe);

authRouter.post(
    "/forgot-password",
    forgotPasswordIpLimiter,
    forgotPasswordLimiter,
    forgotPassword
);
authRouter.get("/reset-password", resetPasswordLimiter, verifyResetToken);
authRouter.post("/reset-password", resetPasswordLimiter, resetPassword);

module.exports = authRouter;