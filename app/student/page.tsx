"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { useSocket } from "@/hooks/use-socket"
import { useToast } from "@/hooks/use-toast"
import { AlertCircle } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

export default function StudentPage() {
  const [studentName, setStudentName] = useState("")
  const [sessionCode, setSessionCode] = useState("")
  const [currentPoll, setCurrentPoll] = useState<any>(null)
  const [selectedAnswer, setSelectedAnswer] = useState("")
  const [hasJoined, setHasJoined] = useState(false)
  const [hasSubmitted, setHasSubmitted] = useState(false)
  const [isJoining, setIsJoining] = useState(false)
  const [joinError, setJoinError] = useState<string | null>(null)
  const { socket, isConnected, connectSocket, joinSession } = useSocket()
  const { toast } = useToast()

  // Connect socket when student page loads
  useEffect(() => {
    console.log("🎓 Student page loaded - connecting to server")
    connectSocket()
  }, [connectSocket])

  useEffect(() => {
    if (!socket) return

    console.log("🔌 Setting up socket listeners for student")

    // Listen for join success
    socket.on("join-success", (data) => {
      console.log("✅ Successfully joined session:", data)
      setHasJoined(true)
      setIsJoining(false)
      setJoinError(null)

      toast({
        title: "Joined Session",
        description: `Welcome ${studentName}! You've joined the session.`,
      })
    })

    // Listen for join error
    socket.on("join-error", (data) => {
      console.error("❌ Failed to join session:", data.message)
      setIsJoining(false)
      setJoinError(data.message || "Failed to join session")

      toast({
        title: "Join Error",
        description: data.message || "Failed to join session",
        variant: "destructive",
      })
    })

    // Listen for new questions
    socket.on("new-question", (pollData) => {
      console.log("📋 Received new question from teacher:", pollData)
      setCurrentPoll(pollData)
      setSelectedAnswer("")
      setHasSubmitted(false)
    })

    // Listen for poll ended
    socket.on("poll-ended", () => {
      console.log("🛑 Poll ended by teacher")
      toast({
        title: "Poll Ended",
        description: "The teacher has ended this poll.",
      })
      setCurrentPoll(null)
      setHasJoined(false)
      setHasSubmitted(false)
    })

    // Listen for being kicked out
    socket.on("kicked-out", () => {
      console.log("🚫 Kicked out by teacher")
      toast({
        title: "Removed from Poll",
        description: "You have been removed from the poll by the teacher.",
        variant: "destructive",
      })
      setCurrentPoll(null)
      setHasJoined(false)
      setHasSubmitted(false)
    })

    return () => {
      console.log("🧹 Cleaning up student socket listeners")
      socket.off("join-success")
      socket.off("join-error")
      socket.off("new-question")
      socket.off("poll-ended")
      socket.off("kicked-out")
    }
  }, [socket, toast, studentName])

  const joinPoll = () => {
    if (!socket || !isConnected) {
      console.error("❌ Cannot join poll: Socket not connected")
      toast({
        title: "Connection Error",
        description: "Not connected to server. Please check your connection.",
        variant: "destructive",
      })
      return
    }

    // Reset error state
    setJoinError(null)
    setIsJoining(true)

    // Validate inputs
    if (!studentName.trim()) {
      setJoinError("Please enter your name")
      setIsJoining(false)
      return
    }

    if (!sessionCode.trim()) {
      setJoinError("Please enter a session code")
      setIsJoining(false)
      return
    }

    // Format session code (uppercase, trim whitespace)
    const formattedSessionCode = sessionCode.trim().toUpperCase()

    console.log("🚪 Student attempting to join session:", formattedSessionCode, "with name:", studentName)

    // Use the joinSession function from our hook
    joinSession(formattedSessionCode, studentName)

    toast({
      title: "Joining Session",
      description: `Connecting to session ${formattedSessionCode}...`,
    })
  }

  const submitAnswer = () => {
    if (!socket || !selectedAnswer || !currentPoll) {
      console.error("❌ Cannot submit answer: Missing data")
      return
    }

    const sessionId = localStorage.getItem("currentSessionId")

    const answerData = {
      sessionId: sessionId,
      pollId: currentPoll._id || currentPoll.id,
      name: studentName,
      answer: selectedAnswer,
      studentId: socket.id,
      timestamp: new Date().toISOString(),
    }

    console.log("📤 Submitting answer:", answerData)

    // Emit submit-answer event to backend
    socket.emit("submit-answer", answerData)

    setHasSubmitted(true)

    console.log("✅ Answer submitted successfully")
    toast({
      title: "Answer Submitted",
      description: "Your answer has been recorded!",
    })
  }

  if (!hasJoined) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center">Join Poll</CardTitle>
            <div className={`text-center text-sm ${isConnected ? "text-green-600" : "text-red-600"}`}>
              {isConnected ? "🟢 Connected to server" : "🔴 Connecting to server..."}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {joinError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{joinError}</AlertDescription>
              </Alert>
            )}

            <div>
              <Label htmlFor="name">Your Name</Label>
              <Input
                id="name"
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                placeholder="Enter your name"
              />
            </div>
            <div>
              <Label htmlFor="code">Session Code</Label>
              <Input
                id="code"
                value={sessionCode}
                onChange={(e) => setSessionCode(e.target.value)}
                placeholder="Enter session code from teacher"
                className="uppercase"
              />
              <p className="text-xs text-gray-500 mt-1">Enter the 6-character code provided by your teacher</p>
            </div>
            <Button
              onClick={joinPoll}
              disabled={!studentName.trim() || !sessionCode.trim() || !isConnected || isJoining}
              className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50"
            >
              {isJoining ? (
                <>
                  <span className="animate-spin mr-2">⏳</span>
                  Joining...
                </>
              ) : isConnected ? (
                "Join Poll"
              ) : (
                "Connecting..."
              )}
            </Button>
            {!isConnected && <p className="text-red-600 text-sm text-center">Please wait for server connection</p>}
          </CardContent>
        </Card>
      </div>
    )
  }

  if (hasSubmitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-6">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold mb-2">Answer Submitted!</h2>
            <p className="text-gray-600 mb-4">Waiting for other participants to submit their answers...</p>
            <div className={`text-sm ${isConnected ? "text-green-600" : "text-red-600"}`}>
              {isConnected ? "🟢 Connected" : "🔴 Disconnected"}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Show waiting screen if we've joined but haven't received a poll yet
  if (!currentPoll) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-6">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
            <h2 className="text-xl font-semibold mb-2">Waiting for teacher...</h2>
            <p className="text-gray-600 mb-4">The teacher hasn't started a poll yet.</p>
            <div className={`text-sm ${isConnected ? "text-green-600" : "text-red-600"}`}>
              {isConnected ? "🟢 Connected to session" : "🔴 Disconnected from session"}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-2xl mx-auto">
        {/* Connection Status */}
        <div className="mb-4">
          <div
            className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm ${
              isConnected ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${isConnected ? "bg-green-500" : "bg-red-500"}`}></span>
            {isConnected ? "Connected to session" : "Disconnected from session"}
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-xl font-semibold bg-gray-800 text-white p-4 rounded-t-lg -m-6 mb-4">
              Question
            </CardTitle>
            <div className="bg-gray-700 text-white p-3 rounded">{currentPoll?.question}</div>
          </CardHeader>
          <CardContent>
            <RadioGroup value={selectedAnswer} onValueChange={setSelectedAnswer} className="space-y-4">
              {currentPoll?.options?.map((option: any, index: number) => (
                <div key={option.id} className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50">
                  <RadioGroupItem value={option.id} id={option.id} />
                  <div className="w-8 h-8 rounded-full bg-purple-600 text-white flex items-center justify-center font-medium">
                    {String.fromCharCode(65 + index)}
                  </div>
                  <Label htmlFor={option.id} className="flex-1 cursor-pointer">
                    {option.text}
                  </Label>
                </div>
              ))}
            </RadioGroup>

            <div className="mt-6 text-center">
              <Button
                onClick={submitAnswer}
                disabled={!selectedAnswer || !isConnected}
                className="bg-purple-600 hover:bg-purple-700 text-white px-8 py-2 rounded-full disabled:opacity-50"
              >
                {isConnected ? "Submit Answer" : "Connecting..."}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
