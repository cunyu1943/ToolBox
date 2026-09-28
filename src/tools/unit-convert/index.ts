export interface Unit {
  id: string
  name: string
  symbol: string
  /** 换算到该组的基准单位 */
  toBase: (value: number) => number
  fromBase: (value: number) => number
}

export interface UnitGroup {
  id: string
  label: string
  /** 基准单位说明，用于结果区提示 */
  base: string
  units: Unit[]
}

/** 线性单位：factor = 1 该单位等于多少基准单位 */
const linear = (id: string, name: string, symbol: string, factor: number): Unit => ({
  id,
  name,
  symbol,
  toBase: (value) => value * factor,
  fromBase: (value) => value / factor
})

const length = (id: string, name: string, symbol: string, meters: number): Unit =>
  linear(id, name, symbol, meters)

const area = (id: string, name: string, symbol: string, squareMeters: number): Unit =>
  linear(id, name, symbol, squareMeters)

const volume = (id: string, name: string, symbol: string, liters: number): Unit =>
  linear(id, name, symbol, liters)

const mass = (id: string, name: string, symbol: string, grams: number): Unit =>
  linear(id, name, symbol, grams)

const duration = (id: string, name: string, symbol: string, seconds: number): Unit =>
  linear(id, name, symbol, seconds)

const data = (id: string, name: string, symbol: string, bytes: number): Unit =>
  linear(id, name, symbol, bytes)

const temperature: Unit[] = [
  {
    id: 'c',
    name: '摄氏度',
    symbol: '°C',
    toBase: (value) => value,
    fromBase: (value) => value
  },
  {
    id: 'f',
    name: '华氏度',
    symbol: '°F',
    toBase: (value) => ((value - 32) * 5) / 9,
    fromBase: (value) => (value * 9) / 5 + 32
  },
  {
    id: 'k',
    name: '开尔文',
    symbol: 'K',
    toBase: (value) => value - 273.15,
    fromBase: (value) => value + 273.15
  },
  {
    id: 'r',
    name: '列氏度',
    symbol: '°Ré',
    toBase: (value) => (value * 5) / 4,
    fromBase: (value) => (value * 4) / 5
  }
]

export const unitGroups: UnitGroup[] = [
  {
    id: 'length',
    label: '长度',
    base: '米',
    units: [
      length('mm', '毫米', 'mm', 0.001),
      length('cm', '厘米', 'cm', 0.01),
      length('m', '米', 'm', 1),
      length('km', '千米', 'km', 1000),
      length('in', '英寸', 'in', 0.0254),
      length('ft', '英尺', 'ft', 0.3048),
      length('yd', '码', 'yd', 0.9144),
      length('mi', '英里', 'mi', 1609.344),
      length('nmi', '海里', 'nmi', 1852),
      length('li', '市里', '市里', 500)
    ]
  },
  {
    id: 'area',
    label: '面积',
    base: '平方米',
    units: [
      area('cm2', '平方厘米', 'cm²', 0.0001),
      area('m2', '平方米', 'm²', 1),
      area('ha', '公顷', 'ha', 10000),
      area('km2', '平方千米', 'km²', 1e6),
      area('mu', '亩', '亩', 2000 / 3),
      area('in2', '平方英寸', 'in²', 0.00064516),
      area('ft2', '平方英尺', 'ft²', 0.09290304),
      area('ac', '英亩', 'ac', 4046.8564224)
    ]
  },
  {
    id: 'volume',
    label: '体积与容积',
    base: '升',
    units: [
      volume('ml', '毫升', 'mL', 0.001),
      volume('l', '升', 'L', 1),
      volume('m3', '立方米', 'm³', 1000),
      volume('gal-us', '加仑（美）', 'gal', 3.785411784),
      volume('gal-uk', '加仑（英）', 'gal(UK)', 4.54609),
      volume('qt', '夸脱（美）', 'qt', 0.946352946),
      volume('pt', '品脱（美）', 'pt', 0.473176473),
      volume('cup', '杯（美）', 'cup', 0.2365882365),
      volume('floz', '液盎司（美）', 'fl oz', 0.0295735295625),
      volume('cm3', '立方厘米', 'cm³', 0.001)
    ]
  },
  {
    id: 'mass',
    label: '质量',
    base: '克',
    units: [
      mass('mg', '毫克', 'mg', 0.001),
      mass('g', '克', 'g', 1),
      mass('kg', '千克', 'kg', 1000),
      mass('t', '吨', 't', 1e6),
      mass('jin', '斤', '斤', 500),
      mass('liang', '两', '两', 50),
      mass('oz', '盎司', 'oz', 28.349523125),
      mass('lb', '磅', 'lb', 453.59237),
      mass('st', '英石', 'st', 6350.29318)
    ]
  },
  {
    id: 'temperature',
    label: '温度',
    base: '摄氏度',
    units: temperature
  },
  {
    id: 'duration',
    label: '时间',
    base: '秒',
    units: [
      duration('ms', '毫秒', 'ms', 0.001),
      duration('s', '秒', 's', 1),
      duration('min', '分钟', 'min', 60),
      duration('h', '小时', 'h', 3600),
      duration('d', '天', 'd', 86400),
      duration('wk', '周', 'wk', 604800),
      duration('mo', '月（30 天）', 'mo', 2592000),
      duration('yr', '年（365 天）', 'yr', 31536000)
    ]
  },
  {
    id: 'speed',
    label: '速度',
    base: '米每秒',
    units: [
      linear('mps', '米每秒', 'm/s', 1),
      linear('kmh', '千米每小时', 'km/h', 1 / 3.6),
      linear('mph', '英里每小时', 'mph', 0.44704),
      linear('kns', '节', 'kn', 1852 / 3600),
      linear('cms', '厘米每秒', 'cm/s', 0.01),
      // 1 马赫按海平面音速 340.29 m/s 计，实际随高度/温度变化
      linear('mach', '马赫（Ma）', 'Ma', 340.29)
    ]
  },
  {
    id: 'data',
    label: '数据存储',
    base: '字节',
    units: [
      data('bit', '比特', 'bit', 0.125),
      data('b', '字节', 'B', 1),
      data('kb', 'KB（1000）', 'kB', 1e3),
      data('mb', 'MB（1000²）', 'MB', 1e6),
      data('gb', 'GB（1000³）', 'GB', 1e9),
      data('tb', 'TB（1000⁴）', 'TB', 1e12),
      data('kib', 'KiB（1024）', 'KiB', 1024),
      data('mib', 'MiB（1024²）', 'MiB', 1024 ** 2),
      data('gib', 'GiB（1024³）', 'GiB', 1024 ** 3),
      data('tib', 'TiB（1024⁴）', 'TiB', 1024 ** 4)
    ]
  }
]

export const findGroup = (id: string): UnitGroup | undefined =>
  unitGroups.find((group) => group.id === id)

export const findUnit = (groupId: string, unitId: string): Unit | undefined =>
  findGroup(groupId)?.units.find((unit) => unit.id === unitId)

export interface ConvertResult {
  ok: boolean
  value?: number
  error?: string
}

export function convertValue(value: number, from: Unit, to: Unit): ConvertResult {
  if (!Number.isFinite(value)) return { ok: false, error: '输入不是有限数字' }
  const converted = to.fromBase(from.toBase(value))
  if (!Number.isFinite(converted)) return { ok: false, error: '换算结果溢出' }
  return { ok: true, value: converted }
}

/** 把输入值摊到组内所有单位上，用于「一次看清全表」 */
export function convertToAll(value: number, from: Unit, group: UnitGroup): { unit: Unit; value: number }[] {
  return group.units.map((unit) => ({ unit, value: unit.fromBase(from.toBase(value)) }))
}
