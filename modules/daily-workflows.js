(function initDailyWorkflows() {
  "use strict";

  function isEnglish() {
    return document.documentElement.lang === "en";
  }

  function setDashboardDetails(expanded) {
    var dashboard = document.querySelector('.view[data-view="dashboard"]');
    var button = document.querySelector("[data-dashboard-details-toggle]");
    if (!dashboard || !button) return;
    dashboard.classList.toggle("dashboard-details-open", expanded);
    button.setAttribute("aria-expanded", String(expanded));
    button.textContent = expanded
      ? (isEnglish() ? "Hide details" : "إخفاء التفاصيل")
      : (isEnglish() ? "Day details" : "تفاصيل اليوم");
  }

  function copyAllExpected(form) {
    if (!form) return false;
    var copied = 0;
    form.querySelectorAll("[data-copy-expected]").forEach(function copy(button) {
      var input = form.elements[button.dataset.copyExpected];
      if (!input) return;
      input.value = button.dataset.value || "0";
      input.dispatchEvent(new Event("input", { bubbles: true }));
      copied += 1;
    });
    if (copied) document.querySelector('[type="submit"][form="daily-reconcile-form"]')?.focus();
    return copied === 3;
  }

  document.addEventListener("click", function handleDailyWorkflowClick(event) {
    var detailsButton = event.target.closest("[data-dashboard-details-toggle]");
    if (detailsButton) {
      setDashboardDetails(detailsButton.getAttribute("aria-expanded") !== "true");
      return;
    }

    var fillButton = event.target.closest("[data-copy-all-expected]");
    if (!fillButton) return;
    var form = fillButton.closest(".panel")?.querySelector("[data-reconcile-form]")
      || document.querySelector("[data-reconcile-form]");
    if (!copyAllExpected(form)) return;
    var original = fillButton.textContent;
    fillButton.textContent = isEnglish() ? "Expected totals filled" : "تمت تعبئة المتوقع";
    window.setTimeout(function restoreLabel() { fillButton.textContent = original; }, 1400);
  });

  window.RiaayaDailyWorkflows = Object.freeze({
    copyAllExpected: copyAllExpected,
    setDashboardDetails: setDashboardDetails
  });
})();
