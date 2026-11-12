const express = require('express');
const { googleAuth,facebookAuth,appleAuth } = require('../controllers/oauth.controller');
const { oauthLimiter } = require('../middleware/rate-limit.middleware');
const oauthRouter = express.Router();

// Each of these verifies the provider assertion with an outbound call, so an
// unthrottled endpoint burns our own request budget as well as CPU.

// Google OAuth

oauthRouter.post('/google', oauthLimiter, googleAuth);

// Facebook OAuth
oauthRouter.post('/facebook', oauthLimiter, facebookAuth);

// Apple OAuth
oauthRouter.post('/apple', oauthLimiter, appleAuth);

module.exports = oauthRouter;