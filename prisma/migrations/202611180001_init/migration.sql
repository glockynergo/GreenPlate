-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" TEXT NOT NULL CHECK ("role" IN ('customer', 'seller')),
    "demo" BOOLEAN NOT NULL DEFAULT false
);

-- CreateTable
CREATE TABLE "Session" (
    "tokenHash" TEXT NOT NULL PRIMARY KEY,
    "expires" DATETIME NOT NULL,
    "userId" TEXT NOT NULL,
    CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Shop" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ownerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "demo" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "Shop_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Offer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shopId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "image" TEXT NOT NULL,
    "original" INTEGER NOT NULL,
    "price" INTEGER NOT NULL CHECK ("price" > 0 AND "price" < "original"),
    "stock" INTEGER NOT NULL CHECK ("stock" >= 0),
    "ingredients" TEXT NOT NULL,
    "allergens" TEXT NOT NULL,
    "storage" TEXT NOT NULL,
    "starts" DATETIME NOT NULL,
    "ends" DATETIME NOT NULL CHECK ("ends" > "starts"),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "donation" BOOLEAN NOT NULL DEFAULT false,
    "updated" DATETIME NOT NULL,
    CONSTRAINT "Offer_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "offerId" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL CHECK ("quantity" > 0),
    "unit" INTEGER NOT NULL,
    "original" INTEGER NOT NULL,
    "total" INTEGER NOT NULL,
    "fee" INTEGER NOT NULL,
    "payout" INTEGER NOT NULL CHECK ("fee" >= 0 AND "payout" >= 0 AND "fee" + "payout" = "total" AND "total" = "unit" * "quantity"),
    "status" TEXT NOT NULL DEFAULT 'confirmed' CHECK ("status" IN ('confirmed', 'collected', 'canceled', 'missed')),
    "code" TEXT NOT NULL,
    "snapshot" JSONB NOT NULL,
    "starts" DATETIME NOT NULL,
    "ends" DATETIME NOT NULL CHECK ("ends" > "starts"),
    "created" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Order_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Order_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "Offer" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Order_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Favorite" (
    "userId" TEXT NOT NULL,
    "offerId" TEXT NOT NULL,

    PRIMARY KEY ("userId", "offerId"),
    CONSTRAINT "Favorite_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Favorite_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "Offer" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Session_expires_idx" ON "Session"("expires");

-- CreateIndex
CREATE UNIQUE INDEX "Shop_ownerId_key" ON "Shop"("ownerId");

-- CreateIndex
CREATE INDEX "Offer_active_donation_ends_idx" ON "Offer"("active", "donation", "ends");

-- CreateIndex
CREATE INDEX "Offer_shopId_idx" ON "Offer"("shopId");

-- CreateIndex
CREATE UNIQUE INDEX "Order_code_key" ON "Order"("code");

-- CreateIndex
CREATE INDEX "Order_userId_created_idx" ON "Order"("userId", "created");

-- CreateIndex
CREATE INDEX "Order_shopId_status_ends_idx" ON "Order"("shopId", "status", "ends");

