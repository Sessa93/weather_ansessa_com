"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Home" },
  { href: "/graphs", label: "Graphs" },
  { href: "/records", label: "Records" },
  { href: "/about", label: "About" },
];

export default function Navbar() {
  const pathname = usePathname();

  return (
    <nav className="bg-slate-950 text-slate-200 shadow-lg border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-14">
          <Link
            href="/"
            className="text-lg font-bold tracking-wide text-sky-400"
          >
            Jerago con Orago Weather Station
          </Link>
          <div className="flex gap-1">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`px-3 py-2 rounded text-sm font-medium transition-colors ${
                  pathname === link.href
                    ? "bg-sky-600 text-white"
                    : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </nav>
  );
}
