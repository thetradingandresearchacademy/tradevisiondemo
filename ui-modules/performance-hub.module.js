// /ui-modules/performance-hub.module.js

(function(){

  const hub = document.getElementById("performanceHub");
  const analyticsContent = document.getElementById("analyticsContent");

  if(!hub || !analyticsContent) return;

  function renderShell(){

    hub.innerHTML = `
      <div class="hub-container">

        <div class="hub-section">
          <h4>Session Intelligence</h4>
          <div id="hubSessionStats"></div>
        </div>

        <div class="hub-section">
          <h4>Performance Grade</h4>
          <div id="hubPerformanceStats"></div>
        </div>

        <div class="hub-section">
          <h4>Growth Intelligence</h4>
          <div id="hubGrowthStats"></div>
        </div>

        <div class="hub-section">
          <h4>Skill Rating</h4>
          <div id="hubSkillRating"></div>
        </div>

      </div>
    `;
  }

  /* ==========================
     SESSION INTELLIGENCE
  ========================== */

  function updateSessionFromTracker(){

    if(!window.sessionMetrics) return;

    const m = window.sessionMetrics;

    const total = m.trades || 0;
    const wins = m.wins || 0;
    const winRate = total ? ((wins/total)*100).toFixed(1) : 0;

    const el = document.getElementById("hubSessionStats");
    if(!el) return;

    el.innerHTML = `
      <div style="font-size:12px;">
        Trades: <strong>${total}</strong><br>
        Win Rate: <strong>${winRate}%</strong><br>
        Aggression: ${m.aggressionScore?.toFixed?.(2) ?? 0}<br>
        Consistency: ${m.consistencyScore?.toFixed?.(2) ?? 0}
      </div>
    `;
  }

  /* ==========================
     PERFORMANCE GRADE
  ========================== */

  function updatePerformanceFromGrade(){

    if(!window.performanceGrade) return;

    const g = window.performanceGrade;

    const el = document.getElementById("hubPerformanceStats");
    if(!el) return;

    el.innerHTML = `
      <div style="font-size:12px;">
        Grade: <strong>${g.grade}</strong><br>
        Expectancy: ${g.expectancy?.toFixed?.(2) ?? 0}<br>
        Stability: ${g.stability?.toFixed?.(2) ?? 0}<br>
        Avg Win: ${g.avgWin?.toFixed?.(2) ?? 0}<br>
        Avg Loss: ${g.avgLoss?.toFixed?.(2) ?? 0}
      </div>
    `;
  }

  /* ==========================
     GROWTH INTELLIGENCE
  ========================== */

  async function updateGrowthSummary(){

    if(!window.supabase) return;

    const { data } = await window.supabase.auth.getUser();
    if(!data?.user) return;

    const { data:sessions } =
      await window.supabase
        .from("user_sessions")
        .select("*")
        .order("created_at",{ascending:false});

    if(!sessions?.length) return;

    const totalSessions = sessions.length;
    const cumulative = sessions.reduce((s,x)=>s+(x.net_pnl||0),0);

    const el = document.getElementById("hubGrowthStats");
    if(!el) return;

    el.innerHTML = `
      <div style="font-size:12px;">
        Sessions: <strong>${totalSessions}</strong><br>
        Cumulative: <strong style="color:${cumulative>=0?"#22c55e":"#ef4444"}">${cumulative.toFixed(2)}</strong>
      </div>
    `;

    updateSkillRating(totalSessions, cumulative);
  }

  /* ==========================
     SKILL RATING
  ========================== */

  function updateSkillRating(totalSessions, cumulative){

    let score = 0;

    if(window.performanceGrade?.expectancy > 0) score += 40;
    if(cumulative > 0) score += 30;
    if(totalSessions > 5) score += 20;

    let level = "Rookie";
    if(score > 80) level = "Adaptive Pro";
    else if(score > 60) level = "Regime Reader";
    else if(score > 40) level = "Structured Trader";

    const el = document.getElementById("hubSkillRating");
    if(!el) return;

    el.innerHTML = `
      <div style="font-size:12px;">
        Level: <strong>${level}</strong><br>
        Composite Score: ${score}
      </div>
    `;
  }

  function setupTabs(){

    const tabHub = document.getElementById("tabHub");
    const tabAnalytics = document.getElementById("tabAnalytics");

    function showHub(){
      hub.style.display="block";
      analyticsContent.style.display="none";
      tabHub.style.background="#2563eb";
      tabAnalytics.style.background="#1f2937";
    }

    function showAnalytics(){
      hub.style.display="none";
      analyticsContent.style.display="block";
      tabAnalytics.style.background="#2563eb";
      tabHub.style.background="#1f2937";
    }

    tabHub.onclick = showHub;
    tabAnalytics.onclick = showAnalytics;

    showAnalytics();
  }

  function bindEvents(){
    document.addEventListener("tradeClosed", ()=>{
      updateSessionFromTracker();
      updatePerformanceFromGrade();
    });

    document.addEventListener("simulationStarted", updateSessionFromTracker);
    document.addEventListener("sessionSaved", updateGrowthSummary);
  }

  function init(){
    renderShell();
    setupTabs();
    bindEvents();
  }

  init();

})();
