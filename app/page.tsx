"use client";

import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function HomePage() {
  const { user, isLoaded } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (isLoaded) {
      if (user) {
        router.push("/company");
      } else {
        router.push("/login");
      }
    }
  }, [user, isLoaded, router]);

  return null; // or a loading spinner
}
