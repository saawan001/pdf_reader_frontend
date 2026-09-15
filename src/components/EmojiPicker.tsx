import { useEffect, useRef } from "react";

const EMOJI_PRESETS = ["👍", "❤️", "🔥", "💡", "😄", "🎉", "🚀", "👏", "👎", "❓"];

interface EmojiPickerProps {
  onSelectEmoji: (emoji: string) => void;
  onClose: () => void;
}

export default function EmojiPicker({ onSelectEmoji, onClose }: EmojiPickerProps) {
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [onClose]);

  return (
    <div className="emoji-picker-popover animate-fade-in" ref={pickerRef}>
      {EMOJI_PRESETS.map((emoji) => (
        <button
          key={emoji}
          type="button"
          className="emoji-picker-btn"
          onClick={() => {
            onSelectEmoji(emoji);
            onClose();
          }}
          title={`React with ${emoji}`}
        >
          {emoji}
        </button>
      ))}
    </div>
  );
}
