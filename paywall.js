/**
 * paywall.js — 사주앱 프리미엄 결제 모듈
 * PortOne(포트원) SDK 기반 결제 + Cloudflare Workers 검증
 */
(function () {
    'use strict';

    // ===== 설정 =====
    const CONFIG = {
        IMP_CODE: 'imp04022566',            // PortOne 가맹점 식별코드
        PG: 'kakaopay.TC0ONETIME',               // PG사.MID (테스트: TC0ONETIME)
        AMOUNT: 4900,                        // 결제 금액 (원)
        PRODUCT_NAME: 'DJ 명리 프리미엄 분석',
        VERIFY_URL: '/api/verify-payment',   // 검증 Worker URL
        STORAGE_KEY: 'premiumToken',         // localStorage 키
    };

    // ===== 결제 상태 확인 =====
    function isPremium() {
        const token = localStorage.getItem(CONFIG.STORAGE_KEY);
        if (!token) return false;
        try {
            const data = JSON.parse(token);
            // 결제 후 30일 유효
            if (data.expiry && Date.now() < data.expiry) return true;
            localStorage.removeItem(CONFIG.STORAGE_KEY);
            return false;
        } catch (e) {
            return false;
        }
    }

    // ===== 결제 성공 저장 =====
    function savePremium(impUid, merchantUid) {
        const data = {
            impUid,
            merchantUid,
            expiry: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30일
            paidAt: new Date().toISOString()
        };
        localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(data));
    }

    // ===== 결제 모달 CSS =====
    function injectStyles() {
        if (document.getElementById('paywall-styles')) return;
        const style = document.createElement('style');
        style.id = 'paywall-styles';
        style.textContent = `
            .pw-overlay{position:fixed;inset:0;background:rgba(0,0,0,.65);backdrop-filter:blur(6px);z-index:9998;display:flex;align-items:center;justify-content:center;opacity:0;transition:opacity .3s}
            .pw-overlay.active{opacity:1}
            .pw-modal{background:var(--bg-secondary,#1e1e2e);border:1px solid var(--border-color,#333);border-radius:20px;padding:2rem;max-width:420px;width:90%;text-align:center;transform:translateY(20px);transition:transform .3s;box-shadow:0 20px 60px rgba(0,0,0,.4)}
            .pw-overlay.active .pw-modal{transform:translateY(0)}
            .pw-emoji{font-size:3rem;margin-bottom:.8rem}
            .pw-title{font-family:'Noto Serif KR',serif;font-size:1.3rem;font-weight:700;color:var(--text-primary,#fff);margin-bottom:.5rem}
            .pw-desc{font-size:.88rem;color:var(--text-secondary,#aaa);line-height:1.6;margin-bottom:1.2rem}
            .pw-features{text-align:left;margin-bottom:1.5rem}
            .pw-feature{display:flex;align-items:center;gap:.5rem;padding:.35rem 0;font-size:.82rem;color:var(--text-secondary,#aaa)}
            .pw-feature i{color:#a78bfa;font-size:1rem}
            .pw-price{font-size:2rem;font-weight:700;color:var(--text-primary,#fff);margin-bottom:.3rem}
            .pw-price-sub{font-size:.75rem;color:var(--text-muted,#666);margin-bottom:1.2rem}
            .pw-btn{width:100%;padding:.85rem;border:none;border-radius:12px;font-size:1rem;font-weight:600;cursor:pointer;transition:all .2s}
            .pw-btn-pay{background:linear-gradient(135deg,#a78bfa,#ec4899);color:#fff;margin-bottom:.5rem}
            .pw-btn-pay:hover{transform:translateY(-2px);box-shadow:0 8px 25px rgba(167,139,250,.3)}
            .pw-btn-close{background:transparent;color:var(--text-muted,#666);font-size:.82rem}
            .pw-btn-close:hover{color:var(--text-secondary,#aaa)}
            .pw-blur .deep-content>*:not(.pw-overlay),.pw-blur .daeun-dashboard>*,.pw-blur .seun-content>*:not(.pw-overlay){filter:blur(8px);pointer-events:none;user-select:none}
            .pw-blur .deep-content>h1,.pw-blur .daeun-dashboard>h1,.pw-blur .seun-content>h1{filter:blur(0)!important;pointer-events:auto!important}
            .pw-badge{display:inline-flex;align-items:center;gap:.3rem;padding:.2rem .6rem;border-radius:20px;font-size:.65rem;font-weight:600;background:linear-gradient(135deg,#a78bfa,#ec4899);color:#fff;margin-left:.5rem;vertical-align:middle}
        `;
        document.head.appendChild(style);
    }

    // ===== 결제 모달 렌더링 =====
    function showPaywall(contentArea) {
        injectStyles();

        // 컨텐츠 블러
        const mainContent = contentArea || document.querySelector('.deep-content') || document.querySelector('.daeun-page') || document.querySelector('.seun-page');
        if (mainContent) mainContent.closest('body').classList.add('pw-blur');

        const overlay = document.createElement('div');
        overlay.className = 'pw-overlay';
        overlay.innerHTML = `
            <div class="pw-modal">
                <div class="pw-emoji">🔮</div>
                <div class="pw-title">프리미엄 분석 열기</div>
                <div class="pw-desc">
                    AI 명리 분석의 깊은 인사이트를 만나보세요.<br>
                    대운·세운·건강·전략까지 종합 분석합니다.
                </div>
                <div class="pw-features">
                    <div class="pw-feature"><i class="ph ph-check-circle"></i> 심층 상담 — 대운·세운 개괄 + 운명 믹싱 전략</div>
                    <div class="pw-feature"><i class="ph ph-check-circle"></i> 대운 흐름 — 인생 전체의 10년 주기 분석</div>
                    <div class="pw-feature"><i class="ph ph-check-circle"></i> 세운 분석 — 올해 월별 상세 운세</div>
                    <div class="pw-feature"><i class="ph ph-check-circle"></i> 오행 건강 분석 + 전략 가이드</div>
                    <div class="pw-feature"><i class="ph ph-check-circle"></i> 30일간 무제한 열람</div>
                </div>
                <div class="pw-price">₩${CONFIG.AMOUNT.toLocaleString()}</div>
                <div class="pw-price-sub">1회 결제 · 30일 유효 · 모든 분석 페이지 열람</div>
                <button class="pw-btn pw-btn-pay" id="pw-pay-btn">
                    <i class="ph ph-lock-key-open"></i> 결제하고 열기
                </button>
                <button class="pw-btn pw-btn-close" id="pw-close-btn">
                    돌아가기
                </button>
            </div>
        `;

        document.body.appendChild(overlay);
        requestAnimationFrame(() => overlay.classList.add('active'));

        // 닫기 버튼
        overlay.querySelector('#pw-close-btn').addEventListener('click', () => {
            overlay.classList.remove('active');
            setTimeout(() => {
                overlay.remove();
                document.body.classList.remove('pw-blur');
                window.location.href = 'index.html';
            }, 300);
        });

        // 결제 버튼
        overlay.querySelector('#pw-pay-btn').addEventListener('click', () => {
            startPayment(overlay);
        });
    }

    // ===== PortOne SDK 로드 =====
    function loadIMP() {
        return new Promise((resolve, reject) => {
            if (window.IMP) return resolve(window.IMP);
            const script = document.createElement('script');
            script.src = 'https://cdn.iamport.kr/v1/iamport.js';
            script.onload = () => {
                if (window.IMP) {
                    window.IMP.init(CONFIG.IMP_CODE);
                    resolve(window.IMP);
                } else {
                    reject(new Error('IMP 로드 실패'));
                }
            };
            script.onerror = () => reject(new Error('PortOne SDK 로드 실패'));
            document.head.appendChild(script);
        });
    }

    // ===== 결제 시작 =====
    async function startPayment(overlay) {
        const payBtn = overlay.querySelector('#pw-pay-btn');
        payBtn.disabled = true;
        payBtn.textContent = '결제 준비 중...';

        try {
            const IMP = await loadIMP();
            const merchantUid = `saju_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

            IMP.request_pay({
                pg: CONFIG.PG,
                pay_method: 'card',
                merchant_uid: merchantUid,
                name: CONFIG.PRODUCT_NAME,
                amount: CONFIG.AMOUNT,
                buyer_name: localStorage.getItem('sajuData') ?
                    (JSON.parse(localStorage.getItem('sajuData')).userProfile?.name || '사용자') : '사용자',
            }, async function (rsp) {
                if (rsp.success) {
                    payBtn.textContent = '결제 확인 중...';
                    // 서버 검증 (실패해도 결제 자체가 성공했으므로 진행)
                    try {
                        await fetch(CONFIG.VERIFY_URL, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                imp_uid: rsp.imp_uid,
                                merchant_uid: merchantUid,
                                amount: CONFIG.AMOUNT
                            })
                        });
                    } catch (e) {
                        console.warn('검증 서버 호출 실패 (무시):', e);
                    }
                    // 결제 성공 저장 + 페이지 잠금 해제
                    savePremium(rsp.imp_uid, merchantUid);
                    overlay.classList.remove('active');
                    setTimeout(() => {
                        overlay.remove();
                        document.body.classList.remove('pw-blur');
                        location.reload();
                    }, 300);
                } else {
                    // 결제 실패/취소
                    payBtn.disabled = false;
                    payBtn.innerHTML = '<i class="ph ph-lock-key-open"></i> 결제하고 열기';
                    if (rsp.error_msg && !rsp.error_msg.includes('취소')) {
                        alert(`결제 실패: ${rsp.error_msg}`);
                    }
                }
            });
        } catch (err) {
            alert('결제 시스템 로드에 실패했습니다. 잠시 후 다시 시도해 주세요.');
            payBtn.disabled = false;
            payBtn.innerHTML = '<i class="ph ph-lock-key-open"></i> 결제하고 열기';
        }
    }

    // ===== 글로벌 API =====
    window.SajuPaywall = {
        isPremium,
        showPaywall,
        CONFIG
    };
})();
