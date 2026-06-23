"use strict";
/* 첫 실행 온보딩 — 현장의 의문 → 탐색 → 분석 → 근거 확보 4단계 가치흐름.
   순수 표현 UI. 수치는 단일 소스(window.CARDS)에서 계산. */
window.Onboarding = (function () {
  let _el = null, _onDone = null, _onFollow = null;

  // 공공누리 제4유형 마크 — 인라인 SVG(오프라인·망분리·확대해도 선명). BY=출처표시, NC=상업적이용금지, ND=변경금지
  function koglMark() { return window.koglMark4(); }

  function nums() {
    try {
      const C = (window.CARDS || []).filter(c => c.출처 !== "csd");
      const docs = new Set(C.map(c => c.srno)).size;
      const r = (n, u) => (Math.round(n / u) * u).toLocaleString("ko-KR");
      const rf = (n, u) => (Math.floor(n / u) * u).toLocaleString("ko-KR");
      // 기간 = 카드 50건 이상 '밀집 연도'의 최소~최대(데이터 확장 시 자동 갱신 — '최근 5년' 고정문구 대체)
      let span = "";
      try { const yc = {}; C.forEach(c => { const y = String(c.연도 || ""); if (/^\d{4}$/.test(y)) yc[y] = (yc[y] || 0) + 1; });
        const all = Object.keys(yc).sort(); const ys = [];
        for (let i = all.length - 1; i >= 0; i--) { const y = all[i];   // 최근부터 '연속 밀집(50건+)' 구간만 — 중간 공백 연도 과대표현 방지
          if (yc[y] >= 50 && (ys.length === 0 || +ys[0] - 1 === +y)) ys.unshift(y); else if (ys.length) break; }
        if (ys.length > 1) span = `${ys[0]}~${ys[ys.length - 1]}년 공개분을 중심으로 한 `; } catch (e2) {}
      // STEP2 예시(계약·조달 양정) 동적화 — 하드코딩 626건 대체(데이터 확장 시 자동 갱신)
      let cj = null;
      try { const cs = C.filter(c => (c.위반유형 || []).includes("계약·조달")); const N = cs.length;
        if (N >= 50) { const pct = k => Math.round(cs.filter(c => String(c.처분종류 || "").includes(k)).length * 100 / N);
          cj = { n: N.toLocaleString("ko-KR"), ju: pct("주의"), tong: pct("통보"), mun: pct("문책") }; } } catch (e3) {}
      return docs ? { doc: "약 " + r(docs, 10), card: rf(C.length, 100) + "여", span, cj } : { doc: "약 500", card: "3,900여", span: "", cj: null };
    } catch (e) { return { doc: "약 500", card: "3,900여", span: "", cj: null }; }
  }

  function open(opts) {
    if (_el) teardown();
    _onDone = (opts && typeof opts.onDone === "function") ? opts.onDone : null;
    _onFollow = (opts && typeof opts.onFollow === "function") ? opts.onFollow : null;
    const n = nums();
    const ov = document.createElement("div");
    ov.className = "oi-overlay";
    ov.innerHTML = `
      <div class="oi-modal" role="dialog" aria-label="시작 안내">
        <div class="oi-head">
          <div class="oi-brand">📚 화성 자체감사 길잡이</div>
          <div class="oi-title">현장의 막막함이 <b>근거 있는 감사</b>가 되기까지</div>
          <div class="oi-sub">${n.span || "최근 공개분을 중심으로 한 "}화성시 공개 자체감사 자료 <b>${n.doc}</b>건을 분석해 <b>${n.card}</b>장의 사례 카드로 분해 — 검색만 하면 실제 감사 사례의 착안점·선례·법령을 바로 확인합니다</div>
        </div>
        <div class="oi-pipe">
          <div class="oi-stage" style="--d:0s"><div class="oi-badge">STEP 1</div><div class="oi-icon">🤔</div><div class="oi-label">현장의 의문</div>
            <div class="oi-card"><div class="oi-q"><b>이 부서, 무엇부터 볼까?</b></div><div class="oi-q"><b>이 정황, 지적이 될까?</b></div><div class="oi-q"><b>이 처분, 주의가 맞나?</b></div></div>
            <div class="oi-cap">막막한 출발점</div></div>
          <div class="oi-arrow" style="--d:.35s"></div>
          <div class="oi-stage" style="--d:.5s"><div class="oi-badge">STEP 2 · 📊 분석</div><div class="oi-icon">⚖️</div><div class="oi-label">분포로 감 잡기</div>
            <div class="oi-card"><div style="font-weight:700;font-size:12.5px">계약·조달 양정 (${n.cj ? n.cj.n : "626"}건)</div><div class="oi-mini"><span class="seg-ju" style="width:${n.cj ? n.cj.ju : 42}%"></span><span class="seg-tong" style="width:${n.cj ? n.cj.tong : 34}%"></span><span class="seg-mun" style="width:${n.cj ? n.cj.mun : 17}%"></span></div><div style="font-size:12px;color:var(--muted)">주의 ${n.cj ? n.cj.ju : 42}% · 통보 ${n.cj ? n.cj.tong : 34}% · 문책 ${n.cj ? n.cj.mun : 17}%</div><div style="font-size:12.5px;margin-top:5px">→ 단순과실·초범이면 <b>주의가 정합</b></div></div>
            <div class="oi-cap">주제로 찾기 · 사례로 점검하기 · 적발 관계망</div></div>
          <div class="oi-arrow" style="--d:.85s"></div>
          <div class="oi-stage" style="--d:1s"><div class="oi-badge">STEP 3 · 📂 탐색</div><div class="oi-icon">🔎</div><div class="oi-label">유사 선례 확인</div>
            <div class="oi-card"><div style="font-weight:700;font-size:13px;margin-bottom:4px">계약·조달</div><div style="font-size:13px;margin-bottom:4px">분할 수의계약 부적정</div><div style="display:flex;gap:5px;align-items:center"><span class="disp ju">주의요구</span><span class="yr">2024</span></div><div style="display:flex;gap:5px;align-items:center;margin-top:4px"><span class="disp mun">문책요구</span><span class="yr">2023</span></div></div>
            <div class="oi-cap">분야→위반유형으로 개별 선례</div></div>
          <div class="oi-arrow" style="--d:1.35s"></div>
          <div class="oi-stage" style="--d:1.5s"><div class="oi-badge">STEP 4</div><div class="oi-icon">📌</div><div class="oi-label">근거 확보</div>
            <div class="oi-card"><div style="font-weight:700;font-size:12.5px;margin-bottom:5px">위반 법령</div><span class="pill">지방계약법 §9</span><span class="pill">시행령 §25</span><div style="font-weight:700;font-size:12.5px;margin:6px 0 4px">근거 페이지</div><span class="pill pg">p.4</span><span class="pill pg">p.7</span></div>
            <div class="oi-cap">감사계획·처분요구서에 그대로</div></div>
        </div>
        <div class="oi-companion">📚 <b>감사 길잡이</b>는 감사계획 수립·현장 점검·양정 판단·처분요구서 작성까지, <b>막막한 출발점을 실제 선례와 근거</b>로 채워 줍니다.<span class="oi-mission">여러 해에 걸쳐 공개된 화성시 자체감사 기록을 한자리에 모아 검색·비교할 수 있게 정리한 자료입니다.</span></div>
        <div class="trust">
          <div class="trust-mark"><span class="hs-bi-wrap"><img class="hs-bi" src="hs_bi.png" alt="화성특례시" /></span></div>
          🛡️ <b>본 자료는 화성시가 공개한 자체감사 자료를 바탕으로 제작되었습니다.</b> · 100% 로컬 처리 · 외부 전송 없음<br><span style="font-size:12.5px;color:#5a6b7d">화성시 자체감사 공개자료 · 원문은 <b>화성시 감사 자료</b>에서 확인</span></div>
        <div class="oi-by">🏛 <b>화성특례시 감사관</b> 제작</div>
        <div class="oi-cta"><button class="oi-skip" data-oi="skip" type="button">건너뛰기</button><button class="oi-start" data-oi="follow" type="button">✍️ 사례로 따라 하기 →</button></div>
        <div class="oi-hint">Space · → 다음 · Esc 건너뛰기 · 도움말에서 다시 보기</div>
      </div>`;
    ov.addEventListener("click", (e) => {
      const node = e.target && e.target.closest && e.target.closest("[data-oi]");
      const act = node && node.dataset.oi;
      if (act === "follow") { const f = _onFollow; finish(); if (f) setTimeout(f, 80); return; }
      if (node || e.target === ov) finish();
    });
    document.body.appendChild(ov);
    _el = ov;
    document.addEventListener("keydown", onKey, true);
  }
  function onKey(e) {
    if (!_el) return;
    if (["Escape", " ", "Enter", "ArrowRight"].includes(e.key)) { e.preventDefault(); finish(); }
  }
  function finish() { const cb = _onDone; _onDone = null; teardown(); if (cb) { try { cb(); } catch (_) {} } }
  function teardown() { if (_el) { _el.remove(); _el = null; } document.removeEventListener("keydown", onKey, true); }
  return { open };
})();
