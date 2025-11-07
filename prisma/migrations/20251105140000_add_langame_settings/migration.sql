-- CreateTable
CREATE TABLE "LangameSettings" (
    "id" TEXT NOT NULL,
    "apiKey" TEXT,
    "clubId" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "baseUrl" TEXT DEFAULT 'https://api.langame.ru',
    "excludedProductIds" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LangameSettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LangameSettings_id_key" ON "LangameSettings"("id");

