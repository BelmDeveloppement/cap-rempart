/* (c) 2026 SAS BELM DEVELOPPEMENT. Tous droits reserves. */
(function (CR) {
  var V = CR.V, esc = CR.esc;
  var X = { data: null, docs: {}, ctl: null, mine: {}, final: {}, qpos: {}, exOpen: {}, status: { s: "connecting" }, mode: "mqtt", net: null, code: null, route: null, pickP: 1, ready: false, openT: null, base: location.origin + location.pathname };
  var timers = {}; var dirty = false;
  function ls(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { } return null; }
  function toast(t) { var el = document.getElementById("toast"); el.textContent = t; el.hidden = false; clearTimeout(timers.toast); timers.toast = setTimeout(function () { el.hidden = true; }, 2600); }

  // ---------------------------------------------------------------- routage
  function parse() {
    var h = location.hash.replace(/^#/, ""); var q = {}; var i = h.indexOf("?");
    if (i >= 0) { h.slice(i + 1).split("&").forEach(function (kv) { var a = kv.split("="); q[a[0]] = decodeURIComponent(a[1] || ""); }); h = h.slice(0, i); }
    var p = h.split("/").filter(Boolean); var r = { view: p[0] || "landing", q: q };
    if (r.view === "join") { r.code = p[1]; r.t = +p[2]; r.view = "landing"; q.s = p[1]; q.t = p[2]; }
    else if (r.view === "play") { r.code = p[1]; r.t = +p[2]; r.p = +p[3] || 1; }
    else if (r.view === "m") { r.code = p[1]; r.t = +p[2]; r.p = +p[3] || 1; r.m = p[4]; }
    else if (r.view === "tower") { r.code = p[1]; r.t = +p[2]; r.p = 0; }
    else if (r.view === "teacher") { r.code = p[1]; }
    return r;
  }
  function go(h) { location.hash = h; }

  function ensureNet(r) {
    if (!r.code) { if (X.net) { X.net.close(); X.net = null; X.code = null; } return; }
    var mode = r.q.net === "local" ? "local" : "mqtt"; var b = +(r.q.b || 0);
    if (X.net && X.code === r.code && X.mode === mode) return;
    if (X.net) X.net.close();
    X.docs = {}; X.ctl = null; X.mine = {}; X.final = {}; X.finishing = null; X.ready = false; X.code = r.code; X.mode = mode;
    var n = new CR.Net(r.code, b, mode); X.net = n;
    n.onstatus = function (s, d) { X.status = { s: s, d: d }; render(); };
    n.onmsg = function (topic, obj) { onDoc(topic, obj); };
    n.connect();
    setTimeout(function () { X.ready = true; afterReady(); render(); }, 2200);
  }
  function onDoc(topic, obj) {
    if (obj === null) { delete X.docs[topic]; } else X.docs[topic] = obj;
    if (topic === "ctl") X.ctl = obj;
    var p = topic.split("/");
    if (p[0] === "ans" && X.route && +p[1] === X.route.t && +p[2] === X.route.p && obj && !X.mine[p[3]]) X.mine[p[3]] = { a: obj.a || {}, h: obj.h || [], done: !!obj.done, ok: !!obj.ok };
    if (p[0] === "fin" && X.route && +p[1] === X.route.t && +p[2] === X.route.p && obj && !X.mine.F) X.mine.F = { a: obj.a || {} };
    schedule();
  }
  var rq = null;
  function schedule() { if (rq) return; rq = setTimeout(function () { rq = null; render(); }, 60); }
  function pub(t, o) { if (X.net) X.net.pub(t, o); }

  // ---------------------------------------------------------------- rendu
  function render() {
    var r = X.route; if (!r) return;
    var ae = document.activeElement;
    if (ae && /^(TEXTAREA|INPUT|SELECT)$/.test(ae.tagName) && document.getElementById("app").contains(ae) && ae.type !== "checkbox") { dirty = true; return; }
    dirty = false;
    var D = X.data; X.q = r.q; X.lastTeacher = ls("cr_teacher") ? JSON.parse(ls("cr_teacher")) : null;
    document.body.className = (r.view === "tower" ? "towerview" : "") + (r.view === "teacher" ? "teacherview" : "");
    var html = "";
    if (r.t) {
      X.t = r.t; X.p = r.p;
      X.present = []; for (var p = 1; p <= 5; p++) if (X.docs["join/" + X.t + "/" + p]) X.present.push(p); if (X.p && X.present.indexOf(X.p) < 0) { X.present.push(X.p); X.present.sort(); }
      X.unread = X.present.filter(function (p) { return !X.docs["rd/" + X.t + "/" + p]; });
      X.briefOk = !X.unread.length || !!(X.ctl && X.ctl.force && X.ctl.force[X.t + ":0"]);
      X.d = CR.derive(X.docs, X.ctl, X.t, D);
      X.nt = (X.ctl && X.ctl.tables) || 5;
      var rk = CR.rank(X.docs, X.ctl, X.nt, D); X.rank = 0; rk.forEach(function (z) { if (z.t === X.t) X.rank = z.rank; });
      // attaque en attente d'affichage
      X.pendingAttack = null;
      if (X.ctl && X.ctl.attacks) {
        for (var i = X.d.attacks.length - 1; i >= 0; i--) { var a = X.d.attacks[i]; if (!ls("crack/" + X.code + "/" + X.t + "/" + a.id)) { X.pendingAttack = a; break; } }
      }
      X.msgSeen = X.ctl && X.ctl.msg && ls("crmsg/" + X.code + "/" + X.t + "/" + X.p) === String(X.ctl.msg.id);
    }
    if (r.view === "landing") html = V.landing(X);
    else if (r.view === "play") { html = V.home(X); }
    else if (r.view === "m") {
      if (r.m === "0") html = V.entree(X);
      else if (r.m === "F") html = V.final(X);
      else { var m = D.missions[+r.m - 1]; X.curM = m; html = m ? V.mission(X, m) : "<p>Mission inconnue</p>"; }
    }
    else if (r.view === "tower") html = V.tower(X);
    else if (r.view === "teacher") html = V.teacher(X);
    if (r.view === "m" && r.m !== "0") { var bk = V.backBig(X); html = bk + html + bk; }
    else if (r.view === "m") { var bk0 = V.backBig(X); html = bk0 + html + bk0; }
    if (r.t && r.view !== "landing") html += V.attackOverlay(X);
    document.getElementById("app").innerHTML = html;
    document.querySelectorAll("[data-qr]").forEach(function (el) { try { var q = qrcode(0, "M"); q.addData(el.getAttribute("data-qr")); q.make(); el.innerHTML = q.createSvgTag({ cellSize: 3, margin: 0, scalable: true }); } catch (e) { el.textContent = "QR indisponible"; } });
    if (r.view === "teacher" && !X.ctl && X.ready) { var saved = ls("cr_ctl_" + r.code); if (saved) { X.ctl = JSON.parse(saved); pub("ctl", X.ctl); } }
    updateChronos();
    maybeFinish();
  }
  // tous les joueurs presents ont valide : la table publie le resultat (idempotent)
  function maybeFinish() {
    var r = X.route; if (!r || r.view !== "m" || !X.ready || !X.ctl || r.m === "0" || r.m === "F") return;
    var m = X.data.missions[+r.m - 1]; if (!m || X.docs["res/" + X.t + "/" + m.id]) return;
    var cm = X.ctl.missions && X.ctl.missions[m.id]; if (!cm || !cm.open) return;
    var need = X.present.slice(); var force = X.ctl.force && X.ctl.force[X.t + ":" + m.id];
    var ready = need.filter(function (p) { var d = X.docs["ans/" + X.t + "/" + p + "/" + m.id]; return d && d.done && d.ok; });
    if (!ready.length || (!force && ready.length < need.length)) return;
    if (X.finishing === X.t + ":" + m.id) return; X.finishing = X.t + ":" + m.id;
    var res = buildRes(m, m.id, "graded", {}, null);
    var hasOpen = CR.applicable(m, res.snap.lvl).some(function (i) { return m.qs[i].t === "open"; });
    if (hasOpen) res.status = "pending";
    pub("res/" + X.t + "/" + m.id, res);
  }
  function afterReady() {
    var r = X.route; if (!r || !r.t) return;
    if (r.view === "play" || r.view === "m") { if (!X.docs["join/" + r.t + "/" + r.p]) pub("join/" + r.t + "/" + r.p, { t: r.t, p: r.p, ts: Date.now() }); }
    if (X.ctl && X.ctl.attacks) X.ctl.attacks.forEach(function (a) { ls("crack/" + X.code + "/" + r.t + "/" + a.id, "1"); });
  }
  function publishAttacks() {
    var r = X.route; if (!r || !r.t || !X.ready || !X.d) return;
    X.d.attacks.forEach(function (a) { if (a.pending) { var o = { outcome: a.outcome, zone: a.zone, attacker: a.attacker, ts: Date.now() }; pub("att/" + r.t + "/" + a.id, o); } });
  }
  function updateChronos() {
    var c = X.ctl; if (!c) return;
    document.querySelectorAll("[data-chrono]").forEach(function (el) {
      var id = el.getAttribute("data-chrono"); var cm = c.missions && c.missions[id]; if (!cm || !cm.open) { if (id) el.textContent = "--:--"; return; }
      el.textContent = CR.mmss(CR.elapsed(cm));
    });
  }
  setInterval(function () { updateChronos(); if (dirty) { var ae = document.activeElement; if (!ae || ae === document.body) render(); } }, 1000);
  document.addEventListener("focusout", function () { setTimeout(function () { if (dirty) render(); }, 150); });

  // ---------------------------------------------------------------- reponses
  function mineOf(mid) { return X.mine[mid] || (X.mine[mid] = { a: {}, h: [], done: false }); }
  function saveMine(mid) {
    clearTimeout(timers["s" + mid]);
    timers["s" + mid] = setTimeout(function () {
      var r = X.route; var m = mineOf(mid);
      if (mid === "F") pub("ans/" + r.t + "/" + r.p + "/F", { a: m.a, done: false, ts: Date.now() });
      else pub("ans/" + r.t + "/" + r.p + "/" + mid, { a: m.a, h: m.h, done: m.done, ts: Date.now() });
    }, 250);
  }
  function applyAnswer(store, i, q, el) {
    var act = el.getAttribute("data-act"), v = el.getAttribute("data-v");
    if (act === "qcm") store[i] = +v;
    else if (act === "multi") { var cur = (store[i] || []).slice(); var k = +v; var ix = cur.indexOf(k); if (ix >= 0) cur.splice(ix, 1); else cur.push(k); cur.sort(function (a, b) { return a - b; }); store[i] = cur; }
    else if (act === "grid") { var g = (store[i] || []).slice(); while (g.length < q.rows.length) g.push(null); g[+el.getAttribute("data-r")] = +v; store[i] = g; }
    else if (act === "up" || act === "down") {
      var ord = (store[i] || CR.shuffled(q.o.length, "q" + (X.curM ? X.curM.id : "F") + ":" + i)).slice(); var kk = +el.getAttribute("data-k"); var j = act === "up" ? kk - 1 : kk + 1;
      if (j >= 0 && j < ord.length) { var t = ord[kk]; ord[kk] = ord[j]; ord[j] = t; } store[i] = ord;
    }
  }

  function buildRes(m, mid, status, crit, existing) {
    var c = X.ctl, cm = c.missions[mid]; var snap = (existing && existing.snap) || { lvl: cm.lvl, lo: cm.lo, hi: cm.hi };
    var force = c.force && c.force[X.t + ":" + mid]; var hs = {}, by = {};
    if (existing && existing.ans) by = existing.ans;
    else X.present.forEach(function (p) { var d = X.docs["ans/" + X.t + "/" + p + "/" + mid]; if (d && d.done && (d.ok || force)) { by[p] = d.a || {}; if (d.h) d.h.forEach(function (i) { hs[i] = 1; }); } });
    var hc = existing ? existing.hints : Object.keys(hs).length;
    var free = !!(c.hints && (c.hints[X.t + ":" + mid] || c.hints["*:" + mid]));
    var r = CR.computeTable(m, snap, by, crit, hc, free);
    return { m: +mid, snap: snap, ans: by, crit: crit, hints: hc, free: free, pts: r.pts, max: r.max, penalty: r.penalty, pct: r.pct, bar: r.bar, imp: r.imp, per: r.per, status: status, by: X.p, ts: Date.now() };
  }

  // ---------------------------------------------------------------- enseignant
  function T(fn) { var c = X.ctl; fn(c); c.ts = Date.now(); ls("cr_ctl_" + X.code, JSON.stringify(c)); pub("ctl", c); }
  function newCtl(code, broker) { return { code: code, ts: Date.now(), level: "standard", lo: 50, hi: 80, tables: 5, paused: false, showRank: false, missions: {}, reveal: {}, hints: {}, msg: null, attacks: [], broker: broker }; }
  function csv() {
    var D = X.data, c = X.ctl, out = []; var q = function (v) { v = v == null ? "" : String(v); return /[;"\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
    out.push("Séance;" + X.code + ";Niveau initial;" + c.level + ";Export;" + new Date().toISOString());
    out.push(""); out.push("RÉSULTATS PAR MISSION");
    out.push(["table", "couleur", "mission", "zone", "niveau", "seuil_bas", "seuil_haut", "pourcentage", "points", "points_max", "indices", "penalite", "barrieres", "impact", "statut"].join(";"));
    for (var t = 1; t <= c.tables; t++) D.missions.forEach(function (m) { var r = X.docs["res/" + t + "/" + m.id]; if (r) out.push([t, CR.COLORS[t - 1].n, m.id, q(m.title), r.snap.lvl, r.snap.lo, r.snap.hi, r.pct, r.pts, r.max, r.hints, r.penalty, r.status === "graded" ? r.bar : "", r.status === "graded" ? r.imp : "", r.status].join(";")); });
    out.push(""); out.push("ATTAQUES");
    out.push(["table", "attaque", "zone", "resultat", "attaquant"].join(";"));
    for (var t2 = 1; t2 <= c.tables; t2++) CR.derive(X.docs, c, t2, D).attacks.forEach(function (a) { out.push([t2, a.id, a.zone, a.outcome, q(a.attacker)].join(";")); });
    out.push(""); out.push("SCORES");
    out.push(["rang", "table", "barrieres", "impacts", "score"].join(";"));
    CR.rank(X.docs, c, c.tables, D).forEach(function (r) { out.push([r.rank, r.t, r.d.barTotal, r.d.imp, r.d.score].join(";")); });
    out.push(""); out.push("QCM FINAL (sans nom)");
    out.push(["table", "joueur", "points", "pourcentage"].join(";"));
    for (var t3 = 1; t3 <= 5; t3++) for (var p = 1; p <= 5; p++) { var f = X.docs["fin/" + t3 + "/" + p]; if (f) out.push([t3, p, f.pts, f.pct].join(";")); }
    return "﻿" + out.join("\r\n");
  }
  function download(name, text, type) { var b = new Blob([text], { type: type }); var a = document.createElement("a"); a.href = URL.createObjectURL(b); a.download = name; document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500); }
  function report() {
    var D = X.data, c = X.ctl; var w = window.open("", "_blank"); if (!w) { toast("Autorisez les fenêtres pour le rapport"); return; }
    var h = "<!doctype html><meta charset=utf-8><title>Cap Rempart · rapport de séance " + esc(X.code) + "</title><style>body{font:14px/1.4 Arial,sans-serif;margin:24px;color:#111}h1{font-size:22px}h2{font-size:16px;margin-top:22px;border-bottom:2px solid #D9A93B}table{border-collapse:collapse;width:100%}td,th{border:1px solid #bbb;padding:4px 6px;text-align:left;font-size:12px}th{background:#eee}.f{margin-top:30px;font-size:11px;color:#666}</style>";
    h += "<h1>Cap Rempart · rapport de séance " + esc(X.code) + "</h1><p>Date : " + new Date().toLocaleString("fr-FR") + " · niveau choisi à la création : " + CR.LEVELS[c.level].label + " · seuils courants " + c.lo + " % / " + c.hi + " %</p>";
    h += "<h2>Classement</h2><table><tr><th>Rang</th><th>Table</th><th>Barrières</th><th>Impacts</th><th>Score</th></tr>" + CR.rank(X.docs, c, c.tables, D).map(function (r) { return "<tr><td>" + r.rank + "</td><td>" + r.t + " · " + CR.COLORS[r.t - 1].n + "</td><td>" + r.d.barTotal + "</td><td>" + r.d.imp + "</td><td><b>" + r.d.score + "</b></td></tr>"; }).join("") + "</table>";
    h += "<h2>Résultats par mission</h2><table><tr><th>Table</th><th>Mission</th><th>Niveau</th><th>Seuils</th><th>%</th><th>Points</th><th>Indices</th><th>Barrières</th><th>Impact</th></tr>";
    for (var t = 1; t <= c.tables; t++) D.missions.forEach(function (m) { var r = X.docs["res/" + t + "/" + m.id]; if (r) h += "<tr><td>" + t + "</td><td>" + m.id + " " + esc(m.title) + "</td><td>" + CR.LEVELS[r.snap.lvl].label + "</td><td>" + r.snap.lo + "/" + r.snap.hi + "</td><td>" + r.pct + "</td><td>" + r.pts + "/" + r.max + "</td><td>" + r.hints + "</td><td>" + (r.status === "graded" ? r.bar : "à noter") + "</td><td>" + (r.status === "graded" ? r.imp : "") + "</td></tr>"; });
    h += "</table><h2>Attaques</h2><table><tr><th>Table</th><th>Attaque</th><th>Zone</th><th>Résultat</th><th>Attaquant</th></tr>";
    for (var t2 = 1; t2 <= c.tables; t2++) CR.derive(X.docs, c, t2, D).attacks.forEach(function (a) { h += "<tr><td>" + t2 + "</td><td>" + esc(a.id) + "</td><td>" + a.zone + "</td><td>" + a.outcome + "</td><td>" + esc(a.attacker) + "</td></tr>"; });
    h += "</table><div class=f>© 2026 SAS BELM DEVELOPPEMENT. Tous droits réservés. Cas TransLor fictif.</div>";
    w.document.write(h); w.document.close(); setTimeout(function () { w.print(); }, 400);
  }

  // ---------------------------------------------------------------- evenements
  document.addEventListener("click", function (ev) {
    var el = ev.target.closest("[data-act]"); if (!el || el.tagName === "SELECT" || el.tagName === "TEXTAREA") return; var act = el.getAttribute("data-act"); var r = X.route; var D = X.data;
    if (el.disabled) return;
    var mid = r.view === "m" ? r.m : null; var m = mid && mid !== "F" && mid !== "0" ? D.missions[+mid - 1] : null;
    // ---- accueil
    if (act === "pickp") { X.pickP = +el.getAttribute("data-v"); document.querySelectorAll("#in-player .pill").forEach(function (e) { e.classList.toggle("on", +e.getAttribute("data-v") === X.pickP); }); return; }
    if (act === "joinplay" || act === "jointower") {
      var code = (document.getElementById("in-code").value || "").trim().toUpperCase(); var t = document.getElementById("in-table").value;
      if (!/^[A-Z0-9]{4,8}$/.test(code)) { toast("Code de séance invalide"); return; }
      var q = r.q || {}; var isLocal = q.net === "local";
      function dest(b) { var suf = "?b=" + b + (isLocal ? "&net=local" : ""); go(act === "joinplay" ? "/play/" + code + "/" + t + "/" + X.pickP + suf : "/tower/" + code + "/" + t + suf); }
      if (q.b !== undefined || isLocal) { dest(+(q.b || 0)); return; }
      var lbl = el.textContent; el.disabled = true; el.textContent = "Recherche de la séance…";
      CR.find(code, "mqtt").then(function (b) {
        el.disabled = false; el.textContent = lbl;
        if (b < 0) { toast("Séance « " + code + " » introuvable : vérifiez le code, que l'enseignant a ouvert la séance, et votre connexion"); return; }
        dest(b);
      }); return;
    }
    if (act === "resume") { var lt = X.lastTeacher; go("/teacher/" + lt.code + "?b=" + (lt.broker || 0) + (lt.net === "local" ? "&net=local" : "")); return; }
    if (act === "newsession") {
      var net = document.getElementById("in-net").value; var A = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789", code2 = ""; for (var i = 0; i < 5; i++) code2 += A[Math.floor(Math.random() * A.length)];
      el.disabled = true; el.textContent = "Test du relais…";
      var pick = 0; (function tryB(k) {
        if (k >= CR.BROKERS.length) { toast("Aucun relais joignable : vérifiez le réseau (ou utilisez le test local)"); el.disabled = false; el.textContent = "Nouvelle séance"; return; }
        CR.probe(k, net).then(function (ok) { if (!ok) return tryB(k + 1); ls("cr_teacher", JSON.stringify({ code: code2, broker: k, net: net })); ls("cr_ctl_" + code2, JSON.stringify(newCtl(code2, k))); go("/teacher/" + code2 + "?b=" + k + (net === "local" ? "&net=local" : "")); });
      })(0); return;
    }
    if (act === "home") { go("/"); return; }
    // ---- joueur
    if (act === "ackatt") { ls("crack/" + X.code + "/" + X.t + "/" + el.getAttribute("data-id"), "1"); render(); return; }
    if (act === "msgok") { ls("crmsg/" + X.code + "/" + X.t + "/" + X.p, String(X.ctl.msg.id)); render(); return; }
    if (["qcm", "multi", "grid", "up", "down"].indexOf(act) >= 0) {
      var tg = el.getAttribute("data-tg"), i2 = +el.getAttribute("data-i");
      if (tg === "ans") { var key = mid === "F" ? "F" : mid; var st = mineOf(key); var qq = mid === "F" ? D.final[i2] : m.qs[i2]; applyAnswer(st.a, i2, qq, el); saveMine(key); render(); return; }
      return;
    }
    if (act === "hint") { var ii = +el.getAttribute("data-i"); var mm = mineOf(mid); if (mm.h.indexOf(ii) < 0) mm.h.push(ii); saveMine(mid); render(); return; }
    if (act === "prev" || act === "next") {
      var len = mid === "F" ? D.final.length : CR.applicable(m, (X.ctl.missions[mid] || {}).lvl || X.ctl.level).length;
      var cur = X.qpos[mid] || 0; cur += act === "next" ? 1 : -1; X.qpos[mid] = Math.max(0, Math.min(len - 1, cur)); render(); window.scrollTo(0, 0); return;
    }
    if (act === "finish") { var mn = mineOf(mid); mn.done = true; clearTimeout(timers["s" + mid]); pub("ans/" + r.t + "/" + r.p + "/" + mid, { a: mn.a, h: mn.h, done: true, ok: false, ts: Date.now() }); render(); window.scrollTo(0, 0); return; }
    if (act === "reopen") { var mo = mineOf(mid); mo.done = false; mo.ok = false; pub("ans/" + r.t + "/" + r.p + "/" + mid, { a: mo.a, h: mo.h, done: false, ok: false, ts: Date.now() }); render(); return; }
    if (act === "ready") { var mr = mineOf(mid); mr.ok = true; pub("ans/" + r.t + "/" + r.p + "/" + mid, { a: mr.a, h: mr.h, done: true, ok: true, ts: Date.now() }); toast("Votre validation est enregistrée"); render(); window.scrollTo(0, 0); return; }
    if (act === "readbrief") { pub("rd/" + r.t + "/" + r.p, { ts: Date.now() }); render(); window.scrollTo(0, 0); return; }
    if (act === "crit") {
      var rr = JSON.parse(JSON.stringify(X.docs["res/" + r.t + "/" + mid])); if (rr.status === "graded") return; var ci = +el.getAttribute("data-c"), qi = +el.getAttribute("data-i");
      rr.crit = rr.crit || {}; rr.crit[qi] = rr.crit[qi] || m.qs[qi].crit.map(function () { return false; }); rr.crit[qi][ci] = el.checked;
      var upd = buildRes(m, mid, "pending", rr.crit, rr); pub("res/" + r.t + "/" + mid, upd); return;
    }
    if (act === "endgrade") { var r0 = X.docs["res/" + r.t + "/" + mid]; var upd2 = buildRes(m, mid, "graded", r0.crit || {}, r0); pub("res/" + r.t + "/" + mid, upd2); window.scrollTo(0, 0); return; }
    if (act === "finalfinish") {
      var st2 = mineOf("F"), pts = 0; D.final.forEach(function (q, i) { pts += CR.scoreQ(q, st2.a[i]); });
      pts = Math.round(pts * 100) / 100; pub("fin/" + r.t + "/" + r.p, { a: st2.a, pts: pts, n: D.final.length, pct: Math.round(pts / D.final.length * 1000) / 10, ts: Date.now() }); render(); window.scrollTo(0, 0); return;
    }
    // ---- enseignant
    if (r.view !== "teacher" || !X.ctl) return;
    if (act === "level") { var lv = el.getAttribute("data-v"); T(function (c) { c.level = lv; c.lo = CR.LEVELS[lv].lo; c.hi = CR.LEVELS[lv].hi; }); render(); return; }
    if (act === "applythr") { var lo = +document.getElementById("in-lo").value, hi = +document.getElementById("in-hi").value; if (!(lo >= 0 && hi <= 100 && lo < hi)) { toast("Seuils invalides (bas < haut, 0 à 100)"); return; } T(function (c) { c.lo = lo; c.hi = hi; }); toast("Seuils appliqués aux prochaines missions"); render(); return; }
    if (act === "pause") { T(function (c) { c.paused = !c.paused; }); render(); return; }
    if (act === "sendmsg") { var txt = document.getElementById("in-msg").value.trim(); if (!txt) return; T(function (c) { c.msg = { id: Date.now(), text: txt }; }); document.getElementById("in-msg").value = ""; toast("Message envoyé"); return; }
    if (act === "attack") { var z = document.getElementById("in-az").value; T(function (c) { c.attacks.push({ id: "a" + Date.now().toString(36), seed: Math.random().toString(36).slice(2, 8), zone: z ? +z : 0, ts: Date.now() }); }); toast("Attaque lancée"); return; }
    if (act === "mopen") { var k = el.getAttribute("data-m"); T(function (c) { var now = Date.now(); Object.keys(c.missions).forEach(function (o) { if (o !== k && c.missions[o].open && !c.missions[o].end) c.missions[o].end = now; }); c.missions[k] = { open: now, closed: false, lvl: c.level, lo: c.lo, hi: c.hi }; }); render(); return; }
    if (act === "mclose") { var k2 = el.getAttribute("data-m"); T(function (c) { c.missions[k2].closed = true; if (!c.missions[k2].end) c.missions[k2].end = Date.now(); }); render(); return; }
    if (act === "mreopen") { var k3 = el.getAttribute("data-m"); T(function (c) { var cm3 = c.missions[k3]; cm3.closed = false; if (cm3.end) { cm3.open += Date.now() - cm3.end; delete cm3.end; } }); render(); return; }
    if (act === "force") { var fk = el.getAttribute("data-k"); T(function (c) { c.force = c.force || {}; c.force[fk] = true; }); toast("Validation forcée"); render(); return; }
    if (act === "exopen") { ev.preventDefault(); var ek = el.getAttribute("data-k"); X.exOpen[ek] = !X.exOpen[ek]; render(); return; }
    if (act === "mreveal") { var k4 = el.getAttribute("data-m"); T(function (c) { c.reveal[k4] = !c.reveal[k4]; }); render(); return; }
    if (act === "mhint") { var k5 = el.getAttribute("data-m"); T(function (c) { c.hints["*:" + k5] = !c.hints["*:" + k5]; }); render(); return; }
    if (act === "tdetail") { var tt = +el.getAttribute("data-t"); X.openT = X.openT === tt ? null : tt; render(); return; }
    if (act === "exportcsv") { download("cap-rempart-" + X.code + ".csv", csv(), "text/csv;charset=utf-8"); return; }
    if (act === "report") { report(); return; }
  });
  document.addEventListener("change", function (ev) {
    var el = ev.target; var act = el.getAttribute && el.getAttribute("data-act"); if (!act) return;
    if (act === "showrank") T(function (c) { c.showRank = el.checked; });
    if (act === "nt") T(function (c) { c.tables = +el.value; });
  });
  document.addEventListener("input", function (ev) {
    var el = ev.target; if (el.getAttribute("data-act") !== "open") return; var tg = el.getAttribute("data-tg"), i = +el.getAttribute("data-i"); var r = X.route; var mid = r.m;
    mineOf(mid).a[i] = el.value; saveMine(mid);
  });

  // ---------------------------------------------------------------- demarrage
  function boot() {
    X.data = CR.decode();
    window.addEventListener("hashchange", route); route();
    setInterval(function () { publishAttacks(); }, 1500);
  }
  function route() {
    var r = parse(); var prev = X.route; X.route = r; ensureNet(r);
    if (X.ready) afterReady();
    window.scrollTo(0, 0); render();
  }
  boot();
})(window.CR);
