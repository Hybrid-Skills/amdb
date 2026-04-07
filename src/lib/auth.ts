import type { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import { PrismaAdapter } from '@auth/prisma-adapter';
import { prisma } from './prisma';

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    // Persist user.id into the JWT on first sign-in
    async jwt({ token, user }) {
      if (user) token.id = user.id;
      return token;
    },
    // Expose user.id on the session object (no DB lookup)
    async session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
  events: {
    async createUser({ user }) {
      await prisma.profile.create({
        data: {
          userId: user.id,
          name: user.name ?? 'My Profile',
          isDefault: true,
          avatarColor: '#6366f1',
        },
      });
    },
  },
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: 'jwt',
  },
};
