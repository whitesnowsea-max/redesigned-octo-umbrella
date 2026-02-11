/**
 * /api/auth/kakao — 카카오 로그인 인증 Worker
 * 인가 코드 → 토큰 교환 → 사용자 정보 조회 → KV 저장 → 세션 반환
 */
const REDIRECT_URI = 'https://saju-app.pages.dev/auth/kakao/callback';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

function jsonResponse(data, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
}

// 간단한 세션 토큰 생성 (HMAC 기반)
async function createSessionToken(userId, env) {
    const secret = env.SESSION_SECRET || 'saju-default-secret-change-me';
    const payload = `${userId}:${Date.now()}`;
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
        'raw', encoder.encode(secret),
        { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
    );
    const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
    const sigHex = [...new Uint8Array(sig)].map(b => b.toString(16).padStart(2, '0')).join('');
    return btoa(`${payload}:${sigHex}`);
}

// 세션 토큰에서 userId 추출 및 검증
async function verifySessionToken(token, env) {
    try {
        const decoded = atob(token);
        const parts = decoded.split(':');
        if (parts.length < 3) return null;
        const userId = parts[0];
        const ts = parts[1];
        const sigHex = parts.slice(2).join(':');

        // 30일 만료 확인
        const age = Date.now() - parseInt(ts);
        if (age > 30 * 24 * 60 * 60 * 1000) return null;

        // HMAC 검증
        const secret = env.SESSION_SECRET || 'saju-default-secret-change-me';
        const payload = `${userId}:${ts}`;
        const encoder = new TextEncoder();
        const key = await crypto.subtle.importKey(
            'raw', encoder.encode(secret),
            { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
        );
        const expected = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
        const expectedHex = [...new Uint8Array(expected)].map(b => b.toString(16).padStart(2, '0')).join('');

        if (sigHex !== expectedHex) return null;
        return userId;
    } catch { return null; }
}

export async function onRequestPost(context) {
    const { request, env } = context;
    const KV = env.SAJU_USERS;

    try {
        const { code } = await request.json();
        if (!code) return jsonResponse({ success: false, message: '인가 코드가 필요합니다.' }, 400);

        const KAKAO_REST_KEY = env.KAKAO_REST_API_KEY || '';
        if (!KAKAO_REST_KEY) {
            return jsonResponse({ success: false, message: '카카오 API 키가 설정되지 않았습니다.' }, 500);
        }

        // 1. 인가 코드 → 액세스 토큰
        const tokenRes = await fetch('https://kauth.kakao.com/oauth/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                grant_type: 'authorization_code',
                client_id: KAKAO_REST_KEY,
                redirect_uri: REDIRECT_URI,
                code: code
            })
        });
        const tokenData = await tokenRes.json();

        if (tokenData.error) {
            return jsonResponse({ success: false, message: `카카오 토큰 발급 실패: ${tokenData.error_description}` }, 400);
        }

        // 2. 사용자 정보 조회
        const userRes = await fetch('https://kapi.kakao.com/v2/user/me', {
            headers: { 'Authorization': `Bearer ${tokenData.access_token}` }
        });
        const userData = await userRes.json();

        const kakaoId = String(userData.id);
        const nickname = userData.properties?.nickname || '사용자';
        const profileImage = userData.properties?.profile_image || '';

        // 3. KV에서 사용자 조회 또는 생성
        const kvKey = `user:${kakaoId}`;
        let user = null;
        if (KV) {
            const existing = await KV.get(kvKey);
            if (existing) {
                user = JSON.parse(existing);
                // 닉네임/프로필 업데이트
                user.nickname = nickname;
                user.profileImage = profileImage;
                user.lastLogin = new Date().toISOString();
            } else {
                // 신규 사용자
                user = {
                    kakaoId,
                    nickname,
                    profileImage,
                    credits: 3, // 무료 3크레딧
                    premiumExpiry: null,
                    createdAt: new Date().toISOString(),
                    lastLogin: new Date().toISOString(),
                    history: [{ type: 'bonus', amount: 3, note: '가입 축하', at: new Date().toISOString() }]
                };
            }
            await KV.put(kvKey, JSON.stringify(user));
        } else {
            // KV 미설정 시 메모리 응답
            user = { kakaoId, nickname, profileImage, credits: 3, premiumExpiry: null };
        }

        // 4. 세션 토큰 생성
        const sessionToken = await createSessionToken(kakaoId, env);

        return jsonResponse({
            success: true,
            user: {
                kakaoId,
                nickname,
                profileImage,
                credits: user.credits,
                premiumExpiry: user.premiumExpiry,
            },
            sessionToken
        });

    } catch (error) {
        return jsonResponse({ success: false, message: '인증 처리 중 오류', error: error.message }, 500);
    }
}

// 세션 토큰 검증용 (다른 Worker에서 import)
export { verifySessionToken };

export async function onRequestOptions() {
    return new Response(null, { headers: corsHeaders });
}
