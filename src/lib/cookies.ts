import Cookies from 'js-cookie';

const COOKIE_OPTIONS = {
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  expires: 30, // 30 days
};

export const AUTH_COOKIE_NAME = 'sb-access-token';
export const REFRESH_COOKIE_NAME = 'sb-refresh-token';

export const cookies = {
  setAuthTokens: (access_token: string, refresh_token: string) => {
    Cookies.set(AUTH_COOKIE_NAME, access_token, COOKIE_OPTIONS);
    Cookies.set(REFRESH_COOKIE_NAME, refresh_token, COOKIE_OPTIONS);
  },

  getAuthTokens: () => ({
    access_token: Cookies.get(AUTH_COOKIE_NAME),
    refresh_token: Cookies.get(REFRESH_COOKIE_NAME),
  }),

  clearAuthTokens: () => {
    Cookies.remove(AUTH_COOKIE_NAME);
    Cookies.remove(REFRESH_COOKIE_NAME);
  },
}; 