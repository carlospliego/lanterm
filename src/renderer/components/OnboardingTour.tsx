import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useAppStore } from '../store/useAppStore'
import { FONT_UI, FONT_MONO, TYPE, RADIUS, SPACE, btnReset } from '../designTokens'

interface TourStep {
  id: string
  title: string
  description: string
  /** data-tour attribute value to spotlight, or null for centered card */
  target: string | null
  /** Preferred placement of the tooltip relative to the spotlight */
  placement: 'right' | 'left' | 'bottom' | 'top'
  /** Side effect to run when this step becomes active */
  onEnter?: () => void
  /** Cleanup when leaving this step */
  onLeave?: () => void
}

function getSteps(): TourStep[] {
  return [
    {
      id: 'welcome',
      title: 'Welcome to LanTerm',
      description: 'A fast, modern terminal for macOS. Let\u2019s take a quick tour of the key features.',
      target: null,
      placement: 'bottom',
    },
    {
      id: 'sidebar',
      title: 'Sidebar',
      description: 'Manage your terminals and folders here. Use the + button to create new terminals or folders, and drag to reorder.',
      target: 'sidebar',
      placement: 'right',
      onEnter: () => {
        const { sidebarOpen, setSidebarOpen } = useAppStore.getState()
        if (!sidebarOpen) setSidebarOpen(true)
      },
    },
    {
      id: 'terminal',
      title: 'Terminal',
      description: 'Your terminal lives here. The title bar shows the current working directory and session name.',
      target: 'terminal-pane',
      placement: 'left',
      onEnter: () => {
        const { terminals, createTerminal } = useAppStore.getState()
        if (terminals.length === 0) createTerminal()
      },
    },
    {
      id: 'palette',
      title: 'Command Palette',
      description: 'Press \u2318P to open the command palette. Type > for commands, / to search terminal content, or ! to browse shell history.',
      target: 'command-palette',
      placement: 'bottom',
      onEnter: () => {
        const { paletteOpen, openPalette } = useAppStore.getState()
        if (!paletteOpen) openPalette()
      },
      onLeave: () => {
        const { paletteOpen, closePalette } = useAppStore.getState()
        if (paletteOpen) closePalette()
      },
    },
    {
      id: 'splits',
      title: 'Split Panes',
      description: 'Press \u2318D to split the current terminal. Use \u2318\u21E7\u2190 and \u2318\u21E7\u2192 to switch between panes.',
      target: 'split-button',
      placement: 'bottom',
    },
    {
      id: 'plugins',
      title: 'Plugins',
      description: 'The activity bar gives quick access to sidebar plugins like Git, tasks, and more. Click the gear icon to manage plugins.',
      target: 'activity-bar',
      placement: 'left',
    },
    {
      id: 'finish',
      title: 'You\u2019re ready!',
      description: 'That\u2019s the basics. Press \u2318P anytime to discover more commands. Happy hacking!',
      target: null,
      placement: 'bottom',
    },
  ]
}

const OVERLAY_Z = 10000
const CARD_WIDTH = 320
const CARD_GAP = 12
const SPOTLIGHT_PADDING = 6
const SPOTLIGHT_RADIUS = 8
/** Delay after onEnter to let UI settle before measuring */
const SETTLE_DELAY = 150

export function OnboardingTour() {
  const onboardingComplete = useAppStore(s => s.settings.onboardingComplete)
  const updateSettings = useAppStore(s => s.updateSettings)

  const [visible, setVisible] = useState(false)
  const [stepIndex, setStepIndex] = useState(0)
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null)
  const [ready, setReady] = useState(false)
  const rafRef = useRef(0)
  const stepsRef = useRef<TourStep[]>(getSteps())

  const step = stepsRef.current[stepIndex]

  const complete = useCallback(() => {
    // Run onLeave for current step before completing
    const currentStep = stepsRef.current[stepIndex]
    currentStep.onLeave?.()
    setVisible(false)
    updateSettings({ onboardingComplete: true })
  }, [updateSettings, stepIndex])

  // Show tour after 800ms delay if not completed
  useEffect(() => {
    if (onboardingComplete) return
    const timer = setTimeout(() => setVisible(true), 800)
    return () => clearTimeout(timer)
  }, [onboardingComplete])

  // Measure target element position
  const measureTarget = useCallback(() => {
    if (!step.target) {
      setTargetRect(null)
      return
    }
    const el = document.querySelector(`[data-tour="${step.target}"]`)
    if (el) {
      setTargetRect(el.getBoundingClientRect())
    } else {
      setTargetRect(null)
    }
  }, [step.target])

  // Run onEnter when step changes, then measure after settling
  useEffect(() => {
    if (!visible) return
    setReady(false)
    step.onEnter?.()
    const timer = setTimeout(() => {
      measureTarget()
      setReady(true)
    }, SETTLE_DELAY)
    return () => clearTimeout(timer)
  }, [visible, stepIndex]) // eslint-disable-line react-hooks/exhaustive-deps

  // Re-measure on window resize
  useEffect(() => {
    if (!visible || !ready) return
    const onResize = () => {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = requestAnimationFrame(measureTarget)
    }
    window.addEventListener('resize', onResize)
    return () => {
      window.removeEventListener('resize', onResize)
      cancelAnimationFrame(rafRef.current)
    }
  }, [visible, ready, measureTarget])

  // Escape key to skip
  useEffect(() => {
    if (!visible) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        e.stopPropagation()
        complete()
      }
    }
    window.addEventListener('keydown', onKeyDown, true)
    return () => window.removeEventListener('keydown', onKeyDown, true)
  }, [visible, complete])

  if (!visible || onboardingComplete || !ready) return null

  const steps = stepsRef.current
  const isCentered = !step.target || !targetRect
  const isLastStep = stepIndex === steps.length - 1
  const isFirstStep = stepIndex === 0

  // Compute spotlight box (with padding)
  const spot = targetRect
    ? {
        x: targetRect.x - SPOTLIGHT_PADDING,
        y: targetRect.y - SPOTLIGHT_PADDING,
        w: targetRect.width + SPOTLIGHT_PADDING * 2,
        h: targetRect.height + SPOTLIGHT_PADDING * 2,
      }
    : null

  // Compute tooltip position
  let tooltipStyle: React.CSSProperties = {}
  if (isCentered) {
    tooltipStyle = {
      position: 'fixed',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
    }
  } else if (spot) {
    const vw = window.innerWidth
    const vh = window.innerHeight

    switch (step.placement) {
      case 'right': {
        const left = spot.x + spot.w + CARD_GAP
        if (left + CARD_WIDTH < vw) {
          tooltipStyle = { position: 'fixed', left, top: spot.y }
        } else {
          tooltipStyle = { position: 'fixed', left: spot.x - CARD_WIDTH - CARD_GAP, top: spot.y }
        }
        break
      }
      case 'left': {
        const left = spot.x - CARD_WIDTH - CARD_GAP
        if (left > 0) {
          tooltipStyle = { position: 'fixed', left, top: spot.y }
        } else {
          tooltipStyle = { position: 'fixed', left: spot.x + spot.w + CARD_GAP, top: spot.y }
        }
        break
      }
      case 'bottom': {
        tooltipStyle = {
          position: 'fixed',
          top: spot.y + spot.h + CARD_GAP,
          left: spot.x + spot.w / 2 - CARD_WIDTH / 2,
        }
        break
      }
      case 'top': {
        tooltipStyle = {
          position: 'fixed',
          top: spot.y - CARD_GAP,
          left: spot.x + spot.w / 2 - CARD_WIDTH / 2,
          transform: 'translateY(-100%)',
        }
        break
      }
    }

    // Clamp within viewport
    if (typeof tooltipStyle.left === 'number') {
      tooltipStyle.left = Math.max(CARD_GAP, Math.min(tooltipStyle.left as number, vw - CARD_WIDTH - CARD_GAP))
    }
    if (typeof tooltipStyle.top === 'number') {
      tooltipStyle.top = Math.max(CARD_GAP, Math.min(tooltipStyle.top as number, vh - 200))
    }
  }

  const goTo = (nextIndex: number) => {
    step.onLeave?.()
    setStepIndex(nextIndex)
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: OVERLAY_Z,
      }}
    >
      {/* Backdrop: either full overlay or spotlight cutout */}
      {isCentered ? (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.5)',
          }}
          onClick={complete}
        />
      ) : spot ? (
        <div
          style={{
            position: 'fixed',
            left: spot.x,
            top: spot.y,
            width: spot.w,
            height: spot.h,
            borderRadius: SPOTLIGHT_RADIUS,
            boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.5)',
            zIndex: OVERLAY_Z + 1,
            pointerEvents: 'none',
          }}
        />
      ) : null}

      {/* Click blocker for non-centered steps (outside the spotlight) */}
      {!isCentered && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: OVERLAY_Z,
          }}
        />
      )}

      {/* Tooltip card */}
      <div
        style={{
          ...tooltipStyle,
          width: CARD_WIDTH,
          zIndex: OVERLAY_Z + 2,
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: RADIUS.lg,
          boxShadow: '0 8px 32px var(--shadow)',
          padding: '20px',
          fontFamily: FONT_UI,
        }}
      >
        <div
          style={{
            fontSize: TYPE.xl,
            fontWeight: 600,
            color: 'var(--text-primary)',
            marginBottom: SPACE.md,
          }}
        >
          {step.title}
        </div>
        <div
          style={{
            fontSize: TYPE.md,
            color: 'var(--text-dim)',
            lineHeight: 1.5,
            marginBottom: SPACE.xl,
          }}
        >
          {step.description}
        </div>

        {/* Step dots */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: SPACE.xs,
            marginBottom: SPACE.lg,
            justifyContent: 'center',
          }}
        >
          {steps.map((_, i) => (
            <div
              key={i}
              style={{
                width: i === stepIndex ? 16 : 6,
                height: 6,
                borderRadius: 3,
                background: i === stepIndex ? 'var(--accent)' : 'var(--border)',
                transition: 'all 0.2s',
              }}
            />
          ))}
        </div>

        {/* Navigation buttons */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <button
            onClick={complete}
            style={{
              ...btnReset,
              fontSize: TYPE.body,
              fontFamily: FONT_MONO,
              color: 'var(--text-faintest)',
              padding: `${SPACE.xs}px ${SPACE.md}px`,
              transition: 'color 0.1s',
            }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-muted)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-faintest)')}
          >
            Skip
          </button>
          <div style={{ display: 'flex', gap: SPACE.md }}>
            {!isFirstStep && (
              <button
                onClick={() => goTo(stepIndex - 1)}
                style={{
                  ...btnReset,
                  fontSize: TYPE.body,
                  fontFamily: FONT_MONO,
                  color: 'var(--text-dim)',
                  padding: `${SPACE.xs}px ${SPACE.md}px`,
                  borderRadius: RADIUS.md,
                  border: '1px solid var(--border)',
                  transition: 'all 0.1s',
                }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--text-faintest)')}
                onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
              >
                Back
              </button>
            )}
            <button
              onClick={() => {
                if (isLastStep) {
                  complete()
                } else {
                  goTo(stepIndex + 1)
                }
              }}
              style={{
                ...btnReset,
                fontSize: TYPE.body,
                fontFamily: FONT_MONO,
                fontWeight: 600,
                color: 'var(--bg)',
                background: 'var(--accent)',
                padding: `${SPACE.xs}px ${SPACE.lg}px`,
                borderRadius: RADIUS.md,
                transition: 'background 0.15s',
              }}
              onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
              onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
            >
              {isLastStep ? 'Get Started' : 'Next'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
