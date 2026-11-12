const jwt = require('jsonwebtoken');
const config = require('../config/env');
const { prisma } = require('../config/db');

/**
 * Attach `req.user` when a valid token is present, and carry on when it is not.
 *
 * For endpoints whose *response* changes with who is asking, rather than whose
 * access does — the member events list shows full detail to a member who can
 * attend and a teaser to everyone else. Using `protect` there would lock out
 * the visitors the teaser exists to convert; using nothing would leak every
 * event's location to the open internet.
 *
 * A bad or expired token is treated as no token: this middleware never rejects,
 * so a stale session degrades to the public view instead of erroring.
 */
const optionalAuth = async (req, _res, next) => {
    try {
        let token;
        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1];
        } else if (req.cookies && req.cookies.token) {
            token = req.cookies.token;
        }
        if (!token) return next();

        const decoded = jwt.verify(token, config.JWT_SECRET);
        const user = await prisma.user.findUnique({
            where: { id: decoded.id },
            select: { id: true, name: true, email: true, role: true, passwordChangedAt: true },
        });
        if (!user) return next();

        // Same post-password-change invalidation as `protect`; a revoked session
        // must not keep member-level visibility here either.
        if (user.passwordChangedAt && decoded.iat) {
            const changedAtSec = Math.floor(user.passwordChangedAt.getTime() / 1000);
            if (decoded.iat < changedAtSec) return next();
        }

        req.user = user;
        return next();
    } catch {
        // Invalid/expired token: fall through as an anonymous visitor.
        return next();
    }
};

module.exports = optionalAuth;