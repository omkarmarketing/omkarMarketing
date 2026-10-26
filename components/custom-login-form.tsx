"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SignOutButton, useAuth, useSignIn } from "@clerk/nextjs";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { Spinner } from "@/components/ui/spinner";

// Validation schema
const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export function CustomLoginForm() {
  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) {
    return (
      <Card className="w-full max-w-md bg-card rounded-lg shadow-lg border border-border">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-bold text-foreground">
            Authentication unavailable
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            Add Clerk credentials to enable sign-in.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return <ConfiguredCustomLoginForm />;
}

function ConfiguredCustomLoginForm() {
  const router = useRouter();
  const { signIn, setActive, isLoaded } = useSignIn();
  const { isLoaded: authLoaded, isSignedIn } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (data: LoginFormValues) => {
    if (!isLoaded) return;

    setIsLoading(true);

    try {
      const result = await signIn.create({
        identifier: data.email,
        password: data.password,
      });

      if (result.status === "complete") {
        // signIn.create() only creates the session; without setActive it is
        // never made the active session, so protected routes still see a
        // signed-out browser and bounce straight back to this page.
        await setActive({ session: result.createdSessionId });
        toast({
          title: "Login successful",
          description: "Welcome back!",
        });
        router.push("/transactions");
      } else {
        toast({
          title: "Login failed",
          description: "Please check your credentials and try again",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error("Login error:", error);
      // Clerk refuses a second sign-in while a session is active. Landing here
      // means the browser holds a session the server did not accept, so say so
      // instead of reporting bad credentials.
      if (error?.errors?.[0]?.code === "session_exists") {
        toast({
          title: "You are already signed in",
          description: "Continue to the app, or sign out and try again.",
        });
        return;
      }
      toast({
        title: "Login failed",
        description:
          error.errors?.[0]?.longMessage || "Invalid email or password",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (authLoaded && isSignedIn) {
    return (
      <Card className="w-full max-w-md bg-card rounded-lg shadow-lg border border-border">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-bold text-foreground">
            You are already signed in
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            If the app keeps returning you here, sign out and sign in again.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <Button className="h-11 w-full" onClick={() => router.push("/transactions")}>
            Continue to the app
          </Button>
          <SignOutButton redirectUrl="/login">
            <Button variant="outline" className="h-11 w-full">
              Sign out
            </Button>
          </SignOutButton>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md bg-card rounded-lg shadow-lg border border-border">
      <CardHeader className="space-y-1 text-center">
        <CardTitle className="text-2xl font-bold text-foreground">
          Omkar Marketing
        </CardTitle>

        <CardDescription className="text-muted-foreground">
          Sign in to your account
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-foreground">Email</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="email"
                      placeholder="Enter your email"
                      className="h-11 bg-background text-foreground border-input focus-visible:border-ring focus-visible:ring-ring/50"
                      disabled={isLoading}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-foreground">Password</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="password"
                      placeholder="Enter your password"
                      className="h-11 bg-background text-foreground border-input focus-visible:border-ring focus-visible:ring-ring/50"
                      disabled={isLoading}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" className="w-full h-11" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Spinner className="mr-2 h-4 w-4" />
                  Signing in...
                </>
              ) : (
                "Sign In"
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
