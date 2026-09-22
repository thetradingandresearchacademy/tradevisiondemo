(function(){

if(window.__SESSION_STATUS__) return;
window.__SESSION_STATUS__ = true;

let bar;

function mount(){

  const main = document.querySelector(".main");
  if(!main) return;

  bar = document.createElement("div");
  bar.style.height = "32px";
  bar.style.display = "flex";
  bar.style.alignItems = "center";
  bar.style.justifyContent = "space-between";
  bar.style.padding = "0 12px";
  bar.style.background = "#0f172a";
  bar.style.borderRadius = "6px";
  bar.style.fontSize = "12px";
  bar.style.marginBottom = "6px";

  bar.innerHTML = `
    <div id="simStatus">Simulation: Idle</div>
    <div id="sessionNet">Net: 0</div>
  `;

  main.prepend(bar);
}

function updateNet(){

  if(!window.tradeHistory) return;

  const net = tradeHistory.reduce((a,b)=>a+b.pnl,0);

  const el = document.getElementById("sessionNet");
  if(!el) return;

  el.innerText = "Net: " + net.toFixed(2);
  el.style.color = net>=0 ? "#22c55e" : "#ef4444";
}

function hook(){

  document.addEventListener("tradeClosed", updateNet);

  const play = window.playSimulation;
  window.playSimulation = function(){
    document.getElementById("simStatus").innerText = "Simulation: Running";
    return play.apply(this,arguments);
  };

  const pause = window.pauseSimulation;
  window.pauseSimulation = function(){
    document.getElementById("simStatus").innerText = "Simulation: Paused";
    return pause.apply(this,arguments);
  };
}

function init(){
  mount();
  hook();
}

document.readyState==="loading"
? document.addEventListener("DOMContentLoaded",init)
: init();

})();
