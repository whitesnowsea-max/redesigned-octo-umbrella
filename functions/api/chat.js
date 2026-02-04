/**
 * Cloudflare Pages Function - Gemini API Proxy
 */

const MODELS = [
    "gemini-2.0-flash",
    "gemini-flash-latest",
    "gemini-2.5-flash-preview-05-20",
    "gemini-1.5-pro"
];

export async function onRequestPost(context) {
    const { request, env } = context;

    // CORS 헤더
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Content-Type': 'application/json'
    };

    // API 키 확인
    const GEMINI_API_KEY = env.GEMINI_API_KEY;
    if (!GEMINI_API_KEY) {
        return new Response(JSON.stringify({ error: 'API 키가 설정되지 않았습니다.' }), {
            status: 500,
            headers: corsHeaders
        });
    }

    const { messages } = await request.json();

    if (!messages || !Array.isArray(messages)) {
        return new Response(JSON.stringify({ error: 'messages 배열이 필요합니다.' }), {
            status: 400,
            headers: corsHeaders
        });
    }

    let lastError = null;

    for (const modelName of MODELS) {
        for (let retry = 0; retry < 3; retry++) {
            if (retry > 0) {
                await new Promise(r => setTimeout(r, Math.pow(2, retry) * 1000));
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
                        return new Response(JSON.stringify({ text, model: modelName }), {
                            status: 200,
                            headers: corsHeaders
                        });
                    }
                }

                if (response.status === 404) break;
                if (response.status === 429) continue;

            } catch (err) {
                lastError = err;
            }
        }
    }

    return new Response(JSON.stringify({
        error: lastError?.message || '모든 AI 모델 연결에 실패했습니다.'
    }), {
        status: 500,
        headers: corsHeaders
    });
}

export async function onRequestOptions() {
    return new Response(null, {
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type'
        }
    });
}
