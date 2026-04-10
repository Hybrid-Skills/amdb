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
      // Triggered on first sign-in
      if (user) {
        token.id = user.id;
      }

      // If we don't have the custom fields in the token yet, or if it's an explicit update
      if (trigger === 'update' || (token.id && (!token.avatarColor || !token.username))) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { email: true, username: true, avatarColor: true, avatarEmoji: true },
        });
        
        if (dbUser) {
          let currentUsername = dbUser.username;

          // Auto-generate username if null (migration/pre-fill)
          if (!currentUsername && dbUser.email) {
            // Take prefix before @ and clean up invalid characters
            const prefix = dbUser.email.split('@')[0];
            const baseUsername = prefix.replace(/[^a-zA-Z0-9._-]/g, '') || 'user';
            
            let finalUsername = baseUsername;
            let isTaken = true;
            let attempts = 0;

            while (isTaken && attempts < 5) {
              const existing = await prisma.user.findFirst({
                where: { username: { equals: finalUsername, mode: 'insensitive' } },
              });
              if (!existing) {
                isTaken = false;
              } else {
                // Append random 3-char string on collision
                finalUsername = `${baseUsername}_${Math.random().toString(36).substring(2, 5)}`;
                attempts++;
              }
            }

            // Persistence
            const updated = await prisma.user.update({
              where: { id: token.id as string },
              data: { username: finalUsername },
            });
            currentUsername = updated.username;
          }

          token.username = currentUsername ?? null;
          token.avatarColor = dbUser.avatarColor ?? '#6366f1';
          token.avatarEmoji = dbUser.avatarEmoji ?? null;
        }
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
