"use client";

import { GreetingContent } from "./greeting-content";

const DEFAULT_PROMPTS = [
  "Could I beat a bear in a fight?",
  "What came first? Wi or Fi?",
  "Why is the default MacOS terminal so bad?",
  "What the hell is a token and why are they expensive?",
];

export function SuggestionsContent({
  onSuggestionClickAction,
}: {
  onSuggestionClickAction?: (suggestion: string) => void;
}) {
  return (
    <GreetingContent>
      <div className="grid grid-cols-1 gap-3">
        {DEFAULT_PROMPTS.map(prompt => (
          <button
            key={prompt}
            onClick={() => onSuggestionClickAction?.(prompt)}
            className={`
              hover:bg-card
              focus-visible:ring-primary focus-visible:ring-2
              focus-visible:outline-none
              rounded-lg p-2 text-left transition-colors
            `}
            title={prompt}
          >
            <p className="line-clamp-2 text-sm">{prompt}</p>
          </button>
        ))}
      </div>
    </GreetingContent>
  );
}
