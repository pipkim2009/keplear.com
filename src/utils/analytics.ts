/**
 * Advanced analytics and telemetry system
 * Provides comprehensive user behavior tracking and performance metrics
 */

export interface AnalyticsEvent {
  id: string
  type: string
  category: string
  action: string
  label?: string
  value?: number
  timestamp: number
  sessionId: string
  userId?: string
  metadata?: Record<string, unknown>
}

export interface UserSession {
  id: string
  startTime: number
  endTime?: number
  pageViews: string[]
  events: AnalyticsEvent[]
  userAgent: string
  platform: string
  referrer?: string
}

export interface PerformanceReport {
  sessionId: string
  timestamp: number
  metrics: {
    fcp?: number
    lcp?: number
    fid?: number
    cls?: number
    tti?: number
  }
  resources: {
    totalSize: number
    loadTime: number
    errorCount: number
  }
  memory: {
    used: number
    total: number
    peak: number
  }
}

/**
 * Advanced analytics manager
 */
export class AnalyticsManager {
  private static instance: AnalyticsManager
  private session: UserSession | null = null
  private eventQueue: AnalyticsEvent[] = []
  private isOnline = navigator.onLine
  private sendInterval: NodeJS.Timeout | null = null
  private performanceObserver: PerformanceObserver | null = null

  private constructor() {
    this.initializeSession()
    this.setupNetworkListeners()
    this.setupPerformanceMonitoring()
    this.startBatchSending()
  }

  static getInstance(): AnalyticsManager {
    if (!AnalyticsManager.instance) {
      AnalyticsManager.instance = new AnalyticsManager()
    }
    return AnalyticsManager.instance
  }

  /**
   * Initialize user session
   */
  private initializeSession(): void {
    const sessionId = this.generateSessionId()
    const startTime = Date.now()

    this.session = {
      id: sessionId,
      startTime,
      pageViews: [window.location.pathname],
      events: [],
      userAgent: navigator.userAgent,
      platform: this.detectPlatform(),
      referrer: document.referrer || undefined
    }

    // Store session in sessionStorage
    sessionStorage.setItem('keplear-session', JSON.stringify(this.session))

    // Track session start
    this.trackEvent('session', 'start', 'application')
  }

  /**
   * Generate unique session ID
   */
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Detect user platform
   */
  private detectPlatform(): string {
    const userAgent = navigator.userAgent.toLowerCase()

    if (/mobile|android|iphone|ipad|phone/i.test(userAgent)) {
      return 'mobile'
    } else if (/tablet|ipad/i.test(userAgent)) {
      return 'tablet'
    } else {
      return 'desktop'
    }
  }

  /**
   * Setup network status listeners
   */
  private setupNetworkListeners(): void {
    window.addEventListener('online', () => {
      this.isOnline = true
      this.trackEvent('network', 'online', 'connectivity')
      this.flushEventQueue()
    })

    window.addEventListener('offline', () => {
      this.isOnline = false
      this.trackEvent('network', 'offline', 'connectivity')
    })
  }

  /**
   * Setup performance monitoring
   */
  private setupPerformanceMonitoring(): void {
    // Monitor long tasks
    if ('PerformanceObserver' in window) {
      this.performanceObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries()
        entries.forEach((entry) => {
          if (entry.entryType === 'longtask') {
            this.trackEvent('performance', 'long-task', 'timing', entry.duration)
          }
        })
      })

      try {
        this.performanceObserver.observe({ entryTypes: ['longtask'] })
      } catch {
        // Browser doesn't support longtask monitoring
      }
    }

    // Monitor page visibility changes
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.trackEvent('page', 'hidden', 'visibility')
        this.generatePerformanceReport()
      } else {
        this.trackEvent('page', 'visible', 'visibility')
      }
    })

    // Monitor beforeunload
    window.addEventListener('beforeunload', () => {
      this.trackEvent('session', 'end', 'application')
      this.generatePerformanceReport()
      this.flushEventQueue()
    })
  }

  /**
   * Track custom event
   */
  trackEvent(
    category: string,
    action: string,
    label?: string,
    value?: number,
    metadata?: Record<string, unknown>
  ): void {
    if (!this.session) return

    const event: AnalyticsEvent = {
      id: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'custom',
      category,
      action,
      label,
      value,
      timestamp: Date.now(),
      sessionId: this.session.id,
      userId: this.getUserId(),
      metadata
    }

    this.eventQueue.push(event)
    this.session.events.push(event)

    // Update session storage
    sessionStorage.setItem('keplear-session', JSON.stringify(this.session))

    console.log('Analytics event tracked:', event)
  }

  /**
   * Track page view
   */
  trackPageView(path: string): void {
    if (!this.session) return

    this.session.pageViews.push(path)
    this.trackEvent('page', 'view', path)
  }

  /**
   * Track user interaction
   */
  trackInteraction(
    element: string,
    action: string,
    context?: string,
    duration?: number
  ): void {
    this.trackEvent('interaction', action, element, duration, {
      context,
      timestamp: Date.now()
    })
  }

  /**
   * Track audio event
   */
  trackAudioEvent(
    action: string,
    instrument?: string,
    noteCount?: number,
    bpm?: number,
    duration?: number
  ): void {
    this.trackEvent('audio', action, instrument, duration, {
      noteCount,
      bpm,
      timestamp: Date.now()
    })
  }

  /**
   * Track error
   */
  trackError(
    error: Error,
    component?: string,
    userAction?: string
  ): void {
    this.trackEvent('error', 'exception', component, undefined, {
      message: error.message,
      stack: error.stack,
      userAction,
      url: window.location.href,
      timestamp: Date.now()
    })
  }

  /**
   * Track performance metrics
   */
  trackPerformance(
    metric: string,
    value: number,
    category = 'performance'
  ): void {
    this.trackEvent(category, 'metric', metric, value, {
      timestamp: Date.now(),
      url: window.location.href
    })
  }

  /**
   * Generate comprehensive performance report
   */
  private generatePerformanceReport(): void {
    if (!this.session) return

    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
    const memory = (performance as any).memory

    const report: PerformanceReport = {
      sessionId: this.session.id,
      timestamp: Date.now(),
      metrics: this.getWebVitalsMetrics(),
      resources: {
        totalSize: this.calculateResourceSize(),
        loadTime: navigation?.loadEventEnd - navigation?.navigationStart || 0,
        errorCount: this.getResourceErrorCount()
      },
      memory: {
        used: memory ? memory.usedJSHeapSize / 1024 / 1024 : 0,
        total: memory ? memory.totalJSHeapSize / 1024 / 1024 : 0,
        peak: memory ? memory.usedJSHeapSize / 1024 / 1024 : 0 // Simplified
      }
    }

    this.trackEvent('performance', 'report', 'session-end', undefined, report)
  }

  /**
   * Get Web Vitals metrics
   */
  private getWebVitalsMetrics(): PerformanceReport['metrics'] {
    const metrics: PerformanceReport['metrics'] = {}

    // First Contentful Paint
    const fcp = performance.getEntriesByName('first-contentful-paint')[0]
    if (fcp) metrics.fcp = fcp.startTime

    // Largest Contentful Paint
    const lcpEntries = performance.getEntriesByType('largest-contentful-paint')
    if (lcpEntries.length > 0) {
      metrics.lcp = lcpEntries[lcpEntries.length - 1].startTime
    }

    return metrics
  }

  /**
   * Calculate total resource size
   */
  private calculateResourceSize(): number {
    const resources = performance.getEntriesByType('resource')
    return resources.reduce((total, resource) => {
      const resourceEntry = resource as PerformanceResourceTiming
      return total + (resourceEntry.transferSize || 0)
    }, 0)
  }

  /**
   * Get resource error count
   */
  private getResourceErrorCount(): number {
    // This would need to be tracked separately as performance API
    // doesn't directly provide error counts
    return 0
  }

  /**
   * Get user ID from storage or generate anonymous ID
   */
  private getUserId(): string | undefined {
    let userId = localStorage.getItem('keplear-user-id')

    if (!userId) {
      userId = `anon_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      localStorage.setItem('keplear-user-id', userId)
    }

    return userId
  }

  /**
   * Start batch sending of events
   */
  private startBatchSending(): void {
    this.sendInterval = setInterval(() => {
      if (this.eventQueue.length > 0 && this.isOnline) {
        this.flushEventQueue()
      }
    }, 5000) // Send every 5 seconds
  }

  /**
   * Flush event queue to server
   */
  private async flushEventQueue(): Promise<void> {
    if (this.eventQueue.length === 0) return

    const events = [...this.eventQueue]
    this.eventQueue = []

    try {
      // In production, replace with your analytics endpoint
      const response = await fetch('/api/analytics/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ events })
      })

      if (!response.ok) {
        throw new Error(`Analytics request failed: ${response.status}`)
      }

      console.log(`Sent ${events.length} analytics events`)

    } catch (error) {
      console.warn('Failed to send analytics events:', error)

      // Re-queue events for retry
      this.eventQueue.unshift(...events)

      // Limit queue size to prevent memory issues
      if (this.eventQueue.length > 1000) {
        this.eventQueue = this.eventQueue.slice(-500)
      }
    }
  }

  /**
   * Get session data
   */
  getSession(): UserSession | null {
    return this.session
  }

  /**
   * Get analytics summary
   */
  getAnalyticsSummary(): {
    sessionDuration: number
    eventCount: number
    pageViewCount: number
    errorCount: number
  } {
    if (!this.session) {
      return { sessionDuration: 0, eventCount: 0, pageViewCount: 0, errorCount: 0 }
    }

    const sessionDuration = Date.now() - this.session.startTime
    const eventCount = this.session.events.length
    const pageViewCount = this.session.pageViews.length
    const errorCount = this.session.events.filter(e => e.category === 'error').length

    return { sessionDuration, eventCount, pageViewCount, errorCount }
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    if (this.sendInterval) {
      clearInterval(this.sendInterval)
    }

    if (this.performanceObserver) {
      this.performanceObserver.disconnect()
    }

    this.flushEventQueue()
  }
}

/**
 * React hook for analytics
 */
export function useAnalytics() {
  const analytics = AnalyticsManager.getInstance()

  const trackEvent = useCallback(
    (category: string, action: string, label?: string, value?: number, metadata?: Record<string, unknown>) =>
      analytics.trackEvent(category, action, label, value, metadata),
    []
  )

  const trackPageView = useCallback(
    (path: string) => analytics.trackPageView(path),
    []
  )

  const trackInteraction = useCallback(
    (element: string, action: string, context?: string, duration?: number) =>
      analytics.trackInteraction(element, action, context, duration),
    []
  )

  const trackAudioEvent = useCallback(
    (action: string, instrument?: string, noteCount?: number, bpm?: number, duration?: number) =>
      analytics.trackAudioEvent(action, instrument, noteCount, bpm, duration),
    []
  )

  const trackError = useCallback(
    (error: Error, component?: string, userAction?: string) =>
      analytics.trackError(error, component, userAction),
    []
  )

  const trackPerformance = useCallback(
    (metric: string, value: number, category?: string) =>
      analytics.trackPerformance(metric, value, category),
    []
  )

  return {
    trackEvent,
    trackPageView,
    trackInteraction,
    trackAudioEvent,
    trackError,
    trackPerformance,
    getSession: () => analytics.getSession(),
    getSummary: () => analytics.getAnalyticsSummary()
  }
}

// Enhanced performance tracking decorator
export function trackPerformance(category = 'performance') {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value

    descriptor.value = async function (...args: any[]) {
      const analytics = AnalyticsManager.getInstance()
      const startTime = performance.now()

      try {
        const result = await originalMethod.apply(this, args)
        const duration = performance.now() - startTime

        analytics.trackPerformance(
          `${target.constructor.name}.${propertyKey}`,
          duration,
          category
        )

        return result
      } catch (error) {
        const duration = performance.now() - startTime

        analytics.trackError(
          error as Error,
          `${target.constructor.name}.${propertyKey}`,
          'method_execution'
        )

        analytics.trackPerformance(
          `${target.constructor.name}.${propertyKey}_error`,
          duration,
          'performance_errors'
        )

        throw error
      }
    }

    return descriptor
  }
}

// Export singleton
export const analytics = AnalyticsManager.getInstance()