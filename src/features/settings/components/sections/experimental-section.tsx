"use client";

import { FlaskConical } from "lucide-react";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "~/components/ui/accordion";
import { useChatUIStore } from "~/features/chat/store";

import { ToggleItem } from "../ui/toggle-item";

export function ExperimentalSection() {
  const handoffEnabled = useChatUIStore(s => s.handoffEnabled);
  const setHandoffEnabled = useChatUIStore(s => s.setHandoffEnabled);

  return (
    <Accordion type="single" collapsible>
      <AccordionItem value="experimental">
        <AccordionTrigger className="py-0">
          <div className="flex items-center gap-2">
            <FlaskConical className="text-muted-foreground size-4" />
            <span className="text-base font-semibold">Experimental</span>
          </div>
        </AccordionTrigger>
        <AccordionContent className="pt-4">
          <div className="space-y-4">
            <ToggleItem
              label="Handoff"
              description="Allow the AI to hand off conversations to a new thread with a summarized context. Disable if handoffs trigger too frequently."
              enabled={handoffEnabled}
              onToggle={setHandoffEnabled}
            />
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
