// Configuration - UPDATE THESE WITH YOUR ACTUAL LINKS
const CONFIG = {
  // Replace with your actual ad links
  linkvertise: 'https://direct-link.net/2630173/UbIbGR9F9wX7',
  workink: 'https://work.ink/2cCC/snoe-keys',
  
  // API base URL
  apiUrl: window.location.origin,
  
  // Required checkpoints (match with server config)
  requiredCheckpoints: 1,
};

let sessionToken = null;
let completedProviders = new Set();
let hwid = null;
let cooldownActive = false;
let cooldownReason = null;

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
        
        // Fetch current status from server to sync completedProviders
        try {
          const response = await fetch(`${CONFIG.apiUrl}/api/checkpoint/status/${sessionToken}`);
          const statusData = await response.json();
          if (statusData.completedProviders) {
            completedProviders = new Set(statusData.completedProviders);
            console.log('Restored completed providers:', Array.from(completedProviders));
            
            // Update UI for any already completed checkpoints
            completedProviders.forEach(provider => {
              const btn = document.querySelector(`.checkpoint-btn.${provider}`);
              if (btn) {
                btn.classList.add('done');
                btn.innerHTML = 'Completed';
                btn.disabled = true;
              }
            });
            updateUI();
          }
        } catch (e) {
          console.log('Could not fetch session status:', e);
        }
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
        fingerprint: generateFingerprint(),
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
      
      // Check eligibility (cooldown/rate limit)
      if (data.eligibility && !data.eligibility.canClaim) {
        cooldownActive = true;
        cooldownReason = data.eligibility.reason;
        showCooldownWarning(data.eligibility.reason, data.eligibility.cooldownRemaining);
      }
    }
  } catch (error) {
    console.error('Failed to start session:', error);
    showStatus('Failed to initialize. Please refresh the page.', 'error');
  }
}

// Generate a simple browser fingerprint
function generateFingerprint() {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  ctx.textBaseline = 'top';
  ctx.font = '14px Arial';
  ctx.fillText('fingerprint', 2, 2);
  
  const data = [
    navigator.userAgent,
    navigator.language,
    screen.width + 'x' + screen.height,
    screen.colorDepth,
    new Date().getTimezoneOffset(),
    canvas.toDataURL(),
  ].join('|');
  
  // Simple hash
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return 'fp_' + Math.abs(hash).toString(36);
}

// Show cooldown warning
function showCooldownWarning(reason, cooldownMinutes) {
  const warningHtml = `
    <div class="cooldown-warning" id="cooldownWarning">
      <div class="cooldown-icon">⏳</div>
      <div class="cooldown-text">${reason}</div>
      ${cooldownMinutes ? `<div class="cooldown-timer" id="cooldownTimer">Time remaining: ${formatCooldown(cooldownMinutes)}</div>` : ''}
    </div>
  `;
  
  // Insert warning at the top of checkpoint section
  const checkpointSection = document.querySelector('.checkpoint-buttons');
  if (checkpointSection) {
    checkpointSection.insertAdjacentHTML('beforebegin', warningHtml);
  }
  
  // Disable all checkpoint buttons
  document.querySelectorAll('.checkpoint-btn').forEach(btn => {
    btn.disabled = true;
    btn.style.opacity = '0.5';
  });
  
  // Start countdown timer if cooldown is active
  if (cooldownMinutes) {
    startCooldownTimer(cooldownMinutes);
  }
}

// Format cooldown time
function formatCooldown(minutes) {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours > 0) {
    return `${hours}h ${mins}m`;
  }
  return `${mins}m`;
}

// Countdown timer
function startCooldownTimer(minutes) {
  let remaining = minutes * 60; // convert to seconds
  
  const timer = setInterval(() => {
    remaining--;
    
    if (remaining <= 0) {
      clearInterval(timer);
      // Remove warning and enable buttons
      const warning = document.getElementById('cooldownWarning');
      if (warning) warning.remove();
      
      document.querySelectorAll('.checkpoint-btn').forEach(btn => {
        btn.disabled = false;
        btn.style.opacity = '1';
      });
      
      cooldownActive = false;
      cooldownReason = null;
      showStatus('Cooldown ended! You can now claim a key.', 'success');
      return;
    }
    
    const timerEl = document.getElementById('cooldownTimer');
    if (timerEl) {
      const mins = Math.floor(remaining / 60);
      const secs = remaining % 60;
      timerEl.textContent = `Time remaining: ${formatCooldown(mins)}${secs < 10 ? ':0' : ':'}${secs}`;
    }
  }, 1000);
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
  
  // Check if cooldown is active
  if (cooldownActive) {
    showStatus(cooldownReason || 'Please wait for cooldown to end.', 'error');
    return;
  }
  
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
      
      // Clear session after successful claim
      localStorage.removeItem('checkpoint_session');
    } else if (response.status === 429) {
      // Rate limit / cooldown error
      cooldownActive = true;
      cooldownReason = data.message;
      showCooldownWarning(data.message, data.cooldownRemaining);
      claimBtn.disabled = true;
      claimText.textContent = 'Rate Limited';
    } else {
      throw new Error(data.error || data.message || 'Failed to claim key');
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
  console.log('Checking pending checkpoint:', pending);
  console.log('Session token:', sessionToken);
  
  if (pending) {
    try {
      const data = JSON.parse(pending);
      console.log('Parsed pending data:', data);
      console.log('Time diff:', Date.now() - data.timestamp);
      
      // Check if it's recent (within 10 minutes)
      if (Date.now() - data.timestamp < 10 * 60 * 1000) {
        console.log('Pending checkpoint is valid, verifying...');
        localStorage.removeItem('pending_checkpoint');
        
        // For all providers, verify directly
        if (sessionToken) {
          console.log('Session ready, calling verifyCheckpoint');
          verifyCheckpoint(data.provider);
        } else {
          console.log('Session not ready, waiting...');
          const waitForSession = setInterval(() => {
            if (sessionToken) {
              clearInterval(waitForSession);
              console.log('Session now ready, calling verifyCheckpoint');
              verifyCheckpoint(data.provider);
            }
          }, 200);
          
          setTimeout(() => {
            clearInterval(waitForSession);
            console.log('Timeout waiting for session');
          }, 5000);
        }
      } else {
        console.log('Pending checkpoint expired');
        localStorage.removeItem('pending_checkpoint');
      }
    } catch (e) {
      console.error('Error parsing pending checkpoint:', e);
      localStorage.removeItem('pending_checkpoint');
    }
  } else {
    console.log('No pending checkpoint found');
  }
}

// Check for Linkvertise hash in URL (anti-bypass verification)
async function checkLinkvertiseHash() {
  const params = new URLSearchParams(window.location.search);
  const hash = params.get('hash');
  
  if (hash && sessionToken) {
    console.log('Found Linkvertise hash, verifying...');
    
    try {
      const response = await fetch(`${CONFIG.apiUrl}/api/checkpoint/verify-linkvertise`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hash, token: sessionToken }),
      });
      
      const data = await response.json();
      console.log('Linkvertise verify response:', data);
      
      if (data.success) {
        completedProviders.add('linkvertise');
        
        const btn = document.querySelector('.checkpoint-btn.linkvertise');
        if (btn) {
          btn.classList.add('done');
          btn.innerHTML = 'Completed';
          btn.disabled = true;
        }
        
        updateUI();
        showStatus('Linkvertise completed!', 'success');
        
        // Clean URL
        window.history.replaceState({}, '', window.location.pathname);
      }
    } catch (error) {
      console.error('Linkvertise verification failed:', error);
    }
  }
}

// Initialize on load
async function init() {
  await initSession();
  await checkLinkvertiseHash();
  checkPendingCheckpoint();
}
init();
