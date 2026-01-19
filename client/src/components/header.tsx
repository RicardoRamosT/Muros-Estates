import { Link } from "wouter";
import logoPath from "@assets/logo_1768784773871.png";

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
      <div className="container mx-auto flex h-16 items-center justify-between gap-4 px-4">
        <Link href="/">
          <div className="flex items-center gap-3 hover-elevate rounded-md px-2 py-1 cursor-pointer" data-testid="link-home">
            <img src={logoPath} alt="Muros" className="h-10 object-contain" />
          </div>
        </Link>
      </div>
    </header>
  );
}
