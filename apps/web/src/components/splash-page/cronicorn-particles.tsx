"use client"

import { useEffect, useRef, useState } from "react"
import { CRONICORN_LOGO_PATH } from "./cronicorn-logo-path"

export default function Component() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const mousePositionRef = useRef({ x: 0, y: 0 })
  const isTouchingRef = useRef(false)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const updateCanvasSize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
      setIsMobile(window.innerWidth < 768)
    }

    updateCanvasSize()

    let particles: Array<{
      x: number
      y: number
      baseX: number
      baseY: number
      size: number
      color: string
      scatteredColor: string
      life: number
    }> = []

    let textImageData: ImageData | null = null

    function createTextImage() {
      if (!ctx || !canvas) return 0

      ctx.fillStyle = "white"
      ctx.save()

      const logoHeight = isMobile ? 50 : 60
      const cronicornLogoWidth = logoHeight * (40 / 19.7762)
      const fontSize = isMobile ? 50 : 56
      ctx.font = `${fontSize}px "Inter", "Helvetica Neue", Arial, sans-serif`
      const textMetrics = ctx.measureText("cronicorn")
      const textWidth = textMetrics.width
      const textSpacing = isMobile ? -30 : -40
      const totalWidth = cronicornLogoWidth + textSpacing + textWidth

      const topOffset = isMobile ? 80 : 120
      ctx.translate(canvas.width / 2 - totalWidth / 2, topOffset)

      ctx.save()
      const cronicornScale = logoHeight / 372
      ctx.scale(cronicornScale, cronicornScale)
      const path = new Path2D(CRONICORN_LOGO_PATH)
      ctx.fill(path)
      ctx.restore()

      ctx.save()
      ctx.translate(cronicornLogoWidth + textSpacing, logoHeight / 2)
      ctx.textBaseline = "middle"
      ctx.fillText("cronicorn", 0, 0)
      ctx.restore()

      ctx.restore()

      textImageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      return cronicornScale
    }

    function createParticle() {
      if (!ctx || !canvas || !textImageData) return null

      const data = textImageData.data

      for (let attempt = 0; attempt < 100; attempt++) {
        const x = Math.floor(Math.random() * canvas.width)
        const y = Math.floor(Math.random() * canvas.height)

        if (data[(y * canvas.width + x) * 4 + 3] > 128) {
          return {
            x: x,
            y: y,
            baseX: x,
            baseY: y,
            size: Math.random() * 1 + 0.5,
            color: "white",
            scatteredColor: "#FF9900",
            life: Math.random() * 100 + 50,
          }
        }
      }

      return null
    }

    function createInitialParticles() {
      if (!canvas) return

      const baseParticleCount = 7000
      const particleCount = Math.floor(baseParticleCount * Math.sqrt((canvas.width * canvas.height) / (1920 * 1080)))
      for (let i = 0; i < particleCount; i++) {
        const particle = createParticle()
        if (particle) particles.push(particle)
      }
    }

    let animationFrameId: number

    function animate(scale: number) {
      if (!ctx || !canvas) return
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.fillStyle = "black"
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      const { x: mouseX, y: mouseY } = mousePositionRef.current
      const maxDistance = 100

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i]
        const dx = mouseX - p.x
        const dy = mouseY - p.y
        const distance = Math.sqrt(dx * dx + dy * dy)

        if (distance < maxDistance && (isTouchingRef.current || !("ontouchstart" in window))) {
          const force = (maxDistance - distance) / maxDistance
          const angle = Math.atan2(dy, dx)
          const moveX = Math.cos(angle) * force * 20
          const moveY = Math.sin(angle) * force * 20
          p.x = p.baseX - moveX
          p.y = p.baseY - moveY

          ctx.fillStyle = p.scatteredColor
        } else {
          p.x += (p.baseX - p.x) * 0.15
          p.y += (p.baseY - p.y) * 0.15
          ctx.fillStyle = "white"
        }

        ctx.fillRect(p.x, p.y, p.size, p.size)

        p.life--
        if (p.life <= 0) {
          const newParticle = createParticle()
          if (newParticle) {
            particles[i] = newParticle
          } else {
            particles.splice(i, 1)
            i--
          }
        }
      }

      const baseParticleCount = 7000
      const targetParticleCount = Math.floor(
        baseParticleCount * Math.sqrt((canvas.width * canvas.height) / (1920 * 1080)),
      )
      while (particles.length < targetParticleCount) {
        const newParticle = createParticle()
        if (newParticle) particles.push(newParticle)
      }

      animationFrameId = requestAnimationFrame(() => animate(scale))
    }

    const scale = createTextImage()
    createInitialParticles()
    animate(scale)

    const handleResize = () => {
      updateCanvasSize()
      createTextImage()
      particles = []
      createInitialParticles()
    }

    const handleMove = (x: number, y: number) => {
      mousePositionRef.current = { x, y }
    }

    const handleMouseMove = (e: MouseEvent) => {
      handleMove(e.clientX, e.clientY)
    }

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        e.preventDefault()
        handleMove(e.touches[0].clientX, e.touches[0].clientY)
      }
    }

    const handleTouchStart = () => {
      isTouchingRef.current = true
    }

    const handleTouchEnd = () => {
      isTouchingRef.current = false
      mousePositionRef.current = { x: 0, y: 0 }
    }

    const handleMouseLeave = () => {
      if (!("ontouchstart" in window)) {
        mousePositionRef.current = { x: 0, y: 0 }
      }
    }

    window.addEventListener("resize", handleResize)
    canvas.addEventListener("mousemove", handleMouseMove)
    canvas.addEventListener("touchmove", handleTouchMove, { passive: false })
    canvas.addEventListener("mouseleave", handleMouseLeave)
    canvas.addEventListener("touchstart", handleTouchStart)
    canvas.addEventListener("touchend", handleTouchEnd)

    return () => {
      window.removeEventListener("resize", handleResize)
      canvas.removeEventListener("mousemove", handleMouseMove)
      canvas.removeEventListener("touchmove", handleTouchMove)
      canvas.removeEventListener("mouseleave", handleMouseLeave)
      canvas.removeEventListener("touchstart", handleTouchStart)
      canvas.removeEventListener("touchend", handleTouchEnd)
      cancelAnimationFrame(animationFrameId)
    }
  }, [isMobile])

  return (
    <div className="relative w-full h-dvh flex flex-col items-center justify-center bg-black">
      <canvas
        ref={canvasRef}
        className="w-full h-full absolute top-0 left-0 touch-none"
        aria-label="Interactive particle effect with Cronicorn logo"
      />
      {/* Text below the animated logo */}
      <div className="absolute z-10 text-center" style={{ top: isMobile ? '160px' : '200px' }}>
        <h1 className="font-sans text-white text-xl md:text-3xl font-bold mb-2 tracking-wide">
          Intelligent Cron Scheduling
        </h1>
        <p className="font-sans text-gray-300 text-sm md:text-lg font-light tracking-wider">
          Built for the Modern Web
        </p>
      </div>
      
      {/* Feature Graphic Placeholder */}
      <div className="absolute z-10 flex items-center justify-center" style={{ 
        top: isMobile ? '280px' : '320px',
        left: '50%',
        transform: 'translateX(-50%)'
      }}>
        <div className="relative">
          {/* Placeholder for feature graphic - could be dashboard preview, architecture diagram, etc. */}
          <div className="w-80 md:w-96 h-48 md:h-56 bg-gradient-to-br from-gray-800/50 to-gray-900/50 rounded-lg border border-gray-700/50 backdrop-blur-sm p-6 flex flex-col items-center justify-center">
            <div className="w-16 h-16 bg-orange-500/20 rounded-full flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h3 className="text-white text-lg font-semibold mb-2">Feature Preview</h3>
            <p className="text-gray-400 text-sm text-center">Dashboard, architecture diagram, or key feature visualization will go here</p>
          </div>
          
          {/* Subtle glow effect */}
          <div className="absolute inset-0 bg-orange-500/5 rounded-lg blur-xl -z-10"></div>
        </div>
      </div>
      
      <div className="absolute bottom-12 md:bottom-16 text-center z-10 px-6 max-w-2xl">
        <h2 className="font-sans text-white text-lg md:text-2xl font-semibold mb-3 md:mb-4 text-balance">
          Something magical is coming soon
        </h2>
        <p className="font-sans text-gray-400 text-sm md:text-base mb-6 md:mb-8 leading-relaxed text-pretty">
          Join the waitlist to be the first to experience the future of innovation
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
          <input
            type="email"
            placeholder="Enter your email"
            className="w-full sm:w-64 px-4 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50 transition-all"
          />
          <button className="w-full sm:w-auto px-6 py-2.5 bg-orange-500 hover:bg-orange-600 text-white font-medium rounded-lg transition-colors duration-200">
            Notify Me
          </button>
        </div>
      </div>
    </div>
  )
}
