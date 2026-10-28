/* (c) 2026 SAS BELM DEVELOPPEMENT. Tous droits reserves. */
window.CR = window.CR || {};
(function (CR) {
  var esc = CR.esc, L = CR.L;
  var V = CR.V = {};
  var QCOL = { P: "var(--P)", C: "var(--C)", R: "var(--R)", A: "var(--A)", K: "var(--K)" };
  var QNAME = { P: "Les Portes", C: "Les Coffres", R: "Les Remparts", A: "L'Atelier", K: "Le Cœur" };
  CR.QNAME = QNAME;

  V.logo = function () { return '<div class="logo"><svg viewBox="0 0 32 32"><path d="M16 2 L28 6 V16 Q28 25 16 30 Q4 25 4 16 V6 Z" fill="#16304D" stroke="#D9A93B" stroke-width="2"/><path d="M9 11h3V9h2v2h4V9h2v2h3v3H9z" fill="#D9A93B"/><path d="M10 16h12v1q0 4-6 6.5Q10 21 10 17z" fill="#fff"/></svg>CAP REMPART</div>'; };
  V.status = function (X) {
    var s = X.status || { s: "connecting" }; var c = s.s === "ok" ? "ok" : (s.s === "connecting" || s.s === "retry" ? "warn" : "bad");
    var lbl = s.s === "ok" ? (X.mode === "local" ? "Relais local (test)" : "Relais connecté") : (s.s === "connecting" ? "Connexion…" : (s.s === "retry" ? "Reconnexion…" : "Hors ligne"));
    return '<span class="chip" title="' + esc(s.d || "") + '"><span class="dot ' + c + '"></span>' + lbl + '</span>';
  };
  V.tchip = function (t) { var c = CR.COLORS[t - 1]; return '<span class="chip" style="--tc:' + c.c + '"><span class="dot"></span>Table ' + t + ' · ' + c.n + '</span>'; };

  // ----------------------------------------------------------------- question
  V.q = function (q, i, st, o) {
    o = o || {}; var tg = o.tg || "ans"; var show = !!o.show; var ro = !!o.ro;
    var attr = function (act, extra) { return 'data-act="' + act + '" data-tg="' + tg + '" data-i="' + i + '"' + (extra || ""); };
    var h = '<div class="q" data-qi="' + i + '"><div class="qt">' + (o.pos ? '<span class="mut small" style="color:#6a6a5a">Question ' + o.pos + ' / ' + o.total + (q.x ? " · BONUS EXPERT" : "") + (q.t === "open" ? " · EXERCICE" : "") + '</span><br>' : "") + esc(q.q) + "</div>";
    if (q.t === "qcm") {
      q.o.forEach(function (t, k) {
        var cls = "opt" + (st === k ? " sel" : "") + (ro ? " ro" : "");
        if (show) { if (k === q.a) cls += " good"; else if (st === k) cls += " wrong"; }
        h += '<div class="' + cls + '" ' + (ro ? "" : attr("qcm", ' data-v="' + k + '"')) + '><span class="l">' + L(k) + "</span><span>" + esc(t) + "</span></div>";
      });
    } else if (q.t === "multi") {
      var cur = st || [];
      h += '<div class="mut small" style="color:#6a6a5a">Plusieurs réponses possibles.</div>';
      q.o.forEach(function (t, k) {
        var on = cur.indexOf(k) >= 0, cls = "opt" + (on ? " sel" : "") + (ro ? " ro" : "");
        if (show) { var good = q.a.indexOf(k) >= 0; if (good) cls += " good"; else if (on) cls += " wrong"; }
        h += '<div class="' + cls + '" ' + (ro ? "" : attr("multi", ' data-v="' + k + '"')) + '><span class="l">' + (on ? "✓" : L(k)) + "</span><span>" + esc(t) + "</span></div>";
      });
    } else if (q.t === "order") {
      var ord = st || CR.shuffled(q.o.length, "q" + o.seed + ":" + i);
      h += '<div class="mut small" style="color:#6a6a5a">Classez du premier (en haut) au dernier. Utilisez ▲ et ▼.</div>';
      ord.forEach(function (idx, pos) {
        var cls = "ord"; if (show) cls += idx === pos ? " opt good" : " opt wrong";
        h += '<div class="' + cls + '"><span class="k">' + (pos + 1) + '</span><span class="tx">' + esc(q.o[idx]) + "</span>" +
          (ro ? "" : '<button class="btn sec sm" ' + attr("up", ' data-k="' + pos + '"') + (pos === 0 ? " disabled" : "") + '>▲</button><button class="btn sec sm" ' + attr("down", ' data-k="' + pos + '"') + (pos === ord.length - 1 ? " disabled" : "") + ">▼</button>") + "</div>";
      });
      if (show) h += '<div class="corr model"><b>Bon ordre :</b> ' + q.o.map(function (t, k) { return (k + 1) + ". " + esc(t); }).join(" · ") + "</div>";
    } else if (q.t === "grid") {
      var g = st || [];
      q.rows.forEach(function (r, ri) {
        h += '<div class="gridrow"><div>' + esc(r) + '</div><div class="seg">';
        q.o.forEach(function (c, ci) {
          var cls = "s" + (g[ri] === ci ? " sel" : "");
          if (show) { if (ci === q.a[ri]) cls += " good"; else if (g[ri] === ci) cls += " wrong"; }
          h += '<span class="' + cls + '" ' + (ro ? "" : attr("grid", ' data-r="' + ri + '" data-v="' + ci + '"')) + ">" + esc(c) + "</span>";
        });
        h += "</div></div>";
      });
    } else if (q.t === "open") {
      h += '<textarea ' + attr("open") + (ro ? " readonly" : "") + ' placeholder="Rédigez ici (le validateur saisit la version finale de la table)">' + esc(st || "") + "</textarea>";
    }
    if (o.hint) h += '<div class="hint">💡 ' + esc(q.h) + "</div>";
    if (o.hintBtn) h += '<button class="btn sec sm" data-act="hint" data-i="' + i + '">' + o.hintBtn + "</button>";
    if (show && q.t !== "open" && q.e) h += '<div class="corr"><b>Correction.</b> ' + esc(q.e) + "</div>";
    return h + "</div>";
  };

  V.zoneChip = function (m) { return '<span class="badge" style="background:' + QCOL[m.quartier] + ';color:#fff">' + QNAME[m.quartier] + "</span>"; };

  // ----------------------------------------------------------------- accueil
  V.landing = function (X) {
    var q = X.q || {};
    return '<div class="hero">' + V.logo() + '<p class="mut">Défendez TransLor · Cybermenaces et risques</p></div>' +
      '<div class="grid g2">' +
      '<div class="card"><h2>Je joue avec ma table</h2><label>Code de séance</label><input id="in-code" placeholder="ex. KX4P7" autocapitalize="characters" value="' + esc(q.s || "") + '">' +
      '<label>Numéro de table</label><select id="in-table">' + [1, 2, 3, 4, 5].map(function (t) { return '<option value="' + t + '"' + (+q.t === t ? " selected" : "") + ">Table " + t + " · " + CR.COLORS[t - 1].n + "</option>"; }).join("") + "</select>" +
      '<label>Votre numéro de joueur</label><div class="tabs" id="in-player">' + [1, 2, 3, 4, 5].map(function (p) { return '<span class="pill' + (p === 1 ? " on" : "") + '" data-act="pickp" data-v="' + p + '">Joueur ' + p + "</span>"; }).join("") + "</div>" +
      '<div class="row" style="margin-top:12px"><button class="btn" data-act="joinplay">Rejoindre la partie</button><button class="btn sec" data-act="jointower">Tour de contrôle de la table</button></div>' +
      '<p class="mut small">Aucun compte, aucun nom saisi : seuls le numéro de table et de joueur circulent.</p></div>' +
      '<div class="card"><h2>Je suis l\'enseignant</h2><p class="mut">Créez une séance (niveau, seuils, missions, attaques, classement) ou reprenez la séance en cours.</p>' +
      (X.lastTeacher ? '<button class="btn" data-act="resume">Reprendre la séance ' + esc(X.lastTeacher.code) + "</button> " : "") +
      '<button class="btn ' + (X.lastTeacher ? "sec" : "") + '" data-act="newsession">Nouvelle séance</button>' +
      '<label style="margin-top:14px">Mode du relais</label><select id="in-net"><option value="mqtt">Réel (Internet)</option><option value="local">Test local (même navigateur)</option></select></div></div>';
  };

  // ----------------------------------------------------------------- bandeaux
  V.banners = function (X) {
    var h = "", c = X.ctl;
    if (c && c.paused) h += '<div class="banner pause">⏸ Pause demandée par l\'enseignant.</div>';
    if (c && c.msg && !X.msgSeen) h += '<div class="banner msg">✉ ' + esc(c.msg.text) + ' <button class="btn sm sec" data-act="msgok" style="margin-left:8px">OK</button></div>';
    return h;
  };
  V.attackOverlay = function (X) {
    var a = X.pendingAttack; if (!a) return "";
    var t;
    if (a.outcome === "removed") t = '<p class="big">⚠ ATTAQUE !</p><p><b>' + esc(a.attacker) + "</b> frappe la zone <b>" + a.zone + " · " + esc(CR.ZONE_NAMES[a.zone]) + '</b>.</p><p class="big" style="font-size:1.5rem">Retirez 1 Barrière de cette zone.</p>';
    else if (a.outcome === "impact") t = '<p class="big">⚠ ATTAQUE !</p><p><b>' + esc(a.attacker) + "</b> frappe la zone <b>" + a.zone + " · " + esc(CR.ZONE_NAMES[a.zone]) + '</b>.</p><p class="big" style="font-size:1.5rem">Aucune Barrière : prenez 1 Impact.</p>';
    else t = '<p class="big">Attaque repoussée</p><p>Aucune de vos zones n\'était encore exposée : sans effet cette fois.</p>';
    return '<div class="over att"><div class="box">' + t + '<button class="btn" data-act="ackatt" data-id="' + esc(a.id) + '">Compris</button></div></div>';
  };

  // ----------------------------------------------------------------- liste des missions (joueur)
  V.home = function (X) {
    var D = X.data, c = X.ctl, h = "";
    h += '<div class="top">' + V.logo() + '<span class="grow"></span>' + V.tchip(X.t) + '<span class="chip">Joueur ' + X.p + "</span>" + V.status(X) + '<a class="btn sec sm" href="#/tower/' + X.code + "/" + X.t + '">Tour de contrôle</a></div>';
    h += V.banners(X);
    if (!c) return h + '<div class="card"><p>En attente de la séance de l\'enseignant (code <b>' + esc(X.code) + '</b>)…</p><p class="mut small">Si le message persiste : vérifiez le code, la connexion, ou prévenez l\'enseignant.</p></div>';
    h += '<div class="card"><div class="row sp"><div><b>Niveau : ' + CR.LEVELS[c.level].label + '</b><div class="mut small">' + CR.LEVELS[c.level].desc + '</div></div><div class="right"><div class="small mut">Score de la table</div><div class="big">' + X.d.score + '</div></div></div></div>';
    var rows = "";
    var br = '<a class="mrow" style="--qc:var(--K);text-decoration:none;color:inherit" href="#/m/' + X.code + "/" + X.t + "/" + X.p + '/0"><span class="n">0</span><span class="t"><b>Entrée · Briefing</b><span class="mut small">Bienvenue chez TransLor</span></span><span class="badge">Lire</span></a>';
    rows += br;
    D.missions.forEach(function (m) {
      var cm = c.missions && c.missions[m.id]; var r = X.docs["res/" + X.t + "/" + m.id];
      var st, badge, cls = "", href = "#/m/" + X.code + "/" + X.t + "/" + X.p + "/" + m.id;
      var rev = c.reveal && c.reveal[m.id];
      if (r) { badge = r.status === "graded" ? '<span class="badge ok">✓ ' + Math.round(r.pct) + " %</span>" : '<span class="badge warn">À noter</span>'; }
      else if (cm && cm.closed) { badge = '<span class="badge bad">Fermée</span>'; }
      else if (cm && cm.open) { badge = '<span class="badge warn">▶ Ouverte</span>'; }
      else { badge = '<span class="badge">En attente</span>'; cls = " lock"; }
      var mine = X.docs["ans/" + X.t + "/" + X.p + "/" + m.id];
      var extra = (!r && mine && mine.done) ? ' <span class="badge">Réponses envoyées</span>' : "";
      rows += '<a class="mrow' + cls + '" style="--qc:' + QCOL[m.quartier] + ';text-decoration:none;color:inherit" href="' + href + '"><span class="n">' + m.id + '</span><span class="t"><b>' + esc(m.title) + '</b><span class="mut small">' + esc(m.topic) + " · " + m.min + " min</span></span>" + badge + extra + "</a>";
    });
    var cf = c.missions && c.missions.F; var fr = X.docs["fin/" + X.t + "/" + X.p];
    rows += '<a class="mrow' + (cf ? "" : " lock") + '" style="--qc:var(--gold);text-decoration:none;color:inherit" href="#/m/' + X.code + "/" + X.t + "/" + X.p + '/F"><span class="n">★</span><span class="t"><b>QCM final</b><span class="mut small">Individuel · 20 questions · 20 min</span></span>' + (fr ? '<span class="badge ok">✓ ' + Math.round(fr.pct) + " %</span>" : (cf ? '<span class="badge warn">▶ Ouvert</span>' : '<span class="badge">En attente</span>')) + "</a>";
    h += '<div class="mlist">' + rows + "</div>";
    return h;
  };

  // ----------------------------------------------------------------- briefing
  V.entree = function (X) {
    var E = X.data.entree;
    return '<div class="top">' + V.logo() + '<span class="grow"></span><a class="btn sec sm" href="#/play/' + X.code + "/" + X.t + "/" + X.p + '">← Retour</a></div>' +
      '<div class="card light"><h2>' + esc(E.titre) + "</h2>" + E.texte.map(function (t) { return "<p>" + esc(t) + "</p>"; }).join("") +
      '<h3>Comment jouer</h3><ol><li>Jouez la mission sur l\'application de votre table.</li><li>Posez sur la zone les Barrières indiquées par l\'application (0, 1 ou 2). Mission ratée : 1 Impact.</li><li>Attaque : retirez 1 Barrière de la zone visée ; zone sans Barrière : 1 Impact.</li></ol><p><b>Score de la table = Barrières restantes − Impacts.</b> Chacun répond seul, la table compare et discute, puis un joueur valide pour tous (le validateur change à chaque mission).</p></div>';
  };

  // ----------------------------------------------------------------- mission (joueur)
  V.mission = function (X, m) {
    var c = X.ctl, h = "";
    var back = '<a class="btn sec sm" href="#/play/' + X.code + "/" + X.t + "/" + X.p + '">← Missions</a>';
    h += '<div class="top">' + V.logo() + '<span class="grow"></span>' + V.tchip(X.t) + '<span class="chip">Joueur ' + X.p + "</span>" + V.status(X) + back + "</div>" + V.banners(X);
    var cm = c && c.missions && c.missions[m.id]; var r = X.docs["res/" + X.t + "/" + m.id];
    var rev = c && c.reveal && c.reveal[m.id];
    h += '<div class="card" style="border-left:6px solid ' + QCOL[m.quartier] + '"><div class="row sp"><div><h2>Mission ' + m.id + " · " + esc(m.title) + "</h2>" + V.zoneChip(m) + ' <span class="badge">' + esc(m.chap) + " · " + esc(m.comp) + '</span></div><div class="right"><div class="mut small">Chrono (indicatif)</div><div class="big mono" data-chrono="' + m.id + '">' + (cm && cm.open ? CR.mmss(Date.now() - cm.open) : "--:--") + '</div><div class="mut small">Durée prévue ' + m.min + " min (cours inclus)</div></div></div><p>" + esc(m.brief) + "</p>" + (m.ex ? '<span class="badge warn">Exercice ' + m.ex + (m.ex === 4 ? " : fiche à rendre hors séance" : " du syllabus") + "</span>" : "") + "</div>";
    if (!cm || !cm.open) {
      if (r || rev) { /* afficher quand meme */ }
      else return h + '<div class="card"><p>⏳ Cette mission n\'est pas encore ouverte. L\'enseignant la lancera.</p></div>';
    }
    var lvl = (r && r.snap && r.snap.lvl) || (cm && cm.lvl) || c.level;
    var idx = CR.applicable(m, lvl);
    var mine = X.mine[m.id] || { a: {}, h: [], done: false };
    if (r) return h + V.results(X, m, r, idx);
    if (cm && cm.closed) return h + '<div class="card"><p>🔒 La mission est fermée par l\'enseignant.</p></div>';
    if (rev && !r) h += '<div class="banner msg">L\'enseignant a révélé les corrections pour cette mission.</div>';
    if (!mine.done) return h + V.play(X, m, idx, mine, lvl);
    return h + V.common(X, m, idx, lvl);
  };

  V.hintMode = function (X, m, lvl) {
    var c = X.ctl; var free = c.hints && (c.hints[X.t + ":" + m.id] || c.hints["*:" + m.id]);
    var mode = CR.LEVELS[lvl].hints;
    if (free) return "free"; return mode;
  };

  V.play = function (X, m, idx, mine, lvl) {
    var pos = Math.min(X.qpos[m.id] || 0, idx.length - 1); var i = idx[pos]; var q = m.qs[i];
    var hm = V.hintMode(X, m, lvl); var used = mine.h.indexOf(i) >= 0;
    var o = { pos: pos + 1, total: idx.length, seed: m.id };
    if (used || hm === "free" && X.showHint && X.showHint[m.id + ":" + i]) o.hint = true;
    if (!used && hm !== "none" && !(hm === "free" && o.hint)) o.hintBtn = hm === "free" ? "💡 Voir l'indice (gratuit)" : "💡 Indice (−1 point pour la table)";
    var done = idx.filter(function (k) { return mine.a[k] !== undefined && mine.a[k] !== null && mine.a[k] !== ""; }).length;
    var h = '<div class="sticky"><div class="bar"><i style="width:' + Math.round(done / idx.length * 100) + '%"></i></div><div class="mut small">' + done + " réponse(s) sur " + idx.length + "</div></div>";
    if (used && hm === "penalty") o.hint = true;
    h += V.q(q, i, mine.a[i], o);
    h += '<div class="row sp"><button class="btn sec" data-act="prev" ' + (pos === 0 ? "disabled" : "") + ">← Précédente</button>" +
      (pos < idx.length - 1 ? '<button class="btn" data-act="next">Suivante →</button>' : '<button class="btn ok" data-act="finish">J\'ai terminé mes réponses</button>') + "</div>";
    return h;
  };

  // mise en commun
  V.common = function (X, m, idx, lvl) {
    var players = []; for (var p = 1; p <= 5; p++) if (X.docs["join/" + X.t + "/" + p]) players.push(p);
    var validator = X.validatorOf(m.id); var iAmVal = X.iAmVal(m.id);
    var h = '<div class="card"><h2>Mise en commun</h2><p class="mut">Comparez vos réponses, discutez des écarts, puis <b>le validateur</b> enregistre la réponse de la table. Validateur de cette mission : <b>Joueur ' + validator + "</b>" + (validator === X.p ? " (c'est vous)" : "") + ".</p>";
    var allDone = true; var st = [];
    players.forEach(function (p) { var a = X.docs["ans/" + X.t + "/" + p + "/" + m.id]; var d = a && a.done; if (!d) allDone = false; st.push('<span class="chip">Joueur ' + p + " : " + (d ? "✓ terminé" : "en cours…") + "</span>"); });
    h += '<div class="chips">' + st.join(" ") + "</div></div>";
    var fin = X.final[m.id];
    if (!fin) { fin = X.final[m.id] = {}; }
    idx.forEach(function (i, n) {
      var q = m.qs[i]; var answers = players.map(function (p) { var a = X.docs["ans/" + X.t + "/" + p + "/" + m.id]; return a && a.a ? a.a[i] : undefined; });
      var given = answers.filter(function (a) { return a !== undefined; });
      var agree = given.every(function (a) { return CR.same(a, given[0]); });
      var anyAns = answers.some(function (a) { return a !== undefined; });
      if (fin[i] === undefined && iAmVal) fin[i] = CR.majority(q, answers);
      h += '<div class="card light"><div class="row sp"><b>Question ' + (n + 1) + (q.x ? " · bonus" : "") + '</b><span class="badge ' + (!anyAns ? "" : (agree ? "ok" : "warn")) + '">' + (!anyAns ? "pas de réponse" : (agree ? "Accord" : "À discuter")) + "</span></div>";
      h += '<div style="margin:6px 0">' + esc(q.q.length > 170 ? q.q.slice(0, 167) + "…" : q.q) + "</div>";
      if (q.t !== "open") h += '<div class="chips">' + players.map(function (p, k) { return '<span class="chipa">J' + p + " : " + esc(CR.fmt(q, answers[k])) + "</span>"; }).join("") + "</div>";
      if (iAmVal) h += V.q(q, i, fin[i], { tg: "final", seed: m.id });
      else if (q.t === "open") h += '<div class="mut small">Le validateur rédige la réponse commune.</div>';
      h += "</div>";
    });
    h += '<div class="card">';
    if (iAmVal) {
      h += (!allDone ? '<p class="banner pause">Certains joueurs n\'ont pas fini : vous pouvez attendre ou valider quand même.</p>' : "") +
        '<div class="row"><button class="btn ok" data-act="validate">Valider la réponse de la table</button><button class="btn sec" data-act="recalc">Recalculer la majorité</button><button class="btn sec" data-act="reopen">← Modifier mes réponses</button></div>';
    } else {
      h += '<p>Attendez que le Joueur ' + validator + ' valide.</p><div class="row"><button class="btn sec" data-act="reopen">← Modifier mes réponses</button><button class="btn sec sm" data-act="takeover">Le validateur est absent : prendre la main</button></div>';
    }
    return h + "</div>";
  };

  // resultats
  V.results = function (X, m, r, idx) {
    var snap = r.snap || {}; var h = ""; var graded = r.status === "graded";
    var iAmVal = X.iAmVal(m.id) || r.by === X.p;
    var hasOpen = idx.some(function (i) { return m.qs[i].t === "open"; });
    h += '<div class="card" style="text-align:center">';
    if (graded) {
      h += '<div class="mut">Résultat de la table</div><div class="big">' + Math.round(r.pct) + " %</div><div class=\"mut\">" + r.pts + " / " + r.max + " points" + (r.penalty ? " · −" + r.penalty + " pour indice(s)" : "") + "</div>";
      h += '<div style="margin-top:8px;font-size:1.25rem"><b>' + (r.bar > 0 ? "Posez " + r.bar + " Barrière" + (r.bar > 1 ? "s" : "") + " sur la zone " + m.id + " · " + esc(m.title) : "Aucune Barrière à poser") + "</b></div>";
      var tk = ""; for (var k = 0; k < r.bar; k++) tk += '<span class="tk" style="--tc:' + CR.COLORS[X.t - 1].c + '"></span>'; if (r.imp) tk += '<span class="tk imp"></span>';
      h += '<div class="tokens" style="justify-content:center">' + tk + "</div>";
      if (r.imp) h += '<div class="banner att">Mission en dessous du seuil : prenez <b>1 Impact</b> et placez-le sur la piste d\'Impact.</div>';
    } else h += '<h2>Réponse enregistrée</h2><p>Évaluez maintenant vos réponses libres avec la grille ci-dessous, puis terminez l\'évaluation pour connaître vos Barrières.</p>';
    h += "</div>";
    idx.forEach(function (i, n) {
      var q = m.qs[i]; var fa = r.final ? r.final[i] : undefined;
      h += '<div class="card light"><div class="row sp"><b>Question ' + (n + 1) + (q.x ? " · bonus" : "") + '</b><span class="badge">' + Math.round((r.per && r.per[i] != null ? r.per[i] : 0) * 100) + " %</span></div>";
      if (q.t === "open") {
        h += '<div class="qt" style="margin-top:6px">' + esc(q.q) + '</div><div class="corr"><b>Réponse de la table</b><br>' + esc(fa || "(aucune réponse)").replace(/\n/g, "<br>") + "</div>";
        h += '<div class="corr model"><b>Réponse modèle (exemple)</b><br>' + esc(q.model) + "</div>";
        h += "<h3>Grille de critères</h3><div class=\"mut small\" style=\"color:#555\">Cochez les critères que votre réponse remplit réellement.</div>";
        q.crit.forEach(function (cr, ci) {
          var on = r.crit && r.crit[i] && r.crit[i][ci];
          h += '<label class="crit"><input type="checkbox" data-act="crit" data-i="' + i + '" data-c="' + ci + '" ' + (on ? "checked" : "") + (graded || !iAmVal ? " disabled" : "") + "><span>" + esc(cr) + "</span></label>";
        });
      } else h += V.q(q, i, fa, { show: true, ro: true, seed: m.id, tg: "none" }).replace('<div class="q" data-qi="' + i + '">', '<div data-qi="' + i + '">');
      h += "</div>";
    });
    if (hasOpen && !graded) h += '<div class="card">' + (iAmVal ? '<button class="btn ok" data-act="endgrade">Terminer l\'évaluation</button>' : '<p>Le validateur termine l\'évaluation de la grille.</p>') + "</div>";
    return h;
  };

  // ----------------------------------------------------------------- QCM final (individuel)
  V.final = function (X) {
    var c = X.ctl, D = X.data, h = "";
    h += '<div class="top">' + V.logo() + '<span class="grow"></span>' + V.tchip(X.t) + '<span class="chip">Joueur ' + X.p + "</span>" + V.status(X) + '<a class="btn sec sm" href="#/play/' + X.code + "/" + X.t + "/" + X.p + '">← Missions</a></div>' + V.banners(X);
    var cf = c && c.missions && c.missions.F; var fr = X.docs["fin/" + X.t + "/" + X.p];
    h += '<div class="card"><h2>QCM final · individuel</h2><p>20 questions, 20 minutes, sans consulter les autres. Chrono indicatif : <b class="mono" data-chrono="F">' + (cf && cf.open ? CR.mmss(Date.now() - cf.open) : "--:--") + "</b></p></div>";
    if (!cf && !fr) return h + '<div class="card"><p>⏳ Le QCM sera ouvert par l\'enseignant.</p></div>';
    var mine = X.mine.F || { a: {} };
    if (fr) {
      h += '<div class="card" style="text-align:center"><div class="big">' + fr.pts + " / " + D.final.length + '</div><div class="mut">' + Math.round(fr.pct) + " % de bonnes réponses</div></div>";
      D.final.forEach(function (q, i) { h += V.q(q, i, (fr.a || {})[i], { show: true, ro: true, pos: i + 1, total: D.final.length, tg: "none" }); });
      return h;
    }
    var pos = Math.min(X.qpos.F || 0, D.final.length - 1); var done = Object.keys(mine.a).length;
    h += '<div class="sticky"><div class="bar"><i style="width:' + Math.round(done / D.final.length * 100) + '%"></i></div></div>';
    h += V.q(D.final[pos], pos, mine.a[pos], { pos: pos + 1, total: D.final.length, seed: "F" });
    h += '<div class="row sp"><button class="btn sec" data-act="prev" ' + (pos === 0 ? "disabled" : "") + ">← Précédente</button>" + (pos < D.final.length - 1 ? '<button class="btn" data-act="next">Suivante →</button>' : '<button class="btn ok" data-act="finalfinish">Terminer le QCM</button>') + "</div>";
    return h;
  };

  // ----------------------------------------------------------------- tour de contrôle de table
  V.zmap = function (D, bar, color, played) {
    var h = '<div class="zmap" style="--tc:' + color + '">';
    D.missions.forEach(function (m) {
      var n = bar[m.id], has = n !== undefined;
      h += '<div class="zc p' + "PCRAK".indexOf(m.quartier) + '" style="border-color:' + QCOL[m.quartier] + '"><b>' + m.id + "</b>" + esc(m.title.length > 14 ? m.title.slice(0, 13) + "…" : m.title) + '<div class="sl"><i class="' + (n >= 1 ? "f" : "") + '"></i><i class="' + (n >= 2 ? "f" : "") + '"></i></div></div>';
    });
    return h + "</div>";
  };
  V.tower = function (X) {
    var D = X.data, c = X.ctl, h = ""; var col = CR.COLORS[X.t - 1];
    h += '<div class="top">' + V.logo() + '<span class="grow"></span>' + V.tchip(X.t) + V.status(X) + '<a class="btn sec sm" href="#/play/' + X.code + "/" + X.t + '/1">Jouer</a></div>' + V.banners(X);
    if (!c) return h + '<div class="card"><p>En attente de la séance (code ' + esc(X.code) + ")…</p></div>";
    var cur = CR.current(c, D);
    var cm = cur && c.missions[cur.id];
    h += '<div class="grid g2"><div class="card"><div class="mut">Mission en cours</div><div class="towerbig">' + (cur ? cur.id + " · " + esc(cur.title) : "—") + '</div><div class="mut">' + (cur ? esc(cur.topic) : "Aucune mission ouverte") + '</div></div>' +
      '<div class="card"><div class="mut">Chrono (indicatif, non contraignant)</div><div class="towerbig mono" data-chrono="' + (cur ? cur.id : "") + '">' + (cm ? CR.mmss(Date.now() - cm.open) : "--:--") + '</div><div class="mut">' + (cur ? "Durée prévue : " + cur.min + " min (cours inclus)" : "") + "</div></div></div>";
    // joueurs
    h += '<div class="card"><h3>Joueurs de la table</h3><div class="grid g3">';
    for (var p = 1; p <= 5; p++) {
      var j = X.docs["join/" + X.t + "/" + p]; var a = cur && X.docs["ans/" + X.t + "/" + p + "/" + cur.id];
      var tot = cur ? CR.applicable(cur, cm.lvl).length : 0; var n = a && a.a ? Object.keys(a.a).length : 0;
      var res = cur && X.docs["res/" + X.t + "/" + cur.id];
      h += '<div class="card" style="margin:0;opacity:' + (j ? 1 : .4) + '"><b>Joueur ' + p + '</b> <span class="dot ' + (j ? "ok" : "") + '"></span><div class="bar" style="margin:6px 0"><i style="width:' + (tot ? Math.round(n / tot * 100) : 0) + '%"></i></div><div class="mut small">' + (j ? (cur ? (a && a.done ? "✓ réponses envoyées" : n + " / " + tot + " questions") : "connecté") : "absent") + "</div></div>";
    }
    h += "</div>" + (cur ? '<p class="mut">Validation de la table : ' + (X.docs["res/" + X.t + "/" + cur.id] ? "✓ faite" : "en attente") + "</p>" : "") + "</div>";
    // plateau
    h += '<div class="card"><div class="row sp"><h3>Votre plateau</h3><div class="row"><span class="chip">Barrières : <b>' + X.d.barTotal + '</b></span><span class="chip">Impacts : <b>' + X.d.imp + '</b></span><span class="chip">Score : <b>' + X.d.score + "</b></span>" + (c.showRank ? '<span class="chip">Rang : <b>' + X.rank + " / " + X.nt + "</b></span>" : "") + "</div></div>" + V.zmap(D, X.d.bar, col.c) + "</div>";
    return h;
  };

  // ----------------------------------------------------------------- tour enseignant
  V.teacher = function (X) {
    var D = X.data, c = X.ctl, h = ""; var base = X.base;
    if (!c) return '<div class="top">' + V.logo() + "</div><p>Initialisation…</p>";
    h += '<div class="top">' + V.logo() + '<span class="chip">Séance <b>' + esc(X.code) + "</b></span>" + V.status(X) + '<span class="grow"></span><button class="btn sec sm" data-act="exportcsv">Export CSV</button><button class="btn sec sm" data-act="report">Rapport PDF</button><button class="btn sec sm" data-act="home">Quitter</button></div>';
    // commandes
    h += '<div class="grid g2"><div class="card"><h3>Niveau et seuils</h3><div class="tabs">' +
      Object.keys(CR.LEVELS).map(function (k) { return '<span class="pill' + (c.level === k ? " on" : "") + '" data-act="level" data-v="' + k + '">' + CR.LEVELS[k].label + "</span>"; }).join("") + '</div><div class="mut small">' + CR.LEVELS[c.level].desc + '</div>' +
      '<div class="row" style="margin-top:8px"><div style="width:110px"><label>Seuil bas %</label><input id="in-lo" type="number" min="0" max="100" value="' + c.lo + '"></div><div style="width:110px"><label>Seuil haut %</label><input id="in-hi" type="number" min="0" max="100" value="' + c.hi + '"></div><button class="btn sm" data-act="applythr" style="margin-top:22px">Appliquer</button></div>' +
      '<div class="mut small">Les seuils ne s\'appliquent qu\'aux missions ouvertes ensuite. ≥ seuil haut : 2 Barrières · entre les deux : 1 · en dessous du bas : 0 et 1 Impact.</div></div>' +
      '<div class="card"><h3>Animation</h3><div class="row"><button class="btn ' + (c.paused ? "ok" : "sec") + '" data-act="pause">' + (c.paused ? "▶ Reprendre" : "⏸ Pause") + '</button><button class="btn bad" data-act="attack">⚔ Lancer une attaque</button><select id="in-az" style="width:auto"><option value="">zone au hasard</option>' + D.missions.map(function (m) { return '<option value="' + m.id + '">zone ' + m.id + " · " + esc(m.title) + "</option>"; }).join("") + '</select></div>' +
      '<div class="row" style="margin-top:8px"><input id="in-msg" placeholder="Message à toutes les tables" style="flex:1"><button class="btn sm" data-act="sendmsg">Envoyer</button></div>' +
      '<div class="row" style="margin-top:8px"><label style="margin:0"><input type="checkbox" data-act="showrank" ' + (c.showRank ? "checked" : "") + ' style="width:auto"> Afficher le rang aux tables</label><label style="margin:0 0 0 12px">Tables : <select id="in-nt" data-act="nt" style="width:auto;display:inline-block">' + [2, 3, 4, 5].map(function (n) { return "<option" + (c.tables === n ? " selected" : "") + ">" + n + "</option>"; }).join("") + "</select></label></div></div></div>";
    // missions
    h += '<div class="card"><h3>Missions</h3><table class="table"><tr><th>#</th><th>Mission</th><th>État</th><th>Chrono</th><th>Validées</th><th>Moy.</th><th>Actions</th></tr>';
    var allm = D.missions.concat([{ id: "F", title: "QCM final", min: 20, topic: "individuel" }]);
    allm.forEach(function (m) {
      var cm = c.missions && c.missions[m.id]; var vals = [], sum = 0;
      for (var t = 1; t <= c.tables; t++) { if (m.id === "F") { for (var p = 1; p <= 5; p++) { var f = X.docs["fin/" + t + "/" + p]; if (f) { vals.push(1); sum += f.pct; } } } else { var r = X.docs["res/" + t + "/" + m.id]; if (r && r.status === "graded") { vals.push(1); sum += r.pct; } } }
      var st = cm ? (cm.closed ? '<span class="badge bad">Fermée</span>' : '<span class="badge warn">Ouverte</span>') : '<span class="badge">À venir</span>';
      var hint = c.hints && (c.hints["*:" + m.id]);
      h += "<tr><td>" + m.id + "</td><td><b>" + esc(m.title) + '</b><div class="mut small">' + esc(m.topic || "") + "</div></td><td>" + st + (cm && cm.open ? '<div class="mut small">' + CR.LEVELS[cm.lvl].label + " · " + cm.lo + "/" + cm.hi + "</div>" : "") + '</td><td class="mono" data-chrono="' + m.id + '">' + (cm && cm.open ? CR.mmss(Date.now() - cm.open) : "--:--") + "</td><td>" + vals.length + (m.id === "F" ? "" : " / " + c.tables) + "</td><td>" + (vals.length ? Math.round(sum / vals.length) + " %" : "—") + '</td><td class="row" style="gap:4px">' +
        (!cm ? '<button class="btn sm" data-act="mopen" data-m="' + m.id + '">Ouvrir</button>' : (cm.closed ? '<button class="btn sm sec" data-act="mreopen" data-m="' + m.id + '">Rouvrir</button>' : '<button class="btn sm sec" data-act="mclose" data-m="' + m.id + '">Fermer</button>')) +
        (m.id !== "F" ? '<button class="btn sm sec" data-act="mreveal" data-m="' + m.id + '">' + (c.reveal && c.reveal[m.id] ? "Corr. ✓" : "Révéler corr.") + '</button><button class="btn sm sec" data-act="mhint" data-m="' + m.id + '">' + (hint ? "Indices ✓" : "Indices offerts") + "</button>" : "") + "</td></tr>";
    });
    h += "</table></div>";
    // classement
    var rk = CR.rank(X.docs, c, c.tables, D);
    h += '<div class="card"><h3>Classement des tables</h3><table class="table"><tr><th>Rang</th><th>Table</th><th>Joueurs</th><th>Mission en cours</th><th>Barrières</th><th>Impacts</th><th>Score</th><th></th></tr>';
    rk.forEach(function (r) {
      var col = CR.COLORS[r.t - 1]; var np = 0; for (var p = 1; p <= 5; p++) if (X.docs["join/" + r.t + "/" + p]) np++;
      var cur = CR.current(c, D);
      var stt = "—"; if (cur) { var rr = X.docs["res/" + r.t + "/" + cur.id]; var done = 0; for (var p2 = 1; p2 <= 5; p2++) { var a = X.docs["ans/" + r.t + "/" + p2 + "/" + cur.id]; if (a && a.done) done++; } stt = cur.id + " : " + (rr ? "✓ validée" : done + "/" + np + " ont fini"); }
      h += '<tr class="' + (X.openT === r.t ? "hl" : "") + '"><td><b>' + r.rank + '</b></td><td><span class="dot" style="background:' + col.c + '"></span> Table ' + r.t + " · " + col.n + "</td><td>" + np + "</td><td>" + stt + "</td><td>" + r.d.barTotal + "</td><td>" + r.d.imp + '</td><td><b>' + r.d.score + '</b></td><td><button class="btn sm sec" data-act="tdetail" data-t="' + r.t + '">Détail</button></td></tr>';
      if (X.openT === r.t) {
        h += '<tr><td colspan="8">' + V.zmap(D, r.d.bar, col.c) + '<div class="mut small" style="margin-top:6px">' + D.missions.filter(function (m) { return r.d.res[m.id]; }).map(function (m) { var q = r.d.res[m.id]; return m.id + " : " + Math.round(q.pct) + " %" + (q.status !== "graded" ? " (à noter)" : "") + " · indices " + (q.hints || 0); }).join(" | ") + (r.d.attacks.length ? "<br>Attaques : " + r.d.attacks.map(function (a) { return (a.outcome === "removed" ? "−1 Barrière zone " + a.zone : (a.outcome === "impact" ? "Impact (zone " + a.zone + ")" : "sans effet")); }).join(", ") : "") + "</div></td></tr>";
      }
    });
    h += "</table></div>";
    // liens et QR
    h += '<div class="card"><h3>Liens et QR des tables</h3><p class="mut small">Chaque table scanne son QR (ou ouvre le lien) puis choisit son numéro de joueur. La tour de contrôle d\'une table s\'ouvre sur un écran partagé.</p><div class="grid g3">';
    for (var t = 1; t <= c.tables; t++) {
      var col2 = CR.COLORS[t - 1]; var jl = base + "#/join/" + X.code + "/" + t + "?b=" + (c.broker || 0) + (X.mode === "local" ? "&net=local" : ""); var tl = base + "#/tower/" + X.code + "/" + t + "?b=" + (c.broker || 0) + (X.mode === "local" ? "&net=local" : "");
      h += '<div class="card" style="margin:0;text-align:center"><b><span class="dot" style="background:' + col2.c + '"></span> Table ' + t + " · " + col2.n + '</b><div class="qr" data-qr="' + esc(jl) + '"></div><div class="small"><a href="' + esc(jl) + '" target="_blank">Lien joueurs</a> · <a href="' + esc(tl) + '" target="_blank">Tour de contrôle</a></div></div>';
    }
    h += "</div></div>";
    // reponses libres
    var opens = [];
    D.missions.forEach(function (m) { m.qs.forEach(function (q, i) { if (q.t === "open") opens.push([m, i]); }); });
    h += '<div class="card"><h3>Exercices rédigés (réponses des tables)</h3>';
    opens.forEach(function (mi) {
      var m = mi[0], i = mi[1]; h += "<details><summary>Exercice " + (m.ex || "") + " · mission " + m.id + " " + esc(m.title) + "</summary>";
      for (var t = 1; t <= c.tables; t++) { var r = X.docs["res/" + t + "/" + m.id]; if (r && r.final && r.final[i]) h += "<p><b>Table " + t + "</b> (critères cochés : " + ((r.crit && r.crit[i]) ? r.crit[i].filter(Boolean).length : 0) + " / " + m.qs[i].crit.length + ")<br>" + esc(r.final[i]).replace(/\n/g, "<br>") + "</p>"; }
      h += "</details>";
    });
    h += "</div>";
    h += '<p class="mut small">Protection côté navigateur uniquement : ne diffusez pas le lien de la séance hors de la salle. Aucun nom n\'est transmis ni stocké.</p>';
    return h;
  };
})(window.CR);
