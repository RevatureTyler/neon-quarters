const { google } = require('googleapis');
const { OAuth2Client } = require('google-auth-library');

async function main() {
  const client = new OAuth2Client(
    process.env.ADSENSE_OAUTH_CLIENT_ID,
    process.env.ADSENSE_OAUTH_CLIENT_SECRET
  );
  client.setCredentials({ refresh_token: process.env.ADSENSE_OAUTH_REFRESH_TOKEN });
  const adsense = google.adsense({ version: 'v2', auth: client });
  const parent = `accounts/${process.env.ADSENSE_ACCOUNT_ID}`;

  const clients = await adsense.accounts.adclients.list({ parent });
  const displayClient = clients.data.adClients.find(c => c.productCode === 'AFC');
  console.log('Using ad client:', displayClient.name);

  try {
    const res = await adsense.accounts.adclients.adunits.create({
      parent: displayClient.name,
      requestBody: {
        displayName: 'Test Unit - Above Game',
        contentAdsSettings: { type: 'DISPLAY' },
      },
    });
    console.log('CREATE SUCCEEDED:', JSON.stringify(res.data, null, 2));
  } catch (e) {
    console.log('CREATE FAILED:', e.message);
  }
}
main();
