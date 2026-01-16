// Configuration - UPDATE THESE WITH YOUR ACTUAL LINKS
const CONFIG = {
  // Replace with your actual ad links
  linkvertise: 'https://linkvertise.com/YOUR_ID/your-link',
  lootlabs: 'https://loot-link.com/s?V6BuGpvN&data=GtehpAXHTS0iWWG%2Brwk6kzaLlmRNhEZyrd9xTqO%2BbKRVxkYRiLDZ7JD6DPyktLYdATMSO/82IPm3YdWK4Y0ScA%3D%3D',
  workink: 'https://work.ink/YOUR_LINK',
  
  // API base URL (empty = same domain)
  apiUrl: '',
  
  // Required checkpoints (match with server config)
  requiredCheckpoints: 1,
};

let sessionToken = null;
let completedProviders = new Set();
let hwid = null;

// Get HWID from URL params (passed from Lua script)
const urlParams = new URLSearchParams(window.location.search);
hwid = urlParams.get('hwid') || generateVisitorId();

// Generate a unique visitor ID
function generateVisitorId() {
  let id = localStorage.getItem('visitor_id');
  if (!id) {
    id = 'web_' + Math.random().toString(36).substr(2, 16);
    localStorage.setItem('visitor_id', id);
  }
  return id;
}

// Initialize session on page load
async function initSession() {
  try {
    const response = await fetch(`${CONFIG.apiUrl}/api/checkpoint/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        visitorId: generateVisitorId(),
        hwid: hwid,
      }),
    });
    
    const data = await response.json();
    if (data.success) {
      sessionToken = data.token;
      console.log('Session started:', sessionToken);
    }
  } catch (error) {
    console.error('Failed to start session:', error);
    showStatus('Failed to initialize. Please refresh the page.', 'error');
  }
}

// Start a checkpoint
function startCheckpoint(provider) {
  console.log('startCheckpoint called:', provider);
  console.log('sessionToken:', sessionToken);
  
  if (!sessionToken) {
    showStatus('Session not ready. Please wait...', 'error');
    return;
  }
  
  // Open ad link in new tab with session token
  let adUrl = CONFIG[provider];
  console.log('adUrl:', adUrl);
  
  if (adUrl && !adUrl.includes('YOUR_')) {
    // Append session token for postback verification
    const separator = adUrl.includes('?') ? '&' : '?';
    adUrl = `${adUrl}${separator}uid=${sessionToken}`;
    console.log('Final URL:', adUrl);
    
    // Use location.href as fallback if popup blocked
    const newWindow = window.open(adUrl, '_blank');
    console.log('newWindow:', newWindow);
    
    if (!newWindow || newWindow.closed || typeof newWindow.closed === 'undefined') {
      console.log('Popup blocked, redirecting...');
      window.location.href = adUrl;
    }
    
    // Start polling to check if postback was received
    showStatus('Complete the checkpoint, then come back here...', 'success');
    pollForCompletion(provider);
  } else {
    // Demo mode - simulate completion
    console.log('Demo mode: Simulating', provider, 'completion');
    setTimeout(() => {
      verifyCheckpoint(provider);
    }, 3000);
  }
}

// Poll server to check if postback was received
function pollForCompletion(provider) {
  let attempts = 0;
  const maxAttempts = 60; // 5 minutes max
  
  const interval = setInterval(async () => {
    attempts++;
    
    try {
      const response = await fetch(`${CONFIG.apiUrl}/api/checkpoint/status/${sessionToken}`);
      const data = await response.json();
      
      if (data.completedProviders && data.completedProviders.includes(provider.toLowerCase())) {
        clearInterval(interval);
        completedProviders = new Set(data.completedProviders);
        updateUI();
        showStatus(`${provider} checkpoint completed!`, 'success');
        
        const btn = document.querySelector(`.checkpoint-btn.${provider}`);
        if (btn) {
          btn.classList.add('done');
          btn.innerHTML = '✓ Completed';
          btn.disabled = true;
        }
      }
    } catch (error) {
      console.error('Poll error:', error);
    }
    
    if (attempts >= maxAttempts) {
      clearInterval(interval);
      showStatus('Timeout - please try again', 'error');
    }
  }, 5000); // Check every 5 seconds
}

// Verify checkpoint completion
async function verifyCheckpoint(provider) {
  try {
    const response = await fetch(`${CONFIG.apiUrl}/api/checkpoint/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token: sessionToken,
        provider: provider,
      }),
    });
    
    const data = await response.json();
    
    if (data.success) {
      completedProviders = new Set(data.completedProviders);
      updateUI();
      showStatus(`${provider} checkpoint completed!`, 'success');
      
      // Mark button as done
      const btn = document.querySelector(`.checkpoint-btn.${provider}`);
      if (btn) {
        btn.classList.add('done');
        btn.innerHTML = '✓ Completed';
        btn.disabled = true;
      }
    }
  } catch (error) {
    console.error('Verification failed:', error);
    showStatus('Verification failed. Please try again.', 'error');
  }
}

// Update UI based on progress
function updateUI() {
  const count = completedProviders.size;
  document.getElementById('completedCount').textContent = count;
  
  const claimBtn = document.getElementById('claimBtn');
  const claimText = document.getElementById('claimText');
  
  if (count >= CONFIG.requiredCheckpoints) {
    claimBtn.disabled = false;
    claimText.textContent = 'Claim Your Key';
    document.getElementById('step1').classList.remove('active');
    document.getElementById('step1').classList.add('completed');
    document.getElementById('step2').classList.add('active');
  }
}

// Claim the key
async function claimKey() {
  const claimBtn = document.getElementById('claimBtn');
  const claimText = document.getElementById('claimText');
  const claimLoader = document.getElementById('claimLoader');
  
  claimBtn.disabled = true;
  claimText.textContent = 'Claiming...';
  claimLoader.style.display = 'inline-block';
  
  try {
    const response = await fetch(`${CONFIG.apiUrl}/api/checkpoint/claim`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: sessionToken }),
    });
    
    const data = await response.json();
    
    if (data.success) {
      // Show the key
      document.getElementById('keyValue').textContent = data.key;
      document.getElementById('expiresInfo').textContent = `Expires in: ${data.expiresIn}`;
      document.getElementById('keyDisplay').classList.add('show');
      
      document.getElementById('step2').classList.remove('active');
      document.getElementById('step2').classList.add('completed');
      
      claimText.textContent = 'Key Claimed!';
      showStatus('Key generated successfully!', 'success');
    } else {
      throw new Error(data.error || 'Failed to claim key');
    }
  } catch (error) {
    console.error('Claim failed:', error);
    showStatus(error.message || 'Failed to claim key. Please try again.', 'error');
    claimBtn.disabled = false;
    claimText.textContent = 'Try Again';
  }
  
  claimLoader.style.display = 'none';
}

// Copy key to clipboard
function copyKey() {
  const key = document.getElementById('keyValue').textContent;
  navigator.clipboard.writeText(key).then(() => {
    showStatus('Key copied to clipboard!', 'success');
  });
}

// Show status message
function showStatus(message, type) {
  const statusEl = document.getElementById('statusMessage');
  statusEl.textContent = message;
  statusEl.className = 'status-message ' + type;
  
  setTimeout(() => {
    statusEl.className = 'status-message';
  }, 5000);
}

// Initialize on load
initSession();
