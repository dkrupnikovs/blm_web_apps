// Temporary helper: GET /api/get-company-id
// Returns the list of companies to find the company GUID.
// Delete this endpoint after you have the GUID.

const { BC_TENANT_ID, BC_CLIENT_ID, BC_CLIENT_SECRET } = process.env;
const BC_ENVIRONMENT = process.env.BC_ENVIRONMENT || 'Belam_DK';

const TOKEN_URL = `https://login.microsoftonline.com/${BC_TENANT_ID}/oauth2/v2.0/token`;
const BC_SCOPE = 'https://api.businesscentral.dynamics.com/.default';

async function getToken() {
  const body = new URLSearchParams({
    grant_type:    'client_credentials',
    client_id:     BC_CLIENT_ID,
    client_secret: BC_CLIENT_SECRET,
    scope:         BC_SCOPE,
  });
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });
  if (!res.ok) throw new Error(`Token request failed: ${res.status} ${await res.text()}`);
  const data = await res.json();
  return data.access_token;
}

module.exports = async function (context, req) {
  try {
    const token = await getToken();
    const url = `https://api.businesscentral.dynamics.com/v2.0/${BC_TENANT_ID}/${BC_ENVIRONMENT}/api/v2.0/companies`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    });
    const text = await res.text();
    context.res = {
      status: res.status,
      headers: { 'Content-Type': 'application/json' },
      body: text,
    };
  } catch (e) {
    context.res = { status: 500, body: { error: e.message } };
  }
};
