(function(){

if(window.__TRADE_BADGE__) return;
window.__TRADE_BADGE__ = true;

function show(pnl){

  const badge=document.createElement("div");
  badge.style.position="fixed";
  badge.style.top="20px";
  badge.style.right="20px";
  badge.style.padding="8px 14px";
  badge.style.borderRadius="8px";
  badge.style.fontWeight="bold";
  badge.style.zIndex="9999";
  badge.style.background=pnl>=0?"#16a34a":"#dc2626";
  badge.innerText=(pnl>=0?"+":"")+pnl.toFixed(2);

  document.body.appendChild(badge);

  setTimeout(()=>badge.remove(),2000);
}

document.addEventListener("tradeClosed",e=>{
  if(typeof e.detail?.pnl==="number")
    show(e.detail.pnl);
});

})();
