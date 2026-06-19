"use strict";
/* 출처 표기 — 화성시 자체감사 공개자료(처분요구서 등) 기반. 화성판은 감사원 공공누리 제4유형 마크를
   쓰지 않고 중립 텍스트로 표기(화성시 자료의 정확한 라이선스 확정 전까지 과대표기 방지·망분리 유지). */
window.koglMark4 = function () {
  return '<span class="kogl-card kogl-text">출처: 화성시 자체감사 공개자료 · 개인 업무 참고용</span>';
};
document.addEventListener("DOMContentLoaded", function () {
  try { document.querySelectorAll("[data-kogl4]").forEach(el => { el.innerHTML = window.koglMark4(); }); } catch (e) {}
});
