"use strict";
/* 셸 — 탭(탐색/분석/내 사례함)·넓은 사례 팝업·법령연동 설정·정보·온보딩/투어. */
(function () {
  window.Digest.init();
  window.Dashboard.init();

  // ----- 탭 -----
  const views = { digest: document.getElementById("view-digest"), dash: document.getElementById("view-dash"), keep: document.getElementById("view-keep") };
  const tabs = { digest: document.getElementById("tabDigest"), dash: document.getElementById("tabDash"), keep: document.getElementById("tabKeep") };
  const brandSub = document.getElementById("brandSub"), search = document.querySelector(".search input");
  const SUB = { digest: "· 사례 탐색", dash: "· 분석", keep: "· 내 사례함" };
  let _curView = "dash";
  function show(v) {
    _curView = v;
    document.documentElement.setAttribute("data-view", v);   // CSS에서 탭별 헤더 조정용(탐색탭=검색바 확장)
    Object.keys(views).forEach(k => { views[k].classList.toggle("on", k === v); tabs[k].classList.toggle("on", k === v); tabs[k].setAttribute("aria-selected", k === v ? "true" : "false"); });
    brandSub.textContent = SUB[v] || "";
    search.style.visibility = (v === "digest") ? "visible" : "hidden";
    const _hm = document.getElementById("helpMenu"); if (_hm) _hm.classList.remove("on");
    if (v === "keep") window.Digest.renderKeepList();
    if (v === "digest" && window.Digest && window.Digest.fitFieldNames) requestAnimationFrame(() => window.Digest.fitFieldNames());
  }
  Object.keys(tabs).forEach(k => tabs[k].onclick = () => show(k));
  // KRDS 태그 접근성: 칩(span)을 키보드(Enter/Space)로 실행. role=button·tabindex는 빌더에서 부여
  document.addEventListener("keydown", e => {
    // ── ESC = 모달 닫기(우선) → 데스크톱 상세 슬라이드오버 닫기(P1 2영역) ──
    if (e.key === "Escape") {
      const _dn = document.getElementById("devNote"); if (_dn && _dn.classList.contains("on")) { _dn.classList.remove("on"); e.preventDefault(); return; }
      const _cm = document.getElementById("conceptModal"); if (_cm && _cm.classList.contains("on")) { _cm.classList.remove("on"); e.preventDefault(); return; }
      const D = window.Digest;
      if (D && D.isModalOpen && D.isModalOpen()) { D.closeCaseModal(); e.preventDefault(); return; }
      if (document.body.classList.contains("mob-detail") && !window.matchMedia("(max-width:768px)").matches) {
        document.body.classList.remove("mob-detail"); e.preventDefault(); return;   // 데스크톱: 슬라이드오버 닫기(모바일은 시스템 back 사용)
      }
    }
    // ── ↑↓(또는 J/K) = 사례 목록 순회(피로 S3) — 탐색 탭·입력/오버레이 아님일 때 ──
    if (!e.ctrlKey && !e.metaKey && !e.altKey && !e.shiftKey && (e.code === "ArrowDown" || e.code === "ArrowUp" || e.code === "KeyJ" || e.code === "KeyK")) {
      const t = e.target;
      const inField = t && (/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || t.isContentEditable);
      const dv = document.getElementById("view-digest");
      const modalOn = document.getElementById("caseModal") && document.getElementById("caseModal").classList.contains("on");
      if (!inField && !modalOn && dv && dv.classList.contains("on") && window.Digest && window.Digest.navList) {
        e.preventDefault();
        window.Digest.navList((e.code === "ArrowDown" || e.code === "KeyJ") ? 1 : -1);
        return;
      }
    }
    // ── 사례 단축키: S=내 사례함 담기 · W=넓게보기(모달 열려있으면 닫기). 단일 물리키(KeyS/KeyW) ──
    if (!e.ctrlKey && !e.metaKey && !e.altKey && !e.shiftKey && (e.code === "KeyS" || e.code === "KeyW")) {
      const t = e.target;
      const inField = t && (/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || t.isContentEditable);
      const isOpen = id => { const el = document.getElementById(id); return !!(el && el.classList.contains("on")); };
      // 다른 오버레이(법령·정보·설정·도움말·메모·투어·가이드·주제팝오버)가 떠 있으면 사례 단축키 비활성
      const blocked = isOpen("lawModal") || isOpen("aboutModal") || isOpen("setPanel") || isOpen("helpMenu")
        || isOpen("memoPanel") || isOpen("tourMask") || !!document.querySelector(".at-overlay")
        || (document.getElementById("pickPop") && !document.getElementById("pickPop").hidden);
      const D = window.Digest;
      if (!inField && !blocked && D && D.getSelId) {
        if (e.code === "KeyS") {
          const r = D.toggleKeepSel();
          D.toast(r === null ? "먼저 사례를 클릭해 선택하세요" : (r ? "★ 내 사례함에 담았습니다" : "☆ 사례함에서 뺐습니다"));
        } else {   // KeyW
          if (D.isModalOpen()) D.closeCaseModal();
          else if (D.getSelId() == null) D.toast("먼저 사례를 클릭해 선택하세요");
          else D.openCaseModalSel();
        }
        e.preventDefault(); return;
      }
    }
    if ((e.key === "Enter" || e.key === " ") && e.target.matches && e.target.matches(".fchip,.pchip,.dchip,.vchip,.fldbtn,.crumb")) {
      e.preventDefault(); e.target.click();
    }
  });
  // 분석 드릴/내 사례함 → 넓은 사례 팝업(탭 전환 없음)
  window.__openCase = function (id) { try { window.Digest.openCaseModal(id); } catch (e) {} };

  // ----- 정보 -----
  const aboutModal = document.getElementById("aboutModal");
  function openAbout() { aboutModal.classList.add("on"); }
  document.getElementById("aboutClose").onclick = () => aboutModal.classList.remove("on");
  aboutModal.addEventListener("click", e => { if (e.target === aboutModal) aboutModal.classList.remove("on"); });
  if (window.api && window.api.onAboutOpen) window.api.onAboutOpen(openAbout);

  // ----- 「이 화면 사용법」 버튼 1회 주목 유도(통합: 온보딩/따라하기 종료 직후·평생 1회) -----
  let _hintT = null;
  function hintScreenHelpOnce() {
    try { if (localStorage.getItem("screenhelp_hinted")) return; } catch (e) {}
    const view = document.getElementById("view-" + _curView) || document.querySelector(".view.on") || document;
    const btn = view.querySelector(".screenhelp");
    if (!btn) return;
    try { localStorage.setItem("screenhelp_hinted", "1"); } catch (e) {}
    btn.classList.add("pulse-hint");
    const stop = () => { btn.classList.remove("pulse-hint"); btn.removeEventListener("click", stop); };
    btn.addEventListener("click", stop);
    setTimeout(stop, 10000);
  }
  function scheduleHint(delay) { clearTimeout(_hintT); _hintT = setTimeout(hintScreenHelpOnce, delay || 350); }

  // ----- 사례로 따라 하기 (시나리오) -----
  function openFollow() { try { window.FollowAlong.open({ onClose: () => scheduleHint(250) }); } catch (e) { scheduleHint(250); } }
  if (window.api && window.api.onFollowStart) window.api.onFollowStart(openFollow);

  // ----- 플로팅 메모 + 메모로 사례찾기 -----
  try { window.Memo.init(); } catch (e) {}
  window.__openCbr = function (text) { show("dash"); const inp = document.getElementById("cbrInput"); if (inp) { inp.value = String(text || "").replace(/\s+/g, " ").trim().slice(0, 80); const b = document.getElementById("cbrBtn"); if (b) b.click(); inp.scrollIntoView({ block: "start" }); } };

  // ----- 설정(OC) -----
  const setPanel = document.getElementById("setPanel"), ocInput = document.getElementById("ocInput"), ocStat = document.getElementById("ocStat");
  // 웹(비설치)판 = window.api 부재(데스크톱은 preload가 주입). OC 연동(인앱 조문 조회·연결 확인) 미지원 안내.
  const IS_WEB = !(window.api && window.api.law);
  if (IS_WEB && setPanel && !document.getElementById("setWebNote")) {
    const w = document.createElement("div"); w.id = "setWebNote"; w.className = "setweb";
    w.innerHTML = `<svg class="ic" aria-hidden="true"><use href="#ic-globe"></use></svg> <b>웹(비설치)판 안내</b> — 이 버전은 브라우저 보안정책상 <b>OC 연동(인앱 조문 조회·연결 확인)이 지원되지 않습니다</b>. 법령을 누르면 <b>국가법령정보센터</b>로 이동합니다. 인앱 조문 팝업은 <b>설치판</b>에서 사용하세요.`;
    const p = setPanel.querySelector("p"); if (p) p.insertAdjacentElement("afterend", w); else setPanel.appendChild(w);
  }
  function setStat(cls, txt) { ocStat.className = "setstat " + cls; ocStat.textContent = txt; }
  function refreshStat(oc) {
    if (IS_WEB) { setStat("off", "웹판 — 인앱 조문 조회 미지원 · 법령 클릭 시 국가법령정보센터로 이동"); return; }
    oc ? setStat("onc", "OC 설정됨 — 위반법령에서 조문을 팝업으로 봅니다.") : setStat("off", "OC 미설정 — 법령 클릭 시 국가법령정보센터로 이동합니다.");
  }
  async function loadOC() { try { const s = await window.api.settings.get(); const oc = (s && s.lawApiOc) || ""; window.Digest.setOC(oc); ocInput.value = oc; refreshStat(oc); } catch (e) { refreshStat(""); } }
  document.getElementById("setBtn").onclick = () => { const hm = document.getElementById("helpMenu"); if (hm) hm.classList.remove("on"); const dn = document.getElementById("devNote"); if (dn) dn.classList.remove("on"); setPanel.classList.toggle("on"); if (setPanel.classList.contains("on")) loadOC(); };
  document.getElementById("ocSave").onclick = async () => { const oc = ocInput.value.trim(); try { await window.api.settings.set({ lawApiOc: oc }); } catch (e) {} window.Digest.setOC(oc); refreshStat(oc); };
  document.getElementById("ocClear").onclick = async () => { try { await window.api.settings.set({ lawApiOc: "" }); } catch (e) {} ocInput.value = ""; window.Digest.setOC(""); refreshStat(""); };
  document.getElementById("ocTest").onclick = async () => {
    const oc = ocInput.value.trim();
    if (!oc) { setStat("off", "OC를 입력한 뒤 확인하세요."); return; }
    setStat("off", "법제처에 연결 확인 중…");
    try { const r = await window.api.law.testOc(oc); r && r.ok ? setStat("onc", "✓ OC 유효 — 연결 성공") : setStat("err", "✕ " + ((r && r.error) || "확인 실패") + " (OC·발급기관 IP 확인)"); }
    catch (e) { setStat("err", "✕ 연결 오류"); }
  };
  // 위반사실 핵심구 볼드 토글(E15)
  const flowChk = document.getElementById("flowChk");
  if (flowChk) { try { flowChk.checked = localStorage.getItem("flow_key") !== "0"; } catch (e) { flowChk.checked = true; } flowChk.onchange = () => { try { localStorage.setItem("flow_key", flowChk.checked ? "1" : "0"); } catch (e) {} try { window.Digest.refreshDetail(); } catch (e) {} }; }
  const boldChk = document.getElementById("boldChk");
  if (boldChk) { try { boldChk.checked = localStorage.getItem("bold_key") !== "0"; } catch (e) { boldChk.checked = true; } boldChk.onchange = () => { try { localStorage.setItem("bold_key", boldChk.checked ? "1" : "0"); } catch (e) {} try { window.Digest.refreshDetail(); } catch (e) {} }; }
  // 목록 호버 미리보기 토글 — 설정(hoverChk) + 목록 안내 바(listHintToggle) 양방향 동기화
  const _hovOn = () => { try { return localStorage.getItem("hover_key") !== "0"; } catch (e) { return true; } };
  const _syncHov = () => { const t = document.getElementById("listHintToggle"); if (t) { t.classList.toggle("on", _hovOn()); t.setAttribute("aria-checked", _hovOn() ? "true" : "false"); } const hc = document.getElementById("hoverChk"); if (hc) hc.checked = _hovOn(); };
  const _setHov = on => { try { localStorage.setItem("hover_key", on ? "1" : "0"); } catch (e) {} _syncHov(); };
  { const hc = document.getElementById("hoverChk"); if (hc) hc.onchange = () => _setHov(hc.checked); }
  { const t = document.getElementById("listHintToggle"); if (t) t.onclick = () => _setHov(!_hovOn()); }
  _syncHov();

  // 다크 모드 토글(이 PC에만 저장 · head 인라인 스크립트가 초기 적용)
  const darkChk = document.getElementById("darkChk");
  if (darkChk) {
    try { darkChk.checked = document.documentElement.getAttribute("data-theme") === "dark"; } catch (e) {}   // 실제 적용 테마 반영(디폴트 다크 포함)
    darkChk.onchange = () => {
      const on = darkChk.checked;
      document.documentElement.setAttribute("data-theme", on ? "dark" : "light");
      try { localStorage.setItem("theme_key", on ? "dark" : "light"); } catch (e) {}
    };
  }

  document.addEventListener("click", e => { if (setPanel.classList.contains("on") && !setPanel.contains(e.target) && e.target.id !== "setBtn") setPanel.classList.remove("on"); });

  // ----- 통합 도움말 (헤더 드롭다운 + 각 화면 「이 화면 사용법」) -----
  const helpMenu = document.getElementById("helpMenu");
  function runHelp(topic) {
    if (helpMenu) helpMenu.classList.remove("on");
    try {
      if (topic === "dash" || topic === "digest" || topic === "keep") window.ScreenGuide.start(topic);   // 화면 사용법 = 하이라이트 스포트라이트
      else if (topic === "follow") openFollow();
      else if (topic === "intro") openIntro();
      else if (topic === "about") openAbout();
    } catch (e) {}
  }
  document.getElementById("helpBtn").onclick = (e) => {
    e.stopPropagation();
    setPanel.classList.remove("on");
    const dn = document.getElementById("devNote"); if (dn) dn.classList.remove("on");
    helpMenu.classList.toggle("on");
  };
  helpMenu.addEventListener("click", (e) => { const b = e.target.closest("[data-help]"); if (b) runHelp(b.dataset.help); });
  document.querySelectorAll(".screenhelp[data-help]").forEach(b => b.onclick = () => runHelp(b.dataset.help));
  document.addEventListener("click", e => { if (helpMenu.classList.contains("on") && !helpMenu.contains(e.target) && e.target.id !== "helpBtn") helpMenu.classList.remove("on"); });

  // ----- 개발자 노트 (헤더 → 알려진 문제점 팝업) -----
  const devNote = document.getElementById("devNote"), devNoteBtn = document.getElementById("devNoteBtn");
  if (devNote && devNoteBtn) {
    devNoteBtn.onclick = (e) => { e.stopPropagation(); setPanel.classList.remove("on"); helpMenu.classList.remove("on"); devNote.classList.add("on"); };
    const dnx = document.getElementById("devNoteClose"); if (dnx) dnx.onclick = () => devNote.classList.remove("on");
    devNote.addEventListener("click", e => { if (e.target === devNote) devNote.classList.remove("on"); });
  }

  // ----- 분류 기준 한눈에(개념 정립 모달) — 도움말 / 주제로찾기 ⓘ에서 열림 -----
  const conceptModal = document.getElementById("conceptModal");
  if (conceptModal) {
    const ccx = document.getElementById("conceptClose"); if (ccx) ccx.onclick = () => conceptModal.classList.remove("on");
    conceptModal.addEventListener("click", e => { if (e.target === conceptModal) conceptModal.classList.remove("on"); });
    document.addEventListener("click", e => { if (e.target.closest("[data-concept]")) { e.preventDefault(); helpMenu.classList.remove("on"); conceptModal.classList.add("on"); } });
  }

  // ----- 온보딩 -----
  function openIntro() { window.Onboarding.open({ onFollow: () => { clearTimeout(_hintT); openFollow(); }, onDone: () => scheduleHint(400) }); }
  try {
    if (!localStorage.getItem("oi_seen")) { openIntro(); localStorage.setItem("oi_seen", "1"); }
    else { scheduleHint(700); }   // 이미 온보딩 본 사용자도 미힌트면 1회만
  } catch (e) {}
  if (window.api && window.api.onIntroReopen) window.api.onIntroReopen(openIntro);

  loadOC();
  // 모바일 1줄 헤더: 줄어든 검색바에 맞춰 placeholder 축약
  try { if (window.matchMedia("(max-width:768px)").matches) { const q0 = document.getElementById("q"); if (q0) q0.placeholder = "사례 검색…"; } } catch (e) {}
  // PWA 오프라인 캐싱(P4) — 웹(https/localhost) 한정. 데스크톱(file://)·미지원 환경은 자동 미작동.
  try {
    if ("serviceWorker" in navigator && /^https?:$/.test(location.protocol)) {
      navigator.serviceWorker.register("sw.js");
      // 배포 직후 구캐시 JS로 뜬 화면(버튼 무반응 등 혼합 버전) 차단: 새 SW가 제어권 잡으면 1회 자동 새로고침
      const hadCtrl = !!navigator.serviceWorker.controller;
      let _swR = false;
      navigator.serviceWorker.addEventListener("controllerchange", () => { if (hadCtrl && !_swR) { _swR = true; location.reload(); } });
    }
  } catch (e) {}
  show("dash");   // 첫 실행 = 분석(현황) — 워크플로 순서(분석→탐색→내 사례함)
})();
