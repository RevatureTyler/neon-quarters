// Temporary diagnostic: prints AdSense account/site/ad-unit status.
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

  console.log('=== account ===');
  console.log(JSON.stringify((await adsense.accounts.get({ name: parent })).data, null, 2));

  console.log('=== sites ===');
  try {
    console.log(JSON.stringify((await adsense.accounts.sites.list({ parent })).data, null, 2));
  } catch (e) { console.log('sites FAILED:', e.message); }

  console.log('=== ad clients ===');
  let adClients = [];
  try {
    const res = await adsense.accounts.adclients.list({ parent });
    adClients = res.data.adClients || [];
    console.log(JSON.stringify(res.data, null, 2));
  } catch (e) { console.log('adclients FAILED:', e.message); }

  for (const c of adClients) {
    console.log(`=== ad units for ${c.name} ===`);
    try {
      console.log(JSON.stringify((await adsense.accounts.adclients.adunits.list({ parent: c.name })).data, null, 2));
    } catch (e) { console.log('adunits FAILED:', e.message); }
  }
}
main().catch((e) => { console.error('FAILED:', e.message); process.exit(1); });
