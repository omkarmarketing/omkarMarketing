"use client";

import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function HomePage() {
  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) {
    return null;
  }

  return <AuthenticatedHomePage />;
}

function AuthenticatedHomePage() {
  const { user, isLoaded } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (isLoaded) {
      if (user) {
        router.push("/transactions");
      } else {
        router.push("/login");
      }
    }
  }, [user, isLoaded, router]);

  return null; // or a loading spinner
}
