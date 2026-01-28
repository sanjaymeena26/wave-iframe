import * as React from "react"
import { Canvas, useFrame, extend } from "@react-three/fiber"
import { shaderMaterial, useTexture, useAspect } from "@react-three/drei"
import * as THREE from "three"

const vertexShader = `
  uniform float uTime;
  uniform float uAmplitude;     // wind strength
  uniform float uWaveLength;    // wind wavelength
  uniform float uGravity;       // sag strength
  uniform float uPin;           // how much of the top is pinned (0..1)

  varying vec2 vUv;

  void main() {
    vUv = uv;

    vec3 pos = position;

    // uv.y: 0 at bottom, 1 at top
    float topMask = smoothstep(1.0 - uPin, 1.0, uv.y); // 0 below, 1 near top
    float free = 1.0 - topMask;                        // 1 below, 0 at top

    // 1) Gravity sag (pull down in Y), strongest away from the top
    // A nice curtain-like sag curve:
    float sag = free * free;
    pos.y -= sag * uGravity;

    // 2) Wind ripples (mostly in Z), also stronger away from the top
    float freq = 6.2831853 / max(uWaveLength, 0.0001);

    // Mix a couple waves so it feels more cloth-y than sine-water
    float w1 = sin((pos.x * freq) + uTime * 1.2);
    float w2 = sin((pos.y * freq * 0.7) + uTime * 0.9);

    float wind = (w1 * 0.7 + w2 * 0.3);

    // Fade wind near the top so pins look stable
    pos.z += wind * uAmplitude * (0.2 + free * 0.8);

    // Optional: tiny sideways flutter
    pos.x += sin(uTime * 0.6 + pos.y * freq) * (uAmplitude * 0.06) * free;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`

const fragmentShader = `
  uniform sampler2D uTexture;
  varying vec2 vUv;

  void main() {
    gl_FragColor = texture2D(uTexture, vUv);
  }
`

const WavyMaterial = shaderMaterial(
  {
    uTime: 0,
    uAmplitude: 0.2,
    uWaveLength: 5.0,
    uGravity: 0.2,
    uPin: 0.1,
    uTexture: new THREE.Texture(),
  },
  vertexShader,
  fragmentShader
)

extend({ WavyMaterial })

function WavyPlane() {
  const zoom = 0.1 // increase to zoom in, decrease to zoom out
  const texture = useTexture("https://iili.io/fi5vbHP.jpg")
  const matRef = React.useRef<any>(null)

  // Wait until the image is actually loaded
  const img = texture.image as HTMLImageElement | undefined
  if (!img || !img.width || !img.height) return null

  // Make plane match the image's aspect ratio (no stretching)
 const scale = useAspect(img.width, img.height, 1.8 * zoom)

  useFrame((_, delta) => {
    if (!matRef.current) return
    matRef.current.uTime += delta * 1.2
  })

  return (
    <mesh scale={scale as any}>
      <planeGeometry args={[1.9, 1.4, 260, 320]} />
      {/* @ts-ignore */}
      <wavyMaterial ref={matRef} uTexture={texture} />
    </mesh>
  )
}

export default function App() {
  return (
    <div style={{ width: "100vw", height: "100vh", background: "#000" }}>
      <Canvas camera={{ position: [0, 0, 2.2], fov: 45 }}>
        <React.Suspense fallback={null}>
          <WavyPlane />
        </React.Suspense>
      </Canvas>
    </div>
  )
}

declare global {
  namespace JSX {
    interface IntrinsicElements {
      wavyMaterial: any
    }
  }
}
