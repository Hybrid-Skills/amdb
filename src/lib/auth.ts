import type { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import { PrismaAdapter } from '@auth/prisma-adapter';
import { prisma } from './prisma';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      email?: string | null;
      name?: string | null;
      image?: string | null;
      username?: string | null;
      avatarColor: string;
      avatarEmoji?: string | null;
    };
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    username?: string | null;
    avatarColor?: string;
    avatarEmoji?: string | null;
  }
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user) {
        token.id = user.id;
        // Fetch custom fields on first sign-in
        const dbUser = await prisma.user.findUnique({
          where: { id: user.id },
          select: { username: true, avatarColor: true, avatarEmoji: true },
        });
        token.username = dbUser?.username ?? null;
        token.avatarColor = dbUser?.avatarColor ?? '#6366f1';
        token.avatarEmoji = dbUser?.avatarEmoji ?? null;
      }
      // Re-fetch on explicit update trigger (after PATCH /api/user)
      if (trigger === 'update') {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id },
          select: { username: true, avatarColor: true, avatarEmoji: true },
        });
        token.username = dbUser?.username ?? null;
        token.avatarColor = dbUser?.avatarColor ?? '#6366f1';
        token.avatarEmoji = dbUser?.avatarEmoji ?? null;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = token.id as string;
        session.user.username = (token.username as string | null | undefined) ?? null;
        session.user.avatarColor = (token.avatarColor as string | undefined) ?? '#6366f1';
        session.user.avatarEmoji = (token.avatarEmoji as string | null | undefined) ?? null;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: 'jwt',
  },
};
