import { defineConfig } from 'vite'
import rogerHandler from './api/roger'
import tailwindcss from '@tailwindcss/vite'
export default defineConfig({
  plugins:[tailwindcss(),{name:'roger-local-api',configureServer(server){server.middlewares.use('/api/roger',(req,res)=>{void rogerHandler(req,res)})}}],
  build:{rollupOptions:{output:{manualChunks:{charts:['recharts']}}}},
})
