// Pulls yesterday's AdSense earnings and GA4 traffic and emails a summary.
// Run manually with `npm run report`, or via the daily-report GitHub Action.
//
// GA4 uses the service account key (service-account.json) directly, since
// AdSense's API doesn't support plain service-account access (invites sent
// to a service account's email can never be "accepted"). AdSense instead
// uses OAuth with a refresh token obtained once via get-adsense-refresh-token.js.
//
// Required environment variables:
//   ADSENSE_ACCOUNT_ID         e.g. pub-1234567890123456
//   GA4_PROPERTY_ID            e.g. 123456789
//   ADSENSE_OAUTH_CLIENT_ID
//   ADSENSE_OAUTH_CLIENT_SECRET
//   ADSENSE_OAUTH_REFRESH_TOKEN
//
// Optional (both must be set together to actually send an email; if either
// is missing, the report is just printed to the console/log instead):
//   EMAIL_USER           the Gmail address to send from and to
//   EMAIL_APP_PASSWORD   a Gmail App Password (myaccount.google.com/apppasswords)
//
// Also requires a service-account.json key file in this directory, granted
// read access to the GA4 property.

const { google } = require('googleapis');
const { OAuth2Client } = require('google-auth-library');
const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

const KEY_FILE = path.join(__dirname, 'service-account.json');
const EMAIL_CONFIGURED = Boolean(process.env.EMAIL_USER && process.env.EMAIL_APP_PASSWORD);

function requireEnv() {
  const required = [
    'ADSENSE_ACCOUNT_ID',
    'GA4_PROPERTY_ID',
    'ADSENSE_OAUTH_CLIENT_ID',
    'ADSENSE_OAUTH_CLIENT_SECRET',
    'ADSENSE_OAUTH_REFRESH_TOKEN',
  ];
  const missing = required.filter((key) => !process.env[key]);
  if (missing.length) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
  if (!fs.existsSync(KEY_FILE)) {
    throw new Error(`${KEY_FILE} not found. Download your service account key and save it there.`);
  }
}

function yesterdayLabel() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

async function getAdSenseEarnings(auth) {
  const adsense = google.adsense({ version: 'v2', auth });
  const account = `accounts/${process.env.ADSENSE_ACCOUNT_ID}`;

  const res = await adsense.accounts.reports.generate({
    account,
    dateRange: 'YESTERDAY',
    metrics: ['ESTIMATED_EARNINGS', 'CLICKS', 'IMPRESSIONS', 'PAGE_VIEWS'],
  });

  const row = res.data.rows && res.data.rows[0];
  if (!row) {
    return { earnings: '0.00', clicks: '0', impressions: '0', pageViews: '0' };
  }
  const [earnings, clicks, impressions, pageViews] = row.cells.map((c) => c.value);
  return { earnings, clicks, impressions, pageViews };
}

async function getGA4Metrics(auth) {
  const analyticsData = google.analyticsdata({ version: 'v1beta', auth });

  const res = await analyticsData.properties.runReport({
    property: `properties/${process.env.GA4_PROPERTY_ID}`,
    requestBody: {
      dateRanges: [{ startDate: 'yesterday', endDate: 'yesterday' }],
      metrics: [
        { name: 'activeUsers' },
        { name: 'sessions' },
        { name: 'screenPageViews' },
        { name: 'averageSessionDuration' },
      ],
    },
  });

  const row = res.data.rows && res.data.rows[0];
  if (!row) {
    return { activeUsers: '0', sessions: '0', pageViews: '0', avgSessionDuration: 0 };
  }
  const [activeUsers, sessions, pageViews, avgSessionDuration] = row.metricValues.map((m) => m.value);
  return { activeUsers, sessions, pageViews, avgSessionDuration: Math.round(Number(avgSessionDuration)) };
}

function printReport({ date, adsense, ga4 }) {
  console.log(`\nNeon Quarters daily report — ${date}`);
  console.log('AdSense:', adsense);
  console.log('GA4:', ga4);
  console.log('\n(EMAIL_USER / EMAIL_APP_PASSWORD not set, so no email was sent.)');
}

async function sendReportEmail({ date, adsense, ga4 }) {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_APP_PASSWORD,
    },
  });

  const subject = `Neon Quarters daily report: $${adsense.earnings} on ${date}`;
  const html = `
    <h2>Neon Quarters &mdash; ${date}</h2>
    <h3>AdSense</h3>
    <ul>
      <li><strong>Estimated earnings:</strong> $${adsense.earnings}</li>
      <li>Clicks: ${adsense.clicks}</li>
      <li>Impressions: ${adsense.impressions}</li>
      <li>Ad page views: ${adsense.pageViews}</li>
    </ul>
    <h3>Traffic (Google Analytics)</h3>
    <ul>
      <li>Active users: ${ga4.activeUsers}</li>
      <li>Sessions: ${ga4.sessions}</li>
      <li>Page views: ${ga4.pageViews}</li>
      <li>Average session duration: ${ga4.avgSessionDuration}s</li>
    </ul>
  `;

  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: process.env.EMAIL_USER,
    subject,
    html,
  });
}

async function main() {
  requireEnv();

  const ga4Auth = new google.auth.GoogleAuth({
    keyFile: KEY_FILE,
    scopes: ['https://www.googleapis.com/auth/analytics.readonly'],
  });

  const adsenseAuth = new OAuth2Client(
    process.env.ADSENSE_OAUTH_CLIENT_ID,
    process.env.ADSENSE_OAUTH_CLIENT_SECRET
  );
  adsenseAuth.setCredentials({ refresh_token: process.env.ADSENSE_OAUTH_REFRESH_TOKEN });

  const date = yesterdayLabel();
  const [adsense, ga4] = await Promise.all([getAdSenseEarnings(adsenseAuth), getGA4Metrics(ga4Auth)]);

  if (EMAIL_CONFIGURED) {
    await sendReportEmail({ date, adsense, ga4 });
    console.log('Daily report emailed for', date, { adsense, ga4 });
  } else {
    printReport({ date, adsense, ga4 });
  }
}

main().catch((err) => {
  console.error('Daily report failed:', err.message || err);
  process.exit(1);
});
