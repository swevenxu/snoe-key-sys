// Configuration - UPDATE THESE WITH YOUR ACTUAL LINKS
const CONFIG = {
  // Replace with your actual ad links
  linkvertise: 'https://linkvertise.com/YOUR_ID/your-link',
  lootlabs: 'https://loot-link.com/s?V6BuGpvN',
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
  // Check if we have an existing session
  const existingSession = localStorage.getItem('checkpoint_session');
  if (existingSession) {
    try {
      const data = JSON.parse(existingSession);
      // Use existing session if it's less than 30 minutes old
      if (Date.now() - data.timestamp < 30 * 60 * 1000) {
        sessionToken = data.token;
        console.log('Restored session:', sessionToken);
        return;
      }
    } catch (e) {
      // Invalid data, create new session
    }
  }
  
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
      // Save session to localStorage
      localStorage.setItem('checkpoint_session', JSON.stringify({
        token: sessionToken,
        timestamp: Date.now()
      }));
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
    // Store session token in localStorage so we can verify on return
    localStorage.setItem('pending_checkpoint', JSON.stringify({
      provider: provider,
      token: sessionToken,
      timestamp: Date.now()
    }));
    console.log('Final URL:', adUrl);
    
    // Use location.href as fallback if popup blocked
    const newWindow = window.open(adUrl, '_blank');
    console.log('newWindow:', newWindow);
    
    if (!newWindow || newWindow.closed || typeof newWindow.closed === 'undefined') {
      console.log('Popup blocked, redirecting...');
      window.location.href = adUrl;
    }
    
    // Start polling to check if postback was received from server
    showStatus('Complete the ad tasks, then return here. It may take a moment to verify...', 'success');
    pollForCompletion(provider);
  } else {
    // No link configured - show error
    showStatus(`${provider} is not configured yet`, 'error');
  }
}

// Poll server to check if postback was received
function pollForCompletion(provider) {
  // Don't auto-complete - wait for user to click "I've completed" or for redirect back
  // This is just a backup check
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
          btn.innerHTML = 'Completed';
          btn.disabled = true;
        }
      }
    } catch (error) {
      console.error('Poll error:', error);
    }
    
    if (attempts >= maxAttempts) {
      clearInterval(interval);
    }
  }, 5000); // Check every 5 seconds
}

// Check if user returned from ad completion (via redirect)
function checkRedirectCompletion() {
  const params = new URLSearchParams(window.location.search);
  const completedProvider = params.get('completed');
  
  if (completedProvider) {
    // User was redirected back after completing checkpoint
    // Remove the param from URL
    window.history.replaceState({}, '', window.location.pathname);
    
    // Mark as completed after session is ready
    setTimeout(() => {
      if (sessionToken) {
        verifyCheckpoint(completedProvider);
      }
    }, 1000);
  }
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
        btn.innerHTML = 'Completed';
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

// Check for pending checkpoint on page load (user returned from ad)
function checkPendingCheckpoint() {
  const pending = localStorage.getItem('pending_checkpoint');
  if (pending) {
    try {
      const data = JSON.parse(pending);
      // Check if it's recent (within 10 minutes)
      if (Date.now() - data.timestamp < 10 * 60 * 1000) {
        console.log('Found pending checkpoint:', data);
        localStorage.removeItem('pending_checkpoint');
        
        // Wait for session to be ready, then verify with server
        const waitForSession = setInterval(() => {
          if (sessionToken) {
            clearInterval(waitForSession);
            // Tell the server this checkpoint is complete
            verifyCheckpoint(data.provider);
          }
        }, 200);
        
        // Timeout after 5 seconds
        setTimeout(() => clearInterval(waitForSession), 5000);
      } else {
        localStorage.removeItem('pending_checkpoint');
      }
    } catch (e) {
      localStorage.removeItem('pending_checkpoint');
    }
  }
}

// Initialize on load
initSession();
checkPendingCheckpoint();
