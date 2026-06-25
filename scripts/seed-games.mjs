/**
 * Données de test Phase A (émulateur) : 2 parties + 1 lobby coincé.
 * Usage : node scripts/seed-games.mjs
 */
import admin from 'firebase-admin'

process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080'
admin.initializeApp({ projectId: 'rifbound-tcg' })
const db = admin.firestore()
const now = admin.firestore.FieldValue.serverTimestamp()

// Image de démo (data-URI SVG, aucun réseau requis) — simule l'imageUrl
// que renverra la vraie API cartes une fois la clé obtenue.
function demoImg(name, color) {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='200' height='280'>
    <defs><linearGradient id='g' x1='0' y1='0' x2='0' y2='1'>
      <stop offset='0' stop-color='${color}'/><stop offset='1' stop-color='#0a0f18'/></linearGradient></defs>
    <rect width='200' height='280' fill='url(#g)'/>
    <rect x='6' y='6' width='188' height='268' fill='none' stroke='#c8aa6e' stroke-width='2' rx='8'/>
    <text x='100' y='150' fill='#f2e5cd' font-family='Georgia' font-size='22' font-weight='bold' text-anchor='middle'>${name}</text>
  </svg>`
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg)
}

function card(id, name, type, ownerId, zoneId, visibleTo, order, imageUrl = '') {
  return {
    cardId: id, baseCardId: name.toLowerCase().replace(/\s/g, '_'),
    description: { name, type, imageUrl },
    ownerId, controllerId: ownerId, zoneId, order,
    state: { exhausted: false, counters: null, damages: null, buffs: null, visibleTo, groupTo: [] },
    isToken: false,
  }
}

async function makeGame({ ended }) {
  const p1 = 'player_alice', p2 = 'player_bob'
  const gameRef = db.collection('games').doc()
  const roundRef = gameRef.collection('rounds').doc()

  const cards = {}
  let o = 0
  const add = (c) => { cards[c.cardId] = c }
  add(card(`${roundRef.id}_l1`, 'Garen', 'legend', p1, 'legend', 'ALL', o++, demoImg('Garen', '#3a2d4a')))
  add(card(`${roundRef.id}_c1`, 'Lux', 'champion', p1, 'champion', 'ALL', o++, demoImg('Lux', '#3a3018')))
  add(card(`${roundRef.id}_h1`, 'Coup brutal', 'spell', p1, 'hand', 'NOBODY', o++, demoImg('Coup brutal', '#16263a')))
  add(card(`${roundRef.id}_h2`, 'Recrue', 'unit', p1, 'hand', 'NOBODY', o++))
  add(card(`${roundRef.id}_d1`, 'Soldat', 'unit', p1, 'main_deck', 'NOBODY', o++))
  add(card(`${roundRef.id}_l2`, 'Darius', 'legend', p2, 'legend', 'ALL', o++, demoImg('Darius', '#4a2018')))
  add(card(`${roundRef.id}_c2`, 'Sett', 'champion', p2, 'champion', 'ALL', o++, demoImg('Sett', '#3a3018')))
  add(card(`${roundRef.id}_h3`, 'Embuscade', 'spell', p2, 'hand', 'SELF', o++))
  add(card(`${roundRef.id}_b1`, 'Marché noir', 'battlefield', p2, 'battlefield', 'ALL', o++, demoImg('Marché noir', '#2e2418')))

  await gameRef.set({
    lobbyId: `lobby_${gameRef.id.slice(0, 5)}`,
    host: p1,
    mode: 'dual',
    matchFormat: 'BO3',
    deckFormat: 'constructed',
    playerIds: [p1, p2],
    playerNames: { [p1]: { name: 'Alice', teamId: null }, [p2]: { name: 'Bob', teamId: null } },
    currentRoundId: roundRef.id,
    roundResults: ended ? [{ round: 0, winnerId: p1 }] : [],
    createdAt: now, updatedAt: now,
    endedAt: ended ? now : null,
    deletedAt: null,
  })

  await roundRef.set({
    gameId: gameRef.id, round: 1, previousRound: null,
    setup: ended ? 'completed' : 'completed',
    diceWinnerId: p1, tiedPlayerIds: null, firstPlayerId: p1,
    discardedBattlefieldId: null, bfDisplayOrder: null,
    winnerId: ended ? p1 : null,
    currentTurn: { playerId: p2, turn: 3 },
    players: {
      [p1]: { playerId: p1, score: ended ? 2 : 1, hasSubmittedDeck: true, deckList: { legend: null, champion: null, battlefields: [], mainDeck: [], runes: [], sideboard: [] }, legendCard: null, submittedBattlefield: null, battlefieldCard: null, diceRoll: 14, mulliganCount: 0, mulliganDone: true, sideboardDone: true },
      [p2]: { playerId: p2, score: ended ? 0 : 1, hasSubmittedDeck: true, deckList: { legend: null, champion: null, battlefields: [], mainDeck: [], runes: [], sideboard: [] }, legendCard: null, submittedBattlefield: null, battlefieldCard: null, diceRoll: 9, mulliganCount: 1, mulliganDone: true, sideboardDone: true },
    },
    cards,
    updatedAt: now, endedAt: ended ? now : null,
  })

  await gameRef.collection('logs').add({ playerId: p1, description: 'Alice a lancé le dé : 14', createdAt: now })
  await gameRef.collection('logs').add({ playerId: p2, description: 'Bob garde sa main (mulligan 1)', createdAt: now })
  await gameRef.collection('logs').add({ playerId: null, description: 'Début du tour 3 — Bob', createdAt: now })

  return gameRef.id
}

const active = await makeGame({ ended: false })
const done = await makeGame({ ended: true })

// Lobby coincé (pour reset / kick)
const lobbyRef = db.collection('lobbies').doc()
await lobbyRef.set({
  type: 'private', host: 'player_alice', lobbyCode: 'STUCK1', mode: '2v2',
  matchFormat: 'BO1', deckFormat: 'constructed',
  players: {
    player_alice: { playerName: 'Alice', isReady: true, teamId: '1' },
    player_bob: { playerName: 'Bob', isReady: false, teamId: '2' },
  },
  gameId: null, createdAt: now, updatedAt: now, deletedAt: null,
})

console.log('✅ Seed OK')
console.log(`   active game : ${active}`)
console.log(`   ended  game : ${done}`)
console.log(`   stuck lobby : ${lobbyRef.id}`)
process.exit(0)
