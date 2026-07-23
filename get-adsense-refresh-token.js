// One-time helper: exchanges your OAuth client ID/secret for a long-lived
// refresh token that daily-revenue-report.js can then use unattended,
// since AdSense's API doesn't support plain service-account access.
//
// Usage:
//   ADSENSE_OAUTH_CLIENT_ID=... ADSENSE_OAUTH_CLIENT_SECRET=... node get-adsense-refresh-token.js
//
// It prints a URL. Open it, log in as the AdSense account owner, approve
// access, and paste the resulting code back here when prompted.

const { OAuth2Client } = require('google-auth-library');
const readline = require('readline');

const CLIENT_ID = process.env.ADSENSE_OAUTH_CLIENT_ID;
const CLIENT_SECRET = process.env.ADSENSE_OAUTH_CLIENT_SECRET;
const REDIRECT_URI = 'urn:ietf:wg:oauth:2.0:oob'; // out-of-band, for Desktop app clients

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('Set ADSENSE_OAUTH_CLIENT_ID and ADSENSE_OAUTH_CLIENT_SECRET first.');
  process.exit(1);
}

const client = new OAuth2Client(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);

const authUrl = client.generateAuthUrl({
  access_type: 'offline',
  prompt: 'consent', // forces a refresh_token even if you've authorized this app before
  scope: ['https://www.googleapis.com/auth/adsense.readonly'],
});

console.log('\nOpen this URL, log in as the AdSense account owner, and approve access:\n');
console.log(authUrl);
console.log();

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
rl.question('Paste the code you get back here: ', async (code) => {
  rl.close();
  try {
    const { tokens } = await client.getToken(code.trim());
    if (!tokens.refresh_token) {
      console.error('\nNo refresh token came back. Revoke this app\'s access at https://myaccount.google.com/permissions and run this again (the prompt=consent step above should force one).');
      process.exit(1);
    }
    console.log('\nRefresh token:\n');
    console.log(tokens.refresh_token);
    console.log('\nSave this as the ADSENSE_OAUTH_REFRESH_TOKEN secret.');
  } catch (err) {
    console.error('\nFailed to exchange code for tokens:', err.message || err);
    process.exit(1);
  }
});
