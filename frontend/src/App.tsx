import React, { useState, useRef, useEffect } from 'react'
import './App.css'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

type TabType = 'chat' | 'trip' | 'recommend'

function App() {
  // Estado de navegación
  const [activeTab, setActiveTab] = useState<TabType>('chat')

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

  // Estado del Agente de Viajes
  const [tripDestination, setTripDestination] = useState('')
  const [tripDays, setTripDays] = useState<number | string>(3)
  const [tripQuery, setTripQuery] = useState<{ destination: string; days: number } | null>(null)
  const [tripResult, setTripResult] = useState<string | null>(null)
  const [tripLoading, setTripLoading] = useState(false)
  const [tripError, setTripError] = useState<string | null>(null)

  // Estado del Agente de Recomendaciones
  const [recCategory, setRecCategory] = useState('')
  const [recQuery, setRecQuery] = useState<string | null>(null)
  const [recResult, setRecResult] = useState<string | null>(null)
  const [recLoading, setRecLoading] = useState(false)
  const [recError, setRecError] = useState<string | null>(null)

  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    if (token && activeTab === 'chat') {
      scrollToBottom()
    }
  }, [messages, isLoading, token, activeTab])

  // Cerrar Sesión
  const handleLogout = () => {
    localStorage.removeItem('token')
    setToken(null)
    setMessages([])
    setError(null)
    setTripResult(null)
    setRecResult(null)
    setActiveTab('chat')
  }

  // Manejar Login / Registro
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setAuthError(null)
    setAuthSuccess(null)
    setAuthLoading(true)

    if (isRegistering) {
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

        setIsRegistering(false)
        setAuthPassword('')
        setAuthSuccess(
          '¡Registro exitoso! Ya puedes iniciar sesión con tu cuenta.'
        )
      } catch (err: unknown) {
        setAuthError(
          err instanceof Error ? err.message : 'Error al registrarse'
        )
      } finally {
        setAuthLoading(false)
      }
    } else {
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

  // Enviar mensaje al Chat
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

  // Enviar formulario al Agente de Viajes
  const handleTripSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!tripDestination.trim() || tripLoading) return

    const parsedDays = Number(tripDays) || 1
    setTripQuery({ destination: tripDestination.trim(), days: parsedDays })
    setTripLoading(true)
    setTripError(null)
    setTripResult(null)

    try {
      const response = await fetch('http://127.0.0.1:8000/api/agent/trip', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          destination: tripDestination.trim(),
          days: parsedDays,
        }),
      })

      if (!response.ok) {
        if (response.status === 401) {
          handleLogout()
          throw new Error('Sesión expirada. Por favor, inicia sesión nuevamente.')
        }
        const errorData = await response.json().catch(() => null)
        throw new Error(
          errorData?.detail || `Error en el agente de viajes (${response.status})`
        )
      }

      const data = await response.json()
      setTripResult(data.itinerary)
    } catch (err: unknown) {
      setTripError(
        err instanceof Error ? err.message : 'Error al planificar el viaje'
      )
    } finally {
      setTripLoading(false)
    }
  }

  // Enviar formulario al Agente de Recomendaciones
  const handleRecommendSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!recCategory.trim() || recLoading) return

    const categoryToSend = recCategory.trim()
    setRecQuery(categoryToSend)
    setRecLoading(true)
    setRecError(null)
    setRecResult(null)

    try {
      const response = await fetch('http://127.0.0.1:8000/api/agent/recommend', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          category: categoryToSend,
        }),
      })

      if (!response.ok) {
        if (response.status === 401) {
          handleLogout()
          throw new Error('Sesión expirada. Por favor, inicia sesión nuevamente.')
        }
        const errorData = await response.json().catch(() => null)
        throw new Error(
          errorData?.detail || `Error en el agente de recomendaciones (${response.status})`
        )
      }

      const data = await response.json()
      setRecResult(data.recommendation)
    } catch (err: unknown) {
      setRecError(
        err instanceof Error ? err.message : 'Error al generar recomendaciones'
      )
    } finally {
      setRecLoading(false)
    }
  }

  // ==========================================
  // VISTA DE AUTENTICACIÓN (Sin Token)
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
              : 'Ingresa tus credenciales para acceder a la plataforma'}
          </p>

          {authSuccess && (
            <div style={styles.successBanner}>✅ {authSuccess}</div>
          )}

          {authError && <div style={styles.errorBanner}>⚠️ {authError}</div>}

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
  // VISTA PRINCIPAL (Con Token)
  // ==========================================
  return (
    <div style={styles.container}>
      {/* Encabezado Superior */}
      <header style={styles.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={styles.avatar}>🤖</div>
          <div>
            <h2 style={styles.headerTitle}>Plataforma de Inteligencia Artificial</h2>
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

      {/* Barra de Navegación de Pestañas */}
      <nav style={styles.navBar}>
        <button
          type="button"
          onClick={() => setActiveTab('chat')}
          style={{
            ...styles.navButton,
            ...(activeTab === 'chat' ? styles.navButtonActive : {}),
          }}
        >
          💬 Chat
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('trip')}
          style={{
            ...styles.navButton,
            ...(activeTab === 'trip' ? styles.navButtonActive : {}),
          }}
        >
          ✈️ Planificar Viaje
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('recommend')}
          style={{
            ...styles.navButton,
            ...(activeTab === 'recommend' ? styles.navButtonActive : {}),
          }}
        >
          ⭐ Recomendar
        </button>
      </nav>

      {/* ===================================== */}
      {/* PESTAÑA 1: CHAT                       */}
      {/* ===================================== */}
      {activeTab === 'chat' && (
        <>
          <main style={styles.chatArea}>
            {messages.length === 0 ? (
              <div style={styles.emptyState}>
                <p style={{ fontSize: '36px', margin: '0 0 10px' }}>💬</p>
                <h3 style={{ margin: '0 0 6px', color: '#334155' }}>
                  ¡Hola! ¿En qué puedo ayudarte hoy?
                </h3>
                <p style={{ margin: 0, color: '#94a3b8', fontSize: '14px' }}>
                  Escribe un mensaje para comenzar la conversación o prueba los agentes en el menú superior.
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

            {error && <div style={styles.errorBanner}>⚠️ {error}</div>}
            <div ref={messagesEndRef} />
          </main>

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
        </>
      )}

      {/* ===================================== */}
      {/* PESTAÑA 2: AGENTE PLANIFICAR VIAJE    */}
      {/* ===================================== */}
      {activeTab === 'trip' && (
        <div style={styles.agentContainer}>
          <div style={styles.agentCard}>
            <div style={styles.agentCardHeader}>
              <span style={{ fontSize: '28px' }}>✈️</span>
              <div>
                <h3 style={styles.agentCardTitle}>Agente de Viajes</h3>
                <p style={styles.agentCardSubtitle}>
                  Diseña itinerarios personalizados utilizando información oficial de la base de datos (RAG).
                </p>
              </div>
            </div>

            <form onSubmit={handleTripSubmit} style={styles.agentForm}>
              <div style={styles.formRow}>
                <div style={{ flex: 2, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={styles.label}>Destino</label>
                  <input
                    type="text"
                    required
                    value={tripDestination}
                    onChange={(e) => setTripDestination(e.target.value)}
                    placeholder="Ej. Quetzaltenango"
                    disabled={tripLoading}
                    style={styles.agentInput}
                  />
                </div>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={styles.label}>Días</label>
                  <input
                    type="number"
                    min="1"
                    max="30"
                    required
                    value={tripDays}
                    onChange={(e) => setTripDays(e.target.value)}
                    disabled={tripLoading}
                    style={styles.agentInput}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={tripLoading || !tripDestination.trim()}
                style={{
                  ...styles.primaryButton,
                  opacity: tripLoading || !tripDestination.trim() ? 0.6 : 1,
                  cursor: tripLoading || !tripDestination.trim() ? 'not-allowed' : 'pointer',
                }}
              >
                {tripLoading ? 'Creando itinerario...' : 'Planificar Itinerario'}
              </button>
            </form>

            {tripError && <div style={{ ...styles.errorBanner, marginTop: '16px' }}>⚠️ {tripError}</div>}
          </div>

          {/* Historial o Resultados del Agente */}
          <div style={styles.agentResultsArea}>
            {tripLoading && (
              <div style={{ ...styles.messageWrapper, justifyContent: 'flex-start' }}>
                <div style={{ ...styles.messageBubble, ...styles.assistantBubble }}>
                  <div style={styles.senderLabel}>Agente de Viajes</div>
                  <div style={styles.typingIndicator}>
                    <span style={styles.typingDot}></span>
                    <span style={{ ...styles.typingDot, animationDelay: '0.2s' }}></span>
                    <span style={{ ...styles.typingDot, animationDelay: '0.4s' }}></span>
                    <span style={{ marginLeft: '8px', fontStyle: 'italic', color: '#64748b' }}>
                      Consultando información y diseñando itinerario...
                    </span>
                  </div>
                </div>
              </div>
            )}

            {tripResult && tripQuery && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {/* Petición del usuario */}
                <div style={{ ...styles.messageWrapper, justifyContent: 'flex-end' }}>
                  <div style={{ ...styles.messageBubble, ...styles.userBubble }}>
                    <div style={styles.senderLabel}>Tú</div>
                    <div style={styles.messageText}>
                      Itinerario para <strong>{tripQuery.destination}</strong> ({tripQuery.days} días)
                    </div>
                  </div>
                </div>

                {/* Respuesta del Agente */}
                <div style={{ ...styles.messageWrapper, justifyContent: 'flex-start' }}>
                  <div style={{ ...styles.messageBubble, ...styles.assistantBubble }}>
                    <div style={styles.senderLabel}>Agente de Viajes</div>
                    <div style={styles.messageText}>{tripResult}</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===================================== */}
      {/* PESTAÑA 3: AGENTE RECOMENDAR           */}
      {/* ===================================== */}
      {activeTab === 'recommend' && (
        <div style={styles.agentContainer}>
          <div style={styles.agentCard}>
            <div style={styles.agentCardHeader}>
              <span style={{ fontSize: '28px' }}>⭐</span>
              <div>
                <h3 style={styles.agentCardTitle}>Agente de Recomendaciones</h3>
                <p style={styles.agentCardSubtitle}>
                  Obtén las 3 mejores opciones según la categoría con justificación basada en datos oficiales.
                </p>
              </div>
            </div>

            <form onSubmit={handleRecommendSubmit} style={styles.agentForm}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={styles.label}>Categoría</label>
                <input
                  type="text"
                  required
                  value={recCategory}
                  onChange={(e) => setRecCategory(e.target.value)}
                  placeholder="Ej. Películas, Turismo, Reglamento..."
                  disabled={recLoading}
                  style={styles.agentInput}
                />
              </div>

              <button
                type="submit"
                disabled={recLoading || !recCategory.trim()}
                style={{
                  ...styles.primaryButton,
                  opacity: recLoading || !recCategory.trim() ? 0.6 : 1,
                  cursor: recLoading || !recCategory.trim() ? 'not-allowed' : 'pointer',
                }}
              >
                {recLoading ? 'Generando recomendaciones...' : 'Obtener Recomendaciones'}
              </button>
            </form>

            {recError && <div style={{ ...styles.errorBanner, marginTop: '16px' }}>⚠️ {recError}</div>}
          </div>

          {/* Resultados del Agente de Recomendaciones */}
          <div style={styles.agentResultsArea}>
            {recLoading && (
              <div style={{ ...styles.messageWrapper, justifyContent: 'flex-start' }}>
                <div style={{ ...styles.messageBubble, ...styles.assistantBubble }}>
                  <div style={styles.senderLabel}>Agente de Recomendaciones</div>
                  <div style={styles.typingIndicator}>
                    <span style={styles.typingDot}></span>
                    <span style={{ ...styles.typingDot, animationDelay: '0.2s' }}></span>
                    <span style={{ ...styles.typingDot, animationDelay: '0.4s' }}></span>
                    <span style={{ marginLeft: '8px', fontStyle: 'italic', color: '#64748b' }}>
                      Analizando categoría y seleccionando las mejores opciones...
                    </span>
                  </div>
                </div>
              </div>
            )}

            {recResult && recQuery && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {/* Petición del usuario */}
                <div style={{ ...styles.messageWrapper, justifyContent: 'flex-end' }}>
                  <div style={{ ...styles.messageBubble, ...styles.userBubble }}>
                    <div style={styles.senderLabel}>Tú</div>
                    <div style={styles.messageText}>
                      Recomendaciones para categoría: <strong>{recQuery}</strong>
                    </div>
                  </div>
                </div>

                {/* Respuesta del Agente */}
                <div style={{ ...styles.messageWrapper, justifyContent: 'flex-start' }}>
                  <div style={{ ...styles.messageBubble, ...styles.assistantBubble }}>
                    <div style={styles.senderLabel}>Agente de Recomendaciones</div>
                    <div style={styles.messageText}>{recResult}</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

const styles: { [key: string]: React.CSSProperties } = {
  // Autenticación
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
    backgroundColor: '#ffffff',
    color: '#333333',
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

  // Contenedor principal de la aplicación
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
  },

  // Barra de Navegación de Pestañas
  navBar: {
    display: 'flex',
    borderBottom: '1px solid #e2e8f0',
    backgroundColor: '#f8fafc',
    padding: '0 16px',
    gap: '8px',
  },
  navButton: {
    padding: '12px 18px',
    backgroundColor: 'transparent',
    border: 'none',
    borderBottom: '2px solid transparent',
    color: '#64748b',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  navButtonActive: {
    color: '#2563eb',
    borderBottom: '2px solid #2563eb',
    backgroundColor: '#ffffff',
  },

  // Área de Chat
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
    maxWidth: '78%',
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
    backgroundColor: '#ffffff',
    color: '#333333',
  },
  button: {
    padding: '12px 24px',
    fontSize: '15px',
    fontWeight: 600,
    backgroundColor: '#2563eb',
    color: '#ffffff',
    border: 'none',
    borderRadius: '24px',
  },

  // Estilos de los Agentes
  agentContainer: {
    flex: 1,
    overflowY: 'auto',
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
    backgroundColor: '#f8fafc',
  },
  agentCard: {
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    padding: '24px',
    border: '1px solid #e2e8f0',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
  },
  agentCardHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '16px',
  },
  agentCardTitle: {
    margin: '0 0 4px',
    fontSize: '18px',
    fontWeight: 600,
    color: '#0f172a',
  },
  agentCardSubtitle: {
    margin: 0,
    fontSize: '13px',
    color: '#64748b',
  },
  agentForm: {
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
  },
  formRow: {
    display: 'flex',
    gap: '12px',
  },
  agentInput: {
    padding: '10px 14px',
    borderRadius: '8px',
    border: '1px solid #cbd5e1',
    fontSize: '14px',
    outline: 'none',
    backgroundColor: '#ffffff',
    color: '#333333',
    width: '100%',
    boxSizing: 'border-box',
  },
  primaryButton: {
    padding: '12px 20px',
    borderRadius: '8px',
    backgroundColor: '#2563eb',
    color: '#ffffff',
    fontSize: '14px',
    fontWeight: 600,
    border: 'none',
    transition: 'background-color 0.2s',
  },
  agentResultsArea: {
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
  },
}

export default App
