(function(){

/* ============================= */
/* INITIALIZE GLOBAL OBJECT */
/* ============================= */

if(!window.sessionMetrics){
  window.sessionMetrics = {
    trades: 0,
    wins: 0,
    losses: 0,
    aggressionScore: 0,
    overtrades: 0,
    consistencyScore: 0
  };
}

/* ============================= */
/* CALCULATION ENGINE */
/* ============================= */

function calculateSession(){

  const history = window.tradeHistory || [];
  const totalTrades = history.length;

  if(!totalTrades){
    window.sessionMetrics = {
      trades: 0,
      wins: 0,
      losses: 0,
      aggressionScore: 0,
      overtrades: 0,
      consistencyScore: 0
    };
    return;
  }

  const wins = history.filter(t => Number(t.pnl) > 0).length;
  const losses = history.filter(t => Number(t.pnl) < 0).length;

  // Aggression index = average position size
  const avgQty = history.reduce((a,b)=>a + Number(b.qty || 1),0) / totalTrades;

  // Overtrading rule: >10 trades
  const overtrades = totalTrades > 10 ? totalTrades - 10 : 0;

  // Consistency score (inverse pnl volatility)
  const pnls = history.map(t => Number(t.pnl));
  const mean = pnls.reduce((a,b)=>a+b,0) / totalTrades;
  const variance = pnls.reduce((a,b)=>a + Math.pow(b-mean,2),0) / totalTrades;
  const stdDev = Math.sqrt(variance);
  const consistency = stdDev ? Math.abs(mean/stdDev) : 0;

  window.sessionMetrics = {
    trades: totalTrades,
    wins,
    losses,
    aggressionScore: Number(avgQty.toFixed(2)),
    overtrades,
    consistencyScore: Number(consistency.toFixed(2))
  };

  // Notify Performance Hub
  document.dispatchEvent(new Event("sessionMetricsUpdated"));
}

/* ============================= */
/* RESET LOGIC */
/* ============================= */

function resetSessionMetrics(){

  window.sessionMetrics = {
    trades: 0,
    wins: 0,
    losses: 0,
    aggressionScore: 0,
    overtrades: 0,
    consistencyScore: 0
  };

  document.dispatchEvent(new Event("sessionMetricsUpdated"));
}

/* ============================= */
/* EVENTS */
/* ============================= */

document.addEventListener("tradeClosed", function(){
  calculateSession();
});

document.addEventListener("simulationStarted", function(){
  resetSessionMetrics();
});

})();
