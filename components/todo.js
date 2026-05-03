const TodoTab = {
  data() {
    return {
      todos: [],
      todayTodoLogs: [],
      newTodoText: '',
      newTodoPhoto: null,
      showPhoto: null,
      showHistory: false,
      historyLogs: [],
      historyTodos: []
    };
  },

  async mounted() {
    await this.loadData();
  },

  methods: {
    async loadData() {
      this.todos = await getTodos();
      this.todayTodoLogs = await getTodayTodoLogs();
    },

    isDone(todoId) {
      return this.todayTodoLogs.some(log => log.todoId === todoId && log.done);
    },

    async toggleTodo(todoId) {
      await markTodoDone(todoId);
      await this.loadData();
    },

    async removeTodo(todoId) {
      await deleteTodo(todoId);
      await this.loadData();
    },

    async addNewTodo() {
      const text = this.newTodoText.trim();
      if (!text) return;
      await addTodo({ text, photo: this.newTodoPhoto });
      this.newTodoText = '';
      this.newTodoPhoto = null;
      await this.loadData();
    },

    onTodoPhotoChange(e) {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => { this.newTodoPhoto = ev.target.result; };
      reader.readAsDataURL(file);
    },

    openPhoto(photo) {
      this.showPhoto = photo;
    },

    closePhoto() {
      this.showPhoto = null;
    },

    // History
    async toggleHistory() {
      this.showHistory = !this.showHistory;
      if (this.showHistory) {
        await this.loadHistory();
      }
    },

    async loadHistory() {
      this.historyTodos = await getTodos();
      const allLogs = await getTodoLogsAll();
      const grouped = {};
      allLogs.forEach(log => {
        if (!grouped[log.date]) grouped[log.date] = [];
        grouped[log.date].push(log);
      });
      this.historyLogs = Object.entries(grouped)
        .sort((a, b) => b[0].localeCompare(a[0]))
        .map(([date, logs]) => ({ date, logs }));
    },

    getTodoText(todoId) {
      const todo = this.historyTodos.find(t => t.id === todoId);
      return todo ? todo.text : '(已删除)';
    },

  },

  template: `
    <div>
      <div class="page-header">
        <h2>📋 待办清单</h2>
        <div class="page-subtitle">{{ todos.filter(t => !isDone(t.id)).length }}项待完成</div>
      </div>

      <div class="toggle-bar">
        <span class="toggle-label" :class="{ active: !showHistory }" @click="showHistory = false">📋 今日</span>
        <div class="toggle-switch" :class="{ on: showHistory }" @click="toggleHistory">
          <div class="toggle-knob"></div>
        </div>
        <span class="toggle-label" :class="{ active: showHistory }" @click="showHistory = true">📅 历史</span>
      </div>

      <!-- Today view -->
      <div v-if="!showHistory">
        <div class="todo-list">
          <div
            v-for="t in todos"
            :key="t.id"
            class="todo-item"
            :class="{ done: isDone(t.id) }"
          >
            <div class="todo-check" @click="toggleTodo(t.id)">
              <span v-if="isDone(t.id)">✓</span>
            </div>
            <span class="todo-text">{{ t.text }}</span>
            <img v-if="t.photo" :src="t.photo" class="todo-photo" @click.stop="openPhoto(t.photo)" />
            <span class="todo-delete" @click="removeTodo(t.id)">✕</span>
          </div>
        </div>

        <div class="add-todo-bar">
          <label class="add-todo-photo-btn">
            📷<input type="file" accept="image/*" @change="onTodoPhotoChange" style="display:none" />
          </label>
          <img v-if="newTodoPhoto" :src="newTodoPhoto" class="add-todo-photo-preview" @click="newTodoPhoto = null" />
          <input
            v-model="newTodoText"
            placeholder="添加新任务..."
            @keyup.enter="addNewTodo"
          />
        </div>
      </div>

      <!-- Photo viewer -->
      <div v-if="showPhoto" class="modal-overlay" style="z-index:300" @click="closePhoto">
        <img :src="showPhoto" style="max-width:94%;max-height:90%;border-radius:10px;object-fit:contain;box-shadow:0 4px 30px rgba(0,0,0,0.3)" @click.stop />
      </div>

      <!-- History view -->
      <div v-else class="todo-history-list">
        <div v-for="group in historyLogs" :key="group.date" class="todo-history-date">
          <div class="date-header">📅 {{ group.date }}</div>
          <div v-for="log in group.logs" :key="log.id" class="history-row">
            <span v-if="log.done" class="detail-taken">✅ {{ getTodoText(log.todoId) }}</span>
            <span v-else class="detail-not-taken">❌ {{ getTodoText(log.todoId) }}</span>
          </div>
          <div style="font-size:11px;color:#999;margin-top:2px">
            完成 {{ group.logs.filter(l => l.done).length }}/{{ group.logs.length }}
            <span v-if="group.logs.every(l => l.done)"> 🎉</span>
          </div>
        </div>
        <div v-if="historyLogs.length === 0" style="text-align:center;color:#ccc;padding:40px 0">暂无历史记录</div>
      </div>
    </div>
  `
};
