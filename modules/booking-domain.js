(function initBookingDomain(root) {
  "use strict";

  var inactiveStatuses = new Set(["cancelled", "no_show"]);

  function numberValue(value) {
    var parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function minutesFromTime(value) {
    var parts = String(value || "00:00").split(":").map(Number);
    return (parts[0] || 0) * 60 + (parts[1] || 0);
  }

  function timeFromMinutes(value) {
    var minutes = Math.max(Math.round(numberValue(value)), 0);
    return String(Math.floor(minutes / 60)).padStart(2, "0") + ":" + String(minutes % 60).padStart(2, "0");
  }

  function scheduleSlotForTime(time, stepMinutes) {
    var step = Math.max(Math.round(numberValue(stepMinutes)) || 15, 1);
    return timeFromMinutes(Math.floor(minutesFromTime(time) / step) * step);
  }

  function activeForCapacity(booking) {
    return !inactiveStatuses.has(String(booking?.status || "scheduled"));
  }

  function findConflict(options) {
    var candidate = options.candidate || {};
    var ignoreId = String(options.ignoreId || "");
    var resolveColumn = options.resolveColumn;
    var candidateColumn = resolveColumn(candidate);
    var candidateSlot = scheduleSlotForTime(candidate.time, options.stepMinutes);
    return (options.bookings || []).find(function find(booking) {
      return String(booking.id || "") !== ignoreId
        && booking.date === candidate.date
        && activeForCapacity(booking)
        && resolveColumn(booking) === candidateColumn
        && scheduleSlotForTime(booking.time, options.stepMinutes) === candidateSlot;
    }) || null;
  }

  function findAnyConflict(options) {
    var seen = new Map();
    var resolveColumn = options.resolveColumn;
    for (var booking of options.bookings || []) {
      if (!activeForCapacity(booking)) continue;
      var columnId = resolveColumn(booking);
      var slot = scheduleSlotForTime(booking.time, options.stepMinutes);
      var key = [booking.date, columnId, slot].join("|");
      var first = seen.get(key);
      if (first) return { first: first, second: booking, columnId: columnId, slot: slot };
      seen.set(key, booking);
    }
    return null;
  }

  function buildAvailability(options) {
    var start = minutesFromTime(options.start || "08:00");
    var end = minutesFromTime(options.end || "20:00");
    var step = Math.max(Math.round(numberValue(options.stepMinutes)) || 15, 1);
    var selected = options.requestedTime || "";
    var rows = [];
    for (var minutes = start; minutes < end; minutes += step) {
      var time = timeFromMinutes(minutes);
      var taken = Boolean(options.isTaken(time));
      if (!selected && !taken) selected = time;
      rows.push({ time: time, taken: taken, selected: time === selected });
    }
    return rows;
  }

  root.RiaayaBookingDomain = Object.freeze({
    activeForCapacity: activeForCapacity,
    buildAvailability: buildAvailability,
    findAnyConflict: findAnyConflict,
    findConflict: findConflict,
    minutesFromTime: minutesFromTime,
    scheduleSlotForTime: scheduleSlotForTime,
    timeFromMinutes: timeFromMinutes
  });
})(typeof window !== "undefined" ? window : globalThis);
