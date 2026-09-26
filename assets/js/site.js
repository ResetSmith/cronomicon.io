/* cronomicon.io — page behaviour. No dependencies. */
(function () {
  "use strict";

  var root = document.documentElement;
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var SVGNS = "http://www.w3.org/2000/svg";

  function svgEl(name, attrs) {
    var el = document.createElementNS(SVGNS, name);
    for (var k in attrs) el.setAttribute(k, attrs[k]);
    return el;
  }

  /* ---------- Theme ---------- */
  var themeBtn = document.getElementById("theme-toggle");
  function effectiveTheme() {
    var t = root.dataset.theme;
    if (t === "light" || t === "dark") return t;
    return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
  }
  function labelTheme() {
    themeBtn.setAttribute("aria-label", effectiveTheme() === "dark" ? "Switch to light theme" : "Switch to dark theme");
  }
  themeBtn.addEventListener("click", function () {
    var next = effectiveTheme() === "dark" ? "light" : "dark";
    root.dataset.theme = next;
    try { localStorage.setItem("crn-theme", next); } catch (e) {}
    labelTheme();
  });
  labelTheme();

  /* ---------- Header ---------- */
  var header = document.querySelector(".site-header");
  function onScroll() { header.classList.toggle("scrolled", window.scrollY > 8); }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  var menuBtn = document.getElementById("menu-btn");
  var navLinks = document.getElementById("nav-links");
  menuBtn.addEventListener("click", function () {
    var open = navLinks.classList.toggle("open");
    menuBtn.setAttribute("aria-expanded", String(open));
  });
  navLinks.addEventListener("click", function (e) {
    if (e.target.closest("a")) { navLinks.classList.remove("open"); menuBtn.setAttribute("aria-expanded", "false"); }
  });

  /* ---------- Nav: mark the section in view ---------- */
  (function () {
    if (!("IntersectionObserver" in window)) return;
    var links = {};
    navLinks.querySelectorAll("a[href^='#']").forEach(function (a) { links[a.getAttribute("href").slice(1)] = a; });
    var ids = Object.keys(links).concat(["triggers", "governance"]);
    var owner = { triggers: "compose" };
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        var id = owner[en.target.id] || en.target.id;
        Object.keys(links).forEach(function (k) {
          if (k === id) links[k].setAttribute("aria-current", "true");
          else links[k].removeAttribute("aria-current");
        });
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    ids.forEach(function (id) { var el = document.getElementById(id); if (el) io.observe(el); });
    var hero = document.querySelector(".hero");
    new IntersectionObserver(function (e) {
      if (e[0].isIntersecting) Object.keys(links).forEach(function (k) { links[k].removeAttribute("aria-current"); });
    }, { rootMargin: "-45% 0px -50% 0px" }).observe(hero);
  })();

  /* ---------- Bezel behind the emblem: a clock face, 60 ticks ---------- */
  (function () {
    var bezel = document.getElementById("bezel");
    if (!bezel) return;
    for (var i = 0; i < 60; i++) {
      var a = (i / 60) * Math.PI * 2;
      var major = i % 5 === 0;
      var r1 = 196, r2 = major ? 182 : 189;
      bezel.appendChild(svgEl("line", {
        x1: 200 + r1 * Math.sin(a), y1: 200 - r1 * Math.cos(a),
        x2: 200 + r2 * Math.sin(a), y2: 200 - r2 * Math.cos(a),
        stroke: "currentColor", "stroke-width": major ? 2 : 1, "stroke-linecap": "round",
        opacity: major ? 0.9 : 0.45
      }));
    }
  })();

  /* ---------- Tour tabs ---------- */
  var tabs = Array.prototype.slice.call(document.querySelectorAll(".tour-tab"));
  var video = document.getElementById("walk-video");
  var walkBtn = document.getElementById("walk-toggle");

  function selectTab(tab, focus) {
    tabs.forEach(function (t) {
      var on = t === tab;
      t.setAttribute("aria-selected", String(on));
      t.tabIndex = on ? 0 : -1;
      document.getElementById(t.getAttribute("aria-controls")).hidden = !on;
    });
    if (focus) tab.focus();
    if (tab.id !== "tab-walk") setVideo(false);
  }
  tabs.forEach(function (t, i) {
    t.addEventListener("click", function () { selectTab(t); });
    t.addEventListener("keydown", function (e) {
      var n = null;
      if (e.key === "ArrowDown" || e.key === "ArrowRight") n = tabs[(i + 1) % tabs.length];
      else if (e.key === "ArrowUp" || e.key === "ArrowLeft") n = tabs[(i - 1 + tabs.length) % tabs.length];
      else if (e.key === "Home") n = tabs[0];
      else if (e.key === "End") n = tabs[tabs.length - 1];
      if (n) { e.preventDefault(); selectTab(n, true); }
    });
  });

  function setVideo(play) {
    if (!video) return;
    if (play) { var p = video.play(); if (p && p.catch) p.catch(function () {}); }
    else video.pause();
  }
  if (video) {
    video.addEventListener("play", function () { walkBtn.textContent = "Pause"; walkBtn.setAttribute("aria-pressed", "true"); });
    video.addEventListener("pause", function () { walkBtn.textContent = "Play"; walkBtn.setAttribute("aria-pressed", "false"); });
    walkBtn.addEventListener("click", function () { setVideo(video.paused); });
    // The walkthrough plays itself only while it is on screen, and never
    // for someone who has asked for reduced motion.
    if (!reduceMotion && "IntersectionObserver" in window) {
      new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          var panelOpen = !document.getElementById("panel-walk").hidden;
          if (en.isIntersecting && panelOpen) setVideo(true);
          else if (!en.isIntersecting) setVideo(false);
        });
      }, { threshold: 0.5 }).observe(video);
    }
  }

  /* ---------- Trailer ---------- */
  // A modal player opened from the hero. Playback starts on the click that opens it (the
  // narration needs sound, so it is never muted-autoplayed), and closing always pauses.
  // Linking to /#trailer opens the dialog without starting playback.
  (function () {
    var dlg = document.getElementById("trailer");
    var openBtn = document.getElementById("trailer-open");
    var closeBtn = document.getElementById("trailer-close");
    var vid = document.getElementById("trailer-video");
    if (!dlg || !openBtn || !vid || typeof dlg.showModal !== "function") {
      // No <dialog> support: send the button straight to the file.
      if (openBtn) openBtn.addEventListener("click", function () { location.href = "assets/media/trailer.mp4"; });
      return;
    }
    function open(play) {
      if (!dlg.open) dlg.showModal();
      closeBtn.focus({ preventScroll: true });
      if (play) { var p = vid.play(); if (p && p.catch) p.catch(function () {}); }
    }
    openBtn.addEventListener("click", function () { open(true); });
    closeBtn.addEventListener("click", function () { dlg.close(); });
    // A click on the backdrop lands on the <dialog> itself, outside the box.
    dlg.addEventListener("click", function (e) { if (e.target === dlg) dlg.close(); });
    dlg.addEventListener("close", function () {
      vid.pause();
      if (location.hash === "#trailer") history.replaceState(null, "", location.pathname + location.search);
    });
    // The browser's own jump to the #trailer fragment would take focus after us; defer ours.
    if (location.hash === "#trailer") { open(false); requestAnimationFrame(function () { closeBtn.focus({ preventScroll: true }); }); }
  })();

  /* ---------- Copy buttons ---------- */
  document.querySelectorAll("[data-copy]").forEach(function (btn) {
    if (!navigator.clipboard) { btn.hidden = true; return; }
    btn.addEventListener("click", function () {
      var src = document.getElementById(btn.dataset.copy);
      var text = src.innerText.replace(/^\$ /gm, "");
      navigator.clipboard.writeText(text).then(function () {
        var label = btn.querySelector("span");
        label.textContent = "Copied";
        setTimeout(function () { label.textContent = "Copy"; }, 1600);
      }, function () {});
    });
  });

  /* ---------- Workflow replay ---------- */
  (function () {
    var btn = document.getElementById("wf-run");
    var wf = document.getElementById("wf");
    var statusText = document.getElementById("wf-status");
    if (!btn || !wf) return;
    var steps = {};
    wf.querySelectorAll(".step").forEach(function (g) { steps[g.dataset.step] = g; });
    function set(name, state) {
      var g = steps[name];
      g.classList.toggle("running", state === "running");
      g.querySelector(".d-status").setAttribute("class", "d-status " + state);
    }
    var timers = [];
    btn.addEventListener("click", function () {
      timers.forEach(clearTimeout); timers = [];
      btn.disabled = true;
      ["plan", "apply", "smoke", "audit"].forEach(function (s) { set(s, "queued"); });
      set("notify", "skipped");
      statusText.textContent = "Running…";
      var fast = reduceMotion ? 0 : 1;
      var plan = [
        [0, function () { set("plan", "running"); }],
        [1400, function () { set("plan", "success"); set("apply", "running"); }],
        [2900, function () { set("apply", "success"); set("smoke", "running"); set("audit", "running"); }],
        [4100, function () { set("audit", "success"); }],
        [4700, function () { set("smoke", "success"); statusText.textContent = "Last run: success, just now"; btn.disabled = false; }]
      ];
      plan.forEach(function (p) { timers.push(setTimeout(p[1], p[0] * fast)); });
    });
  })();

  /* ---------- The Score ----------
     The Dashboard's "full score": one lane per job, 24 hours back and 12
     ahead, the gold playhead at now. Fires come from real cron expressions
     (the demo seed's jobs), each fire's outcome is deterministic, and time
     runs at 600×. */
  (function () {
    var svg = document.getElementById("score-svg");
    var canvas = document.getElementById("score-canvas");
    var tip = document.getElementById("score-tip");
    var clock = document.getElementById("score-clock");
    var ticker = document.getElementById("ticker");
    var toggle = document.getElementById("score-toggle");
    if (!svg) return;

    var MIN = 60000, HOUR = 60 * MIN;
    var BACK = 24 * HOUR, AHEAD = 12 * HOUR, SPAN = BACK + AHEAD;
    var SPEED = 600;
    var TOP = 26, LANE = 25, AXIS = 30;

    // Lanes, top to bottom. A job with two schedules shares its lane.
    var JOBS = [
      { lane: 0, name: "terraform-plan-prod", sched: "business-hours", cron: "30 9-17/4 * * 1-5", dur: 5 },
      { lane: 1, name: "ansible-patch-tuesday", sched: "patch", cron: "0 3 * * 2", dur: 14 },
      { lane: 1, name: "ansible-patch-tuesday", sched: "canary", cron: "0 15 * * *", dur: 6 },
      { lane: 2, name: "cert-renewal", sched: "daily", cron: "0 4 * * *", dur: 3 },
      { lane: 3, name: "nightly-db-backup", sched: "nightly", cron: "0 2 * * *", dur: 2.3 },
      { lane: 3, name: "nightly-db-backup", sched: "verify-4h", cron: "0 */4 * * *", dur: 2.3 },
      { lane: 4, name: "log-rotate-web", sched: "default", cron: "0 0,12 * * *", dur: 2.2 },
      { lane: 5, name: "python-metrics-export", sched: "hourly", cron: "10 */2 * * *", dur: 1.5 },
      { lane: 6, name: "win-update-check", sched: "default", cron: "0 6,18 * * *", dur: 2.2 },
      { lane: 7, name: "perl-report-gen", sched: "weekdays", cron: "0 7 * * *", dur: 4 },
      { lane: 8, name: "disk-usage-audit", sched: "default", cron: "*/30 * * * *", dur: 3 }
    ];
    var LANES = [];
    JOBS.forEach(function (j) { LANES[j.lane] = j.name; });

    function parseField(f, lo, hi) {
      var set = {};
      f.split(",").forEach(function (part) {
        var step = 1, m = part.split("/");
        if (m[1]) step = parseInt(m[1], 10);
        var a = lo, b = hi;
        if (m[0] !== "*") {
          var r = m[0].split("-");
          a = parseInt(r[0], 10); b = r[1] !== undefined ? parseInt(r[1], 10) : (m[1] ? hi : a);
        }
        for (var v = a; v <= b; v += step) set[v] = true;
      });
      return set;
    }
    JOBS.forEach(function (j) {
      var f = j.cron.split(" ");
      j.m = parseField(f[0], 0, 59); j.h = parseField(f[1], 0, 23);
      j.dom = parseField(f[2], 1, 31); j.mon = parseField(f[3], 1, 12); j.dow = parseField(f[4], 0, 6);
    });

    function hash(s) {
      var h = 2166136261;
      s = String(s);
      for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
      return ((h >>> 0) % 100000) / 100000;
    }

    // One entry per (minute, job schedule).
    var marks = [];
    var genFrom = null, genTo = null;
    function generate(from, to) {
      for (var t = from; t <= to; t += MIN) {
        var d = new Date(t);
        var mi = d.getMinutes(), hr = d.getHours(), dm = d.getDate(), mo = d.getMonth() + 1, dw = d.getDay();
        for (var i = 0; i < JOBS.length; i++) {
          var j = JOBS[i];
          if (j.m[mi] && j.h[hr] && j.dom[dm] && j.mon[mo] && j.dow[dw]) {
            var r = hash(j.name + j.sched + t);
            var result = r < 0.045 ? "failed" : r < 0.10 ? "warn" : "success";
            var dur = j.dur * (0.8 + 0.4 * hash(t + j.name)) * MIN;
            marks.push({ t: t, job: j, result: result, dur: dur, end: t + dur, el: null, state: "" });
          }
        }
      }
    }
    function ensureRange(t0, t1) {
      t0 = Math.floor(t0 / MIN) * MIN; t1 = Math.ceil(t1 / MIN) * MIN;
      if (genFrom === null) { generate(t0, t1); genFrom = t0; genTo = t1; return; }
      if (t1 > genTo) { generate(genTo + MIN, t1); genTo = t1; }
      if (t0 > genFrom + 30 * MIN) {
        marks = marks.filter(function (m) {
          if (m.t < t0) { if (m.el) m.el.remove(); return false; }
          return true;
        });
        genFrom = t0;
      }
    }

    function stateOf(m) {
      if (m.t > now) return "scheduled";
      if (now < m.end) return "running";
      return m.result;
    }

    var shade = svgEl("rect", { "class": "s-future-shade" });
    var laneG = svgEl("g", {}), gridG = svgEl("g", {}), marksG = svgEl("g", {}), fxG = svgEl("g", {}), nowG = svgEl("g", {});
    [shade, laneG, gridG, marksG, fxG, nowG].forEach(function (n) { svg.appendChild(n); });
    var nowLine = svgEl("line", { "class": "s-now" });
    var nowLabel = svgEl("text", { "class": "s-now-label", "text-anchor": "middle" });
    nowLabel.textContent = "NOW";
    nowG.appendChild(nowLine); nowG.appendChild(nowLabel);
    var hoverRing = svgEl("circle", { "class": "s-hover", r: 9, visibility: "hidden" });
    fxG.appendChild(hoverRing);

    var W = 0, H = 0, L = 0;
    function laneY(i) { return TOP + i * LANE + LANE / 2; }
    function measure() {
      W = canvas.clientWidth;
      H = TOP + LANES.length * LANE + AXIS;
      canvas.style.height = H + "px";
      L = W < 640 ? 0 : 196;
      svg.setAttribute("viewBox", "0 0 " + W + " " + H);
      while (laneG.firstChild) laneG.removeChild(laneG.firstChild);
      LANES.forEach(function (name, i) {
        var y = laneY(i);
        laneG.appendChild(svgEl("line", { "class": "s-lane", x1: L, x2: W, y1: y, y2: y }));
        if (L) {
          var tx = svgEl("text", { "class": "s-lane-label", x: 0, y: y + 4 });
          tx.textContent = name;
          laneG.appendChild(tx);
        }
      });
      marks.forEach(function (m) { m.state = ""; });
    }

    var now = Math.floor(Date.now() / MIN) * MIN;
    var prev = now;
    var paused = reduceMotion, visible = true;
    var pulses = [];
    var hover = null;

    function x(t) { var p = L ? 14 : 6; return L + p + ((t - (now - BACK)) / SPAN) * (W - L - p - 6); }
    function pad(n) { return (n < 10 ? "0" : "") + n; }
    function hm(t) { var d = new Date(t); return pad(d.getHours()) + ":" + pad(d.getMinutes()); }
    var DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    function fmtDur(ms) { var s = Math.round(ms / 1000); return Math.floor(s / 60) + "m " + pad(s % 60) + "s"; }
    var LABEL = { success: "Success", warn: "Warn", failed: "Failed", running: "Running", scheduled: "Scheduled" };
    var VERB = { success: "succeeded", warn: "finished with warnings", failed: "failed" };

    function drawGrid() {
      while (gridG.firstChild) gridG.removeChild(gridG.firstChild);
      var step = (W - L) < 520 ? 12 * HOUR : 6 * HOUR;
      var d = new Date(now - BACK); d.setMinutes(0, 0, 0);
      var t = d.getTime() + HOUR;
      while (new Date(t).getHours() % (step / HOUR) !== 0) t += HOUR;
      var yb = TOP + LANES.length * LANE;
      for (; t <= now + AHEAD; t += step) {
        var gx = x(t);
        gridG.appendChild(svgEl("line", { "class": "s-grid", x1: gx, x2: gx, y1: TOP - 4, y2: yb + 4 }));
        var lab = svgEl("text", { "class": "s-axis", x: gx, y: H - 8, "text-anchor": "middle" });
        lab.textContent = hm(t);
        gridG.appendChild(lab);
      }
    }

    function drawMark(m) {
      if (!m.el) {
        m.el = svgEl("circle", { r: 4.5, cy: laneY(m.job.lane) });
        marksG.appendChild(m.el);
      }
      m.el.setAttribute("cx", x(m.t).toFixed(1));
      var s = stateOf(m);
      if (s !== m.state) { m.el.setAttribute("class", "s-mark " + s); m.state = s; }
    }

    function events(from, to) {
      if (to <= from) return;
      var msg = null;
      marks.forEach(function (m) {
        if (m.t > from && m.t <= to) {
          msg = hm(m.t) + "  <b>" + m.job.name + "</b> started";
          if (!reduceMotion) pulses.push({ m: m, born: performance.now(), el: fxG.appendChild(svgEl("circle", { "class": "s-pulse", r: 5 })) });
        }
        if (m.end > from && m.end <= to) msg = hm(m.end) + "  <b>" + m.job.name + "</b> " + VERB[m.result] + " in " + fmtDur(m.dur);
      });
      if (msg) ticker.innerHTML = msg;
    }

    function drawPulses(ts) {
      pulses = pulses.filter(function (p) {
        var k = (ts - p.born) / 900;
        if (k >= 1) { p.el.remove(); return false; }
        p.el.setAttribute("cx", x(p.m.t)); p.el.setAttribute("cy", laneY(p.m.job.lane));
        p.el.setAttribute("r", 5 + k * 14);
        p.el.setAttribute("opacity", (1 - k).toFixed(2));
        return true;
      });
    }

    function nearest(px, py) {
      var best = null, bd = 14 * 14;
      marks.forEach(function (m) {
        var dx = x(m.t) - px, dy = laneY(m.job.lane) - py, d = dx * dx + dy * dy;
        if (d < bd) { bd = d; best = m; }
      });
      return best;
    }

    function drawHover() {
      var m = hover && nearest(hover.x, hover.y);
      if (!m) { hoverRing.setAttribute("visibility", "hidden"); tip.classList.remove("show"); return; }
      var mx = x(m.t), my = laneY(m.job.lane), s = stateOf(m), d = new Date(m.t);
      hoverRing.setAttribute("cx", mx); hoverRing.setAttribute("cy", my);
      hoverRing.setAttribute("visibility", "visible");
      var html = '<div class="t">' + DAYS[d.getDay()] + " " + hm(m.t) + ", " + m.job.sched + " schedule</div>" +
        '<div class="r"><span class="dot ' + s + '"></span>' + m.job.name + "<code>" + m.job.cron + "</code></div>" +
        '<div class="t" style="margin:4px 0 0 17px">' + LABEL[s] + (s === "scheduled" || s === "running" ? "" : " in " + fmtDur(m.dur)) + "</div>";
      if (tip.innerHTML !== html) tip.innerHTML = html;
      var tw = tip.offsetWidth, th = tip.offsetHeight;
      tip.style.left = Math.min(Math.max(mx - tw / 2, 0), W - tw) + "px";
      tip.style.top = (my - th - 14 < 0 ? my + 16 : my - th - 14) + "px";
      tip.classList.add("show");
    }

    function render(ts) {
      ensureRange(now - BACK - 10 * MIN, now + AHEAD + 30 * MIN);
      var nx = x(now), yb = TOP + LANES.length * LANE;
      shade.setAttribute("x", nx); shade.setAttribute("y", TOP - 4);
      shade.setAttribute("width", Math.max(W - nx, 0)); shade.setAttribute("height", yb - TOP + 8);
      nowLine.setAttribute("x1", nx); nowLine.setAttribute("x2", nx);
      nowLine.setAttribute("y1", TOP - 6); nowLine.setAttribute("y2", yb + 6);
      nowLabel.setAttribute("x", nx); nowLabel.setAttribute("y", TOP - 12);
      drawGrid();
      marks.forEach(drawMark);
      drawPulses(ts || performance.now());
      drawHover();
      var d = new Date(now);
      clock.textContent = DAYS[d.getDay()] + " " + hm(now);
    }

    var running = false, last = null;
    function frame(ts) {
      if (last === null) last = ts;
      var dt = Math.min(ts - last, 100);
      last = ts;
      if (!paused && visible) {
        prev = now;
        now += dt * SPEED;
        events(prev, now);
      }
      render(ts);
      if (!paused && visible) requestAnimationFrame(frame);
      else { running = false; last = null; }
    }
    function kick() { if (!running && !paused && visible) { running = true; requestAnimationFrame(frame); } }

    function setPaused(p) {
      paused = p;
      toggle.setAttribute("aria-pressed", String(p));
      toggle.querySelector("span").textContent = p ? "Play" : "Pause";
      kick();
    }
    toggle.addEventListener("click", function () { setPaused(!paused); });
    if (paused) setPaused(true);

    canvas.addEventListener("pointermove", function (e) {
      var r = canvas.getBoundingClientRect();
      hover = { x: e.clientX - r.left, y: e.clientY - r.top };
      if (!running) render();
    });
    canvas.addEventListener("pointerleave", function () { hover = null; if (!running) render(); });

    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (entries) { visible = entries[0].isIntersecting; kick(); }).observe(canvas);
    }
    var lastW = 0;
    function onResize() { if (canvas.clientWidth !== lastW) { lastW = canvas.clientWidth; measure(); render(); } }
    if ("ResizeObserver" in window) new ResizeObserver(onResize).observe(canvas);
    else window.addEventListener("resize", onResize);

    measure();
    render();
    (function () {
      var lastM = null;
      marks.forEach(function (m) { if (m.end <= now && (!lastM || m.end > lastM.end)) lastM = m; });
      if (lastM) ticker.innerHTML = hm(lastM.end) + "  <b>" + lastM.job.name + "</b> " + VERB[lastM.result] + " in " + fmtDur(lastM.dur);
    })();
    kick();
  })();
})();
