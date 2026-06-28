"use strict";
/* 화면별 사용법 — 사례 탐색 / 내 사례함 단계 팝업.
   analysisTutorial과 동일한 .at-* 스타일·Space 네비·진행점 재사용. 실제 작업 영향 없음 · LLM 0. */
window.PanelGuide = (function () {
  let _el = null, _i = 0, _steps = [], _brand = "";

  const GUIDES = {
    digest: {
      brand: `<svg class="ic" aria-hidden="true"><use href="#ic-folder"></use></svg> 사례 탐색 사용법`,
      steps: [
        {
          t: `<svg class="ic" aria-hidden="true"><use href="#ic-folder"></use></svg> 분야로 좁히기 — 왼쪽 큰 버튼`,
          lead: "왼쪽의 큰 버튼이 <b>감사 분야</b>입니다. 누르면 그 분야의 <b>위반유형</b>이 아래에 펼쳐지고, 가운데 목록이 그 범위로 좁혀집니다.",
          ex: `<div class="at-row"><span class="at-pill on">계약·조달</span><span class="at-pill">재정·세무·회계</span><span class="at-pill">인허가·개발</span></div><div class="at-arr">↓</div><div class="at-mc">선택한 분야의 위반유형 칩이 펼쳐지고 목록이 좁혀집니다.</div>`
        },
        {
          t: `<svg class="ic" aria-hidden="true"><use href="#ic-search"></use></svg> 검색 + 필터로 더 좁히기`,
          lead: "상단 <b>검색창</b>은 제목·요지·법령·감사명을 한 번에 찾습니다. 왼쪽의 <b>기관계열·연도(공개일 기준)·처분종류</b> 필터로 결과를 더 좁힐 수 있습니다.",
          ex: `<div class="at-input">수의계약 분할<span class="at-cur">▏</span></div><div class="at-mc">+ 좌측 필터: 기관계열(중앙·공공기관·지자체) · 연도 범위 · 처분종류</div>`
        },
        {
          t: `<svg class="ic" aria-hidden="true"><use href="#ic-file-text"></use></svg> 사례 상세 — 근거를 한눈에`,
          lead: "목록에서 사례를 누르면 오른쪽에 <b>위반사실 · 근거법령 · 근거 페이지 · 착안점 · 적신호</b>가 표시됩니다. 법령을 누르면 조문을 바로 봅니다(설정의 OC 입력 시).",
          ex: `<div class="at-qs"><div><b>위반사실</b> · <b>근거법령</b>(클릭→조문) · <b>근거 p.4·p.7</b></div><div><b>착안점</b> · <b><svg class="ic" aria-hidden="true"><use href="#ic-flag"></use></svg> 적신호</b> — 감사계획·점검에 바로 활용</div></div>`
        },
        {
          t: `<svg class="ic" aria-hidden="true"><use href="#ic-star"></use></svg> 담기 · <svg class="ic" aria-hidden="true"><use href="#ic-pencil"></use></svg> 메모`,
          lead: "사례 옆 <b>☆</b>를 누르면 <b>내 사례함</b>에 모입니다. 플로팅 메모로 현장 의견·착안점을 남길 수 있습니다 <span class=\"muted\">(이 기기에만 저장·외부 전송 없음)</span>.",
          ex: `<div class="at-mc">☆ 담기 → <svg class="ic" aria-hidden="true"><use href="#ic-star"></use></svg> 내 사례함 · <svg class="ic" aria-hidden="true"><use href="#ic-pencil"></use></svg> 메모는 첫 줄이 제목 · 모두 로컬 저장</div>`
        }
      ]
    },
    keep: {
      brand: `<svg class="ic" aria-hidden="true"><use href="#ic-star"></use></svg> 내 사례함 사용법`,
      steps: [
        {
          t: "☆ 담기 — 관심 사례 모으기",
          lead: "사례 목록·상세에서 <b>☆</b>를 누르면 그 사례가 <b>내 사례함</b>에 담깁니다. 다시 누르면 빠집니다.",
          ex: `<div class="at-row"><span class="at-pill on">☆ → ★ 담김</span></div><div class="at-mc">탐색 중 눈에 띈 선례를 그때그때 담아 두세요.</div>`
        },
        {
          t: `<svg class="ic" aria-hidden="true"><use href="#ic-star"></use></svg> 모아 보기 — 빠르게 다시`,
          lead: "여기 <b>내 사례함</b>에서 담아 둔 사례를 한곳에 모아 봅니다. 감사 건별로 관련 선례를 따로 관리하기 좋습니다 <span class=\"muted\">(모아보기·통계는 추후 확장)</span>.",
          ex: `<div class="at-mc">담은 사례 = 이 PC에만 저장 · 클릭 → 상세 팝업으로 근거 재확인</div>`
        }
      ]
    }
  };

  function dots() { return _steps.map((_, n) => `<span class="at-dot${n === _i ? " on" : ""}" data-pg-dot="${n}"></span>`).join(""); }

  function render() {
    const s = _steps[_i], last = _i === _steps.length - 1;
    const body = _el.querySelector(".at-modal");
    body.innerHTML = `
      <div class="at-head">
        <div class="at-brand">${_brand} <span class="at-sub">예시로 따라보며 봅니다</span></div>
        <button class="at-x" data-pg="close" type="button" aria-label="닫기">✕</button>
      </div>
      <div class="at-meta"><span class="at-count">${_i + 1} <i>/ ${_steps.length}</i></span><span class="at-prog">${dots()}</span></div>
      <div class="at-body">
        <div class="at-title">${s.t}</div>
        <div class="at-lead">${s.lead}</div>
        <div class="at-ex">${s.ex}</div>
      </div>
      <div class="at-foot">
        <button class="at-btn ghost" data-pg="prev" type="button" ${_i === 0 ? "disabled" : ""}>◀ 이전</button>
        <span class="at-hint">Space · → 다음 · ← 이전 · Esc 닫기</span>
        <button class="at-btn" data-pg="next" type="button">${last ? "닫기 ✓" : "다음 <b>Space</b> ▶"}</button>
      </div>`;
  }

  function go(n) { if (n < 0) n = 0; if (n >= _steps.length) { close(); return; } _i = n; render(); }

  function onKey(e) {
    if (!_el) return;
    if (e.key === "Escape") { e.preventDefault(); close(); }
    else if (e.key === " " || e.key === "Spacebar" || e.key === "ArrowRight" || e.key === "Enter") { e.preventDefault(); go(_i + 1); }
    else if (e.key === "ArrowLeft") { e.preventDefault(); go(_i - 1); }
  }

  function open(topic) {
    const g = GUIDES[topic]; if (!g) return;
    if (_el) close();
    _i = 0; _steps = g.steps; _brand = g.brand;
    const ov = document.createElement("div");
    ov.className = "at-overlay";
    ov.innerHTML = `<div class="at-modal" role="dialog" aria-label="${_brand.replace(/<[^>]*>/g, "").trim()}"></div>`;
    ov.addEventListener("click", (e) => {
      if (e.target === ov) { close(); return; }
      const dn = e.target.closest && e.target.closest("[data-pg-dot]");
      if (dn) { go(+dn.dataset.pgDot); return; }
      const node = e.target.closest && e.target.closest("[data-pg]");
      if (!node) return;
      const a = node.dataset.pg;
      if (a === "close") close();
      else if (a === "prev") go(_i - 1);
      else if (a === "next") go(_i + 1);
    });
    document.body.appendChild(ov);
    _el = ov;
    render();
    document.addEventListener("keydown", onKey, true);
  }

  function close() { if (_el) { _el.remove(); _el = null; } document.removeEventListener("keydown", onKey, true); }

  return { open };
})();
