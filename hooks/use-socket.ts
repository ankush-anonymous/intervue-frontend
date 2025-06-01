"use client"

import { useEffect, useState } from "react"
import { io, type Socket } from "socket.io-client"

interface UseSocketReturn {
  socket: Socket | null
  isConnected: boolean
  sessionId: string | null
  connectSocket: () => void
  disconnectSocket: () => void
  createSession: () => string
  joinSession: (sessionId: string, name: string) => void
}

export function useSocket(): UseSocketReturn {
  const [socket, setSocket] = useState<Socket | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)

  const connectSocket = () => {
    if (socket) {
      console.log("⚠️ Socket already exists, skipping connection")
      return
    }

    console.log("🔌 Initializing Socket.IO connection to localhost:5000")

    const socketInstance = io("http://localhost:5000", {
      transports: ["websocket", "polling"],
      timeout: 20000,
    })

    socketInstance.on("connect", () => {
      console.log("✅ Connected to server with socket ID:", socketInstance.id)
      setIsConnected(true)

      // Check if we have a stored session ID
      const storedSessionId = localStorage.getItem("currentSessionId")
      if (storedSessionId) {
        console.log("📋 Found stored session ID:", storedSessionId)
        setSessionId(storedSessionId)
      }
    })

    socketInstance.on("disconnect", (reason) => {
      console.log("❌ Disconnected from server. Reason:", reason)
      setIsConnected(false)
    })

    socketInstance.on("connect_error", (error) => {
      console.error("🔴 Connection error:", error)
      setIsConnected(false)
    })

    socketInstance.on("reconnect", (attemptNumber) => {
      console.log("🔄 Reconnected to server after", attemptNumber, "attempts")
      setIsConnected(true)
    })

    socketInstance.on("reconnect_error", (error) => {
      console.error("🔴 Reconnection error:", error)
    })

    // Listen for session events
    socketInstance.on("session-created", (data) => {
      console.log("🎯 Session created:", data.sessionId)
      setSessionId(data.sessionId)
      localStorage.setItem("currentSessionId", data.sessionId)
    })

    socketInstance.on("join-success", (data) => {
      console.log("🚪 Successfully joined session:", data.sessionId)
      setSessionId(data.sessionId)
      localStorage.setItem("currentSessionId", data.sessionId)
    })

    socketInstance.on("join-error", (data) => {
      console.error("❌ Failed to join session:", data.message)
    })

    setSocket(socketInstance)
  }

  const disconnectSocket = () => {
    if (socket) {
      console.log("🔌 Disconnecting socket")
      socket.disconnect()
      setSocket(null)
      setIsConnected(false)
    }
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (socket) {
        console.log("🧹 Cleaning up socket connection on unmount")
        socket.disconnect()
      }
    }
  }, [socket])

  const createSession = (): string => {
    if (!socket) {
      console.error("❌ Cannot create session: Socket not connected")
      return ""
    }

    // Check if we already have a session ID stored
    const existingSessionId = localStorage.getItem("currentSessionId")
    if (existingSessionId) {
      console.log("📋 Using existing session ID:", existingSessionId)
      setSessionId(existingSessionId)
      return existingSessionId
    }

    // Generate a random 6-character session ID
    const newSessionId = Math.random().toString(36).substring(2, 8).toUpperCase()
    console.log("🎯 Creating new session:", newSessionId)

    socket.emit("create-session", { sessionId: newSessionId })
    setSessionId(newSessionId)
    localStorage.setItem("currentSessionId", newSessionId)

    return newSessionId
  }

  const joinSession = (targetSessionId: string, name: string) => {
    if (!socket) {
      console.error("❌ Cannot join session: Socket not connected")
      return
    }

    // Format session ID (uppercase, trim whitespace)
    const formattedSessionId = targetSessionId.trim().toUpperCase()

    console.log("🚪 Student joining session:", formattedSessionId, "with name:", name)

    // Use the correct event name that the backend expects
    socket.emit("join-student", {
      sessionId: formattedSessionId,
      name: name,
      socketId: socket.id,
    })
  }

  return { socket, isConnected, sessionId, connectSocket, disconnectSocket, createSession, joinSession }
}
