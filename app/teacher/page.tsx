"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Plus, Trash2, Copy } from "lucide-react"
import { useRouter } from "next/navigation"
import { useSocket } from "@/hooks/use-socket"
import { useToast } from "@/hooks/use-toast"

interface Option {
  id: string
  text: string
  isCorrect: boolean
}

export default function TeacherPage() {
  const [question, setQuestion] = useState("")
  const [timer, setTimer] = useState("60")
  const [options, setOptions] = useState<Option[]>([
    { id: "1", text: "Rahul Bajaj", isCorrect: true },
    { id: "2", text: "Rahul Bajaj", isCorrect: false },
  ])
  const router = useRouter()
  const { socket, isConnected, sessionId, connectSocket, createSession } = useSocket()
  const { toast } = useToast()

  // Connect socket and create session when teacher page loads
  useEffect(() => {
    console.log("🎓 Teacher page loaded - connecting to server")
    connectSocket()
  }, [connectSocket])

  // Create session when socket is connected
  useEffect(() => {
    if (isConnected && socket && !sessionId) {
      const newSessionId = createSession()
      console.log("🎯 Teacher created session:", newSessionId)
    }
  }, [isConnected, socket, sessionId, createSession])

  const addOption = () => {
    const newOption: Option = {
      id: Date.now().toString(),
      text: "",
      isCorrect: false,
    }
    setOptions([...options, newOption])
    console.log("➕ Added new option:", newOption)
  }

  const removeOption = (id: string) => {
    setOptions(options.filter((option) => option.id !== id))
    console.log("➖ Removed option with ID:", id)
  }

  const updateOption = (id: string, text: string) => {
    setOptions(options.map((option) => (option.id === id ? { ...option, text } : option)))
    console.log("✏️ Updated option:", { id, text })
  }

  const setCorrectAnswer = (id: string) => {
    setOptions(options.map((option) => ({ ...option, isCorrect: option.id === id })))
    console.log("✅ Set correct answer to option ID:", id)
  }

  const copySessionId = () => {
    if (sessionId) {
      navigator.clipboard.writeText(sessionId)
      toast({
        title: "Session ID Copied",
        description: "Students can use this ID to join your poll.",
      })
    }
  }

  const startPoll = () => {
    if (!socket || !isConnected || !sessionId) {
      console.error("❌ Cannot start poll: Socket not connected or no session")
      toast({
        title: "Connection Error",
        description: "Not connected to server or no session created.",
        variant: "destructive",
      })
      return
    }

    const pollData = {
      sessionId: sessionId,
      question,
      timer: Number.parseInt(timer),
      options: options.map((opt) => ({
        id: opt.id,
        text: opt.text,
        isCorrect: opt.isCorrect,
      })),
      createdAt: new Date().toISOString(),
    }

    console.log("🚀 Starting poll in session:", sessionId, "with data:", pollData)

    // Emit create-poll event to backend
    socket.emit("create-poll", pollData)

    // Store poll data locally for navigation
    localStorage.setItem("currentPoll", JSON.stringify(pollData))
    localStorage.setItem("currentSessionId", sessionId)

    console.log("📡 Emitted create-poll event to server for session:", sessionId)

    // Navigate to live poll page
    router.push("/teacher/live-poll")
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-full text-sm font-medium mb-6">
            <span className={`w-2 h-2 rounded-full ${isConnected ? "bg-green-400" : "bg-red-400"}`}></span>
            Interrup Poll {isConnected ? "(Connected)" : "(Connecting...)"}
          </div>

          {/* Session ID Display */}
          {sessionId && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-900">Session ID for Students:</p>
                  <p className="text-lg font-mono text-blue-700">{sessionId}</p>
                </div>
                <Button onClick={copySessionId} variant="outline" size="sm">
                  <Copy className="w-4 h-4 mr-2" />
                  Copy
                </Button>
              </div>
            </div>
          )}

          <h1 className="text-3xl font-bold text-gray-900 mb-2">Let's Get Started</h1>
          <p className="text-gray-600">
            You'll have the ability to create and manage polls, ask questions, and monitor your students' responses in
            real-time.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Question Input */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  Enter your question
                  <Select value={timer} onValueChange={setTimer}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="30">30 seconds</SelectItem>
                      <SelectItem value="60">60 seconds</SelectItem>
                      <SelectItem value="90">90 seconds</SelectItem>
                      <SelectItem value="120">120 seconds</SelectItem>
                    </SelectContent>
                  </Select>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  placeholder="Enter your question here..."
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  className="min-h-[100px] resize-none"
                />
                <div className="text-right text-sm text-gray-500 mt-2">{question.length}/100</div>
              </CardContent>
            </Card>

            {/* Edit Options */}
            <Card>
              <CardHeader>
                <CardTitle>Edit Options</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {options.map((option, index) => (
                  <div key={option.id} className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-purple-600 text-white flex items-center justify-center text-sm font-medium">
                      {String.fromCharCode(65 + index)}
                    </div>
                    <Input
                      value={option.text}
                      onChange={(e) => updateOption(option.id, e.target.value)}
                      placeholder={`Option ${index + 1}`}
                      className="flex-1"
                    />
                    {options.length > 2 && (
                      <Button variant="ghost" size="sm" onClick={() => removeOption(option.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button variant="outline" onClick={addOption} className="w-full">
                  <Plus className="w-4 h-4 mr-2" />
                  Add More option
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Correct Answer */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle>Is it Correct?</CardTitle>
              </CardHeader>
              <CardContent>
                <RadioGroup
                  value={options.find((o) => o.isCorrect)?.id || ""}
                  onValueChange={setCorrectAnswer}
                  className="space-y-4"
                >
                  {options.map((option, index) => (
                    <div key={option.id} className="flex items-center space-x-3">
                      <RadioGroupItem value={option.id} id={option.id} />
                      <Label htmlFor={option.id} className="flex-1">
                        {option.text || `Option ${index + 1}`}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Start Poll Button */}
        <div className="mt-8 text-center">
          <Button
            onClick={startPoll}
            disabled={!question.trim() || options.some((o) => !o.text.trim()) || !isConnected || !sessionId}
            className="bg-purple-600 hover:bg-purple-700 text-white px-8 py-3 rounded-full text-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isConnected && sessionId ? "Start Poll" : "Setting up session..."}
          </Button>
          {(!isConnected || !sessionId) && <p className="text-red-600 text-sm mt-2">Please wait for session setup</p>}
        </div>
      </div>
    </div>
  )
}
