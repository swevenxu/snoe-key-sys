// Admin Dashboard JavaScript

const API_URL = window.location.origin;
let apiKey = localStorage.getItem('admin_api_key') || '';
let allKeys = [];

// Check if already logged in
if (apiKey) {
  showDashboard();
}

// Login
function login() {
  const key = document.getElementById('apiKeyInput').value.trim();
  if (!key) {
    showToast('Please enter an API key', true);
    return;
  }
  
  apiKey = key;
  localStorage.setItem('admin_api_key', key);
  showDashboard();
}

// Logout
function logout() {
  apiKey = '';
  localStorage.removeItem('admin_api_key');
  document.getElementById('loginScreen').style.display = 'flex';
  document.getElementById('dashboard').classList.remove('active');
}

// Show dashboard
async function showDashboard() {
  document.getElementById('loginScreen').style.display = 'none';
  document.getElementById('dashboard').classList.add('active');
  
  await loadStats();
  await loadKeys();
}

// API helper
async function api(endpoint, method = 'GET', body = null) {
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': apiKey,
    },
  };
  
  if (body) {
    options.body = JSON.stringify(body);
  }
  
  const response = await fetch(`${API_URL}${endpoint}`, options);
  
  if (response.status === 401 || response.status === 403) {
    showToast('Invalid API key', true);
    logout();
    throw new Error('Unauthorized');
  }
  
  return response.json();
}

// Load stats
async function loadStats() {
  try {
    const stats = await api('/api/admin/stats');
    document.getElementById('statTotal').textContent = stats.total || 0;
    document.getElementById('statActive').textContent = stats.active || 0;
    document.getElementById('statExpired').textContent = stats.expired || 0;
    document.getElementById('statToday').textContent = stats.validationsToday || 0;
  } catch (error) {
    console.error('Failed to load stats:', error);
  }
}

// Load keys
async function loadKeys() {
  try {
    const data = await api('/api/admin/keys?limit=100');
    allKeys = data.keys || [];
    renderKeys(allKeys);
  } catch (error) {
    console.error('Failed to load keys:', error);
    document.getElementById('keysTableBody').innerHTML = 
      '<tr><td colspan="6" class="empty-state">Failed to load keys</td></tr>';
  }
}

// Render keys table
function renderKeys(keys) {
  const tbody = document.getElementById('keysTableBody');
  
  if (!keys || keys.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="empty-state">No keys found</td></tr>';
    return;
  }
  
  tbody.innerHTML = keys.map(key => {
    const status = getKeyStatus(key);
    const expiresText = key.expires_at 
      ? new Date(key.expires_at).toLocaleDateString() 
      : 'Never';
    const usesText = key.max_uses 
      ? `${key.current_uses}/${key.max_uses}` 
      : key.current_uses || '0';
    
    return `
      <tr>
        <td class="key-value">${key.key}</td>
        <td>${key.note || '-'}</td>
        <td><span class="status-badge ${status.class}">${status.text}</span></td>
        <td>${expiresText}</td>
        <td>${usesText}</td>
        <td>
          <button class="table-action" onclick="copyKey('${key.key}')" title="Copy">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
          </button>
          ${key.is_active 
            ? `<button class="table-action revoke" onclick="revokeKey('${key.key}')" title="Revoke">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line></svg>
              </button>`
            : `<button class="table-action" onclick="activateKey('${key.key}')" title="Activate">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
              </button>`
          }
          <button class="table-action revoke" onclick="deleteKey('${key.key}')" title="Delete">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

// Get key status
function getKeyStatus(key) {
  if (!key.is_active) {
    return { text: 'Revoked', class: 'revoked' };
  }
  if (key.expires_at && new Date(key.expires_at) < new Date()) {
    return { text: 'Expired', class: 'expired' };
  }
  if (key.max_uses && key.current_uses >= key.max_uses) {
    return { text: 'Used Up', class: 'expired' };
  }
  return { text: 'Active', class: 'active' };
}

// Filter keys
function filterKeys() {
  const search = document.getElementById('searchInput').value.toLowerCase();
  const filtered = allKeys.filter(key => 
    key.key.toLowerCase().includes(search) ||
    (key.note && key.note.toLowerCase().includes(search))
  );
  renderKeys(filtered);
}

// Copy key
function copyKey(key) {
  navigator.clipboard.writeText(key).then(() => {
    showToast('Key copied to clipboard!');
  });
}

// Create single key
async function createKey() {
  const note = document.getElementById('createNote').value.trim();
  const duration = document.getElementById('createDuration').value;
  const maxUses = document.getElementById('createMaxUses').value;
  const hwidResets = document.getElementById('createHwidResets').value;
  
  try {
    const data = await api('/api/admin/keys', 'POST', {
      note: note || undefined,
      durationDays: duration ? parseInt(duration) : null,
      maxUses: maxUses ? parseInt(maxUses) : null,
      maxHwidResets: parseInt(hwidResets) || 0,
    });
    
    showToast(`Key created: ${data.key}`);
    closeModal('createModal');
    
    // Reset form
    document.getElementById('createNote').value = '';
    document.getElementById('createDuration').value = '';
    document.getElementById('createMaxUses').value = '';
    document.getElementById('createHwidResets').value = '0';
    
    await loadStats();
    await loadKeys();
  } catch (error) {
    showToast('Failed to create key', true);
  }
}

// Batch create keys
async function batchCreate() {
  const count = parseInt(document.getElementById('batchCount').value) || 10;
  const note = document.getElementById('batchNote').value.trim();
  const duration = document.getElementById('batchDuration').value;
  
  try {
    const data = await api('/api/admin/keys/batch', 'POST', {
      count,
      note: note || undefined,
      durationDays: duration ? parseInt(duration) : null,
    });
    
    showToast(`Created ${data.keys.length} keys`);
    closeModal('batchModal');
    
    // Copy all keys to clipboard
    const keyList = data.keys.map(k => k.key).join('\n');
    navigator.clipboard.writeText(keyList);
    showToast('All keys copied to clipboard!');
    
    await loadStats();
    await loadKeys();
  } catch (error) {
    showToast('Failed to create keys', true);
  }
}

// Revoke key
async function revokeKey(key) {
  if (!confirm(`Revoke key ${key}?`)) return;
  
  try {
    await api(`/api/admin/keys/${encodeURIComponent(key)}/revoke`, 'POST');
    showToast('Key revoked');
    await loadStats();
    await loadKeys();
  } catch (error) {
    showToast('Failed to revoke key', true);
  }
}

// Activate key
async function activateKey(key) {
  try {
    await api(`/api/admin/keys/${encodeURIComponent(key)}/activate`, 'POST');
    showToast('Key activated');
    await loadStats();
    await loadKeys();
  } catch (error) {
    showToast('Failed to activate key', true);
  }
}

// Delete key
async function deleteKey(key) {
  if (!confirm(`Permanently delete key ${key}?`)) return;
  
  try {
    await api(`/api/admin/keys/${encodeURIComponent(key)}`, 'DELETE');
    showToast('Key deleted');
    await loadStats();
    await loadKeys();
  } catch (error) {
    showToast('Failed to delete key', true);
  }
}

// Modal functions
function openCreateModal() {
  document.getElementById('createModal').classList.add('active');
}

function openBatchModal() {
  document.getElementById('batchModal').classList.add('active');
}

function closeModal(id) {
  document.getElementById(id).classList.remove('active');
}

// Close modal on click outside
document.querySelectorAll('.modal').forEach(modal => {
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.classList.remove('active');
    }
  });
});

// Toast notification
function showToast(message, isError = false) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.className = 'toast' + (isError ? ' error' : '');
  toast.classList.add('show');
  
  setTimeout(() => {
    toast.classList.remove('show');
  }, 3000);
}
