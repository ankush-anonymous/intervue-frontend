"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Eye } from "lucide-react"
import { useRouter } from "next/navigation"

interface Option {
  id: string
  text: string
  isCorrect: boolean
  votes: number
  percentage: number
}

export default function ResultsPage() {
  const [pollData, setPollData] = useState<any>(null)
  const [results, setResults] = useState<Option[]>([])
  const router = useRouter()

  useEffect(() => {
    const stored = localStorage.getItem("currentPoll")
    if (stored) {
      const data = JSON.parse(stored)
      setPollData(data)

      // Simulate results
      const totalVotes = 100
      const mockResults = [
        { ...data.options[0], votes: 75, percentage: 75 },
        { ...data.options[1], votes: 5, percentage: 5 },
        { ...data.options[2], votes: 5, percentage: 5 },
        { ...data.options[3], votes: 15, percentage: 15 },
      ]
      setResults(mockResults)
    }
  }, [])

  const askNewQuestion = () => {
    router.push("/teacher")
  }

  if (!pollData) {
    return <div>Loading...</div>
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Poll Results</h1>
          <Button variant="outline" className="flex items-center gap-2">
            <Eye className="w-4 h-4" />
            View Poll History
          </Button>
        </div>

        {/* Results Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl font-semibold bg-gray-800 text-white p-4 rounded-t-lg -m-6 mb-4">
              Question
            </CardTitle>
            <div className="bg-gray-700 text-white p-3 rounded">{pollData.question}</div>
          </CardHeader>
          <CardContent className="space-y-6">
            {results.map((option, index) => (
              <div key={option.id} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-purple-600 text-white flex items-center justify-center font-medium">
                      {String.fromCharCode(65 + index)}
                    </div>
                    <span className="font-medium">{option.text}</span>
                  </div>
                  <span className="font-bold text-lg">{option.percentage}%</span>
                </div>
                <Progress value={option.percentage} className="h-3" />
              </div>
            ))}

            <div className="pt-6 text-center">
              <Button
                onClick={askNewQuestion}
                className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-full"
              >
                + Ask a new question
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
