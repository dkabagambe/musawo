import Image from "next/image";
import Link from "next/link";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-surface flex flex-col items-center justify-center px-4 py-12">
      <Link href="/" className="flex items-center gap-2 no-underline mb-8">
        <Image
          src="/assets/logo.webp"
          alt="Musawo Training Center"
          width={140}
          height={40}
          className="h-10 w-auto"
          priority
        />
      </Link>
      <div className="w-full max-w-md">
        {children}
      </div>
      <p className="mt-8 text-xs text-gray-400 text-center">
        © {new Date().getFullYear()} Musawo Training Center · All rights reserved
      </p>
    </div>
  );
}
