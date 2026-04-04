'use client'

import { useEffect, useRef, useState, KeyboardEvent } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Send } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useTextOnboarding } from '@/hooks/useTextOnboarding'
import { ProfilePanel } from '@/components/voice/ProfilePanel'
import type { ChatMessage } from '@/types/voice'
import { useI18n } from '@/context/I18nContext'

export function ChatOnboarding() {
  const { messages, profile, isComplete, isLoading, sendMessage } = useTextOnboarding()
  const { t } = useI18n()
  const router = useRouter()
  const [input, setInput] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length, isLoading])

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const handleSend = async () => {
    const text = input.trim()
    if (!text || isLoading) return
    setInput('')
    await sendMessage(text)
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div
      style={{
        display: 'flex',
        height: '100%',
        alignItems: 'stretch',
        gap: '32px',
        padding: '24px 32px',
      }}
    >
      {/* Chat column */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          minWidth: 0,
          overflow: 'hidden',
        }}
      >
        {/* Message list */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            paddingBottom: '8px',
          }}
        >
          <AnimatePresence initial={false}>
            {messages.map((msg: ChatMessage) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
                style={{
                  display: 'flex',
                  justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                }}
              >
                <div
                  style={{
                    maxWidth: '80%',
                    padding: '10px 14px',
                    borderRadius: msg.role === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                    background: msg.role === 'user' ? '#534AB7' : '#F5F5F5',
                    color: msg.role === 'user' ? '#ffffff' : '#171717',
                    fontSize: '14px',
                    lineHeight: '1.5',
                  }}
                >
                  {msg.content}
                </div>
              </motion.div>
            ))}

            {/* Typing indicator */}
            {isLoading && (
              <motion.div
                key="typing"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
                style={{ display: 'flex', justifyContent: 'flex-start' }}
              >
                <div
                  style={{
                    padding: '12px 16px',
                    borderRadius: '18px 18px 18px 4px',
                    background: '#F5F5F5',
                    display: 'flex',
                    gap: '4px',
                    alignItems: 'center',
                  }}
                >
                  {[0, 1, 2].map((i) => (
                    <motion.span
                      key={i}
                      style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        background: '#A3A3A3',
                        display: 'block',
                      }}
                      animate={{ opacity: [0.3, 1, 0.3] }}
                      transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
                    />
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          <div ref={bottomRef} />
        </div>

        {/* Completion banner */}
        <AnimatePresence>
          {isComplete && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.35 }}
              style={{
                background: '#F0FDF4',
                border: '1px solid #BBF7D0',
                borderRadius: '8px',
                padding: '10px 14px',
                marginBottom: '10px',
                fontSize: '13px',
                color: '#15803D',
                fontWeight: 500,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px',
              }}
            >
              <span>{t('chat.complete')}</span>
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={() => router.push('/results')}
                style={{
                  padding: '6px 18px',
                  background: '#534AB7',
                  color: '#fff',
                  fontSize: '13px',
                  fontWeight: 500,
                  borderRadius: '999px',
                  border: 'none',
                  cursor: 'pointer',
                  flexShrink: 0,
                }}
              >
                {t('chat.seePathways')}
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Input area */}
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-end',
            gap: '8px',
            borderRadius: '16px',
            padding: '10px 14px',
          }}
          className="bg-[#F5F5F5] border border-transparent focus-within:border-[#534AB7] focus-within:bg-white transition-colors duration-200"
        >
          <label htmlFor="chat-input" className="sr-only">{t('chat.placeholder')}</label>
          <textarea
            id="chat-input"
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t('chat.placeholder')}
            disabled={isLoading}
            rows={1}
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              fontSize: '14px',
              color: '#171717',
              resize: 'none',
              lineHeight: '1.5',
              fontFamily: 'inherit',
              opacity: isLoading ? 0.5 : 1,
            }}
          />
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: input.trim() && !isLoading ? 'pointer' : 'default',
              background: input.trim() && !isLoading ? '#534AB7' : '#E5E5E5',
              color: input.trim() && !isLoading ? '#ffffff' : '#A3A3A3',
              flexShrink: 0,
              transition: 'background 0.2s, color 0.2s',
            }}
          >
            <Send size={14} />
          </motion.button>
        </div>
      </div>

      {/* Profile panel — desktop only */}
      <div
        className="hidden md:flex"
        style={{
          width: 'min(400px, 36vw)',
          minWidth: '300px',
          flexShrink: 0,
          alignItems: 'flex-start',
          justifyContent: 'center',
          paddingLeft: 12,
          paddingRight: 20,
        }}
      >
        <ProfilePanel profile={profile} isComplete={isComplete} />
      </div>
    </div>
  )
}
