/**
 * auth.js — 카카오 로그인 프론트엔드 모듈
 * 카카오 SDK 초기화, 로그인/로그아웃, 세션 관리, UI 업데이트
 */
(function () {
    'use strict';

    const KAKAO_JS_KEY = '3aef04f942b09cd20db05332b7229edb';
    const REDIRECT_URI = 'https://saju-app.pages.dev/auth/kakao/callback';

    // ===== 세션 관리 =====
    function getSession() {
        try {
            const s = localStorage.getItem('sajuSession');
            return s ? JSON.parse(s) : null;
        } catch { return null; }
    }

    function isLoggedIn() {
        return !!getSession();
    }

    function getUser() {
        const s = getSession();
        return s ? s.user : null;
    }

    function getToken() {
        const s = getSession();
        return s ? s.token : null;
    }

    function logout() {
        localStorage.removeItem('sajuSession');
        updateAuthUI();
        // 크레딧도 로컬로 전환
        if (window.SajuCredits) window.SajuCredits.updateBadge();
    }

    // ===== 카카오 로그인 =====
    function login() {
        // 현재 페이지 기억
        localStorage.setItem('loginReturnTo', window.location.pathname);
        // 카카오 인증 페이지로 리다이렉트
        const url = `https://kauth.kakao.com/oauth/authorize?client_id=${KAKAO_JS_KEY}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&response_type=code`;
        window.location.href = url;
    }

    // ===== UI 업데이트 =====
    function updateAuthUI() {
        const container = document.getElementById('auth-section');
        if (!container) return;

        const user = getUser();
        if (user) {
            container.innerHTML = `
                <div class="auth-profile">
                    <div class="auth-avatar">${user.profileImage ? `<img src="${user.profileImage}" alt="">` : '👤'}</div>
                    <div class="auth-info">
                        <div class="auth-name">${user.nickname}</div>
                        <button class="auth-logout-btn" id="auth-logout-btn">로그아웃</button>
                    </div>
                </div>
            `;
            document.getElementById('auth-logout-btn')?.addEventListener('click', logout);
        } else {
            container.innerHTML = `
                <button class="auth-login-btn" id="auth-login-btn">
                    <svg width="18" height="18" viewBox="0 0 18 18"><path fill="#3C1E1E" d="M9 1C4.58 1 1 3.79 1 7.2c0 2.23 1.49 4.18 3.72 5.27l-.95 3.53 4.09-2.7c.37.04.75.06 1.14.06 4.42 0 8-2.79 8-6.16S13.42 1 9 1z"/></svg>
                    카카오 로그인
                </button>
            `;
            document.getElementById('auth-login-btn')?.addEventListener('click', login);
        }
    }

    // 스타일 주입
    function injectAuthStyles() {
        if (document.getElementById('auth-styles')) return;
        const style = document.createElement('style');
        style.id = 'auth-styles';
        style.textContent = `
            #auth-section{padding:.5rem .8rem;margin-bottom:.5rem}
            .auth-login-btn{width:100%;display:flex;align-items:center;justify-content:center;gap:.5rem;padding:.6rem;border:none;border-radius:10px;background:#FEE500;color:#3C1E1E;font-size:.82rem;font-weight:600;cursor:pointer;transition:all .2s}
            .auth-login-btn:hover{transform:translateY(-1px);box-shadow:0 4px 12px rgba(254,229,0,.3)}
            .auth-profile{display:flex;align-items:center;gap:.5rem;padding:.3rem 0}
            .auth-avatar{width:32px;height:32px;border-radius:50%;overflow:hidden;background:var(--bg-elevated);display:flex;align-items:center;justify-content:center;font-size:.9rem}
            .auth-avatar img{width:100%;height:100%;object-fit:cover}
            .auth-info{flex:1}
            .auth-name{font-size:.8rem;font-weight:600;color:var(--text-primary)}
            .auth-logout-btn{background:none;border:none;color:var(--text-muted);font-size:.65rem;cursor:pointer;padding:0;margin-top:.1rem}
            .auth-logout-btn:hover{color:#ef4444}
        `;
        document.head.appendChild(style);
    }

    // ===== 서버 크레딧 동기화 =====
    async function syncCredits() {
        const token = getToken();
        if (!token) return null;
        try {
            const res = await fetch('/api/credits', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) {
                // localStorage도 업데이트
                localStorage.setItem('sajuCredits', JSON.stringify({
                    balance: data.credits,
                    updatedAt: new Date().toISOString(),
                    synced: true
                }));
                return data.credits;
            }
        } catch (e) { console.warn('크레딧 동기화 실패:', e); }
        return null;
    }

    async function serverUseCredit() {
        const token = getToken();
        if (!token) return false;
        try {
            const res = await fetch('/api/credits', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ action: 'use' })
            });
            const data = await res.json();
            if (data.success) {
                localStorage.setItem('sajuCredits', JSON.stringify({
                    balance: data.credits,
                    updatedAt: new Date().toISOString(),
                    synced: true
                }));
                return true;
            }
        } catch (e) { console.warn('서버 크레딧 차감 실패:', e); }
        return false;
    }

    async function serverAddCredits(amount, purchaseId) {
        const token = getToken();
        if (!token) return false;
        try {
            const res = await fetch('/api/credits', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ action: 'add', amount, purchaseId })
            });
            const data = await res.json();
            if (data.success) {
                localStorage.setItem('sajuCredits', JSON.stringify({
                    balance: data.credits,
                    updatedAt: new Date().toISOString(),
                    synced: true
                }));
                return true;
            }
        } catch (e) { console.warn('서버 크레딧 충전 실패:', e); }
        return false;
    }

    // ===== Init =====
    function init() {
        injectAuthStyles();
        updateAuthUI();
        // 로그인 상태면 크레딧 동기화
        if (isLoggedIn()) {
            syncCredits().then(credits => {
                if (credits !== null && window.SajuCredits) {
                    window.SajuCredits.updateBadge();
                }
            });
        }
    }

    window.addEventListener('DOMContentLoaded', init);

    // ===== 글로벌 API =====
    window.SajuAuth = {
        isLoggedIn,
        getUser,
        getToken,
        login,
        logout,
        syncCredits,
        serverUseCredit,
        serverAddCredits,
        updateAuthUI,
    };
})();
