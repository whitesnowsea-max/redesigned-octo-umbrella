/**
 * overview.js — 간단 해설 (무료) 페이지용 템플릿 기반 사주 풀이
 * AI API 호출 없이 Manseryeok 데이터만으로 해설 생성
 */
(function () {
    'use strict';

    const M = window.Manseryeok;
    const EC = { Wood: '#22c55e', Fire: '#ef4444', Earth: '#eab308', Metal: '#a1a1aa', Water: '#3b82f6' };
    const EK = { Wood: '목(木)', Fire: '화(火)', Earth: '토(土)', Metal: '금(金)', Water: '수(水)' };
    const EKS = { Wood: '목', Fire: '화', Earth: '토', Metal: '금', Water: '수' };

    // ===== 일간별 해설 템플릿 =====
    const DAY_MASTER_DESC = {
        '甲': { name: '갑목(甲木)', emoji: '🌲', nature: '큰 나무', desc: '곧게 뻗어 나가는 큰 나무처럼 정의롭고 진취적입니다. 리더십이 강하고 자존심이 높으며, 어려운 환경에서도 굳건히 성장하는 힘이 있습니다. 때로는 융통성이 부족할 수 있지만, 올곧은 성품이 주변의 신뢰를 얻습니다.' },
        '乙': { name: '을목(乙木)', emoji: '🌿', nature: '풀과 덩굴', desc: '유연한 풀이나 덩굴처럼 적응력이 뛰어납니다. 부드러우면서도 끈질긴 생명력을 가지고 있어, 상황에 맞게 방향을 바꾸며 성장합니다. 예술적 감각과 섬세함이 돋보이며, 인간관계에서 조화를 추구합니다.' },
        '丙': { name: '병화(丙火)', emoji: '☀️', nature: '태양', desc: '태양처럼 밝고 뜨거운 에너지를 가지고 있습니다. 열정적이고 솔직하며, 주변을 환하게 비추는 카리스마가 있습니다. 정의감이 강하고 낙천적이지만, 때로는 감정의 기복이 클 수 있습니다.' },
        '丁': { name: '정화(丁火)', emoji: '🕯️', nature: '촛불·별빛', desc: '촛불이나 별빛처럼 은은하면서도 따뜻한 빛을 지닌 사람입니다. 섬세하고 지적이며, 어둠 속에서 길을 밝히는 통찰력이 있습니다. 내면이 풍부하고 직감이 뛰어나 사람의 마음을 잘 읽습니다.' },
        '戊': { name: '무토(戊土)', emoji: '⛰️', nature: '산·대지', desc: '거대한 산처럼 듬직하고 포용력이 넓습니다. 안정감 있고 신뢰감을 주며, 모든 것을 품어 안는 넉넉함이 있습니다. 변화보다는 안정을 추구하고, 묵직한 존재감으로 주변의 중심이 됩니다.' },
        '己': { name: '기토(己土)', emoji: '🌾', nature: '대지·논밭', desc: '비옥한 논밭처럼 만물을 기르는 양육의 기운을 가지고 있습니다. 꼼꼼하고 현실적이며, 사람을 돌보는 데 정성을 쏟습니다. 겉으로는 온순해 보이지만, 내면에 굳은 뜻을 품고 있습니다.' },
        '庚': { name: '경금(庚金)', emoji: '⚔️', nature: '강철·바위', desc: '강철처럼 강하고 단단한 의지를 가진 사람입니다. 결단력과 추진력이 뛰어나고, 옳다고 생각하면 밀어붙이는 추진력이 있습니다. 정의감이 강하고 직선적이며, 날카로운 판단력을 지니고 있습니다.' },
        '辛': { name: '신금(辛金)', emoji: '💎', nature: '보석·귀금속', desc: '보석처럼 빛나고 세련된 감성을 지닌 사람입니다. 예민하고 완벽주의적이며, 아름다움을 추구합니다. 외유내강형으로 겉은 부드럽지만 내면의 자존심과 원칙이 강합니다.' },
        '壬': { name: '임수(壬水)', emoji: '🌊', nature: '바다·큰 강', desc: '바다나 큰 강처럼 깊고 넓은 포용력을 가진 사람입니다. 지혜롭고 유연하며, 자유를 사랑합니다. 어디든 흘러갈 수 있는 적응력이 있고, 깊은 사색과 철학적 사고를 즐깁니다.' },
        '癸': { name: '계수(癸水)', emoji: '🌧️', nature: '비·이슬', desc: '비와 이슬처럼 조용히 만물을 적시는 섬세함을 가진 사람입니다. 직감적이고 감수성이 풍부하며, 눈에 띄지 않게 주변을 돌보는 배려심이 있습니다. 내향적이지만 깊은 내면 세계를 가지고 있습니다.' }
    };

    // ===== 십성 해설 =====
    function getRelation(dm, te) {
        if (te === dm) return '비겁';
        const cy = { Wood: 'Fire', Fire: 'Earth', Earth: 'Metal', Metal: 'Water', Water: 'Wood' };
        const ct = { Wood: 'Earth', Earth: 'Water', Water: 'Fire', Fire: 'Metal', Metal: 'Wood' };
        if (cy[dm] === te) return '식상'; if (cy[te] === dm) return '인성';
        if (ct[dm] === te) return '재성'; if (ct[te] === dm) return '관성'; return '';
    }

    const REL_DESC = {
        '비겁': { full: '비겁(比劫)', tag: '자신감·경쟁·독립', color: '#22c55e' },
        '식상': { full: '식상(食傷)', tag: '표현·창의·활동', color: '#eab308' },
        '재성': { full: '재성(財星)', tag: '재물·현실·성과', color: '#f97316' },
        '관성': { full: '관성(官星)', tag: '명예·책임·지위', color: '#3b82f6' },
        '인성': { full: '인성(印星)', tag: '학문·보호·성장', color: '#a855f7' }
    };

    // ===== 오행 분포 분석 =====
    function getElementCounts(chart) {
        const counts = { Wood: 0, Fire: 0, Earth: 0, Metal: 0, Water: 0 };
        const pillars = ['year', 'month', 'day', 'hour'];
        pillars.forEach(p => {
            if (!chart[p]) return;
            if (chart[p].stemElement) counts[chart[p].stemElement]++;
            if (chart[p].branchElement) counts[chart[p].branchElement]++;
        });
        return counts;
    }

    function getBalanceAdvice(strongest, weakest) {
        const advice = {
            Wood: '운동, 등산, 자연 속 활동이 도움이 됩니다.',
            Fire: '열정을 발산할 수 있는 사교 활동이나 공연 관람을 추천합니다.',
            Earth: '규칙적인 생활과 명상이 안정감을 가져다줍니다.',
            Metal: '체계적인 계획 수립과 정돈된 환경이 큰 힘이 됩니다.',
            Water: '독서, 여행, 수영 등 물과 관련된 활동이 좋습니다.'
        };
        return `가장 강한 오행인 <strong style="color:${EC[strongest]}">${EK[strongest]}</strong>의 에너지를 잘 활용하되, 부족한 <strong style="color:${EC[weakest]}">${EK[weakest]}</strong>을 보완해 주세요. ${advice[weakest] || ''}`;
    }

    // ===== 한 줄 요약 생성 =====
    function getSummary(stemInfo, elemCounts) {
        const sorted = Object.entries(elemCounts).sort((a, b) => b[1] - a[1]);
        const top = sorted[0][0];
        const summaries = {
            Wood: `성장과 도전을 향해 곧게 뻗어 나가는 ${stemInfo.emoji} ${stemInfo.name}, 올해는 뿌리를 더 깊이 내릴 때입니다.`,
            Fire: `열정과 카리스마의 ${stemInfo.emoji} ${stemInfo.name}, 불꽃처럼 빛나되 지치지 않는 페이스 조절이 핵심입니다.`,
            Earth: `안정과 포용의 ${stemInfo.emoji} ${stemInfo.name}, 믿음직한 당신의 중심에서 새로운 기회가 자라납니다.`,
            Metal: `날카로운 판단력의 ${stemInfo.emoji} ${stemInfo.name}, 원칙을 지키면서도 유연하게 기회를 잡으세요.`,
            Water: `깊은 지혜의 ${stemInfo.emoji} ${stemInfo.name}, 흐르는 물처럼 자연스럽게 길을 찾아가세요.`
        };
        return summaries[top] || `${stemInfo.emoji} ${stemInfo.name}, 타고난 기운을 잘 활용하여 올해의 기회를 잡으세요.`;
    }

    // ===== 도입 페이지 (DJ 명리 소개) =====
    function renderIntro(container) {
        container.innerHTML = `
        <div class="intro-page">
            <!-- Hero -->
            <div class="intro-hero">
                <div class="intro-hero-badge">AI 사주 · 새로운 관점</div>
                <h1 class="intro-hero-title">
                    <span class="intro-gradient">DJ 명리</span>
                </h1>
                <p class="intro-hero-sub">운명을 예언하지 않습니다.<br>당신의 패를 읽고, <strong>플레이 전략</strong>을 세웁니다.</p>
            </div>

            <!-- 카드 게임 메타포 -->
            <div class="intro-card intro-card-accent">
                <div class="intro-card-icon">🃏</div>
                <h2>인생은 10장의 카드 게임</h2>
                <p>태어날 때 받은 <strong>8장의 카드</strong>(사주 원국)와<br>매해 추가되는 <strong>2장의 카드</strong>(세운)로 게임이 펼쳐집니다.</p>
                <div class="intro-cards-visual">
                    <div class="intro-card-stack">
                        <div class="intro-minicard" style="--i:0">年</div>
                        <div class="intro-minicard" style="--i:1">年</div>
                        <div class="intro-minicard" style="--i:2">月</div>
                        <div class="intro-minicard" style="--i:3">月</div>
                        <div class="intro-minicard intro-minicard-me" style="--i:4">日</div>
                        <div class="intro-minicard" style="--i:5">日</div>
                        <div class="intro-minicard" style="--i:6">時</div>
                        <div class="intro-minicard" style="--i:7">時</div>
                    </div>
                    <div class="intro-plus">+</div>
                    <div class="intro-card-stack">
                        <div class="intro-minicard intro-minicard-year" style="--i:0">歲</div>
                        <div class="intro-minicard intro-minicard-year" style="--i:1">運</div>
                    </div>
                </div>
                <p class="intro-card-bottom">승패는 패가 아니라 <strong>플레이어</strong>가 결정합니다.</p>
            </div>

            <!-- DJ 명리가 다른 점 -->
            <div class="intro-card">
                <h2>🎛️ 기존 사주와 어떻게 다른가요?</h2>
                <div class="intro-compare">
                    <div class="intro-compare-col intro-compare-old">
                        <div class="intro-compare-label">전통적 사주 풀이</div>
                        <ul>
                            <li>❌ "올해 재물운이 좋다 / 나쁘다"</li>
                            <li>❌ "남편복이 없는 사주"</li>
                            <li>❌ "초년고생, 중년발복"</li>
                            <li>❌ 막연한 길흉 예언</li>
                        </ul>
                    </div>
                    <div class="intro-compare-col intro-compare-new">
                        <div class="intro-compare-label">DJ 명리</div>
                        <ul>
                            <li>✅ "당신의 재물 감각은 이런 성향"</li>
                            <li>✅ "관계에서 이런 패턴이 보여요"</li>
                            <li>✅ "올해의 전략은 이렇게"</li>
                            <li>✅ 구체적인 행동 전략 제시</li>
                        </ul>
                    </div>
                </div>
            </div>

            <!-- 오행 소개 -->
            <div class="intro-card">
                <h2>🌊 오행 — 삶의 5가지 질문</h2>
                <p class="intro-card-desc">오행은 자연의 원소가 아니라, 삶을 이해하는 <strong>5가지 관점</strong>입니다.</p>
                <div class="intro-elements">
                    <div class="intro-elem" style="--ec:#22c55e">
                        <div class="intro-elem-icon">🌲</div>
                        <div class="intro-elem-name">목(木)</div>
                        <div class="intro-elem-q">나를 어떻게 세울 것인가</div>
                    </div>
                    <div class="intro-elem" style="--ec:#ef4444">
                        <div class="intro-elem-icon">🔥</div>
                        <div class="intro-elem-name">화(火)</div>
                        <div class="intro-elem-q">어떻게 자유로울 것인가</div>
                    </div>
                    <div class="intro-elem" style="--ec:#eab308">
                        <div class="intro-elem-icon">⛰️</div>
                        <div class="intro-elem-name">토(土)</div>
                        <div class="intro-elem-q">관계를 어떻게 맺을 것인가</div>
                    </div>
                    <div class="intro-elem" style="--ec:#a1a1aa">
                        <div class="intro-elem-icon">⚔️</div>
                        <div class="intro-elem-name">금(金)</div>
                        <div class="intro-elem-q">옳고 그름을 어떻게 판단할 것인가</div>
                    </div>
                    <div class="intro-elem" style="--ec:#3b82f6">
                        <div class="intro-elem-icon">🌊</div>
                        <div class="intro-elem-name">수(水)</div>
                        <div class="intro-elem-q">나는 누구인가</div>
                    </div>
                </div>
            </div>

            <!-- CTA -->
            <div class="intro-card intro-cta">
                <div class="intro-cta-emoji">🔮</div>
                <h2>지금 바로 시작하세요</h2>
                <p>왼쪽 사이드바에서 생년월일을 입력하면<br>당신만의 사주 해설이 시작됩니다.</p>
            </div>
        </div>

        <style>
            .intro-page{max-width:680px;margin:0 auto;padding:1.5rem 0 3rem}
            .intro-hero{text-align:center;padding:2rem 0 1.5rem}
            .intro-hero-badge{display:inline-block;font-size:.7rem;font-weight:600;letter-spacing:.05em;padding:.25rem .7rem;border-radius:20px;background:linear-gradient(135deg,rgba(167,139,250,.15),rgba(236,72,153,.15));border:1px solid rgba(167,139,250,.25);color:#a78bfa;margin-bottom:.8rem}
            .intro-hero-title{font-family:'Noto Serif KR',serif;font-size:2.2rem;font-weight:800;margin:0 0 .6rem;line-height:1.2}
            .intro-gradient{background:linear-gradient(135deg,#a78bfa,#ec4899);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
            .intro-hero-sub{font-size:.95rem;color:var(--text-secondary);line-height:1.6}
            .intro-card{background:var(--bg-secondary,#1e1e2e);border:1px solid var(--border-color,#333);border-radius:18px;padding:1.5rem;margin-bottom:1rem}
            .intro-card h2{font-family:'Noto Serif KR',serif;font-size:1.15rem;margin:0 0 .6rem;color:var(--text-primary)}
            .intro-card p{font-size:.88rem;color:var(--text-secondary);line-height:1.6;margin:.3rem 0}
            .intro-card-accent{background:linear-gradient(135deg,rgba(167,139,250,.08),rgba(236,72,153,.08));border-color:rgba(167,139,250,.25);text-align:center}
            .intro-card-icon{font-size:2.5rem;margin-bottom:.5rem}
            .intro-card-bottom{margin-top:.8rem;font-weight:600;color:var(--text-primary)}
            .intro-card-desc{margin-bottom:1rem!important}

            /* 카드 비주얼 */
            .intro-cards-visual{display:flex;align-items:center;justify-content:center;gap:1rem;margin:1.2rem 0}
            .intro-card-stack{display:flex;gap:.3rem}
            .intro-minicard{width:32px;height:44px;border-radius:6px;background:var(--bg-elevated,#2a2a3a);border:1px solid var(--border-color,#444);display:flex;align-items:center;justify-content:center;font-size:.75rem;font-weight:700;color:var(--text-muted);animation:cardFloat 2s ease-in-out calc(var(--i) * .15s) infinite alternate}
            .intro-minicard-me{background:linear-gradient(135deg,#a78bfa,#ec4899);color:#fff;border-color:transparent;box-shadow:0 2px 12px rgba(167,139,250,.3)}
            .intro-minicard-year{background:rgba(59,130,246,.15);border-color:rgba(59,130,246,.3);color:#60a5fa}
            .intro-plus{font-size:1.3rem;font-weight:700;color:var(--text-muted)}
            @keyframes cardFloat{to{transform:translateY(-3px)}}

            /* 비교 */
            .intro-compare{display:grid;grid-template-columns:1fr 1fr;gap:.8rem;margin-top:.8rem}
            .intro-compare-col{padding:1rem;border-radius:12px}
            .intro-compare-old{background:rgba(239,68,68,.06);border:1px solid rgba(239,68,68,.15)}
            .intro-compare-new{background:rgba(34,197,94,.06);border:1px solid rgba(34,197,94,.15)}
            .intro-compare-label{font-size:.72rem;font-weight:700;text-transform:uppercase;letter-spacing:.03em;margin-bottom:.5rem;color:var(--text-muted)}
            .intro-compare-col ul{list-style:none;padding:0;margin:0}
            .intro-compare-col li{font-size:.78rem;color:var(--text-secondary);padding:.25rem 0;line-height:1.4}

            /* 오행 */
            .intro-elements{display:grid;grid-template-columns:repeat(5,1fr);gap:.5rem}
            .intro-elem{text-align:center;padding:.8rem .3rem;border-radius:12px;background:var(--bg-elevated,#2a2a3a);border:1px solid var(--border-color,#444);transition:transform .2s}
            .intro-elem:hover{transform:translateY(-3px)}
            .intro-elem-icon{font-size:1.5rem;margin-bottom:.3rem}
            .intro-elem-name{font-size:.82rem;font-weight:700;color:var(--ec);margin-bottom:.2rem}
            .intro-elem-q{font-size:.62rem;color:var(--text-muted);line-height:1.3}

            /* CTA */
            .intro-cta{text-align:center;background:linear-gradient(135deg,rgba(167,139,250,.1),rgba(236,72,153,.1));border-color:rgba(167,139,250,.2)}
            .intro-cta-emoji{font-size:2.5rem;margin-bottom:.5rem}

            @media(max-width:600px){
                .intro-hero-title{font-size:1.6rem}
                .intro-compare{grid-template-columns:1fr}
                .intro-elements{grid-template-columns:repeat(3,1fr)}
            }
        </style>
        `;
    }

    // ===== 메인 렌더링 =====
    function render() {
        const container = document.getElementById('overview-content');
        if (!container) return;

        const stored = localStorage.getItem('sajuData');
        if (!stored) {
            renderIntro(container);
            return;
        }

        let sd;
        try { sd = JSON.parse(stored); } catch (e) { return; }
        if (!sd || !sd.chart) return;

        const { chart, userProfile } = sd;
        const stem = chart.day.stem;
        const stemInfo = DAY_MASTER_DESC[stem] || { name: stem, emoji: '🔮', nature: '', desc: '' };
        const dmInfo = M.HEAVENLY_STEMS[stem];
        const dm = dmInfo ? dmInfo.element : 'Wood';
        const elemCounts = getElementCounts(chart);
        const total = Object.values(elemCounts).reduce((a, b) => a + b, 0) || 1;

        // 사이드바 업데이트
        const nameEl = document.getElementById('display-name');
        const birthEl = document.getElementById('display-birth');
        if (nameEl) nameEl.textContent = userProfile?.name || '방문자';
        if (birthEl) birthEl.textContent = userProfile?.birth || '';

        let html = '';
        html += `<h1>${stemInfo.emoji} ${userProfile?.name || '방문자'}님의 사주 해설</h1>`;
        html += `<p class="ov-subtitle">만세력 데이터 기반 간단 풀이입니다.</p>`;

        // 1. 일간 캐릭터
        html += `<div class="ov-card ov-hero">`;
        html += `<div class="ov-card-badge">🎭 핵심 캐릭터</div>`;
        html += `<div class="ov-hero-title" style="color:${EC[dm]}">${stemInfo.name}</div>`;
        html += `<div class="ov-hero-nature">${stemInfo.nature}</div>`;
        html += `<div class="ov-hero-desc">${stemInfo.desc}</div>`;
        html += `</div>`;

        // 2. 사주 원국 (8글자)
        html += `<div class="ov-card">`;
        html += `<div class="ov-card-badge">🀄 사주 원국 (8글자)</div>`;
        html += `<div class="ov-pillars">`;
        const pillarNames = [
            { key: 'hour', label: '시주(時柱)' },
            { key: 'day', label: '일주(日柱)' },
            { key: 'month', label: '월주(月柱)' },
            { key: 'year', label: '연주(年柱)' }
        ];
        pillarNames.forEach(p => {
            const pi = chart[p.key];
            if (!pi) return;
            const sColor = EC[pi.stemElement] || '#888';
            const bColor = EC[pi.branchElement] || '#888';
            html += `<div class="ov-pillar">`;
            html += `<div class="ov-pillar-label">${p.label}</div>`;
            html += `<div class="ov-pillar-stem" style="color:${sColor}">${pi.stem || '?'}</div>`;
            html += `<div class="ov-pillar-branch" style="color:${bColor}">${pi.branch || '?'}</div>`;
            html += `<div class="ov-pillar-el">${EKS[pi.stemElement] || ''}·${EKS[pi.branchElement] || ''}</div>`;
            html += `</div>`;
        });
        html += `</div>`;

        // 십성 관계
        html += `<div class="ov-relations">`;
        const pillars = ['year', 'month', 'day', 'hour'];
        const relCounts = {};
        pillars.forEach(p => {
            if (!chart[p] || p === 'day') return;
            const r = getRelation(dm, chart[p].stemElement);
            if (r) relCounts[r] = (relCounts[r] || 0) + 1;
            const rb = getRelation(dm, chart[p].branchElement);
            if (rb) relCounts[rb] = (relCounts[rb] || 0) + 1;
        });
        Object.entries(relCounts).sort((a, b) => b[1] - a[1]).forEach(([r, c]) => {
            const info = REL_DESC[r];
            if (!info) return;
            html += `<span class="ov-rel-tag" style="border-color:${info.color};color:${info.color}">${info.full} ×${c}</span>`;
        });
        html += `</div>`;
        html += `</div>`;

        // 3. 오행 밸런스
        html += `<div class="ov-card">`;
        html += `<div class="ov-card-badge">⚖️ 오행 밸런스</div>`;
        html += `<div class="ov-elem-bars">`;
        const sorted = Object.entries(elemCounts).sort((a, b) => b[1] - a[1]);
        sorted.forEach(([el, count]) => {
            const pct = Math.round((count / total) * 100);
            html += `<div class="ov-elem-row">`;
            html += `<span class="ov-elem-label" style="color:${EC[el]}">${EK[el]}</span>`;
            html += `<div class="ov-elem-bar"><div class="ov-elem-fill" style="width:${pct}%;background:${EC[el]}"></div></div>`;
            html += `<span class="ov-elem-pct">${count}개 (${pct}%)</span>`;
            html += `</div>`;
        });
        html += `</div>`;
        html += `<div class="ov-balance-advice">${getBalanceAdvice(sorted[0][0], sorted[sorted.length - 1][0])}</div>`;
        html += `</div>`;

        // 4. 한 줄 요약
        html += `<div class="ov-card ov-summary">`;
        html += `<div class="ov-card-badge">✨ DJ 명리의 한 줄 요약</div>`;
        html += `<div class="ov-summary-text">"${getSummary(stemInfo, elemCounts)}"</div>`;
        html += `</div>`;

        // 5. 프리미엄 유도
        html += `<div class="ov-card ov-premium-cta">`;
        html += `<div class="ov-premium-emoji">🔮</div>`;
        html += `<div class="ov-premium-title">더 깊이 알고 싶으신가요?</div>`;
        html += `<div class="ov-premium-desc">대운·세운·건강·전략 등 심층 분석과 AI 상담으로<br>당신만의 운명 전략을 세워보세요.</div>`;
        html += `<div class="ov-premium-links">`;
        html += `<a href="deep.html" class="ov-link-btn">🔍 심층 상담</a>`;
        html += `<a href="daeun.html" class="ov-link-btn">📈 대운 흐름</a>`;
        html += `<a href="seun.html" class="ov-link-btn">📅 세운 분석</a>`;
        html += `<a href="chat.html" class="ov-link-btn ov-link-pro">💬 AI 상담실</a>`;
        html += `</div>`;
        html += `</div>`;

        container.innerHTML = html;
    }

    // ===== 사주 입력 폼 연동 =====
    function initSajuForm() {
        const btn = document.getElementById('saju-submit-btn');
        if (!btn) return;
        btn.addEventListener('click', () => {
            if (!M) return;
            const name = document.getElementById('saju-name')?.value?.trim() || '방문자';
            const calType = document.getElementById('saju-calendar')?.value || '양력';
            const birthVal = document.getElementById('saju-birth')?.value;
            const timeVal = document.getElementById('saju-time')?.value || '모름';
            const gender = document.getElementById('saju-gender')?.value || '남성';

            if (!birthVal) { alert('생년월일을 입력해 주세요.'); return; }

            let dateStr = birthVal;
            let isLunar = calType.includes('음력');

            if (isLunar) {
                const [y, m, d] = birthVal.split('-').map(Number);
                const isLeap = calType.includes('윤달');
                const converted = M.lunarToSolar(y, m, d, isLeap);
                if (converted) dateStr = `${converted.year}-${String(converted.month).padStart(2, '0')}-${String(converted.day).padStart(2, '0')}`;
            }

            const birthDisplay = `${birthVal} (${calType})`;
            const chart = M.getChart(dateStr, timeVal);
            const daeun = M.getDaeun(dateStr, gender, timeVal);

            const sajuData = { chart, daeun, userProfile: { name, birth: birthDisplay, gender, time: timeVal } };
            localStorage.setItem('sajuData', JSON.stringify(sajuData));

            // 조회 목록 저장
            let list = [];
            try { list = JSON.parse(localStorage.getItem('queryList') || '[]'); } catch (e) { }
            const exists = list.some(q => q.birth === birthDisplay && q.name === name);
            if (!exists) {
                list.unshift({ name, birth: birthDisplay, gender, time: timeVal, chartData: sajuData, timestamp: Date.now() });
                if (list.length > 20) list.pop();
                localStorage.setItem('queryList', JSON.stringify(list));
            }

            render();
            renderQueryList();
        });
    }

    // ===== 조회 목록 =====
    function renderQueryList() {
        const section = document.getElementById('query-history-section');
        const list = document.getElementById('query-list');
        const clearBtn = document.getElementById('clear-all-queries');
        if (!section || !list) return;

        let queries = [];
        try { queries = JSON.parse(localStorage.getItem('queryList') || '[]'); } catch (e) { }
        if (!queries.length) { section.style.display = 'none'; return; }
        section.style.display = 'block';
        list.innerHTML = '';

        if (clearBtn) {
            clearBtn.onclick = () => {
                if (confirm('모든 조회 기록을 삭제할까요?')) {
                    localStorage.removeItem('queryList');
                    localStorage.removeItem('sajuData');
                    renderQueryList();
                    render();
                }
            };
        }

        queries.forEach(q => {
            const item = document.createElement('div');
            item.className = 'query-item';
            item.style.cssText = 'display:flex;align-items:center;gap:.5rem;padding:.4rem .5rem;border-radius:8px;cursor:pointer;transition:background .2s;font-size:.75rem;';
            item.onmouseenter = () => item.style.background = 'var(--bg-elevated)';
            item.onmouseleave = () => item.style.background = 'transparent';
            item.onclick = () => {
                localStorage.setItem('sajuData', JSON.stringify(q.chartData));
                render();
            };
            const genderIcon = q.gender === '여성' ? '♀' : '♂';
            const shortBirth = q.birth.replace(/\s*\(.*\)/, '');
            item.innerHTML = `<div class="qi-avatar">${genderIcon}</div><div class="qi-info"><div class="qi-birth">${shortBirth}</div><div class="qi-gender">${q.gender} · ${q.name}</div></div>`;
            list.appendChild(item);
        });
    }

    // ===== 테마 =====
    function initTheme() {
        const saved = localStorage.getItem('theme') || 'dark';
        document.documentElement.setAttribute('data-theme', saved);
        updateThemeUI(saved === 'light');
    }
    function toggleTheme() {
        const current = document.documentElement.getAttribute('data-theme') || 'dark';
        const next = current === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', next);
        localStorage.setItem('theme', next);
        updateThemeUI(next === 'light');
    }
    function updateThemeUI(isLight) {
        const icon = document.querySelector('.theme-icon i');
        const label = document.querySelector('.theme-label');
        if (icon) icon.className = isLight ? 'ph ph-sun' : 'ph ph-moon';
        if (label) label.textContent = isLight ? '다크 모드' : '라이트 모드';
    }

    // ===== Init =====
    window.addEventListener('DOMContentLoaded', () => {
        if (M) M.load().then(() => { render(); }).catch(() => { });
        initSajuForm();
        renderQueryList();
        initTheme();
        const themeToggle = document.getElementById('theme-toggle');
        if (themeToggle) themeToggle.addEventListener('click', toggleTheme);

        // 모바일 메뉴
        const mobileMenuBtn = document.getElementById('mobile-menu-btn');
        const sidebar = document.querySelector('.sidebar');
        const overlay = document.getElementById('sidebar-overlay');
        if (mobileMenuBtn && sidebar) {
            mobileMenuBtn.addEventListener('click', () => { sidebar.classList.toggle('open'); if (overlay) overlay.classList.toggle('active'); });
        }
        if (overlay && sidebar) {
            overlay.addEventListener('click', () => { sidebar.classList.remove('open'); overlay.classList.remove('active'); });
        }
    });
})();
