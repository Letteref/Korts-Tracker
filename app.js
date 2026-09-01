/* ========================================
   Korts — No ref. No lies. Just Korts.
   Complete Application Logic
   ======================================== */

// ============================================================
// UTILITY FUNCTIONS
// ============================================================
const Utils = {
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
    },

    async hashPassword(str) {
        const encoder = new TextEncoder();
        const data = encoder.encode(str);
        const hash = await crypto.subtle.digest('SHA-256', data);
        return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
    },

    getInitials(name) {
        if (!name) return '??';
        return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
    },

    getAvatarColor(name) {
        const colors = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#a855f7', '#ec4899', '#14b8a6', '#f97316'];
        let hash = 0;
        for (let i = 0; i < (name || '').length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
        return colors[Math.abs(hash) % colors.length];
    },

    formatDate(dateStr) {
        const d = new Date(dateStr);
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    },

    formatDateTime(dateStr) {
        const d = new Date(dateStr);
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    },

    formatTime(seconds) {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s.toString().padStart(2, '0')}`;
    },

    debounce(fn, ms = 300) {
        let timer;
        return (...args) => {
            clearTimeout(timer);
            timer = setTimeout(() => fn(...args), ms);
        };
    },

    escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }
};

// ============================================================
// DATA STORE (localStorage wrapper)
// ============================================================
const Store = {
    _get(key, def = []) {
        try { return JSON.parse(localStorage.getItem(`st_${key}`)) || def; }
        catch { return def; }
    },
    _set(key, val) {
        localStorage.setItem(`st_${key}`, JSON.stringify(val));
    },
    _getSingle(key, def = null) {
        try { return JSON.parse(localStorage.getItem(`st_${key}`)) || def; }
        catch { return def; }
    },

    // Users
    getUsers() { return this._get('users', []); },
    saveUsers(users) { this._set('users', users); },
    findUser(username) { return this.getUsers().find(u => u.username === username); },
    findUserById(id) { return this.getUsers().find(u => u.id === id); },

    // Current session
    getCurrentUser() { return this._getSingle('currentUser'); },
    setCurrentUser(user) { this._set('currentUser', user); },
    clearCurrentUser() { localStorage.removeItem('st_currentUser'); },

    // Players
    getPlayers() { return this._get('players', []); },
    savePlayers(players) { this._set('players', players); },

    // Clubs
    getClubs() { return this._get('clubs', []); },
    saveClubs(clubs) { this._set('clubs', clubs); },

    // Match History
    getMatches() { return this._get('matches', []); },
    saveMatches(matches) { this._set('matches', matches); },

    // Tournament History
    getTournaments() { return this._get('tournaments', []); },
    saveTournaments(tournaments) { this._set('tournaments', tournaments); },

    // Group Sessions
    getGroupSessions() { return this._get('groupSessions', []); },
    saveGroupSessions(sessions) { this._set('groupSessions', sessions); },

    // Active tournament (for resume)
    getActiveTournament() { return this._getSingle('activeTournament'); },
    setActiveTournament(t) { this._set('activeTournament', t); },
    clearActiveTournament() { localStorage.removeItem('st_activeTournament'); },

    // Active group session
    getActiveGroupSession() { return this._getSingle('activeGroupSession'); },
    setActiveGroupSession(s) { this._set('activeGroupSession', s); },
    clearActiveGroupSession() { localStorage.removeItem('st_activeGroupSession'); },

    // Export all data
    exportAll() {
        const data = {};
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key.startsWith('st_')) {
                data[key] = JSON.parse(localStorage.getItem(key));
            }
        }
        return data;
    },

    importAll(data) {
        for (const [key, val] of Object.entries(data)) {
            if (key.startsWith('st_')) {
                localStorage.setItem(key, JSON.stringify(val));
            }
        }
    }
};

// ============================================================
// AUTH MODULE
// ============================================================
const Auth = {
    currentUser: null,

    async init() {
        this.currentUser = Store.getCurrentUser();
        return this.currentUser;
    },

    async register(username, password, displayName, email) {
        const users = Store.getUsers();
        if (users.find(u => u.username.toLowerCase() === username.toLowerCase())) {
            throw new Error('Username already exists');
        }
        const hashed = await Utils.hashPassword(password);
        const user = {
            id: Utils.generateId(),
            username,
            password: hashed,
            displayName,
            email: email || '',
            role: users.length === 0 ? 'admin' : 'member', // First user is admin
            active: true,
            createdAt: new Date().toISOString()
        };
        users.push(user);
        Store.saveUsers(users);
        this.currentUser = user;
        Store.setCurrentUser(user);
        return user;
    },

    async login(username, password) {
        const user = Store.findUser(username);
        if (!user) throw new Error('User not found');
        if (!user.active) throw new Error('Account is deactivated');
        const hashed = await Utils.hashPassword(password);
        if (user.password !== hashed) throw new Error('Invalid password');
        this.currentUser = user;
        Store.setCurrentUser(user);
        return user;
    },

    logout() {
        this.currentUser = null;
        Store.clearCurrentUser();
    },

    isAdmin() {
        return this.currentUser && this.currentUser.role === 'admin';
    },

    updateRole(userId, role) {
        const users = Store.getUsers();
        const user = users.find(u => u.id === userId);
        if (user) {
            user.role = role;
            Store.saveUsers(users);
            if (this.currentUser && this.currentUser.id === userId) {
                this.currentUser = user;
                Store.setCurrentUser(user);
            }
        }
    },

    toggleActive(userId) {
        const users = Store.getUsers();
        const user = users.find(u => u.id === userId);
        if (user) {
            user.active = !user.active;
            Store.saveUsers(users);
        }
    },

    updateProfile(data) {
        const users = Store.getUsers();
        const user = users.find(u => u.id === this.currentUser.id);
        if (user) {
            Object.assign(user, data);
            Store.saveUsers(users);
            this.currentUser = user;
            Store.setCurrentUser(user);
        }
    },

    initDefaultPlayers() {
        if (Store.getPlayers().length === 0) {
            const defaults = ['Player 1', 'Player 2', 'Player 3', 'Player 4'].map(name => ({
                id: Utils.generateId(),
                name,
                skill: 'intermediate',
                notes: '',
                createdAt: new Date().toISOString()
            }));
            Store.savePlayers(defaults);
        }
    }
};

// ============================================================
// ROUTER
// ============================================================
const Router = {
    currentScreen: 'auth',
    history: [],

    init() {
        window.addEventListener('hashchange', () => this.handleRoute());
        this.handleRoute();
    },

    navigate(screen, opts = {}) {
        if (this.currentScreen) this.history.push(this.currentScreen);
        this.showScreen(screen, opts);
    },

    back() {
        const prev = this.history.pop() || 'dashboard';
        this.showScreen(prev);
    },

    showScreen(screen, opts = {}) {
        // Hide all screens
        document.querySelectorAll('.main-screen').forEach(s => s.classList.add('hidden'));
        document.getElementById('screen-auth').classList.add('hidden');

        // Show target
        const el = document.getElementById(`screen-${screen}`);
        if (el) {
            el.classList.remove('hidden');
            this.currentScreen = screen;
        }

        // Auth vs app container
        if (screen === 'auth') {
            document.getElementById('app-container').classList.add('hidden');
        } else {
            document.getElementById('app-container').classList.remove('hidden');
        }

        // Update bottom nav
        document.querySelectorAll('.nav-item').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.nav === screen);
        });

        // Render screen content
        if (opts.render !== false) {
            this.renderScreen(screen, opts);
        }
    },

    renderScreen(screen, opts) {
        switch (screen) {
            case 'dashboard': UI.renderDashboard(); break;
            case 'admin': UI.renderAdminDashboard(); break;
            case 'players': UI.renderPlayers(); break;
            case 'match-setup': UI.renderMatchSetup(); break;
            case 'match': UI.renderMatch(); break;
            case 'tournament-setup': UI.renderTournamentSetup(); break;
            case 'tournament': UI.renderTournamentBracket(); break;
            case 'group-setup': UI.renderGroupSetup(); break;
            case 'group': UI.renderGroupPlay(); break;
            case 'clubs': UI.renderClubs(); break;
            case 'club-detail': UI.renderClubDetail(opts.clubId); break;
            case 'history': UI.renderHistory(); break;
            case 'profile': UI.renderProfile(); break;
        }
    },

    handleRoute() {
        const hash = window.location.hash.slice(1) || '/';
        if (hash === '/admin') {
            if (Auth.isAdmin()) {
                this.showScreen('admin');
            } else {
                this.showScreen('dashboard');
                Toast.show('Access denied — admin only', 'error');
            }
        }
    }
};

// ============================================================
// TOAST NOTIFICATIONS
// ============================================================
const Toast = {
    show(message, type = 'info', duration = 3000) {
        const container = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        container.appendChild(toast);
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(100%)';
            toast.style.transition = '0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }, duration);
    }
};

// ============================================================
// CONFIRM DIALOG
// ============================================================
const Confirm = {
    show(title, message, onConfirm, danger = false) {
        const modal = document.getElementById('confirm-modal');
        document.getElementById('confirm-title').textContent = title;
        document.getElementById('confirm-message').textContent = message;
        modal.classList.remove('hidden');

        const okBtn = document.getElementById('confirm-ok');
        okBtn.textContent = 'Confirm';
        okBtn.className = danger ? 'btn btn-danger' : 'btn btn-primary';

        const handler = () => {
            modal.classList.add('hidden');
            okBtn.removeEventListener('click', handler);
            document.getElementById('confirm-cancel').removeEventListener('click', cancelHandler);
            onConfirm();
        };

        const cancelHandler = () => {
            modal.classList.add('hidden');
            okBtn.removeEventListener('click', handler);
            document.getElementById('confirm-cancel').removeEventListener('click', cancelHandler);
        };

        okBtn.addEventListener('click', handler);
        document.getElementById('confirm-cancel').addEventListener('click', cancelHandler);
    }
};

// ============================================================
// SCORING ENGINE
// ============================================================
const Scoring = {
    POINTS: ['0', '15', '30', '40'],
    TIEBREAK_POINTS: ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10'],

    createMatchState(config) {
        const maxSets = config.bestOf === 5 ? 3 : 2;
        return {
            sport: config.sport || 'tennis',
            mode: config.mode || 'singles',
            bestOf: config.bestOf || 3,
            maxSetsToWin: maxSets,
            players: config.players, // [{id, name, ...}, {id, name, ...}]
            teams: config.teams || null, // for doubles: [[p1,p2], [p3,p4]]
            sets: [{ p1: 0, p2: 0 }],
            currentSet: 0,
            games: { p1: 0, p2: 0 },
            points: { p1: 0, p2: 0 }, // 0=love,1=15,2=30,3=40
            deuce: false,
            advantage: null, // null, 'p1', 'p2'
            tiebreak: false,
            tiebreakPoints: { p1: 0, p2: 0 },
            serving: config.firstServer || 'p1', // 'p1' or 'p2'
            setsWon: { p1: 0, p2: 0 },
            matchWinner: null,
            stats: {
                pointsWon: { p1: 0, p2: 0 },
                gamesWon: { p1: 0, p2: 0 },
                aces: { p1: 0, p2: 0 },
                breakPoints: { p1: 0, p2: 0 },
                longestGame: 0,
                currentGamePoints: 0
            },
            undoStack: [],
            startTime: Date.now()
        };
    },

    saveStateForUndo(state) {
        state.undoStack.push(JSON.parse(JSON.stringify({
            sets: state.sets,
            currentSet: state.currentSet,
            games: { ...state.games },
            points: { ...state.points },
            deuce: state.deuce,
            advantage: state.advantage,
            tiebreak: state.tiebreak,
            tiebreakPoints: { ...state.tiebreakPoints },
            serving: state.serving,
            setsWon: { ...state.setsWon },
            stats: JSON.parse(JSON.stringify(state.stats))
        })));
        // Keep max 50 undo states
        if (state.undoStack.length > 50) state.undoStack.shift();
    },

    undo(state) {
        if (state.undoStack.length === 0) return false;
        const prev = state.undoStack.pop();
        Object.assign(state, prev);
        return true;
    },

    awardPoint(state, player) {
        this.saveStateForUndo(state);

        const other = player === 'p1' ? 'p2' : 'p1';
        state.stats.pointsWon[player]++;
        state.stats.currentGamePoints++;
        state.stats.longestGame = Math.max(state.stats.longestGame, state.stats.currentGamePoints);

        // Tiebreak scoring
        if (state.tiebreak) {
            state.tiebreakPoints[player]++;
            const tp = state.tiebreakPoints;
            if (tp[player] >= 7 && tp[player] - tp[other] >= 2) {
                return this.winTiebreak(state, player);
            }
            // Switch serve every 2 points (except first two)
            const total = tp.p1 + tp.p2;
            if (total > 1 && total % 2 === 1) {
                state.serving = state.serving === 'p1' ? 'p2' : 'p1';
            }
            return { type: 'point' };
        }

        // Deuce/Advantage logic
        if (state.deuce) {
            if (state.advantage === player) {
                return this.winGame(state, player);
            } else if (state.advantage === other) {
                state.advantage = null; // Back to deuce
                return { type: 'point' };
            } else {
                state.advantage = player;
                return { type: 'point' };
            }
        }

        // Regular point progression
        if (state.points[player] < 3) {
            state.points[player]++;
        } else if (state.points[player] === 3) {
            if (state.points[other] < 3) {
                return this.winGame(state, player);
            } else {
                // Both at 40 = Deuce
                state.deuce = true;
                return { type: 'point' };
            }
        }

        return { type: 'point' };
    },

    winGame(state, player) {
        const other = player === 'p1' ? 'p2' : 'p1';
        state.games[player]++;
        state.stats.gamesWon[player]++;
        state.stats.currentGamePoints = 0;

        // Check for break point
        if (state.serving === other) {
            state.stats.breakPoints[player]++;
        }

        // Check if set is won
        const g = state.games;
        if (g[player] >= 6 && g[player] - g[other] >= 2) {
            return this.winSet(state, player);
        }

        // Check for tiebreak at 6-6
        if (g.p1 === 6 && g.p2 === 6) {
            state.tiebreak = true;
            state.tiebreakPoints = { p1: 0, p2: 0 };
            return { type: 'tiebreak' };
        }

        // Reset points for next game
        state.points = { p1: 0, p2: 0 };
        state.deuce = false;
        state.advantage = null;
        state.serving = state.serving === 'p1' ? 'p2' : 'p1';

        return { type: 'game', player };
    },

    winTiebreak(state, player) {
        state.sets[state.currentSet][player === 'p1' ? 'p1' : 'p2'] = state.tiebreakPoints[player];
        return this.winSet(state, player);
    },

    winSet(state, player) {
        const other = player === 'p1' ? 'p2' : 'p1';

        // Finalize current set score
        if (state.tiebreak) {
            state.sets[state.currentSet][player] = 7;
        } else {
            state.sets[state.currentSet][player === 'p1' ? 'p1' : 'p2'] = state.games[player];
            state.sets[state.currentSet][other] = state.games[other];
        }

        state.setsWon[player]++;

        // Check if match is won
        if (state.setsWon[player] >= state.maxSetsToWin) {
            state.matchWinner = player;
            return { type: 'match', winner: player };
        }

        // Start new set
        state.currentSet++;
        state.sets.push({ p1: 0, p2: 0 });
        state.games = { p1: 0, p2: 0 };
        state.points = { p1: 0, p2: 0 };
        state.deuce = false;
        state.advantage = null;
        state.tiebreak = false;
        state.tiebreakPoints = { p1: 0, p2: 0 };
        state.serving = state.serving === 'p1' ? 'p2' : 'p1';

        return { type: 'set', player };
    },

    getScoreDisplay(state) {
        const pointLabels = ['0', '15', '30', '40'];

        if (state.matchWinner) {
            return { p1Point: '', p2Point: '', p1Game: '', p2Game: '' };
        }

        let p1Point, p2Point;
        if (state.tiebreak) {
            p1Point = state.tiebreakPoints.p1.toString();
            p2Point = state.tiebreakPoints.p2.toString();
        } else if (state.deuce) {
            p1Point = state.advantage === 'p1' ? 'AD' : (state.advantage === 'p2' ? '40' : '40');
            p2Point = state.advantage === 'p2' ? 'AD' : (state.advantage === 'p1' ? '40' : '40');
            if (!state.advantage) {
                p1Point = 'DUECE';
                p2Point = 'DUECE';
            }
        } else {
            p1Point = pointLabels[state.points.p1];
            p2Point = pointLabels[state.points.p2];
        }

        return {
            p1Point, p2Point,
            p1Game: state.games.p1.toString(),
            p2Game: state.games.p2.toString()
        };
    },

    getSetsDisplay(state) {
        return state.sets.map(s => ({
            p1: s.p1 || '',
            p2: s.p2 || ''
        }));
    }
};

// ============================================================
// MATCH MANAGER
// ============================================================
const MatchManager = {
    currentState: null,
    timerInterval: null,
    elapsedSeconds: 0,

    startMatch(config) {
        this.currentState = Scoring.createMatchState(config);
        this.elapsedSeconds = 0;
        this.startTimer();
        Router.navigate('match');
    },

    startTimer() {
        this.timerInterval = setInterval(() => {
            this.elapsedSeconds++;
            const el = document.getElementById('match-timer-display');
            if (el) el.textContent = Utils.formatTime(this.elapsedSeconds);
        }, 1000);
    },

    stopTimer() {
        clearInterval(this.timerInterval);
    },

    awardPoint(player) {
        if (!this.currentState || this.currentState.matchWinner) return;
        const result = Scoring.awardPoint(this.currentState, player);
        UI.renderMatch();

        if (result.type === 'match') {
            this.completeMatch();
        }
    },

    undo() {
        if (!this.currentState) return;
        if (Scoring.undo(this.currentState)) {
            UI.renderMatch();
            Toast.show('Point undone', 'info');
        }
    },

    ace(player) {
        if (!this.currentState) return;
        this.currentState.stats.aces[player]++;
        this.awardPoint(player);
    },

    retire(player) {
        if (!this.currentState) return;
        const other = player === 'p1' ? 'p2' : 'p1';
        this.currentState.matchWinner = other;
        this.completeMatch();
    },

    completeMatch() {
        this.stopTimer();
        const state = this.currentState;

        const matchRecord = {
            id: Utils.generateId(),
            sport: state.sport,
            mode: state.mode,
            players: state.players.map(p => ({ id: p.id, name: p.name })),
            sets: state.sets,
            setsWon: state.setsWon,
            winner: state.matchWinner,
            winnerName: state.players[state.matchWinner === 'p1' ? 0 : 1].name,
            stats: JSON.parse(JSON.stringify(state.stats)),
            duration: this.elapsedSeconds,
            timestamp: new Date().toISOString(),
            userId: Auth.currentUser?.id
        };

        const matches = Store.getMatches();
        matches.unshift(matchRecord);
        Store.saveMatches(matches);

        // Update player stats
        this.updatePlayerStats(matchRecord);

        UI.showMatchComplete(matchRecord);
    },

    updatePlayerStats(match) {
        // We track stats per player in the player record
        // This is cumulative across matches
    },

    cleanup() {
        this.stopTimer();
        this.currentState = null;
        this.elapsedSeconds = 0;
    }
};

// ============================================================
// TOURNAMENT ENGINE
// ============================================================
const Tournament = {
    current: null,

    generateBracket(config) {
        let players = [...config.players];
        // Shuffle players
        for (let i = players.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [players[i], players[j]] = [players[j], players[i]];
        }

        // Calculate bracket size (next power of 2)
        let size = 2;
        while (size < players.length) size *= 2;
        const byes = size - players.length;

        // Create first round matches
        const matches = [];
        const rounds = Math.log2(size);
        const firstRoundMatches = size / 2;

        // Pad with byes
        const paddedPlayers = [...players];
        while (paddedPlayers.length < size) paddedPlayers.push(null);

        for (let i = 0; i < firstRoundMatches; i++) {
            const p1 = paddedPlayers[i * 2];
            const p2 = paddedPlayers[i * 2 + 1];

            if (!p1 || !p2) {
                // Bye
                matches.push({
                    id: Utils.generateId(),
                    round: 0,
                    position: i,
                    player1: p1 || p2,
                    player2: null,
                    winner: p1 || p2,
                    completed: true,
                    isBye: true
                });
            } else {
                matches.push({
                    id: Utils.generateId(),
                    round: 0,
                    position: i,
                    player1: p1,
                    player2: p2,
                    winner: null,
                    completed: false,
                    isBye: false
                });
            }
        }

        // Create empty subsequent round matches
        for (let round = 1; round < rounds; round++) {
            const matchesInRound = size / Math.pow(2, round + 1);
            for (let i = 0; i < matchesInRound; i++) {
                matches.push({
                    id: Utils.generateId(),
                    round,
                    position: i,
                    player1: null,
                    player2: null,
                    winner: null,
                    completed: false,
                    isBye: false
                });
            }
        }

        // Auto-advance byes
        matches.forEach(m => {
            if (m.completed && m.winner && !m.isBye) {
                this.advanceWinner(matches, m);
            }
        });
        // Handle first-round byes differently
        matches.filter(m => m.round === 0 && m.isBye).forEach(m => {
            const nextMatchIdx = matches.findIndex(nm =>
                nm.round === 1 && nm.position === Math.floor(m.position / 2)
            );
            if (nextMatchIdx >= 0) {
                const nextMatch = matches[nextMatchIdx];
                if (!nextMatch.player1) nextMatch.player1 = m.winner;
                else nextMatch.player2 = m.winner;
            }
        });

        this.current = {
            id: Utils.generateId(),
            name: config.name,
            sport: config.sport,
            mode: config.mode,
            bestOf: config.bestOf,
            format: config.format,
            matches,
            rounds,
            champion: null,
            createdAt: new Date().toISOString(),
            userId: Auth.currentUser?.id
        };

        // Save as active
        Store.setActiveTournament(this.current);
        return this.current;
    },

    advanceWinner(matches, completedMatch) {
        const nextRound = completedMatch.round + 1;
        if (nextRound >= Math.log2(matches.length + 2)) return;

        const nextMatchIdx = matches.findIndex(m =>
            m.round === nextRound &&
            m.position === Math.floor(completedMatch.position / 2)
        );

        if (nextMatchIdx >= 0) {
            const nextMatch = matches[nextMatchIdx];
            if (!nextMatch.player1) {
                nextMatch.player1 = completedMatch.winner;
            } else {
                nextMatch.player2 = completedMatch.winner;
            }
        }
    },

    completeMatch(matchId, winnerId) {
        if (!this.current) return;

        const match = this.current.matches.find(m => m.id === matchId);
        if (!match) return;

        match.winner = match.player1.id === winnerId ? match.player1 : match.player2;
        match.completed = true;

        // Advance winner
        const nextRound = match.round + 1;
        const nextMatchIdx = this.current.matches.findIndex(m =>
            m.round === nextRound &&
            m.position === Math.floor(match.position / 2)
        );

        if (nextMatchIdx >= 0) {
            const nextMatch = this.current.matches[nextMatchIdx];
            if (!nextMatch.player1) nextMatch.player1 = match.winner;
            else nextMatch.player2 = match.winner;
        } else {
            // This was the final — champion!
            this.current.champion = match.winner;
        }

        Store.setActiveTournament(this.current);
    },

    save() {
        if (this.current) Store.setActiveTournament(this.current);
    },

    saveCompleted() {
        if (!this.current || !this.current.champion) return;
        const tournaments = Store.getTournaments();
        tournaments.unshift(this.current);
        Store.saveTournaments(tournaments);
        Store.clearActiveTournament();
        this.current = null;
    }
};

// ============================================================
// GROUP PLAY ENGINE
// ============================================================
const GroupPlay = {
    current: null,
    sessionTimerInterval: null,
    matchTimerInterval: null,
    sessionSeconds: 0,
    matchSeconds: 0,

    startSession(config) {
        const players = config.players.map(p => ({
            ...p,
            wins: 0,
            losses: 0,
            streak: 0,
            maxStreak: 0,
            currentStreak: 0
        }));

        this.current = {
            id: Utils.generateId(),
            sport: config.sport,
            players,
            rotationMode: config.rotationMode,
            matchTime: config.matchTime,
            endTime: config.endTimer || 900, // 15 min default
            endWins: config.endWins || 5,
            endMode: config.endMode,
            matchHistory: [],
            currentMatch: null,
            queue: [],
            startTime: Date.now(),
            userId: Auth.currentUser?.id
        };

        // Start first match
        this.startNewMatch();
        this.startSessionTimer();
        Router.navigate('group');
    },

    startNewMatch() {
        if (this.current.players.length < 2) return;

        let p1, p2;
        if (this.current.currentMatch) {
            // Determine who plays based on rotation
            const prev = this.current.currentMatch;
            const rotation = this.current.rotationMode;

            if (rotation === 'winner-stays') {
                const winner = prev.winner || prev.p1; // Default to p1
                const available = this.current.players.filter(p => p.id !== winner.id);
                const next = available[Math.floor(Math.random() * available.length)];
                p1 = winner;
                p2 = next;
            } else if (rotation === 'loser-stays') {
                const loser = prev.winner === prev.p1 ? prev.p2 : prev.p1;
                const available = this.current.players.filter(p => p.id !== loser.id);
                const next = available[Math.floor(Math.random() * available.length)];
                p1 = loser;
                p2 = next;
            } else {
                // Random
                const shuffled = [...this.current.players].sort(() => Math.random() - 0.5);
                p1 = shuffled[0];
                p2 = shuffled[1];
            }
        } else {
            const shuffled = [...this.current.players].sort(() => Math.random() - 0.5);
            p1 = shuffled[0];
            p2 = shuffled[1];
        }

        this.current.currentMatch = {
            p1, p2,
            state: Scoring.createMatchState({
                sport: this.current.sport,
                bestOf: 3,
                players: [p1, p2],
                firstServer: 'p1'
            }),
            startTime: Date.now(),
            winner: null
        };

        this.matchSeconds = this.current.matchTime;
        this.startMatchTimer();
    },

    awardPoint(player) {
        if (!this.current?.currentMatch) return;
        const result = Scoring.awardPoint(this.current.currentMatch.state, player);
        UI.renderGroupPlay();

        if (result.type === 'match') {
            this.endCurrentMatch();
        }
    },

    endCurrentMatch() {
        this.stopMatchTimer();
        const match = this.current.currentMatch;
        const winnerId = match.state.matchWinner === 'p1' ? match.p1.id : match.p2.id;
        const loserId = winnerId === match.p1.id ? match.p2.id : match.p1.id;

        match.winner = this.current.players.find(p => p.id === winnerId);

        // Update stats
        const winner = this.current.players.find(p => p.id === winnerId);
        const loser = this.current.players.find(p => p.id === loserId);
        if (winner) {
            winner.wins++;
            winner.currentStreak++;
            winner.maxStreak = Math.max(winner.maxStreak, winner.currentStreak);
        }
        if (loser) {
            loser.losses++;
            loser.currentStreak = 0;
        }

        this.current.matchHistory.push({
            p1: match.p1,
            p2: match.p2,
            winner: match.winner,
            score: JSON.parse(JSON.stringify(match.state.sets)),
            timestamp: Date.now()
        });

        // Show transition and start next match
        this.showTransition(match.winner);
    },

    showTransition(winner) {
        // Briefly show transition overlay then start next match
        UI.showGroupTransition(winner);
        setTimeout(() => {
            this.startNewMatch();
            UI.renderGroupPlay();
        }, 2000);
    },

    startSessionTimer() {
        this.sessionSeconds = this.current.endTime;
        this.sessionTimerInterval = setInterval(() => {
            this.sessionSeconds--;
            UI.updateGroupTimers();
            if (this.sessionSeconds <= 0) {
                this.endSession();
            }
        }, 1000);
    },

    startMatchTimer() {
        this.stopMatchTimer();
        this.matchTimerInterval = setInterval(() => {
            this.matchSeconds--;
            UI.updateGroupTimers();
            if (this.matchSeconds <= 0) {
                // Time's up for this match — whoever is ahead wins
                this.endCurrentMatch();
            }
        }, 1000);
    },

    stopMatchTimer() {
        clearInterval(this.matchTimerInterval);
    },

    endSession() {
        clearInterval(this.sessionTimerInterval);
        this.stopMatchTimer();

        // Sort leaderboard
        const leaderboard = [...this.current.players]
            .sort((a, b) => b.wins - a.wins || (b.wins / Math.max(b.wins + b.losses, 1)) - (a.wins / Math.max(a.wins + a.losses, 1)));

        const sessionRecord = {
            id: this.current.id,
            sport: this.current.sport,
            players: this.current.players,
            matchHistory: this.current.matchHistory,
            leaderboard,
            totalMatches: this.current.matchHistory.length,
            duration: Math.floor((Date.now() - this.current.startTime) / 1000),
            timestamp: new Date().toISOString(),
            userId: Auth.currentUser?.id
        };

        const sessions = Store.getGroupSessions();
        sessions.unshift(sessionRecord);
        Store.saveGroupSessions(sessions);
        Store.clearActiveGroupSession();

        UI.showGroupSummary(sessionRecord);
        this.current = null;
    },

    cleanup() {
        clearInterval(this.sessionTimerInterval);
        this.stopMatchTimer();
        this.current = null;
    }
};

// ============================================================
// TIMER (for general use)
// ============================================================
const Timer = {
    intervals: {},

    start(id, callback, interval = 1000) {
        this.stop(id);
        this.intervals[id] = setInterval(callback, interval);
    },

    stop(id) {
        if (this.intervals[id]) {
            clearInterval(this.intervals[id]);
            delete this.intervals[id];
        }
    },

    stopAll() {
        Object.keys(this.intervals).forEach(id => this.stop(id));
    }
};

// ============================================================
// STATISTICS
// ============================================================
const Statistics = {
    getPlayerStats(playerId) {
        const matches = Store.getMatches();
        const playerMatches = matches.filter(m =>
            m.players.some(p => p.id === playerId)
        );

        let wins = 0;
        let losses = 0;
        let gamesWon = 0;
        let aces = 0;

        playerMatches.forEach(m => {
            const playerIdx = m.players.findIndex(p => p.id === playerId);
            if (playerIdx === -1) return;

            const key = playerIdx === 0 ? 'p1' : 'p2';
            if (m.winner === key) wins++;
            else losses++;

            if (m.stats) {
                gamesWon += m.stats.gamesWon[key] || 0;
                aces += m.stats.aces[key] || 0;
            }
        });

        return {
            matchesPlayed: playerMatches.length,
            wins,
            losses,
            winRate: playerMatches.length > 0 ? Math.round((wins / playerMatches.length) * 100) : 0,
            gamesWon,
            aces
        };
    },

    getHeadToHead(p1Id, p2Id) {
        const matches = Store.getMatches();
        const h2h = matches.filter(m =>
            m.players.some(p => p.id === p1Id) &&
            m.players.some(p => p.id === p2Id)
        );

        let p1Wins = 0, p2Wins = 0;
        h2h.forEach(m => {
            const idx1 = m.players.findIndex(p => p.id === p1Id);
            if (idx1 === -1) return;
            const key1 = idx1 === 0 ? 'p1' : 'p2';
            if (m.winner === key1) p1Wins++;
            else p2Wins++;
        });

        return { p1Wins, p2Wins, total: h2h.length, matches: h2h.slice(0, 5) };
    },

    getAdminStats() {
        const users = Store.getUsers();
        const matches = Store.getMatches();
        const tennis = matches.filter(m => m.sport === 'tennis').length;
        const padel = matches.filter(m => m.sport === 'padel').length;
        const total = matches.length;

        return {
            totalUsers: users.length,
            totalMatches: total,
            tennisPct: total > 0 ? Math.round((tennis / total) * 100) : 0,
            padelPct: total > 0 ? Math.round((padel / total) * 100) : 0,
            ongoingMatches: MatchManager.currentState ? 1 : 0,
            tennis,
            padel,
            matches
        };
    }
};

// ============================================================
// ADMIN DASHBOARD
// ============================================================
const Admin = {
    charts: {},

    render() {
        if (!Auth.isAdmin()) {
            document.getElementById('admin-403').classList.remove('hidden');
            document.getElementById('admin-content').classList.add('hidden');
            return;
        }

        document.getElementById('admin-403').classList.add('hidden');
        document.getElementById('admin-content').classList.remove('hidden');

        const stats = Statistics.getAdminStats();

        // KPIs
        document.getElementById('kpi-total-users').textContent = stats.totalUsers;
        document.getElementById('kpi-total-matches').textContent = stats.totalMatches;
        document.getElementById('kpi-tennis-padel-ratio').textContent = `${stats.tennisPct}% / ${stats.padelPct}%`;
        document.getElementById('kpi-ongoing-matches').textContent = stats.ongoingMatches;

        this.renderDonutChart(stats);
        this.renderActivityChart('daily');
        this.renderUserTable();
        this.renderMatchTable();
    },

    renderDonutChart(stats) {
        const ctx = document.getElementById('chart-sport-distribution');
        if (!ctx) return;

        if (this.charts.donut) this.charts.donut.destroy();

        this.charts.donut = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Tennis', 'Padel'],
                datasets: [{
                    data: [stats.tennis || 1, stats.padel || 1],
                    backgroundColor: ['#22c55e', '#3b82f6'],
                    borderColor: '#162220',
                    borderWidth: 3
                }]
            },
            options: {
                responsive: true,
                cutout: '60%',
                plugins: {
                    legend: {
                        labels: { color: '#94a398', font: { size: 12 } }
                    }
                }
            }
        });
    },

    renderActivityChart(period) {
        const ctx = document.getElementById('chart-activity');
        if (!ctx) return;

        if (this.charts.activity) this.charts.activity.destroy();

        const matches = Store.getMatches();
        const now = new Date();
        let labels = [];
        let data = [];

        if (period === 'daily') {
            for (let i = 6; i >= 0; i--) {
                const d = new Date(now);
                d.setDate(d.getDate() - i);
                const dayStr = d.toDateString();
                labels.push(d.toLocaleDateString('en-US', { weekday: 'short' }));
                data.push(matches.filter(m => new Date(m.timestamp).toDateString() === dayStr).length);
            }
        } else {
            for (let i = 3; i >= 0; i--) {
                const d = new Date(now);
                d.setDate(d.getDate() - (i * 7));
                const weekEnd = new Date(d);
                weekEnd.setDate(weekEnd.getDate() + 7);
                labels.push(`Week ${4 - i + 1}`);
                data.push(matches.filter(m => {
                    const md = new Date(m.timestamp);
                    return md >= d && md < weekEnd;
                }).length);
            }
        }

        this.charts.activity = new Chart(ctx, {
            type: 'bar',
            data: {
                labels,
                datasets: [{
                    label: 'Matches',
                    data,
                    backgroundColor: 'rgba(34, 197, 94, 0.5)',
                    borderColor: '#22c55e',
                    borderWidth: 1,
                    borderRadius: 4
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: { color: '#94a398', stepSize: 1 },
                        grid: { color: 'rgba(148,163,152,0.1)' }
                    },
                    x: {
                        ticks: { color: '#94a398' },
                        grid: { display: false }
                    }
                },
                plugins: {
                    legend: { display: false }
                }
            }
        });
    },

    renderUserTable(page = 1, search = '', statusFilter = '', roleFilter = '') {
        const users = Store.getUsers();
        const matches = Store.getMatches();
        const perPage = 10;

        let filtered = users.filter(u => {
            if (search && !u.username.toLowerCase().includes(search.toLowerCase()) &&
                !u.displayName.toLowerCase().includes(search.toLowerCase())) return false;
            if (statusFilter && (statusFilter === 'active') !== u.active) return false;
            if (roleFilter && u.role !== roleFilter) return false;
            return true;
        });

        const totalPages = Math.ceil(filtered.length / perPage);
        const start = (page - 1) * perPage;
        const pageUsers = filtered.slice(start, start + perPage);

        const tbody = document.getElementById('users-table-body');
        tbody.innerHTML = pageUsers.map(u => {
            const userMatches = matches.filter(m => m.userId === u.id);
            const wins = userMatches.filter(m => {
                const idx = m.players.findIndex(p => p.id === u.id);
                return idx >= 0 && m.winner === (idx === 0 ? 'p1' : 'p2');
            }).length;
            const winRate = userMatches.length > 0 ? Math.round((wins / userMatches.length) * 100) : 0;

            return `<tr>
                <td><div class="user-cell">
                    <div class="avatar-circle" style="background:${Utils.getAvatarColor(u.displayName)}">${Utils.getInitials(u.displayName)}</div>
                    <div><strong>${Utils.escapeHtml(u.displayName)}</strong><br><small style="color:var(--text-muted)">@${Utils.escapeHtml(u.username)}</small></div>
                </div></td>
                <td>${Utils.escapeHtml(u.email || '—')}</td>
                <td>${Utils.formatDate(u.createdAt)}</td>
                <td>${userMatches.length}</td>
                <td>${winRate}%</td>
                <td><span class="badge badge-${u.active ? 'active' : 'inactive'}">${u.active ? 'Active' : 'Inactive'}</span></td>
                <td><div class="table-actions">
                    <select onchange="Admin.changeRole('${u.id}', this.value)" ${u.id === Auth.currentUser?.id ? 'disabled' : ''}>
                        <option value="admin" ${u.role === 'admin' ? 'selected' : ''}>Admin</option>
                        <option value="manager" ${u.role === 'manager' ? 'selected' : ''}>Manager</option>
                        <option value="member" ${u.role === 'member' ? 'selected' : ''}>Member</option>
                    </select>
                    <button class="btn btn-xs ${u.active ? 'btn-danger' : 'btn-primary'}" onclick="Admin.toggleUser('${u.id}')" ${u.id === Auth.currentUser?.id ? 'disabled' : ''}>
                        ${u.active ? 'Deactivate' : 'Activate'}
                    </button>
                </div></td>
            </tr>`;
        }).join('');

        this.renderPagination('users-pagination', page, totalPages, (p) => this.renderUserTable(p, search, statusFilter, roleFilter));
    },

    renderMatchTable(page = 1, search = '', sportFilter = '', modeFilter = '') {
        const matches = Store.getMatches();
        const perPage = 10;

        let filtered = matches.filter(m => {
            if (search) {
                const s = search.toLowerCase();
                const playerNames = m.players.map(p => p.name.toLowerCase()).join(' ');
                if (!playerNames.includes(s) && !m.id.includes(s)) return false;
            }
            if (sportFilter && m.sport !== sportFilter) return false;
            if (modeFilter && m.mode !== modeFilter) return false;
            return true;
        });

        const totalPages = Math.ceil(filtered.length / perPage);
        const start = (page - 1) * perPage;
        const pageMatches = filtered.slice(start, start + perPage);

        const tbody = document.getElementById('matches-admin-table-body');
        tbody.innerHTML = pageMatches.map(m => {
            const scoreStr = m.sets.map(s => `${s.p1 || 0}-${s.p2 || 0}`).join(', ');
            return `<tr>
                <td><code style="font-size:0.7rem;color:var(--text-muted)">${m.id.slice(0, 8)}</code></td>
                <td><span class="badge badge-${m.sport}">${m.sport}</span></td>
                <td><span class="badge badge-${m.mode}">${m.mode}</span></td>
                <td>${m.players.map(p => Utils.escapeHtml(p.name)).join(' vs ')}</td>
                <td>${scoreStr}</td>
                <td><span class="badge badge-active">Completed</span></td>
                <td>${Utils.formatDateTime(m.timestamp)}</td>
                <td><div class="table-actions">
                    <button class="btn btn-xs btn-danger" onclick="Admin.deleteMatch('${m.id}')">
                        <i data-lucide="trash-2"></i>
                    </button>
                </div></td>
            </tr>`;
        }).join('');

        lucide.createIcons();

        this.renderPagination('matches-pagination', page, totalPages, (p) => this.renderMatchTable(p, search, sportFilter, modeFilter));
    },

    renderPagination(containerId, current, total, callback) {
        const container = document.getElementById(containerId);
        if (!container || total <= 1) {
            if (container) container.innerHTML = '';
            return;
        }

        let html = '';
        if (current > 1) html += `<button class="page-btn" data-page="${current - 1}">←</button>`;
        for (let i = 1; i <= total; i++) {
            if (i === 1 || i === total || (i >= current - 2 && i <= current + 2)) {
                html += `<button class="page-btn ${i === current ? 'active' : ''}" data-page="${i}">${i}</button>`;
            } else if (i === current - 3 || i === current + 3) {
                html += `<span style="color:var(--text-muted)">...</span>`;
            }
        }
        if (current < total) html += `<button class="page-btn" data-page="${current + 1}">→</button>`;

        container.innerHTML = html;
        container.querySelectorAll('.page-btn').forEach(btn => {
            btn.addEventListener('click', () => callback(parseInt(btn.dataset.page)));
        });
    },

    changeRole(userId, role) {
        Auth.updateRole(userId, role);
        Toast.show('Role updated', 'success');
        this.renderUserTable();
    },

    toggleUser(userId) {
        Auth.toggleActive(userId);
        Toast.show('User status updated', 'success');
        this.renderUserTable();
    },

    deleteMatch(matchId) {
        Confirm.show('Delete Match', 'Are you sure you want to delete this match record?', () => {
            const matches = Store.getMatches().filter(m => m.id !== matchId);
            Store.saveMatches(matches);
            Toast.show('Match deleted', 'success');
            this.renderMatchTable();
        }, true);
    }
};

// ============================================================
// CARD TEMPLATES (7 styles)
// ============================================================
const CardTemplates = {
    options: {
        template: 1,
        bgColor: '#0a0f0d',
        bgImage: null,
        overlay: 'dark',
        accent: '#22c55e',
        aspect: '1:1',
        clubBranding: false
    },

    setOption(key, val) {
        this.options[key] = val;
    },

    render(data) {
        const canvas = document.getElementById('share-canvas');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const aspectMap = { '1:1': [1080, 1080], '16:9': [1920, 1080], '9:16': [1080, 1920] };
        const [w, h] = aspectMap[this.options.aspect] || [1080, 1080];
        canvas.width = w;
        canvas.height = h;

        ctx.clearRect(0, 0, w, h);

        // Background
        if (this.options.bgImage) {
            try {
                ctx.drawImage(this.options.bgImage, 0, 0, w, h);
                // Dark overlay on top of image
                ctx.fillStyle = this.options.overlay === 'transparent' ? 'rgba(0,0,0,0)' : 'rgba(0,0,0,0.6)';
                ctx.fillRect(0, 0, w, h);
            } catch (e) {
                ctx.fillStyle = this.options.bgColor;
                ctx.fillRect(0, 0, w, h);
            }
        } else {
            ctx.fillStyle = this.options.bgColor;
            ctx.fillRect(0, 0, w, h);
        }

        // Overlay panel
        if (this.options.overlay !== 'transparent') {
            const panelColor = this.options.overlay === 'light' ? 'rgba(255,255,255,0.95)' :
                               this.options.overlay === 'green' ? 'rgba(22,42,32,0.95)' :
                               'rgba(10,15,13,0.9)';
            ctx.fillStyle = panelColor;
            this.roundRect(ctx, w * 0.05, h * 0.1, w * 0.9, h * 0.8, 20);
            ctx.fill();
        }

        const textColor = this.options.overlay === 'light' ? '#1a1a1a' : '#f1f5f0';
        const mutedColor = this.options.overlay === 'light' ? '#666' : '#94a398';

        // Route to specific template
        switch (this.options.template) {
            case 1: this.renderFinalScore(ctx, data, w, h, textColor, mutedColor); break;
            case 2: this.renderFullStats(ctx, data, w, h, textColor, mutedColor); break;
            case 3: this.renderMatchSummary(ctx, data, w, h, textColor, mutedColor); break;
            case 4: this.renderTournamentChampion(ctx, data, w, h, textColor, mutedColor); break;
            case 5: this.renderGroupRecap(ctx, data, w, h, textColor, mutedColor); break;
            case 6: this.renderHeadToHead(ctx, data, w, h, textColor, mutedColor); break;
            case 7: this.renderMinimal(ctx, data, w, h, textColor, mutedColor); break;
        }

        // Club branding
        if (this.options.clubBranding && data.clubName) {
            ctx.font = `bold ${w * 0.025}px ${getComputedStyle(document.body).fontFamily}`;
            ctx.fillStyle = mutedColor;
            ctx.textAlign = 'center';
            ctx.fillText(data.clubName, w / 2, h * 0.95);
        }

        // Footer
        ctx.font = `${w * 0.02}px ${getComputedStyle(document.body).fontFamily}`;
        ctx.fillStyle = mutedColor;
        ctx.textAlign = 'center';
        ctx.fillText('Korts — No ref. No lies. Just Korts.', w / 2, h * 0.97);
    },

    renderFinalScore(ctx, data, w, h, textColor, mutedColor) {
        const cx = w / 2;
        const sportEmoji = data.sport === 'tennis' ? '🎾' : '🏓';

        // Sport + Date
        ctx.font = `${w * 0.04}px ${getComputedStyle(document.body).fontFamily}`;
        ctx.fillStyle = mutedColor;
        ctx.textAlign = 'center';
        ctx.fillText(`${sportEmoji} ${data.sport?.toUpperCase()} • ${Utils.formatDate(data.timestamp || new Date().toISOString())}`, cx, h * 0.2);

        // Player 1
        ctx.font = `bold ${w * 0.06}px ${getComputedStyle(document.body).fontFamily}`;
        ctx.fillStyle = textColor;
        ctx.textAlign = 'center';
        ctx.fillText(data.players?.[0]?.name || 'Player 1', cx, h * 0.38);

        // VS
        ctx.font = `bold ${w * 0.04}px ${getComputedStyle(document.body).fontFamily}`;
        ctx.fillStyle = this.options.accent;
        ctx.fillText('VS', cx, h * 0.47);

        // Player 2
        ctx.font = `bold ${w * 0.06}px ${getComputedStyle(document.body).fontFamily}`;
        ctx.fillStyle = textColor;
        ctx.fillText(data.players?.[1]?.name || 'Player 2', cx, h * 0.56);

        // Score
        ctx.font = `800 ${w * 0.1}px ${getComputedStyle(document.body).fontFamily}`;
        ctx.fillStyle = this.options.accent;
        const score = data.sets?.map(s => `${s.p1 || 0}`).join(' ') || '0';
        const score2 = data.sets?.map(s => `${s.p2 || 0}`).join(' ') || '0';
        ctx.fillText(`${score}  —  ${score2}`, cx, h * 0.75);

        // Winner
        if (data.winnerName) {
            ctx.font = `bold ${w * 0.035}px ${getComputedStyle(document.body).fontFamily}`;
            ctx.fillStyle = '#f59e0b';
            ctx.fillText(`🏆 ${data.winnerName} wins!`, cx, h * 0.85);
        }
    },

    renderFullStats(ctx, data, w, h, textColor, mutedColor) {
        const cx = w / 2;
        const stats = data.stats || {};

        // Title
        ctx.font = `bold ${w * 0.04}px ${getComputedStyle(document.body).fontFamily}`;
        ctx.fillStyle = textColor;
        ctx.textAlign = 'center';
        ctx.fillText('MATCH STATISTICS', cx, h * 0.17);

        // Player headers
        const leftX = w * 0.25;
        const rightX = w * 0.75;
        ctx.font = `bold ${w * 0.035}px ${getComputedStyle(document.body).fontFamily}`;
        ctx.textAlign = 'center';
        ctx.fillStyle = this.options.accent;
        ctx.fillText(data.players?.[0]?.name || 'P1', leftX, h * 0.26);
        ctx.fillText(data.players?.[1]?.name || 'P2', rightX, h * 0.26);

        // Stats rows
        const rows = [
            ['Points Won', stats.pointsWon?.p1 || 0, stats.pointsWon?.p2 || 0],
            ['Games Won', stats.gamesWon?.p1 || 0, stats.gamesWon?.p2 || 0],
            ['Aces', stats.aces?.p1 || 0, stats.aces?.p2 || 0],
            ['Break Points', stats.breakPoints?.p1 || 0, stats.breakPoints?.p2 || 0],
        ];

        rows.forEach((row, i) => {
            const y = h * (0.35 + i * 0.12);
            ctx.font = `bold ${w * 0.05}px ${getComputedStyle(document.body).fontFamily}`;
            ctx.fillStyle = textColor;
            ctx.textAlign = 'center';
            ctx.fillText(row[1], leftX, y);
            ctx.fillText(row[2], rightX, y);

            ctx.font = `${w * 0.025}px ${getComputedStyle(document.body).fontFamily}`;
            ctx.fillStyle = mutedColor;
            ctx.fillText(row[0], cx, y);
        });

        // Score summary
        if (data.sets) {
            ctx.font = `bold ${w * 0.035}px ${getComputedStyle(document.body).fontFamily}`;
            ctx.fillStyle = this.options.accent;
            ctx.fillText(data.sets.map(s => `${s.p1 || 0}-${s.p2 || 0}`).join('  '), cx, h * 0.85);
        }
    },

    renderMatchSummary(ctx, data, w, h, textColor, mutedColor) {
        const cx = w / 2;

        ctx.font = `bold ${w * 0.04}px ${getComputedStyle(document.body).fontFamily}`;
        ctx.fillStyle = textColor;
        ctx.textAlign = 'center';
        ctx.fillText(data.sport === 'tennis' ? '🎾 TENNIS' : '🏓 PADEL', cx, h * 0.17);

        // Players
        ctx.font = `bold ${w * 0.045}px ${getComputedStyle(document.body).fontFamily}`;
        ctx.fillStyle = textColor;
        ctx.fillText(data.players?.[0]?.name || 'P1', cx, h * 0.28);
        ctx.fillStyle = mutedColor;
        ctx.fillText('vs', cx, h * 0.33);
        ctx.fillStyle = textColor;
        ctx.fillText(data.players?.[1]?.name || 'P2', cx, h * 0.38);

        // Set-by-set table
        if (data.sets && data.sets.length > 0) {
            const tableX = w * 0.25;
            const tableW = w * 0.5;
            const rowH = h * 0.06;
            const startY = h * 0.44;

            data.sets.forEach((set, i) => {
                if (set.p1 === undefined && set.p2 === undefined) return;
                const y = startY + i * rowH;

                // Alternating rows
                ctx.fillStyle = i % 2 === 0 ? 'rgba(255,255,255,0.03)' : 'transparent';
                ctx.fillRect(tableX - 20, y - rowH * 0.4, tableW + 40, rowH);

                ctx.font = `${w * 0.03}px ${getComputedStyle(document.body).fontFamily}`;
                ctx.fillStyle = mutedColor;
                ctx.textAlign = 'center';
                ctx.fillText(`Set ${i + 1}`, cx - tableW * 0.3, y + 5);

                ctx.font = `bold ${w * 0.035}px ${getComputedStyle(document.body).fontFamily}`;
                ctx.fillStyle = textColor;
                ctx.fillText(set.p1 || 0, cx - tableW * 0.1, y + 5);
                ctx.fillText(set.p2 || 0, cx + tableW * 0.1, y + 5);
            });
        }

        // Duration
        if (data.duration) {
            ctx.font = `${w * 0.025}px ${getComputedStyle(document.body).fontFamily}`;
            ctx.fillStyle = mutedColor;
            ctx.fillText(`Duration: ${Utils.formatTime(data.duration)}`, cx, h * 0.85);
        }

        // Winner
        if (data.winnerName) {
            ctx.font = `bold ${w * 0.04}px ${getComputedStyle(document.body).fontFamily}`;
            ctx.fillStyle = '#f59e0b';
            ctx.fillText(`🏆 ${data.winnerName}`, cx, h * 0.92);
        }
    },

    renderTournamentChampion(ctx, data, w, h, textColor, mutedColor) {
        const cx = w / 2;

        // Trophy
        ctx.font = `${w * 0.15}px serif`;
        ctx.textAlign = 'center';
        ctx.fillText('🏆', cx, h * 0.25);

        // Champion
        ctx.font = `800 ${w * 0.07}px ${getComputedStyle(document.body).fontFamily}`;
        ctx.fillStyle = '#f59e0b';
        ctx.fillText(data.champion?.name || 'Champion', cx, h * 0.4);

        ctx.font = `bold ${w * 0.03}px ${getComputedStyle(document.body).fontFamily}`;
        ctx.fillStyle = mutedColor;
        ctx.fillText(data.name || 'Tournament', cx, h * 0.46);

        // Stats
        if (data.totalMatches) {
            ctx.font = `${w * 0.025}px ${getComputedStyle(document.body).fontFamily}`;
            ctx.fillStyle = textColor;
            ctx.fillText(`${data.totalMatches} matches played`, cx, h * 0.56);
        }

        // Date
        ctx.font = `${w * 0.025}px ${getComputedStyle(document.body).fontFamily}`;
        ctx.fillStyle = mutedColor;
        ctx.fillText(Utils.formatDate(data.createdAt || new Date().toISOString()), cx, h * 0.63);
    },

    renderGroupRecap(ctx, data, w, h, textColor, mutedColor) {
        const cx = w / 2;

        ctx.font = `bold ${w * 0.04}px ${getComputedStyle(document.body).fontFamily}`;
        ctx.fillStyle = textColor;
        ctx.textAlign = 'center';
        ctx.fillText('GROUP PLAY RECAP', cx, h * 0.17);

        // Leaderboard
        const leaderboard = data.leaderboard || [];
        leaderboard.slice(0, 5).forEach((p, i) => {
            const y = h * (0.28 + i * 0.1);
            const medals = ['🥇', '🥈', '🥉', '4.', '5.'];

            ctx.font = `${w * 0.03}px ${getComputedStyle(document.body).fontFamily}`;
            ctx.fillStyle = mutedColor;
            ctx.textAlign = 'left';
            ctx.fillText(medals[i] || `${i + 1}.`, w * 0.12, y);

            ctx.font = `bold ${w * 0.035}px ${getComputedStyle(document.body).fontFamily}`;
            ctx.fillStyle = i === 0 ? '#f59e0b' : textColor;
            ctx.fillText(p.name, w * 0.2, y);

            ctx.font = `${w * 0.03}px ${getComputedStyle(document.body).fontFamily}`;
            ctx.fillStyle = mutedColor;
            ctx.textAlign = 'right';
            ctx.fillText(`${p.wins}W - ${p.losses}L`, w * 0.85, y);
        });

        // Session stats
        ctx.textAlign = 'center';
        ctx.font = `${w * 0.025}px ${getComputedStyle(document.body).fontFamily}`;
        ctx.fillStyle = mutedColor;
        ctx.fillText(`${data.totalMatches || 0} matches • ${data.sport || 'tennis'}`, cx, h * 0.85);
    },

    renderHeadToHead(ctx, data, w, h, textColor, mutedColor) {
        const cx = w / 2;

        ctx.font = `bold ${w * 0.04}px ${getComputedStyle(document.body).fontFamily}`;
        ctx.fillStyle = textColor;
        ctx.textAlign = 'center';
        ctx.fillText('HEAD TO HEAD', cx, h * 0.17);

        // Players
        ctx.font = `bold ${w * 0.045}px ${getComputedStyle(document.body).fontFamily}`;
        ctx.fillStyle = this.options.accent;
        ctx.fillText(data.players?.[0]?.name || 'P1', w * 0.25, h * 0.3);
        ctx.fillText(data.players?.[1]?.name || 'P2', w * 0.75, h * 0.3);

        // Record
        ctx.font = `800 ${w * 0.1}px ${getComputedStyle(document.body).fontFamily}`;
        ctx.fillStyle = textColor;
        ctx.fillText(`${data.p1Wins || 0} — ${data.p2Wins || 0}`, cx, h * 0.48);

        ctx.font = `${w * 0.025}px ${getComputedStyle(document.body).fontFamily}`;
        ctx.fillStyle = mutedColor;
        ctx.fillText(`Based on ${data.total || 0} matches`, cx, h * 0.55);
    },

    renderMinimal(ctx, data, w, h, textColor, mutedColor) {
        const cx = w / 2;

        // Sport icon
        ctx.font = `${w * 0.12}px serif`;
        ctx.textAlign = 'center';
        ctx.fillText(data.sport === 'tennis' ? '🎾' : '🏓', cx, h * 0.25);

        // Giant score
        ctx.font = `900 ${w * 0.12}px ${getComputedStyle(document.body).fontFamily}`;
        ctx.fillStyle = this.options.accent;
        const score = data.sets?.map(s => `${s.p1 || 0}`).join(' ') || '0';
        const score2 = data.sets?.map(s => `${s.p2 || 0}`).join(' ') || '0';
        ctx.fillText(`${score} — ${score2}`, cx, h * 0.5);

        // Date
        ctx.font = `${w * 0.03}px ${getComputedStyle(document.body).fontFamily}`;
        ctx.fillStyle = mutedColor;
        ctx.fillText(Utils.formatDate(data.timestamp || new Date().toISOString()), cx, h * 0.65);
    },

    roundRect(ctx, x, y, w, h, r) {
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        ctx.lineTo(x + w, y + h - r);
        ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        ctx.lineTo(x + r, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.closePath();
    }
};

// ============================================================
// CONFETTI
// ============================================================
const Confetti = {
    create(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;
        container.innerHTML = '';

        const colors = ['#22c55e', '#f59e0b', '#3b82f6', '#ef4444', '#a855f7', '#ec4899'];
        for (let i = 0; i < 50; i++) {
            const piece = document.createElement('div');
            piece.className = 'confetti-piece';
            piece.style.left = Math.random() * 100 + '%';
            piece.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
            piece.style.animationDuration = (2 + Math.random() * 3) + 's';
            piece.style.animationDelay = Math.random() * 2 + 's';
            piece.style.borderRadius = Math.random() > 0.5 ? '50%' : '2px';
            piece.style.width = (5 + Math.random() * 10) + 'px';
            piece.style.height = (5 + Math.random() * 10) + 'px';
            container.appendChild(piece);
        }

        setTimeout(() => container.innerHTML = '', 5000);
    }
};

// ============================================================
// UI RENDERER
// ============================================================
const UI = {
    init() {
        this.updateUserUI();
    },

    updateUserUI() {
        const user = Auth.currentUser;
        if (!user) return;

        const avatar = document.getElementById('user-avatar');
        if (avatar) {
            avatar.textContent = Utils.getInitials(user.displayName);
            avatar.style.background = Utils.getAvatarColor(user.displayName);
        }

        document.getElementById('dropdown-displayname').textContent = user.displayName;
        document.getElementById('dropdown-role').textContent = user.role;
        document.getElementById('dropdown-role').className = `badge badge-${user.role}`;

        const adminBtn = document.getElementById('dropdown-admin');
        if (adminBtn) {
            adminBtn.classList.toggle('hidden', !Auth.isAdmin());
        }
    },

    // ===== DASHBOARD =====
    renderDashboard() {
        const user = Auth.currentUser;
        if (!user) return;

        document.getElementById('dashboard-greeting').textContent = `Welcome back, ${user.displayName}!`;

        // Quick stats
        const matches = Store.getMatches().filter(m => m.userId === user.id);
        const tournaments = Store.getTournaments().filter(t => t.userId === user.id);
        const players = Store.getPlayers();

        document.getElementById('stat-matches-played').textContent = matches.length;
        document.getElementById('stat-tournaments-won').textContent =
            tournaments.filter(t => t.champion?.id === user.id).length;
        document.getElementById('stat-players-count').textContent = players.length;

        // Club card
        const clubs = Store.getClubs().filter(c =>
            c.members?.some(m => m.userId === user.id)
        );
        const clubCard = document.getElementById('dashboard-club-card');
        if (clubs.length > 0) {
            clubCard.classList.remove('hidden');
            const club = clubs[0];
            document.getElementById('club-card-name').textContent = club.name;
            document.getElementById('club-card-members').textContent = `${club.members?.length || 0} members`;
            const avatar = document.getElementById('club-card-avatar');
            avatar.textContent = Utils.getInitials(club.name);
            avatar.style.background = Utils.getAvatarColor(club.name);
        } else {
            clubCard.classList.add('hidden');
        }

        // Resume cards
        const activeTourney = Store.getActiveTournament();
        const activeGroup = Store.getActiveGroupSession();
        const resumeDiv = document.getElementById('dashboard-resume');
        const resumeCards = document.getElementById('resume-cards');

        if (activeTourney || activeGroup) {
            resumeDiv.classList.remove('hidden');
            resumeCards.innerHTML = '';
            if (activeTourney) {
                resumeCards.innerHTML += `
                    <div class="history-item" onclick="Tournament.current=Store.getActiveTournament();Router.navigate('tournament')">
                        <div style="font-size:1.5rem">🏆</div>
                        <div class="history-item-info">
                            <div class="history-item-title">${Utils.escapeHtml(activeTourney.name)}</div>
                            <div class="history-item-detail">Tournament • In Progress</div>
                        </div>
                        <button class="btn btn-primary btn-sm">Resume</button>
                    </div>`;
            }
            if (activeGroup) {
                resumeCards.innerHTML += `
                    <div class="history-item" onclick="GroupPlay.current=Store.getActiveGroupSession();Router.navigate('group')">
                        <div style="font-size:1.5rem">👥</div>
                        <div class="history-item-info">
                            <div class="history-item-title">Group Play Session</div>
                            <div class="history-item-detail">In Progress</div>
                        </div>
                        <button class="btn btn-primary btn-sm">Resume</button>
                    </div>`;
            }
        } else {
            resumeDiv.classList.add('hidden');
        }

        // Last match
        const lastMatch = matches[0];
        const lastMatchDiv = document.getElementById('dashboard-last-match');
        const lastMatchCard = document.getElementById('last-match-card');
        if (lastMatch) {
            lastMatchDiv.classList.remove('hidden');
            const score = lastMatch.sets.map(s => `${s.p1 || 0}-${s.p2 || 0}`).join(', ');
            lastMatchCard.innerHTML = `
                <div style="display:flex;align-items:center;gap:12px">
                    <span style="font-size:1.5rem">${lastMatch.sport === 'tennis' ? '🎾' : '🏓'}</span>
                    <div style="flex:1">
                        <div style="font-weight:700;font-size:0.9rem">${lastMatch.players.map(p => p.name).join(' vs ')}</div>
                        <div style="font-size:0.8rem;color:var(--text-secondary)">${score} • ${Utils.formatDate(lastMatch.timestamp)}</div>
                    </div>
                    <span class="badge badge-${lastMatch.sport}">${lastMatch.sport}</span>
                </div>`;
        } else {
            lastMatchDiv.classList.add('hidden');
        }

        this.updateUserUI();
    },

    // ===== ADMIN =====
    renderAdminDashboard() {
        Admin.render();
    },

    // ===== PLAYERS =====
    renderPlayers() {
        const players = Store.getPlayers();
        const roster = document.getElementById('player-roster');

        if (players.length === 0) {
            roster.innerHTML = '<p style="text-align:center;color:var(--text-muted);padding:40px">No players yet. Add your first player!</p>';
            return;
        }

        roster.innerHTML = players.map(p => {
            const stats = Statistics.getPlayerStats(p.id);
            return `
                <div class="player-card">
                    <div class="avatar-circle" style="background:${Utils.getAvatarColor(p.name)}">${Utils.getInitials(p.name)}</div>
                    <div class="player-card-info">
                        <div class="player-card-name">${Utils.escapeHtml(p.name)}</div>
                        <div class="player-card-meta">
                            <span class="badge badge-${p.skill || 'intermediate'}">${p.skill || 'intermediate'}</span>
                            ${stats.matchesPlayed > 0 ? `<span>${stats.matchesPlayed} matches • ${stats.winRate}% win</span>` : ''}
                        </div>
                    </div>
                    <div class="player-card-actions">
                        <button class="btn-icon" onclick="UI.editPlayer('${p.id}')" title="Edit">
                            <i data-lucide="pencil"></i>
                        </button>
                        <button class="btn-icon" onclick="UI.deletePlayer('${p.id}')" title="Delete">
                            <i data-lucide="trash-2"></i>
                        </button>
                    </div>
                </div>`;
        }).join('');

        lucide.createIcons();
    },

    addPlayer() {
        document.getElementById('modal-player-title').textContent = 'Add Player';
        document.getElementById('player-edit-id').value = '';
        document.getElementById('player-name').value = '';
        document.getElementById('player-skill').value = 'intermediate';
        document.getElementById('player-notes').value = '';
        document.getElementById('modal-player').classList.remove('hidden');
    },

    editPlayer(id) {
        const player = Store.getPlayers().find(p => p.id === id);
        if (!player) return;
        document.getElementById('modal-player-title').textContent = 'Edit Player';
        document.getElementById('player-edit-id').value = id;
        document.getElementById('player-name').value = player.name;
        document.getElementById('player-skill').value = player.skill;
        document.getElementById('player-notes').value = player.notes || '';
        document.getElementById('modal-player').classList.remove('hidden');
    },

    savePlayer(e) {
        e.preventDefault();
        const id = document.getElementById('player-edit-id').value;
        const name = document.getElementById('player-name').value.trim();
        const skill = document.getElementById('player-skill').value;
        const notes = document.getElementById('player-notes').value.trim();

        if (!name) return;

        const players = Store.getPlayers();
        if (id) {
            const player = players.find(p => p.id === id);
            if (player) {
                player.name = name;
                player.skill = skill;
                player.notes = notes;
            }
        } else {
            players.push({
                id: Utils.generateId(),
                name,
                skill,
                notes,
                createdAt: new Date().toISOString()
            });
        }

        Store.savePlayers(players);
        document.getElementById('modal-player').classList.add('hidden');
        this.renderPlayers();
        Toast.show(id ? 'Player updated' : 'Player added', 'success');
    },

    deletePlayer(id) {
        Confirm.show('Delete Player', 'Remove this player from your roster?', () => {
            const players = Store.getPlayers().filter(p => p.id !== id);
            Store.savePlayers(players);
            this.renderPlayers();
            Toast.show('Player deleted', 'success');
        }, true);
    },

    // ===== MATCH SETUP =====
    renderMatchSetup() {
        const players = Store.getPlayers();
        this.populatePlayerSelects(players);
        this.updateFirstServerOptions();
    },

    populatePlayerSelects(players, prefix = 'pick') {
        const options = players.map(p => `<option value="${p.id}">${Utils.escapeHtml(p.name)}</option>`).join('');
        ['p1', 'p2', 'p1-d2', 'p2-d2'].forEach(id => {
            const el = document.getElementById(`${prefix}-${id}`);
            if (el) {
                el.innerHTML = options;
                // Remove selected from other
                if (id !== 'p1' && id !== 'p1-d2') {
                    el.selectedIndex = Math.min(1, players.length - 1);
                }
            }
        });
    },

    updateFirstServerOptions() {
        const container = document.getElementById('first-server-options');
        if (!container) return;
        const p1Name = document.getElementById('pick-p1')?.selectedOptions?.[0]?.text || 'Player 1';
        const p2Name = document.getElementById('pick-p2')?.selectedOptions?.[0]?.text || 'Player 2';
        container.innerHTML = `
            <button class="sport-select-btn active" data-first-server="p1">${Utils.escapeHtml(p1Name)}</button>
            <button class="sport-select-btn" data-first-server="p2">${Utils.escapeHtml(p2Name)}</button>
        `;
    },

    startMatch() {
        const players = Store.getPlayers();
        const p1Id = document.getElementById('pick-p1').value;
        const p2Id = document.getElementById('pick-p2').value;
        const p1 = players.find(p => p.id === p1Id);
        const p2 = players.find(p => p.id === p2Id);

        if (!p1 || !p2) { Toast.show('Please select both players', 'error'); return; }
        if (p1Id === p2Id) { Toast.show('Please select different players', 'error'); return; }

        const activeSportBtn = document.querySelector('[data-setup-sport].active');
        const activeModeBtn = document.querySelector('[data-setup-mode].active');
        const activeSetsBtn = document.querySelector('[data-setup-sets].active');
        const activeServerBtn = document.querySelector('[data-first-server].active');

        MatchManager.startMatch({
            sport: activeSportBtn?.dataset.setupSport || 'tennis',
            mode: activeModeBtn?.dataset.setupMode || 'singles',
            bestOf: parseInt(activeSetsBtn?.dataset.setupSets || '3'),
            players: [p1, p2],
            firstServer: activeServerBtn?.dataset.firstServer || 'p1'
        });
    },

    // ===== LIVE MATCH =====
    renderMatch() {
        const state = MatchManager.currentState;
        if (!state) return;

        const display = Scoring.getScoreDisplay(state);
        const setsDisplay = Scoring.getSetsDisplay(state);

        // Player names
        document.getElementById('sb-p1-name').textContent = state.players[0]?.name || 'P1';
        document.getElementById('sb-p2-name').textContent = state.players[1]?.name || 'P2';

        // Avatars
        this.setAvatar('sb-p1-avatar', state.players[0]?.name);
        this.setAvatar('sb-p2-avatar', state.players[1]?.name);

        // Score button labels
        document.getElementById('score-btn-p1-name').textContent = state.players[0]?.name || 'P1';
        document.getElementById('score-btn-p2-name').textContent = state.players[1]?.name || 'P2';

        // Points
        document.getElementById('sb-p1-point').textContent = display.p1Point;
        document.getElementById('sb-p2-point').textContent = display.p2Point;

        // Games
        document.getElementById('sb-p1-game').textContent = display.p1Game;
        document.getElementById('sb-p2-game').textContent = display.p2Game;

        // Sets
        const p1SetsHtml = setsDisplay.map((s, i) => {
            const isCurrent = i === state.currentSet;
            const isWon = state.setsWon.p1 > i;
            return `<div class="sb-set-val ${isWon ? 'won' : ''}">${s.p1 || (isCurrent ? '' : '')}</div>`;
        }).join('');
        const p2SetsHtml = setsDisplay.map((s, i) => {
            const isCurrent = i === state.currentSet;
            const isWon = state.setsWon.p2 > i;
            return `<div class="sb-set-val ${isWon ? 'won' : ''}">${s.p2 || (isCurrent ? '' : '')}</div>`;
        }).join('');

        document.getElementById('sb-p1-sets').innerHTML = p1SetsHtml;
        document.getElementById('sb-p2-sets').innerHTML = p2SetsHtml;

        // Server indicator
        document.getElementById('sb-p1-server').classList.toggle('active', state.serving === 'p1');
        document.getElementById('sb-p2-server').classList.toggle('active', state.serving === 'p2');

        // Sport badge
        document.getElementById('match-sport-badge').textContent = state.sport === 'tennis' ? '🎾 Tennis' : '🏓 Padel';

        // Stats
        document.getElementById('stat-p1-points').textContent = state.stats.pointsWon.p1;
        document.getElementById('stat-p2-points').textContent = state.stats.pointsWon.p2;
        document.getElementById('stat-p1-games').textContent = state.stats.gamesWon.p1;
        document.getElementById('stat-p2-games').textContent = state.stats.gamesWon.p2;
        document.getElementById('stat-p1-aces').textContent = state.stats.aces.p1;
        document.getElementById('stat-p2-aces').textContent = state.stats.aces.p2;
        document.getElementById('stat-p1-breaks').textContent = state.stats.breakPoints.p1;
        document.getElementById('stat-p2-breaks').textContent = state.stats.breakPoints.p2;

        lucide.createIcons();
    },

    setAvatar(elementId, name) {
        const el = document.getElementById(elementId);
        if (el) {
            el.textContent = Utils.getInitials(name);
            el.style.background = Utils.getAvatarColor(name);
        }
    },

    showMatchComplete(match) {
        const overlay = document.getElementById('match-complete-overlay');
        overlay.classList.remove('hidden');

        document.getElementById('winner-name').textContent = `${match.winnerName} wins!`;
        document.getElementById('winner-subtitle').textContent = match.sport === 'tennis' ? '🎾 Tennis Match' : '🏓 Padel Match';

        const scoreDisplay = document.getElementById('final-score-display');
        scoreDisplay.innerHTML = match.sets
            .filter(s => s.p1 || s.p2)
            .map(s => `<span>${s.p1 || 0} - ${s.p2 || 0}</span>`)
            .join('');

        const statsDiv = document.getElementById('complete-stats');
        if (match.stats) {
            statsDiv.innerHTML = `
                <div style="display:grid;grid-template-columns:1fr auto 1fr;gap:4px;font-size:0.85rem">
                    <div style="text-align:right;font-weight:700">${match.stats.pointsWon?.p1 || 0}</div>
                    <div style="text-align:center;color:var(--text-muted)">Points</div>
                    <div>${match.stats.pointsWon?.p2 || 0}</div>
                    <div style="text-align:right;font-weight:700">${match.stats.gamesWon?.p1 || 0}</div>
                    <div style="text-align:center;color:var(--text-muted)">Games</div>
                    <div>${match.stats.gamesWon?.p2 || 0}</div>
                    <div style="text-align:right;font-weight:700">${match.stats.aces?.p1 || 0}</div>
                    <div style="text-align:center;color:var(--text-muted)">Aces</div>
                    <div>${match.stats.aces?.p2 || 0}</div>
                </div>
                ${match.duration ? `<div style="text-align:center;margin-top:8px;color:var(--text-muted);font-size:0.8rem">Duration: ${Utils.formatTime(match.duration)}</div>` : ''}
            `;
        }

        Confetti.create('confetti');
        lucide.createIcons();

        // Store current match data for sharing
        overlay._matchData = match;
    },

    // ===== TOURNAMENT =====
    renderTournamentSetup() {
        const players = Store.getPlayers();
        const grid = document.getElementById('tourney-player-grid');
        grid.innerHTML = players.map(p => `
            <div class="tourney-player-chip" data-player-id="${p.id}" onclick="this.classList.toggle('selected');UI.updateTourneyPlayerCount()">
                <div class="avatar-circle" style="background:${Utils.getAvatarColor(p.name)}">${Utils.getInitials(p.name)}</div>
                <span>${Utils.escapeHtml(p.name)}</span>
            </div>
        `).join('');
        this.updateTourneyPlayerCount();
    },

    updateTourneyPlayerCount() {
        const selected = document.querySelectorAll('#tourney-player-grid .selected').length;
        document.getElementById('tourney-player-count').textContent =
            `${selected} player${selected !== 1 ? 's' : ''} selected (need at least 4)`;
    },

    generateTournament() {
        const name = document.getElementById('tournament-name').value.trim();
        if (!name) { Toast.show('Please enter a tournament name', 'error'); return; }

        const chips = document.querySelectorAll('#tourney-player-grid .selected');
        if (chips.length < 4) { Toast.show('Select at least 4 players', 'error'); return; }

        const playerIds = [...chips].map(c => c.dataset.playerId);
        const allPlayers = Store.getPlayers();
        const selectedPlayers = playerIds.map(id => allPlayers.find(p => p.id === id)).filter(Boolean);

        const sport = document.querySelector('[data-tourney-sport].active')?.dataset.tourneySport || 'tennis';
        const mode = document.querySelector('[data-tourney-mode].active')?.dataset.tourneyMode || 'singles';
        const format = document.querySelector('[data-tourney-format].active')?.dataset.tourneyFormat || 'single-elim';
        const bestOf = parseInt(document.querySelector('[data-tourney-sets].active')?.dataset.tourneySets || '3');

        const bracket = Tournament.generateBracket({
            name, sport, mode, format, bestOf,
            players: selectedPlayers
        });

        Router.navigate('tournament');
    },

    renderTournamentBracket() {
        const tournament = Tournament.current;
        if (!tournament) return;

        document.getElementById('tournament-title').innerHTML =
            `<i data-lucide="trophy"></i> ${Utils.escapeHtml(tournament.name)}`;

        const view = document.getElementById('bracket-view');
        const rounds = tournament.rounds;
        const matchesByRound = {};

        tournament.matches.forEach(m => {
            if (!matchesByRound[m.round]) matchesByRound[m.round] = [];
            matchesByRound[m.round].push(m);
        });

        let html = '';
        for (let round = 0; round < rounds; round++) {
            const roundMatches = matchesByRound[round] || [];
            const roundNames = ['Round 1', 'Quarter Finals', 'Semi Finals', 'Final'];
            const nameIdx = rounds - round - 1;
            const roundName = round === rounds - 1 ? 'Final' :
                             round === rounds - 2 ? 'Semi Finals' :
                             round === rounds - 3 ? 'Quarter Finals' :
                             `Round ${round + 1}`;

            html += `<div class="bracket-round">
                <div class="bracket-round-title">${roundName}</div>`;

            roundMatches.forEach(m => {
                if (m.isBye) return;
                const isActive = !m.completed && m.player1 && m.player2;
                const matchClass = m.completed ? 'completed' : (isActive ? 'active' : '');

                html += `<div class="bracket-match ${matchClass}" data-match-id="${m.id}">
                    <div class="bracket-player ${m.winner?.id === m.player1?.id ? 'winner' : (m.completed && m.winner ? 'loser' : '')}">
                        <span>${m.player1 ? Utils.escapeHtml(m.player1.name) : 'TBD'}</span>
                        <span class="bracket-score">${m.completed && m.winner ? (m.winner.id === m.player1?.id ? '✓' : '') : ''}</span>
                    </div>
                    <div class="bracket-player ${m.winner?.id === m.player2?.id ? 'winner' : (m.completed && m.winner ? 'loser' : '')}">
                        <span>${m.player2 ? Utils.escapeHtml(m.player2.name) : 'TBD'}</span>
                        <span class="bracket-score">${m.completed && m.winner ? (m.winner.id === m.player2?.id ? '✓' : '') : ''}</span>
                    </div>
                </div>`;
            });

            html += '</div>';
        }

        view.innerHTML = html;
        lucide.createIcons();

        // Click handlers for active matches
        view.querySelectorAll('.bracket-match.active').forEach(el => {
            el.addEventListener('click', () => {
                const matchId = el.dataset.matchId;
                const match = tournament.matches.find(m => m.id === matchId);
                if (match && match.player1 && match.player2) {
                    this.startTournamentMatch(match);
                }
            });
        });

        // Check for champion
        if (tournament.champion) {
            this.showChampion(tournament);
        }
    },

    startTournamentMatch(bracketMatch) {
        // Start a regular match, but when complete, advance in bracket
        const origComplete = MatchManager.completeMatch.bind(MatchManager);
        MatchManager.completeMatch = () => {
            MatchManager.stopTimer();
            const state = MatchManager.currentState;
            const winnerId = state.players[state.matchWinner === 'p1' ? 0 : 1].id;

            Tournament.completeMatch(bracketMatch.id, winnerId);

            // Save match record
            const matchRecord = {
                id: Utils.generateId(),
                sport: state.sport,
                mode: state.mode,
                players: state.players.map(p => ({ id: p.id, name: p.name })),
                sets: state.sets,
                setsWon: state.setsWon,
                winner: state.matchWinner,
                winnerName: state.players[state.matchWinner === 'p1' ? 0 : 1].name,
                stats: JSON.parse(JSON.stringify(state.stats)),
                duration: MatchManager.elapsedSeconds,
                timestamp: new Date().toISOString(),
                userId: Auth.currentUser?.id,
                tournamentId: Tournament.current?.id
            };

            const matches = Store.getMatches();
            matches.unshift(matchRecord);
            Store.saveMatches(matches);

            MatchManager.cleanup();

            // Show brief result then go back to bracket
            if (Tournament.current?.champion) {
                this.showChampion(Tournament.current);
            } else {
                Toast.show(`${matchRecord.winnerName} advances!`, 'success');
                Router.navigate('tournament', { render: true });
            }
        };

        MatchManager.startMatch({
            sport: Tournament.current.sport,
            mode: Tournament.current.mode,
            bestOf: Tournament.current.bestOf,
            players: [bracketMatch.player1, bracketMatch.player2],
            firstServer: 'p1'
        });
    },

    showChampion(tournament) {
        const overlay = document.getElementById('champion-overlay');
        overlay.classList.remove('hidden');
        document.getElementById('champion-name').textContent = `${tournament.champion.name} wins!`;
        document.getElementById('champion-tournament').textContent = tournament.name;

        // Build path
        const path = document.getElementById('champion-path');
        const wins = tournament.matches.filter(m =>
            m.completed && m.winner?.id === tournament.champion.id && !m.isBye
        );
        path.innerHTML = '<strong>Tournament Path:</strong><br>' +
            wins.map((m, i) => {
                const opponent = m.player1.id === tournament.champion.id ? m.player2 : m.player1;
                return `Round ${i + 1}: Beat ${opponent.name}`;
            }).join('<br>');

        Confetti.create('champion-confetti');

        // Save completed tournament
        Tournament.saveCompleted();

        lucide.createIcons();
    },

    // ===== GROUP PLAY =====
    renderGroupSetup() {
        const players = Store.getPlayers();
        const grid = document.getElementById('group-player-grid');
        grid.innerHTML = players.map(p => `
            <div class="tourney-player-chip" data-player-id="${p.id}" onclick="this.classList.toggle('selected');UI.updateGroupPlayerCount()">
                <div class="avatar-circle" style="background:${Utils.getAvatarColor(p.name)}">${Utils.getInitials(p.name)}</div>
                <span>${Utils.escapeHtml(p.name)}</span>
            </div>
        `).join('');
        this.updateGroupPlayerCount();
    },

    updateGroupPlayerCount() {
        const selected = document.querySelectorAll('#group-player-grid .selected').length;
        document.getElementById('group-player-count').textContent =
            `${selected} player${selected !== 1 ? 's' : ''} selected (need at least 3)`;
    },

    startGroupPlay() {
        const chips = document.querySelectorAll('#group-player-grid .selected');
        if (chips.length < 3) { Toast.show('Select at least 3 players', 'error'); return; }

        const playerIds = [...chips].map(c => c.dataset.playerId);
        const allPlayers = Store.getPlayers();
        const selectedPlayers = playerIds.map(id => allPlayers.find(p => p.id === id)).filter(Boolean);

        const sport = document.querySelector('[data-group-sport].active')?.dataset.groupSport || 'tennis';
        const matchTime = parseInt(document.querySelector('[data-group-time].active')?.dataset.groupTime || '180');
        const rotation = document.querySelector('[data-group-rotation].active')?.dataset.groupRotation || 'winner-stays';
        const endMode = document.querySelector('[data-group-end].active')?.dataset.groupEnd || 'timer';

        GroupPlay.startSession({
            sport,
            players: selectedPlayers,
            matchTime,
            rotationMode: rotation,
            endMode,
            endTimer: endMode === 'timer' ? 900 : null,
            endWins: endMode === 'wins' ? 5 : null
        });
    },

    renderGroupPlay() {
        const session = GroupPlay.current;
        if (!session || !session.currentMatch) return;

        // Start timers if not already running (e.g. on resume)
        if (!GroupPlay.sessionTimerInterval) GroupPlay.startSessionTimer();
        if (!GroupPlay.matchTimerInterval) GroupPlay.startMatchTimer();

        const match = session.currentMatch;
        const state = match.state;
        const display = Scoring.getScoreDisplay(state);

        // Players
        this.setAvatar('group-p1-avatar', match.p1.name);
        this.setAvatar('group-p2-avatar', match.p2.name);
        document.getElementById('group-p1-name').textContent = match.p1.name;
        document.getElementById('group-p2-name').textContent = match.p2.name;
        document.getElementById('group-score-btn-p1').textContent = match.p1.name;
        document.getElementById('group-score-btn-p2').textContent = match.p2.name;

        // Wins
        document.getElementById('group-p1-wins').textContent = `${match.p1.wins || 0} wins`;
        document.getElementById('group-p2-wins').textContent = `${match.p2.wins || 0} wins`;

        // Leaderboard
        const lb = [...session.players].sort((a, b) => b.wins - a.wins);
        const lbBody = document.getElementById('leaderboard-body');
        lbBody.innerHTML = lb.map((p, i) => {
            const total = p.wins + p.losses;
            const wr = total > 0 ? Math.round((p.wins / total) * 100) : 0;
            return `<tr>
                <td>${i + 1}</td>
                <td><div style="display:flex;align-items:center;gap:6px">
                    <div class="avatar-circle" style="width:24px;height:24px;font-size:0.6rem;background:${Utils.getAvatarColor(p.name)}">${Utils.getInitials(p.name)}</div>
                    ${Utils.escapeHtml(p.name)}
                </div></td>
                <td>${p.wins}</td>
                <td>${p.losses}</td>
                <td>${wr}%</td>
                <td>${p.currentStreak || 0}🔥</td>
            </tr>`;
        }).join('');

        // Queue
        const queueList = document.getElementById('group-queue-list');
        const onCourt = [match.p1.id, match.p2.id];
        const queued = session.players.filter(p => !onCourt.includes(p.id)).slice(0, 5);
        queueList.innerHTML = queued.map(p => `
            <div class="queue-item">
                <div class="avatar-circle" style="width:24px;height:24px;font-size:0.55rem;background:${Utils.getAvatarColor(p.name)}">${Utils.getInitials(p.name)}</div>
                ${Utils.escapeHtml(p.name)}
            </div>
        `).join('');

        lucide.createIcons();
    },

    updateGroupTimers() {
        const session = GroupPlay.current;
        if (!session) return;

        // Session timer
        const sessionEl = document.getElementById('group-session-timer');
        if (sessionEl) sessionEl.textContent = Utils.formatTime(Math.max(0, GroupPlay.sessionSeconds));

        // Match timer
        const matchEl = document.getElementById('group-match-timer');
        if (matchEl) matchEl.textContent = Utils.formatTime(Math.max(0, GroupPlay.matchSeconds));

        // Ring progress
        const ring = document.getElementById('countdown-ring-progress');
        if (ring && session.currentMatch) {
            const total = session.matchTime;
            const remaining = GroupPlay.matchSeconds;
            const pct = remaining / total;
            ring.style.strokeDashoffset = 283 * (1 - pct);
        }
    },

    showGroupTransition(winner) {
        const overlay = document.getElementById('group-transition');
        overlay.classList.remove('hidden');
        document.getElementById('transition-players').innerHTML =
            `<span style="color:var(--accent)">${Utils.escapeHtml(winner.name)}</span> stays!`;

        setTimeout(() => overlay.classList.add('hidden'), 2000);
    },

    showGroupSummary(session) {
        const overlay = document.getElementById('group-summary-overlay');
        overlay.classList.remove('hidden');

        const leaderboard = document.getElementById('summary-leaderboard');
        leaderboard.innerHTML = session.leaderboard.slice(0, 5).map((p, i) => {
            const medals = ['🥇', '🥈', '🥉', '4.', '5.'];
            const total = p.wins + p.losses;
            const wr = total > 0 ? Math.round((p.wins / total) * 100) : 0;
            return `<div style="display:flex;align-items:center;gap:8px;padding:6px 0;${i === 0 ? 'font-weight:700;color:var(--gold)' : ''}">
                <span style="width:24px">${medals[i]}</span>
                <span style="flex:1">${Utils.escapeHtml(p.name)}</span>
                <span>${p.wins}W-${p.losses}L (${wr}%)</span>
            </div>`;
        }).join('');

        const statsDiv = document.getElementById('summary-stats');
        statsDiv.innerHTML = `
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:0.85rem">
                <div><span style="color:var(--text-muted)">Total Matches:</span> ${session.totalMatches}</div>
                <div><span style="color:var(--text-muted)">Duration:</span> ${Utils.formatTime(session.duration)}</div>
                <div><span style="color:var(--text-muted)">Sport:</span> ${session.sport}</div>
                <div><span style="color:var(--text-muted)">Players:</span> ${session.players.length}</div>
            </div>
        `;

        overlay._sessionData = session;
        lucide.createIcons();
    },

    // ===== CLUBS =====
    renderClubs() {
        const user = Auth.currentUser;
        const clubs = Store.getClubs().filter(c =>
            c.members?.some(m => m.userId === user?.id)
        );

        const list = document.getElementById('clubs-list');
        if (clubs.length === 0) {
            list.innerHTML = '<p style="text-align:center;color:var(--text-muted);padding:40px">No clubs yet. Create your first club!</p>';
            return;
        }

        list.innerHTML = clubs.map(c => `
            <div class="club-list-card" onclick="UI.openClub('${c.id}')">
                <div class="club-avatar" style="background:${Utils.getAvatarColor(c.name)}">${Utils.getInitials(c.name)}</div>
                <div class="club-list-info">
                    <h3>${Utils.escapeHtml(c.name)}</h3>
                    <p>${c.members?.length || 0} members • ${c.location || 'No location'}</p>
                </div>
                <i data-lucide="chevron-right" style="color:var(--text-muted)"></i>
            </div>
        `).join('');

        lucide.createIcons();
    },

    createClub() {
        document.getElementById('modal-club-title').textContent = 'Create Club';
        document.getElementById('club-edit-id').value = '';
        document.getElementById('club-name-input').value = '';
        document.getElementById('club-description').value = '';
        document.getElementById('club-location').value = '';
        document.getElementById('modal-club').classList.remove('hidden');
    },

    saveClub(e) {
        e.preventDefault();
        const id = document.getElementById('club-edit-id').value;
        const name = document.getElementById('club-name-input').value.trim();
        const description = document.getElementById('club-description').value.trim();
        const location = document.getElementById('club-location').value.trim();

        if (!name) return;

        const clubs = Store.getClubs();
        if (id) {
            const club = clubs.find(c => c.id === id);
            if (club) {
                club.name = name;
                club.description = description;
                club.location = location;
            }
        } else {
            const newClub = {
                id: Utils.generateId(),
                name,
                description,
                location,
                members: [{ userId: Auth.currentUser.id, role: 'admin', joinedAt: new Date().toISOString() }],
                roster: [],
                matches: [],
                createdAt: new Date().toISOString()
            };
            clubs.push(newClub);
        }

        Store.saveClubs(clubs);
        document.getElementById('modal-club').classList.add('hidden');
        this.renderClubs();
        Toast.show(id ? 'Club updated' : 'Club created!', 'success');
    },

    openClub(clubId) {
        this._currentClubId = clubId;
        Router.navigate('club-detail', { clubId });
    },

    renderClubDetail(clubId) {
        const club = Store.getClubs().find(c => c.id === (clubId || this._currentClubId));
        if (!club) return;

        document.getElementById('club-detail-name').innerHTML =
            `<i data-lucide="building-2"></i> ${Utils.escapeHtml(club.name)}`;

        const header = document.getElementById('club-detail-header');
        header.innerHTML = `
            <div class="club-avatar" style="background:${Utils.getAvatarColor(club.name)};width:64px;height:64px;font-size:1.2rem">${Utils.getInitials(club.name)}</div>
            <div style="flex:1">
                <h3 style="font-size:1.2rem">${Utils.escapeHtml(club.name)}</h3>
                <p style="color:var(--text-secondary);font-size:0.85rem">${Utils.escapeHtml(club.description || '')}</p>
                <p style="color:var(--text-muted);font-size:0.8rem">${Utils.escapeHtml(club.location || 'No location')} • ${club.members?.length || 0} members</p>
            </div>
        `;

        this.renderClubMembers(club);
        lucide.createIcons();
    },

    renderClubMembers(club) {
        const container = document.getElementById('club-tab-members');
        const users = Store.getUsers();

        container.innerHTML = (club.members || []).map(m => {
            const user = users.find(u => u.id === m.userId);
            if (!user) return '';
            return `<div class="player-card">
                <div class="avatar-circle" style="background:${Utils.getAvatarColor(user.displayName)}">${Utils.getInitials(user.displayName)}</div>
                <div class="player-card-info">
                    <div class="player-card-name">${Utils.escapeHtml(user.displayName)}</div>
                    <div class="player-card-meta">
                        <span class="badge badge-${m.role}">${m.role}</span>
                        <span>Joined ${Utils.formatDate(m.joinedAt)}</span>
                    </div>
                </div>
            </div>`;
        }).join('');

        // Add member button
        container.innerHTML += `
            <button class="btn btn-ghost btn-full mt-2" onclick="UI.inviteClubMember('${club.id}')">
                <i data-lucide="user-plus"></i> Add Member
            </button>`;
    },

    inviteClubMember(clubId) {
        // Simple prompt for username
        const username = prompt('Enter username to add:');
        if (!username) return;

        const user = Store.findUser(username);
        if (!user) { Toast.show('User not found', 'error'); return; }

        const clubs = Store.getClubs();
        const club = clubs.find(c => c.id === clubId);
        if (!club) return;

        if (club.members.some(m => m.userId === user.id)) {
            Toast.show('User is already a member', 'error');
            return;
        }

        club.members.push({ userId: user.id, role: 'member', joinedAt: new Date().toISOString() });
        Store.saveClubs(clubs);
        this.renderClubDetail(clubId);
        Toast.show(`${user.displayName} added to club!`, 'success');
    },

    // ===== HISTORY =====
    renderHistory() {
        const matches = Store.getMatches();
        const tournaments = Store.getTournaments();
        const groupSessions = Store.getGroupSessions();

        this._renderHistoryMatches(matches);
        this._renderHistoryTournaments(tournaments);
        this._renderHistoryGroupSessions(groupSessions);
    },

    _renderHistoryMatches(matches) {
        const container = document.getElementById('history-matches');
        if (!matches.length) {
            container.innerHTML = '<p style="text-align:center;color:var(--text-muted);padding:40px">No matches yet</p>';
            return;
        }

        container.innerHTML = matches.slice(0, 50).map(m => {
            const score = m.sets.filter(s => s.p1 || s.p2).map(s => `${s.p1 || 0}-${s.p2 || 0}`).join(', ');
            return `<div class="history-item" onclick="UI.shareMatch('${m.id}')">
                <span style="font-size:1.5rem">${m.sport === 'tennis' ? '🎾' : '🏓'}</span>
                <div class="history-item-info">
                    <div class="history-item-title">${m.players.map(p => Utils.escapeHtml(p.name)).join(' vs ')}</div>
                    <div class="history-item-detail">${score} • ${m.mode}</div>
                </div>
                <div style="text-align:right">
                    <div class="history-item-date">${Utils.formatDate(m.timestamp)}</div>
                    <button class="btn-icon" onclick="event.stopPropagation();UI.shareMatch('${m.id}')" title="Share">
                        <i data-lucide="share-2"></i>
                    </button>
                </div>
            </div>`;
        }).join('');

        lucide.createIcons();
    },

    _renderHistoryTournaments(tournaments) {
        const container = document.getElementById('history-tournaments');
        if (!tournaments.length) {
            container.innerHTML = '<p style="text-align:center;color:var(--text-muted);padding:40px">No tournaments yet</p>';
            return;
        }

        container.innerHTML = tournaments.map(t => `
            <div class="history-item">
                <span style="font-size:1.5rem">🏆</span>
                <div class="history-item-info">
                    <div class="history-item-title">${Utils.escapeHtml(t.name)}</div>
                    <div class="history-item-detail">Champion: ${t.champion ? Utils.escapeHtml(t.champion.name) : 'TBD'} • ${t.matches?.filter(m => m.completed).length || 0} matches</div>
                </div>
                <div class="history-item-date">${Utils.formatDate(t.createdAt)}</div>
            </div>
        `).join('');
    },

    _renderHistoryGroupSessions(sessions) {
        const container = document.getElementById('history-group-sessions');
        if (!sessions.length) {
            container.innerHTML = '<p style="text-align:center;color:var(--text-muted);padding:40px">No group sessions yet</p>';
            return;
        }

        container.innerHTML = sessions.map(s => `
            <div class="history-item">
                <span style="font-size:1.5rem">👥</span>
                <div class="history-item-info">
                    <div class="history-item-title">Group Play • ${Utils.formatTime(s.duration)}</div>
                    <div class="history-item-detail">${s.totalMatches} matches • Winner: ${s.leaderboard?.[0] ? Utils.escapeHtml(s.leaderboard[0].name) : 'N/A'}</div>
                </div>
                <div class="history-item-date">${Utils.formatDate(s.timestamp)}</div>
            </div>
        `).join('');
    },

    // ===== SHARE =====
    shareMatch(matchId) {
        const match = Store.getMatches().find(m => m.id === matchId);
        if (!match) return;

        document.getElementById('modal-share').classList.remove('hidden');
        CardTemplates.options.template = 1;
        this.updateSharePreview(match);
    },

    shareFromComplete(type) {
        let data;
        if (type === 'match') {
            data = document.getElementById('match-complete-overlay')?._matchData;
        } else if (type === 'tournament') {
            data = Tournament.current;
        } else if (type === 'group') {
            data = document.getElementById('group-summary-overlay')?._sessionData;
        }

        if (!data) return;
        document.getElementById('modal-share').classList.remove('hidden');
        CardTemplates.options.template = 1;
        this.updateSharePreview(data);
    },

    updateSharePreview(data) {
        CardTemplates.render(data);
    },

    exportPNG() {
        const canvas = document.getElementById('share-canvas');
        canvas.toBlob(blob => {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `scoretrack-${Date.now()}.png`;
            a.click();
            URL.revokeObjectURL(url);
            Toast.show('Image downloaded!', 'success');
        }, 'image/png');
    },

    async exportClipboard() {
        const canvas = document.getElementById('share-canvas');
        try {
            const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
            await navigator.clipboard.write([
                new ClipboardItem({ 'image/png': blob })
            ]);
            Toast.show('Copied to clipboard!', 'success');
        } catch (e) {
            Toast.show('Clipboard access denied', 'error');
        }
    },

    // ===== PROFILE =====
    renderProfile() {
        const user = Auth.currentUser;
        if (!user) return;

        const stats = Statistics.getPlayerStats(user.id);
        const card = document.getElementById('profile-card');
        card.innerHTML = `
            <div style="display:flex;align-items:center;gap:16px;margin-bottom:16px">
                <div class="avatar-circle avatar-lg" style="background:${Utils.getAvatarColor(user.displayName)}">${Utils.getInitials(user.displayName)}</div>
                <div>
                    <h3>${Utils.escapeHtml(user.displayName)}</h3>
                    <p style="color:var(--text-secondary)">@${Utils.escapeHtml(user.username)}</p>
                    <span class="badge badge-${user.role}">${user.role}</span>
                </div>
            </div>
            <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px">
                <div class="stat-mini-card">
                    <div><span class="stat-value">${stats.matchesPlayed}</span><span class="stat-label">Matches</span></div>
                </div>
                <div class="stat-mini-card">
                    <div><span class="stat-value">${stats.wins}</span><span class="stat-label">Wins</span></div>
                </div>
                <div class="stat-mini-card">
                    <div><span class="stat-value">${stats.winRate}%</span><span class="stat-label">Win Rate</span></div>
                </div>
            </div>
        `;
    },

    // ===== DATA IMPORT/EXPORT =====
    exportData() {
        const data = Store.exportAll();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `scoretrack-backup-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
        Toast.show('Data exported!', 'success');
    },

    importData(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                Store.importAll(data);
                Toast.show('Data imported! Refreshing...', 'success');
                setTimeout(() => location.reload(), 1000);
            } catch (err) {
                Toast.show('Invalid backup file', 'error');
            }
        };
        reader.readAsText(file);
    }
};

// ============================================================
// EVENT HANDLERS
// ============================================================
const Events = {
    init() {
        // Auth forms
        document.getElementById('form-login')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            try {
                await Auth.login(
                    document.getElementById('login-username').value,
                    document.getElementById('login-password').value
                );
                if (document.getElementById('login-remember').checked) {
                    Store.set('rememberMe', true);
                }
                Auth.initDefaultPlayers();
                UI.updateUserUI();
                Router.navigate('dashboard');
                Toast.show('Welcome back!', 'success');
            } catch (err) {
                Toast.show(err.message, 'error');
            }
        });

        document.getElementById('form-register')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const pw = document.getElementById('reg-password').value;
            const pw2 = document.getElementById('reg-password2').value;
            if (pw !== pw2) { Toast.show('Passwords do not match', 'error'); return; }

            try {
                await Auth.register(
                    document.getElementById('reg-username').value,
                    pw,
                    document.getElementById('reg-displayname').value,
                    document.getElementById('reg-email').value
                );
                Auth.initDefaultPlayers();
                UI.updateUserUI();
                Router.navigate('dashboard');
                Toast.show('Account created! You are the admin.', 'success');
            } catch (err) {
                Toast.show(err.message, 'error');
            }
        });

        // Auth switching
        document.getElementById('goto-register')?.addEventListener('click', (e) => {
            e.preventDefault();
            document.getElementById('auth-login').classList.add('hidden');
            document.getElementById('auth-register').classList.remove('hidden');
        });

        document.getElementById('goto-login')?.addEventListener('click', (e) => {
            e.preventDefault();
            document.getElementById('auth-register').classList.add('hidden');
            document.getElementById('auth-login').classList.remove('hidden');
        });

        // Logout
        document.getElementById('dropdown-logout')?.addEventListener('click', (e) => {
            e.preventDefault();
            Auth.logout();
            Router.showScreen('auth');
            Toast.show('Logged out', 'info');
        });

        // User dropdown
        document.getElementById('user-avatar')?.addEventListener('click', () => {
            document.getElementById('user-dropdown').classList.toggle('hidden');
        });

        // Close dropdown on outside click
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.user-menu')) {
                document.getElementById('user-dropdown')?.classList.add('hidden');
            }
        });

        // Navigation
        document.getElementById('btn-goto-dashboard')?.addEventListener('click', () => Router.navigate('dashboard'));
        document.getElementById('dropdown-admin')?.addEventListener('click', (e) => {
            e.preventDefault();
            window.location.hash = '/admin';
        });
        document.getElementById('btn-admin-back')?.addEventListener('click', () => Router.navigate('dashboard'));
        document.getElementById('btn-admin-403-home')?.addEventListener('click', () => Router.navigate('dashboard'));

        // Dashboard mode cards
        document.getElementById('mode-new-match')?.addEventListener('click', () => Router.navigate('match-setup'));
        document.getElementById('mode-tournament')?.addEventListener('click', () => Router.navigate('tournament-setup'));
        document.getElementById('mode-group-play')?.addEventListener('click', () => Router.navigate('group-setup'));

        // Dashboard nav
        document.getElementById('nav-players')?.addEventListener('click', () => Router.navigate('players'));
        document.getElementById('nav-history')?.addEventListener('click', () => Router.navigate('history'));
        document.getElementById('nav-clubs')?.addEventListener('click', () => Router.navigate('clubs'));

        // Bottom nav
        document.querySelectorAll('.nav-item').forEach(btn => {
            btn.addEventListener('click', () => Router.navigate(btn.dataset.nav));
        });

        // Sport toggle (header)
        document.querySelectorAll('.sport-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.sport-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            });
        });

        // Generic sport selector delegation
        document.addEventListener('click', (e) => {
            const btn = e.target.closest('.sport-select-btn, [data-setup-sport], [data-setup-mode], [data-setup-sets], [data-setup-origin], [data-first-server], [data-tourney-sport], [data-tourney-mode], [data-tourney-format], [data-tourney-sets], [data-tourney-origin], [data-group-sport], [data-group-origin], [data-group-time], [data-group-rotation], [data-group-end], [data-aspect], [data-overlay], [data-chart-period], [data-table-tab], [data-history-tab], [data-club-tab]');
            if (!btn) return;

            // Only toggle siblings in the same parent selector
            const selector = btn.closest('.sport-selector, .chart-toggle, .admin-table-tabs, .history-tabs, .club-detail-tabs');
            if (selector) {
                selector.querySelectorAll('.sport-select-btn, .btn-xs, .tab-btn').forEach(b => b.classList.remove('active'));
            }
            btn.classList.add('active');

            // Handle specific toggles
            if (btn.dataset.tableTab) {
                document.getElementById('table-users').classList.toggle('hidden', btn.dataset.tableTab !== 'users');
                document.getElementById('table-matches').classList.toggle('hidden', btn.dataset.tableTab !== 'matches');
            }
            if (btn.dataset.historyTab) {
                document.getElementById('history-matches').classList.toggle('hidden', btn.dataset.historyTab !== 'matches');
                document.getElementById('history-tournaments').classList.toggle('hidden', btn.dataset.historyTab !== 'tournaments');
                document.getElementById('history-group-sessions').classList.toggle('hidden', btn.dataset.historyTab !== 'group-sessions');
            }
            if (btn.dataset.chartPeriod) {
                Admin.renderActivityChart(btn.dataset.chartPeriod);
            }
            if (btn.dataset.clubTab) {
                document.querySelectorAll('.club-tab-content').forEach(c => c.classList.add('hidden'));
                document.getElementById(`club-tab-${btn.dataset.clubTab}`)?.classList.remove('hidden');
                if (btn.dataset.clubTab === 'members') {
                    const club = Store.getClubs().find(c => c.id === UI._currentClubId);
                    if (club) UI.renderClubMembers(club);
                }
            }

            // Update first server options when player select changes
            if (btn.dataset.firstServer) {
                // already handled
            }
        });

        // Setup mode → doubles toggle
        document.querySelectorAll('[data-setup-mode]').forEach(btn => {
            btn.addEventListener('click', () => {
                const isDoubles = btn.dataset.setupMode === 'doubles';
                document.getElementById('pick-p1-d2')?.classList.toggle('hidden', !isDoubles);
                document.getElementById('pick-p2-d2')?.classList.toggle('hidden', !isDoubles);
            });
        });

        // Player selects → update first server
        ['pick-p1', 'pick-p2'].forEach(id => {
            document.getElementById(id)?.addEventListener('change', () => UI.updateFirstServerOptions());
        });

        // Players
        document.getElementById('btn-add-player')?.addEventListener('click', () => UI.addPlayer());
        document.getElementById('form-player')?.addEventListener('submit', (e) => UI.savePlayer(e));
        document.getElementById('close-modal-player')?.addEventListener('click', () => document.getElementById('modal-player').classList.add('hidden'));
        document.getElementById('cancel-modal-player')?.addEventListener('click', () => document.getElementById('modal-player').classList.add('hidden'));

        // Search players
        document.getElementById('search-players')?.addEventListener('input', Utils.debounce((e) => {
            const q = e.target.value.toLowerCase();
            document.querySelectorAll('.player-card').forEach(card => {
                const name = card.querySelector('.player-card-name')?.textContent.toLowerCase() || '';
                card.style.display = name.includes(q) ? '' : 'none';
            });
        }));

        // Match
        document.getElementById('btn-start-match')?.addEventListener('click', () => UI.startMatch());
        document.getElementById('btn-score-p1')?.addEventListener('click', () => MatchManager.awardPoint('p1'));
        document.getElementById('btn-score-p2')?.addEventListener('click', () => MatchManager.awardPoint('p2'));
        document.getElementById('btn-match-undo')?.addEventListener('click', () => MatchManager.undo());
        document.getElementById('btn-match-retire')?.addEventListener('click', () => {
            if (confirm('Retire this match? The other player wins.')) {
                const state = MatchManager.currentState;
                if (state) {
                    // The current server's opponent wins by retirement
                    const retirePlayer = state.serving === 'p1' ? 'p1' : 'p2';
                    MatchManager.retire(retirePlayer);
                }
            }
        });
        document.getElementById('btn-ace-p1')?.addEventListener('click', () => MatchManager.ace('p1'));
        document.getElementById('btn-ace-p2')?.addEventListener('click', () => MatchManager.ace('p2'));

        // Stats toggle
        document.getElementById('btn-toggle-stats')?.addEventListener('click', () => {
            document.getElementById('match-stats-content')?.classList.toggle('hidden');
        });

        // Match complete
        document.getElementById('btn-complete-close')?.addEventListener('click', () => {
            document.getElementById('match-complete-overlay').classList.add('hidden');
            MatchManager.cleanup();
            Router.navigate('dashboard');
        });
        document.getElementById('btn-share-match')?.addEventListener('click', () => {
            document.getElementById('match-complete-overlay').classList.add('hidden');
            UI.shareFromComplete('match');
        });

        // Tournament
        document.getElementById('btn-generate-bracket')?.addEventListener('click', () => UI.generateTournament());
        document.getElementById('btn-tournament-save')?.addEventListener('click', () => {
            Tournament.save();
            Toast.show('Tournament saved!', 'success');
        });
        document.getElementById('btn-tournament-home')?.addEventListener('click', () => {
            Router.navigate('dashboard');
        });
        document.getElementById('btn-champion-close')?.addEventListener('click', () => {
            document.getElementById('champion-overlay').classList.add('hidden');
            Router.navigate('dashboard');
        });
        document.getElementById('btn-share-tournament')?.addEventListener('click', () => {
            document.getElementById('champion-overlay').classList.add('hidden');
            UI.shareFromComplete('tournament');
        });

        // Group play
        document.getElementById('btn-start-group')?.addEventListener('click', () => UI.startGroupPlay());
        document.getElementById('btn-group-score-p1')?.addEventListener('click', () => GroupPlay.awardPoint('p1'));
        document.getElementById('btn-group-score-p2')?.addEventListener('click', () => GroupPlay.awardPoint('p2'));
        document.getElementById('btn-end-group-session')?.addEventListener('click', () => {
            Confirm.show('End Session?', 'End the current group play session?', () => GroupPlay.endSession());
        });
        document.getElementById('btn-group-summary-close')?.addEventListener('click', () => {
            document.getElementById('group-summary-overlay').classList.add('hidden');
            GroupPlay.cleanup();
            Router.navigate('dashboard');
        });
        document.getElementById('btn-share-group')?.addEventListener('click', () => {
            document.getElementById('group-summary-overlay').classList.add('hidden');
            UI.shareFromComplete('group');
        });

        // Clubs
        document.getElementById('btn-create-club')?.addEventListener('click', () => UI.createClub());
        document.getElementById('form-club')?.addEventListener('submit', (e) => UI.saveClub(e));
        document.getElementById('close-modal-club')?.addEventListener('click', () => document.getElementById('modal-club').classList.add('hidden'));
        document.getElementById('cancel-modal-club')?.addEventListener('click', () => document.getElementById('modal-club').classList.add('hidden'));
        document.getElementById('btn-back-clubs')?.addEventListener('click', () => Router.navigate('clubs'));

        // Share modal
        document.getElementById('close-modal-share')?.addEventListener('click', () => document.getElementById('modal-share').classList.add('hidden'));

        // Template picker
        document.querySelectorAll('.template-card').forEach(card => {
            card.addEventListener('click', () => {
                document.querySelectorAll('.template-card').forEach(c => c.classList.remove('active'));
                card.classList.add('active');
                CardTemplates.setOption('template', parseInt(card.dataset.template));
                // Re-render with current data
                const overlay = document.getElementById('modal-share');
                if (overlay._currentData) {
                    CardTemplates.render(overlay._currentData);
                }
            });
        });

        // Helper to re-render share preview
        const rerenderShare = () => {
            const data = document.getElementById('modal-share')?._currentData;
            if (data) CardTemplates.render(data);
        };

        // Aspect ratio
        document.querySelectorAll('[data-aspect]').forEach(btn => {
            btn.addEventListener('click', () => {
                CardTemplates.setOption('aspect', btn.dataset.aspect);
                rerenderShare();
            });
        });

        // Overlay theme
        document.querySelectorAll('[data-overlay]').forEach(btn => {
            btn.addEventListener('click', () => {
                CardTemplates.setOption('overlay', btn.dataset.overlay);
                rerenderShare();
            });
        });

        // Background color swatches
        document.querySelectorAll('.swatch').forEach(swatch => {
            swatch.addEventListener('click', () => {
                document.querySelectorAll('.swatch').forEach(s => s.classList.remove('active'));
                swatch.classList.add('active');
                CardTemplates.setOption('bgColor', swatch.dataset.bg);
                CardTemplates.setOption('bgImage', null);
                rerenderShare();
            });
        });

        // Background image upload
        document.getElementById('bg-upload')?.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const img = new Image();
            const reader = new FileReader();
            reader.onload = (ev) => {
                img.onload = () => {
                    CardTemplates.setOption('bgImage', img);
                    document.querySelectorAll('.swatch').forEach(s => s.classList.remove('active'));
                    rerenderShare();
                };
                img.src = ev.target.result;
            };
            reader.readAsDataURL(file);
        });

        // Accent color
        document.getElementById('accent-color')?.addEventListener('input', (e) => {
            CardTemplates.setOption('accent', e.target.value);
            rerenderShare();
        });

        // Club branding
        document.getElementById('share-club-branding')?.addEventListener('change', (e) => {
            CardTemplates.setOption('clubBranding', e.target.checked);
        });

        // Export buttons
        document.getElementById('btn-export-png')?.addEventListener('click', () => UI.exportPNG());
        document.getElementById('btn-export-clipboard')?.addEventListener('click', () => UI.exportClipboard());

        // Profile
        document.getElementById('dropdown-profile')?.addEventListener('click', (e) => {
            e.preventDefault();
            Router.navigate('profile');
        });
        document.getElementById('dropdown-settings')?.addEventListener('click', (e) => {
            e.preventDefault();
            Router.navigate('profile');
        });

        // Data export/import
        document.getElementById('btn-export-data')?.addEventListener('click', () => UI.exportData());
        document.getElementById('btn-import-data')?.addEventListener('change', (e) => {
            if (e.target.files[0]) UI.importData(e.target.files[0]);
        });

        // Admin table search & filters
        document.getElementById('search-users')?.addEventListener('input', Utils.debounce((e) => {
            Admin.renderUserTable(1, e.target.value,
                document.getElementById('filter-users-status').value,
                document.getElementById('filter-users-role').value
            );
        }));

        document.getElementById('filter-users-status')?.addEventListener('change', () => {
            Admin.renderUserTable(1, document.getElementById('search-users').value,
                document.getElementById('filter-users-status').value,
                document.getElementById('filter-users-role').value
            );
        });

        document.getElementById('filter-users-role')?.addEventListener('change', () => {
            Admin.renderUserTable(1, document.getElementById('search-users').value,
                document.getElementById('filter-users-status').value,
                document.getElementById('filter-users-role').value
            );
        });

        document.getElementById('search-matches')?.addEventListener('input', Utils.debounce((e) => {
            Admin.renderMatchTable(1, e.target.value,
                document.getElementById('filter-matches-sport').value,
                document.getElementById('filter-matches-mode').value
            );
        }));

        document.getElementById('filter-matches-sport')?.addEventListener('change', () => {
            Admin.renderMatchTable(1, document.getElementById('search-matches').value,
                document.getElementById('filter-matches-sport').value,
                document.getElementById('filter-matches-mode').value
            );
        });

        document.getElementById('filter-matches-mode')?.addEventListener('change', () => {
            Admin.renderMatchTable(1, document.getElementById('search-matches').value,
                document.getElementById('filter-matches-sport').value,
                document.getElementById('filter-matches-mode').value
            );
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (Router.currentScreen === 'match' && MatchManager.currentState) {
                if (e.key === '1' || e.key === 'q') MatchManager.awardPoint('p1');
                if (e.key === '2' || e.key === 'p') MatchManager.awardPoint('p2');
                if (e.key === 'z' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); MatchManager.undo(); }
            }
            if (Router.currentScreen === 'group' && GroupPlay.current) {
                if (e.key === '1' || e.key === 'q') GroupPlay.awardPoint('p1');
                if (e.key === '2' || e.key === 'p') GroupPlay.awardPoint('p2');
            }
        });

        // Score animations — re-trigger on score change
        const observer = new MutationObserver((mutations) => {
            mutations.forEach(m => {
                if (m.type === 'childList' || m.type === 'characterData') {
                    // Score changed — could add sound/haptic here
                }
            });
        });

        // Close modals on overlay click
        document.querySelectorAll('.modal-overlay').forEach(overlay => {
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) overlay.classList.add('hidden');
            });
        });

        // Fix share modal to store current data for re-render
        const origUpdateShare = UI.updateSharePreview.bind(UI);
        UI.updateSharePreview = function(data) {
            document.getElementById('modal-share')._currentData = data;
            origUpdateShare(data);
        };
    }
};

// ============================================================
// INITIALIZATION
// ============================================================
document.addEventListener('DOMContentLoaded', async () => {
    // Initialize Lucide icons
    lucide.createIcons();

    // Initialize auth
    const user = await Auth.init();

    if (user) {
        Auth.initDefaultPlayers();
        UI.updateUserUI();
        Router.navigate('dashboard');
    } else {
        Router.showScreen('auth');
    }

    // Initialize all event handlers
    Events.init();

    // Handle admin route on load
    Router.handleRoute();
});
