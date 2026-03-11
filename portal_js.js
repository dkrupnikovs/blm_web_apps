// ============================================================
// CONFIGURATION — replace placeholders before deploying
// ============================================================
const CONFIG = {
  aad: {
    tenantId:        'YOUR_TENANT_ID',
    clientId:        'YOUR_CLIENT_ID',
    redirectUri:     window.location.origin,
    securityGroupId: 'YOUR_SECURITY_GROUP_OBJECT_ID',
  },
  bc: {
    baseUrl:     'https://api.businesscentral.dynamics.com/v2.0/YOUR_TENANT_ID/Production/api',
    companyId:   'YOUR_BC_COMPANY_GUID',
    apiVersion:  'v2.0',
    customGroup: 'belam/portal/v1.0',  // matches APIPublisher/APIGroup/APIVersion in AL
  }
};

// ============================================================
// MSAL SETUP
// ============================================================
const msalConfig = {
  auth: {
    clientId:    CONFIG.aad.clientId,
    authority:   `https://login.microsoftonline.com/${CONFIG.aad.tenantId}`,
    redirectUri: CONFIG.aad.redirectUri,
  },
  cache: { cacheLocation: 'sessionStorage' }
};

const msal = new msal.PublicClientApplication(msalConfig);

const BC_SCOPE    = ['https://api.businesscentral.dynamics.com/.default'];
const GRAPH_SCOPE = ['https://graph.microsoft.com/GroupMember.Read.All'];

// ============================================================
// HELPERS
// ============================================================
async function getToken(scopes) {
  const acct = msal.getAllAccounts()[0];
  try {
    const res = await msal.acquireTokenSilent({ scopes, account: acct });
    return res.accessToken;
  } catch {
    const res = await msal.acquireTokenPopup({ scopes });
    return res.accessToken;
  }
}

async function bcGet(path) {
  const token = await getToken(BC_SCOPE);
  const url = `${CONFIG.bc.baseUrl}/${CONFIG.bc.apiVersion}/companies(${CONFIG.bc.companyId})/${path}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } });
  if (!res.ok) throw new Error(`BC API error ${res.status}: ${await res.text()}`);
  return res.json();
}

async function bcCustomGet(path) {
  const token = await getToken(BC_SCOPE);
  const url = `${CONFIG.bc.baseUrl}/${CONFIG.bc.customGroup}/companies(${CONFIG.bc.companyId})/${path}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } });
  if (!res.ok) throw new Error(`BC API error ${res.status}: ${await res.text()}`);
  return res.json();
}

async function bcPost(path, body) {
  const token = await getToken(BC_SCOPE);
  const url = `${CONFIG.bc.baseUrl}/${CONFIG.bc.apiVersion}/companies(${CONFIG.bc.companyId})/${path}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(body)
  });
  if (!res.ok) throw new Error(`BC API error ${res.status}: ${await res.text()}`);
  return res.json();
}

function show(id)  { document.getElementById(id).classList.remove('hidden'); }
function hide(id)  { document.getElementById(id).classList.add('hidden'); }
function val(id)   { return document.getElementById(id).value.trim(); }
function setVal(id, v) { document.getElementById(id).value = v; }

function showScreen(name) {
  ['loading','login','denied','portal'].forEach(s => hide(`screen-${s}`));
  show(`screen-${name}`);
}

function showError(msg) {
  const el = document.getElementById('msg-error');
  el.textContent = msg;
  el.classList.remove('hidden');
  document.getElementById('msg-success').classList.add('hidden');
}

function showSuccess(msg) {
  const el = document.getElementById('msg-success');
  el.textContent = msg;
  el.classList.remove('hidden');
  document.getElementById('msg-error').classList.add('hidden');
}

// ============================================================
// AUTH & GROUP CHECK
// ============================================================
async function checkGroupMembership(userId) {
  const token = await getToken(GRAPH_SCOPE);
  const res = await fetch(
    `https://graph.microsoft.com/v1.0/users/${userId}/memberOf?$select=id`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const data = await res.json();
  return (data.value || []).some(g => g.id === CONFIG.aad.securityGroupId);
}

// ============================================================
// COUNTRIES — load from BC
// ============================================================
const BALTIC = ['LV', 'LT', 'EE'];
let selectedCountryCode = '';
let selectedCountryIsEU  = false;

async function loadCountries() {
  const data = await bcGet('countriesRegions?$orderby=name');
  const sel = document.getElementById('sel-country');
  sel.innerHTML = '<option value="">— Select country —</option>';
  (data.value || []).forEach(c => {
    const opt = document.createElement('option');
    opt.value       = c.code;
    opt.textContent = c.name;
    opt.dataset.eu  = c.euCountryRegionCode ? '1' : '';
    sel.appendChild(opt);
  });
}

// ============================================================
// LURSOFT SEARCH
// ============================================================
async function lursoftSearch(countryCode, name) {
  const data = await bcCustomGet(
    `lursoftSearches?$filter=countryCode eq '${encodeURIComponent(countryCode)}' and companyName eq '${encodeURIComponent(name)}'`
  );
  return data.value || [];
}

async function lursoftDetail(countryCode, regNo) {
  const data = await bcCustomGet(
    `lursoftDetails?$filter=countryCode eq '${encodeURIComponent(countryCode)}' and registrationNo eq '${encodeURIComponent(regNo)}'`
  );
  return (data.value || [])[0] || null;
}

function renderSearchResults(results) {
  const list = document.getElementById('results-list');
  list.innerHTML = '';
  if (!results.length) {
    list.innerHTML = '<li class="no-results">No companies found.</li>';
  } else {
    results.forEach(r => {
      const li = document.createElement('li');
      li.className = 'result-item';
      li.innerHTML = `<strong>${r.companyName}</strong> <span>${r.registrationNo}</span> <span>${r.city || ''}</span>`;
      li.addEventListener('click', () => selectCompany(r.registrationNo));
      list.appendChild(li);
    });
  }
  show('search-results');
}

async function selectCompany(regNo) {
  try {
    const detail = await lursoftDetail(selectedCountryCode, regNo);
    if (!detail) { showError('Could not fetch company details.'); return; }
    setVal('inp-name',          detail.companyName   || '');
    setVal('inp-regno',         detail.registrationNo || '');
    setVal('inp-vatno',         detail.vatNo          || '');
    setVal('inp-address',       detail.address        || '');
    setVal('inp-city',          detail.city           || '');
    setVal('inp-postcode',      detail.postCode       || '');
    setVal('inp-email',         detail.email          || '');
    setVal('inp-phone',         detail.phoneNo        || '');
    hide('search-results');
  } catch (e) {
    showError('Lursoft detail error: ' + e.message);
  }
}

// ============================================================
// CREATE CONTACT
// ============================================================
async function createContact() {
  const name = val('inp-name');
  if (!name) { showError('Company name is required.'); return; }

  const body = {
    type:               'Company',
    companyName:        name,
    countryRegionCode:  selectedCountryCode,
    address:            val('inp-address'),
    city:               val('inp-city'),
    postCode:           val('inp-postcode'),
    email:              val('inp-email'),
    phoneNo:            val('inp-phone'),
    registrationNumber: val('inp-regno'),
    vatRegistrationNo:  val('inp-vatno'),
  };

  const biz = val('inp-bizrel');
  if (biz) body.businessRelationCode = biz;

  try {
    document.getElementById('btn-create').disabled = true;
    const result = await bcPost('contacts', body);
    showSuccess(`✅ Contact created successfully! Contact No.: ${result.number}`);
    clearForm();
  } catch (e) {
    showError('Failed to create contact: ' + e.message);
  } finally {
    document.getElementById('btn-create').disabled = false;
  }
}

// ============================================================
// FORM CLEAR
// ============================================================
function clearForm() {
  ['inp-name','inp-regno','inp-vatno','inp-address','inp-city',
   'inp-postcode','inp-email','inp-phone','inp-country-display'].forEach(id => setVal(id, ''));
  setVal('inp-bizrel', '');
  setVal('sel-country', '');
  selectedCountryCode = '';
  hide('section-lursoft');
  hide('search-results');
  document.getElementById('form-section-title').textContent = '2. Contact Details';
}

// ============================================================
// EVENT WIRING
// ============================================================
function wireEvents() {
  document.getElementById('btn-login').addEventListener('click', () => {
    msal.loginPopup({ scopes: [...BC_SCOPE, ...GRAPH_SCOPE] })
      .then(init).catch(e => showScreen('login'));
  });

  document.getElementById('btn-logout').addEventListener('click', () => {
    msal.logoutPopup();
  });

  document.getElementById('btn-logout-denied').addEventListener('click', () => {
    msal.logoutPopup();
  });

  document.getElementById('sel-country').addEventListener('change', e => {
    const opt = e.target.options[e.target.selectedIndex];
    selectedCountryCode = e.target.value;
    selectedCountryIsEU  = opt.dataset.eu === '1';
    setVal('inp-country-display', opt.textContent);

    if (BALTIC.includes(selectedCountryCode)) {
      show('section-lursoft');
      document.getElementById('form-section-title').textContent = '3. Contact Details';
    } else {
      hide('section-lursoft');
      hide('search-results');
      document.getElementById('form-section-title').textContent = '2. Contact Details';
    }
  });

  document.getElementById('btn-search').addEventListener('click', async () => {
    const name = val('inp-search-name');
    if (!name || !selectedCountryCode) return;
    try {
      document.getElementById('btn-search').disabled = true;
      const results = await lursoftSearch(selectedCountryCode, name);
      renderSearchResults(results);
    } catch (e) {
      showError('Search error: ' + e.message);
    } finally {
      document.getElementById('btn-search').disabled = false;
    }
  });

  document.getElementById('inp-search-name').addEventListener('keydown', e => {
    if (e.key === 'Enter') document.getElementById('btn-search').click();
  });

  document.getElementById('btn-create').addEventListener('click', createContact);
  document.getElementById('btn-clear').addEventListener('click', clearForm);
}

// ============================================================
// INIT
// ============================================================
async function init(loginResponse) {
  showScreen('loading');
  try {
    const acct = loginResponse?.account || msal.getAllAccounts()[0];
    if (!acct) { showScreen('login'); return; }

    const isMember = await checkGroupMembership(acct.localAccountId);
    if (!isMember) { showScreen('denied'); return; }

    document.getElementById('user-name').textContent = acct.name || acct.username;
    await loadCountries();
    showScreen('portal');
  } catch (e) {
    console.error('Init error:', e);
    showScreen('login');
  }
}

wireEvents();

// Handle redirect after login
msal.handleRedirectPromise().then(res => {
  if (res) init(res); else init();
}).catch(() => showScreen('login'));
