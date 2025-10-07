'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  created_at: string
}

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      console.log("session", session)
      if (!session) {
        router.push('/login')
      } else {
        setUserId(session.user.id)
        loadMessages(session.user.id)
      }
    }
    checkUser()
  }, [router])

  const loadMessages = async (uid: string) => {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('user_id', uid)
      .order('created_at', { ascending: true })

    if (!error && data) {
      setMessages(data)
    }
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || !userId || loading) return

    const userMessage = input.trim()
    setInput('')
    setLoading(true)

    try {
      // Save user message
      const { data: userMsg, error: userError } = await supabase
        .from('messages')
        .insert({
          user_id: userId,
          role: 'user',
          content: userMessage,
        })
        .select()
        .single()

      if (userError) throw userError

      setMessages(prev => [...prev, userMsg])

      // Get AI response
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage, userId }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to get response')
      }

      // Save assistant message
      const { data: assistantMsg, error: assistantError } = await supabase
        .from('messages')
        .insert({
          user_id: userId,
          role: 'assistant',
          content: data.response,
        })
        .select()
        .single()

      if (assistantError) throw assistantError

      setMessages(prev => [...prev, assistantMsg])
    } catch (error: any) {
      alert('Error: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const clearChat = async () => {
    if (!userId) return
    if (!confirm('Are you sure you want to clear all messages?')) return

    const { error } = await supabase
      .from('messages')
      .delete()
      .eq('user_id', userId)

    if (!error) {
      setMessages([])
    }
  }

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
      {/* Centered Container - 80% width on desktop */}
      <div className="flex flex-col h-screen max-w-[80%] mx-auto w-full shadow-2xl bg-white/50 backdrop-blur-sm">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 shadow-lg px-8 py-5 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
              <span className="text-2xl">🤖</span>
            </div>
            <h1 className="text-2xl font-bold text-white">AI Chatbot</h1>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={clearChat}
              className="px-5 py-2.5 text-sm font-medium text-white bg-white/20 hover:bg-white/30 rounded-lg transition-all duration-200 backdrop-blur-sm"
            >
              🗑️ Clear Chat
            </button>
            <button
              onClick={handleLogout}
              className="px-5 py-2.5 bg-white/90 text-indigo-600 font-medium rounded-lg hover:bg-white transition-all duration-200 text-sm shadow-lg"
            >
              Logout
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-8 py-6 space-y-6 bg-gradient-to-b from-gray-50/50 to-white/50">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="bg-gradient-to-br from-indigo-100 to-purple-100 p-8 rounded-3xl shadow-lg">
                <div className="text-6xl mb-4">💬</div>
                <p className="text-2xl font-semibold text-gray-700 mb-2">Start a conversation!</p>
                <p className="text-gray-500">Ask me anything and I'll help you out</p>
              </div>
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} animate-fadeIn`}
              >
                <div
                  className={`max-w-[75%] px-5 py-3 rounded-2xl shadow-md ${
                    message.role === 'user'
                      ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-br-md'
                      : 'bg-white text-gray-800 border border-gray-100 rounded-bl-md'
                  }`}
                >
                  {message.role === 'assistant' && (
                    <div className="text-xs font-semibold text-indigo-600 mb-1 flex items-center">
                      <span className="mr-1">🤖</span> AI Assistant
                    </div>
                  )}
                  <p className="whitespace-pre-wrap break-words leading-relaxed">{message.content}</p>
                </div>
              </div>
            ))
          )}
          {loading && (
            <div className="flex justify-start animate-fadeIn">
              <div className="bg-white text-gray-800 shadow-md border border-gray-100 max-w-[75%] px-5 py-3 rounded-2xl rounded-bl-md">
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-semibold text-indigo-600">🤖 AI is typing</span>
                  <div className="flex space-x-1 ml-2">
                    <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-pink-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="bg-white/80 backdrop-blur-sm border-t border-gray-200 px-8 py-6">
          <form onSubmit={handleSend} className="flex space-x-3">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={loading}
              placeholder="Type your message..."
              className="flex-1 px-5 py-3.5 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 disabled:opacity-50 disabled:bg-gray-50 transition-all duration-200 text-gray-800"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="px-8 py-3.5 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold rounded-xl hover:from-indigo-600 hover:to-purple-700 focus:outline-none focus:ring-4 focus:ring-indigo-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              Send ✨
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

