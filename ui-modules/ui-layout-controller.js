// /ui-modules/ui-layout-controller.js

(function(){

  const BREAKPOINT_TABLET = 1200
  const BREAKPOINT_MOBILE = 768

  let currentMode = null

  function detectMode() {
    const width = window.innerWidth

    if (width < BREAKPOINT_MOBILE) return "mobile"
    if (width < BREAKPOINT_TABLET) return "tablet"
    return "desktop"
  }

 function resizeChartSafely() {

  const chartContainer = document.getElementById("chart")
  if (!chartContainer) return

  // Try resizing if chart object exists
  if (window.chart && typeof window.chart.applyOptions === "function") {
    setTimeout(() => {
      window.chart.applyOptions({
        width: chartContainer.clientWidth
      })
    }, 200)
  }
 }
  function handleSidebarBehavior(mode) {

    const sidebar = document.querySelector(".sidebar")
    const analytics = document.querySelector(".analytics")

    if (!sidebar) return

    if (mode === "mobile") {
      sidebar.classList.remove("open")
      if (analytics) analytics.classList.remove("open")
    }

    if (mode === "desktop") {
      sidebar.classList.remove("collapsed")
    }
  }

  function applyMode(mode) {

    document.body.classList.remove(
      "layout-desktop",
      "layout-tablet",
      "layout-mobile"
    )

    document.body.classList.add(`layout-${mode}`)

    currentMode = mode
    window.currentLayoutMode = mode

    handleSidebarBehavior(mode)
    resizeChartSafely()
  }

  function setupMobileToggles() {

    const sidebarBtn = document.getElementById("mobileSidebarToggle")
    const analyticsBtn = document.getElementById("mobileAnalyticsToggle")

    const sidebar = document.querySelector(".sidebar")
    const analytics = document.querySelector(".analytics")

    if (sidebarBtn && sidebar) {
      sidebarBtn.onclick = () => {
        sidebar.classList.toggle("open")
      }
    }

    if (analyticsBtn && analytics) {
      analytics.classList.toggle("open")
    }
  }

  function setupFocusMode(){

    const btn = document.getElementById("focusModeToggle")
    if(!btn) return

    btn.onclick = () => {

      document.body.classList.toggle("focus-mode")

      // Dynamic icon swap
      if(document.body.classList.contains("focus-mode")){
        btn.innerText = "✕"
      } else {
        btn.innerText = "⛶"
      }

      resizeChartSafely()
    }
  }

  function debounce(fn, delay) {
    let timeout
    return function(){
      clearTimeout(timeout)
      timeout = setTimeout(fn, delay)
    }
  }

  function init() {

    const mode = detectMode()
    applyMode(mode)

    setupMobileToggles()
    setupFocusMode()

    window.addEventListener(
      "resize",
      debounce(() => {
        const newMode = detectMode()
        if (newMode !== currentMode) {
          applyMode(newMode)
        }
      }, 150)
    )
  }

  // 🔥 WAIT FOR DOM
  document.addEventListener("DOMContentLoaded", init)

})();
