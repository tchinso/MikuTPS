const QUALITY_CONFIG = {
  high: { dprCap: 1.5, shadows: true, renderFps: 60 },
  balanced: { dprCap: 1.15, shadows: false, renderFps: 60 },
  low: { dprCap: 1, shadows: false, renderFps: 30 }
};

export function createQualityState(mode = 'auto') {
  const normalizedMode = ['auto', 'high', 'low'].includes(mode) ? mode : 'auto';
  return {
    mode: normalizedMode,
    tier: normalizedMode === 'low' ? 'low' : 'high',
    windowSeconds: 0,
    renderedFrames: 0,
    lastMeasuredFps: null
  };
}

export function resolveQualityConfig(state, devicePixelRatio = 1) {
  const config = QUALITY_CONFIG[state.tier] ?? QUALITY_CONFIG.high;
  return {
    ...config,
    dpr: Math.max(1, Math.min(Number(devicePixelRatio) || 1, config.dprCap))
  };
}

export function sampleAdaptiveQuality(state, dt, rendered = true) {
  if (state.mode !== 'auto' || state.tier === 'low') return { state, changed: false };
  const next = {
    ...state,
    windowSeconds: state.windowSeconds + Math.max(0, dt),
    renderedFrames: state.renderedFrames + Number(rendered)
  };
  if (next.windowSeconds < 4) return { state: next, changed: false };

  const fps = next.renderedFrames / Math.max(0.001, next.windowSeconds);
  const nextTier = next.tier === 'high' && fps < 48
    ? 'balanced'
    : next.tier === 'balanced' && fps < 42
      ? 'low'
      : next.tier;
  return {
    state: {
      ...next,
      tier: nextTier,
      windowSeconds: 0,
      renderedFrames: 0,
      lastMeasuredFps: fps
    },
    changed: nextTier !== next.tier
  };
}
