"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { MessageCircle, Users, Send, Copy, RefreshCw } from "lucide-react"
import { useRouter } from "next/navigation"
import { useSocket } from "@/hooks/use-socket"
import { useToast } from "@/hooks/use-toast"

interface Option {
  id: string
  text: string
  isCorrect: boolean
  votes: number
}

interface Participant {
  socketId: string
  name: string
  hasVoted: boolean
}

interface ChatMessage {
  id: string
  user: string
  message: string
  timestamp: Date
}

export default function LivePollPage() {
  const [pollData, setPollData] = useState<any>(null)
  const [options, setOptions] = useState<Option[]>([])
  const [participants, setParticipants] = useState<Participant[]>([])
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [showChat, setShowChat] = useState(false)
  const router = useRouter()
  const { socket, isConnected, sessionId } = useSocket()
  const { toast } = useToast()
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null)

  useEffect(() => {
    const storedSessionId = localStorage.getItem("currentSessionId")
    setCurrentSessionId(storedSessionId)

    const stored = localStorage.getItem("currentPoll")
    if (stored) {
      const data = JSON.parse(stored)
      setPollData(data)
      setOptions(data.options.map((opt: any) => ({ ...opt, votes: 0 })))
      console.log("📊 Loaded poll data for session:", storedSessionId, data)
    }
  }, [])

  // Request students list when component mounts and when session changes
  useEffect(() => {
    if (socket && currentSessionId && isConnected) {
      console.log("📋 Requesting students list for session:", currentSessionId)
      socket.emit("get-students", { sessionId: currentSessionId })
    }
  }, [socket, currentSessionId, isConnected])

  useEffect(() => {
    if (!socket) return

    console.log("🔌 Setting up socket listeners for live poll with session ID:", currentSessionId)

    // Listen for students list response
    socket.on("students-list", (data) => {
      try {
        console.log("👥 Received students list:", data)
        if (data && data.students && Array.isArray(data.students)) {
          setParticipants(
            data.students.map((student: any) => ({
              socketId: student.socketId || student.id,
              name: student.name || "Unknown",
              hasVoted: false,
            })),
          )
        } else {
          console.warn("⚠️ Invalid students list format:", data)
        }
      } catch (err) {
        console.error("❌ Error processing students list:", err)
      }
    })

    // Listen for new participants joining the session
    socket.on("student-joined", (participant) => {
      try {
        console.log("👋 New participant joined session:", participant)
        if (participant && participant.name) {
          setParticipants((prev) => {
            // Check if participant already exists to avoid duplicates
            const exists = prev.some((p) => p.socketId === (participant.socketId || participant.id))
            if (exists) return prev

            return [
              ...prev,
              {
                socketId: participant.socketId || participant.id,
                name: participant.name,
                hasVoted: false,
              },
            ]
          })

          toast({
            title: "New Participant",
            description: `${participant.name} has joined the poll.`,
          })
        }
      } catch (err) {
        console.error("❌ Error processing new participant:", err)
      }
    })

    // Listen for answer submissions in this session
    socket.on("answer-submitted", (data) => {
      try {
        console.log("📝 Answer submitted:", data)
        if (data && data.studentId && data.answer) {
          // Update participant status
          setParticipants((prev) => prev.map((p) => (p.socketId === data.studentId ? { ...p, hasVoted: true } : p)))

          // Update vote counts
          setOptions((prev) => prev.map((opt) => (opt.id === data.answer ? { ...opt, votes: opt.votes + 1 } : opt)))
        }
      } catch (err) {
        console.error("❌ Error processing answer submission:", err)
      }
    })

    // Listen for chat messages in this session
    socket.on("chat-message", (message) => {
      try {
        console.log("💬 New chat message:", message)
        if (message && message.user && message.text) {
          setChatMessages((prev) => [
            ...prev,
            {
              id: Date.now().toString(),
              user: message.user,
              message: message.text,
              timestamp: new Date(),
            },
          ])
        }
      } catch (err) {
        console.error("❌ Error processing chat message:", err)
      }
    })

    // Listen for participant disconnections
    socket.on("student-left", (data) => {
      try {
        console.log("👋 Participant left:", data)
        if (data && data.studentId) {
          setParticipants((prev) => prev.filter((p) => p.socketId !== data.studentId))

          if (data.name) {
            toast({
              title: "Participant Left",
              description: `${data.name} has left the poll.`,
            })
          }
        }
      } catch (err) {
        console.error("❌ Error processing participant leaving:", err)
      }
    })

    // Listen for errors with improved error handling
    socket.on("error", (error) => {
      console.error("❌ Socket error received:", error)

      // Handle different error formats
      let errorMessage = "An unknown error occurred"

      try {
        if (typeof error === "string") {
          errorMessage = error
        } else if (error && typeof error === "object") {
          if (error.message) {
            errorMessage = error.message
          } else if (error.error) {
            errorMessage = error.error
          } else if (error.description) {
            errorMessage = error.description
          } else if (Object.keys(error).length > 0) {
            errorMessage = JSON.stringify(error)
          } else {
            errorMessage = "Empty error object received from server"
          }
        }
      } catch (parseErr) {
        console.error("❌ Error parsing error message:", parseErr)
        errorMessage = "Error parsing server error"
      }

      toast({
        title: "Socket Error",
        description: errorMessage,
        variant: "destructive",
      })
    })

    return () => {
      console.log("🧹 Cleaning up live poll socket listeners")
      socket.off("students-list")
      socket.off("student-joined")
      socket.off("answer-submitted")
      socket.off("chat-message")
      socket.off("student-left")
      socket.off("error")
    }
  }, [socket, currentSessionId, toast])

  const refreshParticipants = () => {
    if (socket && currentSessionId) {
      console.log("🔄 Refreshing participants list for session:", currentSessionId)
      socket.emit("get-students", { sessionId: currentSessionId })
    }
  }

  const copySessionId = () => {
    if (currentSessionId) {
      navigator.clipboard.writeText(currentSessionId)
      toast({
        title: "Session ID Copied",
        description: "Students can use this ID to join your poll.",
      })
    }
  }

  const kickOutParticipant = (participantSocketId: string) => {
    if (!socket || !currentSessionId) return

    console.log("🚫 Kicking out participant:", participantSocketId, "from session:", currentSessionId)

    socket.emit("kick-participant", {
      participantId: participantSocketId,
      sessionId: currentSessionId,
    })

    setParticipants(participants.filter((p) => p.socketId !== participantSocketId))
  }

  const sendMessage = () => {
    if (!socket || !newMessage.trim() || !currentSessionId) return

    const messageData = {
      user: "Teacher",
      text: newMessage,
      sessionId: currentSessionId,
      timestamp: new Date().toISOString(),
    }

    console.log("📤 Sending chat message to session:", currentSessionId, messageData)
    socket.emit("chat-message", messageData)

    setChatMessages((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        user: "Teacher",
        message: newMessage,
        timestamp: new Date(),
      },
    ])

    setNewMessage("")
  }

  const endPoll = () => {
    if (socket && currentSessionId) {
      console.log("🛑 Ending poll for session:", currentSessionId)
      socket.emit("end-poll", { sessionId: currentSessionId })
    }
    router.push("/teacher/results")
  }

  if (!pollData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p>Loading poll data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Connection Status */}
        <div className="mb-4 flex items-center justify-between">
          <div
            className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm ${
              isConnected ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${isConnected ? "bg-green-500" : "bg-red-500"}`}></span>
            {isConnected ? "Connected to server" : "Disconnected from server"}
          </div>

          {currentSessionId && (
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Session: {currentSessionId}</span>
              <Button onClick={copySessionId} variant="outline" size="sm" className="h-8">
                <Copy className="w-3 h-3 mr-1" />
                Copy
              </Button>
            </div>
          )}
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Poll Area */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-xl font-semibold bg-gray-800 text-white p-4 rounded-t-lg -m-6 mb-4">
                  Question
                </CardTitle>
                <div className="bg-gray-700 text-white p-3 rounded">{pollData.question}</div>
              </CardHeader>
              <CardContent className="space-y-4">
                {options.map((option, index) => (
                  <div key={option.id} className="flex items-center gap-3 p-3 bg-purple-100 rounded-lg">
                    <div className="w-8 h-8 rounded-full bg-purple-600 text-white flex items-center justify-center font-medium">
                      {String.fromCharCode(65 + index)}
                    </div>
                    <span className="flex-1 font-medium">{option.text}</span>
                    <Badge variant="secondary">{option.votes} votes</Badge>
                  </div>
                ))}

                <div className="pt-4">
                  <Button
                    onClick={endPoll}
                    className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-full"
                  >
                    + Ask a new question
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            <Tabs defaultValue="participants" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="participants" className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Participants ({participants.length})
                </TabsTrigger>
                <TabsTrigger value="chat" className="flex items-center gap-2">
                  <MessageCircle className="w-4 h-4" />
                  Chat
                </TabsTrigger>
              </TabsList>

              <TabsContent value="participants">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-medium">Participants ({participants.length})</CardTitle>
                      <Button onClick={refreshParticipants} variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <RefreshCw className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[400px]">
                      <div className="space-y-2">
                        {participants.map((participant) => (
                          <div
                            key={participant.socketId}
                            className="flex items-center justify-between p-2 hover:bg-gray-50 rounded"
                          >
                            <div className="flex items-center gap-2">
                              <div
                                className={`w-2 h-2 rounded-full ${participant.hasVoted ? "bg-green-500" : "bg-gray-300"}`}
                              />
                              <span className="text-sm">{participant.name}</span>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => kickOutParticipant(participant.socketId)}
                              className="text-blue-600 hover:text-blue-800 text-xs"
                            >
                              kick out
                            </Button>
                          </div>
                        ))}
                        {participants.length === 0 && (
                          <div className="text-center py-8">
                            <p className="text-gray-500 text-sm mb-2">No participants yet</p>
                            <p className="text-xs text-gray-400">
                              Share session ID: <span className="font-mono font-semibold">{currentSessionId}</span>
                            </p>
                          </div>
                        )}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="chat">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-medium">Chat</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <ScrollArea className="h-[300px] p-4">
                      <div className="space-y-3">
                        {chatMessages.map((message) => (
                          <div key={message.id} className="text-sm">
                            <div className="font-medium text-purple-600">{message.user}</div>
                            <div className="text-gray-700">{message.message}</div>
                          </div>
                        ))}
                        {chatMessages.length === 0 && (
                          <p className="text-gray-500 text-sm text-center py-4">No messages yet</p>
                        )}
                      </div>
                    </ScrollArea>
                    <div className="p-4 border-t flex gap-2">
                      <Input
                        placeholder="Type a message..."
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyPress={(e) => e.key === "Enter" && sendMessage()}
                        className="flex-1"
                        disabled={!isConnected}
                      />
                      <Button onClick={sendMessage} size="sm" disabled={!isConnected}>
                        <Send className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>

      {/* Floating Chat Button */}
      <Button
        onClick={() => setShowChat(!showChat)}
        className="fixed bottom-6 right-6 rounded-full w-14 h-14 bg-purple-600 hover:bg-purple-700 shadow-lg"
      >
        <MessageCircle className="w-6 h-6" />
      </Button>
    </div>
  )
}
