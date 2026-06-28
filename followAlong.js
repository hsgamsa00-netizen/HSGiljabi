"use strict";
/* 사례로 따라 하기 — OO주무관이 '수의계약 분할 발주'를 감사하며 프로그램 전 기능을 따라가는 시나리오.
   생동감(v0.7.7): 고민·행동·발견 3박자 + 우측 화면 미리보기(2단 확대 팝업).
   v0.7.8: 우측 컷별 라벨(rlab) · 반론·검증 컷은 실제 카드에서 선례를 라이브 인출(rebutMock) · 2컷 "이 프로그램".
   미리 만든 단계 팝업 · .at-* 스타일·Space 네비 · 실제 작업 영향 없음 · LLM 0. */
window.FollowAlong = (function () {
  let _el = null, _i = 0, _onClose = null;
  const esc = s => String(s == null ? "" : s).replace(/[<>&]/g, m => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" }[m]));

  // 반론·검증 컷: 실제 카드(계약·조달)에서 반대 선례·되묻기·비평을 1~2개씩 라이브 인출
  function rebutMock() {
    try {
      const C = (window.CARDS || []).filter(c => c.출처 !== "csd");
      const base = C.filter(c => (c.위반유형 || []).includes("계약·조달"));
      if (!base.length) throw 0;
      const ON = /수의계약|분할|견적|낙찰|입찰참가|예정가격|특혜/;
      const core = /수의계약|분할/;
      const LIGHT = /주의|통보|시정/;
      const onT = base.filter(c => ON.test((c.제목 || "") + (c.요지 || "")));
      const tcards = base.filter(c => core.test(c.제목 || ""));
      // 다중관점 — 같은 유형의 경한 처분(반대) 실제 선례 2
      const dev = onT.filter(c => LIGHT.test(c.처분종류 || "")).sort((a, b) => (core.test(b.제목 || "") ? 1 : 0) - (core.test(a.제목 || "") ? 1 : 0));
      const devH = (dev.length ? dev : onT).slice(0, 2).map(c =>
        `<div class="fri">· ${esc((c.제목 || "").slice(0, 28))} <em>[${esc(c.처분종류 || "")}]</em></div>`).join("") || '<div class="fri muted">—</div>';
      // 되묻기 — 수의계약 맥락 적신호 1 + 착안점 1
      const rf = tcards.map(c => String(c.적신호 || "").trim()).filter(r => core.test(r))[0] || "";
      let ak = ""; for (const c of tcards) { const a = (c.착안점 || []).find(x => ON.test(String(x))); if (a) { ak = String(a); break; } }
      const askH = [
        ak ? `<div class="fri">· ${esc(ak.slice(0, 44))}${ak.length > 44 ? "…" : ""} <em>(선례 착안점)</em></div>` : "",
        rf ? `<div class="fri">· ${esc(rf.slice(0, 44))}${rf.length > 44 ? "…" : ""} <em>(선례 적신호)</em></div>` : ""
      ].filter(Boolean).join("") || '<div class="fri muted">—</div>';
      // 비평 — 동반 위반유형(coOccur) 2
      const co = {}; base.forEach(c => (c.위반유형 || []).forEach(v => { if (v !== "계약·조달" && !String(v).startsWith("(")) co[v] = (co[v] || 0) + 1; }));
      const coTop = Object.entries(co).sort((a, b) => b[1] - a[1]).slice(0, 2).map(([v, n]) => `${esc(v)} ${Math.round(n / base.length * 100)}%`).join(" · ");
      return `<div class="fa-real">
        <div class="frh dev"><svg class="ic" aria-hidden="true"><use href="#ic-messages"></use></svg> 다중관점 — 반대 선례로 상대 반론 미리 점검 (악마의 대변인 — 반대편 자처·약점 점검)</div>${devH}
        <div class="frh ask"><svg class="ic" aria-hidden="true"><use href="#ic-help-circle"></use></svg> 되묻기 — 선례가 짚어준 확인 항목</div>${askH}
        <div class="frh crit"><svg class="ic" aria-hidden="true"><use href="#ic-square-pen"></use></svg> 비평 — 동반 위반(coOccur)</div><div class="fri">· ${coTop || "—"}</div>
        <div class="frc">계약·조달 ${base.length}건에서 실시간 인출 · 데이터 인용 환각 0</div></div>`;
    } catch (e) {
      return `<div class="at-row"><span class="at-tag dev"><svg class="ic" aria-hidden="true"><use href="#ic-messages"></use></svg> 면책 선례</span><span class="at-tag ask"><svg class="ic" aria-hidden="true"><use href="#ic-help-circle"></use></svg> 결재선?</span><span class="at-tag crit"><svg class="ic" aria-hidden="true"><use href="#ic-square-pen"></use></svg> 검사·감독?</span></div><div class="at-mc">반대 방향 선례·되묻기·비평 (실데이터 인출)</div>`;
    }
  }

  const STEPS = [
    {
      t: `<svg class="ic" aria-hidden="true"><use href="#ic-folder"></use></svg> 막막한 출발 — ‘어디서부터 보지?’`, rlab: `<svg class="ic" aria-hidden="true"><use href="#ic-mail"></use></svg> 받은 제보`,
      q: "□□기관 <b>계약업무 감사</b>를 맡았다. ‘<b>수의계약 분할 발주</b>’ 제보가 있는데, 무엇부터 확인해야 할지 막막하다.",
      a: "감으로 들이대기 전에, <b>지적이 되는지·처분은 어디까지</b>인지부터 데이터로 가늠해 보기로 한다.",
      r: "막연한 불안을 ‘<b>확인할 질문</b>’으로 바꾸는 게 시작. 감사 길잡이를 연다.",
      mock: `<div class="at-mc"><svg class="ic" aria-hidden="true"><use href="#ic-mail"></use></svg> 제보: “5천만 원 공사를 <b>2천만 원씩 쪼개</b> 수의계약?” — 지적이 될까? 처분은?</div>`
    },
    {
      t: `<svg class="ic" aria-hidden="true"><use href="#ic-book"></use></svg> 감사 길잡이를 열다`, rlab: `<svg class="ic" aria-hidden="true"><use href="#ic-monitor"></use></svg> 프로그램 화면`,
      q: "이 프로그램으로 뭘 할 수 있지?",
      a: "화성시가 <b>공개</b>한 자체감사 결과를 사례 카드로 정리 — <b>검색만으로</b> 실제 감사 사례의 착안점·선례·법령을 본다.",
      r: "검색·분석은 모두 <b>내 기기에서 처리</b>(외부 전송 없음). 상단 3탭 중 막막할 땐 <b>분석</b>부터.",
      mock: `<div class="at-row"><span class="at-pill on"><svg class="ic" aria-hidden="true"><use href="#ic-chart-bar"></use></svg> 분석</span><span class="at-pill"><svg class="ic" aria-hidden="true"><use href="#ic-folder"></use></svg> 사례 탐색</span><span class="at-pill"><svg class="ic" aria-hidden="true"><use href="#ic-star"></use></svg> 내 사례함</span></div><div class="at-mc">상단 3개 탭으로 움직입니다.</div>`
    },
    {
      t: `<svg class="ic" aria-hidden="true"><use href="#ic-chart-bar"></use></svg> ① 분석 · 현황 — 데이터로 감 잡기`, rlab: `<svg class="ic" aria-hidden="true"><use href="#ic-chart-bar"></use></svg> 분석 화면`,
      q: "이게 정말 지적거리인지, 처분은 <b>어디까지</b> 가야 하는지 감이 안 선다.",
      a: "분석 → 현황에서 관점을 ‘<b>지방자치단체</b>’로 바꿔 <b>계약·조달</b> 처분 분포·연도 추이를 본다.",
      r: "주의·통보가 대부분, 문책은 일부. “<b>무겁게 가려면 고의·반복 같은 근거가 필요하겠구나.</b>” 양정의 감이 잡힌다.",
      mock: `<div class="at-mini"><div class="at-mt">계약·조달 처분 분포 (지자체)</div><div class="at-mbar"><span class="s1" style="width:77%"></span><span class="s2" style="width:17%"></span></div><div class="at-mc">주의·통보 다수 · 문책 일부 — 양정 위치 파악</div><div class="at-bars" style="margin-top:8px"><span style="height:55%"></span><span style="height:72%"></span><span style="height:88%"></span><span style="height:100%"></span><span style="height:46%"></span></div><div class="at-mc">연도별 건수</div></div>`
    },
    {
      t: `<svg class="ic" aria-hidden="true"><use href="#ic-target"></use></svg> 착안점 찾기 — 내 사안을 넣다`, rlab: `<svg class="ic" aria-hidden="true"><use href="#ic-target"></use></svg> 착안점 결과`,
      q: "내 사안을 직접 넣으면 비슷한 선례가 나올까?",
      a: "분석 → 착안점 찾기에 ‘<b>수의계약 분할 발주</b>’라고 그대로 입력하고 [찾기].",
      r: "유사 <b>선례 다수</b> + 처분 분포 + 공통 착안점(분할 정황·동일업체·예정가격). “<b>이 셋을 현장에서 확인하면 되겠다.</b>”",
      mock: `<div class="at-input">수의계약 분할 발주<span class="at-cur">▏</span></div><div class="at-mc">유사 선례 다수 · 주의 다수 · 착안점: 분할 정황 · 동일업체 · 예정가격 · <svg class="ic" aria-hidden="true"><use href="#ic-flag"></use></svg> 적신호</div>`
    },
    {
      t: `<svg class="ic" aria-hidden="true"><use href="#ic-link"></use></svg> 적발 관계망 — 옆에서 같이 터지는 것`, rlab: `<svg class="ic" aria-hidden="true"><use href="#ic-link"></use></svg> 관계망 (수의계약 중심)`,
      q: "수의계약만 보면 끝일까? <b>같이 적발되는 게</b> 있지 않을까?",
      a: `착안점 찾기의 <b><svg class="ic" aria-hidden="true"><use href="#ic-link"></use></svg> 적발 관계망</b>을 ⤢ 크게 열고 ‘<b>수의계약</b>’ 노드를 누른다.`,
      r: `‘수의계약’은 ‘<b>입찰·낙찰</b>’·‘부정당·제재’와 자주 함께 적발. “<b>계약서만 보면 놓친다 — 낙찰 과정과 제재 이력까지 같이 보자.</b>” 마음에 든 착안점은 <svg class="ic" aria-hidden="true"><use href="#ic-square-pen"></use></svg> 메모에 담는다.`,
      mock: `<div class="at-mc" style="line-height:2">⬤ <b>수의계약</b> ═══ 입찰·낙찰 ─── 부정당·제재 ─ 용역계약</div><div class="at-mc">노드 클릭 → 대표 착안점·동반 주제 / 선 클릭 → 같이 적발된 실제 사례</div>`
    },
    {
      t: `<svg class="ic" aria-hidden="true"><use href="#ic-search"></use></svg> 반론·검증 — 반대편에서 한 번 더`, rlab: `<svg class="ic" aria-hidden="true"><use href="#ic-search"></use></svg> 반론·검증 (실제 선례)`, dyn: true,
      q: "내 판단이 <b>한쪽 면만</b> 본 건 아닐까? 나중에 <b>상대의 이의제기·반론</b>이 들어와도 버티려면 사실확인이 충분·객관적이어야 한다.",
      a: "착안점 결과 아래 <b>반론·검증</b>을 펼쳐, 반대 방향 선례와 <b>빠진 확인 항목</b>을 미리 점검한다.",
      r: "실제 선례·동반 점검 항목이 빠뜨린 사실확인을 짚어준다. <b>경중은 확인 결과에 따라 가중될 수도, 감경될 수도</b> — 결론이 한층 단단해진다.",
      mock: ``
    },
    {
      t: `<svg class="ic" aria-hidden="true"><use href="#ic-search"></use></svg> ② 사례 탐색 — 비슷한 선례를 직접`, rlab: `<svg class="ic" aria-hidden="true"><use href="#ic-search"></use></svg> 탐색 결과`,
      q: "통계 말고, 진짜 비슷한 사건의 처분요구서를 직접 보고 싶다.",
      a: "사례 탐색에서 분야 ‘<b>계약·조달</b>’, 검색 ‘수의계약 분할’. (‘<b>주제·표식</b>’에서 세부 주제 ‘수의계약’으로도 가능)",
      r: "분할 수의계약 부적정 사례가 줄줄이. “<b>우리 사안이랑 판박이네.</b>” 양정·문구를 참고한다.",
      mock: `<div class="at-input">수의계약 분할<span class="at-cur">▏</span></div><div class="at-mc">분야 계약·조달 + 검색 → 유사 사례 목록</div>`
    },
    {
      t: `<svg class="ic" aria-hidden="true"><use href="#ic-file-text"></use></svg> 사례 상세 — 근거를 손에`, rlab: `<svg class="ic" aria-hidden="true"><use href="#ic-file-text"></use></svg> 사례 상세`,
      q: "이 선례, 어떤 법령으로 무슨 처분을 했지?",
      a: "사례를 누르니 위반사실·근거법령·근거 페이지·착안점·적신호가 한눈에. 법령(<b>지방계약법 §9·시행령 §25</b>)을 누르면 조문이 바로.",
      r: "“<b>우리도 §25 위반 가능성 + 근거가 적힌 원문 쪽(p.4·p.7)</b>까지 짚으면 되겠다.” 처분요구서 뼈대가 잡힌다.",
      mock: `<div class="at-qs"><div><b>위반사실</b> — 분할 수의계약으로 경쟁 회피</div><div><b>근거</b> 지방계약법 시행령 §25 · <b>근거 페이지 p.4·p.7</b> <span class="muted">(처분요구서 원문 쪽)</span></div><div><svg class="ic" aria-hidden="true"><use href="#ic-flag"></use></svg> 동일 업체 반복</div></div>`
    },
    {
      t: `<svg class="ic" aria-hidden="true"><use href="#ic-star"></use></svg> ③ 담기 · <svg class="ic" aria-hidden="true"><use href="#ic-pencil"></use></svg> 메모 — 챙겨두기`, rlab: `<svg class="ic" aria-hidden="true"><use href="#ic-star"></use></svg> 챙긴 것`,
      q: "쓸 만한 선례를 다음에 또 찾으려면 번거로운데.",
      a: "선례를 <b>☆</b>로 <b>내 사례함</b>에 담고, 플로팅 메모에 현장 점검 포인트를 적는다 <span class=\"muted\">(개수 제한 없음 · 이 PC에만 저장)</span>.",
      r: "“<b>분할 시점·기안문 결재선·예정가격 산정 근거</b>” — 현장에서 확인할 목록이 완성된다.",
      mock: `<div class="at-mc">☆ 담은 선례 · <svg class="ic" aria-hidden="true"><use href="#ic-pencil"></use></svg> 메모: “분할 시점 · 기안문 결재선 · 예정가격 산정 근거 확인”</div>`
    },
    {
      t: `<svg class="ic" aria-hidden="true"><use href="#ic-circle-check"></use></svg> 도달 — 막막함이 근거가 되다`, rlab: `<svg class="ic" aria-hidden="true"><use href="#ic-clipboard-list"></use></svg> 최종 정리`,
      q: "막막했던 제보가 이제 어떻게 정리됐지?",
      a: "<b>지방계약법 §9·시행령 §25 위반 가능성 + 유사 선례 + 양정 근거 + 점검 질문</b>으로 묶는다.",
      r: "<b>막막함 → 근거 있는 감사.</b> 감사계획·처분요구서에 그대로. “이제 내 사안으로 직접 시작해 보자.”",
      mock: `<div class="at-mc"><b>§위반 가능성 + 선례 + 양정 근거 + 점검 질문</b> → 처분요구서에 그대로. · 원문·최종 판단은 화성시 감사 자료에서 확인.</div>`
    }
  ];

  function dots() { return STEPS.map((_, n) => `<span class="at-dot${n === _i ? " on" : ""}" data-fa-dot="${n}"></span>`).join(""); }

  function render() {
    const s = STEPS[_i], last = _i === STEPS.length - 1;
    const body = _el.querySelector(".at-modal");
    body.innerHTML = `
      <div class="at-head fa">
        <div class="at-brand"><svg class="ic" aria-hidden="true"><use href="#ic-pencil"></use></svg> 사례로 따라 하기 <span class="at-sub">‘수의계약 분할 발주’ 감사를 처음부터 끝까지</span></div>
        <button class="at-x" data-fa="close" type="button" aria-label="닫기">✕</button>
      </div>
      <div class="at-meta"><span class="at-count">${_i + 1} <i>/ ${STEPS.length}</i></span><span class="at-prog">${dots()}</span></div>
      <div class="fa-body">
        <div class="fa-left">
          <div class="at-title">${s.t}</div>
          <div class="beat q"><div class="bt"><svg class="ic" aria-hidden="true"><use href="#ic-message-circle"></use></svg> 고민</div><div class="bd">${s.q}</div></div>
          <div class="beat a"><div class="bt"><svg class="ic" aria-hidden="true"><use href="#ic-mouse"></use></svg> 행동</div><div class="bd">${s.a}</div></div>
          <div class="beat r"><div class="bt"><svg class="ic" aria-hidden="true"><use href="#ic-circle-check"></use></svg> 발견</div><div class="bd">${s.r}</div></div>
        </div>
        <div class="fa-right">
          <div class="fa-rlab">${s.rlab || "화면 미리보기"}</div>
          ${s.dyn ? rebutMock() : s.mock}
        </div>
      </div>
      <div class="at-foot">
        <button class="at-btn ghost" data-fa="prev" type="button" ${_i === 0 ? "disabled" : ""}>◀ 이전</button>
        <span class="at-hint">Space · → 다음 · ← 이전 · Esc 닫기</span>
        <button class="at-btn" data-fa="next" type="button">${last ? "닫기 ✓" : "다음 <b>Space</b> ▶"}</button>
      </div>`;
  }

  function go(n) { if (n < 0) n = 0; if (n >= STEPS.length) { close(); return; } _i = n; render(); }

  function onKey(e) {
    if (!_el) return;
    if (e.key === "Escape") { e.preventDefault(); close(); }
    else if (e.key === " " || e.key === "Spacebar" || e.key === "ArrowRight" || e.key === "Enter") { e.preventDefault(); go(_i + 1); }
    else if (e.key === "ArrowLeft") { e.preventDefault(); go(_i - 1); }
  }

  function open(opts) {
    if (_el) close();
    _onClose = (opts && typeof opts.onClose === "function") ? opts.onClose : null;
    _i = 0;
    const ov = document.createElement("div");
    ov.className = "at-overlay at-overlay-strong";
    ov.innerHTML = `<div class="at-modal fa-wide" role="dialog" aria-label="사례로 따라 하기"></div>`;
    ov.addEventListener("click", (e) => {
      if (e.target === ov) { close(); return; }
      const dn = e.target.closest && e.target.closest("[data-fa-dot]");
      if (dn) { go(+dn.dataset.faDot); return; }
      const node = e.target.closest && e.target.closest("[data-fa]");
      if (!node) return;
      const a = node.dataset.fa;
      if (a === "close") close();
      else if (a === "prev") go(_i - 1);
      else if (a === "next") go(_i + 1);
    });
    document.body.appendChild(ov);
    _el = ov;
    render();
    document.addEventListener("keydown", onKey, true);
  }

  function close() { const cb = _onClose; _onClose = null; if (_el) { _el.remove(); _el = null; } document.removeEventListener("keydown", onKey, true); if (cb) { try { cb(); } catch (_) {} } }

  return { open };
})();
