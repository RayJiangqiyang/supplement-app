const SupplementTab = {
  data() {
    return {
      supplements: [],
      todayLogs: [],
      showForm: false,
      formMode: 'add',
      editingSupplement: null,
      formName: '',
      formIcon: '💊',
      formPhoto: null,
      formReminderTimes: ['22:00'],
      showDeleteConfirm: false,
      deleteTarget: null,
      contextMenu: null,
      showHistory: false,
      historyYear: new Date().getFullYear(),
      historyMonth: new Date().getMonth() + 1,
      monthLogs: [],
      selectedDate: null,
      selectedDateLogs: [],
      selectedDateSupplements: [],
      emojiOptions: ['💊', '💪', '🥚', '🐟', '🦴', '🧬', '🫁', '❤️', '🧠', '🦷', '👁️', '🌿', '🍄', '💉', '🧪', '🩹', '🥛', '🍊', '🫒', '🥜']
    };
  },

  async mounted() {
    await this.loadData();
  },

  methods: {
    async loadData() {
      this.supplements = await getSupplements();
      this.todayLogs = await getTodayLogs();
    },

    isTaken(supplementId) {
      return this.todayLogs.some(log => log.supplementId === supplementId && log.taken);
    },

    getTakenAt(supplementId) {
      const log = this.todayLogs.find(l => l.supplementId === supplementId && l.taken);
      if (!log || !log.takenAt) return '';
      return new Date(log.takenAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    },

    async toggleSupplement(supplementId) {
      await markSupplementTaken(supplementId);
      await this.loadData();
    },

    onMenuTap(supplement) {
      // 手机上点 ⋯ 按钮直接弹出菜单
      this.contextMenu = { supplement, x: 10, y: window.innerHeight / 2 };
    },

    startLongPress(supplement, event) {
      // 桌面上鼠标悬停到 ⋯ 按钮时打开菜单
      if (!event.touches) {
        this.contextMenu = { supplement, x: event.clientX, y: event.clientY };
      }
    },

    closeContextMenu() {
      this.contextMenu = null;
    },

    contextMenuStyle() {
      if (!this.contextMenu) return { display: 'none' };
      return {
        position: 'fixed',
        top: Math.min(this.contextMenu.y, window.innerHeight - 80) + 'px',
        left: Math.min(this.contextMenu.x, window.innerWidth - 160) + 'px'
      };
    },

    editSupplement(s) {
      this.contextMenu = null;
      this.formMode = 'edit';
      this.editingSupplement = s;
      this.formName = s.name;
      this.formIcon = s.icon;
      this.formPhoto = s.photo;
      this.formReminderTimes = [...s.reminderTimes];
      this.showForm = true;
    },

    confirmDelete(s) {
      this.contextMenu = null;
      this.deleteTarget = s;
      this.showDeleteConfirm = true;
    },

    async doDelete() {
      await deleteSupplement(this.deleteTarget.id);
      this.showDeleteConfirm = false;
      this.deleteTarget = null;
      await this.loadData();
    },

    addReminderTime() {
      this.formReminderTimes.push('08:00');
    },

    removeReminderTime(index) {
      if (this.formReminderTimes.length > 1) {
        this.formReminderTimes.splice(index, 1);
      }
    },

    async saveSupplement() {
      if (!this.formName.trim()) return;
      const data = {
        name: this.formName.trim(),
        icon: this.formIcon,
        photo: this.formPhoto,
        reminderTimes: this.formReminderTimes.filter(t => t)
      };
      if (this.formMode === 'add') {
        await addSupplement(data);
      } else {
        await updateSupplement(this.editingSupplement.id, data);
      }
      this.showForm = false;
      this.resetForm();
      await this.loadData();
    },

    resetForm() {
      this.formName = '';
      this.formIcon = '💊';
      this.formPhoto = null;
      this.formReminderTimes = ['22:00'];
      this.editingSupplement = null;
    },

    onPhotoChange(e) {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        this.formPhoto = ev.target.result;
      };
      reader.onerror = () => {
        alert('图片读取失败');
      };
      reader.readAsDataURL(file);
    },

    selectEmoji(emoji) {
      this.formIcon = emoji;
    },

    openAddForm() {
      this.formMode = 'add';
      this.resetForm();
      this.showForm = true;
    },

    // History
    toggleHistory() {
      this.showHistory = !this.showHistory;
      if (this.showHistory) {
        this.loadMonthData();
      }
    },

    async loadMonthData() {
      this.monthLogs = await getDailyLogsByMonth(this.historyYear, this.historyMonth);
      this.selectedDate = null;
      this.selectedDateLogs = [];
    },

    prevMonth() {
      if (this.historyMonth === 1) {
        this.historyYear--;
        this.historyMonth = 12;
      } else {
        this.historyMonth--;
      }
      this.loadMonthData();
    },

    nextMonth() {
      if (this.historyMonth === 12) {
        this.historyYear++;
        this.historyMonth = 1;
      } else {
        this.historyMonth++;
      }
      this.loadMonthData();
    },

    async selectDate(dateStr) {
      this.selectedDate = dateStr;
      this.selectedDateLogs = await getDailyLogsByDate(dateStr);
      this.selectedDateSupplements = this.supplements;
    },

    calendarDays() {
      const days = [];
      const firstDay = new Date(this.historyYear, this.historyMonth - 1, 1);
      const lastDay = new Date(this.historyYear, this.historyMonth, 0);
      const startDow = (firstDay.getDay() + 6) % 7;
      const today = getToday();

      for (let i = 0; i < startDow; i++) {
        days.push({ text: '', date: '', empty: true });
      }

      for (let d = 1; d <= lastDay.getDate(); d++) {
        const dateStr = `${this.historyYear}-${String(this.historyMonth).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const logs = this.monthLogs.filter(l => l.date === dateStr);
        const takenCount = logs.filter(l => l.taken).length;
        const total = logs.length;
        let cls = '';
        if (total > 0 && takenCount === total) cls = 'all-taken';
        else if (takenCount > 0) cls = 'partial';
        else if (total > 0) cls = 'none-taken';
        if (dateStr === today) cls += ' today';

        days.push({ text: String(d), date: dateStr, empty: false, cls, takenCount, total });
      }

      return days;
    },

  },

  template: `
    <div>
      <div class="page-header">
        <h2>💊 今日补剂</h2>
        <div class="page-subtitle">{{ new Date().toLocaleDateString('zh-CN', { year:'numeric',month:'long',day:'numeric',weekday:'long' }) }} · {{ supplements.filter(s => isTaken(s.id)).length }}/{{ supplements.length }} 已打卡</div>
      </div>

      <div class="toggle-bar">
        <span class="toggle-label" :class="{ active: !showHistory }" @click.stop="showHistory = false">💊 今日</span>
        <div class="toggle-switch" :class="{ on: showHistory }" @click.stop="toggleHistory">
          <div class="toggle-knob"></div>
        </div>
        <span class="toggle-label" :class="{ active: showHistory }" @click.stop="showHistory = true">📅 历史</span>
      </div>

      <!-- Today view -->
      <div v-if="!showHistory">
        <div class="supplement-grid">
          <div
            v-for="s in supplements"
            :key="s.id"
            class="supplement-card"
            :class="{ taken: isTaken(s.id) }"
            @click="toggleSupplement(s.id)"
          >
            <div class="card-icon">
              <img v-if="s.photo" :src="s.photo" style="width:100%;height:100%;object-fit:cover;border-radius:12px" />
              <span v-else>{{ s.icon }}</span>
            </div>
            <div class="card-name">{{ s.name }}</div>
            <div class="card-hint">
              <template v-if="isTaken(s.id)">✓ {{ getTakenAt(s.id) }}已吃</template>
              <template v-else>点击打卡</template>
            </div>
            <div v-if="isTaken(s.id)" class="card-check">✓</div>
            <div class="card-menu-btn" @click.stop="startLongPress(s, $event)" @touchend.stop="onMenuTap(s)">⋯</div>
          </div>
        </div>

        <div class="add-supplement-btn" @click="openAddForm">+ 添加补剂</div>

        <div class="hint-text">点击卡片打卡 · 点 ⋯ 编辑/删除</div>
      </div>

      <!-- History view -->
      <div v-else>
        <div class="calendar-nav">
          <span class="nav-btn" @click.stop="prevMonth">←</span>
          <span class="month-label">{{ historyYear }}年 {{ historyMonth }}月</span>
          <span class="nav-btn" @click.stop="nextMonth">→</span>
        </div>
        <div class="calendar-weekday"><span>一</span><span>二</span><span>三</span><span>四</span><span>五</span><span>六</span><span>日</span></div>
        <div class="calendar-grid">
          <div
            v-for="(day, i) in calendarDays()"
            :key="i"
            class="calendar-day"
            :class="[day.cls, { empty: day.empty }]"
            @click.stop="!day.empty && selectDate(day.date)"
          >{{ day.text }}</div>
        </div>
        <div class="calendar-legend">🟢全吃 🟠部分 🔴全缺</div>

        <div v-if="selectedDate" class="day-detail">
          <div class="detail-date">📅 {{ selectedDate }}</div>
          <div v-for="s in selectedDateSupplements" :key="s.id" class="detail-row">
            <span v-if="selectedDateLogs.some(l => l.supplementId === s.id && l.taken)" class="detail-taken">✅ {{ s.icon }} {{ s.name }}</span>
            <span v-else class="detail-not-taken">❌ {{ s.icon }} {{ s.name }} — 未吃</span>
          </div>
        </div>
      </div>

      <!-- Context Menu -->
      <div v-if="contextMenu" class="modal-overlay" style="background:transparent;z-index:149" @click="closeContextMenu">
        <div class="context-menu" :style="contextMenuStyle()" @click.stop>
          <div class="menu-item" @click.stop="editSupplement(contextMenu.supplement)">✏️ 编辑</div>
          <div class="menu-item danger" @click.stop="confirmDelete(contextMenu.supplement)">🗑 删除</div>
        </div>
      </div>

      <!-- Add/Edit Form Modal -->
      <div v-if="showForm" class="modal-overlay" @click.self="showForm = false">
        <div class="modal-box">
          <h3>{{ formMode === 'add' ? '添加补剂' : '编辑补剂' }}</h3>

          <div style="text-align:center;margin-bottom:10px;cursor:pointer">
            <img v-if="formPhoto" :src="formPhoto" class="photo-preview" />
            <div v-else class="photo-preview" style="display:flex;align-items:center;justify-content:center;font-size:32px;background:#f5f5f5">{{ formIcon }}</div>
          </div>

          <div style="display:flex;flex-wrap:wrap;gap:4px;justify-content:center;margin-bottom:10px">
            <span v-for="e in emojiOptions" :key="e" style="font-size:20px;cursor:pointer;padding:2px" @click="selectEmoji(e)">{{ e }}</span>
          </div>

          <input v-model="formName" class="modal-input" placeholder="补剂名称" @keyup.enter="saveSupplement" />

          <label style="font-size:12px;color:#999;margin-bottom:6px;display:block">
            📸 选择图片（可拍照或从相册选择）
            <input type="file" accept="image/*" @change="onPhotoChange" style="display:block;margin-top:4px" />
          </label>

          <div style="margin-bottom:10px">
            <div style="font-size:12px;color:#999;margin-bottom:4px">⏰ 提醒时间</div>
            <div v-for="(t, idx) in formReminderTimes" :key="idx" style="display:flex;align-items:center;gap:6px;margin-bottom:4px">
              <input type="time" v-model="formReminderTimes[idx]" style="flex:1;padding:6px;border:1px solid #ddd;border-radius:6px;font-size:14px" />
              <span v-if="formReminderTimes.length > 1" @click="removeReminderTime(idx)" style="cursor:pointer;color:#e53935;font-size:18px">✕</span>
            </div>
            <div @click="addReminderTime" style="font-size:11px;color:var(--green);cursor:pointer">+ 添加提醒时间</div>
          </div>

          <div class="modal-actions">
            <button class="btn btn-secondary" @click="showForm = false">取消</button>
            <button class="btn btn-primary" @click="saveSupplement" :disabled="!formName.trim()">保存</button>
          </div>
        </div>
      </div>

      <!-- Delete Confirm -->
      <div v-if="showDeleteConfirm" class="modal-overlay" @click.self="showDeleteConfirm = false">
        <div class="modal-box">
          <h3>🗑 删除「{{ deleteTarget?.name }}」？</h3>
          <p style="font-size:12px;color:#999;text-align:center;margin-bottom:12px">历史打卡记录会保留</p>
          <div class="modal-actions">
            <button class="btn btn-secondary" @click="showDeleteConfirm = false">取消</button>
            <button class="btn btn-danger" @click="doDelete">确认删除</button>
          </div>
        </div>
      </div>
    </div>
  `
};
