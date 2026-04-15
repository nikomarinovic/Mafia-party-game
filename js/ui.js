// ===================== UI / RENDER =====================

// Timer state
let timerInterval = null;
let timerSeconds = 90;
let timerActive = false;

// Voting state
let votingCurrentIdx = 0;
let votingVotes = {};
let votingSelected = null;

// Night state
let nightMafiaTarget = null;
let nightDoctorTarget = null;
let nightDetectiveTarget = null;

// Setup state
let setupStep = 'count'; // 'count' | 'names'
let setupCount = 6;
let setupNames = Array(6).fill('');

// Role reveal state
let roleRevealed = false;

let state = {
  phase: 'setup',
  players: [],
  revealIndex: 0,
  round: 1,
  hasDetective: true,
  eliminatedTonight: null,
  votes: {}
};

function render() {
  // Hide all screens
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));

  switch (state.phase) {
    case 'setup': renderSetup(); break;
    case 'role-reveal': renderRoleReveal(); break;
    case 'night': renderNight(); break;
    case 'day': renderDay(); break;
    case 'voting': renderVoting(); break;
    case 'vote-result': renderVoteResult(); break;
    case 'game-over': renderGameOver(); break;
  }
}

// ===================== SETUP =====================

function renderSetup() {
  const screen = document.getElementById('screen-setup');
  screen.classList.add('active');
  renderSetupStep();
}

function renderSetupStep() {
  const container = document.getElementById('setup-content');

  if (setupStep === 'count') {
    container.innerHTML = `
      <div style="text-align:center;">
        <p style="color:var(--foreground); margin-bottom:1rem; font-weight:500;">How many players?</p>
        <div class="player-count-control">
          <button class="btn-icon" id="count-dec">
            <span class="icon">${Icons.minus}</span>
          </button>
          <span class="count-display display-font" id="count-display">${setupCount}</span>
          <button class="btn-icon" id="count-inc">
            <span class="icon">${Icons.plus}</span>
          </button>
        </div>
        <p class="text-xs" style="color:var(--muted-foreground);">4–12 players</p>
        <p class="text-xs mt-1" style="color:var(--muted-foreground); visibility:${setupCount < 6 ? 'visible' : 'hidden'};">Detective requires 6+ players</p>
      </div>
      <button class="btn btn-primary" id="btn-to-names" style="margin-top:1.5rem;">
        NEXT <span class="icon" style="margin-left:4px;">${Icons.arrowRight}</span>
      </button>
    `;
    document.getElementById('count-dec').addEventListener('click', () => {
      setupCount = Math.max(4, setupCount - 1);
      syncNamesArray();
      renderSetupStep();
    });
    document.getElementById('count-inc').addEventListener('click', () => {
      setupCount = Math.min(12, setupCount + 1);
      syncNamesArray();
      renderSetupStep();
    });
    document.getElementById('btn-to-names').addEventListener('click', () => {
      setupStep = 'names';
      renderSetupStep();
    });
  } else {
    const rows = setupNames.map((name, i) => `
      <div class="name-row">
        <span class="name-index">${i + 1}.</span>
        <input type="text" class="input-field" data-index="${i}" value="${escapeHtml(name)}" placeholder="Player ${i + 1}" maxlength="20" />
      </div>
    `).join('');

    const allNamed = setupNames.every(n => n.trim().length > 0);

    container.innerHTML = `
      <button class="back-btn" id="btn-back-count">
        <span class="icon" style="width:1rem;height:1rem;">${Icons.arrowLeft}</span> Back
      </button>
      <div class="names-list">${rows}</div>
      <button class="btn btn-primary" id="btn-start-game" style="margin-top:1rem;">
        <span class="icon">${Icons.play}</span> START GAME
      </button>
      ${!allNamed ? `<p class="text-xs text-center" style="color:var(--muted-foreground); margin-top:0.5rem;">Empty names will be auto-filled</p>` : ''}
    `;

    document.getElementById('btn-back-count').addEventListener('click', () => {
      setupStep = 'count';
      renderSetupStep();
    });
    document.querySelectorAll('.names-list input').forEach(input => {
      input.addEventListener('input', e => {
        setupNames[parseInt(e.target.dataset.index)] = e.target.value;
      });
    });
    document.getElementById('btn-start-game').addEventListener('click', () => {
      const finalNames = setupNames.map((n, i) => n.trim() || `Player ${i + 1}`);
      startGame(finalNames);
    });
  }
}

function syncNamesArray() {
  while (setupNames.length < setupCount) setupNames.push('');
  setupNames = setupNames.slice(0, setupCount);
}

// ===================== ROLE REVEAL =====================

function renderRoleReveal() {
  const screen = document.getElementById('screen-role-reveal');
  screen.classList.add('active');
  roleRevealed = false;
  renderRoleRevealContent();
}

function renderRoleRevealContent() {
  const player = state.players[state.revealIndex];
  const container = document.getElementById('role-reveal-content');

  document.getElementById('reveal-progress').textContent =
    `Player ${state.revealIndex + 1} of ${state.players.length}`;

  if (!roleRevealed) {
    container.innerHTML = `
      <div class="reveal-hidden">
        <div class="hidden-circle">
          <span class="icon-xl" style="color:var(--muted-foreground);">${Icons.eyeOff}</span>
        </div>
        <h2 class="text-2xl font-bold mb-2 display-font">${escapeHtml(player.name)}</h2>
        <p class="text-sm mb-8" style="color:var(--muted-foreground);">Make sure only you can see the screen</p>
        <button class="btn btn-primary" id="btn-reveal" style="max-width:20rem;">
          <span class="icon">${Icons.eye}</span> REVEAL MY ROLE
        </button>
      </div>
    `;
    document.getElementById('btn-reveal').addEventListener('click', () => {
      roleRevealed = true;
      renderRoleRevealContent();
    });
  } else {
    const isLast = state.revealIndex + 1 >= state.players.length;
    container.innerHTML = `
      <div class="reveal-shown" style="animation:scaleIn 0.3s ease;">
        <div class="role-circle ${player.role}">
          <span style="width:3rem;height:3rem;display:inline-flex;align-items:center;justify-content:center;">
            ${getRoleIconSVG(player.role, '3rem')}
          </span>
        </div>
        <h2 class="text-3xl font-black uppercase tracking-widest mb-2 display-font text-role-${player.role}">
          ${player.role}
        </h2>
        <p class="text-sm mb-8" style="color:var(--muted-foreground); max-width:18rem;">
          ${getRoleDescription(player.role)}
        </p>
        <button class="btn btn-accent animate-pulse-glow" id="btn-pass" style="max-width:20rem;">
          <span class="icon">${Icons.arrowRight}</span>
          ${isLast ? 'START GAME' : 'PASS DEVICE TO NEXT PLAYER'}
        </button>
      </div>
    `;
    document.getElementById('btn-pass').addEventListener('click', () => {
      // Transition
      const screen = document.getElementById('screen-role-reveal');
      screen.style.opacity = '0';
      screen.style.transform = 'scale(0.98)';
      screen.style.transition = 'opacity 0.3s, transform 0.3s';
      setTimeout(() => {
        screen.style.opacity = '';
        screen.style.transform = '';
        screen.style.transition = '';
        nextReveal();
      }, 350);
    });
  }
}

// ===================== NIGHT =====================

function renderNight() {
  const screen = document.getElementById('screen-night');
  screen.classList.add('active');
  nightMafiaTarget = null;
  nightDoctorTarget = null;
  nightDetectiveTarget = null;
  renderNightContent();
}

function renderNightContent() {
  document.getElementById('night-round').textContent = `Night ${state.round}`;
  const alive = getAlivePlayers(state.players);

  // Mafia grid
  renderPlayerGrid('night-mafia-grid', alive, nightMafiaTarget, 'selected-mafia', (id) => {
    nightMafiaTarget = id;
    renderNightContent();
  });

  // Doctor grid
  renderPlayerGrid('night-doctor-grid', alive, nightDoctorTarget, 'selected-doctor', (id) => {
    nightDoctorTarget = nightDoctorTarget === id ? null : id;
    renderNightContent();
  });

  // Detective
  const detSection = document.getElementById('night-detective-section');
  if (state.hasDetective) {
    detSection.style.display = 'block';
    renderPlayerGrid('night-detective-grid', alive, nightDetectiveTarget, 'selected-detective', (id) => {
      nightDetectiveTarget = nightDetectiveTarget === id ? null : id;
      renderNightContent();
    });
  } else {
    detSection.style.display = 'none';
  }

  const btn = document.getElementById('btn-resolve-night');
  btn.disabled = nightMafiaTarget === null;
  btn.onclick = () => {
    resolveNight(nightMafiaTarget, nightDoctorTarget, state.hasDetective ? nightDetectiveTarget : null);
  };
}

function renderPlayerGrid(containerId, players, selectedId, selectedClass, onSelect) {
  const container = document.getElementById(containerId);
  container.innerHTML = '';
  players.forEach(p => {
    const btn = document.createElement('button');
    btn.className = 'player-btn';
    if (p.id === selectedId) btn.classList.add(selectedClass);
    btn.textContent = p.name;
    btn.addEventListener('click', () => onSelect(p.id));
    container.appendChild(btn);
  });
}

// ===================== DAY =====================

function renderDay() {
  const screen = document.getElementById('screen-day');
  screen.classList.add('active');

  // Reset timer
  clearInterval(timerInterval);
  timerSeconds = 90;
  timerActive = false;
  timerInterval = null;

  document.getElementById('day-round').textContent = `Day ${state.round}`;

  const eliminated = state.eliminatedTonight !== null
    ? state.players.find(p => p.id === state.eliminatedTonight)
    : null;

  const elimCard = document.getElementById('day-elim-card');
  if (eliminated) {
    elimCard.className = 'elim-card killed';
    elimCard.innerHTML = `
      <span class="icon-xl" style="color:var(--destructive);display:block;margin:0 auto 0.5rem;">${Icons.skull}</span>
      <p style="color:var(--destructive);font-weight:700;font-size:1.125rem;">${escapeHtml(eliminated.name)}</p>
      <p style="color:var(--muted-foreground);font-size:0.875rem;">was eliminated last night</p>
    `;
  } else {
    elimCard.className = 'elim-card saved';
    elimCard.innerHTML = `
      <span class="icon-xl" style="color:var(--role-doctor);display:block;margin:0 auto 0.5rem;">${Icons.shieldCheck}</span>
      <p style="color:var(--foreground);font-weight:700;font-size:1.125rem;">Nobody was eliminated!</p>
      <p style="color:var(--muted-foreground);font-size:0.875rem;">The doctor saved someone, or no one was targeted</p>
    `;
  }

  // Alive players
  const alive = getAlivePlayers(state.players);
  document.getElementById('day-alive-count').textContent = `Alive (${alive.length})`;
  const aliveGrid = document.getElementById('day-alive-grid');
  aliveGrid.innerHTML = '';
  alive.forEach(p => {
    const div = document.createElement('div');
    div.className = 'alive-card';
    div.textContent = p.name;
    aliveGrid.appendChild(div);
  });

  updateTimerDisplay();

  document.getElementById('btn-timer-toggle').onclick = toggleTimer;
  document.getElementById('btn-start-voting').onclick = startVoting;
}

function toggleTimer() {
  if (timerActive) {
    clearInterval(timerInterval);
    timerInterval = null;
    timerActive = false;
  } else {
    if (timerSeconds <= 0) timerSeconds = 90;
    timerActive = true;
    timerInterval = setInterval(() => {
      timerSeconds = Math.max(0, timerSeconds - 1);
      updateTimerDisplay();
      if (timerSeconds <= 0) {
        clearInterval(timerInterval);
        timerInterval = null;
        timerActive = false;
        document.getElementById('btn-timer-toggle').innerHTML =
          `<span class="icon">${Icons.play}</span> Start`;
      }
    }, 1000);
  }
  updateTimerDisplay();
}

function updateTimerDisplay() {
  const mins = Math.floor(timerSeconds / 60);
  const secs = timerSeconds % 60;
  const display = `${mins}:${secs.toString().padStart(2, '0')}`;
  const el = document.getElementById('timer-display');
  if (el) {
    el.textContent = display;
    el.className = 'timer-display' + (timerSeconds <= 10 ? ' danger' : '');
  }
  const btn = document.getElementById('btn-timer-toggle');
  if (btn) {
    if (timerActive) {
      btn.innerHTML = `<span class="icon">${Icons.pause}</span> Pause`;
    } else {
      btn.innerHTML = `<span class="icon">${Icons.play}</span> Start`;
    }
  }
}

// ===================== VOTING =====================

function renderVoting() {
  const screen = document.getElementById('screen-voting');
  screen.classList.add('active');
  votingCurrentIdx = 0;
  votingVotes = {};
  votingSelected = null;
  renderVotingStep();
}

function renderVotingStep() {
  const alive = getAlivePlayers(state.players);
  const currentVoter = alive[votingCurrentIdx];
  if (!currentVoter) return;

  document.getElementById('voting-progress').textContent =
    `Vote ${votingCurrentIdx + 1} of ${alive.length}`;
  document.getElementById('voting-voter-name').textContent = currentVoter.name;

  const targets = alive.filter(p => p.id !== currentVoter.id);
  const grid = document.getElementById('voting-grid');
  grid.innerHTML = '';
  targets.forEach(p => {
    const btn = document.createElement('button');
    btn.className = 'player-btn' + (votingSelected === p.id ? ' selected-vote' : '');
    btn.textContent = p.name;
    btn.addEventListener('click', () => {
      votingSelected = p.id;
      renderVotingStep();
    });
    grid.appendChild(btn);
  });

  const confirmBtn = document.getElementById('btn-confirm-vote');
  confirmBtn.disabled = votingSelected === null;
  confirmBtn.onclick = () => {
    if (votingSelected === null || !currentVoter) return;
    votingVotes[currentVoter.id] = votingSelected;
    votingSelected = null;

    if (votingCurrentIdx + 1 >= alive.length) {
      // Tally
      const tally = {};
      Object.values(votingVotes).forEach(t => { tally[t] = (tally[t] || 0) + 1; });
      const maxVotes = Math.max(...Object.values(tally));
      const topVoted = Object.entries(tally)
        .filter(([, v]) => v === maxVotes)
        .map(([k]) => parseInt(k));
      state = { ...state, votes: votingVotes };
      voteComplete(topVoted.length === 1 ? topVoted[0] : null);
    } else {
      votingCurrentIdx++;
      renderVotingStep();
    }
  };
}

// ===================== VOTE RESULT =====================

function renderVoteResult() {
  const screen = document.getElementById('screen-vote-result');
  screen.classList.add('active');

  const eliminated = state.eliminatedTonight !== null
    ? state.players.find(p => p.id === state.eliminatedTonight)
    : null;

  // Tally
  const tally = {};
  Object.values(state.votes).forEach(t => { tally[t] = (tally[t] || 0) + 1; });

  const tallyContainer = document.getElementById('vote-tally');
  tallyContainer.innerHTML = '';
  Object.entries(tally)
    .sort(([, a], [, b]) => b - a)
    .forEach(([id, count]) => {
      const p = state.players.find(pl => pl.id === parseInt(id));
      if (!p) return;
      const row = document.createElement('div');
      row.className = 'vote-tally-row';
      row.innerHTML = `
        <span style="flex:1;font-weight:500;font-size:0.875rem;">${escapeHtml(p.name)}</span>
        <span style="color:var(--accent);font-weight:700;">${count} vote${count > 1 ? 's' : ''}</span>
      `;
      tallyContainer.appendChild(row);
    });

  const elimCard = document.getElementById('voteresult-elim-card');
  if (eliminated) {
    elimCard.className = 'elim-card killed';
    elimCard.innerHTML = `
      <span class="icon-xl" style="color:var(--destructive);display:block;margin:0 auto 0.5rem;">${Icons.skull}</span>
      <p style="color:var(--destructive);font-weight:700;font-size:1.125rem;">${escapeHtml(eliminated.name)}</p>
      <p style="color:var(--muted-foreground);font-size:0.875rem;">has been voted out</p>
      <p style="color:rgba(220,220,220,0.6);font-size:0.75rem;margin-top:0.5rem;">
        They were: <span style="font-weight:700;color:var(--role-${eliminated.role});">${eliminated.role.toUpperCase()}</span>
      </p>
    `;
  } else {
    elimCard.className = 'elim-card saved';
    elimCard.innerHTML = `<p style="font-weight:700;">It's a tie! No one is eliminated.</p>`;
  }

  document.getElementById('btn-proceed-night').onclick = proceedToNight;
}

// ===================== GAME OVER =====================

function renderGameOver() {
  const screen = document.getElementById('screen-game-over');
  screen.classList.add('active');

  const winner = checkWinCondition(state.players) || 'civilians';
  const isMafiaWin = winner === 'mafia';

  const heroIcon = document.getElementById('gameover-icon');
  heroIcon.innerHTML = isMafiaWin ? Icons.sword : Icons.trophy;
  heroIcon.style.color = isMafiaWin ? 'var(--role-mafia)' : 'var(--accent)';

  const title = document.getElementById('gameover-title');
  title.textContent = isMafiaWin ? 'MAFIA WINS' : 'CIVILIANS WIN';
  title.style.color = isMafiaWin ? 'var(--role-mafia)' : 'var(--accent)';

  document.getElementById('gameover-subtitle').textContent = isMafiaWin
    ? 'The mafia has taken over the town'
    : 'All mafia members have been eliminated';

  const list = document.getElementById('gameover-players');
  list.innerHTML = '';
  state.players.forEach(p => {
    const row = document.createElement('div');
    row.className = 'player-role-row' + (p.alive ? '' : ' dead');
    row.innerHTML = `
      <span style="color:var(--role-${p.role});display:inline-flex;width:1.25rem;height:1.25rem;">
        ${getRoleIconSVG(p.role, '1.25rem')}
      </span>
      <span style="flex:1;font-weight:500;font-size:0.875rem;">${escapeHtml(p.name)}</span>
      <span style="font-size:0.75rem;font-weight:700;text-transform:uppercase;color:var(--role-${p.role});">${p.role}</span>
      ${!p.alive ? `<span style="color:var(--destructive);display:inline-flex;width:1rem;height:1rem;">${Icons.skull}</span>` : ''}
    `;
    list.appendChild(row);
  });

  document.getElementById('btn-play-again').onclick = () => {
    setupStep = 'count';
    setupCount = 6;
    setupNames = Array(6).fill('');
    resetGame();
  };
}

// ===================== HELPERS =====================

function getRoleIconSVG(role, size = '1.25rem') {
  const svgMap = {
    mafia: Icons.sword,
    detective: Icons.search,
    doctor: Icons.heartPulse,
    civilian: Icons.user,
  };
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${extractSVGContent(svgMap[role] || Icons.user)}</svg>`;
}

function extractSVGContent(svgString) {
  const match = svgString.match(/<svg[^>]*>([\s\S]*?)<\/svg>/i);
  return match ? match[1] : '';
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.appendChild(document.createTextNode(str));
  return div.innerHTML;
}

// ===================== INIT =====================

document.addEventListener('DOMContentLoaded', () => {
  render();
});
