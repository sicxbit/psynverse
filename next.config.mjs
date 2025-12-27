/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ["res.cloudinary.com"],
  },
  experimental: {
    mdxRs: true,
    turbopackUseSystemTlsCerts: true,
  }
};

export default nextConfig;
