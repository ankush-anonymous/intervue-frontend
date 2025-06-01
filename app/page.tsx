"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useRouter } from "next/navigation"

export default function LandingPage() {
  const [selectedRole, setSelectedRole] = useState<"student" | "teacher" | null>(null)
  const router = useRouter()

  const handleContinue = () => {
    console.log("User selected role:", selectedRole)
    if (selectedRole === "teacher") {
      router.push("/teacher")
    } else if (selectedRole === "student") {
      router.push("/student")
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl mx-auto text-center">
        {/* Header */}
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-full text-sm font-medium mb-6">
            <span className="w-2 h-2 rounded-full bg-gray-300"></span>
            Interrup Poll (Not Connected)
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Welcome to the Live Polling System</h1>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Please select the role that best describes you to begin using the live polling system
          </p>
        </div>

        {/* Role Selection Cards */}
        <div className="grid md:grid-cols-2 gap-6 mb-8 max-w-2xl mx-auto">
          <Card
            className={`cursor-pointer transition-all duration-200 hover:shadow-lg ${
              selectedRole === "student" ? "ring-2 ring-purple-600 bg-purple-50" : "hover:bg-gray-50"
            }`}
            onClick={() => setSelectedRole("student")}
          >
            <CardHeader>
              <CardTitle className="text-xl font-semibold">I'm a Student</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-left">
                Lorem Ipsum is simply dummy text of the printing and typesetting industry
              </CardDescription>
            </CardContent>
          </Card>

          <Card
            className={`cursor-pointer transition-all duration-200 hover:shadow-lg ${
              selectedRole === "teacher" ? "ring-2 ring-purple-600 bg-purple-50" : "hover:bg-gray-50"
            }`}
            onClick={() => setSelectedRole("teacher")}
          >
            <CardHeader>
              <CardTitle className="text-xl font-semibold">I'm a Teacher</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-left">
                Submit answers and view live poll results in real-time.
              </CardDescription>
            </CardContent>
          </Card>
        </div>

        {/* Continue Button */}
        <Button
          onClick={handleContinue}
          disabled={!selectedRole}
          className="bg-purple-600 hover:bg-purple-700 text-white px-8 py-3 rounded-full text-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Continue
        </Button>
      </div>
    </div>
  )
}
