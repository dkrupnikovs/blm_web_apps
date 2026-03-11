// Azure Function: GET /api/contact-lookup?number=KP00123
//
// Authenticates to BC using client credentials (app-level, no user login).
// Environment variables required (set in Azure SWA Application Settings):
//   BC_TENANT_ID       Azure AD tenant ID
//   BC_CLIENT_ID       App registration client ID
//   BC_CLIENT_SECRET   App registration client secret
//   BC_COMPANY_ID      Business Central company GUID

const { BC_TENANT_ID, BC_CLIENT_ID, BC_CLIENT_SECRET, BC_COMPANY_ID } = process.env;

const BC_BASE = `https://api.businesscentral.dynamics.com/v2.0/${BC_TENANT_ID}/Production/api/v2.0`;
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
  if (!res.ok) throw new Error(`Token request failed: ${res.status}`);
  const data = await res.json();
  return data.access_token;
}

module.exports = async function (context, req) {
  const number = (req.query.number || '').trim();

  if (!number) {
    context.res = { status: 400, body: { error: 'number query parameter is required.' } };
    return;
  }

  try {
    const token = await getToken();

    const url = `${BC_BASE}/companies(${BC_COMPANY_ID})/contacts?$filter=number eq '${encodeURIComponent(number)}'&$top=1`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    });

    if (!res.ok) {
      const text = await res.text();
      context.res = { status: res.status, body: { error: `BC API error: ${text}` } };
      return;
    }

    const data = await res.json();
    const contact = (data.value || [])[0] || null;

    context.res = {
      status: contact ? 200 : 404,
      headers: { 'Content-Type': 'application/json' },
      body: contact,
    };
  } catch (e) {
    context.log.error('contact-lookup error:', e.message);
    context.res = { status: 500, body: { error: 'Internal error. Please try again.' } };
  }
};
