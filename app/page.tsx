"use client"

import type React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { AppShell } from "@/components/app-shell"
import { Eye, EyeOff } from "lucide-react"
import { AppStateProvider } from "@/context/app-state"

export default function Page() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [show, setShow] = useState(false)

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    // Simulate login success and navigate to core screen
    router.push("/entry")
  }

  return (
    // Provide app state from the root so all subsequent screens share it
    <AppStateProvider>
      <AppShell title="Login" hideNav>
        <div className="mx-auto w-full max-w-md sm:max-w-lg md:max-w-xl">
          <form onSubmit={onSubmit} className="rounded-xl border border-gray-200 bg-white p-4 sm:p-6 md:p-8 shadow-sm">
            <div className="mb-4">
              <label htmlFor="email" className="mb-1 block text-sm font-medium text-gray-800">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                placeholder="your.email@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-600"
              />
            </div>
            <div className="mb-2">
              <label htmlFor="password" className="mb-1 block text-sm font-medium text-gray-800">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={show ? "text" : "password"}
                  required
                  placeholder="Your Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 pr-10 text-sm text-gray-800 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                />
                <button
                  type="button"
                  aria-label={show ? "Hide password" : "Show password"}
                  onClick={() => setShow((s) => !s)}
                  className="absolute inset-y-0 right-2 my-auto rounded-md p-1 text-gray-700 hover:bg-gray-100 active:scale-95"
                >
                  {show ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="mt-4 w-full rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 active:scale-95"
            >
              Log In
            </button>

            {/* <div className="mt-3 text-center">
              <button
                type="button"
                className="text-sm font-medium text-indigo-600 hover:underline"
                onClick={() => alert("Password reset flow not implemented")}
              >
                Forgot Password?
              </button>
            </div> */}
          </form>
        </div>
      </AppShell>
    </AppStateProvider>
  )
}
