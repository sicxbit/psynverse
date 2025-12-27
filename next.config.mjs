/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
        pathname: "/**",
      },
    ],
  },
  experimental: {
    mdxRs: true,
    turbopackUseSystemTlsCerts: true,
  },
};

export default nextConfig;
