/**
 * Vercel Serverless Function - Gemini API Proxy
 * API 키를 서버에서 안전하게 보관하고 Gemini API에 프록시합니다.
 */

// 사용 가능한 모델 목록 (우선순위 순서)
const MODELS = [
    "gemini-2.0-flash",
    "gemini-flash-latest",
    "gemini-2.5-flash-preview-05-20",
    "gemini-1.5-pro"
];

export default async function handler(req, res) {
    // CORS 헤더 설정
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Preflight 요청 처리
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // POST 요청만 허용
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // API 키 확인
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    if (!GEMINI_API_KEY) {
        console.error('GEMINI_API_KEY is not set');
        return res.status(500).json({ error: 'API 키가 설정되지 않았습니다.' });
    }

    const { messages } = req.body;

    if (!messages || !Array.isArray(messages)) {
        return res.status(400).json({ error: 'messages 배열이 필요합니다.' });
    }

    let lastError = null;

    // 모델 순차 시도
    for (const modelName of MODELS) {
        for (let retry = 0; retry < 3; retry++) {
            if (retry > 0) {
                await new Promise(resolve => setTimeout(resolve, Math.pow(2, retry) * 1000));
            }

            try {
                const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${GEMINI_API_KEY}`;

                const response = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: messages.map(m => ({
                            role: m.role === 'ai' ? 'model' : m.role,
                            parts: m.parts
                        }))
                    })
                });

                if (response.ok) {
                    const data = await response.json();
                    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

                    if (text) {
                        return res.status(200).json({ text, model: modelName });
                    }
                    throw new Error('AI 응답에 텍스트가 없습니다.');
                }

                const errorData = await response.json().catch(() => ({}));
                const status = response.status;
                const message = errorData.error?.message || response.statusText;

                if (status === 429) {
                    lastError = new Error(`할당량 초과 (${modelName}): ${message}`);
                    continue;
                } else if (status === 404) {
                    break; // 다음 모델로
                } else {
                    throw new Error(`API 오류 (${status}): ${message}`);
                }

            } catch (err) {
                console.warn(`${modelName} 시도 중 에러:`, err.message);
                lastError = err;
                if (!err.message.includes('429')) break;
            }
        }
    }

    return res.status(500).json({
        error: lastError?.message || '모든 AI 모델 연결에 실패했습니다.'
    });
}
