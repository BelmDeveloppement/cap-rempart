/* (c) 2026 SAS BELM DEVELOPPEMENT. Tous droits reserves. */
window.CR = window.CR || {};
(function (CR) {
  // Relais temps reel : brokers MQTT publics (sans compte). Mode local (?net=local) pour les tests : BroadcastChannel + localStorage.
  CR.RELAY = "wss://cpro-relay.belmdeveloppement.workers.dev/ps";   // relais Cloudflare (voie principale, index 0)
  CR.BROKERS = ["relay", "wss://broker.hivemq.com:8884/mqtt", "wss://broker.emqx.io:8084/mqtt", "wss://test.mosquitto.org:8081"];
  CR.BASE = "caprempart/v1/";

  function Net(code, brokerIdx, mode) {
    this.code = code; this.base = CR.BASE + code + "/"; this.idx = brokerIdx || 0; this.mode = mode || "mqtt";
    this.onmsg = function () { }; this.onstatus = function () { }; this.client = null; this.bc = null;
  }
  Net.prototype.connect = function () {
    var self = this;
    if (this.mode === "local") {
      this.bc = new BroadcastChannel("cr-" + this.code);
      this.bc.onmessage = function (e) { self.onmsg(e.data.t, e.data.v); };
      try { for (var i = 0; i < localStorage.length; i++) { var k = localStorage.key(i); if (k.indexOf("crmock/" + this.code + "/") === 0) { self.onmsg(k.slice(("crmock/" + this.code + "/").length), JSON.parse(localStorage.getItem(k))); } } } catch (e) { }
      setTimeout(function () { self.onstatus("ok", "local"); }, 0);
      return;
    }
    if (this.idx === 0) { this.connectRelay(); return; }
    var url = CR.BROKERS[this.idx];
    this.onstatus("connecting", url);
    var c = mqtt.connect(url, { clientId: "cr_" + Math.random().toString(16).slice(2, 10), clean: true, reconnectPeriod: 3000, connectTimeout: 8000, keepalive: 30 });
    this.client = c;
    c.on("connect", function () { c.subscribe(self.base + "#", { qos: 1 }); self.onstatus("ok", url); });
    c.on("reconnect", function () { self.onstatus("retry", url); });
    c.on("offline", function () { self.onstatus("offline", url); });
    c.on("error", function (e) { self.onstatus("error", String(e && e.message || e)); });
    c.on("message", function (topic, payload) {
      var t = topic.slice(self.base.length); var s = payload.toString();
      if (!s) { self.onmsg(t, null); return; }
      try { self.onmsg(t, JSON.parse(s)); } catch (e) { }
    });
  };
  // Relais Cloudflare : un sujet « crk » (cle/valeur) par seance ; le relais garde la derniere valeur de chaque cle
  Net.prototype.connectRelay = function () {
    var self = this, fails = 0, ping = null, dead = false; this.pend = {}; this.rdead = false;
    function open() {
      if (self.rdead) return;
      self.onstatus("connecting", "relais Cloudflare");
      var w; try { w = new WebSocket(CR.RELAY + "?room=" + encodeURIComponent("cr" + self.code.toLowerCase())); } catch (e) { return again(); }
      self.ws = w; var closed = false;
      w.onopen = function () {
        fails = 0; w.send(JSON.stringify({ a: "sub", t: "crk", since: 0 }));
        Object.keys(self.pend).forEach(function (k) { w.send(JSON.stringify({ a: "pub", t: "crk", m: JSON.stringify({ k: k, v: self.pend[k] }) })); }); self.pend = {};
        clearInterval(ping); ping = setInterval(function () { try { w.send("ping"); } catch (e) { } }, 25000);
        self.onstatus("ok", "relais Cloudflare");
      };
      w.onmessage = function (e) {
        if (e.data === "pong") return; var m; try { m = JSON.parse(e.data); } catch (x) { return; }
        if (m.a !== "msg" || m.t !== "crk") return; var o; try { o = JSON.parse(m.m); } catch (x) { return; }
        if (o && typeof o.k === "string") self.onmsg(o.k, o.v === undefined ? null : o.v);
      };
      function end() { if (closed) return; closed = true; clearInterval(ping); self.ws = null; self.onstatus("retry", "relais Cloudflare"); again(); }
      w.onclose = end; w.onerror = end;
    }
    function again() { if (self.rdead) return; fails++; setTimeout(open, Math.min(15000, 1000 * Math.pow(2, Math.min(fails, 4)))); }
    open();
  };
  Net.prototype.pub = function (topic, obj) {
    this.onmsg(topic, obj); // echo local immediat
    if (this.idx === 0 && this.mode !== "local") {
      if (this.ws && this.ws.readyState === 1) { try { this.ws.send(JSON.stringify({ a: "pub", t: "crk", m: JSON.stringify({ k: topic, v: obj }) })); return; } catch (e) { } }
      this.pend[topic] = obj; return;   // envoye a la reconnexion
    }
    if (this.mode === "local") {
      try { localStorage.setItem("crmock/" + this.code + "/" + topic, JSON.stringify(obj)); } catch (e) { }
      this.bc.postMessage({ t: topic, v: obj }); return;
    }
    if (this.client) this.client.publish(this.base + topic, JSON.stringify(obj), { retain: true, qos: 1 });
  };
  Net.prototype.close = function () { this.rdead = true; try { if (this.ws) this.ws.close(); } catch (e) { } try { if (this.client) this.client.end(true); if (this.bc) this.bc.close(); } catch (e) { } };

  // Sonde un broker (enseignant, a la creation de la seance)
  CR.probe = function (idx, mode) {
    return new Promise(function (res) {
      if (mode === "local") { res(true); return; }
      if (idx === 0) { var d0 = false, w0; var t0 = setTimeout(function () { if (!d0) { d0 = true; try { w0.close(); } catch (e) { } res(false); } }, 5000);
        try { w0 = new WebSocket(CR.RELAY + "?room=crprobe"); w0.onopen = function () { if (!d0) { d0 = true; clearTimeout(t0); try { w0.close(); } catch (e) { } res(true); } }; w0.onerror = function () { if (!d0) { d0 = true; clearTimeout(t0); res(false); } }; } catch (e) { res(false); } return; }
      var done = false, c;
      var to = setTimeout(function () { if (!done) { done = true; try { c.end(true); } catch (e) { } res(false); } }, 6500);
      try {
        c = mqtt.connect(CR.BROKERS[idx], { clientId: "crp_" + Math.random().toString(16).slice(2, 8), reconnectPeriod: 0, connectTimeout: 6000 });
        c.on("connect", function () { if (!done) { done = true; clearTimeout(to); try { c.end(true); } catch (e) { } res(true); } });
        c.on("error", function () { if (!done) { done = true; clearTimeout(to); try { c.end(true); } catch (e) { } res(false); } });
      } catch (e) { res(false); }
    });
  };
  // Cherche la seance sur chaque relais (eleve qui saisit le code) : renvoie l'index du relais qui porte le document ctl, ou -1
  CR.find = function (code, mode) {
    if (mode === "local") return Promise.resolve(0);
    function one(idx) {
      if (idx === 0) return new Promise(function (res) {
        var d = false, w; function fin(v) { if (d) return; d = true; clearTimeout(to); try { w.close(); } catch (e) { } res(v); }
        var to = setTimeout(function () { fin(false); }, 4000);
        try { w = new WebSocket(CR.RELAY + "?room=" + encodeURIComponent("cr" + code.toLowerCase())); w.onopen = function () { w.send(JSON.stringify({ a: "sub", t: "crk", since: 0 })); };
          w.onmessage = function (e) { try { var m = JSON.parse(e.data); if (m.a === "msg") { var o = JSON.parse(m.m); if (o.k === "ctl" && o.v) fin(true); } } catch (x) { } }; w.onerror = function () { fin(false); }; } catch (e) { res(false); }
      });
      return new Promise(function (res) {
        var done = false, c, base = CR.BASE + code + "/";
        function fin(v) { if (done) return; done = true; clearTimeout(to); try { c.end(true); } catch (e) { } res(v); }
        var to = setTimeout(function () { fin(false); }, 5000);
        try {
          c = mqtt.connect(CR.BROKERS[idx], { clientId: "crf_" + Math.random().toString(16).slice(2, 8), reconnectPeriod: 0, connectTimeout: 4500 });
          c.on("connect", function () { c.subscribe(base + "ctl", { qos: 1 }); });
          c.on("message", function (t, p) { if (p && p.length) fin(true); });
          c.on("error", function () { fin(false); });
        } catch (e) { res(false); }
      });
    }
    return Promise.all(CR.BROKERS.map(function (b, i) { return one(i); })).then(function (r) { return r.indexOf(true); });
  };
  CR.Net = Net;
})(window.CR);
