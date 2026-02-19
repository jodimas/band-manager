const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = 3001;
const DATA_FILE = path.join(__dirname, 'data.json');
const SECRET_KEY = 'rehersalplaner-secret-key-change-in-production';

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

function loadData() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const data = fs.readFileSync(DATA_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.error('Error loading data:', err);
  }
  return { setupComplete: false, users: [], rehearsals: [] };
}

function saveData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

function validatePassword(password) {
  if (password.length < 12) return 'Password must be at least 12 characters';
  if (!/[A-Z]/.test(password)) return 'Password must contain an uppercase letter';
  if (!/[a-z]/.test(password)) return 'Password must contain a lowercase letter';
  if (!/[0-9]/.test(password)) return 'Password must contain a number';
  if (!/[!@#$%^&*]/.test(password)) return 'Password must contain a special character (!@#$%^&*)';
  return null;
}

function hashPassword(password) {
  return bcrypt.hashSync(password, 10);
}

function comparePassword(password, hash) {
  return bcrypt.compareSync(password, hash);
}

function generateToken(user) {
  return jwt.sign({ id: user.id, username: user.username, role: user.role }, SECRET_KEY, { expiresIn: '24h' });
}

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const user = jwt.verify(token, SECRET_KEY);
    req.user = user;
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
}

function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

function getRehearsals(req, res) {
  const data = loadData();
  const enriched = data.rehearsals.map(r => ({
    ...r,
    dates: r.dates.map(d => ({
      ...d,
      votes: d.votes.map(v => {
        const user = data.users.find(u => u.id === v.userId);
        return { ...v, userName: v.userName || (user ? user.username : v.userId) };
      })
    }))
  }));
  res.json(enriched);
}

function getRehearsal(req, res) {
  const data = loadData();
  const rehearsal = data.rehearsals.find(r => r.id === req.params.id);
  if (!rehearsal) {
    return res.status(404).json({ error: 'Rehearsal not found' });
  }
  const enriched = {
    ...rehearsal,
    dates: rehearsal.dates.map(d => ({
      ...d,
      votes: d.votes.map(v => {
        const user = data.users.find(u => u.id === v.userId);
        return { ...v, userName: v.userName || (user ? user.username : v.userId) };
      })
    }))
  };
  res.json(enriched);
}

function createRehearsal(req, res) {
  const data = loadData();
  const { title, description, dates } = req.body;

  const rehearsal = {
    id: uuidv4(),
    title: title || 'Untitled Rehearsal',
    description: description || '',
    createdAt: new Date().toISOString(),
    dates: (dates || []).map(d => ({
      id: uuidv4(),
      datetime: d.datetime,
      location: d.location || '',
      votes: []
    })),
    selectedDateId: null
  };

  data.rehearsals.push(rehearsal);
  saveData(data);
  res.status(201).json(rehearsal);
}

function updateRehearsal(req, res) {
  const data = loadData();
  const index = data.rehearsals.findIndex(r => r.id === req.params.id);

  if (index === -1) {
    return res.status(404).json({ error: 'Rehearsal not found' });
  }

  const { title, description, dates } = req.body;
  const existing = data.rehearsals[index];

  const updated = {
    ...existing,
    title: title !== undefined ? title : existing.title,
    description: description !== undefined ? description : existing.description,
    dates: dates !== undefined ? dates.map(d => {
      if (d.id) return d;
      return { ...d, id: uuidv4(), votes: [] };
    }) : existing.dates
  };

  data.rehearsals[index] = updated;
  saveData(data);
  res.json(updated);
}

function deleteRehearsal(req, res) {
  const data = loadData();
  const index = data.rehearsals.findIndex(r => r.id === req.params.id);

  if (index === -1) {
    return res.status(404).json({ error: 'Rehearsal not found' });
  }

  data.rehearsals.splice(index, 1);
  saveData(data);
  res.status(204).send();
}

function selectDate(req, res) {
  const data = loadData();
  const rehearsal = data.rehearsals.find(r => r.id === req.params.id);

  if (!rehearsal) {
    return res.status(404).json({ error: 'Rehearsal not found' });
  }

  const { dateId } = req.body;
  rehearsal.selectedDateId = dateId || null;
  saveData(data);
  res.json(rehearsal);
}

function vote(req, res) {
  const data = loadData();
  const rehearsal = data.rehearsals.find(r => r.id === req.params.id);

  if (!rehearsal) {
    return res.status(404).json({ error: 'Rehearsal not found' });
  }

  const dateOption = rehearsal.dates.find(d => d.id === req.params.dateId);
  if (!dateOption) {
    return res.status(404).json({ error: 'Date option not found' });
  }

  const { userId, userName, comment } = req.body;

  const existingVoteIndex = dateOption.votes.findIndex(v => v.userId === userId);
  const voteData = {
    userId,
    userName: userName || '',
    comment: comment || '',
    createdAt: new Date().toISOString()
  };

  if (existingVoteIndex >= 0) {
    dateOption.votes[existingVoteIndex] = voteData;
  } else {
    dateOption.votes.push(voteData);
  }

  saveData(data);
  res.json(rehearsal);
}

function getSetupStatus(req, res) {
  const data = loadData();
  res.json({ setupComplete: data.setupComplete });
}

function setup(req, res) {
  const data = loadData();

  if (data.setupComplete) {
    return res.status(400).json({ error: 'Setup already complete' });
  }

  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }

  const passwordError = validatePassword(password);
  if (passwordError) {
    return res.status(400).json({ error: passwordError });
  }

  const user = {
    id: uuidv4(),
    username,
    passwordHash: hashPassword(password),
    role: 'admin',
    createdAt: new Date().toISOString()
  };

  data.users.push(user);
  data.setupComplete = true;
  saveData(data);

  const token = generateToken(user);
  const { passwordHash, ...userWithoutPassword } = user;
  res.status(201).json({ token, user: userWithoutPassword });
}

function login(req, res) {
  const data = loadData();
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }

  const user = data.users.find(u => u.username === username);
  if (!user || !comparePassword(password, user.passwordHash)) {
    return res.status(401).json({ error: 'Invalid username or password' });
  }

  const token = generateToken(user);
  const { passwordHash, ...userWithoutPassword } = user;
  res.json({ token, user: userWithoutPassword });
}

function getMe(req, res) {
  const data = loadData();
  const user = data.users.find(u => u.id === req.user.id);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  const { passwordHash, ...userWithoutPassword } = user;
  res.json(userWithoutPassword);
}

function getUsers(req, res) {
  const data = loadData();
  const users = data.users.map(u => {
    const { passwordHash, ...userWithoutPassword } = u;
    return userWithoutPassword;
  });
  res.json(users);
}

function createUser(req, res) {
  const data = loadData();
  const { username, password, role } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }

  if (data.users.some(u => u.username === username)) {
    return res.status(400).json({ error: 'Username already exists' });
  }

  const passwordError = validatePassword(password);
  if (passwordError) {
    return res.status(400).json({ error: passwordError });
  }

  const user = {
    id: uuidv4(),
    username,
    passwordHash: hashPassword(password),
    role: role === 'admin' ? 'admin' : 'user',
    createdAt: new Date().toISOString()
  };

  data.users.push(user);
  saveData(data);

  const { passwordHash: _, ...userWithoutPassword } = user;
  res.status(201).json(userWithoutPassword);
}

function updateUser(req, res) {
  const data = loadData();
  const index = data.users.findIndex(u => u.id === req.params.id);

  if (index === -1) {
    return res.status(404).json({ error: 'User not found' });
  }

  const { username, password, role } = req.body;
  const existing = data.users[index];

  if (username && username !== existing.username) {
    if (data.users.some(u => u.username === username && u.id !== existing.id)) {
      return res.status(400).json({ error: 'Username already exists' });
    }
    existing.username = username;
  }

  if (password) {
    const passwordError = validatePassword(password);
    if (passwordError) {
      return res.status(400).json({ error: passwordError });
    }
    existing.passwordHash = hashPassword(password);
  }

  if (role && (role === 'admin' || role === 'user')) {
    existing.role = role;
  }

  saveData(data);

  const { passwordHash, ...userWithoutPassword } = existing;
  res.json(userWithoutPassword);
}

function deleteUser(req, res) {
  const data = loadData();
  const index = data.users.findIndex(u => u.id === req.params.id);

  if (index === -1) {
    return res.status(404).json({ error: 'User not found' });
  }

  if (data.users[index].id === req.user.id) {
    return res.status(400).json({ error: 'Cannot delete your own account' });
  }

  data.users.splice(index, 1);
  saveData(data);
  res.status(204).send();
}

function updateProfile(req, res) {
  const data = loadData();
  const user = data.users.find(u => u.id === req.user.id);

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  const { username, password, currentPassword } = req.body;

  if (!currentPassword || !comparePassword(currentPassword, user.passwordHash)) {
    return res.status(400).json({ error: 'Current password is required and must be correct' });
  }

  if (username && username !== user.username) {
    if (data.users.some(u => u.username === username && u.id !== user.id)) {
      return res.status(400).json({ error: 'Username already exists' });
    }
    user.username = username;
  }

  if (password) {
    const passwordError = validatePassword(password);
    if (passwordError) {
      return res.status(400).json({ error: passwordError });
    }
    user.passwordHash = hashPassword(password);
  }

  saveData(data);

  const { passwordHash, ...userWithoutPassword } = user;
  res.json(userWithoutPassword);
}

app.get('/api/auth/status', getSetupStatus);
app.post('/api/auth/setup', setup);
app.post('/api/auth/login', login);
app.get('/api/auth/me', authenticateToken, getMe);
app.get('/api/users', authenticateToken, requireAdmin, getUsers);
app.post('/api/users', authenticateToken, requireAdmin, createUser);
app.put('/api/users/:id', authenticateToken, requireAdmin, updateUser);
app.delete('/api/users/:id', authenticateToken, requireAdmin, deleteUser);
app.put('/api/profile', authenticateToken, updateProfile);

app.get('/api/rehearsals', getRehearsals);
app.get('/api/rehearsals/:id', getRehearsal);
app.post('/api/rehearsals', authenticateToken, requireAdmin, createRehearsal);
app.put('/api/rehearsals/:id', authenticateToken, requireAdmin, updateRehearsal);
app.delete('/api/rehearsals/:id', authenticateToken, requireAdmin, deleteRehearsal);
app.post('/api/rehearsals/:id/select-date', authenticateToken, requireAdmin, selectDate);
app.post('/api/rehearsals/:id/dates/:dateId/vote', authenticateToken, vote);

app.listen(PORT, () => {
  console.log('Server running at http://localhost:' + PORT);
});
