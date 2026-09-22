(async function(){

let supabaseClient = null;
window.authReady = false;
window.accessApproved = false;

function setLoginBusy(isBusy){
  const button = document.getElementById("loginBtn");
  if(!button) return;
  button.disabled = !!isBusy;
  button.textContent = isBusy ? "Sending secure link..." : "Send secure sign-in link";
}

function updateStatus(message, state){
  const statusEl = document.getElementById("authStatus") || document.getElementById("loginStatus");
  if(statusEl){
    statusEl.innerText = message;
    if(statusEl.id === "loginStatus"){
      statusEl.dataset.state = state || "neutral";
    }
  }
}

function updateAccountChrome(session, plan){
  const emailEl = document.getElementById("userEmail");
  const planEl = document.getElementById("planChip");
  if(emailEl) emailEl.textContent = session && session.user ? (session.user.email || "") : "";
  if(planEl) planEl.textContent = String(plan || "free").toUpperCase();
}

function lockApp(message, state){
  window.accessApproved = false;
  document.body.classList.remove("authorized");

  const gate = document.getElementById("authGate");
  if(gate) gate.style.display = "grid";

  const startBtn = document.getElementById("startBtn");
  if(startBtn) startBtn.disabled = true;

  if(message) updateStatus(message, state || "neutral");
}

function unlockAppIfExists(){
  const gate = document.getElementById("authGate");
  if(gate) gate.style.display = "none";
  document.body.classList.add("authorized");
}

async function initAuth(){
  const startBtn = document.getElementById("startBtn");
  if(startBtn) startBtn.disabled = true;

  lockApp("Initializing secure access...", "neutral");

  try{
    const response = await fetch("/api/auth_config");
    if(!response.ok){
      console.error("Auth config failed");
      lockApp("Secure sign-in is temporarily unavailable. Please try again shortly.", "error");
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
    lockApp("Authorization service is temporarily unavailable.", "error");
  }
}

async function handleMagicLinkRedirect(){
  if(!supabaseClient) return;

  const hash = window.location.hash || "";
  if(!hash) return;

  if(hash.includes("error=")){
    const params = new URLSearchParams(hash.replace(/^#/, ""));
    const code = params.get("error_code");
    const description = params.get("error_description");

    window.history.replaceState({}, document.title, window.location.pathname);

    if(code === "otp_expired"){
      updateStatus("That sign-in link has expired or was already used. Request a new secure link below.", "warning");
    }else{
      updateStatus(description || "The sign-in link could not be verified. Request a new link.", "error");
    }
    return;
  }

  if(hash.includes("access_token") || hash.includes("code=")){
    try{
      await supabaseClient.auth.exchangeCodeForSession(window.location.href);
    }catch(err){
      console.error("Magic link exchange failed:", err);
    }finally{
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }
}

async function loginMagic(){
  if(!supabaseClient){
    updateStatus("Secure sign-in is still initializing. Please try again in a moment.", "warning");
    return;
  }

  const emailInput = document.getElementById("emailInput") || document.getElementById("loginEmail");
  if(!emailInput) return;

  const email = emailInput.value.trim();
  if(!email){
    updateStatus("Enter your approved email address.", "warning");
    emailInput.focus();
    return;
  }

  setLoginBusy(true);
  try{
    const { error } = await supabaseClient.auth.signInWithOtp({ email });
    if(error){
      console.error(error);
      updateStatus("We could not send the sign-in link. Please verify the email and try again.", "error");
      return;
    }
    updateStatus("Secure sign-in link sent. Open the newest email and use the link once.", "success");
  }finally{
    setLoginBusy(false);
  }
}

async function checkSession(){
  if(!supabaseClient) return;

  const { data: { session } } = await supabaseClient.auth.getSession();

  if(session) await activateUser(session);
  else lockApp("Sign in is required to open the TradeVision workspace.", "neutral");

  supabaseClient.auth.onAuthStateChange(async (event, session) => {
    if(session) await activateUser(session);
    else{
      updateAccountChrome(null, "free");
      lockApp("Sign in is required to open the TradeVision workspace.", "neutral");
    }
  });
}

async function activateUser(session){
  window.currentUser = session.user;
  window.accessApproved = false;
  lockApp("Signed in. Verifying account access...", "neutral");

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
      if(response.status === 403){
        lockApp("Your sign-in is valid, but this account is awaiting administrator approval.", "warning");
      }else if(response.status === 401){
        lockApp("Your secure session is no longer valid. Request a new sign-in link.", "warning");
      }else{
        lockApp("Account authorization is temporarily unavailable.", "error");
      }
      return;
    }

    const access = await response.json();
    window.currentPlan = access.plan || "free";
    window.accessApproved = true;

    updateAccountChrome(session, window.currentPlan);
    unlockAppIfExists();

    const startBtn = document.getElementById("startBtn");
    if(startBtn) startBtn.disabled = false;
  }catch(err){
    console.error("Access check failed:", err);
    lockApp("Account authorization is temporarily unavailable.", "error");
  }
}

async function logoutTradeVision(){
  if(!supabaseClient) return;

  try{
    await supabaseClient.auth.signOut();
  }catch(err){
    console.error("Sign out failed:", err);
  }finally{
    window.currentUser = null;
    window.currentPlan = "free";
    updateAccountChrome(null, "free");
    lockApp("You have signed out securely.", "success");
  }
}

window.loginMagic = loginMagic;
window.logoutTradeVision = logoutTradeVision;
document.addEventListener("DOMContentLoaded", initAuth);

})();
