// Auth handled by SWA — unauthenticated users are redirected to AAD login.
// User info available from /.auth/me after login.

async function loadUser() {
  try {
    const res = await fetch('/.auth/me');
    const data = await res.json();
    const user = data.clientPrincipal;
    if (user) document.getElementById('user-name').textContent = user.userDetails;
  } catch (e) { /* ignore */ }
}
loadUser();

async function loadCountries() {
  try {
    const res = await fetch('/api/get-countries');
    if (!res.ok) return;
    const countries = await res.json();
    const sel = document.getElementById('inp-country');
    countries.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c.code;
      opt.textContent = c.name;
      sel.appendChild(opt);
    });
  } catch (e) { /* ignore — dropdown stays empty */ }
}
loadCountries();

function val(id) { return document.getElementById(id).value.trim(); }
function show(id) { document.getElementById(id).classList.remove('hidden'); }
function hide(id) { document.getElementById(id).classList.add('hidden'); }

// ── Look up ──────────────────────────────────────────────────────────────────

function showError(msg) {
  const el = document.getElementById('msg-error');
  el.textContent = msg;
  show('msg-error');
  hide('result');
}

function renderContact(c) {
  const rows = [
    ['No.',              c.number],
    ['Name',             c.displayName],
    ['Type',             c.type],
    ['Phone',            c.phoneNo],
    ['Email',            c.email],
    ['Address',          [c.addressLine1, c.city, c.postCode, c.countryRegionCode].filter(Boolean).join(', ')],
    ['Registration No.', c.registrationNumber],
    ['VAT No.',          c.vatRegistrationNo],
  ];

  document.getElementById('result-body').innerHTML = rows
    .filter(([, v]) => v)
    .map(([label, value]) => `<tr><th>${label}</th><td>${value}</td></tr>`)
    .join('');

  hide('msg-error');
  show('result');
}

async function lookup() {
  const number = val('inp-number');
  if (!number) return;

  const btn = document.getElementById('btn-lookup');
  btn.disabled = true;
  hide('result');
  hide('msg-error');

  try {
    const res = await fetch(`/api/contact-lookup?number=${encodeURIComponent(number)}`);
    const data = await res.json();
    if (!res.ok) { showError(data.error || `Error ${res.status}`); return; }
    if (!data)   { showError(`Contact "${number}" not found.`); return; }
    renderContact(data);
  } catch (e) {
    showError('Request failed: ' + e.message);
  } finally {
    btn.disabled = false;
  }
}

document.getElementById('btn-lookup').addEventListener('click', lookup);
document.getElementById('inp-number').addEventListener('keydown', e => {
  if (e.key === 'Enter') lookup();
});

// ── Create new contact ───────────────────────────────────────────────────────

document.getElementById('inp-country').addEventListener('change', () => {
  if (val('inp-country')) {
    show('create-form');
  } else {
    hide('create-form');
  }
});

async function createContact() {
  const country = val('inp-country');
  const name    = val('new-name');

  if (!country) { showCreateErr('Please select a country.'); return; }
  if (!name)    { showCreateErr('Name is required.'); return; }

  const btn = document.getElementById('btn-create');
  btn.disabled = true;
  hide('msg-create-ok');
  hide('msg-create-err');

  const payload = {
    type:               document.getElementById('new-type').value,
    displayName:        name,
    countryRegionCode:  country,
    registrationNumber: val('new-regno'),
    vatRegistrationNo:  val('new-vat'),
    phoneNo:            val('new-phone'),
    email:              val('new-email'),
    addressLine1:       val('new-addr'),
    city:               val('new-city'),
    postCode:           val('new-post'),
  };

  try {
    const res  = await fetch('/api/create-contact', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) { showCreateErr(data.error || `Error ${res.status}`); return; }
    showCreateOk(`Contact created: ${data.number} — ${data.displayName}`);
    clearCreateForm();
  } catch (e) {
    showCreateErr('Request failed: ' + e.message);
  } finally {
    btn.disabled = false;
  }
}

function showCreateOk(msg) {
  const el = document.getElementById('msg-create-ok');
  el.textContent = msg;
  show('msg-create-ok');
}

function showCreateErr(msg) {
  const el = document.getElementById('msg-create-err');
  el.textContent = msg;
  show('msg-create-err');
}

function clearCreateForm() {
  ['new-name','new-regno','new-vat','new-phone','new-email','new-addr','new-city','new-post']
    .forEach(id => { document.getElementById(id).value = ''; });
  document.getElementById('new-type').value = 'Company';
  document.getElementById('inp-country').value = '';
  hide('create-form');
}

document.getElementById('btn-create').addEventListener('click', createContact);
