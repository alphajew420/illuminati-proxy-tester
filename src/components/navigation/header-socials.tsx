"use client";

import Image from "next/image";
import { Button } from "../ui/button";
import { Globe, Github } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../ui/tooltip";
import { handleOpenUrl } from "@/lib/utils";

const socialLinks = [
  {
    href: "https://illuminatinetworks.com",
    label: "Website",
    icon: <Globe className="size-4" />,
  },
  {
    href: "https://discord.gg/xFUTn7687u",
    label: "Discord",
    icon: (
      <Image src="/social/discord.svg" width={18} height={18} alt="Discord" />
    ),
  },
  {
    href: "https://t.me/illuminatinetworks",
    label: "Telegram",
    icon: (
      <Image src="/social/telegram.svg" width={18} height={18} alt="Telegram" />
    ),
  },
  {
    href: "https://github.com/alphajew420",
    label: "GitHub",
    icon: <Github className="size-4" />,
  },
];

export default function HeaderSocials() {
  return (
    <TooltipProvider>
      <div className="flex items-center gap-1 py-5">
        {socialLinks.map((link) => (
          <Tooltip key={link.href}>
            <TooltipTrigger asChild>
              <Button
                onClick={() => handleOpenUrl(link.href)}
                variant="ghost"
                size="icon"
                aria-label={link.label}
              >
                {link.icon}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{link.label}</p>
            </TooltipContent>
          </Tooltip>
        ))}
      </div>
    </TooltipProvider>
  );
}
