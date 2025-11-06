interface AvatarProps {
  name: string;
}

export function Avatar({ name }: AvatarProps) {
  return (
    <div className="w-10 h-10 bg-gray-600 rounded-full flex items-center justify-center text-white font-bold">
        <span>{name}</span>
    </div>
  );
}
