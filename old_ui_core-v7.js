//Old Version iS AT THE END. THIS IS UI REVAMP VERSION - 
// ================= TRADEVISION UI CORE – STABLE ALIGNMENT =================

// ---------------- STATE ----------------
let chart, historySeries, simulationSeries;
let simulatedCandles = [];
let originalSimulated = [];
let revealIndex = 0;
let revealTimer = null;
let simulationSpeed = 500;
let replayCount = 0;

let trade = { active:false, direction:null, qty:0, avg:0, stop:null };
let tradeHistory = [];

let simulationLoaded = false;

// ---------------- SEARCH (DEBOUNCED) ----------------
// ---------------- SYMBOL SEARCH ----------------

const symbolInput = document.getElementById("symbol");
const resultsBox = document.getElementById("symbolResults");

let searchTimeout = null;

symbolInput.addEventListener("input", function(){

  const query = this.value.trim();

  if(searchTimeout){
    clearTimeout(searchTimeout);
  }

  if(query.length < 2){
    resultsBox.style.display = "none";
    return;
  }

  searchTimeout = setTimeout(async ()=>{

    try{

      const response = await fetch("/api/search_symbols",{
        method:"POST",
        headers:{ "Content-Type":"application/json" },
        body: JSON.stringify({ query })
      });

      if(!response.ok){
        resultsBox.style.display="none";
        return;
      }

      const data = await response.json();
      const symbols = data.symbols || [];

      resultsBox.innerHTML = "";

      symbols.slice(0,15).forEach(sym=>{

        const div = document.createElement("div");
        div.innerText = sym;
        div.style.padding = "6px 10px";
        div.style.cursor = "pointer";

        div.onclick = ()=>{
          symbolInput.value = sym;
          resultsBox.style.display = "none";
        };

        resultsBox.appendChild(div);
      });

      resultsBox.style.display = symbols.length ? "block" : "none";

    }catch{
      resultsBox.style.display="none";
    }

  }, 300);

});

// ---------------- CHART ----------------
window.initChart = function(){

  const container = document.getElementById("chart");
  container.innerHTML = "";

  chart = LightweightCharts.createChart(container,{
    layout:{ background:{color:"#0b1220"}, textColor:"#ffffff" },
    width:container.clientWidth,
    height:520,
    grid:{
      vertLines:{color:"rgba(255,255,255,0.05)"},
      horzLines:{color:"rgba(255,255,255,0.05)"}
    }
  });

  historySeries = chart.addSeries(LightweightCharts.CandlestickSeries);

  simulationSeries = chart.addSeries(
    LightweightCharts.CandlestickSeries,
    {
      upColor:"#facc15",
      downColor:"#f97316",
      borderUpColor:"#facc15",
      borderDownColor:"#f97316",
      wickUpColor:"#facc15",
      wickDownColor:"#f97316"
    }
  );

  chart.subscribeCrosshairMove(param=>{
    if(!param || !param.seriesPrices) return;

    const price =
      param.seriesPrices.get(historySeries) ||
      param.seriesPrices.get(simulationSeries);

    if(price){
      updateOHLC(price);
    }
  });

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
  checkStop(candle);
  updatePnL(candle);

  revealIndex++;
}

function checkStop(candle){
  if(!trade.active || !trade.stop) return;

  if(trade.direction==="buy" && candle.low<=trade.stop)
    window.closeTrade("SL Hit");

  if(trade.direction==="sell" && candle.high>=trade.stop)
    window.closeTrade("SL Hit");
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

window.closeTrade = function(reason){

  if(!trade.active) return;

  const exit = simulatedCandles[revealIndex-1]?.close || 0;

  let pnl = trade.direction==="buy"
    ? (exit-trade.avg)
    : (trade.avg-exit);

  pnl *= trade.qty;

  tradeHistory.push({
    dir:trade.direction,
    qty:trade.qty,
    entry:trade.avg,
    exit:exit,
    pnl:pnl,
    reason:reason
  });

  renderLog();
  resetTrade();
};

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

// ---------------- OHLC ----------------
function updateOHLC(price){
  document.getElementById("ohlcInfo").innerText =
    "O:"+price.open?.toFixed(2)+
    " H:"+price.high?.toFixed(2)+
    " L:"+price.low?.toFixed(2)+
    " C:"+price.close?.toFixed(2);
}

// ---------------- PREMIUM SNAPSHOT (BRANDED EXPORT) ----------------

const taraLogo = new Image();
taraLogo.src = "/TARA-LOGO.jpeg";

window.takeSnapshot = function(){

  if(!chart) return;

  const baseCanvas = chart.takeScreenshot();
  const footerHeight = 120;

  const canvas = document.createElement("canvas");
  canvas.width = baseCanvas.width;
  canvas.height = baseCanvas.height + footerHeight;

  const ctx = canvas.getContext("2d");

  // Draw chart
  ctx.drawImage(baseCanvas, 0, 0);

  // ===== SOFT DIAGONAL WATERMARK =====
  ctx.save();
  ctx.globalAlpha = 0.035;
  ctx.translate(canvas.width / 2, baseCanvas.height / 2);
  ctx.rotate(-Math.PI / 6);
  ctx.textAlign = "center";
  ctx.font = "bold 80px Arial";
  ctx.fillStyle = "#ffffff";
  ctx.fillText("TradeVision by TARA", 0, 0);
  ctx.restore();

  // ===== FOOTER GRADIENT =====
  const gradient = ctx.createLinearGradient(
    0,
    baseCanvas.height,
    0,
    canvas.height
  );
  gradient.addColorStop(0, "#0e1625");
  gradient.addColorStop(1, "#0b1220");

  ctx.fillStyle = gradient;
  ctx.fillRect(0, baseCanvas.height, canvas.width, footerHeight);

  // Divider line
  ctx.strokeStyle = "rgba(255,255,255,0.08)";
  ctx.beginPath();
  ctx.moveTo(0, baseCanvas.height);
  ctx.lineTo(canvas.width, baseCanvas.height);
  ctx.stroke();

  // ===== LEFT SIDE (LOGO + BRAND) =====
  if(taraLogo.complete){
    ctx.drawImage(taraLogo, 20, baseCanvas.height + 25, 60, 60);
  }

  ctx.textAlign = "left";
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 24px Arial";
  ctx.fillText("TRADEVISION", 100, baseCanvas.height + 55);

  ctx.font = "16px Arial";
  ctx.fillStyle = "#9ca3af";
  ctx.fillText("by TARA", 100, baseCanvas.height + 80);

  // ===== CENTER META =====
  const symbolInfo = document.getElementById("symbolInfo").innerText;
  const replayInfo = document.getElementById("sessionInfo").innerText;

  const now = new Date();
  const timestamp = now.toLocaleString();

  const seedMatch = symbolInfo.match(/Seed:\s*(\d+)/);
  const seed = seedMatch ? seedMatch[1] : "0";

  const snapshotId =
    "TV-" +
    now.getTime().toString().slice(-6) +
    "-" +
    seed;

  ctx.textAlign = "center";
  ctx.fillStyle = "#d1d5db";
  ctx.font = "14px Arial";

  ctx.fillText(
    symbolInfo + " | " + replayInfo,
    canvas.width / 2,
    baseCanvas.height + 45
  );

  ctx.fillText(
    "Generated: " + timestamp,
    canvas.width / 2,
    baseCanvas.height + 65
  );

  ctx.fillText(
    "Snapshot ID: " + snapshotId,
    canvas.width / 2,
    baseCanvas.height + 85
  );

  // ===== RIGHT SIDE =====
  ctx.textAlign = "right";
  ctx.fillStyle = "#9ca3af";
  ctx.font = "14px Arial";
  ctx.fillText(
    "Engine v7 | TradeVision.ai",
    canvas.width - 20,
    baseCanvas.height + 65
  );

  // ===== DOWNLOAD =====
  const symbol = document.getElementById("symbol").value || "TradeVision";

  const link = document.createElement("a");
  link.download = symbol + "_TradeVision.png";
  link.href = canvas.toDataURL("image/png");
  link.click();
};

// ---------------- REPORT ----------------
// ---------------- ADVANCED PERFORMANCE REPORT ----------------

window.showPerformanceReport = function(){

  if(!tradeHistory.length){
    alert("No trades yet.");
    return;
  }

  const total = tradeHistory.length;
  const wins = tradeHistory.filter(t=>t.pnl>0);
  const losses = tradeHistory.filter(t=>t.pnl<=0);

  const net = tradeHistory.reduce((a,b)=>a+b.pnl,0);
  const winRate = (wins.length/total*100).toFixed(1);

  const avgWin = wins.length
    ? (wins.reduce((a,b)=>a+b.pnl,0)/wins.length).toFixed(2)
    : 0;

  const avgLoss = losses.length
    ? (losses.reduce((a,b)=>a+b.pnl,0)/losses.length).toFixed(2)
    : 0;

  const profitFactor = losses.length
    ? (Math.abs(
        wins.reduce((a,b)=>a+b.pnl,0) /
        losses.reduce((a,b)=>a+b.pnl,0)
      )).toFixed(2)
    : "∞";

  let equity = 0;
  let peak = 0;
  let maxDD = 0;

  tradeHistory.forEach(t=>{
    equity += t.pnl;
    peak = Math.max(peak,equity);
    maxDD = Math.max(maxDD, peak-equity);
  });

  const statsHTML = `
    <strong>Total Trades:</strong> ${total}<br>
    <strong>Win Rate:</strong> ${winRate}%<br>
    <strong>Net PnL:</strong> ${net.toFixed(2)}<br>
    <strong>Avg Win:</strong> ${avgWin}<br>
    <strong>Avg Loss:</strong> ${avgLoss}<br>
    <strong>Profit Factor:</strong> ${profitFactor}<br>
    <strong>Max Drawdown:</strong> ${maxDD.toFixed(2)}<br>
    <strong>Replays:</strong> ${replayCount}
  `;

  document.getElementById("reportStats").innerHTML = statsHTML;
  document.getElementById("reportModal").style.display = "flex";
};

window.closeReport = function(){
  document.getElementById("reportModal").style.display = "none";
};
window.downloadReport = async function(){

  const report = document.getElementById("reportContent");

  const canvas = await html2canvas(report);

  const link = document.createElement("a");
  link.download = "TradeVision_Report.png";
  link.href = canvas.toDataURL();
  link.click();
};
//=======================================================================================================================
// PRE-UI REVAMP SIMULATE_V7 VERSION
// ================= UI CORE (LOCKED + PERFORMANCE ENGINE) =================

// ---------- STATE ----------
let chart, historySeries, simulationSeries;
let simulatedCandles = [];
let originalSimulated = [];
let revealIndex = 0;
let revealTimer = null;
let simulationSpeed = 500;
let replayCount = 0;

let trade = { active:false, direction:null, qty:0, avg:0, stop:null };
let tradeHistory = [];

// ---------- PERFORMANCE ENGINE ----------
let performance = {
  trades: 0,
  wins: 0,
  losses: 0,
  netPnL: 0,
  equity: 0,
  peakEquity: 0,
  maxDrawdown: 0,
  tradeStats: []
};

let currentMAE = 0;
let currentMFE = 0;

function resetPerformance(){
  performance = {
    trades: 0,
    wins: 0,
    losses: 0,
    netPnL: 0,
    equity: 0,
    peakEquity: 0,
    maxDrawdown: 0,
    tradeStats: []
  };
  currentMAE = 0;
  currentMFE = 0;
}

// ---------- CHART ----------
window.initChart = function(){

  const container = document.getElementById("chart");
  container.innerHTML = "";

  chart = LightweightCharts.createChart(container,{
    layout:{background:{color:"#0b1220"},textColor:"#fff"},
    width:container.clientWidth,
    height:500
  });

  historySeries = chart.addSeries(LightweightCharts.CandlestickSeries);

  simulationSeries = chart.addSeries(
    LightweightCharts.CandlestickSeries,
    {
      upColor:"#eab308",
      downColor:"#f97316",
      borderUpColor:"#eab308",
      borderDownColor:"#f97316",
      wickUpColor:"#eab308",
      wickDownColor:"#f97316"
    }
  );

  chart.subscribeCrosshairMove(param=>{
    if(!param || !param.seriesPrices) return;

    const price =
      param.seriesPrices.get(historySeries) ||
      param.seriesPrices.get(simulationSeries);

    if(price){
      document.getElementById("ohlcInfo").innerText =
        "O:"+price.open?.toFixed(2)+
        " H:"+price.high?.toFixed(2)+
        " L:"+price.low?.toFixed(2)+
        " C:"+price.close?.toFixed(2);
    }
  });
};

// ---------- LOAD DATA ----------
window.loadSimulationData = function(history, simulated){

  resetPerformance();

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
  updateLiveHUD();
};

// ---------- PLAYBACK ----------
window.playSimulation = function(){
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
  pauseSimulation();
  simulationSeries.setData(simulatedCandles);
  revealIndex = simulatedCandles.length;
};

function revealNext(){
  if(revealIndex >= simulatedCandles.length){
    pauseSimulation();
    return;
  }

  const candle = simulatedCandles[revealIndex];

  simulationSeries.update(candle);
  checkStop(candle);
  updatePnL(candle);

  revealIndex++;
}

// ---------- SESSION ----------
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
  updateLiveHUD();
};

// ---------- LIVE HUD ----------
function updateLiveHUD(){

  const winRate = performance.trades > 0
    ? ((performance.wins / performance.trades) * 100).toFixed(1)
    : 0;

  document.getElementById("sessionInfo").innerText =
    "Replays: " + replayCount +
    " | Equity: " + performance.equity.toFixed(2) +
    " | DD: -" + performance.maxDrawdown.toFixed(2) +
    " | WR: " + winRate + "%";
}

// ---------- TRADE ----------
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
    closeTrade("Reverse");
    return;
  }

  currentMAE = 0;
  currentMFE = 0;

  updatePanel();
};

window.setStop = function(){
  if(!trade.active) return;
  trade.stop = parseFloat(document.getElementById("stopInput").value);
};

function checkStop(candle){
  if(!trade.active || !trade.stop) return;

  if(trade.direction === "buy" && candle.low <= trade.stop)
    closeTrade("SL Hit");

  if(trade.direction === "sell" && candle.high >= trade.stop)
    closeTrade("SL Hit");
}

function updatePnL(candle){

  if(!trade.active) return;

  let pnl = trade.direction === "buy"
    ? (candle.close - trade.avg)
    : (trade.avg - candle.close);

  pnl *= trade.qty;

  currentMAE = Math.min(currentMAE, pnl);
  currentMFE = Math.max(currentMFE, pnl);

  const panel = document.getElementById("tradePanel");

  panel.innerText =
    trade.direction.toUpperCase()+
    " | Qty:"+trade.qty+
    " | Avg:"+trade.avg.toFixed(2)+
    " | PnL:"+pnl.toFixed(2);

  panel.style.color = pnl >= 0 ? "#22c55e" : "#ef4444";

  performance.equity = performance.netPnL + pnl;

  if(performance.equity > performance.peakEquity)
    performance.peakEquity = performance.equity;

  const dd =
    performance.peakEquity - performance.equity;

  if(dd > performance.maxDrawdown)
    performance.maxDrawdown = dd;

  updateLiveHUD();
}

window.closeTrade = function(reason){

  if(!trade.active) return;

  const exit = simulatedCandles[revealIndex-1]?.close || 0;

  let pnl = trade.direction === "buy"
    ? (exit - trade.avg)
    : (trade.avg - exit);

  pnl *= trade.qty;

  performance.trades++;
  performance.netPnL += pnl;

  if(pnl >= 0) performance.wins++;
  else performance.losses++;

  performance.tradeStats.push({
    mae: currentMAE,
    mfe: currentMFE,
    pnl
  });

  tradeHistory.push({
    dir:trade.direction,
    qty:trade.qty,
    entry:trade.avg,
    exit:exit,
    pnl:pnl,
    reason:reason
  });

  currentMAE = 0;
  currentMFE = 0;

  renderLog();
  resetTrade();
  updateLiveHUD();
};

function updatePanel(){
  if(!trade.active){
    const panel=document.getElementById("tradePanel");
    panel.innerText="No Active Trade";
    panel.style.color="white";
  }
}

function resetTrade(){
  trade = {active:false,direction:null,qty:0,avg:0,stop:null};
  updatePanel();
}

// ---------- PERFORMANCE REPORT ----------
window.showPerformanceReport = function(){

  if(performance.trades === 0){
    alert("No trades taken.");
    return;
  }

  const winRate =
    ((performance.wins / performance.trades) * 100).toFixed(1);

  const avgWin =
    performance.tradeStats
      .filter(t=>t.pnl>0)
      .reduce((a,b)=>a+b.pnl,0) /
    Math.max(1, performance.wins);

  const avgLoss =
    performance.tradeStats
      .filter(t=>t.pnl<0)
      .reduce((a,b)=>a+b.pnl,0) /
    Math.max(1, performance.losses);

  alert(
    "TRADES: " + performance.trades +
    "\nWin Rate: " + winRate + "%" +
    "\nNet PnL: " + performance.netPnL.toFixed(2) +
    "\nMax DD: -" + performance.maxDrawdown.toFixed(2) +
    "\nAvg Win: " + avgWin.toFixed(2) +
    "\nAvg Loss: " + avgLoss.toFixed(2)
  );
};

// ---------- LOG ----------
function renderLog(){

  const box=document.getElementById("tradeLog");
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

// ---------- ENTER KEY ----------
document.getElementById("symbol").addEventListener("keydown", function(e){
  if(e.key === "Enter"){
    e.preventDefault();
    startSimulation();
  }
});

// ---------- SEARCH ----------
document.getElementById("symbol").addEventListener("input", async function(){

  const value = this.value.trim();
  const resultsBox = document.getElementById("symbolResults");

  if(value.length < 1){
    resultsBox.style.display="none";
    return;
  }

  try {

    const response = await fetch("/api/search_symbols", {
      method:"POST",
      headers:{ "Content-Type":"application/json" },
      body: JSON.stringify({ query:value })
    });

    if(!response.ok){
      resultsBox.style.display="none";
      return;
    }

    const data = await response.json();
    const symbols = data.symbols || [];

    resultsBox.innerHTML = "";

    if(!symbols.length){
      resultsBox.style.display="none";
      return;
    }

    symbols.forEach(sym=>{
      const div=document.createElement("div");
      div.innerText=sym;
      div.onclick=()=>{
        document.getElementById("symbol").value=sym;
        resultsBox.style.display="none";
      };
      resultsBox.appendChild(div);
    });

    resultsBox.style.display="block";

  } catch {
    resultsBox.style.display="none";
  }

});

// ---------- SNAPSHOT (UNCHANGED) ----------
const taraLogo = new Image();
taraLogo.src = "/TARA-LOGO.jpeg";

window.takeSnapshot = function(){

  if(!chart) return;

  const baseCanvas = chart.takeScreenshot();
  const footerHeight = 110;

  const canvas = document.createElement("canvas");
  canvas.width = baseCanvas.width;
  canvas.height = baseCanvas.height + footerHeight;

  const ctx = canvas.getContext("2d");

  ctx.drawImage(baseCanvas, 0, 0);

  ctx.save();
  ctx.globalAlpha = 0.025;
  ctx.translate(canvas.width / 2, baseCanvas.height / 2);
  ctx.rotate(-Math.PI / 6);
  ctx.textAlign = "center";
  ctx.font = "90px Arial";
  ctx.fillStyle = "#ffffff";
  ctx.fillText("TradeVision by TARA", 0, 0);
  ctx.restore();

  const gradient = ctx.createLinearGradient(
    0,
    baseCanvas.height,
    0,
    canvas.height
  );
  gradient.addColorStop(0, "#0e1625");
  gradient.addColorStop(1, "#0b1220");

  ctx.fillStyle = gradient;
  ctx.fillRect(0, baseCanvas.height, canvas.width, footerHeight);

  ctx.strokeStyle = "rgba(255,255,255,0.1)";
  ctx.beginPath();
  ctx.moveTo(0, baseCanvas.height);
  ctx.lineTo(canvas.width, baseCanvas.height);
  ctx.stroke();

  if(taraLogo.complete){
    ctx.drawImage(taraLogo, 20, baseCanvas.height + 20, 60, 60);
  }

  ctx.textAlign = "left";
  ctx.fillStyle = "#ffffff";
  ctx.font = "22px Arial";
  ctx.fillText("TRADEVISION", 95, baseCanvas.height + 45);

  ctx.font = "16px Arial";
  ctx.fillStyle = "#cccccc";
  ctx.fillText("by TARA", 95, baseCanvas.height + 70);

  const symbolText = document.getElementById("symbolInfo").innerText;
  const replayText = document.getElementById("sessionInfo").innerText;

  const now = new Date();
  const timestamp = now.toLocaleString();

  const symbol = document.getElementById("symbol").value || "X";
  const seedMatch = symbolText.match(/Seed:\s*(\d+)/);
  const seed = seedMatch ? seedMatch[1] : "0";

  const snapshotId =
    "TV-" +
    now.getTime().toString().slice(-6) +
    "-" +
    seed +
    "-" +
    symbol;

  ctx.textAlign = "center";
  ctx.fillStyle = "#cccccc";
  ctx.font = "14px Arial";
  ctx.fillText(
    symbolText + " | " + replayText,
    canvas.width / 2,
    baseCanvas.height + 40
  );

  ctx.fillText(
    "Generated: " + timestamp,
    canvas.width / 2,
    baseCanvas.height + 60
  );

  ctx.fillText(
    "Snapshot ID: " + snapshotId,
    canvas.width / 2,
    baseCanvas.height + 80
  );

  ctx.textAlign = "right";
  ctx.fillStyle = "#cccccc";
  ctx.font = "14px Arial";
  ctx.fillText(
    "Engine v7 | TradeVision.ai",
    canvas.width - 20,
    baseCanvas.height + 60
  );

  const link = document.createElement("a");
  link.download = symbol + "_TV_TARA.png";
  link.href = canvas.toDataURL("image/png");
  link.click();
};
