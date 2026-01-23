export const atmosphereVertexShader = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vPosition;
  
  void main() {
    vUv = uv;
    vPosition = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const atmosphereFragmentShader = /* glsl */ `
  precision highp float;
  
  uniform float uTime;
  uniform float uNoiseFrequency;
  uniform float uNoiseAmplitude;
  uniform float uDistortion;
  uniform float uCloudCover;
  uniform float uHumidity;
  uniform float uStormIntensity;
  uniform float uTimeOfDay;
  uniform float uGoldenHour;
  uniform float uBlueHour;
  uniform float uTemperature;
  uniform vec3 uColorTemperature;
  uniform vec2 uResolution;
  
  // Weather condition intensities
  uniform float uRainIntensity;
  uniform float uSnowIntensity;
  uniform float uFogDensity;
  uniform float uCloudDensity;
  uniform float uSunIntensity;
  
  // Time phase: 0=night, 0.25=dawn, 0.5=day, 0.75=evening
  uniform float uTimePhase;
  
  varying vec2 vUv;
  varying vec3 vPosition;
  
  // Simplex 3D Noise
  vec4 permute(vec4 x) { return mod(((x*34.0)+1.0)*x, 289.0); }
  vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

  float snoise(vec3 v) {
    const vec2 C = vec2(1.0/6.0, 1.0/3.0);
    const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
    
    vec3 i  = floor(v + dot(v, C.yyy));
    vec3 x0 = v - i + dot(i, C.xxx);
    
    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min(g.xyz, l.zxy);
    vec3 i2 = max(g.xyz, l.zxy);
    
    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + C.yyy;
    vec3 x3 = x0 - D.yyy;
    
    i = mod(i, 289.0);
    vec4 p = permute(permute(permute(
              i.z + vec4(0.0, i1.z, i2.z, 1.0))
            + i.y + vec4(0.0, i1.y, i2.y, 1.0))
            + i.x + vec4(0.0, i1.x, i2.x, 1.0));
            
    float n_ = 1.0/7.0;
    vec3 ns = n_ * D.wyz - D.xzx;
    
    vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
    
    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_);
    
    vec4 x = x_ *ns.x + ns.yyyy;
    vec4 y = y_ *ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);
    
    vec4 b0 = vec4(x.xy, y.xy);
    vec4 b1 = vec4(x.zw, y.zw);
    
    vec4 s0 = floor(b0)*2.0 + 1.0;
    vec4 s1 = floor(b1)*2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));
    
    vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
    vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
    
    vec3 p0 = vec3(a0.xy, h.x);
    vec3 p1 = vec3(a0.zw, h.y);
    vec3 p2 = vec3(a1.xy, h.z);
    vec3 p3 = vec3(a1.zw, h.w);
    
    vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
    p0 *= norm.x;
    p1 *= norm.y;
    p2 *= norm.z;
    p3 *= norm.w;
    
    vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
    m = m * m;
    return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
  }
  
  // Fractal Brownian Motion
  float fbm(vec3 p, int octaves) {
    float value = 0.0;
    float amplitude = 0.5;
    float frequency = 1.0;
    float lacunarity = 2.0;
    float persistence = 0.5;
    
    for(int i = 0; i < 6; i++) {
      if(i >= octaves) break;
      value += amplitude * snoise(p * frequency);
      frequency *= lacunarity;
      amplitude *= persistence;
    }
    return value;
  }
  
  // Voronoi noise for cloud-like patterns
  vec2 hash2(vec2 p) {
    return fract(sin(vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)))) * 43758.5453);
  }
  
  float voronoi(vec2 p) {
    vec2 n = floor(p);
    vec2 f = fract(p);
    
    float md = 1.0;
    for(int j = -1; j <= 1; j++) {
      for(int i = -1; i <= 1; i++) {
        vec2 g = vec2(float(i), float(j));
        vec2 o = hash2(n + g);
        o = 0.5 + 0.5 * sin(uTime * 0.5 + 6.2831 * o);
        vec2 r = g + o - f;
        float d = dot(r, r);
        md = min(md, d);
      }
    }
    return sqrt(md);
  }
  
  // Color space conversions for LCH interpolation
  vec3 rgb2lab(vec3 c) {
    vec3 xyz;
    xyz.x = (c.r > 0.04045) ? pow((c.r + 0.055) / 1.055, 2.4) : c.r / 12.92;
    xyz.y = (c.g > 0.04045) ? pow((c.g + 0.055) / 1.055, 2.4) : c.g / 12.92;
    xyz.z = (c.b > 0.04045) ? pow((c.b + 0.055) / 1.055, 2.4) : c.b / 12.92;
    
    xyz *= mat3(
      0.4124564, 0.3575761, 0.1804375,
      0.2126729, 0.7151522, 0.0721750,
      0.0193339, 0.1191920, 0.9503041
    );
    
    xyz /= vec3(0.95047, 1.0, 1.08883);
    
    xyz = mix(
      pow(xyz, vec3(1.0/3.0)),
      7.787 * xyz + 16.0/116.0,
      step(xyz, vec3(0.008856))
    );
    
    return vec3(
      116.0 * xyz.y - 16.0,
      500.0 * (xyz.x - xyz.y),
      200.0 * (xyz.y - xyz.z)
    );
  }
  
  vec3 lab2rgb(vec3 lab) {
    float y = (lab.x + 16.0) / 116.0;
    float x = lab.y / 500.0 + y;
    float z = y - lab.z / 200.0;
    
    vec3 xyz = vec3(x, y, z);
    vec3 xyz3 = xyz * xyz * xyz;
    
    xyz = mix(
      (xyz - 16.0/116.0) / 7.787,
      xyz3,
      step(vec3(0.206893), xyz)
    );
    
    xyz *= vec3(0.95047, 1.0, 1.08883);
    
    vec3 rgb = xyz * mat3(
       3.2404542, -1.5371385, -0.4985314,
      -0.9692660,  1.8760108,  0.0415560,
       0.0556434, -0.2040259,  1.0572252
    );
    
    return mix(
      12.92 * rgb,
      1.055 * pow(rgb, vec3(1.0/2.4)) - 0.055,
      step(vec3(0.0031308), rgb)
    );
  }
  
  // Rain drop effect
  float rainDrop(vec2 uv, float time) {
    vec2 p = uv * vec2(30.0, 10.0);
    p.y += time * 15.0;
    vec2 id = floor(p);
    p = fract(p) - 0.5;
    
    float n = fract(sin(dot(id, vec2(12.9898, 78.233))) * 43758.5453);
    p.x += (n - 0.5) * 0.6;
    
    float d = length(p * vec2(1.0, 3.0));
    return smoothstep(0.15, 0.0, d) * step(0.3, n);
  }
  
  // (Former snow flake helper removed now that instanced particles handle flakes)
  
  void main() {
    vec2 uv = vUv;
    vec2 centeredUv = uv - 0.5;
    
    // Time-based animation
    float time = uTime * 0.1;
    
    // Multi-layered noise
    vec3 noiseCoord = vec3(uv * uNoiseFrequency, time);
    float noise1 = fbm(noiseCoord, 4) * uNoiseAmplitude;
    float noise2 = fbm(noiseCoord * 2.0 + vec3(100.0), 3) * uNoiseAmplitude * 0.5;
    
    // Combine noises (voronoi removed - was causing grid artifacts)
    float combinedNoise = noise1 + noise2;
    
    // ========== TIME PHASE COLOR PALETTES ==========
    // Night (deep blues and purples)
    vec3 nightTop = vec3(0.02, 0.02, 0.08);
    vec3 nightBottom = vec3(0.05, 0.03, 0.12);
    
    // Dawn (soft pinks and oranges)
    vec3 dawnTop = vec3(0.4, 0.25, 0.35);
    vec3 dawnBottom = vec3(0.95, 0.5, 0.35);
    
    // Day (bright blue sky)
    vec3 dayTop = vec3(0.3, 0.5, 0.85);
    vec3 dayBottom = vec3(0.6, 0.75, 0.95);
    
    // Evening (warm oranges and purples)
    vec3 eveningTop = vec3(0.15, 0.1, 0.25);
    vec3 eveningBottom = vec3(0.9, 0.4, 0.2);
    
    // Select colors based on time phase
    vec3 topColor, bottomColor;
    
    if(uTimePhase < 0.125) {
      // Night
      topColor = nightTop;
      bottomColor = nightBottom;
    } else if(uTimePhase < 0.375) {
      // Dawn transition
      float t = smoothstep(0.125, 0.375, uTimePhase);
      topColor = mix(nightTop, dawnTop, t);
      bottomColor = mix(nightBottom, dawnBottom, t);
    } else if(uTimePhase < 0.625) {
      // Day
      float t = smoothstep(0.375, 0.5, uTimePhase);
      topColor = mix(dawnTop, dayTop, t);
      bottomColor = mix(dawnBottom, dayBottom, t);
    } else if(uTimePhase < 0.875) {
      // Evening transition
      float t = smoothstep(0.625, 0.875, uTimePhase);
      topColor = mix(dayTop, eveningTop, t);
      bottomColor = mix(dayBottom, eveningBottom, t);
    } else {
      // Back to night
      float t = smoothstep(0.875, 1.0, uTimePhase);
      topColor = mix(eveningTop, nightTop, t);
      bottomColor = mix(eveningBottom, nightBottom, t);
    }
    
    // Apply golden hour enhancement
    vec3 goldenTop = vec3(0.95, 0.6, 0.3);
    vec3 goldenBottom = vec3(0.98, 0.8, 0.5);
    topColor = mix(topColor, goldenTop, uGoldenHour * 0.7);
    bottomColor = mix(bottomColor, goldenBottom, uGoldenHour * 0.7);
    
    // Apply blue hour enhancement
    vec3 blueHourTop = vec3(0.15, 0.2, 0.45);
    vec3 blueHourBottom = vec3(0.25, 0.3, 0.55);
    topColor = mix(topColor, blueHourTop, uBlueHour * 0.6);
    bottomColor = mix(bottomColor, blueHourBottom, uBlueHour * 0.6);
    
    // Apply color temperature tint
    topColor = mix(topColor, uColorTemperature, 0.15);
    bottomColor = mix(bottomColor, uColorTemperature, 0.1);
    
    // ========== WEATHER CONDITION EFFECTS ==========
    
    // Darken for cloudy/rain/storm conditions
    float weatherDarkening = uCloudDensity * 0.3 + uRainIntensity * 0.2 + uStormIntensity * 0.3;
    topColor *= 1.0 - weatherDarkening;
    bottomColor *= 1.0 - weatherDarkening * 0.5;
    
    // Create gradient with noise distortion
    float gradientY = uv.y + combinedNoise * uDistortion;
    vec3 gradient = mix(bottomColor, topColor, gradientY);
    
    // ========== CLOUD LAYER ==========
    float cloudLayer = smoothstep(0.3, 0.7, noise1 + 0.5) * uCloudDensity;
    vec3 cloudColor = mix(vec3(0.85, 0.88, 0.92), vec3(0.4, 0.42, 0.45), uStormIntensity);
    cloudColor *= 0.5 + uSunIntensity * 0.5;
    gradient = mix(gradient, cloudColor, cloudLayer * 0.5);
    
    // ========== FOG EFFECT ==========
    vec3 fogColor = mix(vec3(0.7, 0.75, 0.8), vec3(0.3, 0.32, 0.35), 1.0 - uSunIntensity);
    float fogGradient = smoothstep(0.0, 0.6, 1.0 - uv.y);
    gradient = mix(gradient, fogColor, uFogDensity * fogGradient * 0.8);
    
    // ========== RAIN EFFECT (simplified - particles handle visuals) ==========
    if(uRainIntensity > 0.01) {
      // Just darken/desaturate for rainy atmosphere, particles handle drops
      vec3 rainTint = mix(vec3(0.5, 0.55, 0.6), vec3(0.3, 0.32, 0.35), uRainIntensity);
      gradient = mix(gradient, rainTint, uRainIntensity * 0.3);
    }
    
    // ========== SNOW EFFECT ==========
    if(uSnowIntensity > 0.01) {
      // Let physical instanced flakes handle silhouettes; just soften overall tone here
      gradient = mix(gradient, gradient + vec3(0.06), clamp(uSnowIntensity, 0.0, 1.0) * 0.4);
    }
    
    // ========== SUN GLOW ==========
    if(uSunIntensity > 0.3 && uCloudDensity < 0.5) {
      vec2 sunPos = vec2(0.7, 0.8 - (1.0 - uTimePhase) * 0.3);
      float sunDist = length(uv - sunPos);
      float sunGlow = smoothstep(0.4, 0.0, sunDist) * uSunIntensity * (1.0 - uCloudDensity);
      vec3 sunColor = mix(vec3(1.0, 0.95, 0.8), vec3(1.0, 0.6, 0.3), uGoldenHour);
      gradient += sunColor * sunGlow * 0.4;
    }
    
    // ========== STARS AT NIGHT (disabled - was causing grid artifacts) ==========
    // Stars removed to prevent rectangular grid patterns
    
    // ========== LIGHTNING (disabled - was causing flashing rectangles) ==========
    // Lightning removed to prevent flashing artifacts
    
    // ========== VIGNETTE ==========
    float vignette = 1.0 - length(centeredUv) * (0.4 + uStormIntensity * 0.3);
    gradient *= vignette;
    
    // ========== FILM GRAIN (disabled - was causing pixel artifacts) ==========
    // Grain removed to prevent rectangular noise patterns
    
    gl_FragColor = vec4(gradient, 1.0);
  }
`;

export const chromaticAberrationShader = /* glsl */ `
  uniform sampler2D tDiffuse;
  uniform float uOffset;
  uniform float uStormIntensity;
  varying vec2 vUv;
  
  void main() {
    vec2 direction = vUv - 0.5;
    float dist = length(direction);
    float aberration = uOffset * (1.0 + uStormIntensity * 2.0);
    
    vec2 offsetR = direction * aberration * dist;
    vec2 offsetB = -direction * aberration * dist;
    
    float r = texture2D(tDiffuse, vUv + offsetR).r;
    float g = texture2D(tDiffuse, vUv).g;
    float b = texture2D(tDiffuse, vUv + offsetB).b;
    
    gl_FragColor = vec4(r, g, b, 1.0);
  }
`;
