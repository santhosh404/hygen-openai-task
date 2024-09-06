// src/components/ChatMessage.tsx
import React from 'react';
import { Avatar } from '@/components/ui/avatar';
import { AvatarFallback, AvatarImage } from '@radix-ui/react-avatar';

type ChatMessageProps = {
    role: string;
    message: string;
};

const ChatMessage: React.FC<ChatMessageProps> = ({ role, message }) => (
    <div
        className={`flex ${role === 'user' ? 'justify-end' : 'justify-start'} mb-2`}
    >
        
        {
            role ==='assistant' && (
            <Avatar className='mr-2'>
                <AvatarImage src="https://github.com/shadcn.png" />
                <AvatarFallback>CN</AvatarFallback>
            </Avatar>
            )
        }
        <div
            className={`p-3 rounded-3xl text-white ${role === 'user' ? 'bg-blue-400' : 'bg-gray-400'} max-w-[50%] `}
        >

            {message}
        </div>
        {
            role ==='user' && (
            <Avatar className='ml-2'>
                <AvatarImage src="https://as2.ftcdn.net/v2/jpg/05/89/93/27/1000_F_589932782_vQAEAZhHnq1QCGu5ikwrYaQD0Mmurm0N.jpg" width={50} height={50} />
                <AvatarFallback>CN</AvatarFallback>
            </Avatar>
            )
        }
    </div>
);

export default ChatMessage;
