import { fileURLToPath } from "node:url";

import type { NextConfig } from "next";

// GitHub Pages 프로젝트 사이트(https://<user>.github.io/<repo>)로 배포할 때는
// NEXT_PUBLIC_BASE_PATH=/portfolio 를 지정한다. 로컬 dev 에서는 비워두면 된다.
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

const nextConfig: NextConfig = {
  // 상위 디렉토리에 다른 lockfile 이 있어 Turbopack 이 워크스페이스 루트를 잘못 잡는 것을 막는다.
  turbopack: { root: fileURLToPath(new URL(".", import.meta.url)) },
  output: "export",
  basePath,
  trailingSlash: true,
  images: { unoptimized: true },
};

export default nextConfig;
