(function(){

if(window.__TRADE_MARKERS__) return;
window.__TRADE_MARKERS__=true;

document.addEventListener("tradeClosed",function(e){

  if(!window.simulationSeries) return;
  if(!window.revealIndex) return;

  const marker={
    time: simulatedCandles[revealIndex-1]?.time,
    position: e.detail.pnl>=0 ? 'aboveBar':'belowBar',
    color: e.detail.pnl>=0 ? '#16a34a':'#dc2626',
    shape: e.detail.pnl>=0 ? 'arrowUp':'arrowDown',
    text: e.detail.pnl.toFixed(2)
  };

  const existing = simulationSeries.getMarkers()||[];
  simulationSeries.setMarkers([...existing,marker]);

});

})();
