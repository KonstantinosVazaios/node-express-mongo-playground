import { pathToFileURL } from 'node:url';
import type { Types } from 'mongoose';
import { env } from '../src/config/env.js';
import { connectMongo, disconnectMongo } from '../src/db/mongo.js';
import { logger } from '../src/lib/logger.js';
import { OrganizationModel } from '../src/models/organization.model.js';
import { type Role, UserModel } from '../src/models/user.model.js';

/** Every seeded user has this password (see README). */
export const SEED_PASSWORD = 'password123';

interface SeedUser {
  firstName: string;
  lastName: string;
  role: Role;
  /** First name of this user's manager (must be listed earlier). */
  manager?: string;
}

const person = (firstName: string, lastName: string, role: Role, manager?: string): SeedUser => ({
  firstName,
  lastName,
  role,
  ...(manager && { manager }),
});

// Emails are <firstname>@<slug>.test, e.g. maria@acme.test
const ORGANIZATIONS: { name: string; slug: string; users: SeedUser[] }[] = [
  {
    name: 'Acme Corp',
    slug: 'acme',
    users: [
      person('Alice', 'Admin', 'admin'),
      person('Maria', 'Manager', 'manager'),
      person('Mike', 'Manager', 'manager'),
      person('Eve', 'Employee', 'employee', 'Maria'),
      person('Ethan', 'Employee', 'employee', 'Maria'),
      person('Emma', 'Employee', 'employee', 'Mike'),
    ],
  },
  {
    name: 'Globex',
    slug: 'globex',
    users: [
      person('Gus', 'Admin', 'admin'),
      person('Gina', 'Manager', 'manager'),
      person('Gary', 'Employee', 'employee', 'Gina'),
    ],
  },
];

/** Wipes the seeded collections and recreates the demo data. */
export async function seed(): Promise<void> {
  await Promise.all([OrganizationModel.deleteMany({}), UserModel.deleteMany({})]);

  for (const org of ORGANIZATIONS) {
    const organization = await OrganizationModel.create({ name: org.name, slug: org.slug });
    const ids = new Map<string, Types.ObjectId>();

    // Sequential on purpose: an employee needs their manager's _id, so
    // managers (listed first) must exist before their reports.
    for (const user of org.users) {
      // create() runs the pre('save') hook that hashes the password.
      // insertMany() would NOT: it skips document middleware.
      const created = await UserModel.create({
        organizationId: organization._id,
        email: `${user.firstName.toLowerCase()}@${org.slug}.test`,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        password: SEED_PASSWORD,
        managerId: user.manager ? ids.get(user.manager) : null,
      });
      ids.set(user.firstName, created._id);
    }
    logger.info({ org: org.slug, users: org.users.length }, 'Seeded organization');
  }
}

// ESM has no `require.main === module`. This is the equivalent check: is
// this file the script Node was started with, or was it imported (by a test)?
if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  if (env.NODE_ENV === 'production') {
    throw new Error('Refusing to wipe and seed a production database');
  }
  await connectMongo();
  await seed();
  await disconnectMongo();
}
