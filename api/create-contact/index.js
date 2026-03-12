// Azure Function: POST /api/create-contact
//
// Body (JSON):
//   displayName        string  required
//   type               string  'Company' | 'Person'  (default: 'Company')
//   countryRegionCode  string  required
//   registrationNumber string  optional
//   vatRegistrationNo  string  optional
//   phoneNo            string  optional
//   email              string  optional
//   addressLine1       string  optional
//   city               string  optional
//   postCode           string  optional

const { BC_TENANT_ID, BC_CLIENT_ID, BC_CLIENT_SECRET, BC_COMPANY_ID } = process.env;
const BC_ENVIRONMENT = process.env.BC_ENVIRONMENT || 'Belam_DK';

const BC_BASE   = `https://api.businesscentral.dynamics.com/v2.0/${BC_TENANT_ID}/${BC_ENVIRONMENT}/api/v2.0`;
const TOKEN_URL = `https://login.microsoftonline.com/${BC_TENANT_ID}/oauth2/v2.0/token`;
const BC_SCOPE  = 'https://api.businesscentral.dynamics.com/.default';

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
  const body = req.body || {};

  const displayName       = (body.displayName       || '').trim();
  const countryRegionCode = (body.countryRegionCode  || '').trim();

  if (!displayName) {
    context.res = { status: 400, body: { error: 'displayName is required.' } };
    return;
  }
  if (!countryRegionCode) {
    context.res = { status: 400, body: { error: 'countryRegionCode is required.' } };
    return;
  }

  const payload = {
    type:               body.type || 'Company',
    displayName,
    countryRegionCode,
  };
  if (body.registrationNumber) payload.registrationNumber = body.registrationNumber.trim();
  if (body.vatRegistrationNo)  payload.vatRegistrationNo  = body.vatRegistrationNo.trim();
  if (body.phoneNo)            payload.phoneNo            = body.phoneNo.trim();
  if (body.email)              payload.email              = body.email.trim();
  if (body.addressLine1)       payload.addressLine1       = body.addressLine1.trim();
  if (body.city)               payload.city               = body.city.trim();
  if (body.postCode)           payload.postCode           = body.postCode.trim();

  try {
    const token = await getToken();

    const url = `${BC_BASE}/companies(${BC_COMPANY_ID})/contacts`;
    const res = await fetch(url, {
      method:  'POST',
      headers: {
        Authorization:  `Bearer ${token}`,
        'Content-Type': 'application/json',
        Accept:         'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const text = await res.text();
      context.res = { status: res.status, body: { error: `BC API error: ${text}` } };
      return;
    }

    const created = await res.json();
    context.res = {
      status:  201,
      headers: { 'Content-Type': 'application/json' },
      body:    created,
    };
  } catch (e) {
    context.log.error('create-contact error:', e.message);
    context.res = { status: 500, body: { error: 'Internal error. Please try again.' } };
  }
};
