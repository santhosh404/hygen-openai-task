// src/components/MicButton.tsx
import React from 'react';
import { FaMicrophone } from 'react-icons/fa';
import { Button } from '@/components/ui/button';

type MicButtonProps = {
  isSpeaking: boolean;
  onClick: () => void;
};

const MicButton: React.FC<MicButtonProps> = ({ isSpeaking, onClick }) => (
  <div className="  flex items-center justify-center w-[100%]  p-5">
    <Button
      className={`flex items-center justify-center w-14 h-14 rounded-full hover:bg-blue-500 text-white shadow-lg ${isSpeaking ? 'bg-gray-800 hover:bg-gray-800' : 'bg-blue-500'}`}
      onClick={onClick}
    >
      <FaMicrophone size={20} />
    </Button>
    <div className="ml-4 text-gray-700">
      {isSpeaking ? 'Tap to Stop Speaking' : 'Tap to Speak'}
    </div>
  </div>
);

export default MicButton;
