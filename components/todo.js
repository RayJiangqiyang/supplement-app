const TodoTab = {
  data() {
    return {
      todos: [],
      todayTodoLogs: [],
      newTodoText: '',
      showHistory: false,
      historyLogs: [],
      historyTodos: [],
      dragIndex: null
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
      await addTodo(text);
      this.newTodoText = '';
      await this.loadData();
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

    // Drag and drop
    onDragStart(index, e) {
      this.dragIndex = index;
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', String(index));
    },

    onDragOver(index, e) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
    },

    async onDrop(index, e) {
      e.preventDefault();
      const fromIndex = this.dragIndex;
      if (fromIndex === null || fromIndex === index) return;
      const items = [...this.todos];
      const [moved] = items.splice(fromIndex, 1);
      items.splice(index, 0, moved);
      this.todos = items;
      this.dragIndex = null;
      await updateTodoOrder(items.map(t => t.id));
    }
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
            v-for="(t, index) in todos"
            :key="t.id"
            class="todo-item"
            :class="{ done: isDone(t.id) }"
            draggable="true"
            @dragstart="onDragStart(index, $event)"
            @dragover="onDragOver(index, $event)"
            @drop="onDrop(index, $event)"
          >
            <span class="drag-handle">⋮⋮</span>
            <div class="todo-check" @click="toggleTodo(t.id)">
              <span v-if="isDone(t.id)">✓</span>
            </div>
            <span class="todo-text">{{ t.text }}</span>
            <span class="todo-delete" @click="removeTodo(t.id)">✕</span>
          </div>
        </div>

        <div class="add-todo-bar">
          <span class="add-icon">+</span>
          <input
            v-model="newTodoText"
            placeholder="添加新任务..."
            @keyup.enter="addNewTodo"
          />
        </div>

        <div class="hint-text">长按左侧 ⋮⋮ 拖拽可调整顺序</div>
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
