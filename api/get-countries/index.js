// Azure Function: GET /api/get-countries
// Returns list of country display names from BC Countries/Regions table.

const { BC_TENANT_ID, BC_CLIENT_ID, BC_CLIENT_SECRET, BC_COMPANY_ID } = process.env;
const BC_ENVIRONMENT = process.env.BC_ENVIRONMENT || 'Belam_DK';

const BC_BASE = `https://api.businesscentral.dynamics.com/v2.0/${BC_TENANT_ID}/${BC_ENVIRONMENT}/api/v2.0`;
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
  try {
    const token = await getToken();

    const url = `${BC_BASE}/companies(${BC_COMPANY_ID})/countriesRegions?$select=code,displayName,englishName&$orderby=englishName&$top=300`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    });

    if (!res.ok) {
      const text = await res.text();
      context.res = { status: res.status, body: { error: `BC API error: ${text}` } };
      return;
    }

    const data = await res.json();
    const countries = (data.value || [])
      .map(c => ({ code: c.code, name: c.englishName || c.displayName }))
      .filter(c => c.name);

    context.res = {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
      body: countries,
    };
  } catch (e) {
    context.log.error('get-countries error:', e.message);
    context.res = { status: 500, body: { error: 'Internal error. Please try again.' } };
  }
};
