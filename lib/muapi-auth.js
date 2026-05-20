export const MUAPI_KEY_COOKIE = 'muapi_key';

const COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

/** Read Muapi API key from incoming request (header or session cookie). */
export function getMuapiKeyFromRequest(request) {
    const headerKey =
        request.headers.get('x-api-key') ||
        request.headers.get('X-API-Key');
    if (headerKey?.trim()) return headerKey.trim();

    const auth = request.headers.get('authorization');
    if (auth?.toLowerCase().startsWith('bearer ')) {
        const token = auth.slice(7).trim();
        if (token) return token;
    }

    const cookieKey = request.cookies.get(MUAPI_KEY_COOKIE)?.value;
    if (cookieKey?.trim()) return cookieKey.trim();

    return null;
}

/** Cookie options for server-set session (Vercel is always HTTPS). */
export function muapiKeyCookieOptions() {
    return {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: COOKIE_MAX_AGE,
    };
}
