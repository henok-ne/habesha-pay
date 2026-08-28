import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';

import { connectDB } from '@/lib/mongodb';
import User from '@/lib/models/User';

export const authOptions = {
  session: {
    strategy: 'jwt',
  },

  providers: [
    CredentialsProvider({
      name: 'Credentials',

      credentials: {
        email: {
          label: 'Email',
          type: 'email',
        },

        password: {
          label: 'Password',
          type: 'password',
        },
      },

      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        await connectDB();

        const email = String(credentials.email)
          .toLowerCase()
          .trim();

        const user = await User.findOne({ email }).lean();

        if (!user) {
          return null;
        }

        const passwordValid = await bcrypt.compare(
          String(credentials.password),
          user.passwordHash
        );

        if (!passwordValid) {
          return null;
        }

        return {
          id: user._id.toString(),
          email: user.email,
          name: user.fullName,
          companyId: user.companyId.toString(),
          role: user.role,
        };
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.userId = user.id;
        token.companyId = user.companyId;
        token.role = user.role;
      }

      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.userId;
        session.user.companyId = token.companyId;
        session.user.role = token.role;
      }

      return session;
    },
  },

  pages: {
    signIn: '/login',
  },
};

export default NextAuth(authOptions);