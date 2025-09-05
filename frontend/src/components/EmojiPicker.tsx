import React, { useState, useRef, useEffect } from 'react';
import EmojiPicker from 'emoji-picker-react';

interface EmojiPickerComponentProps {
  onEmojiClick: (emoji: string) => void;
  disabled?: boolean;
}

const EmojiPickerComponent: React.FC<EmojiPickerComponentProps> = ({
  onEmojiClick,
  disabled = false
}) => {
  const [showPicker, setShowPicker] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Close picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        pickerRef.current &&
        !pickerRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setShowPicker(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleEmojiClick = (emojiData: any) => {
    onEmojiClick(emojiData.emoji);
    setShowPicker(false);
  };

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setShowPicker(!showPicker)}
        disabled={disabled}
        className={`
          p-2 rounded-md border border-gray-300 hover:bg-gray-50 transition-colors
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          ${showPicker ? 'bg-gray-100' : 'bg-white'}
        `}
        title="Add emoji"
      >
        <svg
          className="w-5 h-5 text-gray-600"
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zM7 9a1 1 0 100-2 1 1 0 000 2zm7-1a1 1 0 11-2 0 1 1 0 012 0zm-.464 5.535a1 1 0 10-1.415-1.414 3 3 0 01-4.242 0 1 1 0 00-1.415 1.414 5 5 0 007.072 0z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {showPicker && (
        <div
          ref={pickerRef}
          className="absolute bottom-full right-0 mb-2 z-50 shadow-lg rounded-lg border bg-white"
        >
          <EmojiPicker
            onEmojiClick={handleEmojiClick}
            width={300}
            height={400}
            searchDisabled={false}
            skinTonesDisabled={false}
            previewConfig={{
              showPreview: false
            }}
          />
        </div>
      )}
    </div>
  );
};

export default EmojiPickerComponent;