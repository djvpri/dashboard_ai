import { createCanvas } from 'canvas'
import { writeFileSync } from 'fs'

function drawIcon(size) {
  const canvas = createCanvas(size, size)
  const ctx = canvas.getContext('2d')
  
  // Background
  const gradient = ctx.createLinearGradient(0, 0, size, size)
  gradient.addColorStop(0, '#030712')
  gradient.addColorStop(1, '#111827')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, size, size)
  
  // Robot emoji
  ctx.font = `${size * 0.5}px "Apple Color Emoji", "Noto Color Emoji", sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('🤖', size / 2, size / 2 + size * 0.05)
  
  return canvas.toBuffer('image/png')
}

writeFileSync('icon-192.png', drawIcon(192))
writeFileSync('icon-512.png', drawIcon(512))
console.log('Icons generated!')
