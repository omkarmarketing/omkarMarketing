import { ClerkLoaded, SignIn } from "@clerk/nextjs"
import { dark } from "@clerk/themes"

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-foreground mb-2">Omkar Marketing</h1>
          <p className="text-muted-foreground">Business Management Dashboard</p>
        </div>
        <ClerkLoaded>
          <SignIn
            appearance={{
              baseTheme: dark,
              elements: {
                rootBox: "flex justify-center",
                card: "bg-card rounded-lg shadow-lg border border-border",
              },
            }}
          />
        </ClerkLoaded>
      </div>
    </div>
  )
}
