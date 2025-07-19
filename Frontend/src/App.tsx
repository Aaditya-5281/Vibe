import { useEffect, useRef, useState } from 'react'
import { Send, Users, Wifi, WifiOff } from 'lucide-react'

function App() {

  type Sender = "me" | "system" | string // string for User 1, User 2, etc.

  type Message = {
    id: number;
    text: string;
    sender: Sender;
    timestamp: Date;
  };

  const [messages, setMessages] = useState<Message[]>([
    { id: 1, text: "Hello from server!", sender: "system", timestamp: new Date() }
  ])
  const [inputValue, setInputValue] = useState("")
  const [isConnected, setIsConnected] = useState(false)
  const [isConnecting, setIsConnecting] = useState(true)
  const [username, setUsername] = useState("")

  const wsRef = useRef<WebSocket | null>(null)
  const messagesEndRef = useRef<HTMLDivElement | null>(null)
  const messageIdRef = useRef(2)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    setIsConnecting(true)
    const ws = new WebSocket("ws://localhost:8080")

    ws.onopen = () => {
      setIsConnected(true)
      setIsConnecting(false)

      ws.send(JSON.stringify({
        type: "join",
        payload: {
          roomId: "red"
        }
      }))
    }

    ws.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data)

        if (parsed.type === "assign_username") {
          setUsername(parsed.payload.username)
          return
        }

        if (parsed.type === "chat") {
          const isFromMe = parsed.payload.username === username

          if (isFromMe) return // Skip echo

          const newMessage = {
            id: messageIdRef.current++,
            text: parsed.payload.message,
            sender: parsed.payload.username,
            timestamp: new Date()
          }
          setMessages(m => [...m, newMessage])
        }
      } catch {
        // Fallback for raw system message (optional)
        const newMessage = {
          id: messageIdRef.current++,
          text: event.data,
          sender: "system",
          timestamp: new Date()
        }
        setMessages(m => [...m, newMessage])
      }
    }

    ws.onerror = () => {
      setIsConnected(false)
      setIsConnecting(false)
    }

    ws.onclose = () => {
      setIsConnected(false)
      setIsConnecting(false)
    }

    wsRef.current = ws

    return () => {
      ws.close()
    }
  }, [])

  const sendMessage = () => {
    if (!inputValue.trim() || !isConnected) return

    const newMessage = {
      id: messageIdRef.current++,
      text: inputValue,
      sender: "me",
      timestamp: new Date()
    }
    setMessages(m => [...m, newMessage])

    wsRef.current?.send(JSON.stringify({
      type: "chat",
      payload: {
        message: inputValue,
        username
      }
    }))

    setInputValue("")
  }

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const formatTime = (timestamp: Date) => {
    return timestamp.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    })
  }

  const getConnectionStatus = () => {
    if (isConnecting) return { text: "Connecting...", color: "text-yellow-400", icon: Wifi }
    if (isConnected) return { text: "Connected", color: "text-green-400", icon: Wifi }
    return { text: "Disconnected", color: "text-red-400", icon: WifiOff }
  }

  const connectionStatus = getConnectionStatus()
  const ConnectionIcon = connectionStatus.icon

  return (
    <div className='h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex flex-col'>
      <div className='bg-black/20 backdrop-blur-sm border-b border-white/10 p-4'>
        <div className='flex items-center justify-between'>
          <div className='flex items-center gap-3'>
            <div className='w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center'>
              <Users className='w-5 h-5 text-white' />
            </div>
            <div>
              <h1 className='text-white font-semibold text-lg'>Chat Room</h1>
              <p className='text-gray-300 text-sm'>Room: red</p>
            </div>
          </div>
          <div className={`flex items-center gap-2 ${connectionStatus.color}`}>
            <ConnectionIcon className='w-4 h-4' />
            <span className='text-sm font-medium'>{connectionStatus.text}</span>
          </div>
        </div>
      </div>

      <div className='flex-1 overflow-y-auto p-4 space-y-4'>
        {messages.map(message => (
          <div
            key={message.id}
            className={`flex ${message.sender === 'me' ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-2xl ${
              message.sender === 'me'
                ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
                : message.sender === 'system'
                ? 'bg-yellow-500/20 text-yellow-200 border border-yellow-500/30'
                : 'bg-white/10 text-white border border-white/20'
            }`}>
              <p className='text-sm leading-relaxed'>{message.text}</p>
              <div className='flex justify-between mt-1 text-xs'>
                <span className={`font-medium ${
                  message.sender === 'me'
                    ? 'text-purple-100'
                    : message.sender === 'system'
                    ? 'text-yellow-300'
                    : 'text-blue-300'
                }`}>
                  {message.sender === 'me' ? 'You' : message.sender}
                </span>
                <span className='text-gray-400'>{formatTime(message.timestamp)}</span>
              </div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className='bg-black/20 backdrop-blur-sm border-t border-white/10 p-4'>
        <div className='flex gap-3'>
          <div className='flex-1 relative'>
            <textarea
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={isConnected ? "Type your message..." : "Connecting..."}
              className='w-full bg-white/10 border border-white/20 rounded-2xl px-4 py-3 pr-12 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none backdrop-blur-sm'
              rows={1}
              disabled={!isConnected}
              style={{
                minHeight: '48px',
                maxHeight: '120px'
              }}
            />
          </div>
          <button
            onClick={sendMessage}
            disabled={!inputValue.trim() || !isConnected}
            className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200 ${
              inputValue.trim() && isConnected
                ? 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white shadow-lg hover:shadow-purple-500/25'
                : 'bg-gray-600 text-gray-400 cursor-not-allowed'
            }`}
          >
            <Send className='w-5 h-5' />
          </button>
        </div>
        {!isConnected && !isConnecting && (
          <p className='text-red-400 text-sm mt-2 text-center'>
            Connection lost. Please refresh the page to reconnect.
          </p>
        )}
      </div>
    </div>
  )
}

export default App
