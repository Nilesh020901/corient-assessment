const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

// Seed foundational RBAC roles, permissions catalog, default users, and sample SOP template
async function main() {
  console.log('Seeding database permissions and roles...');

  // 1. Seed Permissions Catalog
  const permissionsList = [
    // SOP permissions
    { module: 'SOP', action: 'READ' },
    { module: 'SOP', action: 'CREATE' },
    { module: 'SOP', action: 'UPDATE' },
    { module: 'SOP', action: 'DELETE' },
    { module: 'SOP', action: 'PUBLISH' },
    // Users permissions
    { module: 'USERS', action: 'READ' },
    { module: 'USERS', action: 'CREATE' },
    { module: 'USERS', action: 'UPDATE' },
    { module: 'USERS', action: 'DELETE' },
    // Projects permissions
    { module: 'PROJECTS', action: 'READ' },
    { module: 'PROJECTS', action: 'CREATE' },
    { module: 'PROJECTS', action: 'UPDATE' },
    { module: 'PROJECTS', action: 'DELETE' },
    // Workflow permissions
    { module: 'WORKFLOW', action: 'READ' },
    { module: 'WORKFLOW', action: 'UPDATE' },
    { module: 'WORKFLOW', action: 'STATUS_UPDATE' },
    // Roles permissions
    { module: 'ROLES', action: 'READ' },
    { module: 'ROLES', action: 'UPDATE' },
    // Audit permissions
    { module: 'AUDIT', action: 'READ' }
  ];

  const dbPermissions = {};
  for (const p of permissionsList) {
    const record = await prisma.permission.upsert({
      where: { module_action: { module: p.module, action: p.action } },
      update: {},
      create: p
    });
    dbPermissions[`${p.module}:${p.action}`] = record.id;
  }

  // 2. Seed System Roles
  const superAdminRole = await prisma.role.upsert({
    where: { name: 'SUPER_ADMIN' },
    update: {},
    create: { name: 'SUPER_ADMIN', description: 'Super Administrator with full configuration authority' }
  });

  const adminRole = await prisma.role.upsert({
    where: { name: 'ADMIN' },
    update: {},
    create: { name: 'ADMIN', description: 'Administrator managing users, projects, and auditing' }
  });

  const itMemberRole = await prisma.role.upsert({
    where: { name: 'IT_MEMBER' },
    update: {},
    create: { name: 'IT_MEMBER', description: 'IT Team Member executing assigned workflow stages' }
  });

  const clientRole = await prisma.role.upsert({
    where: { name: 'CLIENT' },
    update: {},
    create: { name: 'CLIENT', description: 'Client/Operations with restricted read-only visibility' }
  });

  // 3. Link Permissions to Roles in RolePermission table
  const assignPermissions = async (roleId, permissionKeys) => {
    await prisma.rolePermission.deleteMany({ where: { roleId } });
    const data = permissionKeys.map((key) => ({
      roleId,
      permissionId: dbPermissions[key]
    }));
    await prisma.rolePermission.createMany({ data });
  };

  // Super Admin: All permissions
  await assignPermissions(superAdminRole.id, Object.keys(dbPermissions));

  // Admin: Users, Projects, Audit, SOP read
  await assignPermissions(adminRole.id, [
    'SOP:READ',
    'USERS:READ', 'USERS:CREATE', 'USERS:UPDATE', 'USERS:DELETE',
    'PROJECTS:READ', 'PROJECTS:CREATE', 'PROJECTS:UPDATE', 'PROJECTS:DELETE',
    'WORKFLOW:READ', 'WORKFLOW:UPDATE', 'WORKFLOW:STATUS_UPDATE',
    'AUDIT:READ', 'ROLES:READ'
  ]);

  // IT Team Member: Assigned workflow execution & projects view
  await assignPermissions(itMemberRole.id, [
    'PROJECTS:READ',
    'WORKFLOW:READ', 'WORKFLOW:UPDATE', 'WORKFLOW:STATUS_UPDATE'
  ]);

  // Client / Ops: Read-only project view (audit & internal data blocked)
  await assignPermissions(clientRole.id, [
    'PROJECTS:READ'
  ]);

  // 4. Seed Standard 4 Role Users (Password: Password123!)
  const passwordHash = await bcrypt.hash('Password123!', 10);

  const superAdminUser = await prisma.user.upsert({
    where: { email: 'superadmin@workflow.local' },
    update: {},
    create: {
      name: 'Super Admin',
      email: 'superadmin@workflow.local',
      passwordHash,
      roleId: superAdminRole.id,
      isActive: true
    }
  });

  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@workflow.local' },
    update: {},
    create: {
      name: 'Operations Admin',
      email: 'admin@workflow.local',
      passwordHash,
      roleId: adminRole.id,
      isActive: true
    }
  });

  const itMemberUser = await prisma.user.upsert({
    where: { email: 'itmember@workflow.local' },
    update: {},
    create: {
      name: 'Alex Developer',
      email: 'itmember@workflow.local',
      passwordHash,
      roleId: itMemberRole.id,
      isActive: true
    }
  });

  const clientUser = await prisma.user.upsert({
    where: { email: 'client@workflow.local' },
    update: {},
    create: {
      name: 'Acme Client Stakeholder',
      email: 'client@workflow.local',
      passwordHash,
      roleId: clientRole.id,
      isActive: true
    }
  });

  // 5. Seed 1 Published SOP Template with 5 stages (3 client-visible, 2 hidden)
  const existingSop = await prisma.sopTemplate.findFirst({
    where: { title: 'Standard IT Deployment SOP' }
  });

  if (!existingSop) {
    const sop = await prisma.sopTemplate.create({
      data: {
        title: 'Standard IT Deployment SOP',
        description: 'Baseline procedure for cloud infrastructure migrations and system upgrades',
        isDraft: false,
        currentVersion: 1,
        stages: {
          create: [
            { name: '1. Requirement Discovery & Scoping', order: 1, clientVisible: true },
            { name: '2. Internal Architecture Review', order: 2, clientVisible: false },
            { name: '3. Staging Environment Provisioning', order: 3, clientVisible: true },
            { name: '4. Security Vulnerability Scan', order: 4, clientVisible: false },
            { name: '5. Production Cutover & Sign-Off', order: 5, clientVisible: true }
          ]
        }
      },
      include: { stages: { orderBy: { order: 'asc' } } }
    });

    // Save immutable snapshot version 1
    const stagesSnapshot = sop.stages.map((s) => ({
      name: s.name,
      order: s.order,
      clientVisible: s.clientVisible
    }));

    await prisma.sopVersion.create({
      data: {
        sopTemplateId: sop.id,
        versionNumber: 1,
        stagesData: stagesSnapshot
      }
    });

    console.log('Created published SOP with 5 stages (3 client-visible, 2 hidden)');
  }

  console.log('Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
