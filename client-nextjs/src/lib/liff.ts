import liff from '@line/liff';
import { CONFIG_ENV } from './env';

/**
 * 初始化 LIFF
 */
export const initLiff = async (liffId: string) => {
  if (!liffId || liffId === 'undefined') {
    console.warn("LIFF ID is missing or undefined");
    return;
  }

  // 防止重複初始化
  if (liff.id === liffId) return;

  try {
    await liff.init({ liffId });

    if (!liff.isLoggedIn()) {
      liff.login();
    }
  } catch (error) {
    console.error("LIFF initialization failed:", error);
  }
};

/**
 * 取得 LIFF Profile
 */
export const getLiffProfile = async () => {
  if (!liff.isLoggedIn()) {
    console.warn("LIFF is not logged in");
    return null;
  }
  return await liff.getProfile();
};

/**
 * 取得 ID Token 中的 Email (需在 LINE Console 開啟權限)
 */
export const getLiffEmail = () => {
  if (!liff.isLoggedIn()) return null;
  const idToken = liff.getDecodedIDToken();
  return idToken?.email || null;
};
