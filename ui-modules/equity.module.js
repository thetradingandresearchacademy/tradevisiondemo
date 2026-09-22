// ================= TRADEVISION EQUITY MODULE – FINAL =================

(function(){

if(window.__EQUITY_MODULE__) return;
window.__EQUITY_MODULE__ = true;

let canvas, ctx;
let equityData = [];

// ---------------- INIT ----------------
function init(){

  canvas = document.getElementById("equityCanvas");
  if(!canvas) return;

  ctx = canvas.getContext("2d");

  resize();
  draw();
}

// ---------------- RESIZE ----------------
function resize(){
  if(!canvas) return;

  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width;
  canvas.height = rect.height;
}

// ---------------- DRAW ----------------
function draw(){

  if(!ctx || !canvas) return;

  ctx.clearRect(0,0,canvas.width,canvas.height);

  if(equityData.length === 0) return;

  const padding = 10;
  const width = canvas.width - padding*2;
  const height = canvas.height - padding*2;

  const min = Math.min(...equityData);
  const max = Math.max(...equityData);

  const range = max - min || 1;

  ctx.beginPath();

  equityData.forEach((value,i)=>{

    const x = padding + (i/(equityData.length-1 || 1)) * width;
    const y = padding + height - ((value-min)/range)*height;

    if(i===0) ctx.moveTo(x,y);
    else ctx.lineTo(x,y);
  });

  ctx.strokeStyle = "#22c55e";
  ctx.lineWidth = 2;
  ctx.stroke();
}

// ---------------- UPDATE FROM HISTORY ----------------
function rebuildFromHistory(){

  if(!window.tradeHistory) return;

  equityData = [];
  let cumulative = 0;

  window.tradeHistory.forEach(t=>{
    cumulative += t.pnl;
    equityData.push(cumulative);
  });

  draw();
}

// ---------------- EVENT LISTENER ----------------
document.addEventListener("tradeClosed", function(e){

  if(!e.detail || typeof e.detail.pnl !== "number") return;

  const prev = equityData.length ? equityData[equityData.length-1] : 0;
  equityData.push(prev + e.detail.pnl);

  draw();
});

// ---------------- RESET LISTENER ----------------
document.addEventListener("DOMContentLoaded", function(){
  init();
  rebuildFromHistory();
});

window.addEventListener("resize", function(){
  resize();
  draw();
});

})();
