/* (c) 2026 SAS BELM DEVELOPPEMENT. Tous droits reserves. */
window.CR = window.CR || {};
(function (CR) {
  CR.COLORS = [
    { n: "Bleu", c: "#3B82D6" }, { n: "Vert", c: "#35A862" }, { n: "Orange", c: "#EE8F2F" },
    { n: "Rouge", c: "#DB4B3C" }, { n: "Rose", c: "#E673AE" }];
  CR.LEVELS = {
    decouverte: { label: "Découverte", lo: 40, hi: 70, hints: "free", desc: "Indices gratuits, seuils bas" },
    standard: { label: "Standard", lo: 50, hi: 80, hints: "penalty", desc: "Indice : −1 point" },
    expert: { label: "Expert", lo: 60, hi: 90, hints: "none", desc: "Sans indice, questions bonus" }
  };
  CR.ZONE_NAMES = ["Entrée", "Messagerie", "Postes et serveurs", "Portail Internet", "Radar", "Archives", "Salle des machines", "Hall", "Direction",
    "Pare-feu", "IDS / IPS", "Chiffrement", "Correctifs", "Sensibilisation", "Sauvegarde", "Audit", "Salle de crise"];
  CR.ATTACKERS = {
    1: ["Phisher", "BEC fraudster"], 2: ["Trojan", "Ransomware gang"], 3: ["Brute-forcer", "Botnet"], 4: ["APT"],
    5: ["Insider threat", "APT"], 6: ["Ransomware gang", "Botnet"], 7: ["BEC fraudster", "Phisher"], 8: ["Insider threat", "BEC fraudster"],
    9: ["Brute-forcer", "Botnet"], 10: ["APT", "Trojan"], 11: ["Brute-forcer", "Insider threat"], 12: ["Ransomware gang", "Trojan"],
    13: ["Phisher", "Insider threat"], 14: ["Ransomware gang"], 15: ["APT"], 16: ["Ransomware gang", "APT"]
  };

  CR.decode = function () {
    var bin = atob(window.CR_DATA); var u = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
    return JSON.parse(new TextDecoder("utf-8").decode(u));
  };

  CR.esc = function (s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); };
  CR.L = function (i) { return String.fromCharCode(65 + i); };

  // ---- aleatoire reproductible
  CR.hash = function (str) { var h = 1779033703 ^ str.length; for (var i = 0; i < str.length; i++) { h = Math.imul(h ^ str.charCodeAt(i), 3432918353); h = h << 13 | h >>> 19; } return (h >>> 0); };
  CR.rng = function (seed) { var a = typeof seed === "string" ? CR.hash(seed) : seed; return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; };
  CR.shuffled = function (n, seed) { var a = []; for (var i = 0; i < n; i++) a.push(i); var r = CR.rng(seed); for (var j = n - 1; j > 0; j--) { var k = Math.floor(r() * (j + 1)); var t = a[j]; a[j] = a[k]; a[k] = t; } if (n > 1) { var same = true; for (var q = 0; q < n; q++) if (a[q] !== q) same = false; if (same) { var x = a[0]; a[0] = a[1]; a[1] = x; } } return a; };

  // ---- questions applicables selon le niveau
  CR.applicable = function (m, lvl) { var out = []; m.qs.forEach(function (q, i) { if (!q.x || lvl === "expert") out.push(i); }); return out; };

  // ---- note d'une question : 0..1
  CR.scoreQ = function (q, ans, crit) {
    if (q.t === "open") { var n = q.crit.length, k = 0; (crit || []).forEach(function (b, i) { if (b && i < n) k++; }); return n ? k / n : 0; }
    if (ans === undefined || ans === null) return 0;
    if (q.t === "qcm") return ans === q.a ? 1 : 0;
    if (q.t === "multi") { var good = 0, bad = 0; (ans || []).forEach(function (x) { if (q.a.indexOf(x) >= 0) good++; else bad++; }); return Math.max(0, (good - bad) / q.a.length); }
    if (q.t === "order") { if (!ans || !ans.length) return 0; var c = 0; ans.forEach(function (v, i) { if (v === i) c++; }); return c / q.a.length; }
    if (q.t === "grid") { var g = 0; q.a.forEach(function (v, i) { if (ans && ans[i] === v) g++; }); return g / q.a.length; }
    return 0;
  };

  // ---- resultat d'une mission pour une table
  CR.compute = function (m, snap, finalAns, crit, hintCount, freeHints) {
    var idx = CR.applicable(m, snap.lvl), pts = 0, max = 0, per = {}, pendingOpen = false;
    idx.forEach(function (i) {
      var q = m.qs[i]; var s = CR.scoreQ(q, finalAns && finalAns[i], crit && crit[i]);
      per[i] = s; pts += s * q.p; max += q.p;
    });
    var penalty = 0;
    if (!freeHints && CR.LEVELS[snap.lvl].hints === "penalty") penalty = hintCount || 0;
    var net = Math.max(0, pts - penalty);
    var pct = max ? net / max * 100 : 0;
    var bar = pct >= snap.hi ? 2 : (pct >= snap.lo ? 1 : 0);
    return { pts: Math.round(pts * 100) / 100, max: max, penalty: penalty, pct: Math.round(pct * 10) / 10, bar: bar, imp: bar === 0 ? 1 : 0, per: per };
  };

  // ---- majorite d'une table
  CR.majority = function (q, answers) {
    var list = answers.filter(function (a) { return a !== undefined && a !== null; });
    if (!list.length) return undefined;
    if (q.t === "qcm") { var c = {}; list.forEach(function (a) { c[a] = (c[a] || 0) + 1; }); var b = null, bn = -1; Object.keys(c).forEach(function (k) { if (c[k] > bn) { bn = c[k]; b = +k; } }); return b; }
    if (q.t === "multi") { var r = []; for (var o = 0; o < q.o.length; o++) { var n = list.filter(function (a) { return a.indexOf(o) >= 0; }).length; if (n * 2 > list.length) r.push(o); } return r; }
    if (q.t === "order") return list[0].slice();
    if (q.t === "grid") { return q.a.map(function (_, ri) { var cc = {}; list.forEach(function (a) { var v = a[ri]; if (v !== undefined && v !== null) cc[v] = (cc[v] || 0) + 1; }); var bb = null, bm = -1; Object.keys(cc).forEach(function (k) { if (cc[k] > bm) { bm = cc[k]; bb = +k; } }); return bb; }); }
    if (q.t === "open") { var best = ""; list.forEach(function (a) { if ((a || "").length > best.length) best = a; }); return best; }
  };
  CR.same = function (a, b) { return JSON.stringify(a) === JSON.stringify(b); };

  // ---- resume lisible d'une reponse
  CR.fmt = function (q, a) {
    if (a === undefined || a === null) return "—";
    if (q.t === "qcm") return CR.L(a);
    if (q.t === "multi") return a.length ? a.map(CR.L).join("+") : "(aucune)";
    if (q.t === "order") return a.map(function (v) { return v + 1; }).join(">");
    if (q.t === "grid") return a.map(function (v) { return v == null ? "·" : CR.L(v); }).join(" ");
    if (q.t === "open") return a ? "texte" : "—";
    return "";
  };

  // ---- derivation de l'etat d'une table a partir des documents
  CR.derive = function (docs, ctl, table, data) {
    var res = {}, bar = {}, imp = 0, log = [];
    Object.keys(docs).forEach(function (k) { var p = k.split("/"); if (p[0] === "res" && +p[1] === table && docs[k]) res[+p[2]] = docs[k]; });
    Object.keys(res).forEach(function (m) { var r = res[m]; if (r.status === "graded") { bar[m] = (bar[m] || 0) + r.bar; imp += r.imp; } });
    var attacks = (ctl && ctl.attacks) || [];
    attacks.forEach(function (a) {
      var saved = docs["att/" + table + "/" + a.id]; var o = saved;
      if (!o) o = CR.resolveAttack(a, table, bar);
      o.pending = !saved;
      if (o.outcome === "removed") { bar[o.zone] = Math.max(0, (bar[o.zone] || 0) - 1); }
      else if (o.outcome === "impact") { imp += 1; }
      log.push(Object.assign({ id: a.id }, o));
    });
    var tb = 0; Object.keys(bar).forEach(function (z) { tb += bar[z]; });
    return { res: res, bar: bar, imp: imp, barTotal: tb, score: tb - imp, attacks: log };
  };

  CR.resolveAttack = function (a, table, bar) {
    var played = Object.keys(bar).map(Number).filter(function (z) { return true; });
    // zones jouees = celles pour lesquelles un resultat note existe (cle presente dans bar)
    if (!played.length) return { outcome: "none", zone: 0, attacker: "" };
    var r = CR.rng(a.seed + ":" + table);
    var zone;
    if (a.zone) { if (played.indexOf(+a.zone) < 0) return { outcome: "none", zone: +a.zone, attacker: "" }; zone = +a.zone; }
    else zone = played.sort(function (x, y) { return x - y; })[Math.floor(r() * played.length)];
    var list = CR.ATTACKERS[zone] || ["APT"]; var who = list[Math.floor(r() * list.length)];
    return { outcome: (bar[zone] || 0) > 0 ? "removed" : "impact", zone: zone, attacker: who };
  };

  CR.rank = function (docs, ctl, tables, data) {
    var rows = [];
    for (var t = 1; t <= tables; t++) { var d = CR.derive(docs, ctl, t, data); rows.push({ t: t, d: d }); }
    rows.sort(function (a, b) { return b.d.score - a.d.score || a.d.imp - b.d.imp || b.d.barTotal - a.d.barTotal || a.t - b.t; });
    rows.forEach(function (r, i) { r.rank = i > 0 && rows[i - 1].d.score === r.d.score && rows[i - 1].d.imp === r.d.imp && rows[i - 1].d.barTotal === r.d.barTotal ? rows[i - 1].rank : i + 1; });
    return rows;
  };

  CR.current = function (c, D) { var best = null, bt = -1; if (!c || !c.missions) return null; D.missions.forEach(function (m) { var cm = c.missions[m.id]; if (cm && cm.open && !cm.closed && cm.open > bt) { bt = cm.open; best = m; } }); return best; };
  CR.elapsed = function (cm) { if (!cm || !cm.open) return 0; return Math.max(0, (cm.end || Date.now()) - cm.open); };
  // ---- resultat d'une mission pour une table : moyenne des joueurs presents (tous egaux)
  CR.computeTable = function (m, snap, byPlayer, crit, hintCount, freeHints) {
    var idx = CR.applicable(m, snap.lvl), pts = 0, max = 0, per = {}, plist = Object.keys(byPlayer || {});
    idx.forEach(function (i) {
      var q = m.qs[i], s;
      if (q.t === "open") s = CR.scoreQ(q, null, crit && crit[i]);
      else { var sum = 0; plist.forEach(function (p) { sum += CR.scoreQ(q, (byPlayer[p] || {})[i]); }); s = plist.length ? sum / plist.length : 0; }
      per[i] = s; pts += s * q.p; max += q.p;
    });
    var penalty = 0; if (!freeHints && CR.LEVELS[snap.lvl].hints === "penalty") penalty = hintCount || 0;
    var net = Math.max(0, pts - penalty), pct = max ? net / max * 100 : 0;
    var bar = pct >= snap.hi ? 2 : (pct >= snap.lo ? 1 : 0);
    return { pts: Math.round(pts * 100) / 100, max: max, penalty: penalty, pct: Math.round(pct * 10) / 10, bar: bar, imp: bar === 0 ? 1 : 0, per: per };
  };
  CR.mmss = function (ms) { ms = Math.max(0, ms); var s = Math.floor(ms / 1000), m = Math.floor(s / 60); return (m < 10 ? "0" : "") + m + ":" + (s % 60 < 10 ? "0" : "") + (s % 60); };
})(window.CR);
