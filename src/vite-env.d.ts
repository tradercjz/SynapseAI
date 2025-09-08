
interface ImportMetaEnv {
    readonly VITE_API_BASE_URL: string;
  // 在这里添加你其他的环境变量
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}