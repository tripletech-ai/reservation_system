import withBundleAnalyzer from '@next/bundle-analyzer';

const bundleAnalyzer = withBundleAnalyzer({
    enabled: process.env.ANALYZE === 'true',
});

/** @type {import('next').NextConfig} */
const nextConfig = {
    // 你原本的 webpack, experimental, turbo 等設定放在這裡
    experimental: {
        serverMinification: true,
    },
};

export default bundleAnalyzer(nextConfig);