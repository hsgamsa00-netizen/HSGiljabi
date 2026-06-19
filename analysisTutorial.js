"use strict";
/* 분석·반론검증 사용법 — 예시로 따라보는 별도 팝업 튜토리얼.
   감문도 작성보조 사용법과 같은 패턴(단계 모달·Space 네비·진행점). 실제 작업 영향 없음 · LLM 호출 0. */
window.AnalysisTutorial = (function () {
  let _el = null, _i = 0;

  const STEPS = [
    {
      t: "📊 분석은 두 화면 — 현황 / 착안점 찾기",
      lead: "검색이 ‘무엇이 있나’를 본다면, 분석은 ‘무엇을 봐야 하나’를 봅니다. 상단 두 버튼으로 화면을 바꿉니다.",
      ex: `<div class="at-row"><span class="at-pill">📋 현황 <i>데이터로 보는 공개 사례</i></span><span class="at-pill on">🔎 착안점 찾기 <i>내 사안으로 선례·착안점</i></span></div>`
    },
    {
      t: "🧭 현황 — 6하원칙으로 한눈에",
      lead: "맨 위 <b>기관·분야 필터</b>를 고르면 아래 전체가 그 맥락으로 재집계됩니다. 데이터를 <b>누가 → 언제 → 어디서 → 무엇을 → 어떻게 → 왜</b> 순서로 봅니다. <span class=\"muted\">(집계 사실만 · 해석은 덧붙이지 않습니다)</span>",
      ex: `<div class="at-row" style="flex-wrap:wrap"><span class="at-pill">누가 <i>기관계열</i></span><span class="at-pill">언제 <i>연도</i></span><span class="at-pill">어디서 <i>분야</i></span><span class="at-pill">무엇을 <i>위반유형</i></span><span class="at-pill">어떻게 <i>처분</i></span><span class="at-pill">왜 <i>개별 사례</i></span></div>`
    },
    {
      t: "🔗 무엇을 → 어떻게 — 위반유형을 고르면 처분이 따라온다",
      lead: "왼쪽 <b>위반유형 막대를 클릭</b>하면 오른쪽에 그 유형의 <b>실제 처분 분포</b>(주의·통보·문책 등)가 바로 나타납니다. 막대를 다시 누르면 그 <b>선례 목록</b>으로 이어집니다.",
      ex: `<div class="at-mini"><div class="at-mt">① 「검사·감독」 선택</div><div class="at-mbar"><span class="s1" style="width:85%"></span><span class="s2" style="width:11%"></span></div><div class="at-mc">② 주의 40% · 통보 45% · 문책 이상 11%</div></div>`
    },
    {
      t: "🔎 누가·심화 — 기관계열별, 특화 위반유형",
      lead: "맨 위 <b>누가(기관계열별)</b>는 중앙·공공기관·지자체의 처분 강도를 비교합니다. 그 아래 <b>‘특화 위반유형’ 한 줄</b>을 펼치면 계열별로 전체 평균보다 많은 유형(배수)을 봅니다. <span class=\"muted\">(배수·비율은 집계 사실 · 색은 우선순위/난이도 아님)</span>",
      ex: `<div class="at-mini"><div class="at-mt">지자체 — 전체 평균比</div><div class="at-bars"><span style="height:100%"></span><span style="height:57%"></span><span style="height:56%"></span><span style="height:54%"></span></div><div class="at-mc">인허가·개발 2.1배(강조) · 그 외 차분</div></div>`
    },
    {
      t: "🔎 착안점 찾기 — 정황 한 줄 → 선례",
      lead: "점검할 <b>부서·사업·정황을 한 줄</b>로 입력하면, 유사 적발사례·처분 분포·공통 착안점을 모아 줍니다.",
      ex: `<div class="at-input">수의계약 분할 발주<span class="at-cur">▏</span></div><div class="at-arr">↓</div><div class="at-mc">유사 적발사례 · 처분 분포 · 공통 착안점</div>`
    },
    {
      t: "🧭 세 갈래 — 막막할 때 · 정했을 때 · 넓힐 때",
      lead: "검색어가 막막하면 <b>📂 주제로 찾기</b>(자주 적발된 주제·분류에서 골라 검색), 범위를 정했으면 <b>📋 사례로 점검하기</b>(선례 착안점을 점검표로 — 체크하면 메모·내 사례함으로), 시야를 넓히려면 <b>🔗 적발 관계망</b>(함께 적발된 주제의 연결을 그래프로 탐색)을 누르세요.",
      ex: `<div class="at-row"><span class="at-pill">📂 주제로 찾기</span><span class="at-pill">📋 사례로 점검하기</span><span class="at-pill">🔗 적발 관계망</span></div><div class="at-mc">고르기 → 점검하기 → 넓히기 — 셋은 같은 위상의 진입로입니다.</div>`
    },
    {
      t: "🔍 반론·검증 — 찾은 착안점을 반대편에서 한 번 더",
      lead: "착안점 찾기 결과 <b>아래에 3자 시각</b>이 붙습니다. 찾은 결론을 그대로 믿지 않고, 반대 선례·빠진 질문·양정 위치를 점검합니다. <span class=\"muted\">생성이 아니라 데이터 인출 — LLM 0.</span>",
      ex: `<div class="at-row"><span class="at-tag dev">😈 다중관점</span><span class="at-tag ask">🤔 되묻기</span><span class="at-tag crit">📝 비평</span></div>`
    },
    {
      t: "😈 다중관점 — 반대 선례로 상대 반론 미리 점검 (악마의 대변인 — 반대편 자처·약점 점검)",
      lead: "이 사안을 <b>반대로 보는 실제 선례</b> — 같은 유형의 경한 처분·면책 사례 — 를 꺼내 과중한 의율을 견제합니다.",
      ex: `<div class="at-mini"><div class="at-mt">계약·조달 — 선례 다수</div><div class="at-mbar"><span class="s1" style="width:78%"></span><span class="s2" style="width:18%"></span></div><div class="at-mc">경한 처분 78% · 징계계열 18% · 면책·참작 선례 있음</div></div>`
    },
    {
      t: "🤔 되묻기 — 적신호를 점검 질문으로",
      lead: "유사 선례의 <b>적신호·착안점을 질문</b>으로 되짚어, 빠뜨린 확인사항이 없는지 묻습니다.",
      ex: `<div class="at-qs"><div>· 수의계약 결정의 결재선·책임 소재가 특정되었는가?</div><div>· ‘분할’ 정황이 구체적으로 확인·문서로 뒷받침되는가?</div><div>· 실제 손해·부당이득이 산정되었는가?</div></div>`
    },
    {
      t: "📝 비평 — 양정 위치·동반 누락",
      lead: "같은 유형의 처분 분포에서 <b>본 사안 양정이 어디쯤</b>인지, 함께 다뤘어야 할 <b>동반 위반</b>이 없는지 짚습니다.",
      ex: `<div class="at-qs"><div><b>양정</b> — 본 유형은 경한 처분이 다수 → 과중 의율이면 근거 보강</div><div><b>동반 점검</b> — 이 유형과 자주 함께 적발: 검사·감독 / 문서</div></div>`
    },
    {
      t: "🛡️ 한계도 함께 — 그래서 믿을 수 있게",
      lead: "표본이 적은 유형은 ‘<b>선례 갈림 — 판단 보류</b>’로 단정하지 않습니다. 모든 수치는 처분요구서 집계라 <b>인용 환각 0</b>, 입력→위반유형 매칭은 자동이라 <b>확인을 권합니다</b>. LLM 판단의 대체가 아니라, 선례를 빠르게 인출하는 도구입니다.",
      ex: `<div class="at-mc">원문·최종 판단은 <b>화성시 감사 자료</b>에서 확인 · 이제 닫고 ‘착안점 찾기’에 직접 정황을 넣어 보세요.</div>`
    }
  ];

  function dots() {
    return STEPS.map((_, n) => `<span class="at-dot${n === _i ? " on" : ""}" data-at-dot="${n}"></span>`).join("");
  }

  function render() {
    const s = STEPS[_i], last = _i === STEPS.length - 1;
    const body = _el.querySelector(".at-modal");
    body.innerHTML = `
      <div class="at-head">
        <div class="at-brand">📖 분석·반론검증 사용법 <span class="at-sub">예시로 각 기능을 따라보며 봅니다 · 실제 작업엔 영향 없음 · LLM 호출 0</span></div>
        <button class="at-x" data-at="close" type="button" aria-label="닫기">✕</button>
      </div>
      <div class="at-meta"><span class="at-count">${_i + 1} <i>/ ${STEPS.length}</i></span><span class="at-prog">${dots()}</span></div>
      <div class="at-body">
        <div class="at-title">${s.t}</div>
        <div class="at-lead">${s.lead}</div>
        <div class="at-ex">${s.ex}</div>
      </div>
      <div class="at-foot">
        <button class="at-btn ghost" data-at="prev" type="button" ${_i === 0 ? "disabled" : ""}>◀ 이전</button>
        <span class="at-hint">Space · → 다음 · ← 이전 · Esc 닫기</span>
        <button class="at-btn" data-at="next" type="button">${last ? "닫기 ✓" : "다음 <b>Space</b> ▶"}</button>
      </div>`;
  }

  function go(n) {
    if (n < 0) n = 0;
    if (n >= STEPS.length) { close(); return; }
    _i = n; render();
  }

  function onKey(e) {
    if (!_el) return;
    if (e.key === "Escape") { e.preventDefault(); close(); }
    else if (e.key === " " || e.key === "Spacebar" || e.key === "ArrowRight" || e.key === "Enter") { e.preventDefault(); go(_i + 1); }
    else if (e.key === "ArrowLeft") { e.preventDefault(); go(_i - 1); }
  }

  function open() {
    if (_el) close();
    _i = 0;
    const ov = document.createElement("div");
    ov.className = "at-overlay";
    ov.innerHTML = `<div class="at-modal" role="dialog" aria-label="분석·반론검증 사용법"></div>`;
    ov.addEventListener("click", (e) => {
      if (e.target === ov) { close(); return; }
      const dn = e.target.closest && e.target.closest("[data-at-dot]");
      if (dn) { go(+dn.dataset.atDot); return; }
      const node = e.target.closest && e.target.closest("[data-at]");
      if (!node) return;
      const a = node.dataset.at;
      if (a === "close") close();
      else if (a === "prev") go(_i - 1);
      else if (a === "next") go(_i + 1);
    });
    document.body.appendChild(ov);
    _el = ov;
    render();
    document.addEventListener("keydown", onKey, true);
  }

  function close() {
    if (_el) { _el.remove(); _el = null; }
    document.removeEventListener("keydown", onKey, true);
  }

  return { open };
})();
