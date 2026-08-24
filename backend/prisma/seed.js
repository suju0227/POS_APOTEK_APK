const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

const roles = [
  { name: 'KASIR', description: 'Kasir apotek untuk transaksi penjualan.' },
  { name: 'APOTEKER', description: 'Apoteker untuk pelayanan resep dan konseling.' },
  { name: 'MANAGER', description: 'Manager apotek untuk pengelolaan data dan laporan.' },
  { name: 'PEMILIK', description: 'Pemilik apotek untuk akses ringkasan bisnis.' },
];

const units = [
  { name: 'tablet', symbol: 'tablet' },
  { name: 'kaplet', symbol: 'kaplet' },
  { name: 'kapsul', symbol: 'kapsul' },
  { name: 'strip', symbol: 'strip' },
  { name: 'box', symbol: 'box' },
  { name: 'botol', symbol: 'botol' },
  { name: 'tube', symbol: 'tube' },
  { name: 'sachet', symbol: 'sachet' },
  { name: 'biji', symbol: 'biji' },
  { name: 'pcs', symbol: 'pcs' },
];

async function main() {
  for (const role of roles) {
    await prisma.role.upsert({
      where: { name: role.name },
      update: { description: role.description },
      create: role,
    });
  }

  for (const unit of units) {
    await prisma.unit.upsert({
      where: { name: unit.name },
      update: { symbol: unit.symbol, isActive: true },
      create: unit,
    });
  }

  const managerRole = await prisma.role.findUniqueOrThrow({
    where: { name: 'MANAGER' },
  });

  const passwordHash = await bcrypt.hash('ChangeMe123!', 12);

  await prisma.user.upsert({
    where: { username: 'manager' },
    update: {
      roleId: managerRole.id,
      name: 'Manager Apotek',
      email: 'manager@risyah.local',
      isActive: true,
    },
    create: {
      roleId: managerRole.id,
      name: 'Manager Apotek',
      username: 'manager',
      email: 'manager@risyah.local',
      passwordHash,
      isActive: true,
    },
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
