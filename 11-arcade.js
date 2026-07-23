/* Pausentamagotchi - Arcade-Automaten: Space Invaders, Pong, Defender */
const ARCADE_META = {
    invaders: { name: 'SPACE INVADERS', owned: 'arcade_invaders', controls: 'lrf', hint: '◀ ▶ BEWEGEN · ● FEUER' },
    pong:     { name: 'PONG',           owned: 'arcade_pong',     controls: 'ud',  hint: '▲ ▼ SCHLÄGER BEWEGEN' },
    defender: { name: 'DEFENDER',       owned: 'arcade_defender', controls: 'ud',  hint: '▲ ▼ FLIEGEN · DAUERFEUER' }
};
let arcadeHi = JSON.parse(safeGetItem('tama_arcade_hi') || '{}');
function saveArcadeHi() { safeSetItem('tama_arcade_hi', JSON.stringify(arcadeHi)); }

let arcade = {
    ctx: null, raf: null, running: false, current: null, game: null, phase: null,
    input: { left:false, right:false, up:false, down:false, fire:false },
    lastTs: 0, keyHandler: null, keyUpHandler: null
};

function getPetEmojiRaw() {
    if (typeof pet === 'undefined' || !pet) return '🥚';
    if (pet.stage === 0) return '🥚';
    if (pet.stage === 1) return '🐣';
    return speciesList[pet.speciesIndex] || '🥚';
}
function arcadeOwns(key) {
    let m = ARCADE_META[key];
    return !!(m && inventory.items && inventory.items[m.owned] > 0);
}
function getArcadeCtx() {
    let cv = document.getElementById('arcadeCanvas');
    if (!cv) return null;
    try { return cv.getContext('2d'); } catch(e) { return null; }
}

// Eintritt je Runde. Der eigentliche Gewinn eines Durchgangs ist die XP-Ausbeute
// (38-125), die Muenzen kommen je nach Punktzahl groesstenteils zurueck.
const ARCADE_PLAY_COST = 20;

function openArcadeMenu() {
    if (accountLevel < 5) { playSound('cancel'); return; }
    playSound('select');
    arcade.ctx = getArcadeCtx();
    document.getElementById('arcadeOverlay').style.display = 'flex';
    showArcadeMenu();
}

function showArcadeMenu() {
    stopArcadeLoop();
    removeArcadeInput();
    arcade.current = null; arcade.game = null; arcade.phase = 'menu';
    document.getElementById('arcadeTitle').innerText = '🕹️ ARCADE';
    document.getElementById('arcScore').innerText = '—';
    document.getElementById('arcWave').innerText = '';
    document.getElementById('arcHi').innerText = '';
    document.getElementById('arcLives').innerText = '';
    document.getElementById('arcadeControls').innerHTML = '';
    document.getElementById('arcadeHint').innerText = tf('WÄHLE EINEN AUTOMATEN · {0} 🪙 JE RUNDE', ARCADE_PLAY_COST);
    if (arcade.ctx) { arcade.ctx.fillStyle = '#05070f'; arcade.ctx.fillRect(0,0,480,360); }

    document.getElementById('amTitle').innerText = '🕹️ ARCADE';
    let items = Object.keys(ARCADE_META).map(key => {
        let m = ARCADE_META[key];
        let hi = arcadeHi[key] ? ` · HI ${arcadeHi[key]}` : '';
        return arcadeOwns(key)
            ? `<button class="am-btn" style="min-width:210px;" onclick="launchArcade('${key}')">▶ ${m.name}${hi}</button>`
            : `<div style="opacity:0.6; font-size:12px; border:1px dashed #44507e; border-radius:8px; padding:8px 14px; min-width:210px; color:#8be9fd;">🔒 ${m.name}<br><span style="font-size:10px; color:#5a6a9a;">Im Shop kaufen</span></div>`;
    }).join('');
    document.getElementById('amSub').innerHTML =
        `<div style="display:flex; flex-direction:column; gap:9px; align-items:center;">${items}</div>`;
    document.getElementById('amBtn').style.display = 'none';
    document.getElementById('arcadeMessage').classList.add('show');
}

function launchArcade(key) {
    if (!arcadeOwns(key)) { playSound('cancel'); return; }
    playSound('select');
    arcade.ctx = getArcadeCtx();
    document.getElementById('arcadeOverlay').style.display = 'flex';
    arcade.current = key;
    document.getElementById('arcadeTitle').innerText = ARCADE_META[key].name;
    document.getElementById('arcadeHint').innerText = ARCADE_META[key].hint;
    renderArcadeControls(ARCADE_META[key].controls);
    ensureArcadeInput();
    startArcadeGame(key);
}

function startArcadeGame(key) {
    arcade.game = createArcadeGame(key);
    arcade.phase = 'ready';
    if (arcade.ctx && arcade.game) arcade.game.draw(arcade.ctx);
    updateArcadeHud(arcade.game);
    showArcadeMessage(ARCADE_META[key].name, arcade.game.intro, `▶ START — ${ARCADE_PLAY_COST} 🪙`);
}

function arcadeMessageAction() {
    if (!arcade.current) return;
    // Jede Runde kostet Eintritt - auch der Nochmal-Knopf
    if (arcade.phase === 'broke') { quitArcade(); return; }
    if (tCoins < ARCADE_PLAY_COST) {
        playSound('cancel');
        showArcadeMessage(t('Zu wenig T-Coins!'),
            tf('Eine Runde kostet {0} 🪙.<br>Du hast {1} 🪙.', ARCADE_PLAY_COST, tCoins),
            '✖ ' + t('Schliessen'));
        arcade.phase = 'broke';
        return;
    }
    addCoins(-ARCADE_PLAY_COST);
    playSound('coin');
    arcade.game = createArcadeGame(arcade.current);
    hideArcadeMessage();
    arcade.phase = 'playing';
    startArcadeLoop();
}

function arcadeEnd(win) {
    if (arcade.phase === 'win' || arcade.phase === 'over') return; // nicht doppelt abrechnen
    arcade.phase = win ? 'win' : 'over';
    stopArcadeLoop();
    let g = arcade.game;
    let score = (g && g.score) || 0;
    let key = arcade.current;
    let isRecord = false;
    if (key && (!arcadeHi[key] || score > arcadeHi[key])) { arcadeHi[key] = score; saveArcadeHi(); isRecord = true; }
    updateArcadeHud(g);
    playSound(win ? 'achievement' : 'lose');

    // --- Belohnung: XP abhaengig vom Score, deutlich mehr als die 5 XP
    // normaler Minispiele. Gedeckelt, damit ein Highscore-Lauf keinen
    // Level-Sprung verschenkt. Sieg gibt einen Bonus obendrauf. ---
    let xpGain = Math.min(80, 15 + Math.floor(score / 10)) + (win ? 25 : 0);
    let coinGain = Math.min(120, Math.floor(score / 8)) + (win ? 20 : 0);
    let recordBonus = isRecord ? 20 : 0;
    xpGain += recordBonus;

    // Spielen macht gluecklich (Rekord/Sieg etwas mehr)
    if (typeof pet !== 'undefined' && pet && !pet.isDead && !pet.isDeparted) {
        let happyGain = 8 + (win ? 6 : 0) + (isRecord ? 4 : 0);
        pet.happiness = Math.min(100, pet.happiness + happyGain);
        markCareInteraction && markCareInteraction();
    }
    let gotCoins = addCoins(coinGain);
    addAccountXP(xpGain);

    let net = gotCoins - ARCADE_PLAY_COST;
    let netTxt = net >= 0 ? `+${net}` : `${net}`;
    let rewardLine = `<br><span style="color:#9be89b;">+${xpGain} XP · +${gotCoins} 🪙</span>`
                   + `<br><span style="font-size:9px; color:${net >= 0 ? '#9be89b' : '#ff9f9f'};">${t('Einsatz')} −${ARCADE_PLAY_COST} 🪙 · ${t('Bilanz')} ${netTxt} 🪙</span>`;
    let sub = `SCORE <b style="color:#fff;">${score}</b>` + (isRecord ? '<br>🏆 NEUER HIGHSCORE!' : `<br>HI ${arcadeHi[key]||0}`) + rewardLine;
    showArcadeMessage(win ? '🎉 GEWONNEN!' : 'GAME OVER', sub, `↻ ${t('NOCHMAL')} — ${ARCADE_PLAY_COST} 🪙`);
}

function quitArcade() {
    if (arcade.current) { showArcadeMenu(); playSound('cancel'); return; }
    stopArcadeLoop();
    removeArcadeInput();
    arcade.current = null; arcade.game = null; arcade.phase = null;
    document.getElementById('arcadeOverlay').style.display = 'none';
    document.getElementById('arcadeMessage').classList.remove('show');
    playSound('cancel');
    if (typeof render === 'function') render();
}

// --- Steuerung ---
function ensureArcadeInput() {
    if (arcade.keyHandler) return;
    arcade.keyHandler = (e) => {
        let k = e.key;
        if (['ArrowLeft','ArrowRight','ArrowUp','ArrowDown',' '].includes(k)) e.preventDefault();
        if (k === 'ArrowLeft') arcade.input.left = true;
        else if (k === 'ArrowRight') arcade.input.right = true;
        else if (k === 'ArrowUp') arcade.input.up = true;
        else if (k === 'ArrowDown') arcade.input.down = true;
        else if (k === ' ') arcade.input.fire = true;
    };
    arcade.keyUpHandler = (e) => {
        let k = e.key;
        if (k === 'ArrowLeft') arcade.input.left = false;
        else if (k === 'ArrowRight') arcade.input.right = false;
        else if (k === 'ArrowUp') arcade.input.up = false;
        else if (k === 'ArrowDown') arcade.input.down = false;
        else if (k === ' ') arcade.input.fire = false;
    };
    window.addEventListener('keydown', arcade.keyHandler);
    window.addEventListener('keyup', arcade.keyUpHandler);
}
function removeArcadeInput() {
    if (arcade.keyHandler) window.removeEventListener('keydown', arcade.keyHandler);
    if (arcade.keyUpHandler) window.removeEventListener('keyup', arcade.keyUpHandler);
    arcade.keyHandler = null; arcade.keyUpHandler = null;
    arcade.input = { left:false, right:false, up:false, down:false, fire:false };
}
function arcadeBtn(action, down) { if (arcade.input.hasOwnProperty(action)) arcade.input[action] = down; }

function renderArcadeControls(type) {
    let c = document.getElementById('arcadeControls');
    const b = (a) => `onpointerdown="arcadeBtn('${a}',true)" onpointerup="arcadeBtn('${a}',false)" onpointerleave="arcadeBtn('${a}',false)" oncontextmenu="return false"`;
    let html = '';
    if (type === 'lrf') html = `<button class="arc-btn" ${b('left')}>◀</button><button class="arc-btn arc-fire" ${b('fire')}>● FEUER</button><button class="arc-btn" ${b('right')}>▶</button>`;
    else if (type === 'ud') html = `<button class="arc-btn" ${b('up')}>▲</button><button class="arc-btn" ${b('down')}>▼</button>`;
    else if (type === 'udf') html = `<button class="arc-btn" ${b('up')}>▲</button><button class="arc-btn arc-fire" ${b('fire')}>● FEUER</button><button class="arc-btn" ${b('down')}>▼</button>`;
    c.innerHTML = html;
}

// --- Loop & HUD ---
function startArcadeLoop() {
    stopArcadeLoop();
    if (!arcade.ctx) return;
    arcade.running = true;
    arcade.lastTs = performance.now();
    arcade.raf = requestAnimationFrame(arcadeFrame);
}
function stopArcadeLoop() {
    arcade.running = false;
    if (arcade.raf) cancelAnimationFrame(arcade.raf);
    arcade.raf = null;
}
function arcadeFrame(ts) {
    if (!arcade.running) return;
    let dt = Math.min(0.05, (ts - arcade.lastTs) / 1000);
    arcade.lastTs = ts;
    let g = arcade.game;
    if (g && arcade.phase === 'playing') {
        g.update(dt);
        if (arcade.ctx) g.draw(arcade.ctx);
        updateArcadeHud(g);
    }
    if (arcade.running) arcade.raf = requestAnimationFrame(arcadeFrame);
}
function updateArcadeHud(g) {
    if (!g) return;
    document.getElementById('arcScore').innerText = g.score || 0;
    document.getElementById('arcHi').innerText = (arcade.current && arcadeHi[arcade.current]) || 0;
    document.getElementById('arcWave').innerText = g.hudCenter ? g.hudCenter() : '';
    document.getElementById('arcLives').innerText = (g.lives != null) ? '❤️'.repeat(Math.max(0, g.lives)) : '';
}
function showArcadeMessage(title, sub, btn) {
    document.getElementById('amTitle').innerText = title;
    document.getElementById('amSub').innerHTML = sub;
    let b = document.getElementById('amBtn');
    b.style.display = ''; b.innerText = btn;
    document.getElementById('arcadeMessage').classList.add('show');
}
function hideArcadeMessage() { document.getElementById('arcadeMessage').classList.remove('show'); }

// --- Zeichen-Helfer ---
function drawPetSprite(ctx, x, y, size, rot) {
    ctx.save();
    ctx.translate(x, y);
    if (rot) ctx.rotate(rot);
    try { ctx.filter = (pet && pet.hueShift) ? `hue-rotate(${pet.hueShift}deg)` : 'none'; } catch(e) {}
    ctx.font = size + 'px serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(getPetEmojiRaw(), 0, 0);
    ctx.restore();
}
function arcRoundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath(); ctx.fill();
}
let arcadeStars = [];
function initArcadeStars() {
    arcadeStars = [];
    for (let i = 0; i < 45; i++) arcadeStars.push({ x: Math.random()*480, y: Math.random()*360, s: Math.random()*1.6+0.4, sp: Math.random()*60+20 });
}
function drawArcadeStars(ctx) {
    ctx.fillStyle = '#dfe9ff';
    arcadeStars.forEach(st => { ctx.globalAlpha = st.s/2; ctx.fillRect(st.x, st.y, st.s, st.s); });
    ctx.globalAlpha = 1;
}
function updateParticles(arr, dt) {
    for (let i = arr.length - 1; i >= 0; i--) {
        let pt = arr[i]; pt.x += pt.vx*dt; pt.y += pt.vy*dt; pt.life -= dt;
        if (pt.life <= 0) arr.splice(i, 1);
    }
}
function drawParticles(ctx, arr) {
    arr.forEach(pt => { ctx.globalAlpha = Math.max(0, Math.min(1, pt.life*2.5)); ctx.fillStyle = pt.color; ctx.fillRect(pt.x-2, pt.y-2, 4, 4); });
    ctx.globalAlpha = 1;
}

function createArcadeGame(key) {
    if (key === 'invaders') return makeInvaders();
    if (key === 'pong') return makePong();
    if (key === 'defender') return makeDefender();
    return null;
}

// ---------- SPACE INVADERS ----------
function makeInvaders() {
    const W = 480, H = 360;
    let g = { score: 0, lives: 3, wave: 1 };
    let player = { x: W/2, speed: 240 };
    let bullets = [], bombs = [], particles = [];
    let cool = 0, dir = 1, stepEvery = 0.6, stepT = 0;
    const KINDS = ['👾','👽','🛸'];
    let aliens = [];
    initArcadeStars();
    function spawnWave() {
        aliens = [];
        let cols = 7, rows = Math.min(5, 3 + (g.wave - 1));
        for (let r = 0; r < rows; r++)
            for (let c = 0; c < cols; c++)
                aliens.push({ x: 66 + c*52, y: 38 + r*34, alive: true, type: r % KINDS.length });
        dir = 1; stepEvery = Math.max(0.14, 0.6 - g.wave*0.06); stepT = 0;
    }
    spawnWave();
    function burst(x, y, col) { for (let i = 0; i < 10; i++) particles.push({ x, y, vx:(Math.random()-.5)*180, vy:(Math.random()-.5)*180, life:0.5, color: col }); }
    function loseLife() {
        g.lives--; burst(player.x, H-30, '#ff5d73'); playSound('lose'); bombs = [];
        if (g.lives <= 0) arcadeEnd(false);
    }
    g.hudCenter = () => 'WAVE ' + g.wave;
    g.intro = t('Wehre die Alien-Wellen ab!') + '\n' + t('Dein Ei ist die Laserkanone.');
    g.update = (dt) => {
        if (arcade.input.left) player.x -= player.speed*dt;
        if (arcade.input.right) player.x += player.speed*dt;
        player.x = Math.max(18, Math.min(W-18, player.x));
        cool -= dt;
        if (arcade.input.fire && cool <= 0) { bullets.push({ x: player.x, y: H-46 }); cool = 0.34; playSound('beep'); }
        bullets.forEach(b => b.y -= 360*dt); bullets = bullets.filter(b => b.y > -12);
        stepT += dt;
        if (stepT >= stepEvery) {
            stepT = 0;
            let living = aliens.filter(a => a.alive);
            if (living.length) {
                let minx = Math.min(...living.map(a=>a.x)), maxx = Math.max(...living.map(a=>a.x));
                if (maxx + dir*14 > W-18 || minx + dir*14 < 18) { dir *= -1; living.forEach(a => a.y += 16); }
                else living.forEach(a => a.x += dir*14);
                if (Math.random() < 0.55) { let a = living[Math.floor(Math.random()*living.length)]; bombs.push({ x: a.x, y: a.y }); }
                if (living.some(a => a.y > H-58)) { loseLife(); living.forEach(a => a.y -= 46); }
            }
        }
        bombs.forEach(b => b.y += 165*dt); bombs = bombs.filter(b => b.y < H+12);
        bullets.forEach(b => aliens.forEach(a => {
            if (a.alive && Math.abs(a.x-b.x) < 16 && Math.abs(a.y-b.y) < 15) { a.alive = false; b.y = -999; g.score += 10*g.wave; burst(a.x, a.y, '#2afadf'); playSound('coin'); }
        }));
        bullets = bullets.filter(b => b.y > -12);
        bombs.forEach(b => { if (Math.abs(b.x-player.x) < 18 && b.y > H-42) { b.y = 999; loseLife(); } });
        bombs = bombs.filter(b => b.y < H+12);
        if (!aliens.some(a => a.alive)) { g.wave++; bombs = []; bullets = []; spawnWave(); }
        updateParticles(particles, dt);
    };
    g.draw = (ctx) => {
        ctx.fillStyle = '#05070f'; ctx.fillRect(0,0,W,H);
        drawArcadeStars(ctx);
        ctx.font = '24px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        aliens.forEach(a => { if (a.alive) ctx.fillText(KINDS[a.type], a.x, a.y); });
        ctx.fillStyle = '#2afadf'; bullets.forEach(b => ctx.fillRect(b.x-2, b.y-9, 4, 13));
        ctx.fillStyle = '#ff5d73'; bombs.forEach(b => ctx.fillRect(b.x-2, b.y-6, 4, 12));
        drawPetSprite(ctx, player.x, H-28, 36);
        drawParticles(ctx, particles);
    };
    return g;
}

// ---------- PONG ----------
function makePong() {
    const W = 480, H = 360, PH = 66;
    let g = { score: 0, lives: null };
    let pad = { y: H/2 }, ai = { y: H/2 }, aiSpeed = 190;
    let scoreP = 0, scoreAI = 0;
    let ball = { x: W/2, y: H/2, vx: 210, vy: 120, r: 7 };
    let particles = [];
    function resetBall(d) { ball.x = W/2; ball.y = H/2; ball.vx = d*210; ball.vy = (Math.random()*220-110); }
    resetBall(Math.random() < .5 ? 1 : -1);
    function burst(x, y) { for (let i = 0; i < 8; i++) particles.push({ x, y, vx:(Math.random()-.5)*170, vy:(Math.random()-.5)*170, life:0.4, color:'#2afadf' }); }
    g.hudCenter = () => `${scoreP} : ${scoreAI}`;
    g.intro = t('Erreiche 7 Punkte gegen die Wolken-KI!') + '\n' + t('Dein Ei ist der Schläger.');
    g.update = (dt) => {
        let spd = 280;
        if (arcade.input.up) pad.y -= spd*dt;
        if (arcade.input.down) pad.y += spd*dt;
        pad.y = Math.max(PH/2, Math.min(H-PH/2, pad.y));
        if (ai.y < ball.y - 6) ai.y += aiSpeed*dt; else if (ai.y > ball.y + 6) ai.y -= aiSpeed*dt;
        ai.y = Math.max(PH/2, Math.min(H-PH/2, ai.y));
        ball.x += ball.vx*dt; ball.y += ball.vy*dt;
        if (ball.y < ball.r) { ball.y = ball.r; ball.vy *= -1; }
        if (ball.y > H-ball.r) { ball.y = H-ball.r; ball.vy *= -1; }
        if (ball.x-ball.r < 38 && ball.x > 16 && Math.abs(ball.y-pad.y) < PH/2+4 && ball.vx < 0) { ball.vx = Math.abs(ball.vx)*1.06; ball.vy += (ball.y-pad.y)*3.2; playSound('beep'); burst(ball.x, ball.y); }
        if (ball.x+ball.r > W-30 && ball.x < W-14 && Math.abs(ball.y-ai.y) < PH/2+4 && ball.vx > 0) { ball.vx = -Math.abs(ball.vx)*1.06; ball.vy += (ball.y-ai.y)*3.2; playSound('beep'); burst(ball.x, ball.y); }
        if (ball.x < -4) { scoreAI++; playSound('lose'); if (scoreAI >= 7) { arcadeEnd(false); return; } resetBall(1); }
        if (ball.x > W+4) { scoreP++; g.score = scoreP*100; playSound('coin'); if (scoreP >= 7) { arcadeEnd(true); return; } resetBall(-1); }
        updateParticles(particles, dt);
    };
    g.draw = (ctx) => {
        ctx.fillStyle = '#05070f'; ctx.fillRect(0,0,W,H);
        ctx.strokeStyle = '#22315e'; ctx.lineWidth = 2; ctx.setLineDash([8,10]);
        ctx.beginPath(); ctx.moveTo(W/2,0); ctx.lineTo(W/2,H); ctx.stroke(); ctx.setLineDash([]);
        ctx.fillStyle = '#8be9fd'; arcRoundRect(ctx, W-28, ai.y-PH/2, 10, PH, 5);
        ctx.fillStyle = 'rgba(42,250,223,0.18)'; arcRoundRect(ctx, 16, pad.y-PH/2, 12, PH, 6);
        drawPetSprite(ctx, 24, pad.y, PH);
        ctx.fillStyle = '#2afadf'; ctx.beginPath(); ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI*2); ctx.fill();
        drawParticles(ctx, particles);
    };
    return g;
}

// ---------- DEFENDER ----------
function makeDefender() {
    const W = 480, H = 360;
    let g = { score: 0, lives: 3 };
    let player = { x: 70, y: H/2, speed: 240 };
    let bullets = [], enemies = [], particles = [];
    let cool = 0, spawnT = 0, dist = 0;
    initArcadeStars();
    function burst(x, y, col) { for (let i = 0; i < 10; i++) particles.push({ x, y, vx:(Math.random()-.5)*190, vy:(Math.random()-.5)*190, life:0.5, color: col }); }
    function loseLife() { g.lives--; burst(player.x, player.y, '#ff5d73'); playSound('lose'); if (g.lives <= 0) arcadeEnd(false); }
    g.hudCenter = () => 'DIST ' + Math.floor(dist);
    g.intro = t('Fliege durchs All!') + '\n' + t('Deine Kanone feuert von allein.');
    g.update = (dt) => {
        dist += dt*12;
        if (arcade.input.up) player.y -= player.speed*dt;
        if (arcade.input.down) player.y += player.speed*dt;
        player.y = Math.max(20, Math.min(H-20, player.y));
        cool -= dt;
        // Dauerfeuer: drei Knoepfe gleichzeitig waren zu fummelig - jetzt nur noch fliegen.
        if (cool <= 0) { bullets.push({ x: player.x+20, y: player.y }); cool = 0.26; playSound('beep'); }
        bullets.forEach(b => b.x += 400*dt); bullets = bullets.filter(b => b.x < W+12);
        spawnT += dt;
        let every = Math.max(0.45, 1.2 - dist*0.0025);
        if (spawnT >= every) { spawnT = 0; enemies.push({ x: W+24, y: 36+Math.random()*(H-72), t: Math.random()*6, type: Math.floor(Math.random()*2) }); }
        enemies.forEach(e => { e.t += dt; e.x -= 128*dt; e.y += Math.sin(e.t*2)*34*dt; });
        bullets.forEach(b => enemies.forEach(e => {
            if (e.alive !== false && Math.abs(e.x-b.x) < 18 && Math.abs(e.y-b.y) < 16) { e.alive = false; b.x = 9999; g.score += 15; burst(e.x, e.y, '#2afadf'); playSound('coin'); }
        }));
        enemies.forEach(e => { if (e.alive !== false && Math.abs(e.x-player.x) < 22 && Math.abs(e.y-player.y) < 22) { e.alive = false; loseLife(); } });
        bullets = bullets.filter(b => b.x < W+12 && b.x < 9000);
        enemies = enemies.filter(e => e.alive !== false && e.x > -30); // entkommene UFOs fliegen einfach vorbei (kosten kein Leben)
        arcadeStars.forEach(st => { st.x -= st.sp*dt; if (st.x < 0) { st.x = W; st.y = Math.random()*H; } });
        updateParticles(particles, dt);
    };
    g.draw = (ctx) => {
        ctx.fillStyle = '#05070f'; ctx.fillRect(0,0,W,H);
        drawArcadeStars(ctx);
        ctx.font = '24px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        enemies.forEach(e => ctx.fillText(e.type ? '🛸' : '👾', e.x, e.y));
        ctx.fillStyle = '#ffde5a'; bullets.forEach(b => ctx.fillRect(b.x-7, b.y-2, 13, 4));
        drawPetSprite(ctx, player.x, player.y, 36);
        drawParticles(ctx, particles);
    };
    return g;
}

// ================================================================
// === ROTE NOTIFIKATIONS-PUNKTE IM DOCK ==========================
// ================================================================
// Jede Quelle liefert eine Signatur ihres aktuellen Standes. Weicht sie
// vom zuletzt gesehenen Stand ab, erscheint ein roter Punkt + leichte
// Hervorhebung am Icon - bis der Nutzer es einmal geoeffnet hat.
