"use strict";
/* 분석 뷰 — ① 현황(데이터 보드) / ② 착안점 찾기(입력·드릴).
   window.CARDS 단일 소스 · 런타임 LLM 0 · 빌드타임 집계만(공공누리). */
window.Dashboard = (function () {
  const C = (window.CARDS || []).filter(c => c.출처 !== "csd");
  const fmt = n => n.toLocaleString("ko-KR");
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>]/g, m => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[m])); }
  function neutralRedflag(s) {   // 적신호 명령형 말미 → "점검 대상"(중립·표시만)
    s = String(s == null ? "" : s);
    const tail = "\\s*하(?:라|십시오|세요|자|아야\\s*한다|해야\\s*한다)(?=[.。\\s]|$)";
    s = s.replace(new RegExp("([가-힣A-Za-z0-9·)\\]]+)(?:을|를)\\s*(?:의심|점검|확인|검토|대조|유의|주의)" + tail, "g"), "$1 점검 대상");
    return s.replace(new RegExp("(?:의심|점검|확인|검토|대조|유의|주의)" + tail, "g"), "점검 대상");
  }
  function dispClass(d) { d = Array.isArray(d) ? (d[0] || "") : (d || "");
    if (/문책|징계/.test(d)) return ["mun", d]; if (/통보/.test(d)) return ["tong", d];
    if (/변상/.test(d)) return ["bs", d]; if (/주의/.test(d)) return ["ju", d]; if (/고발|수사/.test(d)) return ["mun", d]; return ["etc", d || "(처분미상)"]; }
  const dispOf = c => { let d = c.처분종류; return Array.isArray(d) ? (d[0] || "") : (d || ""); };
  const dispListOf = c => { let d = c.처분종류; return Array.isArray(d) ? d.filter(Boolean) : (d ? [d] : []); };   // 복수 처분 모두(처분요구 기준 집계)
  const HARD = d => { d = Array.isArray(d) ? (d[0] || "") : (d || ""); return /문책|징계|고발|수사|변상판정\(유책\)/.test(d); };
  function facet(key) { const m = {}; C.forEach(c => { let v = c[key]; (Array.isArray(v) ? v : [v]).forEach(x => { if (x && !String(x).startsWith("(")) m[x] = (m[x] || 0) + 1; }); });
    return Object.fromEntries(Object.entries(m).sort((a, b) => b[1] - a[1])); }

  const FLD = ["계약·용역", "공사·시설", "재정·회계", "보조금·기금", "세무·징수", "인사·채용", "복지·보건", "민원·행정", "환경·안전", "교통", "도시·개발", "경제·산업", "문화·교육", "일반행정·자치"];   // 화성 14분야
  const YV = ["검사·감독", "제도·후속", "재정·세입", "계약·조달", "인허가·개발", "인사·복무", "청렴·행위", "건설·시설", "문서", "보조금·연구비", "손해·변상"];   // 위반유형 통제어휘 11종 전체(빈도순·기타 제외)
  const DORD = [["주의요구", "ju"], ["시정요구", "si"], ["개선요구", "gae"], ["권고", "gw"], ["통보", "tong"], ["기관주의", "ju"], ["기관경고", "mun"], ["징계요구", "mun"], ["문책요구", "mun"], ["변상명령", "bs"], ["고발", "go"], ["수사의뢰", "go"]];
  const GYE3 = ["읍·면·동", "본청·사업소", "출자·출연기관"];

  // 처분 6분류(현황 100% 누적 표시용)
  const DGRP = [["통보", "tong"], ["주의", "ju"], ["시정", "si"], ["징계·문책", "mun"], ["변상", "bs"], ["기타", "etc"]];   // P2: 경중순 — 행정상(통보·주의·시정) → 엄중(문책·변상) → 기타(색=경중 그룹화)
  function dgrp(d) { d = Array.isArray(d) ? (d[0] || "") : (d || ""); if (/문책|징계|고발|수사/.test(d)) return "징계·문책"; if (/변상/.test(d)) return "변상"; if (/주의/.test(d)) return "주의"; if (/통보/.test(d)) return "통보"; if (/시정|개선|권고/.test(d)) return "시정"; return "기타"; }
  function stack100(sub) {
    const cc = {}; sub.forEach(c => dispListOf(c).forEach(d => { const g = dgrp(d); cc[g] = (cc[g] || 0) + 1; }));
    const tot = sub.length || 1; let segs = "", leg = "";
    DGRP.forEach(([name, cls]) => { if (cc[name]) { const p = cc[name] / tot * 100; segs += `<span class="seg-${cls}" style="width:${p}%" title="${name} ${cc[name]} (${Math.round(p)}%)">${p >= 11 ? Math.round(p) + "%" : ""}</span>`; leg += `<span><i class="seg-${cls}"></i>${name} ${cc[name]}</span>`; } });
    return { segs, leg, cc, tot };
  }

  const N = C.length;
  const baseViol = {}; C.forEach(c => (c.위반유형 || []).forEach(v => { if (!String(v).startsWith("(")) baseViol[v] = (baseViol[v] || 0) + 1; }));
  function profile(gye) {
    const sub = C.filter(c => c.기관계열 === gye); const sn = sub.length || 1;
    const cnt = {}; sub.forEach(c => (c.위반유형 || []).forEach(v => { if (!String(v).startsWith("(")) cnt[v] = (cnt[v] || 0) + 1; }));
    return Object.entries(cnt).filter(([, n]) => n >= 8).map(([v, n]) => ({ v, n, lift: (n / sn) / ((baseViol[v] || 1) / N) })).sort((a, b) => b.lift - a.lift).slice(0, 6);
  }
  function coOccur(viol) {
    const sub = C.filter(c => (c.위반유형 || []).includes(viol)); const sn = sub.length || 1;
    const cnt = {}; sub.forEach(c => (c.위반유형 || []).forEach(w => { if (w !== viol && !String(w).startsWith("(")) cnt[w] = (cnt[w] || 0) + 1; }));
    return Object.entries(cnt).filter(([, n]) => n >= 5).map(([w, n]) => ({ w, n, lift: (n / sn) / ((baseViol[w] || 1) / N) })).filter(x => x.lift >= 1.15).sort((a, b) => b.lift - a.lift).slice(0, 5);
  }

  // ===== 드릴(우측 패널·능동 탭) =====
  let _cbrAll = [], _cbrShown = 40, _cbrQ = "";   // 착안점 더보기: 전체 관련사례·현재 표시수·질의
  let _lastDrill = null;                            // '사례로 점검하기' 스코프용 — 마지막 드릴 목록
  const DRILL_CAP = 120;                            // 드릴 패널 표시 상한(그 이상은 탐색 탭)
  function caseCard(c) { const [cls, txt] = dispClass(c.처분종류);
    return `<div class="dcase" data-id="${c.id}" title="클릭 → 사례 상세 팝업"><div class="ct">${esc(c.제목 || "(제목없음)")}<span class="arr">상세 ⤢</span></div><div class="cm"><span class="disp ${cls}">${esc(txt)}</span><span class="yr">${c.연도 || ""}</span>${(c.위반유형 || []).slice(0, 1).map(v => `<span class="yr">${esc(v)}</span>`).join("")}</div></div>`;
  }
  function drill(title, list, opts) {
    _lastDrill = { title, list };
    document.getElementById("drillttl").textContent = title;
    { const _di = document.getElementById("drillInfo"); if (_di) _di.hidden = true; }   // 관련도순 ⓘ는 착안점 검색(drillCbr)에서만 노출
    { const _db = document.getElementById("drillBack"); if (_db) _db.hidden = !_cbrQ; }   // 착안점 검색 중이면 '검색결과로' 복귀 버튼 노출
    { const _dc = document.getElementById("drillClear"); if (_dc) _dc.style.display = ""; }   // 드릴 표시되면 비우기 버튼 노출
    const shownN = opts ? Math.min(opts.shown, DRILL_CAP) : Math.min(list.length, DRILL_CAP);
    document.getElementById("drillcnt").textContent = (opts && opts.total > shownN) ? `${fmt(shownN)} / ${fmt(opts.total)}건` : `${fmt(list.length)}건`;
    const box = document.getElementById("casebox");
    if (!list.length) { box.innerHTML = '<div class="empty2">해당 사례가 없습니다.</div>'; return; }
    let foot = "";
    if (opts) {
      const cap = Math.min(opts.total, DRILL_CAP);
      const canMore = opts.shown < cap;
      const beyond = opts.total - Math.min(opts.shown, DRILL_CAP);
      if (opts.shown > 40) foot += `<div class="cbr-moreline">↓ 관련도 낮은 사례 포함</div>`;
      if (canMore) foot += `<button class="cbr-more" type="button">더 보기 <span>관련도 낮은 사례 +${Math.min(40, cap - opts.shown)}</span></button>`;
      else if (beyond > 0) foot += `<div class="dcase muted" style="text-align:center;font-size:11.5px">…외 ${fmt(beyond)}건 (탐색 탭에서 전체)</div>`;
    } else if (list.length > DRILL_CAP) {
      foot = `<div class="dcase muted" style="text-align:center;font-size:11.5px">…외 ${fmt(list.length - DRILL_CAP)}건 (탐색 탭에서 전체)</div>`;
    }
    box.innerHTML = list.slice(0, shownN).map(caseCard).join("") + foot;
    box.querySelectorAll(".dcase[data-id]").forEach(el => el.onclick = () => { if (window.__openCase) window.__openCase(el.dataset.id); });
    const mb = box.querySelector(".cbr-more"); if (mb) mb.onclick = cbrMore;
  }
  function drillCbr() { drill(`착안점 검색 · "${_cbrQ.slice(0, 14)}"`, _cbrAll, { shown: _cbrShown, total: _cbrAll.length }); const _di = document.getElementById("drillInfo"); if (_di) _di.hidden = false; const _db = document.getElementById("drillBack"); if (_db) _db.hidden = true; }
  function cbrMore() { _cbrShown = Math.min(_cbrShown + 40, _cbrAll.length, DRILL_CAP); drillCbr(); }
  function drillTo(title, list) { showPane("active"); drill(title, list); }   // 현황 차트 클릭 → 능동으로 drill-through
  function clearDrill(full) {   // 비우기=관련사례만 비움(검색 보존·복귀 가능) / full=착안점 검색까지 완전 초기화(↺ 처음으로)
    document.getElementById("drillttl").textContent = "관련 사례";
    document.getElementById("drillcnt").textContent = "클릭 대기";
    document.getElementById("casebox").innerHTML = '<div class="empty2">왼쪽에서 입력·막대를 클릭하면<br>해당 실제 사례가 여기 나열됩니다.</div>';
    if (full === true) { _cbrAll = []; _cbrShown = 40; _cbrQ = ""; }
    const _dc = document.getElementById("drillClear"); if (_dc) _dc.style.display = "none";
    const _di = document.getElementById("drillInfo"); if (_di) _di.hidden = true;
    const _db = document.getElementById("drillBack"); if (_db) _db.hidden = !_cbrQ;   // 검색이 남아 있으면 복귀 버튼 유지
  }

  // ===== 현황 데이터 보드 (중립 집계·언어그래픽·빈칸채움) =====
  function ctxSubset(ctx) { if (ctx === "전체") return C; if (GYE3.includes(ctx)) return C.filter(c => c.기관계열 === ctx); return C.filter(c => (c.분야 || []).includes(ctx)); }
  function yearRow(sub) {   // 연도별 건수 — 최근부터 '연속 밀집(연 50건+)' 연도는 개별 행, 그 이전만 ~YYYY 묶음(데이터 확장 시 자동 펼침)
    const yc = {}; sub.forEach(c => { const y = parseInt(c.연도, 10); if (y >= 2000 && y <= 2030) yc[y] = (yc[y] || 0) + 1; });   // 유효연도만
    const ys = Object.keys(yc).map(Number).sort((a, b) => a - b);
    if (!ys.length) return '<div class="muted" style="font-size:12px">표본 없음</div>';
    const last = ys[ys.length - 1];
    let cut = last;
    for (let y = last; y >= ys[0]; y--) { if ((yc[y] || 0) >= 50) cut = y; else break; }
    if (last - cut < 4) cut = Math.max(ys[0], last - 4);   // 교차 표본이 작을 땐 최근 5개 연도는 항상 개별(기존 동작 보존)
    const cols = [];
    const pre = ys.filter(y => y < cut).reduce((a, y) => a + yc[y], 0);
    if (pre) cols.push(["~" + (cut - 1), pre]);
    for (let y = cut; y <= last; y++) cols.push([String(y), yc[y] || 0]);
    cols.reverse();   // 최근연도가 위로
    const max = Math.max(...cols.map(c => c[1]), 1);
    return `<div class="yrbars2${cols.length > 7 ? " two" : ""}">` + cols.map(([lab, n]) => `<div class="vbar" data-yr="${lab}" title="${lab.startsWith("~") ? lab + " — 표본이 적은 과거 연도 합산" : lab} ${fmt(n)}건"><div class="vbl">${lab}</div><div class="vtrack"><i style="width:${Math.round(n / max * 100)}%"></i></div><div class="vbv">${fmt(n)}</div></div>`).join("") + `</div>`;   // 8행 이상이면 2열 분할(좌=최근·우=과거)
  }
  let _gye = "전체", _fld = "전체";   // 관점 2축: 기관계열 × 분야(각자 독립·교차)
  function ctxSubset2() { return C.filter(c => (_gye === "전체" || c.기관계열 === _gye) && (_fld === "전체" || (c.분야 || []).includes(_fld))); }
  function ctxLabel() { const a = []; if (_gye !== "전체") a.push(_gye); if (_fld !== "전체") a.push(_fld); return a.length ? a.join(" · ") : "전체"; }
  function renderBoard() {   // 6하원칙: 누가(whoBox) · 언제(yearBox) · 무엇을(violSel→yang)
    const sub = ctxSubset2();
    const all = (_gye === "전체" && _fld === "전체");
    // ── 누가: 처분 분포 — 기관계열별 ──
    let dispBlock;
    if (_gye === "전체") {   // 3계열 비교(선택 분야 내) + 엄중(문책+변상)
      dispBlock = GYE3.map(g => {
        const ss = C.filter(c => c.기관계열 === g && (_fld === "전체" || (c.분야 || []).includes(_fld)));
        if (!ss.length) return `<div class="gyerow"><div class="gyel">${g} <span class="muted">0</span></div><div class="stack" style="opacity:.35"></div><div class="gyeem"></div></div>`;
        const s = stack100(ss); const em = Math.round(((s.cc["징계·문책"] || 0) + (s.cc["변상"] || 0)) / s.tot * 100);
        return `<div class="gyerow" data-gye="${g}"><div class="gyel">${g} <span class="muted">${fmt(ss.length)}</span></div><div class="stack">${s.segs}</div><div class="gyeem" title="문책+변상 비율">엄중 ${em}%</div></div>`;
      }).join("") + `<div class="leg">${stack100(sub).leg}</div>`;
    } else {   // 특정 기관 → 교차 부분집합 단일 분포
      const s = stack100(sub);
      dispBlock = sub.length ? `<div class="gyerow"><div class="gyel">${esc(ctxLabel())} <span class="muted">${fmt(sub.length)}</span></div><div class="stack">${s.segs}</div><div class="gyeem" title="문책+변상 비율">엄중 ${Math.round(((s.cc["징계·문책"] || 0) + (s.cc["변상"] || 0)) / s.tot * 100)}%</div></div><div class="leg">${s.leg}</div>` : '<div class="muted" style="font-size:12px">표본 없음</div>';
    }
    const guard = (!all && sub.length > 0 && sub.length < 25) ? `<div class="board-guard"><svg class="ic" aria-hidden="true"><use href="#ic-alert-triangle"></use></svg> 「${esc(ctxLabel())}」 교차 표본 <b>${fmt(sub.length)}</b>건 — 적어 참고용입니다. <b class="bg-drill" data-drill-cross>개별 사례 보기 →</b></div>` : "";
    const whoBox = document.getElementById("whoBox");
    whoBox.innerHTML = guard + dispBlock;
    whoBox.querySelectorAll("[data-gye]").forEach(el => el.onclick = () => window.gotoDigest({ gye: el.dataset.gye, fld: _fld !== "전체" ? _fld : null }));   // 누가 → 탐색(연계 재설계 2026-06-13)
    const dcx = whoBox.querySelector("[data-drill-cross]"); if (dcx) dcx.onclick = () => window.gotoDigest({ gye: _gye !== "전체" ? _gye : null, fld: _fld !== "전체" ? _fld : null });
    // ── 언제: 연도별 ──
    document.getElementById("yearBox").innerHTML = yearRow(sub);
    document.querySelectorAll("#yearBox [data-yr]").forEach(el => el.onclick = () => {   // 언제 → 탐색 연도 필터(연계 재설계 2026-06-13)
      const lab = el.dataset.yr, ctx = { gye: _gye !== "전체" ? _gye : null, fld: _fld !== "전체" ? _fld : null };
      if (lab.startsWith("~")) window.gotoDigest(Object.assign(ctx, { yrTo: parseInt(lab.slice(1), 10) }));
      else window.gotoDigest(Object.assign(ctx, { yrFrom: parseInt(lab, 10), yrTo: parseInt(lab, 10) }));
    });
    // ── 반복: 다발 반복 지적 Top(현재 범위) ──
    renderRepeat(sub);
    // ── 무엇을 → 어떻게: 위반유형 건수 선택자(master-detail) ──
    renderViolSel(sub);
  }
  function renderRepeat(sub) {   // 동일 제목(dupGid) 묶음 Top — 여러 기관 반복 = 구조적 신호. 클릭 → 그 묶음 사례
    const box = document.getElementById("repBox"); if (!box) return;
    const m = {};
    sub.forEach(c => { const g = c.dupGid; if (!g) return; if (!m[g]) m[g] = { n: 0, t: c.제목, g }; m[g].n++; });
    // 내용상 '사실상 동일'한 묶음 병합(일반 규칙) — 라벨이 달라도 핵심 토큰이 겹치면 합산하고 다음 distinct를 끌어올림
    const STOP = new Set(["및", "등", "또는", "관련", "그", "외", "건", "에", "대한", "위한", "따른"]);
    const tokset = t => new Set(String(t || "").replace(/\([^)]*\)/g, " ").split(/[\s·,]+/).filter(w => w.length >= 2 && !STOP.has(w)));
    const simil = (a, b) => { let i = 0; a.forEach(x => { if (b.has(x)) i++; }); const u = new Set([...a, ...b]).size || 1, j = i / u, mn = Math.min(a.size, b.size) || 1; return j >= 0.6 || (i / mn >= 0.85 && i >= 3 && j >= 0.5); };
    const merged = []; Object.values(m).filter(x => x.n >= 5).sort((a, b) => b.n - a.n).forEach(c => { const tk = tokset(c.t); let h = null; for (let k = 0; k < merged.length; k++) { if (simil(tk, merged[k]._tk)) { h = merged[k]; break; } } if (h) { h.n += c.n; h.gids.push(c.g); } else merged.push({ n: c.n, t: c.t, g: c.g, gids: [c.g], _tk: tk }); });
    const top = merged.sort((a, b) => b.n - a.n).slice(0, 12);
    if (!top.length) { box.innerHTML = '<div class="muted" style="font-size:12px;padding:8px">반복 5건 이상 지적이 없습니다(현재 범위).</div>'; return; }
    const max = top[0].n;
    box.innerHTML = top.map(x => `<div class="reprow" data-gid="${esc(x.gids.join(","))}" role="button" tabindex="0" title="${esc(x.t)} · ${x.n}건${x.gids.length > 1 ? " (유사 묶음 " + x.gids.length + "종 합산)" : ""} — 클릭 → 사례"><div class="repl">${esc(x.t.length > 34 ? x.t.slice(0, 34) + "…" : x.t)}</div><div class="reptrack"><i style="width:${Math.round(x.n / max * 100)}%"></i></div><div class="repv">${x.n}건</div></div>`).join("");
    box.querySelectorAll(".reprow").forEach(el => el.onclick = () => { const gids = (el.dataset.gid || "").split(",").filter(Boolean); const list = sub.filter(c => gids.includes(c.dupGid)); drillTo("반복 · " + (list[0] ? (list[0].제목.length > 16 ? list[0].제목.slice(0, 16) + "…" : list[0].제목) : ""), list); });
  }
  function renderViolSel(sub) {   // 위반유형 건수 막대 = 선택자(클릭 → 그 유형 처분 분포)
    const sel = document.getElementById("violSel");
    const STD = ["계약·조달", "검사·감독", "재정·세입", "보조금·연구비", "인사·복무", "청렴·행위", "인허가·개발", "건설·시설", "문서", "손해·변상", "제도·후속"];   // 통제어휘 11
    const vclamp = v => { v = String(v); if (STD.includes(v)) return v; const p = STD.find(s => v.startsWith(s)); if (p) return p; const h = STD.find(s => s.split("·").includes(v)); if (h) return h; return "기타"; };   // 비표준(반쪽·다중결합·이탈)→표준/기타 합산(목록 11+기타=12·2열 짝수)
    const cnt = {}; sub.forEach(c => (c.위반유형 || []).forEach(v => { if (!String(v).startsWith("(")) { const k = vclamp(v); cnt[k] = (cnt[k] || 0) + 1; } }));
    const arr = Object.entries(cnt).sort((a, b) => b[1] - a[1]);
    if (!arr.length) { sel.innerHTML = '<div class="muted" style="font-size:12px;padding:6px">표본 없음</div>'; document.getElementById("yangbox").innerHTML = '<div class="muted" style="font-size:12px;padding:8px">표본 없음</div>'; return; }
    const max = arr[0][1];
    sel.innerHTML = arr.map(([v, n], i) => `<div class="vbar${i === 0 ? " sel" : ""}" data-viol="${esc(v)}" role="button" tabindex="0" title="${esc(v)} ${fmt(n)}건 — 클릭 → 처분 분포"><div class="vbl">${esc(v)}</div><div class="vtrack"><i style="width:${Math.round(n / max * 100)}%"></i></div><div class="vbv">${fmt(n)}</div></div>`).join("");
    sel.querySelectorAll(".vbar").forEach(el => el.onclick = () => { sel.querySelectorAll(".vbar").forEach(x => x.classList.remove("sel")); el.classList.add("sel"); renderYang(el.dataset.viol, sub); });
    renderYang(arr[0][0], sub);
  }

  // ===== 능동: 기관계열 특화 위반유형(lift·임계강조) =====
  function renderProfile(gye) {
    const list = profile(gye), max = Math.max(...list.map(x => x.lift), 2.1);
    const box = document.getElementById("profBox");
    if (!list.length) { box.innerHTML = '<div class="muted" style="font-size:12.5px;padding:8px">표본 부족 — 특이 위반 없음.</div>'; return; }
    box.innerHTML = `<div class="liftnote">강조 — 각 계열 <b>1순위(최다 배수)</b> · 전체 평균 <b>1.8배 이상</b></div>` + list.map((x, i) => { const hot = x.lift >= 1.8 || i === 0;   // 1순위(i=0·배수 내림차순 최상위)는 배수와 무관하게 강조
      return `<div class="bar${hot ? " hot" : ""}" data-pf="${esc(x.v)}" data-pg="${esc(gye)}" title="${esc(x.v)} — 전체 평균의 ${x.lift.toFixed(1)}배 (${fmt(x.n)}건)${i === 0 ? " · 이 계열 1순위" : ""}"><div class="bl">${esc(x.v)}</div><div class="track"><i style="width:${Math.min(100, x.lift / max * 100)}%"></i></div><div class="bv"><b>${x.lift.toFixed(1)}배</b> · ${fmt(x.n)}건</div></div>`; }).join("");
    box.querySelectorAll("[data-pf]").forEach(b => b.onclick = () => { const v = b.dataset.pf, g = b.dataset.pg; drill(`${g} · ${v}`, C.filter(c => c.기관계열 === g && (c.위반유형 || []).includes(v))); });
  }

  // ===== 능동: 반론·검증(악마의 대변인) — 반대선례 검색·집계형(런타임 LLM 0) =====
  const MIT_KW = /면책|시효|참작|불가피|경미|선의|무과실|자진시정|중대한\s*과실\s*없|해당하지\s*않|책임[^.]{0,6}없|손해[^.]{0,6}없/;
  function isLight(c) { return /주의|통보|시정|개선|권고/.test(dispOf(c)); }
  let _rebutMit = [], _rebutViol = "";   // 면책·참작 선례 캐시(…외 N건 클릭 → 우측 관련 사례 드릴)
  function renderRebut(viol, topCases) {
    const sub = C.filter(c => (c.위반유형 || []).includes(viol)); const Nv = sub.length; if (!Nv) return "";
    const heavy = sub.filter(c => HARD(c.처분종류)).length, light = sub.filter(isLight).length;
    const hP = Math.round(heavy / Nv * 100), lP = Math.round(light / Nv * 100);
    const mit = sub.filter(c => { const b = c.비지적; const s = Array.isArray(b) ? b.join(" ") : String(b || ""); return s && MIT_KW.test(s); });
    _rebutMit = mit; _rebutViol = viol;   // 클릭 핸들러용 캐시
    const sparse = heavy < 30 || light < 30;
    const segs = `<span class="seg-ju" style="width:${lP}%">${lP >= 13 ? "행정상 " + lP + "%" : ""}</span><span class="seg-mun" style="width:${hP}%">${hP >= 13 ? "징계계열 " + hP + "%" : ""}</span><span class="seg-etc" style="width:${Math.max(0, 100 - lP - hP)}%"></span>`;
    const MIT_SHOW = 4;
    const mitHtml = mit.slice(0, MIT_SHOW).map(c => { const b = c.비지적; const s = Array.isArray(b) ? b.join(" ") : String(b || ""); return `<div class="rb-prec js-prec" data-id="${c.id}" title="클릭 → 사례 상세(근거 페이지·감사명 확인)">${esc(s)}<span class="rb-precgo">상세 ⤢</span></div>`; }).join("") + (mit.length > MIT_SHOW ? `<button class="rb-prec rb-moreprec" type="button" title="우측 ‘관련 사례’ 패널에 면책·참작 선례 전체를 표시합니다">…외 ${fmt(mit.length - MIT_SHOW)}건 — 우측 <b>‘관련 사례’</b>에 면책·참작 선례 ${fmt(mit.length)}건 모두 보기 →</button>` : "");
    const rfs = [], sr = new Set(); topCases.forEach(c => { const r = String(c.적신호 || "").trim(); if (r && !sr.has(r)) { sr.add(r); rfs.push(neutralRedflag(r)); } });
    const aks = [], sa = new Set(); topCases.forEach(c => (c.착안점 || []).forEach(a => { const k = String(a).trim(); if (k && !sa.has(k)) { sa.add(k); aks.push(k); } }));
    const ask = [...aks.slice(0, 2).map(a => [a, "선례 착안점"]), ...rfs.slice(0, 2).map(r => [r, "선례 적신호"])].slice(0, 4);
    const askHtml = ask.map(([t, tag]) => `<div class="rb-q">${esc(String(t))} <span class="rb-tag">(${tag})</span></div>`).join("") || '<div class="muted" style="font-size:12px">점검 항목 정보 없음</div>';
    const co = coOccur(viol).slice(0, 2); const coP = co.map(x => `${esc(x.w)} ${Math.round(x.n / Nv * 100)}%`).join(" · ");
    return `<details class="rebut">
      <summary class="rebut-h"><svg class="ic" aria-hidden="true"><use href="#ic-search"></use></svg> 반론·검증 <span class="muted">「${esc(viol)}」 ${fmt(Nv)}건</span> <span class="rebut-open">펼쳐 보기</span></summary>
      ${sparse ? `<div class="rb-abst">표본이 적어(징계 ${heavy}·행정상 ${light}건) 반대 선례 분포가 갈립니다 — <b>판단 보류</b>. 아래는 참고용입니다.</div>` : ""}
      <div class="rb-sec dev"><div class="rb-t"><svg class="ic" aria-hidden="true"><use href="#ic-messages"></use></svg> 다중관점 <span class="rb-role">— 반대 선례로 상대 반론 미리 점검 (악마의 대변인 — 반대편 자처·약점 점검)</span></div>
        <div class="stack">${segs}</div>
        <div class="rb-obs">관측 — ${mit.length ? `면책·참작 선례 <b>${mit.length}건</b> · ` : ""}행정상 처분(주의·통보·시정) <b>${lP}%</b> · 징계계열 <b>${hP}%</b>.</div>${mitHtml}
        <div class="rb-cap">→ 상대의 <b>면책요건·참작사유·시효</b>를 미리 확인하셨습니까? <span class="muted">(가중·감경 양방향 · 결론은 감사자 판단)</span></div></div>
      <div class="rb-sec ask"><div class="rb-t"><svg class="ic" aria-hidden="true"><use href="#ic-help-circle"></use></svg> 되묻기 <span class="rb-role">— 선례 적신호·착안점을 점검 질문으로</span></div>${askHtml}
        <div class="rb-cap2">선례의 적신호·착안점을 점검 항목으로 재구성(원문 아님).</div></div>
      <div class="rb-sec crit"><div class="rb-t"><svg class="ic" aria-hidden="true"><use href="#ic-square-pen"></use></svg> 비평 <span class="rb-role">— 양정 위치·동반 누락 점검</span></div>
        <div class="rb-q2">양정 — 본 유형은 행정상 처분 ${lP}%, 징계계열 ${hP}%. 가중·감경 <b>어느 쪽이든 사실로 뒷받침</b>해야 형평·반론에 대응됩니다(가중=고의·반복·금액, 감경=면책·참작 근거).</div>
        ${co.length ? `<div class="rb-q2">동반 누락 — 「${esc(viol)}」은 선례상 <b>${coP}</b> 동반. 누락된 동반 위반을 함께 검토했습니까?</div>` : ""}</div>
      <div class="rebut-foot">집계 ${fmt(Nv)}건 · <b>데이터 인용 환각 0</b> / 입력→위반유형 매칭 자동(확인 권장) · LLM 대체가 아니라 반대 방향 선례·분포·정형 질문의 인출입니다.</div>
    </details>`;
  }

  // ===== 능동: CBR 입력형 착안점 =====
  function cbrSearch(q) {
    q = String(q || "").trim(); if (!q) return null;
    const kws = q.split(/[\s,·/]+/).filter(w => w.length >= 2);
    if (!kws.length) return null;
    const aj = v => Array.isArray(v) ? v.join(" ") : (v == null ? "" : String(v));
    // 필드 가중(제목>소주제>요지>…) — 분야 라벨은 점수 제외(부분일치 노이즈 차단: "채용"이 분야명 "인사·채용"에 걸려 비채용 593건이 동점 상위로 오던 문제)
    return C.map(c => {
      const title = c.제목 || "", gist = c.요지 || "", fact = aj(c.위반사실), law = aj(c.위반법령), viol = aj(c.위반유형), sub = aj(c.소주제);
      let s = 0;
      kws.forEach(k => {
        if (title.indexOf(k) >= 0) s += 5;
        if (sub.indexOf(k) >= 0) s += 4;
        if (gist.indexOf(k) >= 0) s += 3;
        if (fact.indexOf(k) >= 0) s += 2;
        if (law.indexOf(k) >= 0) s += 2;
        if (viol.indexOf(k) >= 0) s += 1;
      });
      return { c, s };
    }).filter(x => x.s > 0).sort((a, b) => b.s - a.s);
  }
  function renderCbr(q) {
    const out = document.getElementById("cbrOut");
    const rout = document.getElementById("rebutOut");   // 반론·검증 = 전체 폭 하단(빈 사분면 해소)
    const scored = cbrSearch(q);
    if (!scored) { out.innerHTML = '<div class="muted" style="font-size:12.5px;padding:8px 2px">점검할 정황을 2자 이상 입력하세요.</div>'; if (rout) rout.innerHTML = ""; return; }
    if (!scored.length) { out.innerHTML = '<div class="muted" style="font-size:12.5px;padding:8px 2px">유사 사례를 찾지 못했습니다. 다른 표현으로 시도해 보세요.</div>'; if (rout) rout.innerHTML = ""; return; }
    { const _da = document.getElementById("dashActive"); if (_da) _da.classList.add("searched"); }   // P1: 검색 성공 → 우측 패널(관계망·관련사례) 단계 노출
    const top = scored.slice(0, 40).map(x => x.c);
    const akCnt = {}; top.forEach(c => (c.착안점 || []).forEach(a => { const k = String(a).trim(); if (k) akCnt[k] = (akCnt[k] || 0) + 1; }));
    const aks = Object.entries(akCnt).sort((a, b) => b[1] - a[1]).slice(0, 8);
    const rfCnt = {}; top.forEach(c => { const r = neutralRedflag(String(c.적신호 || "").trim()); if (r) rfCnt[r] = (rfCnt[r] || 0) + 1; });   // 적신호 빈도 집계(변형 통합)
    const rfs = Object.entries(rfCnt).sort((a, b) => b[1] - a[1]);
    const warn = top.length < 5 ? `<div class="cbr-warn"><svg class="ic" aria-hidden="true"><use href="#ic-alert-triangle"></use></svg> 유사 사례 ${top.length}건 — 표본이 적어 참고용입니다.</div>` : "";
    const rfCol = rfs.length
      ? `<div class="cbr-lab"><svg class="ic" aria-hidden="true"><use href="#ic-flag"></use></svg> 함께 점검할 적신호 (빈도순)</div>${rfs.slice(0, Math.max(8, aks.length)).map(([r, n]) => `<div class="rfitem">${esc(r)}${n > 1 ? ` <span class="muted">(${n})</span>` : ""}</div>`).join("")}`
      : `<div class="cbr-lab"><svg class="ic" aria-hidden="true"><use href="#ic-flag"></use></svg> 적신호</div><div class="muted" style="font-size:12px">적신호 정보 없음</div>`;
    // 파생 요약(좌측 빈 공간 활용) — 선례 처분 분포 + 자주 적용된 위반법령
    const _dc = {}; top.forEach(c => dispListOf(c).forEach(d => { _dc[d] = (_dc[d] || 0) + 1; }));
    const _dtot = Object.values(_dc).reduce((a, b) => a + b, 0) || 1;
    let _dseg = "", _dleg = ""; DORD.forEach(([nm, cls]) => { if (_dc[nm]) { const p = _dc[nm] / _dtot * 100;
      _dseg += `<span class="seg-${cls}" style="width:${p}%" title="${nm} ${_dc[nm]}건 (${Math.round(p)}%)"></span>`;
      _dleg += `<span><i class="seg-${cls}"></i>${nm} ${_dc[nm]}</span>`; } });
    const _hard = (_dc["징계·문책요구"] || 0) + (_dc["고발"] || 0) + (_dc["수사의뢰"] || 0);
    const _lc = {}; top.forEach(c => (Array.isArray(c.위반법령) ? c.위반법령 : (c.위반법령 ? [c.위반법령] : [])).forEach(l => { const k = String(l).replace(/\s*제?\s*\d.*$/, "").trim(); if (k && k.length > 1) _lc[k] = (_lc[k] || 0) + 1; }));
    const _laws = Object.entries(_lc).sort((a, b) => b[1] - a[1]).slice(0, 5);
    const extra = `<div class="cbr-extra">`
      + `<div class="cbr-lab"><svg class="ic" aria-hidden="true"><use href="#ic-chart-bar"></use></svg> 선례 처분 분포 <span class="muted">처분요구 ${fmt(_dtot)}건 · 문책 이상 ${Math.round(_hard / _dtot * 100)}%</span></div>`
      + `<div class="stack">${_dseg}</div><div class="leg">${_dleg}</div>`
      + (_laws.length ? `<div class="cbr-lab" style="margin-top:11px"><svg class="ic" aria-hidden="true"><use href="#ic-scale"></use></svg> 자주 적용된 위반법령</div><div class="cbr-exlaw">${_laws.map(([l, n]) => `<span title="${esc(l)}">${esc(l)} <b>${n}</b></span>`).join("")}</div>` : "")
      + `</div>`;
    out.innerHTML = `<div class="cbr-grid">
        <div class="cbr-col"><div class="cbr-head">유사 선례 <b>${fmt(top.length)}</b>건 <span class="muted">종합 — 공통 착안점·적신호</span></div>${warn}<div class="cbr-lab">공통 착안점 (빈도순)</div>${aks.length ? aks.map(([a, n]) => `<div class="aki">${esc(a)}${n > 1 ? ` <span class="muted">(${n})</span>` : ""}</div>`).join("") : '<div class="muted" style="font-size:12px">착안점 정보 없음</div>'}</div>
        <div class="cbr-col rf">${rfCol}</div>
      </div>` + extra;
    const _vc = {}; top.forEach(c => (c.위반유형 || []).forEach(v => { if (!String(v).startsWith("(")) _vc[v] = (_vc[v] || 0) + 1; }));
    const _dom = Object.entries(_vc).sort((a, b) => b[1] - a[1])[0];   // 주 위반유형 자동 판정 → 반론·검증
    if (_dom && rout) { rout.innerHTML = '<div class="panel cbr rebut-panel">' + renderRebut(_dom[0], top) + '</div>';   // 전체 폭 하단 패널(펼침=아래로 성장·우측 빔 해소)
      rout.querySelectorAll(".rb-prec.js-prec[data-id]").forEach(el => el.onclick = () => { if (window.__openCase) window.__openCase(el.dataset.id); });
      const _mp = rout.querySelector(".rb-moreprec"); if (_mp) _mp.onclick = () => drillTo(`면책·참작 선례 · ${_rebutViol}`, _rebutMit);   // …외 N건 → 우측 관련 사례에 전체 로드
    } else if (rout) { rout.innerHTML = ""; }
    _cbrAll = scored.map(x => x.c); _cbrShown = Math.min(40, _cbrAll.length); _cbrQ = q;   // 전체 관련사례 보관 → 더보기 확장
    drillCbr();
  }

  // ===== 현황: 위반유형별 처분 분포(양정 참고) =====
  function renderYang(v, ctx) {
    const base = (ctx && ctx.length) ? ctx : C;
    const sub = base.filter(c => (c.위반유형 || []).includes(v));
    const cc = {}; sub.forEach(c => dispListOf(c).forEach(d => { cc[d] = (cc[d] || 0) + 1; }));   // 처분요구 기준(복수 각각 집계)
    const tot = Object.values(cc).reduce((a, b) => a + b, 0) || 1;
    const GRAVE_NM = new Set(["고발", "수사의뢰", "변상판정(유책)", "변상판정(일부)"]);   // 소수 중대처분 — 범례 안에서 색·굵기 강조(별도 줄 중복 제거)
    let segs = "", leg = ""; DORD.forEach(([name, cls]) => { if (cc[name]) { const p = cc[name] / tot * 100;
      segs += `<span class="seg-${cls}" style="width:${p}%" title="${name} ${fmt(cc[name])}건 (${Math.round(p)}%)">${p >= 9 ? Math.round(p) + "%" : ""}</span>`;
      leg += `<span class="${GRAVE_NM.has(name) ? "lg-gv" : ""}"><i class="seg-${cls}"></i>${name} ${fmt(cc[name])}${p >= 1 ? ` (${Math.round(p)}%)` : ""}</span>`; } });   // "(0%)" 제거·중대처분(고발·수사의뢰·변상) 강조
    const mun = (cc["징계·문책요구"] || 0) + (cc["고발"] || 0), hardp = Math.round(mun / tot * 100);
    const ncase = sub.length;   // 선례(사례) 수 — 처분요구 합계(tot)와 구분(복수 처분 시 tot>ncase)
    document.getElementById("yangbox").innerHTML = `<div class="mdstep"><span class="stepn">2</span>어떻게 — 「${esc(v)}」의 처분 분포 <span class="bhint" title="선택 위반유형 · 처분요구 기준 — 한 사례에 복수 처분이 있으면 각 처분을 따로 셉니다(자체감사 매뉴얼의 처분요구별 건수 산정).">ⓘ</span></div><div class="stack">${segs}</div><div class="leg">${leg}</div>
      <div class="yint"><svg class="ic" aria-hidden="true"><use href="#ic-chart-bar"></use></svg> <b>${esc(v)}</b> 선례 <b>${fmt(ncase)}</b>건 · 처분요구 <b>${fmt(tot)}</b>건 중 문책 이상 <b>${hardp}%</b> <button class="yview" data-v="${esc(v)}">→ 이 유형 선례 ${fmt(ncase)}건 보기</button></div>`;
    const btn = document.querySelector(".yview"); if (btn) btn.onclick = () => drillTo(`양정 · ${v}`, sub);
  }

  // ===== 서브탭 =====
  function showPane(p) {
    document.getElementById("dashBoard").classList.toggle("on", p === "board");
    document.getElementById("dashActive").classList.toggle("on", p === "active");
    document.getElementById("dtBoard").classList.toggle("on", p === "board");
    document.getElementById("dtActive").classList.toggle("on", p === "active");
  }

  function init() {
    const docs = new Set(C.map(c => c.srno)).size;
    const flds = new Set(); C.forEach(c => (c.분야 || []).forEach(f => { if (!String(f).startsWith("(")) flds.add(f); }));
    const yrs = C.map(c => parseInt(c.연도, 10)).filter(y => y >= 2000 && y <= 2030);   // 유효연도만
    const y0 = yrs.length ? Math.min(...yrs) : "", y1 = yrs.length ? Math.max(...yrs) : "";
    const rec5 = C.filter(c => { const y = parseInt(c.연도, 10); return y >= 2022 && y <= 2026; }).length;   // 최근 5개년
    const pre = C.filter(c => { const y = parseInt(c.연도, 10); return y >= 2000 && y <= 2021; }).length;            // 그 이전
    const violN = Object.keys(facet("위반유형")).length;   // 12 = 통제어휘 11 + 기타
    const yrTip = "화성시가 공개한 자체감사 자료로, 일부 연도는 수록 건수가 적습니다. 표본이 작은 연도는 개별 사례 단위로 참고하십시오.";
    document.getElementById("kpis").innerHTML = "";   // P1: KPI 4개 제거(건수=우측상단 배지·분야/유형=하단 중복) → 기관/분야 선택바가 자리 차지

    // 관점 셀렉터 — 2축(기관계열 × 분야) 독립 선택·교차
    const ctxSel = document.getElementById("ctxSel");
    function buildCtxSel() {
      const chipHtml = (items, axis, cur, seg) => items.map(x => `<span class="dchip${seg ? " seg" : ""}${x === cur ? " on" : ""}${!seg && axis === "gye" && x !== "전체" ? " gye" : ""}" role="button" tabindex="0" aria-pressed="${x === cur ? "true" : "false"}" data-axis="${axis}" data-val="${esc(x)}">${esc(x)}</span>`).join("");
      const _sl = [...ctxSel.querySelectorAll(".ctxchips")].map(x => x.scrollLeft);   // 칩 줄 스크롤 위치 보존(선택 시 화면 가변 방지)
      ctxSel.innerHTML = `<div class="ctxrow ctxrow-2"><span class="ctxlab">기관</span><div class="ctxseg">` + chipHtml(["전체", ...GYE3], "gye", _gye, true) + `</div></div>`
        + `<div class="ctxrow ctxrow-2"><span class="ctxlab">분야</span><div class="ctxchips">` + chipHtml(["전체", ...FLD], "fld", _fld) + `</div></div>`;   // 기관=세그먼트 컨트롤·분야=칩 그리드(별도 줄)
      [...ctxSel.querySelectorAll(".ctxchips")].forEach((x, i) => { if (_sl[i]) x.scrollLeft = _sl[i]; });
      ctxSel.querySelectorAll(".dchip").forEach(ch => ch.onclick = () => { const ax = ch.dataset.axis, v = ch.dataset.val; if (ax === "gye") _gye = v; else _fld = v; const _sy = window.scrollY; buildCtxSel(); renderBoard(); window.scrollTo(0, _sy); });   // 페이지 위치 고정
    }
    buildCtxSel(); renderBoard();

    // 분야 타일(현황) — 문책↑ 위험순 정렬, 상위 6 노출·하위 접기(시선 시작점=고위험)
    const tiles = document.getElementById("tiles");
    const tileArr = FLD.map(f => { const sub = C.filter(c => (c.분야 || []).includes(f)); if (!sub.length) return null;
      const vt = {}; sub.forEach(c => (c.위반유형 || []).forEach(v => { if (!String(v).startsWith("(")) vt[v] = (vt[v] || 0) + 1; }));
      const arr = Object.entries(vt).sort((a, b) => b[1] - a[1]).map(x => x[0]);   // 대표 위반유형 1개+등(시인성)
      const hard = sub.filter(c => HARD(c.처분종류)).length, pr = Math.round(hard * 100 / sub.length);
      return { f, n: sub.length, top: arr[0] || "", more: arr.length > 1, pr, cls: pr >= 18 ? "hi" : pr >= 10 ? "mi" : "lo" };
    }).filter(Boolean).sort((a, b) => b.pr - a.pr);
    tiles.innerHTML = tileArr.map(t => `<div class="tile" data-fld="${t.f}" title="관련 사례 ${fmt(t.n)}건 · 문책↑ ${t.pr}% · 클릭 → 탐색"><div class="tn">${t.f}</div><div class="tc">${fmt(t.n)}</div><span class="hb ${t.cls}">문책↑ ${t.pr}%</span></div>`).join("");   // P1: '관련'·'대표' 제거, 숫자·문책% 확대
    tiles.querySelectorAll(".tile").forEach(t => t.onclick = () => window.gotoDigest({ fld: t.dataset.fld }));   // 어디서 → 탐색 분야(연계 재설계 2026-06-13)

    // 무엇을 → 어떻게: 위반유형 건수 선택자(violSel)는 renderBoard→renderViolSel에서 렌더(기본 선택+처분)

    // 왜: 개별 사례 안내 → 착안점 찾기 탭으로
    { const wg = document.getElementById("whyGo"); if (wg) wg.onclick = () => { showPane("active"); const ci = document.getElementById("cbrInput"); if (ci) setTimeout(() => ci.focus(), 60); window.scrollTo({ top: 0, behavior: "smooth" }); }; }

    // 누가 심화: 기관계열 특화 위반유형(lift·임계강조)
    const GYE = GYE3;
    const psel = document.getElementById("profSel");
    psel.innerHTML = GYE.map((g, i) => `<span class="dchip${i === 0 ? " on" : ""}" role="button" tabindex="0" aria-pressed="${i === 0 ? "true" : "false"}" data-pg="${g}">${g}</span>`).join("");
    psel.querySelectorAll(".dchip").forEach(ch => ch.onclick = () => { psel.querySelectorAll(".dchip").forEach(x => { x.classList.remove("on"); x.setAttribute("aria-pressed", "false"); }); ch.classList.add("on"); ch.setAttribute("aria-pressed", "true"); renderProfile(ch.dataset.pg); });
    renderProfile(GYE[0]);

    // CBR(능동)
    const cbrBtn = document.getElementById("cbrBtn"), cbrInput = document.getElementById("cbrInput");
    if (cbrBtn && cbrInput) { cbrBtn.onclick = () => renderCbr(cbrInput.value); cbrInput.onkeydown = e => { if (e.key === "Enter") renderCbr(cbrInput.value); }; }
    const START_CARD = `<div class="cbr-empty"><div class="cbr-emt"><svg class="ic" aria-hidden="true"><use href="#ic-search"></use></svg> 상황·키워드로 유사 선례를 찾습니다</div><div class="cbr-emd">검색창에 <b>자유롭게 입력</b>하거나, 아래 예시를 누르거나, <b><svg class="ic" aria-hidden="true"><use href="#ic-folder"></use></svg> 주제로 찾기</b>에서 고르세요.</div><div class="cbr-egs"><span class="cbr-eglab">예시</span><button class="cbr-eg" type="button" data-q="수의계약 분할 발주">수의계약 분할 발주</button><button class="cbr-eg" type="button" data-q="보조금 정산 자부담 증빙">보조금 자부담 증빙</button><button class="cbr-eg" type="button" data-q="인허가 처리기준 위반">인허가 처리기준</button></div><div class="cbr-egmore">— 이 3개는 <b>예시일 뿐</b>입니다. 어떤 상황·키워드든 직접 입력하거나 <b><svg class="ic" aria-hidden="true"><use href="#ic-folder"></use></svg> 주제로 찾기</b>(수십 개 주제)에서 고를 수 있습니다.</div></div>`;
    { const rb = document.getElementById("cbrReset"); if (rb) rb.onclick = () => { if (cbrInput) cbrInput.value = ""; const o = document.getElementById("cbrOut"); if (o) o.innerHTML = START_CARD; const _da = document.getElementById("dashActive"); if (_da) _da.classList.remove("searched"); clearDrill(true); window.scrollTo({ top: 0, behavior: "smooth" }); }; }   // ↺ 처음으로(완전 초기화 → 시작 카드·우측 패널 숨김)
    { const o = document.getElementById("cbrOut"); if (o && (!o.firstElementChild || o.querySelector(".cbr-empty"))) o.innerHTML = START_CARD; }   // P1: 초기 시작 카드(예시칩)
    { const o = document.getElementById("cbrOut"); if (o && !o._egWired) { o._egWired = 1; o.addEventListener("click", e => { const b = e.target.closest && e.target.closest(".cbr-eg"); if (b) { if (cbrInput) cbrInput.value = b.dataset.q; renderCbr(b.dataset.q); } }); } }   // 예시칩 클릭 → 검색
    { const dc = document.getElementById("drillClear"); if (dc) dc.onclick = () => clearDrill(); }   // 비우기(검색 보존)
    { const db = document.getElementById("drillBack"); if (db) db.onclick = () => { if (_cbrQ) drillCbr(); }; }   // ↩ 착안점 검색 결과로 복귀
    renderSearchAssist();   // 검색 도움(칩·위계 트리 — 공공누리 사실 신호)

    // 서브탭 전환
    document.getElementById("dtBoard").onclick = () => showPane("board");
    document.getElementById("dtActive").onclick = () => showPane("active");
  }
  // ===== 능동: 검색 도움(검색어 추천 — 칩 + 분야→소주제 위계 트리 · 공공누리-안전 사실 신호) =====
  function renderSearchAssist() {
    const chipsEl = document.getElementById("saChips"); if (!chipsEl) return;
    // 집계(window.CARDS 재사용·런타임 LLM 0): 소주제 사실 + 분야→소주제 트리
    const subStat = {}, tree = {}, comat = {};
    C.forEach(c => {
      const rec = parseInt(c.연도, 10) >= 2024;
      const subs = (c.소주제 || []).map(x => String(x).trim()).filter(x => x && !x.startsWith("("));
      subs.forEach(s => { const o = subStat[s] || (subStat[s] = { n: 0, recent: 0 }); o.n++; if (rec) o.recent++; });
      const us = [...new Set(subs)]; for (let i = 0; i < us.length; i++) for (let j = 0; j < us.length; j++) if (i !== j) { const a = us[i]; (comat[a] || (comat[a] = {}))[us[j]] = (comat[a][us[j]] || 0) + 1; }   // 공출현(함께 적발) 집계
      (c.분야 || []).map(x => String(x).trim()).filter(x => x && !x.startsWith("(")).forEach(f => {
        const o = tree[f] || (tree[f] = { n: 0, subs: {} }); o.n++; subs.forEach(s => { o.subs[s] = (o.subs[s] || 0) + 1; });
      });
    });
    const subs = Object.entries(subStat).map(([k, v]) => ({ k, n: v.n, recent: v.recent }));
    let sortMode = "n", chipExpanded = false;
    const CHIP_SHOW = 12;
    function openCbrFor(sub) {
      const inp = document.getElementById("cbrInput"); if (inp) inp.value = sub;
      renderCbr(sub);
      const out = document.getElementById("cbrOut"); if (out) { const r = out.getBoundingClientRect(); if (r.top < 8 || r.top > window.innerHeight * 0.55) out.scrollIntoView({ behavior: "smooth", block: "start" }); }   // 결과가 화면 밖일 때만 이동(상단 칩띠는 sticky로 항상 보임)
    }
    function sortSubs() { const a = subs.slice();
      if (sortMode === "n") a.sort((x, y) => y.n - x.n || x.k.localeCompare(y.k, "ko"));
      else if (sortMode === "recent") a.sort((x, y) => y.recent - x.recent || y.n - x.n);
      else a.sort((x, y) => x.k.localeCompare(y.k, "ko"));
      return a; }
    function renderChips() {
      const arr = sortSubs(), shown = chipExpanded ? arr : arr.slice(0, CHIP_SHOW);
      chipsEl.innerHTML = shown.map(s => `<button class="sachip" type="button" data-sub="${esc(s.k)}" title="‘${esc(s.k)}’ 주제로 유사 선례·처분 분포·착안점 검색 — 전체 ${fmt(s.n)}건(여러 분야 합산)">${esc(s.k)}<span class="sab">${fmt(s.n)}건${s.recent ? " · 최근 " + fmt(s.recent) : ""}</span></button>`).join("")
        + (arr.length > CHIP_SHOW ? `<button class="sachip more" type="button" id="saMore">${chipExpanded ? "접기 ▲" : "주제 +" + (arr.length - CHIP_SHOW) + " 더 보기"}</button>` : "");
      chipsEl.querySelectorAll(".sachip[data-sub]").forEach(b => b.onclick = () => { openCbrFor(b.dataset.sub); const p = document.getElementById("saTreePop"); if (p) p.hidden = true; });
      const mb = document.getElementById("saMore"); if (mb) mb.onclick = () => { chipExpanded = !chipExpanded; renderChips(); };
    }
    const sortEl = document.getElementById("saSort");
    if (sortEl) {
      const SORTS = [["n", "사례 많은"], ["recent", "최근 사례"], ["abc", "가나다"]];
      sortEl.innerHTML = SORTS.map(([v, l], i) => `<span class="dchip${i === 0 ? " on" : ""}" role="button" tabindex="0" aria-pressed="${i === 0 ? "true" : "false"}" data-sort="${v}" title="이 순서는 고른 사실 축으로 정렬한 것이며 프로그램의 권고가 아닙니다">${l} 순으로 보기</span>`).join("");
      sortEl.querySelectorAll(".dchip").forEach(ch => ch.onclick = () => { sortMode = ch.dataset.sort; sortEl.querySelectorAll(".dchip").forEach(x => { x.classList.remove("on"); x.setAttribute("aria-pressed", "false"); }); ch.classList.add("on"); ch.setAttribute("aria-pressed", "true"); renderChips(); });
    }
    const treeEl = document.getElementById("saTree");
    if (treeEl) {
      const fldArr = Object.entries(tree).map(([f, o]) => ({ f, n: o.n, subs: Object.entries(o.subs).map(([k, n]) => ({ k, n })).sort((a, b) => b.n - a.n) })).sort((a, b) => b.n - a.n);
      treeEl.innerHTML = fldArr.map(F => { const mx = Math.max.apply(null, F.subs.map(s => s.n).concat(1));
        return `<div class="satf" role="treeitem" aria-expanded="false" aria-level="1"><button class="satf-h" type="button"><span class="satf-arrow">▸</span><span class="satf-n">${esc(F.f)}</span><span class="satf-c">${fmt(F.n)}건</span></button><div class="satf-kids" role="group" hidden><div class="satkcap">건수는 ${esc(F.f)} 분야 안 기준 — 전체 건수와 다를 수 있음</div>${F.subs.map(s => `<button class="satl" type="button" role="treeitem" aria-level="2" data-sub="${esc(s.k)}" title="‘${esc(s.k)}’ 검색 — ${esc(F.f)} 안 ${fmt(s.n)}건 · 전체 ${fmt((subStat[s.k] || { n: s.n }).n)}건"><span class="satl-n">${esc(s.k)}</span><span class="satl-c">${fmt(s.n)}</span></button>`).join("")}</div></div>`;
      }).join("");
      treeEl.querySelectorAll(".satf").forEach(node => { const h = node.querySelector(".satf-h"), kids = node.querySelector(".satf-kids"), ar = node.querySelector(".satf-arrow");
        h.onclick = () => { const open = node.getAttribute("aria-expanded") === "true"; node.setAttribute("aria-expanded", open ? "false" : "true"); kids.hidden = open; ar.textContent = open ? "▸" : "▾"; }; });
      const _pop = document.getElementById("saTreePop");
      const _closePop = () => { if (_pop) _pop.hidden = true; };
      treeEl.querySelectorAll(".satl[data-sub]").forEach(b => b.onclick = () => { openCbrFor(b.dataset.sub); _closePop(); });
      { const tb = document.getElementById("saTreeBtn"); if (tb && _pop) tb.onclick = () => { _pop.hidden = false; }; }
      { const cb2 = document.getElementById("saChkBtn"); if (cb2) cb2.onclick = () => {   // 사례로 점검하기 — 주제로 찾기와 동급(현재 검색·드릴 범위 우선)
          const sc = _cbrQ ? { list: _cbrAll, label: `착안점 검색 "${_cbrQ.slice(0, 14)}"` }
            : (_lastDrill && _lastDrill.list.length ? { list: _lastDrill.list, label: _lastDrill.title }
            : { list: ctxSubset2(), label: ctxLabel() });
          if (window.__openChecklist) window.__openChecklist(sc.list, sc.label); }; }
      { const xb = document.getElementById("saTreeClose"); if (xb) xb.onclick = _closePop; }
      if (_pop) { _pop.onclick = (e) => { if (e.target === _pop) _closePop(); }; document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !_pop.hidden) _closePop(); }); }
    }
    function renderRelGraph(container) {
      // 미리보기도 모달과 동일한 분야망(10) — 클릭=확대 모달 진입(2026-06-13 3계층 통일)
      const fcnt = {}, fco = {};
      C.forEach(c => { const fs = [...new Set((c.분야 || []).map(x => String(x).trim()).filter(x => x && !x.startsWith("(")))];
        fs.forEach(f => fcnt[f] = (fcnt[f] || 0) + 1);
        for (let i = 0; i < fs.length; i++) for (let j = i + 1; j < fs.length; j++) { const a = fs[i] < fs[j] ? fs[i] : fs[j], b = fs[i] < fs[j] ? fs[j] : fs[i]; (fco[a] || (fco[a] = {}))[b] = (fco[a][b] || 0) + 1; } });
      const top = Object.keys(fcnt).map(k => ({ k, n: fcnt[k] })).sort((a, b) => b.n - a.n).slice(0, 10);
      const N = top.length, W = 720, H = 460;
      const nodes = top.map(s => ({ k: s.k, n: s.n }));
      nodes.forEach(nd => { nd.r = Math.min(11, 5 + Math.sqrt(nd.n) * 0.12); nd.lw = (String(nd.k).length + String(fmt(nd.n)).length + 1) * 13; });   // 물리속성: 반경 + 라벨폭(15px 추정·아래 중앙)
      const ni = {}; nodes.forEach((nd, i) => ni[nd.k] = i);
      let edges = [];
      for (let i = 0; i < N; i++) for (let j = i + 1; j < N; j++) { const A = top[i].k, B = top[j].k, lo = A < B ? A : B, hi = A < B ? B : A; const cnt = (fco[lo] && fco[lo][hi]) || 0; if (cnt > 0) edges.push({ a: A, b: B, w: cnt }); }
      edges = edges.sort((a, b) => b.w - a.w).slice(0, 16);
      if (window.GraphView && GraphView.layout) GraphView.layout(nodes, edges, W, H);
      else nodes.forEach((nd, i) => { const a = (i / N) * 6.2832 - 1.5708, R = Math.min(W, H) / 2 - 100; nd.x = W / 2 + R * Math.cos(a); nd.y = H / 2 + R * Math.sin(a); });
      const idx = {}; nodes.forEach(nd => idx[nd.k] = nd);
      const wmax = Math.max.apply(null, edges.map(e => e.w).concat(1));
      const edgeSvg = edges.map(e => { const A = idx[e.a], B = idx[e.b]; return `<line x1="${A.x.toFixed(1)}" y1="${A.y.toFixed(1)}" x2="${B.x.toFixed(1)}" y2="${B.y.toFixed(1)}" class="reledge" stroke-width="${(0.6 + 2.4 * e.w / wmax).toFixed(1)}" data-i="${ni[e.a]}" data-j="${ni[e.b]}"><title>${esc(e.a)} ↔ ${esc(e.b)} · 함께 ${fmt(e.w)}건</title></line>`; }).join("");
      const nodeSvg = nodes.map((nd, i) => `<g class="relnode fld" data-i="${i}" data-fld="${esc(nd.k)}" tabindex="0" role="button"><circle cx="${nd.x.toFixed(1)}" cy="${nd.y.toFixed(1)}" r="${nd.r.toFixed(1)}"></circle><text x="${nd.x.toFixed(1)}" y="${(nd.y + nd.r + 13).toFixed(1)}" text-anchor="middle" class="rellbl">${esc(nd.k)} ${fmt(nd.n)}</text><title>${esc(nd.k)} · ${fmt(nd.n)}건 · 클릭하면 크게 보기</title></g>`).join("");
      container.innerHTML = `<svg viewBox="0 0 ${W} ${H}" class="relsvg" role="img" aria-label="분야 적발 관계망(미리보기) — 클릭하면 크게">${edgeSvg}${nodeSvg}</svg>`;
      const _gvOpen = () => { if (window.GraphView) GraphView.open({ onSearch: openCbrFor }); };   // 미리보기 클릭 = 분야망 확대 모달
      { const gb = document.getElementById("gvOpen"); if (gb) gb.onclick = _gvOpen; }
      container.querySelectorAll(".relnode").forEach(g => { const gi = g.getAttribute("data-i");
        g.onclick = _gvOpen;
        g.onkeydown = (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); _gvOpen(); } };
        g.onmouseenter = () => { container.querySelectorAll(".reledge").forEach(l => { if (l.getAttribute("data-i") === gi || l.getAttribute("data-j") === gi) l.classList.add("hot"); }); g.classList.add("hot"); };
        g.onmouseleave = () => { container.querySelectorAll(".reledge.hot").forEach(l => l.classList.remove("hot")); g.classList.remove("hot"); };
      });
    }
    const viewEl = document.getElementById("saView");
    if (viewEl) viewEl.querySelectorAll("button").forEach(b => b.onclick = () => {
      const isGraph = b.dataset.v === "graph";
      viewEl.querySelectorAll("button").forEach(x => { x.classList.toggle("on", x === b); x.setAttribute("aria-pressed", x === b ? "true" : "false"); });
      if (treeEl) treeEl.hidden = isGraph;
      const gEl = document.getElementById("saGraph"); if (gEl) { gEl.hidden = !isGraph; if (isGraph && !gEl.dataset.rendered) { renderRelGraph(gEl); gEl.dataset.rendered = "1"; } }
      const rt = document.getElementById("saRelToggle"); if (rt) rt.style.display = isGraph ? "none" : "";
    });
    { const _g = document.getElementById("saGraph"); if (_g && !_g.dataset.rendered) { renderRelGraph(_g); _g.dataset.rendered = "1"; } }   // 관계망 렌더(숨김 aside에 미리 — P1 CSS가 검색 후 노출). 버그수정: renderCbr 스코프 밖이라 거기서 호출 불가
    renderChips();
  }

  return { init };
})();
