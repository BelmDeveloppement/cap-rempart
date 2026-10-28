/* (c) 2026 SAS BELM DEVELOPPEMENT. Tous droits reserves. */
window.CR = window.CR || {};
(function (CR) {
  // Relais temps reel : brokers MQTT publics (sans compte). Mode local (?net=local) pour les tests : BroadcastChannel + localStorage.
  CR.BROKERS = ["wss://broker.hivemq.com:8884/mqtt", "wss://broker.emqx.io:8084/mqtt", "wss://test.mosquitto.org:8081"];
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
  Net.prototype.pub = function (topic, obj) {
    this.onmsg(topic, obj); // echo local immediat
    if (this.mode === "local") {
      try { localStorage.setItem("crmock/" + this.code + "/" + topic, JSON.stringify(obj)); } catch (e) { }
      this.bc.postMessage({ t: topic, v: obj }); return;
    }
    if (this.client) this.client.publish(this.base + topic, JSON.stringify(obj), { retain: true, qos: 1 });
  };
  Net.prototype.close = function () { try { if (this.client) this.client.end(true); if (this.bc) this.bc.close(); } catch (e) { } };

  // Sonde un broker (enseignant, a la creation de la seance)
  CR.probe = function (idx, mode) {
    return new Promise(function (res) {
      if (mode === "local") { res(true); return; }
      var done = false, c;
      var to = setTimeout(function () { if (!done) { done = true; try { c.end(true); } catch (e) { } res(false); } }, 6500);
      try {
        c = mqtt.connect(CR.BROKERS[idx], { clientId: "crp_" + Math.random().toString(16).slice(2, 8), reconnectPeriod: 0, connectTimeout: 6000 });
        c.on("connect", function () { if (!done) { done = true; clearTimeout(to); try { c.end(true); } catch (e) { } res(true); } });
        c.on("error", function () { if (!done) { done = true; clearTimeout(to); try { c.end(true); } catch (e) { } res(false); } });
      } catch (e) { res(false); }
    });
  };
  CR.Net = Net;
})(window.CR);
