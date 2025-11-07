import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // В production режиме Next.js автоматически определяет hostname из переменных окружения
  // Убедитесь, что NEXTAUTH_URL и AUTH_URL настроены правильно
  
  // Конфигурация Turbopack (Next.js 16 использует Turbopack по умолчанию)
  // Пустая конфигурация отключает предупреждение
  turbopack: {},
};

export default nextConfig;
