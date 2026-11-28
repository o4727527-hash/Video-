import { geoEqualEarth, geoGraticule10, geoMercator, geoOrthographic, geoPath } from 'd3-geo';
import * as topojson from 'topojson-client';

export const DURATION_SEC = 36;
export const FPS = 30;

export type PaletteId = 'archival' | 'newsroom' | 'nightdesk';

export interface VoxPalette {
  id: PaletteId;
  name: string;
  paper: string;
  paperAlt: string;
  ink: string;
  muted: string;
  rule: string;
  yellow: string;
  red: string;
  teal: string;
  blue: string;
  landFill: string;
  landStroke: string;
  oceanTint: string;
}

export const PALETTES: Record<PaletteId, VoxPalette> = {
  archival: {
    id: 'archival',
    name: 'Archival Newsprint',
    paper: '#F4EFE6',
    paperAlt: '#EBE4D6',
    ink: '#141413',
    muted: '#57534E',
    rule: '#CFC6B4',
    yellow: '#FFE600',
    red: '#D93829',
    teal: '#0F766E',
    blue: '#1E3A8A',
    landFill: '#DFD7C8',
    landStroke: '#6B655C',
    oceanTint: '#E8E2D5',
  },
  newsroom: {
    id: 'newsroom',
    name: 'Gallery Stark',
    paper: '#FFFFFF',
    paperAlt: '#F3F4F6',
    ink: '#0F172A',
    muted: '#475569',
    rule: '#CBD5E1',
    yellow: '#FFE600',
    red: '#DC2626',
    teal: '#0D9488',
    blue: '#1D4ED8',
    landFill: '#E2E8F0',
    landStroke: '#64748B',
    oceanTint: '#F8FAFC',
  },
  nightdesk: {
    id: 'nightdesk',
    name: 'Night Desk',
    paper: '#161615',
    paperAlt: '#232321',
    ink: '#F5F2EB',
    muted: '#A8A29E',
    rule: '#3A3935',
    yellow: '#FFE600',
    red: '#F87171',
    teal: '#2DD4BF',
    blue: '#60A5FA',
    landFill: '#2C2B28',
    landStroke: '#78716C',
    oceanTint: '#1D1D1B',
  },
};

export interface VoxChapter {
  id: string;
  index: string;
  title: string;
  kicker: string;
  start: number;
  end: number;
  summary: string;
}

export const CHAPTERS: VoxChapter[] = [
  {
    id: 'paradox',
    index: '01',
    title: 'The Map Paradox',
    kicker: '01 / THE PARADOX',
    start: 0,
    end: 5.5,
    summary: 'Tilted newspaper cutout card introduces the core geometric impossibility of flattening a sphere.',
  },
  {
    id: 'origin',
    index: '02',
    title: 'The 1569 Cylinder',
    kicker: '02 / 1569 NAVIGATION',
    start: 5.5,
    end: 12.0,
    summary: 'Rotating orthographic globe unrolls onto Gerardus Mercator’s cylindrical projection for straight compass bearings.',
  },
  {
    id: 'distortion',
    index: '03',
    title: "Tissot's Indicatrix",
    kicker: '03 / SCALE INFLATION',
    start: 12.0,
    end: 19.5,
    summary: 'Latitude sweep reveals how equal-radius circles swell up to 14.9× toward the poles.',
  },
  {
    id: 'comparison',
    index: '04',
    title: 'Greenland vs. Africa',
    kicker: '04 / TRUE PROPORTION',
    start: 19.5,
    end: 27.0,
    summary: 'Greenland detaches from its Mercator frame, shrinks to true Equal-Earth scale, and slides inside Africa.',
  },
  {
    id: 'morph',
    index: '05',
    title: 'Projection Morph',
    kicker: '05 / EQUAL EARTH (2018)',
    start: 27.0,
    end: 32.5,
    summary: 'Continuous mathematical vertex interpolation transforms Mercator into the balanced Equal Earth projection.',
  },
  {
    id: 'outro',
    index: '06',
    title: 'Every Frame Chooses',
    kicker: '06 / EDITORIAL CONCLUSION',
    start: 32.5,
    end: 36.0,
    summary: 'Closing editorial card summarizes how projection geometry shapes human intuition.',
  },
];

export interface VoxConfig {
  palette: PaletteId;
  headline: string;
  subtitle: string;
}

export const DEFAULT_CONFIG: VoxConfig = {
  palette: 'archival',
  headline: 'EVERY MAP IS A LIE.',
  subtitle: 'To flatten a round Earth, cartographers must break something.',
};

const AFRICAN_NAMES = new Set([
  'Algeria', 'Angola', 'Benin', 'Botswana', 'Burkina Faso', 'Burundi',
  'Cameroon', 'Central African Rep.', 'Chad', 'Congo', 'Dem. Rep. Congo',
  'Djibouti', 'Egypt', 'Eq. Guinea', 'Eritrea', 'eSwatini', 'Ethiopia',
  'Gabon', 'Gambia', 'Ghana', 'Guinea', 'Guinea-Bissau', "Côte d'Ivoire",
  'Kenya', 'Lesotho', 'Liberia', 'Libya', 'Madagascar', 'Malawi', 'Mali',
  'Mauritania', 'Morocco', 'Mozambique', 'Namibia', 'Niger', 'Nigeria',
  'Rwanda', 'Senegal', 'Sierra Leone', 'Somalia', 'Somaliland', 'South Africa',
  'S. Sudan', 'Sudan', 'Tanzania', 'Togo', 'Tunisia', 'Uganda', 'W. Sahara',
  'Zambia', 'Zimbabwe',
]);

export interface MorphRing {
  mercator: Array<[number, number]>;
  equalEarth: Array<[number, number]>;
}

export interface PreparedWorld {
  countriesNoAntarctica: any;
  landNoAntarctica: any;
  greenland: any;
  africaCollection: any;
  morphRings: MorphRing[];
  greenlandMercatorCentroid: [number, number];
  africaMercatorCentroid: [number, number];
  greenlandRings: Array<Array<[number, number]>>;
  greenlandTrueRings: Array<Array<[number, number]>>;
  africaEqualCentroid: [number, number];
}

// Clip latitudes to [-82, 83.5] so Mercator never hits infinity
function clampLat(lat: number): number {
  return Math.max(-81.5, Math.min(83.2, lat));
}

function extractRingsFromGeometry(geom: any): number[][][] {
  if (!geom) return [];
  if (geom.type === 'Polygon') return geom.coordinates;
  if (geom.type === 'MultiPolygon') {
    const out: number[][][] = [];
    for (const poly of geom.coordinates) {
      for (const ring of poly) out.push(ring);
    }
    return out;
  }
  return [];
}

export function prepareWorldData(worldTopo: any): PreparedWorld {
  const countriesAll = topojson.feature(worldTopo, worldTopo.objects.countries) as any;
  const countriesFiltered = countriesAll.features.filter(
    (f: any) => f.id !== '010' && f.properties?.name !== 'Antarctica'
  );
  const countriesNoAntarctica = {
    type: 'FeatureCollection' as const,
    features: countriesFiltered,
  };

  const greenland =
    countriesFiltered.find((f: any) => f.id === '304' || f.properties?.name === 'Greenland') ||
    countriesFiltered[0];

  const africaFeatures = countriesFiltered.filter((f: any) =>
    AFRICAN_NAMES.has(f.properties?.name)
  );
  const africaCollection = {
    type: 'FeatureCollection' as const,
    features: africaFeatures,
  };

  // Canonical 1920x1080 map projections for Scene 5 morph
  const mercatorProj = geoMercator()
    .scale(232)
    .center([12, 18])
    .translate([960, 565]);

  const equalEarthProj = geoEqualEarth()
    .scale(310)
    .center([12, 8])
    .translate([960, 565]);

  // Build pre-projected morph rings from all non-Antarctica countries
  const morphRings: MorphRing[] = [];
  for (const feat of countriesFiltered) {
    const rings = extractRingsFromGeometry(feat.geometry);
    for (const ring of rings) {
      if (ring.length < 4) continue;
      const mPts: Array<[number, number]> = [];
      const ePts: Array<[number, number]> = [];
      let valid = true;
      for (let i = 0; i < ring.length; i++) {
        const lon = ring[i][0];
        const lat = clampLat(ring[i][1]);
        const mp = mercatorProj([lon, lat]);
        const ep = equalEarthProj([lon, lat]);
        if (!mp || !ep || !Number.isFinite(mp[0]) || !Number.isFinite(mp[1])) {
          valid = false;
          break;
        }
        mPts.push([mp[0], mp[1]]);
        ePts.push([ep[0], ep[1]]);
      }
      if (valid && mPts.length >= 3) {
        // Skip wrap-around seam artifacts across antimeridian
        let maxJump = 0;
        for (let i = 1; i < mPts.length; i++) {
          const dx = Math.abs(mPts[i][0] - mPts[i - 1][0]);
          if (dx > maxJump) maxJump = dx;
        }
        if (maxJump < 750) {
          morphRings.push({ mercator: mPts, equalEarth: ePts });
        }
      }
    }
  }

  // Scene 4 specific Greenland & Africa projections
  // Use a clean Mercator centered on Atlantic/Africa/Greenland for dramatic comparison
  const s4Mercator = geoMercator()
    .scale(245)
    .center([5, 36])
    .translate([640, 560]);

  const s4Equal = geoEqualEarth()
    .scale(310)
    .center([18, 6])
    .translate([660, 580]);

  const pathM = geoPath(s4Mercator);
  const pathE = geoPath(s4Equal);
  const glMercCenter = pathM.centroid(greenland) as [number, number];
  const afMercCenter = pathM.centroid(africaCollection) as [number, number];
  const afEqualCenter = pathE.centroid(africaCollection) as [number, number];

  // Greenland polygons in s4Mercator space and true-area scale centered at origin
  const glRawRings = extractRingsFromGeometry(greenland.geometry);
  const greenlandRings: Array<Array<[number, number]>> = [];
  const greenlandTrueRings: Array<Array<[number, number]>> = [];

  // True equal-area projection of Greenland centered at [0,0] scaled to match Africa's Mercator Equator scale!
  // At Equator, s4Mercator scale = 245. An Equal-Area projection at scale = 245 matches Africa's Equatorial scale!
  const glTrueEqualProj = geoEqualEarth()
    .scale(245)
    .rotate([42, -72, 0])
    .translate([0, 0]);

  for (const ring of glRawRings) {
    const mArr: Array<[number, number]> = [];
    const tArr: Array<[number, number]> = [];
    for (const coord of ring) {
      const mp = s4Mercator([coord[0], clampLat(coord[1])]);
      const tp = glTrueEqualProj([coord[0], clampLat(coord[1])]);
      if (mp && tp) {
        mArr.push([mp[0] - glMercCenter[0], mp[1] - glMercCenter[1]]);
        tArr.push([tp[0], tp[1]]);
      }
    }
    if (mArr.length > 2) {
      greenlandRings.push(mArr);
      greenlandTrueRings.push(tArr);
    }
  }

  return {
    countriesNoAntarctica,
    landNoAntarctica: countriesNoAntarctica,
    greenland,
    africaCollection,
    morphRings,
    greenlandMercatorCentroid: glMercCenter,
    africaMercatorCentroid: afMercCenter,
    greenlandRings,
    greenlandTrueRings,
    africaEqualCentroid: afEqualCenter,
  };
}

// Easing helpers
function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

function easeOutCubic(t: number): number {
  const x = clamp01(t);
  return 1 - Math.pow(1 - x, 3);
}

function easeInOutCubic(t: number): number {
  const x = clamp01(t);
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
}

function easeOutBack(t: number): number {
  const x = clamp01(t);
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function segProgress(time: number, start: number, duration: number): number {
  return clamp01((time - start) / duration);
}

// Typography constants
const FONT_DISPLAY = '"Oswald", "Liberation Sans Narrow", sans-serif';
const FONT_SANS = '"Plus Jakarta Sans", "Liberation Sans", sans-serif';
const FONT_SERIF = '"Source Serif 4", "DejaVu Serif", Georgia, serif';
const FONT_MONO = '"JetBrains Mono", "Liberation Mono", monospace';

// Signature Vox yellow highlighter stroke behind text
function drawHighlighter(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  progress: number,
  color: string,
  angle = -0.015
) {
  const p = easeOutCubic(progress);
  if (p <= 0.01) return;
  ctx.save();
  ctx.translate(x, y + h * 0.5);
  ctx.rotate(angle);
  const curW = w * p;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, -h * 0.48);
  ctx.lineTo(curW, -h * 0.52);
  ctx.lineTo(curW - 6, h * 0.48);
  ctx.lineTo(-4, h * 0.52);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

// Solid-offset tilted archival paper cutout card
function drawCutoutCard(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  pal: VoxPalette,
  angleRad = 0,
  shadowOffset = 10,
  bgColor?: string
) {
  ctx.save();
  ctx.translate(x + w / 2, y + h / 2);
  ctx.rotate(angleRad);
  ctx.fillStyle = pal.ink;
  ctx.fillRect(-w / 2 + shadowOffset, -h / 2 + shadowOffset, w, h);
  ctx.fillStyle = bgColor || pal.paper;
  ctx.fillRect(-w / 2, -h / 2, w, h);
  ctx.lineWidth = 3;
  ctx.strokeStyle = pal.ink;
  ctx.strokeRect(-w / 2, -h / 2, w, h);
  ctx.restore();
}

// Hand-drawn organic oval/circle strike-around
function drawInkCircle(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  progress: number,
  color: string,
  lineWidth = 4.5
) {
  const p = easeOutCubic(progress);
  if (p <= 0.01) return;
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.lineCap = 'round';
  ctx.beginPath();
  const steps = 42;
  const maxStep = Math.floor(steps * p);
  for (let i = 0; i <= maxStep; i++) {
    const a = -Math.PI * 0.65 + (i / steps) * Math.PI * 2.12;
    const wobble = 1 + Math.sin(i * 1.7) * 0.04;
    const px = cx + Math.cos(a) * rx * wobble;
    const py = cy + Math.sin(a) * ry * wobble;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.stroke();
  ctx.restore();
}

// Editorial background with subtle archival halftone grid & frame
function drawEditorialBackdrop(
  ctx: CanvasRenderingContext2D,
  pal: VoxPalette,
  timeSec: number,
  activeChapter: VoxChapter
) {
  ctx.fillStyle = pal.paper;
  ctx.fillRect(0, 0, 1920, 1080);

  // Subtle archival dot matrix
  ctx.fillStyle = pal.rule;
  ctx.globalAlpha = pal.id === 'nightdesk' ? 0.24 : 0.45;
  const step = 48;
  for (let gx = 48; gx < 1920; gx += step) {
    for (let gy = 96; gy < 1020; gy += step) {
      ctx.fillRect(gx - 1, gy - 1, 2, 2);
    }
  }
  ctx.globalAlpha = 1;

  // Outer editorial frame margin
  ctx.strokeStyle = pal.rule;
  ctx.lineWidth = 1.5;
  ctx.strokeRect(44, 44, 1832, 992);

  // Top editorial metadata bar
  ctx.fillStyle = pal.muted;
  ctx.font = `600 18px ${FONT_MONO}`;
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.fillText('VOX-STYLE EXPLAINER  ·  CARTOGRAPHIC SERIES', 72, 74);

  // Yellow square bullet beside active chapter kicker
  ctx.textAlign = 'right';
  const kickerW = ctx.measureText(activeChapter.kicker).width;
  ctx.fillStyle = pal.yellow;
  ctx.fillRect(1848 - kickerW - 26, 66, 14, 14);
  ctx.strokeStyle = pal.ink;
  ctx.lineWidth = 1.5;
  ctx.strokeRect(1848 - kickerW - 26, 66, 14, 14);

  ctx.fillStyle = pal.ink;
  ctx.fillText(activeChapter.kicker, 1848, 74);

  // Top hairline divider
  ctx.strokeStyle = pal.rule;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(44, 102);
  ctx.lineTo(1876, 102);
  ctx.stroke();

  // Bottom progress rail
  ctx.fillStyle = pal.paperAlt;
  ctx.fillRect(44, 1026, 1832, 10);
  const totalP = clamp01(timeSec / DURATION_SEC);
  ctx.fillStyle = pal.yellow;
  ctx.fillRect(44, 1026, 1832 * totalP, 10);
  ctx.fillStyle = pal.ink;
  ctx.fillRect(44 + 1832 * totalP - 3, 1022, 6, 18);

  // Bottom timestamp readout
  ctx.fillStyle = pal.muted;
  ctx.font = `500 16px ${FONT_MONO}`;
  ctx.textAlign = 'left';
  ctx.fillText(`00:${Math.floor(timeSec).toString().padStart(2, '0')} / 00:${DURATION_SEC}`, 72, 1004);
  ctx.textAlign = 'right';
  ctx.fillText('1920×1080  ·  D3-GEO ENGINE', 1848, 1004);
}

// SCENE 1: 0.0 - 5.5s — The Map Paradox
function renderScene1(
  ctx: CanvasRenderingContext2D,
  t: number,
  pal: VoxPalette,
  config: VoxConfig
) {
  // Background faint latitude/longitude decorative arcs
  const gridP = easeOutCubic(segProgress(t, 0, 1.0));
  ctx.save();
  ctx.strokeStyle = pal.rule;
  ctx.lineWidth = 1.5;
  ctx.globalAlpha = 0.55 * gridP;
  for (let r = 180; r <= 720; r += 135) {
    ctx.beginPath();
    ctx.arc(960, 540, r * gridP, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();

  // Main tilted cutout card
  const cardEnter = easeOutBack(segProgress(t, 0.25, 0.65));
  const cardY = lerp(680, 220, cardEnter);
  const cardAngle = lerp(-0.08, -0.018, cardEnter);

  ctx.save();
  ctx.globalAlpha = clamp01(segProgress(t, 0.2, 0.25));
  drawCutoutCard(ctx, 210, cardY, 1500, 390, pal, cardAngle, 14, pal.paper);

  // Inside card: rotated context matching cardAngle
  ctx.translate(210 + 750, cardY + 195);
  ctx.rotate(cardAngle);

  // Small eyebrow inside card
  ctx.fillStyle = pal.red;
  ctx.font = `700 22px ${FONT_MONO}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('CARTOGRAPHY FACT #01', 0, -125);

  // Headline text (split highlight on last 2 words if default, or full bottom line)
  const headlineText = (config.headline || 'EVERY MAP IS A LIE.').toUpperCase();
  ctx.font = `700 124px ${FONT_DISPLAY}`;
  const fullW = ctx.measureText(headlineText).width;
  const words = headlineText.split(' ');
  const tail = words.length > 2 ? words.slice(-2).join(' ') : words[words.length - 1];
  const prefix = words.length > 2 ? words.slice(0, -2).join(' ') + ' ' : '';
  const prefixW = prefix ? ctx.measureText(prefix).width : 0;
  const tailW = ctx.measureText(tail).width;
  const startX = -fullW / 2;

  // Yellow Vox highlighter behind tail words
  const hiP = segProgress(t, 1.05, 0.65);
  drawHighlighter(ctx, startX + prefixW - 10, -48, tailW + 24, 114, hiP, pal.yellow, -0.012);

  // Headline letters
  ctx.textAlign = 'left';
  ctx.fillStyle = pal.ink;
  ctx.fillText(headlineText, startX, 10);

  // Subtitle in editorial italic serif
  const subP = easeOutCubic(segProgress(t, 1.75, 0.65));
  ctx.globalAlpha = subP;
  ctx.textAlign = 'center';
  ctx.fillStyle = pal.muted;
  ctx.font = `italic 400 38px ${FONT_SERIF}`;
  ctx.fillText(config.subtitle || 'To flatten a round Earth, cartographers must break something.', 0, 122);
  ctx.restore();

  // Four metric stamps at bottom: SHAPE · AREA · DISTANCE · DIRECTION
  const props = ['SHAPE', 'AREA', 'DISTANCE', 'DIRECTION'];
  const stampY = 740;
  const stampW = 300;
  const gap = 50;
  const totalRowW = props.length * stampW + (props.length - 1) * gap;
  const rowX0 = (1920 - totalRowW) / 2;

  props.forEach((label, idx) => {
    const enter = easeOutBack(segProgress(t, 2.7 + idx * 0.25, 0.45));
    if (enter <= 0.01) return;
    const bx = rowX0 + idx * (stampW + gap);
    const by = stampY + (1 - enter) * 50;
    ctx.save();
    ctx.globalAlpha = clamp01(enter);

    const isArea = label === 'AREA';
    const circleP = segProgress(t, 4.1, 0.65);
    const boxBg = isArea && circleP > 0.3 ? pal.yellow : pal.paperAlt;

    ctx.fillStyle = pal.ink;
    ctx.fillRect(bx + 6, by + 6, stampW, 104);
    ctx.fillStyle = boxBg;
    ctx.fillRect(bx, by, stampW, 104);
    ctx.strokeStyle = pal.ink;
    ctx.lineWidth = 2.5;
    ctx.strokeRect(bx, by, stampW, 104);

    ctx.fillStyle = pal.muted;
    ctx.font = `600 16px ${FONT_MONO}`;
    ctx.textAlign = 'center';
    ctx.fillText(`PROPERTY 0${idx + 1}`, bx + stampW / 2, by + 30);

    ctx.fillStyle = pal.ink;
    ctx.font = `700 36px ${FONT_DISPLAY}`;
    ctx.fillText(label, bx + stampW / 2, by + 72);

    // Red ink circle + strike callout on AREA
    if (isArea) {
      drawInkCircle(ctx, bx + stampW / 2, by + 56, 175, 76, circleP, pal.red, 5);
      if (circleP > 0.7) {
        const tagP = easeOutCubic((circleP - 0.7) / 0.3);
        ctx.globalAlpha = tagP;
        ctx.fillStyle = pal.red;
        ctx.font = `700 22px ${FONT_MONO}`;
        ctx.fillText('↑ DISTORTED MOST', bx + stampW / 2, by + 148);
      }
    }
    ctx.restore();
  });
}

// SCENE 2: 5.5 - 12.0s — The 1569 Mercator Cylinder
function renderScene2(
  ctx: CanvasRenderingContext2D,
  t: number,
  pal: VoxPalette,
  world: PreparedWorld
) {
  const localT = t - 5.5;
  const enter = easeOutCubic(segProgress(localT, 0, 0.7));

  // Left panel: Rotating Orthographic Globe
  const globeCx = 500;
  const globeCy = 550;
  const globeR = 300 * enter;

  if (globeR > 5) {
    const rotLon = -25 + localT * 18;
    const ortho = geoOrthographic()
      .scale(globeR)
      .translate([globeCx, globeCy])
      .rotate([rotLon, -18, 0])
      .clipAngle(90);
    const path = geoPath(ortho, ctx);
    const grat = geoGraticule10();

    // Globe shadow & sphere fill
    ctx.save();
    ctx.fillStyle = pal.ink;
    ctx.beginPath();
    ctx.arc(globeCx + 10, globeCy + 10, globeR, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = pal.oceanTint;
    ctx.beginPath();
    ctx.arc(globeCx, globeCy, globeR, 0, Math.PI * 2);
    ctx.fill();

    // Graticule
    ctx.beginPath();
    path(grat);
    ctx.strokeStyle = pal.rule;
    ctx.lineWidth = 1.2;
    ctx.stroke();

    // Landmasses
    ctx.beginPath();
    path(world.countriesNoAntarctica);
    ctx.fillStyle = pal.teal;
    ctx.fill();
    ctx.strokeStyle = pal.ink;
    ctx.lineWidth = 1.2;
    ctx.stroke();

    // Outer ink rim
    ctx.beginPath();
    ctx.arc(globeCx, globeCy, globeR, 0, Math.PI * 2);
    ctx.strokeStyle = pal.ink;
    ctx.lineWidth = 4;
    ctx.stroke();

    // Tangent cylinder lines wrapping the globe
    const cylP = easeInOutCubic(segProgress(localT, 1.3, 1.3));
    if (cylP > 0.01) {
      ctx.strokeStyle = pal.red;
      ctx.lineWidth = 3;
      ctx.setLineDash([10, 8]);
      ctx.beginPath();
      ctx.moveTo(globeCx - globeR, globeCy - globeR * 1.15 * cylP);
      ctx.lineTo(globeCx - globeR, globeCy + globeR * 1.15 * cylP);
      ctx.moveTo(globeCx + globeR, globeCy - globeR * 1.15 * cylP);
      ctx.lineTo(globeCx + globeR, globeCy + globeR * 1.15 * cylP);
      ctx.stroke();
      ctx.setLineDash([]);

      // Top & bottom ellipse caps
      ctx.beginPath();
      ctx.ellipse(globeCx, globeCy - globeR * 1.15 * cylP, globeR, 38 * cylP, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(globeCx, globeCy + globeR * 1.15 * cylP, globeR, 38 * cylP, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  // Arrow from Globe to Right Editorial Card + Unrolled Map
  const arrowP = easeOutCubic(segProgress(localT, 2.2, 0.8));
  if (arrowP > 0.01) {
    ctx.save();
    ctx.strokeStyle = pal.ink;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(835, 550);
    ctx.lineTo(lerp(835, 965, arrowP), 550);
    ctx.stroke();
    if (arrowP > 0.85) {
      ctx.fillStyle = pal.ink;
      ctx.beginPath();
      ctx.moveTo(980, 550);
      ctx.lineTo(955, 536);
      ctx.lineTo(955, 564);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  // Right side: Year Stamp + Explanation Card + Unrolled mini Mercator
  const rightEnter = easeOutBack(segProgress(localT, 0.4, 0.7));
  ctx.save();
  ctx.globalAlpha = clamp01(rightEnter);

  // Giant Year Badge
  const yearX = 1020;
  const yearY = lerp(220, 170, rightEnter);
  ctx.fillStyle = pal.yellow;
  ctx.fillRect(yearX, yearY, 220, 84);
  ctx.strokeStyle = pal.ink;
  ctx.lineWidth = 3;
  ctx.strokeRect(yearX, yearY, 220, 84);
  ctx.fillStyle = pal.ink;
  ctx.font = `700 54px ${FONT_MONO}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('1569', yearX + 110, yearY + 44);

  // Attribution kicker
  ctx.textAlign = 'left';
  ctx.fillStyle = pal.muted;
  ctx.font = `600 22px ${FONT_MONO}`;
  ctx.fillText('GERARDUS MERCATOR  ·  ANTWERP', yearX + 248, yearY + 44);

  // Main Copy
  ctx.fillStyle = pal.ink;
  ctx.font = `700 68px ${FONT_DISPLAY}`;
  ctx.fillText('BUILT FOR SAILORS,', yearX, 345);

  const hi2P = segProgress(localT, 2.8, 0.7);
  drawHighlighter(ctx, yearX - 6, 388, 690, 74, hi2P, pal.yellow, -0.01);
  ctx.fillStyle = pal.ink;
  ctx.fillText('STRAIGHT COMPASS LINES.', yearX, 425);

  // Unrolled rectangular Mercator mini-box
  const mapEnter = easeOutCubic(segProgress(localT, 2.3, 1.0));
  if (mapEnter > 0.02) {
    const mx = 1020;
    const my = 510;
    const mw = 790 * mapEnter;
    const mh = 390;

    drawCutoutCard(ctx, mx, my, Math.max(40, mw), mh, pal, 0, 10, pal.oceanTint);
    if (mw > 120) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(mx + 2, my + 2, mw - 4, mh - 4);
      ctx.clip();

      const miniMerc = geoMercator()
        .scale(112)
        .center([0, 20])
        .translate([1020 + 395, my + 215]);
      const miniPath = geoPath(miniMerc, ctx);
      ctx.beginPath();
      miniPath(world.countriesNoAntarctica);
      ctx.fillStyle = pal.landFill;
      ctx.fill();
      ctx.strokeStyle = pal.landStroke;
      ctx.lineWidth = 1;
      ctx.stroke();

      // Straight red rhumb navigation line across Atlantic!
      const rhumbP = easeOutCubic(segProgress(localT, 3.6, 1.1));
      if (rhumbP > 0.01) {
        const p1 = miniMerc([-9, 38.7])!; // Lisbon
        const p2 = miniMerc([-74, 40.7])!; // New York
        const curX = lerp(p1[0], p2[0], rhumbP);
        const curY = lerp(p1[1], p2[1], rhumbP);
        ctx.strokeStyle = pal.red;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(p1[0], p1[1]);
        ctx.lineTo(curX, curY);
        ctx.stroke();

        ctx.fillStyle = pal.yellow;
        ctx.strokeStyle = pal.ink;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(p1[0], p1[1], 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        if (rhumbP > 0.9) {
          ctx.beginPath();
          ctx.arc(p2[0], p2[1], 7, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        }
      }
      ctx.restore();
    }
  }
  ctx.restore();
}

// SCENE 3: 12.0 - 19.5s — Tissot's Indicatrix Distortion
function renderScene3(
  ctx: CanvasRenderingContext2D,
  t: number,
  pal: VoxPalette,
  world: PreparedWorld
) {
  const localT = t - 12.0;
  const merc = geoMercator()
    .scale(235)
    .center([12, 20])
    .translate([960, 610]);
  const path = geoPath(merc, ctx);

  // Map container frame
  const mapTop = 148;
  const mapBottom = 946;
  ctx.save();
  ctx.fillStyle = pal.oceanTint;
  ctx.fillRect(72, mapTop, 1776, mapBottom - mapTop);
  ctx.strokeStyle = pal.ink;
  ctx.lineWidth = 2.5;
  ctx.strokeRect(72, mapTop, 1776, mapBottom - mapTop);

  ctx.beginPath();
  ctx.rect(74, mapTop + 2, 1772, mapBottom - mapTop - 4);
  ctx.clip();

  // Graticule
  ctx.beginPath();
  path(geoGraticule10());
  ctx.strokeStyle = pal.rule;
  ctx.lineWidth = 1;
  ctx.stroke();

  // Countries
  ctx.beginPath();
  path(world.countriesNoAntarctica);
  ctx.fillStyle = pal.landFill;
  ctx.fill();
  ctx.strokeStyle = pal.landStroke;
  ctx.lineWidth = 1.1;
  ctx.stroke();

  // Highlight polar inflation zone above 55°N as scanline rises
  const sweepLat = lerp(0, 76, easeInOutCubic(segProgress(localT, 0.8, 4.5)));
  const eqY = merc([0, 0])![1];
  const sweepY = merc([0, sweepLat])![1];

  // Warm terracotta tint above 50°N proportional to sweep
  if (sweepLat > 45) {
    const fiftyY = merc([0, 50])![1];
    ctx.fillStyle = pal.red;
    ctx.globalAlpha = 0.12 * clamp01((sweepLat - 45) / 25);
    ctx.fillRect(72, mapTop, 1776, fiftyY - mapTop);
    ctx.globalAlpha = 1;
  }

  // Equator reference line
  ctx.strokeStyle = pal.teal;
  ctx.lineWidth = 2.5;
  ctx.setLineDash([8, 6]);
  ctx.beginPath();
  ctx.moveTo(72, eqY);
  ctx.lineTo(1848, eqY);
  ctx.stroke();
  ctx.setLineDash([]);

  // Sweeping red latitude scanner line
  ctx.strokeStyle = pal.red;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(72, sweepY);
  ctx.lineTo(1848, sweepY);
  ctx.stroke();

  // Tissot Indicatrix circles at latitudes 0, 30, 55, 70 across 3 longitudes
  const sampleLats = [
    { lat: 0, sec: 1.0, appear: 0.9 },
    { lat: 30, sec: 1.33, appear: 2.0 },
    { lat: 55, sec: 3.04, appear: 3.2 },
    { lat: 70, sec: 8.55, appear: 4.5 },
  ];
  const sampleLons = [-95, 20, 115];

  for (const band of sampleLats) {
    const p = easeOutBack(segProgress(localT, band.appear, 0.6));
    if (p <= 0.02) continue;
    // Mercator linear scale factor = sec(lat), area factor = sec^2(lat)
    const linScale = 1 / Math.cos((band.lat * Math.PI) / 180);
    const radius = 16 * Math.min(linScale, 3.85) * p;
    for (const lon of sampleLons) {
      const pt = merc([lon, band.lat]);
      if (!pt) continue;
      ctx.save();
      ctx.fillStyle = band.lat >= 55 ? pal.red : pal.yellow;
      ctx.globalAlpha = 0.35;
      ctx.beginPath();
      ctx.arc(pt[0], pt[1], radius, 0, Math.PI * 2);
      ctx.fill();

      ctx.globalAlpha = 1;
      ctx.strokeStyle = band.lat >= 55 ? pal.red : pal.ink;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(pt[0], pt[1], radius, 0, Math.PI * 2);
      ctx.stroke();

      // Label inside circle on middle column
      if (lon === 20) {
        ctx.fillStyle = pal.ink;
        ctx.font = `700 ${band.lat >= 55 ? 20 : 14}px ${FONT_MONO}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${band.sec.toFixed(1)}×`, pt[0], pt[1]);
      }
      ctx.restore();
    }
  }
  ctx.restore();

  // Floating HUD Cutout Card in bottom-left
  const cardP = easeOutBack(segProgress(localT, 0.3, 0.6));
  const areaInflation = 1 / Math.pow(Math.cos((sweepLat * Math.PI) / 180), 2);
  ctx.save();
  ctx.globalAlpha = clamp01(cardP);
  drawCutoutCard(ctx, 108, 704, 620, 210, pal, -0.01, 10, pal.paper);

  ctx.fillStyle = pal.muted;
  ctx.font = `600 18px ${FONT_MONO}`;
  ctx.textAlign = 'left';
  ctx.fillText("TISSOT'S INDICATRIX  ·  AREA DISTORTION", 138, 744);

  const hi3P = segProgress(localT, 4.2, 0.8);
  drawHighlighter(ctx, 134, 774, 540, 56, hi3P, pal.yellow, -0.008);

  ctx.fillStyle = pal.ink;
  ctx.font = `700 44px ${FONT_DISPLAY}`;
  ctx.fillText(`POLES STRETCH UP TO ${areaInflation.toFixed(1)}×`, 138, 804);

  ctx.fillStyle = pal.red;
  ctx.font = `700 22px ${FONT_MONO}`;
  ctx.fillText(`SCAN LATITUDE: ${Math.round(sweepLat)}° N   |   EQUATOR = 1.0×`, 138, 868);
  ctx.restore();
}

// SCENE 4: 19.5 - 27.0s — Greenland vs Africa Visual Shock
function renderScene4(
  ctx: CanvasRenderingContext2D,
  t: number,
  pal: VoxPalette,
  world: PreparedWorld
) {
  const localT = t - 19.5;
  const s4Merc = geoMercator()
    .scale(245)
    .center([5, 36])
    .translate([640, 560]);
  const path = geoPath(s4Merc, ctx);

  // Left Map Frame
  const frameX = 72;
  const frameY = 148;
  const frameW = 1090;
  const frameH = 796;

  ctx.save();
  ctx.fillStyle = pal.oceanTint;
  ctx.fillRect(frameX, frameY, frameW, frameH);
  ctx.strokeStyle = pal.ink;
  ctx.lineWidth = 2.5;
  ctx.strokeRect(frameX, frameY, frameW, frameH);

  ctx.beginPath();
  ctx.rect(frameX + 2, frameY + 2, frameW - 4, frameH - 4);
  ctx.clip();

  // Base countries
  ctx.beginPath();
  path(world.countriesNoAntarctica);
  ctx.fillStyle = pal.landFill;
  ctx.fill();
  ctx.strokeStyle = pal.landStroke;
  ctx.lineWidth = 1;
  ctx.stroke();

  // Africa Highlighted in Teal
  const afP = easeOutCubic(segProgress(localT, 0.2, 0.6));
  ctx.save();
  ctx.globalAlpha = afP;
  ctx.beginPath();
  path(world.africaCollection);
  ctx.fillStyle = pal.teal;
  ctx.fill();
  ctx.strokeStyle = pal.ink;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();

  // Greenland original ghost outline stays behind once detached
  const moveP = easeInOutCubic(segProgress(localT, 2.0, 2.2));
  const glOriginalAlpha = 1 - moveP * 0.65;
  ctx.save();
  ctx.globalAlpha = glOriginalAlpha;
  ctx.beginPath();
  path(world.greenland);
  ctx.fillStyle = moveP > 0.05 ? pal.landFill : pal.red;
  ctx.fill();
  ctx.setLineDash(moveP > 0.05 ? [6, 5] : []);
  ctx.strokeStyle = pal.red;
  ctx.lineWidth = 2.5;
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();

  // Animated flying & shrinking Greenland!
  const startC = world.greenlandMercatorCentroid;
  const endC = [world.africaMercatorCentroid[0] + 15, world.africaMercatorCentroid[1] - 32];
  // Arc trajectory
  const curCx = lerp(startC[0], endC[0], moveP);
  const curCy = lerp(startC[1], endC[1], moveP) - Math.sin(moveP * Math.PI) * 55;

  // Dashed trajectory arc
  if (moveP > 0.05) {
    ctx.save();
    ctx.strokeStyle = pal.ink;
    ctx.lineWidth = 3;
    ctx.setLineDash([10, 8]);
    ctx.beginPath();
    ctx.moveTo(startC[0], startC[1]);
    ctx.quadraticCurveTo(
      (startC[0] + endC[0]) / 2 + 80,
      (startC[1] + endC[1]) / 2 - 40,
      curCx,
      curCy
    );
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }

  // Draw Greenland interpolating between Mercator inflated rings and true Equal-Earth rings!
  // Wait: the ring point counts match 1:1 in world.greenlandRings & world.greenlandTrueRings!
  ctx.save();
  ctx.translate(curCx, curCy);
  for (let r = 0; r < world.greenlandRings.length; r++) {
    const mRing = world.greenlandRings[r];
    const tRing = world.greenlandTrueRings[r];
    ctx.beginPath();
    for (let i = 0; i < mRing.length; i++) {
      const px = lerp(mRing[i][0], tRing[i][0], moveP);
      const py = lerp(mRing[i][1], tRing[i][1], moveP);
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fillStyle = pal.red;
    ctx.fill();
    ctx.strokeStyle = pal.ink;
    ctx.lineWidth = 2.5;
    ctx.stroke();
  }
  ctx.restore();

  // Map callout labels
  ctx.fillStyle = pal.ink;
  ctx.font = `700 22px ${FONT_MONO}`;
  ctx.textAlign = 'center';
  if (moveP < 0.4) {
    ctx.fillText('LOOKS EQUAL ON MERCATOR', startC[0], startC[1] + 150);
  } else {
    const labelP = clamp01((moveP - 0.4) / 0.6);
    ctx.globalAlpha = labelP;
    const tagText = 'TRUE SCALE: 2.16M km²';
    ctx.font = `700 18px ${FONT_MONO}`;
    const tagW = ctx.measureText(tagText).width + 30;
    ctx.fillStyle = pal.yellow;
    ctx.fillRect(endC[0] - tagW / 2, endC[1] - 82, tagW, 36);
    ctx.strokeStyle = pal.ink;
    ctx.lineWidth = 2;
    ctx.strokeRect(endC[0] - tagW / 2, endC[1] - 82, tagW, 36);
    ctx.fillStyle = pal.ink;
    ctx.textBaseline = 'middle';
    ctx.fillText(tagText, endC[0], endC[1] - 63);
  }
  ctx.restore();

  // Right Column: Vox Data Comparison Card
  const cardEnter = easeOutBack(segProgress(localT, 0.35, 0.65));
  ctx.save();
  ctx.globalAlpha = clamp01(cardEnter);
  drawCutoutCard(ctx, 1200, 148, 648, 796, pal, 0, 12, pal.paper);

  ctx.fillStyle = pal.muted;
  ctx.font = `600 18px ${FONT_MONO}`;
  ctx.textAlign = 'left';
  ctx.fillText('LAND AREA COMPARISON (ACTUAL)', 1244, 202);

  ctx.fillStyle = pal.ink;
  ctx.font = `700 54px ${FONT_DISPLAY}`;
  ctx.fillText('THE SCALE ILLUSION', 1244, 266);

  // Horizontal Bar 1: Africa
  const bar1P = easeOutCubic(segProgress(localT, 1.0, 1.0));
  const maxBarW = 550;
  ctx.fillStyle = pal.ink;
  ctx.font = `700 24px ${FONT_MONO}`;
  ctx.fillText('AFRICA', 1244, 360);
  ctx.textAlign = 'right';
  ctx.fillText(`${(30.37 * bar1P).toFixed(2)}M km²`, 1794, 360);

  ctx.fillStyle = pal.paperAlt;
  ctx.fillRect(1244, 386, maxBarW, 64);
  ctx.fillStyle = pal.teal;
  ctx.fillRect(1244, 386, maxBarW * bar1P, 64);
  ctx.strokeStyle = pal.ink;
  ctx.lineWidth = 2.5;
  ctx.strokeRect(1244, 386, maxBarW, 64);

  // Horizontal Bar 2: Greenland
  const bar2P = easeOutCubic(segProgress(localT, 1.6, 0.9));
  const glRatio = 2.16 / 30.37; // ~0.0711
  ctx.textAlign = 'left';
  ctx.fillStyle = pal.ink;
  ctx.fillText('GREENLAND', 1244, 514);
  ctx.textAlign = 'right';
  ctx.fillText(`${(2.16 * bar2P).toFixed(2)}M km²`, 1794, 514);

  ctx.fillStyle = pal.paperAlt;
  ctx.fillRect(1244, 540, maxBarW, 64);
  ctx.fillStyle = pal.red;
  ctx.fillRect(1244, 540, maxBarW * glRatio * bar2P, 64);
  ctx.strokeStyle = pal.ink;
  ctx.lineWidth = 2.5;
  ctx.strokeRect(1244, 540, maxBarW, 64);

  // 14x Larger Yellow Callout Box
  const badgeP = easeOutBack(segProgress(localT, 4.2, 0.7));
  if (badgeP > 0.02) {
    ctx.save();
    ctx.globalAlpha = clamp01(badgeP);
    const by = lerp(710, 670, badgeP);
    drawCutoutCard(ctx, 1244, by, 550, 210, pal, -0.015, 8, pal.yellow);

    ctx.fillStyle = pal.ink;
    ctx.font = `700 84px ${FONT_DISPLAY}`;
    ctx.textAlign = 'left';
    ctx.fillText('14× LARGER', 1280, by + 94);

    ctx.font = `italic 400 28px ${FONT_SERIF}`;
    ctx.fillText('Greenland fits inside Africa 14 times over.', 1280, by + 162);
    ctx.restore();
  }
  ctx.restore();
}

// SCENE 5: 27.0 - 32.5s — Live Mercator → Equal Earth Morph
function renderScene5(
  ctx: CanvasRenderingContext2D,
  t: number,
  pal: VoxPalette,
  world: PreparedWorld
) {
  const localT = t - 27.0;
  const morphP = easeInOutCubic(segProgress(localT, 0.8, 2.8));

  // Title banner
  ctx.save();
  ctx.fillStyle = pal.ink;
  ctx.font = `700 44px ${FONT_DISPLAY}`;
  ctx.textAlign = 'left';
  ctx.fillText(
    morphP < 0.5 ? 'MERCATOR PROJECTION (1569)' : 'EQUAL EARTH PROJECTION (2018)',
    72,
    158
  );

  // Progress meter pill-free label
  ctx.textAlign = 'right';
  ctx.fillStyle = pal.muted;
  ctx.font = `600 20px ${FONT_MONO}`;
  ctx.fillText(`GEOMETRIC MORPH  ·  ${Math.round(morphP * 100)}%`, 1848, 158);
  ctx.restore();

  // Map viewport frame
  ctx.save();
  ctx.fillStyle = pal.oceanTint;
  ctx.fillRect(72, 198, 1776, 650);
  ctx.strokeStyle = pal.ink;
  ctx.lineWidth = 2.5;
  ctx.strokeRect(72, 198, 1776, 650);

  ctx.beginPath();
  ctx.rect(74, 200, 1772, 646);
  ctx.clip();

  // Interpolated world polygons!
  ctx.fillStyle = morphP > 0.5 ? pal.teal : pal.landFill;
  ctx.strokeStyle = pal.ink;
  ctx.lineWidth = 1.1;

  for (let i = 0; i < world.morphRings.length; i++) {
    const ring = world.morphRings[i];
    ctx.beginPath();
    for (let j = 0; j < ring.mercator.length; j++) {
      const x = lerp(ring.mercator[j][0], ring.equalEarth[j][0], morphP);
      const y = lerp(ring.mercator[j][1], ring.equalEarth[j][1], morphP) - 18;
      if (j === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();

  // Bottom two comparison strips
  const stripY = 876;
  const leftActive = morphP < 0.5;
  drawCutoutCard(
    ctx,
    72,
    stripY,
    866,
    102,
    pal,
    0,
    leftActive ? 8 : 4,
    leftActive ? pal.yellow : pal.paperAlt
  );
  drawCutoutCard(
    ctx,
    982,
    stripY,
    866,
    102,
    pal,
    0,
    !leftActive ? 8 : 4,
    !leftActive ? pal.yellow : pal.paperAlt
  );

  ctx.fillStyle = pal.ink;
  ctx.font = `700 28px ${FONT_DISPLAY}`;
  ctx.textAlign = 'left';
  ctx.fillText('MERCATOR (1569)', 106, stripY + 38);
  ctx.fillText('EQUAL EARTH (2018)', 1016, stripY + 38);

  ctx.fillStyle = pal.muted;
  ctx.font = `500 20px ${FONT_MONO}`;
  ctx.fillText('Preserves compass angles  ·  Inflates polar landmass', 106, stripY + 74);
  ctx.fillText('Preserves true area ratios  ·  Curved meridians', 1016, stripY + 74);
}

// SCENE 6: 32.5 - 36.0s — Editorial Outro
function renderScene6(
  ctx: CanvasRenderingContext2D,
  t: number,
  pal: VoxPalette,
  world: PreparedWorld
) {
  const localT = t - 32.5;
  const cardP = easeOutBack(segProgress(localT, 0.1, 0.7));

  // Faint Equal Earth backdrop
  ctx.save();
  ctx.globalAlpha = 0.2;
  const eq = geoEqualEarth().scale(360).center([12, 10]).translate([960, 560]);
  const path = geoPath(eq, ctx);
  ctx.beginPath();
  path(world.countriesNoAntarctica);
  ctx.fillStyle = pal.landFill;
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.globalAlpha = clamp01(cardP);
  const cy = lerp(340, 290, cardP);
  drawCutoutCard(ctx, 260, cy, 1400, 420, pal, 0.008, 14, pal.paper);

  ctx.fillStyle = pal.red;
  ctx.font = `700 20px ${FONT_MONO}`;
  ctx.textAlign = 'center';
  ctx.fillText('THE TAKEAWAY', 960, cy + 78);

  const line = 'Every map is an argument.';
  ctx.font = `italic 600 84px ${FONT_SERIF}`;
  const fullW = ctx.measureText(line).width;
  const argW = ctx.measureText('argument.').width;
  const hiX = 960 + fullW / 2 - argW - 10;

  drawHighlighter(ctx, hiX, cy + 148, argW + 24, 90, segProgress(localT, 0.75, 0.7), pal.yellow, -0.01);

  ctx.fillStyle = pal.ink;
  ctx.fillText(line, 960, cy + 195);

  const subP = easeOutCubic(segProgress(localT, 1.3, 0.6));
  ctx.globalAlpha = subP;
  ctx.fillStyle = pal.muted;
  ctx.font = `500 24px ${FONT_MONO}`;
  ctx.fillText('CHOOSE THE PROJECTION THAT FITS THE TRUTH YOU NEED TO SHOW.', 960, cy + 318);
  ctx.restore();
}

export function getActiveChapter(timeSec: number): VoxChapter {
  for (let i = CHAPTERS.length - 1; i >= 0; i--) {
    if (timeSec >= CHAPTERS[i].start) return CHAPTERS[i];
  }
  return CHAPTERS[0];
}

export function renderVoxFrame(
  ctx: CanvasRenderingContext2D,
  timeSec: number,
  width: number,
  height: number,
  world: PreparedWorld,
  config: VoxConfig = DEFAULT_CONFIG
): void {
  const t = Math.max(0, Math.min(DURATION_SEC, timeSec));
  const pal = PALETTES[config.palette] || PALETTES.archival;
  const activeChapter = getActiveChapter(t);

  ctx.save();
  ctx.scale(width / 1920, height / 1080);

  drawEditorialBackdrop(ctx, pal, t, activeChapter);

  if (t < 5.5) {
    renderScene1(ctx, t, pal, config);
  } else if (t < 12.0) {
    renderScene2(ctx, t, pal, world);
  } else if (t < 19.5) {
    renderScene3(ctx, t, pal, world);
  } else if (t < 27.0) {
    renderScene4(ctx, t, pal, world);
  } else if (t < 32.5) {
    renderScene5(ctx, t, pal, world);
  } else {
    renderScene6(ctx, t, pal, world);
  }

  // Crisp editorial shutter wipe between chapters (0.28s)
  for (let i = 1; i < CHAPTERS.length; i++) {
    const boundary = CHAPTERS[i].start;
    const dist = Math.abs(t - boundary);
    if (dist < 0.16) {
      const wipeP = 1 - dist / 0.16;
      ctx.fillStyle = pal.ink;
      const barW = 1920 * wipeP;
      if (t < boundary) {
        ctx.fillRect(0, 102, barW, 924);
      } else {
        ctx.fillRect(1920 - barW, 102, barW, 924);
      }
    }
  }

  ctx.restore();
}
