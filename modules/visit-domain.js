(function initVisitDomain(root) {
  "use strict";

  var paymentMethods = Object.freeze(["cash", "card", "transfer"]);

  function numberValue(value) {
    var parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function cleanPaymentBreakdown(input, fallbackMethod, fallbackAmount) {
    var isArray = Array.isArray(input);
    var raw = isArray
      ? input.reduce(function totalRows(totals, row) {
          var method = row?.method || row?.type || row?.paymentMethod;
          if (paymentMethods.includes(method)) totals[method] = numberValue(totals[method]) + numberValue(row.amount);
          return totals;
        }, {})
      : input && typeof input === "object" ? input : {};
    var hasExplicitBreakdown = isArray || paymentMethods.some(function explicit(method) { return raw[method] !== undefined; });
    var breakdown = Object.fromEntries(paymentMethods.map(function value(method) {
      return [method, Math.max(numberValue(raw[method]), 0)];
    }));
    var total = paymentTotal(breakdown);
    if (total > 0.009 || hasExplicitBreakdown) return breakdown;
    var method = paymentMethods.includes(fallbackMethod) ? fallbackMethod : "cash";
    return { cash: 0, card: 0, transfer: 0, [method]: Math.max(numberValue(fallbackAmount), 0) };
  }

  function paymentMethodFromBreakdown(breakdown, fallback) {
    var active = paymentMethods.filter(function nonZero(method) { return numberValue(breakdown?.[method]) > 0.009; });
    if (active.length > 1) return "mixed";
    return active[0] || (paymentMethods.includes(fallback) ? fallback : "cash");
  }

  function paymentTotal(breakdown) {
    return paymentMethods.reduce(function total(sum, method) { return sum + numberValue(breakdown?.[method]); }, 0);
  }

  function allocateBreakdown(breakdown, ratio) {
    var weight = Math.max(numberValue(ratio), 0);
    return Object.fromEntries(paymentMethods.map(function allocate(method) {
      return [method, numberValue(breakdown?.[method]) * weight];
    }));
  }

  root.RiaayaVisitDomain = Object.freeze({
    allocateBreakdown: allocateBreakdown,
    cleanPaymentBreakdown: cleanPaymentBreakdown,
    paymentMethodFromBreakdown: paymentMethodFromBreakdown,
    paymentMethods: paymentMethods,
    paymentTotal: paymentTotal
  });
})(typeof window !== "undefined" ? window : globalThis);
