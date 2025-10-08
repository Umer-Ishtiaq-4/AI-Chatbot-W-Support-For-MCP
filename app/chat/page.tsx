'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import GA4ConnectionCard from '@/components/GA4ConnectionCard'
import GSCConnectionCard from '@/components/GSCConnectionCard'

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
  const [ga4Connected, setGa4Connected] = useState(false)
  const [gscConnected, setGscConnected] = useState(false)
  const [connectingGA4, setConnectingGA4] = useState(false)
  const [connectingGSC, setConnectingGSC] = useState(false)
  const [showConnectionsMenu, setShowConnectionsMenu] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const searchParams = useSearchParams()

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

  // Listen for OAuth messages from popup
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Verify the message is from our OAuth callback
      if (event.data.type === 'oauth_success') {
        const { service } = event.data
        const successMessages: Message[] = []
        
        if (service === 'ga4' || service === 'both') {
          setGa4Connected(true)
          localStorage.setItem('ga4_connected', 'true')
          successMessages.push({
            id: `ga4-connected-${Date.now()}`,
            role: 'assistant',
            content: '✅ Successfully connected to Google Analytics 4! You can now ask questions about your analytics data.',
            created_at: new Date().toISOString()
          })
        }
        
        if (service === 'gsc' || service === 'both') {
          setGscConnected(true)
          localStorage.setItem('gsc_connected', 'true')
          successMessages.push({
            id: `gsc-connected-${Date.now()}`,
            role: 'assistant',
            content: '✅ Successfully connected to Google Search Console! You can now ask questions about your search performance data.',
            created_at: new Date().toISOString()
          })
        }
        
        if (successMessages.length > 0) {
          setMessages(prev => [...prev, ...successMessages])
        }
        
        setConnectingGA4(false)
        setConnectingGSC(false)
      }
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [])

  // Check for existing connections on mount
  useEffect(() => {
    const ga4IsConnected = localStorage.getItem('ga4_connected') === 'true'
    const gscIsConnected = localStorage.getItem('gsc_connected') === 'true'
    
    if (ga4IsConnected) {
      setGa4Connected(true)
    }
    if (gscIsConnected) {
      setGscConnected(true)
    }
  }, [])

  // Close connections menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (showConnectionsMenu && !target.closest('.connections-menu-container')) {
        setShowConnectionsMenu(false)
      }
    }

    if (showConnectionsMenu) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showConnectionsMenu])

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
        body: JSON.stringify({ 
          message: userMessage, 
          userId,
          ga4Connected,
          gscConnected
        }),
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

  const connectGA4 = async () => {
    try {
      setConnectingGA4(true)
      
      // Get current session
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        alert('Please log in first')
        return
      }

      // Get OAuth URL from our API with GA4 service
      const response = await fetch('/api/auth/google?service=ga4', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })

      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to get auth URL')
      }

      // Open OAuth popup
      const width = 500
      const height = 600
      const left = window.screenX + (window.outerWidth - width) / 2
      const top = window.screenY + (window.outerHeight - height) / 2
      
      window.open(
        data.authUrl,
        'ga4_oauth',
        `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no`
      )
    } catch (error: any) {
      alert('Error connecting to GA4: ' + error.message)
    } finally {
      setConnectingGA4(false)
    }
  }

  const connectGSC = async () => {
    try {
      setConnectingGSC(true)
      
      // Get current session
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        alert('Please log in first')
        return
      }

      // Get OAuth URL from our API with GSC service
      const response = await fetch('/api/auth/google?service=gsc', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })

      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to get auth URL')
      }

      // Open OAuth popup
      const width = 500
      const height = 600
      const left = window.screenX + (window.outerWidth - width) / 2
      const top = window.screenY + (window.outerHeight - height) / 2
      
      window.open(
        data.authUrl,
        'gsc_oauth',
        `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no`
      )
    } catch (error: any) {
      alert('Error connecting to GSC: ' + error.message)
    } finally {
      setConnectingGSC(false)
    }
  }

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
      {/* Centered Container - 80% width on desktop */}
      <div className="flex flex-col h-screen max-w-[80%] mx-auto w-full shadow-2xl bg-white/50 backdrop-blur-sm">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 shadow-lg px-8 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
              <span className="text-2xl">🤖</span>
            </div>
            <h1 className="text-2xl font-bold text-white">AI Chatbot</h1>
            
            {/* Connection Status Indicators */}
            <div className="flex items-center space-x-2 ml-6">
              <div className={`flex items-center px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                ga4Connected 
                  ? 'bg-green-500/20 text-green-100 border border-green-400/30' 
                  : 'bg-white/10 text-white/60 border border-white/20'
              }`}>
                <div className={`w-2 h-2 rounded-full mr-2 ${ga4Connected ? 'bg-green-400 animate-pulse' : 'bg-white/40'}`}></div>
                GA4
              </div>
              <div className={`flex items-center px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                gscConnected 
                  ? 'bg-green-500/20 text-green-100 border border-green-400/30' 
                  : 'bg-white/10 text-white/60 border border-white/20'
              }`}>
                <div className={`w-2 h-2 rounded-full mr-2 ${gscConnected ? 'bg-green-400 animate-pulse' : 'bg-white/40'}`}></div>
                GSC
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            {/* Connections Menu */}
            <div className="relative connections-menu-container">
              <button
                onClick={() => setShowConnectionsMenu(!showConnectionsMenu)}
                className="px-4 py-2 text-sm font-medium text-white bg-white/20 hover:bg-white/30 rounded-lg transition-all duration-200 backdrop-blur-sm flex items-center space-x-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <span>Connections</span>
              </button>
              
              {/* Dropdown Menu */}
              {showConnectionsMenu && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-xl border border-gray-200 z-50 overflow-hidden">
                  <div className="p-4 bg-gradient-to-r from-indigo-50 to-purple-50 border-b border-gray-200">
                    <h3 className="font-semibold text-gray-800">Service Connections</h3>
                    <p className="text-xs text-gray-600 mt-1">Connect to Google services</p>
                  </div>
                  
                  <div className="p-3 space-y-2">
                    {/* GA4 Connection */}
                    <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-all">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                          <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M22.2 12.04c0-.82-.07-1.61-.2-2.37H12v4.48h5.71c-.25 1.32-1 2.44-2.12 3.19v2.65h3.43c2.01-1.85 3.18-4.58 3.18-7.95z"/>
                          </svg>
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-gray-800 text-sm">Google Analytics 4</p>
                          <p className="text-xs text-gray-500">{ga4Connected ? 'Connected' : 'Not connected'}</p>
                        </div>
                      </div>
                      {ga4Connected ? (
                        <div className="flex items-center text-green-600 text-xs font-medium">
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          Connected
                        </div>
                      ) : (
                        <button
                          onClick={() => { setShowConnectionsMenu(false); connectGA4(); }}
                          disabled={connectingGA4}
                          className="px-3 py-1.5 bg-gradient-to-r from-blue-500 to-indigo-600 text-white text-xs font-medium rounded hover:shadow-md transition-all disabled:opacity-50"
                        >
                          {connectingGA4 ? 'Connecting...' : 'Connect'}
                        </button>
                      )}
                    </div>

                    {/* GSC Connection */}
                    <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-all">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center">
                          <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 0C5.372 0 0 5.373 0 12s5.372 12 12 12c6.627 0 12-5.373 12-12S18.627 0 12 0zm.75 19h-1.5v-6h1.5v6zm0-8h-1.5V5h1.5v6z"/>
                          </svg>
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-gray-800 text-sm">Search Console</p>
                          <p className="text-xs text-gray-500">{gscConnected ? 'Connected' : 'Not connected'}</p>
                        </div>
                      </div>
                      {gscConnected ? (
                        <div className="flex items-center text-green-600 text-xs font-medium">
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          Connected
                        </div>
                      ) : (
                        <button
                          onClick={() => { setShowConnectionsMenu(false); connectGSC(); }}
                          disabled={connectingGSC}
                          className="px-3 py-1.5 bg-gradient-to-r from-green-500 to-emerald-600 text-white text-xs font-medium rounded hover:shadow-md transition-all disabled:opacity-50"
                        >
                          {connectingGSC ? 'Connecting...' : 'Connect'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            <button
              onClick={clearChat}
              className="px-4 py-2 text-sm font-medium text-white bg-white/20 hover:bg-white/30 rounded-lg transition-all duration-200 backdrop-blur-sm"
            >
              🗑️ Clear
            </button>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-white/90 text-indigo-600 font-medium rounded-lg hover:bg-white transition-all duration-200 text-sm shadow-lg"
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

