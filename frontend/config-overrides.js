const webpack = require("webpack");

module.exports = function override(config, env) {
    config.resolve = config.resolve || {};
    config.resolve.fallback = {
      ...config.resolve.fallback,
      path: require.resolve("path-browserify"),
      fs: false,
      crypto: require.resolve("crypto-browserify"),
      stream: require.resolve("stream-browserify"),
      vm: require.resolve("vm-browserify"),
      "process/browser": require.resolve("process/browser"),
    };

    if (!config.module) {
      config.module = {};
    }
    if (!config.module.rules) {
      config.module.rules = [];
    }

    config.module.rules.unshift({
      test: /\.m?js$/,
      resolve: {
        fullySpecified: false
      },
    });

    config.plugins = [
      ...(config.plugins || []),
      new webpack.ProvidePlugin({
          process: "process/browser.js",
      }),
    ];

    return config;
  };