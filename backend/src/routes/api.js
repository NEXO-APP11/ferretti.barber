const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { z } = require('zod');
const { PrismaClient } = require('@prisma/client');
const auth = require('../middleware/auth');

const prisma = new PrismaClient();
const router = express.Router();

const asyncRoute = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

router.post('/auth/login', asyncRoute(async (req, res) => {
  const body = z.object({ email: z.string().email(), password: z.string().min(6) }).parse(req.body);
  const admin = await prisma.admin.findUnique({ where: { email: body.email.toLowerCase() } });
  if (!admin || !(await bcrypt.compare(body.password, admin.password))) {
    return res.status(401).json({ message: 'E-mail ou senha inválidos' });
  }
  const token = jwt.sign({ sub: admin.id, email: admin.email }, process.env.JWT_SECRET, { expiresIn: '8h' });
  res.json({ token, admin: { id: admin.id, name: admin.name, email: admin.email } });
}));

router.get('/public/settings', asyncRoute(async (_req, res) => {
  const settings = await prisma.businessSettings.upsert({
    where: { id: 'main' }, update: {}, create: { id: 'main' }
  });
  res.json({ name: settings.name, whatsapp: settings.whatsapp, address: settings.address, instagram: settings.instagram, openingTime: settings.openingTime, closingTime: settings.closingTime, workingDays: settings.workingDays, slotMinutes: settings.slotMinutes });
}));

router.get('/public/services', asyncRoute(async (_req, res) => {
  const services = await prisma.service.findMany({ where: { active: true }, orderBy: { createdAt: 'asc' } });
  res.json(services.map((service) => ({ ...service, price: Number(service.price) })));
}));

router.get('/public/availability', asyncRoute(async (req, res) => {
  const query = z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), serviceId: z.string().min(1) }).parse(req.query);
  const service = await prisma.service.findFirst({ where: { id: query.serviceId, active: true } });
  if (!service) return res.status(404).json({ message: 'Serviço não encontrado' });
  const settings = await prisma.businessSettings.findUnique({ where: { id: 'main' } });
  const start = new Date(`${query.date}T00:00:00`);
  if (Number.isNaN(start.getTime())) return res.status(400).json({ message: 'Data inválida' });
  const end = new Date(start); end.setDate(end.getDate() + 1);
  const day = start.getDay();
  if (!settings || !settings.workingDays.includes(day)) return res.json({ slots: [] });
  const [openHour, openMinute] = (settings.openingTime || '09:00').split(':').map(Number);
  const [closeHour, closeMinute] = (settings.closingTime || '19:00').split(':').map(Number);
  const appointments = await prisma.appointment.findMany({
    where: { startAt: { gte: start, lt: end }, status: { not: 'CANCELED' } }
  });
  const slots = [];
  for (let minutes = openHour * 60 + openMinute; minutes + service.duration <= closeHour * 60 + closeMinute; minutes += settings.slotMinutes) {
    const slotStart = new Date(start); slotStart.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
    const slotEnd = new Date(slotStart.getTime() + service.duration * 60000);
    const conflict = appointments.some((a) => slotStart < a.endAt && slotEnd > a.startAt);
    if (!conflict && slotStart > new Date()) slots.push(slotStart.toISOString());
  }
  res.json({ slots });
}));

router.post('/public/appointments', asyncRoute(async (req, res) => {
  const body = z.object({
    name: z.string().trim().min(2).max(100), phone: z.string().trim().min(8).max(20),
    serviceId: z.string().min(1), startAt: z.string().datetime(), notes: z.string().max(500).optional()
  }).parse(req.body);
  const service = await prisma.service.findFirst({ where: { id: body.serviceId, active: true } });
  if (!service) return res.status(404).json({ message: 'Serviço não encontrado' });
  const startAt = new Date(body.startAt); const endAt = new Date(startAt.getTime() + service.duration * 60000);
  const conflict = await prisma.appointment.findFirst({
    where: { status: { not: 'CANCELED' }, startAt: { lt: endAt }, endAt: { gt: startAt } }
  });
  if (conflict) return res.status(409).json({ message: 'Este horário acabou de ser ocupado' });
  let savedClient = await prisma.client.findFirst({ where: { phone: body.phone } });
  if (savedClient) {
    savedClient = await prisma.client.update({ where: { id: savedClient.id }, data: { name: body.name, active: true } });
  } else {
    savedClient = await prisma.client.create({ data: { name: body.name, phone: body.phone } });
  }
  const appointment = await prisma.appointment.create({ data: { clientId: savedClient.id, serviceId: service.id, startAt, endAt, source: 'whatsapp', notes: body.notes, status: 'PENDING' } });
  res.status(201).json({ appointment, confirmed: false, message: 'Solicitação registrada. O agendamento depende de confirmação pelo WhatsApp.' });
}));

router.use(auth);

router.get('/me', (_req, res) => res.json({ admin: _req.admin }));
router.get('/services', asyncRoute(async (_req, res) => res.json(await prisma.service.findMany({ orderBy: { name: 'asc' } }))));
router.post('/services', asyncRoute(async (req, res) => {
  const body = z.object({ name: z.string().trim().min(2), description: z.string().optional(), price: z.coerce.number().nonnegative(), duration: z.coerce.number().int().positive(), active: z.boolean().default(true) }).parse(req.body);
  res.status(201).json(await prisma.service.create({ data: { ...body, price: body.price } }));
}));
router.patch('/services/:id', asyncRoute(async (req, res) => {
  const body = z.object({ name: z.string().trim().min(2).optional(), description: z.string().optional(), price: z.coerce.number().nonnegative().optional(), duration: z.coerce.number().int().positive().optional(), active: z.boolean().optional() }).parse(req.body);
  res.json(await prisma.service.update({ where: { id: req.params.id }, data: body }));
}));
router.delete('/services/:id', asyncRoute(async (req, res) => {
  const used = await prisma.appointment.count({ where: { serviceId: req.params.id } });
  if (used) return res.status(409).json({ message: 'Não é possível excluir: existem agendamentos vinculados' });
  await prisma.service.delete({ where: { id: req.params.id } }); res.status(204).send();
}));

router.get('/clients', asyncRoute(async (req, res) => {
  const search = String(req.query.search || '').trim();
  res.json(await prisma.client.findMany({ where: search ? { OR: [{ name: { contains: search, mode: 'insensitive' } }, { phone: { contains: search } }] } : {}, include: { appointments: { orderBy: { startAt: 'desc' }, take: 5 } }, orderBy: { name: 'asc' } }));
}));
router.post('/clients', asyncRoute(async (req, res) => {
  const body = z.object({ name: z.string().trim().min(2), phone: z.string().trim().min(8), email: z.string().email().optional().or(z.literal('')), notes: z.string().optional(), active: z.boolean().optional() }).parse(req.body);
  res.status(201).json(await prisma.client.create({ data: { ...body, email: body.email || null } }));
}));
router.patch('/clients/:id', asyncRoute(async (req, res) => {
  const body = z.object({ name: z.string().trim().min(2).optional(), phone: z.string().trim().min(8).optional(), email: z.string().email().optional().or(z.literal('')).optional(), notes: z.string().optional(), active: z.boolean().optional() }).parse(req.body);
  res.json(await prisma.client.update({ where: { id: req.params.id }, data: { ...body, email: body.email === '' ? null : body.email } }));
}));
router.delete('/clients/:id', asyncRoute(async (req, res) => {
  const used = await prisma.appointment.count({ where: { clientId: req.params.id } });
  if (used) return res.status(409).json({ message: 'Cliente possui histórico. Use a opção de desativar.' });
  await prisma.client.delete({ where: { id: req.params.id } }); res.status(204).send();
}));

router.get('/appointments', asyncRoute(async (req, res) => {
  const date = req.query.date ? String(req.query.date) : null;
  const status = req.query.status ? String(req.query.status) : null;
  const where = {};
  if (date) { const start = new Date(`${date}T00:00:00`); const end = new Date(start); end.setDate(end.getDate() + 1); where.startAt = { gte: start, lt: end }; }
  if (status) where.status = status;
  res.json(await prisma.appointment.findMany({ where, include: { client: true, service: true }, orderBy: { startAt: 'asc' } }));
}));
router.post('/appointments', asyncRoute(async (req, res) => {
  const body = z.object({ clientId: z.string().min(1), serviceId: z.string().min(1), startAt: z.string().datetime(), status: z.enum(['PENDING','CONFIRMED','COMPLETED','CANCELED']).default('CONFIRMED'), notes: z.string().optional() }).parse(req.body);
  const service = await prisma.service.findUnique({ where: { id: body.serviceId } });
  if (!service) return res.status(404).json({ message: 'Serviço não encontrado' });
  const startAt = new Date(body.startAt); const endAt = new Date(startAt.getTime() + service.duration * 60000);
  const conflict = await prisma.appointment.findFirst({ where: { status: { not: 'CANCELED' }, startAt: { lt: endAt }, endAt: { gt: startAt } } });
  if (conflict) return res.status(409).json({ message: 'Conflito de horário' });
  res.status(201).json(await prisma.appointment.create({ data: { ...body, startAt, endAt }, include: { client: true, service: true } }));
}));
router.patch('/appointments/:id', asyncRoute(async (req, res) => {
  const body = z.object({ startAt: z.string().datetime().optional(), status: z.enum(['PENDING','CONFIRMED','COMPLETED','CANCELED']).optional(), notes: z.string().optional(), serviceId: z.string().optional(), clientId: z.string().optional() }).parse(req.body);
  const current = await prisma.appointment.findUnique({ where: { id: req.params.id }, include: { service: true } });
  if (!current) return res.status(404).json({ message: 'Agendamento não encontrado' });
  const service = body.serviceId ? await prisma.service.findUnique({ where: { id: body.serviceId } }) : current.service;
  const startAt = body.startAt ? new Date(body.startAt) : current.startAt;
  const endAt = new Date(startAt.getTime() + service.duration * 60000);
  if (body.startAt || body.serviceId) {
    const conflict = await prisma.appointment.findFirst({ where: { id: { not: req.params.id }, status: { not: 'CANCELED' }, startAt: { lt: endAt }, endAt: { gt: startAt } } });
    if (conflict) return res.status(409).json({ message: 'Conflito de horário' });
  }
  res.json(await prisma.appointment.update({ where: { id: req.params.id }, data: { ...body, startAt, endAt }, include: { client: true, service: true } }));
}));

router.get('/dashboard', asyncRoute(async (req, res) => {
  const now = new Date(); const today = new Date(now); today.setHours(0,0,0,0); const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
  const [todayAppointments, totalClients, nextAppointments, completed, popular] = await Promise.all([
    prisma.appointment.count({ where: { startAt: { gte: today, lt: tomorrow }, status: { not: 'CANCELED' } } }),
    prisma.client.count({ where: { active: true } }),
    prisma.appointment.findMany({ where: { startAt: { gte: now }, status: { not: 'CANCELED' } }, include: { client: true, service: true }, orderBy: { startAt: 'asc' }, take: 5 }),
    prisma.appointment.findMany({ where: { status: 'COMPLETED' }, include: { service: true } }),
    prisma.appointment.groupBy({ by: ['serviceId'], _count: { serviceId: true }, orderBy: { _count: { serviceId: 'desc' } }, take: 5 })
  ]);
  const revenue = completed.reduce((sum, item) => sum + Number(item.service.price), 0);
  const popularIds = popular.map((item) => item.serviceId);
  const services = await prisma.service.findMany({ where: { id: { in: popularIds } } });
  res.json({ todayAppointments, totalClients, nextAppointments, revenue, popularServices: popular.map((item) => ({ name: services.find((s) => s.id === item.serviceId)?.name || 'Serviço', count: item._count.serviceId })) });
}));

router.get('/settings', asyncRoute(async (_req, res) => res.json(await prisma.businessSettings.upsert({ where: { id: 'main' }, update: {}, create: { id: 'main' } }))));
router.put('/settings', asyncRoute(async (req, res) => {
  const body = z.object({ name: z.string().min(2).optional(), whatsapp: z.string().optional(), address: z.string().optional(), instagram: z.string().optional(), openingTime: z.string().regex(/^\d{2}:\d{2}$/).optional(), closingTime: z.string().regex(/^\d{2}:\d{2}$/).optional(), workingDays: z.array(z.number().int().min(0).max(6)).optional(), slotMinutes: z.number().int().positive().optional() }).parse(req.body);
  res.json(await prisma.businessSettings.upsert({ where: { id: 'main' }, update: body, create: { id: 'main', ...body } }));
}));

module.exports = router;
