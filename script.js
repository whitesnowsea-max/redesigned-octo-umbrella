// 백엔드 프록시 서버 사용 (API 키는 서버에서 안전하게 보관)
const PROXY_API_URL = "/api/chat";

let state = {
    chatHistory: [],
    currentSaju: null, // 현재 사용자의 사주 정보
    queryList: [] // 조회한 사주 목록
};

// 만세력 데이터 미리 로드
window.addEventListener('DOMContentLoaded', () => {
    if (window.Manseryeok) {
        window.Manseryeok.load().then(() => {
            console.log('만세력 데이터 준비 완료');
        }).catch(err => {
            console.warn('만세력 데이터 로드 실패:', err);
        });
    }
    // 페이지 로드 시 저장된 상태 복원
    restoreState();
});

// Map Element String to CSS Class
const ELEMENT_MAP = {
    "목": "wood", "Wood": "wood",
    "화": "fire", "Fire": "fire",
    "토": "earth", "Earth": "earth",
    "금": "metal", "Metal": "metal",
    "수": "water", "Water": "water"
};

// DOM Elements
const sidebarApiKeyInput = document.getElementById('apiKeyInput');
const saveKeyBtn = document.getElementById('saveKeyBtn');
const chatContainer = document.getElementById('chat-history');
const userInput = document.getElementById('user-input');
const sendBtn = document.getElementById('send-btn');
const suggestionChips = document.getElementById('suggestion-chips');

// Initialize API Key Input
sidebarApiKeyInput.value = state.apiKey;

// System Prompt
const SYSTEM_INSTRUCTION = `
[System Command: JSON Generation for UI]
If the user provides birth details (Date, Time, Gender), you MUST calculate the Saju chart (Manse-ryeok) internally and output a JSON block at the VERY START of your response.
Format:
\`\`\`json
{
  "userProfile": { "name": "Name", "birth": "YYYY-MM-DD (Time)", "gender": "Gender" },
  "chart": {
    "year": {"stem": "Hanja", "branch": "Hanja", "element": "Wood/Fire/Earth/Metal/Water"},
    "month": {"stem": "Hanja", "branch": "Hanja", "element": "Wood/Fire/Earth/Metal/Water"},
    "day": {"stem": "Hanja", "branch": "Hanja", "element": "Wood/Fire/Earth/Metal/Water"},
    "hour": {"stem": "Hanja", "branch": "Hanja", "element": "Wood/Fire/Earth/Metal/Water"}
  },
  "dayMasterAnalysis": "A one-sentence summary of the Day Master."
}
\`\`\`
(Do not output this JSON if birth details are not provided or already known. Only output it when updating the chart.)

***

[시스템 지침: DJ 명리]

당신은 현대적 감각을 가진 명리학자, **'DJ 명리'**입니다. 
아래의 페르소나, 철학, 해석 방식, 답변 형식을 철저히 준수하여 사용자의 사주를 풀이하세요.

---

# 1. 역할 및 페르소나 (Persona)

- **별명**: DJ 명리
- **기본 철학 (카드 게임 메타포)**: 사주는 태어나면서 받은 연월일시의 카드 8장, 10년마다 추가되는 카드 2장(대운), 1년마다 추가되는 카드 2장(세운), 총 12장의 카드로 진행하는 '**인생이라는 카드 게임**'입니다.
- **운명관**: 어떤 패를 가졌다고 운명이 결정된 것은 아닙니다. 좋은 패도 쓰지 않으면 소용없듯, 운명을 운영하는 것은 사용자의 '**행동**'입니다. 명리는 결과를 예언하는 것이 아니라, 사용자가 스스로를 돌아보게 하는 '**계기**'이자 '**이정표**'입니다.
- **어조**: 담백하고 냉철하지만, 구체적이고 자세합니다. 과도한 긍정이나 부정, 과장된 표현을 삼갑니다. '해요'체를 사용합니다.

---

# 2. 해석 원칙 (Guidelines)

- **현대적 해석**: '남편복', '재물운', '관직운' 등 전근대적인 길흉화복 위주의 해석을 **절대 하지 않습니다**.
- **성향 및 활용 중심**: 사용자가 가진 기질(성향)이 무엇인지, 이를 어떻게 활용하면 인생에 도움이 될지, 무엇을 주의해야 할지에 집중합니다.
- **생애주기 지양**: 초년, 중년, 말년 식의 추상적인 생애주기 운세 풀이를 하지 않습니다.
- **독립적 해석**: 주변인 정보가 없다면 오직 사용자(당사자)의 명리만으로 해석합니다.
- **근거 표기**: 해설 문장을 먼저 서술하고, 그 근거가 되는 명식, 십신, 신살 등을 **문장 끝에 괄호로 표기**합니다.
  - 예시: "뜨겁고 넘치는 에너지를 가지고 있어 사회적 활동이 활발하고 경쟁이 치열한 상황을 즐기거나 그러한 상황을 즐기는 성향을 가지고 있어요. **(병화 편관)**"

---

# 3. 답변 형식 (Response Structure)

모든 답변은 반드시 아래의 순서와 형식을 따릅니다. **각 섹션 사이에는 반드시 빈 줄을 두어 가독성을 높이세요.**

**[인사말]**
사용자의 이름과 생년월일을 포함하여 호명합니다.

**[오리엔테이션]**
본격적인 해설에 앞서 DJ명리의 명리에 대한 철학을 오리엔테이션으로 먼저 설명합니다:
- 명리는 **예언이 아니라 '전략'**이라는 점
- 운명은 **'운전'하는 것**이라는 점
- 나를 다스리는 **'통치술'**이라는 점
- **관계의 지도**라는 점
- 결국 **'튜닝(Tuning)'의 기술**이라는 점
이로써 해설을 읽는 사람으로 하여금 오독하는 일이 없도록 합니다.

**## 1. 핵심 캐릭터 (일주 분석)**
사용자의 일주를 분석하여 핵심적인 정체성을 설명합니다.

**## 2. 쥐고 있는 패 (사주 원국 분석)**
타고난 8글자(원국)의 특징과 강점을 분석합니다.

**## 3. 현재의 흐름 (대운 분석)**
제공된 대운 데이터를 기반으로 현재 대운의 간지와 오행을 분석하고, 일간과의 관계를 해석합니다. 대운은 이미 정확하게 계산되어 제공되므로 절대 직접 계산하지 마세요.

**## 4. 올해의 카드 (세운 분석)**
해당 연도(세운)의 운세와 분위기를 분석합니다.

**## 5. DJ 명리의 운명 믹싱 전략 (Solution)**
위 분석을 종합하여, 사용자가 취해야 할 구체적인 행동 전략과 조언을 제시합니다.

**## 6. DJ 명리의 한 줄 요약**
전체 내용을 관통하는 핵심 메시지를 한 문장으로 요약합니다.

---

# 4. 명리 해석의 기준 (Knowledge Base)

해석 시 아래의 정의와 관점을 따릅니다.

**[오행의 화두]**
- **목(木)**: 어떻게 나를 바로 세울 것인가
- **화(火)**: 어떻게 자유로울 수 있는가
- **토(土)**: 어떻게 관계 맺을 것인가
- **금(金)**: 어떻게 옳고 그름을 판단할 것인가
- **수(水)**: 나는 무엇인가

**[십신의 정의]**
- **비겁(비견/겁재)**: 자신감, 자존심. 나를 규정하는 힘.
- **식상(식신/상관)**: 습득하는 힘, 탐구하는 힘.
- **재성(편재/정재)**: 발휘하는 힘, 물질적 결과를 얻는 힘.
- **관성(편관/정관)**: 조절하는 힘, 조정하는 힘, 사회적 결과를 얻는 힘.
- **인성(편인/정인)**: 기르는 힘, 돌보는 힘, 베푸는 힘.

---

# 5. 스타일 가이드 (가독성 필수)

- 각 섹션 헤더(\`##\`) 앞뒤로는 반드시 빈 줄을 삽입하세요.
- 단락(Paragraph)은 가급적 짧게 가져가고, 의미 단위로 줄바꿈을 자주 하세요.
- 불렛 포인트(\`- \`, \` * \`) 보다는 부드러운 설명 문체(해요체)를 사용하되, 문장 사이 호흡을 길지 않게 하세요.
- 중요한 키워드는 **굵게** 표시하세요.

---

# 6. 제약 사항

- 우리는 행동의 결과를 완벽히 예측할 수 없습니다. 따라서 명리는 **'예언'이 아닌 '지침'**으로서 제시되어야 합니다.
- **"대박 날 것이다", "망할 것이다"**와 같은 극단적인 표현을 쓰지 마십시오.
- 사용자가 제공한 정보 외에 **추측성 정보를 사실인 것처럼 말하지 마십시오**.
- 사주 풀이는 '만세력' 데이터를 기반으로 정확하게 분석합니다.
`;

// --- Event Listeners ---

saveKeyBtn.addEventListener('click', () => {
    const key = sidebarApiKeyInput.value.trim();
    if (key) {
        state.apiKey = key;
        localStorage.setItem("gemini_api_key", key);
        alert("API 키가 저장되었습니다.");
    }
});

sendBtn.addEventListener('click', sendMessage);
userInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendMessage();
});

suggestionChips.addEventListener('click', (e) => {
    if (e.target.tagName === 'BUTTON') {
        const text = e.target.textContent;
        // Clean emoji
        userInput.value = text.replace(/^[^\s]+\s/, '');
        sendMessage();
    }
});

// --- Functions ---

/**
 * 생년월일시 파싱 함수
 * 다양한 형식 지원: "1990년 5월 15일 오전 9시", "1990.05.15 09:00", "90년생 5월 15일" 등
 */
function parseBirthInfo(text) {
    let year = null, month = null, day = null, hour = 12; // 기본 시간 12시 (낮)
    let name = null, gender = null;

    // 이름 추출 (이름은 xxx입니다, 저는 xxx, xxx라고 합니다 등)
    const namePatterns = [
        /(?:이름은?|저는|제 이름은?)\s*['"]?([가-힣]{2,4})['"]?/,
        /([가-힣]{2,4})(?:입니다|이에요|라고 해요|라고 합니다)/
    ];
    for (const pattern of namePatterns) {
        const match = text.match(pattern);
        if (match) {
            name = match[1];
            break;
        }
    }

    // 성별 추출
    if (/남자|남성|남/.test(text)) gender = '남성';
    else if (/여자|여성|여/.test(text)) gender = '여성';

    // 연도 파싱 (다양한 형식)
    const yearPatterns = [
        /(?:19|20)?(\d{2})년(?:생)?/,  // 90년, 1990년, 90년생
        /(\d{4})[-.\/]\d{1,2}[-.\/]\d{1,2}/,  // 1990-05-15, 1990.05.15
        /(\d{4})년/  // 1990년
    ];

    for (const pattern of yearPatterns) {
        const match = text.match(pattern);
        if (match) {
            let y = parseInt(match[1]);
            if (y < 100) {
                y = y > 30 ? 1900 + y : 2000 + y; // 30 이상이면 1900년대, 미만이면 2000년대
            }
            year = y;
            break;
        }
    }

    // 월 파싱
    const monthMatch = text.match(/(?:(\d{1,2})월|[-.\/](\d{1,2})[-.\/])/);
    if (monthMatch) {
        month = parseInt(monthMatch[1] || monthMatch[2]);
    }

    // 일 파싱
    const dayMatch = text.match(/(?:(\d{1,2})일|[-.\/]\d{1,2}[-.\/](\d{1,2}))/);
    if (dayMatch) {
        day = parseInt(dayMatch[1] || dayMatch[2]);
    }

    // 시간 파싱 - 시진(时辰) 표현 추가
    // 지지별 시간대: 子(자)=23시, 丑(축)=1시, 寅(인)=3시, 卯(묘)=5시, 辰(진)=7시, 巳(사)=9시, 
    //               午(오)=11시, 未(미)=13시, 申(신)=15시, 酉(유)=17시, 戌(술)=19시, 亥(해)=21시
    const siJinMap = {
        '자': 23, '축': 1, '인': 3, '묘': 5, '진': 7, '사': 9,
        '오': 11, '미': 13, '신': 15, '유': 17, '술': 19, '해': 21
    };

    // 시진 표현 파싱 (예: 경자시, 갑자시, 자시, 축시 등)
    const siJinMatch = text.match(/([갑을병정무기경신임계])?([자축인묘진사오미신유술해])시/);
    if (siJinMatch) {
        const branch = siJinMatch[2]; // 지지
        if (siJinMap[branch] !== undefined) {
            hour = siJinMap[branch];
        }
    } else {
        // 일반 시간 파싱
        const hourPatterns = [
            /(?:오전|새벽)\s*(\d{1,2})시/,  // 오전 9시
            /(?:오후|저녁|밤)\s*(\d{1,2})시/,  // 오후 3시
            /(\d{1,2})시(?:\s*(?:\d{1,2})분)?/,  // 14시, 9시 30분
            /(\d{1,2}):\d{2}/  // 14:30
        ];

        for (const pattern of hourPatterns) {
            const match = text.match(pattern);
            if (match) {
                let h = parseInt(match[1]);
                if (/오후|저녁|밤/.test(text) && h < 12) h += 12;
                if (/오전|새벽/.test(text) && h === 12) h = 0;
                hour = h;
                break;
            }
        }
    }

    // 유효성 검사
    if (year && month && day) {
        if (year >= 1900 && year <= 2100 && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
            return { year, month, day, hour, name, gender };
        }
    }

    return null;
}

/**
 * 사주 계산 및 사이드바 업데이트
 */
async function calculateAndDisplaySaju(birthInfo) {
    try {
        const saju = await window.Manseryeok.calculate(
            birthInfo.year, birthInfo.month, birthInfo.day, birthInfo.hour
        );

        state.currentSaju = saju;

        // 대운 계산 (성별 미지정 시 기본 '남성'으로 계산)
        let daeunResult = null;
        const genderForDaeun = birthInfo.gender || '남성';
        try {
            daeunResult = await window.Manseryeok.calculateDaeun(
                birthInfo.year, birthInfo.month, birthInfo.day, birthInfo.hour, genderForDaeun
            );
            state.currentDaeun = daeunResult;
        } catch (daeunErr) {
            console.error('대운 계산 오류:', daeunErr);
        }

        // 사이드바 업데이트
        const chartData = {
            userProfile: {
                name: birthInfo.name || '방문자',
                birth: `${birthInfo.year}-${String(birthInfo.month).padStart(2, '0')}-${String(birthInfo.day).padStart(2, '0')} (${birthInfo.hour}시)`,
                gender: birthInfo.gender || '미상'
            },
            chart: {
                year: {
                    stem: saju.year.stem,
                    branch: saju.year.branch,
                    stemElement: saju.year.stemElement,
                    branchElement: saju.year.branchElement,
                    ganji: saju.year.hanja
                },
                month: {
                    stem: saju.month.stem,
                    branch: saju.month.branch,
                    stemElement: saju.month.stemElement,
                    branchElement: saju.month.branchElement,
                    ganji: saju.month.hanja
                },
                day: {
                    stem: saju.day.stem,
                    branch: saju.day.branch,
                    stemElement: saju.day.stemElement,
                    branchElement: saju.day.branchElement,
                    ganji: saju.day.hanja
                },
                hour: {
                    stem: saju.hour.stem,
                    branch: saju.hour.branch,
                    stemElement: saju.hour.stemElement,
                    branchElement: saju.hour.branchElement,
                    ganji: saju.hour.hanja
                }
            },
            dayMasterAnalysis: `일간 ${saju.dayMaster.korean}(${saju.dayMaster.stem}) - ${window.Manseryeok.getElementKorean(saju.dayMaster.element)}, ${saju.dayMaster.yinyang}의 기운`,
            daeun: daeunResult
        };

        updateSidebar(chartData);

        // 대운 페이지에서 사용할 수 있도록 localStorage에 저장
        try {
            localStorage.setItem('sajuData', JSON.stringify(chartData));
        } catch (e) {
            console.error('localStorage 저장 실패:', e);
        }

        // 조회 목록에 추가
        addToQueryList(chartData);

        return chartData;
    } catch (err) {
        console.error('사주 계산 오류:', err);
        return null;
    }
}

async function sendMessage() {
    // 1. Always get the latest key from the UI to avoid "forgot to save" errors
    const inputKey = sidebarApiKeyInput.value.trim();
    if (inputKey) {
        state.apiKey = inputKey;
        localStorage.setItem("gemini_api_key", inputKey);
    }

    const text = userInput.value.trim();
    if (!text) return;

    // API 키는 서버에서 관리되므로 클라이언트 검증 불필요

    addMessage("user", text);
    userInput.value = "";

    const loadingId = addLoadingMessage();

    try {
        // 3. 생년월일 파싱 시도
        const birthInfo = parseBirthInfo(text);
        let sajuContext = null;

        if (birthInfo && window.Manseryeok) {
            sajuContext = await calculateAndDisplaySaju(birthInfo);
            // 생년월일 입력 메시지에 birth-key 태그 추가 (조회 목록 클릭 시 스크롤용)
            if (sajuContext) {
                const birthKey = `${sajuContext.userProfile.birth}_${sajuContext.userProfile.gender}`;
                const lastUserMsg = chatContainer.querySelector('.user-message:last-of-type') ||
                    [...chatContainer.querySelectorAll('.user-message')].pop();
                if (lastUserMsg) {
                    lastUserMsg.setAttribute('data-birth-key', birthKey);
                    saveChatMessages();
                }
            }
        }

        await callGemini(text, sajuContext);
    } catch (err) {
        removeMessage(loadingId);
        console.error(err);
        addMessage("ai", `🚨 **오류가 발생했습니다:**\n${err.message}\n\nAPI 키가 정확한지, 혹은 결제 계정 연결이 필요한 모델인지 확인해 주세요.`);
    }
}

async function callGemini(userText, sajuContext = null) {
    // 현재 날짜 정보
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    const currentDay = now.getDate();

    // 사주 데이터가 있으면 메시지에 추가
    let enhancedText = userText;
    if (sajuContext) {
        // 나이 계산 (만 나이)
        const birthYear = parseInt(sajuContext.userProfile.birth.split('-')[0]);
        const age = currentYear - birthYear;

        // 대운 정보 문자열 생성
        let daeunInfo = '';
        if (sajuContext.daeun && sajuContext.daeun.daeunList) {
            const daeun = sajuContext.daeun;
            const currentDaeun = window.Manseryeok.getCurrentDaeun(daeun, age);

            daeunInfo = `\n[대운 정보 (만세력 기반 정확 계산)]
- 대운 방향: ${daeun.direction}
- 대운 시작 나이: ${daeun.startAge}세
- 월주: ${daeun.monthPillar}
- 현재 대운: ${currentDaeun ? `${currentDaeun.ganji}(${currentDaeun.ganjiKorean}) [${currentDaeun.ageStart}세~${currentDaeun.ageEnd}세, ${currentDaeun.yearStart}~${currentDaeun.yearEnd}년]` : '대운 전 (아직 첫 대운 진입 전)'}
- 전체 대운 흐름:
${daeun.daeunList.map(d => `  ${d.ageStart}~${d.ageEnd}세 (${d.yearStart}~${d.yearEnd}년): ${d.ganji}(${d.ganjiKorean}) [${window.Manseryeok.getElementKorean(d.stemElement)}/${window.Manseryeok.getElementKorean(d.branchElement)}]${age >= d.ageStart && age <= d.ageEnd ? ' ◀ 현재' : ''}`).join('\n')}`;
        }

        const sajuInfo = `
[만세력 기반 정확한 사주 데이터]
- 이름: ${sajuContext.userProfile.name}
- 생년월일시: ${sajuContext.userProfile.birth}
- 성별: ${sajuContext.userProfile.gender}
- 년주: ${sajuContext.chart.year.ganji}
- 월주: ${sajuContext.chart.month.ganji}
- 일주: ${sajuContext.chart.day.ganji}
- 시주: ${sajuContext.chart.hour.ganji}
- 일간 분석: ${sajuContext.dayMasterAnalysis}
${daeunInfo}

[현재 시간 정보 - 세운 분석용]
- 오늘 날짜: ${currentYear}년 ${currentMonth}월 ${currentDay}일
- 현재 연도(세운): ${currentYear}년
- 만 나이: ${age}세

위 만세력 데이터와 대운/세운 정보를 기반으로 사주 풀이를 해주세요.
- 대운 분석 시 위에 제공된 정확한 대운 간지와 현재 나이(${age}세) 기준으로 분석해 주세요.
- 세운 분석 시 ${currentYear}년을 기준으로 분석해 주세요.
AI가 자체 계산하지 말고 위 데이터를 사용하세요.

사용자 원문: `;
        enhancedText = sajuInfo + userText;
    }

    const messages = [
        { role: "user", parts: [{ text: SYSTEM_INSTRUCTION }] },
        ...state.chatHistory,
        { role: "user", parts: [{ text: enhancedText }] }
    ];

    const loadingId = "loading-ai"; // 고정 ID 사용
    updateLoadingMessage(loadingId, "AI가 분석 중입니다...");

    try {
        const aiText = await fetchWithRetryAndFallback(messages, loadingId);

        // Save history
        state.chatHistory.push({ role: "user", parts: [{ text: userText }] });
        state.chatHistory.push({ role: "model", parts: [{ text: aiText }] });
        saveChatHistory();

        // Detect and remove JSON (multiple patterns)
        let displayText = aiText;
        let chartData = null;

        // Pattern 1: JSON with markdown backticks
        const jsonWithBackticks = aiText.match(/```json\s*([\s\S]*?)\s*```/);

        // Pattern 2: JSON at the very start (with or without newline)
        const jsonAtStart = aiText.match(/^\s*(\{[\s\S]*?"dayMasterAnalysis"[\s\S]*?\})\s*/);

        // Pattern 3: JSON anywhere with userProfile marker
        const jsonAnywhere = aiText.match(/(\{[\s\S]*?"userProfile"[\s\S]*?"dayMasterAnalysis"[\s\S]*?\})/);

        if (jsonWithBackticks) {
            try {
                chartData = JSON.parse(jsonWithBackticks[1]);
                displayText = aiText.replace(/```json\s*[\s\S]*?\s*```\s*/, "").trim();
            } catch (e) {
                console.error("JSON Parsing Failed (with backticks)", e);
            }
        } else if (jsonAtStart) {
            try {
                chartData = JSON.parse(jsonAtStart[1]);
                displayText = aiText.replace(jsonAtStart[0], "").trim();
            } catch (e) {
                console.error("JSON Parsing Failed (at start)", e);
            }
        } else if (jsonAnywhere) {
            try {
                chartData = JSON.parse(jsonAnywhere[1]);
                displayText = aiText.replace(jsonAnywhere[0], "").trim();
            } catch (e) {
                console.error("JSON Parsing Failed (anywhere)", e);
            }
        }

        if (chartData) {
            // AI 응답에서 호출 시 색상 업데이트 건너뛰기 (만세력에서 이미 정확한 색상 적용됨)
            updateSidebar(chartData, true);
        }

        addMessage("ai", displayText);
        removeMessage(loadingId);

    } catch (error) {
        console.error(error);
        removeMessage(loadingId);
        let errorMsg = `🚨 **오류가 발생했습니다:**\n${error.message}`;
        errorMsg += "\n\nAPI 키의 사용량이 초과되었거나 일시적인 연결 오류일 수 있습니다. 잠시 후 다시 시도해 주세요.";
        addMessage("ai", errorMsg);
    }
}

/**
 * 백엔드 프록시를 통해 API 호출 (재시도/폴백은 서버에서 처리)
 */
async function fetchWithRetryAndFallback(messages, loadingId) {
    updateLoadingMessage(loadingId, "AI가 분석 중입니다...");

    try {
        const response = await fetch(PROXY_API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ messages })
        });

        if (response.ok) {
            const data = await response.json();
            if (data.text) {
                console.log(`모델 사용: ${data.model}`);
                return data.text;
            }
            throw new Error("AI 응답에 텍스트가 없습니다.");
        }

        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `API 오류 (${response.status})`);

    } catch (err) {
        console.error("Proxy API 에러:", err);
        throw err;
    }
}

function updateLoadingMessage(id, text) {
    let el = document.getElementById(id);
    if (!el) {
        el = document.createElement('div');
        el.id = id;
        el.className = `message ai-message`;
        chatContainer.appendChild(el);
    }
    el.innerHTML = `<div class="bubble"><i class="ph ph-circle-notch animate-spin"></i> ${text}</div>`;
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

async function checkAvailableModels() {
    // 더 이상 직접 호출되지 않음 (fetchWithRetryAndFallback에서 모델 순회)
}

function addMessage(role, text) {
    const msgDiv = document.createElement('div');
    msgDiv.className = `message ${role}-message`;

    const bubble = document.createElement('div');
    bubble.className = "bubble markdown-body";
    bubble.innerHTML = marked.parse(text);

    msgDiv.appendChild(bubble);
    chatContainer.appendChild(msgDiv);
    chatContainer.scrollTop = chatContainer.scrollHeight;

    // 채팅 메시지를 localStorage에 저장 (페이지 이동 후 복원용)
    saveChatMessages();
}

function saveChatMessages() {
    try {
        const messages = [];
        chatContainer.querySelectorAll('.message').forEach(msg => {
            if (msg.classList.contains('system-notice')) return; // 초기 인사 건너뛰기
            const role = msg.classList.contains('user-message') ? 'user' : 'ai';
            const bubble = msg.querySelector('.bubble');
            if (bubble) {
                const item = { role, html: bubble.innerHTML };
                if (msg.getAttribute('data-birth-key')) {
                    item.birthKey = msg.getAttribute('data-birth-key');
                }
                messages.push(item);
            }
        });
        localStorage.setItem('chatMessages', JSON.stringify(messages));
    } catch (e) {
        console.error('채팅 저장 실패:', e);
    }
}

function saveChatHistory() {
    try {
        localStorage.setItem('chatHistoryState', JSON.stringify(state.chatHistory));
    } catch (e) {
        console.error('chatHistory 저장 실패:', e);
    }
}

function restoreState() {
    // 1. 사주 명식 복원
    const sajuStr = localStorage.getItem('sajuData');
    if (sajuStr) {
        try {
            const sajuData = JSON.parse(sajuStr);
            if (sajuData && sajuData.chart) {
                updateSidebar(sajuData);
                state.currentSaju = sajuData;
                if (sajuData.daeun) {
                    state.currentDaeun = sajuData.daeun;
                }
            }
        } catch (e) {
            console.error('사주 복원 실패:', e);
        }
    }

    // 2. 대화 내역 (chatHistory) 복원
    const historyStr = localStorage.getItem('chatHistoryState');
    if (historyStr) {
        try {
            state.chatHistory = JSON.parse(historyStr);
        } catch (e) {
            console.error('chatHistory 복원 실패:', e);
        }
    }

    // 3. 채팅 메시지 DOM 복원
    const messagesStr = localStorage.getItem('chatMessages');
    if (messagesStr) {
        try {
            const messages = JSON.parse(messagesStr);
            if (messages.length > 0) {
                messages.forEach(msg => {
                    const msgDiv = document.createElement('div');
                    msgDiv.className = `message ${msg.role === 'user' ? 'user' : 'ai'}-message`;
                    if (msg.birthKey) {
                        msgDiv.setAttribute('data-birth-key', msg.birthKey);
                    }
                    const bubble = document.createElement('div');
                    bubble.className = 'bubble markdown-body';
                    bubble.innerHTML = msg.html;
                    msgDiv.appendChild(bubble);
                    chatContainer.appendChild(msgDiv);
                });
                chatContainer.scrollTop = chatContainer.scrollHeight;
            }
        } catch (e) {
            console.error('채팅 메시지 복원 실패:', e);
        }
    }

    // 4. 조회 목록 복원
    const queryStr = localStorage.getItem('queryList');
    if (queryStr) {
        try {
            state.queryList = JSON.parse(queryStr);
            renderQueryList();
        } catch (e) {
            console.error('조회 목록 복원 실패:', e);
        }
    }
}

// ===== 조회 목록 관리 =====

function addToQueryList(chartData) {
    if (!chartData || !chartData.userProfile) return;

    const birth = chartData.userProfile.birth;
    const gender = chartData.userProfile.gender || '미상';

    // 중복 체크 (같은 생년월일시 + 성별)
    const key = `${birth}_${gender}`;
    const exists = state.queryList.find(q => `${q.birth}_${q.gender}` === key);
    if (exists) {
        // 이미 있으면 활성만 변경
        state.queryList.forEach(q => q.active = false);
        exists.active = true;
        exists.chartData = chartData; // 최신 데이터로 업데이트
    } else {
        // 기존 항목 비활성화
        state.queryList.forEach(q => q.active = false);
        // 새 항목 추가
        state.queryList.push({
            name: chartData.userProfile.name || '방문자',
            birth: birth,
            gender: gender,
            chartData: chartData,
            active: true,
            timestamp: Date.now()
        });
    }

    // localStorage 저장
    try {
        localStorage.setItem('queryList', JSON.stringify(state.queryList));
    } catch (e) {
        console.error('조회 목록 저장 실패:', e);
    }

    renderQueryList();
}

function renderQueryList() {
    const section = document.getElementById('query-history-section');
    const list = document.getElementById('query-list');
    if (!section || !list) return;

    if (state.queryList.length === 0) {
        section.style.display = 'none';
        return;
    }

    section.style.display = 'block';
    list.innerHTML = '';

    state.queryList.forEach((q, idx) => {
        const item = document.createElement('div');
        item.className = `query-item ${q.active ? 'active' : ''}`;
        item.onclick = () => switchToQuery(idx);

        const genderIcon = q.gender === '여성' ? '♀' : q.gender === '남성' ? '♂' : '?';
        const shortBirth = q.birth.replace(/\s*\(.*\)/, '');

        item.innerHTML = `
            <div class="qi-avatar">${genderIcon}</div>
            <div class="qi-info">
                <div class="qi-birth">${shortBirth}</div>
                <div class="qi-gender">${q.gender} · ${q.name}</div>
            </div>
            <button class="qi-delete" title="삭제" onclick="event.stopPropagation(); deleteQuery(${idx});">×</button>
        `;

        list.appendChild(item);
    });

    // 초기화 버튼 이벤트
    const clearBtn = document.getElementById('clear-all-queries');
    if (clearBtn) {
        clearBtn.onclick = clearAllQueries;
    }
}

function deleteQuery(index) {
    if (index < 0 || index >= state.queryList.length) return;

    const wasActive = state.queryList[index].active;
    state.queryList.splice(index, 1);

    // 삭제된 항목이 활성 상태였으면 첫 번째 항목을 활성화
    if (wasActive && state.queryList.length > 0) {
        state.queryList[0].active = true;
        const chartData = state.queryList[0].chartData;
        updateSidebar(chartData);
        state.currentSaju = chartData;
        localStorage.setItem('sajuData', JSON.stringify(chartData));
    }

    localStorage.setItem('queryList', JSON.stringify(state.queryList));
    renderQueryList();
}

function clearAllQueries() {
    if (!confirm('모든 조회 목록과 채팅 내용을 초기화하시겠습니까?')) return;

    // 상태 초기화
    state.queryList = [];
    state.chatHistory = [];
    state.currentSaju = null;
    state.currentDaeun = null;

    // localStorage 초기화
    localStorage.removeItem('queryList');
    localStorage.removeItem('chatMessages');
    localStorage.removeItem('chatHistoryState');
    localStorage.removeItem('sajuData');

    // 채팅 영역 초기화
    if (chatContainer) {
        chatContainer.innerHTML = '';
    }

    // 사이드바 명식 초기화
    ['year', 'month', 'day', 'hour'].forEach(type => {
        const stemEl = document.getElementById(`${type}-stem`);
        const branchEl = document.getElementById(`${type}-branch`);
        if (stemEl) { stemEl.textContent = '-'; stemEl.style.color = ''; }
        if (branchEl) { branchEl.textContent = '-'; branchEl.style.color = ''; }
    });
    const profileEl = document.getElementById('user-profile-display');
    if (profileEl) profileEl.style.display = 'none';
    const dayMasterEl = document.getElementById('day-master-desc');
    if (dayMasterEl) dayMasterEl.textContent = '대화창에 생년월일을 입력하면 이곳에 분석 결과가 표시됩니다.';

    renderQueryList();
}

function switchToQuery(index) {
    if (index < 0 || index >= state.queryList.length) return;

    // 모든 항목 비활성화 후 선택된 항목만 활성화
    state.queryList.forEach(q => q.active = false);
    state.queryList[index].active = true;

    const q = state.queryList[index];
    const chartData = q.chartData;

    // 사이드바 업데이트
    updateSidebar(chartData);
    state.currentSaju = chartData;
    if (chartData.daeun) {
        state.currentDaeun = chartData.daeun;
    }

    // 대운 페이지용 localStorage 업데이트
    try {
        localStorage.setItem('sajuData', JSON.stringify(chartData));
        localStorage.setItem('queryList', JSON.stringify(state.queryList));
    } catch (e) {
        console.error('localStorage 저장 실패:', e);
    }

    renderQueryList();

    // 해당 생년월일 입력 메시지로 스크롤
    const birthKey = `${q.birth}_${q.gender}`;
    const targetMsg = chatContainer.querySelector(`[data-birth-key="${birthKey}"]`);
    if (targetMsg) {
        targetMsg.scrollIntoView({ behavior: 'smooth', block: 'center' });
        // 하이라이트 효과
        targetMsg.style.transition = 'box-shadow 0.3s';
        targetMsg.style.boxShadow = '0 0 15px rgba(138, 43, 226, 0.4)';
        setTimeout(() => { targetMsg.style.boxShadow = ''; }, 2000);
    }
}

function addLoadingMessage() {
    const id = "loading-" + Date.now();
    const msgDiv = document.createElement('div');
    msgDiv.id = id;
    msgDiv.className = `message ai-message`;
    msgDiv.innerHTML = `<div class="bubble">...</div>`;
    chatContainer.appendChild(msgDiv);
    chatContainer.scrollTop = chatContainer.scrollHeight;
    return id;
}

function removeMessage(id) {
    const el = document.getElementById(id);
    if (el) el.remove();
}

function updateSidebar(data, skipColors = false) {
    // 1. Show User Profile
    if (data.userProfile) {
        document.getElementById('user-profile-display').style.display = 'flex';
        document.getElementById('display-name').textContent = data.userProfile.name;
        document.getElementById('display-birth').textContent = data.userProfile.birth;
    }

    // 2. Update Pillars
    const setPillar = (type, info) => {
        if (!info) return;
        const stemEl = document.getElementById(`${type}-stem`);
        const branchEl = document.getElementById(`${type}-branch`);

        stemEl.textContent = info.stem;
        branchEl.textContent = info.branch;

        // skipColors가 true면 색상 업데이트 건너뛰기 (AI 응답에서 호출 시)
        if (!skipColors) {
            // 개별 요소의 색상 적용 (없으면 기존 element 사용)
            const stemClass = ELEMENT_MAP[info.stemElement] || ELEMENT_MAP[info.element] || "";
            const branchClass = ELEMENT_MAP[info.branchElement] || ELEMENT_MAP[info.element] || "";

            stemEl.className = `pillar-box ${type === 'day' ? 'day-master' : ''} ${stemClass}`;
            branchEl.className = `pillar-box ${branchClass}`;
        }
    };

    if (data.chart) {
        setPillar('year', data.chart.year);
        setPillar('month', data.chart.month);
        setPillar('day', data.chart.day);
        setPillar('hour', data.chart.hour);
    }

    if (data.dayMasterAnalysis) {
        document.getElementById('day-master-desc').textContent = data.dayMasterAnalysis;
    }
}
