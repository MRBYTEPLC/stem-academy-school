/* ================================================================
   LOGIN SCREEN — credentials check
   ================================================================ */
/* ================================================================
   [SECTION: AUTHENTICATION — Login / Logout / Inactivity Timer]
   Credentials: user = 1234 |  password = 5678
   Inactivity timeout: 5 minutes idle → 30-second warning → auto logout
   ================================================================ */

// ── Inactivity timer state ──────────────────────────────────────────────────
var IDLE_LIMIT_MS  = 5 * 60 * 1000;   // 5 minutes before warning
var WARN_SECONDS   = 30;               // countdown shown in warning overlay
var   idleTimer      = null;
var   warnTimer      = null;
var   warnCountdown  = WARN_SECONDS;
var   warnInterval   = null;
var   isLoggedIn     = false;

// Reset the idle timer on any user interaction
function resetIdleTimer() {
  if (!isLoggedIn) return;
  clearTimeout(idleTimer);
  hideTimeoutOverlay();
  idleTimer = setTimeout(showTimeoutWarning, IDLE_LIMIT_MS);
}

function showTimeoutWarning() {
  warnCountdown = WARN_SECONDS;
  document.getElementById('timeout-count').textContent = warnCountdown;
  document.getElementById('timeout-overlay').classList.add('show');
  warnInterval = setInterval(() => {
    warnCountdown--;
    document.getElementById('timeout-count').textContent = warnCountdown;
    if (warnCountdown <= 0) {
      clearInterval(warnInterval);
      logOut();
    }
  }, 1000);
}

function hideTimeoutOverlay() {
  document.getElementById('timeout-overlay').classList.remove('show');
  clearInterval(warnInterval);
}

function stayLoggedIn() {
  hideTimeoutOverlay();
  resetIdleTimer();
}

function logOut() {
  isLoggedIn = false;
  clearTimeout(idleTimer);
  clearInterval(warnInterval);
  hideTimeoutOverlay();
  // Stop any running simulations
  if (typeof pAnimId !== 'undefined' && pAnimId) clearInterval(pAnimId);
  if (typeof sAnimId !== 'undefined' && sAnimId) clearTimeout(sAnimId);
  // Hide all screens, show login
  ['home','app'].forEach(id => document.getElementById(id).classList.remove('active'));
  document.getElementById('login').classList.add('active');
  // Clear input fields for next user
  document.getElementById('login-user').value = '';
  document.getElementById('login-pass').value = '';
  document.getElementById('login-error').textContent = '';
  document.getElementById('nick-field').style.display = 'none';
  document.getElementById('login-nick').value = '';
  // Restore card animation
  var card = document.querySelector('.login-card');
  card.style.opacity   = '1';
  card.style.transform = '';
  card.style.transition = '';
}

// Register all user-interaction events to reset the idle timer
['mousemove','mousedown','keydown','touchstart','touchmove','scroll','wheel','click']
  .forEach(evt => document.addEventListener(evt, resetIdleTimer, { passive: true }));

// ── Login ───────────────────────────────────────────────────────────────────
var NICK_KEY = 'sa_nickname';
var NICK_HISTORY_KEY = 'sa_nick_history';

function doLogin() {
  var user = document.getElementById('login-user').value.trim().toLowerCase();
  var pass = document.getElementById('login-pass').value;
  var nickField = document.getElementById('nick-field');
  var nickInput = document.getElementById('login-nick');

  if (user === 'teacher' && pass === 't1234') {
    var savedNick = localStorage.getItem(NICK_KEY);

    // First time on this device: ask for a nickname before entering
    if (!savedNick && nickField.style.display === 'none') {
      nickField.style.display = 'block';
      nickInput.focus();
      var hint = document.getElementById('login-error');
      hint.style.color = '#16a34a';
      hint.textContent = '✅ Login correct! Now choose a nickname to continue 👇';
      return;
    }

    // If nickname field is visible, validate and save it
    if (nickField.style.display !== 'none') {
      var nick = nickInput.value.trim();
      if (!nick) {
        var errEl2 = document.getElementById('login-error');
        errEl2.style.color = '#ef4444';
        errEl2.textContent = '❌ Please enter a nickname to continue.';
        return;
      }
      saveNickname(nick);
    }

    var card = document.querySelector('.login-card');
    card.style.opacity   = '0';
    card.style.transform = 'scale(1.05)';
    card.style.transition = 'all .4s ease';
    setTimeout(() => {
      document.getElementById('login').classList.remove('active');
      document.getElementById('home').classList.add('active');
      isLoggedIn = true;
      resetIdleTimer();   // start the 5-minute idle clock
      initCounters();     // increment real shared visit counter
      renderWelcome();
      renderOnlineUsers();
      renderComments();
    }, 380);
  } else {
    var errEl = document.getElementById('login-error');
    errEl.style.color = '#ef4444';
    errEl.textContent = '❌ Incorrect username or password. Please try again.';
    var card = document.querySelector('.login-card');
    if (!document.getElementById('shake-style')) {
      var s = document.createElement('style');
      s.id = 'shake-style';
      s.textContent = '@keyframes shake{0%,100%{transform:translateX(0)}20%,60%{transform:translateX(-8px)}40%,80%{transform:translateX(8px)}}';
      document.head.appendChild(s);
    }
    card.style.animation = 'shake .4s ease';
    setTimeout(() => { card.style.animation = ''; }, 420);
    setTimeout(() => { errEl.textContent = ''; }, 3500);
  }
}

// ── Nickname helpers ─────────────────────────────────────────────────────────
function sanitizeText(str) {
  var div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function saveNickname(nick) {
  nick = nick.slice(0, 18);
  localStorage.setItem(NICK_KEY, nick);
  var history = JSON.parse(localStorage.getItem(NICK_HISTORY_KEY) || '[]');
  if (!history.includes(nick)) {
    history.unshift(nick);
    history = history.slice(0, 10); // keep last 10
    localStorage.setItem(NICK_HISTORY_KEY, JSON.stringify(history));
  }
}

function renderWelcome() {
  var nick = localStorage.getItem(NICK_KEY) || 'Student';
  document.getElementById('welcome-nick').textContent = nick;
}

function renderOnlineUsers() {
  var history = JSON.parse(localStorage.getItem(NICK_HISTORY_KEY) || '[]');
  var box = document.getElementById('online-users-list');
  if (!box) return;
  if (history.length === 0) {
    box.innerHTML = '<div class="comment-empty">No nicknames yet on this device.</div>';
    return;
  }
  box.innerHTML = history.map(n => `<span class="online-user-chip">👤 ${sanitizeText(n)}</span>`).join('');
}

function changeNickname() {
  var current = localStorage.getItem(NICK_KEY) || '';
  var nick = prompt('Enter a new nickname:', current);
  if (nick === null) return;
  nick = nick.trim();
  if (!nick) { showToast('⚠️ Nickname cannot be empty.'); return; }
  saveNickname(nick);
  renderWelcome();
  renderOnlineUsers();
  showToast('✅ Nickname updated to: ' + nick);
}

/* ================================================================
   [SECTION: COMMENTS]
   ================================================================ */
var COMMENTS_KEY = 'sa_comments';

function renderComments() {
  var list = document.getElementById('comments-list');
  if (!list) return;
  var comments = JSON.parse(localStorage.getItem(COMMENTS_KEY) || '[]');
  if (comments.length === 0) {
    list.innerHTML = '<div class="comment-empty">No comments yet. Be the first to share feedback! 🌟</div>';
    return;
  }
  list.innerHTML = comments.map(c => `
    <div class="comment-item">
      <div class="c-head"><span>👤 ${sanitizeText(c.nick)}</span><span class="c-time">${sanitizeText(c.time)}</span></div>
      <div>${sanitizeText(c.text)}</div>
    </div>`).join('');
}

function postComment() {
  var input = document.getElementById('comment-input');
  var text = input.value.trim();
  if (!text) { showToast('⚠️ Write something before posting!'); return; }
  var nick = localStorage.getItem(NICK_KEY) || 'Student';
  var comments = JSON.parse(localStorage.getItem(COMMENTS_KEY) || '[]');
  comments.unshift({
    nick: nick,
    text: text.slice(0, 300),
    time: new Date().toLocaleString()
  });
  comments = comments.slice(0, 50); // keep last 50
  localStorage.setItem(COMMENTS_KEY, JSON.stringify(comments));
  input.value = '';
  renderComments();
  showToast('💬 Comment posted! Thanks for your feedback.');
}

/* ================================================================
   [SECTION: SIDEBAR DRAWER — mobile toggle]
   ================================================================ */
function toggleSidebar() {
  var sb = document.getElementById('sidebar');
  var content = document.getElementById('content');
  sb.classList.toggle('open');
  content.classList.toggle('sidebar-open');
}
// Close drawer when tapping outside it (on the dimmed overlay)
document.addEventListener('click', function(e) {
  var sb = document.getElementById('sidebar');
  var toggleBtn = document.getElementById('sidebar-toggle');
  if (!sb || !sb.classList.contains('open')) return;
  if (sb.contains(e.target) || (toggleBtn && toggleBtn.contains(e.target))) return;
  sb.classList.remove('open');
  document.getElementById('content').classList.remove('sidebar-open');
});

// Enter key triggers login while on the login screen
document.addEventListener('keydown', e => {
  if (e.key === 'Enter' && document.getElementById('login').classList.contains('active')) {
    doLogin();
  }
});


/* ================================================================
   [SECTION: VISIT & LIKE COUNTERS]
   Real global visit counter via CountAPI (free, no auth needed).
   Each login from any device/browser increments the shared count.
   Likes remain per-device via localStorage.
   ================================================================ */

var LIKE_KEY  = 'sa_likes';
var VISIT_KEY = 'sa_visits';

function initCounters() {
  // ── Login counter — per-device counter (localStorage). Counts logins
  //    made FROM THIS BROWSER/DEVICE only. A true global counter across
  //    all devices requires a shared backend (e.g. Firebase) — see notes
  //    in [SECTION: ONLINE USERS / COMMENTS] for where to wire that in.
  var v = parseInt(localStorage.getItem(VISIT_KEY) || '0') + 1;
  localStorage.setItem(VISIT_KEY, v);
  document.getElementById('visit-count').textContent = v.toLocaleString();

  // ── Likes — persisted per device ────────────────────────────────
  document.getElementById('like-count').textContent =
    parseInt(localStorage.getItem(LIKE_KEY) || '0').toLocaleString();

  // ── Online now — simulated estimate (no real-time backend yet) ───
  var onlineEl = document.getElementById('online-count');
  onlineEl.textContent = Math.floor(Math.random() * 9) + 2;
  onlineEl.title = 'Estimated value — connect a backend for real-time presence.';
}

function addLike() {
  var likes = parseInt(localStorage.getItem(LIKE_KEY) || '0') + 1;
  localStorage.setItem(LIKE_KEY, likes);
  document.getElementById('like-count').textContent = likes;
  showToast('\u2764\uFE0F  Thanks for the like!  Total: ' + likes);
  var btn = document.querySelector('.like-btn');
  btn.style.transform = 'scale(1.35)';
  setTimeout(() => btn.style.transform = '', 300);
}

/* ================================================================
   [SECTION: NAVIGATION — screen switcher]
   ================================================================ */
var curMod = 0;

function goHome() {
  document.getElementById('home').classList.add('active');
  document.getElementById('app').classList.remove('active');
  resetIdleTimer();
}

function openApp(idx) {
  document.getElementById('home').classList.remove('active');
  document.getElementById('app').classList.add('active');
  switchMod(idx);
  resizeMC();
}

function switchMod(idx) {
  curMod = idx;
  // Update tab highlight
  document.querySelectorAll('.tab-btn').forEach((b, i) => b.classList.toggle('active', i === idx));

  // Modules 0 and 1 use the main canvas; 2-6 use HTML sim panels
  var useCanvas = idx === 0 || idx === 1;
  document.getElementById('cv-wrap').style.display = useCanvas ? 'block' : 'none';
  [2, 3, 4].forEach(n => {
    var p = document.getElementById('sim' + n);
    if (p) p.classList.toggle('active', n === idx);
  });

  // Fill sidebar with instructions for this module
  document.getElementById('sidebar').innerHTML = SIDEBARS[idx] || '';

  // Initialize module-specific logic
  if (useCanvas)  { resetMC(); initPreset(idx); mcZoom = 1; resizeMC(); setTimeout(zoomFitMC, 30); }
  if (idx === 3)  initPLC();
  if (idx === 4)  resetSorter();
  if (idx === 2)  showCF('if');

  // Zoom controls only make sense for canvas modules
  var zc = document.getElementById('zoom-controls');
  if (zc) zc.style.display = useCanvas ? 'flex' : 'none';

  // Update button labels
  document.getElementById('run-btn').style.opacity   = useCanvas ? '1' : '0.4';
  document.getElementById('erase-btn').textContent   = useCanvas ? '🗑 ERASE' : '↺ RESET';
}

function handleRun()   { if (curMod === 0 || curMod === 1) evalNet(); }
function handleErase() {
  if (curMod === 0 || curMod === 1) resetMC();
  else if (curMod === 3) resetPLC();
  else if (curMod === 4) resetSorter();
}

/* ================================================================
   [SECTION: SIDEBAR HTML — instructions per module]
   [MODIFY] Edit the .icard text blocks to change instructions.
   ================================================================ */
var SIDEBARS = {
  // ── Module 0: Math Blocks sidebar ──────────────────────────────
  0: `
  <div class="sb-sec"><h3 class="sb-h-y">🧩 MATH BLOCKS — INSTRUCTIONS</h3>
    <div class="icard ii"><strong>Step 1 — Add INPUT Blocks</strong>Click "🔢 INPUT" button → a number block appears on canvas. <em>Double-click any INPUT to type the number you want!</em></div>
    <div class="icard ii"><strong>Step 2 — Add an Operation</strong>Click ➕ ADD, ✖ MULTIPLY, ➖ SUBTRACT, ➗ DIVIDE, or ⚖ COMPARE.</div>
    <div class="icard ii"><strong>Step 3 — Wire Blocks</strong>Click a right-side circle ● (output), then click a left-side circle ● (input) on another block. A colored wire appears!</div>
    <div class="icard ii"><strong>Step 4 — Add OUTPUT</strong>Place an OUTPUT block at the end — it will display the computed result.</div>
    <div class="icard ii"><strong>Step 5 — Click ▶ RUN</strong>The engine evaluates the whole circuit and shows results in OUTPUT.</div>
    <div class="icard ii"><strong>🗑 ERASE button</strong>Clears the entire canvas so you can start fresh!</div>
    <div class="code-ex">Example circuit:<br>[INPUT: 5] ──▶ [ADD] ──▶ [OUTPUT]<br>[INPUT: 3] ──▶ [   ]<br>Click RUN → OUTPUT shows: 8</div>
  </div>
  <div class="sb-sec"><h3 class="sb-h-y">🛠 ADD BLOCKS</h3>
    <div class="sp-grid">
      <button class="sp-btn spi" onclick="spawnNum()">🔢 INPUT</button>
      <button class="sp-btn spg" onclick="spawnOp('ADD')">➕ ADD</button>
      <button class="sp-btn spg" onclick="spawnOp('MUL')">✖ MULTIPLY</button>
      <button class="sp-btn spg" onclick="spawnOp('SUB')">➖ SUBTRACT</button>
      <button class="sp-btn spg" onclick="spawnOp('DIV')">➗ DIVIDE</button>
      <button class="sp-btn spg" onclick="spawnOp('CMP')">⚖ COMPARE</button>
      <button class="sp-btn spo" onclick="spawnTerm()">🎯 OUTPUT</button>
    </div>
  </div>`,

  // ── Module 1: Logic Gates sidebar ──────────────────────────────
  1: `
  <div class="sb-sec"><h3 class="sb-h-p">⚡ LOGIC GATES — INSTRUCTIONS</h3>
    <div class="icard ig"><strong>🔌 INPUT SWITCH</strong>Click to place. <em>Double-click it on canvas</em> to toggle TRUE🟢 / FALSE🔴. This is your signal source!</div>
    <div class="icard ig"><strong>⚙️ AND Gate</strong>TRUE only if A AND B both ON.<div class="code-ex">Machine: Both hands must press simultaneously to start.</div></div>
    <div class="icard ig"><strong>⚙️ OR Gate</strong>TRUE if A OR B (or both) is ON.<div class="code-ex">Alarm: rings if front door OR window opens.</div></div>
    <div class="icard ig"><strong>⚙️ NOT Gate</strong>Inverts. TRUE→FALSE, FALSE→TRUE.<div class="code-ex">Pump: tank full(TRUE) → stop pump(FALSE).</div></div>
    <div class="icard ig"><strong>⚙️ NAND Gate</strong>FALSE only when BOTH inputs ON.<div class="code-ex">Cutoff: trips only if smoke AND heat trigger together.</div></div>
    <div class="icard ig"><strong>🌿 IF/ELSE</strong>TRUE→top output, FALSE→bottom.<div class="code-ex">IF temp>90 → fan ON; ELSE → fan OFF.</div></div>
    <div class="icard ic"><strong>🔄 FOR / WHILE / DO-WHILE</strong>Connect a switch to see how many loops run based on TRUE/FALSE input.</div>
  </div>
  <div class="sb-sec"><h3 class="sb-h-p">🛠 ADD BLOCKS</h3>
    <div class="sp-grid">
      <button class="sp-btn spi" onclick="spawnSwitch()">🔌 INPUT SWITCH</button>
      <button class="sp-btn spg" onclick="spawnGate('AND')">⚙️ AND</button>
      <button class="sp-btn spg" onclick="spawnGate('OR')">⚙️ OR</button>
      <button class="sp-btn spg" onclick="spawnGate('NOT')">⚙️ NOT</button>
      <button class="sp-btn spg" onclick="spawnGate('NAND')">⚙️ NAND</button>
      <button class="sp-btn spg" onclick="spawnGate('IF_ELSE')">🌿 IF/ELSE</button>
      <button class="sp-btn spc" onclick="spawnGate('FOR')">🔄 FOR</button>
      <button class="sp-btn spc" onclick="spawnGate('WHILE')">🔄 WHILE</button>
      <button class="sp-btn spc" onclick="spawnGate('DO_WHILE')">🔄 DO-WHILE</button>
      <button class="sp-btn spo" onclick="spawnTerm()">🎯 OUTPUT</button>
    </div>
  </div>`,

  // ── Modules 2-5 sidebars (abbreviated — main instructions are inside panel) ──
  2: `<div class="sb-sec"><h3 class="sb-h-c">🔄 CODE FLOW — QUICK REF</h3>
    <div class="icard ic"><strong>IF / ELSE</strong>Checks condition → runs one branch only.<div class="code-ex">IF (today is Saturday OR Sunday):<br>  STAY HOME 🏠<br>ELSE:<br>  GO TO WORK 💼</div></div>
    <div class="icard ic"><strong>FOR Loop</strong>Exact number of repeats. YOU define start, end, step.<div class="code-ex">FOR i=1 TO 5 (step 1):<br>  Ring bell 🔔 × 5 times</div></div>
    <div class="icard ic"><strong>WHILE Loop</strong>Checks BEFORE each run. Never runs if false from start!<div class="code-ex">count=0, limit=4:<br>Run 4 pump cycles then STOP</div></div>
    <div class="icard ic"><strong>DO-WHILE</strong>Runs FIRST, checks AFTER. Always executes at least once!<div class="code-ex">start=99, limit=3:<br>STILL runs once before checking</div></div>
    <div class="icard ic"><strong>Nested IF</strong>An IF inside another IF — second check only runs if first passes.<div class="code-ex">IF pin ok: IF cash<=balance: Dispense</div></div>
    <div class="icard ic"><strong>IF/ELSEIF/ELSE</strong>Checks conditions in order — first TRUE one runs, rest skipped.<div class="code-ex">IF light=="Red": Brake<br>ELSEIF light=="Yellow": SlowDown<br>ELSE: DriveForward</div></div>
    <div class="icard ic"><strong>AND Logic</strong>Both conditions must be TRUE at once.<div class="code-ex">IF hot AND occupied: TurnOnAC</div></div>
    <div class="icard ic"><strong>TEST/CASE</strong>Matches a value against several CASEs; DEFAULT catches the rest.<div class="code-ex">TEST color<br>CASE "Red": ...<br>DEFAULT: Scrap</div></div>
    <div class="icard ii" style="margin-top:6px;"><strong>🛠 Blocks Tip</strong>Each tab below also has its own mini block-canvas. Double-click an INPUT/SWITCH to set its value AND give it a label (e.g. "balance", "snoozes", "light")!</div>
  </div>`,

  3: `<div class="sb-sec"><h3 class="sb-h-y">🏭 CONVEYOR PLC — QUICK REF</h3>
    <div class="icard is"><strong>🛑 E-STOP</strong>Emergency stop. When ACTIVE → motor immediately OFF. Double-click to toggle.</div>
    <div class="icard is"><strong>🟢 START</strong>Energizes the circuit. Double-click to turn ON/OFF.</div>
    <div class="icard is"><strong>👁 SENSOR</strong>Detects each box passing. Sends pulse to COUNTER.</div>
    <div class="icard is"><strong>🔢 COUNTER</strong>Adds 1 for each SENSOR pulse. When count=target → sends STOP signal to MOTOR.</div>
    <div class="icard is"><strong>⚙️ MOTOR</strong>Runs the belt. ON when START=ON AND E-STOP=OFF AND count &lt; target.</div>
    <div class="code-ex">Correct wiring flow:<br>START.out ──▶ MOTOR.in<br>SENSOR.out ──▶ COUNTER.in<br>COUNTER.done ──▶ MOTOR.stop</div>
  </div>`,

  4: `<div class="sb-sec"><h3 class="sb-h-p">🔴 COLOR SORTER — QUICK REF</h3>
    <div class="icard is"><strong>Goal</strong>Write IF/ELSE code so:<br>🔴 Red → Left Bin<br>🟢 Green → Right Bin</div>
    <div class="icard is"><strong>Fill ALL dropdowns</strong>Incomplete = compile error!</div>
    <div class="icard is"><strong>Errors</strong>Same bin both sides = Logic Error. Wrong color = Defect!</div>
    <div class="code-ex">Correct answer:<br>IF (Color == Red):<br>  Route = Left<br>ELSE:<br>  Route = Right</div>
  </div>`
};

/* ================================================================
   [SECTION: MAIN CANVAS ENGINE — used by Math Blocks & Logic Gates]
   ================================================================ */
var mc  = document.getElementById('mc');
var ctx = mc.getContext('2d');
var nodes = {}, conns = [], nc = 0;
var selPin = null, dragId = null, dragOX = 0, dragOY = 0, lastClick = 0;
var editNodeId = null;
var editNodeEngine = null; // set when editing a block inside a mini BlockCanvas (Code Flow)

// Virtual canvas size (internal drawing resolution). The on-screen CSS
// size is this multiplied by mcZoom, so the wrapper can scroll on phones.
var MC_VW = 900, MC_VH = 620;
var mcZoom = 1;

// Color palette for the canvas engine
var C = {
  bg:'#f1f5f9', gH:'#ec4899', cH:'#0ea5e9', mH:'#f59e0b',
  inp:'#f97316', out:'#a855f7', tx:'#1e293b',
  wOn:'#22c55e', wOff:'#ef4444', pDef:'#cbd5e1', pSel:'#6366f1', grid:'#e2e8f0'
};

function resizeMC() {
  // Pick a default zoom so the virtual canvas fits the viewport width on
  // small screens, but never upscale beyond 1x on large screens.
  var availW = mc.parentElement.clientWidth || MC_VW;
  if (mcZoom === 1 && availW < MC_VW) {
    mcZoom = Math.max(0.4, Math.round((availW / MC_VW) * 100) / 100);
  }
  applyMCZoom();
  drawMC();
}
window.addEventListener('resize', resizeMC);

function applyMCZoom() {
  mc.width  = MC_VW;
  mc.height = MC_VH;
  mc.style.width  = (MC_VW * mcZoom) + 'px';
  mc.style.height = (MC_VH * mcZoom) + 'px';
}

function zoomMC(delta) {
  mcZoom = Math.min(2, Math.max(0.3, Math.round((mcZoom + delta) * 100) / 100));
  applyMCZoom();
  drawMC();
  showToast('🔍 Zoom: ' + Math.round(mcZoom * 100) + '%');
}

function zoomFitMC() {
  // Compute bounding box of all current nodes, then pick a zoom + scroll
  // so everything is visible inside the wrapper.
  var vals = Object.values(nodes);
  var wrap = mc.parentElement;
  if (vals.length === 0) { mcZoom = 1; applyMCZoom(); drawMC(); wrap.scrollLeft = 0; wrap.scrollTop = 0; return; }
  var minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
  vals.forEach(n => {
    minX=Math.min(minX,n.x); minY=Math.min(minY,n.y);
    maxX=Math.max(maxX,n.x+n.w); maxY=Math.max(maxY,n.y+n.h);
  });
  var contentW = Math.max(100, maxX-minX+80), contentH = Math.max(100, maxY-minY+80);
  var fitZoom = Math.min(wrap.clientWidth/contentW, wrap.clientHeight/contentH, 1.5);
  mcZoom = Math.max(0.3, Math.round(fitZoom*100)/100);
  applyMCZoom();
  drawMC();
  wrap.scrollLeft = Math.max(0, (minX-30) * mcZoom);
  wrap.scrollTop  = Math.max(0, (minY-30) * mcZoom);
}

// ── Spawn: add blocks to canvas ───────────────────────────────────
function spawnNum() {
  // INPUT block — double-click to edit number
  nc++; var id = `n${nc}`;
  nodes[id] = { id, type:'NUM', val:5, x:60+Math.random()*100, y:80+Math.random()*200, w:110, h:48 };
  drawMC();
}
function spawnOp(op) {
  // Operation block (ADD, MUL, SUB, DIV, CMP)
  nc++; var id = `n${nc}`;
  nodes[id] = { id, type:'OP', op, x:200+Math.random()*150, y:100+Math.random()*180, w:145, h:92, outVal:null };
  drawMC();
}
function spawnSwitch() {
  // INPUT SWITCH — double-click to toggle TRUE/FALSE
  nc++; var id = `n${nc}`;
  nodes[id] = { id, type:'SW', val:false, x:50+Math.random()*80, y:100+Math.random()*180, w:105, h:48 };
  drawMC();
}
function spawnGate(type) {
  // Logic gate or code flow block
  nc++; var id = `n${nc}`;
  var h = type==='IF_ELSE'?118 : ['FOR','WHILE','DO_WHILE'].includes(type)?100 : 92;
  nodes[id] = { id, type, x:120+Math.random()*200, y:80+Math.random()*180, w:150, h, outVal:'?' };
  drawMC();
}
function spawnTerm() {
  // OUTPUT / terminal block
  nc++; var id = `n${nc}`;
  nodes[id] = { id, type:'TERM', disp:'---', x:500+Math.random()*100, y:120+Math.random()*180, w:135, h:62 };
  drawMC();
}
function resetMC() { nodes={}; conns=[]; nc=0; selPin=null; dragId=null; drawMC(); }

function initPreset(idx) {
  // Add default starter blocks when switching to a module
  if (idx === 0) { spawnNum(); spawnNum(); spawnOp('ADD'); spawnTerm(); }
  if (idx === 1) { spawnSwitch(); spawnSwitch(); spawnGate('AND'); spawnTerm(); }
}

/* ── DRAW — renders all nodes and wires ──────────────────────────── */
function drawMC() {
  ctx.clearRect(0, 0, mc.width, mc.height);
  // Background grid
  ctx.fillStyle = C.bg; ctx.fillRect(0,0,mc.width,mc.height); ctx.strokeStyle = C.grid; ctx.lineWidth = 1;
  for (var i=0; i<mc.width; i+=40)  { ctx.beginPath(); ctx.moveTo(i,0); ctx.lineTo(i,mc.height); ctx.stroke(); }
  for (var j=0; j<mc.height; j+=40) { ctx.beginPath(); ctx.moveTo(0,j); ctx.lineTo(mc.width,j); ctx.stroke(); }

  // Draw wires
  conns.forEach(c => {
    var n1 = nodes[c.from], n2 = nodes[c.to]; if (!n1 || !n2) return;
    var ox = n1.x + n1.w, oy = n1.y + n1.h/2;
    if (n1.type==='IF_ELSE') oy = c.oIdx===0 ? n1.y+60 : n1.y+92;
    var ix = n2.x;
    var iy = ['AND','OR','NAND','OP'].includes(n2.type)
             ? (c.iIdx===0 ? n2.y+26 : n2.y+n2.h-26)
             : n2.y + n2.h/2;
    if (n2.type==='TERM') iy = n2.y + n2.h/2;
    ctx.beginPath(); ctx.moveTo(ox, oy);
    ctx.bezierCurveTo((ox+ix)/2, oy, (ox+ix)/2, iy, ix, iy);
    var sv = n1.type==='SW' ? n1.val : n1.type==='NUM' ? n1.val : n1.outVal;
    var active = sv===true || sv==='TRUE' || typeof sv==='number' ||
                   String(sv).includes('Loop') || String(sv).includes('Run');
    ctx.strokeStyle = active ? C.wOn : C.wOff; ctx.lineWidth = 4; ctx.stroke();
  });

  // Draw blocks
  Object.values(nodes).forEach(n => {
    ctx.save();
    // Drop shadow
    ctx.fillStyle = '#000'; ctx.fillRect(n.x+3, n.y+3, n.w, n.h);

    if (n.type === 'NUM') {
      /* INPUT number block */
      ctx.fillStyle='#0a1a08'; ctx.fillRect(n.x,n.y,n.w,n.h);
      ctx.strokeStyle=C.mH; ctx.lineWidth=2; ctx.strokeRect(n.x,n.y,n.w,n.h);
      ctx.fillStyle='#555'; ctx.font="7px 'Share Tech Mono'"; ctx.textAlign='center'; ctx.textBaseline='top';
      ctx.fillText(n.label ? n.label.toUpperCase() : 'INPUT (dbl-click)', n.x+n.w/2, n.y+4);
      ctx.fillStyle=C.mH; ctx.font="bold 20px Orbitron"; ctx.textBaseline='middle';
      ctx.fillText(n.val, n.x+n.w/2, n.y+n.h/2+4);
      drawPin(n.x+n.w, n.y+n.h/2, `${n.id}_out`, '', false);

    } else if (n.type === 'OP') {
      /* Operation block */
      ctx.fillStyle=C.bg; ctx.fillRect(n.x,n.y,n.w,n.h);
      ctx.strokeStyle=C.mH; ctx.lineWidth=3; ctx.strokeRect(n.x,n.y,n.w,n.h);
      ctx.fillStyle=C.mH; ctx.fillRect(n.x,n.y,n.w,28);
      ctx.fillStyle='#111'; ctx.font="bold 11px 'Exo 2'"; ctx.textAlign='center'; ctx.textBaseline='middle';
      var ol = {ADD:'➕ ADD',MUL:'✖ MULTIPLY',SUB:'➖ SUBTRACT',DIV:'➗ DIVIDE',CMP:'⚖ COMPARE'};
      ctx.fillText(ol[n.op]||n.op, n.x+n.w/2, n.y+14);
      ctx.fillStyle = n.outVal!==null ? C.wOn : C.wOff;
      ctx.font="bold 13px 'Share Tech Mono'";
      ctx.fillText(n.outVal!==null ? `= ${n.outVal}` : '= ?', n.x+n.w/2, n.y+62);
      drawPin(n.x,      n.y+26,       `${n.id}_in0`, 'A',   true);
      drawPin(n.x,      n.y+n.h-26,   `${n.id}_in1`, 'B',   true);
      drawPin(n.x+n.w,  n.y+n.h/2,   `${n.id}_out`,  '',    false);

    } else if (n.type === 'SW') {
      /* INPUT SWITCH */
      ctx.fillStyle = n.val ? '#0a2010' : '#1a1210';
      ctx.fillRect(n.x,n.y,n.w,n.h);
      ctx.strokeStyle = n.val ? C.wOn : C.inp; ctx.lineWidth = n.val?3:2;
      ctx.strokeRect(n.x,n.y,n.w,n.h);
      ctx.fillStyle='#555'; ctx.font="7px 'Share Tech Mono'"; ctx.textAlign='center'; ctx.textBaseline='top';
      ctx.fillText(n.label ? n.label.toUpperCase() : 'SWITCH (dbl-click)', n.x+n.w/2, n.y+3);
      ctx.fillStyle = n.val ? C.wOn : C.inp;
      ctx.font="bold 12px 'Share Tech Mono'"; ctx.textBaseline='middle';
      ctx.fillText(n.val ? '🟢 TRUE' : '🔴 FALSE', n.x+n.w/2, n.y+n.h/2+4);
      drawPin(n.x+n.w, n.y+n.h/2, `${n.id}_out`, '', false);

    } else if (['AND','OR','NOT','NAND'].includes(n.type)) {
      /* Logic Gate */
      ctx.fillStyle=C.bg; ctx.fillRect(n.x,n.y,n.w,n.h);
      ctx.strokeStyle=C.gH; ctx.lineWidth=3; ctx.strokeRect(n.x,n.y,n.w,n.h);
      ctx.fillStyle=C.gH; ctx.fillRect(n.x,n.y,n.w,28);
      ctx.fillStyle='#111'; ctx.font="bold 11px 'Exo 2'"; ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.fillText(`⚙️ GATE: ${n.type}`, n.x+n.w/2, n.y+14);
      ctx.fillStyle = n.outVal===true ? C.wOn : C.wOff;
      ctx.font="bold 12px 'Share Tech Mono'";
      ctx.fillText(`OUT: ${n.outVal}`, n.x+n.w/2, n.y+62);
      if (n.type==='NOT') {
        drawPin(n.x, n.y+n.h/2, `${n.id}_in0`, 'IN', true);
      } else {
        drawPin(n.x, n.y+26,      `${n.id}_in0`, 'A',  true);
        drawPin(n.x, n.y+n.h-26,  `${n.id}_in1`, 'B',  true);
      }
      drawPin(n.x+n.w, n.y+n.h/2, `${n.id}_out`, 'OUT', false);

    } else if (n.type === 'IF_ELSE') {
      /* IF/ELSE block */
      ctx.fillStyle=C.bg; ctx.fillRect(n.x,n.y,n.w,n.h);
      ctx.strokeStyle=C.cH; ctx.lineWidth=3; ctx.strokeRect(n.x,n.y,n.w,n.h);
      ctx.fillStyle=C.cH; ctx.fillRect(n.x,n.y,n.w,28);
      ctx.fillStyle='#111'; ctx.font="bold 11px 'Exo 2'"; ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.fillText('🌿 IF – ELSE', n.x+n.w/2, n.y+14);
      ctx.fillStyle=C.tx; ctx.font="10px 'Share Tech Mono'"; ctx.textAlign='left';
      ctx.fillText('→ IF (TRUE)',  n.x+14, n.y+60);
      ctx.fillText('→ ELSE',       n.x+14, n.y+92);
      drawPin(n.x,      n.y+n.h/2, `${n.id}_in0`,  '⚡',  true);
      drawPin(n.x+n.w,  n.y+60,    `${n.id}_out0`,  'IF',  false);
      drawPin(n.x+n.w,  n.y+92,    `${n.id}_out1`,  'ELSE',false);

    } else if (['FOR','WHILE','DO_WHILE'].includes(n.type)) {
      /* Loop block */
      ctx.fillStyle=C.bg; ctx.fillRect(n.x,n.y,n.w,n.h);
      ctx.strokeStyle=C.cH; ctx.lineWidth=3; ctx.strokeRect(n.x,n.y,n.w,n.h);
      ctx.fillStyle=C.cH; ctx.fillRect(n.x,n.y,n.w,28);
      ctx.fillStyle='#111'; ctx.font="bold 10px 'Exo 2'"; ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.fillText(`🔄 ${n.type.replace('_','-')}`, n.x+n.w/2, n.y+14);
      ctx.fillStyle=C.tx; ctx.font="11px 'Share Tech Mono'";
      ctx.fillText(n.outVal==='?' ? 'Runs: ?' : String(n.outVal), n.x+n.w/2, n.y+65);
      drawPin(n.x,      n.y+n.h/2, `${n.id}_in0`,  '⚡',   true);
      drawPin(n.x+n.w,  n.y+n.h/2, `${n.id}_out`,   'LOOP', false);

    } else if (n.type === 'TERM') {
      /* OUTPUT terminal */
      ctx.fillStyle='#0d0820'; ctx.fillRect(n.x,n.y,n.w,n.h);
      ctx.strokeStyle=C.out; ctx.lineWidth=3; ctx.strokeRect(n.x,n.y,n.w,n.h);
      ctx.fillStyle=C.out; ctx.font="bold 9px 'Orbitron'"; ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.fillText('🎯 OUTPUT', n.x+n.w/2, n.y+15);
      var good = n.disp==='TRUE'||Number(n.disp)>0||
                   String(n.disp).toUpperCase().includes('LOOP')||
                   String(n.disp).includes('RUN');
      ctx.fillStyle = good ? C.wOn : C.wOff;
      ctx.font="bold 15px 'Share Tech Mono'";
      ctx.fillText(n.disp, n.x+n.w/2, n.y+43);
      drawPin(n.x, n.y+n.h/2, `${n.id}_in0`, '', true);
    }
    ctx.restore();
  });
}

/* Draw a connector pin circle */
function drawPin(px, py, tag, lbl, isIn) {
  var r = 8, sel = selPin === tag;
  if (sel) { ctx.beginPath(); ctx.arc(px,py,r+3,0,Math.PI*2); ctx.fillStyle=C.cH; ctx.fill(); }
  ctx.beginPath(); ctx.arc(px,py,r,0,Math.PI*2);
  ctx.fillStyle=sel?C.pSel:C.pDef; ctx.strokeStyle='#000'; ctx.lineWidth=2; ctx.fill(); ctx.stroke();
  if (lbl) {
    ctx.fillStyle='#00d4ff'; ctx.font="bold 9px 'Share Tech Mono'";
    ctx.textAlign=isIn?'left':'right'; ctx.textBaseline='middle';
    ctx.fillText(lbl, px+(isIn?13:-13), py);
  }
}

/* ── Mouse / Touch input handling ──────────────────────────────── */
function getMPos(e) {
  var r = mc.getBoundingClientRect();
  var cx = e.touches ? e.touches[0].clientX : e.clientX;
  var cy = e.touches ? e.touches[0].clientY : e.clientY;
  return { x:(cx-r.left)/mcZoom, y:(cy-r.top)/mcZoom };
}

function mcDown(e) {
  var p = getMPos(e), now = Date.now();
  // Double-click / double-tap — toggle switches or open number editor
  if (now - lastClick < 320) {
    for (var n of Object.values(nodes)) {
      if (inNode(p,n)) {
        if (n.type==='SW')  { n.val = !n.val; dragId=null; drawMC(); return; }
        if (n.type==='NUM') { openEdit(n.id);  dragId=null; return; }
      }
    }
  }
  lastClick = now;
  // Pin click detection
  for (var n of Object.values(nodes)) {
    for (var pin of getPins(n)) {
      if (dist2(p,pin) <= 144) { pinClick(pin.tag); return; }
    }
  }
  // Drag detection
  for (var n of Object.values(nodes)) {
    if (inNode(p,n)) { dragId=n.id; dragOX=p.x-n.x; dragOY=p.y-n.y; return; }
  }
  selPin=null; drawMC();
}
function mcMove(e) {
  if (!dragId) return;
  if (e.cancelable) e.preventDefault(); // stop page/wrapper scroll while dragging a block
  var p = getMPos(e), n = nodes[dragId];
  if (n) { n.x=p.x-dragOX; n.y=p.y-dragOY; drawMC(); }
}
function mcUp() { dragId=null; }

function dist2(a,b) { return (a.x-b.x)**2+(a.y-b.y)**2; }
function inNode(p,n)  { return p.x>=n.x&&p.x<=n.x+n.w&&p.y>=n.y&&p.y<=n.y+n.h; }

/* Return all pin positions for a node */
function getPins(n) {
  var ps = [];
  if (n.type==='IF_ELSE') {
    ps.push({x:n.x+n.w,y:n.y+60,tag:`${n.id}_out0`});
    ps.push({x:n.x+n.w,y:n.y+92,tag:`${n.id}_out1`});
    ps.push({x:n.x,y:n.y+n.h/2,tag:`${n.id}_in0`});
    return ps;
  }
  if (!['TERM'].includes(n.type)) ps.push({x:n.x+n.w,y:n.y+n.h/2,tag:`${n.id}_out`});
  if (['AND','OR','NAND','OP'].includes(n.type)) {
    ps.push({x:n.x,y:n.y+26,    tag:`${n.id}_in0`});
    ps.push({x:n.x,y:n.y+n.h-26,tag:`${n.id}_in1`});
  } else if (!['SW','NUM'].includes(n.type)) {
    ps.push({x:n.x,y:n.y+n.h/2,tag:`${n.id}_in0`});
  }
  return ps;
}

function pinClick(tag) {
  if (!selPin) { if (tag.includes('_out')) selPin=tag; }
  else {
    if (tag.includes('_in')) {
      var fp=selPin.split('_out'), fn=fp[0], oi=fp[1]===''?0:parseInt(fp[1]);
      var tp=tag.split('_in'), tn=tp[0], ii=parseInt(tp[1]);
      if (fn!==tn) { conns=conns.filter(c=>!(c.to===tn&&c.iIdx===ii)); conns.push({from:fn,to:tn,iIdx:ii,oIdx:oi}); }
      selPin=null;
    } else selPin=tag;
  }
  drawMC();
}

mc.addEventListener('mousedown',mcDown); mc.addEventListener('mousemove',mcMove); mc.addEventListener('mouseup',mcUp);
mc.addEventListener('touchstart',mcDown,{passive:true}); mc.addEventListener('touchmove',mcMove,{passive:false}); mc.addEventListener('touchend',mcUp);

/* ── INPUT edit overlay (double-click an INPUT/SWITCH block) ────── */
function openEdit(nid) {
  editNodeId = nid;
  editNodeEngine = null; // main canvas
  var n = nodes[nid];
  var numEl = document.getElementById('edit-val');
  var boolEl = document.getElementById('edit-bool');
  var lblRow = document.getElementById('edit-label-row');
  var lblInp = document.getElementById('edit-label');
  var title = document.getElementById('edit-title');
  if (n.type === 'SW') {
    title.textContent = '✏️ SET SWITCH VALUE';
    numEl.style.display = 'none'; boolEl.style.display = 'block';
    boolEl.value = n.val ? 'true' : 'false';
  } else {
    title.textContent = '✏️ SET INPUT VALUE';
    numEl.style.display = 'block'; boolEl.style.display = 'none';
    numEl.value = n.val;
  }
  lblRow.style.display = 'block';
  lblInp.value = n.label || '';
  document.getElementById('edit-overlay').classList.add('show');
  (n.type==='SW'?boolEl:numEl).focus();
}
function confirmEdit() {
  var engine = editNodeEngine;
  var ns = engine ? engine.nodes : nodes;
  if (editNodeId && ns[editNodeId]) {
    var n = ns[editNodeId];
    if (n.type === 'SW') {
      n.val = document.getElementById('edit-bool').value === 'true';
    } else {
      var v = parseFloat(document.getElementById('edit-val').value);
      if (!isNaN(v)) n.val = v;
    }
    var lbl = document.getElementById('edit-label').value.trim();
    n.label = lbl.slice(0, 16);
  }
  cancelEdit();
  if (engine) engine.draw(); else drawMC();
}
function cancelEdit() {
  editNodeId=null; editNodeEngine=null;
  document.getElementById('edit-overlay').classList.remove('show');
}
// Close edit with Enter key
document.getElementById('edit-val').addEventListener('keydown', e => { if(e.key==='Enter') confirmEdit(); if(e.key==='Escape') cancelEdit(); });
document.getElementById('edit-bool').addEventListener('keydown', e => { if(e.key==='Enter') confirmEdit(); if(e.key==='Escape') cancelEdit(); });
document.getElementById('edit-label').addEventListener('keydown', e => { if(e.key==='Enter') confirmEdit(); if(e.key==='Escape') cancelEdit(); });

/* ================================================================
   [SECTION: LOGIC GATES evaluation engine]
   Propagates values through the node graph iteratively.
   ================================================================ */
function evalNet() {
  // Reset computed values
  Object.values(nodes).forEach(n => {
    if (n.type==='TERM') n.disp='---';
    if (n.type==='OP')   n.outVal=null;
    if (['AND','OR','NOT','NAND','IF_ELSE','FOR','WHILE','DO_WHILE'].includes(n.type)) n.outVal='?';
  });
  // Iterate until stable (max iterations to prevent infinite loop)
  var changed=true, it=0, max=Object.keys(nodes).length*6;
  while (changed && it<max) {
    changed=false; it++;
    Object.values(nodes).forEach(n => {
      // Math operations
      if (n.type==='OP' && n.outVal===null) {
        var a=mathUp(n.id,0), b=mathUp(n.id,1);
        if (a!==null && b!==null) {
          if (n.op==='ADD') n.outVal=a+b;
          else if (n.op==='MUL') n.outVal=a*b;
          else if (n.op==='SUB') n.outVal=a-b;
          else if (n.op==='DIV') n.outVal=b!==0?parseFloat((a/b).toFixed(3)):'ERR÷0';
          else if (n.op==='CMP') n.outVal=a>b?`${a}>${b}`:(a<b?`${a}<${b}`:`${a}=${b}`);
          changed=true;
        }
      }
      // Terminal
      if (n.type==='TERM' && n.disp==='---') {
        var v=mathUp(n.id,0);
        if (v!==null) { n.disp=String(v); changed=true; return; }
        var v2=logicUp(n.id,0);
        if (v2!==null) { n.disp=String(v2).toUpperCase(); changed=true; }
      }
      // Logic gates
      if (n.type==='NOT' && n.outVal==='?') { var i0=logicUp(n.id,0); if(i0!==null){n.outVal=!i0;changed=true;} }
      if (['AND','OR','NAND'].includes(n.type) && n.outVal==='?') {
        var i0=logicUp(n.id,0), i1=logicUp(n.id,1);
        if (i0!==null && i1!==null) {
          n.outVal = n.type==='AND'?(i0&&i1):n.type==='OR'?(i0||i1):!(i0&&i1); changed=true;
        }
      }
      if (n.type==='IF_ELSE' && n.outVal==='?') { var c=logicUp(n.id,0); if(c!==null){n.outVal=c;changed=true;} }
      if (['FOR','WHILE','DO_WHILE'].includes(n.type) && n.outVal==='?') {
        var c=logicUp(n.id,0);
        if (c!==null) {
          n.outVal = n.type==='FOR'  ?(c?'10 Loops':'0 Loops') :
                     n.type==='WHILE'?(c?'∞ Loops':'0 Runs')   :
                                       (c?'∞ Loops':'1 Run ⚠️');
          changed=true;
        }
      }
    });
  }
  drawMC();
  showToast('✅ Circuit evaluated! Check the OUTPUT block for results.');
}

function mathUp(tid,idx) {
  var c=conns.find(c=>c.to===tid&&c.iIdx===idx); if(!c)return null;
  var s=nodes[c.from]; if(!s)return null;
  if(s.type==='NUM')return s.val; if(s.type==='OP')return s.outVal; return null;
}
function logicUp(tid,idx) {
  var c=conns.find(c=>c.to===tid&&c.iIdx===idx); if(!c)return null;
  var s=nodes[c.from]; if(!s)return null;
  if(s.type==='SW')return s.val;
  if(s.type==='IF_ELSE'){
    if(s.outVal==='?')return null;
    return c.oIdx===0?(s.outVal?true:null):(!s.outVal?true:null);
  }
  return (s.outVal!=='?'&&s.outVal!==null)?s.outVal:null;
}

/* ================================================================
   [SECTION: CODE FLOW — IF/ELSE, FOR, WHILE, DO-WHILE]
   ================================================================ */
var CF_TABS = ['if','for','while','dw','nested','ifelseif','andlogic','testcase'];
function showCF(tab) {
  CF_TABS.forEach(t => {
    var pane = document.getElementById('cf-'+t);
    if (pane) pane.style.display = t===tab ? 'block' : 'none';
    var btn = document.getElementById('cf-t-'+t);
    if (btn) btn.className = t===tab ? 'gbtn go' : 'gbtn purp';
  });
  // Lazily initialize the mini block-canvas for this tab the first time it's shown
  if (BC[tab] && !BC[tab]._init) { BC[tab]._init = true; BC[tab].resize(); BC[tab].draw(); }
  else if (BC[tab]) { BC[tab].resize(); BC[tab].draw(); }
}

function ifVarChange() {
  var isDay = document.getElementById('if-var').value === 'day';
  document.getElementById('if-num-row').style.display = isDay ? 'none' : 'flex';
  document.getElementById('if-day-row').style.display = isDay ? 'flex' : 'none';
}

function traceOut(id, lines) {
  var el = document.getElementById(id);
  el.textContent = lines.join('\n');
  el.scrollTop = el.scrollHeight;
}

function runIF() {
  var v=document.getElementById('if-var').value, lines=[];
  if (v==='day') {
    var day=document.getElementById('if-day').value;
    var isWE=['Saturday','Sunday'].includes(day);
    lines.push('# IF/ELSE — Day of Week Check','');
    lines.push(`today = "${day}"`,'');
    lines.push('IF (today == "Saturday" OR today == "Sunday"):');
    if (isWE) {
      lines.push(`  → Condition is TRUE ✅  (${day} is a weekend)`);
      lines.push('  → EXECUTE: Stay home 🏠  No work today!','');
      lines.push('Output: STAY HOME — enjoy your day off! 🎉');
      lines.push('','⬆ Only the IF branch ran. ELSE was skipped.');
    } else {
      lines.push(`  → Condition is FALSE ❌  (${day} is a weekday)`);
      lines.push('ELSE:');
      lines.push('  → EXECUTE: Go to work 💼','');
      lines.push(`Output: GO TO WORK — it's ${day}. Have a great day! 💪`);
      lines.push('','⬆ Only the ELSE branch ran. IF was skipped.');
    }
  } else if (v==='temp') {
    var val=+document.getElementById('if-val').value, thr=+document.getElementById('if-thresh').value;
    lines.push('# IF/ELSE — Industrial Temperature Control','');
    lines.push(`temperature = ${val}°C`);
    lines.push(`threshold   = ${thr}°C`,'');
    lines.push(`IF (temperature > threshold):  →  ${val} > ${thr} = ${val>thr}`);
    if (val>thr) { lines.push('  → TRUE ✅ → Turn ON cooling fan 🌀','','✅ FAN ON — overheat prevention activated!'); }
    else         { lines.push('  → FALSE ❌','ELSE:','  → Keep fan OFF','','💤 FAN OFF — temperature is safe.'); }
    lines.push('','⬆ Programs make decisions like this millions of times per second!');
  } else if (v==='speed') {
    var val=+document.getElementById('if-val').value, thr=+document.getElementById('if-thresh').value;
    lines.push('# IF/ELSE — Motor Speed Control','');
    lines.push(`motorSpeed = ${val} RPM`,`maxAllowed = ${thr} RPM`,'');
    lines.push(`IF (motorSpeed > maxAllowed):  →  ${val>thr}`);
    if (val>thr) { lines.push('  → TRUE ✅ → Engage motor brake 🔴','',`⚠️ BRAKE ENGAGED — was ${val-thr} RPM over limit!`); }
    else         { lines.push('  → FALSE ❌','ELSE:','  → Motor continues normally ✅'); }
  } else {
    var val=+document.getElementById('if-val').value, thr=+document.getElementById('if-thresh').value;
    lines.push('# IF/ELSE — Inventory Stock Check','');
    lines.push(`stockLevel = ${val} units`,`minRequired = ${thr} units`,'');
    lines.push(`IF (stockLevel < minRequired):  →  ${val<thr}`);
    if (val<thr) { lines.push('  → TRUE ✅ → Send restock alert 📦🚨','',`Alert: RESTOCK NOW — only ${val} left (need ${thr}+)`); }
    else         { lines.push('  → FALSE ❌','ELSE:','  → No action needed ✅',``,`Status: Stock OK — ${val} units available`); }
  }
  traceOut('if-out', lines);
}

function runFOR() {
  var s=+document.getElementById('for-s').value;
  var e=+document.getElementById('for-e').value;
  var st=Math.max(1,+document.getElementById('for-st').value);
  var actKey=document.getElementById('for-act').value;
  var acts={cookie:'🍪 Drop cookie into box',stamp:'🏷️ Stamp product label',weld:'🔧 Weld joint segment',alarm:'🚨 Sound alarm beep',bell:'🔔 Ring school bell',print:'🖨️ Print a line'};
  var act=acts[actKey]||actKey;
  var lines=['# FOR Loop execution',''];
  lines.push(`FOR i = ${s} TO ${e}  (increment: +${st}  each iteration)`,'');
  var i=s,count=0;
  while(i<=e&&count<25) { lines.push(`  [i = ${i}]  →  ${act}  ✅`); i+=st; count++; }
  if(i<=e) lines.push(`  ... (${Math.ceil((e-s+1)/st)-count} more iterations)`);
  lines.push('','  → i is now '+i+' which is > '+e,'  → Condition i ≤ '+e+' is FALSE → LOOP EXITS','');
  lines.push(`✅ FOR loop complete — ${count} iteration(s) performed.`);
  lines.push('   The program continues to the NEXT line after the loop.');
  traceOut('for-out',lines);
}

function runWHILE() {
  var s=+document.getElementById('wh-s').value;
  var lim=+document.getElementById('wh-l').value;
  var inc=Math.max(1,+document.getElementById('wh-i').value);
  var ctx=document.getElementById('wh-ctx').value;
  var acts={pump:'🏭 Run drain pump cycle',fan:'💨 Keep cooling fan ON',snooze:'😴 Hit snooze button',count:'🔢 Increment counter'};
  var act=acts[ctx]||'Execute action';
  var lines=['# WHILE Loop execution',''];
  lines.push(`counter = ${s}   (starting value)`);
  lines.push(`limit   = ${lim}`,'');
  lines.push('WHILE (counter < '+lim+'):   ← CONDITION IS CHECKED FIRST!','');
  if(s>=lim){
    lines.push(`  → Check: ${s} < ${lim} ?  =  FALSE ❌`);
    lines.push('  → Condition was already FALSE at start!');
    lines.push('  → Loop body NEVER executes — 0 iterations!','');
    lines.push('⚠️ KEY LESSON: WHILE checks BEFORE running.');
    lines.push('   If the condition starts false, nothing happens at all!');
  } else {
    var c=s,its=0;
    while(c<lim&&its<20){
      lines.push(`  → Check: ${c} < ${lim} ?  =  TRUE ✅`);
      lines.push(`  → ${act}`);
      lines.push(`  → counter = ${c} + ${inc} = ${c+inc}`,'');
      c+=inc; its++;
    }
    lines.push(`  → Check: ${c} < ${lim} ?  =  ${c<lim?'TRUE':'FALSE ❌ → EXIT LOOP'}`);
    if(c>=lim){ lines.push('','✅ WHILE loop complete — '+its+' cycle(s).'); }
    else { lines.push('  ... (may continue running...)'); }
  }
  traceOut('wh-out',lines);
}

function runDW() {
  var s=+document.getElementById('dw-s').value;
  var lim=+document.getElementById('dw-l').value;
  var ctx=document.getElementById('dw-ctx').value;
  var acts={alarm:'🚨 Sound alarm siren',test:'🔧 Run machine self-test',hw:'📚 Check homework',menu:'🖥️ Show application menu'};
  var act=acts[ctx]||'Execute action';
  var lines=['# DO-WHILE Loop execution',''];
  lines.push(`start = ${s}   limit = ${lim}`,'');
  lines.push('DO:   ← Body runs FIRST — NO condition check yet!','');
  var c=s, its=0;
  do {
    lines.push(`  [Run #${its+1}]  →  ${act}  (value = ${c})`);
    lines.push(`  WHILE (${c} ≤ ${lim})?  =  ${c<=lim ? 'TRUE ✅  →  loop again':'FALSE ❌  →  EXIT'}`,'');
    its++; c++;
  } while(c<=lim && its<20);
  lines.push(`✅ Total executions: ${its}`);
  if(s>lim) lines.push(`   ⚠️ Even though start(${s}) > limit(${lim}), it still ran ONCE!`);
  lines.push('','KEY LESSON: DO-WHILE ALWAYS runs at least 1 time.');
  lines.push('   The condition is only checked AFTER the first run.');
  traceOut('dw-out',lines);
}

/* ================================================================
   [SECTION: CONVEYOR PLC ENGINE]
   Block-wiring PLC simulator with E-STOP, START, SENSOR,
   COUNTER and MOTOR blocks. Animated box simulation.
   ================================================================ */
var plcc   = document.getElementById('plc-canvas');
var plcCtx = plcc ? plcc.getContext('2d') : null;
var pNodes={},pConns=[],pNc=0,pSelPin=null,pDragId=null,pDOX=0,pDOY=0,pLastClick=0;
var pRunning=false,pAnimId=null,pBoxes=[];

function initPLC() {
  pNodes={};pConns=[];pNc=0;pSelPin=null;pDragId=null;pRunning=false;
  if(pAnimId) clearInterval(pAnimId);
  pBoxes=[];
  if(plcc){plcc.width=plcc.offsetWidth||600;plcc.height=280;}
  drawPLC(); document.getElementById('plc-status').textContent='Status: Add blocks and wire them...';
}

/* [MODIFY] To add a new PLC block type: add entry here and handle in drawPLC() */
function plcSpawn(type) {
  pNc++; var id=`p${pNc}`;
  var cfgs = {
    ESTOP:  {w:105,h:52,label:'🛑 E-STOP',   color:'#ff3355',val:false},
    START:  {w:105,h:52,label:'🟢 START BTN', color:'#00ff88',val:false},
    SENSOR: {w:90,h:50, label:'👁 SENSOR',    color:'#ffffff',val:false},
    COUNTER:{w:125,h:72,label:'🔢 COUNTER',   color:'#ffd60a',count:0,target:8},
    MOTOR:  {w:115,h:62,label:'⚙️ MOTOR',     color:'#a855f7',running:false},
    AND_G:  {w:105,h:72,label:'⚡ AND Gate',  color:'#ff79c6',outVal:false}
  };
  var cfg=cfgs[type]; if(!cfg)return;
  if(type==='SENSOR'){
    // Place the SENSOR right above the START of the conveyor belt by default,
    // so the user can see it line up with the belt's beam position.
    var H=(plcc&&plcc.height)||280;
    pNodes[id]={id,type,...cfg,x:34,y:H-60-cfg.h-6};
  } else {
    pNodes[id]={id,type,...cfg,x:60+Math.random()*50+pNc*30%200,y:60+Math.random()*40+pNc*20%140};
  }
  drawPLC();
}

function getPLCPins(n) {
  var ps=[];
  if(n.type==='ESTOP'||n.type==='START'||n.type==='SENSOR'){
    ps.push({x:n.x+n.w,y:n.y+n.h/2,tag:`${n.id}_out`});
  } else if(n.type==='COUNTER'){
    ps.push({x:n.x,      y:n.y+24,     tag:`${n.id}_in0`});     // sensor input
    ps.push({x:n.x+n.w,  y:n.y+24,     tag:`${n.id}_out`});     // count value out
    ps.push({x:n.x+n.w,  y:n.y+n.h-18, tag:`${n.id}_done`});    // "target reached" signal
  } else if(n.type==='MOTOR'){
    ps.push({x:n.x,y:n.y+18,   tag:`${n.id}_in0`});   // run signal
    ps.push({x:n.x,y:n.y+n.h-18,tag:`${n.id}_stop`}); // stop signal
  } else if(n.type==='AND_G'){
    ps.push({x:n.x,     y:n.y+20,     tag:`${n.id}_in0`});
    ps.push({x:n.x,     y:n.y+n.h-20, tag:`${n.id}_in1`});
    ps.push({x:n.x+n.w, y:n.y+n.h/2,  tag:`${n.id}_out`});
  }
  return ps;
}

function drawPLC() {
  if(!plcCtx)return;
  var W=plcc.width||600, H=plcc.height||280;
  plcCtx.clearRect(0,0,W,H);
  // Grid
  plcCtx.strokeStyle='#060d1a'; plcCtx.lineWidth=1;
  for(var i=0;i<W;i+=30){plcCtx.beginPath();plcCtx.moveTo(i,0);plcCtx.lineTo(i,H);plcCtx.stroke();}
  for(var j=0;j<H;j+=30){plcCtx.beginPath();plcCtx.moveTo(0,j);plcCtx.lineTo(W,j);plcCtx.stroke();}
  // Belt visualization area
  plcCtx.fillStyle='rgba(255,255,255,.02)'; plcCtx.fillRect(0,H-60,W,60);
  plcCtx.strokeStyle='#1e3050'; plcCtx.lineWidth=1; plcCtx.strokeRect(0,H-60,W,60);
  plcCtx.fillStyle='#333'; plcCtx.fillRect(0,H-40,W,18);
  for(var i=0;i<W;i+=30){plcCtx.strokeStyle='#222';plcCtx.lineWidth=1;plcCtx.beginPath();plcCtx.moveTo(i,H-40);plcCtx.lineTo(i,H-22);plcCtx.stroke();}
  plcCtx.fillStyle='#444'; plcCtx.fillText && plcCtx.fillText;
  // Wires
  pConns.forEach(c=>{
    var n1=pNodes[c.fn],n2=pNodes[c.tn]; if(!n1||!n2)return;
    var op=getPLCPins(n1).find(p=>p.tag===c.ft);
    var ip=getPLCPins(n2).find(p=>p.tag===c.tt);
    if(!op||!ip)return;
    plcCtx.beginPath();plcCtx.moveTo(op.x,op.y);
    plcCtx.bezierCurveTo((op.x+ip.x)/2,op.y,(op.x+ip.x)/2,ip.y,ip.x,ip.y);
    // Wire color = active state
    var active=false;
    var src=pNodes[c.fn];
    if(src.type==='START')   active=src.val&&!Object.values(pNodes).some(n=>n.type==='ESTOP'&&n.val);
    if(src.type==='SENSOR')  active=src.val;
    if(src.type==='AND_G')   active=src.outVal;
    if(src.type==='COUNTER') active=c.ft.includes('done')?src.count>=src.target:src.count>0;
    plcCtx.strokeStyle=active?'#00ff88':'#ff3355'; plcCtx.lineWidth=3; plcCtx.stroke();
  });
  // Blocks
  Object.values(pNodes).forEach(n=>{
    plcCtx.save();
    plcCtx.fillStyle='#000'; plcCtx.fillRect(n.x+3,n.y+3,n.w,n.h);
    var fill='#111827';
    if(n.type==='ESTOP'&&n.val)   fill='#2a0008';
    if(n.type==='START'&&n.val)   fill='#0a2010';
    if(n.type==='MOTOR'&&n.running) fill='#1a0a2a';
    if(n.type==='SENSOR')          fill='#ffffff';
    plcCtx.fillStyle=fill; plcCtx.fillRect(n.x,n.y,n.w,n.h);
    plcCtx.strokeStyle=n.color; plcCtx.lineWidth=2; plcCtx.strokeRect(n.x,n.y,n.w,n.h);
    // Header bar
    plcCtx.fillStyle=n.color; plcCtx.fillRect(n.x,n.y,n.w,22);
    plcCtx.fillStyle='#000'; plcCtx.font="bold 9px 'Exo 2'"; plcCtx.textAlign='center'; plcCtx.textBaseline='middle';
    plcCtx.fillText(n.label,n.x+n.w/2,n.y+11);
    // Status text
    plcCtx.font="9px 'Share Tech Mono'"; plcCtx.textBaseline='middle';
    plcCtx.fillStyle = (n.type==='SENSOR') ? '#1e293b' : '#e8f0ff';
    if(n.type==='COUNTER')      plcCtx.fillText(`${n.count} / ${n.target}  boxes`,n.x+n.w/2,n.y+48);
    else if(n.type==='MOTOR')   plcCtx.fillText(n.running?'● RUNNING':'○ STOPPED',n.x+n.w/2,n.y+42);
    else if(n.type==='ESTOP')   plcCtx.fillText(n.val?'● ACTIVE - STOP':'○ CLEAR - OK',n.x+n.w/2,n.y+37);
    else if(n.type==='START')   plcCtx.fillText(n.val?'● ON':'○ OFF',n.x+n.w/2,n.y+37);
    else if(n.type==='AND_G')   plcCtx.fillText(n.outVal?'OUT: TRUE':'OUT: FALSE',n.x+n.w/2,n.y+48);
    else if(n.type==='SENSOR')  plcCtx.fillText(n.val?'PULSE ●':'IDLE ○',n.x+n.w/2,n.y+38);
    // ── SENSOR: draw a red light beam pointing down toward the belt ──
    if(n.type==='SENSOR'){
      var beamX = n.x + n.w/2;
      var beamTopY = n.y + n.h;
      var beamBottomY = H - 40; // top of belt surface
      plcCtx.save();
      plcCtx.strokeStyle = n.val ? '#ff1a3c' : 'rgba(255,26,60,0.35)';
      plcCtx.lineWidth = n.val ? 4 : 2;
      plcCtx.shadowColor = '#ff1a3c';
      plcCtx.shadowBlur = n.val ? 14 : 4;
      plcCtx.beginPath();
      plcCtx.moveTo(beamX, beamTopY);
      plcCtx.lineTo(beamX, beamBottomY);
      plcCtx.stroke();
      // small dot where the beam hits the belt
      plcCtx.shadowBlur = 0;
      plcCtx.fillStyle = n.val ? '#ff1a3c' : 'rgba(255,26,60,0.5)';
      plcCtx.beginPath();
      plcCtx.arc(beamX, beamBottomY, n.val?5:3, 0, Math.PI*2);
      plcCtx.fill();
      plcCtx.restore();
    }
    // Pins
    getPLCPins(n).forEach(p=>{
      var sel=pSelPin===p.tag;
      if(sel){plcCtx.beginPath();plcCtx.arc(p.x,p.y,10,0,Math.PI*2);plcCtx.fillStyle='#00d4ff';plcCtx.fill();}
      plcCtx.beginPath();plcCtx.arc(p.x,p.y,6,0,Math.PI*2);
      plcCtx.fillStyle=sel?'#fff':'#1e3050'; plcCtx.strokeStyle='#000'; plcCtx.lineWidth=1.5; plcCtx.fill(); plcCtx.stroke();
    });
    plcCtx.restore();
  });
  // Animated boxes on belt
  pBoxes.forEach(b=>{
    plcCtx.fillStyle='#b8860b'; plcCtx.fillRect(b.x,H-56,22,22);
    plcCtx.strokeStyle='#ffd60a'; plcCtx.lineWidth=1; plcCtx.strokeRect(b.x,H-56,22,22);
    plcCtx.font='11px Arial'; plcCtx.textAlign='center'; plcCtx.textBaseline='middle';
    plcCtx.fillText('📦',b.x+11,H-45);
  });
}

/* PLC input handling */
function plcGetPos(e) {
  var r=plcc.getBoundingClientRect();
  var cx=e.touches?e.touches[0].clientX:e.clientX;
  var cy=e.touches?e.touches[0].clientY:e.clientY;
  return{x:(cx-r.left)*(plcc.width/r.width),y:(cy-r.top)*(plcc.height/r.height)};
}
function plcDown(e){
  if(!plcc)return;
  var p=plcGetPos(e),now=Date.now();
  if(now-pLastClick<320){
    for(var n of Object.values(pNodes)){
      if(p.x>=n.x&&p.x<=n.x+n.w&&p.y>=n.y&&p.y<=n.y+n.h){
        if(n.type==='START'){n.val=!n.val;drawPLC();return;}
        if(n.type==='ESTOP'){n.val=!n.val;if(n.val)emergencyStop();drawPLC();return;}
        if(n.type==='COUNTER'){var v=prompt('Set COUNTER target:',n.target);if(v&&!isNaN(+v))n.target=+v;drawPLC();return;}
      }
    }
  }
  pLastClick=now;
  for(var n of Object.values(pNodes)){
    for(var pin of getPLCPins(n)){
      if((p.x-pin.x)**2+(p.y-pin.y)**2<=100){plcPinClick(pin.tag,n.id);return;}
    }
  }
  for(var n of Object.values(pNodes)){
    if(p.x>=n.x&&p.x<=n.x+n.w&&p.y>=n.y&&p.y<=n.y+n.h){pDragId=n.id;pDOX=p.x-n.x;pDOY=p.y-n.y;return;}
  }
  pSelPin=null;drawPLC();
}
function plcMove(e){
  if(!pDragId)return;
  var p=plcGetPos(e),n=pNodes[pDragId];
  if(n){n.x=p.x-pDOX;n.y=p.y-pDOY;drawPLC();}
}
function plcUp(){pDragId=null;}
function plcPinClick(tag,nid){
  if(!pSelPin){ if(tag.includes('_out')||tag==='done'||tag.includes('done'))pSelPin=tag; }
  else {
    if(tag.includes('_in')||tag.includes('_stop')){
      var fn=pSelPin.split('_')[0];
      if(fn!==nid){pConns=pConns.filter(c=>!(c.tt===tag));pConns.push({fn,tn:nid,ft:pSelPin,tt:tag});}
      pSelPin=null;
    } else pSelPin=tag;
  }
  drawPLC();
}
if(plcc){
  plcc.addEventListener('mousedown',plcDown);plcc.addEventListener('mousemove',plcMove);plcc.addEventListener('mouseup',plcUp);
  plcc.addEventListener('touchstart',plcDown,{passive:true});plcc.addEventListener('touchmove',plcMove,{passive:true});plcc.addEventListener('touchend',plcUp);
}

function runPLC(){
  var target=parseInt(document.getElementById('plc-tgt').value)||8;
  Object.values(pNodes).forEach(n=>{if(n.type==='COUNTER'){n.target=target;n.count=0;}});
  var motor=Object.values(pNodes).find(n=>n.type==='MOTOR');
  var start=Object.values(pNodes).find(n=>n.type==='START');
  var counter=Object.values(pNodes).find(n=>n.type==='COUNTER');
  if(!motor){showToast('⚠️ Add a MOTOR block first!');return;}
  if(!start){showToast('⚠️ Add a START BUTTON block!');return;}
  if(!counter){showToast('⚠️ Add a COUNTER block!');return;}
  // Auto-start and clear E-STOP
  start.val=true;
  Object.values(pNodes).forEach(n=>{if(n.type==='ESTOP')n.val=false;});
  pRunning=true; pBoxes=[]; var tick=0;
  if(pAnimId) clearInterval(pAnimId);
  var W=plcc.width||600, H=plcc.height||280;
  var sensorN=Object.values(pNodes).find(n=>n.type==='SENSOR');
  pAnimId=setInterval(()=>{
    tick++;
    var estopN=Object.values(pNodes).find(n=>n.type==='ESTOP');
    var startN=Object.values(pNodes).find(n=>n.type==='START');
    var motorN=Object.values(pNodes).find(n=>n.type==='MOTOR');
    var ctrN=Object.values(pNodes).find(n=>n.type==='COUNTER');
    var senN=Object.values(pNodes).find(n=>n.type==='SENSOR');
    if(!motorN||!ctrN)return;
    motorN.running=startN&&startN.val&&!(estopN&&estopN.val)&&ctrN.count<ctrN.target;
    // Spawn boxes
    if(motorN.running&&tick%16===0&&ctrN.count<ctrN.target){pBoxes.push({x:10,counted:false});}
    // Move boxes and detect sensor (detection point = sensor's red beam x position)
    var beamX = senN ? (senN.x + senN.w/2) : (W/2);
    pBoxes.forEach(b=>{
      if(motorN.running)b.x+=5;
      if(!b.counted&&b.x>beamX-15&&b.x<beamX+15&&senN){
        b.counted=true; senN.val=true;
        ctrN.count=Math.min(ctrN.count+1,ctrN.target);
        setTimeout(()=>{if(senN)senN.val=false;},180);
      }
    });
    pBoxes=pBoxes.filter(b=>b.x<W+40);
    if(ctrN.count>=ctrN.target){
      motorN.running=false; clearInterval(pAnimId); pRunning=false;
      document.getElementById('plc-status').textContent=`✅ DONE! ${ctrN.count}/${ctrN.target} boxes — MOTOR STOPPED AUTO`;
      showToast(`🎉 PLC Cycle Complete!\n${ctrN.count} boxes counted → Motor stopped automatically!\nGreat job wiring the block logic correctly!`);
    } else {
      document.getElementById('plc-status').textContent=`⚙️ Running — ${ctrN.count}/${ctrN.target} boxes | Motor: ${motorN.running?'ON':'OFF'}`;
    }
    drawPLC();
  },65);
}
function emergencyStop(){
  if(pAnimId)clearInterval(pAnimId); pRunning=false;
  Object.values(pNodes).forEach(n=>{if(n.type==='MOTOR')n.running=false;});
  document.getElementById('plc-status').textContent='🛑 E-STOP ACTIVE — All outputs CLEARED immediately!';
  showToast('🛑 EMERGENCY STOP triggered!\nAll motor outputs cleared. Reset to restart.');
  drawPLC();
}
function resetPLC(){
  if(pAnimId)clearInterval(pAnimId);
  pNodes={};pConns=[];pNc=0;pSelPin=null;pDragId=null;pRunning=false;pBoxes=[];
  document.getElementById('plc-status').textContent='Status: Add blocks and wire them...';
  drawPLC();
}

/* ================================================================
   [SECTION: COLOR SORTER ENGINE]
   ================================================================ */
// [MODIFY] Change this sequence to change the order of sorted products
var SORT_SEQ = ['Red','Green','Red','Green','Green','Red'];
var sIdx=0, sL=0, sR=0, sAnimId=null;

function resetSorter(){
  if(sAnimId)clearTimeout(sAnimId); sIdx=0;sL=0;sR=0;
  document.getElementById('s-lc').textContent='0';
  document.getElementById('s-rc').textContent='0';
  document.getElementById('s-proc').textContent='0 / 6';
  drawSortIdle();
}

function drawSortIdle(hl){
  var cv=document.getElementById('sort-cv'); if(!cv)return;
  cv.width=cv.offsetWidth||600; cv.height=155;
  var cx=cv.getContext('2d'), W=cv.width;
  cx.clearRect(0,0,W,155);
  // Belt
  cx.fillStyle='#1a1a2e'; cx.fillRect(W/2-150,54,300,22);
  cx.fillStyle='#333'; cx.font="8px 'Share Tech Mono'"; cx.textAlign='center'; cx.textBaseline='middle';
  cx.fillText('CONVEYOR BELT',W/2,65);
  // Left bin
  cx.strokeStyle=hl==='Left'?'#ff3355':'#3a1020'; cx.lineWidth=hl==='Left'?3:1;
  cx.fillStyle='#180810'; cx.fillRect(14,68,145,78); cx.strokeRect(14,68,145,78);
  cx.fillStyle='#ff3355'; cx.font="bold 10px 'Orbitron'"; cx.textAlign='center'; cx.textBaseline='middle';
  cx.fillText('📥 LEFT BIN',87,96); cx.fillText('🔴 RED',87,112); cx.fillText('Count: '+sL,87,128);
  // Right bin
  cx.strokeStyle=hl==='Right'?'#00ff88':'#0a3020'; cx.lineWidth=hl==='Right'?3:1;
  cx.fillStyle='#081810'; cx.fillRect(W-159,68,145,78); cx.strokeRect(W-159,68,145,78);
  cx.fillStyle='#00ff88'; cx.font="bold 10px 'Orbitron'"; cx.textAlign='center';
  cx.fillText('📥 RIGHT BIN',W-87,96); cx.fillText('🟢 GREEN',W-87,112); cx.fillText('Count: '+sR,W-87,128);
  // Sensor
  cx.fillStyle='#222'; cx.beginPath(); cx.arc(W/2,48,14,0,Math.PI*2); cx.fill();
  cx.strokeStyle='#555'; cx.lineWidth=2; cx.stroke();
  cx.fillStyle='#666'; cx.font="8px 'Share Tech Mono'"; cx.textAlign='center'; cx.textBaseline='middle';
  cx.fillText('COLOR SENSOR',W/2,28);
}

function runSorter(){
  var ifc=document.getElementById('s-ifc').value;
  var ifb=document.getElementById('s-ifb').value;
  var elb=document.getElementById('s-elb').value;
  if(!ifc||!ifb||!elb){showToast('⚠️ Please fill in all three drop-down fields before running!');return;}
  if(ifb===elb){showToast('❌ Logic Error: Your IF and ELSE branches route to the same bin!');return;}
  var redDest=ifc==='Red'?ifb:elb;
  var grnDest=ifc==='Green'?ifb:elb;
  if(redDest!=='Left'||grnDest!=='Right'){
    showToast(`❌ Incorrect logic detected:\n  Red → ${redDest}  (must be Left)\n  Green → ${grnDest}  (must be Right)\n\nFix your IF/ELSE and try again!`); return;
  }
  sIdx=0;sL=0;sR=0;
  document.getElementById('s-lc').textContent='0';
  document.getElementById('s-rc').textContent='0';
  animSort();
}
function animSort(){
  if(sIdx>=SORT_SEQ.length){
    drawSortIdle();
    showToast(`🎉 PERFECT SORT — Zero defects!\n🔴 Red → Left:  ${sL} products\n🟢 Green → Right: ${sR} products\n\nThis is how real PLC sorting machines work!`); return;
  }
  var color=SORT_SEQ[sIdx];
  var dest=color==='Red'?'Left':'Right';
  if(dest==='Left')sL++;else sR++;
  sIdx++;
  document.getElementById('s-lc').textContent=sL;
  document.getElementById('s-rc').textContent=sR;
  document.getElementById('s-proc').textContent=`${sIdx} / ${SORT_SEQ.length}`;
  var cv=document.getElementById('sort-cv'); if(!cv)return;
  cv.width=cv.offsetWidth||600; cv.height=155;
  var cx=cv.getContext('2d'),W=cv.width;
  drawSortIdle(dest);
  // Product on sensor
  cx.fillStyle=color==='Red'?'#ff3355':'#00ff88';
  cx.beginPath();cx.arc(W/2,48,14,0,Math.PI*2);cx.fill();
  cx.fillStyle='#fff';cx.font="bold 9px 'Share Tech Mono'";cx.textAlign='center';cx.textBaseline='middle';
  cx.fillText(color==='Red'?'R':'G',W/2,48);
  cx.fillStyle='#ffd60a';cx.font="bold 9px 'Share Tech Mono'";cx.textBaseline='bottom';
  cx.fillText('Detected: '+color,W/2,44);
  // Arrow to bin
  var ax=dest==='Left'?87:W-87;
  cx.strokeStyle=dest==='Left'?'#ff3355':'#00ff88';cx.lineWidth=4;
  cx.beginPath();cx.moveTo(W/2,62);cx.lineTo(ax,92);cx.stroke();
  cx.fillStyle=dest==='Left'?'#ff3355':'#00ff88';
  cx.beginPath();cx.arc(ax,96,7,0,Math.PI*2);cx.fill();
  sAnimId=setTimeout(animSort,960);
}

/* ================================================================
   [SECTION: TOAST — notification popup]
   ================================================================ */
var toastTimer=null;
function showToast(msg){
  var t=document.getElementById('toast');
  t.textContent=msg; t.classList.add('show');
  if(toastTimer)clearTimeout(toastTimer);
  toastTimer=setTimeout(()=>t.classList.remove('show'),5000);
}

/* ================================================================
   [SECTION: STARTUP INIT]
   ================================================================ */
/* ================================================================
   [SECTION: CODE FLOW — extra real-life examples (run-example traces)]
   IF/ELSEIF/ELSE, Nested IF, AND Logic, TEST/CASE
   ================================================================ */

// 1. Smart Traffic Light — IF / ELSEIF / ELSE
function runCF2Traffic() {
  var light = document.getElementById('cf2-light').value;
  var lines = ['# Smart Traffic Light — IF / ELSEIF / ELSE', ''];
  lines.push(`traffic_light = "${light}"`, '');
  lines.push(`IF traffic_light == "Red":   →  ${light==='Red'}`);
  if (light === 'Red') {
    lines.push('  → TRUE ✅ → BrakeCar 🛑', '', 'Output: BRAKE — the light is red, stop the car!');
  } else {
    lines.push(`ELSEIF traffic_light == "Yellow":  →  ${light==='Yellow'}`);
    if (light === 'Yellow') {
      lines.push('  → TRUE ✅ → SlowDown 🐢', '', 'Output: SLOW DOWN — the light is yellow!');
    } else {
      lines.push('  → FALSE ❌', 'ELSE:', '  → DriveForward 🚗', '', 'Output: DRIVE FORWARD — the light is green!');
    }
  }
  lines.push('', '⬆ Only ONE branch ever runs — the first TRUE condition wins.');
  traceOut('cf2-traffic-out', lines);
}

// 2. Stubborn Alarm Clock — WHILE
// 3. ATM Machine — Nested IF
function runCF2ATM() {
  var balance = +document.getElementById('cf2-balance').value || 0;
  var cash = +document.getElementById('cf2-cash').value || 0;
  var pin = document.getElementById('cf2-pin').value.trim();
  var lines = ['# The ATM Machine — Nested IF', ''];
  lines.push(`account_balance = $${balance}`);
  lines.push(`requested_cash  = $${cash}`);
  lines.push(`entered_pin     = "${pin}"`, '');
  lines.push(`IF entered_pin == "1234":  →  ${pin==='1234'}`);
  if (pin === '1234') {
    lines.push('  → TRUE ✅ → PIN correct, check the money next...', '');
    lines.push(`  IF requested_cash <= account_balance:  →  ${cash<=balance}  ($${cash} <= $${balance})`);
    if (cash <= balance) {
      lines.push('    → TRUE ✅ → DispenseCash 💵', '', `Output: DISPENSE $${cash} — enjoy your cash!`);
    } else {
      lines.push('    → FALSE ❌', '  ELSE:', '    → ShowError("Insufficient funds") ⚠️', '', 'Output: ERROR — Insufficient funds.');
    }
  } else {
    lines.push('  → FALSE ❌', 'ELSE:', '  → ShowError("Incorrect PIN") ❌', '', 'Output: ERROR — Incorrect PIN.');
    lines.push('', '⬆ Because the OUTER IF was FALSE, the INNER IF never ran at all!');
  }
  traceOut('cf2-atm-out', lines);
}

// 5. Smart Air Conditioner — IF with AND logic
function runCF2AC() {
  var temp = +document.getElementById('cf2-temp').value || 0;
  var roomEmpty = document.getElementById('cf2-room').value === 'true';
  var hot = temp > 25;
  var lines = ['# Smart Air Conditioner — IF with AND Logic', ''];
  lines.push(`temperature = ${temp}°C`);
  lines.push(`empty_room  = ${roomEmpty ? 'TRUE' : 'FALSE'}`, '');
  lines.push(`IF temperature > 25 AND empty_room == FALSE:`);
  lines.push(`  → (${temp} > 25) = ${hot}   AND   (empty_room == FALSE) = ${!roomEmpty}`);
  var turnOn = hot && !roomEmpty;
  lines.push(`  → Overall: ${turnOn}`);
  if (turnOn) {
    lines.push('  → TRUE ✅ → TurnOnAC ❄️', '', 'Output: AC ON — it is hot AND someone is in the room.');
  } else {
    lines.push('  → FALSE ❌', 'ELSE:', '  → TurnOffAC 🔌', '', 'Output: AC OFF —');
    if (!hot) lines.push('   reason: it is NOT hot enough.');
    if (roomEmpty) lines.push('   reason: the room is empty — no need to cool it!');
  }
  lines.push('', '⬆ With AND, BOTH conditions must be TRUE at the same time.');
  traceOut('cf2-ac-out', lines);
}

// 6a. Color-Sorting Robot — TEST/CASE (single part)
function cf2RouteColor(color) {
  if (color === 'Red')  return {bin: 'Red Bin 🔴',  action: 'MoveToRedBin'};
  if (color === 'Blue') return {bin: 'Blue Bin 🔵', action: 'MoveToBlueBin'};
  return {bin: 'Scrap Bin 🗑️', action: 'MoveToScrapBin'};
}
function runCF2Robot() {
  var color = document.getElementById('cf2-color').value;
  var lines = ['# Color-Sorting Robot — TEST / CASE / DEFAULT', ''];
  lines.push('detected_color := ReadColorCamera()');
  lines.push(`detected_color = "${color}"`, '');
  lines.push('TEST detected_color:');
  var r = cf2RouteColor(color);
  ['Red','Blue'].forEach(c => {
    var match = c === color;
    lines.push(`  CASE "${c}":  →  ${match ? 'MATCH ✅' : 'no match'}`);
    if (match) lines.push(`    → PickPart → ${r.action} → DropPart`);
  });
  if (color !== 'Red' && color !== 'Blue') {
    lines.push('  DEFAULT:  →  MATCH ✅  (color is neither Red nor Blue)');
    lines.push(`    → PickPart → ${r.action} → DropPart`);
  }
  lines.push('', `Output: Part routed to ${r.bin}`);
  lines.push('', '⬆ TEST checks each CASE in order; DEFAULT catches anything left over.');
  traceOut('cf2-robot-out', lines);
}

// 6b. Color-Sorting Robot — FOR loop running a batch of 20 random parts
function runCF2RobotBatch() {
  var lines = ['# Color Sorter — Batch of 20 Pieces (FOR + TEST/CASE)', ''];
  lines.push('FOR piece_count FROM 1 TO 20:', '');
  var colors = ['Red','Blue','Green','Yellow'];
  var counts = {Red:0, Blue:0, Scrap:0};
  for (var i = 1; i <= 20; i++) {
    var c = colors[Math.floor(Math.random()*colors.length)];
    var r = cf2RouteColor(c);
    if (c === 'Red') counts.Red++; else if (c === 'Blue') counts.Blue++; else counts.Scrap++;
    lines.push(`  [${i}/20] detected_color = "${c}"  →  ${r.action} → ${r.bin}`);
  }
  lines.push('', 'StopBandTransport → SignalEndBatch ✅', '');
  lines.push(`Summary: 🔴 Red=${counts.Red}  🔵 Blue=${counts.Blue}  🗑️ Scrap=${counts.Scrap}  (total 20)`);
  lines.push('', '⬆ The FOR loop guarantees the robot processes ALL 20 pieces,');
  lines.push('   no matter how the colors are mixed!');
  traceOut('cf2-robot-out', lines);
}

/* ================================================================
   [SECTION: BLOCK CANVAS ENGINE — reusable mini wiring canvases]
   Powers the "Try it with Blocks" sections inside Code Flow.
   Each instance has its own canvas, nodes, connections, zoom & pan.
   Supports: SW, NUM, AND/OR/NOT/NAND, IF_ELSE, FOR/WHILE/DO_WHILE,
             IF_ELSEIF_ELSE, TEST_CASE, TERM
   ================================================================ */
var BCC = {
  bg:'#f1f5f9', gH:'#ec4899', cH:'#0ea5e9', mH:'#f59e0b',
  inp:'#f97316', out:'#a855f7', tx:'#1e293b', tr:'#22c55e',
  wOn:'#22c55e', wOff:'#ef4444', pDef:'#cbd5e1', pSel:'#6366f1', grid:'#e2e8f0'
};

function BlockCanvas(canvasId) {
  this.canvasId = canvasId;
  this.canvas = null; this.ctx = null;
  this.nodes = {}; this.conns = []; this.nc = 0;
  this.selPin = null; this.dragId = null; this.dragOX = 0; this.dragOY = 0; this.lastClick = 0;
  this.zoom = 1;
  this.VW = 640; this.VH = 420;
  this._init = false;
  this._bound = false;
}

BlockCanvas.prototype.ensure = function() {
  if (!this.canvas) {
    this.canvas = document.getElementById(this.canvasId);
    if (!this.canvas) return false;
    this.ctx = this.canvas.getContext('2d');
  }
  if (!this._bound && this.canvas) { this.bind(); this._bound = true; }
  return true;
};

BlockCanvas.prototype.resize = function() {
  if (!this.ensure()) return;
  var wrap = this.canvas.parentElement;
  var availW = (wrap && wrap.clientWidth) || this.VW;
  if (this.zoom === 1 && availW < this.VW) {
    this.zoom = Math.max(0.45, Math.round((availW / this.VW) * 100) / 100);
  }
  this.canvas.width = this.VW;
  this.canvas.height = this.VH;
  this.canvas.style.width  = (this.VW * this.zoom) + 'px';
  this.canvas.style.height = (this.VH * this.zoom) + 'px';
};

/* ── Spawning helpers ─────────────────────────────────────────── */
BlockCanvas.prototype.addSwitch = function(label) {
  this.nc++; var id = 's' + this.nc;
  this.nodes[id] = { id, type:'SW', val:false, label: label||'', x:30+Math.random()*40, y:40+Math.random()*200, w:120, h:50 };
  this.draw();
};
BlockCanvas.prototype.addNum = function(label, val) {
  this.nc++; var id = 'n' + this.nc;
  this.nodes[id] = { id, type:'NUM', val: (val!==undefined?val:5), label: label||'', x:30+Math.random()*40, y:40+Math.random()*200, w:120, h:50 };
  this.draw();
};
BlockCanvas.prototype.addGate = function(type) {
  this.nc++; var id = 'g' + this.nc;
  var h = 92, w = 150;
  if (type==='IF_ELSE') { h=118; }
  else if (['FOR','WHILE','DO_WHILE'].includes(type)) { h=100; }
  else if (type==='IF_ELSEIF_ELSE') { h=158; w=190; }
  else if (type==='TEST_CASE') { h=158; w=190; }
  var node = { id, type, x:200+Math.random()*120, y:40+Math.random()*180, w, h, outVal:'?' };
  if (type==='TEST_CASE') { node.caseA=1; node.caseB=2; node.outVal=null; }
  this.nodes[id] = node;
  this.draw();
};
BlockCanvas.prototype.addTerm = function() {
  this.nc++; var id = 't' + this.nc;
  this.nodes[id] = { id, type:'TERM', disp:'---', x:440+Math.random()*60, y:60+Math.random()*180, w:135, h:62 };
  this.draw();
};
BlockCanvas.prototype.reset = function() {
  this.nodes = {}; this.conns = []; this.nc = 0; this.selPin = null; this.dragId = null; this.zoom = 1;
  this.resize(); this.draw();
};

/* ── Pins ──────────────────────────────────────────────────────── */
BlockCanvas.prototype.getPins = function(n) {
  var ps = [];
  if (n.type === 'IF_ELSE') {
    ps.push({x:n.x+n.w, y:n.y+60, tag:`${n.id}_out0`});
    ps.push({x:n.x+n.w, y:n.y+92, tag:`${n.id}_out1`});
    ps.push({x:n.x,     y:n.y+n.h/2, tag:`${n.id}_in0`});
    return ps;
  }
  if (n.type === 'IF_ELSEIF_ELSE') {
    ps.push({x:n.x,     y:n.y+34,  tag:`${n.id}_in0`});  // cond1
    ps.push({x:n.x,     y:n.y+74,  tag:`${n.id}_in1`});  // cond2
    ps.push({x:n.x+n.w, y:n.y+34,  tag:`${n.id}_out0`}); // IF
    ps.push({x:n.x+n.w, y:n.y+74,  tag:`${n.id}_out1`}); // ELSEIF
    ps.push({x:n.x+n.w, y:n.y+114, tag:`${n.id}_out2`}); // ELSE
    return ps;
  }
  if (n.type === 'TEST_CASE') {
    ps.push({x:n.x,     y:n.y+n.h/2, tag:`${n.id}_in0`}); // value in
    ps.push({x:n.x+n.w, y:n.y+50,  tag:`${n.id}_out0`}); // CASE A
    ps.push({x:n.x+n.w, y:n.y+88,  tag:`${n.id}_out1`}); // CASE B
    ps.push({x:n.x+n.w, y:n.y+126, tag:`${n.id}_out2`}); // DEFAULT
    return ps;
  }
  if (!['TERM'].includes(n.type)) ps.push({x:n.x+n.w, y:n.y+n.h/2, tag:`${n.id}_out`});
  if (['AND','OR','NAND'].includes(n.type)) {
    ps.push({x:n.x, y:n.y+26,     tag:`${n.id}_in0`});
    ps.push({x:n.x, y:n.y+n.h-26, tag:`${n.id}_in1`});
  } else if (!['SW','NUM'].includes(n.type)) {
    ps.push({x:n.x, y:n.y+n.h/2, tag:`${n.id}_in0`});
  }
  return ps;
};

/* ── Drawing ───────────────────────────────────────────────────── */
BlockCanvas.prototype.drawPin = function(px, py, tag, lbl, isIn) {
  var ctx = this.ctx, r = 8, sel = this.selPin === tag;
  if (sel) { ctx.beginPath(); ctx.arc(px,py,r+3,0,Math.PI*2); ctx.fillStyle=BCC.cH; ctx.fill(); }
  ctx.beginPath(); ctx.arc(px,py,r,0,Math.PI*2);
  ctx.fillStyle = sel?BCC.pSel:BCC.pDef; ctx.strokeStyle='#000'; ctx.lineWidth=2; ctx.fill(); ctx.stroke();
  if (lbl) {
    ctx.fillStyle='#0ea5e9'; ctx.font="bold 9px 'Share Tech Mono'";
    ctx.textAlign = isIn?'left':'right'; ctx.textBaseline='middle';
    ctx.fillText(lbl, px+(isIn?12:-12), py);
  }
};

BlockCanvas.prototype.draw = function() {
  if (!this.ensure()) return;
  var ctx = this.ctx, W = this.canvas.width, H = this.canvas.height;
  ctx.clearRect(0,0,W,H);
  ctx.fillStyle = BCC.bg; ctx.fillRect(0,0,W,H);
  ctx.strokeStyle = BCC.grid; ctx.lineWidth = 1;
  for (var i=0;i<W;i+=40){ctx.beginPath();ctx.moveTo(i,0);ctx.lineTo(i,H);ctx.stroke();}
  for (var j=0;j<H;j+=40){ctx.beginPath();ctx.moveTo(0,j);ctx.lineTo(W,j);ctx.stroke();}

  var self = this;
  // Wires
  this.conns.forEach(c => {
    var n1=self.nodes[c.from], n2=self.nodes[c.to]; if(!n1||!n2)return;
    var p1 = self.getPins(n1).find(p=>p.tag.endsWith('_out'+(c.oIdx||0)) || (c.oIdx===0 && p.tag===`${n1.id}_out`));
    var p2 = self.getPins(n2).find(p=>p.tag===`${n2.id}_in${c.iIdx}`);
    if (!p1||!p2) return;
    ctx.beginPath(); ctx.moveTo(p1.x,p1.y);
    ctx.bezierCurveTo((p1.x+p2.x)/2,p1.y,(p1.x+p2.x)/2,p2.y,p2.x,p2.y);
    var active = self.outActive(n1, c.oIdx||0);
    ctx.strokeStyle = active ? BCC.wOn : BCC.wOff; ctx.lineWidth = 4; ctx.stroke();
  });

  // Blocks
  Object.values(this.nodes).forEach(n => {
    ctx.save();
    ctx.fillStyle='#000'; ctx.fillRect(n.x+3,n.y+3,n.w,n.h);

    if (n.type==='NUM') {
      ctx.fillStyle='#0a1a08'; ctx.fillRect(n.x,n.y,n.w,n.h);
      ctx.strokeStyle=BCC.mH; ctx.lineWidth=2; ctx.strokeRect(n.x,n.y,n.w,n.h);
      ctx.fillStyle='#555'; ctx.font="7px 'Share Tech Mono'"; ctx.textAlign='center'; ctx.textBaseline='top';
      ctx.fillText(n.label?n.label.toUpperCase():'INPUT (dbl-click)', n.x+n.w/2, n.y+4);
      ctx.fillStyle=BCC.mH; ctx.font="bold 20px Orbitron"; ctx.textBaseline='middle';
      ctx.fillText(n.val, n.x+n.w/2, n.y+n.h/2+4);
      self.drawPin(n.x+n.w, n.y+n.h/2, `${n.id}_out`, '', false);

    } else if (n.type==='SW') {
      ctx.fillStyle = n.val ? '#0a2010' : '#1a1210';
      ctx.fillRect(n.x,n.y,n.w,n.h);
      ctx.strokeStyle = n.val ? BCC.wOn : BCC.inp; ctx.lineWidth = n.val?3:2;
      ctx.strokeRect(n.x,n.y,n.w,n.h);
      ctx.fillStyle='#555'; ctx.font="7px 'Share Tech Mono'"; ctx.textAlign='center'; ctx.textBaseline='top';
      ctx.fillText(n.label?n.label.toUpperCase():'SWITCH (dbl-click)', n.x+n.w/2, n.y+3);
      ctx.fillStyle = n.val ? BCC.wOn : BCC.inp;
      ctx.font="bold 12px 'Share Tech Mono'"; ctx.textBaseline='middle';
      ctx.fillText(n.val?'🟢 TRUE':'🔴 FALSE', n.x+n.w/2, n.y+n.h/2+4);
      self.drawPin(n.x+n.w, n.y+n.h/2, `${n.id}_out`, '', false);

    } else if (['AND','OR','NOT','NAND'].includes(n.type)) {
      ctx.fillStyle=BCC.bg; ctx.fillRect(n.x,n.y,n.w,n.h);
      ctx.strokeStyle=BCC.gH; ctx.lineWidth=3; ctx.strokeRect(n.x,n.y,n.w,n.h);
      ctx.fillStyle=BCC.gH; ctx.fillRect(n.x,n.y,n.w,28);
      ctx.fillStyle='#111'; ctx.font="bold 11px 'Exo 2'"; ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.fillText(`⚙️ GATE: ${n.type}`, n.x+n.w/2, n.y+14);
      ctx.fillStyle = n.outVal===true?BCC.wOn:BCC.wOff;
      ctx.font="bold 12px 'Share Tech Mono'";
      ctx.fillText(`OUT: ${n.outVal}`, n.x+n.w/2, n.y+62);
      if (n.type==='NOT') self.drawPin(n.x, n.y+n.h/2, `${n.id}_in0`, 'IN', true);
      else {
        self.drawPin(n.x, n.y+26,     `${n.id}_in0`, 'A', true);
        self.drawPin(n.x, n.y+n.h-26, `${n.id}_in1`, 'B', true);
      }
      self.drawPin(n.x+n.w, n.y+n.h/2, `${n.id}_out`, 'OUT', false);

    } else if (n.type==='IF_ELSE') {
      ctx.fillStyle=BCC.bg; ctx.fillRect(n.x,n.y,n.w,n.h);
      ctx.strokeStyle=BCC.cH; ctx.lineWidth=3; ctx.strokeRect(n.x,n.y,n.w,n.h);
      ctx.fillStyle=BCC.cH; ctx.fillRect(n.x,n.y,n.w,28);
      ctx.fillStyle='#111'; ctx.font="bold 11px 'Exo 2'"; ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.fillText('🌿 IF – ELSE', n.x+n.w/2, n.y+14);
      ctx.fillStyle=BCC.tx; ctx.font="10px 'Share Tech Mono'"; ctx.textAlign='left';
      ctx.fillText('→ IF (TRUE)', n.x+14, n.y+60);
      ctx.fillText('→ ELSE',      n.x+14, n.y+92);
      self.drawPin(n.x,     n.y+n.h/2, `${n.id}_in0`, '⚡',  true);
      self.drawPin(n.x+n.w, n.y+60,    `${n.id}_out0`, 'IF',  false);
      self.drawPin(n.x+n.w, n.y+92,    `${n.id}_out1`, 'ELSE',false);

    } else if (['FOR','WHILE','DO_WHILE'].includes(n.type)) {
      ctx.fillStyle=BCC.bg; ctx.fillRect(n.x,n.y,n.w,n.h);
      ctx.strokeStyle=BCC.cH; ctx.lineWidth=3; ctx.strokeRect(n.x,n.y,n.w,n.h);
      ctx.fillStyle=BCC.cH; ctx.fillRect(n.x,n.y,n.w,28);
      ctx.fillStyle='#111'; ctx.font="bold 10px 'Exo 2'"; ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.fillText(`🔄 ${n.type.replace('_','-')}`, n.x+n.w/2, n.y+14);
      ctx.fillStyle=BCC.tx; ctx.font="11px 'Share Tech Mono'";
      ctx.fillText(n.outVal==='?'?'Runs: ?':String(n.outVal), n.x+n.w/2, n.y+65);
      self.drawPin(n.x,     n.y+n.h/2, `${n.id}_in0`, '⚡',  true);
      self.drawPin(n.x+n.w, n.y+n.h/2, `${n.id}_out`, 'LOOP', false);

    } else if (n.type==='IF_ELSEIF_ELSE') {
      ctx.fillStyle=BCC.bg; ctx.fillRect(n.x,n.y,n.w,n.h);
      ctx.strokeStyle=BCC.cH; ctx.lineWidth=3; ctx.strokeRect(n.x,n.y,n.w,n.h);
      ctx.fillStyle=BCC.cH; ctx.fillRect(n.x,n.y,n.w,28);
      ctx.fillStyle='#111'; ctx.font="bold 10px 'Exo 2'"; ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.fillText('🚦 IF/ELSEIF/ELSE', n.x+n.w/2, n.y+14);
      ctx.fillStyle=BCC.tx; ctx.font="9px 'Share Tech Mono'"; ctx.textAlign='left';
      ctx.fillText('COND1 → IF',     n.x+18, n.y+34);
      ctx.fillText('COND2 → ELSEIF', n.x+18, n.y+74);
      ctx.fillText('(none) → ELSE',  n.x+18, n.y+114);
      ctx.fillStyle = '#0ea5e9'; ctx.font="bold 9px 'Share Tech Mono'"; ctx.textAlign='right';
      ctx.fillText('IF',     n.x+n.w-12, n.y+34);
      ctx.fillText('ELSEIF', n.x+n.w-12, n.y+74);
      ctx.fillText('ELSE',   n.x+n.w-12, n.y+114);
      self.drawPin(n.x, n.y+34,  `${n.id}_in0`,  '', true);
      self.drawPin(n.x, n.y+74,  `${n.id}_in1`,  '', true);
      self.drawPin(n.x+n.w, n.y+34,  `${n.id}_out0`, '', false);
      self.drawPin(n.x+n.w, n.y+74,  `${n.id}_out1`, '', false);
      self.drawPin(n.x+n.w, n.y+114, `${n.id}_out2`, '', false);

    } else if (n.type==='TEST_CASE') {
      ctx.fillStyle=BCC.bg; ctx.fillRect(n.x,n.y,n.w,n.h);
      ctx.strokeStyle=BCC.cH; ctx.lineWidth=3; ctx.strokeRect(n.x,n.y,n.w,n.h);
      ctx.fillStyle=BCC.cH; ctx.fillRect(n.x,n.y,n.w,28);
      ctx.fillStyle='#111'; ctx.font="bold 10px 'Exo 2'"; ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.fillText('🤖 TEST / CASE (dbl-click)', n.x+n.w/2, n.y+14);
      ctx.fillStyle=BCC.tx; ctx.font="10px 'Share Tech Mono'"; ctx.textAlign='left';
      ctx.fillText(`CASE A == ${n.caseA}`, n.x+18, n.y+50);
      ctx.fillText(`CASE B == ${n.caseB}`, n.x+18, n.y+88);
      ctx.fillText('DEFAULT',              n.x+18, n.y+126);
      ctx.fillStyle = n.outVal!==null&&n.outVal!==undefined ? '#0ea5e9' : '#94a3b8';
      ctx.font="9px 'Share Tech Mono'"; ctx.textAlign='right';
      var inV = self.numUp(n.id, 0);
      ctx.fillText(inV!==null?`IN = ${inV}`:'IN = ?', n.x+n.w-12, n.y+14);
      self.drawPin(n.x,     n.y+n.h/2, `${n.id}_in0`,  '', true);
      self.drawPin(n.x+n.w, n.y+50,  `${n.id}_out0`, '', false);
      self.drawPin(n.x+n.w, n.y+88,  `${n.id}_out1`, '', false);
      self.drawPin(n.x+n.w, n.y+126, `${n.id}_out2`, '', false);

    } else if (n.type==='TERM') {
      ctx.fillStyle='#0d0820'; ctx.fillRect(n.x,n.y,n.w,n.h);
      ctx.strokeStyle=BCC.out; ctx.lineWidth=3; ctx.strokeRect(n.x,n.y,n.w,n.h);
      ctx.fillStyle=BCC.out; ctx.font="bold 9px 'Orbitron'"; ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.fillText('🎯 OUTPUT', n.x+n.w/2, n.y+15);
      var good = n.disp==='TRUE'||Number(n.disp)>0||
                  String(n.disp).toUpperCase().includes('LOOP')||
                  String(n.disp).includes('RUN')||
                  ['CASE A','CASE B','DEFAULT','IF','ELSEIF','ELSE'].includes(n.disp);
      ctx.fillStyle = good?BCC.wOn:BCC.wOff;
      ctx.font="bold 13px 'Share Tech Mono'";
      ctx.fillText(n.disp, n.x+n.w/2, n.y+43);
      self.drawPin(n.x, n.y+n.h/2, `${n.id}_in0`, '', true);
    }
    ctx.restore();
  });
};

/* ── Wire activity check (used to color wires) ───────────────────── */
BlockCanvas.prototype.outActive = function(n, oIdx) {
  if (n.type==='SW') return n.val===true;
  if (n.type==='NUM') return true; // numeric outputs are always "live"
  if (n.type==='IF_ELSE') {
    if (n.outVal==='?') return false;
    return oIdx===0 ? !!n.outVal : !n.outVal;
  }
  if (n.type==='IF_ELSEIF_ELSE') {
    if (n.outVal==null) return false;
    return n.outVal === oIdx;
  }
  if (n.type==='TEST_CASE') {
    if (n.outVal==null) return false;
    return n.outVal === oIdx;
  }
  if (['AND','OR','NOT','NAND'].includes(n.type)) return n.outVal===true;
  if (['FOR','WHILE','DO_WHILE'].includes(n.type)) {
    return n.outVal!=='?' && !String(n.outVal).startsWith('0');
  }
  return false;
};

/* ── Input lookups ────────────────────────────────────────────── */
BlockCanvas.prototype.findConn = function(toId, iIdx) {
  return this.conns.find(c => c.to===toId && c.iIdx===iIdx);
};
BlockCanvas.prototype.boolUp = function(toId, iIdx) {
  var c = this.findConn(toId, iIdx); if (!c) return null;
  var s = this.nodes[c.from]; if (!s) return null;
  if (s.type==='SW') return s.val;
  if (s.type==='IF_ELSE') return s.outVal==='?' ? null : ((c.oIdx===0) ? (s.outVal?true:null) : (!s.outVal?true:null));
  if (s.type==='IF_ELSEIF_ELSE' || s.type==='TEST_CASE') return s.outVal==null ? null : (s.outVal===c.oIdx ? true : null);
  if (['AND','OR','NOT','NAND'].includes(s.type)) return s.outVal==='?' ? null : s.outVal;
  return null;
};
BlockCanvas.prototype.numUp = function(toId, iIdx) {
  var c = this.findConn(toId, iIdx); if (!c) return null;
  var s = this.nodes[c.from]; if (!s) return null;
  if (s.type==='NUM') return s.val;
  return null;
};

/* ── Evaluation ────────────────────────────────────────────────── */
BlockCanvas.prototype.run = function() {
  var self = this;
  Object.values(this.nodes).forEach(n => {
    if (n.type==='TERM') n.disp='---';
    if (['AND','OR','NOT','NAND','IF_ELSE','FOR','WHILE','DO_WHILE'].includes(n.type)) n.outVal='?';
    if (n.type==='IF_ELSEIF_ELSE' || n.type==='TEST_CASE') n.outVal=null;
  });
  var changed=true, it=0, max=Object.keys(this.nodes).length*8+4;
  while (changed && it<max) {
    changed=false; it++;
    Object.values(this.nodes).forEach(n => {
      if (n.type==='NOT' && n.outVal==='?') { var i0=self.boolUp(n.id,0); if(i0!==null){n.outVal=!i0;changed=true;} }
      if (['AND','OR','NAND'].includes(n.type) && n.outVal==='?') {
        var i0=self.boolUp(n.id,0), i1=self.boolUp(n.id,1);
        if (i0!==null && i1!==null) {
          n.outVal = n.type==='AND'?(i0&&i1) : n.type==='OR'?(i0||i1) : !(i0&&i1);
          changed=true;
        }
      }
      if (n.type==='IF_ELSE' && n.outVal==='?') { var c=self.boolUp(n.id,0); if(c!==null){n.outVal=c;changed=true;} }
      if (['FOR','WHILE','DO_WHILE'].includes(n.type) && n.outVal==='?') {
        var c=self.boolUp(n.id,0);
        if (c!==null) {
          n.outVal = n.type==='FOR'  ?(c?'10 Loops':'0 Loops') :
                     n.type==='WHILE'?(c?'∞ Loops':'0 Runs')   :
                                       (c?'∞ Loops':'1 Run ⚠️');
          changed=true;
        }
      }
      if (n.type==='IF_ELSEIF_ELSE' && n.outVal===null) {
        var c1=self.boolUp(n.id,0), c2=self.boolUp(n.id,1);
        if (c1!==null || c2!==null) {
          n.outVal = c1 ? 0 : (c2 ? 1 : 2); changed=true;
        }
      }
      if (n.type==='TEST_CASE' && n.outVal===null) {
        var v = self.numUp(n.id,0);
        if (v!==null) {
          n.outVal = (v===n.caseA) ? 0 : (v===n.caseB) ? 1 : 2; changed=true;
        }
      }
      if (n.type==='TERM' && n.disp==='---') {
        // Check each incoming connection's source for a resolved value
        var c = self.findConn(n.id, 0);
        if (c) {
          var s = self.nodes[c.from];
          if (s) {
            if (s.type==='SW') { n.disp = s.val?'TRUE':'FALSE'; changed=true; }
            else if (s.type==='NUM') { n.disp = String(s.val); changed=true; }
            else if (['AND','OR','NOT','NAND'].includes(s.type) && s.outVal!=='?') { n.disp = String(s.outVal).toUpperCase(); changed=true; }
            else if (['FOR','WHILE','DO_WHILE'].includes(s.type) && s.outVal!=='?') { n.disp = String(s.outVal); changed=true; }
            else if (s.type==='IF_ELSE' && s.outVal!=='?') {
              var active = self.outActive(s, c.oIdx||0);
              if (active) { n.disp = (c.oIdx===0)?'IF':'ELSE'; changed=true; }
            }
            else if (s.type==='IF_ELSEIF_ELSE' && s.outVal!==null) {
              if (s.outVal===(c.oIdx||0)) { n.disp = ['IF','ELSEIF','ELSE'][c.oIdx||0]; changed=true; }
            }
            else if (s.type==='TEST_CASE' && s.outVal!==null) {
              if (s.outVal===(c.oIdx||0)) { n.disp = ['CASE A','CASE B','DEFAULT'][c.oIdx||0]; changed=true; }
            }
          }
        }
      }
    });
  }
  this.draw();
  showToast('✅ Blocks evaluated! Check the OUTPUT block.');
};

/* ── Input handling (mouse + touch) ──────────────────────────────── */
BlockCanvas.prototype.getPos = function(e) {
  var r = this.canvas.getBoundingClientRect();
  var cx = e.touches ? e.touches[0].clientX : e.clientX;
  var cy = e.touches ? e.touches[0].clientY : e.clientY;
  return { x:(cx-r.left)/this.zoom, y:(cy-r.top)/this.zoom };
};
BlockCanvas.prototype.inNode = function(p,n) { return p.x>=n.x&&p.x<=n.x+n.w&&p.y>=n.y&&p.y<=n.y+n.h; };
BlockCanvas.prototype.dist2 = function(a,b) { return (a.x-b.x)**2+(a.y-b.y)**2; };

BlockCanvas.prototype.outIdxFromTag = function(tag) {
  var m = tag.match(/_out(\d*)$/);
  return m ? (m[1]===''?0:parseInt(m[1])) : 0;
};
BlockCanvas.prototype.inIdxFromTag = function(tag) {
  var m = tag.match(/_in(\d+)$/);
  return m ? parseInt(m[1]) : 0;
};

BlockCanvas.prototype.down = function(e) {
  var p = this.getPos(e), now = Date.now(), self = this;
  if (now - this.lastClick < 320) {
    for (var n of Object.values(this.nodes)) {
      if (this.inNode(p,n)) {
        if (n.type==='SW') { n.val=!n.val; this.dragId=null; this.draw(); return; }
        if (n.type==='NUM') { openBCEdit(this, n.id); this.dragId=null; return; }
        if (n.type==='TEST_CASE') { openBCTestCaseEdit(this, n.id); this.dragId=null; return; }
      }
    }
  }
  this.lastClick = now;
  // Pin click
  for (var n of Object.values(this.nodes)) {
    for (var pin of this.getPins(n)) {
      if (this.dist2(p,pin) <= 144) { this.pinClick(pin.tag, n.id); return; }
    }
  }
  // Drag
  for (var n of Object.values(this.nodes)) {
    if (this.inNode(p,n)) { this.dragId=n.id; this.dragOX=p.x-n.x; this.dragOY=p.y-n.y; return; }
  }
  this.selPin=null; this.draw();
};
BlockCanvas.prototype.move = function(e) {
  if (!this.dragId) return;
  if (e.cancelable) e.preventDefault();
  var p = this.getPos(e), n = this.nodes[this.dragId];
  if (n) { n.x=p.x-this.dragOX; n.y=p.y-this.dragOY; this.draw(); }
};
BlockCanvas.prototype.up = function() { this.dragId=null; };

BlockCanvas.prototype.pinClick = function(tag, nid) {
  if (!this.selPin) {
    if (tag.includes('_out')) this.selPin = tag;
  } else {
    if (tag.includes('_in')) {
      var fp = this.selPin.split('_out');
      var fn = fp[0], oi = this.outIdxFromTag(this.selPin);
      var ii = this.inIdxFromTag(tag);
      var tn = nid;
      if (fn !== tn) {
        this.conns = this.conns.filter(c => !(c.to===tn && c.iIdx===ii));
        this.conns.push({from:fn, to:tn, iIdx:ii, oIdx:oi});
      }
      this.selPin = null;
    } else this.selPin = tag;
  }
  this.draw();
};

BlockCanvas.prototype.bind = function() {
  var self = this;
  this.canvas.addEventListener('mousedown', e=>self.down(e));
  this.canvas.addEventListener('mousemove', e=>self.move(e));
  this.canvas.addEventListener('mouseup',   e=>self.up(e));
  this.canvas.addEventListener('touchstart', e=>self.down(e), {passive:true});
  this.canvas.addEventListener('touchmove',  e=>self.move(e), {passive:false});
  this.canvas.addEventListener('touchend',   e=>self.up(e));
};

/* ── Edit overlay for BlockCanvas NUM/SW blocks ──────────────────── */
function openBCEdit(engine, nid) {
  editNodeId = nid; editNodeEngine = engine;
  var n = engine.nodes[nid];
  var numEl = document.getElementById('edit-val');
  var boolEl = document.getElementById('edit-bool');
  var lblRow = document.getElementById('edit-label-row');
  var lblInp = document.getElementById('edit-label');
  var title = document.getElementById('edit-title');
  if (n.type === 'SW') {
    title.textContent = '✏️ SET SWITCH VALUE';
    numEl.style.display='none'; boolEl.style.display='block';
    boolEl.value = n.val?'true':'false';
  } else {
    title.textContent = '✏️ SET INPUT VALUE';
    numEl.style.display='block'; boolEl.style.display='none';
    numEl.value = n.val;
  }
  lblRow.style.display='block';
  lblInp.value = n.label || '';
  document.getElementById('edit-overlay').classList.add('show');
  (n.type==='SW'?boolEl:numEl).focus();
}

/* ── Edit overlay for TEST_CASE blocks (CASE A / CASE B numbers) ─── */
function openBCTestCaseEdit(engine, nid) {
  var n = engine.nodes[nid];
  var a = prompt('CASE A matches when input equals:', n.caseA);
  if (a===null) return;
  var b = prompt('CASE B matches when input equals:', n.caseB);
  if (b===null) return;
  var av = parseFloat(a), bv = parseFloat(b);
  if (!isNaN(av)) n.caseA = av;
  if (!isNaN(bv)) n.caseB = bv;
  engine.draw();
}

/* ── BC registry: one BlockCanvas per Code Flow concept tab ──────── */
var BC = {
  if:       new BlockCanvas('bc-if'),
  for:      new BlockCanvas('bc-for'),
  while:    new BlockCanvas('bc-while'),
  dw:       new BlockCanvas('bc-dw'),
  nested:   new BlockCanvas('bc-nested'),
  ifelseif: new BlockCanvas('bc-ifelseif'),
  andlogic: new BlockCanvas('bc-andlogic'),
  testcase: new BlockCanvas('bc-testcase'),
};

/* ── Preset starter blocks for each Code Flow concept ────────────── */
function presetBC(key) {
  var bc = BC[key];
  bc.reset();
  if (key === 'if') {
    bc.addSwitch('is_weekend'); bc.addGate('IF_ELSE'); bc.addTerm();
  } else if (key === 'for') {
    bc.addSwitch('start_for'); bc.addGate('FOR'); bc.addTerm();
  } else if (key === 'while') {
    bc.addSwitch('still_sleeping'); bc.addGate('WHILE'); bc.addTerm();
  } else if (key === 'dw') {
    bc.addSwitch('has_homework'); bc.addGate('DO_WHILE'); bc.addTerm();
  } else if (key === 'nested') {
    bc.addSwitch('pin_correct'); bc.addGate('IF_ELSE'); bc.addGate('IF_ELSE'); bc.addTerm();
    // shift second IF_ELSE further right/down for clarity
    var gs = Object.values(bc.nodes).filter(n=>n.type==='IF_ELSE');
    if (gs[1]) { gs[1].x = 400; gs[1].y = 220; }
    bc.draw();
  } else if (key === 'ifelseif') {
    bc.addSwitch('is_red'); bc.addSwitch('is_yellow');
    var s2 = Object.values(bc.nodes).filter(n=>n.type==='SW')[1];
    if (s2) s2.y += 90;
    bc.addGate('IF_ELSEIF_ELSE'); bc.addTerm();
  } else if (key === 'andlogic') {
    bc.addSwitch('hot'); bc.addSwitch('occupied');
    var s2 = Object.values(bc.nodes).filter(n=>n.type==='SW')[1];
    if (s2) s2.y += 90;
    bc.addGate('AND'); bc.addTerm();
  } else if (key === 'testcase') {
    bc.addNum('color_code', 1); bc.addGate('TEST_CASE'); bc.addTerm();
  }
  bc.resize(); bc.draw();
}

/* ================================================================
   [SECTION: STARTUP — single DOMContentLoaded init]
   ================================================================ */
window.addEventListener('DOMContentLoaded', () => {
  // Main canvas setup
  document.getElementById('sidebar').innerHTML = SIDEBARS[0];
  resizeMC();
  showCF('if');
  // Size PLC canvas
  var pc = document.getElementById('plc-canvas');
  if (pc) { pc.width = pc.offsetWidth || 600; pc.height = 280; }
  // Initialize all Code Flow mini block canvases with preset blocks
  CF_TABS.forEach(presetBC);
  // Hide zoom controls initially (only shown for canvas modules 0 & 1)
  var zc = document.getElementById('zoom-controls');
  if (zc) zc.style.display = 'none';
});

window.addEventListener('resize', () => {
  resizeMC();
  var pc = document.getElementById('plc-canvas');
  if (pc && pc.offsetWidth) { pc.width = pc.offsetWidth; pc.height = 280; drawPLC(); }
  CF_TABS.forEach(k => { BC[k].resize(); BC[k].draw(); });
});
