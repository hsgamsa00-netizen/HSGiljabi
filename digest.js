"use strict";
/* 사례 탐색 v0.3 — 분야 그리드·연도 슬라이더·법령 통합(한 줄)·넓은 공용 상세 팝업·킵(내 사례함). */
window.Digest = (function () {
  // 사례 순서 랜덤화(세션마다 다양한 사례 노출) — 1회 셔플. dashboard도 공유.
  (function () { const a = window.CARDS || []; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); const t = a[i]; a[i] = a[j]; a[j] = t; } })();
  const ALL = (window.CARDS || []);
  const NZ = ALL.filter(c => c.출처 !== "csd");
  const fmt = n => n.toLocaleString("ko-KR");
  let F = { gye: null, disp: null, knd: null, fld: null, viol: null, sub: null, crit: null, crime: null, yrFrom: null, yrTo: null, q: "" };
  let sel = null, _oc = "";
  function setOC(v) { _oc = (v || "").trim(); if (sel && document.getElementById("detail").querySelector(".casebody")) showDetail(sel.id); }

  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, m => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[m])); }
  // 가독성: 원문 변경 없이 줄바꿈/긴문장 분할만(날짜 '2013. 12.'·금액 천단위콤마 보호)
  function boldOn() { try { return localStorage.getItem("bold_key") !== "0"; } catch (e) { return true; } }   // 기본 ON(명시 "0"일 때만 OFF)
  function flowOn() { try { return localStorage.getItem("flow_key") !== "0"; } catch (e) { return true; } }   // 플로우 스트립 토글(기본 ON)
  function hoverPreviewOn() { try { return localStorage.getItem("hover_key") !== "0"; } catch (e) { return true; } }   // 목록 호버 미리보기 토글(기본 ON)
  function fmtBody(t, keys) {
    t = String(t || "").trim(); if (!t) return "";
    // E15: 설정 ON + 핵심구 있으면 해당 구절 볼드(원문 그대로 매칭). 마커→esc 후 <b>로 복원(줄바꿈 가로질러도 안전).
    if (boldOn() && Array.isArray(keys)) keys.forEach(k => { const kk = String(k).trim(); if (kk.length >= 4 && t.indexOf(kk) >= 0) t = t.split(kk).join("@!B!@" + kk + "@!E!@"); });
    t = t.replace(/([가-힣%)\]」』])\.\s+/g, "$1.\n");                         // 문장 종결 뒤 줄바꿈(날짜 숫자.은 보호)
    // (구) >88자 쉼표 강제분할 제거 — 1~2단어 고아 줄 유발. 줄채움·고아 회피는 CSS(word-break:keep-all+text-wrap:pretty)에 위임.
    const html = esc(t).replace(/@!B!@/g, '<b class="kw">').replace(/@!E!@/g, "</b>");
    return html.split(/\n+/).filter(s => s.trim()).map(s => `<p>${s}</p>`).join("");   // 단락 리듬(피로 S2): <br> 평탄 나열 → 문장 단위 <p>
  }
  // 적신호 명령형 말미 중립화 — "X(을/를) 의심·점검…하라" → "X 점검 대상"(판단어 제거·표시만, 원문 데이터는 보존)
  function neutralRedflag(s) {
    s = String(s == null ? "" : s);
    const tail = "\\s*하(?:라|십시오|세요|자|아야\\s*한다|해야\\s*한다)(?=[.。\\s]|$)";
    s = s.replace(new RegExp("([가-힣A-Za-z0-9·)\\]]+)(?:을|를)\\s*(?:의심|점검|확인|검토|대조|유의|주의)" + tail, "g"), "$1 점검 대상");
    s = s.replace(new RegExp("(?:의심|점검|확인|검토|대조|유의|주의)" + tail, "g"), "점검 대상");
    return s;
  }
  function dispClass(d) { d = Array.isArray(d) ? (d[0] || "") : (d || "");
    if (/문책|징계|고발|수사/.test(d)) return ["mun", d || "(미상)"]; if (/통보/.test(d)) return ["tong", d];
    if (/변상/.test(d)) return ["bs", d]; if (/주의/.test(d)) return ["ju", d]; return ["etc", d || "(처분미상)"]; }
  const dispOf = c => { let d = c.처분종류; return Array.isArray(d) ? (d[0] || "") : (d || ""); };
  const dispListOf = c => { let d = c.처분종류; return Array.isArray(d) ? d.filter(Boolean) : (d ? [d] : []); };   // 복수 처분 모두(처분요구 기준)
  function dispBadges(c) { const ds = dispListOf(c); if (!ds.length) { const [k, t] = dispClass(""); return `<span class="disp ${k}">${esc(t)}</span>`; }
    return ds.map(d => { const [k, t] = dispClass(d); return `<span class="disp ${k}">${esc(t)}</span>`; }).join(""); }   // 한 사례의 처분을 각각 배지로 명시
  function facet(key, set) { const m = {}; (set || ALL).forEach(c => { let v = c[key]; (Array.isArray(v) ? v : [v]).forEach(x => { if (x && !String(x).startsWith("(")) m[x] = (m[x] || 0) + 1; }); });
    return Object.entries(m).sort((a, b) => b[1] - a[1]); }

  // ----- 킵(내 사례함) -----
  const KEEPKEY = "kept_ids";
  function keptSet() { try { return new Set(JSON.parse(localStorage.getItem(KEEPKEY) || "[]")); } catch (e) { return new Set(); } }
  function isKept(id) { return keptSet().has(id); }
  function toggleKeep(id) { const s = keptSet(); s.has(id) ? s.delete(id) : s.add(id); try { localStorage.setItem(KEEPKEY, JSON.stringify([...s])); } catch (e) {} onKeepChange(); }
  function keptCards() { const s = keptSet(); return ALL.filter(c => s.has(c.id)); }
  function updateKeepCount() { const n = keptSet().size, el = document.getElementById("keepCount"); if (el) { el.textContent = n; el.style.display = n ? "inline-block" : "none"; } }
  function onKeepChange() { updateKeepCount(); renderKeepList(); }
  function keepStatsHtml(list) {
    const cnt = key => { const m = {}; list.forEach(c => { let v = c[key]; (Array.isArray(v) ? v : [v]).forEach(x => { if (x && !String(x).startsWith("(")) m[x] = (m[x] || 0) + 1; }); }); return Object.entries(m).sort((a, b) => b[1] - a[1]); };
    const chips = (arr, n) => arr.slice(0, n).map(([k, v]) => `<span class="kstat">${esc(k)} <b>${v}</b></span>`).join("") || "—";
    const dc = {}; list.forEach(c => dispListOf(c).forEach(d => { dc[d] = (dc[d] || 0) + 1; }));   // 처분요구 기준(복수 각각 집계)
    const dchips = Object.entries(dc).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([k, v]) => `<span class="kstat">${esc(k)} <b>${v}</b></span>`).join("") || "—";
    return `<div class="keepstats"><div class="kshead">📊 담은 사례 경향 <span class="muted">총 ${list.length}건 — 주로 참고하는 유형</span></div>
      <div class="ksrow"><span class="kslab">분야</span><div class="ksvals">${chips(cnt("분야"), 4)}</div></div>
      <div class="ksrow"><span class="kslab">위반유형</span><div class="ksvals">${chips(cnt("위반유형"), 4)}</div></div>
      <div class="ksrow"><span class="kslab">처분</span><div class="ksvals">${dchips}</div></div>
      <div class="ksrow"><span class="kslab">기관계열</span><div class="ksvals">${chips(cnt("기관계열"), 3)}</div></div></div>`;
  }
  function renderKeepList() {
    const box = document.getElementById("keepList"); if (!box) return;
    const list = keptCards();
    if (!list.length) { box.innerHTML = `<div class="keepempty"><div class="big">⭐</div>아직 담은 사례가 없습니다.<br>사례 목록·상세에서 <b>☆</b>를 눌러 담아 보세요.</div>`; return; }
    box.innerHTML = keepToolsHtml() + keepStatsHtml(list) + list.map(caseCardHtml).join("");
    wireCards(box, openCaseModal);
    wireKeepTools(box, list);
  }
  // ----- 내 사례함 도구(A⑥): 비교표 HWP 복사 · JSON 백업/가져오기 — 전부 로컬 동작·외부 전송 0 -----
  function keepToolsHtml() {
    return `<div class="keeptools"><button class="ktbtn pri" id="ktCopy" type="button" title="담은 선례 전체를 표로 복사 — 한글(HWP)·워드에 표 그대로 붙습니다">📋 비교표 복사</button><button class="ktbtn" id="ktExp" type="button" title="내 사례함·메모를 JSON 파일로 백업(이 기기에 저장)">⬇ 백업(JSON)</button><button class="ktbtn" id="ktImp" type="button" title="백업 JSON을 불러와 현재 사례함·메모에 합칩니다">⬆ 가져오기</button><input id="ktFile" type="file" accept=".json,application/json" hidden></div>`;
  }
  function wireKeepTools(box, list) {
    const cp = box.querySelector("#ktCopy"); if (cp) cp.onclick = async () => {
      const rows = list.map(c => `<tr><td>${esc(c.제목 || "")}</td><td>${esc(c.처분종류 || "")}</td><td>${esc(amtOf(c) || "—")}</td><td>${esc(c.연도 || "")}</td><td>${esc(c.감사명 || "")} · ${c.srno}</td></tr>`).join("");
      const html = `<table border="1" cellspacing="0" cellpadding="4"><tr><th>선례</th><th>처분</th><th>금액</th><th>연도</th><th>출처(화성시 · 순번)</th></tr>${rows}</table>`;
      const plain = list.map(c => [c.제목, c.처분종류, amtOf(c) || "—", c.연도, (c.감사명 || "") + " " + c.srno].join("\t")).join("\n");
      let ok = false;
      try { if (window.ClipboardItem) { await navigator.clipboard.write([new ClipboardItem({ "text/html": new Blob([html], { type: "text/html" }), "text/plain": new Blob([plain], { type: "text/plain" }) })]); ok = true; } } catch (e) {}
      if (!ok) { try { await navigator.clipboard.writeText(plain); ok = true; } catch (e) {} }
      cp.textContent = ok ? "✓ 복사됨 — 한글에 붙여넣기" : "복사 실패(브라우저 권한 확인)"; setTimeout(() => { cp.textContent = "📋 비교표 복사"; }, 2400);
    };
    const ex = box.querySelector("#ktExp"); if (ex) ex.onclick = () => {
      let memos = []; try { memos = JSON.parse(localStorage.getItem("memos") || "[]"); } catch (e) {}
      const data = { app: "감사 길잡이", ver: 1, exported: new Date().toISOString().slice(0, 10), kept_ids: [...keptSet()], memos };
      const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 1)], { type: "application/json" }));
      a.download = `감사길잡이_백업_${data.exported}.json`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    };
    const im = box.querySelector("#ktImp"), fi = box.querySelector("#ktFile");
    if (im && fi) { im.onclick = () => fi.click(); fi.onchange = () => { const f = fi.files && fi.files[0]; if (!f) return; const rd = new FileReader();
      rd.onload = () => { try {
        const d = JSON.parse(rd.result); const s = keptSet(); (d.kept_ids || []).forEach(id => s.add(String(id)));
        localStorage.setItem(KEEPKEY, JSON.stringify([...s]));
        if (Array.isArray(d.memos) && d.memos.length) { let cur = []; try { cur = JSON.parse(localStorage.getItem("memos") || "[]"); } catch (e) {} const seen = new Set(cur.map(m => JSON.stringify(m))); d.memos.forEach(m => { const k = JSON.stringify(m); if (!seen.has(k)) { cur.push(m); seen.add(k); } }); localStorage.setItem("memos", JSON.stringify(cur)); }
        onKeepChange();
      } catch (e) { alert("백업 파일을 읽지 못했습니다 — 감사 길잡이 백업(JSON) 파일인지 확인해 주세요."); } fi.value = ""; };
      rd.readAsText(f); }; }
  }

  // ----- 법령 (E12: 한 항목 통합) -----
  function lawParse(s) {
    s = String(s || "").trim();
    const m = s.match(/제\s*(\d+)\s*조(?:\s*의\s*(\d+))?/) || s.match(/§\s*(\d+)/);
    let jo = 0, ga = 0, art = "";
    if (m) { jo = parseInt(m[1], 10); ga = m[2] ? parseInt(m[2], 10) : 0; art = "제" + jo + "조" + (ga ? "의" + ga : ""); }
    let name = s.replace(/[「」『』]/g, "").replace(/[,·]?\s*(제\s*\d+\s*조(?:\s*의\s*\d+)?|§\s*\d+).*$/, "").trim();
    return { raw: s, name: name || s, art, jo, ga };
  }
  function lawPublicUrl(p) { let u = "https://www.law.go.kr/법령/" + encodeURIComponent(p.name); if (p.art) u += "/" + encodeURIComponent(p.art); return u; }
  function lawCount(name) {   // 위반법령에 해당 법령명이 포함된 선례 수(캐시)
    if (!name || name.length < 2) return 0; const m = lawCount._m || (lawCount._m = {}); if (m[name] != null) return m[name];
    let n = 0; ALL.forEach(c => { const L = c.위반법령; const s = Array.isArray(L) ? L.join(" ") : String(L || ""); if (s.includes(name)) n++; });
    return m[name] = n; }
  function lawsHtml(list) {
    const rows = list.map((l, i) => { const p = lawParse(l);
      const icon = (_oc && p.jo) ? "📖" : "↗";
      const n = lawCount(p.name);
      return `<div class="lawrow"><span class="lawpill lawone" data-i="${i}" title="${esc(l)}">${esc(l)} <span class="lawact">${icon}</span></span>${n > 1 ? `<button class="lawfind" type="button" data-name="${esc(p.name)}" title="위반 법령에 「${esc(p.name)}」이 포함된 선례를 탐색에서 검색">선례 ${fmt(n)}건</button>` : ""}</div>`;
    }).join("");
    return `<div class="lawwrap">${rows}</div>`;   // 안내문 제거(2026-06-10 — 우측 패널 공간 확보·스크롤 최소화)
  }
  const M = {};
  function modalEls() { if (!M.box) M.box = { wrap: document.getElementById("lawModal"), t: document.getElementById("lawmTitle"), s: document.getElementById("lawmSrc"), b: document.getElementById("lawmBody"), eff: document.getElementById("lawmEff"), ext: document.getElementById("lawmExt") }; return M.box; }
  function closeLawModal() { const e = modalEls(); if (e.wrap) e.wrap.classList.remove("on"); }
  function normDate(s) { const m = String(s || "").match(/(\d{4})\D*(\d{1,2})?\D*(\d{1,2})?/); return m ? (m[1] + String(m[2] || "1").padStart(2, "0") + String(m[3] || "1").padStart(2, "0")) : ""; }
  // 조문 가독성: 법령 표기 기준대로 항(①②③)·호(1.2.) 줄바꿈 + 조 제목(제N조(제목)) 볼드 (국가법령정보센터 수준)
  function fmtLaw(t) {
    let h = esc(t || "");
    // 호(N.) 앞 줄바꿈 — 1~2자리 숫자+마침표 뒤 한글/「/따옴표 (날짜·제N항·점수 등은 제외)
    h = h.replace(/(\d{1,2})\.\s*(?=[가-힣「“"])/g, "\n$1. ");
    // 항(①~⑳) 앞 줄바꿈(빈 줄)
    h = h.replace(/\s*([①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯⑰⑱⑲⑳])\s*/g, "\n\n$1 ");
    // 조 제목 볼드: 제N조(의N)(제목)
    h = h.replace(/(제\d+조(?:의\d+)?\s*\([^)]*\))/g, "<b>$1</b>");
    return h.replace(/^\s+/, "").replace(/\n{3,}/g, "\n\n");
  }
  async function openLawModal(p, date) {
    const e = modalEls();
    e.t.textContent = `${p.name} ${p.art}`; e.s.textContent = "법제처 국가법령정보 OpenAPI";
    e.ext.href = lawPublicUrl(p); e.eff.textContent = "";
    e.b.innerHTML = `<div class="lawspin">법제처에서 ${esc(p.art)} 조회 중…</div>`;
    e.wrap.classList.add("on");
    try {
      const r = await window.api.law.article({ name: p.name, jo: p.jo, ga: p.ga, date: normDate(date) });
      if (r && r.ok && r.text) {
        e.t.textContent = `${(r.law && r.law.title) || p.name} ${p.art}`;
        e.s.textContent = "법제처 국가법령정보 OpenAPI" + (r.source && r.source !== "법령" ? " · " + r.source : "") + (r.pointInTime ? " (당시 시행본)" : "");
        e.b.innerHTML = fmtLaw(r.text);
        e.eff.textContent = r.effectiveAt ? "시행 " + String(r.effectiveAt) : "";
      } else {
        const et = r && r.errorType; let msg;
        if (et === "deleted") msg = "현행 법령에서 <b>삭제·이동된 조문</b>입니다(행위 당시엔 존재). 아래 ‘국가법령정보센터에서 보기’의 연혁에서 확인하세요.";
        else if (et === "absent") msg = "법제처(법령·행정규칙·자치법규)에서 찾지 못했습니다. <b>정관·내규 등 비공개 규정</b>일 수 있어 원문(화성시·해당 기관)에서 확인하세요.";
        else if (et === "auth") msg = "법제처 인증 실패 — ⚙️ 설정에서 OC를 확인하세요.";
        else if (et === "network") msg = "법제처 연결 실패 — 잠시 후 다시 시도하세요.";
        else if (et === "notfound") msg = `해당 조문을 찾지 못했습니다 (${esc((r.law && r.law.title) || p.name)}).`;
        else msg = `조문을 불러오지 못했습니다 (${esc((r && (r.error || r.errorType)) || "오류")}).`;
        e.s.textContent = "법제처 국가법령정보 OpenAPI" + (r && r.source && r.source !== "법령" ? " · " + r.source : "");
        e.b.innerHTML = `<div class="lawspin">${msg}<br>아래 ‘국가법령정보센터에서 보기’로 확인하세요.</div>`;
      }
    } catch (err) { e.b.innerHTML = `<div class="lawspin">조회 오류 — ‘국가법령정보센터에서 보기’로 확인하세요.</div>`; }
  }

  // ----- 화성시 원문열람(처분요구서 원문) -----
  const ORIG_BASE = "http://45.115.152.59/DATA/GG-HS-Gamsa/HWP/";   // 화성시 원문열람시스템(내부망 전용)
  function toast(msg) { let t = document.getElementById("__toast"); if (!t) { t = document.createElement("div"); t.id = "__toast"; t.className = "toast"; document.body.appendChild(t); } t.textContent = msg; t.classList.add("on"); clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove("on"), 3400); }
  function openBai(c) {
    try {
      const sl = (c && c.srcLinks && c.srcLinks.원문열람) || {};
      if (sl.id) { window.open(ORIG_BASE + sl.id + "." + String(sl.ext || "HWP").toUpperCase(), "_blank"); toast("원문열람시스템에서 원문을 엽니다 — 내부망(화성시청)에서만 접속됩니다"); return; }
      const nm = (c && c.제목) || ""; try { navigator.clipboard.writeText(nm); } catch (e) {} toast("‘" + nm.slice(0, 22) + "…’ 제목을 복사했습니다 — 원문열람시스템에서 검색하세요");
    } catch (e) {}
  }

  // ----- 플로우 스트립: 사건 구조 한 줄(행위자→대상→행위[동사칩]⇒결과·SOV) + 경과 타임라인 -----
  function flowStrip(c) {
    if (!flowOn()) return "";
    const g = c.구조;
    if (!g || !g.행위자 || !g.행위) return "";
    const chip = (t, cls) => `<span class="fs-n ${cls || ""}">${esc(t)}</span>`;
    const ar = `<span class="fs-a">→</span>`;
    // 3단계 술어병합(가안): 대상은 동사칩 안의 흐린 보조 표기 — "누가 → 무슨 짓 → 결과"로 한 번에 읽힘
    let line = chip(g.행위자, "fs-who");
    line += ar + `<span class="fs-n fs-verb">${g.대상 ? `<span class="fs-objin">${esc(g.대상)} · </span>` : ""}<b>${esc(g.행위)}</b></span>`;
    if (g.결과) line += `<span class="fs-a">⇒</span>` + chip(g.결과, "fs-res");
    const tl = (c.경과 && c.경과.length)
      ? `<div class="fs-tl">${c.경과.map(e => `<span class="fs-ev"><b>${esc(e.일자)}</b>${esc(e.사건)}</span>`).join(`<span class="fs-ta">→</span>`)}</div>` : "";
    return `<div class="flowstrip" role="group" aria-label="사건 구조 한눈에 보기">${line}${tl}</div>`;
  }

  // 결과 명사구 정규화(표시 시점) — 동사·연결 종결을 명사형으로 통일(데이터 무변경·표시만). 신규 카드는 이미 명사구, 구 카드 6%만 보정.
  function nominalizeResult(s) {
    s = String(s || "").trim();
    if (!s) return s;
    const rules = [[/하지\s*않(았다|아|고|음|은)?$/, "누락"], [/되지\s*않(았다|아|고|음)?$/, "미이행"],
      [/하였다$|하였음$|했다$|함$|하여$|하였(고|으며|으나)$/, ""], [/되었다$|되었음$|됨$|되어$|되고$/, ""], [/없이$/, ""]];
    for (const [p, r] of rules) { const t = s.replace(p, r); if (t !== s) { s = t; break; } }
    return s.replace(/(을|를)\s+/g, " ").replace(/\s+/g, " ").trim().replace(/[\s·]+$/, "");
  }
  // 목록 카드용 컴팩트 플로우 스트립(경과 제외) — "누가 → 무엇을 ⇒ 결과(명사구)". 요지를 대체(요지·경과는 상세에).
  function flowStripMini(c) {
    const g = c.구조;
    if (!g || !g.행위자 || !g.행위) return "";
    const res = nominalizeResult(g.결과);
    let s = `<span class="fm-who">${hl(g.행위자)}</span><span class="fm-a">→</span>`
      + `<span class="fm-act">${g.대상 ? `<span class="fm-obj">${hl(g.대상)} · </span>` : ""}${hl(g.행위)}</span>`;
    if (res) s += `<span class="fm-a">⇒</span><span class="fm-res">${hl(res)}</span>`;
    return `<div class="fs-mini" aria-label="사건 구조 한 줄">${s}</div>`;
  }

  // ----- 사례 상세(공용) -----
  function amtOf(c) { const A = c.금액; if (typeof A === "string") return A; if (A && typeof A === "object" && Object.keys(A).length) { const ks = Object.keys(A); return ks.every(k => /^\d+$/.test(k)) ? ks.sort((a, b) => a - b).map(k => A[k]).join("") : Object.entries(A).map(([k, v]) => `${k}: ${v}`).join(" · "); } return ""; }
  function caseHtml(c, opts) {
    opts = opts || {};
    ["위반법령", "위반유형", "분야", "착안점", "근거페이지"].forEach(k => { if (c[k] && !Array.isArray(c[k])) c[k] = [c[k]]; });   // 문자열→배열 정규화(크래시 방지)
    const [cls, txt] = dispClass(c.처분종류); const amt = amtOf(c); const kept = isKept(c.id); const isCsd = c.출처 === "csd";
    const wide = opts.modal ? "" : `<button class="widebtn js-wide" title="넓게 보기 (단축키: W)" aria-keyshortcuts="W">⤢</button>`;
    return `
      <div class="dt-top">
        <h3 class="dt-h">${esc(c.제목 || "(제목없음)")}</h3>
        <div class="ctools"><button class="keepbtn js-keep ${kept ? "on" : ""}" title="내 사례함에 담기 (단축키: S)" aria-keyshortcuts="S">${kept ? "★" : "☆"}</button>${wide}</div>
      </div>
      <div class="dt-m">${dispBadges(c)}${(c.위반유형 || []).filter(v => !String(v).startsWith("(")).map(v => `<span class="vt">${esc(v)}</span>`).join("")}${(c.소주제 || []).map(v => `<span class="subtag" title="세부 주제">${esc(v)}</span>`).join("")}${(c.dupN >= 3) ? `<span class="repmini" title="동일 유형 지적이 ${c.dupN}건 — 여러 기관에서 반복(구조적·제도개선 점검 신호)">🔁 반복 ${c.dupN}건</span>` : ""}<span class="yr">· ${c.연도 || ""} · ${esc(c.기관계열 || "")}</span></div>
      ${flowStrip(c)}
      ${(c.중점점검 && c.중점점검.length) ? `<div class="critbadge" title="정기감사로 잘 드러나지 않아 별도 확인이 필요한 유형 모음입니다. 징계 감경 제외(공무원 징계령 시행규칙 §4②)·징계시효 특례(국가공무원법 §83-2)에 해당할 수 있습니다. 법정 단일 정의는 없으며, 키워드로 식별한 확인 대상이므로 반드시 원문을 확인하세요.">🔎 중점 점검 비위 · ${c.중점점검.map(esc).join(" · ")} <span class="crit-q">확인 대상 · 원문 확인</span></div>` : ""}
      ${(c.형사연계 && c.형사연계.length) ? `<div class="crimebadge" title="감사기관이 수사기관에 고발·수사의뢰한 사건입니다. 주처분(징계·통보 등)과 별개로 부가될 수 있어 별도로 식별합니다. 처분 수위·범죄 성립 판단과는 무관하며 원문을 확인하세요.">⚖️ 형사 연계 · ${c.형사연계.map(esc).join(" · ")}</div>` : ""}
      ${c.요지 ? `<div class="dt-sec prime"><h4>요지 〈화성시 처분요구서 인용·발췌〉</h4><div class="body">${fmtBody(c.요지)}</div></div>` : ""}
      ${c.위반사실 ? `<div class="dt-sec prime"><h4>위반사실 〈발췌〉</h4><div class="body">${fmtBody(c.위반사실, c.핵심구)}</div></div>` : ""}
      ${c.원인 ? `<div class="dt-sec prime"><h4>원인 · 통제미비점</h4><div class="body">${fmtBody(c.원인)}</div></div>` : ""}
      <div class="dt-sec facts"><h4>출처 · 원문</h4>
        <div class="body" style="font-size:12px;color:var(--muted)">${esc(c.감사명 || "")}<br>공개일 ${c.공개일 || ""} · 감사종류 ${esc(c.감사종류 || "")}${c.종류추정 ? `<span class="infer" title="처분요구서와 확정 교차대조 전 — 추정 분류입니다(시청 누리집에 해당 감사 결과가 공개되지 않아 미확정).">˚추정</span>` : ""} · 순번 ${c.srno}${isCsd ? " · (CSD 원문·검색전용)" : ""}</div>
        <div class="docbtns"><button class="docbtn js-bai">🔎 원문 열람</button><button class="docbtn js-memo">📝 메모에 담기</button><button class="copybtn js-cite" style="margin-top:0">📋 인용 복사</button></div>
        <div style="font-size:11px;color:var(--muted);margin-top:7px">사례 길잡이는 ‘요지(참고)’ — 처분 결정 시 원문 확인</div></div>
      ${(c.위반법령 && c.위반법령.length) ? `<div class="dt-sec"><h4>위반 법령</h4>${lawsHtml(c.위반법령)}</div>` : ""}
      ${amt ? `<div class="dt-sec"><h4>금액</h4><div class="amt">${esc(amt)}</div></div>` : ""}
      ${(c.착안점 && c.착안점.length) ? `<div class="dt-sec"><h4>감사 착안점</h4>${c.착안점.map(a => `<div class="aki">${esc(a)}</div>`).join("")}</div>` : ""}
      ${c.적신호 ? `<div class="dt-sec redflag"><h4>🚩 적신호 — 이런 정황이면 점검할 지점</h4><div class="body">${fmtBody(neutralRedflag(c.적신호))}</div></div>` : ""}
      ${(typeof c.비지적 === "string" && c.비지적.trim().length > 8) ? `<div class="dt-sec nonflag"><h4>✅ 비지적 · 참고 〈처분요구서 발췌〉</h4><div class="body">${fmtBody(c.비지적)}</div></div>` : ""}
      ${(() => {   // 설계서 #3: 유사 선례(의미 유사·빌드타임 사전계산·런타임 LLM0). related.js 없으면 미표시(폴백).
        const rel = (window.RELATED && window.RELATED[c.id]) || [];
        if (!rel.length) return "";
        const rows = rel.map(r => { const x = ALL.find(k => k.id === r.id); if (!x) return ""; const [c2, t2] = dispClass(x.처분종류); return `<button class="relrow" type="button" data-rid="${x.id}" title="유사도 ${Math.round((r.score||0)*100)}%"><span class="relt">${esc(x.제목 || "(제목없음)")}</span><span class="reld disp ${c2}">${esc(t2)}</span><span class="rely">${x.연도 || ""}</span></button>`; }).filter(Boolean).join("");
        return rows ? `<div class="dt-sec related"><h4>🔗 유사 선례 <span class="muted" style="font-weight:400;font-size:11px">의미 유사 · 사전 분석</span></h4><div class="rell">${rows}</div></div>` : "";
      })()}
      ${(() => {   // 꼬리 계층(피로 S4): 근거페이지·같은 보고서·출처 → 접이(details) — 펼친 내부는 기존 구조 그대로
        const sib = ALL.filter(x => x.srno === c.srno && x.id !== c.id);
        const item = x => { const [c2, t2] = dispClass(x.처분종류); return `<button class="sditem" type="button" data-sid="${x.id}"><span class="sdt">${esc(x.제목 || "(제목없음)")}</span><span class="disp ${c2}">${esc(t2)}</span></button>`; };
        const pg = (c.근거페이지 && c.근거페이지.length) ? `<div class="dt-sec"><h4>근거 페이지</h4><div>${c.근거페이지.map(p => `<span class="pill pg">${esc(p)}</span>`).join("")}</div></div>` : "";
        const sd = sib.length ? `<div class="dt-sec samedoc"><h4>이 감사에서 함께 지적된 사항 <span class="sdn">${fmt(sib.length)}건 · 같은 보고서</span></h4><div class="sdl">${sib.slice(0, 5).map(item).join("")}${sib.length > 5 ? `<div class="sd-rest">${sib.slice(5).map(item).join("")}</div><button class="sditem more js-sd-more" type="button">▾ 더보기 (${fmt(sib.length - 5)}건)</button>` : ""}</div></div>` : "";
        const tail = (pg || sd) ? `<details class="dt-tail"><summary>근거 페이지${sib.length ? ` · 함께 지적된 사항 (${fmt(sib.length)})` : ""} ▾</summary>${pg}${sd}</details>` : "";
        return tail; })()}`;   // 출처·원문은 원인 밑으로 이동(상단). 꼬리=근거페이지·함께지적만
  }
  function wireCase(root, c) {
    const kb = root.querySelector(".js-keep"); if (kb) kb.onclick = () => { toggleKeep(c.id); const on = isKept(c.id); kb.classList.toggle("on", on); kb.textContent = on ? "★" : "☆"; };
    const wb = root.querySelector(".js-wide"); if (wb) wb.onclick = () => openCaseModal(c.id);
    root.querySelectorAll(".lawone").forEach(b => b.onclick = () => { const p = lawParse(c.위반법령[parseInt(b.dataset.i, 10)]); if (_oc && p.jo) openLawModal(p, c.공개일); else window.open(lawPublicUrl(p), "_blank"); });
    const bb = root.querySelector(".js-bai"); if (bb) bb.onclick = () => openBai(c);
    const mb = root.querySelector(".js-memo"); if (mb) mb.onclick = () => { try { window.Memo.addCase(c); } catch (e) {} };
    const cp = root.querySelector(".js-cite"); if (cp) cp.onclick = () => { const t = `${c.제목} (화성시 ${c.감사명}, 순번 ${c.srno}${(c.근거페이지 || []).length ? ", " + c.근거페이지.join("·") : ""})`; try { navigator.clipboard.writeText(t); } catch (e) {} cp.textContent = "✓ 복사됨"; setTimeout(() => cp.textContent = "📋 인용 복사", 1500); };
    const inModal = root.id === "caseModalBody";   // 같은 보고서 묶음 — 항목 클릭 시 같은 표면(패널/팝업)에서 이동
    root.querySelectorAll(".sditem[data-sid]").forEach(b => b.onclick = () => { const sid = b.dataset.sid; inModal ? openCaseModal(sid) : showDetail(sid); });
    root.querySelectorAll(".relrow[data-rid]").forEach(b => b.onclick = () => { const rid = b.dataset.rid; inModal ? openCaseModal(rid) : showDetail(rid); });   // #3 유사 선례 클릭 → 이동
    const sm = root.querySelector(".js-sd-more"); if (sm) sm.onclick = () => { const rest = root.querySelector(".sd-rest"); if (rest) rest.classList.add("open"); sm.remove(); };
    root.querySelectorAll(".lawfind").forEach(b => b.onclick = (e) => { e.stopPropagation(); const qi = document.getElementById("q"); F.q = b.dataset.name; if (qi) qi.value = F.q; closeCaseModal(); closeLawModal(); const tb = document.getElementById("tabDigest"); if (tb && !tb.classList.contains("on")) tb.click(); render(); });
  }
  function navList(delta) {   // 피로 S3: 목록 키보드 순회(↑↓·j/k) — 시선 고정한 채 연속 열람
    const cases = [...document.querySelectorAll("#list .case")]; if (!cases.length) return;
    let i = cases.findIndex(el => sel && el.dataset.id === String(sel.id));
    i = (i < 0) ? 0 : i + delta;
    if (i < 0 || i >= cases.length) return;
    showDetail(cases[i].dataset.id);
    try { cases[i].scrollIntoView({ block: "nearest" }); } catch (e) {}
  }
  // ----- 모바일 뒤로가기 연동: 시스템 back(갤럭시 내비·아이폰 엣지스와이프)이 페이지 이탈 대신 오버레이를 닫게 -----
  const OVST = [];
  function ovOpen(name, closeFn) {
    if (!IS_MOB()) return;
    OVST.push({ name, closeFn, closed: false });
    try { history.pushState({ ov: name }, ""); } catch (e) {}
  }
  function ovDone(name) {   // UI 버튼으로 닫을 때: 쌓아둔 히스토리 한 칸 소비(중복 닫기 방지 closed 플래그)
    for (let i = OVST.length - 1; i >= 0; i--) {
      if (OVST[i].name === name && !OVST[i].closed) { OVST[i].closed = true; try { history.back(); } catch (e) {} return; }
    }
  }
  window.addEventListener("popstate", () => {
    const e = OVST.pop();
    if (e && !e.closed) { e.closed = true; e.closeFn(); }
  });

  function closeMobDetail() { document.body.classList.remove("mob-detail"); ovDone("detail"); }
  function showDetail(id) {
    const c = ALL.find(x => x.id === id); if (!c) return; sel = c;
    clearTimeout(_hoverT); hideHover();   // 상세 열 때 호버 프리뷰 숨김(슬라이드오버와 겹침 방지)
    document.querySelectorAll("#list .case, #keepList .case").forEach(x => x.classList.toggle("on", x.dataset.id === id));
    const root = document.getElementById("detail");
    // 시선이 우측 상세에 있을 때 '현재 위치·이전/다음'을 상단(시선 자리)에 표시 — 좌측 선택표시 의존 해소(키보드 ↑↓ 연속 열람)
    const _cs = [...document.querySelectorAll("#list .case")];
    const _i = _cs.findIndex(el => el.dataset.id === id), _n = _cs.length;
    const _tt = s => { s = String(s || ""); return s.length > 16 ? s.slice(0, 16) + "…" : s; };
    const _pv = _i > 0 ? (ALL.find(x => x.id === _cs[_i - 1].dataset.id) || {}) : null;
    const _nx = (_i >= 0 && _i < _n - 1) ? (ALL.find(x => x.id === _cs[_i + 1].dataset.id) || {}) : null;
    const navBar = '<div class="mobback dtl-nav"><button type="button" id="mobBack">← 목록</button>'
      + '<div class="dtl-navc">'
      + `<button type="button" class="dtl-nv dtl-prev"${_pv ? "" : " disabled"} title="이전 사례 (↑/K)">↑ ${_pv ? esc(_tt(_pv.제목)) : "처음"}</button>`
      + `<span class="dtl-pos">${_i >= 0 ? (_i + 1) + " / " + fmt(_n) : ""}</span>`
      + `<button type="button" class="dtl-nv dtl-next"${_nx ? "" : " disabled"} title="다음 사례 (↓/J)">${_nx ? esc(_tt(_nx.제목)) : "마지막"} ↓</button>`
      + '</div></div>';
    root.innerHTML = navBar + '<div class="casebody">' + caseHtml(c, { modal: false }) + '</div>';
    root.onclick = e => { if (e.target === root) closeMobDetail(); };   // 패널 여백(콘텐츠 밖) 클릭만 닫기 — 네비 버튼 보호
    wireCase(root, c);
    const mb = root.querySelector("#mobBack"); if (mb) mb.onclick = closeMobDetail;
    const pb = root.querySelector(".dtl-prev"); if (pb) pb.onclick = () => navList(-1);
    const nb = root.querySelector(".dtl-next"); if (nb) nb.onclick = () => navList(1);
    if (!document.getElementById("dtlScrim")) { const sc = document.createElement("div"); sc.id = "dtlScrim"; sc.className = "dtl-scrim"; sc.onclick = closeMobDetail; document.body.appendChild(sc); }   // 데스크톱 슬라이드오버 배경 클릭 → 닫기
    if (!document.body.classList.contains("mob-detail")) {
      document.body.classList.add("mob-detail");   // 상세 열기: 모바일=전체화면·데스크톱=우측 슬라이드오버(P1 2영역)
      ovOpen("detail", () => document.body.classList.remove("mob-detail"));   // ovOpen은 모바일에서만 history 푸시(데스크톱 무동작)
    }
    root.scrollTop = 0;                          // 새 사례 선택 시 상세 처음부터 보이게
  }
  function openCaseModal(id) {
    const c = ALL.find(x => x.id === id); if (!c) return; sel = c;
    document.getElementById("caseModalTag").textContent = `사례 상세 · ${c.연도 || ""} · ${esc(c.기관계열 || "")}`;
    const body = document.getElementById("caseModalBody");
    body.innerHTML = '<div class="casebody">' + caseHtml(c, { modal: true }) + '</div>';
    wireCase(body, c);
    const wasOn = document.getElementById("caseModal").classList.contains("on");
    document.getElementById("caseModal").classList.add("on");
    if (!wasOn) ovOpen("cmodal", () => document.getElementById("caseModal").classList.remove("on"));
    body.scrollTop = 0;                          // 표시 후 최상단(+rAF로 레이아웃 후 재확정)
    requestAnimationFrame(() => { body.scrollTop = 0; });
  }
  function closeCaseModal() { document.getElementById("caseModal").classList.remove("on"); ovDone("cmodal"); }

  // ----- 목록 카드 -----
  function hl(s) {   // 검색어 하이라이트(esc 후 <mark>) — 검색 중일 때만
    s = esc(s); if (!F.q || !QP) return s;
    const toks = [...QP.ph, ...QP.inc].filter(t => t.length >= 2).sort((a, b) => b.length - a.length).slice(0, 6);
    toks.forEach(t => { try { s = s.replace(new RegExp(t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi"), m => `<mark class="qmark">${m}</mark>`); } catch (e) {} });
    return s; }
  function caseCardHtml(c) { const [cls, txt] = dispClass(c.처분종류);
    return `<div class="case" data-id="${c.id}"><button class="keepstar js-star ${isKept(c.id) ? "on" : ""}" data-keep="${c.id}" title="내 사례함에 담기 (단축키: S)" aria-keyshortcuts="S">${isKept(c.id) ? "★" : "☆"}</button><div class="ct">${hl(c.제목 || "(제목없음)")}</div>${(flowOn() && c.구조 && c.구조.행위자 && c.구조.행위) ? flowStripMini(c) : `<div class="cs">${hl(IS_MOB() ? firstSentence(c.요지 || "") : (c.요지 || ""))}</div>`}<div class="cm">${dispBadges(c)}${(c.위반유형 || []).slice(0, 2).map(v => `<span class="vt">${esc(v)}</span>`).join("")}${(c.소주제 || []).slice(0, 2).map(v => `<span class="subtag">${esc(v)}</span>`).join("")}${(c.중점점검 && c.중점점검.length) ? `<span class="critmini" title="중점 점검 비위 · 확인 대상 · 원문 확인">🔎 ${esc(c.중점점검[0])}${c.중점점검.length > 1 ? " 외" : ""}</span>` : ""}${(c.형사연계 && c.형사연계.length) ? `<span class="crimemini" title="형사 연계 · 감사기관 고발·수사의뢰 · 원문 확인">⚖️ ${esc(c.형사연계[0])}</span>` : ""}${(c.dupN >= 3) ? `<span class="repmini" title="동일 유형 지적이 ${c.dupN}건 — 여러 기관에서 반복(구조적·제도개선 점검 신호)">🔁 반복 ${c.dupN}</span>` : ""}<span class="yr">· ${c.연도 || ""} · ${esc(c.기관계열 || "")}</span></div></div>`; }
  function wireCards(container, onOpen) {
    container.querySelectorAll(".case").forEach(el => el.onclick = () => onOpen(el.dataset.id));
    container.querySelectorAll(".js-star").forEach(b => b.onclick = e => { e.stopPropagation(); const id = b.dataset.keep; toggleKeep(id); const on = isKept(id); b.classList.toggle("on", on); b.textContent = on ? "★" : "☆"; });
    wireHoverPreview(container);
  }

  // ----- 호버 프리뷰: 목록 카드 위 마우스 → 제목~출처원문 미리보기(데스크톱 전용·클릭=전체 상세) -----
  function casePreviewHtml(c) {
    const [cls, txt] = dispClass(c.처분종류);
    const sec = (lab, body, clamp) => body ? `<div class="cp-sec"><div class="cp-h">${lab}</div><div class="cp-b${clamp ? " clamp" : ""}">${body}</div></div>` : "";
    return `<div class="cp-t">${esc(c.제목 || "(제목없음)")}</div>
      <div class="cp-m">${dispBadges(c)}${(c.위반유형 || []).filter(v => !String(v).startsWith("(")).slice(0, 2).map(v => `<span class="vt">${esc(v)}</span>`).join("")}<span class="yr">· ${c.연도 || ""} · ${esc(c.기관계열 || "")}</span></div>
      ${flowStrip(c)}
      ${sec("요지", fmtBody(c.요지), true)}
      ${sec("위반사실", fmtBody(c.위반사실, c.핵심구), true)}
      ${sec("원인 · 통제미비점", fmtBody(c.원인), true)}
      <div class="cp-src">${esc(c.감사명 || "")} · 공개일 ${c.공개일 || ""} · 순번 ${c.srno}</div>
      <div class="cp-foot">클릭하면 전체 상세 ↗</div>`;
  }
  let _hoverEl = null, _scrimEl = null, _hoverT = null, _lastWheel = 0, _mx = 0, _my = 0;
  function hoverEl() { if (!_hoverEl) { _hoverEl = document.createElement("div"); _hoverEl.id = "caseHover"; _hoverEl.className = "case-hover"; document.body.appendChild(_hoverEl); } return _hoverEl; }
  function scrimEl() { if (!_scrimEl) { _scrimEl = document.createElement("div"); _scrimEl.id = "hoverScrim"; _scrimEl.className = "hover-scrim"; document.body.appendChild(_scrimEl); } return _scrimEl; }
  function showScrim() { if (!IS_MOB()) scrimEl().classList.add("on"); }   // 배경 딤+블러로 프리뷰 대비 강화
  function hideHover() { if (_hoverEl) _hoverEl.classList.remove("on"); if (_scrimEl) _scrimEl.classList.remove("on"); }
  function showHover(card) {
    const c = ALL.find(x => x.id === card.dataset.id); if (!c) return;
    const el = hoverEl(); el.innerHTML = casePreviewHtml(c);
    const r = card.getBoundingClientRect(), W = 470, M = 18;
    // 커서 바로 옆에 띄움(시선 이동 최소화) — 오른쪽 우선, 공간 없으면 커서 왼쪽으로 플립
    let left = _mx + M; if (left + W > window.innerWidth - 12) left = _mx - W - M; if (left < 8) left = 8;
    el.style.left = left + "px"; el.style.top = "0px"; el.classList.add("on");
    requestAnimationFrame(() => { const h = el.offsetHeight; const top = (_my || r.top) - 28; el.style.top = Math.max(64, Math.min(top, window.innerHeight - h - 12)) + "px"; });
  }
  function wireHoverPreview(container) {
    if (!container || container._hoverWired) return; container._hoverWired = 1;
    container.addEventListener("wheel", () => { _lastWheel = Date.now(); clearTimeout(_hoverT); hideHover(); }, { passive: true });   // 스크롤(휠) 중엔 호버 미표시 — 스캔은 마우스 이동으로
    container.addEventListener("mousemove", e => { _mx = e.clientX; _my = e.clientY; }, { passive: true });   // 커서 추적 → 프리뷰를 행 바로 옆에 띄움
    container.addEventListener("mouseover", e => {
      if (IS_MOB() || document.body.classList.contains("mob-detail")) return;
      if (!hoverPreviewOn()) return;   // 미리보기 끔 → 목록만 탐색(딤·팝업 없음)
      if (Date.now() - _lastWheel < 280) return;   // 방금 스크롤 → 마우스 다시 움직일 때까지 미표시
      const card = e.target.closest(".case"); if (!card || !container.contains(card)) return;
      _mx = e.clientX; _my = e.clientY;
      showScrim(); clearTimeout(_hoverT); _hoverT = setTimeout(() => { if (Date.now() - _lastWheel < 280) return; showHover(card); }, 300);
    });
    container.addEventListener("mouseout", e => {
      if (e.relatedTarget && container.contains(e.relatedTarget)) return;   // 목록 내 카드 간 이동 = 유지(플리커 방지)
      clearTimeout(_hoverT); hideHover();
    });
    container.addEventListener("mouseleave", () => { clearTimeout(_hoverT); hideHover(); });
  }

  // ----- 분야 그리드 + 위반유형 -----
  const FLDORDER = ["계약·용역", "공사·시설", "재정·회계", "보조금·기금", "세무·징수", "인사·채용", "복지·보건", "민원·행정", "환경·안전", "교통", "도시·개발", "경제·산업", "문화·교육", "일반행정·자치"];   // 화성 14분야(행정·재정/기술·시설/대민·복지/조직·인사)
  function fitFieldNames() {   // 분야 카드명 — 한 줄 유지하며 최대 폰트(긴 이름은 자동 축소). 탭 숨김(폭 0) 시 건너뜀
    document.querySelectorAll("#fldGrid .fldbtn .fn").forEach(el => {
      if (!el.clientWidth) return;
      let s = 14; el.style.fontSize = s + "px";
      while (s > 9.5 && el.scrollWidth > el.clientWidth) { s -= 0.5; el.style.fontSize = s + "px"; }
    });
  }
  function buildFieldGrid() {
    const cnt = {}; NZ.forEach(c => (c.분야 || []).forEach(f => { if (!String(f).startsWith("(")) cnt[f] = (cnt[f] || 0) + 1; }));
    const flds = FLDORDER.filter(f => cnt[f]);
    const grid = document.getElementById("fldGrid");
    const avgF = (Object.values(cnt).reduce((a, b) => a + b, 0) / Math.max(NZ.length, 1)).toFixed(1);
    grid.innerHTML = `<div class="fldbtn allf${F.fld ? "" : " on"}" role="button" tabindex="0" data-f="" title="※ 한 사례가 평균 ${avgF}개 분야에 속합니다 — 분야 숫자는 관련 사례 수(중복 포함)"><span class="fn">전체 사례</span><span class="fc">${fmt(NZ.length)}</span></div>` +
      flds.map(f => `<div class="fldbtn" role="button" tabindex="0" data-f="${esc(f)}"><span class="fn">${esc(f)}</span><span class="fc"><span class="fcrel">관련 </span>${fmt(cnt[f])}</span></div>`).join("");
    grid.querySelectorAll(".fldbtn").forEach(b => b.onclick = () => { const f = b.dataset.f || null; F.fld = (F.fld === f) ? null : f; F.viol = null; render(); });
    fitFieldNames();
    if (!window.__fnFitBound) { window.__fnFitBound = true; window.addEventListener("resize", () => { clearTimeout(window.__fnFitT); window.__fnFitT = setTimeout(fitFieldNames, 150); }); }
  }
  function renderViolSub() {
    const sub = document.getElementById("violSub");
    if (!F.fld) { sub.classList.remove("on"); return; }
    const vf = facet("위반유형", NZ.filter(c => (c.분야 || []).includes(F.fld)));
    document.getElementById("violSubH").textContent = `${F.fld} · 위반유형`;
    document.getElementById("violChips").innerHTML = vf.map(([k, v]) => `<span class="vchip${F.viol === k ? " on" : ""}" role="button" tabindex="0" aria-pressed="${F.viol === k ? "true" : "false"}" data-v="${esc(k)}">${esc(k)}<b>${v}</b></span>`).join("");
    document.querySelectorAll("#violChips .vchip").forEach(ch => ch.onclick = () => { F.viol = F.viol === ch.dataset.v ? null : ch.dataset.v; render(); });
    sub.classList.add("on");
  }

  // ----- 연도 슬라이더 -----
  let MINY, MAXY;
  function buildYearSlider() {
    const ys = NZ.map(c => parseInt(c.연도, 10)).filter(Boolean);
    MINY = Math.min(...ys); MAXY = Math.max(...ys); F.yrFrom = MINY; F.yrTo = MAXY;
    const box = document.getElementById("yrRange");
    box.innerHTML = `<div class="rtrack"></div><div class="rfill" id="yrFill"></div><input type="range" id="yrLo" min="${MINY}" max="${MAXY}" value="${MINY}" step="1"><input type="range" id="yrHi" min="${MINY}" max="${MAXY}" value="${MAXY}" step="1">`;
    const lo = document.getElementById("yrLo"), hi = document.getElementById("yrHi");
    function upd() {
      let a = parseInt(lo.value, 10), b = parseInt(hi.value, 10);
      if (a > b) { if (this === lo) { b = a; hi.value = b; } else { a = b; lo.value = a; } }
      F.yrFrom = a; F.yrTo = b;
      const span = MAXY - MINY || 1, fill = document.getElementById("yrFill");
      fill.style.left = ((a - MINY) / span * 100) + "%"; fill.style.width = ((b - a) / span * 100) + "%";
      document.getElementById("yrLabel").textContent = (a === MINY && b === MAXY) ? "전체 연도" : (a === b ? a + "년" : a + "–" + b);
      render();
    }
    lo.oninput = upd; hi.oninput = upd; upd.call(hi);
  }

  function chips(elid, key, fk, limit) {
    const el = document.getElementById(elid);
    el.innerHTML = facet(key).slice(0, limit || 99).map(([k, v]) => `<span class="fchip" role="button" tabindex="0" aria-pressed="false" data-k="${esc(k)}">${esc(k)}<b>${v}</b></span>`).join("");
    el.querySelectorAll(".fchip").forEach(ch => ch.onclick = () => { F[fk] = F[fk] === ch.dataset.k ? null : ch.dataset.k; render(); });
  }
  function syncChips(elid, val) { document.querySelectorAll("#" + elid + " .fchip").forEach(ch => { const on = ch.dataset.k === val; ch.classList.toggle("on", on); ch.setAttribute("aria-pressed", on ? "true" : "false"); }); }

  // ----- 주제·표식 통합 팝오버(중점점검 · 형사연계 · 세부주제) -----
  const PICK_GROUPS = [
    { dim: "crit", cls: "crit", icon: "🔎", label: "중점 점검 비위", fk: "중점점검" },
    { dim: "crime", cls: "crime", icon: "⚖️", label: "형사 연계", fk: "형사연계" },
    { dim: "sub", cls: "", icon: "", label: "세부 주제", fk: "소주제" },
  ];
  function buildPicker() {
    const body = document.getElementById("pickBody"); if (!body) return;
    body.innerHTML = PICK_GROUPS.map(g => {
      const items = facet(g.fk, NZ); if (!items.length) return "";
      const chips = items.map(([k, v]) => `<span class="pchip ${g.cls}" role="button" tabindex="0" aria-pressed="false" data-dim="${g.dim}" data-k="${esc(k)}" title="${esc(k)} — 전체 ${v}건${g.dim === "sub" ? " (여러 분야 합산 · 분야 펼침의 분야 내 건수와 다를 수 있음)" : ""}">${esc(k)}<b>${v}</b></span>`).join("");
      return `<div class="pgrp"><div class="pgh ${g.cls}">${g.icon ? g.icon + " " : ""}${g.label}</div><div class="pchips${g.dim === "sub" ? " pgsub" : ""}">${chips}</div></div>`;
    }).join("");
    body.querySelectorAll(".pchip").forEach(ch => ch.onclick = () => { const d = ch.dataset.dim; F[d] = (F[d] === ch.dataset.k) ? null : ch.dataset.k; render(); });
  }
  function syncPicker() {
    document.querySelectorAll("#pickBody .pchip").forEach(ch => { const on = F[ch.dataset.dim] === ch.dataset.k; ch.classList.toggle("on", on); ch.setAttribute("aria-pressed", on ? "true" : "false"); });
    const n = [F.crit, F.crime, F.sub].filter(Boolean).length;
    const lab = document.getElementById("pickLabel"); if (lab) lab.textContent = n ? `주제·표식 ${n}개 선택` : "＋ 주제·표식으로 거르기";
    const btn = document.getElementById("pickBtn"); if (btn) btn.classList.toggle("on", n > 0);
  }
  function _pickClose() { const p = document.getElementById("pickPop"); if (p) p.hidden = true; }
  function _pickFilter(q) {
    q = (q || "").trim().toLowerCase();
    document.querySelectorAll("#pickBody .pchip").forEach(ch => { ch.style.display = (!q || ch.dataset.k.toLowerCase().includes(q)) ? "" : "none"; });
    document.querySelectorAll("#pickBody .pgrp").forEach(g => { const any = [...g.querySelectorAll(".pchip")].some(c => c.style.display !== "none"); g.style.display = any ? "" : "none"; });
  }
  function _pickOpen() {
    const p = document.getElementById("pickPop"), b = document.getElementById("pickBtn"); if (!p || !b) return;
    const r = b.getBoundingClientRect();
    p.style.top = (r.bottom + 6) + "px";
    p.style.left = Math.max(8, Math.min(r.left, window.innerWidth - 496)) + "px";
    p.hidden = false; _pickFilter(""); const H = p.offsetHeight, below = window.innerHeight - r.bottom - 8; if (H > below) p.style.top = (r.top - 8 >= H ? r.top - 6 - H : 8) + "px";
    const s = document.getElementById("pickSearch"); if (s) { s.value = ""; _pickFilter(""); setTimeout(() => s.focus(), 0); }
  }
  function wirePicker() {
    const btn = document.getElementById("pickBtn"), pop = document.getElementById("pickPop"), s = document.getElementById("pickSearch");
    if (!btn || !pop || btn._wired) return; btn._wired = true;
    btn.onclick = (e) => { e.stopPropagation(); if (pop.hidden) _pickOpen(); else _pickClose(); };
    pop.onclick = (e) => e.stopPropagation();
    if (s) s.oninput = (e) => _pickFilter(e.target.value);
    document.addEventListener("click", () => { if (!pop.hidden) _pickClose(); });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !pop.hidden) _pickClose(); });
    const lc = document.querySelector("#view-digest .left"); if (lc) lc.addEventListener("scroll", () => { if (!pop.hidden) _pickClose(); });
  }

  let SORT = "new";   // 목록 정렬: new=공개일 최신순(기본)·old=오래된순·abc=가나다·rand=무작위(로드 시 셔플 순서)
  let LAST_RES = [], LAST_CRUMB = "";   // 점검표·CSV(A⑦) — 현재 필터 결과 스냅샷
  // ----- 점검표 생성(A⑦·B안 재설계 2026-06-10): 세부주제 묶음(사실 집계) × 묶음별 최신 선례 착안점 -----
  // 빈도 완전일치 방식 폐기 사유: 착안점 10,142개 중 2회 이상 반복 19개뿐 — 상위는 상투구('관련자 주의촉구'=한 보고서 18카드 중복)만 떠오름.
  function _chkBoiler(a) { return a.length < 14 || (/(촉구|통보|병행|재발 방지|요구사항)$/.test(a) && a.length < 26); }   // 처분·맥락 메모(점검 항목 아님) 제외
  function openChecklist(extList, extLabel) {   // 2026-06-13 재설계: 분석>착안점 찾기 진입('사례로 점검하기')·메모/내사례함 연동
    const res = (extList && extList.length) ? extList : LAST_RES; if (!res.length) return;
    const grp = new Map();   // 소주제 → {n, cards[]}
    res.forEach(c => (c.소주제 || []).forEach(s0 => { const g = grp.get(s0) || { n: 0, cards: [] }; g.n++; g.cards.push(c); grp.set(s0, g); }));
    const groups = [...grp.entries()].sort((a, b) => b[1].n - a[1].n).slice(0, 12);
    const rows = [];
    groups.forEach(([sub0, g]) => {
      const seen = new Set(), seenT = new Set(), pool = [];
      g.cards.slice().sort((a, b) => pubKey(b) - pubKey(a)).forEach(c => {
        if (seen.has(c.srno)) return;
        const a = (c.착안점 || []).map(x => String(x).replace(/\s+/g, " ").trim()).find(x => x && !_chkBoiler(x));
        if (a && !seenT.has(a)) { pool.push({ a, yr: c.연도 || "", id: c.id }); seen.add(c.srno); seenT.add(a); }
      });
      if (!pool.length) return;
      // 고착화 방지: 기본 4 = 최신 2 + 무작위 2(열 때마다 교체) · 나머지는 ▾ 더보기
      const head = pool.slice(0, 2), rnd = pool.slice(2);
      for (let i = rnd.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); const t = rnd[i]; rnd[i] = rnd[j]; rnd[j] = t; }
      rows.push({ sub: sub0, n: g.n, picked: head.concat(rnd.slice(0, 2)), more: rnd.slice(2) });
    });
    let m = document.getElementById("chkModal");
    if (!m) { m = document.createElement("div"); m.id = "chkModal"; m.className = "chkmodal"; document.body.appendChild(m); }
    const scope = `${extLabel || LAST_CRUMB || "전체"} · ${fmt(res.length)}건`;
    const itemHtml = p => `<div class="chk-i" data-id="${p.id}"><input type="checkbox"><span class="chk-t">${esc(p.a)}</span><em>${esc(p.yr)}</em><button class="chk-star${isKept(p.id) ? " on" : ""}" type="button" title="이 착안점의 사례를 내 사례함에 담기">${isKept(p.id) ? "★" : "☆"}</button><button class="chk-go" type="button" title="사례 상세 보기">↗</button></div>`;
    m.innerHTML = `<div class="chk-card"><div class="chk-h"><b>📋 사례로 점검하기</b><span class="chk-sub">${esc(scope)}</span><button class="chk-x" type="button" title="닫기">✕</button></div>
      <div class="chk-body">${rows.map(r => `<div class="chk-grp"><div class="chk-g"><span class="chk-gt">${esc(r.sub)}</span><em>선례 ${fmt(r.n)}건</em></div>${r.picked.map(itemHtml).join("")}${r.more.length ? `<div class="chk-more" hidden>${r.more.map(itemHtml).join("")}</div><button class="chk-mb" type="button">▾ 더보기 (${fmt(r.more.length)})</button>` : ""}</div>`).join("") || '<div class="muted" style="padding:8px 2px;font-size:12.5px">이 결과에는 세부주제·착안점 정보가 부족합니다 — 필터를 넓히거나 주제를 지정해 보세요.</div>'}</div>
      <div class="chk-f"><button id="chkMemo" type="button" disabled>📝 메모에 담기</button><span class="chk-src">☑ 체크 → 메모에 담기 · ★ 내 사례함 · ↗ 상세 · 건수=사실 집계</span></div></div>`;
    if (!m.classList.contains("on")) ovOpen("chk", () => m.classList.remove("on"));
    m.classList.add("on");
    m.querySelectorAll(".chk-mb").forEach(b => b.onclick = () => { const more = b.previousElementSibling; if (more) more.hidden = false; b.remove(); });
    // 체크 = '메모로 가져갈 항목 선택' · ★ = 내 사례함 · ↗ = 상세 (복사·저장·인쇄는 2026-06-13 제거 — 앱 문법과 이질적)
    const checkedRows = () => [...m.querySelectorAll(".chk-i")].filter(it =>
      it.querySelector("input").checked && !(it.closest(".chk-more") && it.closest(".chk-more").hidden));
    const mbtn = m.querySelector("#chkMemo");
    const syncBtns = () => { const n = checkedRows().length; mbtn.disabled = !n; mbtn.textContent = n ? `📝 메모에 담기 (${n})` : "📝 메모에 담기"; };
    m.onchange = (e) => { if (e.target && e.target.matches(".chk-i input")) { syncBtns(); const gw = e.target.closest(".chk-grp"); if (e.target.checked && gw) gw.classList.add("haspick"); } };
    m.onclick = (e) => {   // onclick 단일 할당(innerHTML 재생성 시 리스너 중복 방지) — 바깥 클릭 닫기 + 행 위임
      if (e.target === m) { m.classList.remove("on"); ovDone("chk"); return; }
      const star = e.target.closest(".chk-star");
      if (star) { const id = star.closest(".chk-i").dataset.id; toggleKeep(id); const on = isKept(id); star.classList.toggle("on", on); star.textContent = on ? "★" : "☆"; return; }
      const go = e.target.closest(".chk-go");
      if (go) { const id = go.closest(".chk-i").dataset.id; m.classList.remove("on"); ovDone("chk"); openCaseModal(id); return; }
      const t = e.target.closest(".chk-t");
      if (t) { const inp = t.parentElement.querySelector("input"); inp.checked = !inp.checked; inp.dispatchEvent(new Event("change", { bubbles: true })); }
    };
    mbtn.onclick = () => {
      const items = checkedRows(); if (!items.length || !window.Memo || !Memo.add) return;
      const parts = [`[사례 점검 · ${scope}]`];
      items.forEach(it => parts.push(`□ ${it.querySelector(".chk-t").textContent} (${it.querySelector("em").textContent})`));
      Memo.open(); Memo.add(parts.join("\n"));
      m.classList.remove("on"); ovDone("chk");
      toast(`점검 항목 ${items.length}건을 메모에 담았습니다`);
    };
    m.querySelector(".chk-x").onclick = () => { m.classList.remove("on"); ovDone("chk"); };
  }
  window.__openChecklist = openChecklist;   // 분석>착안점 찾기('사례로 점검하기')에서 호출

  // 현황(6하원칙) 클릭 → 탐색 딥링크: 필터 주입 후 탭 전환 (연계 재설계 2026-06-13)
  window.gotoDigest = function (o) {
    o = o || {};
    F.gye = o.gye || null; F.disp = o.disp || null; F.knd = o.knd || null; F.fld = o.fld || null; F.viol = o.viol || null;
    F.sub = null; F.crit = null; F.crime = null; F.q = "";
    const qEl = document.getElementById("q"); if (qEl) qEl.value = "";
    const lo = document.getElementById("yrLo"), hi = document.getElementById("yrHi");
    if (lo && hi) { lo.value = (o.yrFrom != null ? o.yrFrom : MINY); hi.value = (o.yrTo != null ? o.yrTo : MAXY); if (hi.oninput) hi.oninput(); }
    F.yrFrom = (o.yrFrom != null ? o.yrFrom : MINY); F.yrTo = (o.yrTo != null ? o.yrTo : MAXY);
    render();
    const tb = document.getElementById("tabDigest"); if (tb) tb.click();
  };
  const IS_MOB = () => window.matchMedia("(max-width:768px)").matches;   // 모바일 P1 분기
  function firstSentence(s) { s = String(s || "").trim(); const m = s.match(/^[\s\S]{5,}?[.!?…](?=\s|$)/); return m ? m[0] : (s.length > 90 ? s.slice(0, 90) + "…" : s); }   // 요약 B안: 첫 문장만(문장 단위 컷)
  // ----- 검색식: 본문 포함 확장 검색 + 연산자("구절"=정확 구절 · -단어=제외 · 공백=AND) -----
  let QP = null;   // 파싱된 검색식 캐시(F.q 기준)
  function hayOf(c) { if (c._hay == null) { const law = Array.isArray(c.위반법령) ? c.위반법령.join(" ") : (c.위반법령 || ""); c._hay = [c.제목, c.요지, c.위반사실, (c.착안점 || []).join(" "), c.적신호, (c.소주제 || []).join(" "), law, c.감사명].map(x => x || "").join(" ").toLowerCase(); c._hay2 = c._hay.replace(/\s+/g, ""); } return c._hay; }
  function parseQuery(q) { const inc = [], exc = [], ph = []; const re = /"([^"]+)"|(\S+)/g; let m; while ((m = re.exec(q))) { if (m[1]) ph.push(m[1].toLowerCase()); else { const t = m[2]; if (t.length > 1 && t[0] === "-") exc.push(t.slice(1).toLowerCase()); else inc.push(t.toLowerCase()); } } return { src: q, inc, exc, ph }; }
  // 공백 무시 보조 매칭: "수의 계약"·"수의계약" 표기 차이를 흡수(원 매칭 우선·보조는 무공백끼리 비교)
  const hit = (c, hay, t) => hay.includes(t) || (t.length > 2 && c._hay2.includes(t.replace(/\s+/g, "")));
  // 설계서 #1: 동의어/표기 정규화 — 질의 토큰을 동의어군으로 확장(런타임 LLM0·해시 룩업). 사전(norm_dict.js) 없으면 원토큰만(폴백).
  function expandTok(t) {
    const D = window.NORM_DICT; if (!D || !D.lookup) return [t];
    const id = D.lookup[t.replace(/\s+/g, "")]; if (!id) return [t];
    const g = (D._byId || (D._byId = Object.fromEntries(D.synonyms.map(s => [s.id, s]))))[id]; if (!g) return [t];
    return [...new Set([t, g.canon.toLowerCase(), ...g.variants.map(v => v.toLowerCase())])];
  }
  function qMatch(c, p) { const hay = hayOf(c); return p.ph.every(t => hit(c, hay, t)) && p.inc.every(t => expandTok(t).some(x => hit(c, hay, x))) && !p.exc.some(t => expandTok(t).some(x => hit(c, hay, x))); }
  function pubKey(c) { const m = String(c.공개일 || "").match(/(\d{4})\D*(\d{1,2})?/); if (m) return (+m[1]) * 100 + (+(m[2] || 6)); const y = parseInt(c.연도, 10); return y ? y * 100 + 6 : 0; }
  function match(c) {
    if (F.gye && c.기관계열 !== F.gye) return false;
    if (F.disp && !dispListOf(c).includes(F.disp)) return false;   // 복수 처분 중 하나라도 일치하면 통과(처분요구 기준)
    if (F.knd && c.감사종류 !== F.knd) return false;
    if (F.fld && !(c.분야 || []).includes(F.fld)) return false;
    if (F.viol && !(c.위반유형 || []).includes(F.viol)) return false;
    if (F.sub && !(c.소주제 || []).includes(F.sub)) return false;
    if (F.crit && !(c.중점점검 || []).includes(F.crit)) return false;
    if (F.crime && !(c.형사연계 || []).includes(F.crime)) return false;
    if (F.yrFrom != null && c.연도) { const y = parseInt(c.연도, 10); if (y < F.yrFrom || y > F.yrTo) return false; }
    if (F.q) { if (!QP || QP.src !== F.q) QP = parseQuery(F.q); if (!qMatch(c, QP)) return false; }   // 확장 hay(위반사실·착안점·적신호·소주제 포함)+연산자 검색
    return true;
  }
  let _listN = 200;   // 목록 표시 개수(더 불러오기로 200씩 증가)
  function paintList(res) {   // 목록 렌더 + '더 불러오기' 버튼(누를 때만 200건씩 추가·스크롤 연장)
    const box = document.getElementById("list");
    const shown = res.slice(0, _listN);
    let foot = "";
    if (res.length > _listN) {
      const more = Math.min(200, res.length - _listN);
      foot = `<div class="lm-wrap"><button class="loadmore" type="button">＋ ${fmt(more)}건 더 불러오기</button><div class="lm-sub">${fmt(shown.length)} / ${fmt(res.length)}건 표시</div></div>`;
    } else if (res.length > 200) {
      foot = `<div class="lm-sub lm-done">전체 ${fmt(res.length)}건 표시</div>`;
    }
    box.innerHTML = shown.map(caseCardHtml).join("") + foot;
    wireCards(box, showDetail);
    const lm = box.querySelector(".loadmore");
    if (lm) lm.onclick = () => { _listN += 200; paintList(res); };   // 누르는 경우에만 더 노출(스크롤 연장)
  }
  function render() {
    document.querySelectorAll("#fldGrid .fldbtn").forEach(b => { const on = (b.dataset.f || null) === F.fld; b.classList.toggle("on", on); b.setAttribute("aria-pressed", on ? "true" : "false"); });
    renderViolSub();
    syncChips("f_gye", F.gye); syncChips("f_disp", F.disp); syncChips("f_knd", F.knd);
    syncPicker();
    const cr = [];
    if (F.fld) cr.push(["fld", F.fld]); if (F.viol) cr.push(["viol", F.viol]);
    if (F.sub) cr.push(["sub", F.sub]);
    if (F.crit) cr.push(["crit", "🔎 " + F.crit]);
    if (F.crime) cr.push(["crime", "⚖️ " + F.crime]);
    ["gye", "knd", "disp"].forEach(k => { if (F[k]) cr.push([k, F[k]]); });
    if (F.yrFrom != null && !(F.yrFrom === MINY && F.yrTo === MAXY)) cr.push(["yr", F.yrFrom === F.yrTo ? F.yrFrom + "" : F.yrFrom + "–" + F.yrTo]);
    const crEl = document.getElementById("crumbs");
    crEl.innerHTML = cr.map(([k, v]) => `<span class="crumb" role="button" tabindex="0" aria-label="${esc(v)} 필터 제거" data-ck="${k}">${esc(v)}</span>`).join("");
    crEl.querySelectorAll(".crumb").forEach(c => c.onclick = () => {
      const k = c.dataset.ck;
      if (k === "fld") { F.fld = null; F.viol = null; } else if (k === "yr") { F.yrFrom = MINY; F.yrTo = MAXY; const lo = document.getElementById("yrLo"), hi = document.getElementById("yrHi"); lo.value = MINY; hi.value = MAXY; hi.oninput(); return; } else F[k] = null;
      render();
    });
    document.getElementById("clear").style.display = (cr.length || F.q) ? "inline" : "none";
    const res = ALL.filter(match);
    if (SORT === "new") res.sort((a, b) => pubKey(b) - pubKey(a));
    else if (SORT === "old") res.sort((a, b) => pubKey(a) - pubKey(b));
    else if (SORT === "abc") res.sort((a, b) => (a.제목 || "").localeCompare(b.제목 || "", "ko"));
    // rand: 로드 시 셔플된 원 배열 순서 유지(무작위 탐색)
    document.getElementById("nres").textContent = fmt(res.length);
    LAST_RES = res; LAST_CRUMB = cr.map(x => x[1]).join(" · ") + (F.q ? (cr.length ? " · " : "") + "“" + F.q + "”" : "");   // 점검표·CSV(A⑦)용 현재 결과 스냅샷
    _listN = 200;   // 새 필터/정렬 → 다시 상위 200건부터
    const box = document.getElementById("list");
    if (!res.length) {   // 0건 빈 상태 — 적용 조건 요약 + 해제 + 검색 팁
      box.innerHTML = `<div class="zerocase"><b>조건에 맞는 사례가 없습니다.</b>
        <div class="zc-f">${cr.length ? "적용 중 — " + cr.map(x => esc(x[1])).join(" · ") : ""}${F.q ? (cr.length ? " · " : "") + "검색어 “" + esc(F.q) + "”" : ""}</div>
        <div class="zc-h">검색 팁 — 공백=모두 포함 · "따옴표"=정확 구절 · -단어=제외 (제목·요지·위반사실·착안점·적신호·법령 탐색)</div>
        <button class="zc-clear" type="button">전체 해제</button></div>`;
      const zb = box.querySelector(".zc-clear"); if (zb) zb.onclick = () => document.getElementById("clear").onclick();
      wireCards(box, showDetail);
    } else {
      paintList(res);
    }
  }

  function refreshDetail() {   // 볼드 설정 변경 등 → 현재 상세/팝업 다시 그림
    if (!sel) return;
    if (document.getElementById("detail").querySelector(".casebody")) showDetail(sel.id);
    if (document.getElementById("caseModal").classList.contains("on")) openCaseModal(sel.id);
  }

  function init() {
    const nzDocs = new Set(NZ.map(c => c.srno)).size, csd = ALL.length - NZ.length;
    const bdg = document.getElementById("badge");
    bdg.innerHTML = `화성 사례 <b>${fmt(NZ.length)}</b> · ${fmt(nzDocs)}건`;
    const lastDt = NZ.reduce((m, c) => (c.공개일 || "") > m ? c.공개일 : m, "");   // 데이터 신선도 고지
    if (lastDt) bdg.title = `화성시 자체감사 처분요구서 기준 — 최신 ${lastDt} 까지 수록`;
    buildFieldGrid();
    chips("f_gye", "기관계열", "gye", 5); chips("f_knd", "감사종류", "knd", 7); chips("f_disp", "처분종류", "disp", 9);
    buildPicker(); wirePicker();
    buildYearSlider();
    document.getElementById("q").oninput = e => { F.q = e.target.value.trim(); render(); };
    { const ss = document.getElementById("sortSel"); if (ss) { ss.value = SORT; ss.onchange = () => { SORT = ss.value; render(); }; } }
    { const cb = document.getElementById("chkBtn"); if (cb) cb.onclick = openChecklist; }   // A⑦ 점검표 (CSV는 2026-06-11 사용자 지시로 제외)
    { const fb = document.getElementById("fltBtn"), lc = document.querySelector("#view-digest .col.left");   // 모바일 필터 바텀시트
      if (fb && lc) { let dim = null;
        const close = () => { lc.classList.remove("open"); if (dim) { dim.remove(); dim = null; } ovDone("filter"); };
        fb.onclick = () => { if (lc.classList.contains("open")) return close(); lc.classList.add("open"); dim = document.createElement("div"); dim.className = "fltdim"; dim.onclick = close; document.body.appendChild(dim); ovOpen("filter", close); }; } }
    try { window.matchMedia("(max-width:768px)").addEventListener("change", () => { document.body.classList.remove("mob-detail"); render(); }); } catch (e) {}   // 모바일↔데스크톱 전환 시 요약 모드 갱신
    document.getElementById("clear").onclick = () => { F = { gye: null, disp: null, knd: null, fld: null, viol: null, sub: null, crit: null, crime: null, yrFrom: MINY, yrTo: MAXY, q: "" }; document.getElementById("q").value = ""; const lo = document.getElementById("yrLo"); if (lo) { lo.value = MINY; document.getElementById("yrHi").value = MAXY; document.getElementById("yrHi").oninput(); } else render(); };
    document.getElementById("lawmClose").onclick = closeLawModal;
    document.getElementById("lawModal").addEventListener("click", e => { if (e.target.id === "lawModal") closeLawModal(); });
    document.getElementById("caseModalClose").onclick = closeCaseModal;
    document.getElementById("caseModal").addEventListener("click", e => { if (e.target.id === "caseModal") closeCaseModal(); });
    document.addEventListener("keydown", e => { if (e.key === "Escape") { closeLawModal(); closeCaseModal(); } });
    updateKeepCount(); renderKeepList();
    render();
  }
  // ----- 단축키(S=담기 · W=넓게보기/닫기)용 공개 헬퍼 -----
  function getSelId() { return sel ? sel.id : null; }
  function isModalOpen() { return document.getElementById("caseModal").classList.contains("on"); }
  function openCaseModalSel() { if (!sel) return false; openCaseModal(sel.id); return true; }
  function toggleKeepSel() {
    if (!sel) return null;                       // 선택 사례 없음 → 호출부에서 안내
    toggleKeep(sel.id);                          // onKeepChange가 #keepCount·내 사례함 목록 자동 갱신
    const on = isKept(sel.id);
    // 현재 떠 있는 상세·모달·목록 카드의 ★만 경량 갱신(전체 재렌더 X → 모달 스크롤 위치 보존)
    let starSel;
    try { starSel = `.js-star[data-keep="${(window.CSS && CSS.escape) ? CSS.escape(sel.id) : sel.id}"]`; } catch (e) { starSel = ""; }
    document.querySelectorAll("#detail .js-keep, #caseModalBody .js-keep" + (starSel ? ", " + starSel : ""))
      .forEach(b => { b.classList.toggle("on", on); b.textContent = on ? "★" : "☆"; });
    return on;
  }
  return { init, setOC, showDetail, openCaseModal, renderKeepList, updateKeepCount, refreshDetail, navList,
    toast, closeCaseModal, getSelId, isModalOpen, openCaseModalSel, toggleKeepSel,
    isKept, toggleKeep, ovOpen, ovDone, fitFieldNames };   // 적발 관계망(graphView) 연동용 노출(2026-06-13) · fitFieldNames=탭 전환 시 분야명 1줄 재적합
})();
