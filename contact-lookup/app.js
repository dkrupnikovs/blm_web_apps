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

function showError(msg) {
  const el = document.getElementById('msg-error');
  el.textContent = msg;
  show('msg-error');
  hide('result');
}

function renderContact(c) {
  const rows = [
    ['No.',             c.number],
    ['Name',            c.displayName],
    ['Type',            c.type],
    ['Phone',           c.phoneNo],
    ['Email',           c.email],
    ['Address',         [c.addressLine1, c.city, c.postCode, c.countryRegionCode].filter(Boolean).join(', ')],
    ['Registration No.', c.registrationNumber],
    ['VAT No.',         c.vatRegistrationNo],
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
  const country = val('inp-country');
  if (!number && !country) return;

  const btn = document.getElementById('btn-lookup');
  btn.disabled = true;
  hide('result');
  hide('msg-error');

  try {
    let url = `/api/contact-lookup?number=${encodeURIComponent(number)}`;
    if (country) url += `&country=${encodeURIComponent(country)}`;
    const res = await fetch(url);
    const data = await res.json();
    if (!res.ok) { showError(data.error || `Error ${res.status}`); return; }
    if (!data) { showError(`Contact "${number}" not found.`); return; }
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
