"use strict";
/* 적발 관계망(그래프 뷰) — 분석 > 착안점 찾기. (2026-06-13 3계층 재설계)
   레벨0 분야망(10) → [분야 클릭] → 레벨1 그 분야 안 소주제망(상위8) → [소주제 클릭] → 우측 패널(착안점·동반·사례)
   → [소주제 더블클릭] → 레벨2 소주제 중심 이웃망. 간선 클릭=동시 적발 사례. 휠/핀치 줌·드래그 팬·모바일 뒤로가기.
   외부 라이브러리 0(CSP 'self' 준수). */
window.GraphView = (function () {
  const CARDS = () => (window.CARDS || []);
  const esc = s => String(s == null ? "" : s).replace(/[&<>"]/g, m => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[m]));
  const fmt = n => (n || 0).toLocaleString("ko-KR");
  const D = () => window.Digest || {};
  const SEP = "\u0001";
  const cleanArr = a => [...new Set((a || []).map(x => String(x).trim()).filter(x => x && !x.startsWith("(")))];

  // ----- 집계(1회 캐시): 소주제·분야 통계 + 공출현 -----
  let _stat = null;
  function stats() {
    if (_stat) return _stat;
    const st = {}, co = {}, fst = {}, fco = {}, f2s = {};
    CARDS().forEach(c => {
      const subs = cleanArr(c.소주제), flds = cleanArr(c.분야);
      const rec = parseInt(c.연도, 10) >= 2024;
      subs.forEach(s => { const o = st[s] || (st[s] = { n: 0, recent: 0 }); o.n++; if (rec) o.recent++; });
      for (let i = 0; i < subs.length; i++) for (let j = i + 1; j < subs.length; j++) {
        const k = subs[i] < subs[j] ? subs[i] + SEP + subs[j] : subs[j] + SEP + subs[i];
        co[k] = (co[k] || 0) + 1;
      }
      flds.forEach(f => { fst[f] = (fst[f] || 0) + 1; const m = f2s[f] || (f2s[f] = {}); subs.forEach(s => { m[s] = (m[s] || 0) + 1; }); });
      for (let i = 0; i < flds.length; i++) for (let j = i + 1; j < flds.length; j++) {
        const k = flds[i] < flds[j] ? flds[i] + SEP + flds[j] : flds[j] + SEP + flds[i];
        fco[k] = (fco[k] || 0) + 1;
      }
    });
    _stat = { st, co, fst, fco, f2s }; return _stat;
  }
  function neighborsOf(name, minCnt) {
    const { co } = stats(); const out = [];
    for (const k in co) { if (co[k] < minCnt) continue; const p = k.split(SEP); if (p[0] === name) out.push({ k: p[1], w: co[k] }); else if (p[1] === name) out.push({ k: p[0], w: co[k] }); }
    return out.sort((a, b) => b.w - a.w);
  }
  function edgesAmong(co, names, minBase, center) {
    const set = new Set(names); const out = [];
    for (const k in co) { const p = k.split(SEP);
      if (!set.has(p[0]) || !set.has(p[1])) continue;
      const isC = center && (p[0] === center || p[1] === center);
      if (co[k] >= (isC ? 2 : minBase)) out.push({ a: p[0], b: p[1], w: co[k] });
    }
    return out;
  }
  // 레벨1: 특정 분야 카드만 → 소주제 공출현(동적)
  function fieldSubGraph(field) {
    const { f2s } = stats();
    const subN = f2s[field] || {};
    const top = Object.entries(subN).sort((a, b) => b[1] - a[1]).slice(0, 8).map(x => x[0]);
    const co = {};
    CARDS().forEach(c => {
      if (!cleanArr(c.분야).includes(field)) return;
      const subs = cleanArr(c.소주제).filter(s => top.includes(s));
      for (let i = 0; i < subs.length; i++) for (let j = i + 1; j < subs.length; j++) {
        const k = subs[i] < subs[j] ? subs[i] + SEP + subs[j] : subs[j] + SEP + subs[i];
        co[k] = (co[k] || 0) + 1;
      }
    });
    return { nodes: top.map(k => ({ k, n: subN[k], kind: "sub" })), edges: edgesAmong(co, top, 3, null) };
  }

  // ----- force 배치(노드 물리속성 + 라벨 박스 충돌 → 겹침 0 보장) -----
  // 각 노드는 nd.r(원 반경)·nd.lw(라벨 폭) 보유 가정. 라벨은 원 아래 중앙.
  function layout(nodes, edges, W, H) {
    const N = nodes.length; if (!N) return;
    nodes.forEach((nd, i) => { const a = (i / N) * 6.2832 - 1.57; nd.x = W / 2 + Math.min(W, H) / 3.0 * Math.cos(a); nd.y = H / 2 + Math.min(W, H) / 3.0 * Math.sin(a); });
    const idx = {}; nodes.forEach((nd, i) => { idx[nd.k] = i; });
    const hw = nodes.map(nd => Math.max(nd.r || 8, (nd.lw || 40) / 2) + 5);   // 반폭(원·라벨 중 큰 쪽 + 여백)
    const hh = nodes.map(nd => (nd.r || 8) + 17);                              // 반높이(원 + 아래 라벨 + 여백)
    const collide = () => { let m = 0; for (let i = 0; i < N; i++) for (let j = i + 1; j < N; j++) {
      const vx = nodes[i].x - nodes[j].x, vy = nodes[i].y - nodes[j].y;
      const ox = (hw[i] + hw[j]) - Math.abs(vx), oy = (hh[i] + hh[j]) - Math.abs(vy);
      if (ox > 0 && oy > 0) { m++;
        if (ox <= oy) { const p = (ox / 2 + 0.5) * (vx < 0 ? -1 : 1); nodes[i].x += p; nodes[j].x -= p; }
        else { const p = (oy / 2 + 0.5) * (vy < 0 ? -1 : 1); nodes[i].y += p; nodes[j].y -= p; } } } return m; };
    const k = Math.sqrt(W * H / N) * 0.86;
    const wmax = Math.max.apply(null, edges.map(e => e.w).concat(1));
    const IT = 360;
    for (let it = 0; it < IT; it++) {
      const t = 1 - it / IT, cap = 18 * t + 0.8;
      const dx = new Array(N).fill(0), dy = new Array(N).fill(0);
      for (let i = 0; i < N; i++) for (let j = i + 1; j < N; j++) {
        let vx = nodes[i].x - nodes[j].x, vy = nodes[i].y - nodes[j].y;
        const d = Math.sqrt(vx * vx + vy * vy) || 0.1, m = k * k / d * 0.12 / d;
        vx *= m; vy *= m; dx[i] += vx; dy[i] += vy; dx[j] -= vx; dy[j] -= vy;
      }
      edges.forEach(e => {
        const i = idx[e.a], j = idx[e.b]; if (i == null || j == null) return;
        let vx = nodes[i].x - nodes[j].x, vy = nodes[i].y - nodes[j].y;
        const d = Math.sqrt(vx * vx + vy * vy) || 0.1;
        const m = d * d / k * (0.35 + 0.65 * e.w / wmax) * 0.011 / d;
        vx *= m; vy *= m; dx[i] -= vx; dy[i] -= vy; dx[j] += vx; dy[j] += vy;
      });
      for (let i = 0; i < N; i++) {
        dx[i] += (W / 2 - nodes[i].x) * 0.011; dy[i] += (H / 2 - nodes[i].y) * 0.011;
        const dm = Math.sqrt(dx[i] * dx[i] + dy[i] * dy[i]) || 0.001, s = Math.min(dm, cap) / dm;
        nodes[i].x += dx[i] * s; nodes[i].y += dy[i] * s;
      }
      collide();   // 매 반복 라벨 박스 충돌 해소
    }
    for (let p = 0; p < 80 && collide() > 0; p++) {}   // 잔여 충돌 완전 해소
    nodes.forEach((nd, i) => { nd.x = Math.max(hw[i] + 2, Math.min(W - hw[i] - 2, nd.x)); nd.y = Math.max((nd.r || 8) + 4, Math.min(H - hh[i] - 2, nd.y)); });
    for (let p = 0; p < 40 && collide() > 0; p++) {   // 클램프 후 재해소 + 경계 재클램프
      nodes.forEach((nd, i) => { nd.x = Math.max(hw[i] + 2, Math.min(W - hw[i] - 2, nd.x)); nd.y = Math.max((nd.r || 8) + 4, Math.min(H - hh[i] - 2, nd.y)); }); }
  }

  // ----- 모달·상태 -----
  const W = 980, H = 640;
  let modal = null, vb = null, mode = { type: "fields" }, sel = null, onSearch = null;

  function ensureModal() {
    if (modal) return;
    modal = document.createElement("div");
    modal.id = "gvModal"; modal.className = "gvmodal";
    modal.innerHTML = `<div class="gv-card">
      <div class="gv-h"><b>🔗 적발 관계망</b><span class="gv-sub gv-crumb"></span>
        <button class="gv-reset" type="button" title="전체 분야망으로">⤾ 전체</button><button class="gv-x" type="button" title="닫기">✕</button></div>
      <div class="gv-body"><div class="gv-graph"></div><div class="gv-side"></div></div></div>`;
    document.body.appendChild(modal);
    modal.querySelector(".gv-x").onclick = close;
    modal.querySelector(".gv-reset").onclick = () => { mode = { type: "fields" }; sel = null; draw(); };
    modal.onclick = e => { if (e.target === modal) close(); };
    document.addEventListener("keydown", e => { if (e.key === "Escape" && modal.classList.contains("on")) close(); });
  }
  function close() { if (!modal) return; modal.classList.remove("on"); if (D().ovDone) D().ovDone("graph"); }

  function graphSet() {
    const { st, co, fst, fco } = stats();
    if (mode.type === "fields") {
      const names = Object.keys(fst);
      const edges = edgesAmong(fco, names, 1, null).sort((a, b) => b.w - a.w).slice(0, 16);   // 상위 연결만(완전그래프 방지)
      return { nodes: names.map(k => ({ k, n: fst[k], kind: "field" })), edges };
    }
    if (mode.type === "field") return fieldSubGraph(mode.name);
    // sub(소주제 중심)
    const c = mode.center;
    const nb1 = neighborsOf(c, 2);
    const names = [c].concat(nb1.map(x => x.k).slice(0, 9));
    nb1.slice(0, 5).forEach(n1 => neighborsOf(n1.k, 6).slice(0, 3).forEach(n2 => { if (names.indexOf(n2.k) < 0 && names.length < 22) names.push(n2.k); }));
    return { nodes: names.map(k => ({ k, n: (st[k] || { n: 0 }).n, kind: "sub", hop: k === c ? 0 : (nb1.some(x => x.k === k) ? 1 : 2) })), edges: edgesAmong(co, names, 4, c) };
  }

  function crumb() {
    const el = modal.querySelector(".gv-crumb"); if (!el) return;
    if (mode.type === "fields") el.textContent = "분야망 — 분야를 누르면 그 안의 소주제로";
    else if (mode.type === "field") el.textContent = `전체 › ${mode.name} — 소주제를 누르면 착안점·사례`;
    else el.textContent = `소주제 「${mode.center}」 중심 — 선 클릭=동시 사례`;
  }

  function draw() {
    const g = graphSet();
    g.nodes.forEach(nd => { nd.r = nd.kind === "field" ? Math.min(20, 8 + Math.sqrt(nd.n) * 0.22) : Math.min(16, 4.5 + Math.sqrt(nd.n) * 0.55); nd.lw = (String(nd.k).length + String(fmt(nd.n)).length + 1) * 8; });   // 물리속성: 반경 + 라벨폭(11px 추정)
    layout(g.nodes, g.edges, W, H);
    const idx = {}; g.nodes.forEach(nd => { idx[nd.k] = nd; });
    const wmax = Math.max.apply(null, g.edges.map(e => e.w).concat(1));
    const eSvg = g.edges.map(e => { const A = idx[e.a], B = idx[e.b]; if (!A || !B) return "";
      return `<line class="gv-e${sel && (e.a === sel || e.b === sel) ? " hot" : ""}" x1="${A.x.toFixed(1)}" y1="${A.y.toFixed(1)}" x2="${B.x.toFixed(1)}" y2="${B.y.toFixed(1)}" stroke-width="${(1 + 4.2 * e.w / wmax).toFixed(1)}" data-a="${esc(e.a)}" data-b="${esc(e.b)}"><title>${esc(e.a)} × ${esc(e.b)} — 함께 ${fmt(e.w)}건</title></line>`; }).join("");
    const nSvg = g.nodes.map(nd => { const r = nd.kind === "field" ? Math.min(20, 8 + Math.sqrt(nd.n) * 0.22) : Math.min(16, 4.5 + Math.sqrt(nd.n) * 0.55);
      const cls = nd.kind === "field" ? "fld" : (nd.hop === 0 ? "ctr" : nd.hop === 2 ? "far" : "");
      return `<g class="gv-n ${cls}${sel === nd.k ? " sel" : ""}" data-k="${esc(nd.k)}" data-kind="${nd.kind}" tabindex="0" role="button" aria-label="${esc(nd.k)} ${fmt(nd.n)}건">
        <circle cx="${nd.x.toFixed(1)}" cy="${nd.y.toFixed(1)}" r="${r.toFixed(1)}"></circle>
        <text x="${nd.x.toFixed(1)}" y="${(nd.y + r + 14).toFixed(1)}" text-anchor="middle">${esc(nd.k)} ${fmt(nd.n)}</text></g>`; }).join("");
    vb = { x: 0, y: 0, w: W, h: H };
    modal.querySelector(".gv-graph").innerHTML = `<svg viewBox="0 0 ${W} ${H}" class="gv-svg" role="img" aria-label="적발 관계망">${eSvg}${nSvg}</svg>`;
    crumb(); wireGraph(); renderSide();
  }

  function setVB() { modal.querySelector(".gv-svg").setAttribute("viewBox", `${vb.x.toFixed(1)} ${vb.y.toFixed(1)} ${vb.w.toFixed(1)} ${vb.h.toFixed(1)}`); }

  function wireGraph() {
    const svg = modal.querySelector(".gv-svg");
    svg.addEventListener("wheel", e => { e.preventDefault();
      const f = e.deltaY > 0 ? 1.16 : 1 / 1.16, r = svg.getBoundingClientRect();
      const px = vb.x + (e.clientX - r.left) / r.width * vb.w, py = vb.y + (e.clientY - r.top) / r.height * vb.h;
      vb.w = Math.max(120, Math.min(W * 2.2, vb.w * f)); vb.h = vb.w * H / W;
      vb.x = px - (px - vb.x) * f; vb.y = py - (py - vb.y) * f; setVB(); }, { passive: false });
    const pts = new Map(); let panBase = null, pinchBase = null;
    svg.addEventListener("pointerdown", e => { if (e.target.closest(".gv-n")) return;
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY }); svg.setPointerCapture(e.pointerId);
      if (pts.size === 1) panBase = { x: e.clientX, y: e.clientY, vx: vb.x, vy: vb.y };
      if (pts.size === 2) { const a = [...pts.values()]; pinchBase = { d: Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y), w: vb.w, h: vb.h, x: vb.x, y: vb.y }; panBase = null; } });
    svg.addEventListener("pointermove", e => { if (!pts.has(e.pointerId)) return;
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY }); const r = svg.getBoundingClientRect();
      if (pts.size === 2 && pinchBase) { const a = [...pts.values()]; const d = Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y) || 1;
        const f = Math.max(0.4, Math.min(2.6, pinchBase.d / d));
        const cw = Math.max(120, Math.min(W * 2.2, pinchBase.w * f));
        vb.x = pinchBase.x + (pinchBase.w - cw) / 2; vb.y = pinchBase.y + (pinchBase.h - cw * H / W) / 2; vb.w = cw; vb.h = cw * H / W; setVB(); return; }
      if (panBase) { vb.x = panBase.vx - (e.clientX - panBase.x) / r.width * vb.w; vb.y = panBase.vy - (e.clientY - panBase.y) / r.height * vb.h; setVB(); } });
    const up = e => { pts.delete(e.pointerId); if (pts.size < 2) pinchBase = null; if (!pts.size) panBase = null; };
    svg.addEventListener("pointerup", up); svg.addEventListener("pointercancel", up);
    svg.querySelectorAll(".gv-n").forEach(nd => { const k = nd.dataset.k, kind = nd.dataset.kind;
      const act = () => {
        if (kind === "field") { mode = { type: "field", name: k }; sel = null; draw(); return; }   // 분야 → 레벨1 드릴
        sel = k; svg.querySelectorAll(".gv-n.sel").forEach(x => x.classList.remove("sel")); nd.classList.add("sel");
        svg.querySelectorAll(".gv-e").forEach(l => l.classList.toggle("hot", l.dataset.a === k || l.dataset.b === k)); renderSide();
      };
      nd.addEventListener("click", act);
      nd.addEventListener("dblclick", () => { if (kind === "field") { mode = { type: "field", name: k }; sel = null; } else { mode = { type: "sub", center: k }; sel = k; } draw(); });
      nd.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); act(); } }); });
    svg.querySelectorAll(".gv-e").forEach(l => l.addEventListener("click", () => renderSide({ edge: [l.dataset.a, l.dataset.b] })));
  }

  // ----- 우측 패널 -----
  function caseRow(c) {
    const kept = D().isKept && D().isKept(c.id);
    return `<div class="gv-row" data-id="${esc(c.id)}"><span class="gv-rt">${esc(c.제목 || "(제목없음)")}</span><em>${esc(String(c.연도 || ""))}</em><button class="gv-star${kept ? " on" : ""}" type="button" title="내 사례함">${kept ? "★" : "☆"}</button><button class="gv-go" type="button" title="상세">↗</button></div>`;
  }
  function renderSide(opt) {
    const side = modal.querySelector(".gv-side");
    const { st, f2s } = stats();
    if (opt && opt.edge) {
      const [a, b] = opt.edge;
      const list = CARDS().filter(c => { const s = c.소주제 || []; return s.includes(a) && s.includes(b); })
        .sort((x, y) => (parseInt(y.연도, 10) || 0) - (parseInt(x.연도, 10) || 0));
      side.innerHTML = `<div class="gv-st"><b>${esc(a)} × ${esc(b)}</b><span class="gv-meta">동시 적발 ${fmt(list.length)}건</span></div>
        <p class="gv-lab">함께 적발된 실제 사례 — 한쪽을 적발하면 다른 쪽도 점검</p>
        ${list.slice(0, 14).map(caseRow).join("") || '<p class="gv-lab">사례 없음</p>'}
        ${list.length > 14 ? `<p class="gv-lab">…외 ${fmt(list.length - 14)}건</p>` : ""}`;
      wireSide(side); return;
    }
    if (mode.type === "fields") {
      side.innerHTML = `<div class="gv-st"><b>분야망</b><span class="gv-meta">10개 감사 분야 · 선 굵기=함께 적발 빈도</span></div>
        <p class="gv-lab">분야 노드를 누르면 그 분야에서 자주 적발된 <b>소주제 망</b>으로 들어갑니다.<br>거기서 소주제를 누르면 대표 착안점·동반 주제·실제 사례가 나옵니다.<br><br>선(분야 간) 클릭 — 두 분야가 같이 걸린 사례<br>휠·핀치 — 확대 / 빈 곳 드래그 — 이동</p>`;
      wireSide(side); return;
    }
    if (mode.type === "field" && !sel) {
      const subs = Object.entries(f2s[mode.name] || {}).sort((a, b) => b[1] - a[1]).slice(0, 8);
      side.innerHTML = `<div class="gv-st"><b>${esc(mode.name)}</b><span class="gv-meta">분야 내 자주 적발된 소주제 — 누르면 착안점·사례</span></div>
        <p class="gv-lab">상위 소주제</p>${subs.map(([k, n]) => `<button class="gv-nb wide" type="button" data-jump="${esc(k)}">${esc(k)} <b>${fmt(n)}</b></button>`).join("")}`;
      side.querySelectorAll("[data-jump]").forEach(b => b.onclick = () => { sel = b.dataset.jump; const nd = modal.querySelector(`.gv-n[data-k="${CSS.escape(sel)}"]`); if (nd) { nd.classList.add("sel"); } renderSide(); });
      return;
    }
    if (!sel) { side.innerHTML = `<div class="gv-st"><b>탐색 안내</b></div><p class="gv-lab">소주제 노드를 누르면 상세가 나옵니다.</p>`; return; }
    // 소주제 패널
    const s = st[sel] || { n: 0, recent: 0 };
    const cases = CARDS().filter(c => (c.소주제 || []).includes(sel)).sort((x, y) => (parseInt(y.연도, 10) || 0) - (parseInt(x.연도, 10) || 0));
    const seen = new Set(); const aki = [];
    for (const c of cases) { for (const a of (c.착안점 || [])) { const t = String(a).replace(/\s+/g, " ").trim(); if (t.length >= 10 && !seen.has(t)) { seen.add(t); aki.push({ t, id: c.id }); if (aki.length >= 6) break; } } if (aki.length >= 6) break; }
    const nb = neighborsOf(sel, 2).slice(0, 8);
    side.innerHTML = `<div class="gv-st"><b>${esc(sel)}</b><span class="gv-meta">선례 ${fmt(s.n)}건 · 최근 2년 ${s.n ? Math.round(s.recent * 100 / s.n) : 0}%</span></div>
      <div class="gv-actions"><button class="gv-center" type="button">🎯 이 주제 중심으로</button><button class="gv-search" type="button" title="착안점 찾기 검색으로 보내기(보조)">⌕ 검색</button></div>
      <p class="gv-lab">대표 착안점 — 📝 메모 · ★ 사례함 · ↗ 상세</p>
      ${aki.map(a => `<div class="gv-row" data-id="${esc(a.id)}"><span class="gv-rt">${esc(a.t)}</span><button class="gv-memo" type="button" title="메모에 담기">📝</button><button class="gv-star${D().isKept && D().isKept(a.id) ? " on" : ""}" type="button" title="내 사례함">${D().isKept && D().isKept(a.id) ? "★" : "☆"}</button><button class="gv-go" type="button" title="상세">↗</button></div>`).join("") || '<p class="gv-lab">착안점 정보 부족</p>'}
      <p class="gv-lab">함께 적발된 주제 — 클릭=동시 사례</p>
      <div class="gv-nbs">${nb.map(x => `<button class="gv-nb" type="button" data-a="${esc(sel)}" data-b="${esc(x.k)}">${esc(x.k)} <b>${fmt(x.w)}</b></button>`).join("") || '<span class="gv-lab">없음</span>'}</div>`;
    side.querySelector(".gv-center").onclick = () => { mode = { type: "sub", center: sel }; draw(); };
    side.querySelector(".gv-search").onclick = () => { if (onSearch) { const q = sel; close(); onSearch(q); } };
    side.querySelectorAll(".gv-nb").forEach(b => b.onclick = () => renderSide({ edge: [b.dataset.a, b.dataset.b] }));
    wireSide(side);
  }
  function wireSide(side) {
    side.querySelectorAll(".gv-row").forEach(row => {
      const id = row.dataset.id;
      const star = row.querySelector(".gv-star");
      if (star) star.onclick = () => { if (!D().toggleKeep) return; D().toggleKeep(id); const on = D().isKept(id); star.classList.toggle("on", on); star.textContent = on ? "★" : "☆"; };
      const go = row.querySelector(".gv-go");
      if (go) go.onclick = () => { close(); if (D().openCaseModal) D().openCaseModal(id); };
      const mm = row.querySelector(".gv-memo");
      if (mm) mm.onclick = () => { if (!window.Memo || !Memo.add) return; Memo.open(); Memo.add(`□ ${row.querySelector(".gv-rt").textContent} (적발 관계망 · ${sel})`); if (D().toast) D().toast("착안점을 메모에 담았습니다"); };
    });
  }

  function open(opts) {
    opts = opts || {}; onSearch = opts.onSearch || null;
    ensureModal();
    if (opts.focus) { mode = { type: "sub", center: opts.focus }; sel = opts.focus; }
    else { mode = { type: "fields" }; sel = null; }   // 최초 = 분야망(레벨0)
    modal.classList.add("on");
    if (D().ovOpen) D().ovOpen("graph", () => modal.classList.remove("on"));
    draw();
  }
  return { open, layout };
})();
