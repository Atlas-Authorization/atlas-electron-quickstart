// Shared config for the main + preload processes. Edit the placeholders or set
// the env vars before launching (see .env.example).
module.exports = {
  publishableKey: process.env.ATLAS_PUBLISHABLE_KEY || 'pk_test_xxx',
  // The instance's Frontend API origin.
  frontendApi: process.env.ATLAS_FRONTEND_API || 'https://atlasauth.net',
  // The first-party OAuth client id used for the token exchange.
  clientId: process.env.ATLAS_OAUTH_CLIENT_ID || '',
};
