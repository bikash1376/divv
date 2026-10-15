"use client";

import { useState } from "react";
import { Shader, SolidColor, Group, Beam, Swirl, DiffuseBlur, Liquify, ChromaFlow } from "shaders/react";
import { MousePointerClickIcon } from "@hugeicons/core-free-icons";
import { Geist } from "next/font/google";

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist",
  display: "swap",
});

export default function FormPage() {
  const [ready, setReady] = useState(false);

  return (
    <main
      className={`relative flex min-h-screen items-center justify-center overflow-hidden ${geist.variable}`}
      style={{ fontFamily: "var(--font-geist), system-ui, sans-serif" }}
    >
      {/* Shader background */}
      <Shader
        className="absolute inset-0 h-full w-full"
        onReady={() => setReady(true)}
      >
        {ready && (
          <>
            <SolidColor color="#0d0518" />
            <Group>
              <Beam
                startPosition={{ x: 0.22, y: 0.5 }}
                endPosition={{ x: 0.73, y: 0.4 }}
                startThickness={0.33}
                endThickness={0.6}
                startSoftness={27.22}
                endSoftness={14.26}
                insideColor="#7c3aed"
                outsideColor="#9b59f2"
              />
              <Beam
                startPosition={{ x: 0.19, y: 0.69 }}
                endPosition={{ x: 0.78, y: 0.66 }}
                startThickness={0.21}
                endThickness={0.7}
                startSoftness={27.67}
                endSoftness={2.97}
                insideColor="#d946ef"
                outsideColor="#d946ef"
              />
            </Group>
            <Swirl
              blend={67}
              blendMode="normal-oklab"
              colorA="#7c3aed"
              // colorA="#7c3aed"
              colorB="#ffffff00"
              colorSpace="oklab"
              detail={1.5}
              maskSource="auth_bg_beams"
              opacity={0.86}
              speed={0}
            />
            <DiffuseBlur intensity={20} />
            <Liquify intensity={5} radius={2} />
            <ChromaFlow
              intensity={0.6}
              baseColor="#7c3aed"
              downColor="#d946ef"
              leftColor="#d946ef"
              rightColor="#7c3aed"
              upColor="#a855f7"
            />
          </>
        )}
      </Shader>

      {/* Black vignette */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: "radial-gradient(ellipse at center, transparent 35%, rgba(0,0,0,0.65) 100%)",
        }}
      />

      {/* Signup form */}
      <div className="relative z-10 w-full max-w-sm rounded-2xl bg-[#181818] p-9 shadow-2xl shadow-black/60">
        {/* Logo */}
        <div className="mb-5 flex justify-center">
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            {(MousePointerClickIcon as unknown as [string, Record<string, string | number>][]).map(
              ([d, attrs]: [string, Record<string, string | number>], i: number) => {
                const { key: _key, ...rest } = attrs;
                return <path key={i} d={d} fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...rest} />;
              }
            )}
          </svg>
        </div>

        <h1 className="mb-1 text-center text-xl font-normal text-white">
          Create your account
        </h1>
        <p className="mb-8 text-center text-sm text-white/50">
          Start designing with Wonder.
        </p>

        {/* Social buttons */}
        <div className="mb-4 space-y-2">
          <button
            type="button"
            className="flex h-8 w-full items-center justify-center gap-3 rounded-lg bg-[#2B2B2B] px-4 text-sm font-normal text-white transition hover:bg-[#3a3a3a]"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15A11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"/>
            </svg>
            Continue with Google
          </button>
          <button
            type="button"
            className="flex h-8 w-full items-center justify-center gap-3 rounded-lg bg-[#2B2B2B] px-4 text-sm font-normal text-white transition hover:bg-[#3a3a3a]"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.56 9.05 7.31c1.35.07 2.29.74 3.08.8.98-.2 1.92-.86 3.24-.8 1.58.13 2.77.75 3.55 1.9-3.27 1.96-2.5 6.27.49 7.52-.62 1.63-1.45 3.24-2.36 3.55zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
            </svg>
            Continue with Apple
          </button>
        </div>

        {/* Divider */}
        <div className="mb-4 flex items-center gap-4">
          <div className="h-px flex-1 bg-white/15" />
          <span className="text-xs font-medium text-white/40">or</span>
          <div className="h-px flex-1 bg-white/15" />
        </div>

        {/* Email form */}
        <form className="space-y-3" onSubmit={(e) => e.preventDefault()}>
          <div>
            <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-white/70">
              Email
            </label>
            <input
              type="email"
              id="email"
              name="email"
              autoComplete="email"
              required
              placeholder="name@example.com"
              className="h-8 w-full rounded-lg border border-white/20 bg-white/10 px-3.5 text-sm font-normal text-white placeholder-white/30 outline-none transition focus:border-white/50 focus:bg-white/15"
            />
          </div>
          <button
            type="submit"
            className="flex h-8 w-full items-center justify-center rounded-lg bg-[#AF3DDA] px-4 text-sm font-normal text-white transition hover:bg-[#c44de8]"
          >
            Create account
          </button>
        </form>

        {/* Sign in link */}
        <p className="mt-4 text-center text-sm text-white/50">
          Already have an account?{" "}
          <a href="#" className="font-medium text-white/80 transition hover:text-white">
            Sign in
          </a>
        </p>
      </div>

    </main>
  );
}
