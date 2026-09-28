"use client"

import { useState } from "react"
import Image from "next/image"
import { useRouter, useSearchParams } from "next/navigation"
import { useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import {
  AlertCircle,
  ArrowRight,
  Check,
  Eye,
  EyeOff,
  Info,
  Landmark,
  Leaf,
  Loader2,
  LockKeyhole,
  MapPin,
  ShieldCheck,
  UserRound,
  UsersRound,
  Wallet,
} from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { FormRoot, TextField } from "@/components/forms"
import { useSettings, useUsers } from "@/hooks/use-data"
import { DEMO_ACCOUNTS, authenticate, safeNext, type DemoAccount } from "@/lib/auth"
import { authActions } from "@/lib/store/auth-actions"
import { cn } from "@/lib/utils"
import styles from "./login.module.css"

const schema = z.object({
  identifier: z.string().trim().min(1, "Enter your username or email"),
  password: z.string().min(1, "Enter your password"),
})

const ROLE_ICONS = { Administrator: ShieldCheck, Secretary: UserRound, Treasurer: Wallet } as const

const REASONS: Record<string, string> = {
  "signed-out": "You have been signed out.",
  inactive: "Your account is no longer active. Contact the barangay administrator.",
}

export function LoginView() {
  const router = useRouter()
  const params = useSearchParams()
  const users = useUsers()
  const settings = useSettings()
  const [error, setError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const form = useForm({ resolver: zodResolver(schema), defaultValues: { identifier: "", password: "" } })
  const [identifier, password] = useWatch({ control: form.control, name: ["identifier", "password"] })
  const selectedAccount = DEMO_ACCOUNTS.find((a) => a.username === identifier && a.password === password)
  const reason = REASONS[params.get("reason") ?? ""]

  const onSubmit = async (values: z.output<typeof schema>) => {
    setError(null)
    setSubmitting(true)
    await new Promise((r) => setTimeout(r, 450)) // mock network round-trip
    const result = authenticate(values.identifier, values.password, users)
    if (!result.ok) {
      setSubmitting(false)
      setError(result.error)
      form.setValue("password", "")
      return
    }
    authActions.signIn(result.user.id)
    router.replace(safeNext(params.get("next")))
  }

  const fill = (a: DemoAccount) => {
    setError(null)
    form.reset({ identifier: a.username, password: a.password })
  }

  return (
    <div className={styles.page}>
      <div className={styles.shell}>
        <aside className={styles.story} aria-label="About BaryoSuite">
          <svg className={styles.contours} viewBox="0 0 800 1000" preserveAspectRatio="xMidYMax slice" fill="none" aria-hidden="true">
            {Array.from({ length: 15 }, (_, i) => (
              <path
                key={i}
                d="M-250 880C-40 560 140 1050 420 720S790 360 1070 650"
                transform={`translate(0 ${i * 27})`}
                stroke="currentColor"
                strokeWidth="1"
              />
            ))}
            <circle cx="730" cy="125" r="210" stroke="currentColor" />
            <circle cx="730" cy="125" r="240" stroke="currentColor" />
            <circle cx="730" cy="125" r="270" stroke="currentColor" />
          </svg>

          <div className="flex items-center gap-3">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-[#f2d46a] text-[#173d2d] shadow-lg shadow-black/10">
              <Landmark className="size-5" strokeWidth={1.6} aria-hidden="true" />
            </span>
            <div>
              <p className="text-2xl font-semibold tracking-tight">
                Baryo<span className="font-normal text-[#f2d46a]">Suite</span>
              </p>
              <p className="mt-0.5 text-[10px] tracking-[0.12em] text-[#c4d5c7] uppercase">Barangay management, simplified</p>
            </div>
          </div>

          <div className={styles.storyContent}>
            <p className="flex items-center gap-2 text-[10px] font-semibold tracking-[0.18em] text-[#f2d46a] uppercase">
              <span className="h-px w-7 bg-[#f2d46a]/65" aria-hidden="true" /> Built for your community
            </p>
            <h2 className={styles.headline}>
              One platform.
              <br />
              Smarter barangay
              <br />
              <em>service.</em>
            </h2>
            <p className="mt-6 max-w-sm text-sm leading-7 text-[#c4d5c7]">
              Less paperwork. More time for your community. Bring your barangay’s people, services, and decisions together in one workspace.
            </p>
            <div className="mt-9 grid grid-cols-3 gap-4 border-t border-white/15 pt-6">
              {[
                { icon: UsersRound, label: "Resident services" },
                { icon: Landmark, label: "Governance" },
                { icon: Wallet, label: "Finance & reports" },
              ].map(({ icon: Icon, label }) => (
                <div key={label} className="space-y-2.5">
                  <Icon className="size-[18px] text-[#f2d46a]" strokeWidth={1.5} aria-hidden="true" />
                  <p className="text-[11px] leading-relaxed text-[#d8e3d5]">{label}</p>
                </div>
              ))}
            </div>
          </div>

          <div className={cn(styles.storyFooter, "flex items-center gap-3 border-t border-white/15 pt-6")}>
            <Image
              src="/logo/brgy-busilac-logo.jpeg"
              alt="Barangay Busilac seal"
              width={44}
              height={44}
              className="size-11 rounded-full border-2 border-white/25 object-cover"
            />
            <div className="min-w-0">
              <p className="text-sm font-medium">Barangay {settings.barangayName}</p>
              <p className="mt-1 flex items-center gap-1 text-[11px] text-[#b6cbbc]">
                <MapPin className="size-3 shrink-0" aria-hidden="true" />
                {settings.municipality}, {settings.province}
              </p>
            </div>
          </div>
        </aside>

        <main className={styles.signInPanel}>
          <div className="w-full max-w-[400px]">
            <div className="mb-8">
              <div className="mb-5 flex items-center gap-2 text-[10px] font-semibold tracking-[0.16em] text-primary uppercase">
                <span className="flex size-8 items-center justify-center rounded-lg border border-primary/10 bg-accent/60">
                  <LockKeyhole className="size-3.5" aria-hidden="true" />
                </span>
                Staff portal
              </div>
              <h1 className="text-[30px] leading-tight font-semibold tracking-[-0.04em] sm:text-[34px]">Welcome back.</h1>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">Sign in to your barangay workspace.</p>
            </div>

            <div className="space-y-4" aria-live="polite">
              {reason && !error && (
                <Alert className="mb-5">
                  <Info />
                  <AlertDescription>{reason}</AlertDescription>
                </Alert>
              )}
              {error && (
                <Alert variant="destructive" className="mb-5">
                  <AlertCircle />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
            </div>

            <FormRoot id="login-form" form={form} onSubmit={onSubmit} className={cn(styles.form, "space-y-5")}>
              <div className="relative">
                <TextField
                  name="identifier"
                  label="Username or email"
                  autoComplete="username"
                  placeholder="Enter your username or email"
                  disabled={submitting}
                  required
                />
                <UserRound className="pointer-events-none absolute top-10 left-3.5 size-4 text-muted-foreground" aria-hidden="true" />
              </div>
              <div className="relative">
                <TextField
                  name="password"
                  label="Password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  disabled={submitting}
                  className="[&_input]:pr-12"
                  required
                />
                <LockKeyhole className="pointer-events-none absolute top-10 left-3.5 size-4 text-muted-foreground" aria-hidden="true" />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute top-8 right-2 size-8 text-muted-foreground"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  aria-pressed={showPassword}
                  disabled={submitting}
                  onClick={() => setShowPassword((v) => !v)}
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </Button>
              </div>
              <Button
                type="submit"
                className="h-12 w-full justify-between rounded-xl px-4 text-sm shadow-[0_4px_10px_-4px_rgb(20_60_40/0.35)]"
                disabled={submitting}
              >
                {submitting ? "Signing in…" : "Sign in"}
                {submitting ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <ArrowRight className="size-4" aria-hidden="true" />}
              </Button>
            </FormRoot>

            <p className="mt-4 text-center text-xs leading-relaxed text-muted-foreground">Need access? Contact your barangay administrator.</p>

            <section aria-labelledby="demo-accounts" className="mt-8 border-t border-border/80 pt-6">
              <div className="mb-4 flex items-start justify-between gap-2">
                <div>
                  <h2 id="demo-accounts" className="text-xs font-semibold">
                    Explore a demo workspace
                  </h2>
                  <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">Choose a role to fill in sample credentials.</p>
                </div>
                <span className="rounded-md bg-secondary/30 px-2 py-1 text-[9px] font-semibold tracking-wider text-foreground uppercase">Demo</span>
              </div>
              <div className="grid grid-cols-1 gap-2 min-[380px]:grid-cols-3" role="group" aria-label="Demo accounts">
                {DEMO_ACCOUNTS.map((a) => {
                  const Icon = ROLE_ICONS[a.role]
                  const selected = selectedAccount?.username === a.username
                  return (
                    <button
                      key={a.username}
                      type="button"
                      onClick={() => fill(a)}
                      aria-pressed={selected}
                      disabled={submitting}
                      className={cn(
                        "group relative flex min-h-11 items-center gap-3 rounded-xl border p-3 text-left transition-colors disabled:pointer-events-none disabled:opacity-50 min-[380px]:flex-col min-[380px]:items-start min-[380px]:gap-2.5",
                        "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card focus-visible:outline-none",
                        selected
                          ? "border-primary/40 bg-accent text-accent-foreground"
                          : "border-border/80 bg-background/60 hover:border-primary/30 hover:bg-accent/50",
                      )}
                    >
                      <Icon className="size-4 shrink-0 text-primary" strokeWidth={1.7} aria-hidden="true" />
                      <span className="text-[11px] font-medium">{a.role}</span>
                      {selected && <Check className="absolute top-3 right-2.5 size-3 text-primary" aria-hidden="true" />}
                    </button>
                  )
                })}
              </div>
              <p className="mt-3 min-h-8 text-[11px] leading-relaxed text-muted-foreground" role="status">
                {selectedAccount
                  ? `${selectedAccount.role} credentials filled in. Select Sign in to continue.`
                  : "Preview the tools available to each staff role."}
              </p>
            </section>

            <div className="mt-6 flex items-center justify-center gap-1.5 text-[10px] text-muted-foreground">
              <Leaf className="size-3 text-primary" aria-hidden="true" /> Better tools. Better barangay service.
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
