/* ============================================
   TASKFLOW — Application Logic
   ============================================ */

(function () {
  'use strict';

  // ── Theme Definitions ──
  const THEMES = [
    { id: 'default',  name: 'Midnight Galaxy', bg: '#0f0e17', accent: '#a78bfa', dark: true },
    { id: 'ocean',    name: 'Ocean Breeze',    bg: '#0b1628', accent: '#38bdf8', dark: true },
    { id: 'aurora',   name: 'Aurora',           bg: '#0a0f1a', accent: '#34d399', dark: true },
    { id: 'sunset',   name: 'Sunset Blaze',    bg: '#1a0a0a', accent: '#fb7185', dark: true },
    { id: 'rosegold', name: 'Rose Gold',        bg: '#1a1018', accent: '#f472b6', dark: true },
    { id: 'light',    name: 'Warm Light',       bg: '#faf7f2', accent: '#8b5cf6', dark: false },
    { id: 'mint',     name: 'Soft Mint',        bg: '#f0fdf9', accent: '#10b981', dark: false },
    { id: 'slate',    name: 'Slate Pro',        bg: '#f8fafc', accent: '#6366f1', dark: false },
  ];

  // ── Storage Keys ──
  const STORAGE_TASKS  = 'taskflow_tasks';
  const STORAGE_NOTES  = 'taskflow_notes';
  const STORAGE_THEME  = 'taskflow_theme';

  // ── State ──
  let tasks  = JSON.parse(localStorage.getItem(STORAGE_TASKS) || '[]');
  let notes  = JSON.parse(localStorage.getItem(STORAGE_NOTES) || '[]');
  let currentTheme  = localStorage.getItem(STORAGE_THEME) || 'default';
  let currentFilter = 'all';
  let selectedNoteColor = 'default';

  // ── DOM Elements ──
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  const themeToggleBtn   = $('#theme-toggle-btn');
  const themePanel       = $('#theme-panel');
  const themePanelClose  = $('#theme-panel-close');
  const themeGrid        = $('#theme-grid');

  const tabBtns          = $$('.tab-btn');
  const tasksSection     = $('#tasks-section');
  const notesSection     = $('#notes-section');

  const taskForm         = $('#task-form');
  const taskInput        = $('#task-input');
  const taskPriority     = $('#task-priority');
  const taskList         = $('#task-list');
  const tasksEmpty       = $('#tasks-empty');

  const filterBtns       = $$('.filter-btn');

  const noteForm         = $('#note-form');
  const noteTitleInput   = $('#note-title-input');
  const noteBodyInput    = $('#note-body-input');
  const notesGrid        = $('#notes-grid');
  const notesEmpty       = $('#notes-empty');
  const noteColorDots    = $$('.note-color-dot');

  const statTotal        = $('#stat-total .stat-num');
  const statActive       = $('#stat-active .stat-num');
  const statDone         = $('#stat-done .stat-num');
  const statNotes        = $('#stat-notes .stat-num');

  // ── Helpers ──
  function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  function saveTasks() {
    localStorage.setItem(STORAGE_TASKS, JSON.stringify(tasks));
  }

  function saveNotes() {
    localStorage.setItem(STORAGE_NOTES, JSON.stringify(notes));
  }

  function formatDate(ts) {
    const d = new Date(ts);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  // ── Stats ──
  function updateStats() {
    const total    = tasks.length;
    const done     = tasks.filter(t => t.completed).length;
    const active   = total - done;
    const noteCount = notes.length;

    animateStat(statTotal,  total);
    animateStat(statActive, active);
    animateStat(statDone,   done);
    animateStat(statNotes,  noteCount);
  }

  function animateStat(el, value) {
    const current = parseInt(el.textContent) || 0;
    if (current === value) return;
    el.textContent = value;
    el.style.transform = 'scale(1.3)';
    setTimeout(() => { el.style.transform = 'scale(1)'; }, 200);
  }

  // ── Theme System ──
  function applyTheme(themeId) {
    if (themeId === 'default') {
      document.body.removeAttribute('data-theme');
    } else {
      document.body.setAttribute('data-theme', themeId);
    }
    currentTheme = themeId;
    localStorage.setItem(STORAGE_THEME, themeId);
    renderThemeGrid();
  }

  function renderThemeGrid() {
    themeGrid.innerHTML = '';
    THEMES.forEach(theme => {
      const swatch = document.createElement('button');
      swatch.className = 'theme-swatch' + (theme.id === currentTheme ? ' active' : '');
      swatch.style.background = theme.bg;
      swatch.style.color = theme.dark ? '#fff' : '#1a1a2e';
      swatch.style.borderColor = theme.id === currentTheme ? theme.accent : (theme.dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)');
      swatch.innerHTML = `<span class="swatch-name">${theme.name}</span>`;
      swatch.style.setProperty('--swatch-accent', theme.accent);

      // Accent bar at top
      const bar = document.createElement('span');
      bar.style.cssText = `position:absolute;top:0;left:0;right:0;height:4px;background:${theme.accent};border-radius:2px 2px 0 0;`;
      swatch.prepend(bar);

      swatch.addEventListener('click', () => applyTheme(theme.id));
      themeGrid.appendChild(swatch);
    });
  }

  // ── Theme Panel Toggle ──
  themeToggleBtn.addEventListener('click', () => {
    themePanel.classList.toggle('hidden');
  });

  themePanelClose.addEventListener('click', () => {
    themePanel.classList.add('hidden');
  });

  document.addEventListener('click', (e) => {
    if (!themePanel.contains(e.target) && !themeToggleBtn.contains(e.target)) {
      themePanel.classList.add('hidden');
    }
  });

  // ── Tab Navigation ──
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.tab;
      tabBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      if (tab === 'tasks') {
        tasksSection.classList.add('active');
        notesSection.classList.remove('active');
      } else {
        notesSection.classList.add('active');
        tasksSection.classList.remove('active');
      }
    });
  });

  // ── Task Rendering ──
  function getFilteredTasks() {
    if (currentFilter === 'active')    return tasks.filter(t => !t.completed);
    if (currentFilter === 'completed') return tasks.filter(t => t.completed);
    return tasks;
  }

  function renderTasks() {
    const filtered = getFilteredTasks();
    taskList.innerHTML = '';

    if (filtered.length === 0) {
      tasksEmpty.classList.remove('hidden');
    } else {
      tasksEmpty.classList.add('hidden');
      filtered.forEach(task => {
        const li = document.createElement('li');
        li.className = 'task-item' + (task.completed ? ' completed' : '');
        li.dataset.id = task.id;

        li.innerHTML = `
          <button class="task-checkbox" aria-label="Toggle complete">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </button>
          <span class="task-text">${escapeHtml(task.text)}</span>
          <span class="task-priority-badge ${task.priority}">${task.priority}</span>
          <button class="task-delete-btn" aria-label="Delete task">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        `;

        // Toggle complete
        li.querySelector('.task-checkbox').addEventListener('click', () => {
          task.completed = !task.completed;
          saveTasks();
          renderTasks();
          updateStats();
        });

        // Delete
        li.querySelector('.task-delete-btn').addEventListener('click', () => {
          li.classList.add('removing');
          setTimeout(() => {
            tasks = tasks.filter(t => t.id !== task.id);
            saveTasks();
            renderTasks();
            updateStats();
          }, 300);
        });

        taskList.appendChild(li);
      });
    }
    updateStats();
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // ── Add Task ──
  taskForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = taskInput.value.trim();
    if (!text) return;

    tasks.unshift({
      id: generateId(),
      text,
      priority: taskPriority.value,
      completed: false,
      createdAt: Date.now()
    });

    saveTasks();
    renderTasks();
    taskInput.value = '';
    taskInput.focus();
  });

  // ── Filters ──
  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      currentFilter = btn.dataset.filter;
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderTasks();
    });
  });

  // ── Note Color Selection ──
  noteColorDots.forEach(dot => {
    dot.addEventListener('click', () => {
      noteColorDots.forEach(d => d.classList.remove('active'));
      dot.classList.add('active');
      selectedNoteColor = dot.dataset.color;
    });
  });

  // ── Note Rendering ──
  function renderNotes() {
    notesGrid.innerHTML = '';

    if (notes.length === 0) {
      notesEmpty.classList.remove('hidden');
    } else {
      notesEmpty.classList.add('hidden');
      notes.forEach(note => {
        const card = document.createElement('div');
        card.className = 'note-card';
        card.dataset.color = note.color || 'default';
        card.dataset.id = note.id;

        card.innerHTML = `
          <div class="note-card-header">
            <h4 class="note-title">${escapeHtml(note.title)}</h4>
            <button class="note-delete-btn" aria-label="Delete note">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
          <p class="note-body">${escapeHtml(note.body)}</p>
          <div class="note-date">${formatDate(note.createdAt)}</div>
        `;

        card.querySelector('.note-delete-btn').addEventListener('click', () => {
          card.classList.add('removing');
          setTimeout(() => {
            notes = notes.filter(n => n.id !== note.id);
            saveNotes();
            renderNotes();
            updateStats();
          }, 300);
        });

        notesGrid.appendChild(card);
      });
    }
    updateStats();
  }

  // ── Add Note ──
  noteForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const title = noteTitleInput.value.trim();
    const body  = noteBodyInput.value.trim();
    if (!title || !body) return;

    notes.unshift({
      id: generateId(),
      title,
      body,
      color: selectedNoteColor,
      createdAt: Date.now()
    });

    saveNotes();
    renderNotes();
    noteTitleInput.value = '';
    noteBodyInput.value = '';
    noteColorDots.forEach(d => d.classList.remove('active'));
    noteColorDots[0].classList.add('active');
    selectedNoteColor = 'default';
    noteTitleInput.focus();
  });

  // ── Initialize ──
  applyTheme(currentTheme);
  renderTasks();
  renderNotes();
  updateStats();

})();
