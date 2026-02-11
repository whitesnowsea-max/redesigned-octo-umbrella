/**
 * credits.js — AI 상담실 크레딧 시스템
 * localStorage 기반 크레딧 관리 + 구매 모달 + PortOne 결제
 */
(function () {
    'use strict';

    const CREDIT_KEY = 'sajuCredits';
    const IMP_CODE = 'imp04022566';
    const PG = 'kakaopay.TC0ONETIME';
    const VERIFY_URL = '/api/verify-payment';

    // 크레딧 상품
    const PRODUCTS = [
        { id: 'credit_10', name: 'AI 상담 10크레딧', credits: 10, price: 2900, tag: '' },
        { id: 'credit_30', name: 'AI 상담 30크레딧', credits: 30, price: 6900, tag: '인기' },
    ];

    // ===== 크레딧 관리 =====
    function getCredits() {
        try {
            const stored = localStorage.getItem(CREDIT_KEY);
            if (!stored) return 0;
            const data = JSON.parse(stored);
            return data.balance || 0;
        } catch { return 0; }
    }

    function setCredits(balance, history) {
        const data = { balance, updatedAt: new Date().toISOString(), history: history || getHistory() };
        localStorage.setItem(CREDIT_KEY, JSON.stringify(data));
        updateBadge();
    }

    function getHistory() {
        try {
            const stored = localStorage.getItem(CREDIT_KEY);
            if (!stored) return [];
            return JSON.parse(stored).history || [];
        } catch { return []; }
    }

    function useCredit() {
        const balance = getCredits();
        if (balance <= 0) return false;
        const history = getHistory();
        history.push({ type: 'use', amount: -1, at: new Date().toISOString() });
        setCredits(balance - 1, history);
        return true;
    }

    function addCredits(n, purchaseId) {
        const balance = getCredits();
        const history = getHistory();
        history.push({ type: 'purchase', amount: n, purchaseId, at: new Date().toISOString() });
        setCredits(balance + n, history);
    }

    // ===== 크레딧 뱃지 UI =====
    function updateBadge() {
        const badges = document.querySelectorAll('.credit-badge-count');
        const balance = getCredits();
        badges.forEach(b => {
            b.textContent = balance;
            b.closest('.credit-badge')?.classList.toggle('credit-empty', balance <= 0);
        });

        // 입력 비활성화 연동
        const sendBtn = document.getElementById('send-btn');
        const userInput = document.getElementById('user-input');
        if (balance <= 0) {
            if (sendBtn) sendBtn.disabled = true;
            if (userInput) userInput.placeholder = '크레딧을 구매하면 상담할 수 있어요';
        } else {
            if (sendBtn) sendBtn.disabled = false;
            if (userInput) userInput.placeholder = '메시지를 입력하세요...';
        }
    }

    // 헤더에 크레딧 뱃지 삽입
    function injectBadge() {
        const header = document.querySelector('.chat-header .agent-info');
        if (!header || document.querySelector('.credit-badge')) return;
        const badge = document.createElement('div');
        badge.className = 'credit-badge';
        badge.innerHTML = `<span class="credit-badge-icon">💎</span><span class="credit-badge-count">${getCredits()}</span><span class="credit-badge-label">크레딧</span>`;
        badge.style.cssText = 'display:flex;align-items:center;gap:.3rem;margin-left:auto;padding:.3rem .7rem;border-radius:20px;background:linear-gradient(135deg,rgba(167,139,250,.15),rgba(236,72,153,.15));border:1px solid rgba(167,139,250,.3);cursor:pointer;transition:transform .2s;font-size:.78rem;';
        badge.querySelector('.credit-badge-count').style.cssText = 'font-weight:700;color:#a78bfa;font-size:.9rem;';
        badge.querySelector('.credit-badge-label').style.cssText = 'color:var(--text-muted);font-size:.7rem;';
        badge.addEventListener('click', showCreditShop);
        badge.addEventListener('mouseenter', () => badge.style.transform = 'scale(1.05)');
        badge.addEventListener('mouseleave', () => badge.style.transform = 'scale(1)');
        header.appendChild(badge);
        updateBadge();
    }

    // ===== 크레딧 구매 모달 =====
    function injectShopStyles() {
        if (document.getElementById('credit-shop-styles')) return;
        const style = document.createElement('style');
        style.id = 'credit-shop-styles';
        style.textContent = `
            .cs-overlay{position:fixed;inset:0;background:rgba(0,0,0,.65);backdrop-filter:blur(6px);z-index:9999;display:flex;align-items:center;justify-content:center;opacity:0;transition:opacity .3s}
            .cs-overlay.active{opacity:1}
            .cs-modal{background:var(--bg-secondary,#1e1e2e);border:1px solid var(--border-color,#333);border-radius:20px;padding:2rem;max-width:420px;width:90%;text-align:center;transform:translateY(20px);transition:transform .3s;box-shadow:0 20px 60px rgba(0,0,0,.4)}
            .cs-overlay.active .cs-modal{transform:translateY(0)}
            .cs-title{font-family:'Noto Serif KR',serif;font-size:1.2rem;font-weight:700;margin-bottom:.3rem;color:var(--text-primary)}
            .cs-subtitle{font-size:.8rem;color:var(--text-muted);margin-bottom:1.2rem}
            .cs-balance{display:inline-flex;align-items:center;gap:.3rem;padding:.4rem .8rem;border-radius:20px;background:linear-gradient(135deg,rgba(167,139,250,.15),rgba(236,72,153,.15));border:1px solid rgba(167,139,250,.3);font-size:.85rem;color:#a78bfa;font-weight:600;margin-bottom:1.2rem}
            .cs-products{display:flex;flex-direction:column;gap:.7rem;margin-bottom:1.2rem}
            .cs-product{display:flex;align-items:center;justify-content:space-between;padding:.8rem 1rem;border-radius:14px;background:var(--bg-elevated,#2a2a3a);border:1px solid var(--border-color,#444);cursor:pointer;transition:all .2s}
            .cs-product:hover{border-color:#a78bfa;transform:translateY(-2px)}
            .cs-product.selected{border-color:#a78bfa;background:rgba(167,139,250,.1)}
            .cs-prod-left{text-align:left}
            .cs-prod-name{font-size:.88rem;font-weight:600;color:var(--text-primary)}
            .cs-prod-desc{font-size:.7rem;color:var(--text-muted)}
            .cs-prod-tag{font-size:.6rem;background:linear-gradient(135deg,#a78bfa,#ec4899);color:#fff;padding:1px 6px;border-radius:8px;margin-left:.4rem}
            .cs-prod-price{font-size:1rem;font-weight:700;color:var(--text-primary)}
            .cs-buy-btn{width:100%;padding:.85rem;border:none;border-radius:12px;font-size:1rem;font-weight:600;cursor:pointer;background:linear-gradient(135deg,#a78bfa,#ec4899);color:#fff;transition:all .2s;margin-bottom:.5rem}
            .cs-buy-btn:hover{transform:translateY(-2px);box-shadow:0 8px 25px rgba(167,139,250,.3)}
            .cs-buy-btn:disabled{opacity:.5;cursor:not-allowed;transform:none}
            .cs-close{background:none;border:none;color:var(--text-muted);font-size:.82rem;cursor:pointer;padding:.3rem}
            .cs-close:hover{color:var(--text-secondary)}
            .credit-empty .credit-badge-count{color:#ef4444!important}
        `;
        document.head.appendChild(style);
    }

    function showCreditShop() {
        injectShopStyles();
        const existing = document.querySelector('.cs-overlay');
        if (existing) existing.remove();

        let selectedIdx = 1; // 기본 30크레딧 선택

        const overlay = document.createElement('div');
        overlay.className = 'cs-overlay';

        function renderProducts() {
            return PRODUCTS.map((p, i) => `
                <div class="cs-product${i === selectedIdx ? ' selected' : ''}" data-idx="${i}">
                    <div class="cs-prod-left">
                        <div class="cs-prod-name">💎 ${p.credits}크레딧${p.tag ? `<span class="cs-prod-tag">${p.tag}</span>` : ''}</div>
                        <div class="cs-prod-desc">AI 상담 ${p.credits}회 이용</div>
                    </div>
                    <div class="cs-prod-price">₩${p.price.toLocaleString()}</div>
                </div>
            `).join('');
        }

        overlay.innerHTML = `
            <div class="cs-modal">
                <div class="cs-title">💎 AI 상담 크레딧</div>
                <div class="cs-subtitle">크레딧 1개 = AI 상담 메시지 1회</div>
                <div class="cs-balance">💎 현재 잔액: <strong>${getCredits()}</strong>크레딧</div>
                <div class="cs-products">${renderProducts()}</div>
                <button class="cs-buy-btn" id="cs-buy-btn">💎 ${PRODUCTS[selectedIdx].credits}크레딧 구매 — ₩${PRODUCTS[selectedIdx].price.toLocaleString()}</button>
                <button class="cs-close" id="cs-close-btn">닫기</button>
            </div>
        `;

        document.body.appendChild(overlay);
        requestAnimationFrame(() => overlay.classList.add('active'));

        // 상품 선택
        overlay.querySelectorAll('.cs-product').forEach(el => {
            el.addEventListener('click', () => {
                selectedIdx = parseInt(el.dataset.idx);
                overlay.querySelectorAll('.cs-product').forEach(p => p.classList.remove('selected'));
                el.classList.add('selected');
                const prod = PRODUCTS[selectedIdx];
                document.getElementById('cs-buy-btn').textContent = `💎 ${prod.credits}크레딧 구매 — ₩${prod.price.toLocaleString()}`;
            });
        });

        // 닫기
        overlay.querySelector('#cs-close-btn').addEventListener('click', () => {
            overlay.classList.remove('active');
            setTimeout(() => overlay.remove(), 300);
        });

        // 구매
        overlay.querySelector('#cs-buy-btn').addEventListener('click', () => {
            purchaseCredits(PRODUCTS[selectedIdx], overlay);
        });
    }

    // ===== PortOne 결제 =====
    function loadIMP() {
        return new Promise((resolve, reject) => {
            if (window.IMP) return resolve(window.IMP);
            const s = document.createElement('script');
            s.src = 'https://cdn.iamport.kr/v1/iamport.js';
            s.onload = () => { if (window.IMP) { window.IMP.init(IMP_CODE); resolve(window.IMP); } else reject(new Error('IMP 로드 실패')); };
            s.onerror = () => reject(new Error('PortOne SDK 로드 실패'));
            document.head.appendChild(s);
        });
    }

    async function purchaseCredits(product, overlay) {
        const buyBtn = overlay.querySelector('#cs-buy-btn');
        buyBtn.disabled = true;
        buyBtn.textContent = '결제 준비 중...';

        try {
            const IMP = await loadIMP();
            const merchantUid = `credit_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

            IMP.request_pay({
                pg: PG,
                pay_method: 'card',
                merchant_uid: merchantUid,
                name: product.name,
                amount: product.price,
            }, async function (rsp) {
                if (rsp.success) {
                    buyBtn.textContent = '결제 확인 중...';
                    // 서버 검증 (선택적)
                    try {
                        await fetch(VERIFY_URL, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ imp_uid: rsp.imp_uid, merchant_uid: merchantUid, amount: product.price })
                        });
                    } catch (e) { console.warn('검증 서버 호출 실패 (무시):', e); }

                    // 크레딧 추가
                    addCredits(product.credits, rsp.imp_uid);
                    buyBtn.textContent = `✅ ${product.credits}크레딧 충전 완료!`;

                    setTimeout(() => {
                        overlay.classList.remove('active');
                        setTimeout(() => overlay.remove(), 300);
                    }, 1000);
                } else {
                    buyBtn.disabled = false;
                    buyBtn.textContent = `💎 ${product.credits}크레딧 구매 — ₩${product.price.toLocaleString()}`;
                    if (rsp.error_msg && !rsp.error_msg.includes('취소')) {
                        alert(`결제 실패: ${rsp.error_msg}`);
                    }
                }
            });
        } catch (err) {
            alert('결제 시스템 로드에 실패했습니다.');
            buyBtn.disabled = false;
            buyBtn.textContent = `💎 ${product.credits}크레딧 구매 — ₩${product.price.toLocaleString()}`;
        }
    }

    // ===== 초기 크레딧 (첫 방문 보너스) =====
    function initFirstVisit() {
        if (localStorage.getItem(CREDIT_KEY)) return;
        // 처음 방문 시 무료 크레딧 3개 지급
        addCredits(3, 'welcome_bonus');
    }

    // ===== 글로벌 API =====
    window.SajuCredits = {
        getCredits,
        useCredit,
        addCredits,
        showCreditShop,
        updateBadge,
        injectBadge,
        initFirstVisit,
    };
})();
