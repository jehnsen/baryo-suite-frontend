"use client"

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { AlertCircle, ArrowRight, Info, Landmark, LogIn, ShieldCheck, UserRound, Wallet } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { FormRoot, TextField } from "@/components/forms"
import { useSettings, useUsers } from "@/hooks/use-data"
import { DEMO_ACCOUNTS, authenticate, safeNext, type DemoAccount } from "@/lib/auth"
import { APP_TAGLINE } from "@/lib/constants"
import { ROLE_DESCRIPTIONS } from "@/lib/permissions"
import { authActions } from "@/lib/store/auth-actions"
import { cn } from "@/lib/utils"

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
    <div className="grid min-h-dvh lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      {/* Brand panel */}
      <aside className="app-sidebar relative hidden flex-col justify-between bg-sidebar p-10 text-sidebar-foreground lg:flex">
        <div className="flex items-center gap-3">
          <span className="flex size-11 items-center justify-center rounded-xl bg-sidebar-primary text-sidebar-primary-foreground shadow-sm">
            <Landmark className="size-5" strokeWidth={1.7} aria-hidden />
          </span>
          <span className="text-2xl font-semibold tracking-tight">
            Baryo<span className="font-normal text-sidebar-primary">Suite</span>
          </span>
        </div>
        <div className="max-w-md space-y-4">
          <p className="text-[11px] font-semibold tracking-[0.18em] text-sidebar-primary uppercase">Barangay {settings.barangayName}</p>
          <h1 className="text-4xl leading-tight font-semibold tracking-tight">{APP_TAGLINE}</h1>
          <p className="text-sm leading-relaxed text-sidebar-foreground/75">
            Resident services, governance, treasury and reports for {settings.municipality}, {settings.province} — in one place.
          </p>
        </div>
        <p className="text-xs text-sidebar-foreground/60">{settings.address}</p>
      </aside>

      {/* Sign-in */}
      <main className="flex items-center justify-center px-4 py-10 sm:px-8">
        <div className="w-full max-w-md space-y-8">
          <div className="flex items-center gap-3 lg:hidden">
            <span className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Landmark className="size-5" strokeWidth={1.7} aria-hidden />
            </span>
            <span className="text-xl font-semibold tracking-tight">
              Baryo<span className="font-normal text-primary">Suite</span>
            </span>
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-semibold tracking-tight">Sign in</h2>
            <p className="text-sm text-muted-foreground">Use your barangay staff account.</p>
          </div>

          {reason && !error && (
            <Alert>
              <Info />
              <AlertDescription>{reason}</AlertDescription>
            </Alert>
          )}
          {error && (
            <Alert variant="destructive">
              <AlertCircle />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <FormRoot id="login-form" form={form} onSubmit={onSubmit} className="space-y-4">
            <TextField name="identifier" label="Username or email" autoComplete="username" placeholder="e.g. secretary" required />
            <TextField name="password" label="Password" type={showPassword ? "text" : "password"} autoComplete="current-password" required />
            <div className="flex items-center gap-2">
              <Checkbox id="show-password" checked={showPassword} onCheckedChange={(v) => setShowPassword(v === true)} />
              <Label htmlFor="show-password" className="text-sm font-normal text-muted-foreground">
                Show password
              </Label>
            </div>
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? (
                "Signing in…"
              ) : (
                <>
                  <LogIn /> Sign in
                </>
              )}
            </Button>
          </FormRoot>

          <section aria-labelledby="demo-accounts" className="space-y-3 rounded-xl border border-dashed p-4">
            <div>
              <h3 id="demo-accounts" className="text-sm font-semibold">
                Demo accounts
              </h3>
              <p className="text-xs text-muted-foreground">Hardcoded for now. Select one to fill in the form.</p>
            </div>
            <ul className="space-y-2">
              {DEMO_ACCOUNTS.map((a) => {
                const Icon = ROLE_ICONS[a.role]
                return (
                  <li key={a.username}>
                    <button
                      type="button"
                      onClick={() => fill(a)}
                      className={cn(
                        "group flex w-full items-start gap-3 rounded-lg border bg-card p-3 text-left transition-colors hover:border-primary/40 hover:bg-accent/40",
                        "focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none",
                      )}
                    >
                      <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                        <Icon className="size-4" aria-hidden />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center justify-between gap-2">
                          <span className="text-sm font-medium">{a.role}</span>
                          <span className="font-mono text-xs text-muted-foreground">
                            {a.username} / {a.password}
                          </span>
                        </span>
                        <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">{ROLE_DESCRIPTIONS[a.role]}</span>
                      </span>
                      <ArrowRight className="mt-1 size-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" aria-hidden />
                    </button>
                  </li>
                )
              })}
            </ul>
          </section>
        </div>
      </main>
    </div>
  )
}
