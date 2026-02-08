import { CustomLoginForm } from "@/components/custom-login-form";

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Omkar Marketing
          </h1>
          <p className="text-muted-foreground">Business Management Dashboard</p>
        </div>
        <CustomLoginForm />
      </div>
    </div>
  );
}
