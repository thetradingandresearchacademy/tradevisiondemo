(function(){

if(window.__TV_WATERMARK__) return;
window.__TV_WATERMARK__=true;

function mount(){

  const chart=document.getElementById("chart");
  if(!chart) return;

  const wm=document.createElement("div");
  wm.innerText="TRADEVISION\nRegime-Aware Market Lab";
  wm.style.position="absolute";
  wm.style.opacity="0.03";
  wm.style.fontSize="48px";
  wm.style.textAlign="center";
  wm.style.width="100%";
  wm.style.top="40%";
  wm.style.pointerEvents="none";
  wm.style.whiteSpace="pre-line";

  chart.style.position="relative";
  chart.appendChild(wm);
}

document.readyState==="loading"
? document.addEventListener("DOMContentLoaded",mount)
: mount();

})();
