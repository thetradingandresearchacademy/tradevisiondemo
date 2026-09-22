(async function(){

let supabaseClient = null;
window.authReady = false;
window.accessApproved = false;

async function initAuth(){
  const startBtn = document.getElementById("startBtn");
  if(startBtn) startBtn.disabled = true;

  try{
    const response = await fetch("/api/auth_config");
    if(!response.ok){
      console.error("Auth config failed");
      alert("System failed to initialize auth.");
      return;
    }

    const config = await response.json();
    supabaseClient = window.supabase.createClient(config.url, config.anonKey);
    window.supabase = supabaseClient;
    window.authReady = true;

    await handleMagicLinkRedirect();
    await checkSession();
  }catch(err){
    console.error("Auth init failed:", err);
    updateStatus("Authorization unavailable");
  }
}

async function handleMagicLinkRedirect(){
  if(!supabaseClient) return;
  const hash = window.location.hash;
  if(hash && (hash.includes("access_token") || hash.includes("error"))){
    await supabaseClient.auth.exchangeCodeForSession(window.location.href);
    window.history.replaceState({}, document.title, window.location.pathname);
  }
}

async function loginMagic(){
  const emailInput = document.getElementById("emailInput") || document.getElementById("loginEmail");
  if(!emailInput) return;
  const email = emailInput.value.trim();
  if(!email){ alert("Enter email."); return; }

  const { error } = await supabaseClient.auth.signInWithOtp({ email });
  if(error){ alert("Login failed."); console.error(error); return; }
  updateStatus("Magic link sent. Check email.");
}

async function checkSession(){
  if(!supabaseClient) return;
  const { data: { session } } = await supabaseClient.auth.getSession();
  if(session) await activateUser(session);
  else lockApp("Login required");

  supabaseClient.auth.onAuthStateChange(async (event, session) => {
    if(session) await activateUser(session);
    else lockApp("Login required");
  });
}

async function activateUser(session){
  window.currentUser = session.user;
  window.accessApproved = false;
  lockApp("Checking access...");

  try{
    const response = await fetch("/api/check_access", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + session.access_token
      },
      body: JSON.stringify({})
    });

    if(!response.ok){
      if(response.status === 403) lockApp("Logged in — waiting for administrator approval");
      else lockApp("Authorization unavailable");
      return;
    }

    const access = await response.json();
    window.currentPlan = access.plan || "free";
    window.accessApproved = true;
    updateStatus("Logged in: " + session.user.email);
    unlockAppIfExists();

    const startBtn = document.getElementById("startBtn");
    if(startBtn) startBtn.disabled = false;
  }catch(err){
    console.error("Access check failed:", err);
    lockApp("Authorization unavailable");
  }
}

function updateStatus(message){
  const statusEl = document.getElementById("authStatus") || document.getElementById("loginStatus");
  if(statusEl) statusEl.innerText = message;
}

function lockApp(message){
  window.accessApproved = false;
  const gate = document.getElementById("authGate");
  if(gate) gate.style.display = "flex";
  const startBtn = document.getElementById("startBtn");
  if(startBtn) startBtn.disabled = true;
  if(message) updateStatus(message);
}

function unlockAppIfExists(){
  const gate = document.getElementById("authGate");
  if(gate) gate.style.display = "none";
}

window.loginMagic = loginMagic;
document.addEventListener("DOMContentLoaded", initAuth);

})();
