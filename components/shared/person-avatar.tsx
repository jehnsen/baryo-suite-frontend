import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { initials } from "@/lib/format"
import { cn } from "@/lib/utils"

const SIZES = {
  xs: "size-6 text-[10px]",
  sm: "size-8 text-xs",
  md: "size-10 text-sm",
  lg: "size-16 text-lg",
  xl: "size-20 text-xl",
} as const

export function PersonAvatar({ name, src, size = "sm", className }: { name: string; src?: string; size?: keyof typeof SIZES; className?: string }) {
  return (
    <Avatar className={cn(SIZES[size], className)}>
      {src && <AvatarImage src={src} alt={name} />}
      <AvatarFallback className="bg-accent font-medium text-accent-foreground">{initials(name)}</AvatarFallback>
    </Avatar>
  )
}
