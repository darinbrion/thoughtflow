import { native } from './native.js';

const STORAGE_KEY = 'thoughtflow-v1';
const CATEGORY_STORAGE_KEY = 'thoughtflow-categories-v1';
const PROFILE_STORAGE_KEY = 'thoughtflow-profile-v1';
const API_BASE = import.meta.env.VITE_API_URL
  || (location.hostname === 'localhost' && !native.isNative ? 'http://localhost:8000' : '');

const DEFAULT_CATEGORIES = [
  { name: 'Career', color: '#557083', soft: '#e5ebee', symbol: 'C' },
  { name: 'Projects', color: '#486554', soft: '#e4ece6', symbol: 'P' },
  { name: 'Personal', color: '#6d637e', soft: '#ebe8ef', symbol: 'Pe' },
  { name: 'Health', color: '#6b8061', soft: '#e7ede3', symbol: 'H' },
  { name: 'Finance', color: '#8b723b', soft: '#f0eadb', symbol: 'F' },
  { name: 'Education', color: '#8a6655', soft: '#efe5e0', symbol: 'E' },
  { name: 'Relationships', color: '#98656f', soft: '#f1e5e8', symbol: 'R' },
  { name: 'Travel', color: '#4e7b79', soft: '#e3eceb', symbol: 'T' },
];
const CATEGORY_COLORS = [
  ['#557083', '#e5ebee'], ['#486554', '#e4ece6'], ['#6d637e', '#ebe8ef'],
  ['#6b8061', '#e7ede3'], ['#8b723b', '#f0eadb'], ['#8a6655', '#efe5e0'],
  ['#98656f', '#f1e5e8'], ['#4e7b79', '#e3eceb'], ['#756850', '#ece8df'],
  ['#5d6f8a', '#e6eaf0'], ['#815f78', '#eee6ec'], ['#52706c', '#e3ecea'],
];
let categories = loadCategories();
let profile = loadProfile();

const CATEGORY_RULES = {
  Career: ['job', 'recruiter', 'application', 'interview', 'mercor', 'google', 'resume', 'career', 'work', 'manager', 'client'],
  Projects: ['project', 'build', 'app', 'website', 'design', 'roadmap', 'launch', 'stylematch', 'thoughtflow', 'feature', 'code', 'prototype'],
  Personal: ['personal', 'home', 'apartment', 'buy', 'remember', 'weekend', 'idea', 'journal'],
  Health: ['health', 'gym', 'workout', 'doctor', 'sleep', 'run', 'walk', 'meditation', 'therapy', 'meal'],
  Finance: ['money', 'budget', 'bill', 'invoice', 'tax', 'finance', 'bank', 'invest', 'pay'],
  Education: ['learn', 'study', 'course', 'book', 'read', 'class', 'school', 'research'],
  Relationships: ['friend', 'family', 'call', 'birthday', 'partner', 'mom', 'dad', 'dinner'],
  Travel: ['travel', 'trip', 'flight', 'hotel', 'vacation', 'passport', 'visit'],
};

const ACTION_VERBS = [
  'email', 'call', 'finish', 'complete', 'submit', 'follow up', 'schedule',
  'send', 'review', 'write', 'build', 'update', 'book', 'buy', 'research',
  'prepare', 'apply', 'create', 'fix', 'plan', 'organize', 'start',
];

const DEFAULT_THOUGHTS = [
  {
    id: 'seed-1',
    content: 'Follow up with the recruiter about the product role',
    original: 'I need to follow up with the recruiter about the product role tomorrow.',
    category: 'Career',
    priority: 'high',
    action: true,
    project: 'Job search',
    completed: false,
    createdAt: Date.now() - 1000 * 60 * 34,
  },
  {
    id: 'seed-2',
    content: 'Finish the ThoughtFlow capture experience',
    original: 'Finish the ThoughtFlow capture experience and simplify the dashboard.',
    category: 'Projects',
    priority: 'high',
    action: true,
    project: 'ThoughtFlow',
    completed: false,
    createdAt: Date.now() - 1000 * 60 * 92,
  },
  {
    id: 'seed-3',
    content: 'Write the first version of the product roadmap',
    original: 'The project needs a simple roadmap before I add more features.',
    category: 'Projects',
    priority: 'medium',
    action: true,
    project: 'ThoughtFlow',
    completed: false,
    createdAt: Date.now() - 1000 * 60 * 60 * 5,
  },
  {
    id: 'seed-4',
    content: 'Interesting idea: a weekly reflection that surfaces recurring themes',
    original: 'Interesting idea: a weekly reflection that surfaces recurring themes.',
    category: 'Personal',
    priority: 'low',
    action: false,
    project: 'Ideas',
    completed: false,
    createdAt: Date.now() - 1000 * 60 * 60 * 22,
  },
  {
    id: 'seed-5',
    content: 'Schedule a long walk before the weekend',
    original: 'Schedule a long walk before the weekend.',
    category: 'Health',
    priority: 'medium',
    action: true,
    project: 'Wellbeing',
    completed: true,
    createdAt: Date.now() - 1000 * 60 * 60 * 27,
  },
  {
    id: 'seed-6',
    content: 'Review monthly subscriptions and cancel unused tools',
    original: 'Review monthly subscriptions and cancel any tools I do not use.',
    category: 'Finance',
    priority: 'medium',
    action: true,
    project: 'Personal admin',
    completed: false,
    createdAt: Date.now() - 1000 * 60 * 60 * 36,
  },
];

let thoughts = loadThoughts();
let currentView = 'home';
let selectedCategory = null;
let listFilter = 'all';
let captureMode = 'quick';
let captureStage = 'entry';
let pendingDump = '';
let pendingSplits = [];
let categoryDrafts = [];
let summaryMode = 'daily';
let profileDraft = { ...profile };
let toastTimer;

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => Array.from(document.querySelectorAll(selector));

function loadThoughts() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return Array.isArray(saved) ? saved : structuredClone(DEFAULT_THOUGHTS);
  } catch {
    return structuredClone(DEFAULT_THOUGHTS);
  }
}

function makeCategory(name, index) {
  const [color, soft] = CATEGORY_COLORS[index % CATEGORY_COLORS.length];
  const words = name.trim().split(/\s+/);
  const symbol = words.length > 1
    ? words.slice(0, 2).map((word) => word[0]).join('').toUpperCase()
    : name.trim().slice(0, 2);
  return { name: name.trim(), color, soft, symbol };
}

function loadCategories() {
  try {
    const saved = JSON.parse(localStorage.getItem(CATEGORY_STORAGE_KEY));
    if (Array.isArray(saved) && saved.length) {
      return saved.map((category, index) => (
        typeof category === 'string' ? makeCategory(category, index) : { ...makeCategory(category.name, index), ...category }
      ));
    }
  } catch {
    // Use defaults when saved category data is unreadable.
  }
  return structuredClone(DEFAULT_CATEGORIES);
}

function saveCategories() {
  localStorage.setItem(CATEGORY_STORAGE_KEY, JSON.stringify(categories));
}

function loadProfile() {
  try {
    const saved = JSON.parse(localStorage.getItem(PROFILE_STORAGE_KEY));
    if (saved?.name && saved?.avatar && saved?.color) return saved;
  } catch {
    // Use the calm default profile when saved data is unreadable.
  }
  return { name: 'Darin', avatar: 'initials', color: '#20211f' };
}

function saveProfile() {
  localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile));
}

function profileMark(source = profile) {
  if (source.avatar !== 'initials') return source.avatar;
  return source.name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase() || 'You';
}

function saveThoughts() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(thoughts));
}

function normalizeThought(thought) {
  return {
    ...thought,
    createdAt: thought.createdAt
      || (thought.created_at ? new Date(thought.created_at).getTime() : Date.now()),
  };
}

async function apiRequest(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  if (!response.ok) throw new Error(`ThoughtFlow API returned ${response.status}`);
  return response.status === 204 ? null : response.json();
}

function setConnectionStatus(online) {
  const status = $('#connection-status');
  status.classList.toggle('offline', !online);
  status.classList.toggle('online', online);
  status.title = online ? 'Synced with ThoughtFlow Cloud' : 'Working offline';
  status.querySelector('b').textContent = online ? 'Synced' : 'Offline';
}

async function hydrateFromApi() {
  try {
    let remote = await apiRequest('/api/thoughts');
    if (!remote.length && thoughts.length) {
      remote = await Promise.all(thoughts.map((thought) => apiRequest('/api/thoughts', {
        method: 'POST',
        body: JSON.stringify({
          id: thought.id,
          content: thought.content,
          original: thought.original,
          category: thought.category,
          priority: thought.priority,
          action: thought.action,
          project: thought.project,
          completed: thought.completed,
          created_at: new Date(thought.createdAt).toISOString(),
        }),
      })));
    }
    if (remote.length) {
      thoughts = remote.map(normalizeThought);
      saveThoughts();
      renderAll();
    }
    setConnectionStatus(true);
  } catch {
    setConnectionStatus(false);
  }
}

function categoryInfo(name) {
  return categories.find((category) => category.name === name) || categories[0] || makeCategory('Personal', 0);
}

function inferCategory(text) {
  const normalized = text.toLowerCase();
  const namedCategory = categories.find((category) => normalized.includes(category.name.toLowerCase()));
  if (namedCategory) return namedCategory.name;
  let best = { category: categories.find((category) => category.name === 'Personal')?.name || categories[0].name, score: 0 };
  Object.entries(CATEGORY_RULES).forEach(([category, words]) => {
    if (!categories.some((item) => item.name === category)) return;
    const score = words.reduce((total, word) => (
      total + (normalized.includes(word) ? (word.includes(' ') ? 2 : 1) : 0)
    ), 0);
    if (score > best.score) best = { category, score };
  });
  return best.category;
}

function inferPriority(text) {
  const value = text.toLowerCase();
  if (/(urgent|today|tomorrow|asap|deadline|important|must|need to)/.test(value)) return 'high';
  if (/(this week|soon|should|follow up|finish|complete|submit|schedule)/.test(value)) return 'medium';
  return 'low';
}

function inferAction(text) {
  const value = text.toLowerCase().trim();
  return ACTION_VERBS.some((verb) => value.includes(verb)) ||
    /^(i need to|need to|remember to|should|must|todo|to-do)/.test(value);
}

function inferProject(text, category) {
  const value = text.toLowerCase();
  if (value.includes('thoughtflow')) return 'ThoughtFlow';
  if (value.includes('stylematch')) return 'StyleMatch';
  if (value.includes('job') || value.includes('recruiter') || value.includes('application')) return 'Job search';
  if (category === 'Health') return 'Wellbeing';
  if (category === 'Finance') return 'Personal admin';
  if (category === 'Education') return 'Learning';
  return category;
}

function cleanThought(text) {
  return text
    .replace(/^(i have been thinking about whether|i have been thinking about|i think that|i need to|need to|remember to)\s+/i, '')
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/^[a-z]/, (letter) => letter.toUpperCase());
}

function splitBrainDump(text) {
  const normalized = text
    .replace(/\r/g, '')
    .replace(/(?:^|\n)\s*(?:[-*•]|\d+[.)])\s+/g, '\n');
  let parts = normalized
    .split(/\n+|;+\s*|(?<=[.!?])\s+|\s+(?:and|but)\s+(?=(?:i|we|need|should|also)\b)/i)
    .map((part) => part.trim().replace(/[.!?]+$/, ''))
    .filter((part) => part.length > 4);

  const commaParts = normalized.split(/\s*,\s*/).map((part) => part.trim()).filter(Boolean);
  const looksLikeList = commaParts.length >= 3
    || (commaParts.length >= 2 && commaParts.every((part) => part.split(/\s+/).length <= 10));
  if (looksLikeList) {
    parts = commaParts.flatMap((part) => (
      part.split(/\n+|;+\s*|(?<=[.!?])\s+/).map((item) => item.trim())
    ));
  }

  return parts
    .map((part) => part.replace(/^(?:[-*•]|\d+[.)])\s+/, '').trim().replace(/[.!?]+$/, ''))
    .filter((part) => part.length > 2);
}

function organizeText(text, mode = 'quick') {
  const parts = mode === 'dump' ? splitBrainDump(text) : [text.trim()];
  const now = Date.now();
  return parts.map((part, index) => {
    const category = inferCategory(part);
    return {
      id: crypto.randomUUID ? crypto.randomUUID() : `${now}-${index}`,
      content: cleanThought(part),
      original: part,
      category,
      priority: inferPriority(part),
      action: inferAction(part),
      project: inferProject(part, category),
      completed: false,
      createdAt: now + index,
    };
  });
}

function formatRelativeTime(timestamp) {
  const difference = Date.now() - timestamp;
  const minutes = Math.floor(difference / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function dateKey(timestamp) {
  const date = new Date(timestamp);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function startOfWeek(timestamp) {
  const date = new Date(timestamp);
  const day = (date.getDay() + 6) % 7;
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() - day);
  return date;
}

function summaryBullets(items) {
  if (!items.length) return ['No thoughts were captured during this period.'];
  const categoryCounts = categories
    .map((category) => ({
      name: category.name,
      count: items.filter((thought) => thought.category === category.name).length,
    }))
    .filter((item) => item.count)
    .sort((a, b) => b.count - a.count);
  const priorities = ['high', 'medium', 'low'].map((priority) => ({
    priority,
    count: items.filter((thought) => thought.priority === priority).length,
  }));
  const projects = [...new Set(items.map((thought) => thought.project).filter(Boolean))];
  const actions = items.filter((thought) => thought.action);
  const reflections = items.filter((thought) => thought.type === 'reflection');
  const bullets = [
    `${items.length} ${items.length === 1 ? 'entry was' : 'entries were'} captured, led by ${categoryCounts[0]?.name || 'uncategorized ideas'}.`,
    `${priorities.find((item) => item.priority === 'high').count} High, ${priorities.find((item) => item.priority === 'medium').count} Medium, and ${priorities.find((item) => item.priority === 'low').count} Low priority thoughts.`,
  ];
  if (projects.length) bullets.push(`Active themes included ${projects.slice(0, 3).join(', ')}.`);
  if (actions.length) bullets.push(`${actions.length} concrete next ${actions.length === 1 ? 'action was' : 'actions were'} identified.`);
  if (reflections.length) bullets.push(`${reflections.length} longer ${reflections.length === 1 ? 'reflection was' : 'reflections were'} preserved.`);
  return bullets;
}

function summaryGroups(mode = summaryMode) {
  const groups = new Map();
  thoughts.forEach((thought) => {
    const start = mode === 'weekly' ? startOfWeek(thought.createdAt) : new Date(`${dateKey(thought.createdAt)}T00:00:00`);
    const key = dateKey(start.getTime());
    if (!groups.has(key)) groups.set(key, { start, thoughts: [] });
    groups.get(key).thoughts.push(thought);
  });
  return [...groups.values()].sort((a, b) => b.start - a.start);
}

function renderSummaryTimeline() {
  const groups = summaryGroups();
  $('#summary-timeline').innerHTML = groups.length ? groups.map((group, index) => {
    const end = new Date(group.start);
    end.setDate(end.getDate() + 6);
    const label = summaryMode === 'weekly'
      ? `${group.start.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} – ${end.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`
      : group.start.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
    return `
      <details class="history-bubble" data-summary-date="${dateKey(group.start.getTime())}" ${index === 0 ? 'open' : ''}>
        <summary>
          <div>
            <span>${summaryMode === 'weekly' ? 'Weekly summary' : 'Daily summary'}</span>
            <strong>${label}</strong>
          </div>
          <small>${group.thoughts.length} ${group.thoughts.length === 1 ? 'entry' : 'entries'}</small>
        </summary>
        <ul>${summaryBullets(group.thoughts).map((bullet) => `<li>${escapeHtml(bullet)}</li>`).join('')}</ul>
        <div class="summary-thought-links">
          ${group.thoughts.slice(0, 6).map((thought) => `<button data-edit="${thought.id}">${escapeHtml(thought.content)}</button>`).join('')}
        </div>
      </details>
    `;
  }).join('') : emptyState('No summaries yet', 'Daily and weekly summaries appear after you capture thoughts.');
}

function priorityRank(priority) {
  return { high: 3, medium: 2, low: 1 }[priority] || 0;
}

function editIcon() {
  return '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="m4 14.5-.5 2 2-.5L15 6.5 13.5 5zM12.5 6l1.5 1.5"></path></svg>';
}

function sortedThoughts(items = thoughts) {
  return [...items].sort((a, b) => {
    if (a.completed !== b.completed) return Number(a.completed) - Number(b.completed);
    const priorityDifference = priorityRank(b.priority) - priorityRank(a.priority);
    return priorityDifference || b.createdAt - a.createdAt;
  });
}

function escapeHtml(value) {
  const element = document.createElement('div');
  element.textContent = value;
  return element.innerHTML;
}

function escapeAttribute(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

function priorityTag(priority) {
  return `<span class="priority-tag ${priority}">${priority[0].toUpperCase() + priority.slice(1)}</span>`;
}

function categoryTag(category) {
  const info = categoryInfo(category);
  return `<span class="category-tag"><span class="category-dot" style="color:${info.color}"></span>${escapeHtml(category)}</span>`;
}

function emptyState(title, copy) {
  return `<div class="empty-state"><strong>${title}</strong><p>${copy}</p></div>`;
}

function renderSidebar() {
  const categoryNav = $('#category-nav');
  categoryNav.innerHTML = categories.map((category) => {
    const count = thoughts.filter((thought) => thought.category === category.name).length;
    return `
      <button class="category-button ${selectedCategory === category.name ? 'active' : ''}" data-category="${escapeAttribute(category.name)}">
        <span class="category-dot" style="color:${category.color}"></span>
        <span>${category.name}</span>
        <span class="nav-count">${count || ''}</span>
      </button>
    `;
  }).join('');

  $('#thought-count').textContent = thoughts.length;
  $('#action-count').textContent = thoughts.filter((thought) => thought.action && !thought.completed).length;

  $$('.category-button').forEach((button) => {
    button.addEventListener('click', () => {
      selectedCategory = button.dataset.category;
      switchView('thoughts');
      renderAll();
    });
  });
}

function renderPriorities() {
  const priorities = sortedThoughts(
    thoughts.filter((thought) => thought.action && !thought.completed)
  ).slice(0, 4);

  $('#priority-list').innerHTML = priorities.length
    ? priorities.map((thought) => `
      <article class="priority-item ${thought.completed ? 'completed' : ''}" data-id="${thought.id}">
        <button class="complete-button ${thought.completed ? 'completed' : ''}" data-complete="${thought.id}" aria-label="Mark complete">
          <svg viewBox="0 0 20 20" aria-hidden="true"><path d="m5 10 3 3 7-7"></path></svg>
        </button>
        <div class="priority-main">
          <span class="priority-title">${escapeHtml(thought.content)}</span>
          <div class="meta-row">
            ${categoryTag(thought.category)}
            ${priorityTag(thought.priority)}
            <span>${formatRelativeTime(thought.createdAt)}</span>
          </div>
        </div>
        <button class="item-menu" data-edit="${thought.id}" aria-label="Edit thought">${editIcon()}</button>
      </article>
    `).join('')
    : emptyState('Your attention is clear', 'Capture a thought and ThoughtFlow will surface the next action here.');
}

function renderProjects() {
  const grouped = thoughts.reduce((result, thought) => {
    const key = thought.project || thought.category;
    if (!result[key]) result[key] = [];
    result[key].push(thought);
    return result;
  }, {});

  const projects = Object.entries(grouped)
    .map(([name, items]) => {
      const category = items[0].category;
      const completed = items.filter((item) => item.completed).length;
      return {
        name,
        items,
        category,
        completed,
        activity: Math.max(...items.map((item) => item.createdAt)),
      };
    })
    .sort((a, b) => b.items.length - a.items.length || b.activity - a.activity)
    .slice(0, 4);

  $('#project-list').innerHTML = projects.length
    ? projects.map((project) => {
      const info = categoryInfo(project.category);
      const progress = Math.round((project.completed / project.items.length) * 100);
      return `
        <article class="project-card" data-project="${escapeHtml(project.name)}">
          <div class="project-top">
            <span class="project-icon" style="background:${info.soft};color:${info.color}">${info.symbol}</span>
            <span class="project-count">${project.items.length} thought${project.items.length === 1 ? '' : 's'}</span>
          </div>
          <h3>${escapeHtml(project.name)}</h3>
          <p>${project.completed} of ${project.items.length} actions complete</p>
          <div class="progress-track">
            <div class="progress-bar" style="width:${progress}%;color:${info.color}"></div>
          </div>
        </article>
      `;
    }).join('')
    : emptyState('No active projects yet', 'Related thoughts will gather into projects automatically.');
}

function renderRecent() {
  const recent = [...thoughts].sort((a, b) => b.createdAt - a.createdAt).slice(0, 6);
  $('#recent-list').innerHTML = recent.length
    ? recent.map((thought) => {
      const info = categoryInfo(thought.category);
      return `
        <article class="recent-item" data-edit="${thought.id}">
          <span class="recent-symbol" style="background:${info.soft};color:${info.color}">${info.symbol}</span>
          <div>
            <span class="recent-title">${escapeHtml(thought.content)}</span>
            <div class="recent-meta">${escapeHtml(thought.category)} · ${thought.action ? 'Action extracted' : 'Thought'}</div>
          </div>
          <span class="recent-time">${formatRelativeTime(thought.createdAt)}</span>
        </article>
      `;
    }).join('')
    : emptyState('Nothing captured yet', 'Your most recent thoughts will appear here.');
}

function currentListItems() {
  let items = [...thoughts];
  if (currentView === 'actions') items = items.filter((thought) => thought.action);
  if (selectedCategory) items = items.filter((thought) => thought.category === selectedCategory);
  if (listFilter === 'high') items = items.filter((thought) => thought.priority === 'high');
  if (listFilter === 'medium') items = items.filter((thought) => thought.priority === 'medium');
  if (listFilter === 'low') items = items.filter((thought) => thought.priority === 'low');
  if (listFilter === 'open') items = items.filter((thought) => !thought.completed);
  if (listFilter === 'completed') items = items.filter((thought) => thought.completed);
  return sortedThoughts(items);
}

function renderListView() {
  const isActions = currentView === 'actions';
  $('#list-eyebrow').textContent = selectedCategory ? 'Category' : isActions ? 'Execution' : 'Library';
  $('#list-title').textContent = selectedCategory || (isActions ? 'Action items' : 'All thoughts');
  $('#list-description').textContent = selectedCategory
    ? `Everything ThoughtFlow has organized under ${selectedCategory}.`
    : isActions
      ? 'The clear next steps extracted from everything on your mind.'
      : 'Everything you have captured, organized in one place.';

  const items = currentListItems();
  $('#results-count').textContent = `${items.length} item${items.length === 1 ? '' : 's'}`;
  $('#thought-table').innerHTML = items.length
    ? items.map((thought) => `
      <article class="thought-row ${thought.completed ? 'completed' : ''}" data-id="${thought.id}">
        <button class="complete-button ${thought.completed ? 'completed' : ''}" data-complete="${thought.id}" aria-label="Toggle completion">
          <svg viewBox="0 0 20 20" aria-hidden="true"><path d="m5 10 3 3 7-7"></path></svg>
        </button>
        <span class="thought-content" title="${escapeHtml(thought.content)}">${escapeHtml(thought.content)}</span>
        <span class="table-category">${escapeHtml(thought.category)}</span>
        ${priorityTag(thought.priority)}
        <span class="table-time">${formatRelativeTime(thought.createdAt)}</span>
        <button class="item-menu" data-edit="${thought.id}" aria-label="Edit thought">${editIcon()}</button>
      </article>
    `).join('')
    : emptyState('No thoughts found', 'Try another filter or capture something new.');
}

function renderDailySummary() {
  const openActions = sortedThoughts(thoughts.filter((thought) => thought.action && !thought.completed));
  const leadingCategory = categories
    .map((category) => ({
      name: category.name,
      count: thoughts.filter((thought) => thought.category === category.name).length,
    }))
    .sort((a, b) => b.count - a.count)[0];
  const next = openActions[0];
  $('#daily-summary').innerHTML = `
    <div>
      <p class="section-kicker">Daily summary</p>
      <strong>${openActions.length} open action${openActions.length === 1 ? '' : 's'} are asking for attention.</strong>
      <span>${leadingCategory?.count ? `${leadingCategory.name} is your most active area right now.` : 'Capture a thought to begin seeing patterns.'}</span>
    </div>
    ${next ? `<button class="summary-next" data-edit="${next.id}"><small>Suggested next action</small>${escapeHtml(next.content)}</button>` : ''}
  `;
}

function recentTagline() {
  const recent = [...thoughts].sort((a, b) => b.createdAt - a.createdAt).slice(0, 12);
  if (!recent.length) return 'making room for new thoughts and possibilities';
  const dominant = categories
    .map((category) => ({
      name: category.name,
      count: recent.filter((thought) => thought.category === category.name).length,
    }))
    .sort((a, b) => b.count - a.count)[0]?.name;
  const phrases = {
    Career: 'exploring ambitious possibilities with care',
    Projects: 'turning curious ideas into steady momentum',
    Personal: 'making thoughtful space for growth',
    Health: 'building a gentler rhythm for wellbeing',
    Finance: 'bringing calm and clarity to practical plans',
    Education: 'following curiosity into new territory',
    Relationships: 'investing attention in meaningful connections',
    Travel: 'imagining new places and possibilities',
  };
  return phrases[dominant] || `giving ${dominant?.toLowerCase() || 'new ideas'} thoughtful attention`;
}

function renderProfile() {
  const mark = profileMark();
  ['#profile-button', '#overview-avatar'].forEach((selector) => {
    const avatar = $(selector);
    avatar.textContent = mark;
    avatar.style.background = profile.color;
  });
  const name = escapeHtml(profile.name.trim() || 'You');
  $('#recent-tagline').innerHTML = `Recently, ${name} has been ${escapeHtml(recentTagline())}.`;
}

function groupedThoughts() {
  return categories.map((category) => {
    const categoryThoughts = thoughts.filter((thought) => thought.category === category.name);
    const projects = [...new Set(categoryThoughts.map((thought) => thought.project))].map((project) => ({
      name: project,
      thoughts: categoryThoughts.filter((thought) => thought.project === project),
    }));
    return { ...category, thoughts: categoryThoughts, projects };
  }).filter((category) => category.thoughts.length);
}

function renderThoughtTree() {
  $('#thought-tree').innerHTML = groupedThoughts().map((category, categoryIndex) => `
    <details class="tree-category" ${categoryIndex < 2 ? 'open' : ''}>
      <summary>
        <span class="tree-dot" style="background:${category.color}"></span>
        <strong>${category.name}</strong>
        <small>${category.thoughts.length} thought${category.thoughts.length === 1 ? '' : 's'}</small>
      </summary>
      <div class="tree-branches">
        ${['high', 'medium', 'low'].map((priority) => {
          const priorityThoughts = category.thoughts.filter((thought) => thought.priority === priority);
          return `
            <details class="tree-priority" ${priorityThoughts.length ? 'open' : ''}>
              <summary>
                ${priorityTag(priority)}
                <small>${priorityThoughts.length} thought${priorityThoughts.length === 1 ? '' : 's'}</small>
              </summary>
              <div class="tree-priority-content">
                ${priorityThoughts.length ? category.projects.map((project) => {
                  const projectThoughts = project.thoughts.filter((thought) => thought.priority === priority);
                  if (!projectThoughts.length) return '';
                  return `
                    <details class="tree-project" open>
                      <summary>
                        <strong>${escapeHtml(project.name)}</strong>
                        <small>${projectThoughts.length}</small>
                      </summary>
                      <div class="tree-leaves">
                        ${projectThoughts.map((thought) => `
                          <button data-edit="${thought.id}">
                            <span>${escapeHtml(thought.content)}</span>
                            <small>${formatRelativeTime(thought.createdAt)}</small>
                          </button>
                        `).join('')}
                      </div>
                    </details>
                  `;
                }).join('') : '<p class="tree-empty">No thoughts at this priority.</p>'}
              </div>
            </details>
          `;
        }).join('')}
      </div>
    </details>
  `).join('') || emptyState('Your tree is ready to grow', 'Capture a few thoughts and their structure will appear here.');
}

function renderInsights() {
  const total = Math.max(thoughts.length, 1);
  const distribution = groupedThoughts().sort((a, b) => b.thoughts.length - a.thoughts.length);
  const projects = [...new Set(thoughts.map((thought) => thought.project))]
    .map((project) => ({
      name: project,
      thoughts: thoughts.filter((thought) => thought.project === project),
    }))
    .sort((a, b) => b.thoughts.length - a.thoughts.length);
  const newestProject = projects.sort((a, b) => (
    Math.max(...b.thoughts.map((thought) => thought.createdAt))
    - Math.max(...a.thoughts.map((thought) => thought.createdAt))
  ))[0];
  const completed = thoughts.filter((thought) => thought.completed).length;

  $('#insights-content').innerHTML = `
    <section class="insight-card attention-card">
      <div class="insight-heading">
        <div><p class="section-kicker">Attention distribution</p><h2>Where your mind has been</h2></div>
        <span>Based on ${thoughts.length} thoughts</span>
      </div>
      <div class="attention-bars">
        ${distribution.map((category) => {
          const percentage = Math.round((category.thoughts.length / total) * 100);
          return `
            <button data-category-insight="${category.name}">
              <span>${category.name}</span>
              <div><i style="width:${percentage}%;background:${category.color}"></i></div>
              <strong>${percentage}%</strong>
            </button>
          `;
        }).join('')}
      </div>
    </section>
    <div class="insight-grid">
      <article class="insight-card metric-card">
        <p class="section-kicker">Emerging interest</p>
        <strong>${escapeHtml(newestProject?.name || 'No project yet')}</strong>
        <span>${newestProject ? 'Appears in your most recently active project cluster.' : 'New patterns will surface as you capture thoughts.'}</span>
      </article>
      <article class="insight-card metric-card">
        <p class="section-kicker">Growing project</p>
        <strong>${escapeHtml(projects[0]?.name || 'No project yet')}</strong>
        <span>${projects[0] ? `${projects[0].thoughts.length} connected thoughts make this your largest current project.` : 'No project activity yet.'}</span>
      </article>
      <article class="insight-card metric-card">
        <p class="section-kicker">Follow-through</p>
        <strong>${thoughts.length ? Math.round((completed / thoughts.length) * 100) : 0}% completed</strong>
        <span>This is descriptive, not a score. Some thoughts are meant to remain open.</span>
      </article>
    </div>
    <section class="reflection-card">
      <p class="section-kicker">Monthly reflection</p>
      <h2>Your attention is concentrating around ${distribution[0]?.name || 'new themes'}.</h2>
      <p>${distribution[1] ? `${distribution[1].name} remains a meaningful secondary area, while ` : ''}${projects[0]?.name || 'your projects'} contains the densest cluster of related thoughts.</p>
    </section>
  `;
}

function signalData() {
  const projectGroups = [...new Set(thoughts.map((thought) => thought.project))]
    .map((project) => ({ project, evidence: thoughts.filter((thought) => thought.project === project) }))
    .filter((group) => group.evidence.length > 1)
    .sort((a, b) => b.evidence.length - a.evidence.length);
  const categoryGroups = groupedThoughts().sort((a, b) => b.thoughts.length - a.thoughts.length);
  const unresolved = thoughts.filter((thought) => !thought.completed && thought.action);
  const signals = [];

  if (projectGroups[0]) signals.push({
    type: 'Recurring theme',
    title: `${projectGroups[0].project} keeps returning across your recent thoughts.`,
    body: `This project appears ${projectGroups[0].evidence.length} times, making it your most repeated specific theme.`,
    evidence: projectGroups[0].evidence,
  });
  if (categoryGroups[0] && projectGroups[0]) signals.push({
    type: 'Hidden connection',
    title: `${projectGroups[0].project} is closely connected to ${categoryGroups[0].name}.`,
    body: 'These ideas repeatedly occupy the same part of your thought map.',
    evidence: projectGroups[0].evidence.filter((thought) => thought.category === categoryGroups[0].name).slice(0, 4),
  });
  if (unresolved.length) signals.push({
    type: 'Unresolved topic',
    title: `${unresolved.length} action-oriented thought${unresolved.length === 1 ? ' remains' : 's remain'} open.`,
    body: 'These thoughts describe next steps but do not yet have a recorded completion.',
    evidence: unresolved.slice(0, 4),
  });
  if (categoryGroups[1]) signals.push({
    type: 'Attention pattern',
    title: `${categoryGroups[1].name} is a steady secondary area of attention.`,
    body: `It accounts for ${Math.round((categoryGroups[1].thoughts.length / Math.max(thoughts.length, 1)) * 100)}% of your captured thought history.`,
    evidence: categoryGroups[1].thoughts.slice(0, 4),
  });
  return signals;
}

function renderSignals() {
  const signals = signalData();
  $('#signal-list').innerHTML = signals.map((signal, index) => `
    <article class="signal-card">
      <div class="signal-number">${String(index + 1).padStart(2, '0')}</div>
      <div class="signal-copy">
        <p class="section-kicker">${signal.type}</p>
        <h2>${escapeHtml(signal.title)}</h2>
        <p>${escapeHtml(signal.body)}</p>
        <details class="signal-evidence">
          <summary>Why am I seeing this?</summary>
          <div>
            ${signal.evidence.map((thought) => `
              <button data-edit="${thought.id}">
                <time>${new Date(thought.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</time>
                <span>“${escapeHtml(thought.original || thought.content)}”</span>
              </button>
            `).join('') || '<p>This signal will strengthen as more evidence is captured.</p>'}
          </div>
        </details>
      </div>
    </article>
  `).join('') || emptyState('No strong signals yet', 'Signals appear only when multiple thoughts provide enough evidence.');
}

function renderRelationships() {
  const categories = groupedThoughts().slice(0, 4);
  const projects = [...new Set(thoughts.map((thought) => thought.project))].slice(0, 5);
  const nodes = [
    ...categories.map((category, index) => ({ name: category.name, type: 'category', x: 18, y: 18 + index * 21 })),
    ...projects.map((project, index) => ({ name: project, type: 'project', x: 70, y: 12 + index * 18 })),
  ];
  const lines = [];
  categories.forEach((category, categoryIndex) => {
    projects.forEach((project, projectIndex) => {
      if (thoughts.some((thought) => thought.category === category.name && thought.project === project)) {
        lines.push({ x1: 18, y1: 18 + categoryIndex * 21, x2: 70, y2: 12 + projectIndex * 18 });
      }
    });
  });
  $('#relationship-map').innerHTML = `
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
      ${lines.map((line) => `<line x1="${line.x1}" y1="${line.y1}" x2="${line.x2}" y2="${line.y2}"></line>`).join('')}
    </svg>
    ${nodes.map((node) => `
      <button class="map-node ${node.type}" style="left:${node.x}%;top:${node.y}%" data-relationship="${escapeHtml(node.name)}">
        ${escapeHtml(node.name)}
      </button>
    `).join('')}
  `;
  $('#relationship-detail').innerHTML = `
    <p class="section-kicker">Explore a connection</p>
    <h2>Select any node</h2>
    <p>ThoughtFlow will show the exact thoughts contributing to that relationship.</p>
  `;
  $$('[data-relationship]').forEach((node) => node.addEventListener('click', () => {
    const name = node.dataset.relationship;
    const evidence = thoughts.filter((thought) => thought.category === name || thought.project === name);
    $('#relationship-detail').innerHTML = `
      <p class="section-kicker">${evidence.some((thought) => thought.category === name) ? 'Life area' : 'Project'}</p>
      <h2>${escapeHtml(name)}</h2>
      <p>${evidence.length} thought${evidence.length === 1 ? '' : 's'} contribute to this node.</p>
      <div class="relationship-evidence">
        ${evidence.slice(0, 5).map((thought) => `<button data-edit="${thought.id}">${escapeHtml(thought.content)}</button>`).join('')}
      </div>
    `;
    bindRenderedActions();
  }));
}

function bindRenderedActions() {
  $$('[data-complete]').forEach((button) => {
    button.addEventListener('click', () => toggleComplete(button.dataset.complete));
  });
  $$('[data-edit]').forEach((element) => {
    element.addEventListener('click', () => openEdit(element.dataset.edit));
  });
  $$('.project-card').forEach((card) => {
    card.addEventListener('click', () => {
      const project = card.dataset.project;
      const projectThought = thoughts.find((thought) => thought.project === project);
      selectedCategory = projectThought?.category || null;
      switchView('thoughts');
      renderAll();
    });
  });
  $$('[data-category-insight]').forEach((button) => {
    button.addEventListener('click', () => {
      selectedCategory = button.dataset.categoryInsight;
      switchView('thoughts');
      renderAll();
    });
  });
}

function renderAll() {
  renderSidebar();
  renderPriorities();
  renderProjects();
  renderRecent();
  renderListView();
  renderDailySummary();
  renderThoughtTree();
  renderSummaryTimeline();
  renderInsights();
  renderSignals();
  renderRelationships();
  renderProfile();
  bindRenderedActions();
}

function openCategoryEditor() {
  categoryDrafts = categories.map((category) => ({ original: category.name, name: category.name }));
  renderCategoryEditor();
  $('#category-error').classList.add('hidden');
  $('#category-modal').classList.remove('hidden');
}

function closeCategoryEditor() {
  $('#category-modal').classList.add('hidden');
}

function renderCategoryEditor() {
  $('#category-editor-list').innerHTML = categoryDrafts.map((category, index) => `
    <div class="category-editor-row">
      <span class="category-dot" style="color:${makeCategory(category.name || 'Category', index).color}"></span>
      <input maxlength="25" value="${escapeAttribute(category.name)}" data-category-input="${index}" aria-label="Category ${index + 1}">
      <span class="character-count">${category.name.length}/25</span>
      <button data-delete-category="${index}" aria-label="Delete ${escapeAttribute(category.name || 'category')}">
        <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M5 5l10 10M15 5 5 15"></path></svg>
      </button>
    </div>
  `).join('');
  $$('[data-category-input]').forEach((input) => input.addEventListener('input', () => {
    const index = Number(input.dataset.categoryInput);
    categoryDrafts[index].name = input.value;
    input.parentElement.querySelector('.character-count').textContent = `${input.value.length}/25`;
  }));
  $$('[data-delete-category]').forEach((button) => button.addEventListener('click', () => {
    if (categoryDrafts.length === 1) {
      showCategoryError('ThoughtFlow needs at least one category.');
      return;
    }
    categoryDrafts.splice(Number(button.dataset.deleteCategory), 1);
    renderCategoryEditor();
  }));
}

function showCategoryError(message) {
  $('#category-error').textContent = message;
  $('#category-error').classList.remove('hidden');
}

function saveCategoryEdits() {
  const names = categoryDrafts.map((category) => category.name.trim());
  if (!names.length) return showCategoryError('ThoughtFlow needs at least one category.');
  if (names.some((name) => !name)) return showCategoryError('Category names cannot be blank.');
  if (names.some((name) => name.length > 25)) return showCategoryError('Category names must be 25 characters or fewer.');
  if (new Set(names.map((name) => name.toLowerCase())).size !== names.length) {
    return showCategoryError('Each category needs a unique name.');
  }

  const renameMap = new Map(categoryDrafts.filter((draft) => draft.original).map((draft) => [draft.original, draft.name.trim()]));
  const remainingOriginals = new Set(categoryDrafts.map((draft) => draft.original).filter(Boolean));
  const fallback = names[0];
  thoughts = thoughts.map((thought) => ({
    ...thought,
    category: renameMap.get(thought.category) || (remainingOriginals.has(thought.category) ? thought.category : fallback),
  }));
  categories = names.map((name, index) => makeCategory(name, index));
  saveCategories();
  saveThoughts();
  selectedCategory = categories.some((category) => category.name === selectedCategory) ? selectedCategory : null;
  initSelects();
  closeCategoryEditor();
  renderAll();
  showToast('Categories updated');
}

function openProfileEditor() {
  profileDraft = { ...profile };
  $('#profile-name').value = profileDraft.name;
  renderProfileChoices();
  $('#profile-modal').classList.remove('hidden');
}

function closeProfileEditor() {
  $('#profile-modal').classList.add('hidden');
}

function renderProfileChoices() {
  $$('[data-avatar]').forEach((button) => {
    button.classList.toggle('active', button.dataset.avatar === profileDraft.avatar);
  });
  $$('[data-profile-color]').forEach((button) => {
    button.style.background = button.dataset.profileColor;
    button.classList.toggle('active', button.dataset.profileColor === profileDraft.color);
  });
}

function saveProfileEdits() {
  const name = $('#profile-name').value.trim();
  if (!name) {
    showToast('Please add a name');
    return;
  }
  profile = { ...profileDraft, name };
  saveProfile();
  closeProfileEditor();
  renderProfile();
  showToast('Profile updated');
}

function switchView(view) {
  currentView = view;
  $('#dashboard-view').classList.toggle('hidden', view !== 'home');
  $('#list-view').classList.toggle('hidden', !['thoughts', 'actions'].includes(view));
  ['tree', 'insights', 'signals', 'relationships'].forEach((name) => {
    $(`#${name}-view`).classList.toggle('hidden', view !== name);
  });
  $$('.nav-item').forEach((item) => {
    item.classList.toggle('active', item.dataset.view === view);
  });
  closeSidebar();
}

function closeSidebar() {
  $('.sidebar').classList.remove('open');
  $('#sidebar-backdrop').classList.remove('visible');
  $('#mobile-menu').setAttribute('aria-expanded', 'false');
}

function toggleSidebar() {
  const opening = !$('.sidebar').classList.contains('open');
  $('.sidebar').classList.toggle('open', opening);
  $('#sidebar-backdrop').classList.toggle('visible', opening);
  $('#mobile-menu').setAttribute('aria-expanded', String(opening));
}

async function addThoughts(text, mode = 'quick') {
  if (!text.trim()) return;
  let organized;
  let provider = 'local';
  try {
    const result = await apiRequest('/api/organize', {
      method: 'POST',
      body: JSON.stringify({ text, mode, categories: categories.map((category) => category.name) }),
    });
    organized = result.thoughts.map(normalizeThought);
    provider = result.provider;
    setConnectionStatus(true);
  } catch {
    organized = organizeText(text, mode);
    setConnectionStatus(false);
  }
  thoughts = [...organized, ...thoughts];
  saveThoughts();
  renderAll();
  await native.tap();
  showToast(
    organized.length === 1
      ? `Organized under ${organized[0].category}${provider === 'openai' ? ' with AI' : ''}`
      : `Turned your brain dump into ${organized.length} clear thoughts`
  );
}

async function toggleComplete(id) {
  const current = thoughts.find((thought) => thought.id === id);
  if (!current) return;
  const completed = !current.completed;
  thoughts = thoughts.map((thought) => (
    thought.id === id ? { ...thought, completed } : thought
  ));
  saveThoughts();
  renderAll();
  native.tap();
  apiRequest(`/api/thoughts/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ completed }),
  }).then(() => setConnectionStatus(true)).catch(() => setConnectionStatus(false));
}

function openCapture(mode = 'quick') {
  captureMode = mode;
  captureStage = 'entry';
  pendingDump = '';
  pendingSplits = [];
  $$('.capture-tab').forEach((tab) => tab.classList.toggle('active', tab.dataset.mode === mode));
  $('#capture-input').placeholder = mode === 'dump'
    ? 'Write freely. Include everything competing for your attention...'
    : 'What is on your mind?';
  $('#capture-hint').textContent = mode === 'dump'
    ? 'ThoughtFlow will separate themes, actions, and priorities for you.'
    : 'One thought, task, concern, or idea. Press ⌘ Enter to organize it.';
  $('#capture-input').value = '';
  renderCaptureStage();
  $('#capture-modal').classList.remove('hidden');
  requestAnimationFrame(() => $('#capture-input').focus());
}

function closeCapture() {
  $('#capture-modal').classList.add('hidden');
}

async function submitCapture() {
  const value = $('#capture-input').value;
  if (captureStage === 'entry') {
    if (!value.trim()) return;
    if (captureMode === 'dump') {
      pendingDump = value.trim();
      pendingSplits = splitBrainDump(pendingDump);
      captureStage = 'choice';
      renderCaptureStage();
      return;
    }
    closeCapture();
    await addThoughts(value, 'quick');
    return;
  }
  if (captureStage === 'review') await confirmSplit();
}

function renderCaptureStage() {
  $('#capture-entry').classList.toggle('hidden', captureStage !== 'entry');
  $('#dump-choice').classList.toggle('hidden', captureStage !== 'choice');
  $('#dump-review').classList.toggle('hidden', captureStage !== 'review');
  $('.capture-tabs').classList.toggle('hidden', captureStage !== 'entry');
  $('.ai-note').classList.toggle('hidden', captureStage === 'choice');
  $('#organize-button').classList.toggle('hidden', captureStage === 'choice');
  $('#organize-label').textContent = captureStage === 'review'
    ? 'Confirm and save'
    : captureMode === 'dump' ? 'Continue to review' : 'Organize thought';
  if (captureStage === 'review') renderSplitReview();
}

function renderSplitReview() {
  $('#split-list').innerHTML = pendingSplits.map((part, index) => `
    <article class="split-card" data-split-index="${index}">
      <div class="split-number">${index + 1}</div>
      <textarea aria-label="Thought ${index + 1}">${escapeHtml(part)}</textarea>
      <div class="split-actions">
        ${index ? `<button data-merge="${index}">Merge with previous</button>` : ''}
        <button data-remove-split="${index}" aria-label="Remove thought ${index + 1}">Remove</button>
      </div>
    </article>
  `).join('');
  $$('.split-card textarea').forEach((textarea, index) => {
    textarea.addEventListener('input', () => { pendingSplits[index] = textarea.value; });
  });
  $$('[data-merge]').forEach((button) => button.addEventListener('click', () => {
    const index = Number(button.dataset.merge);
    pendingSplits[index - 1] = `${pendingSplits[index - 1]} ${pendingSplits[index]}`.trim();
    pendingSplits.splice(index, 1);
    renderSplitReview();
  }));
  $$('[data-remove-split]').forEach((button) => button.addEventListener('click', () => {
    pendingSplits.splice(Number(button.dataset.removeSplit), 1);
    renderSplitReview();
  }));
}

async function saveReflection() {
  const organized = organizeText(pendingDump, 'quick')[0];
  organized.type = 'reflection';
  organized.action = false;
  organized.content = pendingDump;
  thoughts = [organized, ...thoughts];
  saveThoughts();
  closeCapture();
  renderAll();
  await native.tap();
  showToast('Saved as one reflection');
}

async function confirmSplit() {
  pendingSplits = pendingSplits.map((part) => part.trim()).filter(Boolean);
  if (!pendingSplits.length) return;
  const organized = pendingSplits.flatMap((part) => organizeText(part, 'quick'));
  thoughts = [...organized, ...thoughts];
  saveThoughts();
  closeCapture();
  renderAll();
  await native.tap();
  showToast(`Saved ${organized.length} distinct thought${organized.length === 1 ? '' : 's'}`);
}

function openEdit(id) {
  const thought = thoughts.find((item) => item.id === id);
  if (!thought) return;
  $('#edit-id').value = thought.id;
  $('#edit-content').value = thought.content;
  $('#edit-category').value = thought.category;
  $('#edit-priority').value = thought.priority;
  $('#edit-modal').classList.remove('hidden');
  requestAnimationFrame(() => $('#edit-content').focus());
}

function closeEdit() {
  $('#edit-modal').classList.add('hidden');
}

function saveEdit() {
  const id = $('#edit-id').value;
  const content = $('#edit-content').value.trim();
  if (!content) return;
  const update = {
    content,
    category: $('#edit-category').value,
    priority: $('#edit-priority').value,
    project: inferProject(content, $('#edit-category').value),
  };
  thoughts = thoughts.map((thought) => (
    thought.id === id
      ? { ...thought, ...update }
      : thought
  ));
  saveThoughts();
  closeEdit();
  renderAll();
  showToast('Thought updated');
  apiRequest(`/api/thoughts/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(update),
  }).then(() => setConnectionStatus(true)).catch(() => setConnectionStatus(false));
}

function deleteThought() {
  const id = $('#edit-id').value;
  thoughts = thoughts.filter((thought) => thought.id !== id);
  saveThoughts();
  closeEdit();
  renderAll();
  showToast('Thought deleted');
  apiRequest(`/api/thoughts/${id}`, { method: 'DELETE' })
    .then(() => setConnectionStatus(true))
    .catch(() => setConnectionStatus(false));
}

async function shareCurrentThought() {
  const thought = thoughts.find((item) => item.id === $('#edit-id').value);
  if (!thought) return;
  try {
    await native.shareThought(thought);
  } catch {
    await navigator.clipboard.writeText(thought.content);
    showToast('Thought copied');
  }
}

async function remindCurrentThought() {
  const thought = thoughts.find((item) => item.id === $('#edit-id').value);
  if (!thought) return;
  if (thought.priority !== 'high') {
    showToast('Set this thought to high priority first');
    return;
  }
  const scheduled = await native.schedulePriorityReminder(thought);
  showToast(scheduled ? 'Reminder set for one hour from now' : 'Reminders are available in the iPhone app');
}

function openSearch() {
  $('#search-overlay').classList.remove('hidden');
  $('#global-search').value = '';
  const guideButtons = $$('[data-search-guide]');
  const categoryGuide = guideButtons[guideButtons.length - 1];
  if (categoryGuide) {
    categoryGuide.dataset.searchGuide = categories[0]?.name || '';
    categoryGuide.textContent = categories[0]?.name || 'Category';
  }
  renderSearch('');
  requestAnimationFrame(() => $('#global-search').focus());
}

function closeSearch() {
  $('#search-overlay').classList.add('hidden');
}

function renderSearch(query) {
  const normalized = query.toLowerCase().trim();
  const now = new Date();
  const today = dateKey(now.getTime());
  const yesterdayDate = new Date(now);
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterday = dateKey(yesterdayDate.getTime());
  const weekStart = startOfWeek(now.getTime()).getTime();
  const results = [...thoughts]
    .filter((thought) => {
      if (!normalized) return true;
      const created = new Date(thought.createdAt);
      if (normalized === 'today') return dateKey(thought.createdAt) === today;
      if (normalized === 'yesterday') return dateKey(thought.createdAt) === yesterday;
      if (normalized === 'this week') return thought.createdAt >= weekStart;
      if (normalized === 'high priority') return thought.priority === 'high';
      if (normalized === 'medium priority') return thought.priority === 'medium';
      if (normalized === 'low priority') return thought.priority === 'low';
      const searchable = [
        thought.content,
        thought.original,
        thought.category,
        thought.project,
        thought.priority,
        thought.type || 'thought',
        dateKey(thought.createdAt),
        created.toLocaleDateString(),
        created.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }),
        created.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }),
      ].join(' ').toLowerCase();
      return normalized.split(/\s+/).every((term) => searchable.includes(term));
    })
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, 12);

  $('#search-results').innerHTML = results.length
    ? results.map((thought) => {
      const info = categoryInfo(thought.category);
      return `
        <div class="search-result" data-search-id="${thought.id}">
          <span class="recent-symbol" style="background:${info.soft};color:${info.color}">${info.symbol}</span>
          <div>
            <span class="recent-title">${escapeHtml(thought.content)}</span>
            <div class="recent-meta">${escapeHtml(thought.category)} · ${priorityTag(thought.priority)} · ${new Date(thought.createdAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</div>
          </div>
          <small>${formatRelativeTime(thought.createdAt)}</small>
        </div>
      `;
    }).join('')
    : emptyState('No matching thoughts', 'Try a broader word or category.');

  $$('[data-search-id]').forEach((result) => {
    result.addEventListener('click', () => {
      closeSearch();
      openEdit(result.dataset.searchId);
    });
  });
}

function showToast(message) {
  const toast = $('#toast');
  toast.textContent = message;
  toast.classList.add('visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('visible'), 2600);
}

function setCurrentDate() {
  $('#current-date').textContent = new Intl.DateTimeFormat(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  }).format(new Date());
}

function initSelects() {
  $('#edit-category').innerHTML = categories
    .map((category) => `<option value="${escapeAttribute(category.name)}">${escapeHtml(category.name)}</option>`)
    .join('');
}

function bindStaticEvents() {
  $('#open-capture').addEventListener('click', () => openCapture('quick'));
  $('#inline-open-capture').addEventListener('click', () => openCapture('quick'));
  $('#close-capture').addEventListener('click', closeCapture);
  $('#organize-button').addEventListener('click', submitCapture);

  $$('.capture-tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      captureMode = tab.dataset.mode;
      $$('.capture-tab').forEach((item) => item.classList.toggle('active', item === tab));
      $('#capture-input').placeholder = captureMode === 'dump'
        ? 'Write freely. Include everything competing for your attention...'
        : 'What is on your mind?';
      $('#capture-hint').textContent = captureMode === 'dump'
        ? 'ThoughtFlow will separate themes, actions, and priorities for you.'
        : 'One thought, task, concern, or idea. Press ⌘ Enter to organize it.';
      $('#capture-input').focus();
    });
  });

  $('#capture-input').addEventListener('keydown', (event) => {
    if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') submitCapture();
  });

  $('#inline-submit').addEventListener('click', () => {
    addThoughts($('#inline-thought').value);
    $('#inline-thought').value = '';
  });

  $('#inline-thought').addEventListener('keydown', (event) => {
    if (event.key === 'Enter') $('#inline-submit').click();
  });

  $$('.nav-item').forEach((item) => {
    item.addEventListener('click', () => {
      selectedCategory = null;
      switchView(item.dataset.view);
      renderAll();
    });
  });

  $$('[data-jump-view]').forEach((button) => {
    button.addEventListener('click', () => {
      selectedCategory = null;
      switchView(button.dataset.jumpView);
      renderAll();
    });
  });

  $$('.filter-pill').forEach((pill) => {
    pill.addEventListener('click', () => {
      listFilter = pill.dataset.priority;
      $$('.filter-pill').forEach((item) => item.classList.toggle('active', item === pill));
      renderListView();
      bindRenderedActions();
    });
  });

  $('#close-edit').addEventListener('click', closeEdit);
  $('#save-edit').addEventListener('click', saveEdit);
  $('#delete-thought').addEventListener('click', deleteThought);
  $('#share-thought').addEventListener('click', shareCurrentThought);
  $('#remind-thought').addEventListener('click', remindCurrentThought);
  $('#search-button').addEventListener('click', openSearch);
  $('#global-search').addEventListener('input', (event) => renderSearch(event.target.value));
  $$('[data-search-guide]').forEach((button) => button.addEventListener('click', () => {
    $('#global-search').value = button.dataset.searchGuide;
    renderSearch(button.dataset.searchGuide);
    $('#global-search').focus();
  }));
  $('#manage-categories').addEventListener('click', openCategoryEditor);
  $('#close-categories').addEventListener('click', closeCategoryEditor);
  $('#add-category').addEventListener('click', () => {
    categoryDrafts.push({ original: null, name: '' });
    renderCategoryEditor();
    const inputs = $$('[data-category-input]');
    inputs[inputs.length - 1]?.focus();
  });
  $('#save-categories').addEventListener('click', saveCategoryEdits);
  $('#profile-button').addEventListener('click', openProfileEditor);
  $('#profile-overview').addEventListener('click', openProfileEditor);
  $('#close-profile').addEventListener('click', closeProfileEditor);
  $('#save-profile').addEventListener('click', saveProfileEdits);
  $$('[data-avatar]').forEach((button) => button.addEventListener('click', () => {
    profileDraft.avatar = button.dataset.avatar;
    renderProfileChoices();
  }));
  $$('[data-profile-color]').forEach((button) => button.addEventListener('click', () => {
    profileDraft.color = button.dataset.profileColor;
    renderProfileChoices();
  }));
  $$('.summary-tab').forEach((button) => button.addEventListener('click', () => {
    summaryMode = button.dataset.summaryMode;
    $$('.summary-tab').forEach((tab) => tab.classList.toggle('active', tab === button));
    renderSummaryTimeline();
    bindRenderedActions();
  }));
  $('#summary-date').addEventListener('change', (event) => {
    const value = event.target.value;
    if (!value) return;
    const targetKey = summaryMode === 'weekly'
      ? dateKey(startOfWeek(new Date(`${value}T12:00:00`).getTime()).getTime())
      : value;
    const target = document.querySelector(`[data-summary-date="${targetKey}"]`);
    if (!target) {
      showToast('No thoughts were captured in that period');
      return;
    }
    target.open = true;
    target.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });
  $('#mobile-menu').addEventListener('click', toggleSidebar);
  $('#sidebar-menu-toggle').addEventListener('click', toggleSidebar);
  $('#sidebar-close').addEventListener('click', closeSidebar);
  $('#sidebar-backdrop').addEventListener('click', closeSidebar);
  $('#keep-reflection').addEventListener('click', saveReflection);
  $('#review-split').addEventListener('click', () => {
    captureStage = 'review';
    renderCaptureStage();
  });
  $('#back-to-choice').addEventListener('click', () => {
    captureStage = 'choice';
    renderCaptureStage();
  });
  $('#add-split').addEventListener('click', () => {
    pendingSplits.push('');
    renderSplitReview();
    const fields = $$('.split-card textarea');
    fields[fields.length - 1]?.focus();
  });

  $('#reset-demo').addEventListener('click', () => {
    thoughts = structuredClone(DEFAULT_THOUGHTS);
    categories = structuredClone(DEFAULT_CATEGORIES);
    saveCategories();
    saveThoughts();
    initSelects();
    selectedCategory = null;
    switchView('home');
    renderAll();
    showToast('Workspace reset');
  });

  [$('#capture-modal'), $('#edit-modal'), $('#category-modal'), $('#profile-modal')].forEach((backdrop) => {
    backdrop.addEventListener('click', (event) => {
      if (event.target === backdrop) backdrop.classList.add('hidden');
    });
  });

  $('#search-overlay').addEventListener('click', (event) => {
    if (event.target === $('#search-overlay')) closeSearch();
  });

  document.addEventListener('keydown', (event) => {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      openSearch();
    }
    if (event.key === 'Escape') {
      closeSearch();
      closeCapture();
      closeEdit();
      closeCategoryEditor();
      closeProfileEditor();
    }
  });
}

function init() {
  setCurrentDate();
  initSelects();
  bindStaticEvents();
  switchView('home');
  renderAll();
  hydrateFromApi();
  native.initialize((text) => {
    openCapture('quick');
    $('#capture-input').value = text;
  });
  if ('serviceWorker' in navigator && !native.isNative) {
    window.addEventListener('load', () => navigator.serviceWorker.register('/service-worker.js'));
  }
}

init();
