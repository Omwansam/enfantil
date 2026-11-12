const { prisma } = require('../config/db');
const jwt = require('jsonwebtoken');
const config = require('../config/env');
const bcrypt = require('bcryptjs');
const { getMembershipForAuth } = require('../services/membership.service');
const { OAuth2Client } = require('google-auth-library');
const axios = require('axios');
const appleSigninAuth = require('apple-signin-auth');

const googleClient = new OAuth2Client(config.GOOGLE_CLIENT_ID);

const sendTokenResponse = async (user, statusCode, res, message) => {
    if (!config.JWT_SECRET) {
        return res.status(500).json({
            success: false,
            error: 'Server misconfiguration: JWT_SECRET is not set',
        });
    }
    const token = jwt.sign({ id: user.id }, config.JWT_SECRET, { expiresIn: config.JWT_EXPIRES_IN });
    const membership = await getMembershipForAuth(user.id);
    const options = {
        expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        httpOnly: true,
        secure: config.NODE_ENV === 'production'
    };
    res.status(statusCode)
    .cookie('token', token, options)
    .json({ 
        success: true, 
        message, 
        token, 
        user: { 
            id: user.id, 
            name: user.name, 
            email: user.email, 
            role: user.role 
        },
        membership,
    });
};

const createOAuthPassword = async (provider, providerId) => {
    const seed = `${provider}:${providerId}:${Date.now()}`;
    return bcrypt.hash(seed, 10);
};

const getFallbackEmail = (provider, providerId) => {
    const safeProvider = String(provider || 'oauth').toLowerCase();
    return `${providerId}@${safeProvider}.oauth.local`;
};

const handleOAuthLogin = async (provider, providerId, email, name, res, next) => {
    try{
        if (!email) {
            email = getFallbackEmail(provider, providerId);
        }

        // Schema does not currently store provider metadata; email is the stable identity key.
        let user = await prisma.user.findUnique({
            where: { email }
        });

        if (user) {
            // Same stamp the local login path writes, so "last active" in the
            // admin console does not silently ignore social sign-ins. Failing
            // to record it must not cost the user their session.
            await prisma.user
                .update({ where: { id: user.id }, data: { lastLoginAt: new Date() } })
                .catch((error) => {
                    console.error('[oauth] could not stamp login:', error.message);
                });
            return await sendTokenResponse(user, 200, res, `Logged in with ${provider} successfully`);
        }

        // Create new user
        user = await prisma.user.create({
            data: {
                name: name || `${provider} User`,
                email,
                password: await createOAuthPassword(provider, providerId),
                role: 'investor',
                lastLoginAt: new Date()
            }
        });

        return await sendTokenResponse(user, 201, res, `Registered with ${provider} successfully`);

    } catch (error) {
        next(error);
    }
}


const googleAuth = async (req, res, next) => {
    try {
        const { idToken, accessToken } = req.body;
        if (!idToken && !accessToken) {
            return res.status(400).json({ success: false, error: 'Google token required.' });
        }

        if (idToken) {
            const ticket = await googleClient.verifyIdToken({
                idToken,
                audience: config.GOOGLE_CLIENT_ID,
            });
            const payload = ticket.getPayload();
            return await handleOAuthLogin('GOOGLE', payload.sub, payload.email, payload.name, res, next);
        }

        const { data } = await axios.get('https://www.googleapis.com/oauth2/v3/userinfo', {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        });
        return await handleOAuthLogin('GOOGLE', data.sub, data.email, data.name, res, next);
    } catch (error) {
        res.status(401).json({ success: false, error: 'Invalid Google Token' });
    }
};


const facebookAuth = async (req, res, next) => {
    try {
        const { accessToken } = req.body;
        if (!accessToken) return res.status(400).json({ success: false, error: 'Facebook access token required.' });

        // Verify with Facebook graph API
        const { data } = await axios.get(`https://graph.facebook.com/me?fields=id,name,email&access_token=${accessToken}`);
        
        await handleOAuthLogin('FACEBOOK', data.id, data.email, data.name, res, next);
    } catch (error) {
        res.status(401).json({ success: false, error: 'Invalid Facebook Token' });
    }
};

const appleAuth = async (req, res, next) => {
    try {
        const { idToken, name } = req.body; // Apple only sends the name on first login! Frontend MUST send it if available.
        if (!idToken) return res.status(400).json({ success: false, error: 'Apple ID token required.' });

        const appleIdTokenClaims = await appleSigninAuth.verifyIdToken(idToken, {
            audience: config.APPLE_CLIENT_ID,
            ignoreExpiration: true, // You may want to set this to false in production
        });
        
        const email = appleIdTokenClaims.email || null;
        const providerId = appleIdTokenClaims.sub;
        
        await handleOAuthLogin('APPLE', providerId, email, name || 'Apple User', res, next);
    } catch (error) {
        res.status(401).json({ success: false, error: 'Invalid Apple Token' });
    }
};


module.exports = {
    googleAuth,
    facebookAuth,
    appleAuth
};