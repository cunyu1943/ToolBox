import { describe, expect, it } from 'vitest'
import {
  formatInZone,
  normalizeToMs,
  zonedStringToMs,
  zoneOffsetMs
} from '~/utils/timezone'

const HOUR = 3600_000

describe('时区偏移', () => {
  it('UTC 偏移为 0', () => expect(zoneOffsetMs(0, 'UTC')).toBe(0))
  it('北京恒为 +8', () => expect(zoneOffsetMs(0, 'Asia/Shanghai')).toBe(8 * HOUR))
  it('纽约冬令时 -5', () => expect(zoneOffsetMs(Date.UTC(2024, 0, 15, 12), 'America/New_York')).toBe(-5 * HOUR))
  it('纽约夏令时 -4', () => expect(zoneOffsetMs(Date.UTC(2024, 6, 1, 12), 'America/New_York')).toBe(-4 * HOUR))
})

describe('epoch → 指定时区墙上时间', () => {
  it('0 → 北京 1970-01-01 08:00:00', () => expect(formatInZone(0, 'Asia/Shanghai')).toBe('1970-01-01 08:00:00'))
  it('0 → UTC 1970-01-01 00:00:00', () => expect(formatInZone(0, 'UTC')).toBe('1970-01-01 00:00:00'))
  it('0 → 纽约 1969-12-31 19:00:00', () => expect(formatInZone(0, 'America/New_York')).toBe('1969-12-31 19:00:00'))
})

describe('指定时区墙上时间 → epoch', () => {
  it('北京 08:00 → 0', () => expect(zonedStringToMs('1970-01-01 08:00:00', 'Asia/Shanghai')).toBe(0))
  it('缺省秒按 0', () => expect(zonedStringToMs('1970-01-01 08:00', 'Asia/Shanghai')).toBe(0))
  it('非法格式返回 null', () => expect(zonedStringToMs('2024/7/1 12:00', 'UTC')).toBeNull())
  it('非法月份返回 null', () => expect(zonedStringToMs('2024-13-01 00:00:00', 'UTC')).toBeNull())
})

describe('往返一致', () => {
  for (const tz of ['Asia/Shanghai', 'UTC', 'America/New_York', 'Europe/London', 'Australia/Sydney']) {
    it(`${tz} 往返`, () => {
      const wall = '2024-07-01 12:34:56'
      const ms = zonedStringToMs(wall, tz)
      expect(ms).not.toBeNull()
      expect(formatInZone(ms as number, tz)).toBe(wall)
    })
  }
})

describe('秒/毫秒归一', () => {
  it('10 位按秒', () => expect(normalizeToMs(1700000000)).toBe(1700000000000))
  it('13 位按毫秒', () => expect(normalizeToMs(1700000000000)).toBe(1700000000000))
})
