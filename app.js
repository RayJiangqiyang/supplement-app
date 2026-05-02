const { createApp } = Vue;

const app = createApp({
  data() {
    return {
      activeTab: 'supplement',
      dbReady: false
    };
  },

  async mounted() {
    try {
      await openDB();
      this.dbReady = true;
    } catch (e) {
      console.error('Failed to open database:', e);
      document.querySelector('.app-loading').textContent = '数据库初始化失败，请刷新页面';
      return;
    }

    // 请求通知权限
    if (typeof requestNotificationPermission === 'function') {
      await requestNotificationPermission();
    }

    // 立即检查一次提醒
    if (typeof checkReminders === 'function') {
      setTimeout(async () => {
        try {
          const supplements = await getSupplements();
          const todayLogs = await getTodayLogs();
          checkReminders(supplements, todayLogs);
        } catch (e) { /* reminder is non-critical */ }
      }, 1000);
    }

    // 每5分钟检查提醒
    if (typeof checkReminders === 'function') {
      this._reminderInterval = setInterval(async () => {
        try {
          const supplements = await getSupplements();
          const todayLogs = await getTodayLogs();
          checkReminders(supplements, todayLogs);
        } catch (e) { /* reminder is non-critical */ }
      }, 5 * 60 * 1000);
    }
  },

  beforeUnmount() {
    if (this._reminderInterval) {
      clearInterval(this._reminderInterval);
    }
  },

  template: `
    <div v-if="!dbReady" class="app-loading">加载中...</div>
    <template v-else>
      <div class="tab-content">
        <supplement-tab v-show="activeTab === 'supplement'"></supplement-tab>
        <todo-tab v-show="activeTab === 'todo'"></todo-tab>
      </div>
      <div class="tab-bar">
        <div
          class="tab-item"
          :class="{ active: activeTab === 'supplement' }"
          @click="activeTab = 'supplement'"
        >💊 补剂</div>
        <div
          class="tab-item"
          :class="{ active: activeTab === 'todo' }"
          @click="activeTab = 'todo'"
        >📋 待办</div>
      </div>
    </template>
  `
});

// Register components (with fallbacks if not yet defined)
app.component('supplement-tab', typeof SupplementTab !== 'undefined' ? SupplementTab : {
  template: '<div class="page-header"><h2>💊 补剂</h2><p class="page-subtitle">加载中...</p></div>'
});

app.component('todo-tab', typeof TodoTab !== 'undefined' ? TodoTab : {
  template: '<div class="page-header"><h2>📋 待办</h2><p class="page-subtitle">加载中...</p></div>'
});

app.mount('#app');
