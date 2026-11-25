/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true,
  },
  // 出图接口要读取母版实物图做结构约束；Serverless 部署时 public/ 默认不打进函数包。
  outputFileTracingIncludes: {
    "/api/agent/visualize": ["./public/cases/**/*", "./public/generated/**/*"],
  },
};

export default nextConfig;
