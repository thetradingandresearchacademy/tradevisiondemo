(function(){

if(window.__LIVE_METRICS__) return;
window.__LIVE_METRICS__ = true;

let box;

function mount(){

  const container = document.getElementById("liveMetricsBox");
  if(!container) return;

  box = document.createElement("div");
  box.style.background="#1f2937";
  box.style.padding="10px";
  box.style.borderRadius="6px";
  box.style.fontSize="12px";

  container.appendChild(box);

  update();
}

function update(){

  if(!window.tradeHistory) return;

  const total = tradeHistory.length;
  const wins = tradeHistory.filter(t=>t.pnl>0).length;

  let equity=0,peak=0,maxDD=0;

  tradeHistory.forEach(t=>{
    equity+=t.pnl;
    peak=Math.max(peak,equity);
    maxDD=Math.max(maxDD,peak-equity);
  });

  box.innerHTML = `
    <div>Total Trades: ${total}</div>
    <div>Win Rate: ${total?((wins/total*100).toFixed(1)):"0"}%</div>
    <div>Max DD: ${maxDD.toFixed(2)}</div>
  `;
}

document.addEventListener("tradeClosed",update);

document.readyState==="loading"
? document.addEventListener("DOMContentLoaded",mount)
: mount();

})();
