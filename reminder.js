var reminderCheckedToday = {};

async function checkReminders(supplements, todayLogs) {
  if (!('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;

  var now = new Date();
  var currentMinutes = now.getHours() * 60 + now.getMinutes();

  for (var i = 0; i < supplements.length; i++) {
    var s = supplements[i];
    if (!s.reminderTimes || s.reminderTimes.length === 0) continue;

    var checked = reminderCheckedToday[s.id] || [];

    for (var j = 0; j < s.reminderTimes.length; j++) {
      var timeStr = s.reminderTimes[j];
      var parts = timeStr.split(':');
      var h = parseInt(parts[0], 10);
      var m = parseInt(parts[1], 10);
      var reminderMinutes = h * 60 + m;

      if (currentMinutes >= reminderMinutes && checked.indexOf(timeStr) === -1) {
        var taken = todayLogs.some(function(log) {
          return log.supplementId === s.id && log.taken;
        });

        if (!taken) {
          try {
            new Notification('别忘了吃补剂！', {
              body: s.icon + ' ' + s.name + ' — 今天还没打卡',
              icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">&#x1F48A;</text></svg>',
              tag: 'supplement-' + s.id + '-' + timeStr,
              requireInteraction: true
            });
          } catch (e) {
            // Notification API might not be supported in all contexts
          }
        }

        if (!reminderCheckedToday[s.id]) {
          reminderCheckedToday[s.id] = [];
        }
        reminderCheckedToday[s.id].push(timeStr);
      }
    }
  }
}

async function requestNotificationPermission() {
  if (!('Notification' in window)) return;
  if (Notification.permission === 'default') {
    try {
      await Notification.requestPermission();
    } catch (e) {
      // User denied or API not supported
    }
  }
}
