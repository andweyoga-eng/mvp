import { OAuth2Client } from 'google-auth-library';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import type { Express } from 'express';
import { storage } from './storage';
import {
  AUTH_COOKIE_NAME,
  OAUTH_KEEP_COOKIE_NAME,
  buildAuthCookieOptions,
  keepSignedInFromValue,
} from './auth-cookie';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;

if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
  console.log('Google OAuth credentials not found. Google sign-in will be disabled.');
}

// Create OAuth2 client for token verification
export const oauth2Client = new OAuth2Client(GOOGLE_CLIENT_ID);

export function setupGoogleAuth(app: Express) {
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    return; // Skip setup if credentials are missing
  }

  // Configure Google OAuth strategy
  passport.use(new GoogleStrategy({
    clientID: GOOGLE_CLIENT_ID,
    clientSecret: GOOGLE_CLIENT_SECRET,
    callbackURL: "/api/auth/google/callback"
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      // Check if user already exists
      let user = await storage.getUserByEmail(profile.emails?.[0]?.value || '');
      
      if (!user) {
        // Create new user from Google profile
        const userData = {
          email: profile.emails?.[0]?.value || '',
          name: profile.displayName || '',
          password: '', // No password needed for OAuth users
          primaryMobile: '', // Will need to be filled later
          emergencyMobile: '', // Will need to be filled later
          primaryMobileCountryCode: '+91',
          emergencyMobileCountryCode: '+91',
          secondaryMobile: null,
          secondaryMobileCountryCode: null,
        };
        
        user = await storage.createUser(userData);
        // Mark email as verified since it comes from Google
        await storage.verifyUserEmail(user.id);
      }
      
      return done(null, user);
    } catch (error) {
      return done(error, undefined);
    }
  }));

  // Google OAuth routes
  app.get('/api/auth/google',
    passport.authenticate('google', { scope: ['profile', 'email'] })
  );

  app.get('/api/auth/google/callback',
    passport.authenticate('google', { session: false }),
    (req, res) => {
      const { generateToken } = require('./auth');
      const user = req.user as any;
      const token = generateToken(user.id);

      // Honour the "Keep me signed in" preference captured at sign-in start:
      // ON → persistent 7-day cookie; OFF → session cookie cleared on browser close.
      const keepSignedIn = keepSignedInFromValue((req as any).cookies?.[OAUTH_KEEP_COOKIE_NAME]);
      res.clearCookie(OAUTH_KEEP_COOKIE_NAME);
      res.cookie(AUTH_COOKIE_NAME, token, buildAuthCookieOptions(keepSignedIn));

      res.redirect('/dashboard?loginSuccess=true');
    }
  );
}

export async function verifyGoogleToken(token: string) {
  if (!GOOGLE_CLIENT_ID) {
    throw new Error('Google OAuth not configured');
  }
  
  try {
    const ticket = await oauth2Client.verifyIdToken({
      idToken: token,
      audience: GOOGLE_CLIENT_ID,
    });
    
    const payload = ticket.getPayload();
    return payload;
  } catch (error) {
    throw new Error('Invalid Google token');
  }
}