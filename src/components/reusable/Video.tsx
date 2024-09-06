// src/components/reusable/Video.tsx
import { forwardRef } from 'react';

const Video = forwardRef<HTMLVideoElement, {}>((_, ref) => (
  <div className="w-full mt-10 mb-4">
    <video playsInline autoPlay width={500} ref={ref} className="rounded-lg w-[100%] h-[400px]"  />
  </div>
));

export { Video };
