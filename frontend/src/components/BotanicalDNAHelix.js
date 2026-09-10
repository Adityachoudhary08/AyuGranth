import * as THREE from 'three'

/**
 * Procedural Studio Environment Map Generator
 * Generates an HDRI-style studio softbox reflection map so all physical materials
 * (waxy leaf cuticles, polished dark timber, burnished gold pins, and amber crystals)
 * catch authentic, professional specular reflections.
 */
function yieldToBrowser() {
  // A paint/event turn between CPU/GPU setup phases keeps Lenis and native scrolling responsive.
  return new Promise((resolve) => requestAnimationFrame(() => setTimeout(resolve, 0)))
}

function createStudioEnvironment(renderer) {
  const pmremGenerator = new THREE.PMREMGenerator(renderer)
  pmremGenerator.compileEquirectangularShader()

  const canvas = document.createElement('canvas')
  canvas.width = 512
  canvas.height = 256
  const ctx = canvas.getContext('2d')

  // Smooth multi-stop studio gradient
  const grad = ctx.createLinearGradient(0, 0, 0, 256)
  grad.addColorStop(0, '#ffffff')
  grad.addColorStop(0.28, '#f7f4ee')
  grad.addColorStop(0.62, '#e5e0d6')
  grad.addColorStop(1, '#c8c2b5')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, 512, 256)

  // Primary overhead softbox
  ctx.fillStyle = 'rgba(255, 255, 255, 0.95)'
  ctx.beginPath()
  ctx.ellipse(170, 70, 110, 50, 0, 0, Math.PI * 2)
  ctx.fill()

  // Warm lateral softbox
  ctx.fillStyle = 'rgba(255, 246, 230, 0.72)'
  ctx.beginPath()
  ctx.ellipse(400, 110, 80, 42, 0, 0, Math.PI * 2)
  ctx.fill()

  // Gentle bottom warm floor bounce
  ctx.fillStyle = 'rgba(240, 232, 218, 0.5)'
  ctx.beginPath()
  ctx.ellipse(256, 230, 200, 35, 0, 0, Math.PI * 2)
  ctx.fill()

  const texture = new THREE.CanvasTexture(canvas)
  texture.mapping = THREE.EquirectangularReflectionMapping
  const envMap = pmremGenerator.fromEquirectangular(texture).texture
  texture.dispose()
  pmremGenerator.dispose()
  return envMap
}

/**
 * Authentic High-Resolution Bark Texture:
 * Draws genuine longitudinal fibrous striations running along the length of the vine
 * with undulating bark furrows, weathered grain, and crevice lichen.
 */
function createPhotorealisticBarkTextures() {
  const size = 512
  const canvasDiffuse = document.createElement('canvas')
  canvasDiffuse.width = size
  canvasDiffuse.height = size
  const ctxD = canvasDiffuse.getContext('2d')

  const canvasBump = document.createElement('canvas')
  canvasBump.width = size
  canvasBump.height = size
  const ctxB = canvasBump.getContext('2d')

  if (!ctxD || !ctxB) return { diffuse: null, bump: null }

  // 1. Base deep dark brown aged hardwood
  ctxD.fillStyle = '#170e08'
  ctxD.fillRect(0, 0, size, size)

  ctxB.fillStyle = '#808080'
  ctxB.fillRect(0, 0, size, size)

  // 2. Primary Longitudinal Bark Furrows (sinuous vertical grooves running along vine length)
  const numFurrows = 60
  for (let i = 0; i < numFurrows; i++) {
    const baseX = (i / numFurrows) * size
    const phase = Math.random() * Math.PI * 2
    const freq = 0.008 + Math.random() * 0.012
    const amp = 6 + Math.random() * 10

    ctxD.beginPath()
    ctxB.beginPath()

    for (let y = 0; y <= size; y += 16) {
      const offsetX = Math.sin(y * freq + phase) * amp + Math.sin(y * freq * 2.3) * (amp * 0.35)
      const x = (baseX + offsetX + size) % size
      if (y === 0) {
        ctxD.moveTo(x, y)
        ctxB.moveTo(x, y)
      } else {
        ctxD.lineTo(x, y)
        ctxB.lineTo(x, y)
      }
    }

    const depth = Math.random()
    if (depth > 0.65) {
      // Deep furrow (dark crevice)
      ctxD.lineWidth = Math.random() * 3.0 + 1.8
      ctxD.strokeStyle = 'rgba(8, 5, 3, 0.85)'
      ctxD.stroke()

      ctxB.lineWidth = ctxD.lineWidth
      ctxB.strokeStyle = 'rgba(40, 40, 40, 0.8)'
      ctxB.stroke()
    } else {
      // Raised fibrous ridge (warm timber highlight)
      ctxD.lineWidth = Math.random() * 2.2 + 1.0
      ctxD.strokeStyle = 'rgba(52, 34, 20, 0.65)'
      ctxD.stroke()

      ctxB.lineWidth = ctxD.lineWidth
      ctxB.strokeStyle = 'rgba(180, 180, 180, 0.6)'
      ctxB.stroke()
    }
  }

  // 3. Fine secondary fibrous micro-striations
  for (let i = 0; i < 400; i++) {
    const x = Math.random() * size
    const yStart = Math.random() * size
    const length = Math.random() * 120 + 30
    const alpha = Math.random() * 0.4 + 0.1

    ctxD.beginPath()
    ctxD.moveTo(x, yStart)
    ctxD.lineTo(x + (Math.random() - 0.5) * 5, yStart + length)
    ctxD.lineWidth = Math.random() * 1.4 + 0.5
    ctxD.strokeStyle = Math.random() > 0.4 ? `rgba(62, 42, 26, ${alpha})` : `rgba(10, 6, 3, ${alpha})`
    ctxD.stroke()
  }

  // 4. Subtle lichen & weathered moss patches in crevices
  for (let i = 0; i < 140; i++) {
    const x = Math.random() * size
    const y = Math.random() * size
    const r = Math.random() * 2.5 + 1
    ctxD.fillStyle = Math.random() > 0.72 ? 'rgba(56, 72, 42, 0.38)' : 'rgba(10, 7, 4, 0.55)'
    ctxD.beginPath()
    ctxD.arc(x, y, r, 0, Math.PI * 2)
    ctxD.fill()
  }

  const diffuseTex = new THREE.CanvasTexture(canvasDiffuse)
  diffuseTex.wrapS = THREE.RepeatWrapping
  diffuseTex.wrapT = THREE.RepeatWrapping
  diffuseTex.repeat.set(3, 14)

  const bumpTex = new THREE.CanvasTexture(canvasBump)
  bumpTex.wrapS = THREE.RepeatWrapping
  bumpTex.wrapT = THREE.RepeatWrapping
  bumpTex.repeat.set(3, 14)

  return { diffuse: diffuseTex, bump: bumpTex }
}

/**
 * High-Definition Botanical Leaf Textures:
 * - Handcrafted lanceolate Ayurvedic leaf silhouette with natural margin micro-scallops
 * - Rich multi-tier chlorophyll gradient from base petiole to luminous golden-green margins
 * - Ivory midrib and 16 pairs of curving pinnate lateral veins with micro-capillary networks
 * - Dedicated Bump Map for genuine specular vein relief
 */
function createBotanicalLeafTextures() {
  const size = 1024
  const canvasDiffuse = document.createElement('canvas')
  canvasDiffuse.width = size
  canvasDiffuse.height = size
  const ctxD = canvasDiffuse.getContext('2d')

  const canvasBump = document.createElement('canvas')
  canvasBump.width = size
  canvasBump.height = size
  const ctxB = canvasBump.getContext('2d')

  const canvasRough = document.createElement('canvas')
  canvasRough.width = size
  canvasRough.height = size
  const ctxR = canvasRough.getContext('2d')

  if (!ctxD || !ctxB || !ctxR) return { diffuse: null, bump: null, roughness: null }

  ctxD.clearRect(0, 0, size, size)
  ctxB.clearRect(0, 0, size, size)
  ctxR.clearRect(0, 0, size, size)

  const cx = size * 0.5
  const topY = size * 0.035
  const baseY = size * 0.965

  function drawLeafOutline(ctx) {
    ctx.beginPath()
    ctx.moveTo(cx, baseY)
    // Left contour: slender petiole -> graceful wide lamina -> tapering acute tip
    ctx.bezierCurveTo(cx - 28, baseY - 70, cx - 110, baseY - 240, cx - 340, size * 0.60)
    ctx.bezierCurveTo(cx - 480, size * 0.44, cx - 390, size * 0.22, cx - 180, size * 0.12)
    ctx.bezierCurveTo(cx - 80, size * 0.07, cx - 22, topY + 16, cx, topY)
    // Right contour
    ctx.bezierCurveTo(cx + 22, topY + 16, cx + 80, size * 0.07, cx + 180, size * 0.12)
    ctx.bezierCurveTo(cx + 390, size * 0.22, cx + 480, size * 0.44, cx + 340, size * 0.60)
    ctx.bezierCurveTo(cx + 110, baseY - 240, cx + 28, baseY - 70, cx, baseY)
    ctx.closePath()
  }

  // 1. Diffuse Fill: Multi-stop rich chlorophyll gradient with sunlit margins & petiole pulvinus
  ctxD.save()
  drawLeafOutline(ctxD)
  ctxD.clip()

  // Base chlorophyll body
  const grad = ctxD.createRadialGradient(cx, size * 0.42, 35, cx, size * 0.52, size * 0.56)
  grad.addColorStop(0, '#2d733e')    // Active vibrant viridian core
  grad.addColorStop(0.35, '#1e542c') // Deep lush foliage green
  grad.addColorStop(0.72, '#153f20') // Shaded baseline lamina
  grad.addColorStop(0.92, '#336a32') // Translucent margin transition
  grad.addColorStop(1.0, '#5ea84f')  // Sun-kissed golden chartreuse perimeter
  ctxD.fillStyle = grad
  ctxD.fillRect(0, 0, size, size)

  // Pulvinus / petiole attachment warm transition at bottom
  const baseGrad = ctxD.createLinearGradient(0, baseY, 0, baseY - size * 0.18)
  baseGrad.addColorStop(0, 'rgba(110, 148, 72, 0.75)')
  baseGrad.addColorStop(1, 'rgba(110, 148, 72, 0.0)')
  ctxD.fillStyle = baseGrad
  ctxD.fillRect(0, 0, size, size)

  // 2. Bump & Roughness baseline
  ctxB.save()
  drawLeafOutline(ctxB)
  ctxB.clip()
  ctxB.fillStyle = '#808080'
  ctxB.fillRect(0, 0, size, size)

  ctxR.save()
  drawLeafOutline(ctxR)
  ctxR.clip()
  ctxR.fillStyle = '#4c4c4c' // Waxy cuticle baseline roughness (~0.3)
  ctxR.fillRect(0, 0, size, size)

  // 3. Central Primary Midrib Vascular Canal
  // Soft ambient occlusion drop-shadow flanking midrib
  ctxD.beginPath()
  ctxD.moveTo(cx, baseY)
  ctxD.quadraticCurveTo(cx - 4, size * 0.5, cx, topY)
  ctxD.lineWidth = 36
  ctxD.strokeStyle = 'rgba(8, 28, 12, 0.42)'
  ctxD.lineCap = 'round'
  ctxD.stroke()

  // Ivory-lime vascular core
  ctxD.beginPath()
  ctxD.moveTo(cx, baseY)
  ctxD.quadraticCurveTo(cx - 4, size * 0.5, cx, topY)
  ctxD.lineWidth = 22
  ctxD.strokeStyle = '#8fb870'
  ctxD.lineCap = 'round'
  ctxD.stroke()

  // Fine specular midrib ridge highlight
  ctxD.lineWidth = 8
  ctxD.strokeStyle = '#cff2b6'
  ctxD.stroke()

  // Midrib in Bump
  ctxB.beginPath()
  ctxB.moveTo(cx, baseY)
  ctxB.quadraticCurveTo(cx - 4, size * 0.5, cx, topY)
  ctxB.lineWidth = 28
  ctxB.strokeStyle = '#ffffff'
  ctxB.lineCap = 'round'
  ctxB.stroke()

  // Midrib in Roughness (slightly more matte/tactile)
  ctxR.beginPath()
  ctxR.moveTo(cx, baseY)
  ctxR.quadraticCurveTo(cx - 4, size * 0.5, cx, topY)
  ctxR.lineWidth = 26
  ctxR.strokeStyle = '#757575'
  ctxR.lineCap = 'round'
  ctxR.stroke()

  // 4. Secondary Lateral Pinnate Veins (18 pairs, brochidodromous loops)
  const numPairs = 18
  for (let i = 0; i < numPairs; i++) {
    const t = 0.08 + (i / numPairs) * 0.86
    const startY = baseY - t * (baseY - topY)
    const span = Math.sin(t * Math.PI) * 420 + 25
    const arch = startY - span * 0.24

    const taper = 1 - t * 0.52
    const dWidth = Math.max(1.8, 8.5 * taper)
    const bWidth = Math.max(2.4, 10.5 * taper)

    // Right lateral vein
    // Subtle shadow flank
    ctxD.beginPath()
    ctxD.moveTo(cx, startY + 2)
    ctxD.quadraticCurveTo(cx + span * 0.48, arch + 12, cx + span * 0.94, arch - 16)
    ctxD.lineWidth = dWidth + 3
    ctxD.strokeStyle = 'rgba(10, 32, 14, 0.28)'
    ctxD.stroke()

    // Light vascular highlight
    ctxD.beginPath()
    ctxD.moveTo(cx, startY)
    ctxD.quadraticCurveTo(cx + span * 0.48, arch + 8, cx + span * 0.94, arch - 18)
    ctxD.lineWidth = dWidth
    ctxD.strokeStyle = 'rgba(175, 222, 148, 0.88)'
    ctxD.stroke()

    ctxB.beginPath()
    ctxB.moveTo(cx, startY)
    ctxB.quadraticCurveTo(cx + span * 0.48, arch + 8, cx + span * 0.94, arch - 18)
    ctxB.lineWidth = bWidth
    ctxB.strokeStyle = 'rgba(235, 235, 235, 0.82)'
    ctxB.stroke()

    // Left lateral vein (slightly offset along Y for biological alternation)
    const leftStartY = startY + (Math.sin(i * 3.3) * 14)
    const leftArch = leftStartY - span * 0.24

    // Left shadow flank
    ctxD.beginPath()
    ctxD.moveTo(cx, leftStartY + 2)
    ctxD.quadraticCurveTo(cx - span * 0.48, leftArch + 12, cx - span * 0.94, leftArch - 16)
    ctxD.lineWidth = dWidth + 3
    ctxD.strokeStyle = 'rgba(10, 32, 14, 0.28)'
    ctxD.stroke()

    // Left light vascular highlight
    ctxD.beginPath()
    ctxD.moveTo(cx, leftStartY)
    ctxD.quadraticCurveTo(cx - span * 0.48, leftArch + 8, cx - span * 0.94, leftArch - 18)
    ctxD.lineWidth = dWidth
    ctxD.strokeStyle = 'rgba(175, 222, 148, 0.88)'
    ctxD.stroke()

    ctxB.beginPath()
    ctxB.moveTo(cx, leftStartY)
    ctxB.quadraticCurveTo(cx - span * 0.48, leftArch + 8, cx - span * 0.94, leftArch - 18)
    ctxB.lineWidth = bWidth
    ctxB.strokeStyle = 'rgba(235, 235, 235, 0.82)'
    ctxB.stroke()

    // 5. Tertiary Reticulate Anastomoses (Connecting micro-capillary network)
    for (let m = 0; m < 5; m++) {
      const frac = 0.2 + m * 0.16
      const rx = cx + span * frac
      const ry = startY - span * 0.16 * frac
      ctxD.beginPath()
      ctxD.moveTo(rx, ry)
      ctxD.lineTo(rx + 18, ry - 24)
      ctxD.lineWidth = 1.4
      ctxD.strokeStyle = 'rgba(150, 205, 130, 0.42)'
      ctxD.stroke()

      ctxB.beginPath()
      ctxB.moveTo(rx, ry)
      ctxB.lineTo(rx + 18, ry - 24)
      ctxB.lineWidth = 1.6
      ctxB.strokeStyle = 'rgba(180, 180, 180, 0.4)'
      ctxB.stroke()

      const lx = cx - span * frac
      const ly = leftStartY - span * 0.16 * frac
      ctxD.beginPath()
      ctxD.moveTo(lx, ly)
      ctxD.lineTo(lx - 18, ly - 24)
      ctxD.lineWidth = 1.4
      ctxD.strokeStyle = 'rgba(150, 205, 130, 0.42)'
      ctxD.stroke()

      ctxB.beginPath()
      ctxB.moveTo(lx, ly)
      ctxB.lineTo(lx - 18, ly - 24)
      ctxB.lineWidth = 1.6
      ctxB.strokeStyle = 'rgba(180, 180, 180, 0.4)'
      ctxB.stroke()
    }
  }

  // 6. Micro-Cellular Cuticle Mottle (Simulates epidermal stomata & wax platelets)
  for (let p = 0; p < 800; p++) {
    const px = Math.random() * size
    const py = Math.random() * size
    const pr = Math.random() * 2.8 + 0.8
    ctxD.fillStyle = Math.random() > 0.5 ? 'rgba(70, 150, 85, 0.14)' : 'rgba(12, 42, 18, 0.18)'
    ctxD.beginPath()
    ctxD.arc(px, py, pr, 0, Math.PI * 2)
    ctxD.fill()
  }

  // 7. Golden translucent margin edge line
  drawLeafOutline(ctxD)
  ctxD.lineWidth = 3
  ctxD.strokeStyle = 'rgba(175, 230, 135, 0.45)'
  ctxD.stroke()

  ctxD.restore()
  ctxB.restore()
  ctxR.restore()

  const diffuseTex = new THREE.CanvasTexture(canvasDiffuse)
  const bumpTex = new THREE.CanvasTexture(canvasBump)
  const roughTex = new THREE.CanvasTexture(canvasRough)

  return { diffuse: diffuseTex, bump: bumpTex, roughness: roughTex }
}

/**
 * Subtle contact floor shadow texture
 */
function createGroundShadowTexture() {
  const canvas = document.createElement('canvas')
  canvas.width = 512
  canvas.height = 512
  const ctx = canvas.getContext('2d')
  if (!ctx) return null

  ctx.clearRect(0, 0, 512, 512)
  const grad = ctx.createRadialGradient(256, 256, 10, 256, 256, 210)
  grad.addColorStop(0, 'rgba(25, 20, 15, 0.22)')
  grad.addColorStop(0.35, 'rgba(40, 34, 28, 0.11)')
  grad.addColorStop(0.7, 'rgba(60, 52, 45, 0.03)')
  grad.addColorStop(1, 'rgba(255, 255, 255, 0)')

  ctx.fillStyle = grad
  ctx.beginPath()
  ctx.arc(256, 256, 230, 0, Math.PI * 2)
  ctx.fill()

  return new THREE.CanvasTexture(canvas)
}

/**
 * Organic Tube Geometry with natural biological girth variations and nodal swells
 */
function createOrganicTubeGeometry(path, tubularSegments, radius, radialSegments, seed = 0) {
  const geometry = new THREE.TubeGeometry(path, tubularSegments, radius, radialSegments, false)
  const positions = geometry.attributes.position
  const ringSize = radialSegments + 1
  const center = new THREE.Vector3()
  const vertex = new THREE.Vector3()

  for (let ring = 0; ring <= tubularSegments; ring++) {
    const u = ring / tubularSegments
    // Organic swelling: thicker near root, subtle undulating girth variations
    const taper = 1.05 - u * 0.1
    const swell = Math.sin(u * Math.PI * 8.0 + seed) * 0.05 + Math.sin(u * Math.PI * 18.0 + seed * 1.5) * 0.02
    const variation = taper + swell
    center.copy(path.getPointAt(u))

    for (let side = 0; side < ringSize; side++) {
      const index = ring * ringSize + side
      vertex.fromBufferAttribute(positions, index).sub(center).multiplyScalar(variation).add(center)
      positions.setXYZ(index, vertex.x, vertex.y, vertex.z)
    }
  }

  positions.needsUpdate = true
  geometry.computeVertexNormals()
  return geometry
}

/**
 * Creates anatomically curved 3D leaf blades with natural variety:
 * Generates distinct posture variations (arch, wave, twist) so leaves do NOT look cloned!
 */
function createCurvedLeafGeometry(variationType = 0) {
  const segmentsX = 22
  const segmentsY = 30
  const geometry = new THREE.PlaneGeometry(0.96, 1.76, segmentsX, segmentsY)
  const pos = geometry.attributes.position

  for (let i = 0; i < pos.count; i++) {
    const originalX = pos.getX(i)
    const y = pos.getY(i) // -0.88 to +0.88

    const t = (y + 0.88) / 1.76 // 0 (stem) to 1 (tip)

    // Natural botanical contouring: expands in lower-middle third, tapers to acute tip
    const side = Math.sign(originalX) || 1
    const widthProfile = Math.pow(Math.sin(Math.PI * Math.pow(t, 0.86)), 0.62)
    const asymmetry = side < 0 ? 0.96 + t * 0.03 : 1.02 - t * 0.02
    const x = originalX * widthProfile * asymmetry
    pos.setX(i, x)

    // 1. Anatomical central midrib fold (deep graceful V-crease)
    const distFromCenter = Math.abs(x)
    const foldZ = -Math.sin(Math.min(distFromCenter * 3.6, Math.PI * 0.5)) * 0.092

    // 2. Intercostal bullate quilting (leaf tissue puffing between secondary lateral veins)
    const quiltFreq = 18.0
    const quiltWave = Math.sin(t * Math.PI * quiltFreq)
    const quiltPuff = Math.max(0, quiltWave) * Math.sin(Math.min(distFromCenter * 3.2, Math.PI)) * 0.024 * Math.sin(t * Math.PI)

    // 3. Delicate wavy margin ripple
    const marginDist = Math.max(0, (distFromCenter - 0.18) / 0.3)
    const marginRuffle = Math.sin(t * Math.PI * 20.0 + side * 1.5) * 0.015 * Math.pow(marginDist, 1.4)

    // 4. Natural gravitational droop, longitudinal arch & tip recurve
    let droopZ = -Math.pow(t, 2.15) * 0.27
    let twistZ = Math.sin(t * Math.PI * 1.1) * x * 0.08
    let tipRecurve = Math.pow(Math.max(0, t - 0.72) / 0.28, 2.0) * -0.065

    if (variationType === 1) {
      droopZ = -Math.pow(t, 2.35) * 0.33
      twistZ = -Math.sin(t * Math.PI * 1.25) * x * 0.09
      tipRecurve = Math.pow(Math.max(0, t - 0.68) / 0.32, 2.0) * -0.08
    } else if (variationType === 2) {
      droopZ = -Math.pow(t, 1.95) * 0.23
      twistZ = Math.cos(t * Math.PI * 0.95) * x * 0.07
      tipRecurve = Math.pow(Math.max(0, t - 0.75) / 0.25, 2.0) * -0.05
    }

    pos.setZ(i, foldZ + quiltPuff + marginRuffle + droopZ + twistZ + tipRecurve)
  }

  geometry.computeVertexNormals()
  return geometry
}

/**
 * Main Botanical DNA Helix Visual Controller
 */
export async function initBotanicalDNA(container) {
  let width = container.clientWidth || window.innerWidth
  let height = container.clientHeight || window.innerHeight

  // 1. Scene & Renderer setup
  const scene = new THREE.Scene()
  scene.background = new THREE.Color('#ffffff')

  // Refined camera: framed cleanly with generous horizontal breathing room for text
  const camera = new THREE.PerspectiveCamera(32, width / height, 0.1, 100)
  camera.position.set(0, 0.1, 15.8)

  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: false,
    powerPreference: 'high-performance',
  })
  renderer.setSize(width, height)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.02
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFShadowMap

  container.innerHTML = ''
  container.appendChild(renderer.domElement)

  // WebGL context allocation and the PMREM pass are intentionally isolated from texture work.
  await yieldToBrowser()

  // 2. Physical Studio Environment Map for Specular Reflections
  const studioEnvMap = createStudioEnvironment(renderer)
  scene.environment = studioEnvMap

  await yieldToBrowser()

  // 3. Balanced Museum Gallery Lighting (White Studio Photography Feel)
  const ambientLight = new THREE.AmbientLight(0xfdfbf7, 0.34)
  scene.add(ambientLight)

  // Key directional sunlight casting soft contact shadows
  const keyLight = new THREE.DirectionalLight(0xfff7ec, 2.35)
  keyLight.position.set(5.0, 8.5, 7.5)
  keyLight.castShadow = true
  keyLight.shadow.mapSize.width = 1024
  keyLight.shadow.mapSize.height = 1024
  keyLight.shadow.camera.near = 0.5
  keyLight.shadow.camera.far = 32
  keyLight.shadow.camera.left = -4
  keyLight.shadow.camera.right = 4
  keyLight.shadow.camera.top = 8
  keyLight.shadow.camera.bottom = -8
  keyLight.shadow.bias = -0.00015
  keyLight.shadow.normalBias = 0.018
  keyLight.shadow.radius = 3.2
  scene.add(keyLight)

  // Warm golden backlight illuminating translucent leaf edges and liana contours
  const rimLight = new THREE.DirectionalLight(0xffedd4, 2.1)
  rimLight.position.set(-1.5, 5, -8.5)
  scene.add(rimLight)

  // Soft cool neutral fill bounce for rich shadow depth
  const fillLight = new THREE.DirectionalLight(0xe4eef6, 0.45)
  fillLight.position.set(-6, -2.5, 5.5)
  scene.add(fillLight)

  // 4. Ground Contact Shadow Plane
  const shadowGeo = new THREE.PlaneGeometry(9, 9)
  const shadowTex = createGroundShadowTexture()
  const shadowMat = new THREE.MeshBasicMaterial({
    map: shadowTex,
    transparent: true,
    opacity: 0.72,
    depthWrite: false,
  })
  const groundShadow = new THREE.Mesh(shadowGeo, shadowMat)
  groundShadow.rotation.x = -Math.PI / 2
  groundShadow.position.y = -5.4
  scene.add(groundShadow)

  // 5. Photorealistic Textures & Materials
  const barkTextures = createPhotorealisticBarkTextures()
  await yieldToBrowser()
  const leafTextures = createBotanicalLeafTextures()

  await yieldToBrowser()

  // Primary Helical Vine Backbone (Aged deep dark brown bark)
  const barkMaterial = new THREE.MeshStandardMaterial({
    map: barkTextures.diffuse,
    color: 0x1f140c,
    bumpMap: barkTextures.bump,
    bumpScale: 0.045,
    roughness: 0.65,
    metalness: 0.0,
    envMapIntensity: 0.45,
  })

  // Secondary Clinging Tendril (Deep dark brown)
  const secondaryTendrilMaterial = new THREE.MeshStandardMaterial({
    map: barkTextures.diffuse,
    color: 0x150d07,
    bumpMap: barkTextures.bump,
    bumpScale: 0.035,
    roughness: 0.76,
    metalness: 0.0,
    envMapIntensity: 0.32,
  })

  // High-End Molecular Nucleotide Bars (Polished deep dark brown timber plates)
  const nucleotideMaterialA = new THREE.MeshStandardMaterial({
    color: 0x24170e,
    roughness: 0.38,
    metalness: 0.05,
    envMapIntensity: 0.65,
  })

  const nucleotideMaterialB = new THREE.MeshStandardMaterial({
    color: 0x2b1c11,
    roughness: 0.35,
    metalness: 0.05,
    envMapIntensity: 0.65,
  })

  // Refined Hydrogen Bond Pins (Polished Antique Gold / Burnished Brass)
  const hydrogenBondMaterial = new THREE.MeshStandardMaterial({
    color: 0xd4a742,
    roughness: 0.22,
    metalness: 0.88,
    envMapIntensity: 0.85,
  })

  // Subtle Botanical Amber Crystal at Center Junction
  const amberCrystalMaterial = new THREE.MeshStandardMaterial({
    color: 0xc46424,
    roughness: 0.22,
    metalness: 0.12,
    envMapIntensity: 0.78,
  })

  // Petiole Stem Material (Botanical sap green stalk with woody base)
  const petioleMaterial = new THREE.MeshStandardMaterial({
    color: 0x2e421d,
    roughness: 0.48,
    metalness: 0.0,
    envMapIntensity: 0.35,
  })

  // Flared Junction Collar where rungs merge into helical vines
  const rungCollarMaterial = new THREE.MeshStandardMaterial({
    color: 0x1c1109,
    roughness: 0.6,
    metalness: 0.0,
    envMapIntensity: 0.35,
  })

  // Photorealistic Physical Leaf Material (Waxy Cuticle, Clearcoat & Epicuticular Sheen)
  const createLeafMaterial = (color) =>
    new THREE.MeshPhysicalMaterial({
      map: leafTextures.diffuse,
      bumpMap: leafTextures.bump,
      roughnessMap: leafTextures.roughness,
      color,
      bumpScale: 0.056,
      roughness: 0.32,
      metalness: 0.0,
      clearcoat: 0.32,
      clearcoatRoughness: 0.26,
      sheen: 0.82,
      sheenColor: new THREE.Color(0xb2e298),
      sheenRoughness: 0.35,
      alphaTest: 0.15, // Clean organic leaf outline with zero polygon clipping
      envMapIntensity: 0.65,
      side: THREE.DoubleSide,
      shadowSide: THREE.DoubleSide,
    })

  // Multi-tier natural botanical leaf color varieties
  const leafMaterials = [
    createLeafMaterial(0x4a7a40), // Mature deep forest Tulsi/Neem
    createLeafMaterial(0x3e7238), // Rich jade chlorophyll
    createLeafMaterial(0x5e8c45), // Young tender shoot
  ]

  // Multiple leaf curvature geometries to eliminate procedural clone look
  const leafGeometries = [
    createCurvedLeafGeometry(0),
    createCurvedLeafGeometry(1),
    createCurvedLeafGeometry(2),
  ]

  await yieldToBrowser()

  // 6. Build Botanical DNA Helix Structure
  const helixGroup = new THREE.Group()
  scene.add(helixGroup)

  // SLEEK SLENDER DIMENSIONS: Preserves spacious clearance for surrounding text
  const HELIX_HEIGHT = 10.8
  const HELIX_RADIUS = 1.32
  const HELIX_TURNS = 2.2
  const NUM_POINTS = 180

  function generateVinePath(phaseOffset, radialWiggle) {
    const points = []
    for (let i = 0; i <= NUM_POINTS; i++) {
      const t = i / NUM_POINTS
      const angle = t * Math.PI * 2 * HELIX_TURNS + phaseOffset
      const y = (t - 0.5) * HELIX_HEIGHT

      const radiusWobble = Math.sin(t * Math.PI * 7 + phaseOffset) * 0.05 + radialWiggle
      const r = HELIX_RADIUS + radiusWobble

      const x = Math.cos(angle) * r
      const z = Math.sin(angle) * r

      const swayX = Math.sin(t * Math.PI * 2.2) * 0.07
      const swayZ = Math.cos(t * Math.PI * 1.8) * 0.05

      points.push(new THREE.Vector3(x + swayX, y, z + swayZ))
    }
    return new THREE.CatmullRomCurve3(points)
  }

  // --- Strand A & Strand B (Primary Antiparallel Helical Vines with Organic Girth) ---
  const pathA = generateVinePath(0, 0)
  const pathB = generateVinePath(Math.PI, 0)

  const vineGeoA = createOrganicTubeGeometry(pathA, 120, 0.082, 10, 0.4)
  const vineGeoB = createOrganicTubeGeometry(pathB, 120, 0.082, 10, 2.3)

  const vineMeshA = new THREE.Mesh(vineGeoA, barkMaterial)
  const vineMeshB = new THREE.Mesh(vineGeoB, barkMaterial)
  vineMeshA.castShadow = true
  vineMeshA.receiveShadow = true
  vineMeshB.castShadow = true
  vineMeshB.receiveShadow = true
  helixGroup.add(vineMeshA)
  helixGroup.add(vineMeshB)

  await yieldToBrowser()

  // --- Delicate Micro-Tendrils wrapping each strand tightly ---
  function generateMicroTendrilPath(basePath, phaseOffset, frequency, amplitude) {
    const points = []
    const sampleCount = 90
    for (let i = 0; i <= sampleCount; i++) {
      const u = i / sampleCount
      const basePoint = basePath.getPointAt(u)
      const tangent = basePath.getTangentAt(u)

      const up = new THREE.Vector3(0, 1, 0)
      const normal = new THREE.Vector3().crossVectors(tangent, up).normalize()
      const binormal = new THREE.Vector3().crossVectors(tangent, normal).normalize()

      const spiralAngle = u * Math.PI * 2 * frequency + phaseOffset
      const offsetX = normal.clone().multiplyScalar(Math.cos(spiralAngle) * amplitude)
      const offsetZ = binormal.clone().multiplyScalar(Math.sin(spiralAngle) * amplitude)

      points.push(basePoint.clone().add(offsetX).add(offsetZ))
    }
    return new THREE.CatmullRomCurve3(points)
  }

  const tendrilA = new THREE.Mesh(
    createOrganicTubeGeometry(generateMicroTendrilPath(pathA, 0, 15, 0.10), 90, 0.016, 6, 0.8),
    secondaryTendrilMaterial
  )
  const tendrilB = new THREE.Mesh(
    createOrganicTubeGeometry(generateMicroTendrilPath(pathB, Math.PI * 0.5, 15, 0.10), 90, 0.016, 6, 2.1),
    secondaryTendrilMaterial
  )
  tendrilA.castShadow = true
  tendrilB.castShadow = true
  helixGroup.add(tendrilA)
  helixGroup.add(tendrilB)

  // --- REALISTIC NUCLEOTIDE BASE PAIR RUNGS (AUTHENTIC BIO-MOLECULAR SCULPTURE) ---
  const NUM_RUNGS = 24
  const pinGeometry = new THREE.CylinderGeometry(0.010, 0.010, 0.18, 8)
  const junctionGeo = new THREE.CylinderGeometry(0.020, 0.020, 0.05, 8)
  const collarGeo = new THREE.CylinderGeometry(0.045, 0.065, 0.08, 8)

  const dummy = new THREE.Object3D()

  // High-performance instanced batches: eliminates hundreds of draw calls per frame
  const totalCollars = (NUM_RUNGS - 1) * 2
  const collarInstancedMesh = new THREE.InstancedMesh(collarGeo, rungCollarMaterial, totalCollars)
  let collarIdx = 0

  let totalPins = 0
  for (let r = 1; r < NUM_RUNGS; r++) {
    totalPins += (r % 2 === 0 ? 3 : 2)
  }
  const pinInstancedMesh = new THREE.InstancedMesh(pinGeometry, hydrogenBondMaterial, totalPins)
  let pinIdx = 0

  const junctionInstancedMesh = new THREE.InstancedMesh(junctionGeo, amberCrystalMaterial, NUM_RUNGS - 1)
  let junctionIdx = 0

  for (let r = 1; r < NUM_RUNGS; r++) {
    const u = r / NUM_RUNGS
    const posA = pathA.getPointAt(u)
    const posB = pathB.getPointAt(u)

    const rungVector = new THREE.Vector3().subVectors(posB, posA)
    const rungDir = rungVector.clone().normalize()

    // Central midpoint with subtle biological arch
    const mid = new THREE.Vector3().addVectors(posA, posB).multiplyScalar(0.5)
    const arch = (Math.sin(u * Math.PI * 5) * 0.05) - 0.02
    mid.y += arch

    // Arm A: Purine nucleotide plate reaching from posA towards center
    const armAEnd = mid.clone().sub(rungDir.clone().multiplyScalar(0.11))
    const curveA = new THREE.CatmullRomCurve3([posA, armAEnd])
    const armGeoA = createOrganicTubeGeometry(curveA, 8, 0.028, 8, r * 0.7)
    const armMeshA = new THREE.Mesh(armGeoA, nucleotideMaterialA)
    helixGroup.add(armMeshA)

    // Arm B: Pyrimidine nucleotide plate reaching from posB towards center
    const armBEnd = mid.clone().add(rungDir.clone().multiplyScalar(0.11))
    const curveB = new THREE.CatmullRomCurve3([posB, armBEnd])
    const armGeoB = createOrganicTubeGeometry(curveB, 8, 0.028, 8, r * 0.7 + 1.2)
    const armMeshB = new THREE.Mesh(armGeoB, nucleotideMaterialB)
    helixGroup.add(armMeshB)

    // Flared attachment collars (instanced)
    dummy.position.copy(posA)
    dummy.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), rungDir)
    dummy.scale.set(1, 1, 1)
    dummy.updateMatrix()
    collarInstancedMesh.setMatrixAt(collarIdx++, dummy.matrix)

    dummy.position.copy(posB)
    dummy.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), rungDir.clone().negate())
    dummy.scale.set(1, 1, 1)
    dummy.updateMatrix()
    collarInstancedMesh.setMatrixAt(collarIdx++, dummy.matrix)

    // Hydrogen Bond Pins (instanced)
    const isTripleBond = r % 2 === 0
    const bondOffsets = isTripleBond ? [-0.028, 0, 0.028] : [-0.018, 0.018]
    const perpUp = new THREE.Vector3(0, 1, 0)
    const pinNormal = new THREE.Vector3().crossVectors(rungDir, perpUp).normalize()

    bondOffsets.forEach((offset) => {
      const pinPos = mid.clone().add(pinNormal.clone().multiplyScalar(offset))
      dummy.position.copy(pinPos)
      dummy.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), rungDir)
      dummy.scale.set(1, 1, 1)
      dummy.updateMatrix()
      pinInstancedMesh.setMatrixAt(pinIdx++, dummy.matrix)
    })

    // Amber junction crystal node (instanced)
    dummy.position.copy(mid)
    dummy.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), rungDir)
    dummy.scale.set(1, 1, 1)
    dummy.updateMatrix()
    junctionInstancedMesh.setMatrixAt(junctionIdx++, dummy.matrix)

    if (r % 6 === 0) await yieldToBrowser()
  }

  collarInstancedMesh.instanceMatrix.needsUpdate = true
  helixGroup.add(collarInstancedMesh)

  pinInstancedMesh.instanceMatrix.needsUpdate = true
  helixGroup.add(pinInstancedMesh)

  junctionInstancedMesh.instanceMatrix.needsUpdate = true
  helixGroup.add(junctionInstancedMesh)

  // --- REFINED BOTANICAL FOLIAGE (14 Graceful Leaves with Realistic Petioles - Instanced) ---
  const NUM_LEAF_CLUSTERS = 14
  const TOTAL_LEAVES = NUM_LEAF_CLUSTERS * 2

  const basePetioleGeo = new THREE.CylinderGeometry(0.015, 0.026, 1, 8)
  const petioleInstancedMesh = new THREE.InstancedMesh(basePetioleGeo, petioleMaterial, TOTAL_LEAVES)
  let petioleIdx = 0

  function addPetiole(start, end) {
    const vector = new THREE.Vector3().subVectors(end, start)
    const length = vector.length()
    const midPoint = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5)
    dummy.position.copy(midPoint)
    dummy.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), vector.clone().normalize())
    dummy.scale.set(1, length, 1)
    dummy.updateMatrix()
    petioleInstancedMesh.setMatrixAt(petioleIdx++, dummy.matrix)
  }

  // Exact leaf variant counts across pathA (offset 0) and pathB (offset 1):
  // Var 0: 9 instances, Var 1: 10 instances, Var 2: 9 instances
  const leafInstancedMeshes = [
    new THREE.InstancedMesh(leafGeometries[0], leafMaterials[0], 9),
    new THREE.InstancedMesh(leafGeometries[1], leafMaterials[1], 10),
    new THREE.InstancedMesh(leafGeometries[2], leafMaterials[2], 9),
  ]
  const leafIdxPerVariant = [0, 0, 0]

  leafInstancedMeshes.forEach((lim) => {
    lim.castShadow = true
    lim.receiveShadow = true
    helixGroup.add(lim)
  })

  function addLeavesAlongPath(path, materialOffset) {
    for (let i = 0; i < NUM_LEAF_CLUSTERS; i++) {
      const u = 0.12 + (i / NUM_LEAF_CLUSTERS) * 0.76
      const basePos = path.getPointAt(u)

      const outward = new THREE.Vector3(basePos.x, 0, basePos.z).normalize()

      const variantIndex = (i + materialOffset) % 3

      const heightScale = Math.sin(u * Math.PI) * 0.20 + 0.80
      const scale = (0.60 + Math.sin((i + 1) * 8.17 + materialOffset) * 0.045) * heightScale

      const sideAngle = (i % 2 === 0 ? 0.32 : -0.32)
      const leafDirection = outward.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), sideAngle)
      leafDirection.y += Math.sin((i + 1) * 4.13 + materialOffset) * 0.12 - 0.03
      leafDirection.normalize()

      const petioleEnd = basePos.clone().add(outward.clone().multiplyScalar(0.11))
      const leafPos = petioleEnd.clone().add(leafDirection.clone().multiplyScalar(0.825 * scale))

      dummy.position.copy(leafPos)
      dummy.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), leafDirection)
      dummy.rotateZ(Math.sin((i + 1) * 6.7 + materialOffset) * 0.12)
      dummy.rotateX(-0.12)
      dummy.scale.set(scale, scale, scale)
      dummy.updateMatrix()

      leafInstancedMeshes[variantIndex].setMatrixAt(leafIdxPerVariant[variantIndex]++, dummy.matrix)

      addPetiole(basePos, petioleEnd)
    }
  }

  addLeavesAlongPath(pathA, 0)
  await yieldToBrowser()
  addLeavesAlongPath(pathB, 1)

  petioleInstancedMesh.instanceMatrix.needsUpdate = true
  helixGroup.add(petioleInstancedMesh)

  leafInstancedMeshes.forEach((lim) => {
    lim.instanceMatrix.needsUpdate = true
  })

  await yieldToBrowser()

  // --- FLOATING BOTANICAL SPORES (Cinematic Atmosphere - Instanced) ---
  const sporeCount = 28
  const sporeGeo = new THREE.SphereGeometry(0.016, 6, 6)
  const sporeMat = new THREE.MeshStandardMaterial({
    color: 0xedd68a,
    roughness: 0.2,
    metalness: 0.6,
    emissive: 0x3a2d0f,
    emissiveIntensity: 0.22,
  })
  const sporesMesh = new THREE.InstancedMesh(sporeGeo, sporeMat, sporeCount)
  helixGroup.add(sporesMesh)

  const sporeData = []
  for (let s = 0; s < sporeCount; s++) {
    const angle = Math.random() * Math.PI * 2
    const radius = 1.0 + Math.random() * 1.6
    const y = (Math.random() - 0.5) * 9.0
    const scale = 0.6 + Math.random() * 0.6
    sporeData.push({
      speed: 0.3 + Math.random() * 0.35,
      driftAngle: Math.random() * Math.PI * 2,
      baseRadius: radius,
      baseY: y,
      scale,
    })
  }

  // Ask Three to prepare programs before the section is visible
  if (renderer.compileAsync) {
    try {
      await renderer.compileAsync(scene, camera)
    } catch {
      // Fallback cleanly
    }
  }

  // Render initial frame immediately so canvas is never blank
  renderer.render(scene, camera)

  // 7. Interactive State & Animation Management
  let scrollProgress = 0
  let targetMouseX = 0
  let targetMouseY = 0
  let currentMouseX = 0
  let currentMouseY = 0
  let isRunning = false
  let animationFrameId = null
  const startTime = performance.now()

  function onMouseMove(e) {
    const rect = container.getBoundingClientRect()
    if (rect.width === 0 || rect.height === 0) return
    const x = ((e.clientX - rect.left) / rect.width) * 2 - 1
    const y = -(((e.clientY - rect.top) / rect.height) * 2 - 1)
    targetMouseX = x * 0.12
    targetMouseY = y * 0.08
  }

  window.addEventListener('mousemove', onMouseMove, { passive: true })

  function onResize() {
    if (!container) return
    width = container.clientWidth || window.innerWidth
    height = container.clientHeight || window.innerHeight
    camera.aspect = width / height
    camera.updateProjectionMatrix()
    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  }

  window.addEventListener('resize', onResize, { passive: true })

  // Exactly one render loop can be active. It is paused when the sticky scene is far away.
  function animate() {
    if (!isRunning) return
    animationFrameId = requestAnimationFrame(animate)

    const elapsedTime = (performance.now() - startTime) * 0.001

    // Smooth mouse lerping
    currentMouseX += (targetMouseX - currentMouseX) * 0.05
    currentMouseY += (targetMouseY - currentMouseY) * 0.05

    // Idle organic rotation
    const idleTurn = elapsedTime * 0.12
    const idleFloat = Math.sin(elapsedTime * 0.75) * 0.06
    const idleSwayX = Math.sin(elapsedTime * 0.45) * 0.02
    const idleSwayZ = Math.cos(elapsedTime * 0.55) * 0.015

    // Scroll-driven rotation
    const scrollTurn = scrollProgress * Math.PI * 2.2

    helixGroup.rotation.y = idleTurn + scrollTurn + currentMouseX
    helixGroup.rotation.x = currentMouseY + idleSwayX
    helixGroup.rotation.z = idleSwayZ - (currentMouseX * 0.15)
    helixGroup.position.y = idleFloat

    // Cinematic camera depth: subtle push into detail as user scrolls
    const targetCamZ = 15.8 - Math.sin(scrollProgress * Math.PI) * 1.1
    camera.position.z += (targetCamZ - camera.position.z) * 0.08
    camera.position.y = 0.1 + (scrollProgress - 0.5) * 0.7
    camera.lookAt(0, 0, 0)

    // Float spores (Instanced update)
    sporeData.forEach((item, idx) => {
      const t = elapsedTime * item.speed + idx
      const py = item.baseY + Math.sin(t * 1.1) * 0.25
      const px = Math.cos(item.driftAngle + t * 0.16) * item.baseRadius
      const pz = Math.sin(item.driftAngle + t * 0.16) * item.baseRadius
      dummy.position.set(px, py, pz)
      dummy.quaternion.set(0, 0, 0, 1)
      dummy.scale.setScalar(item.scale)
      dummy.updateMatrix()
      sporesMesh.setMatrixAt(idx, dummy.matrix)
    })
    sporesMesh.instanceMatrix.needsUpdate = true

    groundShadow.scale.setScalar(1 + idleFloat * 0.035)

    renderer.render(scene, camera)
  }

  function setActive(active) {
    if (active === isRunning) return
    isRunning = active
    if (isRunning) {
      animate()
    } else if (animationFrameId) {
      cancelAnimationFrame(animationFrameId)
      animationFrameId = null
    }
  }

  // Return control interface for React component
  return {
    setScrollProgress(progress) {
      scrollProgress = Math.max(0, Math.min(1, progress))
    },
    setActive,
    destroy() {
      isRunning = false
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId)
      }
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('resize', onResize)

      scene.traverse((child) => {
        if (child.geometry) child.geometry.dispose()
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach((m) => m.dispose())
          } else {
            child.material.dispose()
          }
        }
      })

      if (barkTextures.diffuse) barkTextures.diffuse.dispose()
      if (barkTextures.bump) barkTextures.bump.dispose()
      if (leafTextures.diffuse) leafTextures.diffuse.dispose()
      if (leafTextures.bump) leafTextures.bump.dispose()
      if (shadowTex) shadowTex.dispose()
      if (studioEnvMap) studioEnvMap.dispose()
      renderer.dispose()

      if (renderer.domElement && renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement)
      }
    },
  }
}
