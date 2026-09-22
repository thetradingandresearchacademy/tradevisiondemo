// ================= TRADEVISION UI CORE – FINAL ENTERPRISE =================

// ---------------- STATE ----------------
let chart, historySeries, simulationSeries;
let simulatedCandles = [];
let originalSimulated = [];
let revealIndex = 0;
let revealTimer = null;
let simulationSpeed = 500;
let replayCount = 0;

let trade = { active:false, direction:null, qty:0, avg:0, stop:null };

window.tradeHistory = [];
let simulationLoaded = false;
//=======================================================

// ---------------- SEARCH (SMOOTHED) ----------------
const symbolInput = document.getElementById("symbol");
const resultsBox = document.getElementById("symbolResults");

let searchTimeout = null;
let activeController = null;

if(symbolInput && resultsBox){

  symbolInput.addEventListener("input", function(){

    const query = this.value.trim();

    if(searchTimeout) clearTimeout(searchTimeout);

    if(activeController){
      activeController.abort();
      activeController = null;
    }

    if(query.length < 2){
      resultsBox.style.display = "none";
      return;
    }

    searchTimeout = setTimeout(async ()=>{

      try{

        activeController = new AbortController();

        if(!window.supabase) return;
        const { data: sessionData } = await window.supabase.auth.getSession();
        if(!sessionData?.session) return;

        const response = await fetch("/api/search_symbols",{
          method:"POST",
          headers:{
            "Content-Type":"application/json",
            "Authorization":"Bearer " + sessionData.session.access_token
          },
          body: JSON.stringify({ query }),
          signal: activeController.signal
        });

        if(!response.ok){
          resultsBox.style.display="none";
          return;
        }

        const data = await response.json();
        const symbols = data.symbols || [];

        resultsBox.innerHTML = "";

        const fragment = document.createDocumentFragment();

        symbols.slice(0,15).forEach(sym=>{
          const div = document.createElement("div");
          div.textContent = sym;
          div.style.padding="6px 10px";
          div.style.cursor="pointer";

          div.onclick = ()=>{
            symbolInput.value = sym;
            resultsBox.style.display="none";
          };

          fragment.appendChild(div);
        });

        resultsBox.appendChild(fragment);
        resultsBox.style.display = symbols.length ? "block" : "none";

      }catch(err){
        if(err.name !== "AbortError"){
          resultsBox.style.display="none";
        }
      }

    },250); // slightly faster

  });
}
// ---------------- SEARCH (RESTORED) ----------------
//const symbolInput = document.getElementById("symbol");
//const resultsBox = document.getElementById("symbolResults");

//let searchTimeout = null;

//if(symbolInput && resultsBox){

  //symbolInput.addEventListener("input", function(){

    //const query = this.value.trim();

    //if(searchTimeout) clearTimeout(searchTimeout);

    //if(query.length < 2){
     // resultsBox.style.display = "none";
      //return;
    //}

    //searchTimeout = setTimeout(async ()=>{

      //try{

        //const response = await fetch("/api/search_symbols",{
          //method:"POST",
          //headers:{ "Content-Type":"application/json" },
          //body: JSON.stringify({ query })
        //});

        //if(!response.ok){
         // resultsBox.style.display="none";
          //return;
       // }

        //const data = await response.json();
        //const symbols = data.symbols || [];

        //resultsBox.innerHTML = "";

        //symbols.slice(0,15).forEach(sym=>{
         // const div = document.createElement("div");
          //div.innerText = sym;
          //div.style.padding="6px 10px";
          //div.style.cursor="pointer";

          //div.onclick = ()=>{
            //symbolInput.value = sym;
            //resultsBox.style.display="none";
          //};

          //resultsBox.appendChild(div);
        //});

        // resultsBox.style.display = symbols.length ? "block" : "none";

      // }catch{
        // resultsBox.style.display="none";
     // }

    // },300);

  // });
// }

// ---------------- CHART ----------------
window.initChart = function(){

  const container = document.getElementById("chart");
  container.innerHTML = "";

  chart = LightweightCharts.createChart(container,{
    layout:{ background:{color:"#0b1220"}, textColor:"#ffffff" },
    width:container.clientWidth,
    height:container.clientHeight,
    grid:{
      vertLines:{color:"rgba(255,255,255,0.05)"},
      horzLines:{color:"rgba(255,255,255,0.05)"}
    }
  });

  historySeries = chart.addCandlestickSeries();
  simulationSeries = chart.addCandlestickSeries({
    upColor:"#facc15",
    downColor:"#f97316",
    borderUpColor:"#facc15",
    borderDownColor:"#f97316",
    wickUpColor:"#facc15",
    wickDownColor:"#f97316"
  });

  window.chart = chart;
  window.simulationSeries = simulationSeries;
};

// ---------------- LOAD DATA ----------------
window.loadSimulationData = function(history, simulated){

  initChart();

  const now = Math.floor(Date.now()/1000);
  const day = 86400;

  historySeries.setData(
    history.map((c,i)=>({
      time: now - (history.length-i)*day,
      open:c.open,
      high:c.high,
      low:c.low,
      close:c.close
    }))
  );

  simulatedCandles = simulated.map((c,i)=>({
    time: now + i*day,
    open:c.open,
    high:c.high,
    low:c.low,
    close:c.close
  }));

  originalSimulated = JSON.parse(JSON.stringify(simulatedCandles));
  simulationSeries.setData([]);
  revealIndex = 0;
  simulationLoaded = true;
};

// ---------------- PLAYBACK ----------------
window.playSimulation = function(){
  if(!simulationLoaded) return;
  if(revealTimer) return;
  revealTimer = setInterval(revealNext, simulationSpeed);
};

window.pauseSimulation = function(){
  if(revealTimer){
    clearInterval(revealTimer);
    revealTimer = null;
  }
};

window.fastForward = function(){
  if(!simulationLoaded) return;
  pauseSimulation();
  simulationSeries.setData(simulatedCandles);
  revealIndex = simulatedCandles.length;
};

// ---------------- SESSION ----------------
window.resetSession = function(){
  pauseSimulation();
  revealIndex = 0;
  simulationSeries.setData([]);
  resetTrade();
};

window.restartSession = function(){
  pauseSimulation();
  simulatedCandles = JSON.parse(JSON.stringify(originalSimulated));
  revealIndex = 0;
  simulationSeries.setData([]);
  resetTrade();
  replayCount++;
  document.getElementById("sessionInfo").innerText =
    "Replays: " + replayCount;
};

// ---------------- TRADE ----------------
window.enterTrade = function(dir){

  if(revealIndex <= 0) return;

  const price = simulatedCandles[revealIndex-1].close;

  if(!trade.active){
    trade.active = true;
    trade.direction = dir;
    trade.qty = 1;
    trade.avg = price;
  }else if(trade.direction === dir){
    trade.avg = (trade.avg*trade.qty + price)/(trade.qty+1);
    trade.qty++;
  }else{
    window.closeTrade("Reverse");
    return;
  }

  updatePanel();
};

window.closeTrade = function(reason){

  if(!trade.active) return;

  const exit = simulatedCandles[revealIndex-1]?.close || 0;

  let pnlValue = trade.direction==="buy"
    ? (exit - trade.avg)
    : (trade.avg - exit);

  pnlValue *= trade.qty;

  const tradeRecord = {
    dir:trade.direction,
    qty:trade.qty,
    entry:trade.avg,
    exit:exit,
    pnl:pnlValue,
    reason:reason
  };

  window.tradeHistory.push(tradeRecord);

  document.dispatchEvent(
    new CustomEvent("tradeClosed", {
      detail: { pnl: pnlValue }
    })
  );

  renderLog();
  resetTrade();
};

window.setStop = function(){
  if(!trade.active) return;
  trade.stop = parseFloat(document.getElementById("stopInput").value);
};

function revealNext(){

  if(revealIndex >= simulatedCandles.length){
    pauseSimulation();
    return;
  }

  const candle = simulatedCandles[revealIndex];
  simulationSeries.update(candle);
  updateOHLC(candle);
  updatePnL(candle);

  revealIndex++;
}

function updatePnL(candle){

  if(!trade.active) return;

  let pnl = trade.direction==="buy"
    ? (candle.close-trade.avg)
    : (trade.avg-candle.close);

  pnl *= trade.qty;

  const panel = document.getElementById("tradePanel");

  panel.innerText =
    trade.direction.toUpperCase()+
    " | Qty:"+trade.qty+
    " | Avg:"+trade.avg.toFixed(2)+
    " | PnL:"+pnl.toFixed(2);

  panel.style.color = pnl>=0 ? "#22c55e" : "#ef4444";
}

function resetTrade(){
  trade = {active:false,direction:null,qty:0,avg:0,stop:null};
  updatePanel();
}

function updatePanel(){
  const panel=document.getElementById("tradePanel");
  panel.innerText="No Active Trade";
  panel.style.color="white";
}

function renderLog(){

  const box=document.getElementById("tradeLog");
  if(!box) return;

  box.innerHTML="";

  tradeHistory.forEach(function(t,i){

    const div=document.createElement("div");
    div.style.marginBottom="6px";

    div.innerText =
      (i+1)+". "+
      t.dir.toUpperCase()+
      " | Qty:"+t.qty+
      " | Entry:"+t.entry.toFixed(2)+
      " | Exit:"+t.exit.toFixed(2)+
      " | PnL:"+t.pnl.toFixed(2)+
      " | "+t.reason;

    div.style.color = t.pnl>=0 ? "#22c55e" : "#ef4444";

    box.appendChild(div);
  });
}

function updateOHLC(price){
  document.getElementById("ohlcInfo").innerText =
    "O:"+price.open?.toFixed(2)+
    " H:"+price.high?.toFixed(2)+
    " L:"+price.low?.toFixed(2)+
    " C:"+price.close?.toFixed(2);
}
