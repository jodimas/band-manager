interface User {
  id: string;
  username: string;
  role: 'admin' | 'user';
  createdAt: string;
}

interface Vote {
  userId: string;
  userName?: string;
  comment: string;
  createdAt: string;
}

interface DateOption {
  id: string;
  datetime: string;
  location: string;
  votes: Vote[];
}

interface Rehearsal {
  id: string;
  title: string;
  description: string;
  createdAt: string;
  dates: DateOption[];
  selectedDateId: string | null;
}

const API_BASE = '/api';

let currentUser: User | null = null;
let token: string = '';
let rehearsals: Rehearsal[] = [];
let users: User[] = [];

function $(selector: string): HTMLElement | null {
  return document.querySelector(selector);
}

function $$(selector: string): NodeListOf<HTMLElement> {
  return document.querySelectorAll(selector);
}

function formatDateTime(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleDateString('de-DE', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function getMaxVotes(rehearsal: Rehearsal): number {
  if (rehearsal.dates.length === 0) return 0;
  return Math.max(...rehearsal.dates.map(d => d.votes.length));
}

function showModal(content: string): void {
  const modal = $('#modal');
  const modalBody = $('#modalBody');
  if (modal && modalBody) {
    modalBody.innerHTML = content;
    modal.classList.remove('hidden');
  }
}

function hideModal(): void {
  const modal = $('#modal');
  if (modal) {
    modal.classList.add('hidden');
  }
}

function getAuthHeaders(): Record<string, string> {
  return token ? { 'Authorization': `Bearer ${token}` } : {};
}

async function checkSetupStatus(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/auth/status`);
    const data = await res.json();
    return data.setupComplete;
  } catch (err) {
    console.error('Failed to check setup status:', err);
    return false;
  }
}

async function setup(username: string, password: string): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/auth/setup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    if (!res.ok) {
      const err = await res.json();
      alert(err.error || 'Setup failed');
      return false;
    }
    const data = await res.json();
    token = data.token;
    currentUser = data.user;
    localStorage.setItem('token', token);
    return true;
  } catch (err) {
    console.error('Setup failed:', err);
    alert('Setup failed');
    return false;
  }
}

async function login(username: string, password: string): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    if (!res.ok) {
      const err = await res.json();
      alert(err.error || 'Login failed');
      return false;
    }
    const data = await res.json();
    token = data.token;
    currentUser = data.user;
    localStorage.setItem('token', token);
    return true;
  } catch (err) {
    console.error('Login failed:', err);
    alert('Login failed');
    return false;
  }
}

async function logout(): Promise<void> {
  token = '';
  currentUser = null;
  localStorage.removeItem('token');
  showLoginForm();
}

async function loadRehearsals(): Promise<void> {
  try {
    const res = await fetch(`${API_BASE}/rehearsals`);
    rehearsals = await res.json();
    renderRehearsals();
  } catch (err) {
    console.error('Failed to load rehearsals:', err);
  }
}

async function loadUsers(): Promise<void> {
  try {
    const res = await fetch(`${API_BASE}/users`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) {
      const err = await res.json();
      alert(err.error || 'Failed to load users');
      return;
    }
    users = await res.json();
    renderUsers();
  } catch (err) {
    console.error('Failed to load users:', err);
  }
}

function renderRehearsals(): void {
  const list = $('#rehearsalsList');
  if (!list) return;

  if (rehearsals.length === 0) {
    list.innerHTML = '<p style="color: var(--text-secondary); text-align: center;">No rehearsals yet.</p>';
    return;
  }

  list.innerHTML = rehearsals.map(r => `
    <div class="rehearsal-card" data-id="${r.id}">
      <h3>${escapeHtml(r.title)}</h3>
      <p>${escapeHtml(r.description)}</p>
      <div class="rehearsal-meta">
        <span>${r.dates.length} date${r.dates.length !== 1 ? 's' : ''}</span>
        ${r.selectedDateId ? '<span class="selected-badge">Selected</span>' : ''}
      </div>
    </div>
  `).join('');

  list.querySelectorAll('.rehearsal-card').forEach(card => {
    card.addEventListener('click', () => {
      const id = (card as HTMLElement).dataset.id;
      if (id) showRehearsalDetail(id);
    });
  });
}

function renderUsers(): void {
  const list = $('#usersList');
  if (!list) return;

  list.innerHTML = users.map(u => `
    <div class="user-card">
      <div class="user-info">
        <div class="user-avatar">${u.username.charAt(0).toUpperCase()}</div>
        <div class="user-details">
          <h4>${escapeHtml(u.username)}</h4>
          <span class="user-role ${u.role}">${u.role}</span>
        </div>
      </div>
      <div class="user-actions">
        <button class="btn btn-secondary" onclick="editUser('${u.id}')">Edit</button>
        <button class="btn btn-danger" onclick="deleteUser('${u.id}')">Delete</button>
      </div>
    </div>
  `).join('');
}

function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function renderDateCard(date: DateOption, rehearsal: Rehearsal, isSelected: boolean): string {
  const maxVotes = getMaxVotes(rehearsal);
  const votePercent = maxVotes > 0 ? (date.votes.length / maxVotes) * 100 : 0;
  const userVote = date.votes.find(v => v.userId === currentUser?.id);
  const hasVoted = !!userVote;

  return `
    <div class="date-card ${isSelected ? 'selected' : ''}" data-date-id="${date.id}">
      <div class="date-info">
        <div class="date-datetime">${formatDateTime(date.datetime)}</div>
        <div class="date-location">${escapeHtml(date.location)}</div>
        ${isSelected ? '<span class="selected-badge" style="margin-top: 0.5rem; display: inline-block;">✓ Selected</span>' : ''}
      </div>
      <div class="date-votes">
        <span class="vote-count">${date.votes.length}</span>
        <span class="vote-label">vote${date.votes.length !== 1 ? 's' : ''}</span>
        <div class="vote-bar">
          <div class="vote-bar-fill" style="width: ${votePercent}%"></div>
        </div>
        ${hasVoted ? '<span style="color: var(--success); font-size: 0.75rem;">You voted</span>' : ''}
        ${currentUser?.role === 'admin' && date.votes.length > 0 ? `
          <div style="margin-top: 0.5rem; font-size: 0.7rem; color: var(--text-secondary);">
            Voted by: ${date.votes.map(v => escapeHtml(v.userName || v.userId)).join(', ')}
          </div>
        ` : ''}
      </div>
      ${date.votes.filter(v => v.comment && v.comment.trim()).length > 0 ? `
        <div class="date-comments">
          <div class="comments-toggle" onclick="toggleComments('${date.id}')">
            ▼ Show ${date.votes.filter(v => v.comment && v.comment.trim()).length} comment${date.votes.filter(v => v.comment && v.comment.trim()).length !== 1 ? 's' : ''}
          </div>
          <div id="comments-${date.id}" class="hidden">
            ${date.votes.filter(v => v.comment && v.comment.trim()).map(v => `
              <div class="comment">
                <div class="comment-user">${escapeHtml(v.userName || v.userId)}</div>
                <div class="comment-text">${escapeHtml(v.comment)}</div>
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}
      <button class="btn btn-primary" style="margin-top: 1rem;" onclick="event.stopPropagation(); showVoteModal('${rehearsal.id}', '${date.id}')">
        ${hasVoted ? 'Change Vote' : 'Vote'}
      </button>
      ${currentUser?.role === 'admin' ? `
        <div class="admin-actions">
          ${!isSelected ? `
            <button class="btn btn-success" onclick="event.stopPropagation(); selectDate('${rehearsal.id}', '${date.id}')">
              Select as Winner
            </button>
          ` : ''}
        </div>
      ` : ''}
    </div>
  `;
}

(window as any).toggleComments = function(dateId: string): void {
  const el = $(`#comments-${dateId}`);
  if (el) {
    el.classList.toggle('hidden');
  }
};

function showRehearsalDetail(id: string): void {
  const rehearsal = rehearsals.find(r => r.id === id);
  if (!rehearsal) return;

  const content = `
    <button class="back-btn" onclick="loadRehearsals(); hideModal();">← Back</button>
    <h2>${escapeHtml(rehearsal.title)}</h2>
    <p style="color: var(--text-secondary); margin-bottom: 1.5rem;">${escapeHtml(rehearsal.description)}</p>
    <div class="dates-list">
      ${rehearsal.dates.map(d => renderDateCard(d, rehearsal, d.id === rehearsal.selectedDateId)).join('')}
    </div>
    ${currentUser?.role === 'admin' ? `
      <div class="admin-actions" style="margin-top: 1.5rem;">
        <button class="btn btn-primary" onclick="showEditRehearsal('${rehearsal.id}')">Edit</button>
        <button class="btn btn-danger" onclick="deleteRehearsal('${rehearsal.id}')">Delete</button>
      </div>
    ` : ''}
  `;

  showModal(content);
}

(window as any).showVoteModal = async function(rehearsalId: string, dateId: string): Promise<void> {
  const rehearsal = rehearsals.find(r => r.id === rehearsalId);
  const date = rehearsal?.dates.find(d => d.id === dateId);
  if (!rehearsal || !date || !currentUser) return;

  const existingVote = date.votes.find(v => v.userId === currentUser!.id);

  const content = `
    <h2>Vote for Date</h2>
    <div class="vote-modal">
      <div class="date-display">${formatDateTime(date.datetime)}</div>
      <div class="form-group">
        <label>Your Name</label>
        <input type="text" id="voteName" value="${currentUser.username}" disabled>
      </div>
      <div class="form-group">
        <label>Comment (optional)</label>
        <textarea id="voteComment" placeholder="Add a comment...">${existingVote?.comment || ''}</textarea>
      </div>
      <div class="form-actions">
        <button class="btn btn-secondary" onclick="hideModal()">Cancel</button>
        <button class="btn btn-primary" onclick="submitVote('${rehearsalId}', '${dateId}')">Submit Vote</button>
      </div>
    </div>
  `;

  showModal(content);
};

(window as any).submitVote = async function(rehearsalId: string, dateId: string): Promise<void> {
  const comment = ($('#voteComment') as HTMLTextAreaElement)?.value || '';

  try {
    const res = await fetch(`${API_BASE}/rehearsals/${rehearsalId}/dates/${dateId}/vote`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders()
      },
      body: JSON.stringify({ userId: currentUser?.id, userName: currentUser?.username, comment })
    });
    if (!res.ok) {
      const err = await res.json();
      alert(err.error || 'Failed to vote');
      return;
    }
    await loadRehearsals();
    hideModal();
    showRehearsalDetail(rehearsalId);
  } catch (err) {
    console.error('Failed to vote:', err);
    alert('Failed to submit vote');
  }
};

(window as any).selectDate = async function(rehearsalId: string, dateId: string): Promise<void> {
  try {
    const res = await fetch(`${API_BASE}/${rehearsalId}/select-date`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders()
      },
      body: JSON.stringify({ dateId })
    });
    if (!res.ok) {
      const err = await res.json();
      alert(err.error || 'Failed to select date');
      return;
    }
    await loadRehearsals();
    showRehearsalDetail(rehearsalId);
  } catch (err) {
    console.error('Failed to select date:', err);
  }
};

(window as any).showEditRehearsal = function(id: string): void {
  const rehearsal = rehearsals.find(r => r.id === id);
  if (!rehearsal) return;

  hideModal();
  showRehearsalForm(rehearsal);
};

(window as any).deleteRehearsal = async function(id: string): Promise<void> {
  if (!confirm('Are you sure you want to delete this rehearsal?')) return;

  try {
    const res = await fetch(`${API_BASE}/rehearsals/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    if (!res.ok) {
      const err = await res.json();
      alert(err.error || 'Failed to delete');
      return;
    }
    await loadRehearsals();
    hideModal();
  } catch (err) {
    console.error('Failed to delete:', err);
  }
};

(window as any).editUser = function(id: string): void {
  const user = users.find(u => u.id === id);
  if (!user) return;

  showUserForm(user);
};

(window as any).deleteUser = async function(id: string): Promise<void> {
  if (!confirm('Are you sure you want to delete this user?')) return;

  try {
    const res = await fetch(`${API_BASE}/users/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    if (!res.ok) {
      const err = await res.json();
      alert(err.error || 'Failed to delete user');
      return;
    }
    await loadUsers();
  } catch (err) {
    console.error('Failed to delete user:', err);
  }
};

function showRehearsalForm(rehearsal?: Rehearsal): void {
  const isEdit = !!rehearsal;
  const defaultDate = new Date();
  defaultDate.setHours(defaultDate.getHours() + 24);
  defaultDate.setMinutes(0);
  const defaultDateStr = defaultDate.toISOString().slice(0, 16);

  const datesHtml = (rehearsal?.dates || [{ id: '', datetime: defaultDateStr, location: '', votes: [] }]).map((d, i) => `
    <div class="date-input-row">
      <input type="datetime-local" class="date-input" value="${d.datetime ? d.datetime.slice(0, 16) : defaultDateStr}" data-index="${i}">
      <input type="text" class="location-input" placeholder="Location" value="${escapeHtml(d.location || '')}" data-index="${i}">
      ${i > 0 ? `<button type="button" onclick="this.parentElement.remove()">✕</button>` : ''}
    </div>
  `).join('');

  const content = `
    <h2>${isEdit ? 'Edit Rehearsal' : 'New Rehearsal'}</h2>
    <form id="rehearsalForm">
      <div class="form-group">
        <label>Title</label>
        <input type="text" id="titleInput" value="${rehearsal ? escapeHtml(rehearsal.title) : ''}" required>
      </div>
      <div class="form-group">
        <label>Description</label>
        <textarea id="descInput">${rehearsal ? escapeHtml(rehearsal.description) : ''}</textarea>
      </div>
      <div class="form-group">
        <label>Date Options</label>
        <div class="date-inputs" id="dateInputs">
          ${datesHtml}
        </div>
        <button type="button" class="add-date-btn" onclick="addDateInput()">+ Add Another Date</button>
      </div>
      <div class="form-actions">
        <button type="button" class="btn btn-secondary" onclick="hideModal()">Cancel</button>
        <button type="submit" class="btn btn-primary">${isEdit ? 'Save' : 'Create'}</button>
      </div>
    </form>
  `;

  showModal(content);

  const form = $('#rehearsalForm');
  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    await saveRehearsal(rehearsal?.id);
  });
}

function showUserForm(user?: User): void {
  const isEdit = !!user;

  const content = `
    <h2>${isEdit ? 'Edit User' : 'Create User'}</h2>
    <form id="userForm">
      <div class="form-group">
        <label>Username</label>
        <input type="text" id="userUsername" value="${user ? escapeHtml(user.username) : ''}" required>
      </div>
      ${!isEdit ? `
        <div class="form-group">
          <label>Password</label>
          <input type="password" id="userPassword" required>
          <small class="password-hint">Min 12 chars, with uppercase, lowercase, number & special char (!@#$%^&*)</small>
        </div>
      ` : ''}
      <div class="form-group">
        <label>Role</label>
        <select id="userRole" style="width: 100%; padding: 0.75rem 1rem; border: 1px solid var(--border); border-radius: 8px; background: var(--surface-elevated); color: var(--text); font-family: inherit;">
          <option value="user" ${user?.role === 'user' ? 'selected' : ''}>User</option>
          <option value="admin" ${user?.role === 'admin' ? 'selected' : ''}>Admin</option>
        </select>
      </div>
      <div class="form-actions">
        <button type="button" class="btn btn-secondary" onclick="hideModal()">Cancel</button>
        <button type="submit" class="btn btn-primary">${isEdit ? 'Save' : 'Create'}</button>
      </div>
    </form>
  `;

  showModal(content);

  const form = $('#userForm');
  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    await saveUser(user?.id);
  });
}

(window as any).addDateInput = function(): void {
  const container = $('#dateInputs');
  if (!container) return;

  const defaultDate = new Date();
  defaultDate.setHours(defaultDate.getHours() + 24);
  defaultDate.setMinutes(0);

  const index = container.children.length;
  const row = document.createElement('div');
  row.className = 'date-input-row';
  row.innerHTML = `
    <input type="datetime-local" class="date-input" value="${defaultDate.toISOString().slice(0, 16)}" data-index="${index}">
    <input type="text" class="location-input" placeholder="Location" value="" data-index="${index}">
    <button type="button" onclick="this.parentElement.remove()">✕</button>
  `;
  container.appendChild(row);
};

async function saveRehearsal(id?: string): Promise<void> {
  const title = ($('#titleInput') as HTMLInputElement)?.value;
  const description = ($('#descInput') as HTMLTextAreaElement)?.value;
  const dateInputs = $$('.date-input');
  const locationInputs = $$('.location-input');

  const dates: { datetime: string; location: string }[] = [];
  dateInputs.forEach((input, i) => {
    const locInput = locationInputs[i] as HTMLInputElement | undefined;
    const dateInput = input as HTMLInputElement;
    if (dateInput.value) {
      dates.push({
        datetime: new Date(dateInput.value).toISOString(),
        location: locInput?.value || ''
      });
    }
  });

  if (dates.length === 0) {
    alert('Please add at least one date');
    return;
  }

  const url = id ? `${API_BASE}/rehearsals/${id}` : `${API_BASE}/rehearsals`;
  const method = id ? 'PUT' : 'POST';

  const body: any = { title, description, dates };
  if (id) {
    const existing = rehearsals.find(r => r.id === id);
    if (existing) {
      body.dates = dates.map((newDate, i) => {
        const existingDate = existing.dates[i];
        if (existingDate) {
          return { ...existingDate, datetime: newDate.datetime, location: newDate.location };
        }
        return { id: uuid(), datetime: newDate.datetime, location: newDate.location, votes: [] };
      });
    }
  }

  try {
    const res = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders()
      },
      body: JSON.stringify(body)
    });
    if (!res.ok) {
      const errText = await res.text();
      console.error('Server error:', res.status, errText);
      alert('Failed to save: ' + errText);
      return;
    }
    await loadRehearsals();
    hideModal();
  } catch (err) {
    console.error('Failed to save:', err);
    alert('Failed to save rehearsal');
  }
}

async function saveUser(id?: string): Promise<void> {
  const username = ($('#userUsername') as HTMLInputElement)?.value;
  const role = ($('#userRole') as HTMLSelectElement)?.value as 'admin' | 'user';
  const password = ($('#userPassword') as HTMLInputElement)?.value;

  if (!id && !password) {
    alert('Password is required for new users');
    return;
  }

  const url = id ? `${API_BASE}/users/${id}` : `${API_BASE}/users`;
  const method = id ? 'PUT' : 'POST';

  const body: any = { username, role };
  if (password) {
    body.password = password;
  }

  try {
    const res = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders()
      },
      body: JSON.stringify(body)
    });
    if (!res.ok) {
      const err = await res.json();
      alert(err.error || 'Failed to save user');
      return;
    }
    await loadUsers();
    hideModal();
  } catch (err) {
    console.error('Failed to save user:', err);
    alert('Failed to save user');
  }
}

function uuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

function showSetupForm(): void {
  const sections = ['setupSection', 'loginSection', 'rehearsalsSection', 'usersSection'];
  sections.forEach(s => $(`#${s}`)?.classList.add('hidden'));
  $('#setupSection')?.classList.remove('hidden');
}

function showLoginForm(): void {
  const sections = ['setupSection', 'loginSection', 'rehearsalsSection', 'usersSection'];
  sections.forEach(s => $(`#${s}`)?.classList.add('hidden'));
  $('#loginSection')?.classList.remove('hidden');
}

function showRehearsals(): void {
  const sections = ['setupSection', 'loginSection', 'rehearsalsSection', 'usersSection'];
  sections.forEach(s => $(`#${s}`)?.classList.add('hidden'));
  $('#rehearsalsSection')?.classList.remove('hidden');
}

function showUsers(): void {
  const sections = ['setupSection', 'loginSection', 'rehearsalsSection', 'usersSection'];
  sections.forEach(s => $(`#${s}`)?.classList.add('hidden'));
  $('#usersSection')?.classList.remove('hidden');
  loadUsers();
}

function updateUIForUser(): void {
  const profileBtn = $('#profileBtn');
  const logoutBtn = $('#logoutBtn');
  const createRehearsalBtn = $('#createRehearsalBtn');
  const manageUsersBtn = $('#manageUsersBtn');
  const createUserBtn = $('#createUserBtn');

  if (currentUser) {
    profileBtn?.classList.remove('hidden');
    logoutBtn?.classList.remove('hidden');

    if (currentUser.role === 'admin') {
      createRehearsalBtn?.classList.remove('hidden');
      manageUsersBtn?.classList.remove('hidden');
      createUserBtn?.classList.remove('hidden');
    } else {
      createRehearsalBtn?.classList.add('hidden');
      manageUsersBtn?.classList.add('hidden');
      createUserBtn?.classList.add('hidden');
    }
  } else {
    profileBtn?.classList.add('hidden');
    logoutBtn?.classList.add('hidden');
    createRehearsalBtn?.classList.add('hidden');
    manageUsersBtn?.classList.add('hidden');
    createUserBtn?.classList.add('hidden');
  }
}

function showProfileModal(): void {
  if (!currentUser) return;

  const content = `
    <h2>Profile</h2>
    <form id="profileForm">
      <div class="form-group">
        <label>Username</label>
        <input type="text" id="profileUsername" value="${escapeHtml(currentUser.username)}" required>
      </div>
      <div class="form-group">
        <label>Current Password</label>
        <input type="password" id="profileCurrentPassword" required>
      </div>
      <div class="form-group">
        <label>New Password (leave empty to keep current)</label>
        <input type="password" id="profileNewPassword">
        <small class="password-hint">Min 12 chars, with uppercase, lowercase, number & special char (!@#$%^&*)</small>
      </div>
      <div class="form-actions">
        <button type="button" class="btn btn-secondary" onclick="hideModal()">Cancel</button>
        <button type="submit" class="btn btn-primary">Save</button>
      </div>
    </form>
  `;

  showModal(content);

  const form = $('#profileForm');
  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    await updateProfile();
  });
}

async function updateProfile(): Promise<void> {
  const username = ($('#profileUsername') as HTMLInputElement)?.value;
  const currentPassword = ($('#profileCurrentPassword') as HTMLInputElement)?.value;
  const newPassword = ($('#profileNewPassword') as HTMLInputElement)?.value;

  try {
    const res = await fetch(`${API_BASE}/profile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders()
      },
      body: JSON.stringify({ username, currentPassword, password: newPassword || undefined })
    });
    if (!res.ok) {
      const err = await res.json();
      alert(err.error || 'Failed to update profile');
      return;
    }
    const data = await res.json();
    currentUser = data;
    alert('Profile updated successfully');
    hideModal();
  } catch (err) {
    console.error('Failed to update profile:', err);
    alert('Failed to update profile');
  }
}

function init(): void {
  token = localStorage.getItem('token') || '';

  const setupForm = $('#setupForm');
  setupForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = ($('#setupUsername') as HTMLInputElement)?.value;
    const password = ($('#setupPassword') as HTMLInputElement)?.value;
    const confirmPassword = ($('#setupPasswordConfirm') as HTMLInputElement)?.value;

    if (password !== confirmPassword) {
      alert('Passwords do not match');
      return;
    }

    const success = await setup(username, password);
    if (success) {
      showRehearsals();
      updateUIForUser();
    }
  });

  const loginForm = $('#loginForm');
  loginForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = ($('#loginUsername') as HTMLInputElement)?.value;
    const password = ($('#loginPassword') as HTMLInputElement)?.value;

    const success = await login(username, password);
    if (success) {
      showRehearsals();
      updateUIForUser();
      loadRehearsals();
    }
  });

  const profileBtn = $('#profileBtn');
  profileBtn?.addEventListener('click', showProfileModal);

  const logoutBtn = $('#logoutBtn');
  logoutBtn?.addEventListener('click', logout);

  const createRehearsalBtn = $('#createRehearsalBtn');
  createRehearsalBtn?.addEventListener('click', () => showRehearsalForm());

  const manageUsersBtn = $('#manageUsersBtn');
  manageUsersBtn?.addEventListener('click', showUsers);

  const backToRehearsalsBtn = $('#backToRehearsalsBtn');
  backToRehearsalsBtn?.addEventListener('click', () => {
    showRehearsals();
    loadRehearsals();
  });

  const createUserBtn = $('#createUserBtn');
  createUserBtn?.addEventListener('click', () => showUserForm());

  const modal = $('#modal');
  modal?.querySelector('.modal-overlay')?.addEventListener('click', hideModal);
  modal?.querySelector('.modal-close')?.addEventListener('click', hideModal);

  checkSetupStatus().then(setupComplete => {
    if (!setupComplete) {
      showSetupForm();
    } else if (token) {
      fetch(`${API_BASE}/auth/me`, { headers: getAuthHeaders() })
        .then(res => {
          if (res.ok) {
            return res.json();
          }
          throw new Error('Invalid token');
        })
        .then(user => {
          currentUser = user;
          showRehearsals();
          updateUIForUser();
          loadRehearsals();
        })
        .catch(() => {
          localStorage.removeItem('token');
          token = '';
          showLoginForm();
        });
    } else {
      showLoginForm();
    }
  });
}

document.addEventListener('DOMContentLoaded', init);
