// ===================== GAME STATE LOGIC =====================

function assignRoles(playerNames) {
  const count = playerNames.length;
  const mafiaCount = count <= 6 ? 1 : count <= 9 ? 2 : 3;
  const hasDetective = count >= 6;
  const roles = [];
  for (let i = 0; i < mafiaCount; i++) roles.push('mafia');
  if (hasDetective) roles.push('detective');
  roles.push('doctor');
  while (roles.length < count) roles.push('civilian');
<<<<<<< HEAD
  // Fisher-Yates shuffle
=======
>>>>>>> 899e0a3 (Updated UI)
  for (let i = roles.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [roles[i], roles[j]] = [roles[j], roles[i]];
  }
  const players = playerNames.map((name, i) => ({
    id: i,
    name,
    role: roles[i],
    alive: true,
  }));
  return { players, hasDetective };
}

function createInitialState() {
  return {
    phase: 'setup',
    players: [],
    nightActions: { mafiaTarget: null, detectiveTarget: null, doctorTarget: null },
    eliminatedTonight: null,
    round: 1,
    votes: {},
    revealIndex: 0,
    hasDetective: false,
  };
}

function getAlivePlayers(players) {
  return players.filter(p => p.alive);
}

function checkWinCondition(players) {
  const alive = getAlivePlayers(players);
  const mafiaAlive = alive.filter(p => p.role === 'mafia').length;
  const civiliansAlive = alive.length - mafiaAlive;
  if (mafiaAlive === 0) return 'civilians';
  if (mafiaAlive >= civiliansAlive) return 'mafia';
  return null;
}

function getRoleDescription(role) {
  switch (role) {
    case 'mafia': return 'Eliminate civilians each night. Blend in during the day.';
    case 'detective': return 'Investigate one player each night to learn their role.';
    case 'doctor': return 'Choose one player to protect each night.';
    case 'civilian': return 'Find and vote out the Mafia during the day.';
  }
}

// ===================== GAME ACTIONS =====================

let state = createInitialState();

function startGame(names) {
  const { players, hasDetective } = assignRoles(names);
  state = {
    ...createInitialState(),
    phase: 'role-reveal',
    players,
    hasDetective,
    revealIndex: 0,
  };
  render();
}

function nextReveal() {
  const next = state.revealIndex + 1;
  if (next >= state.players.length) {
    state = { ...state, phase: 'night', revealIndex: 0 };
  } else {
    state = { ...state, revealIndex: next };
  }
  render();
}

function resolveNight(mafiaTarget, doctorTarget, detectiveTarget) {
  const saved = mafiaTarget === doctorTarget;
  const eliminatedId = saved ? null : mafiaTarget;
  const updatedPlayers = state.players.map(p =>
    p.id === eliminatedId ? { ...p, alive: false } : p
  );
  const winner = checkWinCondition(updatedPlayers);
  state = {
    ...state,
    nightActions: { mafiaTarget, doctorTarget, detectiveTarget },
    eliminatedTonight: eliminatedId,
    players: updatedPlayers,
    phase: winner ? 'game-over' : 'day',
  };
  render();
}

function startVoting() {
  state = { ...state, phase: 'voting', votes: {} };
  render();
}

function voteComplete(eliminatedId) {
  const updatedPlayers = state.players.map(p =>
    p.id === eliminatedId ? { ...p, alive: false } : p
  );
  const winner = checkWinCondition(updatedPlayers);
  state = {
    ...state,
    players: updatedPlayers,
    eliminatedTonight: eliminatedId,
    phase: winner ? 'game-over' : 'vote-result',
  };
  render();
}

function proceedToNight() {
  state = {
    ...state,
    phase: 'night',
    round: state.round + 1,
    nightActions: { mafiaTarget: null, detectiveTarget: null, doctorTarget: null },
    eliminatedTonight: null,
    votes: {},
  };
  render();
}

function resetGame() {
  state = createInitialState();
  render();
}
