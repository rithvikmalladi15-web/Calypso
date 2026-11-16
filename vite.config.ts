import { defineConfig, loadEnv } from 'vite'
import rogerHandler from './api/roger'
import tailwindcss from '@tailwindcss/vite'
export default defineConfig(({mode})=>{
  // Only the Node middleware receives these values; never define them in client code.
  const env=loadEnv(mode,process.cwd(),'')
  for(const key of ['GEMINI_API_KEY','GEMINI_MODEL','MISTRAL_API_KEY','MISTRAL_MODEL'])if(!process.env[key]&&env[key])process.env[key]=env[key]
  return {
    plugins:[tailwindcss(),{name:'roger-local-api',configureServer(server){server.middlewares.use('/api/roger',(req,res)=>{void rogerHandler(req,res)})}}],
    build:{rollupOptions:{output:{manualChunks:{charts:['recharts']}}}},
  }
})
