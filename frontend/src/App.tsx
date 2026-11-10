import React, { useState, useRef, useEffect } from 'react'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

function App() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Desplazar automáticamente hacia el último mensaje
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, isLoading])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return

    const userMessage: Message = { role: 'user', content: input.trim() }
    const updatedMessages = [...messages, userMessage]

    setMessages(updatedMessages)
    setInput('')
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('http://127.0.0.1:8000/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ messages: updatedMessages }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => null)
        throw new Error(
          errorData?.detail || `Error en el servidor (${response.status})`
        )
      }

      const data = await response.json()
      const assistantMessage: Message = {
        role: 'assistant',
        content: data.response,
      }

      setMessages((prev) => [...prev, assistantMessage])
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : 'Error al conectar con el servidor'
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div style={styles.container}>
      {/* Encabezado */}
      <header style={styles.header}>
        <div style={styles.avatar}>🤖</div>
        <div>
          <h2 style={styles.headerTitle}>Asistente IA</h2>
          <span style={styles.headerStatus}>
            <span style={styles.statusDot}></span> En línea
          </span>
        </div>
      </header>

      {/* Historial de mensajes */}
      <main style={styles.chatArea}>
        {messages.length === 0 ? (
          <div style={styles.emptyState}>
            <p style={{ fontSize: '36px', margin: '0 0 10px' }}>💬</p>
            <h3 style={{ margin: '0 0 6px', color: '#334155' }}>
              ¡Hola! ¿En qué puedo ayudarte hoy?
            </h3>
            <p style={{ margin: 0, color: '#94a3b8', fontSize: '14px' }}>
              Escribe un mensaje en la barra inferior para comenzar la conversación.
            </p>
          </div>
        ) : (
          messages.map((msg, index) => {
            const isUser = msg.role === 'user'
            return (
              <div
                key={index}
                style={{
                  ...styles.messageWrapper,
                  justifyContent: isUser ? 'flex-end' : 'flex-start',
                }}
              >
                <div
                  style={{
                    ...styles.messageBubble,
                    ...(isUser ? styles.userBubble : styles.assistantBubble),
                  }}
                >
                  <div style={styles.senderLabel}>
                    {isUser ? 'Tú' : 'Asistente'}
                  </div>
                  <div style={styles.messageText}>{msg.content}</div>
                </div>
              </div>
            )
          })
        )}

        {/* Indicador de carga */}
        {isLoading && (
          <div
            style={{
              ...styles.messageWrapper,
              justifyContent: 'flex-start',
            }}
          >
            <div style={{ ...styles.messageBubble, ...styles.assistantBubble }}>
              <div style={styles.senderLabel}>Asistente</div>
              <div style={styles.typingIndicator}>
                <span style={styles.typingDot}></span>
                <span style={{ ...styles.typingDot, animationDelay: '0.2s' }}></span>
                <span style={{ ...styles.typingDot, animationDelay: '0.4s' }}></span>
                <span style={{ marginLeft: '8px', fontStyle: 'italic', color: '#64748b' }}>
                  Escribiendo...
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Mensaje de error si falla la llamada */}
        {error && (
          <div style={styles.errorBanner}>
            ⚠️ {error}
          </div>
        )}

        <div ref={messagesEndRef} />
      </main>

      {/* Formulario de entrada */}
      <footer style={styles.footer}>
        <form onSubmit={handleSubmit} style={styles.form}>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Escribe tu mensaje aquí..."
            disabled={isLoading}
            style={styles.input}
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            style={{
              ...styles.button,
              opacity: isLoading || !input.trim() ? 0.6 : 1,
              cursor: isLoading || !input.trim() ? 'not-allowed' : 'pointer',
            }}
          >
            Enviar
          </button>
        </form>
      </footer>
    </div>
  )
}

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    width: '100%',
    maxWidth: '900px',
    margin: '0 auto',
    backgroundColor: '#ffffff',
    textAlign: 'left',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '16px 24px',
    backgroundColor: '#ffffff',
    borderBottom: '1px solid #e2e8f0',
  },
  avatar: {
    width: '42px',
    height: '42px',
    borderRadius: '50%',
    backgroundColor: '#eff6ff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '22px',
    border: '1px solid #bfdbfe',
  },
  headerTitle: {
    margin: 0,
    fontSize: '18px',
    fontWeight: 600,
    color: '#0f172a',
  },
  headerStatus: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '12px',
    color: '#16a34a',
    fontWeight: 500,
  },
  statusDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    backgroundColor: '#22c55e',
  },
  chatArea: {
    flex: 1,
    overflowY: 'auto',
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
    backgroundColor: '#f8fafc',
  },
  emptyState: {
    margin: 'auto',
    textAlign: 'center',
    padding: '40px 20px',
  },
  messageWrapper: {
    display: 'flex',
    width: '100%',
  },
  messageBubble: {
    maxWidth: '72%',
    padding: '12px 16px',
    borderRadius: '16px',
    wordBreak: 'break-word',
    fontSize: '15px',
    lineHeight: '1.5',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
  },
  userBubble: {
    backgroundColor: '#2563eb',
    color: '#ffffff',
    borderBottomRightRadius: '4px',
  },
  assistantBubble: {
    backgroundColor: '#ffffff',
    color: '#1e293b',
    borderBottomLeftRadius: '4px',
    border: '1px solid #e2e8f0',
  },
  senderLabel: {
    fontSize: '11px',
    fontWeight: 600,
    marginBottom: '4px',
    opacity: 0.8,
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  messageText: {
    whiteSpace: 'pre-wrap',
  },
  typingIndicator: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    padding: '4px 0',
  },
  typingDot: {
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    backgroundColor: '#94a3b8',
  },
  errorBanner: {
    padding: '10px 16px',
    backgroundColor: '#fef2f2',
    color: '#b91c1c',
    borderRadius: '8px',
    border: '1px solid #fecaca',
    fontSize: '14px',
    textAlign: 'center',
  },
  footer: {
    padding: '16px 24px',
    backgroundColor: '#ffffff',
    borderTop: '1px solid #e2e8f0',
  },
  form: {
    display: 'flex',
    gap: '12px',
  },
  input: {
    flex: 1,
    padding: '12px 18px',
    fontSize: '15px',
    borderRadius: '24px',
    border: '1px solid #cbd5e1',
    outline: 'none',
    backgroundColor: '#f8fafc',
    color: '#0f172a',
    transition: 'border-color 0.2s',
  },
  button: {
    padding: '12px 24px',
    fontSize: '15px',
    fontWeight: 600,
    backgroundColor: '#2563eb',
    color: '#ffffff',
    border: 'none',
    borderRadius: '24px',
    transition: 'background-color 0.2s, opacity 0.2s',
  },
}

export default App
