(function(){

function calculatePerformance(){

  if(!window.tradeHistory || !window.tradeHistory.length){
    return null;
  }

  const trades = window.tradeHistory;
  const pnls = trades.map(t => Number(t.pnl || 0));

  const totalTrades = pnls.length;
  const wins = pnls.filter(p => p > 0);
  const losses = pnls.filter(p => p < 0);

  const winRate = totalTrades
    ? (wins.length / totalTrades) * 100
    : 0;

  const avgWin = wins.length
    ? wins.reduce((a,b)=>a+b,0) / wins.length
    : 0;

  const avgLoss = losses.length
    ? Math.abs(losses.reduce((a,b)=>a+b,0) / losses.length)
    : 0;

  const expectancy =
    (winRate/100 * avgWin) -
    ((1 - winRate/100) * avgLoss);

  const mean =
    pnls.reduce((a,b)=>a+b,0) / totalTrades;

  const variance =
    pnls.reduce((a,b)=>a+Math.pow(b-mean,2),0) / totalTrades;

  const stdDev = Math.sqrt(variance);

  const stability =
    stdDev ? Math.abs(mean / stdDev) : 0;

  const grade = computeGrade({
    expectancy,
    winRate,
    stability
  });

  return {
    totalTrades,
    winRate: winRate.toFixed(1),
    avgWin: avgWin.toFixed(2),
    avgLoss: avgLoss.toFixed(2),
    expectancy: expectancy.toFixed(2),
    stability: stability.toFixed(2),
    grade
  };
}

function computeGrade({ expectancy, winRate, stability }){

  let score = 0;

  if(expectancy > 0) score += 2;
  if(expectancy > 1) score += 1;

  if(winRate > 50) score += 1;
  if(winRate > 60) score += 1;

  if(stability > 0.5) score += 1;
  if(stability > 1) score += 1;

  if(score >= 6) return "A";
  if(score >= 4) return "B";
  if(score >= 2) return "C";
  return "D";
}

function renderPerformance(){

  const metrics = calculatePerformance();
  if(!metrics) return;

  /* ✅ NEW: Expose globally for Performance Hub */
  window.performanceGrade = metrics;

  /* ✅ NEW: Notify hub */
  document.dispatchEvent(new Event("performanceUpdated"));

}

document.addEventListener("tradeClosed", function(){
  renderPerformance();
});

document.addEventListener("DOMContentLoaded", function(){

  const btn = document.getElementById("resetPerformanceBtn");

  if(btn){
    btn.addEventListener("click", function(){

      window.tradeHistory = [];

      const container = document.getElementById("performanceGrade");
      if(container) container.remove();

      /* ✅ NEW: Clear global reference */
      window.performanceGrade = null;
      document.dispatchEvent(new Event("performanceUpdated"));

    });
  }

});

})();
