import { Metadata } from "next";
import Image from "next/image";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Login · Plataforma de almuerzos",
  description: "Plataforma de registro de almuerzos · Colegio San Luis",
};

export default function LoginPage() {
  return (
    <div className="relative min-h-screen bg-[#f8f9fb] text-slate-900 md:grid md:grid-cols-2">
      {/* Fondo mobile/tablet */}
      <div className="absolute inset-0 md:hidden">
        <Image
          src="/colegiosanluis.png"
          alt="Colegio San Luis"
          fill
          className="object-cover opacity-30"
          priority
        />
        <div className="absolute inset-0 bg-white/70" />
      </div>

      {/* Columna izquierda: imagen en desktop */}
      <div className="relative hidden md:block">
        <Image
          src="/colegiosanluis.png"
          alt="Colegio San Luis"
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-white/0 to-white/10" />
      </div>

      {/* Columna derecha: formulario y logo */}
      <div className="relative flex items-center justify-center px-4 py-8 sm:px-6 lg:px-8">
        <div className="absolute left-4 top-4 flex items-center justify-center overflow-hidden sm:left-6 sm:top-6">
          <Image
            src="/insigniasanluis.png"
            alt="Insignia Colegio San Luis"
            width={120}
            height={120}
            className="h-14 w-auto object-contain sm:h-16"
            priority
          />
        </div>
        <div className="relative mt-10 w-full max-w-lg rounded-2xl border border-[#eeeff2] bg-white/95 px-5 pt-12 pb-7 shadow-[var(--shadow-card)] backdrop-blur sm:mt-0 sm:px-8 sm:pt-14">
          <div className="absolute left-4 top-4 inline-flex items-center gap-2 rounded-full border border-[#f2c94c] bg-[#ffd85f] px-3 py-1 text-xs font-semibold text-black shadow-[var(--shadow-xs)] sm:left-6 sm:top-6">
            Colegio San Luis · Plataforma de almuerzos
          </div>
          <div className="mb-6 space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
              Acceso interno
            </p>
            <h1 className="text-2xl font-semibold text-slate-900 sm:text-3xl">
              Accede a tu cuenta
            </h1>
            <p className="text-sm text-slate-600">
              Inicia sesión para gestionar la entrega de almuerzos.
            </p>
          </div>
          <LoginForm />
        </div>
        <p className="absolute bottom-6 text-xs text-slate-500">© Colegio San Luis</p>
      </div>
    </div>
  );
}
