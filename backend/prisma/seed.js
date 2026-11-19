require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  await prisma.businessSettings.upsert({
    where: { id: 'main' },
    update: {},
    create: { id: 'main', name: 'FERRETTI BARBER' }
  });

  const services = [
    'Corte masculino', 'Degradê (Fade)', 'Corte social', 'Barba',
    'Sobrancelha', 'Pezinho', 'Combo cabelo + barba'
  ];
  for (const name of services) {
    await prisma.service.upsert({
      where: { id: `seed-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}` },
      update: {},
      create: { id: `seed-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`, name, price: 0, duration: name === 'Combo cabelo + barba' ? 60 : 30 }
    });
  }

  if (process.env.SEED_ADMIN_EMAIL && process.env.SEED_ADMIN_PASSWORD) {
    await prisma.admin.upsert({
      where: { email: process.env.SEED_ADMIN_EMAIL.toLowerCase() },
      update: {},
      create: {
        name: process.env.SEED_ADMIN_NAME || 'Administrador',
        email: process.env.SEED_ADMIN_EMAIL.toLowerCase(),
        password: await bcrypt.hash(process.env.SEED_ADMIN_PASSWORD, 12)
      }
    });
  }
}

main().finally(() => prisma.$disconnect());
