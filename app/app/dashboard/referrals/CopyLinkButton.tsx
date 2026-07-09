"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";

export default function CopyLinkButton({ link }: { link: string }) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Button variant="secondary" onClick={handleCopy}>
      {copied ? "Copied!" : "Copy link"}
    </Button>
  );
}
