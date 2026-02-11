/**
 * 만세력 모듈 - 사주 계산을 위한 만세력 데이터 조회
 * 1900년 ~ 2100년 데이터 지원
 */

// 만세력 데이터 저장소
let manseryeokData = null;
let dataLoaded = false;
let loadingPromise = null;

// 천간 (天干) - 10개
const HEAVENLY_STEMS = {
    '甲': { korean: '갑', element: 'Wood', yinyang: '양' },
    '乙': { korean: '을', element: 'Wood', yinyang: '음' },
    '丙': { korean: '병', element: 'Fire', yinyang: '양' },
    '丁': { korean: '정', element: 'Fire', yinyang: '음' },
    '戊': { korean: '무', element: 'Earth', yinyang: '양' },
    '己': { korean: '기', element: 'Earth', yinyang: '음' },
    '庚': { korean: '경', element: 'Metal', yinyang: '양' },
    '辛': { korean: '신', element: 'Metal', yinyang: '음' },
    '壬': { korean: '임', element: 'Water', yinyang: '양' },
    '癸': { korean: '계', element: 'Water', yinyang: '음' }
};

// 지지 (地支) - 12개
const EARTHLY_BRANCHES = {
    '子': { korean: '자', element: 'Water', yinyang: '양', animal: '쥐' },
    '丑': { korean: '축', element: 'Earth', yinyang: '음', animal: '소' },
    '寅': { korean: '인', element: 'Wood', yinyang: '양', animal: '호랑이' },
    '卯': { korean: '묘', element: 'Wood', yinyang: '음', animal: '토끼' },
    '辰': { korean: '진', element: 'Earth', yinyang: '양', animal: '용' },
    '巳': { korean: '사', element: 'Fire', yinyang: '음', animal: '뱀' },
    '午': { korean: '오', element: 'Fire', yinyang: '양', animal: '말' },
    '未': { korean: '미', element: 'Earth', yinyang: '음', animal: '양' },
    '申': { korean: '신', element: 'Metal', yinyang: '양', animal: '원숭이' },
    '酉': { korean: '유', element: 'Metal', yinyang: '음', animal: '닭' },
    '戌': { korean: '술', element: 'Earth', yinyang: '양', animal: '개' },
    '亥': { korean: '해', element: 'Water', yinyang: '음', animal: '돼지' }
};

// 시주 계산을 위한 천간 매핑 (일간에 따른 시간 천간)
const HOUR_STEM_MAP = {
    '甲': ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸', '甲', '乙'],
    '己': ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸', '甲', '乙'],
    '乙': ['丙', '丁', '戊', '己', '庚', '辛', '壬', '癸', '甲', '乙', '丙', '丁'],
    '庚': ['丙', '丁', '戊', '己', '庚', '辛', '壬', '癸', '甲', '乙', '丙', '丁'],
    '丙': ['戊', '己', '庚', '辛', '壬', '癸', '甲', '乙', '丙', '丁', '戊', '己'],
    '辛': ['戊', '己', '庚', '辛', '壬', '癸', '甲', '乙', '丙', '丁', '戊', '己'],
    '丁': ['庚', '辛', '壬', '癸', '甲', '乙', '丙', '丁', '戊', '己', '庚', '辛'],
    '壬': ['庚', '辛', '壬', '癸', '甲', '乙', '丙', '丁', '戊', '己', '庚', '辛'],
    '戊': ['壬', '癸', '甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'],
    '癸': ['壬', '癸', '甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸']
};

// 시간대별 지지 (12시진)
const HOUR_BRANCHES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];

/**
 * 만세력 데이터 로드
 */
async function loadManseryeokData() {
    if (dataLoaded) return manseryeokData;
    if (loadingPromise) return loadingPromise;

    loadingPromise = fetch('manseryeok_data.json')
        .then(response => {
            if (!response.ok) throw new Error('만세력 데이터를 불러올 수 없습니다.');
            return response.json();
        })
        .then(data => {
            manseryeokData = data;
            dataLoaded = true;
            console.log('만세력 데이터 로드 완료:', Object.keys(data).length, '일');
            return data;
        })
        .catch(error => {
            console.error('만세력 데이터 로드 실패:', error);
            throw error;
        });

    return loadingPromise;
}

/**
 * 시간을 시진 인덱스로 변환 (0-11)
 */
function getHourBranchIndex(hour) {
    // 자시(子時): 23:00-01:00 → 0
    // 축시(丑時): 01:00-03:00 → 1
    // ... 해시(亥時): 21:00-23:00 → 11
    if (hour >= 23 || hour < 1) return 0;  // 자시
    return Math.floor((hour + 1) / 2);
}

/**
 * 시주 계산
 */
function calculateHourPillar(dayStem, hour) {
    const branchIndex = getHourBranchIndex(hour);
    const branch = HOUR_BRANCHES[branchIndex];
    const stem = HOUR_STEM_MAP[dayStem][branchIndex];

    return {
        stem: stem,
        branch: branch,
        hanja: stem + branch,
        korean: HEAVENLY_STEMS[stem].korean + EARTHLY_BRANCHES[branch].korean,
        element: HEAVENLY_STEMS[stem].element
    };
}

/**
 * 간지에서 천간과 지지 분리
 */
function parseGanji(ganji) {
    if (!ganji || ganji.length !== 2) return null;
    const stem = ganji[0];
    const branch = ganji[1];

    return {
        stem: stem,
        branch: branch,
        stemInfo: HEAVENLY_STEMS[stem],
        branchInfo: EARTHLY_BRANCHES[branch]
    };
}

/**
 * 사주팔자 계산 (년주, 월주, 일주, 시주)
 * @param {number} year - 양력 연도
 * @param {number} month - 양력 월 (1-12)
 * @param {number} day - 양력 일 (1-31)
 * @param {number} hour - 시간 (0-23)
 * @returns {Object} 사주 정보
 */
async function calculateSaju(year, month, day, hour = 12) {
    await loadManseryeokData();

    // 자시 환국(子時換局) 적용
    // 23:00~23:59 (야자시)에 태어난 경우, 다음 날의 일주를 사용
    let adjustedYear = year;
    let adjustedMonth = month;
    let adjustedDay = day;
    let isJasiHwanguk = false;

    if (hour >= 23) {
        isJasiHwanguk = true;
        // 다음 날로 조정
        const nextDate = new Date(year, month - 1, day + 1);
        adjustedYear = nextDate.getFullYear();
        adjustedMonth = nextDate.getMonth() + 1;
        adjustedDay = nextDate.getDate();
    }

    // 날짜 키 생성 (자시 환국 적용된 날짜)
    const dateKey = `${adjustedYear}${String(adjustedMonth).padStart(2, '0')}${String(adjustedDay).padStart(2, '0')}`;
    const record = manseryeokData[dateKey];

    if (!record) {
        throw new Error(`${adjustedYear}년 ${adjustedMonth}월 ${adjustedDay}일의 만세력 데이터가 없습니다.`);
    }

    // 년주, 월주, 일주 파싱 (자시 환국 적용된 일주)
    const yearPillar = parseGanji(record.y);
    const monthPillar = parseGanji(record.m);
    const dayPillar = parseGanji(record.d);

    // 시주 계산 (자시 환국 적용된 일간 기준)
    const hourPillar = calculateHourPillar(dayPillar.stem, hour);

    return {
        // 년주 (Year Pillar)
        year: {
            stem: yearPillar.stem,
            branch: yearPillar.branch,
            hanja: record.y,
            korean: record.yk,
            stemElement: yearPillar.stemInfo.element,
            branchElement: yearPillar.branchInfo.element
        },
        // 월주 (Month Pillar)
        month: {
            stem: monthPillar.stem,
            branch: monthPillar.branch,
            hanja: record.m,
            korean: record.mk,
            stemElement: monthPillar.stemInfo.element,
            branchElement: monthPillar.branchInfo.element
        },
        // 일주 (Day Pillar) - 일간이 곧 본인
        day: {
            stem: dayPillar.stem,
            branch: dayPillar.branch,
            hanja: record.d,
            korean: record.dk,
            stemElement: dayPillar.stemInfo.element,
            branchElement: dayPillar.branchInfo.element
        },
        // 시주 (Hour Pillar)
        hour: {
            stem: hourPillar.stem,
            branch: hourPillar.branch,
            hanja: hourPillar.hanja,
            korean: hourPillar.korean,
            stemElement: HEAVENLY_STEMS[hourPillar.stem].element,
            branchElement: EARTHLY_BRANCHES[hourPillar.branch].element
        },
        // 음력 정보
        lunar: {
            year: record.ly,
            month: record.lm,
            day: record.ld,
            isLeapMonth: record.leap === 1
        },
        // 일간 (본원) 분석
        dayMaster: {
            stem: dayPillar.stem,
            korean: dayPillar.stemInfo.korean,
            element: dayPillar.stemInfo.element,
            yinyang: dayPillar.stemInfo.yinyang
        }
    };
}

/**
 * 사주 결과를 JSON 형식으로 반환 (AI에게 전달용)
 */
async function getSajuChartForAI(year, month, day, hour, name = "방문자", gender = "미상") {
    const saju = await calculateSaju(year, month, day, hour);

    return {
        userProfile: {
            name: name,
            birth: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')} (${hour}시)`,
            gender: gender
        },
        chart: {
            year: { stem: saju.year.hanja, branch: saju.year.hanja, element: saju.year.element },
            month: { stem: saju.month.hanja, branch: saju.month.hanja, element: saju.month.element },
            day: { stem: saju.day.hanja, branch: saju.day.hanja, element: saju.day.element },
            hour: { stem: saju.hour.hanja, branch: saju.hour.hanja, element: saju.hour.element }
        },
        dayMasterAnalysis: `일간 ${saju.dayMaster.korean}(${saju.dayMaster.stem}) - ${saju.dayMaster.element} 오행, ${saju.dayMaster.yinyang}의 기운`
    };
}

/**
 * 오행 한글명
 */
function getElementKorean(element) {
    const map = {
        'Wood': '목(木)',
        'Fire': '화(火)',
        'Earth': '토(土)',
        'Metal': '금(金)',
        'Water': '수(水)'
    };
    return map[element] || element;
}

/**
 * 음력 → 양력 변환
 * 만세력 데이터에서 음력 날짜에 해당하는 양력 날짜를 검색합니다.
 * @param {number} lunarYear - 음력 연도
 * @param {number} lunarMonth - 음력 월 (1-12)
 * @param {number} lunarDay - 음력 일 (1-30)
 * @param {boolean} isLeapMonth - 윤달 여부 (기본 false)
 * @returns {Object|null} { year, month, day } 양력 날짜 또는 null
 */
async function lunarToSolar(lunarYear, lunarMonth, lunarDay, isLeapMonth = false) {
    await loadManseryeokData();

    const lmStr = String(lunarMonth);
    const ldStr = String(lunarDay);

    // 검색 범위: 음력 연도 기준 양력 연도 ±1년
    const startYear = lunarYear;
    const endYear = lunarYear + 1;

    for (let y = startYear; y <= endYear; y++) {
        for (let m = 1; m <= 12; m++) {
            const daysInMonth = new Date(y, m, 0).getDate();
            for (let d = 1; d <= daysInMonth; d++) {
                const dateKey = `${y}${String(m).padStart(2, '0')}${String(d).padStart(2, '0')}`;
                const record = manseryeokData[dateKey];
                if (!record) continue;

                if (record.ly === lunarYear &&
                    record.lm === lmStr &&
                    record.ld === ldStr) {
                    // 윤달 구분: leap==1이면 윤달
                    if (isLeapMonth && record.leap !== 1) continue;
                    if (!isLeapMonth && record.leap === 1) continue;
                    return { year: y, month: m, day: d };
                }
            }
        }
    }

    return null;
}

// ========== 대운 계산 ==========

// 천간, 지지 순서 배열
const STEMS_ORDER = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
const BRANCHES_ORDER = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];

// 60갑자 배열 생성
const SIXTY_GANJI = [];
for (let i = 0; i < 60; i++) {
    SIXTY_GANJI.push(STEMS_ORDER[i % 10] + BRANCHES_ORDER[i % 12]);
}

/**
 * 만세력 데이터에서 월주가 바뀌는 날짜(절기)를 찾는다.
 * 순행(forward=true): 생일 이후 가장 가까운 월 절입일
 * 역행(forward=false): 생일 이전 가장 가까운 월 절입일
 */
function findJeolgiDate(year, month, day, forward) {
    const birthDate = new Date(year, month - 1, day);
    const birthKey = `${year}${String(month).padStart(2, '0')}${String(day).padStart(2, '0')}`;
    const birthRecord = manseryeokData[birthKey];
    if (!birthRecord) return null;

    const birthMonthPillar = birthRecord.m;

    if (forward) {
        // 순행: 생일 다음 날부터 탐색하여 월주가 바뀌는 날을 찾음
        let searchDate = new Date(birthDate);
        for (let i = 1; i <= 45; i++) { // 최대 45일 탐색
            searchDate.setDate(searchDate.getDate() + 1);
            const y = searchDate.getFullYear();
            const m = searchDate.getMonth() + 1;
            const d = searchDate.getDate();
            const key = `${y}${String(m).padStart(2, '0')}${String(d).padStart(2, '0')}`;
            const rec = manseryeokData[key];
            if (rec && rec.m !== birthMonthPillar) {
                return searchDate;
            }
        }
    } else {
        // 역행: 생일 당일부터 과거로 탐색하여 월주가 바뀌는 날을 찾음
        let searchDate = new Date(birthDate);
        for (let i = 0; i <= 45; i++) { // 최대 45일 탐색
            const y = searchDate.getFullYear();
            const m = searchDate.getMonth() + 1;
            const d = searchDate.getDate();
            const key = `${y}${String(m).padStart(2, '0')}${String(d).padStart(2, '0')}`;
            const rec = manseryeokData[key];
            if (rec && rec.m !== birthMonthPillar) {
                // 절기일은 새 월주가 시작되는 다음 날
                const jeolgiDate = new Date(searchDate);
                jeolgiDate.setDate(jeolgiDate.getDate() + 1);
                return jeolgiDate;
            }
            searchDate.setDate(searchDate.getDate() - 1);
        }
    }
    return null;
}

/**
 * 대운 계산
 * @param {number} year - 양력 연도
 * @param {number} month - 양력 월 (1-12)
 * @param {number} day - 양력 일 (1-31)
 * @param {number} hour - 시간 (0-23)
 * @param {string} gender - '남성' 또는 '여성'
 * @returns {Object} 대운 정보
 */
async function calculateDaeun(year, month, day, hour, gender) {
    await loadManseryeokData();

    // 자시 환국 적용
    let adjustedYear = year, adjustedMonth = month, adjustedDay = day;
    if (hour >= 23) {
        const nextDate = new Date(year, month - 1, day + 1);
        adjustedYear = nextDate.getFullYear();
        adjustedMonth = nextDate.getMonth() + 1;
        adjustedDay = nextDate.getDate();
    }

    const dateKey = `${adjustedYear}${String(adjustedMonth).padStart(2, '0')}${String(adjustedDay).padStart(2, '0')}`;
    const record = manseryeokData[dateKey];
    if (!record) return null;

    const yearStem = record.y[0]; // 년주 천간
    const monthGanji = record.m;  // 월주 간지

    // 1. 순행/역행 결정
    const yearStemYinYang = HEAVENLY_STEMS[yearStem].yinyang;
    const isMale = gender === '남성' || gender === '남';

    // 양남음녀 → 순행, 음남양녀 → 역행
    let isForward;
    if (isMale) {
        isForward = yearStemYinYang === '양'; // 양남 순행, 음남 역행
    } else {
        isForward = yearStemYinYang === '음'; // 음녀 순행, 양녀 역행
    }

    // 2. 대운 시작 나이 계산
    const jeolgiDate = findJeolgiDate(adjustedYear, adjustedMonth, adjustedDay, isForward);
    let startAge = 1; // 기본값
    if (jeolgiDate) {
        const birthDate = new Date(adjustedYear, adjustedMonth - 1, adjustedDay);
        const diffDays = Math.abs(Math.round((jeolgiDate - birthDate) / (1000 * 60 * 60 * 24)));
        startAge = Math.round(diffDays / 3);
        if (startAge < 1) startAge = 1;
        if (startAge > 10) startAge = 10;
    }

    // 3. 월주에서 60갑자 인덱스 찾기
    const monthGanjiIndex = SIXTY_GANJI.indexOf(monthGanji);

    // 4. 대운 간지 12개 생성
    const daeunList = [];
    for (let i = 1; i <= 12; i++) {
        let idx;
        if (isForward) {
            idx = (monthGanjiIndex + i) % 60;
        } else {
            idx = (monthGanjiIndex - i + 60) % 60;
        }
        const ganji = SIXTY_GANJI[idx];
        const stem = ganji[0];
        const branch = ganji[1];
        const ageStart = startAge + (i - 1) * 10;
        const ageEnd = ageStart + 9;

        daeunList.push({
            index: i,
            ganji: ganji,
            ganjiKorean: HEAVENLY_STEMS[stem].korean + EARTHLY_BRANCHES[branch].korean,
            stem: stem,
            branch: branch,
            stemElement: HEAVENLY_STEMS[stem].element,
            branchElement: EARTHLY_BRANCHES[branch].element,
            stemYinYang: HEAVENLY_STEMS[stem].yinyang,
            ageStart: ageStart,
            ageEnd: ageEnd,
            yearStart: year + ageStart,
            yearEnd: year + ageEnd
        });
    }

    return {
        direction: isForward ? '순행' : '역행',
        startAge: startAge,
        monthPillar: monthGanji,
        daeunList: daeunList
    };
}

/**
 * 현재 대운 찾기
 */
function getCurrentDaeun(daeunResult, currentAge) {
    if (!daeunResult || !daeunResult.daeunList) return null;
    for (const daeun of daeunResult.daeunList) {
        if (currentAge >= daeun.ageStart && currentAge <= daeun.ageEnd) {
            return daeun;
        }
    }
    return null;
}

// 전역으로 내보내기
window.Manseryeok = {
    load: loadManseryeokData,
    calculate: calculateSaju,
    calculateDaeun: calculateDaeun,
    getCurrentDaeun: getCurrentDaeun,
    getChartForAI: getSajuChartForAI,
    getElementKorean: getElementKorean,
    lunarToSolar: lunarToSolar,
    HEAVENLY_STEMS,
    EARTHLY_BRANCHES,
    SIXTY_GANJI
};
