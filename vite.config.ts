import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";
// @ts-ignore - server-only native ESM module, deliberately excluded from frontend imports.
import { createDesignHandler } from "./server/design-book.mjs";
export default defineConfig(({mode}) => {
  const env = {...process.env, ...loadEnv(mode,process.cwd(),'DESIGN_')};
  const attach = (server:any) => {
    const handler=createDesignHandler({root:process.cwd(),allowLocalKey:true,env});
    server.middlewares.use((req:any,res:any,next:any)=>{
      const path=(req.url || '').split('?')[0];
      if(path === '/api/design-book')return handler(req,res);
      next();
    });
  };
  return {
    plugins:[react(),{name:'river-design-book',configureServer:attach,configurePreviewServer:attach}],
    server:{fs:{deny:['.env','.env.*','**/.git/**','**/.secrets/**','**/private/**','**/server/**','**/api/**','**/scripts/**']}},
    resolve:{alias:{'@':fileURLToPath(new URL('./src',import.meta.url))}}
  };
});
