// GLSL for the site's two surface types. Units: the plane geometry is 1×1 and the mesh is
// scaled to the element's CSS size, so `uPlane` is the size in px and z offsets are in px.

const cover = /* glsl */ `
  // object-fit: cover for a texture on a plane, with an extra zoom for parallax headroom.
  vec2 coverUv(vec2 uv, vec2 plane, vec2 image, float zoom) {
    float rp = plane.x / plane.y;
    float ri = image.x / image.y;
    vec2 s = rp > ri ? vec2(1.0, ri / rp) : vec2(rp / ri, 1.0);
    return (uv - 0.5) * s / zoom + 0.5;
  }
`;

// ── Page image: every <GLImage> on the site ─────────────────────────────────

export const imageVertex = /* glsl */ `
  uniform float uTime;
  uniform float uVelocity;
  uniform float uHover;
  uniform vec2 uMouse;
  uniform vec2 uPlane;
  uniform float uReveal;
  uniform float uMotion;

  varying vec2 vUv;
  varying float vRipple;

  const float PI = 3.14159265;

  void main() {
    vUv = uv;
    vec3 p = position;

    // Fabric drag: the middle of the image lags behind its edges while scrolling.
    float bend = sin(uv.x * PI);
    float v = clamp(uVelocity, -80.0, 80.0) * uMotion;
    p.y -= bend * v * 0.9 / uPlane.y;
    p.z += bend * abs(v) * 1.4;

    // Hover: a ripple travels out from the cursor, like a finger pressed into cloth.
    float d = distance(uv, uMouse);
    float ripple = sin(d * 24.0 - uTime * 5.5) * exp(-d * 5.0);
    p.z += ripple * uHover * 16.0 * uMotion;
    vRipple = ripple * uHover;

    // Entrance: the image drops in from the top like a length of cloth unrolling.
    float drop = (1.0 - uReveal) * uMotion;
    p.z += sin(uv.y * PI) * drop * 140.0;
    p.y += (1.0 - uv.y) * drop * 60.0 / uPlane.y;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }
`;

export const imageFragment = /* glsl */ `
  uniform sampler2D uTex;
  uniform sampler2D uTex2;
  uniform vec2 uImage;
  uniform vec2 uImage2;
  uniform vec2 uPlane;
  uniform float uHover;
  uniform float uHasTex2;
  uniform float uReveal;
  uniform float uAlpha;
  uniform float uParallax;
  uniform vec2 uMouse;
  uniform float uSwap;

  varying vec2 vUv;
  varying float vRipple;

  ${cover}

  void main() {
    float zoom = 1.12 + uHover * 0.04;
    vec2 uv = coverUv(vUv, uPlane, uImage, zoom);
    uv.y += uParallax * 0.045;
    vec4 base = texture2D(uTex, uv);

    // Second photo (back view, detail) spreads out from the cursor on hover.
    if (uHasTex2 > 0.5) {
      vec2 uv2 = coverUv(vUv, uPlane, uImage2, zoom);
      uv2.y += uParallax * 0.045;
      vec4 alt = texture2D(uTex2, uv2);
      float radius = uSwap * 1.6;
      float m = 1.0 - smoothstep(radius - 0.25, radius, distance(vUv, uMouse));
      base = mix(base, alt, m * step(0.001, uSwap));
    }

    base.rgb += vRipple * 0.05;

    // Reveal mask: wipes top to bottom with a soft hem.
    float mask = smoothstep(1.0 - vUv.y - 0.08, 1.0 - vUv.y, uReveal * 1.08);
    gl_FragColor = vec4(base.rgb, mask * uAlpha);
    #include <colorspace_fragment>
  }
`;

// ── Hanging garment: rail panels and the product page cloth ─────────────────

export const clothVertex = /* glsl */ `
  uniform float uTime;
  uniform float uWind;
  uniform float uSeed;
  uniform float uSwing;
  uniform vec2 uPlane;
  uniform float uMotion;

  varying vec2 vUv;
  varying vec3 vWorld;

  void main() {
    vUv = uv;
    vec3 p = position;

    // Pinned along the top edge (the hanger), free at the hem.
    float hang = pow(1.0 - uv.y, 1.35);
    float t = uTime * 1.25 + uSeed * 6.2831;

    float folds = sin(uv.x * 5.5 + t) * 0.6 + sin(uv.x * 11.0 - t * 1.6 + uv.y * 3.5) * 0.4;
    p.z += folds * hang * (9.0 + uWind * 46.0) * uMotion;
    p.z += sin(uv.y * 3.2 + t * 0.7) * hang * 10.0 * uMotion;

    // The whole garment swings a little from the hanger.
    p.x += sin(t * 0.55) * hang * (uSwing + uWind * 18.0) * uMotion / uPlane.x;

    vec4 world = modelMatrix * vec4(p, 1.0);
    vWorld = world.xyz;
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

export const clothFragment = /* glsl */ `
  uniform sampler2D uTex;
  uniform sampler2D uTex2;
  uniform vec2 uImage;
  uniform vec2 uImage2;
  uniform vec2 uPlane;
  uniform float uMix;
  uniform float uHasTex;
  uniform float uAlpha;
  uniform vec3 uBase;
  uniform float uDim;

  varying vec2 vUv;
  varying vec3 vWorld;

  ${cover}

  void main() {
    // Flat-shaded folds from screen-space derivatives: no normals to compute on the CPU.
    vec3 n = normalize(cross(dFdx(vWorld), dFdy(vWorld)));
    if (dot(n, cameraPosition - vWorld) < 0.0) n = -n;
    vec3 L = normalize(vec3(-0.35, 0.55, 0.9));
    float light = 0.78 + 0.32 * dot(n, L);

    vec3 color = uBase;
    if (uHasTex > 0.5) {
      vec3 a = texture2D(uTex, coverUv(vUv, uPlane, uImage, 1.0)).rgb;
      vec3 b = texture2D(uTex2, coverUv(vUv, uPlane, uImage2, 1.0)).rgb;
      // Colour change: the new photo flows down the garment from the hanger.
      float s = (1.0 - vUv.y) * 0.8 + vUv.x * 0.2;
      float k = smoothstep(s - 0.12, s + 0.12, uMix * 1.24 - 0.12);
      color = mix(a, b, k);
    }

    color *= light * (1.0 - uDim);
    gl_FragColor = vec4(color, uAlpha);
    #include <colorspace_fragment>
  }
`;
