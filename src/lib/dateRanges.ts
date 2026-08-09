import { MTD_START, WINDOW_END, WINDOW_START } from '@/data/seed'
import type { DateRange } from './metrics'

export const FULL_WINDOW: DateRange = { start: WINDOW_START, end: WINDOW_END }
export const JULY_RANGE: DateRange = { start: MTD_START, end: WINDOW_END }
export const JUNE_RANGE: DateRange = { start: WINDOW_START, end: '2026-06-30' }
