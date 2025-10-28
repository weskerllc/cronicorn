"use client"

import { useEffect, useRef, useState } from "react"
import { CRONICORN_LOGO_PATH } from "../cronicorn-logo-path"

interface ParticleCanvasProps {
    className?: string
    "aria-label"?: string
}

export default function ParticleCanvas({
    className = "w-full h-full absolute top-0 left-0 z-10 touch-none",
    "aria-label": ariaLabel = "Interactive particle effect with Cronicorn logo"
}: ParticleCanvasProps) {
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
            const canvasSection = canvas.closest('section')
            if (canvasSection) {
                canvas.width = canvasSection.clientWidth
                canvas.height = canvasSection.clientHeight
            } else {
                canvas.width = window.innerWidth
                canvas.height = window.innerHeight
            }
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

            const logoHeight = isMobile ? 50 : 120
            const cronicornLogoWidth = logoHeight * (40 / 19.7762)
            const fontSize = isMobile ? 50 : 112
            ctx.font = `${fontSize}px "Inter", "Helvetica Neue", Arial, sans-serif`
            const textMetrics = ctx.measureText("cronicorn")
            const textWidth = textMetrics.width
            const textSpacing = isMobile ? -25 : -60
            const totalWidth = cronicornLogoWidth + textSpacing + textWidth

            const topOffset = canvas.height / 2 - logoHeight / 2
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

            const baseParticleCount = isMobile ? 6000 : 12000
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

            ctx.fillStyle = 'transparent'
            ctx.fillRect(0, 0, canvas.width, canvas.height)

            const { x: mouseX, y: mouseY } = mousePositionRef.current
            const maxDistance = isMobile ? 100 : 150

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

            const baseParticleCount = isMobile ? 6000 : 12000
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
            const rect = canvas.getBoundingClientRect()
            mousePositionRef.current = {
                x: x - rect.left,
                y: y - rect.top
            }
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
        <canvas
            ref={canvasRef}
            className={className}
            aria-label={ariaLabel}
        />
    )
}