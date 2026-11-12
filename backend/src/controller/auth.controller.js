const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const config = require('../config/env');
const { prisma } = require('../config/db');
const { getMembershipForAuth } = require('../services/membership.service');
const { sendPasswordResetEmail } = require('../services/mailer.service');
const { validateEmailForSignup, isPlausibleEmail, normalizeEmail } = require('../utils/email-validation.util');
const { validatePassword } = require('../utils/password-policy.util');

const secret = config.JWT_SECRET;
const expiresIn = config.JWT_EXPIRES_IN;

// Work factor for bcrypt. 12 costs ~250ms on commodity hardware — high enough to
// make offline cracking of a stolen hash expensive, low enough not to become a
// DoS vector on the login path.
const BCRYPT_ROUNDS = 12;

// Online-guessing brake that survives IP rotation: the counter lives on the
// account, so switching IPs does not reset it.
//
// Deliberately lower than the per-IP+email rate limit (8) so this is the check a
// real person trips first — its message names the cooldown and points at the
// reset link, where the limiter's can only say "too many attempts". The limiter
// remains the backstop for floods that outrun a single account.
const MAX_FAILED_LOGINS = 5;
const LOCKOUT_MS = 15 * 60 * 1000;

const RESET_TOKEN_TTL_MINUTES = 30;

/**
 * A real bcrypt hash used when the email does not exist, so the "unknown user"
 * and "wrong password" paths burn comparable CPU. Without it, response timing
 * reveals which emails are registered.
 */
const DUMMY_HASH = bcrypt.hashSync('fibi-timing-equalizer-not-a-real-password', BCRYPT_ROUNDS);

/** Match jsonwebtoken-style strings (e.g. 1d, 24h, 3600s) for httpOnly cookie maxAge */
function jwtExpiresToMs(value) {
    if (typeof value === "number" && Number.isFinite(value)) {
        return value * 24 * 60 * 60 * 1000;
    }
    const s = String(value || "").trim();
    const m = /^(\d+)(s|m|h|d)$/i.exec(s);
    if (!m) return 7 * 24 * 60 * 60 * 1000;
    const n = parseInt(m[1], 10);
    const u = m[2].toLowerCase();
    const mult = { s: 1000, m: 60 * 1000, h: 60 * 60 * 1000, d: 24 * 60 * 60 * 1000 };
    return n * mult[u];
}

function clientIp(req) {
    return req.ip || req.socket?.remoteAddress || null;
}

async function createRegisteredUser(body, role) {
    const { name, password, dob, country, idType, idNumber } = body;
    if (!body.email || !password || !name) {
        return {
            error: { status: 400, body: { success: false, error: "Name, email and password are required" } },
        };
    }

    if (typeof name !== 'string' || name.trim().length < 2 || name.trim().length > 120) {
        return {
            error: { status: 400, body: { success: false, error: "Enter your full name" } },
        };
    }

    // Deliverability-based admission: real domains pass, placeholder and
    // throwaway domains do not. See utils/email-validation.util.js.
    const emailCheck = await validateEmailForSignup(body.email);
    if (!emailCheck.ok) {
        return { error: { status: 400, body: { success: false, error: emailCheck.error } } };
    }
    const email = emailCheck.email;

    const passwordCheck = validatePassword(password, { email, name });
    if (!passwordCheck.ok) {
        return { error: { status: 400, body: { success: false, error: passwordCheck.error } } };
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
        return { error: { status: 409, body: { success: false, error: "An account with this email already exists" } } };
    }

    const hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const parsedDob = dob ? new Date(dob) : null;

    if (parsedDob && Number.isNaN(parsedDob.getTime())) {
        return { error: { status: 400, body: { success: false, error: "Enter a valid date of birth" } } };
    }

    // Land ownership is age-restricted; enforce server-side rather than trusting
    // the client-side check on the signup wizard.
    if (parsedDob) {
        const ageMs = Date.now() - parsedDob.getTime();
        if (ageMs < 18 * 365.25 * 24 * 60 * 60 * 1000) {
            return { error: { status: 400, body: { success: false, error: "You must be at least 18 years old to register" } } };
        }
    }

    let mappedIdType = idType;
    if (idType === "national-id") mappedIdType = "national_id";
    if (idType === "drivers-license") mappedIdType = "drivers_license";

    try {
        const user = await prisma.user.create({
            data: {
                name: name.trim(),
                email,
                password: hashedPassword,
                dob: parsedDob,
                country,
                idType: mappedIdType,
                idNumber,
                role,
                passwordChangedAt: new Date(),
            },
        });
        return { user };
    } catch (err) {
        // Unique violation: two concurrent signups raced past the findUnique above.
        if (err && err.code === 'P2002') {
            return { error: { status: 409, body: { success: false, error: "An account with this email already exists" } } };
        }
        throw err;
    }
}

const sendTokenResponse = async (user, statusCode, res, message) => {
    if (!secret) {
        return res.status(500).json({
            success: false,
            error: "Server misconfiguration: JWT_SECRET is not set",
        });
    }

    const token = jwt.sign({ id: user.id }, secret, { expiresIn });
    const membershipPayload = await getMembershipForAuth(user.id);

    const options = {
        maxAge: jwtExpiresToMs(expiresIn),
        httpOnly: true,
        // Blocks the cookie from riding along on cross-site form posts, which is
        // what makes CSRF against these endpoints impractical.
        sameSite: 'lax',
        path: '/',
    };

    if (config.NODE_ENV === 'production') {
        options.secure = true;
    }


    res.status(statusCode)
    .cookie('token', token, options)
    .json({
        success: true,
        token,
        message,
        user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
        },
        membership: membershipPayload,
    });
};

const registerUser = async (req, res, next) => {
    try {
        const result = await createRegisteredUser(req.body, "investor");
        if (result.error) {
            return res.status(result.error.status).json(result.error.body);
        }
        await sendTokenResponse(result.user, 201, res, "User registered successfully");
    } catch (error) {
        next(error);
    }
};

const registerAdmin = async (req, res, next) => {
    try {
        const result = await createRegisteredUser(req.body, "admin");
        if (result.error) {
            return res.status(result.error.status).json(result.error.body);
        }
        const { user } = result;
        res.status(201).json({
            success: true,
            message: "Admin user created successfully",
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
            },
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Single sign-in path for every role.
 *
 * The caller does not declare who they are — the stored `user.role` decides, and
 * the client routes on the role returned here. A `role` field in the request body
 * is ignored outright: trusting it would let a caller assert their own privilege
 * level, and requiring it only ever produced confusing "wrong role" failures for
 * people who picked the wrong tab.
 */
const loginUser = async (req, res, next) => {
    try {
        const email = normalizeEmail(req.body?.email);
        const { password } = req.body || {};

        if (!email || !password || typeof password !== 'string') {
            return res.status(400).json({
                success: false,
                error: 'Email and password are required'
            });
        }

        if (!isPlausibleEmail(email)) {
            // Same shape as a credential failure so this does not become an
            // oracle for which addresses are well-formed enough to exist.
            return res.status(401).json({ success: false, error: 'Invalid email or password' });
        }

        const user = await prisma.user.findUnique({ where: { email } });

        // Account lockout is checked before the password compare so that a
        // locked account cannot be probed at all during the cooldown.
        if (user?.lockedUntil && user.lockedUntil > new Date()) {
            const minutes = Math.max(1, Math.ceil((user.lockedUntil - Date.now()) / 60000));
            return res.status(423).json({
                success: false,
                error: `Account temporarily locked after too many failed attempts. Try again in ${minutes} minute${minutes === 1 ? '' : 's'}, or reset your password.`,
            });
        }

        // Always run a compare, even with no user, to keep response time flat.
        const validPassword = await bcrypt.compare(password, user ? user.password : DUMMY_HASH);

        if (!user || !validPassword) {
            if (user) {
                const attempts = user.failedLoginAttempts + 1;
                const locked = attempts >= MAX_FAILED_LOGINS;
                await prisma.user.update({
                    where: { id: user.id },
                    data: {
                        failedLoginAttempts: locked ? 0 : attempts,
                        lockedUntil: locked ? new Date(Date.now() + LOCKOUT_MS) : null,
                    },
                });
            }
            // One message for "no such account" and "wrong password" — anything
            // more specific enumerates registered investors.
            return res.status(401).json({
                success: false,
                error: 'Invalid email or password'
            });
        }

        // One write covers both concerns: clear any failed-attempt state and
        // stamp the sign-in. `lastLoginAt` only feeds the admin console's
        // "last active" column, so a failure here must not cost the user their
        // login — hence the catch rather than an await that can reject.
        await prisma.user
            .update({
                where: { id: user.id },
                data: {
                    ...(user.failedLoginAttempts > 0 || user.lockedUntil
                        ? { failedLoginAttempts: 0, lockedUntil: null }
                        : {}),
                    lastLoginAt: new Date(),
                },
            })
            .catch((error) => {
                console.error('[auth] could not stamp login:', error.message);
            });

        await sendTokenResponse(user, 200, res, 'User logged in successfully');
    } catch (error) {
        next(error);
    }
}

const getMe = async (req, res, next) => {
    try {
        const membershipPayload = await getMembershipForAuth(req.user.id);
        res.status(200).json({
            success: true,
            user: {
                id: req.user.id,
                name: req.user.name,
                email: req.user.email,
                role: req.user.role,
            },
            membership: membershipPayload,
        });
    } catch (error) {
        next(error);
    }
};

const logoutUser = async (req, res, next) => {
    try {
        // Must mirror the attributes used when setting it, or the browser keeps
        // the original cookie alongside this one.
        res.clearCookie('token', {
            httpOnly: true,
            sameSite: 'lax',
            path: '/',
            ...(config.NODE_ENV === 'production' ? { secure: true } : {}),
        });
        res.status(200).json({
            success: true,
            message: 'User logged out successfully'
        });
    } catch (error) {
        next(error);
    }
}

/* ------------------------------------------------------------------------- *
 * Password reset
 * ------------------------------------------------------------------------- */

function hashResetToken(rawToken) {
    return crypto.createHash('sha256').update(rawToken).digest('hex');
}

/**
 * Step 1: request a reset link.
 *
 * Always answers 200 with the same body, whether or not the address is
 * registered. A response that differed would turn this endpoint into a free
 * membership-list oracle for anyone with a list of emails to test.
 */
const forgotPassword = async (req, res, next) => {
    try {
        const email = normalizeEmail(req.body?.email);

        const genericResponse = {
            success: true,
            message: 'If an account exists for that address, a reset link is on its way.',
        };

        if (!email || !isPlausibleEmail(email)) {
            return res.status(200).json(genericResponse);
        }

        const user = await prisma.user.findUnique({ where: { email } });

        // OAuth-only accounts have no password to reset. Still answered
        // identically so the account's existence stays hidden.
        if (!user || user.authProvider !== 'LOCAL') {
            return res.status(200).json(genericResponse);
        }

        // Retire outstanding tokens: a fresh request should make earlier links
        // dead, so a leaked older email cannot still be redeemed.
        await prisma.passwordResetToken.updateMany({
            where: { userId: user.id, usedAt: null },
            data: { usedAt: new Date() },
        });

        const rawToken = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MINUTES * 60 * 1000);

        await prisma.passwordResetToken.create({
            data: {
                userId: user.id,
                tokenHash: hashResetToken(rawToken),
                expiresAt,
                requestIp: clientIp(req),
            },
        });

        const base = (config.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');
        const resetUrl = `${base}/reset-password?token=${rawToken}`;

        try {
            await sendPasswordResetEmail({
                to: user.email,
                name: user.name,
                resetUrl,
                expiresInMinutes: RESET_TOKEN_TTL_MINUTES,
            });
        } catch (mailError) {
            // Log for operators, but keep the response generic — a 500 here would
            // also reveal that the address exists.
            console.error('Password reset email failed to send:', mailError.message);
        }

        return res.status(200).json(genericResponse);
    } catch (error) {
        next(error);
    }
};

async function findLiveResetToken(rawToken) {
    if (typeof rawToken !== 'string' || !/^[a-f0-9]{64}$/i.test(rawToken)) {
        return null;
    }
    const record = await prisma.passwordResetToken.findUnique({
        where: { tokenHash: hashResetToken(rawToken) },
        include: { user: true },
    });
    if (!record || record.usedAt || record.expiresAt <= new Date()) {
        return null;
    }
    return record;
}

/** Step 2: let the reset page tell a valid link from a stale one before showing the form. */
const verifyResetToken = async (req, res, next) => {
    try {
        const record = await findLiveResetToken(req.query?.token);
        if (!record) {
            return res.status(400).json({
                success: false,
                error: 'This reset link is invalid or has expired. Request a new one.',
            });
        }
        return res.status(200).json({ success: true, email: record.user.email });
    } catch (error) {
        next(error);
    }
};

/** Step 3: consume the token and set the new password. */
const resetPassword = async (req, res, next) => {
    try {
        const { token, password } = req.body || {};

        const record = await findLiveResetToken(token);
        if (!record) {
            return res.status(400).json({
                success: false,
                error: 'This reset link is invalid or has expired. Request a new one.',
            });
        }

        const passwordCheck = validatePassword(password, {
            email: record.user.email,
            name: record.user.name,
        });
        if (!passwordCheck.ok) {
            return res.status(400).json({ success: false, error: passwordCheck.error });
        }

        const sameAsOld = await bcrypt.compare(password, record.user.password);
        if (sameAsOld) {
            return res.status(400).json({
                success: false,
                error: 'Choose a password you have not used before.',
            });
        }

        const hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS);
        const now = new Date();

        // One transaction so a token can never be spent without the password
        // actually changing, and vice versa.
        await prisma.$transaction([
            prisma.user.update({
                where: { id: record.userId },
                data: {
                    password: hashedPassword,
                    // Invalidates every JWT issued before now (see protect.middleware),
                    // so a session an attacker already holds dies with the reset.
                    passwordChangedAt: now,
                    failedLoginAttempts: 0,
                    lockedUntil: null,
                },
            }),
            // Single-use, and any sibling tokens die with it.
            prisma.passwordResetToken.updateMany({
                where: { userId: record.userId, usedAt: null },
                data: { usedAt: now },
            }),
        ]);

        return res.status(200).json({
            success: true,
            message: 'Password updated. You can now sign in with your new password.',
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    registerUser,
    registerAdmin,
    loginUser,
    logoutUser,
    getMe,
    forgotPassword,
    verifyResetToken,
    resetPassword,
};