import { AuthOptions } from "next-auth"
import GoogleProvider from "next-auth/providers/google"
import CredentialsProvider from "next-auth/providers/credentials"
import { PrismaAdapter } from "@auth/prisma-adapter"
import prisma from "./prisma"
import bcrypt from "bcrypt"

const VERCEL_DEPLOYMENT = !!process.env.VERCEL_URL;

export const authConfig: AuthOptions = {
  pages: {
    signIn: "https://goout.my.id/login",
  },
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: "jwt"
  },
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      profile(profile) {
        return {
          id: profile.sub,
          fullName: profile.name,
          email: profile.email,
          picture: profile.picture,
        }
      }
    }),
    CredentialsProvider({
      name: "Email",
      credentials: {
        email: { label: "email", type: "email" },
        password: { label: "password", type: "password" }
      },
      async authorize(credentials, req) {
        const user = await prisma.user.findUnique({
          where: { email: credentials?.email },
          include: {
            accounts: true
          }
        })
        if (!user) throw new Error("Invalid email or password")

        if (!user.password && user.accounts[0].provider === "google") {
          throw new Error("This email is registered to Google log in method")
        }

        if (!user.emailVerified && user.accounts.length === 0) throw new Error("Please verify your email")

        const match = await bcrypt.compare(credentials!.password, user.password as string)
        if (!match) throw new Error("email or password not found")

        return {
          id: user.id,
          fullName: user.fullName,
          email: user.email,
          picture: user.picture
        }
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      const dbUser = await prisma.user.findUnique({ where: { email: token.email! } })
      if (!dbUser) throw new Error("no user with email found")

      return {
        id: dbUser.id,
        fullName: dbUser.fullName,
        email: dbUser.email,
        picture: dbUser.picture
      };
    },
    async session({ token, session }) {
      if (token) {
        session.user.id = token.id
        session.user.email = token.email
        session.user.name = token.fullName
      }

      return session
    },
    async redirect({ url }) {
      return Promise.resolve(url)
    }
  },
  cookies: {
    sessionToken: {
      name: `${VERCEL_DEPLOYMENT ? "__Secure-" : ""}next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        // When working on localhost, the cookie domain must be omitted entirely (https://stackoverflow.com/a/1188145)
        domain: VERCEL_DEPLOYMENT
          ? `.${process.env.NEXT_PUBLIC_APP_DOMAIN}`
          : undefined,
        secure: VERCEL_DEPLOYMENT,
      },
    },
  },
} satisfies AuthOptions;