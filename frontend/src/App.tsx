import React, { useState, useRef, useEffect } from 'react'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

function App() {
  // Estado de autenticación
  const [token, setToken] = useState<string | null>(() =>
    localStorage.getItem('token')
  )
  const [isRegistering, setIsRegistering] = useState<boolean>(false)
  const [authEmail, setAuthEmail] = useState('')
  const [authPassword, setAuthPassword] = useState('')
  const [authError, setAuthError] = useState<string | null>(null)
  const [authSuccess, setAuthSuccess] = useState<string | null>(null)
  const [authLoading, setAuthLoading] = useState(false)

  // Estado del chat
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    if (token) {
      scrollToBottom()
    }
  }, [messages, isLoading, token])

  // Manejar Login / Registro
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setAuthError(null)
    setAuthSuccess(null)
    setAuthLoading(true)

    if (isRegistering) {
      // Flujo de Registro (JSON)
      try {
        const response = await fetch('http://127.0.0.1:8000/api/register', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: authEmail,
            password: authPassword,
          }),
        })

        const data = await response.json()
        if (!response.ok) {
          throw new Error(data.detail || 'Error al registrar el usuario')
        }

        // Registro exitoso: cambiar a modo Login y mostrar mensaje
        setIsRegistering(false)
        setAuthPassword('')
        setAuthSuccess(
          '¡Registro exitoso! Ya puedes iniciar sesión con tu contraseña.'
        )
      } catch (err: unknown) {
        setAuthError(
          err instanceof Error ? err.message : 'Error al registrarse'
        )
      } finally {
        setAuthLoading(false)
      }
    } else {
      // Flujo de Inicio de Sesión (x-www-form-urlencoded)
      try {
        const formData = new URLSearchParams()
        formData.append('username', authEmail)
        formData.append('password', authPassword)
        formData.append('grant_type', 'password')

        const response = await fetch('http://127.0.0.1:8000/api/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: formData.toString(),
        })

        const data = await response.json()
        if (!response.ok) {
          throw new Error(data.detail || 'Credenciales inválidas')
        }

        const accessToken = data.access_token
        localStorage.setItem('token', accessToken)
        setToken(accessToken)
        setAuthPassword('')
      } catch (err: unknown) {
        setAuthError(
          err instanceof Error ? err.message : 'Error al iniciar sesión'
        )
      } finally {
        setAuthLoading(false)
      }
    }
  }

  // Cerrar Sesión
  const handleLogout = () => {
    localStorage.removeItem('token')
    setToken(null)
    setMessages([])
    setError(null)
  }

  // Enviar mensaje al chat
  const handleSubmitChat = async (e: React.FormEvent) => {
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
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ messages: updatedMessages }),
      })

      if (!response.ok) {
        if (response.status === 401) {
          handleLogout()
          throw new Error('Sesión expirada. Por favor, inicia sesión nuevamente.')
        }
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

  // ==========================================
  // RENDER: VISTA DE AUTENTICACIÓN (Sin Token)
  // ==========================================
  if (!token) {
    return (
      <div style={styles.authContainer}>
        <div style={styles.authCard}>
          <div style={styles.authIconWrapper}>
            <span style={{ fontSize: '32px' }}>🔒</span>
          </div>

          <h2 style={styles.authTitle}>
            {isRegistering ? 'Crear Cuenta' : 'Iniciar Sesión'}
          </h2>
          <p style={styles.authSubtitle}>
            {isRegistering
              ? 'Regístrate para comenzar a interactuar con el asistente'
              : 'Ingresa tus credenciales para acceder al chat'}
          </p>

          {authSuccess && (
            <div style={styles.successBanner}>
              ✅ {authSuccess}
            </div>
          )}

          {authError && (
            <div style={styles.errorBanner}>
              ⚠️ {authError}
            </div>
          )}

          <form onSubmit={handleAuthSubmit} style={styles.authForm}>
            <div style={styles.fieldGroup}>
              <label style={styles.label}>Correo Electrónico</label>
              <input
                type="email"
                required
                value={authEmail}
                onChange={(e) => setAuthEmail(e.target.value)}
                placeholder="usuario@ejemplo.com"
                style={styles.authInput}
                disabled={authLoading}
              />
            </div>

            <div style={styles.fieldGroup}>
              <label style={styles.label}>Contraseña</label>
              <input
                type="password"
                required
                value={authPassword}
                onChange={(e) => setAuthPassword(e.target.value)}
                placeholder="••••••••"
                style={styles.authInput}
                disabled={authLoading}
              />
            </div>

            <button
              type="submit"
              disabled={authLoading}
              style={{
                ...styles.authButton,
                opacity: authLoading ? 0.7 : 1,
                cursor: authLoading ? 'not-allowed' : 'pointer',
              }}
            >
              {authLoading
                ? 'Procesando...'
                : isRegistering
                ? 'Registrarse'
                : 'Iniciar Sesión'}
            </button>
          </form>

          <div style={styles.toggleWrapper}>
            <span>
              {isRegistering
                ? '¿Ya tienes una cuenta?'
                : '¿No tienes una cuenta?'}
            </span>
            <button
              type="button"
              onClick={() => {
                setIsRegistering(!isRegistering)
                setAuthError(null)
                setAuthSuccess(null)
              }}
              style={styles.toggleButton}
            >
              {isRegistering ? 'Inicia Sesión' : 'Regístrate'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ==========================================
  // RENDER: VISTA DEL CHAT (Con Token)
  // ==========================================
  return (
    <div style={styles.container}>
      {/* Encabezado con Botón de Cerrar Sesión */}
      <header style={styles.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={styles.avatar}>🤖</div>
          <div>
            <h2 style={styles.headerTitle}>Asistente IA</h2>
            <span style={styles.headerStatus}>
              <span style={styles.statusDot}></span> En línea
            </span>
          </div>
        </div>

        <button
          onClick={handleLogout}
          style={styles.logoutButton}
          title="Cerrar Sesión"
        >
          Cerrar Sesión
        </button>
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
                <span
                  style={{
                    marginLeft: '8px',
                    fontStyle: 'italic',
                    color: '#64748b',
                  }}
                >
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
        <form onSubmit={handleSubmitChat} style={styles.form}>
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
  // Contenedor principal de Autenticación
  authContainer: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f1f5f9',
    padding: '20px',
    boxSizing: 'border-box',
    width: '100%',
  },
  authCard: {
    width: '100%',
    maxWidth: '420px',
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    padding: '36px 32px',
    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.08), 0 8px 10px -6px rgba(0, 0, 0, 0.04)',
    textAlign: 'center',
    boxSizing: 'border-box',
  },
  authIconWrapper: {
    width: '64px',
    height: '64px',
    borderRadius: '50%',
    backgroundColor: '#eff6ff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 16px',
    border: '1px solid #dbeafe',
  },
  authTitle: {
    margin: '0 0 8px',
    fontSize: '24px',
    fontWeight: 700,
    color: '#0f172a',
  },
  authSubtitle: {
    margin: '0 0 24px',
    fontSize: '14px',
    color: '#64748b',
    lineHeight: '1.4',
  },
  authForm: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    textAlign: 'left',
  },
  fieldGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  label: {
    fontSize: '13px',
    fontWeight: 600,
    color: '#334155',
  },
  authInput: {
    padding: '12px 14px',
    borderRadius: '8px',
    border: '1px solid #cbd5e1',
    fontSize: '15px',
    outline: 'none',
    boxSizing: 'border-box',
    width: '100%',
    backgroundColor: '#f8fafc',
    transition: 'border-color 0.2s',
  },
  authButton: {
    marginTop: '8px',
    padding: '12px',
    borderRadius: '8px',
    backgroundColor: '#2563eb',
    color: '#ffffff',
    fontSize: '15px',
    fontWeight: 600,
    border: 'none',
    transition: 'background-color 0.2s',
  },
  toggleWrapper: {
    marginTop: '20px',
    fontSize: '14px',
    color: '#64748b',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '6px',
  },
  toggleButton: {
    background: 'none',
    border: 'none',
    color: '#2563eb',
    fontWeight: 600,
    cursor: 'pointer',
    fontSize: '14px',
    padding: 0,
    textDecoration: 'underline',
  },
  successBanner: {
    padding: '10px 14px',
    backgroundColor: '#f0fdf4',
    color: '#15803d',
    borderRadius: '8px',
    border: '1px solid #bbf7d0',
    fontSize: '13px',
    marginBottom: '16px',
    textAlign: 'left',
  },
  errorBanner: {
    padding: '10px 14px',
    backgroundColor: '#fef2f2',
    color: '#b91c1c',
    borderRadius: '8px',
    border: '1px solid #fecaca',
    fontSize: '13px',
    marginBottom: '16px',
    textAlign: 'left',
  },

  // Contenedor principal del Chat
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
    justifyContent: 'space-between',
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
  logoutButton: {
    padding: '8px 16px',
    backgroundColor: '#fee2e2',
    color: '#dc2626',
    border: '1px solid #fecaca',
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'background-color 0.2s',
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
