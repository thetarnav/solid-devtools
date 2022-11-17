// vite.config.ts
import { defineConfig } from "file:///C:/Users/gthet/Repositories/solid-devtools/node_modules/.pnpm/vite@3.2.4/node_modules/vite/dist/node/index.js";
import solidPlugin from "file:///C:/Users/gthet/Repositories/solid-devtools/node_modules/.pnpm/vite-plugin-solid@2.4.0_solid-js@1.6.2+vite@3.2.4/node_modules/vite-plugin-solid/dist/esm/index.mjs";
import devtoolsPlugin from "file:///C:/Users/gthet/Repositories/solid-devtools/packages/transform/dist/index.js";
import Unocss from "file:///C:/Users/gthet/Repositories/solid-devtools/node_modules/.pnpm/unocss@0.46.5_vite@3.2.4/node_modules/unocss/dist/vite.mjs";
var vite_config_default = defineConfig((config) => {
  const usingExtension = process.env.EXT === "true" || process.env.EXT === "1";
  return {
    plugins: [
      devtoolsPlugin({
        jsxLocation: true,
        componentLocation: true,
        name: true
      }),
      solidPlugin({ hot: false, dev: true }),
      Unocss()
    ],
    define: {
      "process.env.EXT": JSON.stringify(usingExtension)
    },
    resolve: {
      conditions: ["browser", "development"]
    },
    mode: "development",
    build: {
      target: "esnext",
      minify: false
    },
    optimizeDeps: {
      exclude: ["solid-js/store", "@solid-devtools/debugger"]
    }
  };
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFxndGhldFxcXFxSZXBvc2l0b3JpZXNcXFxcc29saWQtZGV2dG9vbHNcXFxcZXhhbXBsZXNcXFxcc2FuZGJveFwiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiQzpcXFxcVXNlcnNcXFxcZ3RoZXRcXFxcUmVwb3NpdG9yaWVzXFxcXHNvbGlkLWRldnRvb2xzXFxcXGV4YW1wbGVzXFxcXHNhbmRib3hcXFxcdml0ZS5jb25maWcudHNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL0M6L1VzZXJzL2d0aGV0L1JlcG9zaXRvcmllcy9zb2xpZC1kZXZ0b29scy9leGFtcGxlcy9zYW5kYm94L3ZpdGUuY29uZmlnLnRzXCI7aW1wb3J0IHsgZGVmaW5lQ29uZmlnIH0gZnJvbSAndml0ZSdcclxuaW1wb3J0IHNvbGlkUGx1Z2luIGZyb20gJ3ZpdGUtcGx1Z2luLXNvbGlkJ1xyXG5pbXBvcnQgZGV2dG9vbHNQbHVnaW4gZnJvbSAnQHNvbGlkLWRldnRvb2xzL3RyYW5zZm9ybSdcclxuaW1wb3J0IFVub2NzcyBmcm9tICd1bm9jc3Mvdml0ZSdcclxuXHJcbmV4cG9ydCBkZWZhdWx0IGRlZmluZUNvbmZpZyhjb25maWcgPT4ge1xyXG4gIGNvbnN0IHVzaW5nRXh0ZW5zaW9uID0gcHJvY2Vzcy5lbnYuRVhUID09PSAndHJ1ZScgfHwgcHJvY2Vzcy5lbnYuRVhUID09PSAnMSdcclxuXHJcbiAgcmV0dXJuIHtcclxuICAgIHBsdWdpbnM6IFtcclxuICAgICAgZGV2dG9vbHNQbHVnaW4oe1xyXG4gICAgICAgIC8vIHdyYXBTdG9yZXM6IHRydWUsXHJcbiAgICAgICAganN4TG9jYXRpb246IHRydWUsXHJcbiAgICAgICAgY29tcG9uZW50TG9jYXRpb246IHRydWUsXHJcbiAgICAgICAgbmFtZTogdHJ1ZSxcclxuICAgICAgfSksXHJcbiAgICAgIHNvbGlkUGx1Z2luKHsgaG90OiBmYWxzZSwgZGV2OiB0cnVlIH0pLFxyXG4gICAgICBVbm9jc3MoKSxcclxuICAgIF0sXHJcbiAgICBkZWZpbmU6IHtcclxuICAgICAgJ3Byb2Nlc3MuZW52LkVYVCc6IEpTT04uc3RyaW5naWZ5KHVzaW5nRXh0ZW5zaW9uKSxcclxuICAgIH0sXHJcbiAgICByZXNvbHZlOiB7XHJcbiAgICAgIGNvbmRpdGlvbnM6IFsnYnJvd3NlcicsICdkZXZlbG9wbWVudCddLFxyXG4gICAgfSxcclxuICAgIG1vZGU6ICdkZXZlbG9wbWVudCcsXHJcbiAgICBidWlsZDoge1xyXG4gICAgICB0YXJnZXQ6ICdlc25leHQnLFxyXG4gICAgICBtaW5pZnk6IGZhbHNlLFxyXG4gICAgfSxcclxuICAgIG9wdGltaXplRGVwczoge1xyXG4gICAgICBleGNsdWRlOiBbJ3NvbGlkLWpzL3N0b3JlJywgJ0Bzb2xpZC1kZXZ0b29scy9kZWJ1Z2dlciddLFxyXG4gICAgfSxcclxuICB9XHJcbn0pXHJcbiJdLAogICJtYXBwaW5ncyI6ICI7QUFBaVgsU0FBUyxvQkFBb0I7QUFDOVksT0FBTyxpQkFBaUI7QUFDeEIsT0FBTyxvQkFBb0I7QUFDM0IsT0FBTyxZQUFZO0FBRW5CLElBQU8sc0JBQVEsYUFBYSxZQUFVO0FBQ3BDLFFBQU0saUJBQWlCLFFBQVEsSUFBSSxRQUFRLFVBQVUsUUFBUSxJQUFJLFFBQVE7QUFFekUsU0FBTztBQUFBLElBQ0wsU0FBUztBQUFBLE1BQ1AsZUFBZTtBQUFBLFFBRWIsYUFBYTtBQUFBLFFBQ2IsbUJBQW1CO0FBQUEsUUFDbkIsTUFBTTtBQUFBLE1BQ1IsQ0FBQztBQUFBLE1BQ0QsWUFBWSxFQUFFLEtBQUssT0FBTyxLQUFLLEtBQUssQ0FBQztBQUFBLE1BQ3JDLE9BQU87QUFBQSxJQUNUO0FBQUEsSUFDQSxRQUFRO0FBQUEsTUFDTixtQkFBbUIsS0FBSyxVQUFVLGNBQWM7QUFBQSxJQUNsRDtBQUFBLElBQ0EsU0FBUztBQUFBLE1BQ1AsWUFBWSxDQUFDLFdBQVcsYUFBYTtBQUFBLElBQ3ZDO0FBQUEsSUFDQSxNQUFNO0FBQUEsSUFDTixPQUFPO0FBQUEsTUFDTCxRQUFRO0FBQUEsTUFDUixRQUFRO0FBQUEsSUFDVjtBQUFBLElBQ0EsY0FBYztBQUFBLE1BQ1osU0FBUyxDQUFDLGtCQUFrQiwwQkFBMEI7QUFBQSxJQUN4RDtBQUFBLEVBQ0Y7QUFDRixDQUFDOyIsCiAgIm5hbWVzIjogW10KfQo=
