/* ============================================================
   PLAY//DATA — dashboard.js
   Vanilla JS, no dependencies.
   ============================================================ */
(function () {
  "use strict";

  const D = window.DASHBOARD_DATA;
  const SVGNS = "http://www.w3.org/2000/svg";
  const RED = "#D82929", BLUE = "#1F3FA3", YELLOW = "#F4D03A";
  const INK = "#111111", WHITE = "#FFFFFF", PAPER = "#FAF7F0";

  /* ---------- helpers ---------- */
  function el(tag, attrs, parent) {
    const e = document.createElementNS(SVGNS, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  function fmt(n, d) {
    return Number(n).toLocaleString("en-US", {
      minimumFractionDigits: d || 0,
      maximumFractionDigits: d || 0,
    });
  }
  function textColor(bg) {
    return bg === RED || bg === BLUE || bg === INK ? WHITE : INK;
  }
  function fmtHours(h) {
    if (h < 0.1) return "<0.1h";
    return fmt(h, 1) + "h";
  }

  /* ---------- tooltip ---------- */
  const tip = document.getElementById("tooltip");
  function showTip(html, x, y) {
    tip.innerHTML = html;
    tip.hidden = false;
    const pad = 14;
    let tx = x + pad, ty = y + pad;
    const r = tip.getBoundingClientRect();
    if (tx + r.width > window.innerWidth - 8) tx = x - r.width - pad;
    if (ty + r.height > window.innerHeight - 8) ty = y - r.height - pad;
    tip.style.left = tx + "px";
    tip.style.top = ty + "px";
  }
  function hideTip() { tip.hidden = true; }
  function bindTip(node, html) {
    node.addEventListener("mousemove", (e) => showTip(html, e.clientX, e.clientY));
    node.addEventListener("mouseleave", hideTip);
  }

  /* ---------- animated counters ---------- */
  function animateCounter(node, target, decimals) {
    const dur = 1400;
    const t0 = performance.now();
    function tick(now) {
      const p = Math.min(1, (now - t0) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      node.textContent = fmt(target * eased, decimals);
      if (p < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }
  function initCounters() {
    const o = D.overview;
    const spanMs = new Date(o.until) - new Date(o.span);
    const years = spanMs / (365.25 * 24 * 3600 * 1000);
    const specs = [
      { v: o.plays, d: 0 },
      { v: o.hours, d: 1 },
      { v: o.artists, d: 0 },
      { v: o.tracks, d: 0 },
      { v: years, d: 1 },
      { v: o.albums, d: 0 },
      { v: o.skipRate * 100, d: 1 },
    ];
    const nodes = document.querySelectorAll(".stat-num");
    nodes.forEach((n, i) => {
      const s = specs[i];
      if (s) animateCounter(n, s.v, s.d);
    });
  }

  /* ---------- Mondrian treemap ---------- */
  function treemap(items, x, y, w, h, out) {
    if (!items.length) return;
    if (items.length === 1) { out.push({ item: items[0], x, y, w, h }); return; }
    const total = items.reduce((s, d) => s + d.value, 0);
    const half = total / 2;
    let acc = 0, idx = items.length - 1;
    for (let i = 0; i < items.length; i++) {
      acc += items[i].value;
      if (acc >= half) {
        const before = acc - items[i].value;
        idx = Math.abs(before - half) <= Math.abs(acc - half) ? i : i + 1;
        break;
      }
    }
    idx = Math.max(1, Math.min(items.length - 1, idx));
    const left = items.slice(0, idx);
    const right = items.slice(idx);
    const frac = left.reduce((s, d) => s + d.value, 0) / total;
    if (w >= h) {
      const wl = w * frac;
      treemap(left, x, y, wl, h, out);
      treemap(right, x + wl, y, w - wl, h, out);
    } else {
      const hl = h * frac;
      treemap(left, x, y, w, hl, out);
      treemap(right, x, y + hl, w, h - hl, out);
    }
  }

  function tileColor(i) {
    const pat = [
      WHITE, WHITE, RED, WHITE, YELLOW, WHITE, BLUE, WHITE, WHITE, YELLOW,
      WHITE, RED, WHITE, WHITE, BLUE, WHITE, YELLOW, WHITE, WHITE, RED,
    ];
    return pat[i % pat.length];
  }

  function initTreemap() {
    const svg = document.getElementById("treemapSvg");
    const W = 1000, H = 640, gutter = 3;
    svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
    svg.style.background = INK;

    const items = D.topArtists.map((a, i) => ({ a, i, value: a.plays }));
    const rects = [];
    treemap(items, 0, 0, W, H, rects);
    const maxPlays = rects.length ? rects[0].item.a.plays : 1;

    rects.forEach((r) => {
      const { a, i } = r.item;
      const x = r.x + gutter / 2, y = r.y + gutter / 2;
      const w = r.w - gutter, h = r.h - gutter;
      const bg = tileColor(i);
      const g = el("g", {}, svg);
      const rect = el("rect", {
        x, y, width: w, height: h, fill: bg, class: "tile",
      }, g);
      const fg = textColor(bg);
      const fs = Math.max(8.5, Math.min(15, Math.min(w, h) * 0.3));
      if (w >= 60 && h >= 44) {
        el("text", { x: x + 6, y: y + fs * 0.95, fill: fg, class: "tile-label",
          "font-size": fs, "font-weight": 700, "font-family": "Helvetica Neue, Arial, sans-serif" },
          g).textContent = fit(a.name, w - 12, fs);
        const t2 = el("text", { x: x + 6, y: y + h - 8, fill: fg, class: "tile-label",
          "font-size": 11, "font-family": "Helvetica Neue, Arial, sans-serif" }, g);
        t2.textContent = fmt(a.plays) + " plays";
      } else if (w >= 30 && h >= 12) {
        el("text", { x: x + 6, y: y + h / 2, fill: fg, class: "tile-label",
          "font-size": fs, "font-weight": 700, "font-family": "Helvetica Neue, Arial, sans-serif" },
          g).textContent = fit(a.name, w - 12, fs);
      }
      const html = `<b>${a.name}</b>${fmt(a.plays)} plays · ${fmtHours(a.hours)}<br>skip rate ${(a.skipRate * 100).toFixed(0)}% · top-${i + 1}`;
      bindTip(rect, html);
      rect.addEventListener("click", () => openArtist(a.name));
    });

    svg.dataset.ready = "1";
  }

  function fit(name, maxW, fontSize) {
    name = String(name);
    if (name.length * fontSize * 0.58 <= maxW) return name;
    let out = name;
    while (out.length > 1 && out.length * fontSize * 0.58 > maxW) {
      out = out.slice(0, -1);
    }
    return out.slice(0, -1) + "…";
  }

  /* ---------- artist drill-down panel ---------- */
  function openArtist(name) {
    const panel = document.getElementById("artistPanel");
    const svg = document.getElementById("artistSvg");
    const a = D.topArtists.find((x) => x.name === name);
    const years = D.artistYears[name] || {};
    document.getElementById("artistName").textContent = name;
    const meta = document.getElementById("artistMeta");
    meta.innerHTML =
      `<span style="background:${RED};color:#fff">${fmt(a.plays)} plays</span>` +
      `<span style="background:${YELLOW}">${fmtHours(a.hours)}</span>` +
      `<span>skip ${(a.skipRate * 100).toFixed(0)}%</span>` +
      `<span>${Object.keys(years).length} active yrs</span>`;

    svg.innerHTML = "";
    const W = 900, H = 320, mL = 40, mR = 16, mT = 20, mB = 44;
    svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
    const keys = Object.keys(years).map(Number).sort((x, y) => x - y);
    const maxV = Math.max(1, ...keys.map((k) => years[k]));
    const plotW = W - mL - mR, plotH = H - mT - mB;
    const bw = plotW / keys.length;
    const pal = [RED, BLUE, YELLOW, INK];
    keys.forEach((k, i) => {
      const v = years[k];
      const bh = (v / maxV) * (plotH - 30);
      const x = mL + i * bw + 2;
      const y = mT + plotH - bh;
      const rect = el("rect", { x, y, width: bw - 4, height: bh, fill: pal[i % pal.length] }, svg);
      el("text", { x: x + (bw - 4) / 2, y: H - 16, "font-size": 12, fill: INK, "text-anchor": "middle",
        "font-family": "Helvetica Neue, Arial, sans-serif" }, svg).textContent = k;
      bindTip(rect, `<b>${k}</b>${fmt(v)} plays · ${name}`);
    });
    el("text", { x: mL, y: mT - 4, "font-size": 13, fill: "#555",
      "font-family": "Helvetica Neue, Arial, sans-serif" }, svg)
      .textContent = "Plays per year";

    panel.hidden = false;
  }

  /* ---------- chronology: two stacked per-year panels ---------- */
  function drawYearPanel(svg, yTop, panelH, label, color, getVal, fmtVal) {
    const W = 1000, mL = 64, mR = 20, mT = 34;
    const years = D.years;
    const max = Math.max(...years.map(getVal));
    const plotW = W - mL - mR, plotH = panelH - mT - 24;
    const groupW = plotW / years.length;
    const b = Math.min(groupW * 0.5, 40);

    el("text", { x: mL, y: yTop + 16, "font-size": 14, fill: INK, "font-weight": 800,
      "letter-spacing": "0.04em",
      "font-family": "Helvetica Neue, Arial, sans-serif" }, svg).textContent = label.toUpperCase();

    const nTicks = 4;
    for (let i = 0; i <= nTicks; i++) {
      const v = (max / nTicks) * i;
      const y = yTop + mT + plotH - (v / max) * plotH;
      el("line", { x1: mL, y1: y, x2: W - mR, y2: y, stroke: "#D8D2C4", "stroke-width": 1 }, svg);
      el("text", { x: mL - 8, y: y + 4, "text-anchor": "end", "font-size": 11, fill: "#888",
        "font-family": "Helvetica Neue, Arial, sans-serif" }, svg).textContent = fmt(Math.round(v));
    }

    years.forEach((y, i) => {
      const cx = mL + i * groupW + groupW / 2;
      const v = getVal(y);
      const bh = (v / max) * (plotH - 24);
      const x = cx - b / 2;
      const barY = yTop + mT + plotH - bh;
      const rect = el("rect", { x, y: barY, width: b, height: bh, fill: color }, svg);
      el("text", { x: cx, y: barY - 6, "text-anchor": "middle", "font-size": 11, fill: INK,
        "font-weight": 800, "font-family": "Helvetica Neue, Arial, sans-serif" }, svg)
        .textContent = fmtVal(v);
      el("text", { x: cx, y: yTop + panelH - 6, "text-anchor": "middle", "font-size": 13, fill: INK,
        "font-weight": 700, "font-family": "Helvetica Neue, Arial, sans-serif" }, svg).textContent = y.year;
      const topT = y.topTrack ? `<br>#1 <em>${y.topTrack.name}</em> · ${y.topTrack.artist} (${fmt(y.topTrack.plays)})` : "";
      bindTip(rect, `<b>${fmt(v)} ${label} in ${y.year}</b>${topT}`);
    });
  }

  function initChronology() {
    const svg = document.getElementById("chronoSvg");
    const W = 1000, H = 860;
    svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
    drawYearPanel(svg, 0, H / 2, "plays per year", RED, (y) => y.plays, (v) => fmt(v));
    drawYearPanel(svg, H / 2, H / 2, "hours per year", BLUE, (y) => y.hours, (v) => fmt(v, 1));
  }

  function initYearList() {
    const list = document.getElementById("yearList");
    D.years.forEach((y) => {
      const li = document.createElement("li");
      li.innerHTML =
        `<span class="y">${y.year}</span>` +
        `<span class="trk">${y.topTrack ? y.topTrack.name : "—"}` +
        (y.topTrack ? ` <em>· ${y.topTrack.artist}</em>` : "") + `</span>` +
        `<span class="tot">${fmt(y.plays)} total</span>` +
        `<span class="pl">${fmt(y.topTrack ? y.topTrack.plays : 0)} #1</span>`;
      list.appendChild(li);
    });
  }

  /* ---------- heatmap ---------- */
  function initHeatmap() {
    const svg = document.getElementById("heatSvg");
    const W = 1000, H = 640, mL = 96, mT = 56, mR = 24, mB = 24;
    const gw = W - mL - mR, gh = H - mT - mB;
    const cw = gw / 24, ch = gh / 7;
    svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
    const max = D.heatMax;

    for (let h = 0; h < 24; h++) {
      const x = mL + h * cw;
      el("text", { x: x + cw / 2, y: mT - 12, "text-anchor": "middle", "font-size": 12, fill: "#888",
        "font-family": "Helvetica Neue, Arial, sans-serif" }, svg)
        .textContent = h === 0 ? "midnight" : h === 12 ? "noon" : (h % 6 === 0 ? `${h}:00` : "");
    }

    const steps = [
      { r: 0, c: WHITE },
      { r: 0.25, c: "#F3D9C0" },
      { r: 0.5, c: "#F0B25E" },
      { r: 0.85, c: RED },
      { r: 1.01, c: INK },
    ];
    function stepColor(v) {
      const r = v / max;
      for (const s of steps) if (r <= s.r) return s.c;
      return INK;
    }

    D.heatmap.forEach((row, di) => {
      const y = mT + di * ch;
      el("text", { x: mL - 12, y: y + ch / 2 + 5, "text-anchor": "end", "font-size": 14,
        fill: INK, "font-weight": 700,
        "font-family": "Helvetica Neue, Arial, sans-serif" }, svg).textContent = row.day;
      row.hours.forEach((v, hi) => {
        const x = mL + hi * cw;
        const r = el("rect", {
          x: x + 1, y: y + 1, width: cw - 2, height: ch - 2,
          fill: stepColor(v), class: "heat-cell",
        }, svg);
        const hh = `${String(hi).padStart(2, "0")}:00–${String(hi + 1).padStart(2, "0")}:00`;
        bindTip(r, `<b>${row.day} ${hh}</b>${fmt(v)} plays`);
      });
    });
  }

  /* ---------- habit bars ---------- */
  function initHabits() {
    const o = D.overview;
    setBar("completionBar", "completionLabel", o.endplayRate * 100,
      `${(o.endplayRate * 100).toFixed(1)}% of plays ran to the end`);
    setBar("shuffleBar", "shuffleLabel", o.shuffleRate * 100,
      `${(o.shuffleRate * 100).toFixed(1)}% played on shuffle`);
    setBar("skipBar", "skipLabel", o.skipRate * 100,
      `${(o.skipRate * 100).toFixed(1)}% skipped before the end`);
    document.getElementById("offlineNum").textContent = fmt(o.offline);
    document.getElementById("incognitoNum").textContent = fmt(o.incognito);
    document.getElementById("podcastNum").textContent = fmt(o.podcasts);
    const v = D.video;
    document.getElementById("videoNum").textContent = fmt(v.plays);
    document.getElementById("videoNote").textContent =
      v.span && v.until ? `(${v.span} – ${v.until}, ${fmtHours(v.hours)})` : "";
  }
  function setBar(id, labelId, pct, label) {
    const bar = document.getElementById(id);
    setTimeout(() => { bar.style.width = Math.max(1.5, pct) + "%"; }, 120);
    document.getElementById(labelId).textContent = label;
  }

  /* ---------- platform & country bars ---------- */
  function hbarChart(svgId, rows, max) {
    const svg = document.getElementById(svgId);
    const W = 520, H = rows.length * 46 + 10, mL = 0, rW = 330;
    svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
    const pal = [RED, BLUE, YELLOW, INK, WHITE, RED, BLUE];
    rows.forEach((r, i) => {
      const y = 6 + i * 46;
      const len = (r.plays / max) * rW;
      const bg = pal[i % pal.length];
      el("rect", { x: mL, y, width: len, height: 26, fill: bg, stroke: INK, "stroke-width": 1.5 }, svg);
      el("text", { x: mL + 8, y: y + 18, "font-size": 13, fill: textColor(bg),
        "font-weight": 700, "font-family": "Helvetica Neue, Arial, sans-serif" }, svg)
        .textContent = r.name;
      const label = el("text", { x: mL + rW + 10, y: y + 18, "font-size": 12, fill: "#555",
        "font-family": "Helvetica Neue, Arial, sans-serif" }, svg);
      label.textContent = `${fmt(r.plays)} · ${((r.plays / max) * 100).toFixed(0)}%`;
      bindTip(el("rect", { x: mL, y, width: rW, height: 26, fill: "transparent" }, svg),
        `<b>${r.name}</b>${fmt(r.plays)} plays · ${((r.plays / max) * 100).toFixed(1)}%`);
    });
    svg.setAttribute("height", H + 10);
  }

  function initHabitsCharts() {
    const pl = D.platforms.filter((p) => p.plays > 0);
    hbarChart("platformSvg", pl, pl[0] ? pl[0].plays : 1);
    const cs = D.countries.slice(0, 8);
    hbarChart("countrySvg", cs, cs[0] ? cs[0].plays : 1);
  }

  /* ---------- context strip ---------- */
  function fmtMs(ms) {
    const s = ms / 1000;
    if (s >= 3600) {
      const h = Math.floor(s / 3600), m = Math.round((s % 3600) / 60);
      return m ? `${h}h ${m}m` : `${h}h`;
    }
    if (s >= 60) return `${Math.round(s / 60)}m`;
    return `${Math.round(s)}s`;
  }

  function initContext() {
    const o = D.overview;
    const cells = [];
    function add(tone, label, value, note) {
      cells.push({ tone, label, value, note });
    }
    add("red", "data range", `${o.span} — ${o.until}`, `${fmt(o.days)} days · ${fmt(o.activeDays)} active`);
    add("white", "daily", `${fmt(o.avgPerDay)} plays / day`, `${fmtHours(o.avgHoursPerDay)} per day`);
    add("yellow", "peak day", fmt(o.busiestDay.plays) + " plays", o.busiestDay.date);
    add("black", "longest listen", `${fmtMs(o.longestMs)}`, o.longestTrack ? `${o.longestTrack.name} — ${o.longestTrack.artist}` : "");
    add("blue", "median listen", fmtMs(o.medianMs), "half of all plays are shorter");
    add("white", "span", `${fmt(14.6, 1)} years`, `${fmt(o.tracks)} tracks total`);

    const grid = document.getElementById("contextGrid");
    cells.forEach((c) => {
      const d = document.createElement("div");
      d.className = `ctx ${c.tone}`;
      d.innerHTML =
        `<div class="ctx-label">${c.label}</div>` +
        `<div class="ctx-value">${c.value}</div>` +
        (c.note ? `<div class="ctx-note">${c.note}</div>` : "");
      grid.appendChild(d);
    });
  }

  /* ---------- eras timeline ---------- */
  function initEras() {
    const svg = document.getElementById("erasSvg");
    const W = 1000, H = 660, mL = 200, mR = 16, mT = 26, mB = 40;
    svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
    const years = D.years.map((y) => y.year);
    const yMin = years[0], yMax = years[years.length - 1];
    const plotW = W - mL - mR;
    const plotH = H - mT - mB;

    const artists = D.topArtists.slice(0, 40);
    const rows = artists.length;
    const rowH = plotH / rows;
    const x = (y) => mL + ((y - yMin) / (yMax - yMin)) * plotW;
    const pal = [RED, BLUE, YELLOW, INK];

    for (let y = yMin; y <= yMax; y += 2) {
      el("line", { x1: x(y), y1: mT, x2: x(y), y2: mT + plotH, stroke: "#E5DFD2", "stroke-width": 1 }, svg);
      el("text", { x: x(y), y: mT + plotH + 18, "text-anchor": "middle", "font-size": 12, fill: "#888",
        "font-family": "Helvetica Neue, Arial, sans-serif" }, svg).textContent = y;
    }

    artists.forEach((a, i) => {
      const yr = Object.keys(D.artistYears[a.name]).map(Number).sort((p, q) => p - q);
      if (!yr.length) return;
      const first = yr[0], last = yr[yr.length - 1];
      const yTop = mT + i * rowH + rowH * 0.22;
      const y = yTop + rowH * 0.56;
      const pad = Math.max(6, (x(last) - x(first)) * 0.03);
      const color = pal[i % pal.length];
      const bar = el("rect", {
        x: x(first) + pad, y, width: Math.max(3, x(last) - x(first) - pad),
        height: rowH * 0.56, fill: color, class: "era-bar",
      }, svg);
      const fg = textColor(color);
      if (x(last) - x(first) > 60) {
        el("text", { x: x(first) + pad + 6, y: y + rowH * 0.56 / 2 + 4, fill: fg,
          "font-size": 11, "font-weight": 700,
          "font-family": "Helvetica Neue, Arial, sans-serif" }, svg).textContent = `${fmt(yr.length)}y`;
      }
      const name = el("text", { x: mL - 22, y: yTop + rowH * 0.56 / 2 + 4, "text-anchor": "end",
        "font-size": 12, fill: INK, "font-weight": 700,
        "font-family": "Helvetica Neue, Arial, sans-serif" }, svg);
      name.textContent = fit(a.name, 190, 12);
      el("circle", { cx: mL - 16, cy: yTop + rowH * 0.56 / 2 + 4, r: 3, fill: pal[i % pal.length] }, svg);
      bindTip(bar, `<b>${a.name}</b>active ${first}–${last} · ${yr.length} yrs<br>${fmt(a.plays)} plays · ${fmtHours(a.hours)}<br>skip ${(a.skipRate * 100).toFixed(0)}%`);
    });
    el("text", { x: mL, y: mT - 8, "font-size": 12, fill: "#888",
      "font-family": "Helvetica Neue, Arial, sans-serif" }, svg)
      .textContent = "first play → last play";
  }

  /* ---------- albums shelf ---------- */
  function initAlbums() {
    const svg = document.getElementById("albumsSvg");
    const W = 1000, H = 520, mL = 320, mR = 20, mT = 26, mB = 26;
    svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
    const albums = D.topAlbums.slice(0, 12);
    const max = albums[0].plays;
    const plotW = W - mL - mR;
    const plotH = H - mT - mB;
    const rowH = plotH / albums.length;
    const pal = [RED, BLUE, YELLOW, INK];

    albums.forEach((al, i) => {
      const y = mT + i * rowH + rowH * 0.2;
      const h = rowH * 0.6;
      const len = (al.plays / max) * plotW;
      const color = pal[i % pal.length];
      el("rect", { x: mL, y, width: len, height: h, fill: color }, svg);
      const fg = textColor(color);
      const t1 = el("text", { x: mL - 10, y: y + h / 2 + 4, "text-anchor": "end", "font-size": 12,
        fill: INK, "font-weight": 700, "font-family": "Helvetica Neue, Arial, sans-serif" }, svg);
      t1.textContent = fit(al.name, 300, 12);
      el("text", { x: mL + 8, y: y + h / 2 + 4, "font-size": 11, fill: fg,
        "font-family": "Helvetica Neue, Arial, sans-serif" }, svg)
        .textContent = `${fmt(al.plays)} plays`;
      const hover = el("rect", { x: mL, y, width: plotW, height: h, fill: "transparent" }, svg);
      bindTip(hover, `<b>${al.name}</b>${al.artist}<br>${fmt(al.plays)} plays · ${fmtHours(al.hours)}`);
    });
  }

  /* ---------- init ---------- */
  document.getElementById("artistClose").addEventListener("click", () => {
    document.getElementById("artistPanel").hidden = true;
  });
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") document.getElementById("artistPanel").hidden = true;
  });

  initCounters();
  initTreemap();
  initContext();
  initChronology();
  initYearList();
  initEras();
  initAlbums();
  initHeatmap();
  initHabits();
  initHabitsCharts();
})();
