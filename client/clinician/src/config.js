/** Where caregivers sign in (the family web app). Set VITE_FAMILY_APP_URL in .env. */
const FAMILY_APP_URL = (import.meta.env.VITE_FAMILY_APP_URL || 'http://localhost:5173').replace(/\/$/, '')

export const FAMILY_SIGN_IN_URL = `${FAMILY_APP_URL}/sign-in`
