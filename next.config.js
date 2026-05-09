/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [
      // The hosted snippet is `/widget-loader.js`. Serve it from a route handler.
      { source: "/widget-loader.js", destination: "/widget-loader" },
    ];
  },
  async headers() {
    return [
      {
        // Allow the embeddable widget to be loaded cross-origin in iframes.
        source: "/widget/:path*",
        headers: [
          { key: "X-Frame-Options", value: "ALLOWALL" },
          { key: "Content-Security-Policy", value: "frame-ancestors *;" },
        ],
      },
      {
        source: "/widget-loader.js",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Cache-Control", value: "public, max-age=300" },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
