import { onRequest as __ai_js_onRequest } from "D:\\Documents\\CODING\\JAVASCRIPT\\react-image-video-leonardo\\functions\\ai.js"
import { onRequest as __ai_copy_js_onRequest } from "D:\\Documents\\CODING\\JAVASCRIPT\\react-image-video-leonardo\\functions\\ai copy.js"
import { onRequest as __ai_copy_2_js_onRequest } from "D:\\Documents\\CODING\\JAVASCRIPT\\react-image-video-leonardo\\functions\\ai copy 2.js"

export const routes = [
    {
      routePath: "/ai",
      mountPath: "/",
      method: "",
      middlewares: [],
      modules: [__ai_js_onRequest],
    },
  {
      routePath: "/ai copy",
      mountPath: "/",
      method: "",
      middlewares: [],
      modules: [__ai_copy_js_onRequest],
    },
  {
      routePath: "/ai copy 2",
      mountPath: "/",
      method: "",
      middlewares: [],
      modules: [__ai_copy_2_js_onRequest],
    },
  ]