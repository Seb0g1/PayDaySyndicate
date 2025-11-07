import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // В production режиме Next.js автоматически определяет hostname из переменных окружения
  // Убедитесь, что NEXTAUTH_URL и AUTH_URL настроены правильно
  
  // Исключаем папку scripts из сборки Next.js
  // Скрипты в scripts/ выполняются отдельно через ts-node или tsx
  webpack: (config) => {
    // Исключаем папку scripts из сборки
    config.resolve.alias = {
      ...config.resolve.alias,
    };
    
    // Игнорируем скрипты при сборке
    config.module.rules.push({
      test: /scripts\/.*\.ts$/,
      use: 'ignore-loader',
    });
    
    return config;
  },
};

export default nextConfig;
