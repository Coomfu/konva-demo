export const userAgent = ((typeof navigator !== "undefined" && navigator) || {} as any).userAgent || "";
export const isMacintosh = userAgent.indexOf('Macintosh') >= 0 || userAgent.indexOf('iPad') >= 0 || userAgent.indexOf('iPhone') >= 0;

export const VIEWPORT_SIZE_OPTIONS = [
  { label: "512x512", value: "512x512" },
  { label: "512x288", value: "512x288" },
  { label: "288x512", value: "288x512" },
]
export const PAN_STEP = 0.3;
export const ZOOM_SCALE_STEP = 1.02;
export const ZOOM_SCALE_MIN = 0.5;
export const ZOOM_SCALE_MAX = 2;
export const ZOOM_SCALE_OPTIONS = [
  { label: "50%", value: 0.5 },
  { label: "100%", value: 1 },
  { label: "200%", value: 2 },
]

export const EXPAND_RATIO_OPTIONS = [
  { label: "原始比例", value: 'original' },
  { label: "1:1", value: 1 },
  { label: "4:3", value: 4 / 3 },
  { label: "3:2", value: 3 / 2 },
  { label: "16:9", value: 16 / 9 },
  { label: "21:9", value: 21 / 9 },
  { label: "3:4", value: 3 / 4 },
  { label: "2:3", value: 2 / 3 },
  { label: "9:16", value: 9 / 16 },
]

export const EXPAND_TIMES_OPTIONS = [
  { label: '1.5', value: 1.5 },
  { label: '2', value: 2 }
]