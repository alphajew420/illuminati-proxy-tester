"use client";

import Image from "next/image";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import HeaderSocials from "./header-socials";
import { handleOpenUrl } from "@/lib/utils";

export default function Header() {
  return (
    <header className="flex w-full items-center justify-between py-4 border-b border-white/10">
      <div className="flex items-center gap-4">
        <Image
          src="/brand/logo-icon.png"
          alt="Illuminati Networks Icon"
          width={48}
          height={48}
        />
        <div className="flex flex-col gap-1">
          <h1 className="text-lg font-light tracking-wider text-text-secondary">
            Illuminati Networks
          </h1>
          <p className="text-2xl font-medium tracking-wider text-foreground -mt-1">
            Proxy Tester
          </p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <HeaderSocials />
        <Button
          onClick={() =>
            handleOpenUrl("https://illuminatinetworks.com")
          }
        >
          Visit Illuminati Networks
          <ArrowRight className="size-4" />
        </Button>
      </div>
    </header>
  );
}
