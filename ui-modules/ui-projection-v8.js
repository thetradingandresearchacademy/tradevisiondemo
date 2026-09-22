(function(){

let medianSeries = null;
let upperSeries = null;
let lowerSeries = null;
let active = false;

/* ========================== */
/* LOAD PROJECTION */
/* ========================== */

async function loadProjection(){

  const symbolInput = document.getElementById("symbol");
  const symbol = symbolInput ? symbolInput.value.trim() : "";

  if(!symbol){
    alert("Run simulation first.");
    return;
  }

  if(!window.supabase){
    alert("Auth not initialized.");
    return;
  }

  try{

    const { data } = await window.supabase.auth.getSession();

    if(!data || !data.session){
      alert("Session expired. Please login again.");
      return;
    }

    const response = await fetch("/api/projection_v8",{
      method:"POST",
      headers:{
        "Content-Type":"application/json",
        "Authorization":"Bearer " + data.session.access_token
      },
      body: JSON.stringify({
        symbol: symbol,
        length: parseInt(document.getElementById("lengthInput")?.value) || 100
      })
    });

    if(!response.ok){
      const text = await response.text();
      console.error("Projection API error:", text);
      throw new Error("Projection API failed");
    }

    const result = await response.json();

    if(!result.median || !result.lower || !result.upper){
      throw new Error("Invalid projection data");
    }

    drawProjection(result);

  }catch(err){
    console.error("Projection error:", err);
    alert("Projection failed.");
  }
}

/* ========================== */
/* GET LAST CHART TIME */
/* ========================== */

function getLastChartTime(){

  if(window.simulatedCandles && window.simulatedCandles.length){
    return window.simulatedCandles[window.simulatedCandles.length - 1].time;
  }

  if(window.historyCandles && window.historyCandles.length){
    return window.historyCandles[window.historyCandles.length - 1].time;
  }

  return Math.floor(Date.now()/1000);
}

/* ========================== */
/* DRAW PROJECTION */
/* ========================== */

function drawProjection(data){

  if(!window.chart) return;

  clearProjection();

  const baseTime = getLastChartTime();
  const day = 86400;

  const upperData = [];
  const lowerData = [];
  const medianData = [];

  for(let i=0;i<data.median.length;i++){

    const t = baseTime + (i+1)*day;

    const upperVal = Number(data.upper[i]);
    const lowerVal = Number(data.lower[i]);
    const medianVal = Number(data.median[i]);

    if(!isFinite(upperVal) || !isFinite(lowerVal) || !isFinite(medianVal)){
      continue;
    }

    upperData.push({ time: t, value: upperVal });
    lowerData.push({ time: t, value: lowerVal });
    medianData.push({ time: t, value: medianVal });
  }

  upperSeries = chart.addLineSeries({
    color: "rgba(212,175,55,0.25)",
    lineWidth: 1
  });
  upperSeries.setData(upperData);

  lowerSeries = chart.addLineSeries({
    color: "rgba(212,175,55,0.25)",
    lineWidth: 1
  });
  lowerSeries.setData(lowerData);

  medianSeries = chart.addLineSeries({
    color:"#D4AF37",
    lineWidth:2
  });
  medianSeries.setData(medianData);

  renderProjectionMeta(data);

  active = true;
}

/* ========================== */
/* META PANEL */
/* ========================== */

function renderProjectionMeta(data){

  let container = document.getElementById("projectionMeta");

  if(!container){
    container = document.createElement("div");
    container.id = "projectionMeta";
    container.style.fontSize = "12px";
    container.style.marginTop = "6px";
    container.style.opacity = "0.85";
    container.style.lineHeight = "1.4";

    const btn = document.getElementById("projectionBtn");
    if(btn && btn.parentNode){
      btn.parentNode.insertBefore(container, btn.nextSibling);
    }
  }

  const biasText = data.bias === "upward" ? "Upward" : "Downward";

  let dispersionLabel = "Low";
  if(data.dispersion > 0.25) dispersionLabel = "High";
  else if(data.dispersion > 0.15) dispersionLabel = "Moderate";

  container.innerHTML = `
    <div><strong>Structural Bias:</strong> ${biasText}</div>
    <div><strong>Dispersion:</strong> ${dispersionLabel}</div>
  `;
}

/* ========================== */
/* CLEAR PROJECTION */
/* ========================== */

function clearProjection(){

  if(!window.chart) return;

  if(medianSeries){
    chart.removeSeries(medianSeries);
    medianSeries = null;
  }

  if(upperSeries){
    chart.removeSeries(upperSeries);
    upperSeries = null;
  }

  if(lowerSeries){
    chart.removeSeries(lowerSeries);
    lowerSeries = null;
  }

  const meta = document.getElementById("projectionMeta");
  if(meta) meta.remove();

  active = false;
}

/* ========================== */
/* BUTTON WIRING */
/* ========================== */

function wireProjectionButton(){

  const btn = document.getElementById("projectionBtn");
  if(!btn) return;

  btn.addEventListener("click", function(){

    if(active){
      clearProjection();
      btn.innerText = "Scenario Mapping (Beta)";
    }else{
      loadProjection();
      btn.innerText = "Hide Scenario";
    }

  });
}

if(document.readyState === "loading"){
  document.addEventListener("DOMContentLoaded", wireProjectionButton);
}else{
  wireProjectionButton();
}

document.addEventListener("simulationStarted", function(){
  clearProjection();
  const btn = document.getElementById("projectionBtn");
  if(btn) btn.innerText = "Scenario Mapping (Beta)";
});

})();
