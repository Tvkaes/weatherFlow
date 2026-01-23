export const rainVertexShader = /* glsl */`
  attribute vec3 aOffset;
  attribute float aRandom;
  attribute float aPhase;

  uniform float uTime;
  uniform float uSpeed;
  uniform float uWind;
  uniform float uStretch;
  uniform vec2 uBounds;

  varying float vGradient;
  varying float vRand;

  void main() {
    float localTime = uTime * (0.8 + aRandom * 0.5) + aPhase * 6.2831;
    float fallSpan = uBounds.y * 2.0;
    float fall = mod(aOffset.y - localTime * uSpeed, fallSpan) - fallSpan * 0.5;

    vec3 dropCenter = vec3(
      aOffset.x + sin(localTime * 0.7 + aRandom * 4.0) * 0.2 + uWind * 0.2,
      fall,
      aOffset.z + cos(localTime * 0.4) * 0.15
    );

    vec3 local = position;
    local.y *= uStretch * (0.8 + aRandom * 0.5);
    local.x *= 0.15;
    local.x += uWind * 0.05;

    vGradient = clamp(local.y * 0.5 + 0.5, 0.0, 1.0);
    vRand = aRandom;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(dropCenter + local, 1.0);
  }
`;

export const rainFragmentShader = /* glsl */`
  precision highp float;

  uniform float uOpacity;
  uniform vec3 uColor;

  varying float vGradient;
  varying float vRand;

  void main() {
    float head = smoothstep(0.0, 0.2, vGradient);
    float tail = smoothstep(1.0, 0.6, vGradient);
    float alpha = head * tail * uOpacity * (0.7 + vRand * 0.4);
    if (alpha < 0.01) discard;
    vec3 color = uColor * mix(0.8, 1.2, vRand);
    gl_FragColor = vec4(color, alpha);
  }
`;

export const snowVertexShader = /* glsl */`
  attribute vec3 aOffset;
  attribute float aScale;
  attribute float aPhase;
  attribute float aSeed;

  uniform float uTime;
  uniform vec2 uAreaSize;
  uniform vec2 uWind;
  uniform float uDriftStrength;

  varying vec2 vUv;
  varying float vSeed;
  varying float vDepth;

  void main() {
    float fall = mod(aOffset.y - (uTime * 0.4 + aScale * 1.2), uAreaSize.y) - uAreaSize.y * 0.5;
    float wobble = sin(uTime * 0.8 + aPhase) * 0.8;
    float sway = cos(uTime * 0.6 + aPhase) * 0.4;

    vec3 base = vec3(
      aOffset.x + wobble * (1.0 + uWind.x * 2.0),
      fall,
      aOffset.z + sway
    );

    float scaledSize = aScale * (0.5 + uDriftStrength * 0.8);
    vec3 local = position * scaledSize;
    vUv = uv * 2.0 - 1.0;
    vSeed = fract(aSeed);
    vDepth = clamp(scaledSize, 0.2, 1.2);

    vec4 worldPosition = vec4(base + local, 1.0);
    gl_Position = projectionMatrix * modelViewMatrix * worldPosition;
  }
`;

export const snowFragmentShader = /* glsl */`
  precision highp float;

  uniform float uOpacity;
  uniform float uTime;

  varying vec2 vUv;
  varying float vSeed;
  varying float vDepth;

  float sdSegment(vec2 p, vec2 a, vec2 b) {
    vec2 pa = p - a;
    vec2 ba = b - a;
    float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
    return length(pa - ba * h);
  }

  vec2 hexFold(vec2 p) {
    float PI = 3.14159265359;
    float angle = atan(p.y, p.x);
    float sector = PI / 3.0;
    angle = mod(angle + sector * 0.5, sector) - sector * 0.5;
    return vec2(cos(angle), abs(sin(angle))) * length(p);
  }

  float sdRhombus(vec2 p, vec2 b) {
    p = abs(p);
    float h = clamp((-2.0 * dot(p, b) + dot(b, b)) / dot(b, b), -1.0, 1.0);
    float d = length(p - 0.5 * b * vec2(1.0 - h, 1.0 + h));
    return d * sign(p.x * b.y + p.y * b.x - b.x * b.y);
  }

  float sdSnowflake(vec2 p, float seed) {
    vec2 fp = hexFold(p);

    float var1 = 0.8 + 0.4 * fract(seed * 1.234);
    float var2 = 0.7 + 0.6 * fract(seed * 2.567);
    float var3 = 0.6 + 0.8 * fract(seed * 3.891);

    float core = length(fp) - 0.12 * var1;

    float mainBranch = sdSegment(fp, vec2(0.0), vec2(0.5 * var2, 0.0)) - 0.04;

    vec2 branchStart = vec2(0.2 * var1, 0.0);
    vec2 branchEnd = branchStart + vec2(0.15, 0.12) * var3;
    float secBranch1 = sdSegment(fp, branchStart, branchEnd) - 0.025;

    vec2 branchStart2 = vec2(0.35 * var2, 0.0);
    vec2 branchEnd2 = branchStart2 + vec2(0.1, 0.08) * var1;
    float secBranch2 = sdSegment(fp, branchStart2, branchEnd2) - 0.02;

    vec2 tipPos = fp - vec2(0.45 * var2, 0.0);
    float tipDiamond = sdRhombus(tipPos, vec2(0.06, 0.03) * var3) - 0.01;

    vec2 accentPos = fp - vec2(0.25 * var1, 0.0);
    float accentDiamond = sdRhombus(accentPos, vec2(0.04, 0.025)) - 0.005;

    float d = core;
    d = min(d, mainBranch);
    d = min(d, secBranch1);
    d = min(d, secBranch2);
    d = min(d, tipDiamond);
    d = min(d, accentDiamond);

    return d;
  }

  float sparkle(vec2 p, float seed, float time) {
    float sparkleIntensity = 0.0;
    for (int i = 0; i < 6; i++) {
      float angle = float(i) * 3.14159265359 / 3.0;
      vec2 sparklePos = vec2(cos(angle), sin(angle)) * (0.2 + 0.1 * fract(seed * float(i + 1)));
      float phase = time * (1.5 + fract(seed * float(i + 2))) + float(i) * 1.047;
      float sparkleStrength = pow(max(0.0, sin(phase)), 8.0);
      float dist = length(p - sparklePos);
      sparkleIntensity += sparkleStrength * exp(-dist * 30.0);
    }

    float corePhase = time * 2.0 + seed * 6.28;
    float coreSparkle = pow(max(0.0, sin(corePhase)), 6.0);
    sparkleIntensity += coreSparkle * exp(-length(p) * 20.0);

    return clamp(sparkleIntensity, 0.0, 1.0);
  }

  void main() {
    vec2 localUV = vUv;
    float dist = sdSnowflake(localUV, vSeed);
    float aa = fwidth(dist);
    float opacity = (1.0 - smoothstep(0.0, aa * 1.5, dist)) * uOpacity;
    if (opacity < 0.001) discard;

    vec3 snowColor = vec3(0.95, 0.97, 1.0);
    float glint = sparkle(localUV, vSeed, uTime);
    vec3 sparkleColor = vec3(0.8, 0.95, 1.0) * 2.0;
    snowColor = mix(snowColor, sparkleColor, glint);

    float edgeGlow = 1.0 - smoothstep(0.0, aa * 4.0, abs(dist));
    snowColor += vec3(0.3, 0.5, 0.8) * edgeGlow * 0.3;

    float brightness = 0.6 + 0.4 * vDepth;
    snowColor *= brightness;

    gl_FragColor = vec4(snowColor, opacity);
  }
`;

const simplexNoise = /* glsl */`
  vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
  vec4 taylorInvSqrt(vec4 r){ return 1.79284291400159 - 0.85373472095314 * r; }
  float snoise(vec3 v){
    const vec2  C = vec2(1.0/6.0, 1.0/3.0) ;
    const vec4  D = vec4(0.0, 0.5, 1.0, 2.0);

    vec3 i  = floor(v + dot(v, C.yyy) );
    vec3 x0 =   v - i + dot(i, C.xxx) ;

    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min( g.xyz, l.zxy );
    vec3 i2 = max( g.xyz, l.zxy );

    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + C.yyy;
    vec3 x3 = x0 - D.yyy;

    i = mod289(i);
    vec4 p = permute( permute( permute(
          i.z + vec4(0.0, i1.z, i2.z, 1.0 ))
        + i.y + vec4(0.0, i1.y, i2.y, 1.0 ))
        + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));

    float n_ = 0.142857142857;
    vec3  ns = n_ * D.wyz - D.xzx;

    vec4 j = p - 49.0 * floor(p * ns.z * ns.z);

    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_ );

    vec4 x = x_ *ns.x + ns.yyyy;
    vec4 y = y_ *ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);

    vec4 b0 = vec4( x.xy, y.xy );
    vec4 b1 = vec4( x.zw, y.zw );

    vec4 s0 = floor(b0)*2.0 + 1.0;
    vec4 s1 = floor(b1)*2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));

    vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;
    vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww ;

    vec3 p0 = vec3(a0.xy,h.x);
    vec3 p1 = vec3(a0.zw,h.y);
    vec3 p2 = vec3(a1.xy,h.z);
    vec3 p3 = vec3(a1.zw,h.w);

    vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
    p0 *= norm.x;
    p1 *= norm.y;
    p2 *= norm.z;
    p3 *= norm.w;

    vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
    m = m * m;
    return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1),
                                  dot(p2,x2), dot(p3,x3) ) );
  }
`;

export const cloudsVertexShader = /* glsl */`
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const cloudsFragmentShader = /* glsl */`
  precision highp float;
  varying vec2 vUv;

  uniform float uTime;
  uniform float uDensity;
  uniform vec2 uWind;
  uniform float uFlashIntensity;

  ${simplexNoise}

  float fbm(vec3 p) {
    float total = 0.0;
    float amplitude = 0.5;
    float frequency = 1.0;
    for(int i = 0; i < 5; i++) {
      total += amplitude * snoise(p * frequency);
      frequency *= 2.02;
      amplitude *= 0.55;
    }
    return total;
  }

  void main() {
    vec2 uv = vUv * 2.0 - 1.0;
    vec3 samplePos = vec3(uv * 2.5 + uWind * uTime * 0.03, uTime * 0.05);
    float noise = fbm(samplePos);
    float density = smoothstep(0.2, 0.8, noise) * uDensity;
    float alpha = density * 0.85;
    vec3 cloudColor = mix(vec3(0.6, 0.67, 0.78), vec3(1.0, 0.96, 0.88), uFlashIntensity);
    gl_FragColor = vec4(cloudColor, alpha);
  }
`;
