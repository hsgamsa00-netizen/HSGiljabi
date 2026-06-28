"use strict";
/* 화면 사용법 — 하이라이트 플로팅(스포트라이트) 안내.
   실제 화면 요소를 링으로 강조 + 말풍선으로 설명(현재 설명 유지). 분석/사례 탐색/내 사례함 각 화면용.
   (구 tour 엔진 일반화 · #tourMask·.tour-ring·.tour-tip 재사용) Space/→ 다음·← 이전·Esc 닫기. */
window.ScreenGuide = (function () {
  let steps = [], idx = 0, mask = null;

  const SETS = {
    dash: [
      { tab: "tabDash", pane: "board", sel: ".dsubtabs", title: "분석은 두 화면", desc: `<svg class="ic" aria-hidden="true"><use href="#ic-clipboard-list"></use></svg> 현황(데이터로 보는 공개 사례) · <svg class="ic" aria-hidden="true"><use href="#ic-search"></use></svg> 착안점 찾기. 현황은 데이터를 6하원칙(누가·언제·어디서·무엇을·어떻게·왜) 순서로 조망합니다.` },
      { tab: "tabDash", pane: "board", sel: "#ctxSel", title: "기관 × 분야 필터", desc: "기관계열·분야를 각각 골라(교차) 그 맥락으로 아래 전 섹션을 재집계합니다." },
      { tab: "tabDash", pane: "board", sel: "#whoBox", title: "누가 — 기관계열별 비교", desc: "중앙·공공기관·지자체의 규모와 처분 강도(구성비 100%). 아래 ‘특화 위반유형’을 펼치면 계열별로 평균보다 많은 유형을 봅니다. 막대 클릭 → 사례." },
      { tab: "tabDash", pane: "board", sel: "#yearBox", title: "언제 — 연도별 사례 카드 수", desc: "최근연도 순(2026→). 처분요구서 1건이 사례 1건입니다(문서 수 = 사례 수). 막대를 누르면 그 연도 사례가 우측 ‘관련 사례’에 나옵니다." },
      { tab: "tabDash", pane: "board", sel: "#tiles", title: "어디서 — 분야별 분포", desc: "분야별 건수·문책↑ 비율(위험순). 카드를 누르면 그 분야 사례가 우측 ‘관련 사례’에." },
      { tab: "tabDash", pane: "board", sel: ".vpmd", title: "무엇을 → 어떻게", desc: "왼쪽 위반유형 막대를 고르면(①) 오른쪽에 그 유형의 실제 처분 분포(주의·통보·문책 등)가 따라옵니다(②)." },
      { tab: "tabDash", pane: "board", sel: ".band.why", title: "왜 — 원인·배경은 개별 사례에서", desc: "원인·배경은 집계 통계가 아니라 개별 사례에 드러납니다. 위 분포의 막대 클릭 → 선례 목록 → 착안점·적신호·반론·검증에서 확인하세요." },
      { tab: "tabDash", pane: "active", sel: "#cbrInput", title: "착안점 찾기 — 정황 입력", desc: "점검할 부서·사업·정황을 한 줄로 입력 → 유사 선례·처분 분포·공통 착안점. 결과 아래 ‘반론·검증’(실제 선례)까지." }
    ],
    digest: [
      { tab: "tabDigest", sel: "#fldGrid", title: "분야로 좁히기", desc: "큰 버튼이 감사 분야. 누르면 위반유형이 펼쳐지고 목록이 그 범위로 좁혀집니다." },
      { tab: "tabDigest", sel: "#q", title: "검색", desc: "제목·요지·법령·감사명을 한 번에 검색합니다." },
      { tab: "tabDigest", sel: "#pickBtn", title: "주제·표식 필터", desc: `한 곳에서 <svg class="ic" aria-hidden="true"><use href="#ic-search"></use></svg>중점 점검 비위·<svg class="ic" aria-hidden="true"><use href="#ic-scale"></use></svg>형사 연계·세부 주제(채용·수의계약 등)를 검색·선택해 거릅니다.` },
      { tab: "tabDigest", sel: "#f_gye", title: "기관계열·연도·처분 필터", desc: "좌측 필터로 더 좁힙니다(연도는 공개일 기준)." },
      { tab: "tabDigest", sel: "#list", title: "사례 목록", desc: "검색·필터 결과가 목록으로. 사례를 누르면 <b>우측</b>에 상세가 열립니다." },
      { tab: "tabDigest", sel: "#detail", title: "우측 상세 패널 · 단축키", desc: "위반사실·근거법령·근거 페이지·착안점·적신호가 여기에. 법령을 누르면 조문 팝업. 우상단 <b>☆ 내 사례함 담기(단축키 S)</b> · <b>⤢ 넓게 보기(단축키 W)</b>." }
    ],
    keep: [
      { tab: "tabKeep", sel: "#tabKeep", title: `<svg class="ic" aria-hidden="true"><use href="#ic-star"></use></svg> 내 사례함`, desc: "사례 목록·상세에서 ☆를 누르면 담아 둔 사례가 여기 모입니다(개수 제한 없음)." },
      { tab: "tabKeep", sel: "#keepList", title: "모아 보기", desc: "담은 선례를 한곳에서 다시 봅니다. 클릭 → 상세. 이 기기에만 저장(외부 전송 없음)." }
    ]
  };

  function ensureMask() {
    mask = document.getElementById("tourMask");
    mask.innerHTML = '<div class="tour-ring" id="tourRing"></div><div class="tour-tip" id="tourTip"></div>';
  }
  function place(st, el, i) {
    const ring = document.getElementById("tourRing"), tip = document.getElementById("tourTip");
    const tw = 300, th = 162; let tl, tt;
    if (el) {
      const r = el.getBoundingClientRect(), pad = 6;
      ring.style.display = "block";
      ring.style.left = (r.left - pad) + "px"; ring.style.top = (r.top - pad) + "px";
      ring.style.width = (r.width + pad * 2) + "px"; ring.style.height = (r.height + pad * 2) + "px";
      ring.style.boxShadow = "0 0 0 9999px rgba(15,23,34,.55)";
      tl = Math.min(Math.max(8, r.left), window.innerWidth - tw - 8);
      tt = r.bottom + 12; if (tt + th > window.innerHeight) tt = Math.max(8, r.top - th - 12);
    } else {
      ring.style.display = "none"; ring.style.boxShadow = "0 0 0 9999px rgba(15,23,34,.55)";
      tl = (window.innerWidth - tw) / 2; tt = Math.max(70, (window.innerHeight - th) / 2);
    }
    tip.innerHTML = `<div class="tt">${st.title}</div><div class="td">${st.desc}</div>` +
      `<div class="tf"><span class="tstep">${i + 1} / ${steps.length} · Space 다음 · Esc 닫기</span>` +
      `<div class="tbtns">${i > 0 ? '<button class="tprev">이전</button>' : ''}<button class="tclose">닫기</button>` +
      `<button class="tnext">${i === steps.length - 1 ? '완료' : '다음 ▶'}</button></div></div>`;
    tip.style.left = tl + "px"; tip.style.top = tt + "px";
    tip.querySelector(".tnext").onclick = next;
    const pv = tip.querySelector(".tprev"); if (pv) pv.onclick = () => show(i - 1);
    tip.querySelector(".tclose").onclick = stop;
  }
  function show(i) {
    if (i < 0) i = 0; if (i >= steps.length) return stop();
    idx = i; const st = steps[i];
    let wait = 30;
    if (st.tab) { const b = document.getElementById(st.tab); if (b && !b.classList.contains("on")) { b.click(); wait = 180; } }
    if (st.pane) { const pb = document.querySelector(`.dst[data-pane="${st.pane}"]`); if (pb && !pb.classList.contains("on")) { pb.click(); wait = Math.max(wait, 130); } }
    setTimeout(() => {
      const el = st.sel ? document.querySelector(st.sel) : null;
      if (st.sel && !el && st.optional) return next();
      if (el) { const _d = el.closest("details"); if (_d && !_d.open) _d.open = true; }   // 접힌 섹션(연도별 등) 펼쳐 하이라이트 좌표 정확히
      if (el) { try { el.scrollIntoView({ block: "center", inline: "nearest" }); } catch (e) {} }
      setTimeout(() => place(st, el, i), el ? 70 : 0);
    }, wait);
  }
  function next() { show(idx + 1); }
  function onKey(e) {
    if (e.key === "Escape") { e.preventDefault(); stop(); }
    else if (["ArrowRight", "Enter", " ", "Spacebar"].includes(e.key)) { e.preventDefault(); next(); }
    else if (e.key === "ArrowLeft") { e.preventDefault(); if (idx > 0) show(idx - 1); }
  }
  function start(which) {
    steps = SETS[which] || []; if (!steps.length) return;
    ensureMask(); mask.classList.add("on");
    setTimeout(() => show(0), 40);
    document.addEventListener("keydown", onKey, true);
  }
  function stop() {
    if (mask) mask.classList.remove("on");
    document.removeEventListener("keydown", onKey, true);
  }
  window.addEventListener("resize", () => { if (mask && mask.classList.contains("on")) show(idx); });
  return { start };
})();
