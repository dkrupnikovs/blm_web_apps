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
  if (!number) return;

  const btn = document.getElementById('btn-lookup');
  btn.disabled = true;
  hide('result');
  hide('msg-error');

  try {
    const res = await fetch(`/api/contact-lookup?number=${encodeURIComponent(number)}`);
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
