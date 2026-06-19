"use strict";
/* 📝 메모 — 현장 의견·착안점을 저장하는 노트(이 PC에만·localStorage·망분리).
   목록형: 제목(첫 줄)·미리보기·날짜로 관리. 클릭하면 펼쳐서 편집(자동저장). '비슷한 사례 찾기'는 보조 기능. */
window.Memo = (function () {
  const KEY = "memos";
  let editId = null;                      // 현재 펼쳐 편집 중인 메모 id
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, m => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[m])); }
  function uid() { return "m" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
  function save(a) { try { localStorage.setItem(KEY, JSON.stringify(a)); } catch (e) {} }
  function load() {
    let a; try { a = JSON.parse(localStorage.getItem(KEY) || "[]"); } catch (e) { return []; }
    if (!Array.isArray(a)) return [];
    let chg = false;                       // 구버전 {text} → {id,text,ts} 마이그레이션
    a.forEach(m => { if (!m.id) { m.id = uid(); chg = true; } if (!m.ts) { m.ts = Date.now(); chg = true; } });
    if (chg) save(a);
    return a;
  }
  function fmtDate(ts) { try { const d = new Date(ts), p = n => String(n).padStart(2, "0"); return `${d.getFullYear()}.${p(d.getMonth() + 1)}.${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`; } catch (e) { return ""; } }
  function lines(m) { return (m.text || "").split(/\n/).map(s => s.trim()).filter(Boolean); }
  function titleOf(m) { const l = lines(m); const t = l[0] || ""; return t ? (t.length > 32 ? t.slice(0, 32) + "…" : t) : "(제목 없는 메모)"; }
  function previewOf(m) { const l = lines(m); return l.slice(1).join(" ").slice(0, 64); }

  function render() {
    const a = load(), list = document.getElementById("memoList");
    if (!list) return;
    if (!a.length) {
      list.innerHTML = `<div class="memo-empty">저장된 메모가 없습니다.<br><b>＋ 새 메모</b>로 현장 의견·착안점을 적어 두세요.<div class="memo-emptysub">메모는 이 기기에만 저장됩니다(외부 전송 없음).</div></div>`;
      return;
    }
    list.innerHTML = `<div class="memo-cnt">저장된 메모 <b>${a.length}</b>개</div>` + a.map(m => {
      if (m.id === editId) {
        return `<div class="memo-item editing" data-id="${m.id}">
          <textarea class="memo-ta" data-id="${m.id}" rows="5" placeholder="첫 줄은 제목이 됩니다.&#10;현장 의견·착안점·메모를 자유롭게 적어 두세요…">${esc(m.text || "")}</textarea>
          <div class="memo-savedhint" data-id="${m.id}">✓ 자동 저장됨</div>
          <div class="memo-actions">
            <button class="memo-done" data-id="${m.id}">✓ 저장·접기</button>
            <button class="memo-find" data-id="${m.id}" title="이 메모와 비슷한 감사사례 찾기">🔎 비슷한 사례</button>
            <button class="memo-del" data-id="${m.id}" title="이 메모 삭제">🗑</button>
          </div></div>`;
      }
      return `<div class="memo-card" data-id="${m.id}">
        <button class="memo-cdel" data-id="${m.id}" title="이 메모 삭제">🗑</button>
        <div class="memo-ct">${esc(titleOf(m))}</div>
        ${previewOf(m) ? `<div class="memo-cp">${esc(previewOf(m))}</div>` : ""}
        <div class="memo-cd">🕘 ${fmtDate(m.ts)}</div>
      </div>`;
    }).join("");

    list.querySelectorAll(".memo-card").forEach(el => el.onclick = () => {
      prune(el.dataset.id);                 // 빈 메모 정리(단, 지금 여는 카드는 보존)
      editId = el.dataset.id; render();
      const ta = list.querySelector(".memo-ta"); if (ta) { ta.focus(); try { ta.setSelectionRange(ta.value.length, ta.value.length); } catch (e) {} }
    });
    list.querySelectorAll(".memo-cdel").forEach(b => b.onclick = (e) => {
      e.stopPropagation();                  // 카드 펼침 막고 삭제만
      if (!window.confirm("이 메모를 삭제할까요?")) return;
      const x = load().filter(o => o.id !== b.dataset.id); save(x);
      if (editId === b.dataset.id) editId = null; render();
    });
    list.querySelectorAll(".memo-ta").forEach(ta => ta.oninput = () => {
      const x = load(), m = x.find(o => o.id === ta.dataset.id);
      if (m) { m.text = ta.value; m.ts = Date.now(); save(x); }
      const h = list.querySelector(`.memo-savedhint[data-id="${ta.dataset.id}"]`); if (h) { h.textContent = "✓ 자동 저장됨 · " + fmtDate(Date.now()); }
    });
    list.querySelectorAll(".memo-done").forEach(b => b.onclick = () => { editId = null; prune(); render(); });
    list.querySelectorAll(".memo-find").forEach(b => b.onclick = () => {
      const m = load().find(o => o.id === b.dataset.id), t = (m && m.text || "").trim();
      if (t && window.__openCbr) { window.__openCbr(t); close(); }
    });
    list.querySelectorAll(".memo-del").forEach(b => b.onclick = () => {
      if (!window.confirm("이 메모를 삭제할까요?")) return;
      const x = load().filter(o => o.id !== b.dataset.id); save(x);
      if (editId === b.dataset.id) editId = null; render();
    });
  }

  function add(text) {
    const a = load(), id = uid();
    a.unshift({ id, text: text || "", ts: Date.now() }); save(a);
    editId = id; render();
    const ta = document.querySelector(".memo-ta"); if (ta) { ta.focus(); try { ta.setSelectionRange(ta.value.length, ta.value.length); } catch (e) {} }
  }
  // 빈(내용 없는) 메모 자동 정리 — '제목 없는 메모'가 쌓이지 않게. keepId는 보존(지금 여는/만든 메모).
  function prune(keepId) {
    const x = load(), y = x.filter(m => (m.text || "").trim() !== "" || m.id === keepId);
    if (y.length !== x.length) save(y);
    return y;
  }
  function open() { const p = document.getElementById("memoPanel"); if (!p) return; p.classList.add("on"); document.getElementById("memoFab").classList.add("hide"); render(); }
  function close() { const p = document.getElementById("memoPanel"); if (!p) return; prune(); editId = null; p.classList.remove("on"); document.getElementById("memoFab").classList.remove("hide"); }
  function addCase(c) { if (!c) return; open(); add(`${c.제목 || "사례"}\n(화성시 사례 · 순번 ${c.srno})\n→ 내 의견: `); }
  function init() {
    const fab = document.getElementById("memoFab"); if (fab) fab.onclick = open;
    const x = document.getElementById("memoClose"); if (x) x.onclick = close;
    const ad = document.getElementById("memoAdd"); if (ad) ad.onclick = () => add("");
  }
  return { init, open, addCase, add };   // add: 점검표 등 외부에서 텍스트 메모 추가용(2026-06-13)
})();
