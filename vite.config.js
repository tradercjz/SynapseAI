import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // 字符串简写写法
      // '/api': 'http://127.0.0.1:8001',

      // 或者使用更灵活的选项配置
      '/api': {
        // --- 关键：这里需要填写您 FastAPI 后端的地址 ---
        target: 'http://183.134.101.139:8001', 
        
        // changeOrigin: true 对于反向代理是必须的，它会修改请求头中的 Host，
        // 使其与目标服务器匹配，很多服务器基于 Host 头进行路由。
        changeOrigin: true,
        ws: true
        
        // 可选：如果您想重写路径 (例如去掉 /api)，但在此场景下我们不需要
        // rewrite: (path) => path.replace(/^\/api/, '') 
      },
    }
  }
})
