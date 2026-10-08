import bcrypt from 'bcrypt';
import { type HydratedDocument, type InferSchemaType, Schema, model } from 'mongoose';
import { ROLES } from '../domain/constants.js';
import { env } from '../config/env.js';
import { tenantGuard } from './plugins/tenant-guard.js';

const userSchema = new Schema(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      // `ref` is what lets populate('organizationId') swap the id for the
      // Organization document.
      ref: 'Organization',
      required: true,
      index: true,
    },
    // Globally unique (not per organization) so that login only needs an
    // email and the tenant is derived from the user.
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    firstName: { type: String, required: true, trim: true, maxlength: 50 },
    lastName: { type: String, required: true, trim: true, maxlength: 50 },
    // select: false means this field is NEVER loaded unless a query explicitly
    // asks for it with .select('+password'). Only the login flow does that.
    password: { type: String, required: true, select: false },
    role: { type: String, enum: ROLES, required: true, default: 'employee' },
    managerId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  {
    timestamps: true,
    // A virtual is computed on read and never stored, like an Eloquent
    // accessor (getFullNameAttribute).
    virtuals: {
      fullName: {
        get() {
          return `${this.firstName} ${this.lastName}`;
        },
      },
    },
  },
);

// toJSON runs whenever a document is serialized (res.json(user)). It's a
// second line of defence against leaking the hash: even if a query did select
// it, it's stripped here. Laravel's equivalent is $hidden.
// NOTE: this does NOT run on .lean() results, which are plain objects.
// (Set here rather than in the Schema options above: a transform written
// inline there makes Mongoose's type inference collapse to `unknown`.)
userSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: (_doc, ret) => {
    const { password, ...safe } = ret;
    return safe;
  },
});

userSchema.plugin(tenantGuard);

// "Who reports to this manager?" is the hottest query for managers.
userSchema.index({ organizationId: 1, managerId: 1 });

// Pre-save hook: hash the password whenever it was set or changed. Mongoose 9
// hooks are plain async functions; the old next() callback style is gone.
userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, env.BCRYPT_ROUNDS);
});

export type User = InferSchemaType<typeof userSchema>;
export type UserDocument = HydratedDocument<User>;

export const UserModel = model('User', userSchema);
