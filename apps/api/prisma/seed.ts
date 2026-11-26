/**
 * Prisma Seed Script
 * Creates initial data for development
 */

import { PrismaClient, UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // Create branches
  const branches = await Promise.all([
    prisma.branch.upsert({
      where: { code: "WS01" },
      update: {},
      create: { code: "WS01", name: "WellSpring Main - Davao", address: "J.P. Laurel Ave, Davao City", phone: "+63 82 123 4567" },
    }),
    prisma.branch.upsert({
      where: { code: "WS02" },
      update: {},
      create: { code: "WS02", name: "WellSpring North - Tagum", address: "National Highway, Tagum City", phone: "+63 84 123 4567" },
    }),
    prisma.branch.upsert({
      where: { code: "WS03" },
      update: {},
      create: { code: "WS03", name: "WellSpring South - Digos", address: "Rizal Ave, Digos City", phone: "+63 82 123 4568" },
    }),
  ]);

  const mainBranch = branches[0];

  // Create categories
  const categories = await Promise.all([
    prisma.category.upsert({ where: { name: "Prescription Medicines" }, update: {}, create: { name: "Prescription Medicines", description: "RX-only pharmaceuticals" } }),
    prisma.category.upsert({ where: { name: "OTC Medicines" }, update: {}, create: { name: "OTC Medicines", description: "Over-the-counter medicines" } }),
    prisma.category.upsert({ where: { name: "Personal Care" }, update: {}, create: { name: "Personal Care", description: "Hygiene and personal care products" } }),
    prisma.category.upsert({ where: { name: "General Retail" }, update: {}, create: { name: "General Retail", description: "General merchandise" } }),
  ]);

  const rxCat = categories[0];
  const otcCat = categories[1];
  const pcCat = categories[2];

  // Create products
  const products = await Promise.all([
    prisma.product.upsert({
      where: { sku: "AMOX-500-100" },
      update: {},
      create: { sku: "AMOX-500-100", barcode: "4801234500012", name: "Amoxicillin 500mg x 100 caps", categoryId: rxCat.id, unitOfMeasure: "box", standardPrice: 450, costPrice: 280, isPrescriptionOnly: true, isBatchTracked: true, reorderPoint: 20, safetyStock: 10 },
    }),
    prisma.product.upsert({
      where: { sku: "PARA-500-100" },
      update: {},
      create: { sku: "PARA-500-100", barcode: "4801234500029", name: "Paracetamol 500mg x 100 tabs", categoryId: otcCat.id, unitOfMeasure: "box", standardPrice: 120, costPrice: 75, isPrescriptionOnly: false, isBatchTracked: true, reorderPoint: 50, safetyStock: 20 },
    }),
    prisma.product.upsert({
      where: { sku: "VIT-C-500-30" },
      update: {},
      create: { sku: "VIT-C-500-30", barcode: "4801234500036", name: "Vitamin C 500mg x 30 tabs", categoryId: otcCat.id, unitOfMeasure: "box", standardPrice: 180, costPrice: 110, isPrescriptionOnly: false, isBatchTracked: true, reorderPoint: 30, safetyStock: 10 },
    }),
    prisma.product.upsert({
      where: { sku: "BIOFLU-10" },
      update: {},
      create: { sku: "BIOFLU-10", barcode: "4801234500043", name: "Bioflu Tablet x 10", categoryId: otcCat.id, unitOfMeasure: "box", standardPrice: 65, costPrice: 40, isPrescriptionOnly: false, isBatchTracked: true, reorderPoint: 40, safetyStock: 15 },
    }),
    prisma.product.upsert({
      where: { sku: "ALCOHOL-70-500" },
      update: {},
      create: { sku: "ALCOHOL-70-500", barcode: "4801234500050", name: "Isopropyl Alcohol 70% 500ml", categoryId: pcCat.id, unitOfMeasure: "bottle", standardPrice: 85, costPrice: 50, isPrescriptionOnly: false, isBatchTracked: false, reorderPoint: 100, safetyStock: 30 },
    }),
    prisma.product.upsert({
      where: { sku: "MASK-50" },
      update: {},
      create: { sku: "MASK-50", barcode: "4801234500067", name: "Surgical Mask 50s", categoryId: pcCat.id, unitOfMeasure: "box", standardPrice: 150, costPrice: 90, isPrescriptionOnly: false, isBatchTracked: false, reorderPoint: 50, safetyStock: 20 },
    }),
  ]);

  // Create initial stock levels
  for (const branch of branches) {
    for (const product of products) {
      const stockKey = { productId: product.id, branchId: branch.id, batchId: null };
      const existingStock = await prisma.stockLevel.findFirst({ where: stockKey });
      if (!existingStock) {
        await prisma.stockLevel.create({
          data: { ...stockKey, quantityOnHand: 50, quantityAvailable: 50 },
        });
      }
    }
  }

  // Create supplier
  const supplier = await prisma.supplier.upsert({
    where: { code: "PHARMA-SUPPLY" },
    update: {},
    create: { code: "PHARMA-SUPPLY", name: "Pharma Supply Inc.", contactPerson: "Juan Dela Cruz", email: "orders@pharmasupply.ph", phone: "+63 2 8123 4567", address: "Makati City, Metro Manila", paymentTerms: "Net 30", leadTimeDays: 5 },
  });

  // Create users
  const passwordHash = await bcrypt.hash("password123", 12);

  const users = [
    { email: "admin@wellspring.ph", name: "System Admin", role: UserRole.SYSTEM_ADMIN, branchId: null },
    { email: "ho.manager@wellspring.ph", name: "Head Office Manager", role: UserRole.HEAD_OFFICE_MANAGER, branchId: null },
    { email: "branch1.mgr@wellspring.ph", name: "Branch 1 Manager", role: UserRole.BRANCH_MANAGER, branchId: branches[0].id },
    { email: "cashier1@wellspring.ph", name: "Cashier One", role: UserRole.CASHIER, branchId: branches[0].id },
    { email: "cashier2@wellspring.ph", name: "Cashier Two", role: UserRole.CASHIER, branchId: branches[0].id },
    { email: "pharmacist1@wellspring.ph", name: "Pharmacist One", role: UserRole.PHARMACIST, branchId: branches[0].id },
    { email: "inventory1@wellspring.ph", name: "Inventory Staff", role: UserRole.INVENTORY_STAFF, branchId: branches[0].id },
    { email: "purchasing1@wellspring.ph", name: "Purchasing Officer", role: UserRole.PURCHASING_OFFICER, branchId: branches[0].id },
    { email: "supervisor1@wellspring.ph", name: "Store Supervisor", role: UserRole.STORE_SUPERVISOR, branchId: branches[0].id },
  ];

  for (const u of users) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: { email: u.email, passwordHash, name: u.name, role: u.role, branchId: u.branchId },
    });
  }

  console.log("✅ Seeding completed!");
  console.log(`📦 Branches: ${branches.length}`);
  console.log(`📂 Categories: ${categories.length}`);
  console.log(`💊 Products: ${products.length}`);
  console.log(`👥 Users: ${users.length}`);
  console.log("\n🔐 Default password for all users: password123");
  console.log("👤 Login as: admin@wellspring.ph / password123");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });