'use client';

const AVATAR_GRADIENTS = [
  'from-violet-500 to-sky-400',
  'from-fuchsia-500 to-indigo-500',
  'from-emerald-500 to-cyan-500',
  'from-orange-500 to-rose-500',
  'from-blue-500 to-teal-400',
  'from-pink-500 to-orange-400',
] as const;

function hashSeed(seed: string) {
  return Array.from(seed).reduce((total, char) => total + char.charCodeAt(0), 0);
}

function getInitials(label: string) {
  const words = label.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return 'X';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return `${words[0][0] ?? 'X'}${words[1][0] ?? 'A'}`.toUpperCase();
}

function getAvatarGradient(seed: string) {
  return AVATAR_GRADIENTS[hashSeed(seed) % AVATAR_GRADIENTS.length];
}

export function AvatarMark({ seed, label, large = false }: { seed: string; label: string; large?: boolean }) {
  return (
    <div
      className={`grid shrink-0 place-items-center rounded-full bg-gradient-to-br text-white shadow-lg shadow-black/10 ${getAvatarGradient(seed)} ${large ? 'size-14 text-base font-semibold' : 'size-12 text-sm font-semibold'}`}
    >
      {getInitials(label)}
    </div>
  );
}
