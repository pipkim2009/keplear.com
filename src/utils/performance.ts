/**
 * Performance monitoring utilities for tracking application metrics
 * Provides comprehensive performance tracking for React components and user interactions
 */

// Type definitions for Web APIs
interface PerformanceEventTiming extends PerformanceEntry {
  processingStart: number
  hadRecentInput?: boolean
}

interface LayoutShift extends PerformanceEntry {
  value: number
  hadRecentInput: boolean
}

export interface PerformanceMetrics {
  /** First Contentful Paint timing */
  fcp?: number
  /** Largest Contentful Paint timing */
  lcp?: number
  /** First Input Delay timing */
  fid?: number
  /** Cumulative Layout Shift score */
  cls?: number
  /** Time to Interactive */
  tti?: number
  /** Total Blocking Time */
  tbt?: number
}

export interface ComponentPerformanceData {
  componentName: string
  renderTime: number
  renderCount: number
  propsChangeCount: number
  lastRenderTimestamp: number
}

export interface UserInteractionMetrics {
  interactionType: string
  targetElement: string
  timestamp: number
  duration: number
  success: boolean
}

/**
 * Performance monitoring class for comprehensive metrics tracking
 */
export class PerformanceMonitor {
  private static instance: PerformanceMonitor
  private metrics: PerformanceMetrics = {}
  private componentMetrics = new Map<string, ComponentPerformanceData>()
  private interactions: UserInteractionMetrics[] = []
  private memoryUsageHistory: number[] = []
  private isEnabled = true

  private constructor() {
    this.initializeWebVitals()
    this.startMemoryMonitoring()
    this.trackPageLoad()
  }

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor()
    }
    return PerformanceMonitor.instance
  }

  /**
   * Initialize Web Vitals tracking
   */
  private initializeWebVitals() {
    if (typeof window === 'undefined') return

    // First Contentful Paint
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.name === 'first-contentful-paint') {
          this.metrics.fcp = entry.startTime
        }
      }
    })

    try {
      observer.observe({ entryTypes: ['paint'] })
    } catch {
      // Browser doesn't support this API
    }

    // Largest Contentful Paint
    const lcpObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries()
      const lastEntry = entries[entries.length - 1]
      this.metrics.lcp = lastEntry.startTime
    })

    try {
      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] })
    } catch {
      // Browser doesn't support this API
    }

    // First Input Delay
    const fidObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const performanceEntry = entry as PerformanceEventTiming
        this.metrics.fid = performanceEntry.processingStart - entry.startTime
      }
    })

    try {
      fidObserver.observe({ entryTypes: ['first-input'] })
    } catch {
      // Browser doesn't support this API
    }

    // Cumulative Layout Shift
    let clsValue = 0
    const clsObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const layoutShiftEntry = entry as LayoutShift
        if (!layoutShiftEntry.hadRecentInput) {
          clsValue += layoutShiftEntry.value
          this.metrics.cls = clsValue
        }
      }
    })

    try {
      clsObserver.observe({ entryTypes: ['layout-shift'] })
    } catch {
      // Browser doesn't support this API
    }
  }

  /**
   * Track page load performance
   */
  private trackPageLoad() {
    if (typeof window === 'undefined') return

    window.addEventListener('load', () => {
      setTimeout(() => {
        const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
        if (navigation) {
          console.log('Page Load Metrics:', {
            domContentLoaded: navigation.domContentLoadedEventEnd - navigation.navigationStart,
            windowLoad: navigation.loadEventEnd - navigation.navigationStart,
            firstByte: navigation.responseStart - navigation.navigationStart,
            domInteractive: navigation.domInteractive - navigation.navigationStart
          })
        }
      }, 0)
    })
  }

  /**
   * Start monitoring memory usage
   */
  private startMemoryMonitoring() {
    if (typeof window === 'undefined' || !('memory' in performance)) return

    const checkMemory = () => {
      const memory = (performance as Performance & { memory?: { usedJSHeapSize: number } }).memory
      if (memory) {
        const usedMB = memory.usedJSHeapSize / 1024 / 1024
        this.memoryUsageHistory.push(usedMB)

        // Keep only last 100 measurements
        if (this.memoryUsageHistory.length > 100) {
          this.memoryUsageHistory.shift()
        }

        // Log warning if memory usage is high
        if (usedMB > 100) {
          console.warn(`High memory usage detected: ${usedMB.toFixed(2)}MB`)
        }
      }
    }

    // Check memory every 10 seconds
    setInterval(checkMemory, 10000)
    checkMemory() // Initial check
  }

  /**
   * Track component render performance
   */
  trackComponentRender(componentName: string, renderTime: number, propsChanged = false) {
    if (!this.isEnabled) return

    const existing = this.componentMetrics.get(componentName)
    if (existing) {
      existing.renderTime = renderTime
      existing.renderCount++
      existing.lastRenderTimestamp = Date.now()
      if (propsChanged) {
        existing.propsChangeCount++
      }
    } else {
      this.componentMetrics.set(componentName, {
        componentName,
        renderTime,
        renderCount: 1,
        propsChangeCount: propsChanged ? 1 : 0,
        lastRenderTimestamp: Date.now()
      })
    }

    // Log slow renders
    if (renderTime > 16) { // 60fps threshold
      console.warn(`Slow render detected in ${componentName}: ${renderTime.toFixed(2)}ms`)
    }
  }

  /**
   * Track user interactions
   */
  trackInteraction(
    interactionType: string,
    targetElement: string,
    duration: number,
    success = true
  ) {
    if (!this.isEnabled) return

    this.interactions.push({
      interactionType,
      targetElement,
      timestamp: Date.now(),
      duration,
      success
    })

    // Keep only last 1000 interactions
    if (this.interactions.length > 1000) {
      this.interactions.shift()
    }

    // Log slow interactions
    if (duration > 100) {
      console.warn(`Slow interaction detected: ${interactionType} on ${targetElement} took ${duration}ms`)
    }
  }

  /**
   * Measure async operation performance
   */
  async measureAsync<T>(
    operationName: string,
    operation: () => Promise<T>
  ): Promise<T> {
    const startTime = performance.now()
    const startMemory = this.getCurrentMemoryUsage()

    try {
      const result = await operation()
      const endTime = performance.now()
      const endMemory = this.getCurrentMemoryUsage()

      console.log(`${operationName} completed:`, {
        duration: endTime - startTime,
        memoryDelta: endMemory - startMemory,
        success: true
      })

      return result
    } catch (error) {
      const endTime = performance.now()
      console.error(`${operationName} failed:`, {
        duration: endTime - startTime,
        error: error instanceof Error ? error.message : String(error),
        success: false
      })
      throw error
    }
  }

  /**
   * Get current memory usage in MB
   */
  private getCurrentMemoryUsage(): number {
    if (typeof window === 'undefined' || !('memory' in performance)) return 0
    const memory = (performance as Performance & { memory?: { usedJSHeapSize: number } }).memory
    return memory ? memory.usedJSHeapSize / 1024 / 1024 : 0
  }

  /**
   * Get performance report
   */
  getPerformanceReport() {
    const slowComponents = Array.from(this.componentMetrics.values())
      .filter(c => c.renderTime > 16)
      .sort((a, b) => b.renderTime - a.renderTime)

    const slowInteractions = this.interactions
      .filter(i => i.duration > 100)
      .sort((a, b) => b.duration - a.duration)

    const avgMemoryUsage = this.memoryUsageHistory.length > 0
      ? this.memoryUsageHistory.reduce((a, b) => a + b, 0) / this.memoryUsageHistory.length
      : 0

    return {
      webVitals: this.metrics,
      componentMetrics: {
        total: this.componentMetrics.size,
        slow: slowComponents.slice(0, 10), // Top 10 slowest
        averageRenderTime: Array.from(this.componentMetrics.values())
          .reduce((sum, c) => sum + c.renderTime, 0) / this.componentMetrics.size || 0
      },
      interactions: {
        total: this.interactions.length,
        slow: slowInteractions.slice(0, 10), // Top 10 slowest
        successRate: this.interactions.filter(i => i.success).length / this.interactions.length || 0
      },
      memory: {
        current: this.getCurrentMemoryUsage(),
        average: avgMemoryUsage,
        peak: Math.max(...this.memoryUsageHistory)
      }
    }
  }

  /**
   * Enable or disable performance monitoring
   */
  setEnabled(enabled: boolean) {
    this.isEnabled = enabled
  }

  /**
   * Clear all collected metrics
   */
  clear() {
    this.metrics = {}
    this.componentMetrics.clear()
    this.interactions = []
    this.memoryUsageHistory = []
  }
}

/**
 * React hook for tracking component performance
 */
export function usePerformanceTracking(componentName: string) {
  const monitor = PerformanceMonitor.getInstance()

  return {
    trackRender: (renderTime: number, propsChanged = false) =>
      monitor.trackComponentRender(componentName, renderTime, propsChanged),

    trackInteraction: (interactionType: string, targetElement: string, duration: number, success = true) =>
      monitor.trackInteraction(interactionType, targetElement, duration, success),

    measureAsync: <T>(operationName: string, operation: () => Promise<T>) =>
      monitor.measureAsync(operationName, operation)
  }
}

/**
 * Higher-order component for automatic performance tracking
 */
export function withPerformanceTracking<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  componentName?: string
) {
  const displayName = componentName || WrappedComponent.displayName || WrappedComponent.name || 'Component'

  return function PerformanceTrackedComponent(props: P) {
    const { trackRender } = usePerformanceTracking(displayName)

    React.useEffect(() => {
      const startTime = performance.now()

      return () => {
        const renderTime = performance.now() - startTime
        trackRender(renderTime)
      }
    })

    return React.createElement(WrappedComponent, props)
  }
}

/**
 * Performance measurement decorator for class methods
 */
export function measurePerformance(target: object, propertyKey: string, descriptor: PropertyDescriptor) {
  const originalMethod = descriptor.value as (...args: unknown[]) => Promise<unknown>

  descriptor.value = async function (...args: unknown[]) {
    const startTime = performance.now()
    const monitor = PerformanceMonitor.getInstance()

    try {
      const result = await originalMethod.apply(this, args)
      const endTime = performance.now()

      monitor.trackInteraction(
        'method_call',
        `${target.constructor.name}.${propertyKey}`,
        endTime - startTime,
        true
      )

      return result
    } catch (error) {
      const endTime = performance.now()

      monitor.trackInteraction(
        'method_call',
        `${target.constructor.name}.${propertyKey}`,
        endTime - startTime,
        false
      )

      throw error
    }
  }

  return descriptor
}

// Global instance
export const performanceMonitor = PerformanceMonitor.getInstance()