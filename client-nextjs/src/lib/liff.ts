import liff from '@line/liff';
import { LiffMockPlugin } from '@line/liff-mock';
import { CONFIG_ENV } from './env';

/**
 * 初始化 LIFF，開發模式下會啟用 Mock
 */
export const initLiff = async (liffId: string) => {
  if (!liffId) {
    console.warn("LIFF ID is missing");
    return;
  }

  // 防止重複初始化
  if (liff.id === liffId) return;

  try {
    if (CONFIG_ENV.nodeEnv === 'development') {
      liff.use(new LiffMockPlugin());
      await (liff as any).init({
        liffId,
        mock: true,
      });

      // 設定開發環境的 Mock 資料
      const mockAdapter = (liff as any).getMockAdapter();
      mockAdapter.setLoggedIn(true);
      mockAdapter.setProfile({
        userId: 'U1234567890abcdef1234567890abcdef',
        displayName: '測試人員(Mock)',
        pictureUrl: 'https://placehold.co/200',
        statusMessage: 'LIFF Mock Mode',
      });

    } else {
      await liff.init({ liffId });

    }

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
