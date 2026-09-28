import Image from "next/image";

export default function Loading() {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#0A0A0A]">
      <div className="relative flex flex-col items-center justify-center animate-pulse">
        <Image
          src="/images/aman/logo-large.webp"
          alt="Aman Khurana Fitness"
          width={120}
          height={120}
          priority
          className="object-contain drop-shadow-[0_0_30px_rgba(255,184,0,0.35)]"
        />
        <div className="mt-4 flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-[#FFB800] animate-bounce [animation-delay:-0.3s]"></span>
          <span className="h-1.5 w-1.5 rounded-full bg-[#FFB800] animate-bounce [animation-delay:-0.15s]"></span>
          <span className="h-1.5 w-1.5 rounded-full bg-[#FFB800] animate-bounce"></span>
        </div>
      </div>
    </div>
  );
}
