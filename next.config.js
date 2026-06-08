const isProd = process.env.NODE_ENV === "production";

const nextConfig = {
  output: "export",
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  basePath: isProd ? "/box-tracker" : "",
  assetPrefix: isProd ? "/box-tracker/" : "",
};

module.exports = nextConfig;