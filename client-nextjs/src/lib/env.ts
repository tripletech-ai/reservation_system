export const CONFIG_ENV = {
    supabase: {
        url: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
        serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_K || '',
    },
    google: {
        gasUrl: process.env.NEXT_PUBLIC_GAS_URL || '',
    },
    services: {
        lineNotifyEdge: process.env.NEXT_PUBLIC_EDGE_FUNCTION || '',
        lineNotifyEdgePush: process.env.NEXT_PUBLIC_EDGE_FUNCTION_PUSH || '',
    },
    nodeEnv: process.env.NODE_ENV,
    liffId: process.env.NEXT_PUBLIC_LIFF_ID,
    deployEnv: process.env.NEXT_PUBLIC_DEPLOY_ENV,
} as const;