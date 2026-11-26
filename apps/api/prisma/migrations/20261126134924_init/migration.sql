-- CreateEnum
CREATE TYPE "TodoStatus" AS ENUM ('todo', 'in_progress', 'done');

-- CreateTable
CREATE TABLE "Todo" (
    "id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "dueDate" DATE,
    "status" "TodoStatus" NOT NULL DEFAULT 'todo',
    "position" INTEGER NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "Todo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Todo_status_position_idx" ON "Todo"("status", "position");

-- CreateIndex
CREATE INDEX "Todo_createdAt_idx" ON "Todo"("createdAt");

-- CreateIndex
CREATE INDEX "Todo_dueDate_idx" ON "Todo"("dueDate");
