/**
 * crontab 表达式解析内核（纯函数）。
 *
 * 按最通用的 **5 段** crontab（分 时 日 月 周）解析，支持 `*`、`?`、`a-b`、`a,b`、步长 `[*]/n` 与
 * `a-b/n`、`a/n`、月份与星期的英文缩写、`@daily` 一类宏；日期字段与星期字段同时被限定时
 * 采用 Vixie/POSIX 的「取并集」规则。触发时间全部按本地墙上时钟计算，不引入时区库。
 */

export interface FieldSpec {
  key: 'minute' | 'hour' | 'dayOfMonth' | 'month' | 'dayOfWeek'
  label: string
  cn: string
  min: number
  max: number
  names?: Record<string, number>
}

const MONTH_NAMES: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12
}

const DOW_NAMES: Record<string, number> = { sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6 }

export const CRON_FIELDS: FieldSpec[] = [
  { key: 'minute', label: 'Minute', cn: '分', min: 0, max: 59 },
  { key: 'hour', label: 'Hour', cn: '时', min: 0, max: 23 },
  { key: 'dayOfMonth', label: 'Day of month', cn: '日', min: 1, max: 31 },
  { key: 'month', label: 'Month', cn: '月', min: 1, max: 12, names: MONTH_NAMES },
  { key: 'dayOfWeek', label: 'Day of week', cn: '周', min: 0, max: 7, names: DOW_NAMES }
]

export const WEEKDAY_CN = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']

/** 宏等价于 5 段表达式；`@reboot` 无周期含义，单独提示 */
export const CRON_MACROS: Record<string, string> = {
  '@yearly': '0 0 1 1 *',
  '@annually': '0 0 1 1 *',
  '@monthly': '0 0 1 * *',
  '@weekly': '0 0 * * 0',
  '@daily': '0 0 * * *',
  '@midnight': '0 0 * * *',
  '@hourly': '0 * * * *'
}

export interface FieldParse {
  spec: FieldSpec
  source: string
  values: number[]
  /** 该字段是否「被限定」——不是纯 `*`/`?`/带步通配 的形式，用于日与周的并集判定 */
  restricted: boolean
  error: string
}

export interface CronParseResult {
  ok: boolean
  /** 宏展开后的 5 段表达式 */
  expression: string
  /** 用户原始输入 */
  input: string
  fields: FieldParse[]
  errors: string[]
  notes: string[]
  /** 「每天 09:30 运行」这类中文摘要 */
  summary: string
}

function tokenValue(token: string, spec: FieldSpec): number | null {
  const named = spec.names?.[token.toLowerCase().slice(0, 3)]
  if (named !== undefined) return named
  if (!/^\d+$/.test(token)) return null
  return Number.parseInt(token, 10)
}

/** 解析逗号项之一，返回它展开出的所有取值；出错时写 errors 并返回空数组 */
function parsePart(part: string, spec: FieldSpec, errors: string[]): number[] {
  const slash = part.indexOf('/')
  const rangeText = slash < 0 ? part : part.slice(0, slash)
  const stepText = slash < 0 ? '' : part.slice(slash + 1)

  let step = 1
  if (slash >= 0) {
    if (!/^\d+$/.test(stepText) || Number(stepText) < 1) {
      errors.push(`${spec.cn}字段「${part}」的步长必须是 ≥1 的整数`)
      return []
    }
    step = Number(stepText)
  }

  let start = spec.min
  let end = spec.max

  if (rangeText === '*' || rangeText === '?') {
    start = spec.min
    end = spec.max
  } else {
    const bounds = rangeText.split('-')
    if (bounds.length === 1) {
      const value = tokenValue(bounds[0] as string, spec)
      if (value === null) {
        errors.push(`${spec.cn}字段「${bounds[0]}」不是合法数字或英文缩写`)
        return []
      }
      start = value
      // `5/10` 在 Vixie cron 里等价于 `5-max/10`
      end = slash >= 0 ? spec.max : value
    } else if (bounds.length === 2) {
      const from = tokenValue(bounds[0] as string, spec)
      const to = tokenValue(bounds[1] as string, spec)
      if (from === null || to === null) {
        errors.push(`${spec.cn}字段「${part}」含无法识别的数字或缩写`)
        return []
      }
      if (from > to) {
        errors.push(`${spec.cn}字段「${part}」的区间起点大于终点`)
        return []
      }
      start = from
      end = to
    } else {
      errors.push(`${spec.cn}字段「${part}」的区间写法不合法`)
      return []
    }
  }

  if (start < spec.min || end > spec.max) {
    const hint = spec.key === 'dayOfWeek' ? '，7 表示周日' : ''
    errors.push(`${spec.cn}字段「${part}」超出范围，应在 ${spec.min}–${spec.max}${hint}`)
    return []
  }

  const values: number[] = []
  for (let value = start; value <= end; value += step) {
    values.push(spec.key === 'dayOfWeek' && value === 7 ? 0 : value)
  }
  return values
}

export function parseCronField(source: string, spec: FieldSpec): FieldParse {
  const errors: string[] = []
  const values = new Set<number>()
  const trimmed = source.trim()

  if (!trimmed) {
    errors.push(`${spec.cn}字段为空`)
  } else {
    for (const part of trimmed.split(',')) {
      if (!part) {
        errors.push(`${spec.cn}字段「${trimmed}」有连续逗号或空项`)
        continue
      }
      for (const value of parsePart(part, spec, errors)) values.add(value)
    }
  }

  return {
    spec,
    source: trimmed,
    values: [...values].sort((a, b) => a - b),
    restricted: !/^[*?](\/\d+)?$/.test(trimmed),
    error: errors[0] ?? ''
  }
}

function weekdayList(values: number[]): string {
  return values.map((value) => WEEKDAY_CN[value]?.slice(1) ?? String(value)).join('、')
}

/** 「每天 09:30 运行」式的粗略归纳；复杂表达式仍逐字段展开，不承诺语义等价 */
function summarize(fields: FieldParse[]): string {
  const [minute, hour, dom, month, dow] = fields
  const pad = (value: number) => String(value).padStart(2, '0')
  const every = (field: FieldParse) => !field.restricted

  // 连续段折成 a–b，等步长折成「每 n 个」，其余原样列出
  const compact = (values: number[], unit: string): string => {
    if (values.length === 1) return `${values[0]}${unit}`
    if (values.length <= 3) return values.map((value) => `${value}${unit}`).join('、')
    const first = values[0] ?? 0
    const last = values[values.length - 1] ?? 0
    if (last - first === values.length - 1) return `${first}–${last}${unit}`
    const gaps = new Set(values.slice(1).map((value, index) => value - (values[index] ?? 0)))
    if (gaps.size === 1) return `每 ${[...gaps][0]}${unit}（${first}–${last}）`
    return `${values.join('、')}${unit}`
  }

  const time =
    minute.values.length === 1 && hour.values.length === 1
      ? `${pad(hour.values[0] ?? 0)}:${pad(minute.values[0] ?? 0)}`
      : minute.values.length === 1
        ? `${compact(hour.values, '时')}的第 ${minute.values[0] ?? 0} 分`
        : `${compact(hour.values, '时')}的 ${compact(minute.values, '分')}`

  let scope = '每天'
  if (!every(dom) && !every(dow)) scope = `每月 ${compact(dom.values, '日')} 或 周${weekdayList(dow.values)}（取并集）`
  else if (!every(dom)) scope = `每月 ${compact(dom.values, '日')}`
  else if (!every(dow)) scope = `周${weekdayList(dow.values)}`
  if (!every(month)) {
    const base = scope.replace(/^每天$/, '每一天').replace(/^每月 /, '')
    scope = `${compact(month.values, '月')}的 ${base}`
  }

  return `${scope} ${time} 运行`.replace(/\s+/g, ' ').trim()
}

export function parseCron(input: string): CronParseResult {
  const raw = input.trim().replace(/\s+/g, ' ')
  const errors: string[] = []
  const notes: string[] = []
  const fail = (expression: string, fields: FieldParse[] = []): CronParseResult => ({
    ok: false, expression, input: raw, fields, errors, notes, summary: ''
  })

  if (!raw) return fail('')

  let expression = raw
  if (raw.startsWith('@')) {
    const head = raw.split(' ')[0] as string
    const hit = CRON_MACROS[head.toLowerCase()]
    if (head.toLowerCase() === '@reboot') {
      errors.push('@reboot 表示「守护进程启动时执行一次」，没有周期，无法推算触发时间。')
      return fail(raw)
    }
    if (!hit) {
      errors.push(`无法识别的宏 ${head}，可用：${Object.keys(CRON_MACROS).join(' / ')} / @reboot`)
      return fail(raw)
    }
    expression = hit
    notes.push(`${head} 已展开为 ${hit}`)
  }

  const parts = expression.split(' ')
  if (parts.length === 6) {
    errors.push('检测到 6 段（含「秒」字段）。本工具按 5 段 crontab 解析，请去掉最前面的秒字段。')
    return fail(expression)
  }
  if (parts.length !== 5) {
    errors.push(`需要 5 个字段（分 时 日 月 周），当前为 ${parts.length} 个`)
    return fail(expression)
  }

  const fields = parts.map((part, index) => parseCronField(part, CRON_FIELDS[index] as FieldSpec))
  for (const field of fields) {
    if (field.error) errors.push(field.error)
    else if (field.values.length === 0) errors.push(`${field.spec.cn}字段没有可用取值`)
  }

  const ok = fields.every((field) => field.values.length > 0 && !field.error)
  return { ok, expression, input: raw, fields, errors, notes, summary: ok ? summarize(fields) : '' }
}

/** 日/周并集规则：两个字段都被限定时，任一命中即算命中 */
export function dayMatches(result: CronParseResult, date: Date): boolean {
  const dom = result.fields[2]
  const month = result.fields[3]
  const dow = result.fields[4]
  if (!month || !dom || !dow) return false
  if (!month.values.includes(date.getMonth() + 1)) return false
  const domHit = dom.values.includes(date.getDate())
  const dowHit = dow.values.includes(date.getDay())
  if (dom.restricted && dow.restricted) return domHit || dowHit
  if (dom.restricted) return domHit
  if (dow.restricted) return dowHit
  return true
}

export interface Occurrence {
  at: Date
  /** 本地时间 `YYYY-MM-DD HH:mm` */
  label: string
  weekday: string
  /** 距参考时刻的相对时长，如 `2 小时 5 分后` */
  relative: string
}

function labelOf(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function relativeOf(ms: number): string {
  const total = Math.max(0, Math.round(ms / 1000))
  const days = Math.floor(total / 86400)
  const hours = Math.floor((total % 86400) / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  const parts: string[] = []
  if (days) parts.push(`${days} 天`)
  if (hours) parts.push(`${hours} 小时`)
  if ((minutes && !days) || (!days && !hours && !minutes)) parts.push(`${minutes} 分钟`)
  return `${parts.join(' ')}后`
}

/**
 * 从 `from` 起（严格之后）向后找最多 `count` 次触发时间。
 * 先按天跳过不相关的日期，再在命中日内枚举「时×分」组合，因此 5 年上限内最多走约 1800 天。
 * 用于兜住 `0 0 30 2 *` 这类在该窗口内永不触发的表达式。
 */
export function nextRuns(result: CronParseResult, from: Date, count = 5): Occurrence[] {
  const minute = result.fields[0]
  const hour = result.fields[1]
  if (!result.ok || !minute || !hour) return []

  const start = new Date(from)
  start.setSeconds(0, 0)
  start.setMinutes(start.getMinutes() + 1)

  const limit = new Date(start)
  limit.setFullYear(limit.getFullYear() + 5)

  const out: Occurrence[] = []
  const cursor = new Date(start)
  while (out.length < count && cursor <= limit) {
    if (dayMatches(result, cursor)) {
      for (const h of hour.values) {
        for (const m of minute.values) {
          const at = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate(), h, m)
          if (at < start) continue
          out.push({
            at,
            label: labelOf(at),
            weekday: WEEKDAY_CN[at.getDay()] ?? '',
            relative: relativeOf(at.getTime() - from.getTime())
          })
          if (out.length >= count) return out
        }
      }
    }
    cursor.setHours(0, 0, 0, 0)
    cursor.setDate(cursor.getDate() + 1)
  }
  return out
}

/** 单点判定：某时刻是否命中表达式（分钟精度） */
export function cronMatches(result: CronParseResult, at: Date): boolean {
  const minute = result.fields[0]
  const hour = result.fields[1]
  const month = result.fields[3]
  if (!result.ok || !minute || !hour || !month) return false
  return (
    minute.values.includes(at.getMinutes()) &&
    hour.values.includes(at.getHours()) &&
    dayMatches(result, at)
  )
}

export const CRON_PRESETS: { label: string; value: string }[] = [
  { label: '每分钟', value: '* * * * *' },
  { label: '每 5 分钟', value: '*/5 * * * *' },
  { label: '每天 02:30', value: '30 2 * * *' },
  { label: '工作日 09:00', value: '0 9 * * 1-5' },
  { label: '每周一 08:00', value: '0 8 * * mon' },
  { label: '每月 1 与 15 日 00:00', value: '0 0 1,15 * *' },
  { label: '季度首日 06:15', value: '15 6 1 jan,apr,jul,oct' },
  { label: '周日与周三 18:30', value: '30 18 * * 0,3' },
  { label: '每天 05 至 20 点整点', value: '0 5-20 * * *' },
  { label: '永不触发（2 月 30 日）', value: '0 0 30 2 *' }
]
